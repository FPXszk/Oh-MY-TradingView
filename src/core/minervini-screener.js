/**
 * Minervini stock screener — queries TradingView's scanner API for US stocks
 * that pass Mark Minervini's trend-template conditions.
 *
 * Conditions applied:
 *   1. US market only
 *   2. RSI(14) >= 60                     (server-side)
 *   3. Market cap >= $1B                  (server-side)
 *   4. Relative volume >= 1.2x            (server-side)
 *   5. Close > SMA200                     (client-side)
 *   6. Close > SMA50                      (client-side)
 *   7. Close >= 75% of 52-week high       (client-side)
 */

const SCANNER_URL = 'https://scanner.tradingview.com/america/scan';
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const DEFAULT_TIMEOUT_MS = 15000;

const COLUMNS = [
  'name',
  'close',
  'RSI',
  'SMA200',
  'SMA50',
  'High.All',
  'Relative.Volume',
  'market_cap_basic',
  'volume',
];

const COL = Object.fromEntries(COLUMNS.map((col, i) => [col, i]));

function buildRequestBody(serverLimit) {
  return {
    filter: [
      { left: 'RSI', operation: 'egreater', right: 60 },
      { left: 'market_cap_basic', operation: 'egreater', right: 1_000_000_000 },
      { left: 'Relative.Volume', operation: 'egreater', right: 1.2 },
    ],
    options: { lang: 'en' },
    markets: ['america'],
    symbols: { query: { types: ['stock'] }, tickers: [] },
    columns: COLUMNS,
    sort: { sortBy: 'RSI', sortOrder: 'desc' },
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
  const rsi14 = d[COL['RSI']] ?? null;
  const sma200 = d[COL['SMA200']] ?? null;
  const sma50 = d[COL['SMA50']] ?? null;
  const high52w = d[COL['High.All']] ?? null;
  const relativeVolume = d[COL['Relative.Volume']] ?? null;
  const marketCapUsd = d[COL['market_cap_basic']] ?? null;
  const volume = d[COL['volume']] ?? null;

  const pctOf52wHigh =
    close !== null && high52w !== null && high52w > 0
      ? Number(((close / high52w) * 100).toFixed(2))
      : null;

  return {
    symbol,
    exchange,
    close,
    rsi14,
    sma200,
    sma50,
    high52w,
    pctOf52wHigh,
    relativeVolume,
    marketCapUsd,
    volume,
  };
}

function passesClientFilters(row) {
  const { close, sma200, sma50, high52w, pctOf52wHigh } = row;

  if (close !== null && sma200 !== null && close <= sma200) return false;
  if (close !== null && sma50 !== null && close <= sma50) return false;
  if (pctOf52wHigh !== null && pctOf52wHigh < 75) return false;

  return true;
}

function validateLimit(limit) {
  if (limit === undefined || limit === null) return DEFAULT_LIMIT;
  const n = Number(limit);
  if (!Number.isInteger(n) || n < 1 || n > MAX_LIMIT) {
    throw new Error(`limit must be an integer between 1 and ${MAX_LIMIT}`);
  }
  return n;
}

export async function runMinervinScreener({ limit, _deps } = {}) {
  const effectiveLimit = validateLimit(limit);

  const fetchFn = _deps?.fetch ?? globalThis.fetch;

  const serverLimit = Math.min(effectiveLimit * 4, MAX_LIMIT * 2);

  const response = await fetchFn(SCANNER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildRequestBody(serverLimit)),
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`TradingView scanner request failed: HTTP ${response.status}`);
  }

  const payload = await response.json();

  if (!Array.isArray(payload?.data)) {
    throw new Error('TradingView scanner returned unexpected response format');
  }

  const totalCount = payload.totalCount ?? payload.data.length;
  const serverFiltered = payload.data.length;

  const normalized = payload.data.map(normalizeRow);
  const matched = normalized.filter(passesClientFilters).slice(0, effectiveLimit);

  return {
    success: true,
    totalScanned: totalCount,
    serverFiltered,
    matched: matched.length,
    criteria: {
      rsi14_min: 60,
      market_cap_min_usd: 1_000_000_000,
      relative_volume_min: 1.2,
      price_above_sma200: true,
      price_above_sma50: true,
      price_pct_of_52wk_high_min: 75,
    },
    results: matched,
    retrieved_at: new Date().toISOString(),
    source: 'tradingview_scanner',
  };
}
