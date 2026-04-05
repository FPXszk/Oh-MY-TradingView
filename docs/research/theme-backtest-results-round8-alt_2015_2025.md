# Round8 テーマトレンド・マルチユニバース結果 (2015-2025)

## メタデータ

- raw-source: `../references/backtests/round8-theme-alt_20260405.json`
- summary-source: `../references/backtests/round8-theme-alt_20260405.summary.json`
- run-count: `120`
- success-count: `120`
- tester-available-count: `119`
- universes: `sp500-top10-point-in-time`, `mega-cap-ex-nvda`
- selected-strategy-count: `6`

## 結論

round8 の alt では、**breadth family の robustness は依然として最上位** だった。  
首位は `donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier`、2 位は `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced`、3 位は `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` で、上位 6 strategy-universe pair をすべて 55/20 が占めた。

つまり round8 では、

1. **breadth-early 系の robustness は壊れていない**
2. **quality-strict は balanced 版への緩和で alt 耐性が改善した**
3. **deep-pullback は tight 化すると round7 base より少し弱くなる**

の 3 点が見えた。

最大の収穫は `quality-strict-balanced` である。  
round7 の `quality-strict` は alt でも十分強かったが、round8 では `RSI14 > 55` へ緩めた balanced 版が **Mag7 首位を維持したまま alt でも 2 位** となり、leader concentration 本線の改善版として採用価値が高くなった。

一方で `deep-pullback-tight` は悪くないが、round7 alt 首位だった元の `deep-pullback` を超えられなかった。  
したがって round8 の結論は、「deep-pullback 系を捨てる」ではなく、**tight 化より round7 base の 10% stop を本線として残す** に近い。

また `breadth-quality-strict` と `breadth-early-guarded` は alt 平均が同値で、round7 の `breadth-quality` と同水準に留まった。  
guard を足しただけでは本線交代までは起きず、**breadth 本線の優位はなお `breadth-earlier` 側にある** と読める。

## universe_summary

| universe | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | best_combo |
|---|---:|---:|---:|---:|---|
| `sp500-top10-point-in-time` | 7476.40 | 2.209 | 3220.98 | 48.47 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` |
| `mega-cap-ex-nvda` | 7306.56 | 2.266 | 3123.19 | 48.84 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` |

## cross-universe comparison

| strategy_id | mag7 avg_net_profit | alt avg_net_profit | alt avg_profit_factor | alt avg_max_drawdown | alt avg_win_rate | 解釈 |
|---|---:|---:|---:|---:|---:|---|
| `donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier` | 28332.39 | 8391.03 | 2.390 | 3749.15 | 51.09 | round8 alt 首位。round7 `breadth-early` の robustness をそのまま再確認した |
| `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced` | 34423.58 | 8287.83 | 2.529 | 2945.69 | 50.55 | round8 最大の改善点。Mag7 首位を維持しつつ alt でも round7 quality 本線を微改善した |
| `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 27823.77 | 7588.05 | 2.264 | 3505.99 | 49.55 | 悪くないが round7 `deep-pullback` より劣後。tight 化は少し行き過ぎた |
| `donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-6pct-theme-quality-strict-guarded` | 29037.96 | 6735.22 | 2.189 | 2562.77 | 46.35 | DD は綺麗だが収益が伸び切らない。DD 重視の代替候補 |
| `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-6pct-theme-breadth-quality-strict` | 30291.25 | 6665.89 | 2.029 | 3116.80 | 47.15 | round7 breadth-quality と同水準。改善候補ではあるが本線交代までは至らない |
| `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-early-guarded` | 26501.21 | 6665.89 | 2.029 | 3116.80 | 47.15 | breadth-quality-strict と同値。guard 追加だけでは breadth 本線を超えない |

## strategy-universe summary

| rank | universe | strategy_id | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | best_symbol |
|---|---|---|---:|---:|---:|---:|---|
| 1 | `sp500-top10-point-in-time` | `donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier` | 8418.29 | 2.349 | 3810.76 | 50.81 | `META` |
| 2 | `mega-cap-ex-nvda` | `donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier` | 8363.76 | 2.431 | 3687.53 | 51.37 | `META` |
| 3 | `mega-cap-ex-nvda` | `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced` | 8338.16 | 2.643 | 2867.00 | 51.00 | `META` |
| 4 | `sp500-top10-point-in-time` | `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced` | 8237.49 | 2.414 | 3024.39 | 50.11 | `META` |
| 5 | `mega-cap-ex-nvda` | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 7600.85 | 2.312 | 3442.30 | 49.70 | `META` |
| 6 | `sp500-top10-point-in-time` | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 7575.24 | 2.216 | 3569.69 | 49.41 | `META` |
| 7 | `sp500-top10-point-in-time` | `donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-6pct-theme-quality-strict-guarded` | 7176.52 | 2.248 | 2514.41 | 46.50 | `META` |
| 8 | `sp500-top10-point-in-time` | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-6pct-theme-breadth-quality-strict` | 6710.45 | 2.016 | 3168.00 | 46.90 | `META` |
| 9 | `sp500-top10-point-in-time` | `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-early-guarded` | 6710.45 | 2.016 | 3168.00 | 46.90 | `META` |
| 10 | `mega-cap-ex-nvda` | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-6pct-theme-breadth-quality-strict` | 6621.33 | 2.041 | 3065.60 | 47.40 | `META` |
| 11 | `mega-cap-ex-nvda` | `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-early-guarded` | 6621.33 | 2.041 | 3065.60 | 47.40 | `META` |
| 12 | `mega-cap-ex-nvda` | `donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-6pct-theme-quality-strict-guarded` | 6293.91 | 2.130 | 2611.13 | 46.20 | `META` |

## top_combos

| rank | universe | strategy_id | symbol | net_profit | profit_factor | max_drawdown | win_rate |
|---|---|---|---|---:|---:|---:|---:|
| 1 | `sp500-top10-point-in-time` | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | `META` | 29187.99 | 6.522 | 4477.17 | 64.71 |
| 2 | `mega-cap-ex-nvda` | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | `META` | 29187.99 | 6.522 | 4477.17 | 64.71 |
| 3 | `sp500-top10-point-in-time` | `donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier` | `META` | 27732.34 | 5.222 | 5708.56 | 64.71 |
| 4 | `mega-cap-ex-nvda` | `donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier` | `META` | 27732.34 | 5.222 | 5708.56 | 64.71 |
| 5 | `sp500-top10-point-in-time` | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-6pct-theme-breadth-quality-strict` | `META` | 22134.81 | 4.400 | 3370.24 | 52.63 |
| 6 | `sp500-top10-point-in-time` | `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-early-guarded` | `META` | 22134.81 | 4.400 | 3370.24 | 52.63 |
| 7 | `mega-cap-ex-nvda` | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-6pct-theme-breadth-quality-strict` | `META` | 22134.81 | 4.400 | 3370.24 | 52.63 |
| 8 | `mega-cap-ex-nvda` | `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-early-guarded` | `META` | 22134.81 | 4.400 | 3370.24 | 52.63 |
| 9 | `sp500-top10-point-in-time` | `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced` | `META` | 20183.99 | 4.414 | 3388.82 | 57.89 |
| 10 | `mega-cap-ex-nvda` | `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced` | `META` | 20183.99 | 4.414 | 3388.82 | 57.89 |

## bottom_combos

| rank | universe | strategy_id | symbol | net_profit | profit_factor | max_drawdown | win_rate |
|---|---|---|---|---:|---:|---:|---:|
| 1 | `mega-cap-ex-nvda` | `donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-6pct-theme-quality-strict-guarded` | `JNJ` | -299.20 | 0.947 | 3789.11 | 44.00 |
| 2 | `sp500-top10-point-in-time` | `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced` | `JNJ` | -94.75 | 0.983 | 3632.93 | 45.83 |
| 3 | `mega-cap-ex-nvda` | `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced` | `JNJ` | -94.75 | 0.983 | 3632.93 | 45.83 |
| 4 | `sp500-top10-point-in-time` | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-6pct-theme-breadth-quality-strict` | `XOM` | 662.84 | 1.127 | 2102.60 | 33.33 |
| 5 | `sp500-top10-point-in-time` | `donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-6pct-theme-quality-strict-guarded` | `XOM` | 662.84 | 1.127 | 2102.60 | 33.33 |
| 6 | `sp500-top10-point-in-time` | `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-early-guarded` | `XOM` | 662.84 | 1.127 | 2102.60 | 33.33 |
| 7 | `mega-cap-ex-nvda` | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-6pct-theme-breadth-quality-strict` | `XOM` | 662.84 | 1.127 | 2102.60 | 33.33 |
| 8 | `mega-cap-ex-nvda` | `donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-6pct-theme-quality-strict-guarded` | `XOM` | 662.84 | 1.127 | 2102.60 | 33.33 |
| 9 | `mega-cap-ex-nvda` | `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-early-guarded` | `XOM` | 662.84 | 1.127 | 2102.60 | 33.33 |
| 10 | `sp500-top10-point-in-time` | `donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier` | `JNJ` | 777.67 | 1.155 | 3655.63 | 50.00 |

## tester metrics 欠測メモ

alt では `tester_available_count = 119 / 120` で、欠測は 1 run のみだった。  
該当 run は `sp500-top10-point-in-time × JNJ × donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-6pct-theme-quality-strict-guarded` で、`apply_failed = true` / `tester_reason = "Skipped: strategy not applied"` / `fallback_source = chart_bars_local` だった。

round7 alt の `120 / 120` と比べるとわずかに劣るが、欠測は 1 run のみであり、  
全体の family 判断をひっくり返すほどではない。

## round7 との比較

- round7 `breadth-early` の alt 平均は `8391.03`、round8 `breadth-earlier` も `8391.03`
- round7 `quality-strict` の alt 平均は `8244.46`、round8 `quality-strict-balanced` は `8287.83`
- round7 `deep-pullback` の alt 平均は `8399.70`、round8 `deep-pullback-tight` は `7588.05`
- round7 `breadth-quality` の alt 平均は `6665.89`、round8 `breadth-quality-strict` も `6665.89`

つまり round8 は、

1. **breadth 本線の robustness を再確認した**
2. **quality 本線を balanced 版へ改善した**
3. **deep-pullback の tight 化はやりすぎだった**

round と整理できる。

## 解釈メモ

- **round8 の最優先継続候補**: `donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier`
- **round8 最大の改善候補**: `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced`
- **deep-pullback 系の結論**: round8 tight 版より round7 base を本線として残す方が妥当
- **DD 重視の代替候補**: `donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-6pct-theme-quality-strict-guarded`
- **drop 候補**: `breadth-quality-strict`, `breadth-early-guarded`

## 関連 docs

- Mag7 round8: [`theme-backtest-results-round8_2015_2025.md`](./theme-backtest-results-round8_2015_2025.md)
- theme signal observation: [`theme-signal-observation-round8_2015_2025.md`](./theme-signal-observation-round8_2015_2025.md)
- theme shortlist: [`theme-strategy-shortlist-round8_2015_2025.md`](./theme-strategy-shortlist-round8_2015_2025.md)
- raw snapshot: [`../references/backtests/round8-theme-alt_20260405.json`](../references/backtests/round8-theme-alt_20260405.json)
- summary snapshot: [`../references/backtests/round8-theme-alt_20260405.summary.json`](../references/backtests/round8-theme-alt_20260405.summary.json)
