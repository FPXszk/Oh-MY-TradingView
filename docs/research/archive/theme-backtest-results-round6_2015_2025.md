# Round6 テーマトレンド・Mag7 バックテスト結果 (2015-2025)

## メタデータ

- raw-source: `../references/backtests/round6-theme-mag7_20260405.json`
- summary-source: `../references/backtests/round6-theme-mag7_20260405.summary.json`
- run-count: `70`
- success-count: `70`
- tester-available-count: `61`
- symbols: `AAPL`, `MSFT`, `GOOGL`, `AMZN`, `META`, `NVDA`, `TSLA`
- strategy-count: `10`

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
  - round6 も **session artifact runner** で実行
  - repo CLI / MCP の公開実装は引き続き `nvda-ma` 固定

## 結論

round6 の Mag7 では、**55/20 persistence family が再び主導権を握った**。  
首位は `donchian-55-20-spy-filter-rsi14-regime-55`、2 位は `donchian-55-20-rsp-filter-rsi14-regime-50`、3 位は `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct` で、上位 4 本のうち 4 本が 55/20 系だった。

一方で round6 の acceleration family も失速したわけではない。  
`donchian-20-10-rsp-filter-rsi14-regime-55-hard-stop-6pct` と `donchian-20-10-spy-filter-rsi14-regime-55-hard-stop-6pct` は 5〜6 位に入り、**テーマ初動を取る 20/10 は補完枠として残る** ことが確認できた。

RSI dip reclaim 群はポートフォリオ平均では breakout 上位に届かなかったが、`GOOGL` の best strategy は `rsi2-buy-10-sell-65-rsp-filter-long-only` だった。  
つまり round6 の Mag7 では、**RSI long-only は主役ではなく、breakout が鈍い銘柄の補完枠** と読むのが自然だった。

ただし Mag7 集計には注意が必要で、`tester_available_count = 61 / 70` と欠測が 9 run あった。  
特に上位 4 本の 55/20 群は `GOOGL` 欠測を含み、20/10 fast-rotation 群は `MSFT` 欠測を含むため、**Mag7 単体の順位はそのまま確定結論にせず alt rerun で再確認する必要があった**。

## strategy_summary

| rank | strategy_id | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | best_symbol |
|---|---|---:|---:|---:|---:|---|
| 1 | `donchian-55-20-spy-filter-rsi14-regime-55` | 38692.75 | 3.138 | 8768.58 | 52.90 | `NVDA` |
| 2 | `donchian-55-20-rsp-filter-rsi14-regime-50` | 31904.60 | 3.041 | 8151.71 | 52.09 | `NVDA` |
| 3 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct` | 31592.58 | 3.274 | 6901.36 | 49.51 | `NVDA` |
| 4 | `donchian-55-20-spy-filter-rsi14-regime-50-hard-stop-8pct` | 26933.69 | 2.807 | 6102.48 | 47.90 | `NVDA` |
| 5 | `donchian-20-10-rsp-filter-rsi14-regime-55-hard-stop-6pct` | 26000.93 | 2.326 | 5911.47 | 46.88 | `NVDA` |
| 6 | `donchian-20-10-spy-filter-rsi14-regime-55-hard-stop-6pct` | 25824.83 | 2.370 | 5527.11 | 47.71 | `NVDA` |
| 7 | `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-10pct` | 23804.40 | 2.246 | 7299.02 | 50.71 | `NVDA` |
| 8 | `donchian-20-10-rsp-filter-rsi14-regime-50-hard-stop-10pct` | 20067.84 | 2.000 | 7839.81 | 47.54 | `NVDA` |
| 9 | `rsi2-buy-10-sell-65-rsp-filter-long-only` | 12615.90 | 1.986 | 5412.52 | 73.29 | `NVDA` |
| 10 | `rsi3-buy-15-sell-65-spy-filter-long-only` | 6995.68 | 1.796 | 4731.91 | 70.21 | `NVDA` |

## 解釈メモ

- Mag7 の中心テーマでは **55/20 + market/breadth filter + RSI regime** が最も強かった
- `donchian-55-20-rsp-filter-rsi14-regime-50` は Mag7 でも breadth を伴う persistence proxy として十分に強い
- `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct` は純利益をやや削る代わりに PF と DD の質を改善した
- `20/10` 側では `SPY/RSP + RSI regime + stop` が一通りプラスで、**テーマ加速の執行器としては成立** している
- `rsi2-buy-10-sell-65-rsp-filter-long-only` は全体順位では 9 位だが、`GOOGL` の best strategy になっており **laggard 補完枠** として意味がある

## symbol_summary

| symbol | avg_net_profit | avg_profit_factor | avg_max_drawdown | best_strategy | best_net_profit |
|---|---:|---:|---:|---|---:|
| `NVDA` | 79490.52 | 3.823 | 10056.56 | `donchian-55-20-spy-filter-rsi14-regime-55` | 150230.10 |
| `TSLA` | 25820.70 | 1.882 | 15894.26 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct` | 37458.35 |
| `AAPL` | 14929.52 | 2.874 | 2988.84 | `donchian-20-10-spy-filter-rsi14-regime-55-hard-stop-6pct` | 22988.26 |
| `META` | 14796.93 | 2.913 | 4227.88 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct` | 29187.99 |
| `MSFT` | 8241.63 | 2.102 | 2384.63 | `donchian-55-20-spy-filter-rsi14-regime-50-hard-stop-8pct` | 13325.36 |
| `AMZN` | 7470.77 | 1.758 | 4908.55 | `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-10pct` | 16886.58 |
| `GOOGL` | 2426.56 | 1.360 | 2529.35 | `rsi2-buy-10-sell-65-rsp-filter-long-only` | 5642.27 |

## top_combos

| rank | strategy_id | symbol | net_profit | profit_factor | max_drawdown | win_rate |
|---|---|---|---:|---:|---:|---:|
| 1 | `donchian-55-20-spy-filter-rsi14-regime-55` | `NVDA` | 150230.10 | 4.678 | 19003.32 | 57.14 |
| 2 | `donchian-55-20-rsp-filter-rsi14-regime-50` | `NVDA` | 112145.93 | 4.780 | 13224.87 | 55.00 |
| 3 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct` | `NVDA` | 98778.89 | 4.503 | 8674.67 | 43.48 |
| 4 | `donchian-20-10-rsp-filter-rsi14-regime-55-hard-stop-6pct` | `NVDA` | 88550.41 | 4.388 | 9877.66 | 45.71 |
| 5 | `donchian-55-20-spy-filter-rsi14-regime-50-hard-stop-8pct` | `NVDA` | 84034.13 | 4.170 | 7662.93 | 40.00 |
| 6 | `donchian-20-10-spy-filter-rsi14-regime-55-hard-stop-6pct` | `NVDA` | 83585.70 | 4.231 | 8093.75 | 45.95 |
| 7 | `donchian-20-10-rsp-filter-rsi14-regime-50-hard-stop-10pct` | `NVDA` | 75761.28 | 3.585 | 9878.39 | 48.48 |
| 8 | `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-10pct` | `NVDA` | 61216.14 | 3.025 | 9440.08 | 47.22 |
| 9 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct` | `TSLA` | 37458.35 | 2.330 | 17608.64 | 40.00 |
| 10 | `donchian-55-20-spy-filter-rsi14-regime-50-hard-stop-8pct` | `TSLA` | 37401.78 | 2.328 | 17608.64 | 40.00 |

## tester metrics 欠測メモ

Mag7 では `tester_available_count = 61 / 70` で、欠測 9 run はすべて `fallback_source = chart_bars_local` だった。  
これらは単なる tester 読み取り不能ではなく、**`apply_failed = true` かつ `tester_reason = "Skipped: strategy not applied"`** で記録されている。

1. `MSFT`
   - `donchian-20-10-spy-filter-rsi14-regime-55-hard-stop-6pct`
   - `donchian-20-10-rsp-filter-rsi14-regime-55-hard-stop-6pct`
   - `rsi2-buy-10-sell-65-rsp-filter-long-only`
   - `rsi3-buy-15-sell-65-spy-filter-long-only`
2. `GOOGL`
   - `donchian-55-20-spy-filter-rsi14-regime-55`
   - `donchian-55-20-rsp-filter-rsi14-regime-50`
   - `donchian-55-20-spy-filter-rsi14-regime-50-hard-stop-8pct`
   - `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct`
   - `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-10pct`

summary 集計はこれらを除外しているため、**Mag7 の 55/20 優位はそのまま断定せず alt rerun で breadth / robustness を再確認する前提** だった。

## 次の読み筋

1. Mag7 では 55/20 persistence family が勝ったが、欠測を踏まえて alt で robust 性を再確認する
2. `donchian-55-20-rsp-filter-rsi14-regime-50` は breadth を伴う継続テーマの本命候補として残す
3. `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-10pct` は AMZN / AAPL 側の加速テーマ proxy として評価を続ける
4. RSI long-only は breakout 代替ではなく **GOOGL のような鈍い銘柄の補完枠** として扱う

## 関連 docs

- theme signal observation: [`theme-signal-observation-round6_2015_2025.md`](./theme-signal-observation-round6_2015_2025.md)
- theme shortlist: [`theme-strategy-shortlist-round6_2015_2025.md`](./theme-strategy-shortlist-round6_2015_2025.md)
- alt round6: [`theme-backtest-results-round6-alt_2015_2025.md`](./theme-backtest-results-round6-alt_2015_2025.md)
- raw snapshot: [`../references/backtests/round6-theme-mag7_20260405.json`](../references/backtests/round6-theme-mag7_20260405.json)
- summary snapshot: [`../references/backtests/round6-theme-mag7_20260405.summary.json`](../references/backtests/round6-theme-mag7_20260405.summary.json)
