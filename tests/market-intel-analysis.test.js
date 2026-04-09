import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getSymbolAnalysis } from '../src/core/market-intel-analysis.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function withMockFetch(mockImpl, fn) {
  const originalFetch = global.fetch;
  global.fetch = mockImpl;
  try {
    await fn();
  } finally {
    global.fetch = originalFetch;
  }
}

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
          beta: { raw: 1.2 },
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

function buildNewsResponse(newsItems = []) {
  return {
    news: newsItems,
  };
}

/**
 * Build a mock fetch that routes by URL pattern.
 */
function buildRoutedMock({ quote, chart, fundamentals, news }) {
  return async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('quoteSummary')) {
      return { ok: true, json: async () => fundamentals };
    }
    if (urlStr.includes('search')) {
      return { ok: true, json: async () => news };
    }
    if (urlStr.includes('range=3mo')) {
      return { ok: true, json: async () => chart };
    }
    return { ok: true, json: async () => quote };
  };
}

// Standard closes with uptrend: RSI > 50, price above SMA20/50
const UPTREND_CLOSES = Array.from({ length: 60 }, (_, i) => 150 + i * 1.5);
// Downtrend closes
const DOWNTREND_CLOSES = Array.from({ length: 60 }, (_, i) => 250 - i * 1.5);

const STANDARD_NEWS = [
  { title: 'AAPL beats earnings', publisher: 'Reuters', link: 'https://example.com/1', providerPublishTime: Math.floor(Date.now() / 1000) - 3600, type: 'STORY' },
  { title: 'Apple launches new product', publisher: 'Bloomberg', link: 'https://example.com/2', providerPublishTime: Math.floor(Date.now() / 1000) - 7200, type: 'STORY' },
];

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe('getSymbolAnalysis — validation', () => {
  it('rejects missing symbol', async () => {
    await assert.rejects(
      () => getSymbolAnalysis(''),
      /symbol is required/,
    );
  });

  it('rejects null symbol', async () => {
    await assert.rejects(
      () => getSymbolAnalysis(null),
      /symbol is required/,
    );
  });

  it('rejects undefined symbol', async () => {
    await assert.rejects(
      () => getSymbolAnalysis(undefined),
      /symbol is required/,
    );
  });

  it('rejects non-string symbol', async () => {
    await assert.rejects(
      () => getSymbolAnalysis(42),
      /symbol is required/,
    );
  });
});

// ---------------------------------------------------------------------------
// Top-level response shape
// ---------------------------------------------------------------------------

describe('getSymbolAnalysis — response shape', () => {
  it('returns all required top-level keys', async () => {
    const mock = buildRoutedMock({
      quote: buildQuoteResponse('AAPL'),
      chart: buildChartResponse('AAPL', UPTREND_CLOSES),
      fundamentals: buildFundamentalsResponse(),
      news: buildNewsResponse(STANDARD_NEWS),
    });

    await withMockFetch(mock, async () => {
      const result = await getSymbolAnalysis('AAPL');
      assert.equal(result.success, true);
      assert.equal(result.symbol, 'AAPL');
      assert.ok(result.generated_at);
      assert.equal(result.source, 'yahoo_finance');
      assert.ok(result.inputs);
      assert.ok(result.analysis);
    });
  });

  it('uppercases the symbol', async () => {
    const mock = buildRoutedMock({
      quote: buildQuoteResponse('AAPL'),
      chart: buildChartResponse('AAPL', UPTREND_CLOSES),
      fundamentals: buildFundamentalsResponse(),
      news: buildNewsResponse(STANDARD_NEWS),
    });

    await withMockFetch(mock, async () => {
      const result = await getSymbolAnalysis('aapl');
      assert.equal(result.symbol, 'AAPL');
    });
  });
});

// ---------------------------------------------------------------------------
// Inputs section
// ---------------------------------------------------------------------------

describe('getSymbolAnalysis — inputs', () => {
  it('includes quote, fundamentals, ta_summary, and news inputs', async () => {
    const mock = buildRoutedMock({
      quote: buildQuoteResponse('AAPL'),
      chart: buildChartResponse('AAPL', UPTREND_CLOSES),
      fundamentals: buildFundamentalsResponse(),
      news: buildNewsResponse(STANDARD_NEWS),
    });

    await withMockFetch(mock, async () => {
      const result = await getSymbolAnalysis('AAPL');
      assert.ok(result.inputs.quote, 'inputs.quote missing');
      assert.ok(result.inputs.fundamentals, 'inputs.fundamentals missing');
      assert.ok(result.inputs.ta_summary, 'inputs.ta_summary missing');
      assert.ok(result.inputs.news, 'inputs.news missing');
    });
  });
});

// ---------------------------------------------------------------------------
// Analysis sections — required per-analyst fields
// ---------------------------------------------------------------------------

describe('getSymbolAnalysis — analyst sections', () => {
  const ANALYSTS = ['trend_analyst', 'fundamentals_analyst', 'news_analyst', 'risk_analyst', 'overall_summary'];

  for (const section of ANALYSTS) {
    it(`analysis.${section} has stance, confidence, signals, warnings`, async () => {
      const mock = buildRoutedMock({
        quote: buildQuoteResponse('AAPL'),
        chart: buildChartResponse('AAPL', UPTREND_CLOSES),
        fundamentals: buildFundamentalsResponse(),
        news: buildNewsResponse(STANDARD_NEWS),
      });

      await withMockFetch(mock, async () => {
        const result = await getSymbolAnalysis('AAPL');
        const analyst = result.analysis[section];
        assert.ok(analyst, `analysis.${section} missing`);
        assert.ok(typeof analyst.stance === 'string', `${section}.stance must be a string`);
        assert.ok(typeof analyst.confidence === 'string', `${section}.confidence must be a string`);
        assert.ok(Array.isArray(analyst.signals), `${section}.signals must be an array`);
        assert.ok(Array.isArray(analyst.warnings), `${section}.warnings must be an array`);
      });
    });
  }
});

// ---------------------------------------------------------------------------
// trend_analyst — deterministic logic
// ---------------------------------------------------------------------------

describe('getSymbolAnalysis — trend_analyst', () => {
  it('returns bullish stance for uptrend', async () => {
    const mock = buildRoutedMock({
      quote: buildQuoteResponse('AAPL'),
      chart: buildChartResponse('AAPL', UPTREND_CLOSES),
      fundamentals: buildFundamentalsResponse(),
      news: buildNewsResponse(STANDARD_NEWS),
    });

    await withMockFetch(mock, async () => {
      const result = await getSymbolAnalysis('AAPL');
      assert.equal(result.analysis.trend_analyst.stance, 'bullish');
    });
  });

  it('returns bearish stance for downtrend', async () => {
    const lastClose = DOWNTREND_CLOSES[DOWNTREND_CLOSES.length - 1];
    const mock = buildRoutedMock({
      quote: buildQuoteResponse('AAPL', { regularMarketPrice: lastClose, previousClose: lastClose + 2 }),
      chart: buildChartResponse('AAPL', DOWNTREND_CLOSES),
      fundamentals: buildFundamentalsResponse(),
      news: buildNewsResponse(STANDARD_NEWS),
    });

    await withMockFetch(mock, async () => {
      const result = await getSymbolAnalysis('AAPL');
      assert.equal(result.analysis.trend_analyst.stance, 'bearish');
    });
  });

  it('returns neutral stance for flat market', async () => {
    const flatCloses = Array.from({ length: 60 }, () => 200);
    const mock = buildRoutedMock({
      quote: buildQuoteResponse('AAPL', { regularMarketPrice: 200, previousClose: 200 }),
      chart: buildChartResponse('AAPL', flatCloses),
      fundamentals: buildFundamentalsResponse(),
      news: buildNewsResponse(STANDARD_NEWS),
    });

    await withMockFetch(mock, async () => {
      const result = await getSymbolAnalysis('AAPL');
      assert.equal(result.analysis.trend_analyst.stance, 'neutral');
    });
  });

  it('includes RSI and SMA signals', async () => {
    const mock = buildRoutedMock({
      quote: buildQuoteResponse('AAPL'),
      chart: buildChartResponse('AAPL', UPTREND_CLOSES),
      fundamentals: buildFundamentalsResponse(),
      news: buildNewsResponse(STANDARD_NEWS),
    });

    await withMockFetch(mock, async () => {
      const result = await getSymbolAnalysis('AAPL');
      const signals = result.analysis.trend_analyst.signals;
      assert.ok(signals.some((s) => /RSI/i.test(s)), 'should mention RSI');
      assert.ok(signals.some((s) => /SMA/i.test(s)), 'should mention SMA');
    });
  });
});

// ---------------------------------------------------------------------------
// fundamentals_analyst
// ---------------------------------------------------------------------------

describe('getSymbolAnalysis — fundamentals_analyst', () => {
  it('returns strong stance for good fundamentals', async () => {
    const mock = buildRoutedMock({
      quote: buildQuoteResponse('AAPL'),
      chart: buildChartResponse('AAPL', UPTREND_CLOSES),
      fundamentals: buildFundamentalsResponse({
        financialData: {
          profitMargins: { raw: 0.30 },
          revenueGrowth: { raw: 0.15 },
          earningsGrowth: { raw: 0.20 },
          returnOnEquity: { raw: 0.35 },
          debtToEquity: { raw: 50 },
        },
      }),
      news: buildNewsResponse(STANDARD_NEWS),
    });

    await withMockFetch(mock, async () => {
      const result = await getSymbolAnalysis('AAPL');
      assert.equal(result.analysis.fundamentals_analyst.stance, 'strong');
    });
  });

  it('returns weak stance for poor fundamentals', async () => {
    const mock = buildRoutedMock({
      quote: buildQuoteResponse('AAPL'),
      chart: buildChartResponse('AAPL', UPTREND_CLOSES),
      fundamentals: buildFundamentalsResponse({
        financialData: {
          profitMargins: { raw: -0.05 },
          revenueGrowth: { raw: -0.10 },
          earningsGrowth: { raw: -0.15 },
          returnOnEquity: { raw: -0.05 },
          debtToEquity: { raw: 300 },
        },
      }),
      news: buildNewsResponse(STANDARD_NEWS),
    });

    await withMockFetch(mock, async () => {
      const result = await getSymbolAnalysis('AAPL');
      assert.equal(result.analysis.fundamentals_analyst.stance, 'weak');
    });
  });
});

// ---------------------------------------------------------------------------
// news_analyst
// ---------------------------------------------------------------------------

describe('getSymbolAnalysis — news_analyst', () => {
  it('returns active stance when news is present', async () => {
    const mock = buildRoutedMock({
      quote: buildQuoteResponse('AAPL'),
      chart: buildChartResponse('AAPL', UPTREND_CLOSES),
      fundamentals: buildFundamentalsResponse(),
      news: buildNewsResponse(STANDARD_NEWS),
    });

    await withMockFetch(mock, async () => {
      const result = await getSymbolAnalysis('AAPL');
      assert.equal(result.analysis.news_analyst.stance, 'active');
    });
  });

  it('returns quiet stance when no news', async () => {
    const mock = buildRoutedMock({
      quote: buildQuoteResponse('AAPL'),
      chart: buildChartResponse('AAPL', UPTREND_CLOSES),
      fundamentals: buildFundamentalsResponse(),
      news: buildNewsResponse([]),
    });

    await withMockFetch(mock, async () => {
      const result = await getSymbolAnalysis('AAPL');
      assert.equal(result.analysis.news_analyst.stance, 'quiet');
    });
  });

  it('includes headline signals', async () => {
    const mock = buildRoutedMock({
      quote: buildQuoteResponse('AAPL'),
      chart: buildChartResponse('AAPL', UPTREND_CLOSES),
      fundamentals: buildFundamentalsResponse(),
      news: buildNewsResponse(STANDARD_NEWS),
    });

    await withMockFetch(mock, async () => {
      const result = await getSymbolAnalysis('AAPL');
      const signals = result.analysis.news_analyst.signals;
      assert.ok(signals.length > 0, 'should have headline signals');
      assert.ok(signals.some((s) => s.includes('AAPL beats earnings')));
    });
  });
});

// ---------------------------------------------------------------------------
// risk_analyst
// ---------------------------------------------------------------------------

describe('getSymbolAnalysis — risk_analyst', () => {
  it('returns elevated risk for high beta and extreme RSI', async () => {
    // Overbought RSI (all rising), high beta
    const overboughtCloses = Array.from({ length: 60 }, (_, i) => 100 + i * 3);
    const mock = buildRoutedMock({
      quote: buildQuoteResponse('AAPL', {
        regularMarketPrice: 255,
        fiftyTwoWeekHigh: 260,
        fiftyTwoWeekLow: 100,
      }),
      chart: buildChartResponse('AAPL', overboughtCloses),
      fundamentals: buildFundamentalsResponse({
        summaryDetail: { beta: { raw: 2.0 } },
        financialData: { debtToEquity: { raw: 250 } },
      }),
      news: buildNewsResponse(STANDARD_NEWS),
    });

    await withMockFetch(mock, async () => {
      const result = await getSymbolAnalysis('AAPL');
      assert.equal(result.analysis.risk_analyst.stance, 'elevated');
    });
  });

  it('returns low risk for low beta and moderate RSI', async () => {
    // Moderate closes, low beta
    const moderateCloses = Array.from({ length: 60 }, (_, i) => 200 + Math.sin(i * 0.5) * 5);
    const mock = buildRoutedMock({
      quote: buildQuoteResponse('AAPL', {
        regularMarketPrice: 200,
        fiftyTwoWeekHigh: 220,
        fiftyTwoWeekLow: 180,
      }),
      chart: buildChartResponse('AAPL', moderateCloses),
      fundamentals: buildFundamentalsResponse({
        summaryDetail: { beta: { raw: 0.6 } },
        financialData: { debtToEquity: { raw: 30 } },
      }),
      news: buildNewsResponse(STANDARD_NEWS),
    });

    await withMockFetch(mock, async () => {
      const result = await getSymbolAnalysis('AAPL');
      assert.equal(result.analysis.risk_analyst.stance, 'low');
    });
  });

  it('returns unknown risk when only neutral range data is available', async () => {
    const moderateCloses = Array.from({ length: 60 }, (_, i) => 200 + Math.sin(i * 0.5) * 5);
    const mock = buildRoutedMock({
      quote: buildQuoteResponse('AAPL', {
        regularMarketPrice: 200,
        fiftyTwoWeekHigh: 220,
        fiftyTwoWeekLow: 180,
      }),
      chart: buildChartResponse('AAPL', moderateCloses),
      fundamentals: buildFundamentalsResponse({
        summaryDetail: { beta: { raw: null } },
        financialData: { debtToEquity: { raw: null } },
      }),
      news: buildNewsResponse([]),
    });

    await withMockFetch(mock, async () => {
      const result = await getSymbolAnalysis('AAPL');
      assert.equal(result.analysis.risk_analyst.stance, 'unknown');
      assert.ok(result.analysis.risk_analyst.warnings.some((warning) => /Low-risk classification requires explicit low-risk evidence/i.test(warning)));
    });
  });
});

// ---------------------------------------------------------------------------
// overall_summary
// ---------------------------------------------------------------------------

describe('getSymbolAnalysis — overall_summary', () => {
  it('aggregates analyst stances into summary', async () => {
    const mock = buildRoutedMock({
      quote: buildQuoteResponse('AAPL'),
      chart: buildChartResponse('AAPL', UPTREND_CLOSES),
      fundamentals: buildFundamentalsResponse(),
      news: buildNewsResponse(STANDARD_NEWS),
    });

    await withMockFetch(mock, async () => {
      const result = await getSymbolAnalysis('AAPL');
      const summary = result.analysis.overall_summary;
      assert.ok(typeof summary.stance === 'string');
      assert.ok(summary.signals.length > 0, 'overall signals should aggregate');
    });
  });
});

// ---------------------------------------------------------------------------
// Partial failure — graceful degradation
// ---------------------------------------------------------------------------

describe('getSymbolAnalysis — partial data failure', () => {
  it('succeeds when fundamentals fail but quote/ta/news work', async () => {
    const mock = async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('quoteSummary')) {
        return { ok: false, status: 404, json: async () => ({}) };
      }
      if (urlStr.includes('search')) {
        return { ok: true, json: async () => buildNewsResponse(STANDARD_NEWS) };
      }
      if (urlStr.includes('range=3mo')) {
        return { ok: true, json: async () => buildChartResponse('AAPL', UPTREND_CLOSES) };
      }
      return { ok: true, json: async () => buildQuoteResponse('AAPL') };
    };

    await withMockFetch(mock, async () => {
      const result = await getSymbolAnalysis('AAPL');
      assert.equal(result.success, true);
      assert.equal(result.inputs.fundamentals, null);
      assert.ok(result.analysis.fundamentals_analyst.warnings.length > 0);
    });
  });

  it('succeeds when news fails but quote/ta/fundamentals work', async () => {
    const mock = async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('search')) {
        return { ok: false, status: 500, json: async () => ({}) };
      }
      if (urlStr.includes('quoteSummary')) {
        return { ok: true, json: async () => buildFundamentalsResponse() };
      }
      if (urlStr.includes('range=3mo')) {
        return { ok: true, json: async () => buildChartResponse('AAPL', UPTREND_CLOSES) };
      }
      return { ok: true, json: async () => buildQuoteResponse('AAPL') };
    };

    await withMockFetch(mock, async () => {
      const result = await getSymbolAnalysis('AAPL');
      assert.equal(result.success, true);
      assert.equal(result.inputs.news, null);
      assert.ok(result.analysis.news_analyst.warnings.length > 0);
    });
  });

  it('returns degraded schema when quote fetch fails but other inputs exist', async () => {
    const mock = async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('quoteSummary')) {
        return { ok: true, json: async () => buildFundamentalsResponse() };
      }
      if (urlStr.includes('search')) {
        return { ok: true, json: async () => buildNewsResponse(STANDARD_NEWS) };
      }
      if (urlStr.includes('range=3mo')) {
        return { ok: true, json: async () => buildChartResponse('AAPL', UPTREND_CLOSES) };
      }
      return { ok: false, status: 503, json: async () => ({}) };
    };

    await withMockFetch(mock, async () => {
      const result = await getSymbolAnalysis('AAPL');
      assert.equal(result.success, true);
      assert.equal(result.inputs.quote, null);
      assert.ok(result.inputs.fundamentals);
      assert.ok(result.inputs.ta_summary);
      assert.ok(result.inputs.news);
      assert.ok(Array.isArray(result.warnings));
      assert.ok(result.warnings.some((warning) => /Quote data unavailable/i.test(warning)));
      assert.ok(result.analysis);
    });
  });

  it('returns schema-shaped failure only when every upstream input fails', async () => {
    const mock = async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    });

    await withMockFetch(mock, async () => {
      const result = await getSymbolAnalysis('AAPL');
      assert.equal(result.success, false);
      assert.equal(result.inputs.quote, null);
      assert.equal(result.inputs.fundamentals, null);
      assert.equal(result.inputs.ta_summary, null);
      assert.equal(result.inputs.news, null);
      assert.ok(result.error);
      assert.ok(result.analysis);
      assert.equal(result.analysis.risk_analyst.stance, 'unknown');
      assert.notEqual(result.analysis.overall_summary.stance, 'leaning_positive');
    });
  });

  it('returns schema-shaped failure when only empty news is available', async () => {
    const mock = async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('search')) {
        return { ok: true, json: async () => buildNewsResponse([]) };
      }
      return { ok: false, status: 503, json: async () => ({}) };
    };

    await withMockFetch(mock, async () => {
      const result = await getSymbolAnalysis('AAPL');
      assert.equal(result.success, false);
      assert.equal(result.inputs.quote, null);
      assert.equal(result.inputs.fundamentals, null);
      assert.equal(result.inputs.ta_summary, null);
      assert.ok(result.inputs.news);
      assert.ok(result.error);
      assert.equal(result.analysis.risk_analyst.stance, 'unknown');
      assert.notEqual(result.analysis.overall_summary.stance, 'leaning_positive');
    });
  });

  it('keeps overall summary mixed when only fundamentals are available', async () => {
    const mock = async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('quoteSummary')) {
        return { ok: true, json: async () => buildFundamentalsResponse() };
      }
      return { ok: false, status: 503, json: async () => ({}) };
    };

    await withMockFetch(mock, async () => {
      const result = await getSymbolAnalysis('AAPL');
      assert.equal(result.success, true);
      assert.equal(result.inputs.quote, null);
      assert.ok(result.inputs.fundamentals);
      assert.equal(result.inputs.ta_summary, null);
      assert.equal(result.analysis.overall_summary.stance, 'mixed');
      assert.ok(result.analysis.overall_summary.warnings.some((warning) => /fewer than two core datasets/i.test(warning)));
    });
  });

  it('keeps overall summary mixed when only TA is available', async () => {
    const mock = async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('range=3mo')) {
        return { ok: true, json: async () => buildChartResponse('AAPL', UPTREND_CLOSES) };
      }
      return { ok: false, status: 503, json: async () => ({}) };
    };

    await withMockFetch(mock, async () => {
      const result = await getSymbolAnalysis('AAPL');
      assert.equal(result.success, true);
      assert.equal(result.inputs.quote, null);
      assert.equal(result.inputs.fundamentals, null);
      assert.ok(result.inputs.ta_summary);
      assert.equal(result.analysis.overall_summary.stance, 'mixed');
      assert.ok(result.analysis.overall_summary.warnings.some((warning) => /fewer than two core datasets/i.test(warning)));
    });
  });
});

// ---------------------------------------------------------------------------
// Determinism — same inputs should produce identical output (minus timestamps)
// ---------------------------------------------------------------------------

describe('getSymbolAnalysis — determinism', () => {
  it('produces identical analysis for identical inputs', async () => {
    const mock = buildRoutedMock({
      quote: buildQuoteResponse('AAPL'),
      chart: buildChartResponse('AAPL', UPTREND_CLOSES),
      fundamentals: buildFundamentalsResponse(),
      news: buildNewsResponse(STANDARD_NEWS),
    });

    await withMockFetch(mock, async () => {
      const r1 = await getSymbolAnalysis('AAPL');
      const r2 = await getSymbolAnalysis('AAPL');
      // Ignore timestamps
      delete r1.generated_at;
      delete r2.generated_at;
      delete r1.inputs?.quote?.retrieved_at;
      delete r2.inputs?.quote?.retrieved_at;
      delete r1.inputs?.fundamentals?.retrieved_at;
      delete r2.inputs?.fundamentals?.retrieved_at;
      delete r1.inputs?.ta_summary?.retrieved_at;
      delete r2.inputs?.ta_summary?.retrieved_at;
      delete r1.inputs?.news?.retrieved_at;
      delete r2.inputs?.news?.retrieved_at;
      delete r1.generated_at;
      delete r2.generated_at;
      assert.deepEqual(r1, r2);
    });
  });
});
