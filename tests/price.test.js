import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatPriceResult,
  validatePriceData,
  symbolMatches,
  getCurrentPrice,
  readCurrentPriceForSymbol,
} from '../src/core/price.js';

describe('formatPriceResult', () => {
  it('returns correct JSON structure for valid data', () => {
    const raw = { symbol: 'BTCUSD', price: 65432.10, source: 'chart_api' };
    const result = formatPriceResult(raw);
    assert.equal(result.success, true);
    assert.equal(result.symbol, 'BTCUSD');
    assert.equal(result.price, 65432.10);
    assert.equal(result.source, 'chart_api');
    assert.ok(result.retrieved_at);
  });

  it('includes retrieved_at as ISO string', () => {
    const raw = { symbol: 'AAPL', price: 150.25, source: 'dom' };
    const result = formatPriceResult(raw);
    assert.ok(typeof result.retrieved_at === 'string');
    assert.ok(!isNaN(Date.parse(result.retrieved_at)));
  });

  it('preserves resolution if present', () => {
    const raw = { symbol: 'EURUSD', price: 1.0845, source: 'chart_api', resolution: '1D' };
    const result = formatPriceResult(raw);
    assert.equal(result.resolution, '1D');
  });

  it('omits resolution if absent', () => {
    const raw = { symbol: 'EURUSD', price: 1.0845, source: 'chart_api' };
    const result = formatPriceResult(raw);
    assert.equal(result.resolution, undefined);
  });
});

describe('validatePriceData', () => {
  it('accepts valid price data', () => {
    assert.doesNotThrow(() =>
      validatePriceData({ symbol: 'BTCUSD', price: 65432.10, source: 'chart_api' })
    );
  });

  it('rejects missing symbol', () => {
    assert.throws(
      () => validatePriceData({ price: 100, source: 'chart_api' }),
      /symbol/i
    );
  });

  it('rejects non-number price', () => {
    assert.throws(
      () => validatePriceData({ symbol: 'X', price: 'abc', source: 'chart_api' }),
      /price/i
    );
  });

  it('rejects NaN price', () => {
    assert.throws(
      () => validatePriceData({ symbol: 'X', price: NaN, source: 'chart_api' }),
      /price/i
    );
  });

  it('rejects Infinity price', () => {
    assert.throws(
      () => validatePriceData({ symbol: 'X', price: Infinity, source: 'chart_api' }),
      /price/i
    );
  });

  it('rejects missing source', () => {
    assert.throws(
      () => validatePriceData({ symbol: 'X', price: 100 }),
      /source/i
    );
  });

  it('accepts zero price', () => {
    assert.doesNotThrow(() =>
      validatePriceData({ symbol: 'X', price: 0, source: 'chart_api' })
    );
  });

  it('accepts negative price', () => {
    assert.doesNotThrow(() =>
      validatePriceData({ symbol: 'X', price: -5.5, source: 'chart_api' })
    );
  });
});

describe('symbolMatches', () => {
  it('matches exact symbols', () => {
    assert.equal(symbolMatches('NVDA', 'NVDA'), true);
  });

  it('matches exchange-prefixed symbols', () => {
    assert.equal(symbolMatches('NASDAQ:NVDA', 'NVDA'), true);
  });

  it('matches daily exchange variants for the same JP ticker', () => {
    assert.equal(symbolMatches('TSE_DLY:7203', 'TSE:7203'), true);
  });

  it('does not match different symbols', () => {
    assert.equal(symbolMatches('NASDAQ:AAPL', 'NVDA'), false);
  });
});

describe('getCurrentPrice with symbol', () => {
  it('switches symbol before reading price when requested', async () => {
    const calls = [];
    const evaluate = async (expression) => {
      calls.push(expression);
      if (expression.includes('value().symbol()')) return 'NASDAQ:NVDA';
      return { symbol: 'NASDAQ:NVDA', price: 123.45, resolution: 'D', source: 'bars_close' };
    };
    const evaluateAsync = async () => undefined;

    const result = await getCurrentPrice({
      symbol: 'NVDA',
      _deps: { evaluate, evaluateAsync },
    });

    assert.equal(result.symbol, 'NASDAQ:NVDA');
    assert.equal(result.price, 123.45);
    assert.ok(calls.some((expression) => expression.includes('value().symbol()')));
  });
});

describe('readCurrentPriceForSymbol', () => {
  it('waits until the raw price symbol matches the requested symbol', async () => {
    let attempts = 0;
    const evaluate = async () => {
      attempts += 1;
      if (attempts === 1) {
        return { symbol: 'NASDAQ:AAPL', price: 100, resolution: 'D', source: 'bars_close' };
      }
      return { symbol: 'NASDAQ:NVDA', price: 123.45, resolution: 'D', source: 'bars_close' };
    };

    const result = await readCurrentPriceForSymbol({
      symbol: 'NVDA',
      _deps: { evaluate, evaluateAsync: async () => undefined },
    });

    assert.equal(result.symbol, 'NASDAQ:NVDA');
    assert.equal(result.price, 123.45);
    assert.equal(attempts, 2);
  });
});
