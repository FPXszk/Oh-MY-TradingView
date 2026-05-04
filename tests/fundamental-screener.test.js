import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { runFundamentalScreener } from '../src/core/fundamental-screener.js';

function buildRow(symbol, values) {
  return {
    s: symbol,
    d: [
      values.name,
      values.sector,
      values.industry,
      values.close,
      values.rsi,
      values.sma200,
      values.sma50,
      values.high52w,
      values.perf3m,
      values.relativeVolume,
      values.marketCap,
      values.eps,
      values.roe,
      values.grossMargin,
      values.fcfMargin,
      values.fcfTtm,
      values.netDebt,
      values.volume,
    ],
  };
}

describe('runFundamentalScreener', () => {
  it('returns rank breakdown, sector ranking, and market breakdown', async () => {
    const payload = {
      totalCount: 4,
      data: [
        buildRow('NASDAQ:AAPL', {
          name: 'Apple',
          sector: 'Technology Services',
          industry: 'Consumer Electronics',
          close: 100,
          rsi: 70,
          sma200: 90,
          sma50: 95,
          high52w: 110,
          perf3m: 30,
          relativeVolume: 2,
          marketCap: 1_500_000_000,
          eps: 3,
          roe: 25,
          grossMargin: 50,
          fcfMargin: 20,
          fcfTtm: 100_000_000,
          netDebt: -100_000_000,
          volume: 1_000_000,
        }),
        buildRow('NYSE:MSFT', {
          name: 'Microsoft',
          sector: 'Technology Services',
          industry: 'Software',
          close: 200,
          rsi: 71,
          sma200: 150,
          sma50: 180,
          high52w: 220,
          perf3m: 20,
          relativeVolume: 1.8,
          marketCap: 2_000_000_000,
          eps: 4,
          roe: 30,
          grossMargin: 60,
          fcfMargin: 25,
          fcfTtm: 200_000_000,
          netDebt: -200_000_000,
          volume: 2_000_000,
        }),
        buildRow('OTC:XYZF', {
          name: 'XYZ Foods',
          sector: 'Consumer Non-Durables',
          industry: 'Food Retail',
          close: 80,
          rsi: 66,
          sma200: 70,
          sma50: 75,
          high52w: 100,
          perf3m: 15,
          relativeVolume: 1.5,
          marketCap: 1_200_000_000,
          eps: 2,
          roe: 18,
          grossMargin: 45,
          fcfMargin: 15,
          fcfTtm: 80_000_000,
          netDebt: 50_000_000,
          volume: 500_000,
        }),
        buildRow('NYSE:WEAK', {
          name: 'Weak Energy',
          sector: 'Energy Minerals',
          industry: 'Integrated Oil',
          close: 60,
          rsi: 62,
          sma200: 50,
          sma50: 55,
          high52w: 90,
          perf3m: 5,
          relativeVolume: 1.3,
          marketCap: 1_100_000_000,
          eps: 1,
          roe: 17,
          grossMargin: 42,
          fcfMargin: 12,
          fcfTtm: 50_000_000,
          netDebt: 10_000_000,
          volume: 400_000,
        }),
      ],
    };

    const result = await runFundamentalScreener({
      limit: 20,
      _deps: {
        fetch: async () => ({
          ok: true,
          json: async () => payload,
        }),
      },
    });

    assert.equal(result.clientFiltered, 3);
    assert.equal(result.results.length, 3);
    assert.deepEqual(result.rankingFormula, ['perf3m', 'roe', 'fcfMargin']);
    assert.equal(result.results[0].symbol, 'MSFT');
    assert.deepEqual(result.results[0].rankBreakdown, {
      perf3m: 2,
      roe: 1,
      fcfMargin: 1,
    });
    assert.equal(result.results[1].symbol, 'AAPL');
    assert.deepEqual(result.marketBreakdown.serverFiltered, [
      { name: 'NYSE', count: 2 },
      { name: 'NASDAQ', count: 1 },
      { name: 'OTC', count: 1 },
    ]);
    assert.deepEqual(result.marketBreakdown.clientFiltered, [
      { name: 'NASDAQ', count: 1 },
      { name: 'NYSE', count: 1 },
      { name: 'OTC', count: 1 },
    ]);
    assert.deepEqual(result.sectorRanking[0], {
      sector: 'Technology Services',
      count: 2,
      averagePerf3m: 25,
      averageRankScore: 4.5,
      topSymbol: 'MSFT',
    });
    assert.equal(result.scannerScope.market, 'america');
    assert.equal(result.scannerScope.instrumentTypes[0], 'stock');
  });
});
