import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildNvdaMaSource,
  normalizeMetrics,
  buildResult,
  runLocalFallbackBacktest,
} from '../src/core/backtest.js';

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
