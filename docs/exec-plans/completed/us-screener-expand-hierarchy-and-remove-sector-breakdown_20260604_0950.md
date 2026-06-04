# Exec-plan: us-screener-expand-hierarchy-and-remove-sector-breakdown_20260604_0950

## 概要

目的: 米国株スクリーニングの hierarchy 出力を、ユーザー指定どおり「1位セクターのみの中テーマ全表示 → 小テーマ全表示 → その小テーマ配下の個別銘柄全表示」に組み替え、不要になった `Phase2 セクター別ランキング` を削除する。

今回のゴール:

- 米国株レポートから `Phase2 セクター別ランキング` を削除する
- 米国株 `Phase2 中テーマランキング` は、Phase1 1位セクターに定義されている中テーマ候補をすべて表示する
- 米国株 `Phase3 小テーマランキング` は、切り上げや上位件数制限をやめて全表示する
- 米国株 `Phase4 個別銘柄ランキング` は、Phase3 に出た小テーマ配下の銘柄を全件対象にし、既存指標の総合点順で全表示する
- 日本株ワークフローには手を入れない

## 前提と解釈

- 対象は「米国株のワークスクリーニングのみ」で、日本株側の表示仕様は維持する
- `Phase2 中テーマランキングを全部表示` は、1位セクターの hierarchy 定義に存在する中テーマを出す意図と解釈する
- `Phase3 小テーマランキングを全部表示` は、件数制限を外し、Phase2 で採用した中テーマ配下の小テーマをすべて並べる意図と解釈する
- `Phase4 個別銘柄ランキング` は、Phase3 に残った小テーマ所属の銘柄を全件並べるが、順位自体は現行の `rankScore` を使う
- `個別銘柄をでかく` は、不要 section を削ることで hierarchy 部分の比重を上げることを主眼とし、新しい装飾追加までは行わない

## 変更・作成ファイル

| ファイル | 種別 | 役割 |
|---|---|---|
| `docs/exec-plans/active/us-screener-expand-hierarchy-and-remove-sector-breakdown_20260604_0950.md` | CREATE | 本計画 |
| `src/core/fundamental-screener.js` | MODIFY | US hierarchy の Phase2/3/4 選抜ロジックを全表示ベースへ変更する |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | US レポートから `Phase2 セクター別ランキング` を外し、Phase2/3/4 の説明文を新仕様へ合わせる |
| `tests/fundamental-screener.test.js` | MODIFY候補 | hierarchy の選抜件数制限が外れることを固定する |
| `tests/daily-screener-report.test.js` | MODIFY | US レポートの章構成と Phase2/3/4 の全表示要件を固定する |
| `docs/exec-plans/completed/us-screener-expand-hierarchy-and-remove-sector-breakdown_20260604_0950.md` | MOVE | 完了時に移動 |

## 影響範囲

- `docs/reports/screener/daily-ranking.md`
  - 米国株の Phase2/3/4 セクション構成と掲載件数が変わる
- `src/core/fundamental-screener.js`
  - focused hierarchy の `selectedMiddleThemes` / `selectedSmallThemes` / `stockRanking` の作り方が変わる
- 日本株向けの `daily-ranking-jp.md` 相当出力
  - 共通描画関数の副作用がないことを確認する

## 範囲外

- 日本株 hierarchy の表示変更
- theme taxonomy 定義ファイルの再設計
- 銘柄の採点指標や weight 自体の変更
- 新しい UI 装飾や画像化

## 実装方針

### 1. hierarchy の絞り込みを米国株だけ広げる

- `Phase2 中テーマランキング` は、1位セクターに属する分類済み銘柄から集計した全中テーマを出す
- `selectedMiddleThemes` は上位半分ではなく、集計結果の全中テーマを採用する
- `smallThemeRanking` は採用中テーマ配下の小テーマを全件出す
- `selectedSmallThemes` も全小テーマを採用する
- `stockRanking` は採用小テーマ配下の銘柄を総合点順で全件出す

### 2. レポートは米国株だけ section を削る

- `Phase2 セクター別ランキング` は米国株では出さない
- 日本株では現行どおり section を残す
- Phase3 / Phase4 の補足文言も「上位半分」「上位3小テーマ」前提を外す

## 実装ステップ

- [ ] Step 1: 現行 hierarchy ロジックの件数制限箇所を特定する
  - 確認: `topMiddleThemeCount` / `topSmallThemeCount` / `topStockCount` が US のどこに効いているか把握する

- [ ] Step 2: RED として米国株レポート期待値を更新する
  - 確認: `Phase2 セクター別ランキング` が出ない
  - 確認: Phase2 中テーマが全件表示される
  - 確認: Phase3 小テーマが全件表示される
  - 確認: Phase4 個別銘柄が全件表示される

- [ ] Step 3: hierarchy 集計ロジックを最小変更で修正する
  - 確認: 米国株のみ全表示ルールになる
  - 確認: 日本株の flow を壊さない

- [ ] Step 4: Markdown 生成ロジックを新仕様へ合わせる
  - 確認: US で不要 section を削除できる
  - 確認: 説明文が実際の選抜条件と一致する

- [ ] Step 5: テストと差分確認を行う
  - 確認: 対象テストが通る
  - 確認: `git diff --check` が通る

- [ ] Step 6: REVIEW / COMMIT / PUSH
  - 確認: plan を `completed/` に移動し、変更一式を `main` へ反映する

## テスト戦略

- RED
  - `tests/daily-screener-report.test.js` を先に更新し、旧仕様との差分を失敗で固定する
  - 必要なら `tests/fundamental-screener.test.js` に hierarchy の全採用条件を追加する
- GREEN
  - `src/core/fundamental-screener.js` と `scripts/screener/run-fundamental-screening.mjs` を最小変更で合わせる
- REFACTOR
  - 今回は新しい抽象化を増やさず、既存の market 分岐に沿って整える

## 検証コマンド

- `node --test tests/daily-screener-report.test.js`
- `node --test tests/fundamental-screener.test.js`
- `git diff --check`

## リスク・注意点

- `buildFocusedHierarchy` は US / JP 共通で使っているため、US 専用要件をそのまま共通化すると JP へ波及する
- レポート section の削除だけ先に行うと、内部データ構造と文言がずれる可能性がある
- hierarchy 定義に存在するが当日銘柄が 0 件の中テーマをどう扱うかは、現行集計結果ベースで空行は出さない方針とする

## 競合確認

- active plan:
  - `docs/exec-plans/active/screener-architecture-flow-doc_20260601_1430.md`
  - `docs/exec-plans/active/japan-screener-granularity-and-source-feasibility_20260602_1447.md`
  - `docs/exec-plans/active/japan-screener-theme-implementation-and-live-debug_20260602_1500.md`
- 今回は US レポートの hierarchy 出力変更に限定し、上記 active plan と直接競合しない

---

作成者: Codex
作成日時: 2026-06-04T09:50:00+09:00
