# Rule40 Coverage Audit Session Log 20260531_2232

## 今回やったこと

- US 日次スクリーナーの `Rule of 40` について、掲載銘柄ベースの算出再現率を監査
- `Rule40` 列の `N/A` 表示をやめ、片側だけ取得できた場合も内容が見えるように変更
- 表の表示上限に埋もれる欠損銘柄を見逃さないよう、`Rule of 40 算出状況` 節と欠損銘柄一覧を追加

## 変更ファイル

- `src/core/fundamental-screener.js`
- `scripts/screener/run-fundamental-screening.mjs`
- `tests/fundamental-screener.test.js`
- `tests/daily-screener-report.test.js`
- `docs/reports/screener/daily-ranking.md`

## live 確認結果

実行コマンド:

```bash
SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs
```

結果:

- `totalScanned=206`
- `serverFiltered=121`
- `clientFiltered=69`
- `matched=69`

`Rule of 40` 監査結果:

- 完全算出: `66/69銘柄`
- 再現率: `95.7%`
- 欠損内訳: `売上のみあり 2件 / FCFのみあり 1件 / 両方欠け 0件`

欠損銘柄:

- `Q` : `FCF 18.1% / 売上欠け`
- `CYD` : `売上 33.8% / FCF欠け`
- `AVEX` : `売上 84.6% / FCF欠け`

## 実装メモ

- `Rule of 40` の加点対象は従来どおり `US software / SaaS` 系のみ維持
- ただし表示用の `Rule40` は US 掲載銘柄全体で出し、完全算出できない場合も欠損側を明示
- 1位セクターは 30件表示上限があるため、欠損銘柄一覧を別節で出すようにした

## テスト

```bash
node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js
```

- pass: `13/13`

## コミット

- plan commit: `2619649` `docs: rule40-coverage-audit-and-partial-display_20260531_2211`
- implementation commit: `04433fa` `feat: audit rule40 coverage and show partial values`
