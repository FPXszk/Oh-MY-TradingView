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

  it('applies exchange allowlist, symbol allowlist, and custom gross-margin threshold', async () => {
    const payload = {
      totalCount: 5,
      data: [
        buildRow('NASDAQ:NVDA', {
          name: 'NVIDIA',
          sector: 'Electronic Technology',
          industry: 'Semiconductors',
          close: 100,
          rsi: 70,
          sma200: 90,
          sma50: 95,
          high52w: 110,
          perf3m: 35,
          relativeVolume: 2,
          marketCap: 2_500_000_000,
          eps: 4,
          roe: 28,
          grossMargin: 32,
          fcfMargin: 18,
          fcfTtm: 100_000_000,
          netDebt: -100_000_000,
          volume: 1_000_000,
        }),
        buildRow('NYSE:IBM', {
          name: 'IBM',
          sector: 'Technology Services',
          industry: 'IT Services',
          close: 120,
          rsi: 65,
          sma200: 100,
          sma50: 110,
          high52w: 130,
          perf3m: 18,
          relativeVolume: 1.4,
          marketCap: 1_800_000_000,
          eps: 5,
          roe: 20,
          grossMargin: 48,
          fcfMargin: 16,
          fcfTtm: 90_000_000,
          netDebt: 10_000_000,
          volume: 900_000,
        }),
        buildRow('OTC:SHOPF', {
          name: 'Shopify OTC',
          sector: 'Technology Services',
          industry: 'Software',
          close: 80,
          rsi: 67,
          sma200: 70,
          sma50: 75,
          high52w: 100,
          perf3m: 22,
          relativeVolume: 1.6,
          marketCap: 1_300_000_000,
          eps: 2,
          roe: 19,
          grossMargin: 55,
          fcfMargin: 14,
          fcfTtm: 70_000_000,
          netDebt: 5_000_000,
          volume: 600_000,
        }),
        buildRow('TSE:7203', {
          name: 'Toyota',
          sector: 'Consumer Durables',
          industry: 'Motor Vehicles',
          close: 3000,
          rsi: 68,
          sma200: 2800,
          sma50: 2900,
          high52w: 3200,
          perf3m: 15,
          relativeVolume: 1.3,
          marketCap: 3_000_000_000,
          eps: 10,
          roe: 17,
          grossMargin: 31,
          fcfMargin: 12,
          fcfTtm: 200_000_000,
          netDebt: -50_000_000,
          volume: 800_000,
        }),
        buildRow('TSE:9999', {
          name: 'Non Prime',
          sector: 'Retail Trade',
          industry: 'Retail',
          close: 1500,
          rsi: 66,
          sma200: 1300,
          sma50: 1400,
          high52w: 1800,
          perf3m: 17,
          relativeVolume: 1.25,
          marketCap: 1_500_000_000,
          eps: 3,
          roe: 18,
          grossMargin: 34,
          fcfMargin: 11,
          fcfTtm: 80_000_000,
          netDebt: 1_000_000,
          volume: 300_000,
        }),
      ],
    };

    const usResult = await runFundamentalScreener({
      limit: 20,
      _deps: {
        market: 'america',
        exchangeAllowlist: ['NASDAQ', 'NYSE'],
        grossMarginMinPct: 30,
        fetch: async () => ({
          ok: true,
          json: async () => payload,
        }),
      },
    });

    assert.equal(usResult.serverFiltered, 2);
    assert.equal(usResult.clientFiltered, 2);
    assert.deepEqual(usResult.criteria.allowed_exchanges, ['NASDAQ', 'NYSE']);
    assert.equal(usResult.criteria.gross_margin_min_pct, 30);
    assert.deepEqual(usResult.marketBreakdown.serverFiltered, [
      { name: 'NASDAQ', count: 1 },
      { name: 'NYSE', count: 1 },
    ]);
    assert.deepEqual(usResult.results.map((row) => row.symbol), ['NVDA', 'IBM']);

    const jpResult = await runFundamentalScreener({
      limit: 20,
      _deps: {
        market: 'japan',
        exchangeAllowlist: ['TSE'],
        grossMarginMinPct: 30,
        symbolAllowlistKey: 'jp-prime-mini',
        symbolAllowlistByKey: {
          'jp-prime-mini': ['7203'],
        },
        scopeLabel: 'JPX Prime domestic stocks snapshot',
        fetch: async () => ({
          ok: true,
          json: async () => payload,
        }),
      },
    });

    assert.equal(jpResult.serverFiltered, 1);
    assert.equal(jpResult.clientFiltered, 1);
    assert.equal(jpResult.criteria.symbol_allowlist_key, 'jp-prime-mini');
    assert.equal(jpResult.scannerScope.market, 'japan');
    assert.equal(jpResult.scannerScope.scopeLabel, 'JPX Prime domestic stocks snapshot');
    assert.deepEqual(jpResult.results.map((row) => row.symbol), ['7203']);
  });
});
