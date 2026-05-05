# Extreme Momentum Screener Redesign Plan 20260505_2359

## Goal

Redesign the US fundamental momentum screener so extreme winners such as `LITE` and `SNDK` are not discarded merely because 6M/12M performance is very large. The screener should intentionally surface the strongest momentum names while still reporting valuation/cash-flow risk.

## Scope

### Files to modify

- `src/core/fundamental-screener.js`
  - Remove the hard exclusion for `Perf.6M > 600` and `Perf.Y > 1000`.
  - Preserve price trend gates such as positive 3M momentum, price above moving averages, and 52-week high proximity.
  - Add explicit extreme-momentum flags/metadata so reports can explain when a name is hyper-extended rather than silently dropping it.

- `scripts/screener/run-fundamental-screening.mjs`
  - Update report wording from "data-quality guard excludes extreme performance" to "extreme momentum is retained and flagged".
  - Include an extreme-momentum note in risk/explanation text when relevant.

- `tests/fundamental-screener.test.js`
  - Add/adjust tests proving `SNDK` and `LITE`-like rows with `Perf.Y > 1000` remain eligible when other core trend gates pass.
  - Keep tests focused on the filter behavior and ranking output.

- `tests/daily-screener-report.test.js`
  - Update report expectations for the new extreme-momentum wording.

- `docs/reports/screener/daily-ranking.md`
  - Regenerate the US daily screener report after implementation.

### Files to move after implementation

- Move this plan from `docs/exec-plans/active/` to `docs/exec-plans/completed/`.

## Out of Scope

- Do not add a new market data provider.
- Do not remove P/FCF, EV/EBITDA, beta, ATR, or D/E from risk/value scoring.
- Do not hard-code `LITE` or `SNDK` into the final top list; they should appear because the scoring/filter design allows them.
- Do not change Japan behavior except where shared report wording naturally applies.

## Implementation Steps

- [x] Change the client filter so extreme 6M/12M performance is no longer a hard reject.
- [x] Add extreme-momentum metadata on normalized rows or public rows.
- [x] Update report text and risk notes to flag extreme performance instead of hiding it.
- [x] Extend tests for `Perf.Y > 1000` and `Perf.6M > 600` eligibility.
- [x] Regenerate `docs/reports/screener/daily-ranking.md` and confirm whether `LITE` / `SNDK` appear or, if not, identify the remaining scoring reason.
- [x] Run unit tests and diff checks.

## Review Checklist

- [x] LITE-like rows with very high 12M momentum are no longer excluded by data-quality guards.
- [x] SNDK-like rows with very high 12M momentum are no longer excluded by data-quality guards.
- [x] Reports still warn about extreme momentum, negative/unknown FCF, and leverage through risk text.
- [x] The implementation remains simple and avoids symbol-specific hacks.

## Validation Commands

- `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js`
- `SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs`
- `npm run test:unit`
- `git diff --check`

## Risks

- Removing the hard performance cap can let genuine data errors or stale corporate-action artifacts enter the candidate pool.
- Extreme momentum names may dominate the ranking even when cash-flow quality is weak; the report should make this visible rather than silently filtering them.
- If `LITE` still does not reach top 20 after the hard guard is removed, the remaining issue is ranking weight/risk scoring rather than eligibility.
