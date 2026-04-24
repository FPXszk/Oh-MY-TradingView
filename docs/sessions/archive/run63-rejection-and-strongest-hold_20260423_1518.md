# Session log: run63 rejection and strongest hold

## 実施内容

- `Night Batch Self Hosted #63` の artifact `gha_24812298120_1` と runner workspace 上の `breakout-6pack-us40/full/recovered-results.json` を確認した
- `Night Batch Self Hosted #48` の artifact `selected-us40-8pack/full/recovered-results.json` も確認し、execution 実績と performance benchmark を切り分けた
- `docs/research/current/run63-detailed-metrics-and-comparison.md` を、推測値ではなく実測値ベースへ修正した
- strongest への採用可否を整理し、`run63` は **不採用**、既存 strongest は **現状維持** と結論づけた

## 確認した事実

- `run63` は smoke `6/6`、full `240/240` で完走し、`recovered-summary.json` は `success: 240, failure: 0, unreadable: 0`
- `run63` 全体の実測平均は `avg_net_profit 65.04`, `avg_profit_factor 1.3910`, `avg_max_drawdown 108.52`, `avg_win_rate 16.10%`
- `run63` の best は `breakout-finder-balanced` の `avg_net_profit 151.11`
- `run63` の trend follower 3 本は `40/40` で `closed_trades = 0`
- strongest benchmark は `docs/research/current/main-backtest-current-summary.md` 上で、US 上位が `20,538.77` / `18,918.78`
- `run48` artifact 上の strongest 5 本は `200/200 success` だが、artifact metrics は zero/null 記録であり、profit 比較の正本には使えない

## 判断

- `run63` から strongest へ取り込める alpha 改善要素は、今回の実測値では確認できなかった
- strongest へそのまま何かを足すより、既存 strongest をそのまま維持する方が妥当
- 取り込めるのはロジックではなく、失敗しやすい preset を default bundle から外して完走率を上げる運用面の判断
- この運用面の判断は、現行 default workflow が `config/night_batch/bundle-foreground-reuse-config.json` -> `breakout-6pack-us40` を使う構成になっており、すでに反映済み

## 補足

- strongest 側を改善候補として再検討するなら、まず `run63` trend follower 3 本の zero-trade 原因解消が前提
- そのうえで、同一 market / 同一 symbol universe / 同一 date range で strongest Top 3 と breakout 6-pack を横並び再実行するのが妥当
