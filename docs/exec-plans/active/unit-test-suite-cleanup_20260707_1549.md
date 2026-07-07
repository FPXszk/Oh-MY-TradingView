# unit-test-suite-cleanup_20260707_1549

## Goal

`npm run test:unit` を README、docs、フォルダ構造、戦略件数、過去生成物、AI 向け SKILL 文書の変更で壊れにくい、実装ロジック中心のテストスイートへ整理する。

## Current Findings

- Current branch is `main`, tracking `origin/main`, with a clean working tree before planning.
- `package.json` currently includes documentation and ops-contract tests in `test:unit`.
- Mechanical search found repository-structure and document dependencies in:
  - `tests/documentation-navigation.test.js`
  - `tests/strategy-docs.test.js`
  - `tests/agent-skills-conformance.test.js`
  - `tests/strategy-catalog.test.js`
  - `tests/campaign.test.js`
  - `tests/daily-screener-report.test.js`
  - `tests/windows-run-night-batch-self-hosted.test.js`
  - `tests/repo-paths.test.js`
  - `tests/my-scripts.test.js`
  - `tests/backtest.test.js`
- Many `existsSync` / `readFileSync` / `process.cwd()` usages are fixture-based behavior tests and will remain where they do not lock current repo documents or generated artifacts.

## Files To Delete

- `tests/documentation-navigation.test.js`
- `tests/strategy-docs.test.js`
- `tests/agent-skills-conformance.test.js`

## Files To Modify

- `package.json`
- `tests/campaign.test.js`
- `tests/daily-screener-report.test.js`
- `tests/strategy-catalog.test.js`
- `tests/repo-paths.test.js`
- `tests/my-scripts.test.js`
- `tests/backtest.test.js`

## Implementation Scope

- Remove tests that assert README/docs/session/skill/generated Pine file presence or fixed counts.
- Keep behavior tests for pure functions, validation, error handling, path traversal safety, and temporary-directory file operations.
- Convert valuable logic tests that currently depend on live repo catalog/path data to small fixtures or dependency injection where the implementation already supports it.
- Move workflow and Windows operations script string-contract tests out of `test:unit` into `test:contract` rather than deleting them.
- Do not restore or recreate removed documents, generated reports, Pine files, or session logs.

## Out Of Scope

- Changing production behavior except where a tiny dependency-injection seam is required for testability.
- Refactoring unrelated tests.
- Updating README/docs content or generated report artifacts.
- Changing strategy catalog contents.

## Steps

- [ ] Delete document/navigation/skill conformance tests and remove them from `test:unit`.
- [ ] Remove the generated Pine runtime safety block from `tests/campaign.test.js`.
- [ ] Remove the daily screener template test and unused `REPORT_TEMPLATE_PATH` from `tests/daily-screener-report.test.js`.
- [ ] Rewrite `tests/strategy-catalog.test.js` to remove fixed live/retired counts, giant live ID equality, and docs/research projection checks while preserving catalog integrity behavior on small fixture data.
- [ ] Convert `tests/repo-paths.test.js`, `tests/my-scripts.test.js`, and relevant `tests/backtest.test.js` cases away from live repo IDs/files where practical.
- [ ] Update `package.json` so `test:unit` excludes docs/structure/ops-contract tests and add `test:contract` for workflow/Windows operational contract tests.
- [ ] Review remaining repository-dependent tests and document why any remain.
- [ ] Run `npm run test:unit`, `npm run test:night-batch`, and `npm run test:contract` if added.

## Validation

- `npm run test:unit`
- `npm run test:night-batch`
- `npm run test:contract` if added

## Risks

- Some currently unit-listed tests may fail because they were relying on deleted documentation or generated artifacts.
- `test:night-batch` intentionally exercises Windows runner/night-batch contracts and may still depend on operational script paths; failures there must be classified separately from unit-suite cleanup.
