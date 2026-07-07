# Fork main merge plan

Created: 2026-07-07 11:18 JST

## Goal

Merge the latest `main` branch from `SuzukiTsukasa/Oh-MY-TradingView` into the canonical upstream `FPXszk/Oh-MY-TradingView` `main`, push it, then pull the final upstream state back into `C:\00_mycode\Oh-MY-TradingView` and leave the local working tree clean.

## Current context

- Local repository: `C:\00_mycode\Oh-MY-TradingView`
- Current local branch: `main`
- Upstream remote: `origin git@github.com:FPXszk/Oh-MY-TradingView.git`
- Upstream baseline before plan: `3d52467f1c9400ffeddecea3f7a91e611f8b3cb7`
- Fork source: `git@github.com:SuzukiTsukasa/Oh-MY-TradingView.git`
- Fork source branch: `main`
- Fork target commit: `faa49b6b06566528fa97f30fb818cc4aacef8f75`
- Fork commit summary: `fix: slim repo delete old file`

## Files to create, modify, delete, or move

Plan phase:

- Create `docs/exec-plans/active/fork-main-merge_20260707_1118.md`
- Later move it to `docs/exec-plans/completed/fork-main-merge_20260707_1118.md`

Merge phase, based on `git diff --name-status origin/main..FETCH_HEAD`:

- Delete many historical documentation and reference files under:
  - `docs/exec-plans/active/`
  - `docs/exec-plans/completed/`
  - `docs/references/pine/`
  - `docs/reports/`
  - `docs/reports/screener/`
  - `docs/research/`
  - `docs/research/archive/`
  - `docs/sessions/`
  - `docs/sessions/archive/`
  - `docs/strategy/archive/`
- Add `docs/strategy/dr-k-chart-strategy-quantification-report_20260707.md`
- Rename `docs/strategy/Trade rule.md` to `docs/strategy/Trade-rule.md`
- Move `docs/sessions/windows-native-workspace-migration_20260620_1027.md` to `docs/sessions/archive/windows-native-workspace-migration_20260620_1027.md`

The merge is intentionally treated as a repository slimming/documentation restructure. It is not expected to change runtime source code.

## Impact scope

- High impact for repository history surface and documentation availability because the fork deletes many existing docs/reference files.
- Low expected runtime impact if the diff remains limited to docs/reference files.
- Potential CI/docs-link impact if tests or scripts assume deleted files exist.

## Out of scope

- No manual rewriting of the fork's content.
- No restoration of deleted docs unless the merge or validation proves the deletion is wrong.
- No GitHub token changes; Git transport remains SSH-based.

## Implementation steps

- [ ] Verify local `main` is clean and aligned with `origin/main`.
- [ ] Commit and push this plan only with message `docs: fork-main-merge_20260707_1118`.
- [ ] Fetch `SuzukiTsukasa/Oh-MY-TradingView` `main` again and verify target commit.
- [ ] Review merge diff summary and confirm the destructive doc/reference deletion set is intentional before final merge.
- [ ] Merge the fork commit into local `main`.
- [ ] Run validation:
  - [ ] `git diff --check`
  - [ ] repository test command if runtime files changed; otherwise explain why it was skipped
  - [ ] `git status --short --branch`
- [ ] Move this plan file from `docs/exec-plans/active/` to `docs/exec-plans/completed/`.
- [ ] Commit the completed merge with a Conventional Commit message.
- [ ] Push `main` to `origin` over SSH.
- [ ] Pull from `origin main` into local `main`.
- [ ] Verify final local state:
  - [ ] `git status --short --branch`
  - [ ] `git log --oneline --decorate --max-count 5`

## Risks

- The fork commit deletes a large number of docs/reference files. This is destructive and should not be merged blindly.
- Existing stale active exec-plans are part of the deletion set, which may be intentional cleanup but changes repository planning history.
- If upstream `main` changes while this runs, re-fetch and re-check before pushing.
