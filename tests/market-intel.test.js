import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getSymbolQuote,
  getSymbolFundamentals,
  getMarketSnapshot,
  getFinancialNews,
  runScreener,
} from '../src/core/market-intel.js';

async function withMockFetch(mockImpl, fn) {
  const originalFetch = global.fetch;
  global.fetch = mockImpl;
  try {
    await fn();
  } finally {
    global.fetch = originalFetch;
  }
}

// ---------------------------------------------------------------------------
// Input validation — these do not call external APIs
// ---------------------------------------------------------------------------
describe('getSymbolQuote — validation', () => {
  it('rejects missing symbol', async () => {
    await assert.rejects(
      () => getSymbolQuote(''),
      /symbol is required/,
    );
  });

  it('rejects null symbol', async () => {
    await assert.rejects(
      () => getSymbolQuote(null),
      /symbol is required/,
    );
  });

  it('rejects undefined symbol', async () => {
    await assert.rejects(
      () => getSymbolQuote(undefined),
      /symbol is required/,
    );
  });
});

describe('getSymbolFundamentals — validation', () => {
  it('rejects missing symbol', async () => {
    await assert.rejects(
      () => getSymbolFundamentals(''),
      /symbol is required/,
    );
  });

  it('rejects non-string symbol', async () => {
    await assert.rejects(
      () => getSymbolFundamentals(42),
      /symbol is required/,
    );
  });
});

describe('getMarketSnapshot — validation', () => {
  it('rejects empty array', async () => {
    await assert.rejects(
      () => getMarketSnapshot([]),
      /symbols array is required/,
    );
  });

  it('rejects non-array', async () => {
    await assert.rejects(
      () => getMarketSnapshot('AAPL'),
      /symbols array is required/,
    );
  });

  it('rejects more than 20 symbols', async () => {
    const many = Array.from({ length: 21 }, (_, i) => `SYM${i}`);
    await assert.rejects(
      () => getMarketSnapshot(many),
      /must not exceed 20/,
    );
  });
});

describe('getFinancialNews — validation', () => {
  it('rejects missing query', async () => {
    await assert.rejects(
      () => getFinancialNews(''),
      /query is required/,
    );
  });

  it('rejects null query', async () => {
    await assert.rejects(
      () => getFinancialNews(null),
      /query is required/,
    );
  });
});

describe('runScreener — validation', () => {
  it('rejects empty symbols', async () => {
    await assert.rejects(
      () => runScreener({ symbols: [] }),
      /symbols array is required/,
    );
  });

  it('rejects missing symbols', async () => {
    await assert.rejects(
      () => runScreener({}),
      /symbols array is required/,
    );
  });

  it('rejects more than 30 symbols', async () => {
    const many = Array.from({ length: 31 }, (_, i) => `SYM${i}`);
    await assert.rejects(
      () => runScreener({ symbols: many }),
      /must not exceed 30/,
    );
  });

  it('rejects non-finite minPrice', async () => {
    await assert.rejects(
      () => runScreener({ symbols: ['AAPL'], minPrice: 'abc' }),
      /minPrice must be a finite number/,
    );
  });

  it('rejects non-finite maxPrice', async () => {
    await assert.rejects(
      () => runScreener({ symbols: ['AAPL'], maxPrice: NaN }),
      /maxPrice must be a finite number/,
    );
  });

  it('rejects non-finite minVolume', async () => {
    await assert.rejects(
      () => runScreener({ symbols: ['AAPL'], minVolume: Infinity }),
      /minVolume must be a finite number/,
    );
  });
});

describe('market-intel — success paths with mocked fetch', () => {
  it('returns normalized quote data', async () => {
    await withMockFetch(async () => ({
      ok: true,
      json: async () => ({
        chart: {
          result: [{
            meta: {
              symbol: 'AAPL',
              currency: 'USD',
              exchangeName: 'NMS',
              regularMarketPrice: 210.5,
              previousClose: 205.25,
              regularMarketVolume: 1000000,
              regularMarketDayHigh: 212,
              regularMarketDayLow: 204,
              fiftyTwoWeekHigh: 260,
              fiftyTwoWeekLow: 160,
            },
          }],
        },
      }),
    }), async () => {
      const result = await getSymbolQuote('aapl');
      assert.equal(result.success, true);
      assert.equal(result.symbol, 'AAPL');
      assert.equal(result.regularMarketPrice, 210.5);
      assert.equal(result.priceChange, 5.25);
      assert.equal(result.priceChangePercent, Number(((5.25 / 205.25) * 100).toFixed(4)));
      assert.equal(result.source, 'yahoo_finance');
    });
  });

  it('returns normalized fundamentals data', async () => {
    await withMockFetch(async () => ({
      ok: true,
      json: async () => ({
        quoteSummary: {
          result: [{
            summaryDetail: {
              marketCap: { raw: 1000 },
              trailingPE: { raw: 20.5 },
              forwardPE: { raw: 18.25 },
              dividendYield: { raw: 0.01 },
              beta: { raw: 1.2 },
            },
            defaultKeyStatistics: {},
            financialData: {
              profitMargins: { raw: 0.2 },
              revenueGrowth: { raw: 0.15 },
              earningsGrowth: { raw: 0.12 },
              returnOnEquity: { raw: 0.3 },
              debtToEquity: { raw: 50 },
            },
          }],
        },
      }),
    }), async () => {
      const result = await getSymbolFundamentals('AAPL');
      assert.equal(result.success, true);
      assert.equal(result.marketCap, 1000);
      assert.equal(result.trailingPE, 20.5);
      assert.equal(result.returnOnEquity, 0.3);
    });
  });

  it('returns normalized news results', async () => {
    await withMockFetch(async () => ({
      ok: true,
      json: async () => ({
        news: [{
          title: 'AAPL earnings beat',
          publisher: 'Example News',
          link: 'https://example.com/aapl',
          providerPublishTime: 1700000000,
          type: 'STORY',
        }],
      }),
    }), async () => {
      const result = await getFinancialNews('AAPL');
      assert.equal(result.success, true);
      assert.equal(result.count, 1);
      assert.equal(result.news[0].title, 'AAPL earnings beat');
    });
  });

  it('returns market snapshot for multiple symbols', async () => {
    await withMockFetch(async (url) => ({
      ok: true,
      json: async () => ({
        chart: {
          result: [{
            meta: {
              symbol: String(url).includes('MSFT') ? 'MSFT' : 'AAPL',
              currency: 'USD',
              exchangeName: 'NMS',
              regularMarketPrice: String(url).includes('MSFT') ? 400 : 200,
              previousClose: 190,
              regularMarketVolume: 1000000,
            },
          }],
        },
      }),
    }), async () => {
      const result = await getMarketSnapshot(['AAPL', 'MSFT']);
      assert.equal(result.success, true);
      assert.equal(result.count, 2);
      assert.equal(result.quotes[1].symbol, 'MSFT');
    });
  });

  it('returns success=false when every snapshot quote fails', async () => {
    await withMockFetch(async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    }), async () => {
      const result = await getMarketSnapshot(['AAPL']);
      assert.equal(result.success, false);
      assert.equal(result.error, 'All quote requests failed');
      assert.equal(result.failureCount, 1);
    });
  });

  it('screens symbols by price and volume', async () => {
    await withMockFetch(async (url) => ({
      ok: true,
      json: async () => ({
        chart: {
          result: [{
            meta: {
              symbol: String(url).includes('MSFT') ? 'MSFT' : 'AAPL',
              currency: 'USD',
              exchangeName: 'NMS',
              regularMarketPrice: String(url).includes('MSFT') ? 95 : 210,
              previousClose: 190,
              regularMarketVolume: String(url).includes('MSFT') ? 900000 : 1500000,
            },
          }],
        },
      }),
    }), async () => {
      const result = await runScreener({
        symbols: ['AAPL', 'MSFT'],
        minPrice: 100,
        minVolume: 1000000,
      });
      assert.equal(result.success, true);
      assert.equal(result.matched, 1);
      assert.equal(result.results[0].symbol, 'AAPL');
    });
  });

  it('returns success=false when every screener quote fails', async () => {
    await withMockFetch(async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    }), async () => {
      const result = await runScreener({
        symbols: ['AAPL'],
        minPrice: 100,
      });
      assert.equal(result.success, false);
      assert.equal(result.error, 'All quote requests failed');
      assert.equal(result.matched, 0);
    });
  });
});
