import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  buildNvdaMaSource,
  normalizeMetrics,
  buildResult,
  runLocalFallbackBacktest,
  classifyTesterReadFailure,
  canSafelyClearStudies,
  hasStudyLimitDialog,
  isTesterPanelStateVisible,
} from '../src/core/backtest.js';
import { buildResearchStrategySource } from '../src/core/research-backtest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadPresets() {
  const raw = await readFile(
    join(__dirname, '..', 'config', 'backtest', 'strategy-presets.json'),
    'utf8',
  );
  return JSON.parse(raw);
}

// ---------------------------------------------------------------------------
// buildNvdaMaSource
// ---------------------------------------------------------------------------
describe('buildNvdaMaSource', () => {
  it('returns a non-empty string', () => {
    const src = buildNvdaMaSource();
    assert.ok(typeof src === 'string');
    assert.ok(src.length > 0);
  });

  it('targets Pine v6', () => {
    const src = buildNvdaMaSource();
    assert.ok(src.includes('//@version=6'));
  });

  it('contains a strategy() declaration', () => {
    const src = buildNvdaMaSource();
    assert.ok(src.includes('strategy('));
  });

  it('uses ta.sma with period 5 and 20', () => {
    const src = buildNvdaMaSource();
    assert.ok(src.includes('ta.sma(close, 5)'));
    assert.ok(src.includes('ta.sma(close, 20)'));
  });

  it('uses ta.crossover for entry and ta.crossunder for exit', () => {
    const src = buildNvdaMaSource();
    assert.ok(src.includes('ta.crossover('));
    assert.ok(src.includes('ta.crossunder('));
  });

  it('contains strategy.entry and strategy.close calls', () => {
    const src = buildNvdaMaSource();
    assert.ok(src.includes('strategy.entry('));
    assert.ok(src.includes('strategy.close('));
  });
});

// ---------------------------------------------------------------------------
// normalizeMetrics
// ---------------------------------------------------------------------------
describe('normalizeMetrics', () => {
  it('normalises a full raw metrics object', () => {
    const raw = {
      net_profit: '$1,234.56',
      closed_trades: '42',
      percent_profitable: '61.90%',
      profit_factor: '1.85',
      max_drawdown: '$500.00',
    };
    const m = normalizeMetrics(raw);
    assert.equal(m.net_profit, '$1,234.56');
    assert.equal(m.closed_trades, '42');
    assert.equal(m.percent_profitable, '61.90%');
    assert.equal(m.profit_factor, '1.85');
    assert.equal(m.max_drawdown, '$500.00');
  });

  it('returns null fields for missing keys', () => {
    const m = normalizeMetrics({});
    assert.equal(m.net_profit, null);
    assert.equal(m.closed_trades, null);
    assert.equal(m.percent_profitable, null);
    assert.equal(m.profit_factor, null);
    assert.equal(m.max_drawdown, null);
  });

  it('handles partial data without throwing', () => {
    const m = normalizeMetrics({ net_profit: '+$100', profit_factor: '2.5' });
    assert.equal(m.net_profit, '+$100');
    assert.equal(m.profit_factor, '2.5');
    assert.equal(m.closed_trades, null);
  });

  it('reads nested TradingView performance payloads', () => {
    const m = normalizeMetrics({
      performance: {
        all: {
          netProfit: 9549987.59,
          totalTrades: 154,
          percentProfitable: 0.3636363636,
          profitFactor: 1.4566944756,
        },
        maxStrategyDrawDown: 4792475.62,
      },
    });
    assert.equal(m.net_profit, 9549987.59);
    assert.equal(m.closed_trades, 154);
    assert.equal(m.percent_profitable, 36.36);
    assert.equal(m.profit_factor, 1.4566944756);
    assert.equal(m.max_drawdown, 4792475.62);
  });

  it('handles null / undefined input gracefully', () => {
    assert.doesNotThrow(() => normalizeMetrics(null));
    assert.doesNotThrow(() => normalizeMetrics(undefined));
    const m = normalizeMetrics(null);
    assert.equal(m.net_profit, null);
  });
});

// ---------------------------------------------------------------------------
// buildResult — compile succeeded + tester available
// ---------------------------------------------------------------------------
describe('buildResult', () => {
  it('returns success with tester metrics when available', () => {
    const r = buildResult({
      compileSuccess: true,
      compileDetail: { button_clicked: 'Add to chart' },
      testerAvailable: true,
      metrics: {
        net_profit: '$500',
        closed_trades: '10',
        percent_profitable: '60%',
        profit_factor: '1.5',
        max_drawdown: '$100',
      },
      symbol: 'NASDAQ:NVDA',
    });
    assert.equal(r.success, true);
    assert.equal(r.tester_available, true);
    assert.equal(r.metrics.net_profit, '$500');
    assert.equal(r.symbol, 'NASDAQ:NVDA');
  });

  it('returns success with tester unavailable when metrics missing', () => {
    const r = buildResult({
      compileSuccess: true,
      compileDetail: { button_clicked: 'Add to chart' },
      testerAvailable: false,
      testerReason: 'Strategy Tester panel could not be opened',
      symbol: 'NASDAQ:NVDA',
    });
    assert.equal(r.success, true);
    assert.equal(r.tester_available, false);
    assert.ok(r.tester_reason);
    assert.equal(r.metrics, undefined);
  });

  it('returns failure when compile had errors', () => {
    const r = buildResult({
      compileSuccess: false,
      compileErrors: [{ line: 1, message: 'syntax error' }],
      symbol: 'NASDAQ:NVDA',
    });
    assert.equal(r.success, false);
    assert.ok(r.compile_errors.length > 0);
  });

  it('includes apply_failed:true when strategy apply failed', () => {
    const r = buildResult({
      compileSuccess: true,
      compileDetail: { button_clicked: 'keyboard_shortcut' },
      applyFailed: true,
      applyReason: 'Strategy not found in chart studies after compile + retry',
      testerAvailable: false,
      testerReason: 'Skipped: strategy not applied',
      symbol: 'NASDAQ:NVDA',
    });
    assert.equal(r.success, true);
    assert.equal(r.apply_failed, true);
    assert.equal(r.apply_reason, 'Strategy not found in chart studies after compile + retry');
    assert.equal(r.tester_available, false);
  });

  it('includes apply_failed:false when strategy apply succeeded', () => {
    const r = buildResult({
      compileSuccess: true,
      compileDetail: { button_clicked: 'Add to chart' },
      applyFailed: false,
      testerAvailable: true,
      metrics: { net_profit: '$500' },
      symbol: 'NASDAQ:NVDA',
    });
    assert.equal(r.success, true);
    assert.equal(r.apply_failed, false);
    assert.equal(r.apply_reason, undefined);
  });

  it('omits apply_failed when not provided (backward compat)', () => {
    const r = buildResult({
      compileSuccess: true,
      compileDetail: { button_clicked: 'Add to chart' },
      testerAvailable: true,
      metrics: { net_profit: '$500' },
      symbol: 'NASDAQ:NVDA',
    });
    assert.equal(r.apply_failed, undefined);
  });

  it('separates apply failure from tester read failure', () => {
    const rApply = buildResult({
      compileSuccess: true,
      applyFailed: true,
      applyReason: 'Strategy not attached',
      testerAvailable: false,
      testerReason: 'Skipped: strategy not applied',
      symbol: 'NASDAQ:NVDA',
    });
    assert.equal(rApply.apply_failed, true);
    assert.equal(rApply.tester_reason, 'Skipped: strategy not applied');

    const rTester = buildResult({
      compileSuccess: true,
      applyFailed: false,
      testerAvailable: false,
      testerReason: 'Strategy Tester opened but metrics could not be read',
      symbol: 'NASDAQ:NVDA',
    });
    assert.equal(rTester.apply_failed, false);
    assert.equal(rTester.tester_reason, 'Strategy Tester opened but metrics could not be read');
  });
});

// ---------------------------------------------------------------------------
// classifyTesterReadFailure
// ---------------------------------------------------------------------------
describe('classifyTesterReadFailure', () => {
  it('returns panel_not_visible when testerState is null', () => {
    const result = classifyTesterReadFailure({
      testerState: null,
      hasApiResult: false,
      hasDomResult: false,
    });
    assert.equal(result.category, 'panel_not_visible');
    assert.ok(result.reason);
  });

  it('returns no_strategy_applied when tester reports no strategy', () => {
    const result = classifyTesterReadFailure({
      testerState: { text: 'Apply a strategy to your chart', no_strategy: true },
      hasApiResult: false,
      hasDomResult: false,
    });
    assert.equal(result.category, 'no_strategy_applied');
    assert.ok(result.reason.toLowerCase().includes('no strategy'));
  });

  it('returns metrics_unreadable when both API and DOM fail', () => {
    const result = classifyTesterReadFailure({
      testerState: { text: 'Net Profit ...', no_strategy: false },
      hasApiResult: false,
      hasDomResult: false,
    });
    assert.equal(result.category, 'metrics_unreadable');
    assert.ok(result.reason);
  });

  it('returns unknown when hasApiResult is unexpectedly true', () => {
    const result = classifyTesterReadFailure({
      testerState: { text: '', no_strategy: false },
      hasApiResult: true,
      hasDomResult: false,
    });
    assert.ok(result.category);
    assert.ok(result.reason);
  });
});

describe('hasStudyLimitDialog', () => {
  it('detects the Japanese indicator-limit dialog text', () => {
    const result = hasStudyLimitDialog([
      'より多くのインジケーターで、より多くのトレードの可能性を すでに5個のインジケーターを適用しています ― 現在のプランでご利用いただける上限です。',
    ]);
    assert.equal(result, true);
  });

  it('returns false for unrelated dialogs', () => {
    const result = hasStudyLimitDialog([
      'スクリプトを保存 スクリプト名 保存 キャンセル',
      'インジケーター、指標、ストラテジー ここにはまだ個人のスクリプトはありません',
    ]);
    assert.equal(result, false);
  });
});

describe('canSafelyClearStudies', () => {
  it('allows clearing when there are no existing studies', () => {
    assert.equal(
      canSafelyClearStudies({ existingStudies: [], studyTemplateSnapshot: null }),
      true,
    );
  });

  it('allows clearing when a study template snapshot exists', () => {
    assert.equal(
      canSafelyClearStudies({ existingStudies: [{ id: 's1', name: 'BB' }], studyTemplateSnapshot: { content: '{}' } }),
      true,
    );
  });

  it('blocks clearing when studies exist and no snapshot is available', () => {
    assert.equal(
      canSafelyClearStudies({ existingStudies: [{ id: 's1', name: 'BB' }], studyTemplateSnapshot: null }),
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// isTesterPanelStateVisible
// ---------------------------------------------------------------------------
describe('isTesterPanelStateVisible', () => {
  it('returns true when panel_visible is true', () => {
    assert.equal(
      isTesterPanelStateVisible({ panel_visible: true, no_strategy: false, text: '' }),
      true,
    );
  });

  it('returns true when tester shows no-strategy guidance', () => {
    assert.equal(
      isTesterPanelStateVisible({
        panel_visible: false,
        no_strategy: true,
        text: 'Apply a strategy to your chart',
      }),
      true,
    );
  });

  it('returns false when tester state has no visible signal', () => {
    assert.equal(
      isTesterPanelStateVisible({ panel_visible: false, no_strategy: false, text: '' }),
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// buildResult — tester_reason_category support
// ---------------------------------------------------------------------------
describe('buildResult — tester_reason_category', () => {
  it('includes tester_reason_category when provided', () => {
    const r = buildResult({
      compileSuccess: true,
      testerAvailable: false,
      testerReason: 'Strategy Tester opened but metrics could not be read',
      testerReasonCategory: 'metrics_unreadable',
      symbol: 'NASDAQ:NVDA',
    });
    assert.equal(r.tester_reason_category, 'metrics_unreadable');
    assert.equal(r.tester_reason, 'Strategy Tester opened but metrics could not be read');
  });

  it('omits tester_reason_category when tester is available', () => {
    const r = buildResult({
      compileSuccess: true,
      testerAvailable: true,
      metrics: { net_profit: '$500' },
      testerReasonCategory: 'metrics_unreadable',
      symbol: 'NASDAQ:NVDA',
    });
    assert.equal(r.tester_reason_category, undefined);
  });

  it('preserves tester_reason when fallback is added externally', () => {
    const r = buildResult({
      compileSuccess: true,
      applyFailed: false,
      testerAvailable: false,
      testerReason: 'Strategy Tester opened but metrics could not be read from internal API or DOM',
      testerReasonCategory: 'metrics_unreadable',
      symbol: 'NASDAQ:NVDA',
    });
    r.fallback_source = 'chart_bars_local';
    r.fallback_metrics = { net_profit: 100, closed_trades: 5 };

    assert.equal(r.tester_reason, 'Strategy Tester opened but metrics could not be read from internal API or DOM');
    assert.equal(r.tester_reason_category, 'metrics_unreadable');
    assert.ok(r.fallback_metrics);
  });

  it('infers apply_failed when tester reports no strategy applied', () => {
    const r = buildResult({
      compileSuccess: true,
      compileDetail: { button_clicked: 'Add to chart' },
      testerAvailable: false,
      testerReason: 'TradingView reports no strategy is applied to the chart',
      testerReasonCategory: 'no_strategy_applied',
      symbol: 'NASDAQ:NVDA',
    });
    assert.equal(r.apply_failed, true);
    assert.ok(r.apply_reason);
    assert.equal(r.tester_reason_category, 'no_strategy_applied');
  });
});

describe('runLocalFallbackBacktest', () => {
  it('returns fallback metrics for valid bars', () => {
    const bars = [
      { open: 10, close: 10 },
      { open: 10, close: 10 },
      { open: 10, close: 10 },
      { open: 10, close: 10 },
      { open: 10, close: 10 },
      { open: 10, close: 10 },
      { open: 10, close: 10 },
      { open: 10, close: 10 },
      { open: 10, close: 10 },
      { open: 10, close: 10 },
      { open: 10, close: 10 },
      { open: 10, close: 10 },
      { open: 10, close: 10 },
      { open: 10, close: 10 },
      { open: 10, close: 10 },
      { open: 10, close: 20 },
      { open: 20, close: 21 },
      { open: 21, close: 22 },
      { open: 22, close: 23 },
      { open: 23, close: 24 },
      { open: 24, close: 25 },
      { open: 25, close: 24 },
      { open: 24, close: 23 },
      { open: 23, close: 22 },
      { open: 22, close: 21 },
      { open: 21, close: 20 },
    ];

    const result = runLocalFallbackBacktest(bars);
    assert.ok(result);
    assert.equal(typeof result.net_profit, 'number');
    assert.equal(typeof result.closed_trades, 'number');
    assert.equal(typeof result.max_drawdown, 'number');
    assert.equal(result.bar_count, bars.length);
  });

  it('returns null when bars are insufficient', () => {
    assert.equal(runLocalFallbackBacktest([{ open: 1, close: 1 }]), null);
  });

  it('does not open a new trade on the final bar signal', () => {
    const bars = Array.from({ length: 20 }, () => ({ open: 100, close: 100 }));
    bars.push({ open: 100, close: 200 });

    const result = runLocalFallbackBacktest(bars);
    assert.equal(result.closed_trades, 0);
    assert.equal(result.net_profit, 0);
  });
});

describe('buildResearchStrategySource', () => {
  const defaults = {
    initial_capital: 10000,
    date_range: {
      from: '2015-01-01',
      to: '2025-12-31',
    },
  };

  it('builds breakout sources with no averaging down by default', () => {
    const source = buildResearchStrategySource({
      id: 'donchian-55-20-baseline',
      name: 'Donchian 55/20 Baseline',
      builder: 'donchian_breakout',
      parameters: {
        entry_period: 55,
        exit_period: 20,
      },
    }, defaults);

    assert.ok(source.includes('pyramiding=0'));
    assert.ok(source.includes('strategy.position_size <= 0'));
    assert.ok(source.includes('donchianUpper = ta.highest(high, 55)[1]'));
    assert.ok(source.includes('donchianLower = ta.lowest(low, 20)[1]'));
  });

  it('adds percent hard stop rules when requested', () => {
    const source = buildResearchStrategySource({
      id: 'donchian-55-20-hard-stop-8pct',
      name: 'Donchian 55/20 Hard Stop 8%',
      builder: 'donchian_breakout',
      parameters: {
        entry_period: 55,
        exit_period: 20,
      },
      stop_loss: {
        type: 'hard_percent',
        value: 8,
      },
    }, defaults);

    assert.ok(source.includes('stopLossPrice = strategy.position_avg_price * (1 - 0.08)'));
    assert.ok(source.includes('strategy.exit("Stop Loss", "Long", stop=stopLossPrice)'));
  });

  it('adds bollinger 2-sigma exits when requested', () => {
    const source = buildResearchStrategySource({
      id: 'keltner-breakout-2sigma-exit',
      name: 'Keltner Breakout 2 Sigma Exit',
      builder: 'keltner_breakout',
      parameters: {
        ema_period: 20,
        atr_period: 10,
        atr_mult: 1.5,
      },
      exit_overlay: {
        type: 'bollinger_2sigma_exit',
        bb_length: 20,
        bb_stddev: 2,
      },
    }, defaults);

    assert.ok(source.includes('[overlayBasis, overlayUpper, overlayLower] = ta.bb(close, 20, 2)'));
    assert.ok(source.includes('strategy.close("Long", comment="2sigma exit")'));
  });

  it('adds SPY regime filters with forced exits when requested', () => {
    const source = buildResearchStrategySource({
      id: 'donchian-55-20-spy-filter',
      name: 'Donchian 55/20 + SPY Filter',
      builder: 'donchian_breakout',
      parameters: {
        entry_period: 55,
        exit_period: 20,
      },
      regime_filter: {
        type: 'spy_above_sma200',
        reference_symbol: 'SPY',
        reference_ma_type: 'sma',
        reference_ma_period: 200,
        action_when_false: 'exit_all',
      },
    }, defaults);

    assert.ok(source.includes('request.security("BATS:SPY", timeframe.period, close)'));
    assert.ok(source.includes('regimeForceExit = true'));
    assert.ok(source.includes('strategy.close("Long", comment="Regime exit")'));
  });

  it('builds RSI mean-reversion sources for long-only presets', () => {
    const source = buildResearchStrategySource({
      id: 'rsi2-buy-10-sell-65-long-only',
      name: 'RSI 2 Buy 10 Sell 65 Long Only',
      builder: 'rsi_mean_reversion',
      parameters: {
        rsi_period: 2,
        entry_below: 10,
        exit_above: 65,
      },
    }, defaults);

    assert.ok(source.includes('rsiValue = ta.rsi(close, 2)'));
    assert.ok(source.includes('entrySignal = rsiValue < 10'));
    assert.ok(source.includes('exitSignal = rsiValue > 65'));
  });

  it('adds RSI regime guards when requested', () => {
    const source = buildResearchStrategySource({
      id: 'donchian-20-10-rsi14-regime-55-hard-stop-8pct',
      name: 'Donchian 20/10 + RSI14 Regime 55 + 8% Hard Stop',
      builder: 'donchian_breakout',
      parameters: {
        entry_period: 20,
        exit_period: 10,
      },
      rsi_regime_filter: {
        rsi_period: 14,
        threshold: 55,
        direction: 'above',
      },
    }, defaults);

    assert.ok(source.includes('rsiRegimeValue = ta.rsi(close, 14)'));
    assert.ok(source.includes('rsiRegimeOk = rsiRegimeValue > 55'));
    assert.ok(source.includes('allowEntry = inDateRange and regimeOk and rsiRegimeOk'));
  });

  it('combines market and RSI regime guards when both are requested', () => {
    const source = buildResearchStrategySource({
      id: 'donchian-55-20-rsi14-regime-50-spy-filter',
      name: 'Donchian 55/20 + RSI14 Regime 50 + SPY Filter',
      builder: 'donchian_breakout',
      parameters: {
        entry_period: 55,
        exit_period: 20,
      },
      regime_filter: {
        type: 'spy_above_sma200',
        reference_symbol: 'SPY',
        reference_ma_type: 'sma',
        reference_ma_period: 200,
        action_when_false: 'no_new_entry',
      },
      rsi_regime_filter: {
        rsi_period: 14,
        threshold: 50,
        direction: 'above',
      },
    }, defaults);

    assert.ok(source.includes('request.security("BATS:SPY", timeframe.period, close)'));
    assert.ok(source.includes('rsiRegimeValue = ta.rsi(close, 14)'));
    assert.ok(source.includes('allowEntry = inDateRange and regimeOk and rsiRegimeOk'));
  });

  it('supports round6 theme breakout combos with market, RSI, and stop guards together', () => {
    const source = buildResearchStrategySource({
      id: 'donchian-20-10-rsp-filter-rsi14-regime-55-hard-stop-6pct',
      name: 'Donchian 20/10 + RSP Filter + RSI14 Regime 55 + 6% Stop',
      builder: 'donchian_breakout',
      parameters: {
        entry_period: 20,
        exit_period: 10,
      },
      regime_filter: {
        type: 'rsp_above_sma200',
        reference_symbol: 'RSP',
        reference_ma_type: 'sma',
        reference_ma_period: 200,
        action_when_false: 'no_new_entry',
      },
      rsi_regime_filter: {
        rsi_period: 14,
        threshold: 55,
        direction: 'above',
      },
      stop_loss: {
        type: 'hard_percent',
        value: 6,
      },
    }, defaults);

    assert.ok(source.includes('request.security("BATS:RSP", timeframe.period, close)'));
    assert.ok(source.includes('rsiRegimeValue = ta.rsi(close, 14)'));
    assert.ok(source.includes('stopLossPrice = strategy.position_avg_price * (1 - 0.06)'));
    assert.ok(source.includes('allowEntry = inDateRange and regimeOk and rsiRegimeOk'));
  });

  it('supports round6 dip-reclaim RSI presets with breadth filters', () => {
    const source = buildResearchStrategySource({
      id: 'rsi2-buy-10-sell-65-rsp-filter-long-only',
      name: 'RSI2 Buy 10 Sell 65 + RSP Filter Long Only',
      builder: 'rsi_mean_reversion',
      parameters: {
        rsi_period: 2,
        entry_below: 10,
        exit_above: 65,
      },
      regime_filter: {
        type: 'rsp_above_sma200',
        reference_symbol: 'RSP',
        reference_ma_type: 'sma',
        reference_ma_period: 200,
        action_when_false: 'no_new_entry',
      },
    }, defaults);

    assert.ok(source.includes('request.security("BATS:RSP", timeframe.period, close)'));
    assert.ok(source.includes('rsiValue = ta.rsi(close, 2)'));
    assert.ok(source.includes('entrySignal = rsiValue < 10'));
    assert.ok(source.includes('allowEntry = inDateRange and regimeOk and rsiRegimeOk'));
  });

  it('builds round7 breadth-persistence preset sources from the preset catalog', async () => {
    const data = await loadPresets();
    const preset = data.strategies.find(
      (entry) => entry.id === 'donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-6pct-theme-breadth-quality',
    );

    assert.ok(preset, 'Expected round7 breadth-quality preset to exist');
    const source = buildResearchStrategySource(preset, defaults);

    assert.ok(source.includes('request.security("BATS:RSP", timeframe.period, close)'));
    assert.ok(source.includes('rsiRegimeOk = rsiRegimeValue > 50'));
    assert.ok(source.includes('stopLossPrice = strategy.position_avg_price * (1 - 0.06)'));
  });

  it('builds round7 dip-reclaim preset sources from the preset catalog', async () => {
    const data = await loadPresets();
    const preset = data.strategies.find(
      (entry) => entry.id === 'rsi3-buy-20-sell-70-spy-filter-long-only-theme-deep-dip',
    );

    assert.ok(preset, 'Expected round7 deep-dip preset to exist');
    const source = buildResearchStrategySource(preset, defaults);

    assert.ok(source.includes('request.security("BATS:SPY", timeframe.period, close)'));
    assert.ok(source.includes('rsiValue = ta.rsi(close, 3)'));
    assert.ok(source.includes('entrySignal = rsiValue < 20'));
    assert.ok(source.includes('exitSignal = rsiValue > 70'));
  });

  it('rejects unsupported regime filters in the generator', () => {
    assert.throws(() => buildResearchStrategySource({
      id: 'bad-regime',
      name: 'Bad Regime',
      builder: 'donchian_breakout',
      parameters: {
        entry_period: 20,
        exit_period: 10,
      },
      regime_filter: {
        type: 'vix_below_sma200',
        reference_symbol: 'VIX',
        reference_ma_type: 'sma',
        reference_ma_period: 200,
        action_when_false: 'no_new_entry',
      },
    }, defaults), /Unsupported regime filter/);
  });

  it('rejects unsupported RSI regime directions in the generator', () => {
    assert.throws(() => buildResearchStrategySource({
      id: 'bad-rsi-regime',
      name: 'Bad RSI Regime',
      builder: 'donchian_breakout',
      parameters: {
        entry_period: 20,
        exit_period: 10,
      },
      rsi_regime_filter: {
        rsi_period: 14,
        threshold: 55,
        direction: 'below',
      },
    }, defaults), /Unsupported RSI regime direction/);
  });
});
