# Mag7 バックテスト結果サマリ round5 (2015-2025)

## メタデータ

- raw-source: `../references/backtests/breakout-rsi-round5_20260405.json`
- summary-source: `../references/backtests/breakout-rsi-round5_20260405.summary.json`
- run-count: `140`
- success-count: `140`
- tester-available-count: `130`
- symbols: `AAPL`, `MSFT`, `GOOGL`, `AMZN`, `META`, `NVDA`, `TSLA`
- strategy-count: `20`

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
  - round5 も **session artifact runner** で実行
  - repo CLI / MCP の公開実装は引き続き `nvda-ma` 固定

## 結論

round5 の Mag7 では、round4 の「20/10 + hard stop 本命」という見え方が少し変わり、**55/20 family が平均純利益トップを奪い返した**。  
首位は `donchian-55-20-baseline-r5`、2位は `donchian-55-20-spy-filter-r5`、3位は `donchian-55-20-rsi14-regime-50-spy-filter` で、Mag7 だけを見ると **55/20 の伸び切る力** が再び前面に出た。

ただし non-NVDA robustness の視点では別の読みが残る。  
round5 の Mag7 上位 10 本のうち、alt に送った候補は最終的に **20/10 + 10% stop / 20/10 + RSI55 regime / 20/10 + 6% stop** が強く、Mag7 最適と alt 最適が分かれた。  
つまり round5 は **Mag7 最適化では 55/20、汎用性では 20/10 hard-stop 系** という二層構造がより明確になった。

RSI long-only mean-reversion 群は全体順位では breakout 上位に届かなかったが、`rsi2-buy-10-sell-65-long-only` は `META` / `MSFT` / `GOOGL` の best strategy になった。  
breakout が刺さりにくい銘柄での補完候補としては意味がある一方、**ポートフォリオ平均の主役にはなれなかった**。

## strategy_summary

| rank | strategy_id | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | best_symbol |
|---|---|---:|---:|---:|---:|---|
| 1 | `donchian-55-20-baseline-r5` | 39103.88 | 2.744 | 9164.84 | 53.25 | `NVDA` |
| 2 | `donchian-55-20-spy-filter-r5` | 38394.52 | 3.146 | 8864.00 | 54.13 | `NVDA` |
| 3 | `donchian-55-20-rsi14-regime-50-spy-filter` | 34423.58 | 3.090 | 7917.23 | 53.20 | `NVDA` |
| 4 | `donchian-20-10-hard-stop-6pct` | 32081.97 | 2.258 | 7151.70 | 47.15 | `NVDA` |
| 5 | `donchian-20-10-rsi14-regime-55-hard-stop-8pct` | 31870.55 | 2.137 | 7359.53 | 46.12 | `NVDA` |
| 6 | `donchian-20-10-hard-stop-10pct` | 31761.49 | 2.154 | 7954.21 | 46.38 | `NVDA` |
| 7 | `donchian-20-10-hard-stop-7pct` | 31646.92 | 2.277 | 7892.85 | 47.01 | `NVDA` |
| 8 | `donchian-20-10-hard-stop-8pct-r5` | 31467.43 | 2.350 | 6553.42 | 48.60 | `NVDA` |
| 9 | `donchian-20-10-rsi14-regime-50-hard-stop-8pct` | 31467.43 | 2.350 | 6553.42 | 48.60 | `NVDA` |
| 10 | `donchian-55-20-rsp-filter-r5` | 30869.47 | 2.906 | 8104.25 | 53.32 | `NVDA` |

## 解釈メモ

- Mag7 単体では `55/20` 系が再浮上し、**利益最大化** の軸では `donchian-55-20-baseline-r5` が最上位
- `donchian-55-20-spy-filter-r5` は純利益をほぼ保ったまま PF を 3.1 台まで改善し、**品質改善型** として最も読みやすい
- `donchian-55-20-rsi14-regime-50-spy-filter` は Mag7 では 3 位まで来たが、alt では `spy-filter-r5` と完全同値になり、RSI50 gate の追加価値は限定的だった
- `20/10` 側は 6〜10% stop がかなり密集し、stop 幅の差は Mag7 より alt で効いた
- RSI long-only 群は `META` / `MSFT` / `GOOGL` では局所優位を見せたが、**NVDA 主導の Mag7 集計では breakout の後塵**

## symbol_summary

| symbol | avg_net_profit | avg_profit_factor | avg_max_drawdown | best_strategy | best_net_profit |
|---|---:|---:|---:|---|---:|
| `NVDA` | 96259.12 | 3.690 | 12935.29 | `donchian-55-20-baseline-r5` | 155063.93 |
| `TSLA` | 24758.13 | 1.806 | 15599.72 | `donchian-20-10-spy-filter-hard-stop-8pct` | 45967.78 |
| `META` | 18630.41 | 2.787 | 5138.19 | `rsi2-buy-10-sell-65-long-only` | 38978.96 |
| `AAPL` | 17208.80 | 2.707 | 3198.39 | `donchian-20-10-hard-stop-8pct-r5` | 28922.31 |
| `AMZN` | 12406.05 | 2.148 | 4280.13 | `donchian-20-10-rsi14-regime-55-hard-stop-8pct` | 22413.54 |
| `MSFT` | 10640.84 | 2.437 | 2619.43 | `rsi2-buy-10-sell-65-long-only` | 17833.88 |
| `GOOGL` | 5918.89 | 1.824 | 3506.63 | `rsi2-buy-10-sell-65-long-only` | 17932.92 |

## top_combos

| rank | strategy_id | symbol | net_profit | profit_factor | max_drawdown | win_rate |
|---|---|---|---:|---:|---:|---:|
| 1 | `donchian-55-20-baseline-r5` | `NVDA` | 155063.93 | 4.893 | 17861.64 | 57.14 |
| 2 | `donchian-55-20-spy-filter-r5` | `NVDA` | 150230.10 | 4.678 | 19003.32 | 57.14 |
| 3 | `donchian-55-20-rsi14-regime-50-spy-filter` | `NVDA` | 150230.10 | 4.678 | 19003.32 | 57.14 |
| 4 | `donchian-20-10-hard-stop-6pct` | `NVDA` | 131324.61 | 3.803 | 17840.14 | 42.50 |
| 5 | `donchian-20-10-hard-stop-7pct` | `NVDA` | 126793.98 | 3.679 | 16420.28 | 43.59 |
| 6 | `donchian-20-10-hard-stop-8pct-r5` | `NVDA` | 116099.27 | 3.398 | 16142.60 | 43.59 |
| 7 | `donchian-20-10-rsi14-regime-55-hard-stop-8pct` | `NVDA` | 116099.27 | 3.398 | 16142.60 | 43.59 |
| 8 | `donchian-20-10-rsi14-regime-50-hard-stop-8pct` | `NVDA` | 116099.27 | 3.398 | 16142.60 | 43.59 |
| 9 | `donchian-55-20-rsp-filter-r5` | `NVDA` | 112145.93 | 4.780 | 13224.87 | 55.00 |
| 10 | `donchian-55-20-rsi14-regime-55-hard-stop-8pct` | `NVDA` | 110886.37 | 4.441 | 9639.31 | 44.00 |

## tester metrics 欠測メモ

Mag7 では `tester_available_count = 130 / 140` で、欠測 10 run はすべて **AAPL での strategy apply failure** だった。  
`donchian-20-10-hard-stop-10pct` や `donchian-55-20-baseline-r5` など AAPL 先頭バッチで `Strategy not verified in chart studies after compile + retry` が発生し、raw snapshot には `fallback_source = chart_bars_local` が残っているが summary 集計には含めていない。

## 次の読み筋

1. Mag7 最適の `55/20` 群と alt 最適の `20/10` 群を分けて扱う
2. `donchian-55-20-spy-filter-r5` は **品質改善型** の代表として残す
3. `donchian-20-10-hard-stop-10pct` と `donchian-20-10-rsi14-regime-55-hard-stop-8pct` を **non-NVDA 再現型** として優先評価する
4. RSI long-only は breakout の代替ではなく、**breakout が鈍い銘柄の補完枠** として再検討する

## 関連 docs

- multi-universe round5: [`multi-universe-backtest-results-round5_2015_2025.md`](./multi-universe-backtest-results-round5_2015_2025.md)
- bad-strategy round5: [`../bad-strategy/round5-negative-alt-strategies_2015_2025.md`](../bad-strategy/round5-negative-alt-strategies_2015_2025.md)
- raw snapshot: [`../references/backtests/breakout-rsi-round5_20260405.json`](../references/backtests/breakout-rsi-round5_20260405.json)
- summary snapshot: [`../references/backtests/breakout-rsi-round5_20260405.summary.json`](../references/backtests/breakout-rsi-round5_20260405.summary.json)
