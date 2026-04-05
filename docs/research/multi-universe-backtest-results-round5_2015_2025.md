# round5 マルチユニバース・バックテスト結果 (2015-2025)

## メタデータ

- raw-source: `../references/backtests/breakout-rsi-round5-alt_20260405.json`
- summary-source: `../references/backtests/breakout-rsi-round5-alt_20260405.summary.json`
- run-count: `120`
- success-count: `120`
- tester-available-count: `119`
- universes: `sp500-top10-point-in-time`, `mega-cap-ex-nvda`
- strategies: `donchian-55-20-baseline-r5`, `donchian-55-20-spy-filter-r5`, `donchian-55-20-rsi14-regime-50-spy-filter`, `donchian-20-10-hard-stop-6pct`, `donchian-20-10-rsi14-regime-55-hard-stop-8pct`, `donchian-20-10-hard-stop-10pct`

## 結論

Mag7 上位 6 本を alt universe に持ち込むと、**最も強かったのは `donchian-20-10-hard-stop-10pct`** だった。  
`sp500-top10-point-in-time` / `mega-cap-ex-nvda` の両方で首位になり、Mag7 では 6 位だった 20/10 + 10% stop が、**非NVDA 環境では最も利益を残す型** に変わった。

2 位は `donchian-20-10-rsi14-regime-55-hard-stop-8pct` で、20/10 + RSI regime も alt では十分に意味があった。  
一方、Mag7 で 1 位だった `donchian-55-20-baseline-r5` は alt で 8k 台まで縮み、**Mag7 最適と alt 最適がズレる** ことが round5 の最大の発見だった。

55/20 側では `donchian-55-20-spy-filter-r5` が依然として有力で、profit factor / drawdown の見栄えは 20/10 群より良い。  
`donchian-55-20-rsi14-regime-50-spy-filter` は alt では `spy-filter-r5` と完全同値で、**RSI50 gate を重ねても実質差分が増えなかった**。

また bad-strategy 基準である **`avg_net_profit < 0` の strategy-universe pair は 0 件** だった。  
弱い個別コンボは `XOM` / `JNJ` に集まったが、strategy-universe 平均ではすべてプラスを維持している。

## universe_summary

| universe | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | best_combo |
|---|---:|---:|---:|---:|---|
| `sp500-top10-point-in-time` | 9033.51 | 2.082 | 3287.21 | 49.53 | `donchian-20-10-hard-stop-10pct` |
| `mega-cap-ex-nvda` | 8873.54 | 2.144 | 3237.07 | 49.46 | `donchian-20-10-hard-stop-10pct` |

## cross-universe comparison

| strategy_id | mag7 avg_net_profit | sp500 avg_net_profit | mega-cap ex NVDA avg_net_profit | 解釈 |
|---|---:|---:|---:|---|
| `donchian-55-20-baseline-r5` | 39103.88 | 8006.35 | 8007.71 | Mag7 では首位だが alt では大きく縮小。NVDA 依存がやや強い |
| `donchian-55-20-spy-filter-r5` | 38394.52 | 8237.49 | 8338.16 | 利益は 8k 台でも PF/DD が綺麗。品質改善型の代表 |
| `donchian-55-20-rsi14-regime-50-spy-filter` | 34423.58 | 8237.49 | 8338.16 | alt では `spy-filter-r5` と同値。追加 gate の価値は薄い |
| `donchian-20-10-hard-stop-6pct` | 32081.97 | 9317.78 | 8470.38 | 浅い stop は alt でもプラスだが、10% stop には及ばない |
| `donchian-20-10-rsi14-regime-55-hard-stop-8pct` | 31870.55 | 9993.46 | 9836.02 | 2 ユニバースとも 2 位。non-NVDA 再現型として強い |
| `donchian-20-10-hard-stop-10pct` | 31761.49 | 10436.93 | 10250.79 | 両 alt universe の首位。round5 の最有力 robust candidate |

## top strategy-universe pairs

| rank | universe | strategy_id | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | best_symbol |
|---|---|---|---:|---:|---:|---:|---|
| 1 | `sp500-top10-point-in-time` | `donchian-20-10-hard-stop-10pct` | 10436.93 | 1.904 | 3142.47 | 49.63 | `AAPL` |
| 2 | `mega-cap-ex-nvda` | `donchian-20-10-hard-stop-10pct` | 10250.79 | 1.888 | 3153.75 | 48.71 | `AAPL` |
| 3 | `sp500-top10-point-in-time` | `donchian-20-10-rsi14-regime-55-hard-stop-8pct` | 9993.46 | 1.838 | 3541.74 | 49.21 | `AAPL` |
| 4 | `mega-cap-ex-nvda` | `donchian-20-10-rsi14-regime-55-hard-stop-8pct` | 9836.02 | 1.825 | 3530.87 | 48.87 | `AAPL` |
| 5 | `sp500-top10-point-in-time` | `donchian-20-10-hard-stop-6pct` | 9317.78 | 1.771 | 3397.56 | 48.48 | `AAPL` |
| 6 | `mega-cap-ex-nvda` | `donchian-20-10-hard-stop-6pct` | 8470.38 | 1.715 | 3515.65 | 47.39 | `AAPL` |
| 7 | `mega-cap-ex-nvda` | `donchian-55-20-spy-filter-r5` | 8338.16 | 2.643 | 2867.00 | 51.00 | `META` |
| 8 | `mega-cap-ex-nvda` | `donchian-55-20-rsi14-regime-50-spy-filter` | 8338.16 | 2.643 | 2867.00 | 51.00 | `META` |
| 9 | `sp500-top10-point-in-time` | `donchian-55-20-spy-filter-r5` | 8237.49 | 2.414 | 3024.39 | 50.11 | `META` |
| 10 | `sp500-top10-point-in-time` | `donchian-55-20-rsi14-regime-50-spy-filter` | 8237.49 | 2.414 | 3024.39 | 50.11 | `META` |

## top_combos

| rank | universe | strategy_id | symbol | net_profit | profit_factor | max_drawdown | win_rate |
|---|---|---|---|---:|---:|---:|---:|
| 1 | `sp500-top10-point-in-time` | `donchian-20-10-rsi14-regime-55-hard-stop-8pct` | `AAPL` | 28922.31 | 3.439 | 2570.93 | 67.65 |
| 2 | `mega-cap-ex-nvda` | `donchian-20-10-rsi14-regime-55-hard-stop-8pct` | `AAPL` | 28922.31 | 3.439 | 2570.93 | 67.65 |
| 3 | `sp500-top10-point-in-time` | `donchian-20-10-hard-stop-10pct` | `AAPL` | 27117.64 | 3.066 | 4107.81 | 65.71 |
| 4 | `mega-cap-ex-nvda` | `donchian-20-10-hard-stop-10pct` | `AAPL` | 27117.64 | 3.066 | 4107.81 | 65.71 |
| 5 | `sp500-top10-point-in-time` | `donchian-20-10-hard-stop-6pct` | `AAPL` | 23805.43 | 2.921 | 3609.53 | 65.71 |
| 6 | `mega-cap-ex-nvda` | `donchian-20-10-hard-stop-6pct` | `AAPL` | 23805.43 | 2.921 | 3609.53 | 65.71 |
| 7 | `sp500-top10-point-in-time` | `donchian-20-10-rsi14-regime-55-hard-stop-8pct` | `AMZN` | 22413.54 | 2.572 | 3661.30 | 63.41 |
| 8 | `mega-cap-ex-nvda` | `donchian-20-10-rsi14-regime-55-hard-stop-8pct` | `AMZN` | 22413.54 | 2.572 | 3661.30 | 63.41 |
| 9 | `sp500-top10-point-in-time` | `donchian-20-10-hard-stop-10pct` | `META` | 20248.06 | 2.460 | 3002.73 | 45.83 |
| 10 | `mega-cap-ex-nvda` | `donchian-20-10-hard-stop-10pct` | `META` | 20248.06 | 2.460 | 3002.73 | 45.83 |

## bottom_combos

| rank | universe | strategy_id | symbol | net_profit | profit_factor | max_drawdown | win_rate |
|---|---|---|---|---:|---:|---:|---:|
| 1 | `mega-cap-ex-nvda` | `donchian-20-10-hard-stop-6pct` | `XOM` | -848.95 | 0.915 | 4901.49 | 36.84 |
| 2 | `sp500-top10-point-in-time` | `donchian-55-20-baseline-r5` | `JNJ` | -321.78 | 0.945 | 3927.30 | 44.00 |
| 3 | `mega-cap-ex-nvda` | `donchian-55-20-baseline-r5` | `JNJ` | -321.78 | 0.945 | 3927.30 | 44.00 |
| 4 | `sp500-top10-point-in-time` | `donchian-55-20-spy-filter-r5` | `JNJ` | -94.75 | 0.983 | 3632.93 | 45.83 |
| 5 | `sp500-top10-point-in-time` | `donchian-55-20-rsi14-regime-50-spy-filter` | `JNJ` | -94.75 | 0.983 | 3632.93 | 45.83 |
| 6 | `mega-cap-ex-nvda` | `donchian-55-20-spy-filter-r5` | `JNJ` | -94.75 | 0.983 | 3632.93 | 45.83 |
| 7 | `mega-cap-ex-nvda` | `donchian-55-20-rsi14-regime-50-spy-filter` | `JNJ` | -94.75 | 0.983 | 3632.93 | 45.83 |
| 8 | `sp500-top10-point-in-time` | `donchian-20-10-rsi14-regime-55-hard-stop-8pct` | `XOM` | 334.53 | 1.036 | 4504.84 | 37.84 |
| 9 | `mega-cap-ex-nvda` | `donchian-20-10-rsi14-regime-55-hard-stop-8pct` | `XOM` | 334.53 | 1.036 | 4504.84 | 37.84 |
| 10 | `sp500-top10-point-in-time` | `donchian-20-10-rsi14-regime-55-hard-stop-8pct` | `JNJ` | 624.31 | 1.076 | 3205.82 | 42.22 |

## 3分類での整理

- **非NVDA再現型**: `donchian-20-10-hard-stop-10pct`, `donchian-20-10-rsi14-regime-55-hard-stop-8pct`
- **品質改善型**: `donchian-55-20-spy-filter-r5`, `donchian-55-20-rsi14-regime-50-spy-filter`
- **NVDA依存型**: `donchian-55-20-baseline-r5`

## bad-strategy 判定

bad-strategy の基準である **strategy-universe 平均 `avg_net_profit < 0`** を満たした行は 0 件だった。  
したがって round5 は「候補の多くが alt で全滅する」形ではなく、**全候補が平均プラスを維持しつつ、強弱がはっきり分かれた**。

## tester metrics 欠測メモ

alt では `tester_available_count = 119 / 120` で、欠測は 1 run のみだった。

1. `sp500-top10-point-in-time / donchian-20-10-hard-stop-6pct × XOM`

この run は `metrics_unreadable` で raw snapshot に `fallback_source = chart_bars_local` が残っているが、summary 集計には含めていない。

## 解釈メモ

- round5 で最も重要なのは、**Mag7 首位だった 55/20 baseline より alt 首位の 20/10 + 10% stop を優先すべき** と判明したこと
- `20/10 + RSI55 regime + 8% stop` は alt でも 2 位で、**RSI regime は今回は効いた variant** だった
- `55/20 + SPY filter` は利益保持では 20/10 に負けるが、PF / DD の質が明確に良い
- `55/20 + RSI50 + SPY filter` は alt では `55/20 + SPY filter` と同値で、追加条件の意味は薄かった
- 弱い個別銘柄は `XOM` と `JNJ` に集中し、round4 と同じ苦手地帯が続いた

## 関連 docs

- Mag7 round5: [`mag7-backtest-results-round5_2015_2025.md`](./mag7-backtest-results-round5_2015_2025.md)
- bad-strategy round5: [`../bad-strategy/round5-negative-alt-strategies_2015_2025.md`](../bad-strategy/round5-negative-alt-strategies_2015_2025.md)
- raw snapshot: [`../references/backtests/breakout-rsi-round5-alt_20260405.json`](../references/backtests/breakout-rsi-round5-alt_20260405.json)
- summary snapshot: [`../references/backtests/breakout-rsi-round5-alt_20260405.summary.json`](../references/backtests/breakout-rsi-round5-alt_20260405.summary.json)
