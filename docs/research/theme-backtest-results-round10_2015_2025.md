# Round 10 Backtest Results — Mag7 (2015–2025)

- ステータス: COMPLETED
- 実行方式: shard parallel -> exact unreadable rerun -> recovered summary
- universe: Mag7（AAPL, AMZN, GOOGL, META, MSFT, NVDA, TSLA）
- artifacts:
  - raw: `docs/references/backtests/round10-top4-mag7-shard-parallel_20260407_0524.json`
  - raw summary: `docs/references/backtests/round10-top4-mag7-shard-parallel_20260407_0524.summary.json`
  - recovered: `docs/references/backtests/round10-top4-mag7-shard-parallel-recovered_20260407_0524.json`
  - recovered summary: `docs/references/backtests/round10-top4-mag7-shard-parallel-recovered_20260407_0524.summary.json`
- coverage:
  - raw: `70 runs / 37 readable / 33 unreadable`
  - recovered: `70 runs / 57 readable / 13 unreadable / 20 recovered`

## 結果テーブル

| # | preset id | Avg Net Profit | PF | Max DD | Win Rate | Closed Trades | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | `donchian-55-20-spy-filter-rsi14-regime-45-theme-quality-strict-relaxed` | 44311.70 | 3.21 | 10074.97 | 53.96 | 20.00 | top4 anchor の本命は Mag7 でも首位維持。`5/7` readable |
| 2 | `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict` | 35235.22 | 3.41 | 7631.42 | 51.23 | 19.80 | strict anchor が recovered 後に 2 位へ浮上。`5/7` readable |
| 3 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 31537.75 | 3.26 | 6720.02 | 48.98 | 21.00 | stable anchor。`6/7` readable |
| 4 | `donchian-55-20-rsp-filter-rsi14-regime-52-hard-stop-8pct-theme-breadth-quality-balanced-mid` | 31537.75 | 3.26 | 6720.02 | 48.98 | 21.00 | balanced-wide の strict 寄せ variant。`6/7` readable |
| 5 | `donchian-55-20-rsp-filter-rsi14-regime-57-hard-stop-6pct-theme-deep-pullback-tight-narrow` | 30742.18 | 3.02 | 6773.53 | 46.15 | 21.67 | deep-pullback の narrow stop variant が上位に残った。`6/7` readable |

## ランキング（Avg Net Profit 順）

1. `donchian-55-20-spy-filter-rsi14-regime-45-theme-quality-strict-relaxed`
2. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict`
3. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
4. `donchian-55-20-rsp-filter-rsi14-regime-52-hard-stop-8pct-theme-breadth-quality-balanced-mid`
5. `donchian-55-20-rsp-filter-rsi14-regime-57-hard-stop-6pct-theme-deep-pullback-tight-narrow`

## 観察メモ

- best combo は `donchian-55-20-spy-filter-rsi14-regime-45-theme-quality-strict-relaxed__NVDA`。今回も NVDA 主導の上振れが強い。
- round9 top4 anchor は依然として強く、特に `quality-strict-relaxed` と `deep-pullback-strict` は Mag7 recovered で頭一つ抜けた。
- 追加 variant では `breadth-quality-balanced-mid` と `deep-pullback-tight-narrow` が上位へ入った。top4 周辺の微調整は一定の意味があった。
- ただし recovered 後でも `13 unreadable` が残っているため、Mag7 単独で採用判断せず `docs/research/theme-backtest-results-round10-alt_2015_2025.md` を必ず合わせて見る。
