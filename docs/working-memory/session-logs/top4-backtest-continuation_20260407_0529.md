# Session log: top4 backtest continuation

## Goal

- `docs/tmp/round9-answer_20260407_0431.md` の上位4戦略を起点に round10 を継続する
- 現行の dual-worker / shard parallel 運用を守って Mag7 -> alt の順で backtest を進める
- `docs/research/latest/` を最新 handoff の入口として整備する

## Top4 anchors

1. `donchian-55-20-spy-filter-rsi14-regime-45-theme-quality-strict-relaxed`
2. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
3. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict`
4. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide`

## New round10 variants

1. `donchian-55-20-spy-filter-rsi14-regime-45-hard-stop-8pct-theme-quality-strict-relaxed-guarded`
2. `donchian-55-20-spy-filter-rsi14-regime-45-hard-stop-6pct-theme-quality-strict-relaxed-tight`
3. `donchian-55-20-rsp-filter-rsi14-regime-57-hard-stop-6pct-theme-deep-pullback-tight-narrow`
4. `donchian-55-20-rsp-filter-rsi14-regime-48-hard-stop-8pct-theme-deep-pullback-tight-early`
5. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-6pct-theme-deep-pullback-strict-narrow`
6. `donchian-55-20-rsp-filter-rsi14-regime-52-hard-stop-8pct-theme-breadth-quality-balanced-mid`

## Execution standard

- parallel mode: `shard parallel`
- guidance source:
  - `docs/design-docs/dual-worker-parallel-backtest-runbook_20260406_0735.md`
  - `command.md`
- no naive rollback
- canonical interpretation flow:
  1. full shard batch
  2. raw merge / summary
  3. exact unreadable pair rerun
  4. recovered summary を durable source of truth として採用

## Validation

- `npm test`
- review agent: no significant issues found

## Warm-up note

- `restore_policy: "skip"` / `restore_success: true` / `restore_skipped: true` は確認済み
- `tester_available: true` 3連続は安定達成できず、`metrics_unreadable` が断続的に発生
- そのため本番 batch は recovered summary 前提で解釈する

## Artifacts

### Mag7

- raw:
  - `docs/references/backtests/round10-top4-mag7-shard-parallel_20260407_0524.json`
  - `docs/references/backtests/round10-top4-mag7-shard-parallel_20260407_0524.summary.json`
- recovered:
  - `docs/references/backtests/round10-top4-mag7-shard-parallel-recovered_20260407_0524.json`
  - `docs/references/backtests/round10-top4-mag7-shard-parallel-recovered_20260407_0524.summary.json`

### Alt

- raw:
  - `docs/references/backtests/round10-top4-alt-shard-parallel_20260407_0620.json`
  - `docs/references/backtests/round10-top4-alt-shard-parallel_20260407_0620.summary.json`
- recovered:
  - `docs/references/backtests/round10-top4-alt-shard-parallel-recovered_20260407_0620.json`
  - `docs/references/backtests/round10-top4-alt-shard-parallel-recovered_20260407_0620.summary.json`

## Interim summary

- Mag7 recovered: `70 runs / 57 readable / 13 unreadable / 20 recovered`
- Mag7 top 3:
  1. `donchian-55-20-spy-filter-rsi14-regime-45-theme-quality-strict-relaxed`
  2. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict`
  3. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
- Alt recovered: `200 runs / 158 readable / 42 unreadable / 52 recovered`
- Alt top 3:
  1. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide`
  2. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict`
  3. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`

## Final conclusion

1. **今回の cross-universe 本線は `deep-pullback-strict` と `deep-pullback-tight`**
2. **改善継続の最重要 watchlist は `breadth-quality-balanced-wide`**
3. **Mag7 首位の `quality-strict-relaxed` は引き続き強いが、alt では単独本命とまでは言い切れない**

## Operational note

- current known-good は dual-worker / 2 worker parallel まで
- 4並列は今回も未検証で、別課題として切り分け
