# Session log: round9 strong7 shard-parallel deepening

## Goal

- current docs guidance closeout を完了する
- round8 の cross-universe strong 7 を再定義する
- round9 を shard parallel 前提で実装・実行する

## Strong 7 anchors

1. `donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier`
2. `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced`
3. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
4. `donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-6pct-theme-quality-strict-guarded`
5. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-6pct-theme-breadth-quality-strict`
6. `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-early-guarded`
7. `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict`

## New round9 variants

1. `donchian-55-20-rsp-filter-rsi14-regime-40-hard-stop-6pct-theme-breadth-earlier-guarded`
2. `donchian-55-20-spy-filter-rsi14-regime-50-hard-stop-6pct-theme-quality-strict-balanced-guarded`
3. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict`
4. `donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-8pct-theme-quality-strict-guarded-wide`
5. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide`
6. `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-8pct-theme-breadth-early-guarded-wide`
7. `donchian-55-20-spy-filter-rsi14-regime-45-theme-quality-strict-relaxed`

## Execution standard

- parallel mode: `shard parallel`
- guidance source:
  - `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md`
  - `docs/command.md`
- no naive single-unreadable rollback
- canonical interpretation flow:
  1. full shard batch
  2. raw merge / summary
  3. exact unreadable pair rerun
  4. recovered summary を durable source of truth として採用

## Validation

- preset / generator targeted tests:
  - `node --test tests/preset-validation.test.js tests/backtest.test.js`
  - pass

## Artifacts

### Mag7

- raw:
  - `docs/references/backtests/round9-theme-mag7-shard-parallel_20260407_1132.json`
  - `docs/references/backtests/round9-theme-mag7-shard-parallel_20260407_1132.summary.json`
- recovered:
  - `docs/references/backtests/round9-theme-mag7-shard-parallel-recovered_20260407_1145.json`
  - `docs/references/backtests/round9-theme-mag7-shard-parallel-recovered_20260407_1145.summary.json`

### Alt

- raw:
  - `docs/references/backtests/round9-theme-alt-shard-parallel_20260407_0325.json`
  - `docs/references/backtests/round9-theme-alt-shard-parallel_20260407_0325.summary.json`
- recovered:
  - `docs/references/backtests/round9-theme-alt-shard-parallel-recovered_20260407_0344.json`
  - `docs/references/backtests/round9-theme-alt-shard-parallel-recovered_20260407_0344.summary.json`

## Result summary

### Mag7 recovered

- `98 runs / 81 readable / 17 unreadable / 27 recovered`
- top 5:
  1. `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict`
  2. `donchian-55-20-spy-filter-rsi14-regime-45-theme-quality-strict-relaxed`
  3. `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced`
  4. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict`
  5. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide`

### Alt recovered

- raw -> recovered: `82 readable / 78 unreadable` -> `126 readable / 34 unreadable`
- `44` exact-pair rerun recoveries
- top 5:
  1. `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict`
  2. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide`
  3. `donchian-55-20-spy-filter-rsi14-regime-45-theme-quality-strict-relaxed`
  4. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
  5. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict`

## Final conclusion

1. **Mag7 だけを見ると quality family が強いが、運用基準は alt recovered まで含めて決めるべき**
2. **実運用の primary candidate は `quality-strict-relaxed`**
   - Mag7 / alt の両方で上位
   - alt recovered で `20/20` readable
3. **`deep-pullback-tight` / `deep-pullback-strict` は stable fallback**
   - 両方とも alt `20/20` readable
4. **`quality-strict` と `breadth-quality-balanced-wide` は upside は高いが unreadable 残りが大きく、watchlist 扱い**

## Operational policy going forward

1. backtest の標準運用は **shard parallel**
2. raw summary をそのまま採用しない
3. unreadable は **exact pair rerun** で回収する
4. 最終判断は **recovered summary + readability count** で行う
5. unreadable が大きく残る top strategy は watchlist に留め、fully readable の近傍戦略を先に採用する

## Pending

- none
