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
      values.perf6m ?? null,
      values.perfY ?? null,
      values.relativeVolume,
      values.atr ?? null,
      values.beta1y ?? null,
      values.marketCap,
      values.eps,
      values.epsGrowthTtm ?? null,
      values.roe,
      values.roic ?? values.roe,
      values.grossMargin,
      values.grossProfitTtm ?? null,
      values.totalAssets ?? null,
      values.operatingMargin ?? null,
      values.fcfMargin,
      values.fcfTtm,
      values.fcfGrowthTtm ?? null,
      values.cashFromOperationsTtm ?? null,
      values.netIncomeTtm ?? null,
      values.revenueGrowthTtm ?? null,
      values.evEbitda ?? null,
      values.pFcfDirect ?? null,
      values.debtToEquity ?? null,
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
      values.perf6m ?? null,
      values.perfY ?? null,
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
      values.perf6m ?? null,
      values.perfY ?? null,
      values.rsi,
      values.relativeVolume,
      values.marketCap,
    ],
  };
}

function isFundRequest(body) {
  return body.symbols?.query?.types?.includes('fund');
}

function isPhase2StockRequest(body) {
  return body.columns?.includes('earnings_per_share_diluted_ttm');
}

function getFilterValue(body, left) {
  return body.filter?.find((entry) => entry.left === left)?.right ?? null;
}

function createMockFetch({ phase1Payload, phase2PayloadsBySector, stockBodies }) {
  return async (_url, options) => {
    const body = JSON.parse(options.body);
    if (isFundRequest(body) || !isPhase2StockRequest(body)) {
      return {
        ok: true,
        json: async () => phase1Payload,
      };
    }

    stockBodies.push(body);
    const sector = getFilterValue(body, 'sector');

    return {
      ok: true,
      json: async () => phase2PayloadsBySector[sector] ?? { totalCount: 0, data: [] },
    };
  };
}

describe('runFundamentalScreener', () => {
  it('uses TradingView stock-sector US profiles and activates producer manufacturing', async () => {
    const stockBodies = [];
    const result = await runFundamentalScreener({
      limit: 10,
      _deps: {
        fetch: createMockFetch({
          stockBodies,
          phase1Payload: {
            totalCount: 4,
            data: [
              buildPhase1StockRow('NASDAQ:NVDA', {
                name: 'Nvidia',
                sector: 'Electronic Technology',
                perf1m: 26,
                perf3m: 19,
                perf6m: 40,
                perfY: 80,
                rsi: 73,
                relativeVolume: 0.9,
                marketCap: 3_000_000_000,
              }),
              buildPhase1StockRow('NYSE:CAT', {
                name: 'Caterpillar',
                sector: 'Producer Manufacturing',
                perf1m: 21,
                perf3m: 17,
                perf6m: 38,
                perfY: 78,
                rsi: 70,
                relativeVolume: 1.0,
                marketCap: 2_600_000_000,
              }),
              buildPhase1StockRow('NASDAQ:MSFT', {
                name: 'Microsoft',
                sector: 'Technology Services',
                perf1m: 20,
                perf3m: 15,
                perf6m: 35,
                perfY: 70,
                rsi: 69,
                relativeVolume: 1.1,
                marketCap: 2_500_000_000,
              }),
              buildPhase1StockRow('NYSE:JPM', {
                name: 'JPMorgan Chase',
                sector: 'Finance',
                perf1m: 2,
                perf3m: 1,
                perf6m: 5,
                perfY: 10,
                rsi: 49,
                relativeVolume: 1.0,
                marketCap: 2_400_000_000,
              }),
            ],
          },
          phase2PayloadsBySector: {
            'Technology Services': {
              totalCount: 1,
              data: [
                buildPhase2Row('NASDAQ:ADEA', {
                  name: 'Adeia',
                  sector: 'Technology Services',
                  industry: 'Packaged Software',
                  close: 13,
                  rsi: 66,
                  sma200: 10,
                  sma50: 11,
                  high52w: 14,
                  perf3m: 25,
                  relativeVolume: 1.4,
                  marketCap: 1_500_000_000,
                  eps: 1.2,
                  roe: 29,
                  grossMargin: 72,
                  fcfMargin: 29,
                  fcfTtm: 90_000_000,
                  revenueGrowthTtm: 16,
                  netDebt: 0,
                  volume: 300_000,
                }),
              ],
            },
            'Electronic Technology': {
              totalCount: 5,
              data: [
                buildPhase2Row('NASDAQ:QCOM', {
                  name: 'Qualcomm',
                  sector: 'Electronic Technology',
                  industry: 'Semiconductors',
                  close: 170,
                  rsi: 64,
                  sma200: 150,
                  sma50: 160,
                  high52w: 180,
                  perf3m: 18,
                  relativeVolume: 0.95,
                  marketCap: 2_200_000_000,
                  eps: 7,
                  roe: 22,
                  grossMargin: 56,
                  fcfMargin: 26,
                  fcfTtm: 70_000_000,
                  netDebt: -5_000_000,
                  volume: 800_000,
                }),
                buildPhase2Row('NASDAQ:MU', {
                  name: 'Micron',
                  sector: 'Electronic Technology',
                  industry: 'Semiconductors',
                  close: 110,
                  rsi: 63,
                  sma200: 90,
                  sma50: 100,
                  high52w: 120,
                  perf3m: 15,
                  relativeVolume: 1.0,
                  marketCap: 2_000_000_000,
                  eps: 5,
                  roe: 18,
                  grossMargin: 35,
                  fcfMargin: 10,
                  fcfTtm: 50_000_000,
                  netDebt: 0,
                  volume: 700_000,
                }),
                buildPhase2Row('NASDAQ:SNDK', {
                  name: 'Sandisk',
                  sector: 'Electronic Technology',
                  industry: 'Computer Peripherals',
                  close: 55,
                  rsi: 65,
                  sma200: 48,
                  sma50: 50,
                  high52w: 60,
                  perf3m: 17,
                  perf6m: 580,
                  perfY: 1400,
                  relativeVolume: 1.0,
                  marketCap: 1_400_000_000,
                  eps: 2,
                  roe: 17,
                  grossMargin: 31,
                  fcfMargin: 8,
                  fcfTtm: 20_000_000,
                  netDebt: 0,
                  volume: 500_000,
                }),
                buildPhase2Row('NASDAQ:AAPL', {
                  name: 'Apple',
                  sector: 'Electronic Technology',
                  industry: 'Telecommunications Equipment',
                  close: 190,
                  rsi: 65,
                  sma200: 170,
                  sma50: 180,
                  high52w: 200,
                  perf3m: 16,
                  relativeVolume: 1.1,
                  marketCap: 2_500_000_000,
                  eps: 6,
                  roe: 24,
                  grossMargin: 45,
                  fcfMargin: 24,
                  fcfTtm: 95_000_000,
                  netDebt: -10_000_000,
                  volume: 900_000,
                }),
                buildPhase2Row('NASDAQ:INTC', {
                  name: 'Intel',
                  sector: 'Electronic Technology',
                  industry: 'Semiconductors',
                  close: 30,
                  rsi: 62,
                  sma200: 27,
                  sma50: 29,
                  high52w: 35,
                  perf3m: 10,
                  relativeVolume: 0.95,
                  marketCap: 1_800_000_000,
                  eps: 1.5,
                  roe: 16,
                  grossMargin: 48,
                  fcfMargin: 8,
                  fcfTtm: 25_000_000,
                  netDebt: 15_000_000,
                  volume: 850_000,
                }),
              ],
            },
            'Producer Manufacturing': {
              totalCount: 1,
              data: [
                buildPhase2Row('NASDAQ:LITE', {
                  name: 'Lumentum',
                  sector: 'Producer Manufacturing',
                  industry: 'Electrical Products',
                  close: 90,
                  rsi: 66,
                  sma200: 70,
                  sma50: 80,
                  high52w: 100,
                  perf3m: 35,
                  perf6m: 650,
                  perfY: 1500,
                  relativeVolume: 1.0,
                  marketCap: 1_700_000_000,
                  eps: 1.4,
                  roe: 14,
                  grossMargin: 31,
                  fcfMargin: 7,
                  fcfTtm: 50_000_000,
                  netDebt: 10_000_000,
                  volume: 600_000,
                }),
              ],
            },
          },
        }),
      },
    });

    assert.equal(result.totalScanned, 7);
    assert.equal(result.serverFiltered, 7);
    assert.equal(result.phase1Filtered, 7);
    assert.equal(result.clientFiltered, 6);
    assert.ok(result.results.some((row) => row.symbol === 'LITE'));
    assert.ok(result.results.some((row) => row.symbol === 'SNDK'));
    assert.deepEqual(result.results.find((row) => row.symbol === 'LITE').extremeMomentum.flags, [
      'perf6m_gt_600',
      'perfY_gt_1000',
    ]);
    assert.deepEqual(result.results.find((row) => row.symbol === 'SNDK').extremeMomentum.flags, [
      'perfY_gt_1000',
    ]);
    assert.ok(result.results[0].rankBreakdown.priceMomentum);
    assert.ok(result.results[0].rankBreakdown.quality);
    assert.equal(result.results.find((row) => row.symbol === 'ADEA').ruleOf40, 45);
    assert.equal(result.results.find((row) => row.symbol === 'MU').ruleOf40, null);
    assert.deepEqual(result.criteria.profile_summaries.map((profile) => profile.label), [
      'Technology Services',
      'Electronic Technology',
      'Electronic Technology / Semiconductors',
      'Producer Manufacturing',
      'Finance',
    ]);
    assert.deepEqual(result.criteria.excluded_phase2_sectors, []);
    assert.equal(result.scannerScope.profileRequestCount, 5);
    assert.deepEqual(
      stockBodies.map((body) => getFilterValue(body, 'sector')),
      ['Technology Services', 'Electronic Technology', 'Electronic Technology', 'Producer Manufacturing', 'Finance'],
    );
  });

  it('applies Japan-specific profiles and skips finance even when phase1 selects it', async () => {
    const stockBodies = [];
    const result = await runFundamentalScreener({
      limit: 10,
      _deps: {
        market: 'japan',
        exchangeAllowlist: ['TSE'],
        symbolAllowlistKey: 'jp-prime-mini',
        symbolAllowlistByKey: {
          'jp-prime-mini': ['8035', '4063', '8306'],
        },
        scopeLabel: 'JPX Prime domestic stocks snapshot',
        fetch: createMockFetch({
          stockBodies,
          phase1Payload: {
            totalCount: 4,
            data: [
              buildPhase1StockRow('TSE:8035', {
                name: 'Tokyo Electron',
                sector: 'Electronic Technology',
                perf1m: 12,
                perf3m: 24,
                rsi: 68,
                relativeVolume: 1.1,
                marketCap: 3_500_000_000,
              }),
              buildPhase1StockRow('TSE:4063', {
                name: 'Shin-Etsu Chemical',
                sector: 'Process Industries',
                perf1m: 8,
                perf3m: 18,
                rsi: 63,
                relativeVolume: 1.0,
                marketCap: 2_900_000_000,
              }),
              buildPhase1StockRow('TSE:8306', {
                name: 'Mitsubishi UFJ',
                sector: 'Finance',
                perf1m: 7,
                perf3m: 15,
                rsi: 62,
                relativeVolume: 1.1,
                marketCap: 2_800_000_000,
              }),
              buildPhase1StockRow('TSE:7203', {
                name: 'Toyota',
                sector: 'Consumer Durables',
                perf1m: 2,
                perf3m: 4,
                rsi: 49,
                relativeVolume: 0.8,
                marketCap: 3_100_000_000,
              }),
            ],
          },
          phase2PayloadsBySector: {
            'Electronic Technology': {
              totalCount: 2,
              data: [
                buildPhase2Row('TSE:8035', {
                  name: 'Tokyo Electron',
                  sector: 'Electronic Technology',
                  industry: 'Electronic Production Equipment',
                  close: 22000,
                  rsi: 58,
                  sma200: 20000,
                  sma50: 21000,
                  high52w: 24000,
                  perf3m: 12,
                  relativeVolume: 0.9,
                  marketCap: 3_500_000_000,
                  eps: 10,
                  roe: 18,
                  grossMargin: 60,
                  fcfMargin: 35,
                  fcfTtm: 54_000_000,
                  revenueGrowthTtm: 20,
                  netDebt: -10_000_000,
                  volume: 400_000,
                }),
                buildPhase2Row('TSE:6857', {
                  name: 'Advantest',
                  sector: 'Electronic Technology',
                  industry: 'Electronic Production Equipment',
                  close: 7000,
                  rsi: 51,
                  sma200: 7100,
                  sma50: 7050,
                  high52w: 9000,
                  perf3m: 4,
                  relativeVolume: 0.6,
                  marketCap: 2_400_000_000,
                  eps: 7,
                  roe: 15,
                  grossMargin: 52,
                  fcfMargin: 18,
                  fcfTtm: 45_000_000,
                  netDebt: -5_000_000,
                  volume: 350_000,
                }),
              ],
            },
            'Process Industries': {
              totalCount: 2,
              data: [
                buildPhase2Row('TSE:4063', {
                  name: 'Shin-Etsu Chemical',
                  sector: 'Process Industries',
                  industry: 'Chemicals: Specialty',
                  close: 6200,
                  rsi: 60,
                  sma200: 5600,
                  sma50: 5900,
                  high52w: 7000,
                  perf3m: 7,
                  relativeVolume: 1.0,
                  marketCap: 2_900_000_000,
                  eps: 9,
                  roe: 11,
                  grossMargin: 34,
                  fcfMargin: 12,
                  fcfTtm: 95_000_000,
                  netDebt: -10_000_000,
                  volume: 500_000,
                }),
                buildPhase2Row('TSE:8001', {
                  name: 'Itochu',
                  sector: 'Distribution Services',
                  industry: 'Trading Companies',
                  close: 7800,
                  rsi: 48,
                  sma200: 7300,
                  sma50: 7600,
                  high52w: 8200,
                  perf3m: 3,
                  relativeVolume: 0.7,
                  marketCap: 2_600_000_000,
                  eps: 8,
                  roe: 14,
                  grossMargin: 18,
                  fcfMargin: 10,
                  fcfTtm: 120_000_000,
                  netDebt: 10_000_000,
                  volume: 450_000,
                }),
              ],
            },
          },
        }),
      },
    });

    assert.equal(result.totalScanned, 4);
    assert.equal(result.serverFiltered, 2);
    assert.equal(result.phase1Filtered, 2);
    assert.equal(result.clientFiltered, 2);
    assert.deepEqual(result.results.map((row) => row.symbol), ['8035', '4063']);
    assert.deepEqual(result.criteria.profile_summaries.map((profile) => profile.label), [
      'Japan Manufacturing',
      'Japan Materials & Trading',
    ]);
    assert.deepEqual(result.criteria.excluded_phase2_sectors, ['Finance']);
    assert.equal(result.scannerScope.market, 'japan');
    assert.equal(result.scannerScope.scopeLabel, 'JPX Prime domestic stocks snapshot');
    assert.equal(result.results.find((row) => row.symbol === '8035').ruleOf40, null);
    assert.equal(result.criteria.rule_of_40_policy, undefined);
    assert.deepEqual(result.rankingFormula, ['priceMomentum', 'sectorStrength', 'quality', 'growth', 'riskValue']);
    assert.ok(stockBodies.every((body) => getFilterValue(body, 'sector') !== 'Finance'));
  });

  it('applies profile-specific Yahoo revenue growth thresholds', async () => {
    const result = await runFundamentalScreener({
      limit: 10,
      enrichWithYahoo: true,
      _deps: {
        getSymbolFundamentals: async (symbol) => ({
          revenueGrowth: symbol === 'MU' ? 0.12 : 0.12,
        }),
        fetch: createMockFetch({
          stockBodies: [],
          phase1Payload: {
            totalCount: 2,
            data: [
              buildPhase1StockRow('NASDAQ:NVDA', {
                name: 'Nvidia',
                sector: 'Electronic Technology',
                perf1m: 25,
                perf3m: 19,
                perf6m: 40,
                perfY: 80,
                rsi: 73,
                relativeVolume: 1.0,
                marketCap: 3_000_000_000,
              }),
              buildPhase1StockRow('NASDAQ:MSFT', {
                name: 'Microsoft',
                sector: 'Technology Services',
                perf1m: 20,
                perf3m: 15,
                perf6m: 35,
                perfY: 70,
                rsi: 69,
                relativeVolume: 1.0,
                marketCap: 2_500_000_000,
              }),
            ],
          },
          phase2PayloadsBySector: {
            'Technology Services': {
              totalCount: 1,
              data: [
                buildPhase2Row('NASDAQ:ADEA', {
                  name: 'Adeia',
                  sector: 'Technology Services',
                  industry: 'Packaged Software',
                  close: 13,
                  rsi: 66,
                  sma200: 10,
                  sma50: 11,
                  high52w: 14,
                  perf3m: 25,
                  relativeVolume: 1.4,
                  marketCap: 1_500_000_000,
                  eps: 1.2,
                  roe: 29,
                  grossMargin: 72,
                  fcfMargin: 29,
                  fcfTtm: 90_000_000,
                  revenueGrowthTtm: 16,
                  netDebt: 0,
                  volume: 300_000,
                }),
              ],
            },
            'Electronic Technology': {
              totalCount: 1,
              data: [
                buildPhase2Row('NASDAQ:MU', {
                  name: 'Micron',
                  sector: 'Electronic Technology',
                  industry: 'Semiconductors',
                  close: 110,
                  rsi: 63,
                  sma200: 90,
                  sma50: 100,
                  high52w: 120,
                  perf3m: 15,
                  relativeVolume: 1.0,
                  marketCap: 2_000_000_000,
                  eps: 5,
                  roe: 18,
                  grossMargin: 35,
                  fcfMargin: 10,
                  fcfTtm: 30_000_000,
                  netDebt: 0,
                  volume: 700_000,
                }),
              ],
            },
          },
        }),
      },
    });

    assert.deepEqual(result.results.map((row) => row.symbol), ['ADEA']);
    assert.equal(result.criteria.revenue_growth_policy, 'profile-specific minimum, null passes');
    assert.equal(result.criteria.rule_of_40_policy.hard_filter, false);
    assert.deepEqual(result.rankingFormula, ['priceMomentum', 'sectorStrength', 'quality', 'growth', 'riskValue', 'ruleOf40']);
    assert.deepEqual(result.rankingBlocks.map((block) => block.key), result.rankingFormula);
  });
});
