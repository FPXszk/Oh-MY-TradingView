import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
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
  buildPortfolioReport,
  buildPortfolioReportFromCaptureDir,
} from '../scripts/sbi/build-portfolio-report.mjs';

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
      sources: {
        assetsSummary: '/tmp/sbi_assets_summary.csv',
        otherDownloads: ['/tmp/dividend-history.csv'],
      },
    });

    assert.match(report, /# SBI Portfolio Report/);
    assert.match(report, /## 現在のポートフォリオ/);
    assert.match(report, /## 実現損益/);
    assert.match(report, /## 約定履歴サマリー/);
    assert.match(report, /## 補助artifact/);
    assert.match(report, /dividend-history\.csv/);
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
    await writeFile(join(downloads, 'dividend-history.csv'), '入金日,銘柄,金額\n2026/05/01,NVDA,123.45\n', 'utf8');
    await writeFile(join(root, 'account-assets-page.json'), `${JSON.stringify({
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
    assert.match(report, /総資産残高/);
    assert.match(report, /ｅＭＡＸＩＳ/);
    assert.match(report, /エヌビディア/);
    assert.match(report, /補助artifact/);
    assert.match(report, /dividend-history\.csv/);
  });
});
