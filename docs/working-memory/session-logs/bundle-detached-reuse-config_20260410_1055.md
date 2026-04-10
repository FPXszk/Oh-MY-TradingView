# bundle-detached-reuse-config session log

- date: 2026-04-10
- scope: existing fine-tune bundle reuse via detached night batch config

## Request

- Reuse the existing `next-long-run-us-finetune-100x10` / `next-long-run-jp-finetune-100x10` campaign definitions
- Do **not** duplicate the 10 strategy IDs into the new night-batch JSON
- Restart from `smoke`, not from checkpoint resume
- Update docs
- Leave a session log
- Push all related changes

## Implementation notes

- Extended `python/night_batch.py` so `smoke-prod` can resolve either:
  - CLI-based single backtest configs (`strategies.smoke.cli` / `strategies.production.cli`)
  - bundle-oriented configs referencing existing campaign IDs
- Preserved backward compatibility for `config/night_batch/nightly.default.json`
- Added `config/night_batch/bundle-detached-reuse-config.json`
  - references `next-long-run-us-finetune-100x10`
  - references `next-long-run-jp-finetune-100x10`
  - uses `smoke` as synchronous gate
  - uses `full` as detached continuation
- Updated self-hosted workflow default config path to the new bundle config
- Updated docs to distinguish:
  - `nightly.default.json` as single-backtest sample
  - `bundle-detached-reuse-config.json` as the fine-tune bundle run config

## Validation

- `node --test tests/night-batch.test.js`
- `npm test`
- `python3 python/night_batch.py smoke-prod --config config/night_batch/bundle-detached-reuse-config.json --dry-run`

## Runtime status

- Started live run with:
  - `python3 python/night_batch.py smoke-prod --config config/night_batch/bundle-detached-reuse-config.json`
- Observed:
  - startup check fallback engaged (`127.0.0.1:9222` unavailable)
  - WSL preflight on `172.31.144.1:9223` succeeded
  - smoke phase entered
  - `next-long-run-us-finetune-100x10` started on port `9223`
  - latest observed smoke checkpoint during this session: `results/campaigns/next-long-run-us-finetune-100x10/smoke/checkpoint-20.json`

## Notes

- At the time this log was written, the smoke gate was still running and detached full had not yet been observed.
- Existing historical checkpoint files for the same campaigns remain in the repository workspace; current-session progress must be interpreted by mtime, not only by filename.
