# Run84 Failed Strategies Rerun Session

- session date: `2026-05-02`
- source workflow: `Night Batch Self Hosted #84`
- source run id: `25216630873`
- source artifact: `night-batch-25216630873-1`
- source campaign: `emr-next-50pack-us40`

## Findings

- workflow conclusion was `success`, but the smoke campaign result was `4 / 50 success`, `46 / 50 failure`
- the 46 failed presets were recorded as `apply_failed=true` and `tester_reason="Skipped: strategy not applied"`
- the failed-only rerun target should be the 46 smoke-failed presets, not the 230 failed full runs
- canceled rerun to ignore: `25242230444`
  - this run was triggered before the smoke failure count was re-verified from `recovered-summary.json`
  - it was canceled after confirming that `#84` smoke had not passed

## Changes

- added failed-only campaign: `config/backtest/campaigns/emr-next-50pack-run84-failed-us40-pack.json`
- added night batch config: `config/night_batch/emr-next-50pack-run84-failed-us40-config.json`
- updated campaign / workflow config tests for the new failed-only rerun path
- updated `src/core/pine.js` so Pine keyboard compile focuses Monaco before `Ctrl+Enter`, and apply button discovery also covers `[role="button"]`
- updated `src/core/backtest.js` to resolve strategy attach verification against the executable Pine `strategy(title=...)` instead of preset display name
- updated `src/core/backtest.js` to perform one clean-slate recompile when attach verification ends in `preexisting_matching_strategy_only`
- added title extraction coverage in `tests/backtest.test.js`

## Local Smoke

- local verification was done before workflow dispatch, using per-preset CLI runs against `TV_CDP_HOST=172.31.144.1` / `TV_CDP_PORT=9223`
- first sequential pass over the 46 failed presets improved to `43 / 46 success`
- the remaining 3 presets were:
  - `emr-next-vol20x20`
  - `emr-next-stop-atr20x`
  - `emr-next-entry-hist3-closefa`
- all 3 remaining presets passed when re-run individually after the backtest / Pine fixes
- root cause was twofold:
  - generated `emr-next-*` presets share the same executable Pine `strategy(title=...)`, so verification by `preset.name` produced false `apply_failed`
  - keyboard fallback compile could fire without editor focus, causing TradingView not to apply the strategy reliably
- an additional local runner with retries showed empty-process exits from the wrapper itself, so local truth was taken from successful per-preset JSON runs rather than bundle-level stale artifacts

## Validation

- `node --test tests/backtest.test.js`
- `node --test tests/pine.smart-compile.test.js`
- `node --test tests/campaign.test.js`
- `node --test tests/windows-run-night-batch-self-hosted.test.js`

## Dispatch

- workflow to run:
  `gh workflow run night-batch-self-hosted.yml --field config_path=config/night_batch/emr-next-50pack-run84-failed-us40-config.json`
