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

---

**スコア算出:** weighted block rank-sum

**フィルター条件と scoring guide:**
| 区分 | 項目 | 条件・説明 |
|:---|:---|:---|
| 共通条件 | ベース条件 | 時価総額 / EPS / SMA / 52週高値条件 |
| 補助ポリシー | 超急騰 | 超急騰時の扱い |
| 補助ポリシー | Rule of 40 | 対象範囲、式、badge / warning 条件 |
| ユニバース | 取引所 | NASDAQ, NYSE など |
| ユニバース | 銘柄ユニバース | allowlist がある場合のみ |
| 補助ポリシー | Yahoo Finance 補完 | null 許容などの扱い |
| セクタープロファイル | Technology Services | hard gate と scoring 条件 |
