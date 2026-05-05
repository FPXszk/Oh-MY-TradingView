/**
 * Fundamental + Momentum stock screener — queries TradingView's scanner API
 * for stocks passing financial quality × Minervini momentum conditions.
 *
 * Phase2 now uses sector-specific screening profiles rather than one
 * global filter stack. Each profile applies its own server-side quality /
 * momentum thresholds plus shared client-side price-structure checks.
 *
 * Optional enrichment (enrichWithYahoo: true):
 *   - Revenue growth YoY threshold is profile-specific (null stays eligible)
 *
 * Ranking: weighted block rank-sum of price momentum + sector strength
 * + profitability/quality + growth + risk/value.
 */

import { readFileSync } from 'node:fs';
import { getSymbolFundamentals } from './market-intel.js';
import { runSectorMomentumScan } from './sector-momentum.js';
import { getSectorScreeningPlan } from './sector-screening-profiles.js';

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
    weight: 70,
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
    weight: 10,
    fields: [
      { key: 'phase1SectorRankScore', label: 'Phase1 sector rank', direction: 'asc' },
      { key: 'phase1SectorPerfY', label: 'Sector 12M momentum', direction: 'desc' },
      { key: 'phase1SectorPerf6m', label: 'Sector 6M momentum', direction: 'desc' },
      { key: 'phase1SectorPerf3m', label: 'Sector 3M momentum', direction: 'desc' },
    ],
  },
  {
    key: 'quality',
    label: 'Profitability / quality',
    weight: 10,
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
    weight: 5,
    fields: [
      { key: 'revenueGrowthTtm', label: 'Revenue YoY growth', direction: 'desc' },
      { key: 'epsGrowthTtm', label: 'EPS YoY growth', direction: 'desc' },
      { key: 'fcfGrowthTtm', label: 'FCF YoY growth', direction: 'desc' },
      { key: 'revenueGrowth', label: 'Yahoo revenue growth', direction: 'desc' },
    ],
  },
  {
    key: 'riskValue',
    label: 'Risk / value guard',
    weight: 5,
    fields: [
      { key: 'pFcf', label: 'P/FCF', direction: 'asc' },
      { key: 'evEbitda', label: 'EV/EBITDA', direction: 'asc' },
      { key: 'atrPct', label: 'ATR %', direction: 'asc' },
      { key: 'beta1y', label: 'Beta 1Y', direction: 'asc' },
      { key: 'debtToEquity', label: 'Debt / equity', direction: 'asc' },
    ],
  },
];

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
    pFcf,
    evEbitda,
    debtToEquity,
    netDebt,
    volume,
  };
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
    ...publicRow
  } = row;
  return publicRow;
}

function averageRank(values, fallback) {
  const usable = values.filter((value) => value !== null && value !== undefined);
  if (usable.length === 0) return fallback;
  return Number((usable.reduce((sum, value) => sum + value, 0) / usable.length).toFixed(2));
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

function applyBlockRanks(rows) {
  const rankMaps = new Map();
  for (const block of RANK_BLOCKS) {
    for (const field of block.fields) {
      rankMaps.set(`${block.key}:${field.key}`, assignRanks(rows, field.key, field.direction));
    }
  }

  return rows.map((row, i) => ({
    ...row,
    rankBreakdown: Object.fromEntries(RANK_BLOCKS.map((block) => {
      const fieldRanks = Object.fromEntries(block.fields.map((field) => [
        field.key,
        rankMaps.get(`${block.key}:${field.key}`)[i],
      ]));
      const blockRank = averageRank(Object.values(fieldRanks), rows.length + 1);
      return [block.key, {
        label: block.label,
        weight: block.weight,
        rank: blockRank,
        fields: fieldRanks,
      }];
    })),
  })).map((row) => ({
    ...row,
    rankScore: Number(RANK_BLOCKS.reduce(
      (sum, block) => sum + (row.rankBreakdown[block.key].rank * (block.weight / 100)),
      0,
    ).toFixed(2)),
  }));
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
        topSymbol: null,
        topRankScore: null,
      });
    }
    const entry = grouped.get(key);
    entry.count += 1;
    entry.totalRankScore += row.rankScore ?? 0;
    if (row.perf3m !== null && row.perf3m !== undefined) {
      entry.totalPerf3m += row.perf3m;
      entry.perf3mCount += 1;
    }
    if (entry.topRankScore === null || (row.rankScore ?? Infinity) < entry.topRankScore) {
      entry.topRankScore = row.rankScore ?? null;
      entry.topSymbol = row.symbol;
    }
  }

  return Array.from(grouped.values())
    .map((entry) => ({
      sector: entry.sector,
      count: entry.count,
      averagePerf3m: entry.perf3mCount > 0
        ? Number((entry.totalPerf3m / entry.perf3mCount).toFixed(1))
        : null,
      averageRankScore: entry.count > 0
        ? Number((entry.totalRankScore / entry.count).toFixed(1))
        : null,
      topSymbol: entry.topSymbol,
    }))
    .sort((a, b) => {
      if (b.averagePerf3m !== a.averagePerf3m) {
        return (b.averagePerf3m ?? -Infinity) - (a.averagePerf3m ?? -Infinity);
      }
      if (b.count !== a.count) return b.count - a.count;
      return (a.averageRankScore ?? Infinity) - (b.averageRankScore ?? Infinity);
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
 * Fetches revenueGrowth (YoY) from Yahoo Finance for each symbol.
 * Processes in batches of YAHOO_BATCH_SIZE with a delay between batches.
 * On error, sets revenueGrowth to null (does not throw).
 */
async function batchFetchRevenueGrowth(symbols, getFundamentals = getSymbolFundamentals) {
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
  const getFundamentals = _deps?.getSymbolFundamentals ?? getSymbolFundamentals;
  const scannerUrl = `https://scanner.tradingview.com/${market}/scan`;
  const sectorMomentumScan = await runSectorMomentumScan({
    market,
    exchangeAllowlist,
    symbolAllowlist,
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
      .map((row) => ({
        ...row,
        ...(sectorRankLookup.get(profile.phase1Labels[0]) ?? {}),
        screeningProfileId: profile.id,
        screeningProfileLabel: profile.label,
        screeningThresholds: profile.thresholds,
        screeningPfcfMax: profile.getPfcfMax ? profile.getPfcfMax(row) : profile.thresholds.pFcfMax,
        screeningRevenueGrowthMinPct: profile.thresholds.revenueGrowthMinPct,
        extremeMomentum: buildExtremeMomentum(row),
      }))),
  );
  const phase1Filtered = scopeFiltered;
  let clientFiltered = phase1Filtered.filter(passesProfileClientFilters);

  if (enrichWithYahoo && clientFiltered.length > 0) {
    const symbols = clientFiltered.map((r) => r.symbol);
    const growthMap = await batchFetchRevenueGrowth(symbols, getFundamentals);

    clientFiltered = clientFiltered
      .map((r) => ({ ...r, revenueGrowth: growthMap[r.symbol] ?? null }))
      .filter((r) => r.revenueGrowth === null
        || r.revenueGrowth > (r.screeningRevenueGrowthMinPct / 100));
  }

  const ranked = applyBlockRanks(clientFiltered).sort((a, b) => a.rankScore - b.rankScore);
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
  if (exchangeAllowlist) {
    criteria.allowed_exchanges = exchangeAllowlist;
  }
  if (symbolAllowlistKey) {
    criteria.symbol_allowlist_key = symbolAllowlistKey;
  }
  if (enrichWithYahoo) {
    criteria.revenue_growth_policy = 'profile-specific minimum, null passes';
  }

  return {
    success: true,
    totalScanned,
    serverFiltered: scopeFiltered.length,
    phase1Filtered: phase1Filtered.length,
    clientFiltered: clientFiltered.length,
    matched: matched.length,
    enrichedWithYahoo: enrichWithYahoo,
    criteria,
    rankingFormula: RANK_BLOCKS.map((block) => block.key),
    rankingBlocks: RANK_BLOCKS.map((block) => ({
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
    source: enrichWithYahoo ? 'tradingview_scanner+yahoo_finance' : 'tradingview_scanner',
  };
}
