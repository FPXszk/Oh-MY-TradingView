# Round8 テーマトレンド・Mag7 バックテスト結果 (2015-2025)

## メタデータ

- raw-source: `../references/backtests/round8-theme-mag7_20260405.json`
- summary-source: `../references/backtests/round8-theme-mag7_20260405.summary.json`
- run-count: `84`
- success-count: `84`
- tester-available-count: `83`
- symbols: `AAPL`, `MSFT`, `GOOGL`, `AMZN`, `META`, `NVDA`, `TSLA`
- strategy-count: `12`

## 実行条件

- 期間: `2015-01-01` 〜 `2025-12-31`
- 初期資金: `10000 USD`
- 時間足: 日足 (`D`)
- 比較前提: long-only / 手数料 0 / slippage 0 / 100% of equity
- 実行 endpoint: `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223`
- 実行コンテキスト:
  - round8 も **session artifact runner** で実行
  - repo CLI / MCP の公開実装は引き続き `nvda-ma` 固定

## 結論

round8 の Mag7 では、**quality family の近傍最適化が最も効いた**。  
首位は `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced`、2 位は `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-6pct-theme-breadth-quality-strict`、3 位は `donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-6pct-theme-quality-strict-guarded` で、上位 10 本をすべて 55/20 系が占めた。

つまり round8 の Mag7 では、round7 の `quality-strict` をそのまま強めるより、  
**strict quality を少し緩めて entry を増やす** か、**strict quality に stop を足して guard する** 方が優位だった。

breadth 側では `breadth-earlier` と `breadth-balanced` が同値、  
`breadth-early-guarded` と `breadth-quality-early` は **round8 の executable logic 自体が一致** しており、結果も同値だった。  
したがって Mag7 では **regime 閾値の微差より family 本体と stop の有無が効いている** と読むのが妥当で、`breadth-quality-early` を独立した改善候補としては扱わない。

deep-pullback では `tight` 版が `earlier` 版を上回った。  
したがって round8 時点では、**押しを早く拾うことより、pullback を許容しつつ stop を少し締める方が有効** と読む方が自然である。

一方で acceleration 2 本は 11-12 位に留まった。  
round7 と同様、`AAPL` / `AMZN` 補完の価値はあっても、Mag7 本線の交代役にはなっていない。

## strategy_summary

| rank | strategy_id | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | best_symbol |
|---|---|---:|---:|---:|---:|---|
| 1 | `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced` | 34423.58 | 3.090 | 7917.23 | 53.20 | `NVDA` |
| 2 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-6pct-theme-breadth-quality-strict` | 30291.25 | 2.937 | 7360.90 | 46.12 | `NVDA` |
| 3 | `donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-6pct-theme-quality-strict-guarded` | 29037.96 | 3.213 | 4184.74 | 47.88 | `NVDA` |
| 4 | `donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier` | 28332.39 | 2.912 | 7460.85 | 52.50 | `NVDA` |
| 5 | `donchian-55-20-rsp-filter-rsi14-regime-50-theme-breadth-balanced` | 28332.39 | 2.912 | 7460.85 | 52.50 | `NVDA` |
| 6 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 27823.77 | 3.061 | 6366.06 | 49.92 | `NVDA` |
| 7 | `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-early-guarded` | 26501.21 | 2.753 | 6567.33 | 46.36 | `NVDA` |
| 8 | `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-quality-early` | 26501.21 | 2.753 | 6567.33 | 46.36 | `NVDA` |
| 9 | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-10pct-theme-deep-pullback-earlier` | 24325.84 | 2.744 | 7573.02 | 49.44 | `NVDA` |
| 10 | `donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-8pct-theme-quality-strict-stop-wide` | 24102.17 | 2.766 | 5522.12 | 48.54 | `NVDA` |
| 11 | `donchian-20-10-spy-filter-rsi14-regime-45-hard-stop-8pct-theme-acceleration-reentry-tight` | 23606.78 | 2.263 | 4978.98 | 48.79 | `NVDA` |
| 12 | `donchian-20-10-spy-filter-rsi14-regime-55-hard-stop-8pct-theme-acceleration-balanced-strict` | 23457.57 | 2.241 | 4937.12 | 48.27 | `NVDA` |

## symbol_summary

| symbol | avg_net_profit | avg_profit_factor | avg_max_drawdown | best_strategy | best_net_profit |
|---|---:|---:|---:|---|---:|
| `NVDA` | 99964.06 | 4.310 | 9665.60 | `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced` | 150230.10 |
| `TSLA` | 35344.28 | 2.320 | 17232.58 | `donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-6pct-theme-quality-strict-guarded` | 52103.58 |
| `META` | 19601.42 | 4.047 | 4146.61 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 29187.99 |
| `AAPL` | 14659.73 | 3.127 | 3043.04 | `donchian-20-10-spy-filter-rsi14-regime-45-hard-stop-8pct-theme-acceleration-reentry-tight` | 23263.49 |
| `MSFT` | 8579.09 | 2.226 | 2508.80 | `donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-6pct-theme-quality-strict-guarded` | 15023.44 |
| `AMZN` | 5184.85 | 1.605 | 5224.05 | `donchian-20-10-spy-filter-rsi14-regime-45-hard-stop-8pct-theme-acceleration-reentry-tight` | 13815.73 |
| `GOOGL` | 5169.13 | 1.906 | 2642.42 | `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced` | 8808.59 |

## top_combos

| rank | strategy_id | symbol | net_profit | profit_factor | max_drawdown | win_rate |
|---|---|---|---:|---:|---:|---:|
| 1 | `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced` | `NVDA` | 150230.10 | 4.678 | 19003.32 | 57.14 |
| 2 | `donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier` | `NVDA` | 112145.93 | 4.780 | 13224.87 | 55.00 |
| 3 | `donchian-55-20-rsp-filter-rsi14-regime-50-theme-breadth-balanced` | `NVDA` | 112145.93 | 4.780 | 13224.87 | 55.00 |
| 4 | `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-early-guarded` | `NVDA` | 106116.38 | 4.468 | 7350.32 | 41.67 |
| 5 | `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-quality-early` | `NVDA` | 106116.38 | 4.468 | 7350.32 | 41.67 |
| 6 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-6pct-theme-breadth-quality-strict` | `NVDA` | 106116.38 | 4.468 | 7350.32 | 41.67 |
| 7 | `donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-6pct-theme-quality-strict-guarded` | `NVDA` | 98891.88 | 4.666 | 6894.40 | 40.00 |
| 8 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | `NVDA` | 98778.89 | 4.503 | 8674.67 | 43.48 |
| 9 | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-10pct-theme-deep-pullback-earlier` | `NVDA` | 89371.27 | 3.883 | 8358.93 | 45.45 |
| 10 | `donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-8pct-theme-quality-strict-stop-wide` | `NVDA` | 84034.13 | 4.170 | 7662.93 | 40.00 |

## bottom_combos

| rank | strategy_id | symbol | net_profit | profit_factor | max_drawdown | win_rate |
|---|---|---|---:|---:|---:|---:|
| 1 | `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-early-guarded` | `AMZN` | 1055.39 | 1.131 | 5330.11 | 47.62 |
| 2 | `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-quality-early` | `AMZN` | 1055.39 | 1.131 | 5330.11 | 47.62 |
| 3 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-6pct-theme-breadth-quality-strict` | `AMZN` | 1055.39 | 1.131 | 5330.11 | 47.62 |
| 4 | `donchian-20-10-spy-filter-rsi14-regime-55-hard-stop-8pct-theme-acceleration-balanced-strict` | `GOOGL` | 2397.83 | 1.270 | 2971.27 | 40.91 |
| 5 | `donchian-20-10-spy-filter-rsi14-regime-45-hard-stop-8pct-theme-acceleration-reentry-tight` | `GOOGL` | 2397.83 | 1.270 | 2971.27 | 40.91 |
| 6 | `donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier` | `AMZN` | 2842.22 | 1.318 | 7216.80 | 50.00 |
| 7 | `donchian-55-20-rsp-filter-rsi14-regime-50-theme-breadth-balanced` | `AMZN` | 2842.22 | 1.318 | 7216.80 | 50.00 |
| 8 | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-10pct-theme-deep-pullback-earlier` | `AMZN` | 3460.19 | 1.404 | 6798.06 | 50.00 |
| 9 | `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-early-guarded` | `GOOGL` | 3760.95 | 1.651 | 1805.90 | 47.83 |
| 10 | `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-quality-early` | `GOOGL` | 3760.95 | 1.651 | 1805.90 | 47.83 |

## tester metrics 欠測メモ

Mag7 では `tester_available_count = 83 / 84` で、欠測は 1 run のみだった。  
該当 run は `GOOGL × donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-6pct-theme-breadth-quality-strict` で、`apply_failed = true` / `tester_reason = "Skipped: strategy not applied"` / `fallback_source = chart_bars_local` だった。

この欠測により `breadth-quality-strict` の平均は 6 run 集計になっている。  
それでも暫定 2 位であり、alt rerun 候補から外す理由にはならないが、最終判断ではこの 1 run 欠測を明示して扱う。

## 解釈メモ

- **Mag7 の本命**は `quality-strict-balanced`
- **PF / DD が最も綺麗な quality 側候補**は `quality-strict-guarded`
- **breadth 側の主力化候補**は `breadth-quality-strict` と `breadth-earlier`
- **deep pullback 側の主力化候補**は `deep-pullback-tight`
- `breadth-balanced` は同値枝、`breadth-quality-early` は executable duplicate として扱う
- acceleration 2 本は今回も補完用途に留める

## 関連 docs

- theme signal observation: [`theme-signal-observation-round8_2015_2025.md`](./theme-signal-observation-round8_2015_2025.md)
- theme shortlist: [`theme-strategy-shortlist-round8_2015_2025.md`](./theme-strategy-shortlist-round8_2015_2025.md)
- alt round8: [`theme-backtest-results-round8-alt_2015_2025.md`](./theme-backtest-results-round8-alt_2015_2025.md)
- raw snapshot: [`../references/backtests/round8-theme-mag7_20260405.json`](../references/backtests/round8-theme-mag7_20260405.json)
- summary snapshot: [`../references/backtests/round8-theme-mag7_20260405.summary.json`](../references/backtests/round8-theme-mag7_20260405.summary.json)
