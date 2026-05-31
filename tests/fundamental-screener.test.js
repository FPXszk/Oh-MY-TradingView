import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { evaluateSymbolsAgainstFundamentalScreener, runFundamentalScreener } from '../src/core/fundamental-screener.js';

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
      values.close ?? 100,
      values.sma200 ?? 90,
      values.sma50 ?? 95,
      values.high52w ?? 110,
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

function isBenchmarkRequest(body) {
  return body.symbols?.tickers?.some((ticker) => ticker.includes('SPY'));
}

function getFilterValue(body, left) {
  return body.filter?.find((entry) => entry.left === left)?.right ?? null;
}

function createMockFetch({ phase1Payload, benchmarkPayload, phase2PayloadsBySector, stockBodies }) {
  return async (_url, options) => {
    const body = JSON.parse(options.body);
    if (isBenchmarkRequest(body)) {
      return {
        ok: true,
        json: async () => benchmarkPayload ?? { totalCount: 0, data: [] },
      };
    }
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

function assertRankScoresDescending(rows) {
  for (let i = 1; i < rows.length; i += 1) {
    assert.ok(rows[i - 1].rankScore >= rows[i].rankScore);
  }
}

describe('runFundamentalScreener', () => {
  it('uses TradingView stock-sector US profiles and activates producer manufacturing', async () => {
    const stockBodies = [];
    const result = await runFundamentalScreener({
      limit: 10,
      _deps: {
        fetch: createMockFetch({
          stockBodies,
          benchmarkPayload: {
            totalCount: 1,
            data: [
              buildPhase1StockRow('BATS:SPY', {
                name: 'SPY',
                sector: 'Benchmark',
                close: 100,
                sma200: 95,
                sma50: 98,
                high52w: 104,
                perf1m: 6,
                perf3m: 12,
                perf6m: 24,
                perfY: 48,
                rsi: 61,
                relativeVolume: 1.0,
                marketCap: 1_000_000_000,
              }),
            ],
          },
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
                  revenueGrowthTtm: 55,
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
    assertRankScoresDescending(result.results);
    assert.ok(result.results[0].rankScore > result.results[result.results.length - 1].rankScore);
    assert.equal(result.results.find((row) => row.symbol === 'ADEA').ruleOf40, 45);
    assert.equal(result.results.find((row) => row.symbol === 'MU').ruleOf40, 65);
    assert.equal(result.results.find((row) => row.symbol === 'ADEA').primaryTheme, 'Cloud Software');
    assert.ok(result.results.find((row) => row.symbol === 'MU').subThemes.includes('HBM/DRAM'));
    assert.ok(result.themeRanking.some((entry) => entry.theme === 'Memory'));
    assert.ok(result.themeRanking.some((entry) => entry.theme === 'Cloud Software'));
    assert.deepEqual(result.ruleOf40Coverage, {
      total: 6,
      complete: 2,
      revenueOnly: 0,
      fcfOnly: 4,
      missingBoth: 0,
      completePct: 33.3,
    });
    assert.deepEqual(result.criteria.profile_summaries.map((profile) => profile.label), [
      'Technology Services',
      'Electronic Technology',
      'Electronic Technology / Semiconductors',
      'Producer Manufacturing',
    ]);
    assert.deepEqual(result.criteria.excluded_phase2_sectors, []);
    assert.equal(result.scannerScope.profileRequestCount, 4);
    assert.deepEqual(
      stockBodies.map((body) => getFilterValue(body, 'sector')),
      ['Technology Services', 'Electronic Technology', 'Electronic Technology', 'Producer Manufacturing'],
    );
    const technologyServices = result.sectorRanking.find((entry) => entry.sector === 'Technology Services');
    assert.ok(technologyServices);
    assert.equal(technologyServices.topRows[0].symbol, 'ADEA');
    assert.ok(technologyServices.topRows.length <= 30);
    const phase2Set = new Set(result.sectorRanking.map((entry) => entry.sector));
    const phase1Order = result.sectorMomentum.selectedSectors
      .map((entry) => entry.label)
      .filter((label) => phase2Set.has(label));
    const phase2Order = result.sectorRanking.map((entry) => entry.sector);
    assert.deepEqual(phase2Order.slice(0, phase1Order.length), phase1Order);
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
          benchmarkPayload: null,
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
    assertRankScoresDescending(result.results);
    assert.ok(result.results[0].rankScore > result.results[1].rankScore);
    assert.deepEqual(result.criteria.profile_summaries.map((profile) => profile.label), [
      'Japan Manufacturing',
      'Japan Materials & Trading',
    ]);
    assert.deepEqual(result.criteria.excluded_phase2_sectors, ['Finance']);
    assert.equal(result.scannerScope.market, 'japan');
    assert.equal(result.scannerScope.scopeLabel, 'JPX Prime domestic stocks snapshot');
    assert.equal(result.results.find((row) => row.symbol === '8035').ruleOf40, null);
    assert.equal(result.ruleOf40Coverage, null);
    assert.equal(result.criteria.rule_of_40_policy, undefined);
    assert.deepEqual(result.rankingFormula, ['priceMomentum', 'sectorStrength', 'quality', 'growth', 'riskValue']);
    assert.deepEqual(result.rankingBlocks.map((block) => ({ key: block.key, weight: block.weight })), [
      { key: 'priceMomentum', weight: 35 },
      { key: 'sectorStrength', weight: 15 },
      { key: 'quality', weight: 25 },
      { key: 'growth', weight: 10 },
      { key: 'riskValue', weight: 15 },
    ]);
    assert.ok(stockBodies.every((body) => getFilterValue(body, 'sector') !== 'Finance'));
  });

  it('uses Moomoo revenue growth for scoring without hard-failing low-growth names', async () => {
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

    assert.deepEqual(result.results.map((row) => row.symbol), ['ADEA', 'MU']);
    assert.equal(result.criteria.revenue_growth_policy, 'Moomoo revenue growth is used for growth scoring only; low values do not hard-fail');
    assert.equal(result.criteria.rule_of_40_policy.hard_filter, false);
    assert.deepEqual(result.rankingFormula, ['priceMomentum', 'sectorStrength', 'quality', 'growth', 'riskValue', 'ruleOf40']);
    assert.deepEqual(result.rankingBlocks.map((block) => block.key), result.rankingFormula);
    assert.deepEqual(result.rankingBlocks.map((block) => ({ key: block.key, weight: block.weight })), [
      { key: 'priceMomentum', weight: 32 },
      { key: 'sectorStrength', weight: 15 },
      { key: 'quality', weight: 25 },
      { key: 'growth', weight: 10 },
      { key: 'riskValue', weight: 15 },
      { key: 'ruleOf40', weight: 3 },
    ]);
    assert.equal(result.results.find((row) => row.symbol === 'MU').revenueGrowth, 0.12);
  });

  it('backfills EPS YoY only when TradingView data is missing', async () => {
    const result = await runFundamentalScreener({
      limit: 10,
      enrichWithYahoo: true,
      _deps: {
        getSymbolFundamentals: async (symbol) => ({
          revenueGrowth: symbol === 'QCOM' ? 0.08 : 0.12,
          earningsGrowth: symbol === 'MU' ? 0.27 : null,
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
                  epsGrowthTtm: 18,
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
              totalCount: 2,
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
                  revenueGrowthTtm: 20,
                  netDebt: 0,
                  volume: 700_000,
                }),
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
                  revenueGrowthTtm: 14,
                  netDebt: -5_000_000,
                  volume: 800_000,
                }),
              ],
            },
          },
        }),
      },
    });

    assert.equal(result.results.find((row) => row.symbol === 'ADEA').epsGrowthTtm, 18);
    assert.equal(result.results.find((row) => row.symbol === 'MU').epsGrowthTtm, 27);
    assert.equal(result.results.find((row) => row.symbol === 'QCOM').epsGrowthTtm, null);
  });

  it('keeps weak-fundamental momentum names below stronger all-around candidates', async () => {
    const result = await runFundamentalScreener({
      limit: 10,
      _deps: {
        fetch: createMockFetch({
          stockBodies: [],
          phase1Payload: {
            totalCount: 2,
            data: [
              buildPhase1StockRow('NASDAQ:MSFT', {
                name: 'Microsoft',
                sector: 'Technology Services',
                perf1m: 16,
                perf3m: 18,
                perf6m: 32,
                perfY: 64,
                rsi: 68,
                relativeVolume: 1.0,
                marketCap: 2_500_000_000,
              }),
              buildPhase1StockRow('NASDAQ:ADBE', {
                name: 'Adobe',
                sector: 'Technology Services',
                perf1m: 15,
                perf3m: 17,
                perf6m: 31,
                perfY: 62,
                rsi: 67,
                relativeVolume: 1.0,
                marketCap: 2_400_000_000,
              }),
            ],
          },
          phase2PayloadsBySector: {
            'Technology Services': {
              totalCount: 2,
              data: [
                buildPhase2Row('NASDAQ:MOMO', {
                  name: 'Momentum Only',
                  sector: 'Technology Services',
                  industry: 'Packaged Software',
                  close: 58,
                  rsi: 78,
                  sma200: 38,
                  sma50: 48,
                  high52w: 60,
                  perf3m: 72,
                  perf6m: 140,
                  perfY: 240,
                  atr: 7.8,
                  beta1y: 1.9,
                  relativeVolume: 1.4,
                  marketCap: 2_100_000_000,
                  eps: 0.6,
                  epsGrowthTtm: -35,
                  roe: 4,
                  roic: 1.2,
                  grossMargin: 18,
                  grossProfitTtm: 120_000_000,
                  totalAssets: 2_400_000_000,
                  operatingMargin: 3,
                  fcfMargin: 2,
                  fcfTtm: 15_000_000,
                  fcfGrowthTtm: -25,
                  cashFromOperationsTtm: 12_000_000,
                  netIncomeTtm: 40_000_000,
                  revenueGrowthTtm: -12,
                  evEbitda: 28,
                  pFcfDirect: 48,
                  debtToEquity: 140,
                  netDebt: 300_000_000,
                  volume: 900_000,
                }),
                buildPhase2Row('NASDAQ:QUAL', {
                  name: 'Quality Compounder',
                  sector: 'Technology Services',
                  industry: 'Packaged Software',
                  close: 92,
                  rsi: 65,
                  sma200: 75,
                  sma50: 84,
                  high52w: 100,
                  perf3m: 34,
                  perf6m: 56,
                  perfY: 118,
                  atr: 3.1,
                  beta1y: 1.0,
                  relativeVolume: 1.1,
                  marketCap: 2_300_000_000,
                  eps: 4.2,
                  epsGrowthTtm: 42,
                  roe: 26,
                  roic: 24,
                  grossMargin: 68,
                  grossProfitTtm: 1_300_000_000,
                  totalAssets: 3_100_000_000,
                  operatingMargin: 24,
                  fcfMargin: 22,
                  fcfTtm: 420_000_000,
                  fcfGrowthTtm: 28,
                  cashFromOperationsTtm: 500_000_000,
                  netIncomeTtm: 360_000_000,
                  revenueGrowthTtm: 24,
                  evEbitda: 14,
                  pFcfDirect: 24,
                  debtToEquity: 18,
                  netDebt: -150_000_000,
                  volume: 750_000,
                }),
              ],
            },
          },
        }),
      },
    });

    assert.deepEqual(result.results.map((row) => row.symbol), ['QUAL', 'MOMO']);
    assert.ok(result.results[0].rankScore > result.results[1].rankScore);
    assert.ok(result.results[0].rankBreakdown.quality.rank < result.results[1].rankBreakdown.quality.rank);
    assert.ok(result.results[0].rankBreakdown.growth.rank < result.results[1].rankBreakdown.growth.rank);
    assert.ok(result.results[0].rankBreakdown.riskValue.rank < result.results[1].rankBreakdown.riskValue.rank);
  });

  it('treats missing quality and growth fields as neutral instead of rewarding sparse outliers', async () => {
    const result = await runFundamentalScreener({
      limit: 10,
      _deps: {
        fetch: createMockFetch({
          stockBodies: [],
          phase1Payload: {
            totalCount: 2,
            data: [
              buildPhase1StockRow('NASDAQ:MSFT', {
                name: 'Microsoft',
                sector: 'Technology Services',
                perf1m: 18,
                perf3m: 18,
                perf6m: 30,
                perfY: 60,
                rsi: 67,
                relativeVolume: 1.0,
                marketCap: 2_500_000_000,
              }),
              buildPhase1StockRow('NASDAQ:CRM', {
                name: 'Salesforce',
                sector: 'Technology Services',
                perf1m: 17,
                perf3m: 17,
                perf6m: 29,
                perfY: 58,
                rsi: 66,
                relativeVolume: 1.0,
                marketCap: 2_400_000_000,
              }),
            ],
          },
          phase2PayloadsBySector: {
            'Technology Services': {
              totalCount: 2,
              data: [
                buildPhase2Row('NASDAQ:SPARSE', {
                  name: 'Sparse Metrics',
                  sector: 'Technology Services',
                  industry: 'Packaged Software',
                  close: 44,
                  rsi: 70,
                  sma200: 35,
                  sma50: 40,
                  high52w: 46,
                  perf3m: 49,
                  perf6m: 85,
                  perfY: 170,
                  atr: 4.2,
                  beta1y: 1.3,
                  relativeVolume: 1.2,
                  marketCap: 2_000_000_000,
                  eps: 0.8,
                  epsGrowthTtm: -20,
                  roe: 8,
                  roic: 900,
                  grossMargin: null,
                  grossProfitTtm: null,
                  totalAssets: null,
                  operatingMargin: null,
                  fcfMargin: null,
                  fcfTtm: 40_000_000,
                  fcfGrowthTtm: null,
                  cashFromOperationsTtm: null,
                  netIncomeTtm: 50_000_000,
                  revenueGrowthTtm: -8,
                  evEbitda: 26,
                  pFcfDirect: 30,
                  debtToEquity: 90,
                  netDebt: 80_000_000,
                  volume: 600_000,
                }),
                buildPhase2Row('NASDAQ:FULL', {
                  name: 'Full Metrics',
                  sector: 'Technology Services',
                  industry: 'Packaged Software',
                  close: 58,
                  rsi: 66,
                  sma200: 48,
                  sma50: 53,
                  high52w: 61,
                  perf3m: 34,
                  perf6m: 52,
                  perfY: 110,
                  atr: 2.8,
                  beta1y: 0.9,
                  relativeVolume: 1.0,
                  marketCap: 2_200_000_000,
                  eps: 3.4,
                  epsGrowthTtm: 28,
                  roe: 24,
                  roic: 22,
                  grossMargin: 64,
                  grossProfitTtm: 1_200_000_000,
                  totalAssets: 3_000_000_000,
                  operatingMargin: 21,
                  fcfMargin: 19,
                  fcfTtm: 300_000_000,
                  fcfGrowthTtm: 24,
                  cashFromOperationsTtm: 360_000_000,
                  netIncomeTtm: 250_000_000,
                  revenueGrowthTtm: 18,
                  evEbitda: 13,
                  pFcfDirect: 18,
                  debtToEquity: 15,
                  netDebt: -50_000_000,
                  volume: 620_000,
                }),
              ],
            },
          },
        }),
      },
    });

    assert.deepEqual(result.results.map((row) => row.symbol), ['FULL', 'SPARSE']);
    assert.ok(result.results[0].rankBreakdown.quality.rank < result.results[1].rankBreakdown.quality.rank);
    assert.ok(result.results[0].rankBreakdown.growth.rank < result.results[1].rankBreakdown.growth.rank);
  });
});

describe('evaluateSymbolsAgainstFundamentalScreener', () => {
  it('flags symbols outside selected phase1 sectors while preserving detected winners', async () => {
    const fetch = async (_url, options) => {
      const body = JSON.parse(options.body);

      if (isBenchmarkRequest(body)) {
        return {
          ok: true,
          json: async () => ({
            totalCount: 1,
            data: [
              buildPhase1StockRow('BATS:SPY', {
                name: 'SPY',
                sector: 'Benchmark',
                close: 100,
                sma200: 95,
                sma50: 98,
                high52w: 104,
                perf1m: 6,
                perf3m: 12,
                perf6m: 24,
                perfY: 48,
                rsi: 61,
                relativeVolume: 1.0,
                marketCap: 1_000_000_000,
              }),
            ],
          }),
        };
      }

      if (body.symbols?.tickers?.length > 0) {
        return {
          ok: true,
          json: async () => ({
            totalCount: 2,
            data: [
              buildPhase2Row('NASDAQ:AAA', {
                name: 'Alpha',
                sector: 'Technology Services',
                industry: 'Packaged Software',
                close: 120,
                high52w: 125,
                sma200: 90,
                sma50: 100,
                perf3m: 22,
                perf6m: 40,
                perfY: 88,
                rsi: 68,
                relativeVolume: 1.2,
                marketCap: 2_500_000_000,
                eps: 3,
                roe: 24,
                grossMargin: 58,
                fcfMargin: 21,
                fcfTtm: 200_000_000,
                revenueGrowthTtm: 18,
                pFcfDirect: 18,
                volume: 100_000,
                netDebt: -10_000_000,
              }),
              buildPhase2Row('NYSE:BBB', {
                name: 'Beta Bank',
                sector: 'Finance',
                industry: 'Regional Banks',
                close: 55,
                high52w: 60,
                sma200: 50,
                sma50: 52,
                perf3m: 18,
                perf6m: 28,
                perfY: 50,
                rsi: 63,
                relativeVolume: 1.1,
                marketCap: 2_300_000_000,
                eps: 4,
                roe: 18,
                grossMargin: 45,
                fcfMargin: 10,
                fcfTtm: 300_000_000,
                revenueGrowthTtm: 8,
                pFcfDirect: 10,
                volume: 90_000,
                netDebt: 0,
              }),
            ],
          }),
        };
      }

      if (isFundRequest(body) || !isPhase2StockRequest(body)) {
        return {
          ok: true,
          json: async () => ({
            totalCount: 3,
            data: [
              buildPhase1StockRow('NASDAQ:AAA', {
                name: 'Alpha',
                sector: 'Technology Services',
                perf1m: 20,
                perf3m: 22,
                perf6m: 40,
                perfY: 88,
                rsi: 68,
                relativeVolume: 1.2,
                marketCap: 2_500_000_000,
              }),
              buildPhase1StockRow('NYSE:BBB', {
                name: 'Beta Bank',
                sector: 'Finance',
                perf1m: 3,
                perf3m: 4,
                perf6m: 7,
                perfY: 11,
                rsi: 48,
                relativeVolume: 0.8,
                marketCap: 2_300_000_000,
              }),
              buildPhase1StockRow('NASDAQ:CCC', {
                name: 'Chip Co',
                sector: 'Electronic Technology',
                perf1m: 16,
                perf3m: 14,
                perf6m: 24,
                perfY: 52,
                rsi: 61,
                relativeVolume: 1.0,
                marketCap: 2_200_000_000,
              }),
            ],
          }),
        };
      }

      const sector = getFilterValue(body, 'sector');
      if (sector === 'Technology Services') {
        return {
          ok: true,
          json: async () => ({
            totalCount: 1,
            data: [
              buildPhase2Row('NASDAQ:AAA', {
                name: 'Alpha',
                sector: 'Technology Services',
                industry: 'Packaged Software',
                close: 120,
                high52w: 125,
                sma200: 90,
                sma50: 100,
                perf3m: 22,
                perf6m: 40,
                perfY: 88,
                rsi: 68,
                relativeVolume: 1.2,
                marketCap: 2_500_000_000,
                eps: 3,
                roe: 24,
                grossMargin: 58,
                fcfMargin: 21,
                fcfTtm: 200_000_000,
                revenueGrowthTtm: 18,
                pFcfDirect: 18,
                volume: 100_000,
                netDebt: -10_000_000,
              }),
            ],
          }),
        };
      }

      return {
        ok: true,
        json: async () => ({ totalCount: 0, data: [] }),
      };
    };

    const result = await evaluateSymbolsAgainstFundamentalScreener({
      symbols: ['NASDAQ:AAA', 'NYSE:BBB'],
      _deps: {
        fetch,
        market: 'america',
        exchangeAllowlist: ['NASDAQ', 'NYSE'],
        selectedSectorCount: 1,
      },
    });

    const alpha = result.results.find((entry) => entry.requestedSymbol === 'NASDAQ:AAA');
    const beta = result.results.find((entry) => entry.requestedSymbol === 'NYSE:BBB');

    assert.equal(alpha.workflowEligible, true);
    assert.equal(alpha.workflowDetected, true);
    assert.equal(alpha.watchlistRank, 1);

    assert.equal(beta.workflowEligible, false);
    assert.equal(beta.workflowDetected, false);
    assert.match(beta.failureReasons.join(' '), /phase1_sector_not_selected/);
  });
});
