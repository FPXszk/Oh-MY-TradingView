import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  convertSbiToTradingView,
  decodeCsvBuffer,
  parseCsv,
  stringifyCsv,
} from '../scripts/portfolio/convert-sbi-to-tradingview.mjs';

describe('SBI to TradingView portfolio converter', () => {
  it('parses and stringifies quoted CSV cells', () => {
    const rows = parseCsv('A,B\n"hello, csv","quoted ""value"""\n');
    assert.deepEqual(rows, [
      ['A', 'B'],
      ['hello, csv', 'quoted "value"'],
    ]);
    assert.equal(stringifyCsv(rows), 'A,B\n"hello, csv","quoted ""value"""\n');
  });

  it('chooses shift_jis when utf-8 would be garbled', () => {
    const buffer = Buffer.from([0x96, 0xc1, 0x95, 0xbf]);
    const decoded = decodeCsvBuffer(buffer);
    assert.equal(decoded.encoding, 'shift_jis');
    assert.equal(decoded.text, '銘柄');
  });

  it('converts SBI US and JP rows and writes skipped fund rows', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'portfolio-converter-'));
    const examplePath = join(dir, 'example.csv');
    const usPath = join(dir, 'us.csv');
    const jpPath = join(dir, 'jp.csv');
    const mapPath = join(dir, 'map.json');
    const outDir = join(dir, 'out');

    await writeFile(examplePath, 'Symbol,Side,Qty,Fill Price,Commission,Closing Time\n', 'utf8');
    await writeFile(usPath, [
      '通貨指定,商品指定',
      '"すべての通貨","すべての商品"',
      '国内約定日,通貨,銘柄名,取引,預り区分,約定数量,約定単価,国内受渡日,受渡金額',
      '"2026年06月08日","米国ドル","ラウンドヒル メモリー ETF DRAM / CBOE","買付","NISA","24","59.7","26/06/10","1432.8"',
      '"2026年06月05日","米国ドル","オラクル ORCL / New York Stock Exchange","売却","特定","11","235","26/06/09","2572.21"',
    ].join('\n'), 'utf8');
    await writeFile(jpPath, [
      '約定履歴照会',
      '約定日,銘柄,銘柄コード,市場,取引,期限,預り,課税,約定数量,約定単価,手数料/諸経費等,税額,受渡日,受渡金額/決済損益',
      '"2024/10/29","メタプラネット","3350","東証",株式現物買,"--"," NISA(成) ","--",100,1350,--,--,"2024/10/31",135000',
      '"2024/07/04","ｅＭＡＸＩＳ　Ｓｌｉｍ　米国株式（Ｓ＆Ｐ５００）",,,投信金額買付,"--"," NISA(つ) ","--",21748,32188,--,--,"2024/07/09",70000',
    ].join('\n'), 'utf8');
    await writeFile(mapPath, JSON.stringify({ us: { DRAM: 'CBOE:DRAM' }, jp: { 3350: 'TSE:3350' } }), 'utf8');

    const result = await convertSbiToTradingView({
      us: usPath,
      jp: jpPath,
      example: examplePath,
      out: outDir,
      symbolMap: mapPath,
    });

    assert.equal(result.us.converted.length, 2);
    assert.equal(result.jp.converted.length, 1);
    assert.equal(result.skipped.length, 1);

    const usCsv = await readFile(join(outDir, 'tradingview_us_from_sbi.csv'), 'utf8');
    assert.match(usCsv, /CBOE:DRAM,Buy,24,59.7,0,2026-06-08 0:00:00/);
    assert.match(usCsv, /NYSE:ORCL,Sell,11,235,0,2026-06-05 0:00:00/);

    const jpCsv = await readFile(join(outDir, 'tradingview_jp_stocks_from_sbi.csv'), 'utf8');
    assert.match(jpCsv, /TSE:3350,Buy,100,1350,0,2024-10-29 0:00:00/);

    const skippedCsv = await readFile(join(outDir, 'tradingview_conversion_skipped.csv'), 'utf8');
    assert.match(skippedCsv, /investment_fund_excluded/);
  });
});
