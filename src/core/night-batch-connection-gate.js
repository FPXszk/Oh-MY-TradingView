import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = process.cwd();
const DEFAULT_TIMEOUT_MS = 180_000;
const DEFAULT_INTERVAL_MS = 5_000;
const DEFAULT_HTTP_TIMEOUT_MS = 3_000;
const DEFAULT_STATUS_TIMEOUT_MS = 15_000;

export function hasTradingViewChartTarget(payload) {
  if (!Array.isArray(payload)) {
    return false;
  }
  return payload.some((target) => {
    if (!target || typeof target !== 'object') {
      return false;
    }
    if (target.type !== 'page') {
      return false;
    }
    const url = String(target.url || '').toLowerCase();
    return url.includes('tradingview') && url.includes('/chart');
  });
}

function summarizeText(label, text) {
  const collapsed = String(text || '').trim().replace(/\s+/g, ' ');
  if (!collapsed) {
    return null;
  }
  return `${label}=${collapsed.slice(0, 240)}`;
}

export function parseStatusPayload({ exitCode, stdout, stderr }) {
  let payload = null;
  for (const source of [stdout, stderr]) {
    if (!source) {
      continue;
    }
    try {
      payload = JSON.parse(source);
      break;
    } catch {
      // Keep searching for the first JSON payload.
    }
  }

  const success = payload?.success === true && payload?.api_available === true;
  const detailParts = [];
  if (payload) {
    detailParts.push(`api_available=${payload.api_available}`);
    const apiError = payload.apiError || payload.error;
    if (apiError) {
      detailParts.push(`error=${apiError}`);
    }
  } else {
    detailParts.push(`cli_exit=${exitCode}`);
    const stderrSummary = summarizeText('stderr', stderr);
    const stdoutSummary = summarizeText('stdout', stdout);
    if (stderrSummary) {
      detailParts.push(stderrSummary);
    } else if (stdoutSummary) {
      detailParts.push(stdoutSummary);
    }
  }

  return {
    success,
    apiAvailable: payload?.api_available === true,
    payload,
    summary: detailParts.join(' '),
  };
}

async function fetchJson(url, { fetchImpl = fetch, timeoutMs = DEFAULT_HTTP_TIMEOUT_MS } = {}) {
  const response = await fetchImpl(url, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

async function probeJsonList({ host, port, fetchImpl, timeoutMs }) {
  const url = `http://${host}:${port}/json/list`;
  try {
    const payload = await fetchJson(url, { fetchImpl, timeoutMs });
    const chartReachable = hasTradingViewChartTarget(payload);
    return {
      reachable: true,
      chartReachable,
      url,
      error: chartReachable ? null : 'no TradingView chart target found',
    };
  } catch (error) {
    return {
      reachable: false,
      chartReachable: false,
      url,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runStatus({
  nodeBin = 'node',
  cliPath = join(PROJECT_ROOT, 'src', 'cli', 'index.js'),
  host,
  port,
  timeoutMs = DEFAULT_STATUS_TIMEOUT_MS,
}) {
  try {
    const result = await execFileAsync(nodeBin, [cliPath, 'status'], {
      cwd: PROJECT_ROOT,
      env: {
        ...process.env,
        TV_CDP_HOST: String(host),
        TV_CDP_PORT: String(port),
      },
      timeout: timeoutMs,
    });
    return {
      exitCode: 0,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
    };
  } catch (error) {
    return {
      exitCode: Number.isInteger(error?.code) ? error.code : 1,
      stdout: error?.stdout || '',
      stderr: error?.stderr || error?.message || '',
    };
  }
}

export async function probeConnection({
  startupHost,
  startupPort,
  host,
  port,
  fetchImpl,
  nodeBin,
  cliPath,
  runStatusImpl = runStatus,
  httpTimeoutMs = DEFAULT_HTTP_TIMEOUT_MS,
  statusTimeoutMs = DEFAULT_STATUS_TIMEOUT_MS,
}) {
  const startup = await probeJsonList({
    host: startupHost,
    port: startupPort,
    fetchImpl,
    timeoutMs: httpTimeoutMs,
  });
  const bridge = await probeJsonList({
    host,
    port,
    fetchImpl,
    timeoutMs: httpTimeoutMs,
  });
  const status = parseStatusPayload(
    await runStatusImpl({ nodeBin, cliPath, host, port, timeoutMs: statusTimeoutMs }),
  );

  const summaryParts = [];
  const warningParts = [];
  if (!startup.reachable) {
    warningParts.push(`startup_check unreachable (${startup.error})`);
  } else if (!startup.chartReachable) {
    warningParts.push('startup_check reachable but no chart target');
  }
  if (!bridge.reachable) {
    summaryParts.push(`bridge unreachable (${bridge.error})`);
  } else if (!bridge.chartReachable) {
    summaryParts.push('bridge reachable but no chart target');
  }
  if (!status.success) {
    summaryParts.push(`tv status failed (${status.summary || 'unknown'})`);
  }

  return {
    success: bridge.reachable && bridge.chartReachable && status.success,
    startupReachable: startup.reachable && startup.chartReachable,
    bridgeReachable: bridge.reachable && bridge.chartReachable,
    statusReady: status.success,
    summary: [...summaryParts, ...warningParts].join('; ') || 'ready',
    warnings: warningParts,
    startup,
    bridge,
    status,
  };
}

export async function waitForConnection({
  timeoutMs = DEFAULT_TIMEOUT_MS,
  intervalMs = DEFAULT_INTERVAL_MS,
  probe,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = () => Date.now(),
  log = () => {},
}) {
  const startedAt = now();
  const deadline = startedAt + timeoutMs;
  let attempts = 0;
  let lastResult = null;

  while (true) {
    attempts += 1;
    lastResult = await probe();
    if (lastResult.success) {
      return {
        ...lastResult,
        attempts,
        elapsedMs: now() - startedAt,
      };
    }

    const currentTime = now();
    log(`attempt ${attempts}: ${lastResult.summary}`);
    if (currentTime >= deadline) {
      return {
        ...lastResult,
        success: false,
        attempts,
        elapsedMs: currentTime - startedAt,
      };
    }
    await sleep(intervalMs);
  }
}

export async function loadNightBatchConnectionConfig(configPath) {
  const raw = await readFile(configPath, 'utf8');
  const config = JSON.parse(raw);
  const runtime = config?.runtime || {};
  return {
    startupHost: String(runtime.startup_check_host || '127.0.0.1'),
    startupPort: Number(runtime.startup_check_port || 9222),
    host: String(runtime.host || '172.31.144.1'),
    port: Number(runtime.port || 9223),
  };
}

export const connectionGateDefaults = {
  timeoutMs: DEFAULT_TIMEOUT_MS,
  intervalMs: DEFAULT_INTERVAL_MS,
  httpTimeoutMs: DEFAULT_HTTP_TIMEOUT_MS,
  statusTimeoutMs: DEFAULT_STATUS_TIMEOUT_MS,
};
