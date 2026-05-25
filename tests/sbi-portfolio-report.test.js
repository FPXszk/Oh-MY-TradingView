import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

import {
  parseAssetsSummaryCsv,
  parseAssetsSummarySnapshot,
  parseUsStocksCsv,
  parseUsStocksSnapshot,
  parseFundPortfolioCsv,
  parseFundPortfolioSnapshot,
  parseRealizedSummaryCsv,
  parseDomesticHistoryCsv,
  parseForeignHistoryCsv,
  parseDistributionHistoryCsv,
  buildPortfolioReport,
  buildPortfolioReportFromCaptureDir,
} from '../scripts/sbi/build-portfolio-report.mjs';
import { buildUnifiedPortfolioReport } from '../scripts/portfolio/build-unified-portfolio-report.mjs';

const PROJECT_ROOT = process.cwd();
const PORTFOLIO_HEALTH_WORKFLOW_PATH = resolve(PROJECT_ROOT, '.github', 'workflows', 'portfolio-health-check.yml');

describe('sbi portfolio report parsers', () => {
  it('parses assets summary rows', () => {
    const result = parseAssetsSummaryCsv(`取得日時,2026/5/18 16:14

サマリー,金額(円)
総資産残高,5424050
前日比,+6550
評価損益,+923131
評価損益率(%),+20.50

商品,評価額(円),評価損益(円),評価損益率(%),前日比(円),前月比率(%)
米国株式,1750653,+439206,+33.49,+4626,+0.26
預り金(円),1398724,--,--,0,0.00
合計,5424050,+923131,+20.50,+6550,+0.12
`);

    assert.equal(result.asOf, '2026/5/18 16:14');
    assert.equal(result.totalAssetsJpy, 5424050);
    assert.equal(result.products.length, 2);
    assert.equal(result.products[0].product, '米国株式');
  });

  it('parses US stocks and fund holdings', () => {
    const usStocks = parseUsStocksCsv(`口座種別,銘柄名,ティッカー,取引所,保有数量,取得単価(USD),現在値(USD),外貨建評価額(USD),円換算評価額(円),外貨建評価損益(USD),円換算評価損益(円)
NISA預り,エヌビディア,NVDA,NASDAQ,10,174.50,225.32,2253.20,358213,+508.20,+77963
`);
    const funds = parseFundPortfolioCsv(`保有証券一覧
投資信託（金額/NISA預り（つみたて投資枠））
ファンド名,保有口数,売却注文中,取得単価,基準価額,取得金額,評価額,評価損益,分配金受取方法
ｅＭＡＸＩＳ　Ｓｌｉｍ　米国株式（Ｓ＆Ｐ５００）,305179,,30474,43645,930002,1331953,+401951,再投資
投資信託（金額/NISA預り（つみたて投資枠））合計
`);

    assert.equal(usStocks.length, 1);
    assert.equal(usStocks[0].ticker, 'NVDA');
    assert.equal(funds.length, 1);
    assert.equal(funds[0].distributionMethod, '再投資');
  });

  it('parses US stocks from snapshot tables', () => {
    const stocks = parseUsStocksSnapshot({
      tables: [
        {
          rows: [
            ['口座種別', '銘柄名', 'ティッカー', '取引所', '保有数量', '円換算評価額(円)', '円換算評価損益(円)'],
            ['NISA預り', 'エヌビディア', 'NVDA', 'NASDAQ', '10', '358,213', '+77,963'],
          ],
        },
      ],
    });

    assert.equal(stocks.length, 1);
    assert.equal(stocks[0].ticker, 'NVDA');
    assert.equal(stocks[0].marketValueJpy, 358213);
  });

  it('parses US stocks from snapshot text fallback', () => {
    const stocks = parseUsStocksSnapshot({
      text: '株式(特定) 総評価合計 外貨建評価額 2,013.99 USD 円換算評価額 320,264 円 外貨建評価損益 -1,118.81 USD -35.71 % 円換算評価損益 -152,472 円 -32.25 % 銘柄 現在値 円換算額 保有数量 (売却注文中) 取得単価 円換算額 取得金額 円換算額 外貨建評価額 円換算評価額 外貨建評価損益 円換算評価損益 金額 % 取引 オラクル ORCLNYSE 183.09 USD 29,114 円 11 (0) 284.80 USD 42,976 円 3,132.80 USD 472,736 円 2,013.99 USD 320,264 円 -1,118.81 USD -152,472 円 現買 現売 積立 株式(NISA) 総評価合計 外貨建評価額 8,615.84 USD 円換算評価額 1,370,088 円 外貨建評価損益 +3,341.54 USD +63.36 % 円換算評価損益 +531,377 円 +63.36 % 銘柄 現在値 円換算額 保有数量 (売却注文中) 取得単価 円換算額 取得金額 円換算額 外貨建評価額 円換算評価額 外貨建評価損益 円換算評価損益 金額 % 取引 IonQ Inc IONQNYSE 46.71 USD 7,428 円 1 (0) 53.80 USD 8,493 円 53.80 USD 8,493 円 46.71 USD 7,427 円 -7.09 USD -1,066 円 現買 現売 積立',
    });

    assert.equal(stocks.length, 2);
    assert.equal(stocks[0].ticker, 'ORCL');
    assert.equal(stocks[1].ticker, 'IONQ');
    assert.equal(stocks[1].marketValueJpy, 7427);
  });

  it('parses asset/fund snapshot fallbacks', () => {
    const assets = parseAssetsSummarySnapshot({
      tables: [
        {
          rows: [
            ['総資産', '5,424,050'],
            ['評価損益', '+923,131'],
            ['前日比', '+6,550'],
            ['国内株式', '0'],
            ['米国株式', '1,750,653'],
            ['投資信託', '1,546,177'],
            ['預り金(円)', '1,398,724'],
            ['預り金(米ドル)', '728,498'],
          ],
        },
      ],
      text: '資産残高 更新 2026/5/21 01:43 5,424,050円 前日比 +6,550円 評価損益 +923,131円 評価損益率 +20.50%',
    });
    const funds = parseFundPortfolioSnapshot({
      tables: [
        {
          rows: [
            ['投資信託（金額/NISA預り（つみたて投資枠））'],
            ['ファンド名', '数量', '取得単価', '現在値', '損益', '評価額'],
            ['ｅＭＡＸＩＳ　Ｓｌｉｍ　米国株式（Ｓ＆Ｐ５００）', '305,179', '30,474', '43,645', '+401,951.26', '1,331,953.74'],
          ],
        },
      ],
    });

    assert.equal(assets.totalAssetsJpy, 5424050);
    assert.equal(assets.asOf, '2026/5/21 01:43');
    assert.equal(assets.products.find((row) => row.product === '米国株式')?.marketValueJpy, 1750653);
    assert.equal(funds.length, 1);
    assert.equal(funds[0].marketValueJpy, 1331953.74);
  });

  it('parses realized summary and histories', () => {
    const realizedSummary = parseRealizedSummaryCsv(`商品,実現損益(税引前・円),利益金額(円),損失金額(円)
国内株式(現物),+623,767,701,950,-78,183
米国株式,+1,128,671,1,151,168,-22,497
合計,+1,930,143,2,030,823,-100,680
`);
    const domesticHistory = parseDomesticHistoryCsv(`約定日,銘柄,銘柄コード,市場,取引,期限,預り,課税,約定数量,約定単価,手数料/諸経費等,税額,受渡日,受渡金額/決済損益
2025/05/13,ソシオネクスト,6526,東証,株式現物売,--, 特定 ,申告,100,1900,--,--,2025/05/15,190000
`);
    const foreignHistory = parseForeignHistoryCsv(`国内約定日,通貨,銘柄名,取引,預り区分,約定数量,約定単価,国内受渡日,受渡金額
2025年05月28日,米国ドル,IonQ Inc IONQ / New York Stock Exchange,売却,NISA,1,46,25/05/30,46
`);

    assert.equal(realizedSummary.length, 2);
    assert.equal(realizedSummary[1].product, '米国株式');
    assert.equal(domesticHistory[0].date, '2025-05-13');
    assert.equal(foreignHistory[0].settlementDate, '2025-05-30');
  });

  it('parses distribution history summary and details', () => {
    const distribution = parseDistributionHistoryCsv(`"検索件数","4"
"受渡日","2025/1/1-2026/5/18"
"種類","すべて"
"口座","すべて"

"商品","受取額(税引後・円)","受取額(税引後・USD)"
"国内株式(現物)","4,345",
"米国株式","10,644.17","67.56"
"投資信託","3,686",
"合計","18,675.17",

"受渡日","口座","商品","銘柄名","数量","受取額(税引後・円)"
"2026/4/30","特定/一般","投資信託","インベスコ","37,849","454"
"2026/4/27","特定/一般","米国株式","オラクル ORCL","11","629"
"2026/4/16","NISA（成長投資枠）","米国株式","マイクロン MU","10","213.17"
`);

    assert.equal(distribution.summary.length, 3);
    assert.equal(distribution.summary[1].product, '米国株式');
    assert.equal(distribution.summary[1].amountUsd, 67.56);
    assert.equal(distribution.entries.length, 3);
    assert.equal(distribution.entries[0].date, '2026-04-30');
    assert.equal(distribution.entries[2].currency, 'USD');
  });
});

describe('sbi portfolio report builder', () => {
  it('renders a markdown report with the expected sections', () => {
    const report = buildPortfolioReport({
      assetsSummary: {
        asOf: '2026/5/18 16:14',
        totalAssetsJpy: 5424050,
        totalDayChangeJpy: 6550,
        totalUnrealizedPlJpy: 923131,
        totalUnrealizedPlPct: 20.5,
        products: [
          { product: '米国株式', marketValueJpy: 1750653 },
          { product: '投資信託', marketValueJpy: 1546175 },
          { product: '預り金(円)', marketValueJpy: 1398724 },
          { product: '預り金(米ドル)', marketValueJpy: 728498 },
        ],
      },
      usStocks: [
        {
          accountType: 'NISA預り',
          name: 'エヌビディア',
          ticker: 'NVDA',
          quantity: 10,
          marketValueJpy: 358213,
          unrealizedPlJpy: 77963,
          unrealizedPlUsd: 508.2,
        },
      ],
      funds: [
        {
          accountType: 'NISA預り（つみたて投資枠）',
          name: 'ｅＭＡＸＩＳ　Ｓｌｉｍ　米国株式（Ｓ＆Ｐ５００）',
          quantity: 305179,
          marketValueJpy: 1331953,
          unrealizedPlJpy: 401951,
          distributionMethod: '再投資',
        },
      ],
      realizedSummary: [
        { product: '国内株式(現物)', realizedPlJpy: 623767, gainJpy: 701950, lossJpy: -78183 },
        { product: '米国株式', realizedPlJpy: 1128671, gainJpy: 1151168, lossJpy: -22497 },
      ],
      realizedDomestic: [
        { date: '2026-05-12', type: '国内株式', name: '住友電気工業', accountType: '特定', realizedPlJpy: 33900 },
      ],
      realizedForeign: [
        { date: '2026-01-27', type: '米国株式', name: 'PLTR', accountType: 'NISA', realizedPlJpy: 547452 },
      ],
      realizedFund: [],
      domesticHistory: [
        { date: '2025-05-13', category: '国内株式', name: 'ソシオネクスト', action: '株式現物売', accountType: '特定', quantity: 100, settlementAmountJpy: 190000 },
      ],
      foreignHistory: [
        { date: '2025-05-28', category: '米国株式', currency: '米国ドル', name: 'IonQ Inc IONQ', action: '売却', accountType: 'NISA', quantity: 1, settlementAmount: 46 },
      ],
      distributionSummary: [
        { product: '国内株式(現物)', amountJpy: 4345, amountUsd: null },
        { product: '米国株式', amountJpy: 10644.17, amountUsd: 67.56 },
      ],
      distributionEntries: [
        { date: '2026-04-30', accountType: '特定/一般', product: '投資信託', name: 'インベスコ', quantity: 37849, amount: 454, currency: 'JPY' },
        { date: '2026-04-16', accountType: 'NISA（成長投資枠）', product: '米国株式', name: 'マイクロン MU', quantity: 10, amount: 213.17, currency: 'USD' },
      ],
      sources: {
        assetsSummary: '/tmp/sbi_assets_summary.csv',
        distributionHistory: '/tmp/DISTRIBUTION_20260521004941.csv',
      },
    });

    assert.match(report, /# SBI Portfolio Report/);
    assert.match(report, /## 現在のポートフォリオ/);
    assert.match(report, /## 実現損益/);
    assert.match(report, /## 配当金・分配金履歴/);
    assert.match(report, /## 約定履歴サマリー/);
    assert.match(report, /DISTRIBUTION_20260521004941\.csv/);
    assert.match(report, /マイクロン MU/);
    assert.match(report, /エヌビディア/);
    assert.match(report, /住友電気工業/);
  });

  it('builds a report from capture directory fallbacks', async () => {
    const root = await mkdtemp(join(tmpdir(), 'sbi-capture-'));
    const downloads = join(root, 'downloads');
    await mkdir(downloads, { recursive: true });
    await writeFile(join(downloads, 'SaveFile.csv'), `ポートフォリオ一覧
投資信託（金額/NISA預り（つみたて投資枠））
ファンド名,数量,取得単価,現在値,損益,評価額
ｅＭＡＸＩＳ　Ｓｌｉｍ　米国株式（Ｓ＆Ｐ５００）,305179,30474,43645,+401951.26,1331953.74
`, 'utf8');
    await writeFile(join(downloads, 'DISTRIBUTION_20260521004941.csv'), `"検索件数","2"
"受渡日","2025/1/1-2026/5/18"
"種類","すべて"
"口座","すべて"

"商品","受取額(税引後・円)","受取額(税引後・USD)"
"投資信託","3,686",
"米国株式","10,644.17","67.56"
"合計","14,330.17",

"受渡日","口座","商品","銘柄名","数量","受取額(税引後・円)"
"2026/4/30","特定/一般","投資信託","インベスコ　世界厳選株式オープン","37,849","454"
"2026/4/16","NISA（成長投資枠）","米国株式","マイクロン テクノロジー MU","10","213.17"
`, 'utf8');
    await writeFile(join(downloads, 'ALLTYPE_20260521001538.csv'), `"すべて"

"約定日","2022/1/1-2026/5/21"

"商品","実現損益(税引前・円)","利益金額(円)","損失金額(円)"
"国内株式(現物)","+623,767","701,950","-78,183"
"米国株式","+1,128,671","1,151,168","-22,497"
"投資信託","+177,705","177,705","0"
"合計","+1,930,143","2,030,823","-100,680"
`, 'utf8');
    await writeFile(join(root, 'account-assets-page.json'), `${JSON.stringify({
      text: 'My資産トップ 更新 2026/5/21 01:43 資産残高 5,424,050円 前日比 +6,550円 評価損益 +923,131円 評価損益率 +20.50%',
      tables: [
        {
          rows: [
            ['総資産', '5,424,050'],
            ['評価損益', '+923,131'],
            ['前日比', '+6,550'],
            ['国内株式', '0'],
            ['米国株式', '1,750,653'],
            ['投資信託', '1,546,177'],
            ['預り金(円)', '1,398,724'],
            ['預り金(米ドル)', '728,498'],
          ],
        },
      ],
    }, null, 2)}\n`, 'utf8');
    await writeFile(join(root, 'foreign-top-page.json'), `${JSON.stringify({
      tables: [
        {
          rows: [
            ['口座種別', '銘柄名', 'ティッカー', '取引所', '保有数量', '円換算評価額(円)', '円換算評価損益(円)'],
            ['NISA預り', 'エヌビディア', 'NVDA', 'NASDAQ', '10', '358,213', '+77,963'],
          ],
        },
      ],
    }, null, 2)}\n`, 'utf8');
    const output = join(root, 'report.md');

    await buildPortfolioReportFromCaptureDir(root, output);
    const report = await readFile(output, 'utf8');

    assert.match(report, /# SBI Portfolio Report/);
    assert.match(report, /取得日時: 2026\/5\/21 01:43/);
    assert.match(report, /生成元: account-assets-page\.json ほか/);
    assert.match(report, /総資産残高/);
    assert.match(report, /ｅＭＡＸＩＳ/);
    assert.match(report, /エヌビディア/);
    assert.match(report, /米国株式/);
    assert.match(report, /\+￥1,128,671/);
    assert.match(report, /配当金・分配金履歴/);
    assert.match(report, /マイクロン テクノロジー MU/);
    assert.doesNotMatch(report, /補助artifact/);
  });

  it('builds a unified portfolio report with overall summary and broker details', () => {
    const report = buildUnifiedPortfolioReport({
      generatedAt: '2026-05-21T01:44:00.000Z',
      workflow: { runId: '123', runAttempt: '1', refName: 'main' },
      sbiData: {
        assetsSummary: {
          asOf: '2026/5/21 10:44',
          totalAssetsJpy: 5424050,
          totalDayChangeJpy: 6550,
          totalUnrealizedPlJpy: 923131,
          totalUnrealizedPlPct: 20.5,
          products: [
            { product: '米国株式', marketValueJpy: 1750653 },
            { product: '投資信託', marketValueJpy: 1546175 },
            { product: '預り金(円)', marketValueJpy: 1398724 },
            { product: '預り金(米ドル)', marketValueJpy: 728498 },
          ],
        },
        usStocks: [
          {
            accountType: 'NISA預り',
            name: 'エヌビディア',
            ticker: 'NVDA',
            quantity: 10,
            marketValueJpy: 358213,
            unrealizedPlJpy: 77963,
            unrealizedPlUsd: 508.2,
          },
        ],
        funds: [
          {
            accountType: 'NISA預り（つみたて投資枠）',
            name: 'ｅＭＡＸＩＳ　Ｓｌｉｍ　米国株式（Ｓ＆Ｐ５００）',
            quantity: 305179,
            marketValueJpy: 1331953,
            unrealizedPlJpy: 401951,
            distributionMethod: '再投資',
          },
        ],
        realizedSummary: [],
        realizedDomestic: [],
        realizedForeign: [],
        realizedFund: [],
        domesticHistory: [],
        foreignHistory: [],
        distributionSummary: [],
        distributionEntries: [],
        sources: {
          captureDir: '/tmp/capture',
          assetsSummary: '/tmp/sbi_assets_summary.csv',
        },
      },
      moomooPayload: {
        retrieved_at: '2026-05-21T01:43:00.000Z',
        currency: 'USD',
        totals: {
          accountCount: 1,
          realAccountCount: 1,
          simulateAccountCount: 0,
          positionCount: 2,
          totalAssets: 3210.55,
          cash: 210.12,
          marketValue: 3000.43,
          unrealizedPl: 400.11,
          cashRatioPct: 6.55,
          investedRatioPct: 93.45,
        },
        accounts: [
          {
            currency: 'USD',
            account: { accId: '****4600', trdEnv: 'REAL', accType: 'SECURITIES' },
            summary: {
              positionCount: 2,
              totalAssets: 3210.55,
              cash: 210.12,
              marketValue: 3000.43,
              unrealizedPl: 400.11,
              topPositionWeightPct: 60.5,
            },
            positions: [
              {
                symbol: 'NVDA',
                name: 'NVIDIA',
                qty: 3,
                marketValue: 1200.25,
                unrealizedPl: 150.33,
                weightPct: 40.01,
              },
              {
                symbol: 'AAPL',
                name: 'Apple',
                qty: 5,
                marketValue: 1800.18,
                unrealizedPl: 249.78,
                weightPct: 59.99,
              },
            ],
          },
        ],
        notes: ['read-only diagnostics'],
      },
    });

    assert.match(report, /# Portfolio Health Check — 2026-05-21/);
    assert.match(report, /🚦 ヘルスサマリー/);
    assert.match(report, /📊 資産スナップショット/);
    assert.match(report, /📋 ポジション一覧（統合）/);
    assert.doesNotMatch(report, /## SBI 詳細/);
    assert.doesNotMatch(report, /## moomoo 詳細/);
    assert.match(report, /NVDA/);
    assert.match(report, /AAPL/);
    assert.match(report, /当期実現損益なし/);
    assert.match(report, /配当受取なし/);
  });

  it('builds a moomoo-only unified report when SBI is disabled', () => {
    const report = buildUnifiedPortfolioReport({
      generatedAt: '2026-05-25T11:20:00.000Z',
      workflow: { runId: '456', runAttempt: '2', refName: 'main' },
      sbiData: null,
      moomooPayload: {
        retrieved_at: '2026-05-25T11:19:00.000Z',
        currency: 'USD',
        totals: {
          accountCount: 1,
          realAccountCount: 1,
          simulateAccountCount: 0,
          positionCount: 1,
          totalAssets: 1234.56,
          cash: 234.56,
          marketValue: 1000.0,
          unrealizedPl: 88.12,
          cashRatioPct: 19.0,
          investedRatioPct: 81.0,
        },
        accounts: [
          {
            positions: [
              {
                symbol: 'MSFT',
                name: 'Microsoft',
                qty: 2,
                marketValue: 1000.0,
                unrealizedPl: 88.12,
                plRatioPct: 9.66,
              },
            ],
          },
        ],
      },
    });

    assert.match(report, /# Portfolio Health Check — 2026-05-25/);
    assert.match(report, /SBI取得: skipped \(disabled\)/);
    assert.match(report, /SBI取得は無効。moomoo全ポジション/);
    assert.match(report, /MSFT/);
    assert.match(report, /SBI取得は無効のためスキップ/);
    assert.doesNotMatch(report, /\| SBI \|/);
  });
});

describe('portfolio health check workflow', () => {
  it('defaults to moomoo-only and runs SBI steps only when explicitly enabled', () => {
    const workflow = readFileSync(PORTFOLIO_HEALTH_WORKFLOW_PATH, 'utf8');

    assert.match(workflow, /enable_sbi:/,
      'workflow must define an enable_sbi input');
    assert.match(workflow, /enable_sbi:[\s\S]*default:\s+'false'/,
      'workflow must default enable_sbi to false');
    assert.match(workflow, /Run Moomoo read-only portfolio diagnostics/,
      'workflow must still run moomoo diagnostics');
    assert.match(workflow, /if:\s+\$\{\{\s*inputs\.enable_sbi == 'true'\s*\}\}/,
      'workflow must guard SBI steps behind enable_sbi');
    assert.ok(
      workflow.indexOf('Run Moomoo read-only portfolio diagnostics') < workflow.indexOf('Capture SBI portfolio data'),
      'workflow must run moomoo before SBI capture when SBI is enabled',
    );
  });

  it('passes skip-sbi to the unified report builder when SBI is disabled', () => {
    const workflow = readFileSync(PORTFOLIO_HEALTH_WORKFLOW_PATH, 'utf8');

    assert.match(workflow, /\$args \+= '--skip-sbi'/,
      'workflow must add --skip-sbi for moomoo-only runs');
    assert.match(workflow, /if \('\$\{\{ inputs\.enable_sbi \}\}' -ne 'true'\)/,
      'workflow must decide skip-sbi from the enable_sbi input');
    assert.match(workflow, /\$relativePaths = @\([\s\S]*MOOMOO_PORTFOLIO_JSON_PATH/,
      'publish step must always include moomoo outputs');
  });
});
