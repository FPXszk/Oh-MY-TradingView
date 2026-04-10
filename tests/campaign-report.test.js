import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  summarizeStrategyRuns,
  summarizeSymbolRuns,
  summarizeMarketCampaign,
} from '../src/core/campaign-report.js';

const sampleRuns = [
  {
    presetId: 'strat-a',
    symbol: 'AAPL',
    market: 'US',
    label: 'Apple',
    result: {
      success: true,
      tester_available: true,
      metrics: {
        net_profit: 100,
        closed_trades: 10,
        percent_profitable: 60,
        profit_factor: 2.0,
        max_drawdown: 40,
      },
    },
  },
  {
    presetId: 'strat-a',
    symbol: 'MSFT',
    market: 'US',
    label: 'Microsoft',
    result: {
      success: true,
      tester_available: true,
      metrics: {
        net_profit: 20,
        closed_trades: 8,
        percent_profitable: 50,
        profit_factor: 1.2,
        max_drawdown: 20,
      },
    },
  },
  {
    presetId: 'strat-b',
    symbol: 'AAPL',
    market: 'US',
    label: 'Apple',
    result: {
      success: true,
      tester_available: true,
      metrics: {
        net_profit: 50,
        closed_trades: 12,
        percent_profitable: 58,
        profit_factor: 1.5,
        max_drawdown: 30,
      },
    },
  },
  {
    presetId: 'strat-b',
    symbol: 'NVDA',
    market: 'US',
    label: 'NVIDIA',
    result: {
      success: true,
      tester_available: true,
      metrics: {
        net_profit: 150,
        closed_trades: 14,
        percent_profitable: 65,
        profit_factor: 2.5,
        max_drawdown: 50,
      },
    },
  },
  {
    presetId: 'strat-b',
    symbol: 'MSFT',
    market: 'US',
    label: 'Microsoft',
    result: {
      success: true,
      tester_available: true,
      metrics: {
        net_profit: 10,
        closed_trades: 9,
        percent_profitable: 44,
        profit_factor: 1.1,
        max_drawdown: 25,
      },
    },
  },
];

describe('summarizeStrategyRuns', () => {
  it('aggregates strategy metrics, drawdown percent, and top or worst symbols', () => {
    const summaries = summarizeStrategyRuns(sampleRuns, { initialCapital: 10000 });
    assert.equal(summaries.length, 2);

    const stratA = summaries.find((entry) => entry.presetId === 'strat-a');
    assert.ok(stratA);
    assert.equal(stratA.run_count, 2);
    assert.equal(stratA.success_count, 2);
    assert.equal(stratA.avg_net_profit, 60);
    assert.equal(stratA.median_net_profit, 60);
    assert.equal(stratA.avg_profit_factor, 1.6);
    assert.equal(stratA.avg_max_drawdown, 30);
    assert.equal(stratA.avg_max_drawdown_pct, 0.3);
    assert.equal(stratA.avg_closed_trades, 9);
    assert.equal(stratA.avg_percent_profitable, 55);
    assert.equal(stratA.positive_run_rate, 100);
    assert.equal(stratA.profit_to_drawdown_ratio, 2);
    assert.deepEqual(
      stratA.top_symbols.map((entry) => entry.symbol),
      ['AAPL', 'MSFT'],
    );
    assert.deepEqual(
      stratA.worst_symbols.map((entry) => entry.symbol),
      ['MSFT', 'AAPL'],
    );
  });
});

describe('summarizeSymbolRuns', () => {
  it('aggregates symbol metrics and identifies the best preset per symbol', () => {
    const summaries = summarizeSymbolRuns(sampleRuns, { initialCapital: 10000 });
    assert.equal(summaries.length, 3);

    const aapl = summaries.find((entry) => entry.symbol === 'AAPL');
    assert.ok(aapl);
    assert.equal(aapl.label, 'Apple');
    assert.equal(aapl.run_count, 2);
    assert.equal(aapl.success_count, 2);
    assert.equal(aapl.best_preset_id, 'strat-a');
    assert.equal(aapl.avg_net_profit, 75);
    assert.equal(aapl.avg_profit_factor, 1.75);
    assert.equal(aapl.avg_max_drawdown, 35);
    assert.equal(aapl.avg_max_drawdown_pct, 0.35);
    assert.equal(aapl.avg_closed_trades, 11);
    assert.equal(aapl.avg_percent_profitable, 59);
  });
});

describe('summarizeMarketCampaign', () => {
  it('returns ranked strategies plus top and worst symbols for a market', () => {
    const summary = summarizeMarketCampaign({
      runs: sampleRuns,
      market: 'US',
      initialCapital: 10000,
      topLimit: 2,
    });

    assert.equal(summary.market, 'US');
    assert.equal(summary.strategy_summaries.length, 2);
    assert.equal(summary.symbol_summaries.length, 3);
    assert.deepEqual(
      summary.ranked_strategies.map((entry) => entry.presetId),
      ['strat-b', 'strat-a'],
    );
    assert.deepEqual(
      summary.top_symbols.map((entry) => entry.symbol),
      ['NVDA', 'AAPL'],
    );
    assert.deepEqual(
      summary.worst_symbols.map((entry) => entry.symbol),
      ['MSFT', 'AAPL'],
    );
  });
});
