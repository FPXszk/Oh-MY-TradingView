# Top4 backtest handoff

- status: COMPLETED
- anchor source: `docs/tmp/round9-answer_20260407_0431.md`
- latest docs entrypoint: `docs/research/current/README.md`

## Top4 anchors

1. `donchian-55-20-spy-filter-rsi14-regime-45-theme-quality-strict-relaxed`
2. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
3. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict`
4. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide`

## Round10 added variants

1. `donchian-55-20-spy-filter-rsi14-regime-45-hard-stop-8pct-theme-quality-strict-relaxed-guarded`
2. `donchian-55-20-spy-filter-rsi14-regime-45-hard-stop-6pct-theme-quality-strict-relaxed-tight`
3. `donchian-55-20-rsp-filter-rsi14-regime-57-hard-stop-6pct-theme-deep-pullback-tight-narrow`
4. `donchian-55-20-rsp-filter-rsi14-regime-48-hard-stop-8pct-theme-deep-pullback-tight-early`
5. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-6pct-theme-deep-pullback-strict-narrow`
6. `donchian-55-20-rsp-filter-rsi14-regime-52-hard-stop-8pct-theme-breadth-quality-balanced-mid`

## Execution policy

1. dual-worker / 2 worker parallel を維持する
2. shard parallel を優先する
3. raw summary をそのまま採用しない
4. unreadable は exact pair rerun で回収する
5. 最終判断は recovered summary を正規結果にする

## Warm-up note

- `restore_policy: "skip"` / `restore_success: true` / `restore_skipped: true` は確認済み
- ただし `tester_available: true` 3連続は安定達成できず、`metrics_unreadable` が断続的に混ざる
- そのため current policy を守りつつ、結果解釈は recovered summary 前提で行う

## 4 parallel status

- 現時点の known-good は **dual-worker / 2 worker parallel** まで
- 4並列は今回の実施範囲に含めず、未検証の別課題として扱う

## Artifacts

### Mag7

- raw:
  - `references/backtests/round10-top4-mag7-shard-parallel_20260407_0524.json`
  - `references/backtests/round10-top4-mag7-shard-parallel_20260407_0524.summary.json`
- recovered:
  - `references/backtests/round10-top4-mag7-shard-parallel-recovered_20260407_0524.json`
  - `references/backtests/round10-top4-mag7-shard-parallel-recovered_20260407_0524.summary.json`

### Alt

- raw:
  - `references/backtests/round10-top4-alt-shard-parallel_20260407_0620.json`
  - `references/backtests/round10-top4-alt-shard-parallel_20260407_0620.summary.json`
- recovered:
  - `references/backtests/round10-top4-alt-shard-parallel-recovered_20260407_0620.json`
  - `references/backtests/round10-top4-alt-shard-parallel-recovered_20260407_0620.summary.json`

## Next decision gate

- Mag7 recovered は `70 runs / 57 readable / 13 unreadable / 20 recovered`
- Mag7 の一旦の上位は
  1. `donchian-55-20-spy-filter-rsi14-regime-45-theme-quality-strict-relaxed`
  2. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict`
  3. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
- alt recovered は `200 runs / 158 readable / 42 unreadable / 52 recovered`
- cross-universe では
  1. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide`
  2. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict`
  3. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
  が上位に残った
