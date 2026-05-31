# Screener Score Breakdown And Rule40 Review 2026-05-31 21:39

## 目的

日次スクリーニングレポートについて、`Rule of 40` を銘柄表で常時表示しつつ、スコア反映は現状どおり `US software / SaaS` 系候補だけに限定して維持する。あわせて、`Phase2` の 2位・3位セクターで 30件未満しか表示されていない理由を調査し、母数不足なのか、ロジック上の絞り込みなのかを確認する。

## 変更ファイル

- 変更: `src/core/fundamental-screener.js`
  - `Rule of 40` を software 以外の銘柄でも表示できるようにする。
  - `Rule of 40` のスコア反映は、現行どおり `US software / SaaS` 系候補の補助 block のまま維持する。
  - `Phase2` の 2位・3位セクター件数が少ない理由を確認するため、必要なら集計確認用の最小限のデータ点を出せるようにする。
- 変更: `scripts/screener/run-fundamental-screening.mjs`
  - 銘柄表と上位理由で `Rule of 40` の表示が software 以外でも見えることを確認し、必要なら表示文言を調整する。
- 変更: `tests/fundamental-screener.test.js`
  - `Rule of 40` が software 以外でも表示値として保持されることを検証する。
  - software 候補だけ `Rule of 40` が scoring block に残ることを検証する。
- 変更: `tests/daily-screener-report.test.js`
  - Markdown に `Rule of 40` の値が出ることを検証する。
- 生成更新の可能性: `docs/reports/screener/daily-ranking.md`, `docs/reports/screener/daily-ranking-run.json`
  - 実レポート再生成で `Rule of 40` 表示とセクター別件数を確認する。
- 移動: `docs/exec-plans/active/screener-score-breakdown-and-rule40-review_20260531_2139.md` → `docs/exec-plans/completed/screener-score-breakdown-and-rule40-review_20260531_2139.md`
  - 実装・レビュー・検証完了後に移動する。

## 影響範囲

- 対象は US 日次スクリーニングの `Rule of 40` 表示と説明ロジックが中心。
- 既存の phase1/phase2 の抽出方針や総合点の重み配分は、今回必要な範囲を除き変更しない。
- `Rule of 40` は現状どおり hard filter にしない。
- `software / SaaS` 以外では `Rule of 40` は表示のみで、スコア加点には使わない。

## 実装ステップ

- [ ] `Rule of 40` の現在の計算箇所と表示箇所を確認し、表示だけ `software` 制限から外す最小変更点を特定する。
- [ ] `Rule of 40` の scoring block は `US software / SaaS` 限定のまま残すよう実装方針を固定する。
- [ ] `tests/fundamental-screener.test.js` と `tests/daily-screener-report.test.js` を更新する。
- [ ] `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js` を実行する。
- [ ] `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs` を実行し、`Rule of 40` の表示と 2位/3位セクターの掲載件数を確認する。
- [ ] 2位/3位セクターが 30件未満の理由を、`sectorRanking` 集計と実レポート出力の両方から確認して記録する。
- [ ] `git diff --check` を実行する。
- [ ] 計画ファイルを completed へ移動し、実装変更をコミット・push する。

## 検証

- `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js`
- `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs`
- `git diff --check`

## リスク

- `Rule of 40` は SaaS/Software 由来の指標なので、半導体や光通信機器で高値が出ても、表示上は参考値であることが伝わるようにしないとミスリードになり得る。
- 2位/3位セクターの件数不足が単なる母数不足ではなく、どこかの profile 条件に起因する場合、今回の「調査のみ」から実装が派生する可能性がある。

## スコープ外

- 総合点の `fundamental / technical` 内訳の新規追加
- `surprise` 点数の新規導入
- phase1 セクターランキングの抽出ロジック再設計
- `Portfolio Health Check` 系ワークフロー
- 既存の unrelated session log や未追跡ファイルの整理
