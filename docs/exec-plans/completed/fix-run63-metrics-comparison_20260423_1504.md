# Run63 Metrics Comparison Fix 計画

## 目的

`docs/research/current/run63-detailed-metrics-and-comparison.md` 内で推測ベースになっている Run 63 の性能比較を、実際の集計値ベースへ修正する。Run 48 側の比較対象も元データに揃えて見直し、48 と 63 を同じ観点で比較できる状態にする。

## 変更・作成・削除するファイル

- 変更: `docs/research/current/run63-detailed-metrics-and-comparison.md`
- 作成: `docs/exec-plans/active/fix-run63-metrics-comparison_20260423_1504.md`
- 必要なら変更: `docs/research/current/manifest.json`

## 実装内容と影響範囲

- Run 63 の比較表・結論部に残っている推測値、推定レンジ、仮条件分岐を実測値へ置換する
- Run 48 の比較対象値が report / summary の正本と一致しているか確認し、必要なら合わせて補正する
- 「実行安定性」と「性能指標」を出典のある数値だけで書き直し、推測が混ざる記述を削除または限定する
- 影響範囲は research ドキュメントのみで、本番コード変更は行わない

## 実装ステップ

- [ ] 出典確認: Run 63 の実測値が入っている artifact / recovered summary / 関連 report を特定する
- [ ] 出典確認: Run 48 側の比較元となる report / summary の数値を再確認する
- [ ] RED: 現行ドキュメント内の推測表現と不正確な比較行を洗い出す
- [ ] GREEN: `run63-detailed-metrics-and-comparison.md` を実測値ベースへ修正する
- [ ] REFACTOR: 表現を簡潔化し、比較観点が混線している箇所を整理する
- [ ] REVIEW: 推測値の残存、出典不一致、比較軸のずれがないか確認する

## レビュー観点

- Run 63 の数値が推測ではなく、実在する集計値に基づいているか
- Run 48 と Run 63 の比較対象が同一粒度で並んでいるか
- 実測できない項目を断定していないか
