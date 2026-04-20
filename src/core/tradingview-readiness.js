/**
 * Shared TradingView readiness and popup resilience helpers.
 */

const POPUP_ROOT_SELECTOR = [
  '[role="dialog"]',
  '[aria-modal="true"]',
  '[class*="dialog"]',
  '[class*="Dialog"]',
  '[class*="modal"]',
  '[class*="Modal"]',
  '[class*="overlay"]',
  '[class*="Overlay"]',
].join(', ');

const CLOSE_TEXT_PATTERN =
  'メニューを閉じる|キャンセル|close|閉じる|dismiss|skip|not now|later|今はしない|後で|thanks|got it';
const PROMO_TEXT_PATTERN =
  'upgrade|trial|offer|promo|advert|welcome|onboarding|subscribe|premium|discount|sale|unlock|広告|オファー|アップグレード|ウェルカム|トライアル|オンボーディング|サブスク|購読';

const POPUP_GUARD_SHARED_JS = `
  var ROOT_SELECTOR = ${JSON.stringify(POPUP_ROOT_SELECTOR)};
  var CLOSE_PATTERN = new RegExp(${JSON.stringify(CLOSE_TEXT_PATTERN)}, 'i');
  var PROMO_PATTERN = new RegExp(${JSON.stringify(PROMO_TEXT_PATTERN)}, 'i');

  function popupVisible(el) {
    if (!el || typeof el.getBoundingClientRect !== 'function') return false;
    var rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    var style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  }

  function popupText(el) {
    var text = [
      el && typeof el.innerText === 'string' ? el.innerText : '',
      el && typeof el.textContent === 'string' ? el.textContent : '',
      el && typeof el.getAttribute === 'function' ? (el.getAttribute('aria-label') || '') : '',
      el && typeof el.getAttribute === 'function' ? (el.getAttribute('title') || '') : '',
    ].join(' ');
    return text.trim().replace(/\\s+/g, ' ');
  }

  function popupMeta(el) {
    if (!el || typeof el.getAttribute !== 'function') return '';
    return [
      el.id || '',
      el.className || '',
      el.getAttribute('role') || '',
      el.getAttribute('data-name') || '',
      el.getAttribute('aria-label') || '',
      el.getAttribute('title') || '',
    ].join(' ');
  }

  function closeControls(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return [];
    return Array.from(root.querySelectorAll(
      'button, [role="button"], [aria-label], [title], [data-name], [class*="close"], [class*="Close"]'
    )).filter(function(node) {
      if (!popupVisible(node)) return false;
      var text = popupText(node) + ' ' + popupMeta(node);
      return CLOSE_PATTERN.test(text);
    });
  }

  function promotionalRoot(root) {
    var descriptor = popupText(root) + ' ' + popupMeta(root);
    return PROMO_PATTERN.test(descriptor);
  }

  function protectedRoot(root) {
    var descriptor = popupText(root) + ' ' + popupMeta(root);
    return /pine|editor|indicator|strategy|alert|watchlist|layout|symbol|指標|ストラテジー|アラート|ウォッチリスト|レイアウト|シンボル/i.test(descriptor);
  }

  function largeOverlay(root) {
    if (!root || typeof root.getBoundingClientRect !== 'function') return false;
    var rect = root.getBoundingClientRect();
    var viewportArea = Math.max(window.innerWidth || 0, 1) * Math.max(window.innerHeight || 0, 1);
    return ((rect.width * rect.height) / viewportArea) >= 0.2;
  }

  function candidateRoot(root) {
    if (!popupVisible(root)) return false;
    if (protectedRoot(root)) return false;
    if (promotionalRoot(root)) return true;
    return largeOverlay(root) && closeControls(root).length > 0;
  }

  function hideRoot(root) {
    if (!root || !root.style) return false;
    root.setAttribute('data-oh-my-tv-popup-hidden', '1');
    root.style.setProperty('display', 'none', 'important');
    root.style.setProperty('visibility', 'hidden', 'important');
    root.style.setProperty('pointer-events', 'none', 'important');
    root.style.setProperty('opacity', '0', 'important');
    root.setAttribute('aria-hidden', 'true');
    return true;
  }

  function popupSummary() {
    var roots = Array.from(document.querySelectorAll(ROOT_SELECTOR)).filter(candidateRoot);
    return roots.map(function(root) {
      return popupText(root);
    }).filter(Boolean).slice(0, 5);
  }

  function popupCleanup() {
    var summary = {
      detected: 0,
      clicked: 0,
      hidden: 0,
      texts: [],
    };

    Array.from(document.querySelectorAll(ROOT_SELECTOR)).forEach(function(root) {
      if (!candidateRoot(root)) return;
      summary.detected += 1;
      var text = popupText(root);
      if (text) {
        summary.texts.push(text.slice(0, 200));
      }

      var controls = closeControls(root);
      controls.forEach(function(node) {
        try {
          node.click();
          summary.clicked += 1;
        } catch {
          // ignore per-node click failures and continue scanning the root
        }
      });

      if (popupVisible(root) && (controls.length === 0 || promotionalRoot(root))) {
        if (hideRoot(root)) {
          summary.hidden += 1;
        }
      }
    });

    return summary;
  }
`;

/**
 * JS expression that installs a lightweight popup monitor.
 * The monitor persists on the page and auto-runs popupCleanup on mutations.
 */
export const POPUP_MONITOR_JS = `(function() {
  ${POPUP_GUARD_SHARED_JS}

  var guard = window.__OH_MY_TV_POPUP_GUARD__;
  if (guard && guard.installed && typeof guard.cleanup === 'function') {
    return {
      installed: true,
      observed: guard.observed || 0,
      dismissed: guard.dismissed || 0,
      hidden: guard.hidden || 0,
      visible_dialogs: popupSummary(),
    };
  }

  guard = window.__OH_MY_TV_POPUP_GUARD__ = {
    installed: true,
    observed: 0,
    dismissed: 0,
    hidden: 0,
    last_texts: [],
    last_cleanup_at: null,
  };

  guard.cleanup = function() {
    var result = popupCleanup();
    guard.observed += result.detected;
    guard.dismissed += result.clicked;
    guard.hidden += result.hidden;
    guard.last_texts = result.texts.slice(0, 5);
    guard.last_cleanup_at = Date.now();
    return result;
  };

  var scheduled = false;
  guard.scheduleCleanup = function() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(function() {
      scheduled = false;
      try {
        guard.cleanup();
      } catch {
        // ignore observer-triggered cleanup failures; explicit cleanup will retry later
      }
    }, 0);
  };

  guard.observer = new MutationObserver(function() {
    guard.scheduleCleanup();
  });

  var root = document.documentElement || document.body;
  if (root) {
    guard.observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'role', 'aria-modal', 'aria-hidden'],
    });
  }

  guard.scheduleCleanup();
  return {
    installed: true,
    observed: guard.observed,
    dismissed: guard.dismissed,
    hidden: guard.hidden,
    visible_dialogs: popupSummary(),
  };
})()`;

/**
 * JS expression that clicks common close/cancel controls and hides
 * promotional dialog roots when needed.
 */
export const DISMISS_DIALOG_JS = `(function() {
  if (
    window.__OH_MY_TV_POPUP_GUARD__ &&
    typeof window.__OH_MY_TV_POPUP_GUARD__.cleanup === 'function'
  ) {
    return window.__OH_MY_TV_POPUP_GUARD__.cleanup();
  }

  ${POPUP_GUARD_SHARED_JS}
  return popupCleanup();
})()`;

/**
 * Classify a readiness failure into a human-actionable category.
 */
export function classifyReadinessFailure(error) {
  const msg = String(error?.message || error || '');
  if (/EPIPE|broken pipe/i.test(msg)) {
    return { category: 'cli-epipe', message: msg };
  }
  if (/process.*(not found|missing|gone|exited|crashed)|no.*tradingview.*process/i.test(msg)) {
    return { category: 'process-missing', message: msg };
  }
  if (/cdp.*port.*not reachable|cdp.*unreachable|9222.*unreachable|port.*9222.*closed/i.test(msg)) {
    return { category: 'cdp-unreachable', message: msg };
  }
  if (/mcp.*(unhealthy|unavailable|not responding|server.*down)/i.test(msg)) {
    return { category: 'mcp-unhealthy', message: msg };
  }
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

export async function ensurePopupMonitor(deps) {
  return deps.evaluate(POPUP_MONITOR_JS);
}

/**
 * Read currently visible dialog texts for retry classification.
 */
export async function readVisibleDialogTexts(deps) {
  const dialogs = await deps.evaluate(`
    (function() {
      return Array.from(document.querySelectorAll(${JSON.stringify(POPUP_ROOT_SELECTOR)}))
        .map(function(el) {
          var rect = el.getBoundingClientRect();
          var style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || rect.width <= 0 || rect.height <= 0) {
            return '';
          }
          return ((el.innerText || el.textContent || '').trim().replace(/\\s+/g, ' '));
        })
        .filter(Boolean)
        .slice(0, 5);
    })()
  `);
  return Array.isArray(dialogs) ? dialogs : [];
}

/**
 * Dismiss transient dialogs via DOM cleanup, then send Escape.
 */
export async function dismissTransientDialogs(deps, { settleMs = 500, forceEscape = false } = {}) {
  await ensurePopupMonitor(deps);
  const summary = await deps.evaluate(DISMISS_DIALOG_JS);
  const handledPopup =
    summary &&
    typeof summary === 'object' &&
    (
      Number(summary.detected || 0) > 0 ||
      Number(summary.clicked || 0) > 0 ||
      Number(summary.hidden || 0) > 0 ||
      (Array.isArray(summary.texts) && summary.texts.length > 0)
    );
  if (handledPopup || forceEscape) {
    const client = await deps.getClient();
    await client.Input.dispatchKeyEvent({
      type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27,
    });
    await client.Input.dispatchKeyEvent({
      type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27,
    });
  }
  if (settleMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, settleMs));
  }
  return summary;
}

function shouldRetryPopupFailure(error, dialogTexts) {
  const classified = classifyReadinessFailure(error);
  if (classified.category === 'bridge-unreachable') {
    return false;
  }
  if (Array.isArray(dialogTexts) && dialogTexts.length > 0) {
    return true;
  }
  const message = classified.message;
  return (
    classified.category === 'api-unavailable' ||
    /dialog|modal|popup|overlay|advert|offer|welcome|trial|upgrade|dismiss|close/i.test(message)
  );
}

/**
 * Run an action with popup monitoring, pre-cleanup, and targeted retry.
 */
export async function withPopupGuard(action, deps, opts = {}) {
  const {
    preClean = true,
    maxRetries = 1,
    retryDelayMs = 800,
  } = opts;

  await ensurePopupMonitor(deps);

  if (preClean) {
    await dismissTransientDialogs(deps, { settleMs: 0 });
  }

  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const result = await action();
      if (
        result &&
        typeof result === 'object' &&
        typeof result.error === 'string'
      ) {
        const dialogTexts = await readVisibleDialogTexts(deps);
        if (!shouldRetryPopupFailure(new Error(result.error), dialogTexts) || attempt >= maxRetries) {
          return result;
        }
        await dismissTransientDialogs(deps, {
          settleMs: 0,
          forceEscape: dialogTexts.length > 0,
        });
        if (retryDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
        continue;
      }
      return result;
    } catch (error) {
      lastError = error;
      const dialogTexts = await readVisibleDialogTexts(deps);
      if (!shouldRetryPopupFailure(error, dialogTexts) || attempt >= maxRetries) {
        throw error;
      }
      await dismissTransientDialogs(deps, {
        settleMs: 0,
        forceEscape: dialogTexts.length > 0,
      });
      if (retryDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  throw lastError;
}

/**
 * Perform a health check with readiness retry.
 */
export async function healthCheckWithReadiness(deps, opts = {}) {
  const { maxRetries = 2, retryDelayMs = 1000 } = opts;
  let lastError = null;
  let retries = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
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
        retries += 1;
        try {
          await dismissTransientDialogs(deps, { settleMs: 0, forceEscape: true });
        } catch {
          // best-effort cleanup before the explicit readiness retry
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    } catch (error) {
      const classified = classifyReadinessFailure(error);
      if (classified.category === 'bridge-unreachable') {
        return {
          success: false,
          api_available: false,
          failure_category: 'bridge-unreachable',
          error: classified.message,
          readiness_retries: retries,
        };
      }

      lastError = error;
      if (attempt < maxRetries) {
        retries += 1;
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
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
