# Round 9 Backtest Results — Alt Universe (2015–2025)

- ステータス: COMPLETED
- 実行方式: shard parallel -> exact unreadable rerun -> recovered summary
- universes:
  - `sp500-top10-point-in-time`
  - `mega-cap-ex-nvda`
- artifacts:
  - raw: `references/backtests/round9-theme-alt-shard-parallel_20260407_0325.json`
  - raw summary: `references/backtests/round9-theme-alt-shard-parallel_20260407_0325.summary.json`
  - recovered: `references/backtests/round9-theme-alt-shard-parallel-recovered_20260407_0344.json`
  - recovered summary: `references/backtests/round9-theme-alt-shard-parallel-recovered_20260407_0344.summary.json`
- coverage:
  - raw: `160 runs / 82 readable / 78 unreadable`
  - recovered: `160 runs / 126 readable / 34 unreadable / 44 recovered`

## 結果テーブル

| # | preset id | Avg Net Profit | PF | Max DD | Win Rate | Closed Trades | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict` | 9850.80 | 2.89 | 2661.53 | 50.26 | 19.08 | alt recovered 首位。ただし `12/20` readable で未確定要素あり |
| 2 | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide` | 9794.93 | 2.61 | 3638.05 | 50.35 | 20.00 | breadth-quality 改善版が一段浮上。`12/20` readable |
| 3 | `donchian-55-20-spy-filter-rsi14-regime-45-theme-quality-strict-relaxed` | 8287.83 | 2.53 | 2945.70 | 50.55 | 20.15 | `20/20` readable。最も扱いやすい安定候補 |
| 4 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 7588.04 | 2.26 | 3505.99 | 49.55 | 20.05 | `20/20` readable。deep-pullback の安定本線 |
| 5 | `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict` | 7548.24 | 2.25 | 3500.76 | 49.26 | 20.05 | `20/20` readable。tight とほぼ同格 |

## ランキング（Avg Net Profit 順）

1. `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict`
2. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide`
3. `donchian-55-20-spy-filter-rsi14-regime-45-theme-quality-strict-relaxed`
4. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
5. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict`
6. `donchian-55-20-spy-filter-rsi14-regime-50-hard-stop-6pct-theme-quality-strict-balanced-guarded`
7. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-6pct-theme-breadth-quality-strict`
8. `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-8pct-theme-breadth-early-guarded-wide`

## Cross-Universe 比較

| 観点 | Mag7 recovered | Alt recovered | 解釈 |
|---|---|---|---|
| quality-strict | #1 | #1 | upside は最強だが unreadable も残るため、採用判断は慎重にする |
| quality-strict-relaxed | #2 | #3 | 両 universe で上位維持。しかも alt は `20/20` readable |
| deep-pullback-tight / strict | Mag7 では中上位 | Alt では #4 / #5 | 地味だが安定。fallback として強い |
| breadth-quality-balanced-wide | Mag7 #5 | Alt #2 | 改善方向は当たり。ただし unreadable 残りが大きい |
| breadth-early-guarded-wide | Mag7 上位外 | Alt #8 | breadth の wide 化は family 全体では効くが、この枝自体は弱い |

## 観察メモ

- raw alt は `78 unreadable` で順位解釈に耐えなかったが、rerun 後は `34 unreadable` まで改善した。**alt でも recovered を正規結果として扱うべき**。
- alt best combo は両 universe とも `deep-pullback-strict__META` で一致し、Mag7 の NVDA 主導とかなり性格が違う。
- **運用上の第一候補**は `quality-strict-relaxed`。alt で `20/20` readable かつ両 universe 上位で、最も扱いやすい。
- **第二候補**は `deep-pullback-tight` と `deep-pullback-strict`。Readable 完走で、cross-universe fallback として優秀。
- `quality-strict` と `breadth-quality-balanced-wide` は平均値は高いが unreadable が `8/20` 残っているため、現時点では **watchlist 扱い**に留める。
