# Round7 テーマトレンド・Mag7 バックテスト結果 (2015-2025)

## メタデータ

- raw-source: `../references/backtests/round7-theme-mag7_20260405.json`
- summary-source: `../references/backtests/round7-theme-mag7_20260405.summary.json`
- run-count: `70`
- success-count: `70`
- tester-available-count: `69`
- symbols: `AAPL`, `MSFT`, `GOOGL`, `AMZN`, `META`, `NVDA`, `TSLA`
- strategy-count: `10`

## 実行条件

- 期間: `2015-01-01` 〜 `2025-12-31`
- 初期資金: `10000 USD`
- 時間足: 日足 (`D`)
- 比較前提: long-only / 手数料 0 / slippage 0 / 100% of equity
- 実行 endpoint: `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223`
- 実行コンテキスト:
  - round7 も **session artifact runner** で実行
  - repo CLI / MCP の公開実装は引き続き `nvda-ma` 固定

## 結論

round7 の Mag7 では、**55/20 family が round6 以上にはっきり主導権を握った**。  
首位は `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict`、2 位は `donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-6pct-theme-quality-strict`、3 位は `donchian-55-20-rsp-filter-rsi14-regime-45-theme-breadth-early` で、上位 5 本をすべて 55/20 系が占めた。

つまり Mag7 では、round6 の breadth persistence 本線を維持しつつも、**leader concentration を strict quality で通す形が最も強かった**。  
特に `RSI14 > 60` の strict 版は、NVDA の大きな伸びを最も素直に取り込みつつ、alt でも崩れない候補として残った。

一方で 20/10 系は失敗ではない。  
`donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-8pct-theme-acceleration-balanced` は 6 位、`...-acceleration-reentry` は 7 位で、**AAPL / AMZN 側の再加速を取りにいく補完枠** としては十分意味がある。

RSI long-only 2 本は今回も主役ではなかったが、`GOOGL` の best strategy は `rsi2-buy-10-sell-70-rsp-filter-long-only-theme-shallow-dip` だった。  
よって round7 でも **dip reclaim は breakout の代替ではなく laggard 補完枠** と読むのが自然である。

## strategy_summary

| rank | strategy_id | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | best_symbol |
|---|---|---:|---:|---:|---:|---|
| 1 | `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict` | 34423.58 | 3.090 | 7917.23 | 53.20 | `NVDA` |
| 2 | `donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-6pct-theme-quality-strict` | 29037.96 | 3.213 | 4184.74 | 47.88 | `NVDA` |
| 3 | `donchian-55-20-rsp-filter-rsi14-regime-45-theme-breadth-early` | 28332.39 | 2.912 | 7460.85 | 52.50 | `NVDA` |
| 4 | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-6pct-theme-breadth-quality` | 26501.21 | 2.753 | 6567.33 | 46.36 | `NVDA` |
| 5 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback` | 24325.84 | 2.744 | 7573.02 | 49.44 | `NVDA` |
| 6 | `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-8pct-theme-acceleration-balanced` | 23663.99 | 2.090 | 5216.75 | 45.64 | `NVDA` |
| 7 | `donchian-20-10-spy-filter-rsi14-regime-45-hard-stop-10pct-theme-acceleration-reentry` | 20812.30 | 2.117 | 6707.76 | 48.91 | `NVDA` |
| 8 | `donchian-20-10-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-acceleration` | 20178.31 | 2.016 | 5984.16 | 46.86 | `NVDA` |
| 9 | `rsi3-buy-20-sell-70-spy-filter-long-only-theme-deep-dip` | 13332.83 | 2.002 | 6518.77 | 71.14 | `NVDA` |
| 10 | `rsi2-buy-10-sell-70-rsp-filter-long-only-theme-shallow-dip` | 11066.07 | 2.465 | 4371.48 | 72.85 | `NVDA` |

## symbol_summary

| symbol | avg_net_profit | avg_profit_factor | avg_max_drawdown | best_strategy | best_net_profit |
|---|---:|---:|---:|---|---:|
| `NVDA` | 82164.52 | 3.777 | 9933.70 | `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict` | 150230.10 |
| `TSLA` | 27644.22 | 1.989 | 15585.75 | `donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-6pct-theme-quality-strict` | 52103.58 |
| `META` | 16409.23 | 3.098 | 4719.42 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback` | 28435.67 |
| `AAPL` | 13387.48 | 2.781 | 3127.39 | `donchian-20-10-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-acceleration` | 21032.44 |
| `MSFT` | 8977.67 | 2.537 | 2390.56 | `donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-6pct-theme-quality-strict` | 15023.44 |
| `AMZN` | 7429.74 | 1.770 | 5050.22 | `donchian-20-10-spy-filter-rsi14-regime-45-hard-stop-10pct-theme-acceleration-reentry` | 16886.58 |
| `GOOGL` | 5131.61 | 1.897 | 2735.48 | `rsi2-buy-10-sell-70-rsp-filter-long-only-theme-shallow-dip` | 9877.18 |

## top_combos

| rank | strategy_id | symbol | net_profit | profit_factor | max_drawdown | win_rate |
|---|---|---|---:|---:|---:|---:|
| 1 | `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict` | `NVDA` | 150230.10 | 4.678 | 19003.32 | 57.14 |
| 2 | `donchian-55-20-rsp-filter-rsi14-regime-45-theme-breadth-early` | `NVDA` | 112145.93 | 4.780 | 13224.87 | 55.00 |
| 3 | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-6pct-theme-breadth-quality` | `NVDA` | 106116.38 | 4.468 | 7350.32 | 41.67 |
| 4 | `donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-6pct-theme-quality-strict` | `NVDA` | 98891.88 | 4.666 | 6894.40 | 40.00 |
| 5 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback` | `NVDA` | 89371.27 | 3.883 | 8358.93 | 45.45 |
| 6 | `donchian-20-10-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-acceleration` | `NVDA` | 79765.79 | 3.911 | 8705.89 | 47.06 |
| 7 | `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-8pct-theme-acceleration-balanced` | `NVDA` | 67810.70 | 3.426 | 8446.11 | 45.95 |
| 8 | `donchian-20-10-spy-filter-rsi14-regime-45-hard-stop-10pct-theme-acceleration-reentry` | `NVDA` | 61216.14 | 3.025 | 9440.08 | 47.22 |
| 9 | `donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-6pct-theme-quality-strict` | `TSLA` | 52103.58 | 3.309 | 11669.53 | 42.11 |
| 10 | `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-8pct-theme-acceleration-balanced` | `TSLA` | 45967.78 | 2.460 | 8155.37 | 40.00 |

## bottom_combos

| rank | strategy_id | symbol | net_profit | profit_factor | max_drawdown | win_rate |
|---|---|---|---:|---:|---:|---:|
| 1 | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-6pct-theme-breadth-quality` | `AMZN` | 1055.39 | 1.131 | 5330.11 | 47.62 |
| 2 | `donchian-20-10-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-acceleration` | `GOOGL` | 2068.53 | 1.239 | 2549.62 | 39.02 |
| 3 | `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-8pct-theme-acceleration-balanced` | `GOOGL` | 2397.83 | 1.270 | 2971.27 | 40.91 |
| 4 | `donchian-55-20-rsp-filter-rsi14-regime-45-theme-breadth-early` | `AMZN` | 2842.22 | 1.318 | 7216.80 | 50.00 |
| 5 | `donchian-20-10-spy-filter-rsi14-regime-45-hard-stop-10pct-theme-acceleration-reentry` | `GOOGL` | 2859.70 | 1.340 | 3160.16 | 38.10 |
| 6 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback` | `AMZN` | 3460.19 | 1.404 | 6798.06 | 50.00 |
| 7 | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-6pct-theme-breadth-quality` | `GOOGL` | 3760.95 | 1.651 | 1805.90 | 47.83 |
| 8 | `donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-6pct-theme-quality-strict` | `GOOGL` | 4138.25 | 1.993 | 1457.61 | 50.00 |
| 9 | `donchian-20-10-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-acceleration` | `MSFT` | 4302.35 | 1.483 | 2236.86 | 42.22 |
| 10 | `donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-6pct-theme-quality-strict` | `AMZN` | 4982.74 | 1.824 | 1905.01 | 55.00 |

## tester metrics 欠測メモ

Mag7 では `tester_available_count = 69 / 70` で、欠測は 1 run のみだった。  
該当 run は `AAPL × donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-8pct-theme-acceleration-balanced` で、`apply_failed = true` / `tester_reason = "Skipped: strategy not applied"` / `fallback_source = chart_bars_local` だった。

round6 の 9 欠測よりかなり改善しており、Mag7 単体の比較も前回よりは信頼しやすい。  
それでも最終判断は alt rerun を優先する。

## 解釈メモ

- **Mag7 の本命**は `quality-strict`
- **breadth 側の本命候補**は `breadth-early` と `deep-pullback`
- **AAPL / AMZN 側の補完枠**としては `acceleration-balanced`, `acceleration-reentry` が残る
- **GOOGL 補完枠**としては `rsi2-buy-10-sell-70-rsp-filter-long-only-theme-shallow-dip` がまだ有効

## 関連 docs

- theme signal observation: [`theme-signal-observation-round7_2015_2025.md`](./theme-signal-observation-round7_2015_2025.md)
- theme shortlist: [`theme-strategy-shortlist-round7_2015_2025.md`](./theme-strategy-shortlist-round7_2015_2025.md)
- alt round7: [`theme-backtest-results-round7-alt_2015_2025.md`](./theme-backtest-results-round7-alt_2015_2025.md)
- raw snapshot: [`../references/backtests/round7-theme-mag7_20260405.json`](../references/backtests/round7-theme-mag7_20260405.json)
- summary snapshot: [`../references/backtests/round7-theme-mag7_20260405.summary.json`](../references/backtests/round7-theme-mag7_20260405.summary.json)
