import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { runFundamentalScreener } from '../src/core/fundamental-screener.js';

function buildPhase2Row(symbol, values) {
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

function buildPhase1FundRow(symbol, values) {
  return {
    s: symbol,
    d: [
      values.name,
      values.description,
      values.perf1m,
      values.perf3m,
      values.rsi,
      values.relativeVolume,
      values.volume,
    ],
  };
}

function buildPhase1StockRow(symbol, values) {
  return {
    s: symbol,
    d: [
      values.name,
      values.sector,
      values.perf1m,
      values.perf3m,
      values.rsi,
      values.relativeVolume,
      values.marketCap,
    ],
  };
}

function createMockFetch(handler) {
  return async (_url, options) => ({
    ok: true,
    json: async () => handler(JSON.parse(options.body)),
  });
}

function isFundRequest(body) {
  return body.symbols?.query?.types?.includes('fund');
}

function isPhase2StockRequest(body) {
  return body.columns?.includes('earnings_per_share_diluted_ttm');
}

describe('runFundamentalScreener', () => {
  it('returns US ETF-based sector momentum, phase1 filtering, and phase2 rankings', async () => {
    const phase1Payload = {
      totalCount: 5,
      data: [
        buildPhase1FundRow('AMEX:XLK', {
          name: 'XLK',
          description: 'Technology Select Sector SPDR ETF',
          perf1m: 22,
          perf3m: 14,
          rsi: 72,
          relativeVolume: 1.1,
          volume: 10_000_000,
        }),
        buildPhase1FundRow('NASDAQ:SMH', {
          name: 'SMH',
          description: 'VanEck Semiconductor ETF',
          perf1m: 28,
          perf3m: 20,
          rsi: 75,
          relativeVolume: 0.9,
          volume: 7_000_000,
        }),
        buildPhase1FundRow('AMEX:XLF', {
          name: 'XLF',
          description: 'Financial Select Sector SPDR ETF',
          perf1m: 11,
          perf3m: 9,
          rsi: 63,
          relativeVolume: 1.3,
          volume: 40_000_000,
        }),
        buildPhase1FundRow('AMEX:XLV', {
          name: 'XLV',
          description: 'Health Care Select Sector SPDR ETF',
          perf1m: 6,
          perf3m: 5,
          rsi: 59,
          relativeVolume: 1.2,
          volume: 12_000_000,
        }),
        buildPhase1FundRow('AMEX:XLE', {
          name: 'XLE',
          description: 'Energy Select Sector SPDR ETF',
          perf1m: -2,
          perf3m: 1,
          rsi: 48,
          relativeVolume: 0.9,
          volume: 36_000_000,
        }),
      ],
    };

    const phase2Payload = {
      totalCount: 5,
      data: [
        buildPhase2Row('NASDAQ:NVDA', {
          name: 'NVIDIA',
          sector: 'Electronic Technology',
          industry: 'Semiconductors',
          close: 100,
          rsi: 70,
          sma200: 90,
          sma50: 95,
          high52w: 110,
          perf3m: 40,
          relativeVolume: 2,
          marketCap: 2_500_000_000,
          eps: 4,
          roe: 28,
          grossMargin: 65,
          fcfMargin: 30,
          fcfTtm: 100_000_000,
          netDebt: -50_000_000,
          volume: 1_000_000,
        }),
        buildPhase2Row('NASDAQ:AAPL', {
          name: 'Apple',
          sector: 'Electronic Technology',
          industry: 'Telecommunications Equipment',
          close: 90,
          rsi: 67,
          sma200: 80,
          sma50: 85,
          high52w: 100,
          perf3m: 25,
          relativeVolume: 1.6,
          marketCap: 2_200_000_000,
          eps: 5,
          roe: 24,
          grossMargin: 55,
          fcfMargin: 24,
          fcfTtm: 100_000_000,
          netDebt: -40_000_000,
          volume: 900_000,
        }),
        buildPhase2Row('NYSE:JPM', {
          name: 'JPMorgan',
          sector: 'Finance',
          industry: 'Major Banks',
          close: 80,
          rsi: 65,
          sma200: 70,
          sma50: 75,
          high52w: 90,
          perf3m: 18,
          relativeVolume: 1.4,
          marketCap: 1_800_000_000,
          eps: 4,
          roe: 18,
          grossMargin: 48,
          fcfMargin: 18,
          fcfTtm: 100_000_000,
          netDebt: 10_000_000,
          volume: 800_000,
        }),
        buildPhase2Row('NYSE:UNH', {
          name: 'UnitedHealth',
          sector: 'Health Services',
          industry: 'Managed Health Care',
          close: 70,
          rsi: 64,
          sma200: 60,
          sma50: 65,
          high52w: 85,
          perf3m: 16,
          relativeVolume: 1.3,
          marketCap: 1_700_000_000,
          eps: 4,
          roe: 21,
          grossMargin: 50,
          fcfMargin: 22,
          fcfTtm: 100_000_000,
          netDebt: 5_000_000,
          volume: 700_000,
        }),
        buildPhase2Row('NYSE:XOM', {
          name: 'Exxon Mobil',
          sector: 'Energy Minerals',
          industry: 'Integrated Oil',
          close: 60,
          rsi: 63,
          sma200: 55,
          sma50: 58,
          high52w: 70,
          perf3m: 20,
          relativeVolume: 1.5,
          marketCap: 1_600_000_000,
          eps: 3,
          roe: 20,
          grossMargin: 47,
          fcfMargin: 20,
          fcfTtm: 100_000_000,
          netDebt: 10_000_000,
          volume: 600_000,
        }),
      ],
    };

    const result = await runFundamentalScreener({
      limit: 20,
      _deps: {
        fetch: createMockFetch((body) => {
          if (isFundRequest(body)) return phase1Payload;
          if (isPhase2StockRequest(body)) return phase2Payload;
          assert.fail(`Unexpected request body: ${JSON.stringify(body)}`);
        }),
      },
    });

    assert.equal(result.serverFiltered, 5);
    assert.equal(result.phase1Filtered, 3);
    assert.equal(result.clientFiltered, 3);
    assert.equal(result.results.length, 3);
    assert.equal(result.results[0].symbol, 'NVDA');
    assert.equal(result.sectorMomentum.approach, 'us-sector-etfs');
    assert.deepEqual(result.sectorMomentum.selectedSectors.map((entry) => entry.label), [
      'Semiconductors',
      'Technology',
      'Financials',
    ]);
    assert.deepEqual(result.sectorMomentum.selectedStockSectors, [
      'Electronic Technology',
      'Technology Services',
      'Finance',
    ]);
    assert.deepEqual(result.marketBreakdown.serverFiltered, [
      { name: 'NYSE', count: 3 },
      { name: 'NASDAQ', count: 2 },
    ]);
    assert.deepEqual(result.marketBreakdown.phase1Filtered, [
      { name: 'NASDAQ', count: 2 },
      { name: 'NYSE', count: 1 },
    ]);
    assert.deepEqual(result.sectorRanking[0], {
      sector: 'Electronic Technology',
      count: 2,
      averagePerf3m: 32.5,
      averageRankScore: 4.5,
      topSymbol: 'NVDA',
    });
    assert.match(result.scannerScope.note, /Phase1 then selected Semiconductors, Technology, Financials/);
  });

  it('applies exchange allowlist and symbol allowlist to Japan sector aggregation before phase2 filtering', async () => {
    const phase1Payload = {
      totalCount: 5,
      data: [
        buildPhase1StockRow('TSE:9984', {
          name: 'SoftBank Group',
          sector: 'Communications',
          perf1m: 12,
          perf3m: 24,
          rsi: 68,
          relativeVolume: 1.4,
          marketCap: 3_000_000_000,
        }),
        buildPhase1StockRow('TSE:8306', {
          name: 'Mitsubishi UFJ',
          sector: 'Finance',
          perf1m: 7,
          perf3m: 12,
          rsi: 61,
          relativeVolume: 1.1,
          marketCap: 2_800_000_000,
        }),
        buildPhase1StockRow('TSE:7203', {
          name: 'Toyota',
          sector: 'Producer Manufacturing',
          perf1m: 6,
          perf3m: 10,
          rsi: 60,
          relativeVolume: 1.2,
          marketCap: 3_200_000_000,
        }),
        buildPhase1StockRow('NAG:7203', {
          name: 'Toyota duplicate venue',
          sector: 'Producer Manufacturing',
          perf1m: 8,
          perf3m: 15,
          rsi: 63,
          relativeVolume: 0.5,
          marketCap: 3_200_000_000,
        }),
        buildPhase1StockRow('TSE:9999', {
          name: 'Non Prime',
          sector: 'Retail Trade',
          perf1m: 15,
          perf3m: 30,
          rsi: 72,
          relativeVolume: 1.6,
          marketCap: 1_500_000_000,
        }),
      ],
    };

    const phase2Payload = {
      totalCount: 4,
      data: [
        buildPhase2Row('TSE:9984', {
          name: 'SoftBank Group',
          sector: 'Communications',
          industry: 'Wireless Telecommunications',
          close: 9000,
          rsi: 68,
          sma200: 8000,
          sma50: 8500,
          high52w: 9500,
          perf3m: 24,
          relativeVolume: 1.4,
          marketCap: 3_000_000_000,
          eps: 10,
          roe: 22,
          grossMargin: 40,
          fcfMargin: 20,
          fcfTtm: 100_000_000,
          netDebt: 50_000_000,
          volume: 700_000,
        }),
        buildPhase2Row('TSE:8306', {
          name: 'Mitsubishi UFJ',
          sector: 'Finance',
          industry: 'Major Banks',
          close: 1800,
          rsi: 64,
          sma200: 1600,
          sma50: 1700,
          high52w: 2000,
          perf3m: 12,
          relativeVolume: 1.2,
          marketCap: 2_800_000_000,
          eps: 5,
          roe: 18,
          grossMargin: 35,
          fcfMargin: 14,
          fcfTtm: 100_000_000,
          netDebt: 10_000_000,
          volume: 650_000,
        }),
        buildPhase2Row('TSE:7203', {
          name: 'Toyota',
          sector: 'Producer Manufacturing',
          industry: 'Motor Vehicles',
          close: 3000,
          rsi: 62,
          sma200: 2700,
          sma50: 2850,
          high52w: 3200,
          perf3m: 10,
          relativeVolume: 1.3,
          marketCap: 3_200_000_000,
          eps: 6,
          roe: 16,
          grossMargin: 33,
          fcfMargin: 12,
          fcfTtm: 100_000_000,
          netDebt: 20_000_000,
          volume: 600_000,
        }),
        buildPhase2Row('TSE:9999', {
          name: 'Non Prime',
          sector: 'Retail Trade',
          industry: 'Retail',
          close: 1500,
          rsi: 70,
          sma200: 1300,
          sma50: 1400,
          high52w: 1700,
          perf3m: 30,
          relativeVolume: 1.6,
          marketCap: 1_500_000_000,
          eps: 4,
          roe: 19,
          grossMargin: 38,
          fcfMargin: 15,
          fcfTtm: 100_000_000,
          netDebt: 5_000_000,
          volume: 300_000,
        }),
      ],
    };

    const result = await runFundamentalScreener({
      limit: 20,
      _deps: {
        market: 'japan',
        exchangeAllowlist: ['TSE'],
        grossMarginMinPct: 30,
        symbolAllowlistKey: 'jp-prime-mini',
        symbolAllowlistByKey: {
          'jp-prime-mini': ['7203', '8306', '9984'],
        },
        scopeLabel: 'JPX Prime domestic stocks snapshot',
        fetch: createMockFetch((body) => {
          if (isPhase2StockRequest(body)) return phase2Payload;
          return phase1Payload;
        }),
      },
    });

    assert.equal(result.serverFiltered, 3);
    assert.equal(result.phase1Filtered, 3);
    assert.equal(result.clientFiltered, 2);
    assert.equal(result.sectorMomentum.approach, 'stock-aggregation');
    assert.deepEqual(result.sectorMomentum.selectedSectors.map((entry) => entry.label), [
      'Communications',
      'Finance',
      'Producer Manufacturing',
    ]);
    assert.deepEqual(result.sectorMomentum.selectedStockSectors, [
      'Communications',
      'Finance',
      'Producer Manufacturing',
    ]);
    assert.deepEqual(result.marketBreakdown.serverFiltered, [
      { name: 'TSE', count: 3 },
    ]);
    assert.deepEqual(result.results.map((row) => row.symbol), ['9984', '8306']);
    assert.equal(result.criteria.symbol_allowlist_key, 'jp-prime-mini');
    assert.equal(result.scannerScope.market, 'japan');
    assert.equal(result.scannerScope.scopeLabel, 'JPX Prime domestic stocks snapshot');
  });
});
