const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_SELECTED_SECTOR_COUNT = 3;
const DEFAULT_US_SELECTED_SECTOR_COUNT = 3;
const STOCK_PAGE_SIZE = 1000;
const MARKET_CAP_MIN_USD = 1_000_000_000;
const MAX_SELECTED_STOCK_SECTOR_COUNT = 20;
const AMERICA_BENCHMARK_TICKERS = ['BATS:SPY', 'AMEX:SPY'];

const STOCK_COLUMNS = [
  'name',
  'sector',
  'close',
  'SMA200',
  'SMA50',
  'price_52_week_high',
  'Perf.1M',
  'Perf.3M',
  'Perf.6M',
  'Perf.Y',
  'RSI',
  'relative_volume_10d_calc',
  'market_cap_basic',
];

const STOCK_COL = Object.fromEntries(STOCK_COLUMNS.map((col, index) => [col, index]));

function normalizeSymbol(rawSymbol) {
  const colonIdx = rawSymbol.indexOf(':');
  return {
    exchange: colonIdx !== -1 ? rawSymbol.slice(0, colonIdx) : null,
    symbol: colonIdx !== -1 ? rawSymbol.slice(colonIdx + 1) : rawSymbol,
  };
}

function validateSelectedSectorCount(value, { max = MAX_SELECTED_STOCK_SECTOR_COUNT, defaultValue = DEFAULT_SELECTED_SECTOR_COUNT } = {}) {
  if (value === undefined || value === null) return defaultValue;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > max) {
    throw new Error(`selectedSectorCount must be an integer between 1 and ${max}`);
  }
  return n;
}

function average(total, count, digits = 1) {
  if (!count) return null;
  return Number((total / count).toFixed(digits));
}

function percentage(count, total, digits = 1) {
  if (!total) return null;
  return Number(((count / total) * 100).toFixed(digits));
}

function assignRanks(rows, field) {
  const indexed = rows.map((row, index) => ({ index, value: row[field] }));
  indexed.sort((a, b) => {
    if (a.value === null || a.value === undefined) return 1;
    if (b.value === null || b.value === undefined) return -1;
    return b.value - a.value;
  });
  const ranks = new Array(rows.length);
  indexed.forEach(({ index }, rank) => {
    ranks[index] = rank + 1;
  });
  return ranks;
}

function applyRankSum(rows, fields) {
  const rankMap = new Map(fields.map((field) => [field, assignRanks(rows, field)]));
  return rows
    .map((row, index) => {
      const rankBreakdown = Object.fromEntries(
        fields.map((field) => [field, rankMap.get(field)[index]]),
      );
      const rankScore = fields.reduce((sum, field) => sum + rankBreakdown[field], 0);
      return { ...row, rankBreakdown, rankScore };
    })
    .sort((a, b) => a.rankScore - b.rankScore);
}

function buildSelection(rankings, selectedCount) {
  const selected = rankings.slice(0, selectedCount);
  const selectedStockSectors = [];
  const selectedFilterRules = [];
  for (const ranking of selected) {
    const stockSectors = ranking.stockSectors ?? [ranking.sector];
    selectedFilterRules.push({
      sector: ranking.sector,
      stockSectors,
      industryPattern: ranking.industryPattern ?? null,
      industryExcludePattern: ranking.industryExcludePattern ?? null,
    });
    for (const sector of stockSectors) {
      if (!selectedStockSectors.includes(sector)) {
        selectedStockSectors.push(sector);
      }
    }
  }
  return {
    selected,
    selectedStockSectors,
    selectedFilterRules,
  };
}

function buildStockAggregationRequestBody(market, rangeStart, rangeEnd) {
  return {
    filter: [
      { left: 'market_cap_basic', operation: 'egreater', right: MARKET_CAP_MIN_USD },
    ],
    options: { lang: 'en' },
    markets: [market],
    symbols: { query: { types: ['stock'] }, tickers: [] },
    columns: STOCK_COLUMNS,
    sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' },
    range: [rangeStart, rangeEnd],
  };
}

function buildBenchmarkRequestBody(market, ticker) {
  return {
    filter: [],
    options: { lang: 'en' },
    markets: [market],
    symbols: { query: { types: ['fund'] }, tickers: [ticker] },
    columns: STOCK_COLUMNS,
    sort: { sortBy: 'name', sortOrder: 'asc' },
    range: [0, 1],
  };
}

function isExcludedExchange(row, market) {
  return market === 'america' && row.exchange === 'OTC';
}

function passesScopeFilters(row, { exchangeAllowlist, symbolAllowlist }) {
  if (isExcludedExchange(row, 'america')) return false;
  if (exchangeAllowlist && !exchangeAllowlist.includes(row.exchange)) return false;
  if (symbolAllowlist && !symbolAllowlist.has(row.symbol)) return false;
  return true;
}

function normalizeStockRow(row) {
  const { exchange, symbol } = normalizeSymbol(row.s || '');
  return {
    exchange,
    symbol,
    sector: row.d[STOCK_COL['sector']] ?? 'Unknown',
    close: row.d[STOCK_COL['close']] ?? null,
    sma200: row.d[STOCK_COL['SMA200']] ?? null,
    sma50: row.d[STOCK_COL['SMA50']] ?? null,
    price52WeekHigh: row.d[STOCK_COL['price_52_week_high']] ?? null,
    perf1m: row.d[STOCK_COL['Perf.1M']] ?? null,
    perf3m: row.d[STOCK_COL['Perf.3M']] ?? null,
    perf6m: row.d[STOCK_COL['Perf.6M']] ?? null,
    perfY: row.d[STOCK_COL['Perf.Y']] ?? null,
    rsi14: row.d[STOCK_COL['RSI']] ?? null,
    relativeVolume: row.d[STOCK_COL['relative_volume_10d_calc']] ?? null,
    marketCapUsd: row.d[STOCK_COL['market_cap_basic']] ?? null,
  };
}

async function requestScanner(url, body, fetchFn) {
  const response = await fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`TradingView scanner request failed: HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload?.data)) {
    throw new Error('TradingView scanner returned unexpected response format');
  }
  return payload;
}

async function requestBenchmarkSnapshot(market, fetchFn) {
  if (market !== 'america') return null;

  for (const ticker of AMERICA_BENCHMARK_TICKERS) {
    const payload = await requestScanner(
      `https://scanner.tradingview.com/${market}/scan`,
      buildBenchmarkRequestBody(market, ticker),
      fetchFn,
    );
    if (payload.data.length > 0) {
      return normalizeStockRow(payload.data[0]);
    }
  }

  return null;
}

async function runStockAggregation({
  market,
  exchangeAllowlist,
  symbolAllowlist,
  fetchFn,
  selectedSectorCount,
}) {
  const scannerUrl = `https://scanner.tradingview.com/${market}/scan`;
  const payloads = [];
  let rangeStart = 0;
  let totalCandidatesReported = null;
  while (totalCandidatesReported === null || rangeStart < totalCandidatesReported) {
    const payload = await requestScanner(
      scannerUrl,
      buildStockAggregationRequestBody(market, rangeStart, rangeStart + STOCK_PAGE_SIZE),
      fetchFn,
    );
    payloads.push(payload);
    totalCandidatesReported = payload.totalCount ?? (rangeStart + payload.data.length);
    if (payload.data.length === 0) break;
    rangeStart += STOCK_PAGE_SIZE;
  }

  const rawRows = payloads.flatMap((payload) => payload.data);
  const normalized = rawRows
    .map(normalizeStockRow)
    .filter((row) => passesScopeFilters(row, { exchangeAllowlist, symbolAllowlist }));
  const benchmark = await requestBenchmarkSnapshot(market, fetchFn);

  const grouped = new Map();
  for (const row of normalized) {
    const key = row.sector ?? 'Unknown';
    if (!grouped.has(key)) {
      grouped.set(key, {
        sectorKey: key,
        sector: key,
        stockSectors: [key],
        memberCount: 0,
        totalPerf1m: 0,
        perf1mCount: 0,
        totalPerf3m: 0,
        perf3mCount: 0,
        totalPerf6m: 0,
        perf6mCount: 0,
        totalPerfY: 0,
        perfYCount: 0,
        totalRsi14: 0,
        rsi14Count: 0,
        totalRelativeVolume: 0,
        relativeVolumeCount: 0,
        rsiAbove60Count: 0,
        closeAboveSma50Count: 0,
        closeAboveSma50BaseCount: 0,
        closeAboveSma200Count: 0,
        closeAboveSma200BaseCount: 0,
        near52WeekHighCount: 0,
        near52WeekHighBaseCount: 0,
      });
    }

    const entry = grouped.get(key);
    entry.memberCount += 1;
    if (row.perf1m !== null && row.perf1m !== undefined) {
      entry.totalPerf1m += row.perf1m;
      entry.perf1mCount += 1;
    }
    if (row.perf3m !== null && row.perf3m !== undefined) {
      entry.totalPerf3m += row.perf3m;
      entry.perf3mCount += 1;
    }
    if (row.perf6m !== null && row.perf6m !== undefined) {
      entry.totalPerf6m += row.perf6m;
      entry.perf6mCount += 1;
    }
    if (row.perfY !== null && row.perfY !== undefined) {
      entry.totalPerfY += row.perfY;
      entry.perfYCount += 1;
    }
    if (row.rsi14 !== null && row.rsi14 !== undefined) {
      entry.totalRsi14 += row.rsi14;
      entry.rsi14Count += 1;
      if (row.rsi14 >= 60) entry.rsiAbove60Count += 1;
    }
    if (row.relativeVolume !== null && row.relativeVolume !== undefined) {
      entry.totalRelativeVolume += row.relativeVolume;
      entry.relativeVolumeCount += 1;
    }
    if (row.close !== null && row.close !== undefined && row.sma50 !== null && row.sma50 !== undefined) {
      entry.closeAboveSma50BaseCount += 1;
      if (row.close > row.sma50) entry.closeAboveSma50Count += 1;
    }
    if (row.close !== null && row.close !== undefined && row.sma200 !== null && row.sma200 !== undefined) {
      entry.closeAboveSma200BaseCount += 1;
      if (row.close > row.sma200) entry.closeAboveSma200Count += 1;
    }
    if (row.close !== null && row.close !== undefined && row.price52WeekHigh !== null && row.price52WeekHigh !== undefined && row.price52WeekHigh > 0) {
      entry.near52WeekHighBaseCount += 1;
      if ((row.close / row.price52WeekHigh) >= 0.9) entry.near52WeekHighCount += 1;
    }
  }

  const summarized = Array.from(grouped.values()).map((entry) => ({
    sectorKey: entry.sectorKey,
    sector: entry.sector,
    stockSectors: entry.stockSectors,
    memberCount: entry.memberCount,
    perf1m: average(entry.totalPerf1m, entry.perf1mCount),
    perf3m: average(entry.totalPerf3m, entry.perf3mCount),
    perf6m: average(entry.totalPerf6m, entry.perf6mCount),
    perfY: average(entry.totalPerfY, entry.perfYCount),
    rsi14: average(entry.totalRsi14, entry.rsi14Count),
    relativeVolume: average(entry.totalRelativeVolume, entry.relativeVolumeCount, 2),
    pctRsiAbove60: entry.memberCount > 0
      ? Number(((entry.rsiAbove60Count / entry.memberCount) * 100).toFixed(1))
      : null,
    pctAboveSma50: percentage(entry.closeAboveSma50Count, entry.closeAboveSma50BaseCount),
    pctAboveSma200: percentage(entry.closeAboveSma200Count, entry.closeAboveSma200BaseCount),
    pctNear52WeekHigh: percentage(entry.near52WeekHighCount, entry.near52WeekHighBaseCount),
  }));

  const withRelativeStrength = summarized.map((entry) => ({
    ...entry,
    relativeStrengthY: entry.perfY !== null && benchmark?.perfY !== null && benchmark?.perfY !== undefined
      ? Number((entry.perfY - benchmark.perfY).toFixed(1))
      : null,
    relativeStrength6m: entry.perf6m !== null && benchmark?.perf6m !== null && benchmark?.perf6m !== undefined
      ? Number((entry.perf6m - benchmark.perf6m).toFixed(1))
      : null,
    relativeStrength3m: entry.perf3m !== null && benchmark?.perf3m !== null && benchmark?.perf3m !== undefined
      ? Number((entry.perf3m - benchmark.perf3m).toFixed(1))
      : null,
  }));
  const candidateRankingFormula = [
    'perfY',
    'perf6m',
    'perf3m',
    'relativeStrengthY',
    'relativeStrength6m',
    'relativeStrength3m',
    'pctAboveSma50',
    'pctAboveSma200',
    'pctNear52WeekHigh',
  ];
  const rankingFormula = candidateRankingFormula.filter((field) => (
    withRelativeStrength.some((entry) => entry[field] !== null && entry[field] !== undefined)
  ));
  const rankings = applyRankSum(withRelativeStrength, rankingFormula);
  const { selected, selectedStockSectors, selectedFilterRules } = buildSelection(rankings, selectedSectorCount);

  return {
    approach: 'stock-aggregation',
    approachLabel: market === 'america'
      ? 'US TradingView stock-sector aggregation'
      : `${market} stock aggregation`,
    selectedCount: selectedSectorCount,
    rankingFormula,
    selectedSectors: selected.map((entry) => ({
      key: entry.sectorKey,
      label: entry.sector,
      memberCount: entry.memberCount,
      stockSectors: entry.stockSectors,
    })),
    selectedStockSectors,
    selectedFilterRules,
    benchmark: benchmark
      ? {
        symbol: benchmark.symbol,
        exchange: benchmark.exchange,
        perf3m: benchmark.perf3m,
        perf6m: benchmark.perf6m,
        perfY: benchmark.perfY,
      }
      : null,
    rankings,
    coverage: {
      totalCandidatesReported: totalCandidatesReported ?? rawRows.length,
      scopedCandidates: normalized.length,
      serverLimit: rawRows.length,
    },
  };
}

export async function runSectorMomentumScan({
  market,
  exchangeAllowlist = null,
  symbolAllowlist = null,
  selectedSectorCount,
  fetch,
}) {
  const fetchFn = fetch ?? globalThis.fetch;
  const effectiveSelectedSectorCount = validateSelectedSectorCount(selectedSectorCount, {
    defaultValue: market === 'america' ? DEFAULT_US_SELECTED_SECTOR_COUNT : DEFAULT_SELECTED_SECTOR_COUNT,
  });

  if (market === 'america') {
    return runStockAggregation({
      market,
      exchangeAllowlist,
      symbolAllowlist,
      fetchFn,
      selectedSectorCount: effectiveSelectedSectorCount,
    });
  }

  return runStockAggregation({
    market,
    exchangeAllowlist,
    symbolAllowlist,
    fetchFn,
    selectedSectorCount: effectiveSelectedSectorCount,
  });
}
