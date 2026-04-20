import { getClient, getTargetInfo, evaluate } from '../connection.js';
import {
  healthCheckWithReadiness as _healthCheckWithReadiness,
} from './tradingview-readiness.js';

/**
 * JS expression to collect page/chart state from TradingView.
 * Shared between healthCheck and observability snapshot.
 */
export const PAGE_STATE_JS = `(function() {
  var result = { url: window.location.href, title: document.title };
  try {
    var chart = window.TradingViewApi._activeChartWidgetWV.value();
    result.symbol = chart.symbol();
    result.resolution = chart.resolution();
    result.chartType = chart.chartType();
    result.apiAvailable = true;
  } catch(e) {
    result.symbol = 'unknown';
    result.resolution = 'unknown';
    result.chartType = null;
    result.apiAvailable = false;
    result.apiError = e.message;
  }
  return result;
})()`;

/**
 * Collect page/chart state via CDP evaluation.
 * Accepts _deps for dependency injection (testability).
 */
export async function collectPageState(_deps = {}) {
  const evalFn = _deps.evaluate || evaluate;
  return evalFn(PAGE_STATE_JS);
}

export async function healthCheck() {
  await getClient();
  const target = await getTargetInfo();

  const state = await collectPageState();

  if (!state?.apiAvailable) {
    throw new Error(
      `Connected to TradingView target, but chart API is unavailable: ${state?.apiError || 'unknown error'}`
    );
  }

  return {
    success: true,
    cdp_connected: true,
    target_id: target.id,
    target_url: target.url,
    target_title: target.title,
    chart_symbol: state?.symbol || 'unknown',
    chart_resolution: state?.resolution || 'unknown',
    chart_type: state?.chartType ?? null,
    api_available: state?.apiAvailable ?? false,
  };
}

export async function discover() {
  const paths = await evaluate(`
    (function() {
      var results = {};
      try {
        var chart = window.TradingViewApi._activeChartWidgetWV.value();
        var methods = [];
        for (var k in chart) { if (typeof chart[k] === 'function') methods.push(k); }
        results.chartApi = {
          available: true,
          path: 'window.TradingViewApi._activeChartWidgetWV.value()',
          methodCount: methods.length,
          methods: methods.slice(0, 50)
        };
      } catch(e) {
        results.chartApi = { available: false, error: e.message };
      }
      try {
        var col = window.TradingViewApi._chartWidgetCollection;
        var colMethods = [];
        for (var k in col) { if (typeof col[k] === 'function') colMethods.push(k); }
        results.chartWidgetCollection = {
          available: !!col,
          path: 'window.TradingViewApi._chartWidgetCollection',
          methodCount: colMethods.length,
          methods: colMethods.slice(0, 30)
        };
      } catch(e) {
        results.chartWidgetCollection = { available: false, error: e.message };
      }
      try {
        var bwb = window.TradingView && window.TradingView.bottomWidgetBar;
        var bwbMethods = [];
        if (bwb) { for (var k in bwb) { if (typeof bwb[k] === 'function') bwbMethods.push(k); } }
        results.bottomWidgetBar = {
          available: !!bwb,
          path: 'window.TradingView.bottomWidgetBar',
          methodCount: bwbMethods.length,
          methods: bwbMethods.slice(0, 20)
        };
      } catch(e) {
        results.bottomWidgetBar = { available: false, error: e.message };
      }
      return results;
    })()
  `);

  const available = Object.values(paths).filter(v => v.available).length;
  const total = Object.keys(paths).length;

  return { success: true, apis_available: available, apis_total: total, apis: paths };
}

/**
 * Health check with readiness retry and dialog dismiss.
 * Wraps healthCheckWithReadiness from tradingview-readiness with
 * production CDP deps pre-bound.
 */
export async function healthCheckWithReadiness(opts = {}) {
  const deps = {
    collectPageState,
    getClient,
    getTargetInfo,
    evaluate,
  };
  return _healthCheckWithReadiness(deps, opts);
}

/**
 * Multi-layer health probe for crash recovery classification.
 * Returns independent process / port / MCP observations.
 *
 * @param {{
 *   checkProcess?: () => Promise<boolean>,
 *   checkMcp?: () => Promise<boolean>,
 *   host?: string,
 *   port?: number
 * }} _deps
 * @returns {Promise<{ processAlive: boolean, portOpen: boolean, mcpHealthy: boolean }>}
 */
export async function multiLayerHealthCheck(_deps = {}) {
  const host = _deps.host || process.env.TV_CDP_HOST || 'localhost';
  const port = Number(_deps.port || process.env.TV_CDP_PORT || 9222);

  let processAlive = false;
  if (typeof _deps.checkProcess === 'function') {
    try {
      processAlive = await _deps.checkProcess();
    } catch {
      processAlive = false;
    }
  } else {
    processAlive = true;
  }

  let portOpen = false;
  try {
    const url = `http://${host}:${port}/json/version`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    portOpen = res.ok;
  } catch {
    portOpen = false;
  }

  let mcpHealthy = false;
  if (portOpen) {
    const checkMcpFn = typeof _deps.checkMcp === 'function'
      ? _deps.checkMcp
      : async () => {
          const result = await healthCheckWithReadiness({ maxRetries: 0, retryDelayMs: 0 });
          return result?.success === true && result?.api_available === true;
        };
    try {
      mcpHealthy = await checkMcpFn();
    } catch {
      mcpHealthy = false;
    }
  }

  return { processAlive, portOpen, mcpHealthy };
}
