# Round 11 Backtest Results — Mag7 (2015–2025)

- ステータス: COMPLETED
- 実行方式: shard parallel -> exact unreadable rerun -> recovered summary
- universe: Mag7（AAPL, AMZN, GOOGL, META, MSFT, NVDA, TSLA）
- artifacts:
  - raw: `docs/references/backtests/round11-period-slicing-mag7-shard-parallel_20260407_1641.json`
  - raw summary: `docs/references/backtests/round11-period-slicing-mag7-shard-parallel_20260407_1641.summary.json`
  - recovered: `docs/references/backtests/round11-period-slicing-mag7-shard-parallel-recovered_20260407_1641.json`
  - recovered summary: `docs/references/backtests/round11-period-slicing-mag7-shard-parallel-recovered_20260407_1641.summary.json`
- coverage:
  - raw: `105 runs / 53 readable / 52 unreadable`
  - recovered: `105 runs / 81 readable / 24 unreadable / 28 recovered`

## 結果テーブル

| # | preset id | Avg Net Profit | PF | Max DD | Win Rate | Closed Trades | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 36942.17 | 2.61 | 8362.09 | 46.72 | 21.00 | round10 anchor の tight baseline が Mag7 首位。`4/7` readable |
| 2 | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide` | 36444.15 | 3.87 | 4947.19 | 51.51 | 20.75 | breadth-quality baseline も僅差で追走。`4/7` readable |
| 3 | `donchian-50-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide-entry-early` | 34290.66 | 3.71 | 7022.15 | 48.78 | 20.80 | breadth-quality は entry short 側も強い。`5/7` readable |
| 4 | `donchian-55-18-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide-exit-tight` | 31220.37 | 3.38 | 7039.55 | 52.21 | 21.60 | breadth-quality は exit tight も上位を維持。`5/7` readable |
| 5 | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | 30766.65 | 3.59 | 6608.41 | 51.07 | 20.33 | strict anchor では entry short が最良。`6/7` readable |

## ランキング（Avg Net Profit 順）

1. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
2. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide`
3. `donchian-50-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide-entry-early`
4. `donchian-55-18-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide-exit-tight`
5. `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early`

## 観察メモ

- best combo は `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late__NVDA`。今回も NVDA 主導の伸びが非常に強い。
- **anchor ごとの Mag7 winner** は、strict = `entry-early`、tight = `baseline 55/20`、breadth-quality = `baseline 55/20` だった。
- breadth-quality 系は baseline / entry-early / exit-tight がまとめて top4 に入っており、period 感応度は「崩れた」より「強い近傍が複数ある」に近い。
- strict 系は baseline が 12 位まで下がり、Mag7 だけを見ると `50-20` の early entry 側へ寄せた方が良かった。
- recovered 後も `24 unreadable` が残っているため、phase B shortlist は Alt recovered と合わせて決める。
