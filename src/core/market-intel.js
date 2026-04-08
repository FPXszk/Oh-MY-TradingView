/**
 * Non-CDP market intelligence layer.
 * Uses Node built-in fetch to retrieve public market data from Yahoo Finance.
 * No API key required.
 */

const YAHOO_QUOTE_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
const YAHOO_SEARCH_BASE = 'https://query1.finance.yahoo.com/v1/finance/search';
const YAHOO_QUOTESUMMARY_BASE = 'https://query1.finance.yahoo.com/v10/finance/quoteSummary';

const DEFAULT_TIMEOUT_MS = 10000;

function buildHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (compatible; Oh-MY-TradingView/0.1)',
  };
}

async function fetchJson(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const resp = await fetch(url, {
    headers: buildHeaders(),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} from ${url}`);
  }

  return resp.json();
}

function normalizeNumber(value) {
  if (value === undefined || value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function computePercentDelta(current, base, precision = 4) {
  const currentValue = Number(current);
  const baseValue = Number(base);
  if (!Number.isFinite(currentValue) || !Number.isFinite(baseValue) || baseValue === 0) {
    return null;
  }
  return Number((((currentValue - baseValue) / baseValue) * 100).toFixed(precision));
}

/**
 * Get a single symbol quote (price, change, volume, market cap basics).
 */
export async function getSymbolQuote(symbol) {
  if (!symbol || typeof symbol !== 'string') {
    throw new Error('symbol is required');
  }

  const ticker = symbol.trim().toUpperCase();
  const url = `${YAHOO_QUOTE_BASE}/${encodeURIComponent(ticker)}?range=1d&interval=1d`;
  const data = await fetchJson(url);

  const result = data?.chart?.result?.[0];
  if (!result) {
    throw new Error(`No quote data for symbol "${ticker}"`);
  }

  const meta = result.meta || {};
  const regularMarketPrice = normalizeNumber(meta.regularMarketPrice);
  const previousClose = normalizeNumber(meta.previousClose ?? meta.chartPreviousClose);
  const priceChange = (
    regularMarketPrice !== null && previousClose !== null
      ? Number((regularMarketPrice - previousClose).toFixed(4))
      : null
  );
  const priceChangePercent = (
    priceChange !== null && previousClose
      ? Number(((priceChange / previousClose) * 100).toFixed(4))
      : null
  );
  return {
    success: true,
    symbol: meta.symbol || ticker,
    currency: meta.currency || null,
    exchangeName: meta.exchangeName || null,
    regularMarketPrice,
    previousClose,
    priceChange,
    priceChangePercent,
    regularMarketVolume: normalizeNumber(meta.regularMarketVolume),
    regularMarketDayHigh: normalizeNumber(meta.regularMarketDayHigh),
    regularMarketDayLow: normalizeNumber(meta.regularMarketDayLow),
    fiftyTwoWeekHigh: normalizeNumber(meta.fiftyTwoWeekHigh),
    fiftyTwoWeekLow: normalizeNumber(meta.fiftyTwoWeekLow),
    retrieved_at: new Date().toISOString(),
    source: 'yahoo_finance',
  };
}

/**
 * Get fundamental data for a symbol.
 */
export async function getSymbolFundamentals(symbol) {
  if (!symbol || typeof symbol !== 'string') {
    throw new Error('symbol is required');
  }

  const ticker = symbol.trim().toUpperCase();
  const modules = 'summaryDetail,defaultKeyStatistics,financialData';
  const url = `${YAHOO_QUOTESUMMARY_BASE}/${encodeURIComponent(ticker)}?modules=${modules}`;
  const data = await fetchJson(url);

  const qsResult = data?.quoteSummary?.result?.[0];
  if (!qsResult) {
    throw new Error(`No fundamentals data for symbol "${ticker}"`);
  }

  const summary = qsResult.summaryDetail || {};
  const keyStats = qsResult.defaultKeyStatistics || {};
  const financials = qsResult.financialData || {};

  return {
    success: true,
    symbol: ticker,
    marketCap: normalizeNumber(summary.marketCap?.raw),
    trailingPE: normalizeNumber(summary.trailingPE?.raw),
    forwardPE: normalizeNumber(summary.forwardPE?.raw ?? keyStats.forwardPE?.raw),
    dividendYield: normalizeNumber(summary.dividendYield?.raw),
    beta: normalizeNumber(summary.beta?.raw ?? keyStats.beta?.raw),
    profitMargins: normalizeNumber(financials.profitMargins?.raw),
    revenueGrowth: normalizeNumber(financials.revenueGrowth?.raw),
    earningsGrowth: normalizeNumber(financials.earningsGrowth?.raw),
    returnOnEquity: normalizeNumber(financials.returnOnEquity?.raw),
    debtToEquity: normalizeNumber(financials.debtToEquity?.raw),
    retrieved_at: new Date().toISOString(),
    source: 'yahoo_finance',
  };
}

/**
 * Market snapshot — gets quotes for a list of symbols.
 */
export async function getMarketSnapshot(symbols) {
  if (!Array.isArray(symbols) || symbols.length === 0) {
    throw new Error('symbols array is required and must not be empty');
  }

  if (symbols.length > 20) {
    throw new Error('symbols array must not exceed 20 items');
  }

  const results = await Promise.allSettled(
    symbols.map((s) => getSymbolQuote(s)),
  );

  const quotes = results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return {
      success: false,
      symbol: symbols[i],
      error: r.reason?.message || 'Unknown error',
    };
  });
  const successCount = quotes.filter((quote) => quote.success).length;

  const response = {
    success: successCount > 0,
    count: quotes.length,
    successCount,
    failureCount: quotes.length - successCount,
    quotes,
    retrieved_at: new Date().toISOString(),
  };
  if (!response.success) {
    response.error = 'All quote requests failed';
  }
  return response;
}

/**
 * Financial news — searches Yahoo Finance for news related to a query.
 */
export async function getFinancialNews(query) {
  if (!query || typeof query !== 'string') {
    throw new Error('query is required');
  }

  const url = `${YAHOO_SEARCH_BASE}?q=${encodeURIComponent(query.trim())}&newsCount=10&quotesCount=0`;
  const data = await fetchJson(url);

  const news = (data?.news || []).map((item) => ({
    title: item.title || null,
    publisher: item.publisher || null,
    link: item.link || null,
    publishedAt: item.providerPublishTime
      ? new Date(item.providerPublishTime * 1000).toISOString()
      : null,
    type: item.type || null,
  }));

  return {
    success: true,
    query: query.trim(),
    count: news.length,
    news,
    retrieved_at: new Date().toISOString(),
    source: 'yahoo_finance',
  };
}

/**
 * Practical screener — filters symbols from a provided list by basic criteria.
 * Uses quote data to filter in-process (no dedicated screener API needed).
 */
// ---------------------------------------------------------------------------
// TA helpers — RSI(14), SMA(n), price change
// ---------------------------------------------------------------------------

const TA_MAX_SYMBOLS = 20;

/**
 * Fetch daily close prices for a symbol over the last ~60 trading days.
 * Returns an array of close prices (oldest → newest).
 */
async function fetchDailyCloses(symbol, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const ticker = symbol.trim().toUpperCase();
  const url = `${YAHOO_QUOTE_BASE}/${encodeURIComponent(ticker)}?range=3mo&interval=1d`;
  const data = await fetchJson(url, timeoutMs);
  const result = data?.chart?.result?.[0];
  if (!result) {
    throw new Error(`No chart data for symbol "${ticker}"`);
  }
  const closes = result.indicators?.quote?.[0]?.close;
  if (!Array.isArray(closes) || closes.length === 0) {
    throw new Error(`No close prices for symbol "${ticker}"`);
  }
  const filtered = closes.filter((v) => v !== null && Number.isFinite(v));
  if (filtered.length === 0) {
    throw new Error(`No valid close prices for symbol "${ticker}"`);
  }
  return filtered;
}

/**
 * Compute RSI for the given period from an array of close prices.
 */
export function computeRsi(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta >= 0) gainSum += delta;
    else lossSum += -delta;
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  for (let i = period + 1; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(delta, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-delta, 0)) / period;
  }
  if (avgGain === 0 && avgLoss === 0) return 50;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Number((100 - 100 / (1 + rs)).toFixed(2));
}

/**
 * Compute SMA for the given period from an array of close prices.
 */
export function computeSma(closes, period) {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return Number((sum / period).toFixed(4));
}

/**
 * Compute TA indicators for a single symbol.
 */
async function computeSymbolTa(symbol) {
  const closes = await fetchDailyCloses(symbol);
  const latestClose = closes[closes.length - 1];
  const prevClose = closes.length >= 2 ? closes[closes.length - 2] : null;
  const priceChange = computePercentDelta(latestClose, prevClose);
  const rsi14 = computeRsi(closes, 14);
  const sma20 = computeSma(closes, 20);
  const sma50 = computeSma(closes, 50);
  const sma20Deviation = computePercentDelta(latestClose, sma20);
  const sma50Deviation = computePercentDelta(latestClose, sma50);

  return {
    symbol: symbol.trim().toUpperCase(),
    latestClose,
    priceChange,
    rsi14,
    sma20,
    sma50,
    sma20Deviation,
    sma50Deviation,
  };
}

/**
 * Get TA summary for multiple symbols.
 * Preserves partial-failure behaviour — individual symbol failures are reported
 * but don't prevent other symbols from returning data.
 */
export async function getMultiSymbolTaSummary(symbols) {
  if (!Array.isArray(symbols) || symbols.length === 0) {
    throw new Error('symbols array is required and must not be empty');
  }
  if (symbols.length > TA_MAX_SYMBOLS) {
    throw new Error(`symbols array must not exceed ${TA_MAX_SYMBOLS} items`);
  }

  const results = await Promise.allSettled(
    symbols.map((s) => computeSymbolTa(s)),
  );

  const summaries = results.map((r, i) => {
    if (r.status === 'fulfilled') return { success: true, ...r.value };
    return {
      success: false,
      symbol: symbols[i]?.trim?.()?.toUpperCase?.() || symbols[i],
      error: r.reason?.message || 'Unknown error',
    };
  });

  const successCount = summaries.filter((s) => s.success).length;

  const response = {
    success: successCount > 0,
    count: summaries.length,
    successCount,
    failureCount: summaries.length - successCount,
    summaries,
    retrieved_at: new Date().toISOString(),
    source: 'yahoo_finance',
  };
  if (!response.success) {
    response.error = 'All TA requests failed';
  }
  return response;
}

/**
 * Rank symbols by a TA indicator.
 * @param {string[]} symbols - Ticker symbols
 * @param {string} sortBy - 'priceChange' | 'rsi14' | 'sma20Deviation' | 'sma50Deviation'
 * @param {string} [order='desc'] - 'asc' | 'desc'
 */
export async function rankSymbolsByTa(symbols, sortBy = 'priceChange', order = 'desc') {
  const validSortFields = ['priceChange', 'rsi14', 'sma20Deviation', 'sma50Deviation'];
  if (!validSortFields.includes(sortBy)) {
    throw new Error(`sortBy must be one of: ${validSortFields.join(', ')}`);
  }
  if (order !== 'asc' && order !== 'desc') {
    throw new Error("order must be 'asc' or 'desc'");
  }

  const summary = await getMultiSymbolTaSummary(symbols);
  const successful = summary.summaries.filter((s) => s.success && Number.isFinite(s[sortBy]));
  const failed = summary.summaries.filter((s) => !s.success || !Number.isFinite(s[sortBy]));

  const sorted = successful.sort((a, b) => {
    const diff = (a[sortBy] ?? 0) - (b[sortBy] ?? 0);
    return order === 'desc' ? -diff : diff;
  });

  const ranked = sorted.map((item, i) => ({
    rank: i + 1,
    ...item,
  }));

  return {
    success: summary.success,
    sortBy,
    order,
    ranked,
    unranked: failed,
    count: summary.count,
    rankedCount: ranked.length,
    ...(summary.error ? { error: summary.error } : {}),
    retrieved_at: new Date().toISOString(),
    source: 'yahoo_finance',
  };
}

export async function runScreener({ symbols, minPrice, maxPrice, minVolume } = {}) {
  if (!Array.isArray(symbols) || symbols.length === 0) {
    throw new Error('symbols array is required');
  }

  if (symbols.length > 30) {
    throw new Error('symbols array must not exceed 30 items for screener');
  }

  let effectiveMinPrice = null;
  if (minPrice !== undefined && minPrice !== null) {
    effectiveMinPrice = Number(minPrice);
    if (!Number.isFinite(effectiveMinPrice)) {
      throw new Error('minPrice must be a finite number');
    }
  }

  let effectiveMaxPrice = null;
  if (maxPrice !== undefined && maxPrice !== null) {
    effectiveMaxPrice = Number(maxPrice);
    if (!Number.isFinite(effectiveMaxPrice)) {
      throw new Error('maxPrice must be a finite number');
    }
  }

  let effectiveMinVolume = null;
  if (minVolume !== undefined && minVolume !== null) {
    effectiveMinVolume = Number(minVolume);
    if (!Number.isFinite(effectiveMinVolume)) {
      throw new Error('minVolume must be a finite number');
    }
  }

  const quoteResults = await Promise.allSettled(
    symbols.map((s) => getSymbolQuote(s)),
  );
  const successfulQuotes = quoteResults.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return {
      success: false,
      symbol: symbols[i],
      error: r.reason?.message || 'Unknown error',
    };
  }).filter((q) => q.success);

  if (successfulQuotes.length === 0) {
    return {
      success: false,
      error: 'All quote requests failed',
      totalChecked: symbols.length,
      matched: 0,
      results: [],
      criteria: {
        minPrice: effectiveMinPrice,
        maxPrice: effectiveMaxPrice,
        minVolume: effectiveMinVolume,
      },
      retrieved_at: new Date().toISOString(),
    };
  }

  let filtered = successfulQuotes;

  if (effectiveMinPrice !== null) {
    filtered = filtered.filter((q) => q.regularMarketPrice >= effectiveMinPrice);
  }

  if (effectiveMaxPrice !== null) {
    filtered = filtered.filter((q) => q.regularMarketPrice <= effectiveMaxPrice);
  }

  if (effectiveMinVolume !== null) {
    filtered = filtered.filter((q) => (q.regularMarketVolume || 0) >= effectiveMinVolume);
  }

  return {
    success: true,
    totalChecked: symbols.length,
    successCount: successfulQuotes.length,
    failureCount: symbols.length - successfulQuotes.length,
    matched: filtered.length,
    results: filtered,
    criteria: {
      minPrice: effectiveMinPrice,
      maxPrice: effectiveMaxPrice,
      minVolume: effectiveMinVolume,
    },
    retrieved_at: new Date().toISOString(),
  };
}
