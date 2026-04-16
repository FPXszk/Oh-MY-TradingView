# Top3 period slicing results

- status: COMPLETED
- method: shard parallel -> exact unreadable rerun -> recovered summary

## Scope

- anchors: round10 で主軸化した top3
- variants: round11 period-slice 12 strategies
- total strategies: 15

## Artifacts

### Mag7

- raw: `references/backtests/round11-period-slicing-mag7-shard-parallel_20260407_1641.json`
- raw summary: `references/backtests/round11-period-slicing-mag7-shard-parallel_20260407_1641.summary.json`
- recovered: `references/backtests/round11-period-slicing-mag7-shard-parallel-recovered_20260407_1641.json`
- recovered summary: `references/backtests/round11-period-slicing-mag7-shard-parallel-recovered_20260407_1641.summary.json`

### Alt

- raw: `references/backtests/round11-period-slicing-alt-shard-parallel_20260407_1641.json`
- raw summary: `references/backtests/round11-period-slicing-alt-shard-parallel_20260407_1641.summary.json`
- recovered: `references/backtests/round11-period-slicing-alt-shard-parallel-recovered_20260407_1641.json`
- recovered summary: `references/backtests/round11-period-slicing-alt-shard-parallel-recovered_20260407_1641.summary.json`

### Phase B shortlist subset

- raw: `references/backtests/round11-universe-substitution-shard-parallel_20260407_1641.json`
- raw summary: `references/backtests/round11-universe-substitution-shard-parallel_20260407_1641.summary.json`
- recovered: `references/backtests/round11-universe-substitution-shard-parallel-recovered_20260407_1641.json`
- recovered summary: `references/backtests/round11-universe-substitution-shard-parallel-recovered_20260407_1641.summary.json`

## Result summary

### Mag7 recovered

- raw -> recovered: `53 readable / 52 unreadable` -> `81 readable / 24 unreadable`
- exact-pair rerun recoveries: `28`
- best combo: `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late__NVDA`
- top 5:
  1. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
  2. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide`
  3. `donchian-50-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide-entry-early`
  4. `donchian-55-18-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide-exit-tight`
  5. `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early`

### Alt

- raw -> recovered: `106 readable / 194 unreadable` -> `113 readable / 187 unreadable`
- exact-pair rerun recoveries: `7`
- best combo:
  - `sp500-top10-point-in-time`: `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early__META`
  - `mega-cap-ex-nvda`: `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight__META`
- top 5:
  1. `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early`
  2. `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight`
  3. `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early`
  4. `donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide`
  5. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`

### Phase B shortlist recovered

- shortlist:
  1. `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early`
  2. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
  3. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide`
- note: phase B は phase A の recovered/raw runs から shortlist 3 本だけを切り出して artifact 化した。追加 rerun は行わず、比較条件を phase A と揃えた。
- raw -> recovered: `30 readable / 51 unreadable` -> `35 readable / 46 unreadable`
- exact-pair rerun recoveries inherited in subset: `5`
- ranking:
  1. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
  2. `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early`
  3. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide`
- best combos by universe:
  - `mag7`: `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide__NVDA`
  - `sp500-top10-point-in-time`: `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early__META`
  - `mega-cap-ex-nvda`: `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide__AAPL`

## Final read

- Mag7 では tight baseline と breadth-quality baseline が強く、strict は `entry-early (50-20)` へ寄せた方が良かった
- Alt は全体として tight family 優勢、strict は `entry-early`、breadth-quality は Mag7 ほど伸びなかった
- **phase B shortlist** は以下 3 本で固定した
  1. `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early`
  2. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
  3. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide`
- shortlist subset recovered では **tight baseline** が aggregate 首位、**strict entry-early** が 2 位で non-Mag7 側の best combo を取り、**breadth baseline** は Mag7 / mega-cap-ex-NVDA で最良 combo を維持した
