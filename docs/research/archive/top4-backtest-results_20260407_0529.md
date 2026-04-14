# Top4 backtest results

- status: COMPLETED
- method: shard parallel -> exact unreadable rerun -> recovered summary

## Scope

- anchors: round9 top4
- variants: round10 6 strategies
- total strategies: 10

## Artifacts

### Mag7

- raw: `docs/references/backtests/round10-top4-mag7-shard-parallel_20260407_0524.json`
- raw summary: `docs/references/backtests/round10-top4-mag7-shard-parallel_20260407_0524.summary.json`
- recovered: `docs/references/backtests/round10-top4-mag7-shard-parallel-recovered_20260407_0524.json`
- recovered summary: `docs/references/backtests/round10-top4-mag7-shard-parallel-recovered_20260407_0524.summary.json`

### Alt

- raw: `docs/references/backtests/round10-top4-alt-shard-parallel_20260407_0620.json`
- raw summary: `docs/references/backtests/round10-top4-alt-shard-parallel_20260407_0620.summary.json`
- recovered: `docs/references/backtests/round10-top4-alt-shard-parallel-recovered_20260407_0620.json`
- recovered summary: `docs/references/backtests/round10-top4-alt-shard-parallel-recovered_20260407_0620.summary.json`

## Result summary

### Mag7 recovered

- raw -> recovered: `37 readable / 33 unreadable` -> `57 readable / 13 unreadable`
- exact-pair rerun recoveries: `20`
- best combo: `donchian-55-20-spy-filter-rsi14-regime-45-theme-quality-strict-relaxed__NVDA`
- top 5:
  1. `donchian-55-20-spy-filter-rsi14-regime-45-theme-quality-strict-relaxed`
  2. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict`
  3. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
  4. `donchian-55-20-rsp-filter-rsi14-regime-52-hard-stop-8pct-theme-breadth-quality-balanced-mid`
  5. `donchian-55-20-rsp-filter-rsi14-regime-57-hard-stop-6pct-theme-deep-pullback-tight-narrow`

### Alt

- raw -> recovered: `106 readable / 94 unreadable` -> `158 readable / 42 unreadable`
- exact-pair rerun recoveries: `52`
- best combo: `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight__META`
- top 5:
  1. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide`
  2. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict`
  3. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
  4. `donchian-55-20-rsp-filter-rsi14-regime-52-hard-stop-8pct-theme-breadth-quality-balanced-mid`
  5. `donchian-55-20-spy-filter-rsi14-regime-45-theme-quality-strict-relaxed`

## Final read

- Mag7 では `quality-strict-relaxed` が首位を維持した
- Alt recovered では `breadth-quality-balanced-wide` が首位へ浮上した
- top4 anchor の中では **`deep-pullback-strict` と `deep-pullback-tight` が最も cross-universe で安定**
- `breadth-quality-balanced-wide` は round9 4番手から一段上がり、継続改善対象として妥当
