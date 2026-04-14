# Mag7 バックテスト結果サマリ round2 (2015-2025)

## メタデータ

- raw-source: `../references/backtests/mag7-backtest-results_round2_20260404.json`
- run-count: `140`
- success-count: `140`
- tester-available-count: `140`
- symbols: `AAPL`, `MSFT`, `GOOGL`, `AMZN`, `META`, `NVDA`, `TSLA`
- strategy-count: `20`
- baseline-docs:
  - shortlist: [`mag7-strategy-shortlist-round2_2015_2025.md`](./mag7-strategy-shortlist-round2_2015_2025.md)
  - round1 summary: [`mag7-backtest-results_2015_2025.md`](./mag7-backtest-results_2015_2025.md)

## 実行条件

- 期間: `2015-01-01` 〜 `2025-12-31`
- 初期資金: `10000 USD`
- 時間足: 日足 (`D`)
- 比較前提: long-only / 手数料 0 / slippage 0 / 100% of equity
- 実行 endpoint: `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223`
- input:
  - strategy presets: [`../../config/backtest/strategy-presets.json`](../../config/backtest/strategy-presets.json)
  - symbol universe: [`../../config/backtest/universes/mag7.json`](../../config/backtest/universes/mag7.json)
- 実行コンテキスト:
  - round2 の 20戦略 run は **session artifact runner** で実行
  - repo CLI / MCP の公開実装は引き続き `nvda-ma` 固定

## 結論

round2 では **20戦略 × 7銘柄 = 140 run をすべて成功** させ、`tester_available` も全件 `true` だった。  
結果は round1 と同じく **長期 trend-following が優勢** だが、new entrant の `sma-cross-10-50`, `ema-50-trend-filter`, `keltner-breakout` が上位に食い込み、単なる round1 再実行ではない差分が出た。

一方で、依然として **`NVDA` の寄与が突出** している。したがって round2 の解釈では「最高リターン」だけでなく、`NVDA` 以外でも崩れにくいか、drawdown をどこまで許容するかを同時に見る必要がある。

## strategy_summary

| rank | strategy_id | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | best_symbol |
|---|---|---:|---:|---:|---:|---|
| 1 | `sma-200-trend-filter` | 432586.22 | 4.246 | 46841.85 | 33.30 | `NVDA` |
| 2 | `sma-cross-10-50` | 75818.76 | 3.052 | 14890.08 | 44.71 | `NVDA` |
| 3 | `ema-50-trend-filter` | 69428.90 | 2.700 | 10452.08 | 35.94 | `NVDA` |
| 4 | `keltner-breakout` | 66383.04 | 2.375 | 24065.53 | 50.27 | `NVDA` |
| 5 | `donchian-breakout` | 44164.68 | 2.123 | 13535.99 | 48.65 | `NVDA` |
| 6 | `supertrend-atr` | 43366.69 | 2.515 | 11264.78 | 48.93 | `NVDA` |
| 7 | `donchian-breakout-55-20` | 40915.77 | 2.769 | 9236.13 | 54.56 | `NVDA` |
| 8 | `supertrend-atr-14-2` | 33085.43 | 1.943 | 13080.05 | 47.59 | `NVDA` |
| 9 | `psar-trend-flip` | 27389.09 | 1.678 | 11498.18 | 46.41 | `NVDA` |
| 10 | `ema-cross-9-21` | 22035.50 | 1.755 | 13921.92 | 35.04 | `NVDA` |
| 11 | `connors-rsi-pullback` | 21271.37 | 3.290 | 5864.65 | 74.58 | `NVDA` |
| 12 | `roc-momentum-cross` | 20696.81 | 1.615 | 7480.35 | 43.04 | `TSLA` |
| 13 | `bb-tight-squeeze` | 20627.66 | 2.584 | 7799.72 | 73.24 | `NVDA` |
| 14 | `sma-cross-5-20` | 17754.00 | 1.730 | 10006.13 | 42.22 | `NVDA` |
| 15 | `bb-mean-revert` | 13098.73 | 2.891 | 6186.54 | 76.57 | `NVDA` |
| 16 | `ema-cross-12-26` | 11357.90 | 1.742 | 6693.90 | 32.02 | `NVDA` |
| 17 | `macd-signal` | 11147.64 | 1.450 | 6200.94 | 42.09 | `TSLA` |
| 18 | `rsi-mean-reversion` | 7876.31 | 13.464 | 5940.03 | 74.89 | `TSLA` |
| 19 | `adx-ema-filter` | 6325.96 | 5.432 | 2772.25 | 49.74 | `META` |
| 20 | `stochastic-oversold` | 5875.68 | 2.138 | 5056.62 | 72.67 | `NVDA` |

## round2 core strategies

| rank | strategy_id | strength | weakness | next-experiment |
|---|---|---|---|---|
| 1 | `sma-200-trend-filter` | 圧倒的な平均純利益。長期 trend の強さを最も素直に拾う | `NVDA` 依存と drawdown が極端に大きい | ATR stop や部分利確で DD を削る |
| 2 | `sma-cross-10-50` | round1 の短期 MA 系より大幅に改善。DD も許容範囲 | トレンドが鈍る局面では再度 whipsaw の可能性 | `EMA 20/50` や filter 併用を比較する |
| 3 | `ema-50-trend-filter` | 200SMA より速く、利益と DD のバランスが良い | 上昇再開の誤検知が増える可能性 | `EMA 50` + breakout の併用を試す |
| 4 | `keltner-breakout` | new entrant で最上位級。breakout 系の新しい本命候補 | breakout 系の中では DD がやや重い | ATR multiplier と exit を詰める |
| 5 | `donchian-breakout` | round1 から引き続き安定。実装も単純で比較軸に使いやすい | 長めの 55/20 版に PF/DD で見劣りする局面がある | `20/10` と `55/20` の regime 分担を比較する |

## symbol_summary

| symbol | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | best_strategy | best_net_profit |
|---|---:|---:|---:|---:|---|---:|
| `NVDA` | 253176.99 | 3.819 | 40617.85 | 56.54 | `sma-200-trend-filter` | 2940215.11 |
| `TSLA` | 23648.84 | 1.742 | 11929.17 | 45.01 | `roc-momentum-cross` | 75331.15 |
| `META` | 21810.69 | 3.560 | 6822.39 | 52.33 | `ema-50-trend-filter` | 60467.96 |
| `AAPL` | 17271.85 | 2.602 | 5942.50 | 54.41 | `supertrend-atr` | 44020.86 |
| `AMZN` | 12890.96 | 4.841 | 7526.93 | 51.89 | `keltner-breakout` | 35555.22 |
| `MSFT` | 9558.65 | 2.731 | 4105.22 | 49.26 | `bb-tight-squeeze` | 20462.15 |
| `GOOGL` | 8564.18 | 2.229 | 4531.65 | 49.83 | `sma-200-trend-filter` | 41191.11 |

## top_combos

| rank | strategy_id | symbol | net_profit | profit_factor | max_drawdown | closed_trades |
|---|---|---|---:|---:|---:|---:|
| 1 | `sma-200-trend-filter` | `NVDA` | 2940215.11 | 10.252 | 295665.25 | 10 |
| 2 | `sma-cross-10-50` | `NVDA` | 384927.44 | 5.726 | 55479.30 | 18 |
| 3 | `ema-50-trend-filter` | `NVDA` | 331832.02 | 5.734 | 28681.48 | 40 |
| 4 | `keltner-breakout` | `NVDA` | 274770.88 | 2.720 | 98230.05 | 38 |
| 5 | `donchian-breakout-55-20` | `NVDA` | 195785.96 | 5.428 | 19805.48 | 23 |
| 6 | `supertrend-atr` | `NVDA` | 189147.94 | 5.276 | 39451.24 | 25 |
| 7 | `donchian-breakout` | `NVDA` | 162788.12 | 2.341 | 51122.19 | 42 |
| 8 | `psar-trend-flip` | `NVDA` | 142855.35 | 3.363 | 39420.19 | 63 |
| 9 | `supertrend-atr-14-2` | `NVDA` | 95252.17 | 2.844 | 32163.19 | 43 |
| 10 | `ema-cross-9-21` | `NVDA` | 89721.99 | 2.290 | 56232.95 | 25 |

## bottom_combos

| rank | strategy_id | symbol | net_profit | profit_factor | max_drawdown | closed_trades |
|---|---|---|---:|---:|---:|---:|
| 1 | `stochastic-oversold` | `META` | -4181.66 | 0.526 | 6460.60 | 20 |
| 2 | `adx-ema-filter` | `TSLA` | -1964.96 | 0.589 | 5201.74 | 14 |
| 3 | `sma-cross-5-20` | `GOOGL` | -454.80 | 0.955 | 5077.31 | 62 |
| 4 | `psar-trend-flip` | `META` | -143.75 | 0.995 | 10843.84 | 110 |
| 5 | `adx-ema-filter` | `GOOGL` | 201.67 | 1.107 | 1615.74 | 9 |
| 6 | `adx-ema-filter` | `MSFT` | 645.80 | 1.244 | 2574.83 | 10 |
| 7 | `sma-200-trend-filter` | `META` | 953.30 | 1.194 | 3945.25 | 19 |
| 8 | `supertrend-atr` | `TSLA` | 1249.64 | 1.087 | 4772.27 | 29 |
| 9 | `adx-ema-filter` | `AMZN` | 1259.31 | 1.378 | 2396.50 | 13 |
| 10 | `supertrend-atr` | `AMZN` | 1279.57 | 1.133 | 8019.90 | 27 |

## 解釈メモ

- `NVDA` 支配は round2 でも続いたが、new entrant の `sma-cross-10-50`, `ema-50-trend-filter`, `keltner-breakout` が round1 の fast MA 群より明確に強かった
- breakout 系は `donchian-breakout` に加えて `keltner-breakout`, `donchian-breakout-55-20` も有力で、**breakout family 全体が強い**
- mean reversion 系は平均純利益で下位だが、`connors-rsi-pullback`, `bb-tight-squeeze`, `bb-mean-revert`, `rsi-mean-reversion` は win rate / PF が高い
- `stochastic-oversold` は最下位だったが、完全な失敗ではなく **高 win rate だが利幅が小さい** タイプに見える
- `warning_summary` は空で、round2 runner では compile warning を残さず完走できた

## 次の改善候補

1. `sma-200-trend-filter` に損失抑制ルールを足して DD を下げる
2. `sma-cross-10-50` と `ema-50-trend-filter` を新 baseline 候補として再評価する
3. `keltner-breakout` と `donchian-breakout-55-20` を breakout の本命候補として詰める
4. `NVDA` 依存を薄めるため、上位戦略を Mag7 外でも spot check する

## 関連 docs

- round2 shortlist: [`mag7-strategy-shortlist-round2_2015_2025.md`](./mag7-strategy-shortlist-round2_2015_2025.md)
- round1 summary: [`mag7-backtest-results_2015_2025.md`](./mag7-backtest-results_2015_2025.md)
- round2 raw snapshot: [`mag7-backtest-results_round2_20260404.json`](../references/backtests/mag7-backtest-results_round2_20260404.json)
