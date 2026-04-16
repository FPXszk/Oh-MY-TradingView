# Round 11 Backtest Results — Alt Universe (2015–2025)

- ステータス: COMPLETED
- 実行方式: shard parallel -> exact unreadable rerun -> recovered summary
- universes:
  - `sp500-top10-point-in-time`
  - `mega-cap-ex-nvda`
- artifacts:
  - raw: `references/backtests/round11-period-slicing-alt-shard-parallel_20260407_1641.json`
  - raw summary: `references/backtests/round11-period-slicing-alt-shard-parallel_20260407_1641.summary.json`
  - recovered: `references/backtests/round11-period-slicing-alt-shard-parallel-recovered_20260407_1641.json`
  - recovered summary: `references/backtests/round11-period-slicing-alt-shard-parallel-recovered_20260407_1641.summary.json`
- coverage:
  - raw: `300 runs / 106 readable / 194 unreadable`
  - recovered: `300 runs / 113 readable / 187 unreadable / 7 recovered`

## 結果テーブル

| # | preset id | Avg Net Profit | PF | Max DD | Win Rate | Closed Trades | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early` | 10893.76 | 2.85 | 3564.94 | 49.54 | 20.57 | alt では tight anchor の entry short が首位。`7/20` readable |
| 2 | `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight` | 9700.23 | 2.69 | 4379.94 | 54.40 | 20.00 | tight anchor の exit tight も上位。`10/20` readable |
| 3 | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | 9367.69 | 2.65 | 3482.74 | 53.35 | 20.63 | strict family では entry short が最良。`8/20` readable |
| 4 | `donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide` | 9320.79 | 2.45 | 4337.39 | 51.83 | 19.89 | tight family は wide exit も悪くない。`9/20` readable |
| 5 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 9220.57 | 2.52 | 3680.42 | 51.29 | 20.33 | tight baseline も still viable。`6/20` readable |

## ランキング（Avg Net Profit 順）

1. `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early`
2. `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight`
3. `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early`
4. `donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide`
5. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`

## 観察メモ

- recovered は `7 recovered` しか積めず、Alt は今回かなり **low-confidence**。特に `apply_failed` が重く、`mega-cap-ex-nvda` 側の readability も十分には回復しなかった。
- Alt 全体では **tight family** が明確に優勢で、baseline / entry-early / exit-tight / exit-wide が全部 top5 に入った。
- strict family では `entry-early (50-20)` が baseline / entry-late / exit variants を上回った。
- breadth-quality family は Mag7 ほど強くなく、Alt recovered では baseline が 10 位にとどまった。
- `sp500-top10-point-in-time` の best combo は `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early__META`、`mega-cap-ex-nvda` では `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight__META` だった。
