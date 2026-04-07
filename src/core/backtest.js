import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { evaluate, getClient } from '../connection.js';
import {
  selectLatestWsReportCandidate,
} from './backtest-report-websocket.js';
import { healthCheck } from './health.js';
import { setActiveSymbol, getCurrentPrice, symbolMatches } from './price.js';
import {
  ensurePineEditorOpen,
  diagnosePineEditorState,
  getSource,
  setSource,
  smartCompile,
  fetchChartStudies,
  verifyStrategyAttachmentChange,
  retryApplyStrategy,
} from './pine.js';
import { validatePreset } from './preset-validation.js';
import { buildResearchStrategySource } from './research-backtest.js';
import { mergeDateOverride, validateDateRange } from './campaign.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Pine source builder (NVDA 5/20 MA cross — fixed)
// ---------------------------------------------------------------------------
const STRATEGY_TITLE = 'NVDA 5/20 MA Cross';

export function buildNvdaMaSource() {
  return `//@version=6
strategy("${STRATEGY_TITLE}", overlay=true, default_qty_type=strategy.percent_of_equity, default_qty_value=100)

fast = ta.sma(close, 5)
slow = ta.sma(close, 20)

plot(fast, "SMA 5", color.blue)
plot(slow, "SMA 20", color.orange)

if ta.crossover(fast, slow)
    strategy.entry("Long", strategy.long)

if ta.crossunder(fast, slow)
    strategy.close("Long")
`;
}

// ---------------------------------------------------------------------------
// Metric normalizer
// ---------------------------------------------------------------------------
const METRIC_KEYS = [
  'net_profit',
  'closed_trades',
  'percent_profitable',
  'profit_factor',
  'max_drawdown',
];

const TESTER_LABEL_ALIASES = {
  net_profit: ['net profit', '純利益', '純損益'],
  closed_trades: ['closed trades', 'total closed trades', '取引数', '総取引数', '終了取引'],
  percent_profitable: ['percent profitable', '勝率', '利益の出たトレード'],
  profit_factor: ['profit factor', 'プロフィットファクター'],
  max_drawdown: ['max drawdown', 'maximum drawdown', '最大ドローダウン'],
};
const STUDY_LIMIT_PATTERNS = [
  /already\s*5\s*indicators/i,
  /すでに5個のインジケーターを適用しています/i,
  /現在のプランでご利用いただける上限です/i,
];
const TESTER_METRICS_TAB_PATTERNS = [/^指標$/, /^Performance Summary$/i, /^Summary$/i, /^Overview$/i];
export const RESTORE_POLICY = Object.freeze({
  REQUIRED: 'required',
  BEST_EFFORT: 'best-effort',
  SKIP: 'skip',
});

function calculateSma(values, period, index) {
  if (index < period - 1) return null;
  let sum = 0;
  for (let offset = index - period + 1; offset <= index; offset += 1) {
    sum += values[offset];
  }
  return sum / period;
}

// This fallback mirrors the built-in NVDA MA strategy only; preset strategies need
// their own strategy-aware fallback before using degraded results.
export function runLocalFallbackBacktest(bars, { initialCapital = 10000 } = {}) {
  if (!Array.isArray(bars) || bars.length < 21) {
    return null;
  }

  const closes = bars.map((bar) => Number(bar.close));
  const opens = bars.map((bar) => Number.isFinite(Number(bar.open)) ? Number(bar.open) : Number(bar.close));
  if (closes.some((value) => !Number.isFinite(value)) || opens.some((value) => !Number.isFinite(value))) {
    throw new Error('Fallback backtest requires finite open/close prices');
  }

  let cash = initialCapital;
  let shares = 0;
  let entryPrice = null;
  let grossProfit = 0;
  let grossLoss = 0;
  let profitableTrades = 0;
  let closedTrades = 0;
  let peakEquity = initialCapital;
  let maxDrawdown = 0;

  for (let index = 20; index < bars.length; index += 1) {
    const fastPrev = calculateSma(closes, 5, index - 1);
    const slowPrev = calculateSma(closes, 20, index - 1);
    const fastNow = calculateSma(closes, 5, index);
    const slowNow = calculateSma(closes, 20, index);
    if (
      fastPrev === null ||
      slowPrev === null ||
      fastNow === null ||
      slowNow === null
    ) {
      continue;
    }

    const currentEquity = shares > 0 ? shares * closes[index] : cash;
    peakEquity = Math.max(peakEquity, currentEquity);
    maxDrawdown = Math.max(maxDrawdown, peakEquity - currentEquity);

    const crossedUp = fastPrev <= slowPrev && fastNow > slowNow;
    const crossedDown = fastPrev >= slowPrev && fastNow < slowNow;
    const executionIndex = index + 1;
    if (executionIndex >= bars.length) {
      continue;
    }
    const executionPrice = opens[executionIndex];

    if (shares === 0 && crossedUp) {
      shares = cash / executionPrice;
      cash = 0;
      entryPrice = executionPrice;
      continue;
    }

    if (shares > 0 && crossedDown) {
      const exitValue = shares * executionPrice;
      const tradeProfit = exitValue - (shares * entryPrice);
      cash = exitValue;
      shares = 0;
      closedTrades += 1;
      if (tradeProfit >= 0) {
        grossProfit += tradeProfit;
        profitableTrades += 1;
      } else {
        grossLoss += Math.abs(tradeProfit);
      }
      entryPrice = null;
    }
  }

  if (shares > 0) {
    const exitValue = shares * closes.at(-1);
    const tradeProfit = exitValue - (shares * entryPrice);
    cash = exitValue;
    closedTrades += 1;
    if (tradeProfit >= 0) {
      grossProfit += tradeProfit;
      profitableTrades += 1;
    } else {
      grossLoss += Math.abs(tradeProfit);
    }
  }

  const endingEquity = cash;
  return {
    net_profit: Number((endingEquity - initialCapital).toFixed(2)),
    closed_trades: closedTrades,
    percent_profitable: closedTrades > 0
      ? Number(((profitableTrades / closedTrades) * 100).toFixed(2))
      : 0,
    profit_factor: grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(4)) : null,
    max_drawdown: Number(maxDrawdown.toFixed(2)),
    ending_equity: Number(endingEquity.toFixed(2)),
    bar_count: bars.length,
  };
}

export function normalizeMetrics(raw) {
  const src = raw ?? {};
  const performance = src.performance && typeof src.performance === 'object' ? src.performance : {};
  const performanceAll = performance.all && typeof performance.all === 'object' ? performance.all : {};
  const percentProfitable = performanceAll.percentProfitable;
  const out = {};
  out.net_profit = src.net_profit ?? performanceAll.netProfit ?? null;
  out.closed_trades = src.closed_trades ?? performanceAll.totalTrades ?? null;
  out.percent_profitable = src.percent_profitable ?? (
    Number.isFinite(percentProfitable) ? Number((percentProfitable * 100).toFixed(2)) : null
  );
  out.profit_factor = src.profit_factor ?? performanceAll.profitFactor ?? null;
  out.max_drawdown =
    src.max_drawdown ??
    performance.maxStrategyDrawDown ??
    performanceAll.maxStrategyDrawDown ??
    null;
  return out;
}

// ---------------------------------------------------------------------------
// Alternative source observation helpers (pure — diagnostic only)
// ---------------------------------------------------------------------------
const PROBE_FIELDS = ['reportData', 'performance', 'ordersData', 'tradesData', 'equityData'];

export function probeStrategySourceShape(source) {
  const empty = {
    hasReportData: false,
    hasPerformance: false,
    hasOrdersData: false,
    hasTradesData: false,
    hasEquityData: false,
    reportDataKeyCount: 0,
    performanceKeyCount: 0,
    tradesDataCount: 0,
    fieldCount: 0,
  };
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return empty;
  }

  const resolve = (val) => {
    if (typeof val !== 'function') return val;
    try { return val(); } catch { return undefined; }
  };

  const reportRaw = resolve(source.reportData);
  const perfRaw = resolve(source.performance);
  const ordersRaw = resolve(source.ordersData);
  const tradesRaw = resolve(source.tradesData);
  const equityRaw = resolve(source.equityData);

  const hasReport = reportRaw != null && typeof reportRaw === 'object';
  const hasPerf = perfRaw != null && typeof perfRaw === 'object';
  const hasOrders = ordersRaw != null;
  const hasTrades = tradesRaw != null;
  const hasEquity = equityRaw != null;

  let detected = 0;
  if (hasReport) detected += 1;
  if (hasPerf) detected += 1;
  if (hasOrders) detected += 1;
  if (hasTrades) detected += 1;
  if (hasEquity) detected += 1;

  return {
    hasReportData: hasReport,
    hasPerformance: hasPerf,
    hasOrdersData: hasOrders,
    hasTradesData: hasTrades,
    hasEquityData: hasEquity,
    reportDataKeyCount: hasReport ? Object.keys(reportRaw).length : 0,
    performanceKeyCount: hasPerf ? Object.keys(perfRaw).length : 0,
    tradesDataCount: Array.isArray(tradesRaw) ? tradesRaw.length : 0,
    fieldCount: detected,
  };
}

export function deriveMetricsFromTrades(trades, { initialCapital = 10000 } = {}) {
  if (!Array.isArray(trades) || trades.length === 0) {
    return null;
  }

  let netProfit = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let profitable = 0;
  let validCount = 0;
  let peakEquity = initialCapital;
  let maxDrawdown = 0;
  let equity = initialCapital;

  for (let i = 0; i < trades.length; i += 1) {
    const p = Number(trades[i].profit);
    if (!Number.isFinite(p)) continue;
    validCount += 1;
    netProfit += p;
    equity += p;
    if (p >= 0) {
      grossProfit += p;
      profitable += 1;
    } else {
      grossLoss += Math.abs(p);
    }
    peakEquity = Math.max(peakEquity, equity);
    maxDrawdown = Math.max(maxDrawdown, peakEquity - equity);
  }

  if (validCount === 0) {
    return null;
  }

  return {
    net_profit: Number(netProfit.toFixed(2)),
    closed_trades: validCount,
    percent_profitable: Number(((profitable / validCount) * 100).toFixed(2)),
    profit_factor: grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(4)) : null,
    max_drawdown: Number(maxDrawdown.toFixed(2)),
    _derivedFrom: 'strategy_trades',
  };
}

// ---------------------------------------------------------------------------
// Tester panel state helpers (pure — unit testable)
// ---------------------------------------------------------------------------
export function isTesterPanelStateVisible(testerState) {
  if (!testerState || typeof testerState !== 'object') {
    return false;
  }
  if (testerState.panel_visible === true || testerState.no_strategy === true) {
    return true;
  }
  const text = String(testerState.text ?? '').toLowerCase();
  if (!text) {
    return false;
  }
  if (/strategy tester|ストラテジーレポート|ストラテジーテスター/i.test(text)) {
    return true;
  }
  return Object.values(TESTER_LABEL_ALIASES)
    .flat()
    .some((alias) => text.includes(String(alias).toLowerCase()));
}

// ---------------------------------------------------------------------------
// Tester read failure classifier (pure — unit testable)
// ---------------------------------------------------------------------------
export function classifyTesterReadFailure({ testerState, hasApiResult, hasDomResult }) {
  if (!isTesterPanelStateVisible(testerState)) {
    return {
      category: 'panel_not_visible',
      reason: 'Strategy Tester panel could not be confirmed as visible',
    };
  }
  if (testerState.no_strategy) {
    return {
      category: 'no_strategy_applied',
      reason: 'Strategy Tester opened, but TradingView reports no strategy is applied to the chart',
    };
  }
  if (!hasApiResult && !hasDomResult) {
    return {
      category: 'metrics_unreadable',
      reason: 'Strategy Tester opened but metrics could not be read from internal API or DOM',
    };
  }
  return {
    category: 'unknown',
    reason: 'Metrics reading failed for unknown reason',
  };
}

export function shouldRetryTesterRead({
  testerState,
  hasApiResult,
  hasDomResult,
  testerConfirmedVisible = false,
  attemptIndex = 0,
  panelVisibilityGraceRetries = 0,
  metricsUnreadableAttempt = 0,
  metricsUnreadableMaxRetries = TESTER_METRICS_UNREADABLE_MAX_RETRIES,
}) {
  if (hasApiResult || hasDomResult) {
    return { retry: false, failure: null, delayMs: 0 };
  }
  const failure = classifyTesterReadFailure({
    testerState,
    hasApiResult,
    hasDomResult,
  });
  if (
    failure.category === 'panel_not_visible' &&
    attemptIndex < panelVisibilityGraceRetries
  ) {
    return { retry: true, failure, delayMs: TESTER_READ_DELAY };
  }
  if (failure.category === 'metrics_unreadable') {
    const retry = metricsUnreadableAttempt < metricsUnreadableMaxRetries;
    return {
      retry,
      failure,
      delayMs: retry
        ? (TESTER_METRICS_UNREADABLE_DELAYS[metricsUnreadableAttempt] ?? TESTER_READ_DELAY)
        : 0,
    };
  }
  return {
    retry: false,
    failure,
    delayMs: 0,
  };
}

export function hasStudyLimitDialog(dialogTexts) {
  const texts = Array.isArray(dialogTexts) ? dialogTexts : [dialogTexts];
  return texts
    .filter((text) => typeof text === 'string' && text.trim() !== '')
    .some((text) => STUDY_LIMIT_PATTERNS.some((pattern) => pattern.test(text)));
}

export function canSafelyClearStudies({ existingStudies, studyTemplateSnapshot }) {
  return Boolean(Array.isArray(existingStudies) && (
    existingStudies.length === 0 ||
    (studyTemplateSnapshot && typeof studyTemplateSnapshot.content === 'string')
  ));
}

export function normalizeRestorePolicy(policy) {
  if (policy === RESTORE_POLICY.REQUIRED || policy === RESTORE_POLICY.BEST_EFFORT || policy === RESTORE_POLICY.SKIP) {
    return policy;
  }
  return RESTORE_POLICY.SKIP;
}

export function pickTesterMetricsTab(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const candidates = typeof entry === 'string'
      ? [entry]
      : [entry?.text, entry?.ariaLabel, entry?.aria]
        .filter((value) => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean);
    const matched = candidates.find((label) =>
      TESTER_METRICS_TAB_PATTERNS.some((pattern) => pattern.test(label)));
    if (matched) {
      return { index: i, label: matched };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Result builder
// ---------------------------------------------------------------------------
export function buildResult({
  compileSuccess,
  compileDetail,
  compileErrors,
  editorOpenFailed,
  editorOpenReason,
  applyFailed,
  applyReason,
  testerAvailable,
  testerReason,
  testerReasonCategory,
  metrics,
  symbol,
}) {
  if (editorOpenFailed) {
    return {
      success: false,
      symbol: symbol ?? null,
      editor_open_failed: true,
      editor_open_reason: editorOpenReason || 'Unknown',
      compile_errors: compileErrors ?? [],
    };
  }

  if (!compileSuccess) {
    return {
      success: false,
      symbol: symbol ?? null,
      compile_errors: compileErrors ?? [],
    };
  }

  const result = {
    success: true,
    symbol: symbol ?? null,
    compile_detail: compileDetail ?? null,
    tester_available: Boolean(testerAvailable),
  };

  if (applyFailed === true || applyFailed === false) {
    result.apply_failed = applyFailed;
    if (applyFailed && applyReason) {
      result.apply_reason = applyReason;
    }
  } else if (testerReasonCategory === 'no_strategy_applied') {
    result.apply_failed = true;
    result.apply_reason =
      applyReason || testerReason || 'TradingView reports no strategy is applied to the chart';
  }

  if (testerAvailable && metrics) {
    result.metrics = normalizeMetrics(metrics);
  } else {
    result.tester_reason = testerReason || 'Unknown';
    if (testerReasonCategory) {
      result.tester_reason_category = testerReasonCategory;
    }
  }

  return result;
}

export function attachFallbackMetrics(
  result,
  {
    testerReasonCategory,
    fallbackMetrics,
    fallbackSource = 'chart_bars_local',
  } = {},
) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return result;
  }

  const next = { ...result };

  if (fallbackMetrics) {
    next.fallback_source = fallbackSource;
    next.fallback_metrics = fallbackMetrics;
    if (testerReasonCategory === 'metrics_unreadable') {
      next.degraded_result = true;
      next.rerun_recommended = false;
    }
    return next;
  }

  if (testerReasonCategory === 'metrics_unreadable') {
    next.rerun_recommended = true;
  }

  return next;
}

// ---------------------------------------------------------------------------
// Strategy Tester helpers (CDP)
// ---------------------------------------------------------------------------
async function openStrategyTester() {
  const opened = await evaluate(`
    (function() {
      try {
        var bwb = window.TradingView && window.TradingView.bottomWidgetBar;
        if (bwb && typeof bwb.open === 'function') {
          bwb.open('strategyTester');
          return true;
        }
        if (bwb && typeof bwb.showWidget === 'function') {
          bwb.showWidget('backtesting');
          return true;
        }
        var tab = document.querySelector('[data-name="backtesting"]')
          || document.querySelector('[id*="strategy-tester"]')
          || document.querySelector('button[aria-label*="Strategy Tester"]')
          || Array.from(document.querySelectorAll('button,[role="tab"]')).find(function(el) {
            var text = (el.textContent || '').trim();
            var aria = el.getAttribute('aria-label') || '';
            return /Strategy Tester|ストラテジーレポート|ストラテジーテスター/i.test(text + ' ' + aria);
          });
        if (tab) { tab.click(); return true; }
        return false;
      } catch (e) { return false; }
    })()
  `);
  if (!opened) {
    return { attempted: false, confirmedVisible: false };
  }

  // Poll for tester panel visibility instead of fixed wait.
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 300));
    const testerState = await readTesterState();
    if (isTesterPanelStateVisible(testerState)) {
      return { attempted: true, confirmedVisible: true };
    }
  }
  return { attempted: true, confirmedVisible: false };
}

async function activateTesterMetricsTab() {
  const tabs = await evaluate(`
    (function() {
      try {
        var bottom = document.querySelector('[class*="layout__area--bottom"]') || document;
        return Array.from(bottom.querySelectorAll('[role="tab"]')).map(function(el) {
          return {
            text: (el.textContent || '').trim(),
            ariaLabel: (el.getAttribute('aria-label') || '').trim(),
          };
        });
      } catch (e) {
        return [];
      }
    })()
  `);
  const picked = pickTesterMetricsTab(Array.isArray(tabs) ? tabs : []);
  if (!picked) return { clicked: false };

  const clicked = await evaluate(`
    (function() {
      try {
        var bottom = document.querySelector('[class*="layout__area--bottom"]') || document;
        var tabs = Array.from(bottom.querySelectorAll('[role="tab"]'));
        var target = tabs[${JSON.stringify(picked.index)}];
        if (!target) return false;
        target.click();
        return true;
      } catch (e) {
        return false;
      }
    })()
  `);

  if (clicked) {
    await new Promise((r) => setTimeout(r, 1000));
  }

  return { clicked, label: picked.label };
}

async function readTesterMetricsFromInternalApi() {
  const raw = await evaluate(`
    (function() {
      try {
        var chartWidget = window.TradingViewApi._activeChartWidgetWV.value()._chartWidget;
        var model = chartWidget && chartWidget.model && chartWidget.model();
        var sources = model && model.model && model.model().dataSources ? model.model().dataSources() : [];
        for (var i = 0; i < sources.length; i++) {
          var source = sources[i];
          if (!source) continue;
          var meta = null;
          try { meta = source.metaInfo ? source.metaInfo() : null; } catch (e) {}
          var looksLikeStrategy = !!(
            (meta && meta.isTVScriptStrategy) ||
            source.reportData ||
            source.ordersData ||
            source.tradesData ||
            source.equityData
          );
          if (!looksLikeStrategy) continue;

          var metrics = null;
          if (source.reportData) {
            metrics = typeof source.reportData === 'function' ? source.reportData() : source.reportData;
            if (metrics && typeof metrics.value === 'function') metrics = metrics.value();
          }
          if ((!metrics || typeof metrics !== 'object' || Object.keys(metrics).length === 0) && source.performance) {
            metrics = typeof source.performance === 'function' ? source.performance() : source.performance;
            if (metrics && typeof metrics.value === 'function') metrics = metrics.value();
          }
          if (metrics && typeof metrics === 'object' && Object.keys(metrics).length > 0) {
            return metrics;
          }
        }
        return null;
      } catch (e) {
        return null;
      }
    })()
  `);

  return raw && typeof raw === 'object' ? raw : null;
}

async function readTesterMetricsFromDom() {
  return evaluate(`
    (function() {
      try {
        var rows = document.querySelectorAll(
          '[class*="reportContainer"] [class*="row"], ' +
          '[data-name="strategy-report"] tr, ' +
          '[class*="strategyReport"] tr, ' +
          '[class*="report-"] [class*="row"], ' +
          '[class*="backtesting"] [class*="row"]'
        );
        if (!rows || rows.length === 0) return null;

        var result = {};
        var mapping = ${JSON.stringify(TESTER_LABEL_ALIASES)};

        for (var i = 0; i < rows.length; i++) {
          var cells = rows[i].querySelectorAll('td, [class*="cell"], [class*="value"], span');
          if (cells.length < 2) continue;
          var label = (cells[0].textContent || '').trim().toLowerCase();
          var value = (cells[1].textContent || '').trim();
          for (var key in mapping) {
            var aliases = mapping[key];
            for (var j = 0; j < aliases.length; j++) {
              if (label.indexOf(String(aliases[j]).toLowerCase()) !== -1) {
                result[key] = value;
                break;
              }
            }
            if (result[key]) break;
          }
        }
        return Object.keys(result).length > 0 ? result : null;
      } catch (e) { return null; }
    })()
  `);
}

async function readTesterMetricsWithRetries({ testerOpenState }) {
  let rawMetrics = null;
  let testerState = testerOpenState.confirmedVisible
    ? { text: '', no_strategy: false, panel_visible: true }
    : null;
  let failure = null;
  let metricsUnreadableAttempt = 0;
  let nextDelayMs = TESTER_READ_DELAY;

  for (let i = 0; i < TESTER_READ_RETRIES; i += 1) {
    await new Promise((r) => setTimeout(r, nextDelayMs));
    const apiMetrics = await readTesterMetricsFromInternalApi();
    const domMetrics = apiMetrics ? null : await readTesterMetricsFromDom();
    rawMetrics = apiMetrics || domMetrics;
    testerState = await readTesterState();
    if (rawMetrics) {
      return { rawMetrics, testerState, failure: null };
    }

    const decision = shouldRetryTesterRead({
      testerState,
      hasApiResult: Boolean(apiMetrics),
      hasDomResult: Boolean(domMetrics),
      testerConfirmedVisible: testerOpenState.confirmedVisible,
      attemptIndex: i,
      panelVisibilityGraceRetries: TESTER_READ_RETRIES,
      metricsUnreadableAttempt,
    });
    failure = decision.failure;
    if (decision.failure?.category === 'metrics_unreadable' && decision.retry) {
      metricsUnreadableAttempt += 1;
    }
    if (!decision.retry) {
      break;
    }
    nextDelayMs = decision.delayMs || TESTER_READ_DELAY;
    if (testerState?.panel_visible) {
      await activateTesterMetricsTab();
    }
  }

  return { rawMetrics: null, testerState, failure };
}

async function readTesterState() {
  return evaluate(`
    (function() {
      try {
        var bottom = document.querySelector('[class*="layout__area--bottom"]');
        var text = bottom ? (bottom.innerText || '').trim() : '';
        var noStrategy = /Apply a strategy to your chart|ストラテジーをテストするには、そのストラテジーをチャート上に適用してください/i.test(text);
        var activeTesterTab = Array.from(document.querySelectorAll('button,[role="tab"]')).find(function(el) {
          var label = ((el.textContent || '') + ' ' + (el.getAttribute('aria-label') || '')).trim();
          if (!/Strategy Tester|ストラテジーレポート|ストラテジーテスター/i.test(label)) return false;
          var selected = el.getAttribute('aria-selected');
          var pressed = el.getAttribute('aria-pressed');
          var className = typeof el.className === 'string' ? el.className : '';
          return selected === 'true' || pressed === 'true' || /active|selected/i.test(className);
        });
        var reportRoot = document.querySelector(
          '[data-name="strategy-report"], [class*="strategyReport"], [class*="reportContainer"], [class*="backtesting"]'
        );
        var reportTextVisible = /net profit|closed trades|profit factor|max drawdown|純利益|総取引数|プロフィットファクター|最大ドローダウン/i.test(text);
        return {
          text: text,
          no_strategy: noStrategy,
          panel_visible: Boolean(activeTesterTab || reportRoot || noStrategy || reportTextVisible),
        };
      } catch (e) {
        return { text: '', no_strategy: false, panel_visible: false };
      }
    })()
  `);
}

async function readChartBars(limit = 500) {
  return evaluate(`
    (function() {
      try {
        var chart = window.TradingViewApi._activeChartWidgetWV.value();
        var model = chart._chartWidget && typeof chart._chartWidget.model === 'function'
          ? chart._chartWidget.model()
          : null;
        if (!model || typeof model.mainSeries !== 'function') return [];
        var bars = model.mainSeries().bars();
        if (!bars || typeof bars.lastIndex !== 'function' || typeof bars.valueAt !== 'function') return [];
        var end = bars.lastIndex();
        var start = Math.max(typeof bars.firstIndex === 'function' ? bars.firstIndex() : 0, end - ${limit} + 1);
        var result = [];
        for (var index = start; index <= end; index += 1) {
          var bar = bars.valueAt(index);
          if (!bar) continue;
          if (Array.isArray(bar)) {
            result.push({ time: bar[0], open: bar[1], high: bar[2], low: bar[3], close: bar[4], volume: bar[5] || 0 });
            continue;
          }
          result.push({
            time: bar.time ?? index,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close ?? bar[4],
            volume: bar.volume ?? bar[5] ?? 0,
          });
        }
        return result;
      } catch (e) {
        return [];
      }
    })()
  `);
}

async function readNvdaMaFallbackMetricsPayload() {
  const fallbackBars = await readChartBars();
  const fallbackMetrics = runLocalFallbackBacktest(fallbackBars);
  if (!fallbackMetrics) {
    return null;
  }
  return {
    source: 'chart_bars_local',
    metrics: fallbackMetrics,
  };
}

// ---------------------------------------------------------------------------
// WebSocket `du` frame listener — collects report frames via CDP Network
// ---------------------------------------------------------------------------
async function startWsReportListener() {
  const cdp = await getClient();
  await cdp.Network.enable();

  const frames = [];
  const handler = (params) => {
    const { payloadData } = params.response || {};
    if (typeof payloadData !== 'string') return;
    frames.push(payloadData);
  };

  cdp.on('Network.webSocketFrameReceived', handler);

  return {
    getFrames() {
      return frames;
    },
    stop() {
      cdp.off('Network.webSocketFrameReceived', handler);
    },
  };
}

function readWsReportFallbackMetrics(wsListener) {
  if (!wsListener) {
    return null;
  }

  const candidate = selectLatestWsReportCandidate(wsListener.getFrames(), {
    requireUniqueSession: true,
  });
  if (!candidate) {
    return null;
  }

  return {
    source: 'websocket_report',
    metrics: normalizeMetrics(candidate.report),
  };
}

async function readVisibleDialogTexts() {
  const dialogs = await evaluate(`
    (function() {
      return Array.from(document.querySelectorAll('[role="dialog"], [class*="dialog"], [class*="Dialog"]'))
        .map(function(el) {
          var rect = el.getBoundingClientRect();
          var style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || rect.width <= 0 || rect.height <= 0) {
            return '';
          }
          return ((el.innerText || el.textContent || '').trim().replace(/\\s+/g, ' '));
        })
        .filter(Boolean);
    })()
  `);

  return Array.isArray(dialogs) ? dialogs : [];
}

async function dismissTransientDialogs() {
  await evaluate(`
    (function() {
      Array.from(document.querySelectorAll('button')).forEach(function(btn) {
        var text = ((btn.textContent || '') + ' ' + (btn.title || '') + ' ' + (btn.getAttribute('aria-label') || ''))
          .trim();
        if (/メニューを閉じる|キャンセル|close|閉じる/i.test(text)) {
          btn.click();
        }
      });
      return true;
    })()
  `);

  const client = await getClient();
  await client.Input.dispatchKeyEvent({
    type: 'keyDown',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
  });
  await client.Input.dispatchKeyEvent({
    type: 'keyUp',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
  });

  await new Promise((r) => setTimeout(r, 1000));
}

async function clearChartStudies() {
  const cleared = await evaluate(`
    (async function() {
      try {
        var chart = window.TradingViewApi._activeChartWidgetWV.value();
        if (!chart || typeof chart.removeAllStudies !== 'function') return false;
        var result = chart.removeAllStudies();
        if (result && typeof result.then === 'function') {
          await result;
        }
        return true;
      } catch (e) {
        return false;
      }
    })()
  `, { awaitPromise: true });

  if (!cleared) {
    throw new Error('TradingView chart studies could not be cleared');
  }

  await new Promise((r) => setTimeout(r, 1500));
}

async function snapshotChartStudyTemplate() {
  const snapshot = await evaluate(`
    (function() {
      try {
        var chart = window.TradingViewApi._activeChartWidgetWV.value();
        if (!chart || typeof chart.getStudyTemplateSnapshot !== 'function') return null;
        var template = chart.getStudyTemplateSnapshot();
        if (!template || typeof template.content !== 'string') return null;
        return {
          name: template.name || null,
          content: template.content,
          meta_info: template.meta_info || null,
        };
      } catch (e) {
        return null;
      }
    })()
  `);

  return snapshot && typeof snapshot === 'object' ? snapshot : null;
}

async function restoreChartStudyTemplate(snapshot) {
  if (!snapshot || typeof snapshot.content !== 'string') return;
  let lastError = 'TradingView study template restore failed';

  for (let attempt = 0; attempt < STUDY_TEMPLATE_RESTORE_RETRIES; attempt += 1) {
    await clearChartStudies();

    let ready = false;
    for (let waitAttempt = 0; waitAttempt < MAIN_SERIES_READY_RETRIES; waitAttempt += 1) {
      ready = await evaluate(`
        (function() {
          try {
            var chart = window.TradingViewApi._activeChartWidgetWV.value();
            var model = chart && chart._chartWidget && typeof chart._chartWidget.model === 'function'
              ? chart._chartWidget.model()
              : null;
            if (!model || typeof model.mainSeries !== 'function') return false;
            var mainSeries = model.mainSeries();
            if (!mainSeries) return false;
            if (typeof mainSeries.isStarted === 'function') {
              return Boolean(mainSeries.isStarted());
            }
            if (typeof mainSeries.bars !== 'function') return false;
            var bars = mainSeries.bars();
            if (!bars || typeof bars.lastIndex !== 'function') return false;
            bars.lastIndex();
            return true;
          } catch (e) {
            return false;
          }
        })()
      `);
      if (ready) break;
      await new Promise((r) => setTimeout(r, MAIN_SERIES_READY_DELAY));
    }

    if (!ready) {
      lastError = 'Cannot start studies: main series is not started';
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    const restored = await evaluate(`
      (async function() {
        try {
          var chart = window.TradingViewApi._activeChartWidgetWV.value();
          if (!chart || typeof chart.applyStudyTemplate !== 'function') {
            return { ok: false, error: 'Study template restore API unavailable' };
          }

          var template = JSON.parse(${JSON.stringify(snapshot.content)});
          var applied = chart.applyStudyTemplate(template);
          if (applied && typeof applied.then === 'function') {
            await applied;
          }
          await new Promise(function(resolve) { setTimeout(resolve, 1500); });
          return { ok: true };
        } catch (e) {
          return { ok: false, error: String(e) };
        }
      })()
    `, { awaitPromise: true });

    if (restored?.ok) {
      return;
    }

    lastError = restored?.error || lastError;
    if (!/main series is not started/i.test(lastError)) {
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  throw new Error(lastError);
}

function isPineEditorUnavailableError(err) {
  const message = err instanceof Error ? err.message : String(err);
  return /Could not open Pine Editor/i.test(message) || /Monaco.*not found/i.test(message);
}

async function buildEditorOpenFailureResult({ symbol, fallbackReason } = {}) {
  const diagnostic = await diagnosePineEditorState();
  const reason = diagnostic.reason === 'monaco_already_present' && fallbackReason
    ? fallbackReason
    : (diagnostic.reason || fallbackReason || 'Unknown');
  const result = buildResult({
    compileSuccess: false,
    compileErrors: [],
    editorOpenFailed: true,
    editorOpenReason: reason,
    symbol,
  });
  if (diagnostic.detail && typeof diagnostic.detail === 'object') {
    result.editor_open_detail = diagnostic.detail;
  }
  return result;
}

async function ensurePineEditorAvailable({ symbol, retryDelayMs = 1000 } = {}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const ready = await ensurePineEditorOpen();
    if (ready) {
      return { ready: true };
    }

    const diagnostic = await diagnosePineEditorState();
    if (diagnostic.open || diagnostic.reason === 'monaco_already_present') {
      return { ready: true };
    }

    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, retryDelayMs));
    } else {
      return {
        ready: false,
        result: await buildEditorOpenFailureResult({
          symbol,
          fallbackReason: diagnostic.reason,
        }),
      };
    }
  }

  return {
    ready: false,
    result: await buildEditorOpenFailureResult({ symbol }),
  };
}

async function recoverFromStudyLimit({ source, strategyTitle }) {
  const dialogs = await readVisibleDialogTexts();
  if (!hasStudyLimitDialog(dialogs)) {
    return { attempted: false };
  }

  await dismissTransientDialogs();
  await clearChartStudies();
  await ensurePineEditorOpen();

  const studiesBeforeCompile = await fetchChartStudies();
  await setSource({ source });
  const compileResult = await smartCompile();
  if (compileResult.has_errors) {
    return {
      attempted: true,
      compileResult,
      strategyAttached: false,
      verifyReason: 'compile_errors_after_study_limit_recovery',
    };
  }
  const studiesAfterCompile = await fetchChartStudies();
  const verifyResult = verifyStrategyAttachmentChange(
    studiesBeforeCompile,
    studiesAfterCompile,
    strategyTitle,
    compileResult.study_added,
  );

  let strategyAttached = verifyResult.attached;
  if (!strategyAttached) {
    const retryResult = await retryApplyStrategy(strategyTitle);
    strategyAttached = retryResult.applied;
  }

  return {
    attempted: true,
    compileResult,
    strategyAttached,
    verifyReason: verifyResult.reason,
  };
}

async function restorePineEditor() {
  try {
    await ensurePineEditorOpen();
  } catch {
    // Best-effort cleanup so backtest does not leave the UI in Strategy Tester mode.
  }
}

async function performRestore({
  policy,
  originalSymbol,
  targetSymbol,
  originalSource,
  originalStudyTemplate,
  result,
}) {
  if (policy === RESTORE_POLICY.SKIP) {
    if (result) {
      result.restore_policy = policy;
      result.restore_success = true;
      result.restore_skipped = true;
    }
    return;
  }

  const restoreIssues = [];

  if (originalSymbol && !symbolMatches(originalSymbol, targetSymbol)) {
    try {
      await setActiveSymbol({ symbol: originalSymbol });
    } catch (err) {
      restoreIssues.push(`symbol restore failed: ${err.message}`);
    }
  }

  if (originalSource !== null) {
    try {
      const restoreEditor = await ensurePineEditorAvailable({ symbol: originalSymbol });
      if (!restoreEditor.ready) {
        throw new Error(`Could not open Pine Editor (${restoreEditor.result?.editor_open_reason || 'Unknown'})`);
      }
      await setSource({ source: originalSource });
    } catch (err) {
      restoreIssues.push(`source restore failed: ${err.message}`);
    }
  }

  if (originalStudyTemplate) {
    try {
      await restoreChartStudyTemplate(originalStudyTemplate);
    } catch (err) {
      restoreIssues.push(`study template restore failed: ${err.message}`);
    }
  }

  try {
    await restorePineEditor();
  } catch (err) {
    restoreIssues.push(`pine editor restore failed: ${err.message}`);
  }

  if (result) {
    result.restore_policy = policy;
    result.restore_success = restoreIssues.length === 0;
    if (restoreIssues.length > 0) {
      result.restore_error = restoreIssues.join('; ');
    }
  }
}

// ---------------------------------------------------------------------------
// Main orchestration
// ---------------------------------------------------------------------------
const TESTER_READ_RETRIES = 5;
const TESTER_READ_DELAY = 2500;
const TESTER_METRICS_UNREADABLE_DELAYS = [1000, 1500, 2000];
const TESTER_METRICS_UNREADABLE_MAX_RETRIES = TESTER_METRICS_UNREADABLE_DELAYS.length;
const MAIN_SERIES_READY_RETRIES = 20;
const MAIN_SERIES_READY_DELAY = 500;
const STUDY_TEMPLATE_RESTORE_RETRIES = 4;
const DEFAULT_RESTORE_POLICY = normalizeRestorePolicy(process.env.TV_BACKTEST_RESTORE_POLICY);

export async function runNvdaMaBacktest() {
  const source = buildNvdaMaSource();
  let originalSymbol = null;
  let originalSource = null;
  let originalStudies = [];
  let originalStudyTemplate = null;
  let result;

  try {
    const initialState = await healthCheck();
    originalSymbol = initialState.chart_symbol;

    const initialEditor = await ensurePineEditorAvailable({ symbol: 'NVDA' });
    if (!initialEditor.ready) {
      result = initialEditor.result;
      return result;
    }

    originalSource = (await getSource()).source;
    originalStudies = await fetchChartStudies();
    if (DEFAULT_RESTORE_POLICY !== RESTORE_POLICY.SKIP) {
      originalStudyTemplate = await snapshotChartStudyTemplate();
    }

    const symbolResult = await setActiveSymbol({ symbol: 'NVDA' });
    const chartSymbol = symbolResult.chart_symbol;

    await getCurrentPrice({ symbol: 'NVDA' });
    const runtimeEditor = await ensurePineEditorAvailable({ symbol: chartSymbol });
    if (!runtimeEditor.ready) {
      result = runtimeEditor.result;
      return result;
    }
    await dismissTransientDialogs();
    if (
      DEFAULT_RESTORE_POLICY !== RESTORE_POLICY.SKIP &&
      !canSafelyClearStudies({ existingStudies: originalStudies, studyTemplateSnapshot: originalStudyTemplate })
    ) {
      throw new Error('Cannot safely clear chart studies because TradingView study template snapshot is unavailable');
    }
    await clearChartStudies();
    const studiesBeforeCompile = await fetchChartStudies();
    await setSource({ source });

    let compileResult = await smartCompile();
    if (compileResult.has_errors) {
      result = buildResult({
        compileSuccess: false,
        compileErrors: compileResult.errors,
        symbol: chartSymbol,
      });
      return result;
    }

    // -- Verify strategy is actually attached to chart --
    let strategyAttached = false;
    const studiesAfterCompile = await fetchChartStudies();
    const verifyResult = verifyStrategyAttachmentChange(
      studiesBeforeCompile,
      studiesAfterCompile,
      STRATEGY_TITLE,
      compileResult.study_added,
    );
    strategyAttached = verifyResult.attached;
    let applyFailureReason =
      verifyResult.reason === 'preexisting_matching_strategy_only'
        ? 'Matching strategy was already on chart before run, and this run could not verify a new or updated attachment'
        : 'Strategy not verified in chart studies after compile + retry';

    if (!strategyAttached) {
      const retryResult = await retryApplyStrategy(STRATEGY_TITLE);
      strategyAttached = retryResult.applied;
    }

    if (!strategyAttached) {
      const recovery = await recoverFromStudyLimit({ source, strategyTitle: STRATEGY_TITLE });
      if (recovery.attempted) {
        compileResult = recovery.compileResult;
        if (compileResult.has_errors) {
          result = buildResult({
            compileSuccess: false,
            compileErrors: compileResult.errors,
            symbol: chartSymbol,
          });
          return result;
        }
        strategyAttached = recovery.strategyAttached;
        applyFailureReason =
          recovery.verifyReason === 'preexisting_matching_strategy_only'
            ? 'Matching strategy was already on chart before run, and this run could not verify a new or updated attachment'
            : 'Strategy not verified in chart studies after compile + retry';
      }
    }

    if (!strategyAttached) {
      const fallback = await readNvdaMaFallbackMetricsPayload();
      result = attachFallbackMetrics(buildResult({
        compileSuccess: true,
        compileDetail: compileResult,
        applyFailed: true,
        applyReason: applyFailureReason,
        testerAvailable: false,
        testerReason: 'Skipped: strategy not applied',
        symbol: chartSymbol,
      }), {
        fallbackMetrics: fallback?.metrics,
        fallbackSource: fallback?.source,
      });
      return result;
    }

    // -- Strategy attached — open Strategy Tester --
    let wsListener = null;
    try {
      wsListener = await startWsReportListener();
    } catch {
      // WS listener failure is non-fatal — proceed without it
    }

    try {
      const testerOpenState = await openStrategyTester();
      if (!testerOpenState.attempted) {
        result = buildResult({
          compileSuccess: true,
          compileDetail: compileResult,
          applyFailed: false,
          testerAvailable: false,
          testerReason: 'Strategy Tester panel could not be opened',
          testerReasonCategory: 'panel_not_visible',
          symbol: chartSymbol,
        });
        return result;
      }
      await activateTesterMetricsTab();

      const { rawMetrics, testerState, failure: testerReadFailure } = await readTesterMetricsWithRetries({
        testerOpenState,
      });

      if (!rawMetrics) {
        const failure = testerReadFailure || classifyTesterReadFailure({
          testerState,
          hasApiResult: false,
          hasDomResult: false,
        });
        const noStrategyReported = failure.category === 'no_strategy_applied';

        const wsFallback = failure.category === 'metrics_unreadable'
          ? readWsReportFallbackMetrics(wsListener)
          : null;

        const fallback = wsFallback || await readNvdaMaFallbackMetricsPayload();
        result = attachFallbackMetrics(buildResult({
          compileSuccess: true,
          compileDetail: compileResult,
          applyFailed: noStrategyReported,
          applyReason: noStrategyReported
            ? 'TradingView reports no strategy is applied to the chart (detected after tester open)'
            : undefined,
          testerAvailable: false,
          testerReason: failure.reason,
          testerReasonCategory: failure.category,
          symbol: chartSymbol,
        }), {
          testerReasonCategory: failure.category,
          fallbackMetrics: fallback?.metrics,
          fallbackSource: fallback?.source,
        });
        return result;
      }

      result = buildResult({
        compileSuccess: true,
        compileDetail: compileResult,
        applyFailed: false,
        testerAvailable: true,
        metrics: rawMetrics,
        symbol: chartSymbol,
      });
      return result;
    } finally {
      if (wsListener) wsListener.stop();
    }
  } catch (err) {
    if (isPineEditorUnavailableError(err)) {
      result = await buildEditorOpenFailureResult({
        symbol: 'NVDA',
        fallbackReason: err.message,
      });
      return result;
    }
    throw err;
  } finally {
    await performRestore({
      policy: DEFAULT_RESTORE_POLICY,
      originalSymbol,
      targetSymbol: 'NVDA',
      originalSource,
      originalStudyTemplate,
      result,
    });
  }
}

// ---------------------------------------------------------------------------
// Preset loader (pure — unit testable)
// ---------------------------------------------------------------------------
const PRESETS_PATH = join(__dirname, '..', '..', 'config', 'backtest', 'strategy-presets.json');

export async function loadPreset(presetId, { dateOverride } = {}) {
  const raw = await readFile(PRESETS_PATH, 'utf8');
  const data = JSON.parse(raw);

  const preset = data.strategies.find((s) => s.id === presetId);
  if (!preset) {
    throw new Error(`Preset "${presetId}" not found in strategy-presets.json`);
  }

  const validation = validatePreset(preset);
  if (!validation.valid) {
    throw new Error(
      `Preset "${presetId}" failed validation: ${validation.errors.join('; ')}`,
    );
  }

  const effectiveDefaults = mergeDateOverride(data.common_defaults, dateOverride);
  const dateValidation = validateDateRange(effectiveDefaults.date_range);
  if (!dateValidation.valid) {
    throw new Error(
      `Preset "${presetId}" date override failed validation: ${dateValidation.errors.join('; ')}`,
    );
  }

  let source;
  try {
    source = buildResearchStrategySource(preset, effectiveDefaults);
  } catch (err) {
    throw new Error(`Preset "${presetId}" is not executable by repo CLI: ${err.message}`);
  }

  return { preset, defaults: effectiveDefaults, source };
}

// ---------------------------------------------------------------------------
// Preset-driven backtest orchestration
// ---------------------------------------------------------------------------
export async function runPresetBacktest({ presetId, symbol = 'NVDA', dateOverride } = {}) {
  const { preset, source } = await loadPreset(presetId, { dateOverride });
  const strategyTitle = preset.name;
  let originalSymbol = null;
  let originalSource = null;
  let originalStudies = [];
  let originalStudyTemplate = null;
  let result;

  try {
    const initialState = await healthCheck();
    originalSymbol = initialState.chart_symbol;

    const initialEditor = await ensurePineEditorAvailable({ symbol });
    if (!initialEditor.ready) {
      result = initialEditor.result;
      return result;
    }

    originalSource = (await getSource()).source;
    originalStudies = await fetchChartStudies();
    if (DEFAULT_RESTORE_POLICY !== RESTORE_POLICY.SKIP) {
      originalStudyTemplate = await snapshotChartStudyTemplate();
    }

    const symbolResult = await setActiveSymbol({ symbol });
    const chartSymbol = symbolResult.chart_symbol;

    await getCurrentPrice({ symbol });
    const runtimeEditor = await ensurePineEditorAvailable({ symbol: chartSymbol });
    if (!runtimeEditor.ready) {
      result = runtimeEditor.result;
      return result;
    }
    await dismissTransientDialogs();
    if (
      DEFAULT_RESTORE_POLICY !== RESTORE_POLICY.SKIP &&
      !canSafelyClearStudies({ existingStudies: originalStudies, studyTemplateSnapshot: originalStudyTemplate })
    ) {
      throw new Error('Cannot safely clear chart studies because TradingView study template snapshot is unavailable');
    }
    await clearChartStudies();
    const studiesBeforeCompile = await fetchChartStudies();
    await setSource({ source });

    let compileResult = await smartCompile();
    if (compileResult.has_errors) {
      result = buildResult({
        compileSuccess: false,
        compileErrors: compileResult.errors,
        symbol: chartSymbol,
      });
      return result;
    }

    let strategyAttached = false;
    const studiesAfterCompile = await fetchChartStudies();
    const verifyResult = verifyStrategyAttachmentChange(
      studiesBeforeCompile,
      studiesAfterCompile,
      strategyTitle,
      compileResult.study_added,
    );
    strategyAttached = verifyResult.attached;
    let applyFailureReason =
      verifyResult.reason === 'preexisting_matching_strategy_only'
        ? 'Matching strategy was already on chart before run, and this run could not verify a new or updated attachment'
        : 'Strategy not verified in chart studies after compile + retry';

    if (!strategyAttached) {
      const retryResult = await retryApplyStrategy(strategyTitle);
      strategyAttached = retryResult.applied;
    }

    if (!strategyAttached) {
      const recovery = await recoverFromStudyLimit({ source, strategyTitle });
      if (recovery.attempted) {
        compileResult = recovery.compileResult;
        if (compileResult.has_errors) {
          result = buildResult({
            compileSuccess: false,
            compileErrors: compileResult.errors,
            symbol: chartSymbol,
          });
          return result;
        }
        strategyAttached = recovery.strategyAttached;
        applyFailureReason =
          recovery.verifyReason === 'preexisting_matching_strategy_only'
            ? 'Matching strategy was already on chart before run, and this run could not verify a new or updated attachment'
            : 'Strategy not verified in chart studies after compile + retry';
      }
    }

    if (!strategyAttached) {
      result = buildResult({
        compileSuccess: true,
        compileDetail: compileResult,
        applyFailed: true,
        applyReason: applyFailureReason,
        testerAvailable: false,
        testerReason: 'Skipped: strategy not applied',
        symbol: chartSymbol,
      });
      return result;
    }

    let wsListener = null;
    try {
      wsListener = await startWsReportListener();
    } catch {
      // WS listener failure is non-fatal — proceed without it
    }

    try {
      const testerOpenState = await openStrategyTester();
      if (!testerOpenState.attempted) {
        result = buildResult({
          compileSuccess: true,
          compileDetail: compileResult,
          applyFailed: false,
          testerAvailable: false,
          testerReason: 'Strategy Tester panel could not be opened',
          testerReasonCategory: 'panel_not_visible',
          symbol: chartSymbol,
        });
        return result;
      }
      await activateTesterMetricsTab();

      const { rawMetrics, testerState, failure: testerReadFailure } = await readTesterMetricsWithRetries({
        testerOpenState,
      });

      if (!rawMetrics) {
        const failure = testerReadFailure || classifyTesterReadFailure({
          testerState,
          hasApiResult: false,
          hasDomResult: false,
        });
        const noStrategyReported = failure.category === 'no_strategy_applied';
        const wsFallback = failure.category === 'metrics_unreadable'
          ? readWsReportFallbackMetrics(wsListener)
          : null;
        result = attachFallbackMetrics(buildResult({
          compileSuccess: true,
          compileDetail: compileResult,
          applyFailed: noStrategyReported,
          applyReason: noStrategyReported
            ? 'TradingView reports no strategy is applied to the chart (detected after tester open)'
            : undefined,
          testerAvailable: false,
          testerReason: failure.reason,
          testerReasonCategory: failure.category,
          symbol: chartSymbol,
        }), {
          testerReasonCategory: failure.category,
          fallbackMetrics: wsFallback?.metrics,
          fallbackSource: wsFallback?.source,
        });
        return result;
      }

      result = buildResult({
        compileSuccess: true,
        compileDetail: compileResult,
        applyFailed: false,
        testerAvailable: true,
        metrics: rawMetrics,
        symbol: chartSymbol,
      });
      return result;
    } finally {
      if (wsListener) wsListener.stop();
    }
  } catch (err) {
    if (isPineEditorUnavailableError(err)) {
      result = await buildEditorOpenFailureResult({
        symbol,
        fallbackReason: err.message,
      });
      return result;
    }
    throw err;
  } finally {
    await performRestore({
      policy: DEFAULT_RESTORE_POLICY,
      originalSymbol,
      targetSymbol: symbol,
      originalSource,
      originalStudyTemplate,
      result,
    });
  }
}
