import { access, constants } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const EXEC_MAX_BUFFER = 10 * 1024 * 1024;
const MAX_KLINE_COUNT = 1000;
const MAX_FILTER_LIMIT = 200;
const MAX_SNAPSHOT_SYMBOLS = 50;
const MAX_FUNDAMENTAL_SYMBOLS = 1000;
const MAX_FILTERS = 24;
const MAX_FILTER_PARAM_VALUES = 8;
const MAX_PLATE_BREADTH_SYMBOLS = 50;
const MAX_VALIDATION_SYMBOLS = 20;
const MAX_HISTORY_BARS = 400;
const MAX_FUNDAMENTAL_PAGES = 5;
const YAHOO_CHART_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
const TRADINGVIEW_SCANNER_BASE = 'https://scanner.tradingview.com';

const SUPPORTED_MARKETS = new Set(['US', 'HK', 'SH', 'SZ', 'JP', 'SG', 'AU', 'CA', 'FX', 'CC']);
const SUPPORTED_PLATE_CLASSES = new Set(['ALL', 'INDUSTRY', 'REGION', 'CONCEPT', 'OTHER']);
const SUPPORTED_FILTER_TYPES = new Set(['simple', 'financial', 'indicator', 'pattern']);
const SUPPORTED_BENCHMARK_PROVIDERS = new Set(['yahoo_finance']);
const SUPPORTED_VALIDATION_MODES = new Set(['benchmark', 'moomoo-only']);
const TRADINGVIEW_MARKET_SCOPES = new Map([
  ['US', 'america'],
]);

function resolveDeps(_deps = {}) {
  return {
    access: _deps.access || access,
    cwd: _deps.cwd || (() => process.cwd()),
    env: _deps.env || process.env,
    execFile: _deps.execFile || execFileAsync,
    fetch: _deps.fetch || globalThis.fetch,
    getSymbolFundamentals: _deps.getSymbolFundamentals,
  };
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} is required`);
  }
  return value.trim();
}

function normalizeOptionalString(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new Error('optional string parameters must be strings');
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function normalizeInteger(value, { label, min, max, defaultValue }) {
  if (value === undefined) return defaultValue;
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < min || normalized > max) {
    throw new Error(`${label} must be an integer between ${min} and ${max}`);
  }
  return normalized;
}

function normalizeNumber(value, { label, min } = {}) {
  if (value === undefined) return undefined;
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) {
    throw new Error(`${label} must be a finite number`);
  }
  if (min !== undefined && normalized < min) {
    throw new Error(`${label} must be >= ${min}`);
  }
  return normalized;
}

function toFiniteNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function normalizeEnum(value, { label, allowed, defaultValue }) {
  const base = value === undefined ? defaultValue : requireString(value, label);
  const normalized = base.toUpperCase();
  if (!allowed.has(normalized)) {
    throw new Error(`${label} must be one of: ${[...allowed].join(', ')}`);
  }
  return normalized;
}

function normalizeStringArray(value, { label, maxLength }) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty array`);
  }
  if (value.length > maxLength) {
    throw new Error(`${label} length must be <= ${maxLength}`);
  }
  return value.map((item, index) => requireString(item, `${label}[${index}]`).toUpperCase());
}

function normalizeIntegerArray(value, { label, min = 0, max = 10000, maxLength = MAX_FILTER_PARAM_VALUES } = {}) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  if (value.length > maxLength) {
    throw new Error(`${label} length must be <= ${maxLength}`);
  }
  return value.map((item, index) => normalizeInteger(item, {
    label: `${label}[${index}]`,
    min,
    max,
    defaultValue: min,
  }));
}

async function canExecute(path, accessFn) {
  try {
    await accessFn(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolvePythonBin({ access: accessFn, cwd, env }) {
  if (typeof env.MOOMOO_PYTHON_BIN === 'string' && env.MOOMOO_PYTHON_BIN.trim() !== '') {
    return env.MOOMOO_PYTHON_BIN.trim();
  }

  const localBin = join(cwd(), 'python', '.venv', 'bin', 'python3');
  if (await canExecute(localBin, accessFn)) {
    return localBin;
  }

  return 'python3';
}

function resolveAdapterPath({ cwd }) {
  return join(cwd(), 'python', 'moomoo_adapter.py');
}

function buildExecError(label, error) {
  const details = [
    error?.stderr,
    error?.stdout,
    error?.message,
  ]
    .filter((value) => typeof value === 'string' && value.trim() !== '')
    .join('\n')
    .trim();

  if (error?.code === 'ENOENT' || /ENOENT|not found/i.test(details)) {
    return new Error('Python runtime for moomoo adapter was not found. Set `MOOMOO_PYTHON_BIN` or ensure `python3` is available.');
  }

  if (/moomoo-api is not installed/i.test(details)) {
    return new Error('moomoo-api is not installed in the Python runtime used by this MCP server.');
  }

  return new Error(`${label} failed: ${details || 'adapter returned a non-zero exit code'}`);
}

async function runAdapter(command, payload, { label, _deps } = {}) {
  const deps = resolveDeps(_deps);
  const pythonBin = await resolvePythonBin(deps);
  const adapterPath = resolveAdapterPath(deps);
  const args = [adapterPath, command, JSON.stringify(payload)];
  const timeoutMs = Number(deps.env.MOOMOO_ADAPTER_TIMEOUT_MS || 30000);

  let stdout;
  try {
    ({ stdout } = await deps.execFile(
      pythonBin,
      args,
      {
        env: deps.env,
        maxBuffer: EXEC_MAX_BUFFER,
        timeout: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 30000,
      },
    ));
  } catch (error) {
    throw buildExecError(label, error);
  }

  const normalizedStdout = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.startsWith('{') || line.startsWith('['))
    .at(-1) || '';

  let data;
  try {
    data = JSON.parse(normalizedStdout);
  } catch {
    throw new Error(`Invalid JSON response from moomoo adapter for ${label}`);
  }

  if (data?.success !== true) {
    throw new Error(String(data?.error || `${label} returned success=false`));
  }

  return data;
}

function buildConnectionPayload(_deps) {
  const deps = resolveDeps(_deps);
  const env = deps.env || {};
  return {
    host: env.MOOMOO_HOST || '127.0.0.1',
    port: env.MOOMOO_PORT ? Number(env.MOOMOO_PORT) : 11111,
  };
}

function normalizeBenchmarkProvider(value, { allowNull = false } = {}) {
  if (value === undefined) return 'yahoo_finance';
  if (value === null) {
    if (allowNull) return null;
    throw new Error(`benchmarkProvider must be one of: ${[...SUPPORTED_BENCHMARK_PROVIDERS].join(', ')}`);
  }
  const normalized = requireString(value, 'benchmarkProvider').toLowerCase();
  if (!SUPPORTED_BENCHMARK_PROVIDERS.has(normalized)) {
    throw new Error(`benchmarkProvider must be one of: ${[...SUPPORTED_BENCHMARK_PROVIDERS].join(', ')}`);
  }
  return normalized;
}

function normalizeValidationMode(value) {
  const normalized = requireString(value ?? 'benchmark', 'mode').toLowerCase();
  if (!SUPPORTED_VALIDATION_MODES.has(normalized)) {
    throw new Error(`mode must be one of: ${[...SUPPORTED_VALIDATION_MODES].join(', ')}`);
  }
  return normalized;
}

function roundNullable(value, precision = 4) {
  const normalized = toFiniteNumber(value);
  if (normalized === null) return null;
  return Number(normalized.toFixed(precision));
}

function computeAbsPointDiff(left, right, precision = 4) {
  const leftValue = toFiniteNumber(left);
  const rightValue = toFiniteNumber(right);
  if (leftValue === null || rightValue === null) return null;
  return Number(Math.abs(leftValue - rightValue).toFixed(precision));
}

function inferMarketFromSymbols(symbols) {
  const normalizedSymbols = dedupeSymbols(symbols);
  if (normalizedSymbols.length === 0) return null;
  const prefixes = [...new Set(normalizedSymbols.map((symbol) => symbol.split('.')[0]).filter(Boolean))];
  if (prefixes.length !== 1) {
    throw new Error('symbols must belong to a single market');
  }
  return normalizeEnum(prefixes[0], {
    label: 'market',
    allowed: SUPPORTED_MARKETS,
  });
}

function toTradingViewMarketScope(market) {
  const normalizedMarket = normalizeEnum(market, {
    label: 'market',
    allowed: SUPPORTED_MARKETS,
  });
  const scope = TRADINGVIEW_MARKET_SCOPES.get(normalizedMarket);
  if (!scope) {
    throw new Error(`TradingView reference probe is not supported for market ${normalizedMarket}`);
  }
  return scope;
}

function normalizeStockFilterSpec(spec, index) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
    throw new Error(`filters[${index}] must be an object`);
  }

  const typeLabel = `filters[${index}].type`;
  const normalizedType = requireString(spec.type, typeLabel).toLowerCase();
  if (!SUPPORTED_FILTER_TYPES.has(normalizedType)) {
    throw new Error(`${typeLabel} must be one of: ${[...SUPPORTED_FILTER_TYPES].join(', ')}`);
  }

  const normalized = { type: normalizedType };

  if (spec.min !== undefined) {
    normalized.min = normalizeNumber(spec.min, { label: `filters[${index}].min` });
  }
  if (spec.max !== undefined) {
    normalized.max = normalizeNumber(spec.max, { label: `filters[${index}].max` });
  }
  if (spec.sort !== undefined) {
    normalized.sort = requireString(spec.sort, `filters[${index}].sort`).toUpperCase();
  }
  if (spec.noFilter !== undefined) {
    normalized.no_filter = Boolean(spec.noFilter);
  }

  switch (normalizedType) {
    case 'simple':
      normalized.field = requireString(spec.field, `filters[${index}].field`).toUpperCase();
      break;
    case 'financial':
      normalized.field = requireString(spec.field, `filters[${index}].field`).toUpperCase();
      if (spec.quarter !== undefined) {
        normalized.quarter = requireString(spec.quarter, `filters[${index}].quarter`).toUpperCase();
      }
      break;
    case 'indicator':
      normalized.field1 = requireString(spec.field1, `filters[${index}].field1`).toUpperCase();
      normalized.field2 = requireString(spec.field2, `filters[${index}].field2`).toUpperCase();
      normalized.relative_position = requireString(
        spec.relativePosition,
        `filters[${index}].relativePosition`,
      ).toUpperCase();
      if (spec.ktype !== undefined) {
        normalized.ktype = requireString(spec.ktype, `filters[${index}].ktype`).toUpperCase();
      }
      if (spec.value !== undefined) {
        normalized.value = normalizeNumber(spec.value, { label: `filters[${index}].value` });
      }
      if (spec.field1Params !== undefined) {
        normalized.field1_params = normalizeIntegerArray(spec.field1Params, {
          label: `filters[${index}].field1Params`,
        });
      }
      if (spec.field2Params !== undefined) {
        normalized.field2_params = normalizeIntegerArray(spec.field2Params, {
          label: `filters[${index}].field2Params`,
        });
      }
      if (spec.consecutivePeriod !== undefined) {
        normalized.consecutive_period = normalizeInteger(spec.consecutivePeriod, {
          label: `filters[${index}].consecutivePeriod`,
          min: 1,
          max: 999,
          defaultValue: 1,
        });
      }
      break;
    case 'pattern':
      normalized.field = requireString(spec.field, `filters[${index}].field`).toUpperCase();
      if (spec.ktype !== undefined) {
        normalized.ktype = requireString(spec.ktype, `filters[${index}].ktype`).toUpperCase();
      }
      if (spec.consecutivePeriod !== undefined) {
        normalized.consecutive_period = normalizeInteger(spec.consecutivePeriod, {
          label: `filters[${index}].consecutivePeriod`,
          min: 1,
          max: 999,
          defaultValue: 1,
        });
      }
      break;
    default:
      throw new Error(`Unsupported filter type: ${normalizedType}`);
  }

  return normalized;
}

function buildLegacyFilterSpecs({
  minPrice,
  minMarketCap,
  peMin,
  peMax,
}) {
  const filters = [];

  if (minPrice !== undefined) {
    filters.push({
      type: 'simple',
      field: 'CUR_PRICE',
      min: normalizeNumber(minPrice, { label: 'minPrice', min: 0 }),
      sort: 'DESCEND',
    });
  }

  if (minMarketCap !== undefined) {
    filters.push({
      type: 'simple',
      field: 'MARKET_VAL',
      min: normalizeNumber(minMarketCap, { label: 'minMarketCap', min: 0 }),
    });
  }

  if (peMin !== undefined || peMax !== undefined) {
    filters.push({
      type: 'financial',
      field: 'PE_TTM',
      ...(peMin !== undefined ? { min: normalizeNumber(peMin, { label: 'peMin' }) } : {}),
      ...(peMax !== undefined ? { max: normalizeNumber(peMax, { label: 'peMax' }) } : {}),
      quarter: 'ANNUAL',
    });
  }

  return filters;
}

function buildStockFilterPayload({
  market,
  minPrice,
  minMarketCap,
  peMin,
  peMax,
  plateCode,
  limit,
  begin,
  filters,
  _deps,
} = {}) {
  const normalizedMarket = normalizeEnum(market, {
    label: 'market',
    allowed: SUPPORTED_MARKETS,
  });
  const normalizedLimit = normalizeInteger(limit, {
    label: 'limit',
    min: 1,
    max: MAX_FILTER_LIMIT,
    defaultValue: 20,
  });
  const normalizedBegin = normalizeInteger(begin, {
    label: 'begin',
    min: 0,
    max: 100000,
    defaultValue: 0,
  });
  const normalizedCustomFilters = filters === undefined
    ? []
    : (() => {
      if (!Array.isArray(filters)) {
        throw new Error('filters must be an array');
      }
      if (filters.length > MAX_FILTERS) {
        throw new Error(`filters length must be <= ${MAX_FILTERS}`);
      }
      return filters.map(normalizeStockFilterSpec);
    })();

  return {
    ...buildConnectionPayload(_deps),
    market: normalizedMarket,
    plate_code: normalizeOptionalString(plateCode),
    filters: [
      ...buildLegacyFilterSpecs({ minPrice, minMarketCap, peMin, peMax }),
      ...normalizedCustomFilters,
    ],
    limit: normalizedLimit,
    begin: normalizedBegin,
  };
}

function normalizeHistoryRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => ({
      ...row,
      close: toFiniteNumber(row.close),
      open: toFiniteNumber(row.open),
      high: toFiniteNumber(row.high),
      low: toFiniteNumber(row.low),
      time_key: row.time_key || row.date || null,
    }))
    .filter((row) => row.close !== null && row.time_key);
}

function normalizeHistoryDate(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  return value.trim().slice(0, 10);
}

function computePercentDelta(current, base, precision = 4) {
  const currentValue = toFiniteNumber(current);
  const baseValue = toFiniteNumber(base);
  if (currentValue === null || baseValue === null || baseValue === 0) {
    return null;
  }
  return Number((((currentValue - baseValue) / baseValue) * 100).toFixed(precision));
}

function computeAbsPercentDiff(current, base, precision = 6) {
  const currentValue = toFiniteNumber(current);
  const baseValue = toFiniteNumber(base);
  if (currentValue === null || baseValue === null || baseValue === 0) {
    return null;
  }
  return Number((Math.abs((currentValue - baseValue) / baseValue) * 100).toFixed(precision));
}

function averageNullable(values, precision = 2) {
  const usable = values.filter((value) => value !== null && value !== undefined);
  if (usable.length === 0) return null;
  return Number((usable.reduce((sum, value) => sum + value, 0) / usable.length).toFixed(precision));
}

function maxNullable(values, precision = 2) {
  const usable = values.filter((value) => value !== null && value !== undefined);
  if (usable.length === 0) return null;
  return Number(Math.max(...usable).toFixed(precision));
}

function dedupeSymbols(symbols) {
  return [...new Set((symbols || []).filter(Boolean).map((symbol) => symbol.toUpperCase()))];
}

function extractMoomooSymbol(row) {
  return normalizeOptionalString(row?.stock_code || row?.code || row?.symbol)?.toUpperCase() || null;
}

function normalizeMoomooSymbol(symbol, market = 'US') {
  const normalized = requireString(symbol, 'symbol').toUpperCase();
  if (normalized.includes('.')) return normalized;
  const normalizedMarket = normalizeEnum(market, {
    label: 'market',
    allowed: SUPPORTED_MARKETS,
    defaultValue: 'US',
  });
  return `${normalizedMarket}.${normalized}`;
}

function chunkArray(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function computeSimpleMovingAverage(rows, period) {
  if (!Array.isArray(rows) || rows.length < period) return null;
  const closes = rows.slice(-period).map((row) => row.close).filter((value) => value !== null);
  if (closes.length !== period) return null;
  return Number((closes.reduce((sum, value) => sum + value, 0) / closes.length).toFixed(4));
}

function closeBarsBack(rows, barsBack) {
  if (!Array.isArray(rows) || rows.length <= barsBack) return null;
  return rows[rows.length - 1 - barsBack]?.close ?? null;
}

function computeHistoryMetrics(rows) {
  const normalized = normalizeHistoryRows(rows);
  if (normalized.length === 0) {
    return {
      bars: 0,
      latestDate: null,
      latestClose: null,
      prevClose: null,
      change1dPct: null,
      perf3m: null,
      perf6m: null,
      perfY: null,
      sma50: null,
      sma200: null,
      aboveSma50: null,
      aboveSma200: null,
      pctOf52wHigh: null,
    };
  }

  const latest = normalized.at(-1);
  const latestClose = latest?.close ?? null;
  const prevClose = normalized.length > 1 ? normalized.at(-2)?.close ?? null : null;
  const oneYearRows = normalized.slice(-252);
  const high52w = maxNullable(oneYearRows.map((row) => row.high), 4);
  const sma50 = computeSimpleMovingAverage(normalized, 50);
  const sma200 = computeSimpleMovingAverage(normalized, 200);
  const pctOf52wHigh = (
    latestClose !== null && high52w !== null && high52w > 0
      ? Number(((latestClose / high52w) * 100).toFixed(2))
      : null
  );

  return {
    bars: normalized.length,
    latestDate: latest?.time_key ?? null,
    latestClose,
    prevClose,
    change1dPct: computePercentDelta(latestClose, prevClose),
    perf3m: computePercentDelta(latestClose, closeBarsBack(normalized, 63)),
    perf6m: computePercentDelta(latestClose, closeBarsBack(normalized, 126)),
    perfY: computePercentDelta(latestClose, closeBarsBack(normalized, 252)),
    sma50,
    sma200,
    aboveSma50: latestClose !== null && sma50 !== null ? latestClose > sma50 : null,
    aboveSma200: latestClose !== null && sma200 !== null ? latestClose > sma200 : null,
    pctOf52wHigh,
  };
}

function assignRanks(rows, field, direction = 'desc') {
  const indexed = rows.map((row, index) => ({ index, value: row[field] }));
  indexed.sort((left, right) => {
    if (left.value === null || left.value === undefined) return 1;
    if (right.value === null || right.value === undefined) return -1;
    return direction === 'asc'
      ? left.value - right.value
      : right.value - left.value;
  });

  const ranks = new Array(rows.length);
  indexed.forEach(({ index }, rank) => {
    ranks[index] = rank + 1;
  });
  return ranks;
}

function averageRank(values, fallback) {
  const usable = values.filter((value) => value !== null && value !== undefined);
  if (usable.length === 0) return fallback;
  return Number((usable.reduce((sum, value) => sum + value, 0) / usable.length).toFixed(2));
}

function rankSumToPositiveScore(weightedRank, rowCount) {
  if (rowCount <= 0) return 0;
  return Number(Math.max(0, ((rowCount + 1 - weightedRank) / rowCount) * 100).toFixed(2));
}

function applyProxyRanks(rows) {
  if (rows.length === 0) return [];

  const rankedRows = rows.map((row) => ({
    ...row,
    aboveSma50Value: row.aboveSma50 === null ? null : (row.aboveSma50 ? 1 : 0),
    aboveSma200Value: row.aboveSma200 === null ? null : (row.aboveSma200 ? 1 : 0),
  }));

  const rankingBlocks = [
    {
      key: 'priceMomentum',
      weight: 55,
      fields: [
        { key: 'perfY', direction: 'desc' },
        { key: 'perf6m', direction: 'desc' },
        { key: 'perf3m', direction: 'desc' },
        { key: 'pctOf52wHigh', direction: 'desc' },
      ],
    },
    {
      key: 'trendSupport',
      weight: 25,
      fields: [
        { key: 'aboveSma200Value', direction: 'desc' },
        { key: 'aboveSma50Value', direction: 'desc' },
        { key: 'change1dPct', direction: 'desc' },
      ],
    },
    {
      key: 'liquidityValue',
      weight: 20,
      fields: [
        { key: 'marketCap', direction: 'desc' },
        { key: 'volumeRatio', direction: 'desc' },
        { key: 'peTtm', direction: 'asc' },
      ],
    },
  ];

  const rankMaps = new Map();
  for (const block of rankingBlocks) {
    for (const field of block.fields) {
      rankMaps.set(`${block.key}:${field.key}`, assignRanks(rankedRows, field.key, field.direction));
    }
  }

  return rankedRows
    .map((row, index) => {
      const weightedRank = rankingBlocks.reduce((sum, block) => {
        const fallback = Number(((rankedRows.length + 1) / 2).toFixed(2));
        const blockRanks = block.fields.map((field) => {
          if (row[field.key] === null || row[field.key] === undefined) return fallback;
          return rankMaps.get(`${block.key}:${field.key}`)[index];
        });
        return sum + (averageRank(blockRanks, fallback) * (block.weight / 100));
      }, 0);

      const { aboveSma50Value, aboveSma200Value, ...publicRow } = row;
      return {
        ...publicRow,
        proxyScore: rankSumToPositiveScore(Number(weightedRank.toFixed(2)), rankedRows.length),
      };
    })
    .sort((left, right) => right.proxyScore - left.proxyScore || (right.perfY ?? -Infinity) - (left.perfY ?? -Infinity))
    .map((row, index) => ({ ...row, proxyRank: index + 1 }));
}

async function fetchJson(url, _deps) {
  const deps = resolveDeps(_deps);
  if (typeof deps.fetch !== 'function') {
    throw new Error('fetch is not available for Yahoo comparison');
  }

  const response = await deps.fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Oh-MY-TradingView/0.1)',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}`);
  }

  return response.json();
}

function toUnixSeconds(dateString, { endOfDay = false } = {}) {
  const normalized = normalizeOptionalString(dateString);
  if (!normalized) return null;
  const hasTime = normalized.includes('T');
  const base = hasTime
    ? normalized
    : `${normalized}${endOfDay ? 'T23:59:59Z' : 'T00:00:00Z'}`;
  const timestamp = Date.parse(base);
  if (Number.isNaN(timestamp)) {
    throw new Error(`Invalid date: ${dateString}`);
  }
  return Math.floor(timestamp / 1000);
}

async function fetchYahooHistory(symbol, { start, end, maxBars, _deps } = {}) {
  const normalizedSymbol = requireString(symbol, 'symbol').toUpperCase();
  const ticker = normalizedSymbol.includes('.')
    ? normalizedSymbol.split('.').slice(1).join('.')
    : normalizedSymbol;
  const params = new URLSearchParams({
    interval: '1d',
    includePrePost: 'false',
    events: 'div,splits',
  });

  const period1 = toUnixSeconds(start);
  const period2 = toUnixSeconds(end, { endOfDay: true });
  if (period1 !== null || period2 !== null) {
    const fallbackEnd = period2 ?? Math.floor(Date.now() / 1000);
    const fallbackStart = period1 ?? (fallbackEnd - (365 * 24 * 60 * 60));
    params.set('period1', String(fallbackStart));
    params.set('period2', String(fallbackEnd));
  } else {
    params.set('range', '1y');
  }

  const url = `${YAHOO_CHART_BASE}/${encodeURIComponent(ticker)}?${params.toString()}`;
  const payload = await fetchJson(url, _deps);
  const result = payload?.chart?.result?.[0];
  if (!result) {
    throw new Error(`No Yahoo chart data for symbol "${ticker}"`);
  }

  const timestamps = Array.isArray(result.timestamp) ? result.timestamp : [];
  const quote = result.indicators?.quote?.[0] || {};
  const rows = timestamps.map((timestamp, index) => ({
    date: new Date(timestamp * 1000).toISOString().slice(0, 10),
    open: toFiniteNumber(quote.open?.[index]),
    high: toFiniteNumber(quote.high?.[index]),
    low: toFiniteNumber(quote.low?.[index]),
    close: toFiniteNumber(quote.close?.[index]),
    volume: toFiniteNumber(quote.volume?.[index]),
  })).filter((row) => row.close !== null);

  return rows.slice(-(maxBars || MAX_HISTORY_BARS));
}

async function getStableMoomooKlineHistory(params) {
  try {
    return await getMoomooKlineHistory(params);
  } catch (error) {
    if (!/Invalid JSON response from moomoo adapter/.test(error.message)) {
      throw error;
    }
  }
  return getMoomooKlineHistory(params);
}

function compareHistorySeries(moomooRows, yahooRows) {
  const moomooMap = new Map(
    normalizeHistoryRows(moomooRows)
      .map((row) => [normalizeHistoryDate(row.time_key), row])
      .filter(([date]) => date),
  );
  const yahooMap = new Map(
    (Array.isArray(yahooRows) ? yahooRows : [])
      .map((row) => [normalizeHistoryDate(row.date), row])
      .filter(([date]) => date),
  );

  const overlapDates = [...moomooMap.keys()].filter((date) => yahooMap.has(date)).sort();
  const comparisons = overlapDates.map((date) => {
    const moomooRow = moomooMap.get(date);
    const yahooRow = yahooMap.get(date);
    return {
      date,
      openDiffPct: computeAbsPercentDiff(moomooRow.open, yahooRow.open),
      highDiffPct: computeAbsPercentDiff(moomooRow.high, yahooRow.high),
      lowDiffPct: computeAbsPercentDiff(moomooRow.low, yahooRow.low),
      closeDiffPct: computeAbsPercentDiff(moomooRow.close, yahooRow.close),
    };
  });

  return {
    comparedBars: overlapDates.length,
    moomooBars: moomooMap.size,
    yahooBars: yahooMap.size,
    overlapStart: overlapDates[0] || null,
    overlapEnd: overlapDates.at(-1) || null,
    missingFromMoomoo: Math.max(0, yahooMap.size - overlapDates.length),
    missingFromYahoo: Math.max(0, moomooMap.size - overlapDates.length),
    avgAbsOpenDiffPct: averageNullable(comparisons.map((row) => row.openDiffPct), 6),
    avgAbsHighDiffPct: averageNullable(comparisons.map((row) => row.highDiffPct), 6),
    avgAbsLowDiffPct: averageNullable(comparisons.map((row) => row.lowDiffPct), 6),
    avgAbsCloseDiffPct: averageNullable(comparisons.map((row) => row.closeDiffPct), 6),
    maxAbsCloseDiffPct: maxNullable(comparisons.map((row) => row.closeDiffPct), 6),
  };
}

async function getMoomooHistoryMetrics({
  symbols,
  start,
  end,
  maxBars,
  autype,
  _deps,
} = {}) {
  const entries = [];
  for (const symbol of normalizeStringArray(symbols, {
    label: 'symbols',
    maxLength: MAX_VALIDATION_SYMBOLS,
  })) {
    try {
      const moomooHistory = await getStableMoomooKlineHistory({
        symbol,
        ktype: 'K_DAY',
        autype,
        start,
        end,
        maxCount: maxBars,
        _deps,
      });
      entries.push({
        success: true,
        symbol,
        moomooMetrics: computeHistoryMetrics(moomooHistory.rows),
      });
    } catch (error) {
      entries.push({
        success: false,
        symbol,
        error: error.message,
        moomooMetrics: null,
      });
    }
  }

  return {
    success: entries.some((entry) => entry.success),
    count: entries.length,
    entries,
    retrieved_at: new Date().toISOString(),
    source: 'moomoo',
  };
}

function mapExchangeTypeToTradingViewPrefix(exchangeType) {
  const normalized = normalizeOptionalString(exchangeType)?.toUpperCase() || null;
  if (!normalized) return null;
  if (normalized.includes('NASDAQ')) return 'NASDAQ';
  if (normalized.includes('NYSE')) return 'NYSE';
  if (normalized.includes('AMEX')) return 'AMEX';
  return null;
}

function symbolLeaf(symbol) {
  const normalized = requireString(symbol, 'symbol').toUpperCase();
  const parts = normalized.split('.');
  return parts.length > 1 ? parts.slice(1).join('.') : normalized;
}

function buildTradingViewTicker(symbol, basicInfoRow) {
  const prefix = mapExchangeTypeToTradingViewPrefix(
    basicInfoRow?.exchange_type || basicInfoRow?.exchangeType,
  );
  if (!prefix) return null;
  return `${prefix}:${symbolLeaf(symbol)}`;
}

async function fetchTradingViewReferenceMetrics(symbols, { market, _deps } = {}) {
  const deps = resolveDeps(_deps);
  if (typeof deps.fetch !== 'function') {
    throw new Error('fetch is not available for TradingView reference probe');
  }

  const basicInfo = await getMoomooStockBasicInfo({ market, symbols, _deps });
  const basicInfoMap = new Map(
    (basicInfo.rows || []).map((row) => [extractMoomooSymbol(row), row]),
  );
  const tickers = normalizeStringArray(symbols, {
    label: 'symbols',
    maxLength: MAX_VALIDATION_SYMBOLS,
  })
    .map((symbol) => [symbol, buildTradingViewTicker(symbol, basicInfoMap.get(symbol))])
    .filter(([, ticker]) => ticker);

  if (tickers.length === 0) {
    return new Map();
  }

  const scope = toTradingViewMarketScope(market);
  const response = await deps.fetch(`${TRADINGVIEW_SCANNER_BASE}/${scope}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filter: [],
      options: { lang: 'en' },
      markets: [scope],
      symbols: { query: { types: ['stock'] }, tickers: tickers.map(([, ticker]) => ticker) },
      columns: [
        'name',
        'total_revenue_yoy_growth_ttm',
        'debt_to_equity',
        'price_free_cash_flow_ttm',
      ],
      sort: { sortBy: 'name', sortOrder: 'asc' },
      range: [0, tickers.length],
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from TradingView scanner`);
  }

  const payload = await response.json();
  const tickerToSymbol = new Map(tickers.map(([symbol, ticker]) => [ticker, symbol]));
  return new Map(
    (payload?.data || []).map((row) => {
      const symbol = tickerToSymbol.get(row?.s);
      return [
        symbol,
        {
          symbol,
          name: row?.d?.[0] ?? null,
          revenueGrowthPct: roundNullable(row?.d?.[1], 4),
          debtToEquity: roundNullable(row?.d?.[2], 6),
          pFcf: roundNullable(row?.d?.[3], 4),
        },
      ];
    }).filter(([symbol]) => symbol),
  );
}

function extractMoomooField(row, key) {
  return toFiniteNumber(row?.[key]);
}

function normalizeMoomooPercentRatio(value) {
  const normalized = toFiniteNumber(value);
  if (normalized === null) return null;
  return Number((normalized / 100).toFixed(6));
}

function normalizeMoomooPcfApprox(value) {
  const normalized = toFiniteNumber(value);
  if (normalized === null) return null;
  return Number((normalized / 100).toFixed(4));
}

function buildMoomooFundamentalFilters() {
  return [
    {
      type: 'simple',
      field: 'MARKET_VAL',
      min: 0,
      sort: 'DESCEND',
    },
    {
      type: 'financial',
      field: 'SUM_OF_BUSINESS_GROWTH',
      min: -100000,
      max: 100000,
      quarter: 'ANNUAL',
    },
    {
      type: 'financial',
      field: 'EPS_GROWTH_RATE',
      min: -100000,
      max: 100000,
      quarter: 'ANNUAL',
    },
    {
      type: 'financial',
      field: 'RETURN_ON_EQUITY_RATE',
      min: -100000,
      max: 100000,
      quarter: 'ANNUAL',
    },
    {
      type: 'financial',
      field: 'NET_PROFIT_RATE',
      min: -100000,
      max: 100000,
      quarter: 'ANNUAL',
    },
    {
      type: 'financial',
      field: 'DEBT_ASSET_RATE',
      min: -100000,
      max: 100000,
      quarter: 'ANNUAL',
    },
    {
      type: 'simple',
      field: 'PCF_TTM',
      min: -100000,
      max: 100000,
    },
  ];
}

function normalizeMoomooFundamentalsEntry(symbol, snapshotRow, filterRow) {
  const snapshot = snapshotRow || {};
  const filter = filterRow || {};
  const resolvedSymbol = extractMoomooSymbol(snapshot) || extractMoomooSymbol(filter) || symbol;
  const revenueGrowthPct = roundNullable(extractMoomooField(filter, 'sum_of_business_growth|annual'), 4);
  const epsGrowthPct = roundNullable(extractMoomooField(filter, 'eps_growth_rate|annual'), 4);
  const roePct = roundNullable(extractMoomooField(filter, 'return_on_equity_rate|annual'), 4);
  const profitMarginPct = roundNullable(extractMoomooField(filter, 'net_profit_rate|annual'), 4);
  const debtAssetRatePct = roundNullable(extractMoomooField(filter, 'debt_asset_rate|annual'), 4);
  const pcfTtmRaw = roundNullable(extractMoomooField(filter, 'pcf_ttm'), 4);

  return {
    success: Boolean(snapshotRow || filterRow),
    symbol: symbolLeaf(resolvedSymbol),
    moomooSymbol: resolvedSymbol,
    marketCap: roundNullable(snapshot.total_market_val, 2),
    trailingPE: roundNullable(snapshot.pe_ttm_ratio ?? snapshot.pe_ratio, 4),
    forwardPE: null,
    dividendYield: normalizeMoomooPercentRatio(snapshot.dividend_ratio_ttm),
    beta: null,
    profitMargins: normalizeMoomooPercentRatio(profitMarginPct),
    revenueGrowth: normalizeMoomooPercentRatio(revenueGrowthPct),
    earningsGrowth: normalizeMoomooPercentRatio(epsGrowthPct),
    returnOnEquity: normalizeMoomooPercentRatio(roePct),
    debtToEquity: null,
    debtAssetRate: normalizeMoomooPercentRatio(debtAssetRatePct),
    pcfTtm: normalizeMoomooPcfApprox(pcfTtmRaw),
    retrieved_at: new Date().toISOString(),
    source: 'moomoo',
  };
}

async function fetchMoomooFundamentalFilterRows(symbols, { market, maxPages, _deps } = {}) {
  const wanted = new Set(symbols);
  const found = new Map();
  const pageLimit = MAX_FILTER_LIMIT;
  const normalizedMaxPages = normalizeInteger(maxPages, {
    label: 'maxPages',
    min: 1,
    max: MAX_FUNDAMENTAL_PAGES,
    defaultValue: MAX_FUNDAMENTAL_PAGES,
  });

  for (let page = 0; page < normalizedMaxPages && found.size < wanted.size; page += 1) {
    const response = await getMoomooStockFilter({
      market,
      begin: page * pageLimit,
      limit: pageLimit,
      filters: buildMoomooFundamentalFilters(),
      _deps,
    });
    for (const row of response.rows || []) {
      const rowSymbol = extractMoomooSymbol(row);
      if (wanted.has(rowSymbol)) {
        found.set(rowSymbol, row);
      }
    }
    if (response.last_page) break;
  }

  return found;
}

function buildCandidateRow({
  symbol,
  snapshot,
  historyMetrics,
  comparison,
  stockFilterRank,
  plateSet,
}) {
  const lastPrice = toFiniteNumber(snapshot?.last_price);
  const prevClosePrice = toFiniteNumber(snapshot?.prev_close_price);
  const high52w = toFiniteNumber(snapshot?.highest52weeks_price);

  return {
    symbol,
    name: snapshot?.name ?? null,
    stockFilterRank,
    inStockFilter: stockFilterRank !== null,
    inPlate: plateSet ? plateSet.has(symbol) : null,
    lastPrice,
    prevClosePrice,
    change1dPct: historyMetrics?.change1dPct ?? computePercentDelta(lastPrice, prevClosePrice),
    marketCap: toFiniteNumber(snapshot?.total_market_val ?? snapshot?.circular_market_val),
    peTtm: toFiniteNumber(snapshot?.pe_ttm_ratio ?? snapshot?.pe_ratio),
    volumeRatio: toFiniteNumber(snapshot?.volume_ratio),
    pctOf52wHigh: historyMetrics?.pctOf52wHigh ?? (
      lastPrice !== null && high52w !== null && high52w > 0
        ? Number(((lastPrice / high52w) * 100).toFixed(2))
        : null
    ),
    perf3m: historyMetrics?.perf3m ?? null,
    perf6m: historyMetrics?.perf6m ?? null,
    perfY: historyMetrics?.perfY ?? null,
    sma50: historyMetrics?.sma50 ?? null,
    sma200: historyMetrics?.sma200 ?? null,
    aboveSma50: historyMetrics?.aboveSma50 ?? null,
    aboveSma200: historyMetrics?.aboveSma200 ?? null,
    comparedBars: comparison?.comparedBars ?? null,
    avgAbsCloseDiffPct: comparison?.avgAbsCloseDiffPct ?? null,
    maxAbsCloseDiffPct: comparison?.maxAbsCloseDiffPct ?? null,
    comparisonError: comparison?.success === false ? comparison.error : null,
  };
}

export async function getMoomooHealthCheck({ _deps } = {}) {
  return runAdapter('health_check', buildConnectionPayload(_deps), { label: 'moomoo health_check', _deps });
}

export async function getMoomooSnapshot({ symbols, _deps } = {}) {
  const normalizedSymbols = normalizeStringArray(symbols, {
    label: 'symbols',
    maxLength: MAX_SNAPSHOT_SYMBOLS,
  });
  return runAdapter(
    'snapshot',
    {
      ...buildConnectionPayload(_deps),
      symbols: normalizedSymbols,
    },
    { label: 'moomoo snapshot', _deps },
  );
}

export async function getMoomooFundamentalsBatch({
  symbols,
  market,
  maxPages,
  _deps,
} = {}) {
  const rawSymbols = normalizeStringArray(symbols, {
    label: 'symbols',
    maxLength: MAX_FUNDAMENTAL_SYMBOLS,
  });
  const normalizedMarket = market === undefined && rawSymbols.some((symbol) => symbol.includes('.'))
    ? inferMarketFromSymbols(rawSymbols)
    : normalizeEnum(market, {
      label: 'market',
      allowed: SUPPORTED_MARKETS,
      defaultValue: 'US',
    });
  const normalizedSymbols = dedupeSymbols(rawSymbols.map((symbol) => normalizeMoomooSymbol(symbol, normalizedMarket)));

  const snapshotRows = [];
  for (const chunk of chunkArray(normalizedSymbols, MAX_SNAPSHOT_SYMBOLS)) {
    try {
      const snapshot = await getMoomooSnapshot({ symbols: chunk, _deps });
      snapshotRows.push(...(snapshot.rows || []));
    } catch {
      // Some screener universes include symbols Moomoo snapshot cannot resolve.
      // Keep stock-filter fundamentals usable for the rest of the batch.
    }
  }
  const snapshotMap = new Map(snapshotRows.map((row) => [extractMoomooSymbol(row), row]));
  const filterMap = await fetchMoomooFundamentalFilterRows(normalizedSymbols, {
    market: normalizedMarket,
    maxPages,
    _deps,
  });
  const fundamentals = normalizedSymbols.map((symbol) => (
    normalizeMoomooFundamentalsEntry(symbol, snapshotMap.get(symbol), filterMap.get(symbol))
  ));
  const successCount = fundamentals.filter((entry) => entry.success).length;

  return {
    success: successCount > 0,
    market: normalizedMarket,
    count: fundamentals.length,
    successCount,
    failureCount: fundamentals.length - successCount,
    fundamentals,
    retrieved_at: new Date().toISOString(),
    source: 'moomoo',
  };
}

export async function getMoomooSymbolFundamentals(symbol, { market, maxPages, _deps } = {}) {
  const response = await getMoomooFundamentalsBatch({
    symbols: [symbol],
    market,
    maxPages,
    _deps,
  });
  const entry = response.fundamentals[0];
  if (!entry?.success) {
    throw new Error(`No moomoo fundamentals data for symbol "${symbol}"`);
  }
  return entry;
}

export async function getMoomooKlineHistory({
  symbol,
  ktype,
  autype,
  start,
  end,
  maxCount,
  extendedTime,
  _deps,
} = {}) {
  const normalizedMaxCount = normalizeInteger(maxCount, {
    label: 'maxCount',
    min: 1,
    max: MAX_KLINE_COUNT,
    defaultValue: 100,
  });

  return runAdapter(
    'kline_history',
    {
      ...buildConnectionPayload(_deps),
      symbol: requireString(symbol, 'symbol').toUpperCase(),
      ktype: normalizeOptionalString(ktype) || 'K_DAY',
      autype: normalizeOptionalString(autype) || 'qfq',
      start: normalizeOptionalString(start),
      end: normalizeOptionalString(end),
      max_count: normalizedMaxCount,
      extended_time: Boolean(extendedTime),
    },
    { label: 'moomoo kline_history', _deps },
  );
}

export async function getMoomooStockFilterFields({ _deps } = {}) {
  return runAdapter(
    'stock_filter_fields',
    buildConnectionPayload(_deps),
    { label: 'moomoo stock_filter_fields', _deps },
  );
}

export async function getMoomooStockFilter({
  market,
  minPrice,
  minMarketCap,
  peMin,
  peMax,
  plateCode,
  limit,
  begin,
  filters,
  _deps,
} = {}) {
  const payload = buildStockFilterPayload({
    market,
    minPrice,
    minMarketCap,
    peMin,
    peMax,
    plateCode,
    limit,
    begin,
    filters,
    _deps,
  });
  try {
    return await runAdapter(
      'stock_filter',
      payload,
      { label: 'moomoo stock_filter', _deps },
    );
  } catch (error) {
    if (!/Invalid JSON response from moomoo adapter/.test(error.message)) {
      throw error;
    }
    return runAdapter(
      'stock_filter',
      payload,
      { label: 'moomoo stock_filter', _deps },
    );
  }
}

export async function getMoomooStockBasicInfo({ market, symbols, _deps } = {}) {
  const normalizedSymbols = normalizeStringArray(symbols, {
    label: 'symbols',
    maxLength: MAX_SNAPSHOT_SYMBOLS,
  });
  const normalizedMarket = market === undefined
    ? inferMarketFromSymbols(normalizedSymbols)
    : normalizeEnum(market, {
      label: 'market',
      allowed: SUPPORTED_MARKETS,
    });

  return runAdapter(
    'stock_basicinfo',
    {
      ...buildConnectionPayload(_deps),
      market: normalizedMarket,
      code_list: normalizedSymbols,
    },
    { label: 'moomoo stock_basicinfo', _deps },
  );
}

export async function getMoomooPlateList({ market, plateClass, _deps } = {}) {
  const normalizedMarket = normalizeEnum(market, {
    label: 'market',
    allowed: SUPPORTED_MARKETS,
  });
  const normalizedPlateClass = normalizeEnum(plateClass, {
    label: 'plateClass',
    allowed: SUPPORTED_PLATE_CLASSES,
    defaultValue: 'ALL',
  });

  return runAdapter(
    'plate_list',
    {
      ...buildConnectionPayload(_deps),
      market: normalizedMarket,
      plate_class: normalizedPlateClass,
    },
    { label: 'moomoo plate_list', _deps },
  );
}

export async function getMoomooPlateStocks({ plateCode, sortField, ascend, _deps } = {}) {
  return runAdapter(
    'plate_stocks',
    {
      ...buildConnectionPayload(_deps),
      plate_code: requireString(plateCode, 'plateCode'),
      sort_field: normalizeOptionalString(sortField) || 'CODE',
      ascend: ascend === undefined ? true : Boolean(ascend),
    },
    { label: 'moomoo plate_stocks', _deps },
  );
}

export async function getMoomooPlateBreadth({
  plateCode,
  symbolLimit,
  nearHighThresholdPct,
  volumeRatioSupportMin,
  sortField,
  ascend,
  _deps,
} = {}) {
  const normalizedSymbolLimit = normalizeInteger(symbolLimit, {
    label: 'symbolLimit',
    min: 1,
    max: MAX_PLATE_BREADTH_SYMBOLS,
    defaultValue: 25,
  });
  const normalizedNearHighThresholdPct = normalizeNumber(nearHighThresholdPct, {
    label: 'nearHighThresholdPct',
    min: 0,
  }) ?? 90;
  const normalizedVolumeRatioSupportMin = normalizeNumber(volumeRatioSupportMin, {
    label: 'volumeRatioSupportMin',
    min: 0,
  }) ?? 1;

  const plateStocks = await getMoomooPlateStocks({
    plateCode,
    sortField,
    ascend,
    _deps,
  });
  const constituentSymbols = dedupeSymbols(
    plateStocks.rows.map(extractMoomooSymbol),
  ).slice(0, normalizedSymbolLimit);

  const snapshot = constituentSymbols.length > 0
    ? await getMoomooSnapshot({ symbols: constituentSymbols, _deps })
    : { rows: [] };

  const constituents = snapshot.rows.map((row) => {
    const symbol = extractMoomooSymbol(row);
    const lastPrice = toFiniteNumber(row.last_price);
    const prevClosePrice = toFiniteNumber(row.prev_close_price);
    const highest52weeksPrice = toFiniteNumber(row.highest52weeks_price);
    const volumeRatio = toFiniteNumber(row.volume_ratio);
    const change1dPct = computePercentDelta(lastPrice, prevClosePrice);
    const pctOf52wHigh = (
      lastPrice !== null && highest52weeksPrice !== null && highest52weeksPrice > 0
        ? Number(((lastPrice / highest52weeksPrice) * 100).toFixed(2))
        : null
    );

    return {
      symbol,
      name: row.name ?? null,
      change1dPct,
      pctOf52wHigh,
      volumeRatio,
      isAdvancing: change1dPct !== null ? change1dPct > 0 : false,
      isNearHigh: pctOf52wHigh !== null ? pctOf52wHigh >= normalizedNearHighThresholdPct : false,
      hasVolumeSupport: volumeRatio !== null ? volumeRatio >= normalizedVolumeRatioSupportMin : false,
    };
  });

  const analyzedCount = constituents.length;
  const advanceCount = constituents.filter((row) => row.isAdvancing).length;
  const nearHighCount = constituents.filter((row) => row.isNearHigh).length;
  const volumeSupportCount = constituents.filter((row) => row.hasVolumeSupport).length;

  const breadth = {
    analyzedCount,
    advanceCount,
    declineCount: analyzedCount - advanceCount,
    nearHighCount,
    volumeSupportCount,
    advanceRatioPct: analyzedCount > 0 ? Number(((advanceCount / analyzedCount) * 100).toFixed(2)) : null,
    nearHighRatioPct: analyzedCount > 0 ? Number(((nearHighCount / analyzedCount) * 100).toFixed(2)) : null,
    volumeSupportRatioPct: analyzedCount > 0 ? Number(((volumeSupportCount / analyzedCount) * 100).toFixed(2)) : null,
    averageChange1dPct: averageNullable(constituents.map((row) => row.change1dPct), 4),
    averagePctOf52wHigh: averageNullable(constituents.map((row) => row.pctOf52wHigh), 2),
  };
  breadth.breadthScore = averageNullable([
    breadth.advanceRatioPct,
    breadth.nearHighRatioPct,
    breadth.volumeSupportRatioPct,
  ], 2);

  return {
    success: true,
    plateCode: requireString(plateCode, 'plateCode'),
    requestedConstituentCount: plateStocks.count ?? constituentSymbols.length,
    analyzedConstituentCount: analyzedCount,
    nearHighThresholdPct: normalizedNearHighThresholdPct,
    volumeRatioSupportMin: normalizedVolumeRatioSupportMin,
    breadth,
    constituents: constituents
      .sort((left, right) => (right.pctOf52wHigh ?? -Infinity) - (left.pctOf52wHigh ?? -Infinity))
      .slice(0, 10),
  };
}

export async function getMoomooOhlcComparison({
  symbols,
  start,
  end,
  maxBars,
  autype,
  benchmarkProvider,
  _deps,
} = {}) {
  if (symbols === undefined) {
    throw new Error('symbols must be a non-empty array');
  }
  const normalizedSymbols = normalizeStringArray(symbols, {
    label: 'symbols',
    maxLength: MAX_VALIDATION_SYMBOLS,
  });
  const normalizedMaxBars = normalizeInteger(maxBars, {
    label: 'maxBars',
    min: 20,
    max: MAX_HISTORY_BARS,
    defaultValue: 260,
  });
  const normalizedBenchmarkProvider = normalizeBenchmarkProvider(benchmarkProvider);

  const comparisons = [];
  for (const symbol of normalizedSymbols) {
    try {
      const moomooHistory = await getStableMoomooKlineHistory({
        symbol,
        ktype: 'K_DAY',
        autype,
        start,
        end,
        maxCount: normalizedMaxBars,
        _deps,
      });
      let benchmarkHistory = [];
      if (normalizedBenchmarkProvider === 'yahoo_finance') {
        benchmarkHistory = await fetchYahooHistory(symbol, {
          start,
          end,
          maxBars: normalizedMaxBars,
          _deps,
        });
      }
      comparisons.push({
        success: true,
        symbol,
        ...compareHistorySeries(moomooHistory.rows, benchmarkHistory),
        moomooMetrics: computeHistoryMetrics(moomooHistory.rows),
      });
    } catch (error) {
      comparisons.push({
        success: false,
        symbol,
        error: error.message,
      });
    }
  }

  return {
    success: comparisons.some((entry) => entry.success),
    count: comparisons.length,
    comparisons,
    benchmarkProvider: normalizedBenchmarkProvider,
    source: `moomoo+${normalizedBenchmarkProvider}`,
    retrieved_at: new Date().toISOString(),
  };
}

export async function getMoomooFundamentalProbe({
  market,
  symbols,
  plateCode,
  limit,
  _deps,
} = {}) {
  const normalizedPlateCode = requireString(plateCode, 'plateCode');
  const normalizedSymbols = normalizeStringArray(symbols, {
    label: 'symbols',
    maxLength: MAX_VALIDATION_SYMBOLS,
  });
  const normalizedMarket = market === undefined
    ? inferMarketFromSymbols(normalizedSymbols)
    : normalizeEnum(market, {
      label: 'market',
      allowed: SUPPORTED_MARKETS,
    });
  const normalizedLimit = normalizeInteger(limit, {
    label: 'limit',
    min: 1,
    max: MAX_FILTER_LIMIT,
    defaultValue: MAX_FILTER_LIMIT,
  });
  const probeRows = await getMoomooStockFilter({
    market: normalizedMarket,
    plateCode: normalizedPlateCode,
    limit: normalizedLimit,
    filters: [
      {
        type: 'financial',
        field: 'SUM_OF_BUSINESS_GROWTH',
        min: -100000,
        max: 100000,
        quarter: 'ANNUAL',
      },
      {
        type: 'financial',
        field: 'DEBT_ASSET_RATE',
        min: -100000,
        max: 100000,
        quarter: 'ANNUAL',
      },
      {
        type: 'simple',
        field: 'PCF_TTM',
        min: -100000,
        max: 100000,
      },
    ],
    _deps,
  });
  const moomooProbeMap = new Map(
    (probeRows.rows || []).map((row) => [extractMoomooSymbol(row), row]),
  );
  const tradingViewMap = await fetchTradingViewReferenceMetrics(normalizedSymbols, {
    market: normalizedMarket,
    _deps,
  });
  const rows = normalizedSymbols.map((symbol) => {
    const moomooRow = moomooProbeMap.get(symbol) || {};
    const tradingView = tradingViewMap.get(symbol) || null;
    const sumOfBusinessGrowthPct = roundNullable(
      extractMoomooField(moomooRow, 'sum_of_business_growth|annual'),
      4,
    );
    const debtAssetRatePct = roundNullable(
      extractMoomooField(moomooRow, 'debt_asset_rate|annual'),
      4,
    );
    const pcfTtmRaw = roundNullable(extractMoomooField(moomooRow, 'pcf_ttm'), 4);
    const pcfTtmApprox = normalizeMoomooPcfApprox(pcfTtmRaw);

    return {
      symbol,
      success: Boolean(moomooProbeMap.has(symbol)),
      moomoo: {
        sumOfBusinessGrowthPct,
        debtAssetRatePct,
        pcfTtmRaw,
        pcfTtmApprox,
      },
      reference: {
        tradingView,
      },
      comparison: {
        revenueGrowth: {
          moomooPct: sumOfBusinessGrowthPct,
          tradingViewPct: tradingView?.revenueGrowthPct ?? null,
          diffVsTradingViewPctPoints: computeAbsPointDiff(sumOfBusinessGrowthPct, tradingView?.revenueGrowthPct, 4),
        },
        debtToEquityProxy: {
          moomooDebtAssetRatePct: debtAssetRatePct,
          tradingViewDebtToEquity: tradingView?.debtToEquity ?? null,
          note: 'Formula mismatch: DEBT_ASSET_RATE is debt/assets, not debt/equity.',
        },
        pFcfProxy: {
          moomooApprox: pcfTtmApprox,
          tradingViewPFcf: tradingView?.pFcf ?? null,
          diffVsTradingView: computeAbsPointDiff(pcfTtmApprox, tradingView?.pFcf, 4),
          note: 'PCF_TTM is normalized by dividing the moomoo raw value by 100 before comparison.',
        },
      },
    };
  });

  return {
    success: rows.some((row) => row.success),
    market: normalizedMarket,
    plateCode: normalizedPlateCode,
    count: rows.length,
    rows,
    retrieved_at: new Date().toISOString(),
    source: 'moomoo+tradingview_scanner',
  };
}

export async function runMoomooScreeningValidation({
  market,
  minPrice,
  minMarketCap,
  peMin,
  peMax,
  limit,
  begin,
  filters,
  plateCode,
  candidateSymbols,
  validateLimit,
  historyBars,
  historyStart,
  historyEnd,
  nearHighThresholdPct,
  mode,
  benchmarkProvider,
  _deps,
} = {}) {
  const validationMode = normalizeValidationMode(mode);
  const normalizedHistoryBars = normalizeInteger(historyBars, {
    label: 'historyBars',
    min: 20,
    max: MAX_HISTORY_BARS,
    defaultValue: 260,
  });
  const normalizedValidateLimit = normalizeInteger(validateLimit, {
    label: 'validateLimit',
    min: 1,
    max: MAX_VALIDATION_SYMBOLS,
    defaultValue: 10,
  });
  const normalizedRequestedSymbols = candidateSymbols === undefined
    ? []
    : normalizeStringArray(candidateSymbols, {
      label: 'candidateSymbols',
      maxLength: MAX_VALIDATION_SYMBOLS,
    });

  const stockFilter = await getMoomooStockFilter({
    market,
    minPrice,
    minMarketCap,
    peMin,
    peMax,
    limit,
    begin,
    filters,
    _deps,
  });
  const stockFilterRows = Array.isArray(stockFilter.rows) ? stockFilter.rows : [];
  const stockFilterSymbols = dedupeSymbols(stockFilterRows.map(extractMoomooSymbol));
  const stockFilterRank = new Map(stockFilterSymbols.map((symbol, index) => [symbol, index + 1]));

  let plateSymbols = [];
  let plateSet = null;
  let plateBreadth = null;
  if (plateCode) {
    const plateStocks = await getMoomooPlateStocks({ plateCode, _deps });
    plateSymbols = dedupeSymbols((plateStocks.rows || []).map(extractMoomooSymbol));
    plateSet = new Set(plateSymbols);
    plateBreadth = await getMoomooPlateBreadth({
      plateCode,
      symbolLimit: Math.min(plateSymbols.length || normalizedValidateLimit, MAX_PLATE_BREADTH_SYMBOLS),
      nearHighThresholdPct,
      _deps,
    });
  }

  const autoSymbols = (plateSet
    ? stockFilterSymbols.filter((symbol) => plateSet.has(symbol))
    : stockFilterSymbols)
    .slice(0, normalizedValidateLimit);
  const validationSymbols = dedupeSymbols([
    ...normalizedRequestedSymbols,
    ...autoSymbols,
  ]).slice(0, normalizedValidateLimit);

  const snapshot = validationSymbols.length > 0
    ? await getMoomooSnapshot({ symbols: validationSymbols, _deps })
    : { rows: [] };
  const snapshotMap = new Map(
    (snapshot.rows || []).map((row) => [extractMoomooSymbol(row), row]),
  );

  const ohlcComparison = validationMode === 'benchmark' && validationSymbols.length > 0
    ? await getMoomooOhlcComparison({
      symbols: validationSymbols,
      start: historyStart,
      end: historyEnd,
      maxBars: normalizedHistoryBars,
      benchmarkProvider: normalizeBenchmarkProvider(benchmarkProvider),
      _deps,
    })
    : { comparisons: [], benchmarkProvider: null };
  const historyMetrics = validationMode === 'moomoo-only' && validationSymbols.length > 0
    ? await getMoomooHistoryMetrics({
      symbols: validationSymbols,
      start: historyStart,
      end: historyEnd,
      maxBars: normalizedHistoryBars,
      _deps,
    })
    : { entries: [] };
  const comparisonMap = new Map(
    (ohlcComparison.comparisons || []).map((entry) => [entry.symbol, entry]),
  );
  const historyMetricsMap = new Map(
    (historyMetrics.entries || []).map((entry) => [entry.symbol, entry]),
  );

  const rankedCandidates = applyProxyRanks(
    validationSymbols.map((symbol) => buildCandidateRow({
      symbol,
      snapshot: snapshotMap.get(symbol) || null,
      historyMetrics: validationMode === 'moomoo-only'
        ? historyMetricsMap.get(symbol)?.moomooMetrics || null
        : comparisonMap.get(symbol)?.moomooMetrics || null,
      comparison: comparisonMap.get(symbol) || null,
      stockFilterRank: stockFilterRank.get(symbol) ?? null,
      plateSet,
    })),
  );

  const requestedCandidates = normalizedRequestedSymbols.map((symbol) => ({
    symbol,
    inStockFilter: stockFilterRank.has(symbol),
    inPlate: plateSet ? plateSet.has(symbol) : null,
    proxyRank: rankedCandidates.find((entry) => entry.symbol === symbol)?.proxyRank ?? null,
    proxyScore: rankedCandidates.find((entry) => entry.symbol === symbol)?.proxyScore ?? null,
    avgAbsCloseDiffPct: comparisonMap.get(symbol)?.avgAbsCloseDiffPct ?? null,
    comparisonError: comparisonMap.get(symbol)?.success === false ? comparisonMap.get(symbol).error : null,
  }));

  return {
    success: true,
    validationMode,
    market: normalizeEnum(market, {
      label: 'market',
      allowed: SUPPORTED_MARKETS,
    }),
    stockFilter: {
      allCount: stockFilter.all_count ?? null,
      returnedCount: stockFilter.count ?? stockFilterSymbols.length,
      lastPage: stockFilter.last_page ?? null,
      symbols: stockFilterSymbols,
    },
    plate: plateCode ? {
      plateCode,
      constituentCount: plateSymbols.length,
      intersectedCount: autoSymbols.length,
      breadth: plateBreadth?.breadth ?? null,
    } : null,
    requestedCandidates,
    validatedCandidateCount: rankedCandidates.length,
    rankedCandidates,
    ohlcComparison: validationMode === 'moomoo-only'
      ? {
        comparisons: [],
        benchmarkProvider: null,
        source: 'moomoo',
        retrieved_at: new Date().toISOString(),
      }
      : ohlcComparison,
    retrieved_at: new Date().toISOString(),
    source: validationMode === 'moomoo-only'
      ? 'moomoo_phase2_validation'
      : 'moomoo_phase2_validation+benchmark',
  };
}
