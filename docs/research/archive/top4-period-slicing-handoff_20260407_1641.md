# Top3 period slicing handoff

- status: COMPLETED
- anchor source: `docs/research/archive/top4-backtest-handoff_20260407_0529.md`
- latest docs entrypoint: `docs/research/current/README.md`

## Top3 anchors

1. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict`
2. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
3. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide`

## Round11 added period slices

1. `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early`
2. `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late`
3. `donchian-55-18-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-exit-tight`
4. `donchian-55-22-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-exit-wide`
5. `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early`
6. `donchian-60-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-late`
7. `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight`
8. `donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide`
9. `donchian-50-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide-entry-early`
10. `donchian-60-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide-entry-late`
11. `donchian-55-18-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide-exit-tight`
12. `donchian-55-22-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide-exit-wide`

## Execution policy

1. dual-worker / 2 worker parallel を維持した
2. shard parallel を維持した
3. raw summary をそのまま採用せず recovered summary を正規結果にした
4. unreadable は exact pair rerun で回収した
5. 4並列は今回も対象外のまま据え置いた

## Warm-up note

- worker1 / worker2 ともに `restore_policy: "skip"` 系 result shape を確認した
- round11 representative presets で **3 連続 `tester_available: true`** を通し、その後に本番 batch へ入った
- ただし phase A Alt では `apply_failed` が大きく残り、recovered でも readability の回復は限定的だった

## 4 parallel status

- 現時点の known-good は **dual-worker / 2 worker parallel** まで
- 4並列は今回も未検証・未実施

## Artifacts

### Mag7

- raw:
  - `references/backtests/round11-period-slicing-mag7-shard-parallel_20260407_1641.json`
  - `references/backtests/round11-period-slicing-mag7-shard-parallel_20260407_1641.summary.json`
- recovered:
  - `references/backtests/round11-period-slicing-mag7-shard-parallel-recovered_20260407_1641.json`
  - `references/backtests/round11-period-slicing-mag7-shard-parallel-recovered_20260407_1641.summary.json`

### Alt

- raw:
  - `references/backtests/round11-period-slicing-alt-shard-parallel_20260407_1641.json`
  - `references/backtests/round11-period-slicing-alt-shard-parallel_20260407_1641.summary.json`
- recovered:
  - `references/backtests/round11-period-slicing-alt-shard-parallel-recovered_20260407_1641.json`
  - `references/backtests/round11-period-slicing-alt-shard-parallel-recovered_20260407_1641.summary.json`

### Phase B shortlist subset

- raw:
  - `references/backtests/round11-universe-substitution-shard-parallel_20260407_1641.json`
  - `references/backtests/round11-universe-substitution-shard-parallel_20260407_1641.summary.json`
- recovered:
  - `references/backtests/round11-universe-substitution-shard-parallel-recovered_20260407_1641.json`
  - `references/backtests/round11-universe-substitution-shard-parallel-recovered_20260407_1641.summary.json`

## Final shortlist

1. `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early`
2. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
3. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide`

## Next decision gate

- strict family は `entry-early` が Mag7 #5 / Alt #3 で最も素直な cross-universe winner になった
- tight family は baseline が Mag7 #1 / Alt #5 / shortlist subset #1 で aggregate 首位を維持した
- breadth family は Alt で決定打が弱く、baseline が Mag7 #2 と `mega-cap-ex-nvda` の best combo を残したため、本線は baseline 維持とした
- 次に深掘るなら
  1. strict entry-early の non-Mag7 再現性
  2. tight baseline の readability 改善
  3. breadth baseline 周辺の symbol 依存（AAPL / NVDA）の切り分け
  を優先する
