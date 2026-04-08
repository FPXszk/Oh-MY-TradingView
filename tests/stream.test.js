import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { resolveStreamParams, streamPriceTicks } from '../src/core/stream.js';

// ---------------------------------------------------------------------------
// resolveStreamParams
// ---------------------------------------------------------------------------
describe('resolveStreamParams', () => {
  it('returns defaults when no options given', () => {
    const params = resolveStreamParams();
    assert.equal(params.intervalMs, 5000);
    assert.equal(params.maxTicks, 12);
  });

  it('enforces minimum interval of 1000ms', () => {
    const params = resolveStreamParams({ intervalMs: 100 });
    assert.equal(params.intervalMs, 1000);
  });

  it('enforces maximum ticks of 120', () => {
    const params = resolveStreamParams({ maxTicks: 500 });
    assert.equal(params.maxTicks, 120);
  });

  it('enforces minimum ticks of 1', () => {
    const params = resolveStreamParams({ maxTicks: 0 });
    assert.equal(params.maxTicks, 1);
  });

  it('accepts custom valid values', () => {
    const params = resolveStreamParams({ intervalMs: 3000, maxTicks: 5 });
    assert.equal(params.intervalMs, 3000);
    assert.equal(params.maxTicks, 5);
  });

  it('handles NaN interval by using default', () => {
    const params = resolveStreamParams({ intervalMs: NaN });
    assert.equal(params.intervalMs, 5000);
  });

  it('handles NaN maxTicks by using default', () => {
    const params = resolveStreamParams({ maxTicks: NaN });
    assert.equal(params.maxTicks, 12);
  });
});

// ---------------------------------------------------------------------------
// streamPriceTicks — with mock _deps
// ---------------------------------------------------------------------------
describe('streamPriceTicks', () => {
  it('collects ticks using mock price function', async () => {
    let callCount = 0;
    const mockDeps = {
      evaluate: () => {
        callCount += 1;
        return {
          symbol: 'TEST',
          price: 100 + callCount,
          resolution: 'D',
          source: 'mock',
        };
      },
      evaluateAsync: () => Promise.resolve(),
    };

    const result = await streamPriceTicks({
      maxTicks: 3,
      intervalMs: 1000,
      _deps: mockDeps,
    });

    assert.equal(result.success, true);
    assert.equal(result.collected, 3);
    assert.equal(result.ticks.length, 3);
    assert.equal(result.ticks[0].tick, 1);
    assert.equal(result.ticks[0].symbol, 'TEST');
    assert.ok(result.ticks[0].price >= 101);
  });

  it('records errors without crashing the stream', async () => {
    let callCount = 0;
    const mockDeps = {
      evaluate: () => {
        callCount += 1;
        if (callCount === 2) {
          throw new Error('Simulated failure');
        }
        return {
          symbol: 'TEST',
          price: 100,
          resolution: 'D',
          source: 'mock',
        };
      },
      evaluateAsync: () => Promise.resolve(),
    };

    const result = await streamPriceTicks({
      maxTicks: 3,
      intervalMs: 1000,
      _deps: mockDeps,
    });

    assert.equal(result.collected, 3);
    assert.equal(result.errors, 1);
    assert.ok(result.ticks[1].error);
    assert.equal(result.ticks[1].error, 'Simulated failure');
  });

  it('returns success=false when every poll fails', async () => {
    const mockDeps = {
      evaluate: () => {
        throw new Error('CDP unavailable');
      },
      evaluateAsync: () => Promise.resolve(),
    };

    const result = await streamPriceTicks({
      maxTicks: 2,
      intervalMs: 1000,
      _deps: mockDeps,
    });

    assert.equal(result.success, false);
    assert.equal(result.errors, 2);
  });

  it('returns params in the result', async () => {
    const mockDeps = {
      evaluate: (expression) => {
        if (expression.includes('value().symbol()')) return 'AAPL';
        return { symbol: 'AAPL', price: 1, resolution: 'D', source: 'mock' };
      },
      evaluateAsync: () => Promise.resolve(),
    };

    const result = await streamPriceTicks({
      symbol: 'AAPL',
      maxTicks: 2,
      intervalMs: 1000,
      _deps: mockDeps,
    });

    assert.equal(result.params.symbol, 'AAPL');
    assert.equal(result.params.maxTicks, 2);
    assert.equal(result.params.intervalMs, 1000);
  });

  it('switches symbol only once before the loop, not on every tick', async () => {
    let setSymbolCalls = 0;
    let rawReads = 0;
    const mockDeps = {
      evaluate: (expression) => {
        if (expression.includes('value().symbol()')) return 'NASDAQ:AAPL';
        rawReads += 1;
        return { symbol: 'NASDAQ:AAPL', price: 150 + rawReads, resolution: 'D', source: 'mock' };
      },
      evaluateAsync: () => {
        setSymbolCalls += 1;
        return Promise.resolve();
      },
    };

    const result = await streamPriceTicks({
      symbol: 'AAPL',
      maxTicks: 3,
      intervalMs: 1000,
      _deps: mockDeps,
    });

    assert.equal(result.success, true);
    assert.equal(result.collected, 3);
    assert.equal(setSymbolCalls, 1, 'setActiveSymbol should be called exactly once');
  });

  it('waits for the requested symbol on stream ticks without re-switching', async () => {
    let setSymbolCalls = 0;
    let rawReads = 0;
    const mockDeps = {
      evaluate: (expression) => {
        if (expression.includes('value().symbol()')) return 'NASDAQ:NVDA';
        rawReads += 1;
        if (rawReads === 1) {
          return { symbol: 'NASDAQ:AAPL', price: 100, resolution: 'D', source: 'mock' };
        }
        return { symbol: 'NASDAQ:NVDA', price: 200, resolution: 'D', source: 'mock' };
      },
      evaluateAsync: () => {
        setSymbolCalls += 1;
        return Promise.resolve();
      },
    };

    const result = await streamPriceTicks({
      symbol: 'NVDA',
      maxTicks: 1,
      intervalMs: 1000,
      _deps: mockDeps,
    });

    assert.equal(result.success, true);
    assert.equal(result.ticks[0].symbol, 'NASDAQ:NVDA');
    assert.equal(setSymbolCalls, 1);
    assert.equal(rawReads, 2);
  });

  it('does not call setActiveSymbol when no symbol provided', async () => {
    let setSymbolCalls = 0;
    const mockDeps = {
      evaluate: () => ({ symbol: 'TEST', price: 100, resolution: 'D', source: 'mock' }),
      evaluateAsync: () => {
        setSymbolCalls += 1;
        return Promise.resolve();
      },
    };

    await streamPriceTicks({
      maxTicks: 2,
      intervalMs: 1000,
      _deps: mockDeps,
    });

    assert.equal(setSymbolCalls, 0, 'setActiveSymbol should not be called when no symbol');
  });

  it('returns a structured error result when initial symbol switch fails', async () => {
    const mockDeps = {
      evaluate: () => ({ symbol: 'TEST', price: 100, resolution: 'D', source: 'mock' }),
      evaluateAsync: () => Promise.reject(new Error('switch failed')),
    };

    const result = await streamPriceTicks({
      symbol: 'AAPL',
      maxTicks: 3,
      intervalMs: 1000,
      _deps: mockDeps,
    });

    assert.equal(result.success, false);
    assert.equal(result.collected, 1);
    assert.equal(result.errors, 1);
    assert.equal(result.ticks[0].error, 'switch failed');
  });
});
