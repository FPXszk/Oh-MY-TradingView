# Daily Ranking Remove Sections 2026-05-31 23:39

## 目的

`docs/reports/screener/daily-ranking.md` から、不要になった以下 3 セクションを出力しないようにする。

1. `## Rule of 40 算出状況`
2. `## Phase2 通過銘柄のセクター内訳`
3. `## 上位3件の選定理由`

## 変更ファイル

- 変更: `scripts/screener/run-fundamental-screening.mjs`
  - 日次レポート Markdown 組み立て時に、対象 3 セクションを出さない制御へ変更する。
- 変更: `tests/daily-screener-report.test.js`
  - US 日次レポートから対象 3 セクションが消えることを検証し、既存の並び前提を更新する。
- 変更: `docs/reports/screener/TEMPLATE.md`
  - 人手確認用の雛形からも対象セクションを外し、現行の章立てと揃える。
- 生成更新: `docs/reports/screener/daily-ranking.md`
  - 実レポートを再生成し、不要セクションが消えた状態へ更新する。
- 必要時のみ変更: `docs/reports/screener/daily-ranking-jp.md`
  - 共有ロジックの影響で差分が出る場合のみ追従確認する。不要なら触らない。

## 影響範囲

- 対象は日次スクリーニング Markdown の章立てのみ。
- スクリーニング条件、スコア計算、`Rule40` 列自体の表示、JSON メタデータは変更しない。
- まずは `daily-ranking.md` を主対象にし、Japan レポートは共有ロジック由来の副作用がないかだけ確認する。

## 実装ステップ

- [x] `buildMarkdown()` のどこで 3 セクションを出しているかを整理し、最小変更の削除方針を確定する。
- [x] `scripts/screener/run-fundamental-screening.mjs` を更新し、US 日次レポートで対象 3 セクションを出さないようにする。
- [x] `tests/daily-screener-report.test.js` を更新し、不要セクションの absence を検証する。
- [x] `docs/reports/screener/TEMPLATE.md` の章立てを更新する。
- [x] `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs` を実行し、`docs/reports/screener/daily-ranking.md` を再生成する。
- [x] `node --test tests/daily-screener-report.test.js` を実行する。
- [x] `git diff --check` を実行する。
- [x] 計画ファイルを completed へ移動し、実装変更をコミット・push する。

## 検証

- `node --test tests/daily-screener-report.test.js`
- `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs`
- `git diff --check`

## リスク

- `buildMarkdown()` は JP 出力にも使っているため、雑に共通削除すると `daily-ranking-jp.md` の想定章立てまで変わる可能性がある。
- テンプレートとテストの期待値を揃えずに片方だけ直すと、次回レポート再生成時に差分がぶれやすい。

## 既存プランとの重複確認

- `docs/exec-plans/active/` は現時点で空であり、競合する進行中プランはない。

## スコープ外

- `Rule40` の算出ロジックや重みの見直し
- `Phase1` / `Phase2` のスクリーニング条件変更
- レポート本文の別セクション整理や文言改善
