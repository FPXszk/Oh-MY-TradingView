# Daily Screener Positive Score And Remove Extreme Section 2026-05-12 21:07

## 目的

日次スクリーニングレポートから個別の `超急騰候補` セクションを削除する。超急騰かどうかはランキング表と上位理由のリスク確認で判断できるため、別章としては出さない。

あわせて、銘柄ランキングの `総合点` を「低いほど良い」順位合算スコアから、「高いほど良い」直感的なスコアへ変更する。既存のブロック別順位計算は維持し、最終表示・並び替え用の点数だけを 0〜100 の高得点優位に変換する。

## 変更ファイル

- 変更: `src/core/fundamental-screener.js`
  - weighted rank sum を内部計算し、その値から `rankScore` を 0〜100 の positive score に変換する。
  - 銘柄ランキングは `rankScore` 降順に変更する。
  - セクター集計の `averageRankScore` と代表銘柄判定も高い点が良い前提へ変更する。
- 変更: `scripts/screener/run-fundamental-screening.mjs`
  - `超急騰候補` セクションの生成を削除する。
  - 上位5件の `総合点` 説明から「低いほど良い」を削除し、高い点が良い前提の差分説明へ変更する。
  - フィルター条件表から `補助ポリシー | 超急騰` 行を削除する。
- 変更: `docs/reports/screener/TEMPLATE.md`
  - `超急騰候補` セクションを削除する。
  - scoring guide から超急騰の個別行を削除する。
- 変更: `tests/fundamental-screener.test.js`
  - ランキング結果が `rankScore` 降順で、高得点が上位になることを確認する。
- 変更: `tests/daily-screener-report.test.js`
  - `超急騰候補` セクションと超急騰ポリシー行が出ないことを確認する。
  - 上位理由の総合点説明が高得点前提になっていることを確認する。
- 生成更新: `docs/reports/screener/daily-ranking.md`
  - US レポートを新ロジック・新レイアウトで再生成する。
- 移動: `docs/exec-plans/active/daily-screener-positive-score-and-remove-extreme-section_20260512_2107.md` → `docs/exec-plans/completed/daily-screener-positive-score-and-remove-extreme-section_20260512_2107.md`
  - 実装と検証完了後に completed へ移動する。

## 影響範囲

- US / JP の日次スクリーニング Markdown 出力と、`runFundamentalScreener()` が返す `rankScore` の意味が変わる。
- 抽出条件、TradingView API への問い合わせ条件、各ブロックの重みは変更しない。
- `extremeMomentum` フラグ自体は残し、リスク確認文での注意喚起は維持する。
- Phase1 セクターランキング側の `rankScore` は既存のセクター選定ロジックに属するため、今回の対象外とする。

## 実装ステップ

- [ ] `src/core/fundamental-screener.js` の総合点を高得点優位へ変換し、並び順とセクター集計を更新する。
- [ ] `scripts/screener/run-fundamental-screening.mjs` から `超急騰候補` セクションと低得点説明を削除する。
- [ ] `docs/reports/screener/TEMPLATE.md` を新構成に合わせる。
- [ ] `tests/fundamental-screener.test.js` と `tests/daily-screener-report.test.js` を更新する。
- [ ] `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js` を実行する。
- [ ] `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs` を実行し、レポートを再生成する。
- [ ] `git diff --check` を実行する。
- [ ] 計画を completed へ移動し、変更をコミット・push する。

## 検証

- `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js`
- `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs`
- `git diff --check`

## リスク

- `rankScore` の意味が変わるため、既存の外部利用者が「低いほど良い」と解釈している場合は読み替えが必要になる。
- 候補数に応じて 0〜100 へ正規化するため、同じ銘柄でも実行時の候補集合が変わると点数は変動する。
- Phase1 セクターランキングの総合点まで同時に変えるとセクター選定ロジックに波及するため、今回は銘柄スクリーニングの総合点に限定する。
