const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_SELECTED_SECTOR_COUNT = 3;
const STOCK_RANGE_LIMIT = 2000;
const MARKET_CAP_MIN_USD = 1_000_000_000;

const US_SECTOR_FUNDS = [
  {
    key: 'technology',
    sector: 'Technology',
    ticker: 'AMEX:XLK',
    stockSectors: ['Electronic Technology', 'Technology Services'],
    industryExcludePattern: /Semiconductors/i,
  },
  {
    key: 'consumer-discretionary',
    sector: 'Consumer Discretionary',
    ticker: 'AMEX:XLY',
    stockSectors: ['Consumer Durables', 'Consumer Services', 'Retail Trade', 'Distribution Services'],
  },
  {
    key: 'energy',
    sector: 'Energy',
    ticker: 'AMEX:XLE',
    stockSectors: ['Energy Minerals'],
  },
  {
    key: 'health-care',
    sector: 'Health Care',
    ticker: 'AMEX:XLV',
    stockSectors: ['Health Technology', 'Health Services'],
  },
  {
    key: 'financials',
    sector: 'Financials',
    ticker: 'AMEX:XLF',
    stockSectors: ['Finance'],
    industryExcludePattern: /REIT|Real Estate/i,
  },
  {
    key: 'communication-services',
    sector: 'Communication Services',
    ticker: 'AMEX:XLC',
    stockSectors: ['Communications'],
  },
  {
    key: 'industrials',
    sector: 'Industrials',
    ticker: 'AMEX:XLI',
    stockSectors: ['Producer Manufacturing', 'Industrial Services', 'Transportation', 'Commercial Services'],
  },
  {
    key: 'materials',
    sector: 'Materials',
    ticker: 'AMEX:XLB',
    stockSectors: ['Process Industries', 'Non-Energy Minerals'],
  },
  {
    key: 'real-estate',
    sector: 'Real Estate',
    ticker: 'AMEX:XLRE',
    stockSectors: ['Finance'],
    industryPattern: /REIT|Real Estate/i,
  },
  {
    key: 'consumer-staples',
    sector: 'Consumer Staples',
    ticker: 'AMEX:XLP',
    stockSectors: ['Consumer Non-Durables'],
  },
  {
    key: 'utilities',
    sector: 'Utilities',
    ticker: 'AMEX:XLU',
    stockSectors: ['Utilities'],
  },
  {
    key: 'semiconductors',
    sector: 'Semiconductors',
    ticker: 'NASDAQ:SMH',
    stockSectors: ['Electronic Technology'],
    industryPattern: /Semiconductors/i,
  },
];

const FUND_COLUMNS = [
  'name',
  'description',
  'Perf.1M',
  'Perf.3M',
  'Perf.6M',
  'Perf.Y',
  'RSI',
  'relative_volume_10d_calc',
  'volume',
];

const STOCK_COLUMNS = [
  'name',
  'sector',
  'Perf.1M',
  'Perf.3M',
  'Perf.6M',
  'Perf.Y',
  'RSI',
  'relative_volume_10d_calc',
  'market_cap_basic',
];

const FUND_COL = Object.fromEntries(FUND_COLUMNS.map((col, index) => [col, index]));
const STOCK_COL = Object.fromEntries(STOCK_COLUMNS.map((col, index) => [col, index]));

function normalizeSymbol(rawSymbol) {
  const colonIdx = rawSymbol.indexOf(':');
  return {
    exchange: colonIdx !== -1 ? rawSymbol.slice(0, colonIdx) : null,
    symbol: colonIdx !== -1 ? rawSymbol.slice(colonIdx + 1) : rawSymbol,
  };
}

function validateSelectedSectorCount(value) {
  if (value === undefined || value === null) return DEFAULT_SELECTED_SECTOR_COUNT;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > US_SECTOR_FUNDS.length) {
    throw new Error(`selectedSectorCount must be an integer between 1 and ${US_SECTOR_FUNDS.length}`);
  }
  return n;
}

function average(total, count, digits = 1) {
  if (!count) return null;
  return Number((total / count).toFixed(digits));
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

function buildUsFundRequestBody() {
  return {
    filter: [],
    options: { lang: 'en' },
    markets: ['america'],
    symbols: {
      query: { types: ['fund'] },
      tickers: US_SECTOR_FUNDS.map((entry) => entry.ticker),
    },
    columns: FUND_COLUMNS,
    sort: { sortBy: 'Perf.3M', sortOrder: 'desc' },
    range: [0, US_SECTOR_FUNDS.length],
  };
}

function buildStockAggregationRequestBody(market) {
  return {
    filter: [
      { left: 'market_cap_basic', operation: 'egreater', right: MARKET_CAP_MIN_USD },
    ],
    options: { lang: 'en' },
    markets: [market],
    symbols: { query: { types: ['stock'] }, tickers: [] },
    columns: STOCK_COLUMNS,
    sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' },
    range: [0, STOCK_RANGE_LIMIT],
  };
}

function passesScopeFilters(row, { exchangeAllowlist, symbolAllowlist }) {
  if (exchangeAllowlist && !exchangeAllowlist.includes(row.exchange)) return false;
  if (symbolAllowlist && !symbolAllowlist.has(row.symbol)) return false;
  return true;
}

function normalizeFundRow(row) {
  const ticker = row.s || '';
  const config = US_SECTOR_FUNDS.find((entry) => entry.ticker === ticker);
  if (!config) return null;

  const { exchange, symbol } = normalizeSymbol(ticker);
  return {
    sectorKey: config.key,
    sector: config.sector,
    ticker,
    exchange,
    proxySymbol: symbol,
    proxyName: row.d[FUND_COL['name']] ?? symbol,
    description: row.d[FUND_COL['description']] ?? null,
    perf1m: row.d[FUND_COL['Perf.1M']] ?? null,
    perf3m: row.d[FUND_COL['Perf.3M']] ?? null,
    perf6m: row.d[FUND_COL['Perf.6M']] ?? null,
    perfY: row.d[FUND_COL['Perf.Y']] ?? null,
    rsi14: row.d[FUND_COL['RSI']] ?? null,
    relativeVolume: row.d[FUND_COL['relative_volume_10d_calc']] ?? null,
    volume: row.d[FUND_COL['volume']] ?? null,
    stockSectors: config.stockSectors,
    industryPattern: config.industryPattern ?? null,
    industryExcludePattern: config.industryExcludePattern ?? null,
  };
}

function normalizeStockRow(row) {
  const { exchange, symbol } = normalizeSymbol(row.s || '');
  return {
    exchange,
    symbol,
    sector: row.d[STOCK_COL['sector']] ?? 'Unknown',
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

async function runUsSectorFunds({ fetchFn, selectedSectorCount }) {
  const payload = await requestScanner(
    'https://scanner.tradingview.com/america/scan',
    buildUsFundRequestBody(),
    fetchFn,
  );

  const normalized = payload.data.map(normalizeFundRow).filter(Boolean);
  const rankingFormula = ['perfY', 'perf6m', 'perf3m', 'relativeVolume', 'rsi14'];
  const rankings = applyRankSum(normalized, rankingFormula);
  const { selected, selectedStockSectors, selectedFilterRules } = buildSelection(rankings, selectedSectorCount);

  return {
    approach: 'us-sector-etfs',
    approachLabel: 'US sector ETF momentum',
    selectedCount: selectedSectorCount,
    rankingFormula,
    selectedSectors: selected.map((entry) => ({
      key: entry.sectorKey,
      label: entry.sector,
      proxySymbol: entry.proxySymbol,
      stockSectors: entry.stockSectors,
    })),
    selectedStockSectors,
    selectedFilterRules,
    rankings,
    coverage: {
      totalCandidatesReported: payload.totalCount ?? normalized.length,
      scopedCandidates: normalized.length,
      serverLimit: US_SECTOR_FUNDS.length,
    },
  };
}

async function runStockAggregation({
  market,
  exchangeAllowlist,
  symbolAllowlist,
  fetchFn,
  selectedSectorCount,
}) {
  const payload = await requestScanner(
    `https://scanner.tradingview.com/${market}/scan`,
    buildStockAggregationRequestBody(market),
    fetchFn,
  );

  const normalized = payload.data
    .map(normalizeStockRow)
    .filter((row) => passesScopeFilters(row, { exchangeAllowlist, symbolAllowlist }));

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
  }));

  const rankingFormula = ['perfY', 'perf6m', 'perf3m', 'relativeVolume', 'rsi14', 'pctRsiAbove60'];
  const rankings = applyRankSum(summarized, rankingFormula);
  const { selected, selectedStockSectors, selectedFilterRules } = buildSelection(rankings, selectedSectorCount);

  return {
    approach: 'stock-aggregation',
    approachLabel: `${market} stock aggregation`,
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
    rankings,
    coverage: {
      totalCandidatesReported: payload.totalCount ?? payload.data.length,
      scopedCandidates: normalized.length,
      serverLimit: STOCK_RANGE_LIMIT,
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
  const effectiveSelectedSectorCount = validateSelectedSectorCount(selectedSectorCount);

  if (market === 'america') {
    return runUsSectorFunds({
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
