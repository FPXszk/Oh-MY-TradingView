import CDP from 'chrome-remote-interface';

export const DEFAULT_CDP_HOST = 'localhost';
export const DEFAULT_CDP_PORT = 9222;

let client = null;
let targetInfo = null;
let _sessionPort = null;
let connectedEndpoint = null;
const MAX_RETRIES = 5;
const BASE_DELAY = 500;

/**
 * Store the CDP port used by a successful launch for later resolution.
 */
export function setSessionPort(port) {
  const n = Number(port);
  _sessionPort = Number.isFinite(n) && n > 0 ? n : null;
}

export function getSessionPort() {
  return _sessionPort;
}

export function clearSessionPort() {
  _sessionPort = null;
}

export function sameEndpoint(left, right) {
  return Boolean(
    left && right &&
    left.host === right.host &&
    left.port === right.port
  );
}

/**
 * Resolve CDP endpoint from environment variables.
 * Pure function — accepts an env object for testability.
 * Priority: explicit env var > session port (from launch) > default 9222.
 */
export function resolveCdpEndpoint(env = process.env) {
  const host = env.TV_CDP_HOST || DEFAULT_CDP_HOST;
  const parsed = Number(env.TV_CDP_PORT);
  const envPort = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  const port = envPort ?? _sessionPort ?? DEFAULT_CDP_PORT;
  return { host, port, url: `http://${host}:${port}` };
}

/**
 * Build a human-readable connection hint for error messages.
 */
export function buildConnectionHint(host, port) {
  const lines = [
    `Tried: http://${host}:${port}/json/list`,
    'Set TV_CDP_HOST / TV_CDP_PORT to override the endpoint.',
  ];
  if (host !== 'localhost' && host !== '127.0.0.1') {
    lines.push(
      `Current TV_CDP_HOST=${host} — if you are in WSL, ` +
      'the usual setup is Windows-local 9222 exposed on port 9223.',
    );
  } else {
    lines.push(
      'On Windows, the default endpoint is localhost:9222. ' +
      'In WSL, localhost may not reach Windows; use your Windows host IP with port 9223.'
    );
  }
  return lines.join('\n');
}

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
  const resolvedEndpoint = resolveCdpEndpoint();
  if (client) {
    if (!sameEndpoint(connectedEndpoint, resolvedEndpoint)) {
      try {
        await client.close();
      } catch {
        // ignore close errors while rotating cached endpoint
      }
      client = null;
      targetInfo = null;
      connectedEndpoint = null;
    }
  }

  if (client) {
    try {
      await client.Runtime.evaluate({ expression: '1', returnByValue: true });
      return client;
    } catch {
      client = null;
      targetInfo = null;
      connectedEndpoint = null;
    }
  }
  return connect(resolvedEndpoint);
}

export async function connect(endpoint = resolveCdpEndpoint()) {
  const { host, port } = endpoint;
  let lastError;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const target = await findChartTarget(host, port);
      if (!target) {
        throw new Error(
          'No TradingView chart target found. Is TradingView Desktop running with a chart open?'
        );
      }
      targetInfo = target;
      client = await CDP({ host, port, target: target.id });
      connectedEndpoint = { host, port };

      await client.Runtime.enable();
      await client.Page.enable();
      await client.DOM.enable();

      return client;
    } catch (err) {
      lastError = err;
      connectedEndpoint = null;
      const delay = Math.min(BASE_DELAY * Math.pow(2, attempt), 30000);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  if (_sessionPort !== null && port === _sessionPort) {
    clearSessionPort();
  }
  const hint = buildConnectionHint(host, port);
  throw new Error(
    `CDP connection failed after ${MAX_RETRIES} attempts: ${lastError?.message}\n${hint}`
  );
}

async function findChartTarget(host, port) {
  const resp = await fetch(`http://${host}:${port}/json/list`, {
    signal: AbortSignal.timeout(3000),
  });
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
    connectedEndpoint = null;
  }
}
