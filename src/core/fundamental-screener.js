/**
 * Fundamental + Momentum stock screener — queries TradingView's scanner API
 * for stocks passing financial quality × Minervini momentum conditions.
 *
 * Phase2 now uses sector-specific screening profiles rather than one
 * global filter stack. Each profile applies its own server-side quality /
 * momentum thresholds plus shared client-side price-structure checks.
 *
 * Optional enrichment (enrichWithYahoo: true, legacy option name):
 *   - Moomoo revenue growth YoY threshold is profile-specific (null stays eligible)
 *
 * Ranking: weighted block ranks of price momentum + sector strength
 * + profitability/quality + growth + risk/value, converted to a positive
 * score where higher is better.
 */

import { readFileSync } from 'node:fs';
import { getEdinetSupplementalFundamentalsBatch } from './edinet.js';
import { getMoomooFundamentalsBatch } from './moomoo.js';
import { getSecEpsTurnaroundSupplements } from './sec-edgar.js';
import { runSectorMomentumScan } from './sector-momentum.js';
import { getProfilesForMarket, getSectorScreeningPlan } from './sector-screening-profiles.js';
import { classifyThemeForMarket, getSectorThemeHierarchyForMarket, summarizeThemes } from './theme-taxonomy.js';

const DEFAULT_MARKET = 'america';
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 200;
const DEFAULT_TIMEOUT_MS = 15000;
const INDUSTRY_RANKING_LIMIT = 20;
const FINAL_INDUSTRY_LIMIT = INDUSTRY_RANKING_LIMIT;
const FINAL_STOCK_LIMIT = 40;
const INDUSTRY_UNIVERSE_SERVER_LIMIT = 400;
const PHASE5_SECTOR_LIMIT = 20;
const PHASE5_TOP_STOCKS_PER_SECTOR = 5;
const PHASE5_SECTOR_UNIVERSE_SERVER_LIMIT = 400;
const BUILTIN_SYMBOL_ALLOWLISTS = new Map([
  [
    'jpx-prime',
    new Set(JSON.parse(readFileSync(new URL('../../config/screener/jpx-prime-symbols.json', import.meta.url), 'utf8')).symbols),
  ],
]);
const JP_COMPANY_NAMES_JA = JSON.parse(
  readFileSync(new URL('../../config/screener/jpx-company-names-ja.json', import.meta.url), 'utf8'),
);
const US_FUNDAMENTAL_SUPPLEMENTS = JSON.parse(
  readFileSync(new URL('../../config/screener/us-fundamental-supplements.json', import.meta.url), 'utf8'),
);

const COLUMNS = [
  'name',
  'description',
  'sector',
  'industry',
  'close',
  'RSI',
  'SMA200',
  'SMA50',
  'price_52_week_high',
  'Perf.3M',
  'Perf.6M',
  'Perf.Y',
  'relative_volume_10d_calc',
  'ATR',
  'beta_1_year',
  'market_cap_basic',
  'earnings_per_share_diluted_ttm',
  'earnings_per_share_diluted_yoy_growth_ttm',
  'return_on_equity',
  'return_on_invested_capital',
  'gross_margin_ttm',
  'gross_profit_ttm',
  'total_assets',
  'operating_margin_ttm',
  'free_cash_flow_margin_ttm',
  'free_cash_flow_ttm',
  'free_cash_flow_yoy_growth_ttm',
  'cash_f_operating_activities_ttm',
  'net_income_ttm',
  'total_revenue_yoy_growth_ttm',
  'enterprise_value_ebitda_ttm',
  'price_free_cash_flow_ttm',
  'debt_to_equity',
  'net_debt',
  'volume',
];

const COL = Object.fromEntries(COLUMNS.map((col, i) => [col, i]));

const RANK_BLOCKS = [
  {
    key: 'priceMomentum',
    label: 'Price momentum',
    weight: 35,
    fields: [
      { key: 'perfY', label: '12M momentum', direction: 'desc' },
      { key: 'perf6m', label: '6M momentum', direction: 'desc' },
      { key: 'perf3m', label: '3M momentum', direction: 'desc' },
      { key: 'pctOf52wHigh', label: '52w high proximity', direction: 'desc' },
    ],
  },
  {
    key: 'sectorStrength',
    label: 'Sector strength',
    weight: 15,
    fields: [
      { key: 'phase1SectorRankScore', label: 'Phase1 sector rank', direction: 'asc' },
    ],
  },
  {
    key: 'quality',
    label: 'Profitability / quality',
    weight: 25,
    missingRank: 'neutral',
    minUsableFields: 3,
    insufficientFieldRank: 'worst',
    fields: [
      { key: 'roic', label: 'ROIC', direction: 'desc' },
      { key: 'grossProfitToAssets', label: 'Gross profit / assets', direction: 'desc' },
      { key: 'operatingMargin', label: 'Operating margin', direction: 'desc' },
      { key: 'fcfMargin', label: 'FCF margin', direction: 'desc' },
      { key: 'cashConversion', label: 'Cash conversion', direction: 'desc' },
    ],
  },
  {
    key: 'growth',
    label: 'Growth confirmation',
    weight: 10,
    missingRank: 'neutral',
    fields: [
      { key: 'revenueGrowthTtm', label: 'Revenue YoY growth', direction: 'desc' },
      { key: 'epsGrowthScoreValue', label: 'EPS YoY growth', direction: 'desc' },
      { key: 'fcfGrowthTtm', label: 'FCF YoY growth', direction: 'desc' },
      { key: 'revenueGrowth', label: 'Moomoo revenue growth', direction: 'desc' },
    ],
  },
  {
    key: 'riskValue',
    label: 'Risk / value guard',
    weight: 15,
    missingRank: 'neutral',
    fields: [
      { key: 'pFcf', label: 'P/FCF', direction: 'asc' },
      { key: 'evEbitda', label: 'EV/EBITDA', direction: 'asc' },
      { key: 'atrPct', label: 'ATR %', direction: 'asc' },
      { key: 'beta1y', label: 'Beta 1Y', direction: 'asc' },
      { key: 'debtToEquity', label: 'Debt / equity', direction: 'asc' },
    ],
  },
];

const RULE_OF_40_RANK_BLOCK = {
  key: 'ruleOf40',
  label: 'Rule of 40 (US software)',
  weight: 3,
  missingRank: 'neutral',
  fields: [
    { key: 'ruleOf40Score', label: 'Revenue growth + FCF margin', direction: 'desc' },
  ],
};

const RULE_OF_40_SECTOR = 'Technology Services';
const RULE_OF_40_INDUSTRY_PATTERN = /software|saas|cloud|application|infrastructure/i;
const EPS_TURNAROUND_SCORE = 120;
const EPS_PROFIT_TO_LOSS_SCORE = -120;

function getRankingBlocks(market) {
  if (market !== DEFAULT_MARKET) return RANK_BLOCKS;
  return [
    {
      ...RANK_BLOCKS[0],
      weight: 32,
    },
    ...RANK_BLOCKS.slice(1),
    RULE_OF_40_RANK_BLOCK,
  ];
}

function buildRequestBody(serverLimit, { market, profile, scope }) {
  const thresholds = profile.thresholds;
  return {
    filter: [
      { left: 'sector', operation: 'equal', right: scope.sector },
      { left: 'market_cap_basic', operation: 'egreater', right: thresholds.marketCapMinUsd },
      { left: 'Perf.3M', operation: 'egreater', right: thresholds.perf3mMinPct },
      ...(scope.industry ? [{ left: 'industry', operation: 'equal', right: scope.industry }] : []),
    ],
    options: { lang: 'en' },
    markets: [market],
    symbols: { query: { types: ['stock'] }, tickers: [] },
    columns: COLUMNS,
    sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' },
    range: [0, serverLimit],
  };
}

function buildIndustryUniverseRequestBody(serverLimit, { market, sector }) {
  return {
    filter: [
      { left: 'sector', operation: 'equal', right: sector },
    ],
    options: { lang: 'en' },
    markets: [market],
    symbols: { query: { types: ['stock'] }, tickers: [] },
    columns: COLUMNS,
    sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' },
    range: [0, serverLimit],
  };
}

function buildTickerRequestBody(tickers, market) {
  return {
    filter: [],
    options: { lang: 'en' },
    markets: [market],
    symbols: { query: { types: ['stock'] }, tickers },
    columns: COLUMNS,
    sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' },
    range: [0, Math.max(50, tickers.length)],
  };
}

function formatSignedPct(value) {
  if (value === null || value === undefined) return 'N/A';
  return `${Number(value).toFixed(1)}%`;
}

function buildEpsGrowthMeta({ eps, epsGrowthTtm }) {
  if (epsGrowthTtm === null || epsGrowthTtm === undefined) {
    return {
      epsGrowthStatus: 'missing',
      epsGrowthDisplay: null,
      epsGrowthScoreValue: null,
    };
  }

  if (eps !== null && eps !== undefined && eps > 0 && epsGrowthTtm < -100) {
    return {
      epsGrowthStatus: 'turnaround_to_profit',
      epsGrowthDisplay: `黒字転換 (raw ${formatSignedPct(epsGrowthTtm)})`,
      epsGrowthScoreValue: EPS_TURNAROUND_SCORE,
    };
  }

  if (eps !== null && eps !== undefined && eps <= 0 && epsGrowthTtm < -100) {
    return {
      epsGrowthStatus: 'profit_to_loss',
      epsGrowthDisplay: `赤字転落 (raw ${formatSignedPct(epsGrowthTtm)})`,
      epsGrowthScoreValue: EPS_PROFIT_TO_LOSS_SCORE,
    };
  }

  return {
    epsGrowthStatus: 'normal',
    epsGrowthDisplay: null,
    epsGrowthScoreValue: epsGrowthTtm,
  };
}

function applyEpsGrowthMeta(row) {
  return {
    ...row,
    ...buildEpsGrowthMeta({ eps: row.eps, epsGrowthTtm: row.epsGrowthTtm }),
  };
}

function uniqueStrings(values) {
  return [...new Set((values || []).filter((value) => typeof value === 'string' && value.trim() !== ''))];
}

function normalizeRow(row) {
  const d = row.d;
  const rawSymbol = row.s || '';
  const colonIdx = rawSymbol.indexOf(':');
  const exchange = colonIdx !== -1 ? rawSymbol.slice(0, colonIdx) : null;
  const symbol = colonIdx !== -1 ? rawSymbol.slice(colonIdx + 1) : rawSymbol;

  const close = d[COL['close']] ?? null;
  const shortName = d[COL['name']] ?? null;
  const description = d[COL['description']] ?? null;
  const companyName = description ?? shortName;
  const sector = d[COL['sector']] ?? null;
  const industry = d[COL['industry']] ?? null;
  const rsi14 = d[COL['RSI']] ?? null;
  const sma200 = d[COL['SMA200']] ?? null;
  const sma50 = d[COL['SMA50']] ?? null;
  const high52w = d[COL['price_52_week_high']] ?? null;
  const perf3m = d[COL['Perf.3M']] ?? null;
  const perf6m = d[COL['Perf.6M']] ?? null;
  const perfY = d[COL['Perf.Y']] ?? null;
  const relativeVolume = d[COL['relative_volume_10d_calc']] ?? null;
  const atr = d[COL['ATR']] ?? null;
  const beta1y = d[COL['beta_1_year']] ?? null;
  const marketCapUsd = d[COL['market_cap_basic']] ?? null;
  const eps = d[COL['earnings_per_share_diluted_ttm']] ?? null;
  const epsGrowthTtm = d[COL['earnings_per_share_diluted_yoy_growth_ttm']] ?? null;
  const roe = d[COL['return_on_equity']] ?? null;
  const roic = d[COL['return_on_invested_capital']] ?? null;
  const grossMargin = d[COL['gross_margin_ttm']] ?? null;
  const grossProfitTtm = d[COL['gross_profit_ttm']] ?? null;
  const totalAssets = d[COL['total_assets']] ?? null;
  const operatingMargin = d[COL['operating_margin_ttm']] ?? null;
  const fcfMargin = d[COL['free_cash_flow_margin_ttm']] ?? null;
  const fcfTtm = d[COL['free_cash_flow_ttm']] ?? null;
  const fcfGrowthTtm = d[COL['free_cash_flow_yoy_growth_ttm']] ?? null;
  const cashFromOperationsTtm = d[COL['cash_f_operating_activities_ttm']] ?? null;
  const netIncomeTtm = d[COL['net_income_ttm']] ?? null;
  const revenueGrowthTtm = d[COL['total_revenue_yoy_growth_ttm']] ?? null;
  const evEbitda = d[COL['enterprise_value_ebitda_ttm']] ?? null;
  const pFcfDirect = d[COL['price_free_cash_flow_ttm']] ?? null;
  const debtToEquity = d[COL['debt_to_equity']] ?? null;
  const netDebt = d[COL['net_debt']] ?? null;
  const volume = d[COL['volume']] ?? null;

  const pctOf52wHigh =
    close !== null && high52w !== null && high52w > 0
      ? Number(((close / high52w) * 100).toFixed(2))
      : null;

  // P/FCF = market_cap / free_cash_flow_ttm (client-calculated fallback)
  const pFcf =
    pFcfDirect !== null && pFcfDirect !== undefined
      ? pFcfDirect
      : marketCapUsd !== null && fcfTtm !== null && fcfTtm > 0
      ? Number((marketCapUsd / fcfTtm).toFixed(1))
      : null;

  const grossProfitToAssets =
    grossProfitTtm !== null && totalAssets !== null && totalAssets > 0
      ? Number(((grossProfitTtm / totalAssets) * 100).toFixed(2))
      : null;

  const cashConversion =
    fcfTtm !== null && netIncomeTtm !== null && netIncomeTtm > 0
      ? Number((fcfTtm / netIncomeTtm).toFixed(2))
      : cashFromOperationsTtm !== null && netIncomeTtm !== null && netIncomeTtm > 0
        ? Number((cashFromOperationsTtm / netIncomeTtm).toFixed(2))
        : null;

  const atrPct =
    atr !== null && close !== null && close > 0
      ? Number(((atr / close) * 100).toFixed(2))
      : null;

  const ruleOf40Raw =
    revenueGrowthTtm !== null && fcfMargin !== null
      ? Number((revenueGrowthTtm + fcfMargin).toFixed(2))
      : null;
  const epsGrowthMeta = buildEpsGrowthMeta({ eps, epsGrowthTtm });

  return {
    symbol,
    companyName,
    shortName,
    exchange,
    sector,
    industry,
    close,
    rsi14,
    sma200,
    sma50,
    high52w,
    pctOf52wHigh,
    perf3m,
    perf6m,
    perfY,
    relativeVolume,
    atr,
    atrPct,
    beta1y,
    marketCapUsd,
    eps,
    epsGrowthTtm,
    ...epsGrowthMeta,
    roe,
    roic,
    grossMargin,
    grossProfitTtm,
    totalAssets,
    grossProfitToAssets,
    operatingMargin,
    fcfTtm,
    fcfMargin,
    fcfGrowthTtm,
    cashFromOperationsTtm,
    netIncomeTtm,
    cashConversion,
    revenueGrowthTtm,
    ruleOf40Raw,
    pFcf,
    evEbitda,
    debtToEquity,
    netDebt,
    volume,
  };
}

function resolveJapaneseCompanyName(row, market) {
  if (market !== 'japan') return null;
  return JP_COMPANY_NAMES_JA.names?.[row.symbol] ?? null;
}

function applyLocalizedCompanyNames(rows, market) {
  return rows.map((row) => {
    const companyNameJa = resolveJapaneseCompanyName(row, market);
    return companyNameJa
      ? {
        ...row,
        companyNameJa,
      }
      : row;
  });
}

function isUsSoftwareRuleOf40Candidate(row, market) {
  return market === DEFAULT_MARKET
    && row.sector === RULE_OF_40_SECTOR
    && row.industry !== null
    && row.industry !== undefined
    && RULE_OF_40_INDUSTRY_PATTERN.test(row.industry);
}

function buildRuleOf40Coverage(rows, market) {
  const summary = {
    total: rows.length,
    complete: 0,
    revenueOnly: 0,
    fcfOnly: 0,
    missingBoth: 0,
    completePct: 0,
  };

  rows.forEach((row) => {
    const hasRevenue = row.revenueGrowthTtm !== null && row.revenueGrowthTtm !== undefined;
    const hasFcf = row.fcfMargin !== null && row.fcfMargin !== undefined;

    if (hasRevenue && hasFcf) {
      summary.complete += 1;
      return;
    }
    if (hasRevenue) {
      summary.revenueOnly += 1;
      return;
    }
    if (hasFcf) {
      summary.fcfOnly += 1;
      return;
    }
    summary.missingBoth += 1;
  });

  summary.completePct = summary.total > 0
    ? Number(((summary.complete / summary.total) * 100).toFixed(1))
    : 0;

  return summary;
}

function resolveSymbolAllowlist(symbolAllowlistKey, customAllowlists) {
  if (!symbolAllowlistKey) return null;

  const allowlists = customAllowlists
    ? new Map(Object.entries(customAllowlists).map(([key, value]) => [key, value instanceof Set ? value : new Set(value)]))
    : BUILTIN_SYMBOL_ALLOWLISTS;
  const allowlist = allowlists.get(symbolAllowlistKey);

  if (!allowlist) {
    throw new Error(`Unknown symbolAllowlistKey: ${symbolAllowlistKey}`);
  }

  return allowlist;
}

function isExcludedExchange(row, market) {
  return market === DEFAULT_MARKET && row.exchange === 'OTC';
}

function passesScopeFilters(row, { exchangeAllowlist, symbolAllowlist }) {
  if (isExcludedExchange(row, DEFAULT_MARKET)) return false;
  if (exchangeAllowlist && !exchangeAllowlist.includes(row.exchange)) return false;
  if (symbolAllowlist && !symbolAllowlist.has(row.symbol)) return false;
  return true;
}

function passesProfileScope(row, profile) {
  if (profile.includeRow && !profile.includeRow(row)) return false;
  if (profile.excludeRow && profile.excludeRow(row)) return false;
  return true;
}

function findMatchingProfile(row, profiles) {
  return profiles.find((profile) => (
    profile.requestScopes.some((scope) => scope.sector === row.sector)
    && passesProfileScope(row, profile)
  )) ?? null;
}

function passesProfileClientFilters(row) {
  const {
    marketCapUsd,
    close,
    sma200,
    sma50,
    pctOf52wHigh,
    perf3m,
    screeningThresholds,
  } = row;

  if (
    marketCapUsd !== null
    && marketCapUsd !== undefined
    && marketCapUsd < screeningThresholds.marketCapMinUsd
  ) return false;
  if (screeningThresholds.priceAboveSma200 && close !== null && sma200 !== null && close <= sma200) return false;
  if (screeningThresholds.priceAboveSma50 && close !== null && sma50 !== null && close <= sma50) return false;
  if (pctOf52wHigh !== null && pctOf52wHigh < screeningThresholds.pricePctOf52wHighMin) return false;
  if (perf3m !== null && perf3m <= screeningThresholds.perf3mMinPct) return false;

  return true;
}

function collectClientFilterFailures(row) {
  const failures = [];
  const {
    marketCapUsd,
    close,
    sma200,
    sma50,
    pctOf52wHigh,
    perf3m,
    screeningThresholds,
  } = row;

  if (
    marketCapUsd !== null
    && marketCapUsd !== undefined
    && marketCapUsd < screeningThresholds.marketCapMinUsd
  ) {
    failures.push(`market_cap<${screeningThresholds.marketCapMinUsd} (${marketCapUsd})`);
  }
  if (screeningThresholds.priceAboveSma200 && close !== null && sma200 !== null && close <= sma200) {
    failures.push(`close<=SMA200 (${close} <= ${sma200})`);
  }
  if (screeningThresholds.priceAboveSma50 && close !== null && sma50 !== null && close <= sma50) {
    failures.push(`close<=SMA50 (${close} <= ${sma50})`);
  }
  if (pctOf52wHigh !== null && pctOf52wHigh < screeningThresholds.pricePctOf52wHighMin) {
    failures.push(`52w_high_proximity<${screeningThresholds.pricePctOf52wHighMin}% (${pctOf52wHigh}%)`);
  }
  if (perf3m !== null && perf3m <= screeningThresholds.perf3mMinPct) {
    failures.push(`perf3m<=${screeningThresholds.perf3mMinPct}% (${perf3m}%)`);
  }

  return failures;
}

function annotateRowForProfile(row, profile, sectorRankLookup, market) {
  return {
    ...row,
    ...(sectorRankLookup.get(profile.phase1Labels[0]) ?? {}),
    screeningProfileId: profile.id,
    screeningProfileLabel: profile.label,
    screeningThresholds: profile.thresholds,
    screeningPfcfMax: profile.getPfcfMax ? profile.getPfcfMax(row) : profile.thresholds.pFcfMax,
    screeningRevenueGrowthMinPct: profile.thresholds.revenueGrowthMinPct,
    ruleOf40: row.ruleOf40Raw,
    ruleOf40Score: isUsSoftwareRuleOf40Candidate(row, market) ? row.ruleOf40Raw : null,
    ruleOf40Components: {
      revenueGrowthTtm: row.revenueGrowthTtm,
      fcfMargin: row.fcfMargin,
      complete: row.ruleOf40Raw !== null && row.ruleOf40Raw !== undefined,
      scoreEligible: market === DEFAULT_MARKET && isUsSoftwareRuleOf40Candidate(row, market),
    },
    extremeMomentum: buildExtremeMomentum(row),
  };
}

function withMarketCapThresholdOverride(profile, marketCapMinUsd) {
  if (marketCapMinUsd === null || marketCapMinUsd === undefined) return profile;
  return {
    ...profile,
    thresholds: {
      ...profile.thresholds,
      marketCapMinUsd,
    },
  };
}

function applyMarketCapThresholdOverride(profiles, marketCapMinUsd) {
  return profiles.map((profile) => withMarketCapThresholdOverride(profile, marketCapMinUsd));
}

function applyProfileSummaryMarketCapThresholdOverride(profileSummaries, marketCapMinUsd) {
  if (marketCapMinUsd === null || marketCapMinUsd === undefined) return profileSummaries;
  return profileSummaries.map((profile) => ({
    ...profile,
    thresholds: {
      ...profile.thresholds,
      market_cap_min_usd: marketCapMinUsd,
    },
  }));
}

function computeFcfSupplementMetrics(entry, row) {
  const revenue = Number.isFinite(entry?.revenue) ? entry.revenue : null;
  const cashFromOperations = Number.isFinite(entry?.cashFromOperations) ? entry.cashFromOperations : null;
  const capitalExpenditures = Number.isFinite(entry?.capitalExpenditures) ? entry.capitalExpenditures : null;
  const netIncome = Number.isFinite(entry?.netIncome) ? entry.netIncome : null;
  const fcfTtm = cashFromOperations !== null && capitalExpenditures !== null
    ? cashFromOperations + capitalExpenditures
    : null;
  const fcfMargin = fcfTtm !== null && revenue !== null && revenue !== 0
    ? Number(((fcfTtm / revenue) * 100).toFixed(2))
    : null;
  const pFcf = row.marketCapUsd !== null && fcfTtm !== null && fcfTtm > 0
    ? Number((row.marketCapUsd / fcfTtm).toFixed(1))
    : null;
  const cashConversion = fcfTtm !== null && netIncome !== null && netIncome > 0
    ? Number((fcfTtm / netIncome).toFixed(2))
    : null;

  return {
    fcfTtm,
    fcfMargin,
    pFcf,
    cashConversion,
    cashFromOperationsTtm: cashFromOperations,
  };
}

function computeStaticMissingMetricSupplement(entry) {
  const metrics = entry?.metricSupplement ?? {};
  const epsTurnaround = metrics.epsTurnaround ?? null;
  return {
    earningsGrowthPct: normalizeMetric(metrics.epsGrowthTtm ?? metrics.earningsGrowthPct),
    epsGrowthStatus: epsTurnaround?.status ?? null,
    epsGrowthDisplay: epsTurnaround?.status === 'turnaround_to_profit'
      ? `黒字転換 (SEC ${epsTurnaround.previousEps} -> ${epsTurnaround.currentEps})`
      : null,
    epsGrowthScoreValue: epsTurnaround?.status === 'turnaround_to_profit'
      ? EPS_TURNAROUND_SCORE
      : null,
    epsGrowthSourceDetail: epsTurnaround
      ? {
        source: epsTurnaround.source ?? metrics.source ?? entry?.source ?? null,
        fact: epsTurnaround.fact ?? null,
        currentPeriod: epsTurnaround.currentPeriod ?? null,
        previousPeriod: epsTurnaround.previousPeriod ?? null,
        currentEps: epsTurnaround.currentEps ?? null,
        previousEps: epsTurnaround.previousEps ?? null,
      }
      : null,
    pFcf: normalizePositiveRatio(metrics.pFcf ?? metrics.pcfTtm),
    atrPct: normalizeMetric(metrics.atrPct),
    beta1y: normalizeMetric(metrics.beta1y ?? metrics.beta),
    evEbitda: normalizeMetric(metrics.evEbitda),
    debtToEquity: normalizeMetric(metrics.debtToEquity),
    source: metrics.source ?? entry?.source ?? null,
  };
}

function applyFundamentalSupplement(row, metrics = {}, meta = null) {
  const merged = {
    ...row,
    fcfTtm: row.fcfTtm ?? metrics.fcfTtm ?? null,
    fcfMargin: row.fcfMargin ?? metrics.fcfMargin ?? null,
    fcfGrowthTtm: row.fcfGrowthTtm ?? metrics.fcfGrowthTtm ?? null,
    cashFromOperationsTtm: row.cashFromOperationsTtm ?? metrics.cashFromOperationsTtm ?? null,
    cashConversion: row.cashConversion ?? metrics.cashConversion ?? null,
    pFcf: row.pFcf ?? metrics.pFcf ?? null,
    fundamentalSupplement: meta,
  };
  const ruleOf40Raw = merged.revenueGrowthTtm !== null && merged.fcfMargin !== null
    ? Number((merged.revenueGrowthTtm + merged.fcfMargin).toFixed(2))
    : row.ruleOf40Raw ?? null;

  return {
    ...merged,
    ruleOf40Raw,
    ruleOf40: ruleOf40Raw,
    ruleOf40Score: row.ruleOf40Components?.scoreEligible ? ruleOf40Raw : row.ruleOf40Score ?? null,
    ruleOf40Components: {
      revenueGrowthTtm: merged.revenueGrowthTtm,
      fcfMargin: merged.fcfMargin,
      complete: ruleOf40Raw !== null && ruleOf40Raw !== undefined,
      scoreEligible: row.ruleOf40Components?.scoreEligible ?? false,
    },
  };
}

function shouldUseUsFundamentalSupplement(row) {
  return row?.exchange !== 'OTC' && (
    row.fcfMargin === null
    || row.fcfTtm === null
    || row.pFcf === null
    || row.cashConversion === null
    || row.ruleOf40Raw === null
  );
}

async function applyUsFundamentalSupplements(rows, { getSupplementalFundamentals } = {}) {
  if (rows.length === 0) return rows;
  const targets = rows.filter(shouldUseUsFundamentalSupplement);
  if (targets.length === 0) return rows;
  const supplementalRows = getSupplementalFundamentals
    ? await getSupplementalFundamentals(targets)
    : {};

  return rows.map((row) => {
    if (!shouldUseUsFundamentalSupplement(row)) return row;
    const symbol = row.symbol?.toUpperCase();
    const external = supplementalRows?.[symbol] ?? null;
    const staticEntry = US_FUNDAMENTAL_SUPPLEMENTS.symbols?.[symbol] ?? null;
    const metrics = external ?? (staticEntry ? computeFcfSupplementMetrics(staticEntry, row) : null);
    if (!metrics) return row;
    const source = external?.source ?? staticEntry?.source ?? 'supplemental';
    return applyFundamentalSupplement(row, metrics, {
      source,
      sourceUrl: external?.sourceUrl ?? staticEntry?.sourceUrl ?? null,
      period: external?.period ?? staticEntry?.period ?? null,
      notes: external?.notes ?? staticEntry?.notes ?? null,
    });
  });
}

function normalizeRequestedSymbol(symbol) {
  return String(symbol || '').trim().toUpperCase();
}

function symbolMatchesRequested(row, requestedSymbol) {
  const normalized = normalizeRequestedSymbol(requestedSymbol);
  if (!normalized) return false;
  const exchangeSymbol = `${String(row.exchange || '').toUpperCase()}:${String(row.symbol || '').toUpperCase()}`;
  return exchangeSymbol === normalized || String(row.symbol || '').toUpperCase() === normalized;
}

async function fetchRowsForSymbols({ symbols, market, fetchFn }) {
  if (!Array.isArray(symbols) || symbols.length === 0) return [];
  const scannerUrl = `https://scanner.tradingview.com/${market}/scan`;
  const chunkSize = 40;
  const rows = [];

  for (let i = 0; i < symbols.length; i += chunkSize) {
    const chunk = symbols.slice(i, i + chunkSize);
    const response = await fetchFn(scannerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildTickerRequestBody(chunk, market)),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`TradingView scanner request failed: HTTP ${response.status}`);
    }

    const payload = await response.json();
    if (!Array.isArray(payload?.data)) {
      throw new Error('TradingView scanner returned unexpected response format');
    }

    rows.push(...payload.data.map(normalizeRow));
  }

  return dedupeRows(rows);
}

function buildExtremeMomentum(row) {
  const flags = [];
  if (row.perf6m !== null && row.perf6m !== undefined && row.perf6m > 600) {
    flags.push('perf6m_gt_600');
  }
  if (row.perfY !== null && row.perfY !== undefined && row.perfY > 1000) {
    flags.push('perfY_gt_1000');
  }

  return {
    isExtreme: flags.length > 0,
    flags,
  };
}

function dedupeRows(rows) {
  const deduped = new Map();
  for (const row of rows) {
    const key = `${row.exchange ?? ''}:${row.symbol}`;
    if (!deduped.has(key)) {
      deduped.set(key, row);
    }
  }
  return [...deduped.values()];
}

function buildRowLookupKey(row) {
  return `${row.exchange ?? ''}:${row.symbol ?? ''}`.toUpperCase();
}

function stripInternalFields(row) {
  const {
    screeningThresholds,
    screeningPfcfMax,
    screeningRevenueGrowthMinPct,
    ruleOf40Raw,
    ruleOf40Score,
    ...publicRow
  } = row;
  return publicRow;
}

function mergeSourceBuckets(existingBuckets, bucket) {
  return ['phase4', 'phase5'].filter((entry) => (
    existingBuckets?.includes(entry) || entry === bucket
  ));
}

function averageRank(values, fallback) {
  const usable = values.filter((value) => value !== null && value !== undefined);
  if (usable.length === 0) return fallback;
  return Number((usable.reduce((sum, value) => sum + value, 0) / usable.length).toFixed(2));
}

function resolveFallbackRank(strategy, rowCount) {
  return strategy === 'neutral'
    ? Number(((rowCount + 1) / 2).toFixed(2))
    : rowCount + 1;
}

function rankSumToPositiveScore(weightedRank, rowCount) {
  if (rowCount <= 0) return 0;
  return Number(Math.max(0, ((rowCount + 1 - weightedRank) / rowCount) * 100).toFixed(2));
}

function assignRanks(rows, field, direction = 'desc') {
  const indexed = rows.map((r, i) => ({ i, val: r[field] }));
  indexed.sort((a, b) => {
    if (a.val === null || a.val === undefined) return 1;
    if (b.val === null || b.val === undefined) return -1;
    return direction === 'asc' ? a.val - b.val : b.val - a.val;
  });
  const ranks = new Array(rows.length);
  indexed.forEach(({ i }, rank) => {
    ranks[i] = rank + 1;
  });
  return ranks;
}

function applyBlockRanks(rows, rankingBlocks = RANK_BLOCKS) {
  const rankMaps = new Map();
  for (const block of rankingBlocks) {
    for (const field of block.fields) {
      rankMaps.set(`${block.key}:${field.key}`, assignRanks(rows, field.key, field.direction));
    }
  }

  return rows.map((row, i) => ({
    ...row,
    rankBreakdown: Object.fromEntries(rankingBlocks.map((block) => {
      const fieldRanks = Object.fromEntries(block.fields.map((field) => [
        field.key,
        rankMaps.get(`${block.key}:${field.key}`)[i],
      ]));
      const missingFallback = resolveFallbackRank(block.missingRank, rows.length);
      const usableFieldCount = block.fields.filter((field) => (
        row[field.key] !== null && row[field.key] !== undefined
      )).length;
      const minUsableFields = block.minUsableFields ?? 1;
      const blockRank = usableFieldCount < minUsableFields
        ? resolveFallbackRank(block.insufficientFieldRank, rows.length)
        : averageRank(block.fields.map((field) => (
        row[field.key] !== null && row[field.key] !== undefined
          ? fieldRanks[field.key]
          : missingFallback
      )), missingFallback);
      return [block.key, {
        label: block.label,
        weight: block.weight,
        rank: blockRank,
        fields: fieldRanks,
      }];
    })),
  })).map((row) => {
    const weightedRank = Number(rankingBlocks.reduce(
      (sum, block) => sum + (row.rankBreakdown[block.key].rank * (block.weight / 100)),
      0,
    ).toFixed(2));
    return {
      ...row,
      rankScore: rankSumToPositiveScore(weightedRank, rows.length),
    };
  });
}

function countBy(rows, field) {
  const counts = new Map();
  for (const row of rows) {
    const key = row[field] ?? 'Unknown';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function summarizeSectors(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const key = row.sector ?? 'Unknown';
    if (!grouped.has(key)) {
      grouped.set(key, {
        sector: key,
        count: 0,
        totalPerf3m: 0,
        perf3mCount: 0,
        totalRankScore: 0,
        topRows: [],
        phase1SectorRank: row.phase1SectorRank ?? null,
      });
    }
    const entry = grouped.get(key);
    entry.count += 1;
    entry.totalRankScore += row.rankScore ?? 0;
    if (row.perf3m !== null && row.perf3m !== undefined) {
      entry.totalPerf3m += row.perf3m;
      entry.perf3mCount += 1;
    }
    entry.topRows.push(row);
    if (entry.phase1SectorRank === null && row.phase1SectorRank !== null && row.phase1SectorRank !== undefined) {
      entry.phase1SectorRank = row.phase1SectorRank;
    }
  }

  return Array.from(grouped.values())
    .map((entry) => ({
      sector: entry.sector,
      phase1SectorRank: entry.phase1SectorRank,
      count: entry.count,
      averagePerf3m: entry.perf3mCount > 0
        ? Number((entry.totalPerf3m / entry.perf3mCount).toFixed(1))
        : null,
      averageRankScore: entry.count > 0
        ? Number((entry.totalRankScore / entry.count).toFixed(1))
        : null,
      topRows: entry.topRows
        .sort((a, b) => (b.rankScore ?? -Infinity) - (a.rankScore ?? -Infinity))
        .slice(0, 30)
        .map((row) => stripInternalFields(row)),
    }))
    .sort((a, b) => {
      const aRank = a.phase1SectorRank ?? Number.POSITIVE_INFINITY;
      const bRank = b.phase1SectorRank ?? Number.POSITIVE_INFINITY;
      if (aRank !== bRank) return aRank - bRank;
      if (b.averagePerf3m !== a.averagePerf3m) {
        return (b.averagePerf3m ?? -Infinity) - (a.averagePerf3m ?? -Infinity);
      }
      if (b.count !== a.count) return b.count - a.count;
      return (b.averageRankScore ?? -Infinity) - (a.averageRankScore ?? -Infinity);
    });
}

function addMetric(entry, field, value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return;
  entry.metricTotals[field] += Number(value);
  entry.metricCounts[field] += 1;
}

function addRatio(entry, field, condition, eligible) {
  if (!eligible) return;
  entry.ratioBases[field] += 1;
  if (condition) entry.ratioCounts[field] += 1;
}

function averageMetric(entry, field, digits = 1) {
  const count = entry.metricCounts[field];
  return count > 0
    ? Number((entry.metricTotals[field] / count).toFixed(digits))
    : null;
}

function percentageMetric(entry, field, digits = 1) {
  const base = entry.ratioBases[field];
  return base > 0
    ? Number(((entry.ratioCounts[field] / base) * 100).toFixed(digits))
    : null;
}

function compareIndustryRows(a, b) {
  if ((b.perf3m ?? -Infinity) !== (a.perf3m ?? -Infinity)) {
    return (b.perf3m ?? -Infinity) - (a.perf3m ?? -Infinity);
  }
  if ((b.perf6m ?? -Infinity) !== (a.perf6m ?? -Infinity)) {
    return (b.perf6m ?? -Infinity) - (a.perf6m ?? -Infinity);
  }
  if ((b.perfY ?? -Infinity) !== (a.perfY ?? -Infinity)) {
    return (b.perfY ?? -Infinity) - (a.perfY ?? -Infinity);
  }
  return (a.symbol ?? '').localeCompare(b.symbol ?? '');
}

function buildIndustryScore(entries) {
  const fields = [
    { key: 'averagePerfY', direction: 'desc' },
    { key: 'averagePerf6m', direction: 'desc' },
    { key: 'averagePerf3m', direction: 'desc' },
    { key: 'relativeStrengthY', direction: 'desc' },
    { key: 'relativeStrength6m', direction: 'desc' },
    { key: 'relativeStrength3m', direction: 'desc' },
    { key: 'pctAboveSma50', direction: 'desc' },
    { key: 'pctAboveSma200', direction: 'desc' },
    { key: 'pctNear52WeekHigh', direction: 'desc' },
    { key: 'averageRelativeVolume', direction: 'desc' },
  ].filter((field) => entries.some((entry) => entry[field.key] !== null && entry[field.key] !== undefined));

  if (entries.length === 0 || fields.length === 0) return entries;

  const rankMaps = new Map(fields.map((field) => [
    field.key,
    assignRanks(entries, field.key, field.direction),
  ]));

  return entries.map((entry, index) => {
    const averageRankValue = averageRank(
      fields.map((field) => rankMaps.get(field.key)[index]),
      entries.length + 1,
    );
    return {
      ...entry,
      industryScore: rankSumToPositiveScore(averageRankValue, entries.length),
    };
  });
}

function summarizeIndustries(rows, {
  benchmark = null,
  rankingLimit = INDUSTRY_RANKING_LIMIT,
  finalIndustryLimit = FINAL_INDUSTRY_LIMIT,
} = {}) {
  const grouped = new Map();
  let missingIndustryCount = 0;

  for (const row of rows) {
    if (!row.sector || !row.industry) {
      missingIndustryCount += 1;
      continue;
    }

    const key = `${row.sector}\u0000${row.industry}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        sector: row.sector,
        industry: row.industry,
        count: 0,
        metricTotals: {
          perfY: 0,
          perf6m: 0,
          perf3m: 0,
          rsi14: 0,
          relativeVolume: 0,
        },
        metricCounts: {
          perfY: 0,
          perf6m: 0,
          perf3m: 0,
          rsi14: 0,
          relativeVolume: 0,
        },
        ratioCounts: {
          aboveSma50: 0,
          aboveSma200: 0,
          near52WeekHigh: 0,
        },
        ratioBases: {
          aboveSma50: 0,
          aboveSma200: 0,
          near52WeekHigh: 0,
        },
        rows: [],
      });
    }

    const entry = grouped.get(key);
    entry.count += 1;
    entry.rows.push(row);
    addMetric(entry, 'perfY', row.perfY);
    addMetric(entry, 'perf6m', row.perf6m);
    addMetric(entry, 'perf3m', row.perf3m);
    addMetric(entry, 'rsi14', row.rsi14);
    addMetric(entry, 'relativeVolume', row.relativeVolume);
    addRatio(
      entry,
      'aboveSma50',
      row.close > row.sma50,
      row.close !== null && row.close !== undefined && row.sma50 !== null && row.sma50 !== undefined,
    );
    addRatio(
      entry,
      'aboveSma200',
      row.close > row.sma200,
      row.close !== null && row.close !== undefined && row.sma200 !== null && row.sma200 !== undefined,
    );
    addRatio(
      entry,
      'near52WeekHigh',
      row.pctOf52wHigh >= 90,
      row.pctOf52wHigh !== null && row.pctOf52wHigh !== undefined,
    );
  }

  const scoredEntries = buildIndustryScore(Array.from(grouped.values()).map((entry) => {
    const averagePerfY = averageMetric(entry, 'perfY');
    const averagePerf6m = averageMetric(entry, 'perf6m');
    const averagePerf3m = averageMetric(entry, 'perf3m');
    return {
      key: entry.key,
      sector: entry.sector,
      industry: entry.industry,
      count: entry.count,
      averagePerfY,
      averagePerf6m,
      averagePerf3m,
      relativeStrengthY: averagePerfY !== null && benchmark?.perfY !== null && benchmark?.perfY !== undefined
        ? Number((averagePerfY - benchmark.perfY).toFixed(1))
        : null,
      relativeStrength6m: averagePerf6m !== null && benchmark?.perf6m !== null && benchmark?.perf6m !== undefined
        ? Number((averagePerf6m - benchmark.perf6m).toFixed(1))
        : null,
      relativeStrength3m: averagePerf3m !== null && benchmark?.perf3m !== null && benchmark?.perf3m !== undefined
        ? Number((averagePerf3m - benchmark.perf3m).toFixed(1))
        : null,
      pctAboveSma50: percentageMetric(entry, 'aboveSma50'),
      pctAboveSma200: percentageMetric(entry, 'aboveSma200'),
      pctNear52WeekHigh: percentageMetric(entry, 'near52WeekHigh'),
      averageRsi14: averageMetric(entry, 'rsi14'),
      averageRelativeVolume: averageMetric(entry, 'relativeVolume', 2),
      rows: entry.rows,
    };
  }));

  const rankedEntries = scoredEntries
    .sort((a, b) => {
      if ((b.industryScore ?? -Infinity) !== (a.industryScore ?? -Infinity)) {
        return (b.industryScore ?? -Infinity) - (a.industryScore ?? -Infinity);
      }
      if ((b.averagePerf3m ?? -Infinity) !== (a.averagePerf3m ?? -Infinity)) {
        return (b.averagePerf3m ?? -Infinity) - (a.averagePerf3m ?? -Infinity);
      }
      if (b.count !== a.count) return b.count - a.count;
      if (a.sector !== b.sector) return a.sector.localeCompare(b.sector);
      return a.industry.localeCompare(b.industry);
    });

  const rankings = rankedEntries
    .slice(0, rankingLimit)
    .map((entry) => ({
      sector: entry.sector,
      industry: entry.industry,
      count: entry.count,
      averagePerfY: entry.averagePerfY,
      averagePerf6m: entry.averagePerf6m,
      averagePerf3m: entry.averagePerf3m,
      relativeStrengthY: entry.relativeStrengthY,
      relativeStrength6m: entry.relativeStrength6m,
      relativeStrength3m: entry.relativeStrength3m,
      pctAboveSma50: entry.pctAboveSma50,
      pctAboveSma200: entry.pctAboveSma200,
      pctNear52WeekHigh: entry.pctNear52WeekHigh,
      averageRsi14: entry.averageRsi14,
      averageRelativeVolume: entry.averageRelativeVolume,
      industryScore: entry.industryScore,
      topSymbols: [...entry.rows]
        .sort(compareIndustryRows)
        .slice(0, 3)
        .map((row) => row.symbol),
    }));

  const selectedIndustryKeys = new Set(
    rankedEntries.slice(0, finalIndustryLimit).map((entry) => entry.key),
  );
  const finalStockRanking = rows
    .filter((row) => selectedIndustryKeys.has(`${row.sector}\u0000${row.industry}`))
    .sort((a, b) => {
      if ((b.rankScore ?? -Infinity) !== (a.rankScore ?? -Infinity)) {
        return (b.rankScore ?? -Infinity) - (a.rankScore ?? -Infinity);
      }
      return (a.symbol ?? '').localeCompare(b.symbol ?? '');
    })
    .map((row) => stripInternalFields(row));

  return {
    rankings,
    finalStockRanking,
    selectedIndustryCount: Math.min(finalIndustryLimit, rankedEntries.length),
    missingIndustryCount,
    selectedIndustryKeys,
  };
}

function buildPrimarySmallTheme(row) {
  return row?.subThemes?.[0] ?? null;
}

function getFocusedHierarchySource(rows, focusSector, market = DEFAULT_MARKET) {
  if (!focusSector) {
    return {
      hierarchyDefinition: null,
      sectorRows: [],
      classifiedSectorRows: [],
    };
  }

  const hierarchyDefinition = getSectorThemeHierarchyForMarket(market, focusSector);
  const sectorRows = rows.filter((row) => row.sector === focusSector);
  if (!hierarchyDefinition || hierarchyDefinition.middleThemes.length === 0) {
    return {
      hierarchyDefinition,
      sectorRows,
      classifiedSectorRows: [],
    };
  }

  const allowedMiddleThemes = new Set(hierarchyDefinition.middleThemes.map((entry) => entry.label));
  const classifiedSectorRows = sectorRows.filter((row) => allowedMiddleThemes.has(row.primaryTheme));

  return {
    hierarchyDefinition,
    sectorRows,
    classifiedSectorRows,
  };
}

function summarizeFocusedMiddleThemes(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const middleTheme = row.primaryTheme ?? 'Unclassified';
    if (!grouped.has(middleTheme)) {
      grouped.set(middleTheme, {
        middleTheme,
        count: 0,
        totalPerf3m: 0,
        perf3mCount: 0,
        totalRankScore: 0,
        topRows: [],
        smallThemeCounts: new Map(),
      });
    }
    const entry = grouped.get(middleTheme);
    entry.count += 1;
    entry.totalRankScore += row.rankScore ?? 0;
    if (row.perf3m !== null && row.perf3m !== undefined) {
      entry.totalPerf3m += row.perf3m;
      entry.perf3mCount += 1;
    }
    entry.topRows.push(row);
    const primarySmallTheme = buildPrimarySmallTheme(row);
    if (primarySmallTheme) {
      entry.smallThemeCounts.set(primarySmallTheme, (entry.smallThemeCounts.get(primarySmallTheme) ?? 0) + 1);
    }
  }

  return Array.from(grouped.values())
    .map((entry) => ({
      middleTheme: entry.middleTheme,
      count: entry.count,
      averagePerf3m: entry.perf3mCount > 0
        ? Number((entry.totalPerf3m / entry.perf3mCount).toFixed(1))
        : null,
      averageRankScore: entry.count > 0
        ? Number((entry.totalRankScore / entry.count).toFixed(1))
        : null,
      topSmallThemes: Array.from(entry.smallThemeCounts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 3)
        .map(([label]) => label),
      topRows: entry.topRows
        .sort((a, b) => (b.rankScore ?? -Infinity) - (a.rankScore ?? -Infinity))
        .slice(0, 5)
        .map((row) => stripInternalFields(row)),
    }))
    .sort((a, b) => {
      if ((b.averageRankScore ?? -Infinity) !== (a.averageRankScore ?? -Infinity)) {
        return (b.averageRankScore ?? -Infinity) - (a.averageRankScore ?? -Infinity);
      }
      if ((b.averagePerf3m ?? -Infinity) !== (a.averagePerf3m ?? -Infinity)) {
        return (b.averagePerf3m ?? -Infinity) - (a.averagePerf3m ?? -Infinity);
      }
      if (b.count !== a.count) return b.count - a.count;
      return a.middleTheme.localeCompare(b.middleTheme);
    });
}

function summarizeFocusedSmallThemes(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const primarySmallTheme = buildPrimarySmallTheme(row);
    if (!primarySmallTheme) continue;
    const middleTheme = row.primaryTheme ?? 'Unclassified';
    const key = `${middleTheme}::${primarySmallTheme}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        middleTheme,
        smallTheme: primarySmallTheme,
        count: 0,
        totalPerf3m: 0,
        perf3mCount: 0,
        totalRankScore: 0,
        topRows: [],
      });
    }
    const entry = grouped.get(key);
    entry.count += 1;
    entry.totalRankScore += row.rankScore ?? 0;
    if (row.perf3m !== null && row.perf3m !== undefined) {
      entry.totalPerf3m += row.perf3m;
      entry.perf3mCount += 1;
    }
    entry.topRows.push(row);
  }

  return Array.from(grouped.values())
    .map((entry) => ({
      middleTheme: entry.middleTheme,
      smallTheme: entry.smallTheme,
      count: entry.count,
      averagePerf3m: entry.perf3mCount > 0
        ? Number((entry.totalPerf3m / entry.perf3mCount).toFixed(1))
        : null,
      averageRankScore: entry.count > 0
        ? Number((entry.totalRankScore / entry.count).toFixed(1))
        : null,
      topRows: entry.topRows
        .sort((a, b) => (b.rankScore ?? -Infinity) - (a.rankScore ?? -Infinity))
        .slice(0, 5)
        .map((row) => stripInternalFields(row)),
    }))
    .sort((a, b) => {
      if ((b.averageRankScore ?? -Infinity) !== (a.averageRankScore ?? -Infinity)) {
        return (b.averageRankScore ?? -Infinity) - (a.averageRankScore ?? -Infinity);
      }
      if ((b.averagePerf3m ?? -Infinity) !== (a.averagePerf3m ?? -Infinity)) {
        return (b.averagePerf3m ?? -Infinity) - (a.averagePerf3m ?? -Infinity);
      }
      if (b.count !== a.count) return b.count - a.count;
      if (a.middleTheme !== b.middleTheme) return a.middleTheme.localeCompare(b.middleTheme);
      return a.smallTheme.localeCompare(b.smallTheme);
    });
}

function buildFocusedHierarchy(rows, focusSector, {
  market = DEFAULT_MARKET,
  topMiddleThemeCount = null,
  topSmallThemeCount = 3,
  topStockCount = 20,
} = {}) {
  if (!focusSector) return null;
  const {
    hierarchyDefinition,
    sectorRows,
    classifiedSectorRows,
  } = getFocusedHierarchySource(rows, focusSector, market);
  if (!hierarchyDefinition || hierarchyDefinition.middleThemes.length === 0) return null;

  if (sectorRows.length === 0) {
    return {
      hierarchyVersion: hierarchyDefinition.version,
      focusSector,
      candidateCount: 0,
      middleThemeRanking: [],
      selectedMiddleThemes: [],
      smallThemeRanking: [],
      selectedSmallThemes: [],
      stockRanking: [],
    };
  }

  const middleThemeRanking = summarizeFocusedMiddleThemes(classifiedSectorRows);
  const selectedMiddleThemeLimit = topMiddleThemeCount ?? Math.max(1, Math.ceil(middleThemeRanking.length / 2));
  const selectedMiddleThemes = middleThemeRanking
    .slice(0, selectedMiddleThemeLimit)
    .map((entry) => entry.middleTheme);
  const smallThemeCandidates = summarizeFocusedSmallThemes(
    classifiedSectorRows.filter((row) => selectedMiddleThemes.includes(row.primaryTheme)),
  );
  const selectedSmallThemes = smallThemeCandidates
    .slice(0, topSmallThemeCount)
    .map((entry) => ({ middleTheme: entry.middleTheme, smallTheme: entry.smallTheme }));
  const selectedSmallThemeKeys = new Set(selectedSmallThemes.map((entry) => `${entry.middleTheme}::${entry.smallTheme}`));
  const stockRanking = sectorRows
    .filter((row) => selectedMiddleThemes.includes(row.primaryTheme))
    .filter((row) => selectedSmallThemeKeys.has(`${row.primaryTheme ?? 'Unclassified'}::${buildPrimarySmallTheme(row) ?? ''}`))
    .sort((a, b) => (b.rankScore ?? -Infinity) - (a.rankScore ?? -Infinity))
    .slice(0, topStockCount)
    .map((row) => stripInternalFields(row));

  return {
    hierarchyVersion: hierarchyDefinition.version,
    focusSector,
    candidateCount: sectorRows.length,
    middleThemeRanking,
    selectedMiddleThemes,
    smallThemeRanking: smallThemeCandidates,
    selectedSmallThemes,
    stockRanking,
  };
}

function buildSectorRankLookup(sectorMomentum) {
  const lookup = new Map();
  (sectorMomentum?.rankings ?? []).forEach((entry, index) => {
    lookup.set(entry.sector, {
      phase1SectorRank: index + 1,
      phase1SectorRankScore: entry.rankScore ?? index + 1,
      phase1SectorPerf3m: entry.perf3m ?? null,
      phase1SectorPerf6m: entry.perf6m ?? null,
      phase1SectorPerfY: entry.perfY ?? null,
    });
  });
  return lookup;
}

async function fetchProfileRows({ scannerUrl, fetchFn, market, requestPlans, serverLimit }) {
  return Promise.all(
    requestPlans.map(async ({ profile, scope }) => {
      const response = await fetchFn(scannerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRequestBody(serverLimit, { market, profile, scope })),
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`TradingView scanner request failed: HTTP ${response.status}`);
      }

      const payload = await response.json();

      if (!Array.isArray(payload?.data)) {
        throw new Error('TradingView scanner returned unexpected response format');
      }

      return {
        profile,
        scope,
        totalCount: payload.totalCount ?? payload.data.length,
        rows: payload.data.map(normalizeRow),
      };
    }),
  );
}

async function buildPhase5SectorTopStocks({
  market,
  scannerUrl,
  fetchFn,
  sectorMomentum,
  sectorRankLookup,
  exchangeAllowlist,
  symbolAllowlist,
  marketCapMinUsd,
  enrichWithYahoo,
  getFundamentals,
  _deps,
}) {
  const emptyMeta = {
    enabled: market === DEFAULT_MARKET,
    sectorLimit: PHASE5_SECTOR_LIMIT,
    topStocksPerSector: PHASE5_TOP_STOCKS_PER_SECTOR,
    sourceSectors: 0,
    fetchedRows: 0,
    scopeFilteredRows: 0,
    clientFilteredRows: 0,
    rankedRows: 0,
    displayedRows: 0,
  };
  if (market !== DEFAULT_MARKET) return { rows: [], candidateRows: [], sectorLabels: [], meta: emptyMeta };

  const phase5SectorLabels = (sectorMomentum.rankings ?? [])
    .slice(0, PHASE5_SECTOR_LIMIT)
    .map((entry) => entry.sector)
    .filter(Boolean);
  const { activeProfiles } = getSectorScreeningPlan({
    market,
    selectedSectors: phase5SectorLabels,
  });
  const effectiveProfiles = applyMarketCapThresholdOverride(activeProfiles, marketCapMinUsd);
  const requestPlans = effectiveProfiles.flatMap((profile) => profile.requestScopes.map((scope) => ({ profile, scope })));

  if (requestPlans.length === 0) {
    return {
      rows: [],
      candidateRows: [],
      sectorLabels: phase5SectorLabels,
      meta: {
        ...emptyMeta,
        sourceSectors: phase5SectorLabels.length,
      },
    };
  }

  const responses = await fetchProfileRows({
    scannerUrl,
    fetchFn,
    market,
    requestPlans,
    serverLimit: PHASE5_SECTOR_UNIVERSE_SERVER_LIMIT,
  });
  const fetchedRows = dedupeRows(responses.flatMap((entry) => entry.rows));
  const scopeFiltered = dedupeRows(
    responses.flatMap(({ profile, rows }) => rows
      .filter((row) => phase5SectorLabels.includes(row.sector))
      .filter((row) => passesScopeFilters(row, { exchangeAllowlist, symbolAllowlist }))
      .filter((row) => passesProfileScope(row, profile))
      .map((row) => annotateRowForProfile(row, profile, sectorRankLookup, market))),
  );
  let clientFiltered = scopeFiltered.filter(passesProfileClientFilters);

  let growthMap = {};
  if (enrichWithYahoo && clientFiltered.length > 0) {
    const symbols = clientFiltered.map((row) => row.symbol);
    growthMap = getFundamentals
      ? await batchFetchSupplementalGrowthMetrics(symbols, getFundamentals)
      : await batchFetchMoomooGrowthMetrics(symbols, { market, _deps });
    clientFiltered = clientFiltered.map((row) => applySupplementalGrowthMetrics(row, growthMap[row.symbol]));
  }

  if (clientFiltered.length > 0) {
    clientFiltered = await applyUsFundamentalSupplements(clientFiltered, {
      getSupplementalFundamentals: _deps?.getUsSupplementalFundamentals ?? null,
    });
    clientFiltered = await applyUsMissingMetricSupplements(clientFiltered, {
      growthMap,
      getMissingMetricSupplementals: Object.hasOwn(_deps ?? {}, 'getUsMissingMetricSupplementals')
        ? _deps.getUsMissingMetricSupplementals
        : undefined,
    });
  }

  const ranked = applyBlockRanks(
    applyLocalizedCompanyNames(applyThemeTaxonomy(clientFiltered, market), market),
    getRankingBlocks(market),
  );
  const candidateRows = ranked.map((row) => stripInternalFields(row));
  const displayedRows = [];
  phase5SectorLabels.forEach((sector, sectorIndex) => {
    ranked
      .filter((row) => row.sector === sector)
      .sort((a, b) => {
        if ((b.rankScore ?? -Infinity) !== (a.rankScore ?? -Infinity)) {
          return (b.rankScore ?? -Infinity) - (a.rankScore ?? -Infinity);
        }
        return (a.symbol ?? '').localeCompare(b.symbol ?? '');
      })
      .slice(0, PHASE5_TOP_STOCKS_PER_SECTOR)
      .forEach((row, rowIndex) => {
        displayedRows.push(stripInternalFields({
          ...row,
          phase5SectorRank: sectorIndex + 1,
          phase5SectorStockRank: rowIndex + 1,
        }));
      });
  });

  return {
    rows: displayedRows,
    candidateRows,
    sectorLabels: phase5SectorLabels,
    meta: {
      enabled: true,
      sectorLimit: PHASE5_SECTOR_LIMIT,
      topStocksPerSector: PHASE5_TOP_STOCKS_PER_SECTOR,
      sourceSectors: phase5SectorLabels.length,
      fetchedRows: fetchedRows.length,
      scopeFilteredRows: scopeFiltered.length,
      clientFilteredRows: clientFiltered.length,
      rankedRows: ranked.length,
      displayedRows: displayedRows.length,
    },
  };
}

export function buildUnifiedCandidateRows({ phase4Rows = [], phase5Rows = [] } = {}) {
  const merged = new Map();
  const addRows = (rows, bucket) => {
    if (!Array.isArray(rows)) return;
    for (const row of rows) {
      const key = buildRowLookupKey(row);
      if (!key || key === ':') continue;
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, {
          ...row,
          sourceBuckets: mergeSourceBuckets([], bucket),
          phase4Eligible: bucket === 'phase4',
          phase5Eligible: bucket === 'phase5',
        });
        continue;
      }

      merged.set(key, {
        ...row,
        ...existing,
        phase5SectorRank: existing.phase5SectorRank ?? row.phase5SectorRank,
        phase5SectorStockRank: existing.phase5SectorStockRank ?? row.phase5SectorStockRank,
        sourceBuckets: mergeSourceBuckets(existing.sourceBuckets, bucket),
        phase4Eligible: existing.phase4Eligible || bucket === 'phase4',
        phase5Eligible: existing.phase5Eligible || bucket === 'phase5',
      });
    }
  };

  addRows(phase4Rows, 'phase4');
  addRows(phase5Rows, 'phase5');
  return [...merged.values()];
}

export function applyUnifiedRanks(rows, market = DEFAULT_MARKET) {
  return applyBlockRanks(rows, getRankingBlocks(market))
    .sort((a, b) => {
      if ((b.rankScore ?? -Infinity) !== (a.rankScore ?? -Infinity)) {
        return (b.rankScore ?? -Infinity) - (a.rankScore ?? -Infinity);
      }
      return (a.symbol ?? '').localeCompare(b.symbol ?? '');
    })
    .map((row, index) => ({
      ...row,
      unifiedRank: index + 1,
      unifiedRankScore: row.rankScore,
      unifiedRankBreakdown: row.rankBreakdown,
    }));
}

export function buildUnifiedPhase4Ranking(unifiedRankedRows, limit = FINAL_STOCK_LIMIT) {
  if (!Array.isArray(unifiedRankedRows)) return [];
  return unifiedRankedRows
    .filter((row) => row.phase4Eligible || row.phase5Eligible)
    .slice(0, limit)
    .map((row) => stripInternalFields(row));
}

export function buildUnifiedPhase5SectorTopStocks(
  unifiedRankedRows,
  phase5SectorLabels = [],
) {
  if (!Array.isArray(unifiedRankedRows) || !Array.isArray(phase5SectorLabels)) return [];
  const displayedRows = [];
  phase5SectorLabels.slice(0, PHASE5_SECTOR_LIMIT).forEach((sector, sectorIndex) => {
    unifiedRankedRows
      .filter((row) => row.phase5Eligible === true && row.sector === sector)
      .sort((a, b) => {
        if ((b.unifiedRankScore ?? -Infinity) !== (a.unifiedRankScore ?? -Infinity)) {
          return (b.unifiedRankScore ?? -Infinity) - (a.unifiedRankScore ?? -Infinity);
        }
        return (a.symbol ?? '').localeCompare(b.symbol ?? '');
      })
      .slice(0, PHASE5_TOP_STOCKS_PER_SECTOR)
      .forEach((row, rowIndex) => {
        displayedRows.push(stripInternalFields({
          ...row,
          phase5SectorRank: sectorIndex + 1,
          phase5SectorStockRank: rowIndex + 1,
        }));
      });
  });
  return displayedRows;
}

export function buildHiddenPhase4Candidates(finalStockRanking, phase5SectorTopStocks) {
  if (!Array.isArray(phase5SectorTopStocks) || phase5SectorTopStocks.length === 0) return [];

  const phase4Rows = Array.isArray(finalStockRanking) ? finalStockRanking : [];
  const phase4Symbols = new Set(phase4Rows.map((row) => String(row.symbol ?? '').toUpperCase()));
  const phase4FloorScore = phase4Rows.length > 0
    ? phase4Rows.reduce((min, row) => Math.min(min, row.rankScore ?? Number.POSITIVE_INFINITY), Number.POSITIVE_INFINITY)
    : null;
  const scoreThreshold = Math.max(50, Number.isFinite(phase4FloorScore) ? phase4FloorScore : 50);

  return phase5SectorTopStocks
    .filter((row) => {
      const symbol = String(row.symbol ?? '').toUpperCase();
      return symbol
        && !phase4Symbols.has(symbol)
        && (row.phase5SectorStockRank ?? Number.POSITIVE_INFINITY) <= 3
        && (row.rankScore ?? -Infinity) >= scoreThreshold
        && (row.phase5SectorRank ?? 0) >= 10
        && ((row.perf3m ?? -Infinity) >= 30 || (row.perf6m ?? -Infinity) >= 40);
    })
    .sort((a, b) => {
      if ((b.rankScore ?? -Infinity) !== (a.rankScore ?? -Infinity)) {
        return (b.rankScore ?? -Infinity) - (a.rankScore ?? -Infinity);
      }
      return (a.symbol ?? '').localeCompare(b.symbol ?? '');
    })
    .slice(0, 5);
}

function applyThemeTaxonomy(rows, market) {
  return rows.map((row) => {
    const classification = classifyThemeForMarket(row, market);
    return {
      ...row,
      themeTaxonomyVersion: classification.taxonomyVersion,
      primaryThemeId: classification.primaryThemeId,
      primaryTheme: classification.primaryTheme,
      subThemeIds: classification.subThemeIds,
      subThemes: classification.subThemes,
      themeMatchReason: classification.themeMatchReason,
      matchedThemeIds: classification.matchedThemeIds,
      matchedThemes: classification.matchedThemes,
      externalThemeReferenceVersion: classification.externalThemeReferenceVersion,
      externalThemeReferences: classification.externalThemeReferences,
      externalConfirmedBy: classification.externalConfirmedBy,
      externalConfirmationCount: classification.externalConfirmationCount,
    };
  });
}

const YAHOO_BATCH_SIZE = 5;
const YAHOO_BATCH_DELAY_MS = 500;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches supplemental growth metrics from a dependency-injected fundamentals
 * provider. Processes in batches of YAHOO_BATCH_SIZE with a delay between
 * batches. On error, leaves the supplemental metrics null.
 */
async function batchFetchSupplementalGrowthMetrics(symbols, getFundamentals) {
  const results = {};
  for (let i = 0; i < symbols.length; i += YAHOO_BATCH_SIZE) {
    const batch = symbols.slice(i, i + YAHOO_BATCH_SIZE);
    await Promise.all(
      batch.map(async (symbol) => {
        try {
          const data = await getFundamentals(symbol);
          results[symbol] = {
            revenueGrowth: data?.revenueGrowth ?? null,
            earningsGrowthPct: toPercentPoints(data?.earningsGrowth),
            pFcf: normalizePositiveRatio(data?.pFcf ?? data?.pcfTtm),
            atrPct: normalizeMetric(data?.atrPct),
            beta1y: normalizeMetric(data?.beta1y ?? data?.beta),
            evEbitda: normalizeMetric(data?.evEbitda),
            debtToEquity: normalizeMetric(data?.debtToEquity),
            source: data?.source ?? 'supplemental',
          };
        } catch {
          results[symbol] = {
            revenueGrowth: null,
            earningsGrowthPct: null,
            pFcf: null,
            atrPct: null,
            beta1y: null,
            evEbitda: null,
            debtToEquity: null,
            source: null,
          };
        }
      }),
    );
    if (i + YAHOO_BATCH_SIZE < symbols.length) {
      await sleep(YAHOO_BATCH_DELAY_MS);
    }
  }
  return results;
}

function toPercentPoints(value, digits = 2) {
  if (value === null || value === undefined) return null;
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return null;
  return Number((normalized * 100).toFixed(digits));
}

function normalizeMetric(value, digits = 4) {
  if (value === null || value === undefined) return null;
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return null;
  return Number(normalized.toFixed(digits));
}

function normalizePositiveRatio(value, digits = 4) {
  const normalized = normalizeMetric(value, digits);
  return normalized !== null && normalized > 0 ? normalized : null;
}

function toMoomooMarket(market) {
  if (market === 'america') return 'US';
  if (market === 'japan') return 'JP';
  return 'US';
}

async function batchFetchMoomooGrowthMetrics(symbols, { market, _deps } = {}) {
  try {
    const response = await getMoomooFundamentalsBatch({
      symbols,
      market: toMoomooMarket(market),
      _deps,
    });
    return Object.fromEntries(
      (response.fundamentals || []).map((entry) => [entry.symbol, {
        revenueGrowth: entry.revenueGrowth ?? null,
        earningsGrowthPct: toPercentPoints(entry.earningsGrowth),
        pFcf: normalizePositiveRatio(entry.pcfTtm),
        source: entry.source ?? 'moomoo',
      }]),
    );
  } catch {
    return Object.fromEntries(symbols.map((symbol) => [symbol, {
      revenueGrowth: null,
      earningsGrowthPct: null,
      pFcf: null,
      source: null,
    }]));
  }
}

function applySupplementalGrowthMetrics(row, metrics = {}) {
  return {
    ...row,
    revenueGrowth: metrics.revenueGrowth ?? null,
    epsGrowthTtm: row.epsGrowthTtm ?? null,
  };
}

function mergeMissingMetricSupplement(row, source, fields) {
  if (!fields || fields.length === 0) return row.missingMetricSupplement ?? null;
  const existing = row.missingMetricSupplement ?? { sources: [], fields: [] };
  return {
    sources: uniqueStrings([...existing.sources, source].filter(Boolean)),
    fields: uniqueStrings([...existing.fields, ...fields]),
  };
}

function applyUsMissingMetricSupplement(row, metrics = {}, source = 'supplemental') {
  if (!metrics) return row;
  const fields = [];
  const merged = { ...row };

  if (merged.epsGrowthTtm === null && metrics.earningsGrowthPct !== null && metrics.earningsGrowthPct !== undefined) {
    merged.epsGrowthTtm = metrics.earningsGrowthPct;
    if (metrics.epsGrowthStatus) merged.epsGrowthStatus = metrics.epsGrowthStatus;
    if (metrics.epsGrowthDisplay) merged.epsGrowthDisplay = metrics.epsGrowthDisplay;
    if (metrics.epsGrowthScoreValue !== null && metrics.epsGrowthScoreValue !== undefined) {
      merged.epsGrowthScoreValue = metrics.epsGrowthScoreValue;
    }
    if (metrics.epsGrowthSourceDetail) merged.epsGrowthSourceDetail = metrics.epsGrowthSourceDetail;
    fields.push('epsGrowthTtm');
    if (metrics.epsGrowthStatus === 'turnaround_to_profit') fields.push('epsGrowthStatus');
  }
  if (
    merged.epsGrowthTtm === null
    && metrics.epsGrowthStatus === 'turnaround_to_profit'
    && metrics.epsGrowthDisplay
  ) {
    merged.epsGrowthStatus = metrics.epsGrowthStatus;
    merged.epsGrowthDisplay = metrics.epsGrowthDisplay;
    merged.epsGrowthScoreValue = metrics.epsGrowthScoreValue ?? EPS_TURNAROUND_SCORE;
    merged.epsGrowthSourceDetail = metrics.epsGrowthSourceDetail ?? null;
    fields.push('epsGrowthStatus');
  }
  if (
    merged.pFcf === null
    && (merged.fcfTtm === null || merged.fcfTtm === undefined || merged.fcfTtm > 0)
    && metrics.pFcf !== null
    && metrics.pFcf !== undefined
    && metrics.pFcf > 0
  ) {
    merged.pFcf = metrics.pFcf;
    fields.push('pFcf');
  }
  if (merged.atrPct === null && metrics.atrPct !== null && metrics.atrPct !== undefined) {
    merged.atrPct = metrics.atrPct;
    fields.push('atrPct');
  }
  if (merged.beta1y === null && metrics.beta1y !== null && metrics.beta1y !== undefined) {
    merged.beta1y = metrics.beta1y;
    fields.push('beta1y');
  }
  if (merged.evEbitda === null && metrics.evEbitda !== null && metrics.evEbitda !== undefined) {
    merged.evEbitda = metrics.evEbitda;
    fields.push('evEbitda');
  }
  if (merged.debtToEquity === null && metrics.debtToEquity !== null && metrics.debtToEquity !== undefined) {
    merged.debtToEquity = metrics.debtToEquity;
    fields.push('debtToEquity');
  }

  if (fields.length === 0) return row;
  const supplemented = {
    ...merged,
    missingMetricSupplement: mergeMissingMetricSupplement(row, source, fields),
  };
  if (fields.includes('epsGrowthStatus')) return supplemented;
  const withEpsMeta = applyEpsGrowthMeta(supplemented);
  if (!fields.includes('epsGrowthTtm') || !metrics.epsGrowthDisplay) return withEpsMeta;
  return {
    ...withEpsMeta,
    epsGrowthStatus: metrics.epsGrowthStatus ?? withEpsMeta.epsGrowthStatus,
    epsGrowthDisplay: metrics.epsGrowthDisplay,
    epsGrowthScoreValue: metrics.epsGrowthScoreValue ?? withEpsMeta.epsGrowthScoreValue,
    epsGrowthSourceDetail: metrics.epsGrowthSourceDetail ?? withEpsMeta.epsGrowthSourceDetail,
  };
}

function buildMissingMetricSupplementMeta(rows) {
  const supplementedRows = rows.filter((row) => row.missingMetricSupplement);
  const fields = {};
  supplementedRows.forEach((row) => {
    row.missingMetricSupplement.fields.forEach((field) => {
      fields[field] = (fields[field] ?? 0) + 1;
    });
  });
  return {
    enabled: true,
    supplementedRows: supplementedRows.length,
    symbols: supplementedRows.map((row) => row.symbol),
    fields,
  };
}

async function applyUsMissingMetricSupplements(rows, {
  growthMap = {},
  getMissingMetricSupplementals = getSecEpsTurnaroundSupplements,
} = {}) {
  if (rows.length === 0) return rows;
  const withBuiltInSupplements = rows.map((row) => {
    const symbol = row.symbol?.toUpperCase();
    const staticEntry = US_FUNDAMENTAL_SUPPLEMENTS.symbols?.[symbol] ?? null;
    const staticMetrics = computeStaticMissingMetricSupplement(staticEntry);
    const withGrowthProvider = applyUsMissingMetricSupplement(
      row,
      growthMap?.[symbol],
      growthMap?.[symbol]?.source ?? 'moomoo',
    );
    const withStaticProvider = applyUsMissingMetricSupplement(
      withGrowthProvider,
      staticMetrics,
      staticMetrics?.source ?? 'static-supplement',
    );
    return withStaticProvider;
  });
  const externalMap = getMissingMetricSupplementals
    ? await getMissingMetricSupplementals(withBuiltInSupplements)
    : {};

  return withBuiltInSupplements.map((row) => {
    const symbol = row.symbol?.toUpperCase();
    return applyUsMissingMetricSupplement(
      row,
      externalMap?.[symbol],
      externalMap?.[symbol]?.source ?? 'supplemental',
    );
  });
}

function shouldUseEdinetSupplement(row) {
  return row?.exchange === 'TSE' && (
    row.fcfMargin === null
    || row.fcfGrowthTtm === null
    || row.pFcf === null
    || row.cashConversion === null
    || row.ruleOf40Raw === null
  );
}

function applyEdinetSupplementalMetrics(row, metrics = {}) {
  const merged = {
    ...row,
    revenueGrowthTtm: row.revenueGrowthTtm ?? metrics.revenueGrowthTtm ?? null,
    fcfTtm: row.fcfTtm ?? metrics.fcfTtm ?? null,
    fcfMargin: row.fcfMargin ?? metrics.fcfMargin ?? null,
    fcfGrowthTtm: row.fcfGrowthTtm ?? metrics.fcfGrowthTtm ?? null,
    cashFromOperationsTtm: row.cashFromOperationsTtm ?? metrics.cashFromOperationsTtm ?? null,
    netIncomeTtm: row.netIncomeTtm ?? metrics.netIncomeTtm ?? null,
    cashConversion: row.cashConversion ?? metrics.cashConversion ?? null,
    pFcf: row.pFcf ?? metrics.pFcf ?? null,
    edinetSupplement: metrics.source === 'edinet'
      ? {
        docId: metrics.docId ?? null,
        submitDateTime: metrics.submitDateTime ?? null,
        docDescription: metrics.docDescription ?? null,
      }
      : null,
  };

  const ruleOf40Raw = merged.revenueGrowthTtm !== null && merged.fcfMargin !== null
    ? Number((merged.revenueGrowthTtm + merged.fcfMargin).toFixed(2))
    : metrics.ruleOf40 ?? null;

  return {
    ...merged,
    ruleOf40Raw,
    ruleOf40: ruleOf40Raw,
    ruleOf40Components: {
      revenueGrowthTtm: merged.revenueGrowthTtm,
      fcfMargin: merged.fcfMargin,
      complete: ruleOf40Raw !== null && ruleOf40Raw !== undefined,
      scoreEligible: false,
    },
  };
}

function validateLimit(limit) {
  if (limit === undefined || limit === null) return DEFAULT_LIMIT;
  const n = Number(limit);
  if (!Number.isInteger(n) || n < 1 || n > MAX_LIMIT) {
    throw new Error(`limit must be an integer between 1 and ${MAX_LIMIT}`);
  }
  return n;
}

export async function runFundamentalScreener({ limit, enrichWithYahoo = false, _deps } = {}) {
  const effectiveLimit = validateLimit(limit);
  const fetchFn = _deps?.fetch ?? globalThis.fetch;
  const market = _deps?.market ?? DEFAULT_MARKET;
  const exchangeAllowlist = _deps?.exchangeAllowlist ?? null;
  const symbolAllowlistKey = _deps?.symbolAllowlistKey ?? null;
  const symbolAllowlist = resolveSymbolAllowlist(symbolAllowlistKey, _deps?.symbolAllowlistByKey);
  const scopeLabel = _deps?.scopeLabel ?? null;
  const selectedSectorCount = _deps?.selectedSectorCount;
  const resultLimit = _deps?.resultLimit ?? 30;
  const getFundamentals = _deps?.getSymbolFundamentals ?? null;
  const forcedSelectedSectors = uniqueStrings(_deps?.forcePhase1Sectors ?? []);
  const extraSelectedSectors = uniqueStrings(_deps?.extraPhase1Sectors ?? []);
  const marketCapMinUsd = _deps?.marketCapMinUsd ?? null;
  const hierarchyFocusSectorOverride = _deps?.hierarchyFocusSector ?? null;
  const hierarchyTopMiddleThemeCount = _deps?.hierarchyTopMiddleThemeCount ?? Number.POSITIVE_INFINITY;
  const hierarchyTopSmallThemeCount = _deps?.hierarchyTopSmallThemeCount ?? Number.POSITIVE_INFINITY;
  const hierarchyTopStockCount = _deps?.hierarchyTopStockCount ?? Number.POSITIVE_INFINITY;
  const edinetApiKey = _deps?.edinetApiKey ?? process.env.EDINET_API_KEY ?? '';
  const getJapanSupplementalFundamentals = _deps?.getJapanSupplementalFundamentals ?? null;
  const scannerUrl = `https://scanner.tradingview.com/${market}/scan`;
  const sectorMomentumScan = await runSectorMomentumScan({
    market,
    exchangeAllowlist,
    symbolAllowlist,
    selectedSectorCount,
    fetch: fetchFn,
  });
  const sectorMomentum = sectorMomentumScan;
  const sectorRankLookup = buildSectorRankLookup(sectorMomentum);
  const phase1SelectedSectorLabels = sectorMomentum.selectedSectors.map((entry) => entry.label);
  const selectedSectorLabels = forcedSelectedSectors.length > 0
    ? forcedSelectedSectors
    : uniqueStrings([...phase1SelectedSectorLabels, ...extraSelectedSectors]);
  const { activeProfiles, excludedSelectedSectors, profileSummaries } = getSectorScreeningPlan({
    market,
    selectedSectors: selectedSectorLabels,
  });
  const effectiveActiveProfiles = applyMarketCapThresholdOverride(activeProfiles, marketCapMinUsd);
  const effectiveProfileSummaries = applyProfileSummaryMarketCapThresholdOverride(profileSummaries, marketCapMinUsd);

  // Fetch more candidates than needed so client filters have enough to work with
  const serverLimit = Math.min(effectiveLimit * 8, 400);
  const industryUniverseSectorLabels = market === DEFAULT_MARKET ? selectedSectorLabels : [];
  const industryUniverseResponses = await Promise.all(
    industryUniverseSectorLabels.map(async (sector) => {
      const response = await fetchFn(scannerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildIndustryUniverseRequestBody(INDUSTRY_UNIVERSE_SERVER_LIMIT, { market, sector })),
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`TradingView scanner request failed: HTTP ${response.status}`);
      }

      const payload = await response.json();

      if (!Array.isArray(payload?.data)) {
        throw new Error('TradingView scanner returned unexpected response format');
      }

      return {
        sector,
        totalCount: payload.totalCount ?? payload.data.length,
        rows: payload.data.map(normalizeRow),
      };
    }),
  );
  const industryUniverseRows = market === DEFAULT_MARKET
    ? dedupeRows(industryUniverseResponses.flatMap((entry) => entry.rows))
      .filter((row) => industryUniverseSectorLabels.includes(row.sector))
      .filter((row) => passesScopeFilters(row, { exchangeAllowlist, symbolAllowlist }))
    : [];
  const industrySummary = market === DEFAULT_MARKET
    ? summarizeIndustries(industryUniverseRows, { benchmark: sectorMomentum.benchmark })
    : {
        rankings: [],
        finalStockRanking: [],
        selectedIndustryCount: 0,
        missingIndustryCount: 0,
        selectedIndustryKeys: new Set(),
      };
  const requestPlans = effectiveActiveProfiles.flatMap((profile) => profile.requestScopes.map((scope) => ({ profile, scope })));
  const phase2Responses = await fetchProfileRows({
    scannerUrl,
    fetchFn,
    market,
    requestPlans,
    serverLimit,
  });

  const totalScanned = dedupeRows(phase2Responses.flatMap((entry) => entry.rows)).length;
  const scopeFiltered = dedupeRows(
    phase2Responses.flatMap(({ profile, rows }) => rows
      .filter((row) => passesScopeFilters(row, { exchangeAllowlist, symbolAllowlist }))
      .filter((row) => passesProfileScope(row, profile))
      .map((row) => annotateRowForProfile(row, profile, sectorRankLookup, market))),
  );
  const phase1Filtered = scopeFiltered;
  let clientFiltered = phase1Filtered
    .filter((row) => (
      market !== DEFAULT_MARKET
      || industrySummary.selectedIndustryKeys.has(`${row.sector}\u0000${row.industry}`)
    ))
    .filter(passesProfileClientFilters);

  let growthMap = {};
  if (enrichWithYahoo && clientFiltered.length > 0) {
    const symbols = clientFiltered.map((r) => r.symbol);
    growthMap = getFundamentals
      ? await batchFetchSupplementalGrowthMetrics(symbols, getFundamentals)
      : await batchFetchMoomooGrowthMetrics(symbols, { market, _deps });

    clientFiltered = clientFiltered
      .map((row) => applySupplementalGrowthMetrics(row, growthMap[row.symbol]));
  }

  let usFundamentalSupplementMeta = null;
  if (market === DEFAULT_MARKET && clientFiltered.length > 0) {
    clientFiltered = await applyUsFundamentalSupplements(clientFiltered, {
      getSupplementalFundamentals: _deps?.getUsSupplementalFundamentals ?? null,
    });
    const supplementedRows = clientFiltered.filter((row) => row.fundamentalSupplement);
    usFundamentalSupplementMeta = {
      enabled: true,
      supplementedRows: supplementedRows.length,
      symbols: supplementedRows.map((row) => row.symbol),
      version: US_FUNDAMENTAL_SUPPLEMENTS.version,
    };
  }

  let usMissingMetricSupplementMeta = null;
  if (market === DEFAULT_MARKET && clientFiltered.length > 0) {
    clientFiltered = await applyUsMissingMetricSupplements(clientFiltered, {
      growthMap,
      getMissingMetricSupplementals: Object.hasOwn(_deps ?? {}, 'getUsMissingMetricSupplementals')
        ? _deps.getUsMissingMetricSupplementals
        : undefined,
    });
    usMissingMetricSupplementMeta = buildMissingMetricSupplementMeta(clientFiltered);
  }

  let edinetSupplementMeta = null;
  if (market === 'japan' && clientFiltered.length > 0) {
    const supplementTargets = clientFiltered.filter(shouldUseEdinetSupplement);
    const supplementPayload = getJapanSupplementalFundamentals
      ? await getJapanSupplementalFundamentals(supplementTargets)
      : await getEdinetSupplementalFundamentalsBatch(supplementTargets, {
        apiKey: edinetApiKey,
        fetch: fetchFn,
      });

    const supplementalMap = supplementPayload?.rows ?? {};
    edinetSupplementMeta = supplementPayload?.meta ?? null;
    clientFiltered = clientFiltered.map((row) => applyEdinetSupplementalMetrics(row, supplementalMap[row.symbol]));
  }

  const themedRows = applyLocalizedCompanyNames(applyThemeTaxonomy(clientFiltered, market), market);
  const rankingBlocks = getRankingBlocks(market);
  const ranked = applyBlockRanks(themedRows, rankingBlocks).sort((a, b) => b.rankScore - a.rankScore);
  const matched = ranked.slice(0, effectiveLimit).map(stripInternalFields);
  const sectorRanking = summarizeSectors(ranked);
  const phase4CandidateRows = market === DEFAULT_MARKET
    ? ranked
      .filter((row) => industrySummary.selectedIndustryKeys.has(`${row.sector}\u0000${row.industry}`))
      .sort((a, b) => {
        if ((b.rankScore ?? -Infinity) !== (a.rankScore ?? -Infinity)) {
          return (b.rankScore ?? -Infinity) - (a.rankScore ?? -Infinity);
        }
        return (a.symbol ?? '').localeCompare(b.symbol ?? '');
      })
      .map((row) => stripInternalFields(row))
    : [];
  const finalStockRanking = market === DEFAULT_MARKET
    ? phase4CandidateRows.slice(0, FINAL_STOCK_LIMIT)
    : industrySummary.finalStockRanking;
  const phase5 = await buildPhase5SectorTopStocks({
    market,
    scannerUrl,
    fetchFn,
    sectorMomentum,
    sectorRankLookup,
    exchangeAllowlist,
    symbolAllowlist,
    marketCapMinUsd,
    enrichWithYahoo,
    getFundamentals,
    _deps,
  });
  const unifiedCandidateRows = market === DEFAULT_MARKET
    ? buildUnifiedCandidateRows({
      phase4Rows: phase4CandidateRows,
      phase5Rows: phase5.candidateRows ?? phase5.rows,
    })
    : [];
  const unifiedRankedRows = market === DEFAULT_MARKET
    ? applyUnifiedRanks(unifiedCandidateRows, market).map((row) => stripInternalFields(row))
    : [];
  const unifiedPhase4Ranking = market === DEFAULT_MARKET
    ? buildUnifiedPhase4Ranking(unifiedRankedRows, FINAL_STOCK_LIMIT)
    : [];
  const unifiedPhase5SectorTopStocks = market === DEFAULT_MARKET
    ? buildUnifiedPhase5SectorTopStocks(unifiedRankedRows, phase5.sectorLabels ?? [])
    : [];
  const unifiedScoringMeta = {
    enabled: market === DEFAULT_MARKET,
    candidateCount: unifiedCandidateRows.length,
    phase4CandidateCount: phase4CandidateRows.length,
    phase5CandidateCount: (phase5.candidateRows ?? []).length,
    dedupedCount: unifiedCandidateRows.length,
    phase4OnlyCount: unifiedCandidateRows.filter((row) => row.phase4Eligible && !row.phase5Eligible).length,
    phase5OnlyCount: unifiedCandidateRows.filter((row) => row.phase5Eligible && !row.phase4Eligible).length,
    bothCount: unifiedCandidateRows.filter((row) => row.phase4Eligible && row.phase5Eligible).length,
    rankingBlocks: rankingBlocks.map((block) => ({
      key: block.key,
      label: block.label,
      weight: block.weight,
      fields: block.fields,
    })),
    scoreBasis: market === DEFAULT_MARKET
      ? 'phase4_candidates_plus_phase5_sector_candidates'
      : 'disabled_for_market',
  };
  const hiddenPhase4Candidates = market === DEFAULT_MARKET
    ? buildHiddenPhase4Candidates(finalStockRanking, phase5.rows)
    : [];
  const hierarchyFocusSector = hierarchyFocusSectorOverride ?? selectedSectorLabels[0] ?? null;
  const focusedHierarchy = buildFocusedHierarchy(ranked, hierarchyFocusSector, {
    market,
    topMiddleThemeCount: hierarchyTopMiddleThemeCount,
    topSmallThemeCount: hierarchyTopSmallThemeCount,
    topStockCount: hierarchyTopStockCount,
  });
  const themeRankingSource = market === 'japan' && hierarchyFocusSector
    ? getFocusedHierarchySource(ranked, hierarchyFocusSector, market).classifiedSectorRows
    : ranked;
  const themeRanking = summarizeThemes(themeRankingSource);
  const ruleOf40Coverage = buildRuleOf40Coverage(matched, market);

  const criteria = {
    market_cap_min_usd: effectiveProfileSummaries[0]?.thresholds?.market_cap_min_usd ?? 1_000_000_000,
    price_above_sma200: true,
    price_above_sma50: true,
    price_pct_of_52wk_high_min: 75,
    extreme_momentum_policy: {
      perf_6m_extreme_pct: 600,
      perf_y_extreme_pct: 1000,
      action: 'retain_and_flag',
    },
    profile_summaries: effectiveProfileSummaries,
    excluded_phase2_sectors: excludedSelectedSectors,
    phase1_selected_sectors: selectedSectorLabels,
  };
  if (forcedSelectedSectors.length > 0) {
    criteria.phase1_selected_sectors_source = 'override';
    criteria.phase1_selected_sectors_actual = phase1SelectedSectorLabels;
  } else if (extraSelectedSectors.length > 0) {
    criteria.phase1_selected_sectors_source = 'phase1_plus_extra';
    criteria.phase1_selected_sectors_extra = extraSelectedSectors;
    criteria.phase1_selected_sectors_actual = phase1SelectedSectorLabels;
  }
  if (focusedHierarchy?.focusSector) {
    const topMiddleThemesRule = hierarchyTopMiddleThemeCount === null
      ? 'top-half-ceil'
      : hierarchyTopMiddleThemeCount === Number.POSITIVE_INFINITY
        ? 'all-ranked'
        : 'override';
    const topSmallThemesRule = hierarchyTopSmallThemeCount === Number.POSITIVE_INFINITY
      ? 'all-ranked'
      : hierarchyTopSmallThemeCount === 3
        ? 'top-3'
        : 'override';
    const topStocksRule = hierarchyTopStockCount === Number.POSITIVE_INFINITY
      ? 'all-ranked'
      : 'override';
    criteria.hierarchy_focus_sector = focusedHierarchy.focusSector;
    criteria.hierarchy_selection = {
      top_middle_themes: focusedHierarchy.selectedMiddleThemes.length,
      top_middle_themes_rule: topMiddleThemesRule,
      top_small_themes: focusedHierarchy.selectedSmallThemes.length,
      top_small_themes_rule: topSmallThemesRule,
      top_stocks: focusedHierarchy.stockRanking.length,
      top_stocks_rule: topStocksRule,
    };
  }
  if (ranked.length > 0) {
    criteria.theme_taxonomy_policy = {
      version: themedRows[0]?.themeTaxonomyVersion ?? `${market}-theme-prototype-v1`,
      scope: market === DEFAULT_MARKET
        ? `${market} Phase3 matched candidates only`
        : `${market} Phase2 matched candidates only`,
      approach: 'repo custom theme taxonomy layered on top of TradingView sector/industry',
    };
  }
  if (market === DEFAULT_MARKET) {
    criteria.industry_ranking = {
      source: 'TradingView scanner industry',
      population: 'Phase1 selected sectors before Phase3 stock hard gates',
      top_industries_displayed: industrySummary.rankings.length,
      final_industries_selected: industrySummary.selectedIndustryCount,
      missing_industry_count: industrySummary.missingIndustryCount,
    };
    criteria.rule_of_40_policy = {
      scope: 'US Technology Services software-like industries only',
      formula: 'total_revenue_yoy_growth_ttm + free_cash_flow_margin_ttm',
      action: 'ranking_badge_warning_only',
      pass_badge_min: 40,
      warning_below: 20,
      hard_filter: false,
    };
    criteria.us_fundamental_supplement_policy = 'TradingView FCF gaps are supplemented from configured official/adapter data when available; supplemented rows keep source metadata.';
    criteria.us_missing_metric_supplement_policy = 'TradingView missing table metrics are supplemented from Moomoo/adapter/SEC companyfacts data when available; unavailable or non-meaningful values stay N/A.';
    criteria.phase5 = {
      name: 'Phase5 Sector別 個別銘柄ランキング',
      source: 'sectorMomentum.rankings top 20 sectors',
      sector_limit: phase5.meta.sectorLimit,
      top_stocks_per_sector: phase5.meta.topStocksPerSector,
      source_sectors: phase5.meta.sourceSectors,
      displayed_rows: phase5.meta.displayedRows,
    };
    criteria.unified_scoring = {
      score_basis: unifiedScoringMeta.scoreBasis,
      phase4_candidate_count: unifiedScoringMeta.phase4CandidateCount,
      phase5_candidate_count: unifiedScoringMeta.phase5CandidateCount,
      deduped_count: unifiedScoringMeta.dedupedCount,
      note: 'Phase4 and Phase5 stock rows use one shared unifiedRankScore population; Phase1/Phase2 aggregate scores remain separate.',
    };
  }
  if (exchangeAllowlist) {
    criteria.allowed_exchanges = exchangeAllowlist;
  }
  if (symbolAllowlistKey) {
    criteria.symbol_allowlist_key = symbolAllowlistKey;
  }
  if (enrichWithYahoo) {
    criteria.revenue_growth_policy = 'Moomoo revenue growth is used for growth scoring only; low values do not hard-fail';
  }
  if (market === 'japan') {
    criteria.japan_fundamentals_policy = 'TradingView を主軸にしつつ、FCF / PFCF / cash-conversion の欠損は EDINET 公式開示で補完する';
  }

  return {
    success: true,
    totalScanned,
    serverFiltered: scopeFiltered.length,
    phase1Filtered: phase1Filtered.length,
    clientFiltered: clientFiltered.length,
    matched: matched.length,
    enrichedWithYahoo: enrichWithYahoo,
    enrichedWithMoomoo: enrichWithYahoo,
    criteria,
    rankingFormula: rankingBlocks.map((block) => block.key),
    rankingBlocks: rankingBlocks.map((block) => ({
      key: block.key,
      label: block.label,
      weight: block.weight,
      fields: block.fields,
    })),
    scannerScope: {
      market,
      instrumentTypes: ['stock'],
      serverLimit,
      totalCandidatesReported: phase2Responses.reduce((sum, entry) => sum + entry.totalCount, 0),
      profileRequestCount: requestPlans.length,
      industryUniverseRequestCount: industryUniverseResponses.length,
      industryUniverseCandidates: industryUniverseRows.length,
      scopeLabel,
      note: `${exchangeAllowlist || symbolAllowlistKey
        ? 'TradingView Scanner API was queried with sector-specific profile filters, then exchange and symbol-universe filters were applied locally.'
        : `TradingView Scanner API was queried with sector-specific profile filters for the ${market} market scope.`} Phase1 selected ${selectedSectorLabels.join(', ') || 'no sectors'}, Industry ranking used broad sector-level scanner rows before stock hard gates, and Phase2 excluded ${excludedSelectedSectors.join(', ') || 'no sectors'}.`,
    },
    marketBreakdown: {
      serverFiltered: countBy(scopeFiltered, 'exchange'),
      phase1Filtered: countBy(phase1Filtered, 'exchange'),
      clientFiltered: countBy(clientFiltered, 'exchange'),
      matched: countBy(matched, 'exchange'),
    },
    sectorMomentum,
    sectorRanking,
    industryRanking: industrySummary.rankings,
    finalStockRanking,
    hiddenPhase4Candidates,
    phase5SectorTopStocks: phase5.rows,
    unifiedCandidateRows,
    unifiedRankedRows,
    unifiedPhase4Ranking,
    unifiedPhase5SectorTopStocks,
    unifiedScoringMeta,
    themeRanking,
    focusedHierarchy,
    ruleOf40Coverage,
    sourceDetails: {
      usFundamentalSupplement: usFundamentalSupplementMeta,
      usMissingMetricSupplement: usMissingMetricSupplementMeta,
      edinet: edinetSupplementMeta,
      phase5: phase5.meta,
      unifiedScoring: unifiedScoringMeta,
    },
    results: matched,
    retrieved_at: new Date().toISOString(),
    source: market === 'japan' && edinetSupplementMeta?.enabled
      ? (enrichWithYahoo ? 'tradingview_scanner+moomoo+edinet' : 'tradingview_scanner+edinet')
      : enrichWithYahoo
        ? 'tradingview_scanner+moomoo'
        : 'tradingview_scanner',
  };
}

export async function evaluateSymbolsAgainstFundamentalScreener({
  symbols,
  enrichWithYahoo = false,
  _deps,
} = {}) {
  const requestedSymbols = uniqueStrings((symbols || []).map(normalizeRequestedSymbol));
  if (requestedSymbols.length === 0) {
    throw new Error('symbols array is required and must not be empty');
  }

  const fetchFn = _deps?.fetch ?? globalThis.fetch;
  const market = _deps?.market ?? DEFAULT_MARKET;
  const exchangeAllowlist = _deps?.exchangeAllowlist ?? null;
  const symbolAllowlistKey = _deps?.symbolAllowlistKey ?? null;
  const symbolAllowlist = resolveSymbolAllowlist(symbolAllowlistKey, _deps?.symbolAllowlistByKey);
  const scopeLabel = _deps?.scopeLabel ?? null;
  const selectedSectorCount = _deps?.selectedSectorCount;
  const resultLimit = _deps?.resultLimit ?? 30;
  const getFundamentals = _deps?.getSymbolFundamentals ?? null;
  const extraSelectedSectors = uniqueStrings(_deps?.extraPhase1Sectors ?? []);
  const marketCapMinUsd = _deps?.marketCapMinUsd ?? null;

  const sectorMomentum = await runSectorMomentumScan({
    market,
    exchangeAllowlist,
    symbolAllowlist,
    selectedSectorCount,
    fetch: fetchFn,
  });
  const selectedSectorLabels = sectorMomentum.selectedSectors.map((entry) => entry.label);
  const activeSectorLabels = uniqueStrings([...selectedSectorLabels, ...extraSelectedSectors]);
  const { activeProfiles, excludedSelectedSectors } = getSectorScreeningPlan({
    market,
    selectedSectors: activeSectorLabels,
  });
  const effectiveActiveProfiles = applyMarketCapThresholdOverride(activeProfiles, marketCapMinUsd);
  const allProfiles = applyMarketCapThresholdOverride(getProfilesForMarket(market), marketCapMinUsd);
  const sectorRankLookup = buildSectorRankLookup(sectorMomentum);

  const fetchedRows = applyLocalizedCompanyNames(await fetchRowsForSymbols({
    symbols: requestedSymbols,
    market,
    fetchFn,
  }), market);

  const byRequestedSymbol = new Map();
  for (const requestedSymbol of requestedSymbols) {
    const row = fetchedRows.find((entry) => symbolMatchesRequested(entry, requestedSymbol));
    if (!row) {
      byRequestedSymbol.set(requestedSymbol, {
        requestedSymbol,
        found: false,
        market,
        rankScore: 0,
        workflowEligible: false,
        workflowDetected: false,
        failureReasons: ['symbol_not_returned_by_scanner'],
      });
      continue;
    }

    const matchedProfile = findMatchingProfile(row, allProfiles);
    const activeProfile = findMatchingProfile(row, effectiveActiveProfiles);
    const annotatedRow = matchedProfile
      ? annotateRowForProfile(row, matchedProfile, sectorRankLookup, market)
      : row;
    const failureReasons = [];

    if (isExcludedExchange(row, market)) {
      failureReasons.push(`exchange_not_allowed (${row.exchange})`);
    } else if (exchangeAllowlist && !exchangeAllowlist.includes(row.exchange)) {
      failureReasons.push(`exchange_not_allowed (${row.exchange})`);
    }
    if (symbolAllowlist && !symbolAllowlist.has(row.symbol)) {
      failureReasons.push(`symbol_not_in_allowlist (${row.symbol})`);
    }
    if (!matchedProfile) {
      failureReasons.push(`no_profile_for_sector (${row.sector ?? 'Unknown'})`);
    }
    if (matchedProfile && !activeProfile) {
      failureReasons.push(`phase1_sector_not_selected (${row.sector ?? 'Unknown'})`);
    }
    if (matchedProfile) {
      failureReasons.push(...collectClientFilterFailures(annotatedRow));
    }

    byRequestedSymbol.set(requestedSymbol, {
      ...annotatedRow,
      requestedSymbol,
      found: true,
      matchedProfileId: matchedProfile?.id ?? null,
      matchedProfileLabel: matchedProfile?.label ?? null,
      activeProfileId: activeProfile?.id ?? null,
      activeProfileLabel: activeProfile?.label ?? null,
      phase1Selected: Boolean(activeProfile),
      workflowEligible: failureReasons.length === 0,
      workflowDetected: false,
      failureReasons,
    });
  }

  let eligibleForGrowthCheck = [...byRequestedSymbol.values()]
    .filter((entry) => entry?.found && entry.matchedProfileId);
  let growthMap = {};
  if (enrichWithYahoo && eligibleForGrowthCheck.length > 0) {
    const symbolsToCheck = eligibleForGrowthCheck.map((entry) => entry.symbol);
    growthMap = getFundamentals
      ? await batchFetchSupplementalGrowthMetrics(symbolsToCheck, getFundamentals)
      : await batchFetchMoomooGrowthMetrics(symbolsToCheck, { market, _deps });

    eligibleForGrowthCheck.forEach((entry) => {
      const withSupplementalMetrics = applySupplementalGrowthMetrics(entry, growthMap[entry.symbol]);
      entry.revenueGrowth = withSupplementalMetrics.revenueGrowth;
      entry.epsGrowthTtm = withSupplementalMetrics.epsGrowthTtm;
      entry.workflowEligible = entry.failureReasons.length === 0;
    });
  }

  if (market === DEFAULT_MARKET && eligibleForGrowthCheck.length > 0) {
    const supplemented = await applyUsFundamentalSupplements(eligibleForGrowthCheck, {
      getSupplementalFundamentals: _deps?.getUsSupplementalFundamentals ?? null,
    });
    supplemented.forEach((entry) => {
      byRequestedSymbol.set(entry.requestedSymbol, entry);
    });
    eligibleForGrowthCheck = supplemented;
  }

  if (market === DEFAULT_MARKET && eligibleForGrowthCheck.length > 0) {
    const supplemented = await applyUsMissingMetricSupplements(eligibleForGrowthCheck, {
      growthMap,
      getMissingMetricSupplementals: Object.hasOwn(_deps ?? {}, 'getUsMissingMetricSupplementals')
        ? _deps.getUsMissingMetricSupplementals
        : undefined,
    });
    supplemented.forEach((entry) => {
      byRequestedSymbol.set(entry.requestedSymbol, entry);
    });
  }

  const rankedCandidates = [...byRequestedSymbol.values()]
    .filter((entry) => entry?.found && entry.matchedProfileId);
  let ranked = [];
  if (rankedCandidates.length > 0) {
    ranked = applyBlockRanks(
      applyLocalizedCompanyNames(applyThemeTaxonomy(rankedCandidates, market), market),
      getRankingBlocks(market),
    )
      .sort((a, b) => b.rankScore - a.rankScore);
  }
  const rankLookup = new Map(ranked.map((row, index) => [`${row.exchange}:${row.symbol}`.toUpperCase(), {
    rankScore: row.rankScore,
    watchlistRank: index + 1,
    rankBreakdown: row.rankBreakdown,
  }]));

  const workflowResult = await runFundamentalScreener({
    limit: resultLimit,
    enrichWithYahoo,
    _deps,
  });
  const workflowSymbols = new Set((workflowResult.results || []).map((row) => `${row.exchange}:${row.symbol}`.toUpperCase()));

  const results = requestedSymbols.map((requestedSymbol) => {
    const entry = byRequestedSymbol.get(requestedSymbol);
    if (!entry?.found) return entry;
    const key = `${entry.exchange}:${entry.symbol}`.toUpperCase();
    const rankMeta = rankLookup.get(key);
    return {
      ...entry,
      rankScore: rankMeta?.rankScore ?? 0,
      watchlistRank: rankMeta?.watchlistRank ?? null,
      rankBreakdown: rankMeta?.rankBreakdown ?? entry.rankBreakdown,
      workflowDetected: workflowSymbols.has(key),
    };
  }).sort((left, right) => {
    if (left.workflowEligible !== right.workflowEligible) return left.workflowEligible ? -1 : 1;
    if ((right.rankScore ?? 0) !== (left.rankScore ?? 0)) return (right.rankScore ?? 0) - (left.rankScore ?? 0);
    return String(left.requestedSymbol).localeCompare(String(right.requestedSymbol));
  });

  return {
    success: true,
    market,
    requestedSymbols,
    evaluatedCount: results.length,
    workflowResult,
    phase1SelectedSectors: activeSectorLabels,
    excludedPhase2Sectors: excludedSelectedSectors,
    scopeLabel,
    results,
    retrieved_at: new Date().toISOString(),
  };
}
