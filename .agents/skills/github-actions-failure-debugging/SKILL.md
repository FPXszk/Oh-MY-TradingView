---
name: github-actions-failure-debugging
description: Systematic workflow for diagnosing and fixing this repository's GitHub Actions failures. Prefer workflow summaries and artifacts first, then structured logs, local reproduction, and verification.
---

# github-actions-failure-debugging

Use this runbook when a GitHub Actions run fails in Oh-MY-TradingView. The source of truth is the current workflow file, `package.json`, and the scripts called by the failing step.

## Current Workflows

The repository currently has these workflow files:

- `.github/workflows/night-batch-self-hosted.yml`
- `.github/workflows/night-batch-smoke.yml`
- `.github/workflows/daily-screener.yml`
- `.github/workflows/daily-screener-japan.yml`
- `.github/workflows/sbi-portfolio-capture.yml`
- `.github/workflows/portfolio-health-check.yml`
- `.github/workflows/moomoo-portfolio-diagnostics.yml`

Do not assume a workflow exists unless it is present under `.github/workflows/`.

## Diagnosis Order

1. Identify the workflow, run id, run attempt, branch, commit SHA, trigger, and failed job.
2. Read the workflow summary and uploaded artifacts before raw logs when they exist.
3. Inspect the failed job step and the 100-300 lines around the first real error.
4. Compare the failing step with the command in the current workflow file.
5. Reproduce locally only after the summary, artifacts, and logs do not explain the failure.
6. Make the smallest fix, run the matching local tests, then monitor the next workflow run.

Use whatever GitHub access is available in the host: GitHub connector tools, `gh run view`, `gh run watch`, `gh run download`, the GitHub UI, or the downloaded log archive. Avoid writing the runbook around one specific MCP tool name.

## Test Commands

Use `package.json` as the source of truth:

| Purpose | Command |
|---|---|
| Normal core / CLI / docs unit coverage | `npm run test:unit` |
| Workflow / contract checks | `npm run test:contract` |
| Night Batch / Windows runner logic | `npm run test:night-batch` |
| TradingView Desktop + CDP behavior | `npm run test:e2e` |
| Full local suite including E2E | `npm run test:all` |

For workflow YAML or docs-only changes, run the smallest relevant Node test first, then `npm run test:unit` when the change is repo-facing.

## Windows Runner And Night Batch

For `night-batch-self-hosted.yml` and `night-batch-smoke.yml`, check these in order:

- Runner labels and state: the job requires `self-hosted` and `windows`.
- Shell boundary: some steps use `cmd`, some use `powershell -NoProfile -ExecutionPolicy Bypass -command ". '{0}'"`, and some use `pwsh`. Reproduce with the same shell when possible.
- TradingView readiness:
  - "Ensure TradingView is running"
  - "Readiness diagnostics (non-blocking)"
  - "Wait for TradingView connection (required gate)"
  - CDP host / port from the Night Batch config, usually `127.0.0.1:9222`.
- Production wrapper:
  - `scripts\windows\run-night-batch-self-hosted.cmd`
  - `python/night_batch.py`
  - `scripts/backtest/wait-for-tradingview-readiness.mjs`
- Workflow summary:
  - `scripts/windows/github-actions/append-night-batch-workflow-summary.ps1`
  - `GITHUB_STEP_SUMMARY`
- Output discovery:
  - `scripts/windows/github-actions/find-night-batch-outputs.ps1`
  - `artifacts/night-batch/`
  - `results/night-batch/` as a fallback search root in the script.
- Uploaded artifact:
  - `night-batch-${{ github.run_id }}-${{ github.run_attempt }}`
  - includes the located round directory and campaign artifact directories.

Important Night Batch files to inspect from the target run:

- `*-summary.json`
- `*-summary.md`
- `*-rich-report.md`
- `*-combined-ranking.json`
- `*-live-checkout-protection.json`
- campaign manifest JSON / Markdown paths referenced by the summary
- campaign artifact directories listed by `find-night-batch-outputs.ps1`

Common Night Batch failure classes:

| Symptom | First checks |
|---|---|
| Job queued forever | self-hosted Windows runner online and labels match |
| CDP connection timeout | TradingView process, debug port, config host / port, readiness diagnostic output |
| Smoke passes but production fails | `NIGHT_BATCH_CONFIG`, `NIGHT_BATCH_RUN_ID`, wrapper exit code, summary JSON failed step |
| Artifact missing | output discovery step, summary file name, round directory path, campaign artifact paths |
| Live checkout protection failure | `*-live-checkout-protection.json`, baseline path, blocked files |
| PowerShell parse/path issue | exact shell used by the step, Windows path quoting, CRLF/path separator handling |

## Screener Workflows

For `daily-screener.yml` and `daily-screener-japan.yml`:

- Install step: `npm ci --silent`.
- Main command: `node scripts/screener/run-fundamental-screening.mjs`.
- Validate report step checks generated report output with `pwsh`.
- Metadata is written with `github.run_id` and `github.run_attempt`.
- Artifact names:
  - `screener-report-${{ github.run_id }}`
  - `screener-report-japan-${{ github.run_id }}`
- Publish step uses `scripts/windows/github-actions/sync-daily-screener-report-to-main.ps1`.
- LINE notification can be skipped or fail for missing secrets; separate notification issues from screener failures.

If publish fails with a checkout / origin mismatch, treat it as a `main` publish race until the logs prove otherwise.

## Portfolio And Moomoo Workflows

For `sbi-portfolio-capture.yml`:

- CDP probe is explicit.
- Capture path is `node scripts/sbi/capture-portfolio-data.mjs`.
- Report path is `node scripts/sbi/build-portfolio-report.mjs`.
- Artifact name is `sbi-portfolio-capture-${{ github.run_id }}`.
- Publish uses `scripts/windows/github-actions/sync-portfolio-reports-to-main.ps1`.

For `portfolio-health-check.yml`:

- Moomoo read-only diagnostics run first.
- SBI CDP capture is optional and controlled by workflow inputs.
- Unified portfolio report is built after Moomoo / SBI outputs.
- Artifact name is `portfolio-health-check-${{ github.run_id }}`.

For `moomoo-portfolio-diagnostics.yml`:

- Python runtime is checked with `python --version`.
- `moomoo-api` is installed into the runtime for the workflow.
- Main command is `node scripts/moomoo/run-portfolio-diagnostics.mjs`.
- Artifact name is `moomoo-portfolio-diagnostics-${{ github.run_id }}`.
- Failures often come from OpenD reachability, Python runtime, or unavailable account data rather than Node test failures.

## Local Reproduction

When local reproduction is needed:

1. Stay in the Windows-native checkout: `C:\00_mycode\Oh-MY-TradingView`.
2. Confirm the current branch and commit match the failing run if exact reproduction matters.
3. Run the same command as the failing workflow step, using the same shell family when practical.
4. Set only the environment variables required by that step.
5. Run the smallest matching test script, then `npm run test:unit` for repo-facing changes.

Do not start TradingView Desktop for documentation, unit, or contract-only changes. Start it only for CDP-dependent reproduction or E2E verification.

## Fix And Verify

After identifying the cause:

- Make the smallest code, config, workflow, or docs change that addresses the failure.
- Run the targeted local command or test first.
- Run the broader suite required by the changed area.
- If the workflow publishes to `main`, check whether `origin/main` moved during the run before treating publish failure as a logic regression.
- Push only after local verification and review.
