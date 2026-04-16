# Round-aware night batch layout — 2026-04-10 13:32 UTC

## Summary

Implemented round-aware artifact layout and explicit round selection for night_batch.py.

## Changes

### python/night_batch.py
- Added round management functions: `find_existing_rounds`, `resolve_round_dir`, `write_round_manifest`, `find_smoke_completed_in_round`
- Added `--round-mode` CLI arg to common parser (`advance-next-round` | `resume-current-round`)
- Added `--us-resume` / `--jp-resume` to `bundle` and `smoke-prod` subcommands
- Added `--output-dir` to `production-child` subparser (for round-aware detached child)
- Threaded `output_dir` through `configure_logger`, `write_summary`, `start_detached_production`, `execute_production_child`
- Resume-current-round auto-detects completed smoke and skips it; auto-finds latest campaign checkpoints for bundle resume

### scripts/backtest/run-finetune-bundle.mjs
- Added `--us-resume` / `--jp-resume` CLI options
- Campaign loop passes per-campaign resume checkpoint paths to `runCampaignPhase`

### config/backtest/campaigns
- `next-long-run-us-finetune-100x10.json`: smoke `symbol_count` 10 → 1 (10 runs/campaign)
- `next-long-run-jp-finetune-100x10.json`: smoke `symbol_count` 10 → 1 (10 runs/campaign)
- Total smoke: 20 runs (was 200)

### tests/night-batch.test.js
- Updated `readSummaryFromResult` to handle both flat and round-aware summary paths
- Added test: `advance-next-round creates a round directory and writes artifacts there`
- Added test: `resume-current-round errors when no round exists`
- Added test: `resume-current-round skips smoke when it already completed in the round`
- Added test: `bundle dry-run with --us-resume and --jp-resume passes resume args through`

### docs/command.md
- Added "Round management" section with advance/resume/dry-run commands
- Added "Manual recovery" section with checkpoint inspection and manual resume commands
- Updated smoke-prod flow description for round-mode output

### scripts/windows/run-night-batch-self-hosted.cmd
- Added optional second arg for round mode
- Wrapper auto-selects `resume-current-round` when a round already exists, otherwise `advance-next-round`

## Design decisions

1. **Backward compatible**: `--round-mode` is optional. Without it, everything works as before (flat layout).
2. **Explicit over implicit**: `resume-current-round` errors if no round exists; never silently creates.
3. **Reuses existing checkpoints**: Resume uses campaign checkpoint support, not a new backtest engine.
4. **Round manifest**: Simple JSON with round number, creation time, and run history.
5. **Smoke skip**: Detected from existing summary files in the round directory.

## Test results

- `node --test tests/night-batch.test.js tests/campaign.test.js` passed
- `npm test --silent` passed
