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
 * Ranking: rank-sum of Perf.3M + ROE + FCF margin [+ revenueGrowth when enriched]
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
  'relative_volume_10d_calc',
  'market_cap_basic',
  'earnings_per_share_diluted_ttm',
  'return_on_equity',
  'gross_margin_ttm',
  'free_cash_flow_margin_ttm',
  'free_cash_flow_ttm',
  'net_debt',
  'volume',
];

const COL = Object.fromEntries(COLUMNS.map((col, i) => [col, i]));

function buildRequestBody(serverLimit, { market, profile, scope }) {
  const thresholds = profile.thresholds;
  return {
    filter: [
      { left: 'sector', operation: 'equal', right: scope.sector },
      { left: 'RSI', operation: 'egreater', right: thresholds.rsiMin },
      { left: 'market_cap_basic', operation: 'egreater', right: thresholds.marketCapMinUsd },
      { left: 'relative_volume_10d_calc', operation: 'egreater', right: thresholds.relativeVolumeMin },
      { left: 'earnings_per_share_diluted_ttm', operation: 'egreater', right: thresholds.epsMin },
      { left: 'return_on_equity', operation: 'egreater', right: thresholds.roeMinPct },
      { left: 'gross_margin_ttm', operation: 'egreater', right: thresholds.grossMarginMinPct },
      { left: 'free_cash_flow_margin_ttm', operation: 'egreater', right: thresholds.fcfMarginMinPct },
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
  const relativeVolume = d[COL['relative_volume_10d_calc']] ?? null;
  const marketCapUsd = d[COL['market_cap_basic']] ?? null;
  const eps = d[COL['earnings_per_share_diluted_ttm']] ?? null;
  const roe = d[COL['return_on_equity']] ?? null;
  const grossMargin = d[COL['gross_margin_ttm']] ?? null;
  const fcfMargin = d[COL['free_cash_flow_margin_ttm']] ?? null;
  const fcfTtm = d[COL['free_cash_flow_ttm']] ?? null;
  const netDebt = d[COL['net_debt']] ?? null;
  const volume = d[COL['volume']] ?? null;

  const pctOf52wHigh =
    close !== null && high52w !== null && high52w > 0
      ? Number(((close / high52w) * 100).toFixed(2))
      : null;

  // P/FCF = market_cap / free_cash_flow_ttm (client-calculated)
  const pFcf =
    marketCapUsd !== null && fcfTtm !== null && fcfTtm > 0
      ? Number((marketCapUsd / fcfTtm).toFixed(1))
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
    relativeVolume,
    marketCapUsd,
    eps,
    roe,
    grossMargin,
    fcfMargin,
    pFcf,
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

/**
 * Assign rank positions (1 = best) for a numeric field across rows.
 * Rows with null values get rank = rows.length + 1 (last).
 */
function assignRanks(rows, field) {
  const indexed = rows.map((r, i) => ({ i, val: r[field] }));
  indexed.sort((a, b) => {
    if (a.val === null) return 1;
    if (b.val === null) return -1;
    return b.val - a.val; // descending: higher value = better rank
  });
  const ranks = new Array(rows.length);
  indexed.forEach(({ i }, rank) => {
    ranks[i] = rank + 1;
  });
  return ranks;
}

function applyRankSum(rows, includeRevenueGrowth = false) {
  const rankPerf = assignRanks(rows, 'perf3m');
  const rankRoe = assignRanks(rows, 'roe');
  const rankFcf = assignRanks(rows, 'fcfMargin');
  const rankRev = includeRevenueGrowth ? assignRanks(rows, 'revenueGrowth') : null;

  return rows.map((row, i) => ({
    ...row,
    rankBreakdown: {
      perf3m: rankPerf[i],
      roe: rankRoe[i],
      fcfMargin: rankFcf[i],
      ...(rankRev ? { revenueGrowth: rankRev[i] } : {}),
    },
    rankScore: rankPerf[i] + rankRoe[i] + rankFcf[i] + (rankRev ? rankRev[i] : 0),
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
        screeningProfileId: profile.id,
        screeningProfileLabel: profile.label,
        screeningThresholds: profile.thresholds,
        screeningPfcfMax: profile.getPfcfMax ? profile.getPfcfMax(row) : profile.thresholds.pFcfMax,
        screeningRevenueGrowthMinPct: profile.thresholds.revenueGrowthMinPct,
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

  const ranked = applyRankSum(clientFiltered, enrichWithYahoo).sort((a, b) => a.rankScore - b.rankScore);
  const matched = ranked.slice(0, effectiveLimit).map(stripInternalFields);
  const sectorRanking = summarizeSectors(ranked);

  const criteria = {
    market_cap_min_usd: 1_000_000_000,
    eps_min: 0,
    price_above_sma200: true,
    price_above_sma50: true,
    price_pct_of_52wk_high_min: 75,
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
    rankingFormula: enrichWithYahoo
      ? ['perf3m', 'roe', 'fcfMargin', 'revenueGrowth']
      : ['perf3m', 'roe', 'fcfMargin'],
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
