# Screener Metric Glossary And EPS YoY Investigation 2026-06-01 00:39

## 目的

日次スクリーニングの末尾に、現在の銘柄ランキング表で使っている指標の意味を毎回確認できる説明表を追加する。説明は今の出力列を正本として合わせ、`TEMPLATE.md` も同じ章立て・同じ表構成に更新する。

あわせて、`EPS YoY` が `N/A` になる銘柄が多い理由を調査し、現行データ取得経路で欠損しているのか、表示側で代替できる手段があるのかを切り分ける。

## 変更ファイル

- 変更: `scripts/screener/run-fundamental-screening.mjs`
  - `スコア算出` セクションの直下に、現在の銘柄ランキング表の列に対応した `指標説明` 表を追加する。
  - 説明表の文言を、現在の US レポート出力に揃える。
- 変更: `docs/reports/screener/TEMPLATE.md`
  - 現在のレポート構造に合わせて `指標説明` 表をテンプレにも追加する。
  - 既存の古い重み例や章名のズレを、現行出力に合わせて修正する。
- 変更: `tests/daily-screener-report.test.js`
  - `指標説明` 表が `スコア算出` の下に出ることと、主要な説明文が崩れていないことを検証する。
- 生成更新: `docs/reports/screener/daily-ranking.md`
  - US 日次レポートを再生成し、実出力を最新構造へ揃える。
- 調査のみ: `src/core/fundamental-screener.js`
  - `EPS YoY` / `P/FCF` の取得元と fallback 条件を確認し、`EPS YoY` の `N/A` 原因と代替可否を最終報告で共有する。
- 移動: `docs/exec-plans/active/screener-metric-glossary-and-eps-yoy-investigation_20260601_0039.md` → `docs/exec-plans/completed/screener-metric-glossary-and-eps-yoy-investigation_20260601_0039.md`

## 影響範囲

- 対象は Markdown レポートの説明セクション、テンプレート、テストであり、スクリーニングの抽出条件やスコア算出ロジック自体は変更しない。
- US / JP で共通の Markdown 生成関数を使っているため、説明表の追記位置は両方のレポートに反映される。
- `EPS YoY` 調査は実装前提ではなく、まず TradingView scanner の取得列と現行正規化処理を確認して原因を整理する。

## スコープ外

- `EPS YoY` の代替指標への差し替え実装や、新しい外部データソース追加は今回の対象外とする。
- 既存のスコア重み、Phase1 / Phase2 の抽出条件、ランキング順の変更は行わない。

## テスト戦略

- RED: `tests/daily-screener-report.test.js` に `指標説明` 表と文言の期待値を追加し、現状で失敗させる。
- GREEN: `run-fundamental-screening.mjs` と `TEMPLATE.md` を更新し、レポート生成で期待どおりの表を出す。
- REFACTOR: 説明表の生成を小さな helper に寄せ、既存の Markdown 組み立てを読みやすく保つ。

## 実装ステップ

- [x] 現行の銘柄ランキング表ヘッダと `スコア算出` 末尾の組み立て位置を確認し、説明表の列と文言を固定する。
- [x] `tests/daily-screener-report.test.js` に `指標説明` 表の期待値を追加する。
- [x] `scripts/screener/run-fundamental-screening.mjs` に `指標説明` 表を追加する。
- [x] `docs/reports/screener/TEMPLATE.md` を現行出力に合わせて更新する。
- [x] `node --test tests/daily-screener-report.test.js tests/fundamental-screener.test.js` を実行する。
- [x] `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs` を実行して `docs/reports/screener/daily-ranking.md` を再生成する。
- [x] `git diff --check` を実行する。
- [x] `src/core/fundamental-screener.js` の取得列・正規化・fallback 条件から `EPS YoY` の `N/A` 原因と代替可否を整理する。
- [x] 完了後に計画を `completed/` へ移動し、実装コミットと push を行う。

## 検証コマンド

- `node --test tests/daily-screener-report.test.js tests/fundamental-screener.test.js`
- `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs`
- `git diff --check`

## リスク

- 指標説明の文章量が多すぎるとレポート末尾が読みにくくなるため、列名・意味・見方を最小限の表に収める必要がある。
- `TEMPLATE.md` は過去の重み例が残っているため、現行出力に合わせた修正漏れがあると実レポートと乖離する。
- `EPS YoY` は TradingView 側で `earnings_per_share_diluted_yoy_growth_ttm` が null の可能性があり、代替案があっても同一意味を保てるとは限らない。
