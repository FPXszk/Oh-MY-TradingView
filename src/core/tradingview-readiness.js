/**
 * Shared TradingView readiness helpers.
 *
 * Extracted from backtest.js so that health/status can also dismiss
 * transient dialogs and classify readiness failures without duplicating
 * the logic.
 */

/**
 * JS expression that clicks common close/cancel buttons and is safe
 * to run as a side-effect of a readiness check.
 * Targets: メニューを閉じる, キャンセル, close, 閉じる.
 */
export const DISMISS_DIALOG_JS = `(function() {
  var dismissed = 0;
  Array.from(document.querySelectorAll('button')).forEach(function(btn) {
    var text = ((btn.textContent || '') + ' ' + (btn.title || '') + ' ' + (btn.getAttribute('aria-label') || ''))
      .trim();
    if (/メニューを閉じる|キャンセル|close|閉じる/i.test(text)) {
      btn.click();
      dismissed++;
    }
  });
  return dismissed;
})()`;

/**
 * Classify a readiness failure into a human-actionable category.
 *
 * Categories:
 *  - bridge-unreachable  : CDP port is not reachable (connection refused / timeout)
 *  - chart-target-missing: /json/list has no TradingView chart page target
 *  - api-unavailable     : chart target exists but TradingView JS API is not ready
 *  - unknown             : catch-all
 */
export function classifyReadinessFailure(error) {
  const msg = String(error?.message || error || '');
  if (/ECONNREFUSED|ETIMEDOUT|ECONNRESET|EHOSTUNREACH|socket hang up/i.test(msg)) {
    return { category: 'bridge-unreachable', message: msg };
  }
  if (/no.*chart.*target|chart target missing/i.test(msg)) {
    return { category: 'chart-target-missing', message: msg };
  }
  if (/api.*unavailable|apiAvailable.*false|chart API/i.test(msg)) {
    return { category: 'api-unavailable', message: msg };
  }
  return { category: 'unknown', message: msg };
}

/**
 * Dismiss transient dialogs via CDP, then send Escape.
 * Accepts injected deps for testability.
 */
async function dismissDialogs(deps) {
  const evalFn = deps.evaluate;
  const client = await deps.getClient();
  await evalFn(DISMISS_DIALOG_JS);
  await client.Input.dispatchKeyEvent({
    type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27,
  });
  await client.Input.dispatchKeyEvent({
    type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27,
  });
}

/**
 * Perform a health check with readiness retry.
 *
 * On first failure where the chart API is unavailable, attempts to
 * dismiss transient dialogs and retry up to `maxRetries` times.
 * Connection-level failures (bridge-unreachable) fail immediately.
 *
 * @param {object} deps  - { collectPageState, getClient, getTargetInfo, evaluate }
 * @param {object} [opts]
 * @param {number} [opts.maxRetries=2]
 * @param {number} [opts.retryDelayMs=1000]
 * @returns {Promise<object>} status object with success, api_available, failure_category, etc.
 */
export async function healthCheckWithReadiness(deps, opts = {}) {
  const { maxRetries = 2, retryDelayMs = 1000 } = opts;
  let lastError = null;
  let retries = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const target = await deps.getTargetInfo();
      const state = await deps.collectPageState();

      if (state?.apiAvailable) {
        return {
          success: true,
          cdp_connected: true,
          target_id: target.id,
          target_url: target.url,
          target_title: target.title,
          chart_symbol: state.symbol || 'unknown',
          chart_resolution: state.resolution || 'unknown',
          chart_type: state.chartType ?? null,
          api_available: true,
          readiness_retries: retries,
        };
      }

      lastError = new Error(
        `chart API is unavailable: ${state?.apiError || 'unknown error'}`,
      );

      if (attempt < maxRetries) {
        retries++;
        try {
          await dismissDialogs(deps);
        } catch {
          // dismiss is best-effort
        }
        await new Promise((r) => setTimeout(r, retryDelayMs));
      }
    } catch (err) {
      const classified = classifyReadinessFailure(err);
      if (classified.category === 'bridge-unreachable') {
        return {
          success: false,
          api_available: false,
          failure_category: 'bridge-unreachable',
          error: classified.message,
          readiness_retries: retries,
        };
      }

      lastError = err;
      if (attempt < maxRetries) {
        retries++;
        await new Promise((r) => setTimeout(r, retryDelayMs));
      }
    }
  }

  const classified = classifyReadinessFailure(lastError);
  return {
    success: false,
    api_available: false,
    failure_category: classified.category,
    error: classified.message,
    readiness_retries: retries,
  };
}
