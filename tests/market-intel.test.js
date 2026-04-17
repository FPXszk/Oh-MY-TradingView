import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getSymbolQuote,
  getSymbolFundamentals,
  getMarketSnapshot,
  getFinancialNews,
  runScreener,
  computeRsi,
  computeSma,
  getMultiSymbolTaSummary,
  getMultiSymbolAnalysis,
  rankSymbolsByTa,
  rankSymbolsByConfluence,
} from '../src/core/market-intel.js';

async function withMockFetch(mockImpl, fn) {
  const originalFetch = global.fetch;
  const originalCommunityFlag = process.env.OMTV_DISABLE_COMMUNITY_SNAPSHOT;
  global.fetch = mockImpl;
  process.env.OMTV_DISABLE_COMMUNITY_SNAPSHOT = '1';
  try {
    await fn();
  } finally {
    global.fetch = originalFetch;
    if (originalCommunityFlag === undefined) {
      delete process.env.OMTV_DISABLE_COMMUNITY_SNAPSHOT;
    } else {
      process.env.OMTV_DISABLE_COMMUNITY_SNAPSHOT = originalCommunityFlag;
    }
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

describe('market-intel export contracts', () => {
  it('exports getTradingViewFinancials as a function', async () => {
    const mod = await import('../src/core/market-intel.js');
    assert.equal(typeof mod.getTradingViewFinancials, 'function');
  });

  it('exports getTradingViewFinancialsBatch as a function', async () => {
    const mod = await import('../src/core/market-intel.js');
    assert.equal(typeof mod.getTradingViewFinancialsBatch, 'function');
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

// ---------------------------------------------------------------------------
// TA helpers — pure computation tests (no fetch needed)
// ---------------------------------------------------------------------------

describe('computeRsi — pure computation', () => {
  it('returns null when not enough data', () => {
    const result = computeRsi([100, 101, 102], 14);
    assert.equal(result, null);
  });

  it('returns 100 when all changes are positive', () => {
    const closes = Array.from({ length: 16 }, (_, i) => 100 + i);
    const result = computeRsi(closes, 14);
    assert.equal(result, 100);
  });

  it('returns 50 for a flat series', () => {
    const closes = Array.from({ length: 20 }, () => 100);
    const result = computeRsi(closes, 14);
    assert.equal(result, 50);
  });

  it('computes RSI for mixed data', () => {
    const closes = [
      44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84,
      46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41,
      46.22, 45.64,
    ];
    const result = computeRsi(closes, 14);
    assert.ok(typeof result === 'number');
    assert.ok(result >= 0 && result <= 100);
  });
});

describe('computeSma — pure computation', () => {
  it('returns null when not enough data', () => {
    const result = computeSma([100, 101], 20);
    assert.equal(result, null);
  });

  it('computes SMA correctly', () => {
    const closes = [10, 20, 30, 40, 50];
    const result = computeSma(closes, 5);
    assert.equal(result, 30);
  });

  it('uses only the last N values', () => {
    const closes = [1, 2, 3, 10, 20, 30];
    const result = computeSma(closes, 3);
    assert.equal(result, 20);
  });
});

// ---------------------------------------------------------------------------
// getMultiSymbolTaSummary — validation
// ---------------------------------------------------------------------------

describe('getMultiSymbolTaSummary — validation', () => {
  it('rejects empty array', async () => {
    await assert.rejects(
      () => getMultiSymbolTaSummary([]),
      /symbols array is required/,
    );
  });

  it('rejects non-array', async () => {
    await assert.rejects(
      () => getMultiSymbolTaSummary('AAPL'),
      /symbols array is required/,
    );
  });

  it('rejects more than 20 symbols', async () => {
    const many = Array.from({ length: 21 }, (_, i) => `SYM${i}`);
    await assert.rejects(
      () => getMultiSymbolTaSummary(many),
      /must not exceed 20/,
    );
  });
});

// ---------------------------------------------------------------------------
// rankSymbolsByTa — validation
// ---------------------------------------------------------------------------

describe('rankSymbolsByTa — validation', () => {
  it('rejects invalid sortBy', async () => {
    await assert.rejects(
      () => rankSymbolsByTa(['AAPL'], 'invalid'),
      /sortBy must be one of/,
    );
  });

  it('rejects invalid order', async () => {
    await assert.rejects(
      () => rankSymbolsByTa(['AAPL'], 'rsi14', 'invalid'),
      /order must be/,
    );
  });
});

// ---------------------------------------------------------------------------
// getMultiSymbolTaSummary — mocked fetch
// ---------------------------------------------------------------------------

describe('getMultiSymbolTaSummary — mocked fetch', () => {
  function buildChartResponse(symbol, closes) {
    return {
      chart: {
        result: [{
          meta: { symbol },
          indicators: {
            quote: [{ close: closes }],
          },
        }],
      },
    };
  }

  it('returns TA summary for multiple symbols', async () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i) * 10);
    await withMockFetch(async (url) => ({
      ok: true,
      json: async () => buildChartResponse(
        String(url).includes('MSFT') ? 'MSFT' : 'AAPL',
        closes,
      ),
    }), async () => {
      const result = await getMultiSymbolTaSummary(['AAPL', 'MSFT']);
      assert.equal(result.success, true);
      assert.equal(result.count, 2);
      assert.equal(result.successCount, 2);
      assert.equal(result.failureCount, 0);
      assert.equal(result.source, 'yahoo_finance');

      const s = result.summaries[0];
      assert.equal(s.success, true);
      assert.ok(typeof s.latestClose === 'number');
      assert.ok(typeof s.rsi14 === 'number');
      assert.ok(typeof s.sma20 === 'number');
      assert.ok(typeof s.sma50 === 'number');
      assert.ok(typeof s.priceChange === 'number');
      assert.ok(typeof s.sma20Deviation === 'number');
      assert.ok(typeof s.sma50Deviation === 'number');
    });
  });

  it('handles partial failures', async () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + i);
    let callCount = 0;
    await withMockFetch(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: true,
          json: async () => buildChartResponse('AAPL', closes),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    }, async () => {
      const result = await getMultiSymbolTaSummary(['AAPL', 'BADTICKER']);
      assert.equal(result.success, true);
      assert.equal(result.successCount, 1);
      assert.equal(result.failureCount, 1);
      assert.equal(result.summaries[0].success, true);
      assert.equal(result.summaries[1].success, false);
      assert.ok(result.summaries[1].error);
    });
  });

  it('returns success=false when all fail', async () => {
    await withMockFetch(async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    }), async () => {
      const result = await getMultiSymbolTaSummary(['BAD1', 'BAD2']);
      assert.equal(result.success, false);
      assert.equal(result.error, 'All TA requests failed');
    });
  });

  it('marks symbols with only null closes as failures', async () => {
    await withMockFetch(async () => ({
      ok: true,
      json: async () => ({
        chart: {
          result: [{
            meta: { symbol: 'NULLS' },
            indicators: {
              quote: [{ close: Array.from({ length: 60 }, () => null) }],
            },
          }],
        },
      }),
    }), async () => {
      const result = await getMultiSymbolTaSummary(['NULLS']);
      assert.equal(result.success, false);
      assert.equal(result.successCount, 0);
      assert.equal(result.failureCount, 1);
      assert.match(result.summaries[0].error, /No valid close prices/);
    });
  });
});

// ---------------------------------------------------------------------------
// rankSymbolsByTa — mocked fetch
// ---------------------------------------------------------------------------

describe('rankSymbolsByTa — mocked fetch', () => {
  function buildChartResponse(symbol, closes) {
    return {
      chart: {
        result: [{
          meta: { symbol },
          indicators: {
            quote: [{ close: closes }],
          },
        }],
      },
    };
  }

  it('ranks symbols by priceChange descending', async () => {
    const closesUp = Array.from({ length: 60 }, (_, i) => 100 + i * 2);
    const closesDown = Array.from({ length: 60 }, (_, i) => 200 - i);
    await withMockFetch(async (url) => ({
      ok: true,
      json: async () => buildChartResponse(
        String(url).includes('MSFT') ? 'MSFT' : 'AAPL',
        String(url).includes('MSFT') ? closesDown : closesUp,
      ),
    }), async () => {
      const result = await rankSymbolsByTa(['AAPL', 'MSFT'], 'priceChange', 'desc');
      assert.equal(result.success, true);
      assert.equal(result.sortBy, 'priceChange');
      assert.equal(result.order, 'desc');
      assert.equal(result.rankedCount, 2);
      assert.equal(result.ranked[0].rank, 1);
      assert.ok(result.ranked[0].priceChange >= result.ranked[1].priceChange);
    });
  });

  it('ranks symbols ascending', async () => {
    const closesUp = Array.from({ length: 60 }, (_, i) => 100 + i * 2);
    const closesDown = Array.from({ length: 60 }, (_, i) => 200 - i);
    await withMockFetch(async (url) => ({
      ok: true,
      json: async () => buildChartResponse(
        String(url).includes('MSFT') ? 'MSFT' : 'AAPL',
        String(url).includes('MSFT') ? closesDown : closesUp,
      ),
    }), async () => {
      const result = await rankSymbolsByTa(['AAPL', 'MSFT'], 'priceChange', 'asc');
      assert.equal(result.order, 'asc');
      assert.ok(result.ranked[0].priceChange <= result.ranked[1].priceChange);
    });
  });

  it('treats zero-denominator TA metrics as unavailable', async () => {
    await withMockFetch(async () => ({
      ok: true,
      json: async () => ({
        chart: {
          result: [{
            meta: { symbol: 'ZERO' },
            indicators: {
              quote: [{ close: Array.from({ length: 60 }, () => 0) }],
            },
          }],
        },
      }),
    }), async () => {
      const summary = await getMultiSymbolTaSummary(['ZERO']);
      assert.equal(summary.success, true);
      assert.equal(summary.summaries[0].priceChange, null);
      assert.equal(summary.summaries[0].sma20Deviation, null);
      assert.equal(summary.summaries[0].sma50Deviation, null);

      const ranking = await rankSymbolsByTa(['ZERO'], 'priceChange', 'desc');
      assert.equal(ranking.success, true);
      assert.equal(ranking.rankedCount, 0);
      assert.equal(ranking.unranked.length, 1);
    });
  });

  it('propagates the top-level error when all ranking fetches fail', async () => {
    await withMockFetch(async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    }), async () => {
      const result = await rankSymbolsByTa(['BAD1', 'BAD2'], 'priceChange', 'desc');
      assert.equal(result.success, false);
      assert.equal(result.error, 'All TA requests failed');
      assert.equal(result.rankedCount, 0);
    });
  });
});

// ---------------------------------------------------------------------------
// rankSymbolsByConfluence — mocked fetch
// ---------------------------------------------------------------------------

describe('rankSymbolsByConfluence — mocked fetch', () => {
  function buildQuoteResponse(symbol, overrides = {}) {
    return {
      chart: {
        result: [{
          meta: {
            symbol,
            currency: 'USD',
            exchangeName: 'NMS',
            regularMarketPrice: 210.5,
            previousClose: 205.25,
            regularMarketVolume: 50000000,
            regularMarketDayHigh: 212,
            regularMarketDayLow: 204,
            fiftyTwoWeekHigh: 260,
            fiftyTwoWeekLow: 160,
            ...overrides,
          },
        }],
      },
    };
  }

  function buildChartResponse(symbol, closes) {
    return {
      chart: {
        result: [{
          meta: { symbol },
          indicators: {
            quote: [{ close: closes }],
          },
        }],
      },
    };
  }

  function buildFundamentalsResponse(overrides = {}) {
    return {
      quoteSummary: {
        result: [{
          summaryDetail: {
            marketCap: { raw: 3000000000000 },
            trailingPE: { raw: 28.5 },
            forwardPE: { raw: 25.0 },
            dividendYield: { raw: 0.005 },
            beta: { raw: 1.0 },
            ...overrides.summaryDetail,
          },
          defaultKeyStatistics: {
            ...overrides.defaultKeyStatistics,
          },
          financialData: {
            profitMargins: { raw: 0.25 },
            revenueGrowth: { raw: 0.08 },
            earningsGrowth: { raw: 0.12 },
            returnOnEquity: { raw: 0.15 },
            debtToEquity: { raw: 120 },
            ...overrides.financialData,
          },
        }],
      },
    };
  }

  function buildNewsResponse(symbol) {
    return {
      news: [
        {
          title: `${symbol} headline`,
          publisher: 'Reuters',
          link: `https://example.com/${symbol}`,
          providerPublishTime: Math.floor(Date.now() / 1000) - 3600,
          type: 'STORY',
        },
      ],
    };
  }

  function buildConfluenceMock(configBySymbol) {
    return async (url) => {
      const urlStr = String(url);
      const symbol = Object.keys(configBySymbol).find((candidate) => urlStr.includes(candidate));
      const config = symbol ? configBySymbol[symbol] : null;

      if (!config || config.fail) {
        return { ok: false, status: 503, json: async () => ({}) };
      }
      if (urlStr.includes('quoteSummary')) {
        return { ok: true, json: async () => config.fundamentals };
      }
      if (urlStr.includes('search')) {
        return { ok: true, json: async () => config.news };
      }
      if (urlStr.includes('range=3mo')) {
        return { ok: true, json: async () => config.chart };
      }
      return { ok: true, json: async () => config.quote };
    };
  }

  const UPTREND_CLOSES = Array.from({ length: 60 }, (_, i) => 150 + i * 1.5);
  const DOWNTREND_CLOSES = Array.from({ length: 60 }, (_, i) => 250 - i * 1.5);

  it('ranks symbols by confluence score descending', async () => {
    await withMockFetch(buildConfluenceMock({
      AAPL: {
        quote: buildQuoteResponse('AAPL', { regularMarketPrice: 210, fiftyTwoWeekHigh: 260, fiftyTwoWeekLow: 160 }),
        chart: buildChartResponse('AAPL', UPTREND_CLOSES),
        fundamentals: buildFundamentalsResponse(),
        news: buildNewsResponse('AAPL'),
      },
      MSFT: {
        quote: buildQuoteResponse('MSFT', { regularMarketPrice: 175, fiftyTwoWeekHigh: 280, fiftyTwoWeekLow: 170 }),
        chart: buildChartResponse('MSFT', DOWNTREND_CLOSES),
        fundamentals: buildFundamentalsResponse({
          summaryDetail: { beta: { raw: 1.7 }, forwardPE: { raw: 38 } },
          financialData: {
            profitMargins: { raw: 0.08 },
            revenueGrowth: { raw: -0.04 },
            earningsGrowth: { raw: -0.12 },
            returnOnEquity: { raw: 0.08 },
            debtToEquity: { raw: 240 },
          },
        }),
        news: buildNewsResponse('MSFT'),
      },
    }), async () => {
      const result = await rankSymbolsByConfluence(['AAPL', 'MSFT']);
      assert.equal(result.success, true);
      assert.equal(result.rankedCount, 2);
      assert.equal(result.ranked_symbols[0].symbol, 'AAPL');
      assert.ok(result.ranked_symbols[0].confluence_score > result.ranked_symbols[1].confluence_score);
    });
  });

  it('uses symbol ordering as a stable tie-breaker', async () => {
    await withMockFetch(buildConfluenceMock({
      AMZN: {
        quote: buildQuoteResponse('AMZN'),
        chart: buildChartResponse('AMZN', UPTREND_CLOSES),
        fundamentals: buildFundamentalsResponse(),
        news: buildNewsResponse('AMZN'),
      },
      AAPL: {
        quote: buildQuoteResponse('AAPL'),
        chart: buildChartResponse('AAPL', UPTREND_CLOSES),
        fundamentals: buildFundamentalsResponse(),
        news: buildNewsResponse('AAPL'),
      },
    }), async () => {
      const result = await rankSymbolsByConfluence(['AMZN', 'AAPL']);
      assert.equal(result.success, true);
      assert.equal(result.ranked_symbols[0].symbol, 'AAPL');
      assert.equal(result.ranked_symbols[1].symbol, 'AMZN');
    });
  });

  it('preserves partial success and reports unranked symbols', async () => {
    await withMockFetch(buildConfluenceMock({
      AAPL: {
        quote: buildQuoteResponse('AAPL'),
        chart: buildChartResponse('AAPL', UPTREND_CLOSES),
        fundamentals: buildFundamentalsResponse(),
        news: buildNewsResponse('AAPL'),
      },
      BAD: {
        fail: true,
      },
    }), async () => {
      const result = await rankSymbolsByConfluence(['AAPL', 'BAD'], { limit: 5 });
      assert.equal(result.success, true);
      assert.equal(result.rankedCount, 1);
      assert.equal(result.failureCount, 1);
      assert.equal(result.ranked_symbols[0].symbol, 'AAPL');
      assert.equal(result.unranked[0].symbol, 'BAD');
    });
  });

  it('propagates provider and community details to ranked symbols', async () => {
    await withMockFetch(buildConfluenceMock({
      AAPL: {
        quote: buildQuoteResponse('AAPL'),
        chart: buildChartResponse('AAPL', UPTREND_CLOSES),
        fundamentals: buildFundamentalsResponse(),
        news: buildNewsResponse('AAPL'),
      },
    }), async () => {
      const result = await rankSymbolsByConfluence(['AAPL']);
      assert.equal(result.ranked_symbols[0].provider_status.quote.status, 'ok');
      assert.ok(result.ranked_symbols[0].community_snapshot);
    });
  });

  it('accounts for omitted successful symbols when limit truncates the ranking', async () => {
    await withMockFetch(buildConfluenceMock({
      AAPL: {
        quote: buildQuoteResponse('AAPL'),
        chart: buildChartResponse('AAPL', UPTREND_CLOSES),
        fundamentals: buildFundamentalsResponse(),
        news: buildNewsResponse('AAPL'),
      },
      AMZN: {
        quote: buildQuoteResponse('AMZN'),
        chart: buildChartResponse('AMZN', UPTREND_CLOSES),
        fundamentals: buildFundamentalsResponse(),
        news: buildNewsResponse('AMZN'),
      },
      MSFT: {
        quote: buildQuoteResponse('MSFT', { regularMarketPrice: 175, fiftyTwoWeekHigh: 280, fiftyTwoWeekLow: 170 }),
        chart: buildChartResponse('MSFT', DOWNTREND_CLOSES),
        fundamentals: buildFundamentalsResponse({
          summaryDetail: { beta: { raw: 1.7 }, forwardPE: { raw: 38 } },
          financialData: {
            profitMargins: { raw: 0.08 },
            revenueGrowth: { raw: -0.04 },
            earningsGrowth: { raw: -0.12 },
            returnOnEquity: { raw: 0.08 },
            debtToEquity: { raw: 240 },
          },
        }),
        news: buildNewsResponse('MSFT'),
      },
    }), async () => {
      const result = await rankSymbolsByConfluence(['AAPL', 'AMZN', 'MSFT'], { limit: 1 });
      assert.equal(result.count, 3);
      assert.equal(result.rankedCount, 1);
      assert.equal(result.failureCount, 0);
      assert.equal(result.successCount, 3);
      assert.equal(result.omittedCount, 2);
      assert.equal(result.omitted.length, 2);
      assert.equal(result.rankedCount + result.failureCount + result.omittedCount, result.count);
    });
  });

  it('returns a top-level error when all confluence requests fail', async () => {
    await withMockFetch(buildConfluenceMock({
      BAD1: { fail: true },
      BAD2: { fail: true },
    }), async () => {
      const result = await rankSymbolsByConfluence(['BAD1', 'BAD2']);
      assert.equal(result.success, false);
      assert.equal(result.error, 'All confluence analysis requests failed');
      assert.equal(result.rankedCount, 0);
      assert.equal(result.failureCount, 2);
    });
  });

  it('batches multi-symbol analysis requests beyond the confluence command limit', async () => {
    const symbols = Array.from({ length: 21 }, (_, index) => `SYM${String(index + 1).padStart(2, '0')}`);

    await withMockFetch(async (url) => {
      const urlStr = String(url);
      const symbolMatch = urlStr.match(/quoteSummary\/([^?]+)|chart\/([^?]+)/);
      const symbol = (symbolMatch?.[1] || symbolMatch?.[2] || 'AAPL').toUpperCase();

      if (urlStr.includes('quoteSummary')) {
        return { ok: true, json: async () => buildFundamentalsResponse() };
      }
      if (urlStr.includes('search')) {
        return { ok: true, json: async () => buildNewsResponse(symbol) };
      }
      if (urlStr.includes('range=3mo')) {
        return { ok: true, json: async () => buildChartResponse(symbol, UPTREND_CLOSES) };
      }
      return { ok: true, json: async () => buildQuoteResponse(symbol) };
    }, async () => {
      const result = await getMultiSymbolAnalysis(symbols);
      assert.equal(result.success, true);
      assert.equal(result.count, 21);
      assert.equal(result.successCount, 21);
      assert.equal(result.failureCount, 0);
      assert.deepEqual(result.analyses.map((entry) => entry.symbol), symbols);
    });
  });
});
