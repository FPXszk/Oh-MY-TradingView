# Round 10 Backtest Results — Alt Universe (2015–2025)

- ステータス: COMPLETED
- 実行方式: shard parallel -> exact unreadable rerun -> recovered summary
- universes:
  - `sp500-top10-point-in-time`
  - `mega-cap-ex-nvda`
- artifacts:
  - raw: `references/backtests/round10-top4-alt-shard-parallel_20260407_0620.json`
  - raw summary: `references/backtests/round10-top4-alt-shard-parallel_20260407_0620.summary.json`
  - recovered: `references/backtests/round10-top4-alt-shard-parallel-recovered_20260407_0620.json`
  - recovered summary: `references/backtests/round10-top4-alt-shard-parallel-recovered_20260407_0620.summary.json`
- coverage:
  - raw: `200 runs / 106 readable / 94 unreadable`
  - recovered: `200 runs / 158 readable / 42 unreadable / 52 recovered`

## 結果テーブル

| # | preset id | Avg Net Profit | PF | Max DD | Win Rate | Closed Trades | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide` | 9011.55 | 2.44 | 3732.75 | 51.17 | 20.67 | round9 4番手 anchor が alt recovered 首位へ上昇。`15/20` readable |
| 2 | `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict` | 8218.61 | 2.41 | 3388.16 | 49.42 | 19.73 | strict anchor は Mag7 に続き alt でも上位。`15/20` readable |
| 3 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 8024.50 | 2.38 | 3352.20 | 49.19 | 20.13 | tight anchor も cross-universe で安定。`16/20` readable |
| 4 | `donchian-55-20-rsp-filter-rsi14-regime-52-hard-stop-8pct-theme-breadth-quality-balanced-mid` | 8024.50 | 2.38 | 3352.20 | 49.19 | 20.13 | balanced-wide の strict 寄せ variant。`16/20` readable |
| 5 | `donchian-55-20-spy-filter-rsi14-regime-45-theme-quality-strict-relaxed` | 7470.98 | 2.42 | 3010.58 | 51.37 | 20.53 | Mag7 首位 anchor は alt でも上位を維持。`15/20` readable |

## ランキング（Avg Net Profit 順）

1. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide`
2. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict`
3. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
4. `donchian-55-20-rsp-filter-rsi14-regime-52-hard-stop-8pct-theme-breadth-quality-balanced-mid`
5. `donchian-55-20-spy-filter-rsi14-regime-45-theme-quality-strict-relaxed`

## Cross-Universe 比較

| 観点 | Mag7 recovered | Alt recovered | 解釈 |
|---|---|---|---|
| `quality-strict-relaxed` | #1 | #5 | Mag7 の強さは維持したが、alt では non-quality 系に抜かれた |
| `deep-pullback-strict` | #2 | #2 | 両 universe で上位維持。最も素直な cross-universe anchor |
| `deep-pullback-tight` | #3 | #3 | strict と並ぶ stable fallback |
| `breadth-quality-balanced-wide` | #9 | #1 | Alt で大きく改善。top4 4番手の深掘りは当たり |
| `breadth-quality-balanced-mid` | #4 | #4 | wide の strict 寄せ variant も悪くないが、本線は wide 側が優位 |

## 観察メモ

- raw alt は `94 unreadable` あり、そのままでは解釈しづらかった。rerun 後に `42 unreadable` まで回復し、今回も recovered 採用が必須だった。
- best combo は両 universe とも `deep-pullback-tight__META`。Mag7 の NVDA 主導とはかなり違う。
- **cross-universe の主戦候補**は `deep-pullback-strict` と `deep-pullback-tight`。両方とも Mag7 / alt の両方で上位に残った。
- **改善継続の主軸**としては `breadth-quality-balanced-wide` が最重要。round9 の 4番手から alt 首位まで上がったため、次も周辺探索の価値が高い。
- `quality-strict-relaxed` は Mag7 の本命であり続けるが、alt では non-quality 系に後れを取った。採用判断は単独首位扱いではなく watch-strong 扱いが妥当。
