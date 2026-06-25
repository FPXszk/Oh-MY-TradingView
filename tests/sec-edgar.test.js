import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getSecEpsTurnaroundSupplements,
  resetSecEdgarCachesForTests,
} from '../src/core/sec-edgar.js';

function jsonResponse(payload, ok = true, status = 200) {
  return {
    ok,
    status,
    async json() {
      return payload;
    },
  };
}

test('SEC EDGAR supplements a same-quarter EPS turnaround', async () => {
  resetSecEdgarCachesForTests();
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    if (url.endsWith('/company_tickers.json')) {
      return jsonResponse({
        0: { ticker: 'TEST', cik_str: 1234 },
      });
    }
    return jsonResponse({
      facts: {
        'us-gaap': {
          EarningsPerShareDiluted: {
            units: {
              'USD/shares': [
                {
                  start: '2025-01-01',
                  end: '2025-03-31',
                  val: -0.5,
                  fy: 2025,
                  fp: 'Q1',
                  form: '10-Q',
                  filed: '2025-05-01',
                  frame: 'CY2025Q1',
                },
                {
                  start: '2026-01-01',
                  end: '2026-03-31',
                  val: 0.75,
                  fy: 2026,
                  fp: 'Q1',
                  form: '10-Q',
                  filed: '2026-05-01',
                  frame: 'CY2026Q1',
                },
              ],
            },
          },
        },
      },
    });
  };

  const result = await getSecEpsTurnaroundSupplements(
    [{ symbol: 'TEST', exchange: 'NASDAQ', epsGrowthTtm: null }],
    { fetchImpl, userAgent: 'Oh-MY-TradingView test@example.com', requestDelayMs: 0 },
  );

  assert.equal(result.TEST.epsGrowthStatus, 'turnaround_to_profit');
  assert.equal(result.TEST.epsGrowthDisplay, '黒字転換 (SEC -0.5 -> 0.75)');
  assert.equal(result.TEST.epsGrowthSourceDetail.fact, 'us-gaap:EarningsPerShareDiluted');
  assert.equal(requests.length, 2);
  assert.equal(requests[0].options.headers['User-Agent'], 'Oh-MY-TradingView test@example.com');
});

test('SEC EDGAR does not label positive-to-positive EPS as a turnaround', async () => {
  resetSecEdgarCachesForTests();
  const fetchImpl = async (url) => {
    if (url.endsWith('/company_tickers.json')) {
      return jsonResponse({ 0: { ticker: 'TEST', cik_str: 1234 } });
    }
    return jsonResponse({
      facts: {
        'us-gaap': {
          EarningsPerShareDiluted: {
            units: {
              'USD/shares': [
                { start: '2025-01-01', end: '2025-03-31', val: 0.2, fp: 'Q1', filed: '2025-05-01' },
                { start: '2026-01-01', end: '2026-03-31', val: 0.4, fp: 'Q1', filed: '2026-05-01' },
              ],
            },
          },
        },
      },
    });
  };

  const result = await getSecEpsTurnaroundSupplements(
    [{ symbol: 'TEST', exchange: 'NASDAQ', epsGrowthTtm: null }],
    { fetchImpl, userAgent: 'Oh-MY-TradingView test@example.com', requestDelayMs: 0 },
  );

  assert.deepEqual(result, {});
});

test('SEC EDGAR does not fall back to an older turnaround when the latest period is not comparable', async () => {
  resetSecEdgarCachesForTests();
  const fetchImpl = async (url) => {
    if (url.endsWith('/company_tickers.json')) {
      return jsonResponse({ 0: { ticker: 'TEST', cik_str: 1234 } });
    }
    return jsonResponse({
      facts: {
        'us-gaap': {
          EarningsPerShareDiluted: {
            units: {
              'USD/shares': [
                { start: '2024-01-01', end: '2024-03-31', val: -0.4, fp: 'Q1', filed: '2024-05-01' },
                { start: '2025-01-01', end: '2025-03-31', val: 0.5, fp: 'Q1', filed: '2025-05-01' },
                { start: '2026-04-01', end: '2026-06-30', val: 0.7, fp: 'Q2', filed: '2026-08-01' },
              ],
            },
          },
        },
      },
    });
  };

  const result = await getSecEpsTurnaroundSupplements(
    [{ symbol: 'TEST', exchange: 'NASDAQ', epsGrowthTtm: null }],
    { fetchImpl, userAgent: 'Oh-MY-TradingView test@example.com', requestDelayMs: 0 },
  );

  assert.deepEqual(result, {});
});

test('SEC EDGAR skips requests without a configured User-Agent', async () => {
  resetSecEdgarCachesForTests();
  let called = false;
  const result = await getSecEpsTurnaroundSupplements(
    [{ symbol: 'TEST', exchange: 'NASDAQ', epsGrowthTtm: null }],
    {
      fetchImpl: async () => {
        called = true;
        return jsonResponse({});
      },
      userAgent: '',
    },
  );

  assert.deepEqual(result, {});
  assert.equal(called, false);
});
