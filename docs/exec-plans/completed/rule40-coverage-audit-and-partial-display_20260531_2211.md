# Rule40 Coverage Audit And Partial Display 2026-05-31 22:11

## 目的

US 日次スクリーニングの `Rule of 40` について、現行実装が元指標どおりどこまで再現できているかを確認し、算出率と欠損理由をレポート上で見えるようにする。あわせて、従来の `N/A` 表示をやめ、`売上YoYのみあり` / `FCF margin のみあり` / `両方欠損` が分かる形へ変更する。

## 変更ファイル

- 変更: `src/core/fundamental-screener.js`
  - `Rule of 40` 算出に必要な `revenueGrowthTtm` と `fcfMargin` の充足状況を行ごとに保持する。
  - スクリーニング結果全体に `Rule of 40` カバレッジ集計を追加する。
- 変更: `scripts/screener/run-fundamental-screening.mjs`
  - `Rule40` 列の表示を `N/A` ではなく、片側のみ取得できた場合の部分表示へ変更する。
  - レポート内に `Rule of 40` の算出率と欠損内訳を要約表示する。
- 変更: `tests/fundamental-screener.test.js`
  - `Rule of 40` カバレッジ集計と、欠損時の状態保持を検証する。
- 変更: `tests/daily-screener-report.test.js`
  - Markdown に部分表示とカバレッジ要約が出ることを検証する。
- 生成更新の可能性: `docs/reports/screener/daily-ranking.md`, `docs/reports/screener/daily-ranking-run.json`
  - 実レポート再生成で表示確認する。
- 移動: `docs/exec-plans/active/rule40-coverage-audit-and-partial-display_20260531_2211.md` → `docs/exec-plans/completed/rule40-coverage-audit-and-partial-display_20260531_2211.md`
  - 実装・検証完了後に移動する。

## 影響範囲

- 対象は US 日次スクリーナーの `Rule of 40` 表示と診断情報のみ。
- `Rule of 40` の加点対象は現状どおり `US software / SaaS` 系だけに維持する。
- phase1/phase2 の抽出ロジックや他ブロックの重みは変更しない。

## 実装ステップ

- [x] `Rule of 40` の算出条件と、欠損時にどの値が足りないかを保持する最小変更点を整理する。
- [x] 結果全体に `Rule of 40` カバレッジ集計を追加する。
- [x] `Rule40` 表示を `N/A` から部分表示へ差し替える。
- [x] レポートに `Rule of 40` 算出率と欠損内訳の要約を追加する。
- [x] `tests/fundamental-screener.test.js` と `tests/daily-screener-report.test.js` を更新する。
- [x] `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js` を実行する。
- [x] `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs` を実行して、実データで再現率を確認する。
- [x] `git diff --check` を実行する。
- [ ] 計画ファイルを completed へ移動し、実装変更をコミット・push する。

## 検証

- `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js`
- `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs`
- `git diff --check`

## リスク

- `Rule of 40` は式自体は単純でも、元データ欠損が多い場合は「算出不可」が多く出る可能性がある。
- 部分表示の文言が長すぎると表の視認性を崩すので、欠損表現は短くする必要がある。

## 調査結果

- 実データ再生成時点で、掲載 `69銘柄` のうち `66銘柄` は `Rule of 40` を完全算出でき、再現率は `95.7%` だった。
- 欠損内訳は `売上のみあり 2件 / FCFのみあり 1件 / 両方欠け 0件`。
- 欠損銘柄は `Q`（売上欠け）、`CYD`（FCF欠け）、`AVEX`（FCF欠け）。
- 1位セクターは `30件` 表示上限があるため、欠損銘柄の一部は通常のセクター表に出ない。今回の対応で `Rule of 40 算出状況` 節に欠損銘柄一覧を追加し、表示上限の外にいる銘柄も見えるようにした。

## スコープ外

- `Rule of 40` のスコア重みや対象業種の再設計
- Japan レポートへの表示拡張
- 他指標の欠損診断追加
