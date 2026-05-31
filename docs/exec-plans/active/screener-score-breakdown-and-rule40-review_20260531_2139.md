# Screener Score Breakdown And Rule40 Review 2026-05-31 21:39

## 目的

日次スクリーニングレポートについて、`Rule of 40` の位置づけを現状の実データに照らして見直しつつ、総合点の内訳を一目で読める形へ改善する。加えて、`earnings/revenue surprise` 系の点数導入可否を整理し、実装可能なら既存スコア体系に過剰な複雑化なく組み込む。

## 変更ファイル

- 変更: `src/core/fundamental-screener.js`
  - `Rule of 40` の適用対象と説明文を、現行の `US software` 限定方針を維持するか、より明確な補助指標表現へ寄せるか整理する。
  - `surprise` 系データを取り込める既存入力があるか確認し、取得可能なら最小限の ranking block か既存 growth block 内の補助項目として追加する。
  - 総合点の内訳として、`fundamental` 系合計と `technical` 系合計を出せるメタデータを結果に含める。
- 変更: `scripts/screener/run-fundamental-screening.mjs`
  - レポート上の `総合点` 表示に、`ファンダメンタル何点 / テクニカル何点 / 総合何点` が即読できる出力を追加する。
  - 上位理由セクションでも、現行の block rank 羅列より分かりやすい内訳表示へ差し替える。
  - `Rule of 40` の説明文が残る場合は、ソフトウェア偏重の補助指標であることを明示する。
- 変更: `tests/fundamental-screener.test.js`
  - `fundamental` / `technical` 内訳メタデータの算出を検証する。
  - `surprise` 指標を入れる場合、その中立処理・欠損時処理・スコア反映を検証する。
- 変更: `tests/daily-screener-report.test.js`
  - Markdown に内訳表示が出ることを検証する。
  - `Rule of 40` の説明文や `surprise` 表示を更新した場合の文面を検証する。
- 生成更新の可能性: `docs/reports/screener/daily-ranking.md`, `docs/reports/screener/daily-ranking-run.json`
  - 実レポート再生成で表示確認する。
- 移動: `docs/exec-plans/active/screener-score-breakdown-and-rule40-review_20260531_2139.md` → `docs/exec-plans/completed/screener-score-breakdown-and-rule40-review_20260531_2139.md`
  - 実装・レビュー・検証完了後に移動する。

## 影響範囲

- 対象は US 日次スクリーニングのスコア表示と説明ロジックが中心。
- 既存の phase1/phase2 の抽出方針やセクター選定ロジックは、今回の要求に直接必要な範囲を除き変更しない。
- `Rule of 40` は現状どおり hard filter にはしない前提で検討する。
- `surprise` データが既存データ源で安定取得できない場合は、無理に実装せず計画内で代替案を明記する。

## 実装ステップ

- [ ] 既存の `rankBreakdown` / `rankingBlocks` / レポート出力を読み、`technical` と `fundamental` に再集計できる最小変更点を特定する。
- [ ] `Rule of 40` の現状仕様と、半導体銘柄で数値が大きく見えるケースの扱いを整理し、説明文・スコア反映方針を決める。
- [ ] `surprise` 系データの取得元を確認し、導入するか、今回スコープ外にするかを判断する。
- [ ] `fundamental` / `technical` / `total` の内訳メタデータを `fundamental-screener` 結果へ追加する。
- [ ] Markdown レポートの `総合点` 表示と上位理由セクションを、内訳が一目で分かる形へ更新する。
- [ ] `tests/fundamental-screener.test.js` と `tests/daily-screener-report.test.js` を更新する。
- [ ] `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js` を実行する。
- [ ] 必要なら `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs` を実行し、実レポートの見え方を確認する。
- [ ] `git diff --check` を実行する。
- [ ] 計画ファイルを completed へ移動し、実装変更をコミット・push する。

## 検証

- `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js`
- `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs`
- `git diff --check`

## リスク

- `Rule of 40` は SaaS/Software 由来の指標なので、半導体や光通信機器で高値が出ても、そのまま横比較に使うとミスリードになり得る。
- `surprise` 系指標はデータ源依存が強く、取得不能や欠損が多い場合はスコアを不安定にする可能性がある。
- 総合点の内訳を増やしすぎると、かえって Markdown 表示が読みにくくなるため、集約単位は `fundamental` と `technical` を基本に留める。

## スコープ外

- phase1 セクターランキングの抽出ロジック再設計
- `Portfolio Health Check` 系ワークフロー
- 既存の unrelated session log や未追跡ファイルの整理
