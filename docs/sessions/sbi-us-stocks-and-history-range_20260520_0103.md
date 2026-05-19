# Session Log 20260520_0103

## Summary

`SBI Portfolio Capture` workflow を、米国株の詳細回収と、`実現損益詳細` / `配当金・分配金履歴` の長期期間照会の両面で前進させた。

今回の最終到達点:

- `実現損益詳細` は `2022/01/01` から `2026/05/20` までの照会に成功
- `配当金・分配金履歴` も `2022/01/01` から `2026/05/20` までの照会に成功
- `米国株式` には少なくとも今回見えたページ上で直接の CSV 導線は確認できなかった
- ただし `外国株式トップ -> 保有銘柄` まで進むことで、保有銘柄本文から米国株 5 件を text fallback で report 化できた

## User Request

- `米国株` の方を先に進める
- `実現損益` と `配当` の期間は `2022-01-01`、できれば可能な限り前から取りたい
- `米国株` について、CSV ダウンロード導線があるか探す
- なければ他に取れる手段を探す

## What We Verified From Existing Artifacts

前回 run `26108902705` の artifact から:

- `実現損益詳細` 本文に `CSVダウンロードは前日までの約定分となります。` が見えていた
- `配当金・分配金履歴` は click 導線があったが、まだ期間は current month 相当
- `米国株式` は `https://site.sbisec.co.jp/account/foreign/summary` に飛ぶが、そこで `現在、お客様の預り情報はございません。` と出ており、CSV も見当たらなかった

## What Changed

- Update: `scripts/sbi/capture-portfolio-data.mjs`
  - snapshot に `formControls` を追加
  - `実現損益詳細` / `配当金・分配金履歴` で日付 input を見つけて `2022/01/01` を入れ、さらに query param を直接書き換えて期間レンジを強制する flow を追加
  - `米国株式` では `外国株式トップ`、`保有銘柄` まで fallback capture を広げた
- Update: `scripts/sbi/build-portfolio-report.mjs`
  - `foreign-holdings-page` の本文から米国株明細を text fallback で抽出できるようにした
- Update: `tests/sbi-capture-workflow.test.js`
- Update: `tests/sbi-portfolio-report.test.js`

## Verification

### Unit tests

- `node --test tests/sbi-capture-workflow.test.js` -> success
- `node --test tests/sbi-portfolio-report.test.js` -> success

### Live workflow runs

#### Run `26109993235`

- date input 自体は見つかった
- ただし `period=THIS_MONTH` が残り、結果はまだ current month のままだった
- この run を受けて query param 直接書き換えを追加

#### Run `26110589458`

- workflow: success
- URL: <https://github.com/FPXszk/Oh-MY-TradingView/actions/runs/26110589458>

artifact で確認できたこと:

- `realized-detail-page.txt`
  - `期間：約定日 2022/1/1～2026/5/20`
  - `CSVダウンロード`
  - 実現損益合計:
    - 国内株式(現物): `+623,767円`
    - 米国株式: `+1,128,671円`
    - 投資信託: `+177,705円`
    - 合計: `+1,930,143円`
- `dividend-history-page.txt`
  - `期間：2022/1/1～2026/5/20`
  - `CSVダウンロード`
  - 商品別サマリー:
    - 国内株式(現物): `4,345円`
    - 米国株式: `10,644円 / 67.56USD`
    - 投資信託: `3,686円`
    - 合計: `18,675円`
- `capture-summary.md`
  - `米国株式` route は依然 `csv_download_success: false`
  - ただし
    - `Fallback snapshot foreign-top-page: https://member.c.sbisec.co.jp/foreign/home`
    - `Fallback snapshot foreign-holdings-page: https://member.c.sbisec.co.jp/foreign/account/assets`
    が取れた

### Local report rebuild from final artifact

`tmp/sbi-run-26110589458` を使って local で report builder を再実行し、米国株 5 件が report に入ることを確認した。

抽出できた米国株:

- オラクル `ORCL`
- IonQ Inc `IONQ`
- マイクロン テクノロジー `MU`
- エヌビディア `NVDA`
- オクロ A `OKLO`

## Important Interpretation

- 現時点で `実現損益詳細` と `配当金・分配金履歴` は、workflow から `2022-01-01` 起点で十分回収可能
- 画面文言から見る限り、どちらも `2021年8月以降` が上限なので、理論上はさらに前倒しの余地がある
- `米国株式` は今回見えた導線上では CSV を確認できなかった
- ただし `保有銘柄` ページ本文には、明細に必要な
  - 銘柄名
  - ティッカー
  - 数量
  - 円換算評価額
  - 円換算評価損益
  - USD 損益
  が並んでおり、text fallback で report 化できる

## Suggested Next Step

次にやるなら、`realized-detail-page` と `dividend-history-page` で見えている `CSVダウンロード` を実際に click して、`ALLTYPE` / `FOREIGN_STOCK` / 配当系 CSV のファイル回収までつなぐのが最短。
