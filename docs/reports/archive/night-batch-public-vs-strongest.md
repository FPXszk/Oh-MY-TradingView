# Public Top10 vs 自分の最強戦略 比較メモ

## 結論

現時点の手元データでは、**public 側に「一発で大きい net profit」を出す戦略はあるが、総合では既存の strongest / finetune 系を上回ったとは言えない**。

特に `profit_factor`、`success率`、`drawdown` の観点では、既存 strongest 系の方が安定している。

## 比較対象

- Public:
  - `public-top10-us-40x10`
  - source: run17 artifact の `public-top10-us-40x10/smoke/final-results.json`
- 既存 strongest に近い比較対象:
  - `next-long-run-us-finetune-100x10` smoke
  - `next-long-run-jp-finetune-100x10` smoke

## 前提と注意

- public 側は **SPY 1銘柄 × 10戦略** の smoke
- US/JP strongest 側は **各10銘柄平均**
- そのため `raw net_profit` は完全な apples-to-apples 比較ではない
- 優劣判断は `profit_factor`、`success率`、`max_drawdown` を主に見るのが妥当

## Smoke 全体比較

| campaign | market | smoke母集団 | success | failure | 備考 |
|---|---|---:|---:|---:|---|
| `public-top10-us-40x10` | US | 10 runs | 9 | 1 | SPY 1銘柄 |
| `next-long-run-us-finetune-100x10` | US | 100 runs | 100 | 0 | 10銘柄平均 |
| `next-long-run-jp-finetune-100x10` | JP | 100 runs | 100 | 0 | 10銘柄平均 |

## Top 戦略比較

### public 側 smoke 上位

| rank | strategy | runs | success | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_percent_profitable |
|---|---|---:|---:|---:|---:|---:|---:|
| 1 | `tv-public-kdj-l2` | 1 | 1 | 1,787,266.20 | 1.8950 | 787,252.77 | 76.47 |
| 2 | `tv-public-agni-momentum` | 1 | 1 | 390,914.26 | 1.5367 | 135,321.61 | 42.86 |
| 3 | `tv-public-gold-hft-hybrid` | 1 | 1 | 69,381.45 | 1.0634 | 354,860.02 | 23.55 |
| 4 | `tv-public-masu-ultimate` | 2 | 1 | 331,439.87 | 1.0567 | 495,865.91 | 34.43 |
| 5 | `tv-public-joat-institutional-convergence` | 1 | 1 | 169,358.57 | 1.0484 | 617,109.69 | 23.77 |

### strongest US 側 smoke 上位

| rank | strategy | runs | success | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_percent_profitable |
|---|---|---:|---:|---:|---:|---:|---:|
| 1 | `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` | 10 | 10 | 18,918.78 | 1.8284 | 4,620.50 | 44.28 |
| 2 | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | 10 | 10 | 20,203.76 | 1.8268 | 5,975.64 | 45.36 |
| 3 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback` | 10 | 10 | 18,152.65 | 1.8012 | 5,461.68 | 45.44 |
| 4 | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-10pct-theme-deep-pullback-earlier` | 10 | 10 | 18,152.65 | 1.8012 | 5,461.68 | 45.44 |
| 5 | `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-6pct-theme-deep-pullback-strict-narrow` | 10 | 10 | 20,538.77 | 1.7616 | 5,181.22 | 42.95 |

### strongest JP 側 smoke 上位

| rank | strategy | runs | success | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_percent_profitable |
|---|---|---:|---:|---:|---:|---:|---:|
| 1 | `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight` | 10 | 10 | 11,089.88 | 2.4878 | 5,349.78 | 44.41 |
| 2 | `donchian-60-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-late` | 10 | 10 | 12,792.16 | 2.0678 | 6,762.80 | 42.17 |
| 3 | `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early` | 10 | 10 | 13,641.52 | 2.0385 | 6,458.07 | 42.38 |
| 4 | `donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide` | 10 | 10 | 10,992.05 | 2.0154 | 5,884.84 | 40.86 |
| 5 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 10 | 10 | 12,162.77 | 1.9891 | 6,662.93 | 41.11 |

## 読み解き

- public 側で最も目立つのは `tv-public-kdj-l2`
  - `avg_profit_factor 1.8950` は強い
  - ただし `avg_max_drawdown 787,252.77` とかなり重い
  - 1銘柄・1成功サンプルなので安定性判断には弱い
- strongest US 側
  - top の `profit_factor` は `1.82` 前後
  - public の `tv-public-kdj-l2` よりわずかに下だが、**10/10 success かつ drawdown が桁違いに小さい**
- strongest JP 側
  - `profit_factor 2.49` が出ており、public top を上回る
  - こちらも 10/10 success

## 実務的な判断

- **一発の派手さ**
  - public `tv-public-kdj-l2` はある
- **安定した最強候補**
  - 既存 strongest / finetune 系の方がまだ上
- **置き換え候補があったか**
  - 今回の public 群から、既存 strongest を明確に更新する候補はまだ確認できていない

## いま言えること

- public 側に「完全にダメ」ではない戦略はあった
- ただし strongest 系を押しのけるほどの優位はまだ見えない
- 次に見るなら `tv-public-kdj-l2` だけを別 campaign で再検証する価値はある
