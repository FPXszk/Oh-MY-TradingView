---
name: repo-planning-discipline
description: Practical checklist for this repository's AGENTS.md exec-plan workflow, focused on active/completed plans, scope, tests, risks, approval, and implementation traceability.
---

# repo-planning-discipline

Use this checklist when preparing or reviewing an implementation plan for Oh-MY-TradingView. `AGENTS.md` is the source of truth; this skill is only a practical checklist.

## Planning Artifacts

| Artifact | Location | Purpose |
|---|---|---|
| Active exec-plan | `docs/exec-plans/active/<name>_YYYYMMDD_HHMM.md` | User-reviewed plan before implementation |
| Completed exec-plan | `docs/exec-plans/completed/<name>_YYYYMMDD_HHMM.md` | Final plan moved when implementation is complete |

Do not create planning files at the repository root. Check `docs/exec-plans/active/` before writing a new plan to avoid conflicting in-flight work.

## Required Plan Contents

Before asking for approval, ensure the plan states:

- Files to modify, delete, and create.
- Implementation scope and expected impact.
- Per-skill or per-module changes when the task spans multiple areas.
- Deletion decisions and the evidence behind them.
- Test strategy and exact validation commands.
- Risks and known uncertainties.
- Explicit out-of-scope items.
- How the plan will be moved to `docs/exec-plans/completed/` after implementation.

Use checkboxes for implementation steps so the final review can compare the approved plan with the actual diff.

## Pre-Implementation Checklist

- [ ] `AGENTS.md` has been read for the current turn.
- [ ] `.github/copilot-instructions.md` has been considered when relevant.
- [ ] `docs/exec-plans/active/` has no conflicting active plan.
- [ ] Current code / config / tests have been treated as source of truth.
- [ ] The plan names every file that may be changed.
- [ ] Validation commands are executable in the current Windows-native environment.
- [ ] User approval has been received before implementation begins.

## Implementation Traceability

During implementation:

- Keep edits scoped to the approved plan.
- If new evidence requires changing scope, stop and report the delta before expanding.
- Do not change `AGENTS.md` or `.github/copilot-instructions.md` unless the user explicitly approved that.
- Keep generated or unrelated cleanup out of the diff.
- When complete, verify each checkbox in the plan against the actual diff.

## Review Checklist

- [ ] The diff only touches planned files or explicitly justified additions.
- [ ] The implementation follows current repo patterns.
- [ ] No unused imports, isolated helpers, or obsolete files were introduced by the change.
- [ ] Tests cover the regression or contract the plan promised.
- [ ] E2E was either run or explicitly skipped with a reason.
- [ ] The active plan was moved to `docs/exec-plans/completed/`.
- [ ] Commit message uses Conventional Commits.
- [ ] Push status and final working tree state are reported.
