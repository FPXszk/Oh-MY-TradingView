# US/JP live screener verification

## Goal

Push the newly implemented sector-specific Phase2 profiles through the live US and Japan screener workflows, then confirm whether the published outputs match the intended behavior.

## Files / surfaces in scope

- `.github/workflows/daily-screener.yml` (read-only verification target)
- `.github/workflows/daily-screener-japan.yml` (read-only verification target)
- `docs/reports/screener/daily-ranking.md` (may update if the US workflow is rerun)
- `docs/reports/screener/daily-ranking-jp.md` (expected to update when the Japan workflow is rerun)
- `docs/reports/screener/daily-ranking-run.json` / `daily-ranking-jp-run.json` (run metadata may update)
- GitHub Actions runs, jobs, logs, and artifacts for the two screener workflows

## Scope / impact

- No source-code changes are planned in this step.
- Main objective is operational verification:
  - confirm that the new sector-profile logic is actually reflected in live workflow output
  - compare US and JP behavior after the filter change
  - identify whether Japan now produces viable names and whether the US list changes in the expected direction

## Execution steps

- [ ] Inspect the current US/Japan screener workflow definitions and latest run state
- [ ] Run or review the US workflow result needed for post-change validation
- [ ] Dispatch the Japan workflow and wait for completion
- [ ] Review published reports, metadata, and artifacts for both markets
- [ ] Summarize whether live behavior matches the intended sector-profile design and call out any gaps

## Validation

- GitHub Actions runs complete successfully
- Updated markdown reports and metadata are published as expected
- US/JP outputs can be explained in terms of the new profile thresholds and exclusions

## Risks / watch points

- Self-hosted Windows runner availability may block dispatch or publication
- Live market data can change between runs, so comparison should focus on filter behavior, not exact symbol parity alone
- Existing published report files may update as part of workflow verification
