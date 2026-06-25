import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { zipSync } from 'fflate';

import { evaluateSymbolsAgainstFundamentalScreener, runFundamentalScreener } from '../src/core/fundamental-screener.js';
import { getEdinetSupplementalFundamentalsBatch } from '../src/core/edinet.js';

function buildPhase2Row(symbol, values) {
  return {
    s: symbol,
    d: [
      values.name,
      values.description ?? values.name,
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
  return body.symbols?.tickers?.some((ticker) => (
    ticker.includes('SPY')
    || ticker.includes('1306')
    || ticker.includes('1308')
    || ticker.includes('1475')
  ));
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
  it('sends EDINET Subscription-Key as a query parameter for list and download requests', async () => {
    const calls = [];
    const result = await getEdinetSupplementalFundamentalsBatch(
      [{ symbol: '4063', marketCapUsd: 2_900_000_000 }],
      {
        apiKey: ' dummy-key ',
        lookbackDays: 1,
        asOfDate: '2026-06-11',
        fetch: async (url, options) => {
          calls.push({
            url: String(url),
            headers: options?.headers ?? null,
          });

          if (calls.length === 1) {
            return {
              ok: true,
              json: async () => ({
                results: [
                  {
                    docID: 'S100TEST',
                    secCode: '40630',
                    docDescription: '四半期報告書',
                    csvFlag: '1',
                    legalStatus: '1',
                    submitDateTime: '2026-06-10T00:00:00+09:00',
                  },
                ],
              }),
            };
          }

          return {
            ok: false,
            status: 500,
            arrayBuffer: async () => new ArrayBuffer(0),
          };
        },
      },
    );

    assert.equal(calls.length, 2);

    const listUrl = new URL(calls[0].url);
    assert.equal(listUrl.pathname, '/api/v2/documents.json');
    assert.equal(listUrl.searchParams.get('type'), '2');
    assert.equal(listUrl.searchParams.get('Subscription-Key'), 'dummy-key');
    assert.equal(calls[0].headers, null);

    const downloadUrl = new URL(calls[1].url);
    assert.equal(downloadUrl.pathname, '/api/v2/documents/S100TEST');
    assert.equal(downloadUrl.searchParams.get('Subscription-Key'), 'dummy-key');
    assert.equal(calls[1].headers, null);

    assert.equal(result.meta.enabled, true);
    assert.equal(result.meta.matchedFilings, 1);
    assert.equal(result.rows['4063'].error, 'EDINET document download failed: HTTP 500 (S100TEST)');
  });

  it('marks EDINET invalid_api_key when the API returns a 401 payload in-body', async () => {
    const result = await getEdinetSupplementalFundamentalsBatch(
      [{ symbol: '4063', marketCapUsd: 2_900_000_000 }],
      {
        apiKey: 'dummy-key',
        lookbackDays: 1,
        asOfDate: '2026-06-11',
        fetch: async () => ({
          ok: true,
          json: async () => ({
            StatusCode: 401,
            message: 'Access denied due to invalid subscription key.',
          }),
        }),
      },
    );

    assert.deepEqual(result.rows, {});
    assert.equal(result.meta.enabled, true);
    assert.equal(result.meta.reason, 'invalid_api_key');
    assert.match(result.meta.error, /invalid subscription key/i);
  });

  it('parses EDINET CSV downloads as UTF-16LE tab-delimited files', async () => {
    const tsv = [
      '"要素ID"\t"項目名"\t"コンテキストID"\t"相対年度"\t"連結・個別"\t"期間・時点"\t"ユニットID"\t"単位"\t"値"',
      '"jppfs_cor:NetSales"\t"NetSales"\t"CurrentYearDuration"\t"当期"\t"連結"\t"期間"\t"JPY"\t"円"\t"1000"',
      '"jppfs_cor:NetSales"\t"NetSales"\t"Prior1YearDuration"\t"前期"\t"連結"\t"期間"\t"JPY"\t"円"\t"800"',
      '"jppfs_cor:NetCashProvidedByUsedInOperatingActivities"\t"OperatingCF"\t"CurrentYearDuration"\t"当期"\t"連結"\t"期間"\t"JPY"\t"円"\t"150"',
      '"jppfs_cor:NetCashProvidedByUsedInOperatingActivities"\t"OperatingCF"\t"Prior1YearDuration"\t"前期"\t"連結"\t"期間"\t"JPY"\t"円"\t"120"',
      '"jppfs_cor:PurchaseOfPropertyPlantAndEquipment"\t"Capex"\t"CurrentYearDuration"\t"当期"\t"連結"\t"期間"\t"JPY"\t"円"\t"20"',
      '"jppfs_cor:PurchaseOfPropertyPlantAndEquipment"\t"Capex"\t"Prior1YearDuration"\t"前期"\t"連結"\t"期間"\t"JPY"\t"円"\t"10"',
      '"jppfs_cor:ProfitLoss"\t"ProfitLoss"\t"CurrentYearDuration"\t"当期"\t"連結"\t"期間"\t"JPY"\t"円"\t"90"',
    ].join('\r\n');
    const archive = zipSync({
      'facts.csv': Buffer.from(`\uFEFF${tsv}`, 'utf16le'),
    });

    const result = await getEdinetSupplementalFundamentalsBatch(
      [{ symbol: '4063', marketCapUsd: 2_900_000_000 }],
      {
        apiKey: 'dummy-key',
        lookbackDays: 1,
        asOfDate: '2026-06-11',
        fetch: async (url) => {
          const requestUrl = new URL(String(url));
          if (requestUrl.pathname.endsWith('/documents.json')) {
            return {
              ok: true,
              json: async () => ({
                results: [
                  {
                    docID: 'S100UTF16',
                    secCode: '40630',
                    docDescription: '有価証券報告書',
                    csvFlag: '1',
                    legalStatus: '1',
                    submitDateTime: '2026-06-10T00:00:00+09:00',
                  },
                ],
              }),
            };
          }
          return {
            ok: true,
            arrayBuffer: async () => archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength),
          };
        },
      },
    );

    assert.equal(result.meta.matchedFilings, 1);
    assert.equal(result.meta.downloadedRows, 1);
    assert.equal(result.meta.rowsWithFactRows, 1);
    assert.equal(result.meta.supplementedRows, 1);
    assert.equal(result.rows['4063'].factRowCount > 0, true);
    assert.equal(result.rows['4063'].fcfMargin, 13);
    assert.equal(result.rows['4063'].revenueGrowthTtm, 25);
    assert.equal(result.rows['4063'].cashConversion, 1.44);
  });

  it('uses TradingView stock-sector US profiles and activates producer manufacturing', async () => {
    const stockBodies = [];
    const result = await runFundamentalScreener({
      limit: 10,
      _deps: {
        marketCapMinUsd: 1_000_000_000,
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
              totalCount: 6,
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
                buildPhase2Row('OTC:ASMVF', {
                  name: 'ASM International',
                  sector: 'Electronic Technology',
                  industry: 'Electronic Production Equipment',
                  close: 620,
                  rsi: 66,
                  sma200: 560,
                  sma50: 590,
                  high52w: 640,
                  perf3m: 18,
                  relativeVolume: 1.0,
                  marketCap: 2_100_000_000,
                  eps: 5,
                  roe: 15,
                  grossMargin: 48,
                  fcfMargin: 20,
                  fcfTtm: 40_000_000,
                  revenueGrowthTtm: 12,
                  netDebt: 0,
                  volume: 120_000,
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

    assert.equal(result.totalScanned, 8);
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
    assert.ok(result.results.find((row) => row.symbol === 'MU').subThemes.includes('HBM / DRAM'));
    assert.ok(result.results.every((row) => row.exchange !== 'OTC'));
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

  it('excludes US candidates below the default $30B market-cap gate', async () => {
    const result = await runFundamentalScreener({
      limit: 10,
      _deps: {
        fetch: createMockFetch({
          stockBodies: [],
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
                marketCap: 400_000_000_000,
              }),
            ],
          },
          phase1Payload: {
            totalCount: 2,
            data: [
              buildPhase1StockRow('NASDAQ:BIG', {
                name: 'Big Tech',
                sector: 'Technology Services',
                perf1m: 18,
                perf3m: 32,
                perf6m: 60,
                perfY: 120,
                rsi: 68,
                relativeVolume: 1.2,
                marketCap: 40_000_000_000,
              }),
              buildPhase1StockRow('NASDAQ:SMALL', {
                name: 'Small Tech',
                sector: 'Technology Services',
                perf1m: 20,
                perf3m: 40,
                perf6m: 80,
                perfY: 160,
                rsi: 70,
                relativeVolume: 1.5,
                marketCap: 20_000_000_000,
              }),
            ],
          },
          phase2PayloadsBySector: {
            'Technology Services': {
              totalCount: 2,
              data: [
                buildPhase2Row('NASDAQ:BIG', {
                  name: 'Big Tech',
                  sector: 'Technology Services',
                  industry: 'Packaged Software',
                  close: 120,
                  rsi: 68,
                  sma200: 90,
                  sma50: 100,
                  high52w: 125,
                  perf3m: 32,
                  perf6m: 60,
                  perfY: 120,
                  relativeVolume: 1.2,
                  marketCap: 40_000_000_000,
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
                buildPhase2Row('NASDAQ:SMALL', {
                  name: 'Small Tech',
                  sector: 'Technology Services',
                  industry: 'Packaged Software',
                  close: 80,
                  rsi: 70,
                  sma200: 60,
                  sma50: 70,
                  high52w: 82,
                  perf3m: 40,
                  perf6m: 80,
                  perfY: 160,
                  relativeVolume: 1.5,
                  marketCap: 20_000_000_000,
                  eps: 2,
                  roe: 28,
                  grossMargin: 62,
                  fcfMargin: 30,
                  fcfTtm: 150_000_000,
                  revenueGrowthTtm: 30,
                  pFcfDirect: 12,
                  volume: 90_000,
                  netDebt: 0,
                }),
              ],
            },
          },
        }),
        market: 'america',
        exchangeAllowlist: ['NASDAQ', 'NYSE'],
        selectedSectorCount: 1,
      },
    });

    assert.equal(result.criteria.market_cap_min_usd, 30_000_000_000);
    assert.deepEqual(result.results.map((row) => row.symbol), ['BIG']);
    assert.equal(result.clientFiltered, 1);
  });

  it('supplements missing US FCF fields from configured official data before ranking', async () => {
    const result = await runFundamentalScreener({
      limit: 10,
      _deps: {
        fetch: createMockFetch({
          stockBodies: [],
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
                marketCap: 400_000_000_000,
              }),
            ],
          },
          phase1Payload: {
            totalCount: 1,
            data: [
              buildPhase1StockRow('NASDAQ:NVDA', {
                name: 'NVIDIA',
                sector: 'Electronic Technology',
                perf1m: 18,
                perf3m: 30,
                perf6m: 50,
                perfY: 100,
                rsi: 66,
                relativeVolume: 1.1,
                marketCap: 3_000_000_000_000,
              }),
            ],
          },
          phase2PayloadsBySector: {
            'Technology Services': {
              totalCount: 1,
              data: [
                buildPhase2Row('NASDAQ:NBIS', {
                  name: 'NBIS',
                  description: 'Nebius Group N.V.',
                  sector: 'Technology Services',
                  industry: 'Packaged Software',
                  close: 286,
                  rsi: 70,
                  sma200: 125,
                  sma50: 197,
                  high52w: 299,
                  perf3m: 138,
                  perf6m: 255,
                  perfY: 490,
                  relativeVolume: 2.1,
                  marketCap: 72_000_000_000,
                  eps: 3,
                  roe: 10,
                  roic: 7.5,
                  grossMargin: null,
                  grossProfitTtm: 65_700_000,
                  totalAssets: 22_303_300_000,
                  fcfMargin: null,
                  fcfTtm: null,
                  cashFromOperationsTtm: null,
                  netIncomeTtm: 836_400_000,
                  revenueGrowthTtm: 443.93,
                  pFcfDirect: null,
                  volume: 10_000_000,
                  netDebt: 198_000_000,
                }),
              ],
            },
          },
        }),
        market: 'america',
        exchangeAllowlist: ['NASDAQ', 'NYSE'],
        selectedSectorCount: 1,
        extraPhase1Sectors: ['Technology Services'],
      },
    });

    const nbis = result.results.find((row) => row.symbol === 'NBIS');
    assert.ok(nbis);
    assert.equal(nbis.primaryTheme, 'AI Compute');
    assert.deepEqual(nbis.subThemes, ['AI Cloud / Neocloud']);
    assert.equal(nbis.fcfTtm, -214_900_000);
    assert.equal(nbis.fcfMargin, -53.86);
    assert.equal(nbis.ruleOf40, 390.07);
    assert.equal(nbis.fundamentalSupplement.source, 'nebius-q1-2026-earnings-release');
    assert.deepEqual(result.sourceDetails.usFundamentalSupplement.symbols, ['NBIS']);
    assert.equal(result.criteria.phase1_selected_sectors_source, 'phase1_plus_extra');
  });

  it('builds hierarchy rankings automatically for the top sector when a config exists', async () => {
    const result = await runFundamentalScreener({
      limit: 10,
      _deps: {
        marketCapMinUsd: 1_000_000_000,
        fetch: createMockFetch({
          stockBodies: [],
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
            totalCount: 3,
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
              buildPhase1StockRow('NASDAQ:QCOM', {
                name: 'Qualcomm',
                sector: 'Electronic Technology',
                perf1m: 20,
                perf3m: 16,
                perf6m: 35,
                perfY: 70,
                rsi: 68,
                relativeVolume: 1.0,
                marketCap: 2_500_000_000,
              }),
              buildPhase1StockRow('NASDAQ:MU', {
                name: 'Micron',
                sector: 'Electronic Technology',
                perf1m: 18,
                perf3m: 14,
                perf6m: 30,
                perfY: 60,
                rsi: 65,
                relativeVolume: 1.0,
                marketCap: 2_100_000_000,
              }),
            ],
          },
          phase2PayloadsBySector: {
            'Electronic Technology': {
              totalCount: 6,
              data: [
                buildPhase2Row('NASDAQ:NVDA', {
                  name: 'Nvidia',
                  sector: 'Electronic Technology',
                  industry: 'Semiconductors',
                  close: 950,
                  rsi: 68,
                  sma200: 840,
                  sma50: 900,
                  high52w: 1000,
                  perf3m: 30,
                  perf6m: 55,
                  perfY: 120,
                  relativeVolume: 1.1,
                  marketCap: 3_000_000_000,
                  eps: 10,
                  roe: 35,
                  grossMargin: 74,
                  fcfMargin: 38,
                  fcfTtm: 90_000_000,
                  revenueGrowthTtm: 85,
                  netDebt: -20_000_000,
                  volume: 900_000,
                }),
                buildPhase2Row('NASDAQ:MU', {
                  name: 'Micron',
                  sector: 'Electronic Technology',
                  industry: 'Semiconductors',
                  close: 110,
                  rsi: 66,
                  sma200: 90,
                  sma50: 100,
                  high52w: 120,
                  perf3m: 24,
                  perf6m: 36,
                  perfY: 88,
                  relativeVolume: 1.0,
                  marketCap: 2_000_000_000,
                  eps: 5,
                  roe: 21,
                  grossMargin: 42,
                  fcfMargin: 16,
                  fcfTtm: 50_000_000,
                  revenueGrowthTtm: 55,
                  netDebt: 0,
                  volume: 700_000,
                }),
                buildPhase2Row('NASDAQ:STX', {
                  name: 'Seagate',
                  sector: 'Electronic Technology',
                  industry: 'Computer Peripherals',
                  close: 95,
                  rsi: 65,
                  sma200: 80,
                  sma50: 86,
                  high52w: 100,
                  perf3m: 22,
                  perf6m: 31,
                  perfY: 58,
                  relativeVolume: 1.0,
                  marketCap: 1_900_000_000,
                  eps: 4,
                  roe: 22,
                  grossMargin: 36,
                  fcfMargin: 15,
                  fcfTtm: 42_000_000,
                  revenueGrowthTtm: 18,
                  netDebt: 5_000_000,
                  volume: 650_000,
                }),
                buildPhase2Row('NASDAQ:KLAC', {
                  name: 'KLA',
                  sector: 'Electronic Technology',
                  industry: 'Electronic Production Equipment',
                  close: 720,
                  rsi: 66,
                  sma200: 650,
                  sma50: 690,
                  high52w: 760,
                  perf3m: 21,
                  perf6m: 32,
                  perfY: 75,
                  relativeVolume: 1.0,
                  marketCap: 2_400_000_000,
                  eps: 8,
                  roe: 28,
                  grossMargin: 58,
                  fcfMargin: 31,
                  fcfTtm: 61_000_000,
                  revenueGrowthTtm: 20,
                  netDebt: -6_000_000,
                  volume: 500_000,
                }),
                buildPhase2Row('NASDAQ:COHR', {
                  name: 'Coherent',
                  sector: 'Electronic Technology',
                  industry: 'Electronic Production Equipment',
                  close: 70,
                  rsi: 65,
                  sma200: 62,
                  sma50: 66,
                  high52w: 75,
                  perf3m: 19,
                  perf6m: 30,
                  perfY: 58,
                  relativeVolume: 1.0,
                  marketCap: 1_600_000_000,
                  eps: 3,
                  roe: 17,
                  grossMargin: 41,
                  fcfMargin: 14,
                  fcfTtm: 33_000_000,
                  revenueGrowthTtm: 17,
                  netDebt: 8_000_000,
                  volume: 450_000,
                }),
                buildPhase2Row('NASDAQ:QRVO', {
                  name: 'Qorvo',
                  sector: 'Electronic Technology',
                  industry: 'Semiconductors',
                  close: 115,
                  rsi: 62,
                  sma200: 100,
                  sma50: 106,
                  high52w: 125,
                  perf3m: 14,
                  perf6m: 24,
                  perfY: 45,
                  relativeVolume: 0.95,
                  marketCap: 1_700_000_000,
                  eps: 4,
                  roe: 19,
                  grossMargin: 46,
                  fcfMargin: 18,
                  fcfTtm: 37_000_000,
                  revenueGrowthTtm: 11,
                  netDebt: 4_000_000,
                  volume: 430_000,
                }),
              ],
            },
          },
        }),
      },
    });

    assert.equal(result.focusedHierarchy.focusSector, 'Electronic Technology');
    assert.equal(result.criteria.hierarchy_focus_sector, 'Electronic Technology');
    assert.equal(result.criteria.hierarchy_selection.top_middle_themes_rule, 'all-ranked');
    assert.equal(result.criteria.hierarchy_selection.top_small_themes_rule, 'all-ranked');
    assert.equal(result.criteria.hierarchy_selection.top_stocks_rule, 'all-ranked');
    assert.equal(result.focusedHierarchy.middleThemeRanking[0].middleTheme, 'AI Compute');
    assert.ok(result.focusedHierarchy.middleThemeRanking.some((entry) => entry.middleTheme === 'Memory'));
    assert.ok(result.focusedHierarchy.smallThemeRanking.some((entry) => entry.smallTheme === 'AI Accelerators'));
    assert.ok(result.focusedHierarchy.smallThemeRanking.some((entry) => entry.smallTheme === 'HBM / DRAM'));
    assert.ok(result.focusedHierarchy.stockRanking.length > 0);
    assert.equal(result.focusedHierarchy.stockRanking[0].symbol, 'NVDA');
    assert.equal(result.focusedHierarchy.selectedMiddleThemes.length, 5);
    assert.equal(result.focusedHierarchy.selectedSmallThemes.length, 6);
    assert.equal(result.focusedHierarchy.stockRanking.length, 6);
  });

  it('applies Japan-specific profiles and skips finance even when phase1 selects it', async () => {
    const stockBodies = [];
    const result = await runFundamentalScreener({
      limit: 10,
      _deps: {
        marketCapMinUsd: 1_000_000_000,
        market: 'japan',
        exchangeAllowlist: ['TSE'],
        symbolAllowlistKey: 'jp-prime-mini',
        symbolAllowlistByKey: {
          'jp-prime-mini': ['8035', '4063', '8306'],
        },
        scopeLabel: 'JPX Prime domestic stocks snapshot',
        fetch: createMockFetch({
          stockBodies,
          benchmarkPayload: {
            totalCount: 1,
            data: [
              buildPhase1StockRow('TSE:1306', {
                name: 'TOPIX ETF',
                sector: 'Benchmark',
                close: 3000,
                sma200: 2800,
                sma50: 2950,
                high52w: 3100,
                perf1m: 3,
                perf3m: 9,
                perf6m: 16,
                perfY: 22,
                rsi: 58,
                relativeVolume: 1.0,
                marketCap: 5_000_000_000,
              }),
            ],
          },
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
    assert.equal(result.results.find((row) => row.symbol === '8035').companyName, 'Tokyo Electron');
    assert.equal(result.results.find((row) => row.symbol === '8035').companyNameJa, '東京エレクトロン');
    assert.equal(result.results.find((row) => row.symbol === '8035').primaryTheme, 'Semiconductor Equipment');
    assert.deepEqual(result.results.find((row) => row.symbol === '8035').subThemes, ['Semiconductor Production Equipment']);
    assert.equal(result.results.find((row) => row.symbol === '8035').ruleOf40, 55);
    assert.deepEqual(result.ruleOf40Coverage, {
      total: 2,
      complete: 1,
      revenueOnly: 0,
      fcfOnly: 1,
      missingBoth: 0,
      completePct: 50,
    });
    assert.equal(result.criteria.rule_of_40_policy, undefined);
    assert.equal(result.criteria.japan_fundamentals_policy, 'TradingView を主軸にしつつ、FCF / PFCF / cash-conversion の欠損は EDINET 公式開示で補完する');
    assert.equal(result.criteria.theme_taxonomy_policy?.version, 'jp-theme-prototype-v1');
    assert.equal(result.sourceDetails.edinet.enabled, false);
    assert.equal(result.sourceDetails.edinet.reason, 'missing_api_key');
    assert.equal(result.sectorMomentum.benchmark?.symbol, '1306');
    assert.equal(result.sectorMomentum.benchmark?.label, 'TOPIX');
    assert.deepEqual(result.themeRanking.map((entry) => entry.theme), [
      'Semiconductor Equipment',
    ]);
    assert.equal(result.focusedHierarchy.focusSector, 'Electronic Technology');
    assert.equal(result.criteria.hierarchy_selection.top_middle_themes_rule, 'all-ranked');
    assert.equal(result.criteria.hierarchy_selection.top_small_themes_rule, 'all-ranked');
    assert.equal(result.criteria.hierarchy_selection.top_stocks_rule, 'all-ranked');
    assert.deepEqual(result.focusedHierarchy.selectedMiddleThemes, ['Semiconductor Equipment']);
    assert.deepEqual(result.focusedHierarchy.selectedSmallThemes, [
      { middleTheme: 'Semiconductor Equipment', smallTheme: 'Semiconductor Production Equipment' },
    ]);
    assert.equal(result.focusedHierarchy.stockRanking[0].symbol, '8035');
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

  it('supplements missing Japan FCF metrics from EDINET before ranking', async () => {
    const result = await runFundamentalScreener({
      limit: 10,
      enrichWithYahoo: false,
      _deps: {
        marketCapMinUsd: 1_000_000_000,
        market: 'japan',
        exchangeAllowlist: ['TSE'],
        symbolAllowlistKey: 'jp-prime-mini',
        symbolAllowlistByKey: {
          'jp-prime-mini': ['4063', '8035'],
        },
        getJapanSupplementalFundamentals: async (rows) => ({
          rows: Object.fromEntries(rows.map((row) => [row.symbol, row.symbol === '4063'
            ? {
              source: 'edinet',
              fcfMargin: 14,
              fcfGrowthTtm: 18,
              pFcf: 22,
              cashConversion: 1.3,
              fcfTtm: 88_000_000,
              cashFromOperationsTtm: 120_000_000,
              netIncomeTtm: 68_000_000,
              revenueGrowthTtm: 16,
              ruleOf40: 30,
              docId: 'S100TEST',
              submitDateTime: '2026-05-10T00:00:00+09:00',
              docDescription: '四半期報告書',
            }
            : {}])),
          meta: {
            enabled: true,
            reason: 'active',
            requestedSymbols: rows.length,
            matchedFilings: 1,
            supplementedRows: 1,
            lookbackDays: 120,
            asOfDate: '2026-06-04',
          },
        }),
        fetch: createMockFetch({
          stockBodies: [],
          benchmarkPayload: {
            totalCount: 1,
            data: [
              buildPhase1StockRow('TSE:1306', {
                name: 'TOPIX ETF',
                sector: 'Benchmark',
                close: 3000,
                sma200: 2800,
                sma50: 2950,
                high52w: 3100,
                perf1m: 3,
                perf3m: 9,
                perf6m: 16,
                perfY: 22,
                rsi: 58,
                relativeVolume: 1.0,
                marketCap: 5_000_000_000,
              }),
            ],
          },
          phase1Payload: {
            totalCount: 2,
            data: [
              buildPhase1StockRow('TSE:8035', {
                name: 'Tokyo Electron',
                sector: 'Electronic Technology',
                perf1m: 15,
                perf3m: 22,
                perf6m: 34,
                perfY: 58,
                rsi: 64,
                relativeVolume: 1.0,
                marketCap: 3_500_000_000,
              }),
              buildPhase1StockRow('TSE:4063', {
                name: 'Shin-Etsu Chemical',
                sector: 'Process Industries',
                perf1m: 12,
                perf3m: 18,
                perf6m: 24,
                perfY: 46,
                rsi: 60,
                relativeVolume: 1.0,
                marketCap: 2_900_000_000,
              }),
            ],
          },
          phase2PayloadsBySector: {
            'Electronic Technology': {
              totalCount: 1,
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
              ],
            },
            'Process Industries': {
              totalCount: 1,
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
                  netDebt: -10_000_000,
                  volume: 500_000,
                }),
              ],
            },
          },
        }),
      },
    });

    const supplemented = result.results.find((row) => row.symbol === '4063');
    assert.equal(supplemented.fcfMargin, 14);
    assert.equal(supplemented.fcfGrowthTtm, 18);
    assert.equal(supplemented.pFcf, 22);
    assert.equal(supplemented.cashConversion, 1.3);
    assert.equal(supplemented.ruleOf40, 30);
    assert.equal(supplemented.edinetSupplement.docId, 'S100TEST');
    assert.equal(result.sourceDetails.edinet.enabled, true);
    assert.equal(result.sourceDetails.edinet.supplementedRows, 1);
    assert.match(result.source, /edinet/);
  });

  it('keeps Kioxia eligible in Japan despite elevated P/FCF when momentum and quality are strong', async () => {
    const stockBodies = [];
    const result = await runFundamentalScreener({
      limit: 10,
      _deps: {
        marketCapMinUsd: 1_000_000_000,
        market: 'japan',
        exchangeAllowlist: ['TSE'],
        symbolAllowlistKey: 'jp-prime-mini',
        symbolAllowlistByKey: {
          'jp-prime-mini': ['285A', '8035'],
        },
        fetch: createMockFetch({
          stockBodies,
          benchmarkPayload: {
            totalCount: 1,
            data: [
              buildPhase1StockRow('TSE:1306', {
                name: 'TOPIX ETF',
                sector: 'Benchmark',
                close: 3000,
                sma200: 2800,
                sma50: 2950,
                high52w: 3100,
                perf1m: 3,
                perf3m: 9,
                perf6m: 16,
                perfY: 22,
                rsi: 58,
                relativeVolume: 1.0,
                marketCap: 5_000_000_000,
              }),
            ],
          },
          phase1Payload: {
            totalCount: 2,
            data: [
              buildPhase1StockRow('TSE:285A', {
                name: 'Kioxia Holdings Corporation',
                sector: 'Electronic Technology',
                perf1m: 35,
                perf3m: 120,
                perf6m: 240,
                perfY: 900,
                rsi: 78,
                relativeVolume: 1.1,
                marketCap: 4_200_000_000,
              }),
              buildPhase1StockRow('TSE:8035', {
                name: 'Tokyo Electron',
                sector: 'Electronic Technology',
                perf1m: 12,
                perf3m: 24,
                perf6m: 60,
                perfY: 130,
                rsi: 68,
                relativeVolume: 1.0,
                marketCap: 3_500_000_000,
              }),
            ],
          },
          phase2PayloadsBySector: {
            'Electronic Technology': {
              totalCount: 2,
              data: [
                buildPhase2Row('TSE:285A', {
                  name: 'Kioxia Holdings Corporation',
                  sector: 'Electronic Technology',
                  industry: 'Computer Peripherals',
                  close: 78080,
                  rsi: 81.4,
                  sma200: 18043.4,
                  sma50: 39466.4,
                  high52w: 83140,
                  perf3m: 281.25,
                  perf6m: 767.3,
                  perfY: 3800.1,
                  relativeVolume: 1.11,
                  marketCap: 42_363_139_425_049,
                  eps: 1009.1459,
                  roe: 51.9,
                  roic: 28.6,
                  grossMargin: 43.3,
                  fcfMargin: 14.35,
                  fcfTtm: 331_340_000_000,
                  revenueGrowthTtm: 36.99,
                  pFcfDirect: 127.88,
                  netDebt: -10_000_000,
                  volume: 1_000_000,
                }),
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
                  perf6m: 20,
                  perfY: 60,
                  relativeVolume: 0.9,
                  marketCap: 3_500_000_000,
                  eps: 10,
                  roe: 18,
                  grossMargin: 60,
                  fcfMargin: 35,
                  fcfTtm: 54_000_000,
                  revenueGrowthTtm: 20,
                  pFcfDirect: 74.6,
                  netDebt: -10_000_000,
                  volume: 400_000,
                }),
              ],
            },
          },
        }),
      },
    });

    assert.equal(result.results[0].symbol, '285A');
    assert.equal(result.results[0].primaryTheme, 'AI / Data Center');
    assert.deepEqual(result.results[0].subThemes, ['Data Center Memory']);
    assert.ok(result.results.some((row) => row.symbol === '285A'));
  });

  it('keeps high P/FCF US names eligible and uses riskValue as the penalty instead of hard filtering', async () => {
    const result = await runFundamentalScreener({
      limit: 10,
      _deps: {
        marketCapMinUsd: 1_000_000_000,
        fetch: createMockFetch({
          stockBodies: [],
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
            totalCount: 2,
            data: [
              buildPhase1StockRow('NASDAQ:HIGH', {
                name: 'High Multiple',
                sector: 'Technology Services',
                perf1m: 24,
                perf3m: 40,
                perf6m: 85,
                perfY: 160,
                rsi: 72,
                relativeVolume: 1.2,
                marketCap: 2_600_000_000,
              }),
              buildPhase1StockRow('NASDAQ:VALUE', {
                name: 'Value Compounder',
                sector: 'Technology Services',
                perf1m: 16,
                perf3m: 24,
                perf6m: 48,
                perfY: 96,
                rsi: 66,
                relativeVolume: 1.0,
                marketCap: 2_500_000_000,
              }),
            ],
          },
          phase2PayloadsBySector: {
            'Technology Services': {
              totalCount: 2,
              data: [
                buildPhase2Row('NASDAQ:HIGH', {
                  name: 'High Multiple',
                  sector: 'Technology Services',
                  industry: 'Packaged Software',
                  close: 140,
                  rsi: 72,
                  sma200: 100,
                  sma50: 118,
                  high52w: 150,
                  perf3m: 40,
                  perf6m: 85,
                  perfY: 160,
                  relativeVolume: 1.2,
                  atr: 5.5,
                  beta1y: 1.4,
                  marketCap: 2_600_000_000,
                  eps: 2.5,
                  roe: 24,
                  roic: 22,
                  grossMargin: 66,
                  grossProfitTtm: 1_000_000_000,
                  totalAssets: 2_500_000_000,
                  operatingMargin: 20,
                  fcfMargin: 18,
                  fcfTtm: 30_000_000,
                  fcfGrowthTtm: 25,
                  cashFromOperationsTtm: 90_000_000,
                  netIncomeTtm: 70_000_000,
                  revenueGrowthTtm: 28,
                  evEbitda: 24,
                  pFcfDirect: 85,
                  debtToEquity: 20,
                  netDebt: -50_000_000,
                  volume: 900_000,
                }),
                buildPhase2Row('NASDAQ:VALUE', {
                  name: 'Value Compounder',
                  sector: 'Technology Services',
                  industry: 'Packaged Software',
                  close: 92,
                  rsi: 66,
                  sma200: 74,
                  sma50: 84,
                  high52w: 100,
                  perf3m: 24,
                  perf6m: 48,
                  perfY: 96,
                  relativeVolume: 1.0,
                  atr: 3.0,
                  beta1y: 1.0,
                  marketCap: 2_500_000_000,
                  eps: 3.8,
                  roe: 25,
                  roic: 23,
                  grossMargin: 68,
                  grossProfitTtm: 1_100_000_000,
                  totalAssets: 2_600_000_000,
                  operatingMargin: 22,
                  fcfMargin: 24,
                  fcfTtm: 120_000_000,
                  fcfGrowthTtm: 20,
                  cashFromOperationsTtm: 150_000_000,
                  netIncomeTtm: 120_000_000,
                  revenueGrowthTtm: 20,
                  evEbitda: 14,
                  pFcfDirect: 22,
                  debtToEquity: 10,
                  netDebt: -80_000_000,
                  volume: 700_000,
                }),
              ],
            },
          },
        }),
      },
    });

    assert.deepEqual(result.results.map((row) => row.symbol), ['HIGH', 'VALUE']);
    assert.ok(result.results.every((row) => row.sector === 'Technology Services'));
    assert.ok(result.results.find((row) => row.symbol === 'HIGH'));
    assert.ok(result.results.find((row) => row.symbol === 'VALUE'));
    assert.ok(
      result.results.find((row) => row.symbol === 'HIGH').rankBreakdown.riskValue.rank
      > result.results.find((row) => row.symbol === 'VALUE').rankBreakdown.riskValue.rank,
    );
  });

  it('uses Moomoo revenue growth for scoring without hard-failing low-growth names', async () => {
    const result = await runFundamentalScreener({
      limit: 10,
      enrichWithYahoo: true,
      _deps: {
        marketCapMinUsd: 1_000_000_000,
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

  it('supplements missing US table metrics from moomoo and adapters when available', async () => {
    const result = await runFundamentalScreener({
      limit: 10,
      enrichWithYahoo: true,
      _deps: {
        marketCapMinUsd: 1_000_000_000,
        getSymbolFundamentals: async (symbol) => ({
          revenueGrowth: symbol === 'QCOM' ? 0.08 : 0.12,
          earningsGrowth: symbol === 'MU' ? 0.27 : null,
          pFcf: symbol === 'MU' ? 22.4 : -3.2,
          source: 'moomoo',
        }),
        getUsMissingMetricSupplementals: async () => ({
          MU: {
            source: 'price-history-adapter',
            atrPct: 4.25,
          },
          QCOM: {
            source: 'sec-companyfacts-cik-0000804328',
            pFcf: 12.5,
            epsGrowthStatus: 'turnaround_to_profit',
            epsGrowthDisplay: '黒字転換 (SEC -0.2 -> 0.4)',
            epsGrowthSourceDetail: {
              source: 'sec-companyfacts',
              fact: 'us-gaap:EarningsPerShareDiluted',
              currentPeriod: 'CY2026Q1',
              previousPeriod: 'CY2025Q1',
              currentEps: 0.4,
              previousEps: -0.2,
            },
          },
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
                  fcfTtm: null,
                  revenueGrowthTtm: 20,
                  pFcfDirect: null,
                  atr: null,
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
                  fcfMargin: -5,
                  fcfTtm: -100_000_000,
                  revenueGrowthTtm: 14,
                  pFcfDirect: null,
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
    assert.equal(result.results.find((row) => row.symbol === 'MU').pFcf, 22.4);
    assert.equal(result.results.find((row) => row.symbol === 'MU').atrPct, 4.25);
    assert.equal(result.results.find((row) => row.symbol === 'QCOM').epsGrowthStatus, 'turnaround_to_profit');
    assert.equal(result.results.find((row) => row.symbol === 'QCOM').epsGrowthScoreValue, 120);
    assert.deepEqual(result.results.find((row) => row.symbol === 'MU').missingMetricSupplement, {
      sources: ['moomoo', 'price-history-adapter'],
      fields: ['epsGrowthTtm', 'pFcf', 'atrPct'],
    });
    assert.equal(result.results.find((row) => row.symbol === 'QCOM').epsGrowthTtm, null);
    assert.equal(result.results.find((row) => row.symbol === 'QCOM').pFcf, null);
    assert.equal(result.sourceDetails.usMissingMetricSupplement.supplementedRows, 2);
    assert.deepEqual(result.sourceDetails.usMissingMetricSupplement.fields, {
      epsGrowthTtm: 1,
      pFcf: 1,
      atrPct: 1,
      epsGrowthStatus: 1,
    });
  });

  it('treats negative TradingView EPS YoY with positive EPS as a turnaround for scoring', async () => {
    const result = await runFundamentalScreener({
      limit: 10,
      _deps: {
        marketCapMinUsd: 1_000_000_000,
        fetch: createMockFetch({
          stockBodies: [],
          phase1Payload: {
            totalCount: 1,
            data: [
              buildPhase1StockRow('NASDAQ:MSFT', {
                name: 'Microsoft',
                sector: 'Technology Services',
                perf1m: 20,
                perf3m: 18,
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
              totalCount: 3,
              data: [
                buildPhase2Row('NASDAQ:SNDK', {
                  name: 'Sandisk',
                  sector: 'Technology Services',
                  industry: 'Packaged Software',
                  close: 100,
                  rsi: 66,
                  sma200: 80,
                  sma50: 90,
                  high52w: 105,
                  perf3m: 25,
                  perf6m: 40,
                  perfY: 80,
                  relativeVolume: 1.1,
                  marketCap: 5_000_000_000,
                  eps: 23.03,
                  epsGrowthTtm: -144.5,
                  roe: 25,
                  roic: 25,
                  grossMargin: 60,
                  grossProfitTtm: 600_000_000,
                  totalAssets: 2_000_000_000,
                  operatingMargin: 30,
                  fcfMargin: 20,
                  fcfTtm: 400_000_000,
                  fcfGrowthTtm: 20,
                  revenueGrowthTtm: 30,
                  pFcfDirect: 20,
                  netDebt: 0,
                  volume: 500_000,
                }),
                buildPhase2Row('NASDAQ:GOOD', {
                  name: 'Good Growth',
                  sector: 'Technology Services',
                  industry: 'Packaged Software',
                  close: 100,
                  rsi: 66,
                  sma200: 80,
                  sma50: 90,
                  high52w: 105,
                  perf3m: 25,
                  perf6m: 40,
                  perfY: 80,
                  relativeVolume: 1.1,
                  marketCap: 5_000_000_000,
                  eps: 5,
                  epsGrowthTtm: 45,
                  roe: 25,
                  roic: 25,
                  grossMargin: 60,
                  grossProfitTtm: 600_000_000,
                  totalAssets: 2_000_000_000,
                  operatingMargin: 30,
                  fcfMargin: 20,
                  fcfTtm: 400_000_000,
                  fcfGrowthTtm: 20,
                  revenueGrowthTtm: 30,
                  pFcfDirect: 20,
                  netDebt: 0,
                  volume: 500_000,
                }),
                buildPhase2Row('NASDAQ:LOW', {
                  name: 'Low Growth',
                  sector: 'Technology Services',
                  industry: 'Packaged Software',
                  close: 100,
                  rsi: 66,
                  sma200: 80,
                  sma50: 90,
                  high52w: 105,
                  perf3m: 25,
                  perf6m: 40,
                  perfY: 80,
                  relativeVolume: 1.1,
                  marketCap: 5_000_000_000,
                  eps: 4,
                  epsGrowthTtm: 5,
                  roe: 25,
                  roic: 25,
                  grossMargin: 60,
                  grossProfitTtm: 600_000_000,
                  totalAssets: 2_000_000_000,
                  operatingMargin: 30,
                  fcfMargin: 20,
                  fcfTtm: 400_000_000,
                  fcfGrowthTtm: 20,
                  revenueGrowthTtm: 30,
                  pFcfDirect: 20,
                  netDebt: 0,
                  volume: 500_000,
                }),
              ],
            },
          },
        }),
      },
    });

    const sndk = result.results.find((row) => row.symbol === 'SNDK');
    const good = result.results.find((row) => row.symbol === 'GOOD');

    assert.equal(sndk.epsGrowthTtm, -144.5);
    assert.equal(sndk.epsGrowthStatus, 'turnaround_to_profit');
    assert.equal(sndk.epsGrowthDisplay, '黒字転換 (raw -144.5%)');
    assert.equal(sndk.epsGrowthScoreValue, 120);
    assert.ok(
      sndk.rankBreakdown.growth.fields.epsGrowthScoreValue < good.rankBreakdown.growth.fields.epsGrowthScoreValue,
      'turnaround EPS should outrank ordinary positive EPS growth inside the growth block',
    );
  });

  it('uses SEC-backed static supplements to label EPS turnarounds when TradingView EPS YoY is missing', async () => {
    const result = await runFundamentalScreener({
      limit: 10,
      _deps: {
        marketCapMinUsd: 1_000_000_000,
        fetch: createMockFetch({
          stockBodies: [],
          phase1Payload: {
            totalCount: 1,
            data: [
              buildPhase1StockRow('NASDAQ:NVDA', {
                name: 'Nvidia',
                sector: 'Electronic Technology',
                perf1m: 20,
                perf3m: 18,
                perf6m: 35,
                perfY: 70,
                rsi: 69,
                relativeVolume: 1.0,
                marketCap: 2_500_000_000,
              }),
            ],
          },
          phase2PayloadsBySector: {
            'Electronic Technology': {
              totalCount: 1,
              data: [
                buildPhase2Row('NASDAQ:SNDK', {
                  name: 'Sandisk',
                  sector: 'Electronic Technology',
                  industry: 'Semiconductors',
                  close: 100,
                  rsi: 66,
                  sma200: 80,
                  sma50: 90,
                  high52w: 105,
                  perf3m: 25,
                  perf6m: 40,
                  perfY: 80,
                  relativeVolume: 1.1,
                  marketCap: 5_000_000_000,
                  eps: 28.76,
                  epsGrowthTtm: null,
                  roe: 25,
                  roic: 25,
                  grossMargin: 60,
                  grossProfitTtm: 600_000_000,
                  totalAssets: 2_000_000_000,
                  operatingMargin: 30,
                  fcfMargin: 20,
                  fcfTtm: 400_000_000,
                  fcfGrowthTtm: 20,
                  revenueGrowthTtm: 30,
                  pFcfDirect: 20,
                  netDebt: 0,
                  volume: 500_000,
                }),
              ],
            },
          },
        }),
      },
    });

    const sndk = result.results.find((row) => row.symbol === 'SNDK');

    assert.equal(sndk.epsGrowthTtm, null);
    assert.equal(sndk.epsGrowthStatus, 'turnaround_to_profit');
    assert.equal(sndk.epsGrowthDisplay, '黒字転換 (SEC -11.16 -> 29.42)');
    assert.equal(sndk.epsGrowthScoreValue, 120);
    assert.deepEqual(sndk.epsGrowthSourceDetail, {
      source: 'sec-companyfacts',
      fact: 'us-gaap:EarningsPerShareDiluted',
      currentPeriod: 'FY2026 Q3',
      previousPeriod: 'FY2025 Q3',
      currentEps: 29.42,
      previousEps: -11.16,
    });
    assert.deepEqual(sndk.missingMetricSupplement, {
      sources: ['sec-companyfacts-cik-0002023554'],
      fields: ['epsGrowthStatus'],
    });
  });

  it('keeps weak-fundamental momentum names below stronger all-around candidates', async () => {
    const result = await runFundamentalScreener({
      limit: 10,
      _deps: {
        marketCapMinUsd: 1_000_000_000,
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
        marketCapMinUsd: 1_000_000_000,
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
        marketCapMinUsd: 1_000_000_000,
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
