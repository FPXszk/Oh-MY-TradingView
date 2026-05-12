# スクリーニング結果 YYYY/MM/DD（曜）

更新: HH:MM JST

セクター別取得候補 XXX銘柄 → ユニバース条件通過 XXX銘柄 → ランキング対象 XXX銘柄 → レポート掲載 XX銘柄

このファイルは、日次スクリーニング Markdown の見出しと章立てを確認するための雛形です。実際の出力ロジックの正本は [run-fundamental-screening.mjs](/home/fpxszk/code/Oh-MY-TradingView/scripts/screener/run-fundamental-screening.mjs:144) の `buildMarkdown()` にあります。

## Phase1 セクターランキング

- アプローチ
- 採用セクター
- Phase1 ソース候補数

## 上位5件の選定理由

- 総合点
- ブロック別順位
- 主要指標
- リスク確認
- 理由

## 銘柄ランキング

- メインのランキング表

## 超急騰候補

- 条件に該当したときだけ表示

## Phase2 通過銘柄のセクター内訳

- 通過銘柄数、平均 Perf.3M、平均総合点、代表銘柄

## 市場カバレッジ

- スキャンスコープ
- ユニバース追加条件
- 観測レンジ
- 取引所別件数
- 補足

## 採用した P0 / P1 指標

- ブロック重み
- Price momentum
- Sector strength
- Profitability / quality
- Growth confirmation
- Risk / value guard
- Rule of 40

## 今後改善できそうな点

- 次の改善候補

---

**スコア算出:** weighted block rank-sum

**フィルター条件と scoring guide:**
- 共通条件
- 補助ポリシー
- セクター別プロファイル条件
