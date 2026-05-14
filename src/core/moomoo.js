import { access, constants } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const EXEC_MAX_BUFFER = 10 * 1024 * 1024;
const MAX_KLINE_COUNT = 1000;
const MAX_FILTER_LIMIT = 200;
const MAX_SNAPSHOT_SYMBOLS = 50;
const SUPPORTED_MARKETS = new Set(['US', 'HK', 'SH', 'SZ', 'JP', 'SG', 'AU', 'CA', 'FX', 'CC']);
const SUPPORTED_PLATE_CLASSES = new Set(['ALL', 'INDUSTRY', 'REGION', 'CONCEPT', 'OTHER']);

function resolveDeps(_deps = {}) {
  return {
    access: _deps.access || access,
    cwd: _deps.cwd || (() => process.cwd()),
    env: _deps.env || process.env,
    execFile: _deps.execFile || execFileAsync,
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

function normalizeEnum(value, { label, allowed, defaultValue }) {
  const base = value === undefined ? defaultValue : requireString(value, label);
  const normalized = base.toUpperCase();
  if (!allowed.has(normalized)) {
    throw new Error(`${label} must be one of: ${[...allowed].join(', ')}`);
  }
  return normalized;
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

  let stdout;
  try {
    ({ stdout } = await deps.execFile(
      pythonBin,
      args,
      {
        env: deps.env,
        maxBuffer: EXEC_MAX_BUFFER,
      },
    ));
  } catch (error) {
    throw buildExecError(label, error);
  }

  let data;
  try {
    data = JSON.parse(stdout);
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

export async function getMoomooHealthCheck({ _deps } = {}) {
  return runAdapter('health_check', buildConnectionPayload(_deps), { label: 'moomoo health_check', _deps });
}

export async function getMoomooSnapshot({ symbols, _deps } = {}) {
  if (!Array.isArray(symbols) || symbols.length === 0) {
    throw new Error('symbols must be a non-empty list');
  }
  if (symbols.length > MAX_SNAPSHOT_SYMBOLS) {
    throw new Error(`symbols length must be <= ${MAX_SNAPSHOT_SYMBOLS}`);
  }

  const normalizedSymbols = symbols.map((symbol) => requireString(symbol, 'symbol'));
  return runAdapter(
    'snapshot',
    {
      ...buildConnectionPayload(_deps),
      symbols: normalizedSymbols,
    },
    { label: 'moomoo snapshot', _deps },
  );
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
      symbol: requireString(symbol, 'symbol'),
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

export async function getMoomooStockFilter({
  market,
  minPrice,
  minMarketCap,
  peMin,
  peMax,
  limit,
  begin,
  _deps,
} = {}) {
  const normalizedMarket = normalizeEnum(market, {
    label: 'market',
    allowed: SUPPORTED_MARKETS,
  });

  return runAdapter(
    'stock_filter',
    {
      ...buildConnectionPayload(_deps),
      market: normalizedMarket,
      min_price: normalizeNumber(minPrice, { label: 'minPrice', min: 0 }),
      min_market_cap: normalizeNumber(minMarketCap, { label: 'minMarketCap', min: 0 }),
      pe_min: normalizeNumber(peMin, { label: 'peMin' }),
      pe_max: normalizeNumber(peMax, { label: 'peMax' }),
      limit: normalizeInteger(limit, {
        label: 'limit',
        min: 1,
        max: MAX_FILTER_LIMIT,
        defaultValue: 20,
      }),
      begin: normalizeInteger(begin, {
        label: 'begin',
        min: 0,
        max: 100000,
        defaultValue: 0,
      }),
    },
    { label: 'moomoo stock_filter', _deps },
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
