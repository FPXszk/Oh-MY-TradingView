# round4 マルチユニバース・バックテスト結果 (2015-2025)

## メタデータ

- raw-source: `../references/backtests/breakout-deep-dive-round4-alt_20260405.json`
- summary-source: `../references/backtests/breakout-deep-dive-round4-alt_20260405.summary.json`
- run-count: `100`
- success-count: `100`
- tester-available-count: `97`
- universes: `sp500-top10-point-in-time`, `mega-cap-ex-nvda`
- strategies: `donchian-20-10-hard-stop-8pct`, `donchian-55-20-baseline`, `donchian-55-20-spy-filter`, `donchian-20-10-baseline`, `donchian-55-20-rsp-filter`

## 結論

Mag7 で選んだ上位 5 戦略を alt universe に持ち込んでも、**5 本すべてが 2 ユニバース両方で平均純利益プラス** を維持した。  
最も強かったのは Mag7 と同じく `donchian-20-10-hard-stop-8pct` で、`sp500-top10-point-in-time` / `mega-cap-ex-nvda` の両方で首位だった。

ただし Mag7 から alt へ移ると、平均純利益のスケールは **3 万台 → 1 万前後** に縮小した。  
つまり round4 の breakout edge は **NVDA を抜いても残る** が、リターンの大部分はやはり Mag7 側、とくに `NVDA` の寄与に支えられている。

その中で読みやすい差分も残った。  
20/10 系は利益保持力が最も高く、55/20 系は `SPY` / `RSP` フィルタを足したときに **profit factor と drawdown の質が改善** しやすかった。  
alt 側では「最高利益」は `donchian-20-10-hard-stop-8pct`、「最も綺麗な品質改善」は `donchian-55-20-spy-filter` / `donchian-55-20-rsp-filter` という役割分担になった。

## universe_summary

| universe | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | best_combo |
|---|---:|---:|---:|---:|---|
| `sp500-top10-point-in-time` | 9176.37 | 2.122 | 3524.56 | 49.77 | `donchian-20-10-hard-stop-8pct` |
| `mega-cap-ex-nvda` | 8945.82 | 2.185 | 3386.64 | 49.92 | `donchian-20-10-hard-stop-8pct` |

## cross-universe comparison

| strategy_id | mag7 avg_net_profit | sp500 avg_net_profit | mega-cap ex NVDA avg_net_profit | 解釈 |
|---|---:|---:|---:|---|
| `donchian-20-10-hard-stop-8pct` | 36087.16 | 10888.29 | 10086.88 | 3 ユニバースで最も利益を保った round4 本命 |
| `donchian-20-10-baseline` | 33872.34 | 9790.88 | 9932.60 | stop なしでも alt で十分残る。20/10 family 自体が強い |
| `donchian-55-20-rsp-filter` | 32058.43 | 8689.63 | 8363.76 | 純利益は一段落ちるが PF と win rate が安定 |
| `donchian-55-20-spy-filter` | 34423.58 | 8237.49 | 8338.16 | alt 側で DD が大きく圧縮。品質重視なら有力 |
| `donchian-55-20-baseline` | 34927.25 | 8275.54 | 8007.71 | baseline でも残るが、alt では filter 追加の方が読みやすい |

## top strategy-universe pairs

| rank | universe | strategy_id | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | best_symbol |
|---|---|---|---:|---:|---:|---:|---|
| 1 | `sp500-top10-point-in-time` | `donchian-20-10-hard-stop-8pct` | 10888.29 | 1.920 | 3373.32 | 49.45 | `AAPL` |
| 2 | `mega-cap-ex-nvda` | `donchian-20-10-hard-stop-8pct` | 10086.88 | 1.873 | 3379.41 | 48.92 | `AAPL` |
| 3 | `mega-cap-ex-nvda` | `donchian-20-10-baseline` | 9932.60 | 1.824 | 3511.08 | 48.52 | `AAPL` |
| 4 | `sp500-top10-point-in-time` | `donchian-20-10-baseline` | 9790.88 | 1.799 | 3585.26 | 49.20 | `AAPL` |
| 5 | `sp500-top10-point-in-time` | `donchian-55-20-rsp-filter` | 8689.63 | 2.420 | 3901.81 | 51.14 | `META` |
| 6 | `mega-cap-ex-nvda` | `donchian-55-20-rsp-filter` | 8363.76 | 2.431 | 3687.53 | 51.37 | `META` |
| 7 | `mega-cap-ex-nvda` | `donchian-55-20-spy-filter` | 8338.16 | 2.643 | 2867.00 | 51.00 | `META` |
| 8 | `sp500-top10-point-in-time` | `donchian-55-20-baseline` | 8275.54 | 2.057 | 3738.03 | 48.96 | `META` |
| 9 | `sp500-top10-point-in-time` | `donchian-55-20-spy-filter` | 8237.49 | 2.414 | 3024.39 | 50.11 | `META` |
| 10 | `mega-cap-ex-nvda` | `donchian-55-20-baseline` | 8007.71 | 2.152 | 3488.16 | 49.79 | `META` |

## top_combos

| rank | universe | strategy_id | symbol | net_profit | profit_factor | max_drawdown | win_rate |
|---|---|---|---|---:|---:|---:|---:|
| 1 | `sp500-top10-point-in-time` | `donchian-20-10-hard-stop-8pct` | `AAPL` | 28922.31 | 3.439 | 2570.93 | 67.65 |
| 2 | `mega-cap-ex-nvda` | `donchian-20-10-hard-stop-8pct` | `AAPL` | 28922.31 | 3.439 | 2570.93 | 67.65 |
| 3 | `sp500-top10-point-in-time` | `donchian-55-20-rsp-filter` | `META` | 27732.34 | 5.222 | 5708.56 | 64.71 |
| 4 | `mega-cap-ex-nvda` | `donchian-55-20-rsp-filter` | `META` | 27732.34 | 5.222 | 5708.56 | 64.71 |
| 5 | `sp500-top10-point-in-time` | `donchian-20-10-baseline` | `AAPL` | 27117.64 | 3.066 | 4107.81 | 65.71 |
| 6 | `mega-cap-ex-nvda` | `donchian-20-10-baseline` | `AAPL` | 27117.64 | 3.066 | 4107.81 | 65.71 |
| 7 | `sp500-top10-point-in-time` | `donchian-20-10-hard-stop-8pct` | `AMZN` | 21827.91 | 2.515 | 3396.03 | 63.41 |
| 8 | `mega-cap-ex-nvda` | `donchian-20-10-hard-stop-8pct` | `AMZN` | 21827.91 | 2.515 | 3396.03 | 63.41 |
| 9 | `sp500-top10-point-in-time` | `donchian-20-10-baseline` | `AMZN` | 20246.14 | 2.439 | 3469.25 | 62.50 |
| 10 | `mega-cap-ex-nvda` | `donchian-20-10-baseline` | `AMZN` | 20246.14 | 2.439 | 3469.25 | 62.50 |

## bottom_combos

| rank | universe | strategy_id | symbol | net_profit | profit_factor | max_drawdown | win_rate |
|---|---|---|---|---:|---:|---:|---:|
| 1 | `sp500-top10-point-in-time` | `donchian-55-20-baseline` | `JNJ` | -321.78 | 0.945 | 3927.30 | 44.00 |
| 2 | `mega-cap-ex-nvda` | `donchian-55-20-baseline` | `JNJ` | -321.78 | 0.945 | 3927.30 | 44.00 |
| 3 | `sp500-top10-point-in-time` | `donchian-55-20-spy-filter` | `JNJ` | -94.75 | 0.983 | 3632.93 | 45.83 |
| 4 | `mega-cap-ex-nvda` | `donchian-55-20-spy-filter` | `JNJ` | -94.75 | 0.983 | 3632.93 | 45.83 |
| 5 | `sp500-top10-point-in-time` | `donchian-55-20-rsp-filter` | `JNJ` | 777.67 | 1.155 | 3655.63 | 50.00 |
| 6 | `mega-cap-ex-nvda` | `donchian-55-20-rsp-filter` | `JNJ` | 777.67 | 1.155 | 3655.63 | 50.00 |
| 7 | `sp500-top10-point-in-time` | `donchian-20-10-hard-stop-8pct` | `XOM` | 821.00 | 1.093 | 4251.20 | 40.00 |
| 8 | `mega-cap-ex-nvda` | `donchian-20-10-hard-stop-8pct` | `XOM` | 821.00 | 1.093 | 4251.20 | 40.00 |
| 9 | `sp500-top10-point-in-time` | `donchian-20-10-hard-stop-8pct` | `JNJ` | 1375.62 | 1.173 | 2653.04 | 43.18 |
| 10 | `mega-cap-ex-nvda` | `donchian-20-10-hard-stop-8pct` | `JNJ` | 1375.62 | 1.173 | 2653.04 | 43.18 |

## tester metrics 欠測メモ

以下 3 run は strategy tester 自体は開けたが `metrics_unreadable` で読み取りに失敗した。  
raw snapshot には `fallback_source = chart_bars_local` の参考値が残っているが、summary 集計には含めていない。

1. `sp500-top10-point-in-time / donchian-55-20-rsp-filter × MSFT`
2. `sp500-top10-point-in-time / donchian-20-10-hard-stop-8pct × BRK.B`
3. `sp500-top10-point-in-time / donchian-55-20-baseline × BRK.B`

## 解釈メモ

- `donchian-20-10-hard-stop-8pct` は **Mag7 → alt の利益劣化が最も小さく**、round4 の最有力候補と見てよい
- `donchian-20-10-baseline` もほぼ同じ軌跡を描いており、20/10 family の強さ自体はかなり頑健
- 55/20 系は `SPY` / `RSP` フィルタ付きの方が alt では PF と DD の見栄えが良い
- alt の最弱側は `JNJ` と `XOM` に集まり、ヘルスケア / エネルギーでの breakout efficiency が低い

## 次の改善候補

1. `donchian-20-10-hard-stop-8pct` を中心に、stop 幅を 6〜10% で刻んで robustness を見る
2. `donchian-55-20-spy-filter` と `donchian-55-20-rsp-filter` に stop を重ねて PF / DD の改善余地を探る
3. alt 側で弱かった `JNJ` / `XOM` を意図的に含む sector mix で再検証し、breakout の苦手地帯を明確にする

## 関連 docs

- Mag7 round4: [`mag7-backtest-results-round4_2015_2025.md`](./mag7-backtest-results-round4_2015_2025.md)
- raw snapshot: [`../references/backtests/breakout-deep-dive-round4-alt_20260405.json`](../references/backtests/breakout-deep-dive-round4-alt_20260405.json)
- summary snapshot: [`../references/backtests/breakout-deep-dive-round4-alt_20260405.summary.json`](../references/backtests/breakout-deep-dive-round4-alt_20260405.summary.json)
