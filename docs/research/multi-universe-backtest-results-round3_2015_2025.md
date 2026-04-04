# round3 マルチユニバース・バックテスト結果 (2015-2025)

## メタデータ

- raw-source: `../references/backtests/multi-universe-backtest-results_round3_20260404.json`
- summary-source: `../references/backtests/multi-universe-backtest-results_round3_20260404.summary.json`
- run-count: `170`
- success-count: `170`
- tester-available-count: `170`
- universes: `mag7`, `sp500-top10-point-in-time`
- strategies: `sma-200-trend-filter-atr-stop`, `sma-200-trend-filter-chandelier`, `sma-cross-10-50-baseline`, `sma-cross-10-50-spy-filter`, `ema-50-trend-filter-baseline`, `ema-50-trend-filter-rsp-filter`, `donchian-breakout-55-20-baseline`, `donchian-breakout-55-20-spy-filter`, `keltner-breakout-atr-trail`, `connors-rsi-pullback-bull-only`

## 結論

round3 では **170 run** を実行し、TradingView の tester metrics が取れたのは **170 run** だった。
今回の主眼は **NVDA 依存を薄めた alt universe で、round2 改善案と地合いフィルタがどこまで残るか** を見ることにあり、結果は `universe_summary` と strategy-universe 比較に集約される。

## universe_summary

| universe | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | best_combo | best_net_profit |
|---|---|---|---|---|---|---|
| `mag7` | 27263.29 | 2.536 | 6468.74 | 44.59 | `sma-cross-10-50-baseline × NVDA` | 384927.44 |
| `sp500-top10-point-in-time` | 6859.23 | 1.898 | 3116.48 | 42.96 | `ema-50-trend-filter-baseline × META` | 60467.96 |

## top strategy-universe pairs

| rank | universe | strategy_id | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | best_symbol |
|---|---|---|---|---|---|---|---|
| 1 | `mag7` | `sma-cross-10-50-baseline` | 75818.76 | 3.052 | 14890.08 | 44.71 | `NVDA` |
| 2 | `mag7` | `ema-50-trend-filter-baseline` | 69428.90 | 2.700 | 10452.08 | 35.94 | `NVDA` |
| 3 | `mag7` | `donchian-breakout-55-20-baseline` | 34927.25 | 2.712 | 8227.70 | 52.13 | `NVDA` |
| 4 | `mag7` | `donchian-breakout-55-20-spy-filter` | 34423.58 | 3.090 | 7917.23 | 53.20 | `NVDA` |
| 5 | `sp500-top10-point-in-time` | `ema-50-trend-filter-baseline` | 14178.81 | 1.749 | 4910.04 | 33.45 | `META` |
| 6 | `mag7` | `keltner-breakout-atr-trail` | 12932.49 | 1.615 | 4451.60 | 40.84 | `NVDA` |
| 7 | `mag7` | `sma-200-trend-filter-atr-stop` | 12720.35 | 2.713 | 3171.47 | 35.69 | `NVDA` |
| 8 | `sp500-top10-point-in-time` | `sma-cross-10-50-baseline` | 12310.56 | 2.085 | 4852.97 | 41.14 | `META` |
| 9 | `mag7` | `connors-rsi-pullback-bull-only` | 9839.65 | 2.914 | 3544.18 | 72.34 | `META` |
| 10 | `mag7` | `ema-50-trend-filter-rsp-filter` | 9536.97 | 1.993 | 3931.45 | 35.48 | `NVDA` |

## baseline vs regime-filter comparison

| universe | base | filtered | delta_net_profit | delta_drawdown |
|---|---|---|---|---|
| `mag7` | `sma-cross-10-50-baseline` | `sma-cross-10-50-spy-filter` | -67071.19 | -8819.89 |
| `mag7` | `ema-50-trend-filter-baseline` | `ema-50-trend-filter-rsp-filter` | -59891.93 | -6520.63 |
| `mag7` | `donchian-breakout-55-20-baseline` | `donchian-breakout-55-20-spy-filter` | -503.67 | -310.47 |
| `sp500-top10-point-in-time` | `sma-cross-10-50-baseline` | `sma-cross-10-50-spy-filter` | -5591.62 | -1571.79 |
| `sp500-top10-point-in-time` | `ema-50-trend-filter-baseline` | `ema-50-trend-filter-rsp-filter` | -9448.43 | -2201.44 |
| `sp500-top10-point-in-time` | `donchian-breakout-55-20-baseline` | `donchian-breakout-55-20-spy-filter` | 231.14 | -579.33 |

## top_combos

| rank | universe | strategy_id | symbol | net_profit | profit_factor | max_drawdown | win_rate |
|---|---|---|---|---|---|---|---|
| 1 | `mag7` | `sma-cross-10-50-baseline` | `NVDA` | 384927.44 | 5.726 | 55479.30 | 50.00 |
| 2 | `mag7` | `ema-50-trend-filter-baseline` | `NVDA` | 331832.02 | 5.734 | 28681.48 | 40.00 |
| 3 | `mag7` | `donchian-breakout-55-20-baseline` | `NVDA` | 155063.93 | 4.893 | 17861.64 | 57.14 |
| 4 | `mag7` | `donchian-breakout-55-20-spy-filter` | `NVDA` | 150230.10 | 4.678 | 19003.32 | 57.14 |
| 5 | `mag7` | `sma-200-trend-filter-atr-stop` | `NVDA` | 71063.06 | 8.266 | 8119.25 | 70.00 |
| 6 | `mag7` | `ema-50-trend-filter-baseline` | `META` | 60467.96 | 3.318 | 10154.51 | 39.13 |
| 7 | `sp500-top10-point-in-time` | `ema-50-trend-filter-baseline` | `META` | 60467.96 | 3.318 | 10154.51 | 39.13 |
| 8 | `mag7` | `sma-cross-10-50-baseline` | `META` | 50433.69 | 3.626 | 9349.23 | 51.72 |
| 9 | `sp500-top10-point-in-time` | `sma-cross-10-50-baseline` | `META` | 50433.69 | 3.626 | 9349.23 | 51.72 |
| 10 | `mag7` | `sma-cross-10-50-baseline` | `TSLA` | 45182.77 | 2.683 | 18418.89 | 52.94 |
| 11 | `mag7` | `ema-50-trend-filter-baseline` | `AAPL` | 34367.25 | 2.289 | 10681.60 | 37.93 |
| 12 | `sp500-top10-point-in-time` | `ema-50-trend-filter-baseline` | `AAPL` | 34367.25 | 2.289 | 10681.60 | 37.93 |

## bottom_combos

| rank | universe | strategy_id | symbol | net_profit | profit_factor | max_drawdown | win_rate |
|---|---|---|---|---|---|---|---|
| 1 | `sp500-top10-point-in-time` | `keltner-breakout-atr-trail` | `XOM` | -3517.49 | 0.589 | 4678.15 | 26.00 |
| 2 | `sp500-top10-point-in-time` | `ema-50-trend-filter-baseline` | `XOM` | -3003.69 | 0.579 | 3653.35 | 29.29 |
| 3 | `sp500-top10-point-in-time` | `ema-50-trend-filter-baseline` | `WFC` | -2460.81 | 0.666 | 3585.82 | 34.25 |
| 4 | `mag7` | `keltner-breakout-atr-trail` | `AMZN` | -2076.43 | 0.836 | 3496.00 | 37.31 |
| 5 | `sp500-top10-point-in-time` | `keltner-breakout-atr-trail` | `AMZN` | -2076.43 | 0.836 | 3496.00 | 37.31 |
| 6 | `mag7` | `sma-200-trend-filter-atr-stop` | `AMZN` | -1627.67 | 0.689 | 3447.45 | 32.26 |
| 7 | `sp500-top10-point-in-time` | `sma-200-trend-filter-atr-stop` | `AMZN` | -1627.67 | 0.689 | 3447.45 | 32.26 |
| 8 | `sp500-top10-point-in-time` | `ema-50-trend-filter-rsp-filter` | `XOM` | -1606.43 | 0.678 | 2387.32 | 26.92 |
| 9 | `sp500-top10-point-in-time` | `ema-50-trend-filter-rsp-filter` | `WFC` | -1275.29 | 0.811 | 2516.97 | 35.48 |
| 10 | `mag7` | `sma-200-trend-filter-chandelier` | `AMZN` | -636.35 | 0.868 | 2648.48 | 37.14 |

## メモ

- `spy_above_sma200` / `rsp_above_sma200` は round3 で実装した地合いフィルタ本線
- breadth / VIX / risk-on ratio は research-only に留めた
- `sp500-top10-point-in-time` は 2015 年 annual snapshot 固定 basket であり、日次 reconstitution ではない

