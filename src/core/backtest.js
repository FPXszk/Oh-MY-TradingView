import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { evaluate, getClient } from '../connection.js';
import { healthCheck } from './health.js';
import { setActiveSymbol, getCurrentPrice, symbolMatches } from './price.js';
import {
  ensurePineEditorOpen,
  getSource,
  setSource,
  smartCompile,
  fetchChartStudies,
  verifyStrategyAttachmentChange,
  retryApplyStrategy,
} from './pine.js';
import { validatePreset } from './preset-validation.js';
import { buildResearchStrategySource } from './research-backtest.js';

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

function calculateSma(values, period, index) {
  if (index < period - 1) return null;
  let sum = 0;
  for (let offset = index - period + 1; offset <= index; offset += 1) {
    sum += values[offset];
  }
  return sum / period;
}

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

// ---------------------------------------------------------------------------
// Result builder
// ---------------------------------------------------------------------------
export function buildResult({
  compileSuccess,
  compileDetail,
  compileErrors,
  applyFailed,
  applyReason,
  testerAvailable,
  testerReason,
  testerReasonCategory,
  metrics,
  symbol,
}) {
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

  const restored = await evaluate(`
    (async function() {
      try {
        var chart = window.TradingViewApi._activeChartWidgetWV.value();
        if (!chart || typeof chart.applyStudyTemplate !== 'function' || typeof chart.removeAllStudies !== 'function') {
          return { ok: false, error: 'Study template restore API unavailable' };
        }

        var template = JSON.parse(${JSON.stringify(snapshot.content)});
        var removed = chart.removeAllStudies();
        if (removed && typeof removed.then === 'function') {
          await removed;
        }
        await new Promise(function(resolve) { setTimeout(resolve, 1000); });

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

  if (!restored?.ok) {
    throw new Error(restored?.error || 'TradingView study template restore failed');
  }
}

async function recoverFromStudyLimit({ source }) {
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
    STRATEGY_TITLE,
    compileResult.study_added,
  );

  let strategyAttached = verifyResult.attached;
  if (!strategyAttached) {
    const retryResult = await retryApplyStrategy(STRATEGY_TITLE);
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

// ---------------------------------------------------------------------------
// Main orchestration
// ---------------------------------------------------------------------------
const TESTER_READ_RETRIES = 3;
const TESTER_READ_DELAY = 2000;

export async function runNvdaMaBacktest() {
  const initialState = await healthCheck();
  const originalSymbol = initialState.chart_symbol;
  const originalSource = (await getSource()).source;
  const originalStudies = await fetchChartStudies();
  const originalStudyTemplate = await snapshotChartStudyTemplate();
  const source = buildNvdaMaSource();
  let result;

  try {
    const symbolResult = await setActiveSymbol({ symbol: 'NVDA' });
    const chartSymbol = symbolResult.chart_symbol;

    await getCurrentPrice({ symbol: 'NVDA' });
    await ensurePineEditorOpen();
    await dismissTransientDialogs();
    if (!canSafelyClearStudies({ existingStudies: originalStudies, studyTemplateSnapshot: originalStudyTemplate })) {
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
      const recovery = await recoverFromStudyLimit({ source });
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
      const fallbackBars = await readChartBars();
      const fallbackMetrics = runLocalFallbackBacktest(fallbackBars);
      result = buildResult({
        compileSuccess: true,
        compileDetail: compileResult,
        applyFailed: true,
        applyReason: applyFailureReason,
        testerAvailable: false,
        testerReason: 'Skipped: strategy not applied',
        symbol: chartSymbol,
      });
      if (fallbackMetrics) {
        result.fallback_source = 'chart_bars_local';
        result.fallback_metrics = fallbackMetrics;
      }
      return result;
    }

    // -- Strategy attached — open Strategy Tester --
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

    let rawMetrics = null;
    let testerState = testerOpenState.confirmedVisible
      ? { text: '', no_strategy: false, panel_visible: true }
      : null;
    for (let i = 0; i < TESTER_READ_RETRIES; i++) {
      await new Promise((r) => setTimeout(r, TESTER_READ_DELAY));
      rawMetrics = await readTesterMetricsFromInternalApi();
      if (!rawMetrics) {
        rawMetrics = await readTesterMetricsFromDom();
      }
      testerState = await readTesterState();
      if (rawMetrics) break;
      if (testerState?.no_strategy) break;
    }

    if (!rawMetrics) {
      const failure = classifyTesterReadFailure({
        testerState,
        hasApiResult: false,
        hasDomResult: false,
      });
      const noStrategyReported = failure.category === 'no_strategy_applied';
      const fallbackBars = await readChartBars();
      const fallbackMetrics = runLocalFallbackBacktest(fallbackBars);
      result = buildResult({
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
      });
      if (fallbackMetrics) {
        result.fallback_source = 'chart_bars_local';
        result.fallback_metrics = fallbackMetrics;
      }
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
    const restoreIssues = [];

    if (originalSymbol && !symbolMatches(originalSymbol, 'NVDA')) {
      try {
        await setActiveSymbol({ symbol: originalSymbol });
      } catch (err) {
        restoreIssues.push(`symbol restore failed: ${err.message}`);
      }
    }

    try {
      await ensurePineEditorOpen();
      await setSource({ source: originalSource });
    } catch (err) {
      restoreIssues.push(`source restore failed: ${err.message}`);
    }

    try {
      await restoreChartStudyTemplate(originalStudyTemplate);
    } catch (err) {
      restoreIssues.push(`study template restore failed: ${err.message}`);
    }

    try {
      await restorePineEditor();
    } catch (err) {
      restoreIssues.push(`pine editor restore failed: ${err.message}`);
    }

    if (result) {
      result.restore_success = restoreIssues.length === 0;
      if (restoreIssues.length > 0) {
        result.restore_error = restoreIssues.join('; ');
      }
    } else if (restoreIssues.length > 0) {
      throw new Error(`Backtest completed, but state restore failed: ${restoreIssues.join('; ')}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Preset loader (pure — unit testable)
// ---------------------------------------------------------------------------
const PRESETS_PATH = join(__dirname, '..', '..', 'config', 'backtest', 'strategy-presets.json');

export async function loadPreset(presetId) {
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

  return { preset, defaults: data.common_defaults };
}

// ---------------------------------------------------------------------------
// Preset-driven backtest orchestration
// ---------------------------------------------------------------------------
export async function runPresetBacktest({ presetId, symbol = 'NVDA' }) {
  const { preset, defaults } = await loadPreset(presetId);
  const strategyTitle = preset.name;
  const source = buildResearchStrategySource(preset, defaults);

  const initialState = await healthCheck();
  const originalSymbol = initialState.chart_symbol;
  const originalSource = (await getSource()).source;
  const originalStudies = await fetchChartStudies();
  const originalStudyTemplate = await snapshotChartStudyTemplate();
  let result;

  try {
    const symbolResult = await setActiveSymbol({ symbol });
    const chartSymbol = symbolResult.chart_symbol;

    await getCurrentPrice({ symbol });
    await ensurePineEditorOpen();
    await dismissTransientDialogs();
    if (!canSafelyClearStudies({ existingStudies: originalStudies, studyTemplateSnapshot: originalStudyTemplate })) {
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
      const recovery = await recoverFromStudyLimit({ source });
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

    let rawMetrics = null;
    let testerState = testerOpenState.confirmedVisible
      ? { text: '', no_strategy: false, panel_visible: true }
      : null;
    for (let i = 0; i < TESTER_READ_RETRIES; i++) {
      await new Promise((r) => setTimeout(r, TESTER_READ_DELAY));
      rawMetrics = await readTesterMetricsFromInternalApi();
      if (!rawMetrics) {
        rawMetrics = await readTesterMetricsFromDom();
      }
      testerState = await readTesterState();
      if (rawMetrics) break;
      if (testerState?.no_strategy) break;
    }

    if (!rawMetrics) {
      const failure = classifyTesterReadFailure({
        testerState,
        hasApiResult: false,
        hasDomResult: false,
      });
      const noStrategyReported = failure.category === 'no_strategy_applied';
      result = buildResult({
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
    const restoreIssues = [];

    if (originalSymbol && !symbolMatches(originalSymbol, symbol)) {
      try {
        await setActiveSymbol({ symbol: originalSymbol });
      } catch (err) {
        restoreIssues.push(`symbol restore failed: ${err.message}`);
      }
    }

    try {
      await ensurePineEditorOpen();
      await setSource({ source: originalSource });
    } catch (err) {
      restoreIssues.push(`source restore failed: ${err.message}`);
    }

    try {
      await restoreChartStudyTemplate(originalStudyTemplate);
    } catch (err) {
      restoreIssues.push(`study template restore failed: ${err.message}`);
    }

    try {
      await restorePineEditor();
    } catch (err) {
      restoreIssues.push(`pine editor restore failed: ${err.message}`);
    }

    if (result) {
      result.restore_success = restoreIssues.length === 0;
      if (restoreIssues.length > 0) {
        result.restore_error = restoreIssues.join('; ');
      }
    } else if (restoreIssues.length > 0) {
      throw new Error(`Backtest completed, but state restore failed: ${restoreIssues.join('; ')}`);
    }
  }
}
