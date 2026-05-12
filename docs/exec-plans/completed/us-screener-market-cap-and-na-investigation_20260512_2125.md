# US Screener Market Cap And NA Investigation 2026-05-12 21:25

## 目的

米国日次スクリーニングの銘柄ランキング表について、`現在値` 列を `時価総額` 列へ差し替える。価格そのものではなく企業規模を確認したいという用途に合わせる。

あわせて、現行ランキングで `EPS YoY` や `P/FCF` が `N/A` になっている銘柄を調査し、取得できない理由を整理する。必要なら実データを再取得して、アプリ側欠損か TradingView 側欠損かを切り分ける。

## 変更ファイル

- 変更: `scripts/screener/run-fundamental-screening.mjs`
  - 銘柄ランキング表の `現在値` を `時価総額` に差し替える。
  - 時価総額表示用の小さな整形関数を追加する。
- 変更: `docs/reports/screener/TEMPLATE.md`
  - 銘柄ランキングの列説明を `時価総額` ベースに更新する。
- 変更: `tests/daily-screener-report.test.js`
  - レポート表ヘッダと表示内容を `時価総額` に合わせて更新する。
- 生成更新: `docs/reports/screener/daily-ranking.md`
  - US レポートを再生成し、列差し替えを反映する。
- 調査メモのみ: 実装変更を伴わない場合は専用ファイルを増やさず、最終報告で `N/A` 原因を共有する。
- 移動: `docs/exec-plans/active/us-screener-market-cap-and-na-investigation_20260512_2125.md` → `docs/exec-plans/completed/us-screener-market-cap-and-na-investigation_20260512_2125.md`
  - 実装と調査完了後に completed へ移動する。

## 影響範囲

- 変更対象は米国スクリーニング Markdown 出力だが、テンプレ/生成ロジックは共通なので JP でも同列名・表示形式が使われる。
- スクリーニング条件やランキングロジックそのものは変更しない。
- `N/A` 調査は、まず現行 report 掲載銘柄と `runFundamentalScreener()` の値、必要なら TradingView live response まで確認する。

## 実装ステップ

- [x] レポート生成コードの `現在値` 列を `時価総額` に差し替える。
- [x] テンプレートとレポートテストを更新する。
- [x] 現行ランキングで `EPS YoY` / `P/FCF` が `N/A` の銘柄を列挙する。
- [x] ソースコードと必要な live data を確認し、欠損理由を切り分ける。
- [x] `node --test tests/daily-screener-report.test.js tests/fundamental-screener.test.js` を実行する。
- [x] `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs` を実行してレポートを再生成する。
- [x] `git diff --check` を実行する。
- [x] 計画を completed へ移動し、変更をコミット・push する。

## 検証

- `node --test tests/daily-screener-report.test.js tests/fundamental-screener.test.js`
- `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs`
- `git diff --check`

## リスク

- 時価総額の表示桁をそのまま出すと可読性が落ちるため、単位短縮の表示ルールを先に揃える必要がある。
- `P/FCF` は直接列が null でも fallback 計算で埋まる実装なので、`N/A` になるなら `market_cap_basic` か `free_cash_flow_ttm` の欠損・負値が絡む可能性が高い。
- `EPS YoY` は TradingView 側の `earnings_per_share_diluted_yoy_growth_ttm` 欠損や、銘柄種別差異で null になる可能性があるため、アプリ不具合と即断しない。
