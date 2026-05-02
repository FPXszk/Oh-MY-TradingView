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

## Validation

- `node --test tests/campaign.test.js`
- `node --test tests/windows-run-night-batch-self-hosted.test.js`

## Dispatch

- workflow to run:
  `gh workflow run night-batch-self-hosted.yml --field config_path=config/night_batch/emr-next-50pack-run84-failed-us40-config.json`
