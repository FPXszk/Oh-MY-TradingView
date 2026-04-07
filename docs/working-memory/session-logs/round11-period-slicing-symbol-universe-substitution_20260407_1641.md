# Session log: round11 period slicing and universe substitution

## Goal

- round10 で主軸化した 3 anchor の **period slicing** を先に検証する
- その後に、shortlist 3 本の **symbol / universe 差分** を比較可能な形で残す
- dual-worker / shard parallel / exact unreadable pair rerun / recovered summary の運用を守る

## What was prepared first

- `docs/exec-plans/active/round11-period-slicing-symbol-universe-substitution_20260407_0729.md`
- round11 preset 12 本を `config/backtest/strategy-presets.json` へ追加
- `tests/preset-validation.test.js` / `tests/backtest.test.js` に round11 RED を追加
- focused GREEN と full `npm test` (`236 / 236`) を通した

## Warm-up and readiness

- worker1 / worker2 の `status` は両方 success
- round11 representative presets で dual-worker warm-up を実施
- 最終的に **3 連続 `tester_available: true`** を確認した
- `restore_policy: "skip"` / `restore_success: true` / `restore_skipped: true` も確認した

## Phase A: Mag7

- raw:
  - `105 runs / 53 readable / 52 unreadable`
- recovered:
  - `105 runs / 81 readable / 24 unreadable / 28 recovered`
- Mag7 recovered top 5:
  1. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
  2. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide`
  3. `donchian-50-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide-entry-early`
  4. `donchian-55-18-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide-exit-tight`
  5. `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early`
- strict family では baseline より `entry-early (50-20)` が良かった
- breadth-quality family は baseline / entry-early / exit-tight がまとまって上位に残った

## Phase A: Alt

- raw:
  - `300 runs / 106 readable / 194 unreadable / 90 apply_failed`
- recovered:
  - `300 runs / 113 readable / 187 unreadable / 7 recovered / 90 apply_failed`
- Alt recovered top 5:
  1. `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early`
  2. `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight`
  3. `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early`
  4. `donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide`
  5. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
- Alt は tight family 優勢だったが、recovered でも改善幅が小さく low-confidence
- `unknown` として見えていた run は、実体としては `apply_failed: true` / `study_added: false` を含む no-strategy-applied 系が中心だった

## Phase B handling

- originally planned “phase B backtests” は、phase A で既に
  - `mag7`
  - `sp500-top10-point-in-time`
  - `mega-cap-ex-nvda`
  の全 runs が取れていたため、**shortlist 3 本だけを phase A raw / recovered から切り出す形**に変更した
- 理由:
  1. 同じ warmed state での結果をそのまま比較できる
  2. redundant rerun を避けられる
  3. phase A と phase B の比較条件を崩さない

## Final shortlist and subset result

- shortlist:
  1. `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early`
  2. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
  3. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide`
- subset recovered:
  - `81 runs / 35 readable / 46 unreadable / 5 recovered`
- subset ranking:
  1. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
  2. `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early`
  3. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide`

## Durable outputs created

- research docs:
  - `docs/research/theme-backtest-results-round11_2015_2025.md`
  - `docs/research/theme-backtest-results-round11-alt_2015_2025.md`
- latest docs:
  - `docs/research/latest/top4-period-slicing-handoff_20260407_1641.md`
  - `docs/research/latest/top4-period-slicing-results_20260407_1641.md`
- references:
  - `docs/references/backtests/round11-period-slicing-mag7-shard-parallel_20260407_1641.json`
  - `docs/references/backtests/round11-period-slicing-mag7-shard-parallel_20260407_1641.summary.json`
  - `docs/references/backtests/round11-period-slicing-mag7-shard-parallel-recovered_20260407_1641.json`
  - `docs/references/backtests/round11-period-slicing-mag7-shard-parallel-recovered_20260407_1641.summary.json`
  - `docs/references/backtests/round11-period-slicing-alt-shard-parallel_20260407_1641.json`
  - `docs/references/backtests/round11-period-slicing-alt-shard-parallel_20260407_1641.summary.json`
  - `docs/references/backtests/round11-period-slicing-alt-shard-parallel-recovered_20260407_1641.json`
  - `docs/references/backtests/round11-period-slicing-alt-shard-parallel-recovered_20260407_1641.summary.json`
  - `docs/references/backtests/round11-universe-substitution-shard-parallel_20260407_1641.json`
  - `docs/references/backtests/round11-universe-substitution-shard-parallel_20260407_1641.summary.json`
  - `docs/references/backtests/round11-universe-substitution-shard-parallel-recovered_20260407_1641.json`
  - `docs/references/backtests/round11-universe-substitution-shard-parallel-recovered_20260407_1641.summary.json`
