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
import { getMoomooFundamentalsBatch } from './moomoo.js';
import { runSectorMomentumScan } from './sector-momentum.js';
import { getProfilesForMarket, getSectorScreeningPlan } from './sector-screening-profiles.js';

const DEFAULT_MARKET = 'america';
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 200;
const DEFAULT_TIMEOUT_MS = 15000;
const BUILTIN_SYMBOL_ALLOWLISTS = new Map([
  [
    'jpx-prime',
    new Set(JSON.parse(readFileSync(new URL('../../config/screener/jpx-prime-symbols.json', import.meta.url), 'utf8')).symbols),
  ],
]);

const COLUMNS = [
  'name',
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
      { key: 'epsGrowthTtm', label: 'EPS YoY growth', direction: 'desc' },
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
    { key: 'ruleOf40', label: 'Revenue growth + FCF margin', direction: 'desc' },
  ],
};

const RULE_OF_40_SECTOR = 'Technology Services';
const RULE_OF_40_INDUSTRY_PATTERN = /software|saas|cloud|application|infrastructure/i;

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
      { left: 'earnings_per_share_diluted_ttm', operation: 'egreater', right: thresholds.epsMin },
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
  const companyName = d[COL['name']] ?? null;
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

  return {
    symbol,
    companyName,
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
    roe,
    roic,
    grossMargin,
    grossProfitTtm,
    totalAssets,
    grossProfitToAssets,
    operatingMargin,
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

function isUsSoftwareRuleOf40Candidate(row, market) {
  return market === DEFAULT_MARKET
    && row.sector === RULE_OF_40_SECTOR
    && row.industry !== null
    && row.industry !== undefined
    && RULE_OF_40_INDUSTRY_PATTERN.test(row.industry);
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

function passesScopeFilters(row, { exchangeAllowlist, symbolAllowlist }) {
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
    close,
    sma200,
    sma50,
    pctOf52wHigh,
    perf3m,
    pFcf,
    screeningThresholds,
    screeningPfcfMax,
  } = row;

  if (screeningThresholds.priceAboveSma200 && close !== null && sma200 !== null && close <= sma200) return false;
  if (screeningThresholds.priceAboveSma50 && close !== null && sma50 !== null && close <= sma50) return false;
  if (pctOf52wHigh !== null && pctOf52wHigh < screeningThresholds.pricePctOf52wHighMin) return false;
  if (perf3m !== null && perf3m <= screeningThresholds.perf3mMinPct) return false;
  if (pFcf !== null && pFcf >= screeningPfcfMax) return false;

  return true;
}

function collectClientFilterFailures(row) {
  const failures = [];
  const {
    close,
    sma200,
    sma50,
    pctOf52wHigh,
    perf3m,
    pFcf,
    screeningThresholds,
    screeningPfcfMax,
  } = row;

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
  if (pFcf !== null && pFcf >= screeningPfcfMax) {
    failures.push(`p_fcf>=${screeningPfcfMax} (${pFcf})`);
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
    ruleOf40: isUsSoftwareRuleOf40Candidate(row, market) ? row.ruleOf40Raw : null,
    extremeMomentum: buildExtremeMomentum(row),
  };
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

function stripInternalFields(row) {
  const {
    screeningThresholds,
    screeningPfcfMax,
    screeningRevenueGrowthMinPct,
    ruleOf40Raw,
    ...publicRow
  } = row;
  return publicRow;
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

const YAHOO_BATCH_SIZE = 5;
const YAHOO_BATCH_DELAY_MS = 500;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches revenueGrowth (YoY) from a dependency-injected fundamentals provider.
 * Processes in batches of YAHOO_BATCH_SIZE with a delay between batches.
 * On error, sets revenueGrowth to null (does not throw).
 */
async function batchFetchRevenueGrowth(symbols, getFundamentals) {
  const results = {};
  for (let i = 0; i < symbols.length; i += YAHOO_BATCH_SIZE) {
    const batch = symbols.slice(i, i + YAHOO_BATCH_SIZE);
    await Promise.all(
      batch.map(async (symbol) => {
        try {
          const data = await getFundamentals(symbol);
          results[symbol] = data.revenueGrowth ?? null;
        } catch {
          results[symbol] = null;
        }
      }),
    );
    if (i + YAHOO_BATCH_SIZE < symbols.length) {
      await sleep(YAHOO_BATCH_DELAY_MS);
    }
  }
  return results;
}

function toMoomooMarket(market) {
  if (market === 'america') return 'US';
  if (market === 'japan') return 'JP';
  return 'US';
}

async function batchFetchMoomooRevenueGrowth(symbols, { market, _deps } = {}) {
  try {
    const response = await getMoomooFundamentalsBatch({
      symbols,
      market: toMoomooMarket(market),
      _deps,
    });
    return Object.fromEntries(
      (response.fundamentals || []).map((entry) => [entry.symbol, entry.revenueGrowth ?? null]),
    );
  } catch {
    return Object.fromEntries(symbols.map((symbol) => [symbol, null]));
  }
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
  const selectedSectorLabels = sectorMomentum.selectedSectors.map((entry) => entry.label);
  const { activeProfiles, excludedSelectedSectors, profileSummaries } = getSectorScreeningPlan({
    market,
    selectedSectors: selectedSectorLabels,
  });

  // Fetch more candidates than needed so client filters have enough to work with
  const serverLimit = Math.min(effectiveLimit * 8, 400);
  const requestPlans = activeProfiles.flatMap((profile) => profile.requestScopes.map((scope) => ({ profile, scope })));
  const phase2Responses = await Promise.all(
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

  const totalScanned = dedupeRows(phase2Responses.flatMap((entry) => entry.rows)).length;
  const scopeFiltered = dedupeRows(
    phase2Responses.flatMap(({ profile, rows }) => rows
      .filter((row) => passesScopeFilters(row, { exchangeAllowlist, symbolAllowlist }))
      .filter((row) => passesProfileScope(row, profile))
      .map((row) => annotateRowForProfile(row, profile, sectorRankLookup, market))),
  );
  const phase1Filtered = scopeFiltered;
  let clientFiltered = phase1Filtered.filter(passesProfileClientFilters);

  if (enrichWithYahoo && clientFiltered.length > 0) {
    const symbols = clientFiltered.map((r) => r.symbol);
    const growthMap = getFundamentals
      ? await batchFetchRevenueGrowth(symbols, getFundamentals)
      : await batchFetchMoomooRevenueGrowth(symbols, { market, _deps });

    clientFiltered = clientFiltered
      .map((r) => ({ ...r, revenueGrowth: growthMap[r.symbol] ?? null }));
  }

  const rankingBlocks = getRankingBlocks(market);
  const ranked = applyBlockRanks(clientFiltered, rankingBlocks).sort((a, b) => b.rankScore - a.rankScore);
  const matched = ranked.slice(0, effectiveLimit).map(stripInternalFields);
  const sectorRanking = summarizeSectors(ranked);

  const criteria = {
    market_cap_min_usd: 1_000_000_000,
    eps_min: 0,
    price_above_sma200: true,
    price_above_sma50: true,
    price_pct_of_52wk_high_min: 75,
    extreme_momentum_policy: {
      perf_6m_extreme_pct: 600,
      perf_y_extreme_pct: 1000,
      action: 'retain_and_flag',
    },
    profile_summaries: profileSummaries,
    excluded_phase2_sectors: excludedSelectedSectors,
    phase1_selected_sectors: selectedSectorLabels,
  };
  if (market === DEFAULT_MARKET) {
    criteria.rule_of_40_policy = {
      scope: 'US Technology Services software-like industries only',
      formula: 'total_revenue_yoy_growth_ttm + free_cash_flow_margin_ttm',
      action: 'ranking_badge_warning_only',
      pass_badge_min: 40,
      warning_below: 20,
      hard_filter: false,
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
      scopeLabel,
      note: `${exchangeAllowlist || symbolAllowlistKey
        ? 'TradingView Scanner API was queried with sector-specific profile filters, then exchange and symbol-universe filters were applied locally.'
        : `TradingView Scanner API was queried with sector-specific profile filters for the ${market} market scope.`} Phase1 selected ${selectedSectorLabels.join(', ') || 'no sectors'}, and Phase2 excluded ${excludedSelectedSectors.join(', ') || 'no sectors'}.`,
    },
    marketBreakdown: {
      serverFiltered: countBy(scopeFiltered, 'exchange'),
      phase1Filtered: countBy(phase1Filtered, 'exchange'),
      clientFiltered: countBy(clientFiltered, 'exchange'),
      matched: countBy(matched, 'exchange'),
    },
    sectorMomentum,
    sectorRanking,
    results: matched,
    retrieved_at: new Date().toISOString(),
    source: enrichWithYahoo ? 'tradingview_scanner+moomoo' : 'tradingview_scanner',
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

  const sectorMomentum = await runSectorMomentumScan({
    market,
    exchangeAllowlist,
    symbolAllowlist,
    selectedSectorCount,
    fetch: fetchFn,
  });
  const selectedSectorLabels = sectorMomentum.selectedSectors.map((entry) => entry.label);
  const { activeProfiles, excludedSelectedSectors } = getSectorScreeningPlan({
    market,
    selectedSectors: selectedSectorLabels,
  });
  const allProfiles = getProfilesForMarket(market);
  const sectorRankLookup = buildSectorRankLookup(sectorMomentum);

  const fetchedRows = await fetchRowsForSymbols({
    symbols: requestedSymbols,
    market,
    fetchFn,
  });

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
    const activeProfile = findMatchingProfile(row, activeProfiles);
    const annotatedRow = matchedProfile
      ? annotateRowForProfile(row, matchedProfile, sectorRankLookup, market)
      : row;
    const failureReasons = [];

    if (exchangeAllowlist && !exchangeAllowlist.includes(row.exchange)) {
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

  const eligibleForGrowthCheck = [...byRequestedSymbol.values()]
    .filter((entry) => entry?.found && entry.matchedProfileId);
  if (enrichWithYahoo && eligibleForGrowthCheck.length > 0) {
    const symbolsToCheck = eligibleForGrowthCheck.map((entry) => entry.symbol);
    const growthMap = getFundamentals
      ? await batchFetchRevenueGrowth(symbolsToCheck, getFundamentals)
      : await batchFetchMoomooRevenueGrowth(symbolsToCheck, { market, _deps });

    eligibleForGrowthCheck.forEach((entry) => {
      const revenueGrowth = growthMap[entry.symbol] ?? null;
      entry.revenueGrowth = revenueGrowth;
      entry.workflowEligible = entry.failureReasons.length === 0;
    });
  }

  const rankedCandidates = [...byRequestedSymbol.values()]
    .filter((entry) => entry?.found && entry.matchedProfileId);
  let ranked = [];
  if (rankedCandidates.length > 0) {
    ranked = applyBlockRanks(rankedCandidates, getRankingBlocks(market))
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
    phase1SelectedSectors: selectedSectorLabels,
    excludedPhase2Sectors: excludedSelectedSectors,
    scopeLabel,
    results,
    retrieved_at: new Date().toISOString(),
  };
}
