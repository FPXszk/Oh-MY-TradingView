import CDP from 'chrome-remote-interface';

let client = null;
let targetInfo = null;
const CDP_HOST = process.env.TV_CDP_HOST || 'localhost';
const CDP_PORT = Number(process.env.TV_CDP_PORT) || 9222;
const MAX_RETRIES = 5;
const BASE_DELAY = 500;

/**
 * Sanitize a string for safe interpolation into JS evaluated via CDP.
 * Produces a JSON-escaped string literal (with surrounding quotes).
 */
export function safeString(str) {
  return JSON.stringify(String(str));
}

/**
 * Validate that a value is a finite number.
 * Prevents NaN/Infinity from reaching TradingView APIs.
 */
export function requireFinite(value, name) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`${name} must be a finite number, got: ${value}`);
  }
  return n;
}

/**
 * Pick the best TradingView target from a list of CDP targets.
 * Exported for unit testing.
 */
export function pickTarget(targets) {
  if (!Array.isArray(targets) || targets.length === 0) return null;
  return (
    targets.find(t => t.type === 'page' && /tradingview\.com\/chart/i.test(t.url)) ||
    targets.find(t => t.type === 'page' && /tradingview/i.test(t.url)) ||
    null
  );
}

export async function getClient() {
  if (client) {
    try {
      await client.Runtime.evaluate({ expression: '1', returnByValue: true });
      return client;
    } catch {
      client = null;
      targetInfo = null;
    }
  }
  return connect();
}

export async function connect() {
  let lastError;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const target = await findChartTarget();
      if (!target) {
        throw new Error(
          'No TradingView chart target found. Is TradingView Desktop running with a chart open?'
        );
      }
      targetInfo = target;
      client = await CDP({ host: CDP_HOST, port: CDP_PORT, target: target.id });

      await client.Runtime.enable();
      await client.Page.enable();
      await client.DOM.enable();

      return client;
    } catch (err) {
      lastError = err;
      const delay = Math.min(BASE_DELAY * Math.pow(2, attempt), 30000);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error(
    `CDP connection failed after ${MAX_RETRIES} attempts: ${lastError?.message}`
  );
}

async function findChartTarget() {
  const resp = await fetch(`http://${CDP_HOST}:${CDP_PORT}/json/list`);
  const targets = await resp.json();
  return pickTarget(targets);
}

export async function getTargetInfo() {
  if (!targetInfo) await getClient();
  return targetInfo;
}

export async function evaluate(expression, opts = {}) {
  const c = await getClient();
  const result = await c.Runtime.evaluate({
    expression,
    returnByValue: true,
    awaitPromise: opts.awaitPromise ?? false,
    ...opts,
  });
  if (result.exceptionDetails) {
    const msg =
      result.exceptionDetails.exception?.description ||
      result.exceptionDetails.text ||
      'Unknown evaluation error';
    throw new Error(`JS evaluation error: ${msg}`);
  }
  return result.result?.value;
}

export async function evaluateAsync(expression) {
  return evaluate(expression, { awaitPromise: true });
}

export async function disconnect() {
  if (client) {
    try {
      await client.close();
    } catch { /* ignore */ }
    client = null;
    targetInfo = null;
  }
}
