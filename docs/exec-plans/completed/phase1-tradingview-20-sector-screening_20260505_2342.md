# Phase1 TradingView 20 Sector Screening Plan 20260505_2342

## Goal

Change the US fundamental screener premise so Phase1 evaluates TradingView stock `sector` values directly, rather than ranking 12 ETF proxy buckets and only expanding the top buckets into TradingView sectors.

This should make symbols such as `LITE` (`Producer Manufacturing`) eligible for Phase1 sector strength evaluation when their TradingView sector ranks well.

## Scope

### Files to modify

- `src/core/sector-momentum.js`
  - Use stock aggregation for the US market as the Phase1 sector strength source.
  - Expand the US selected-sector validation from 12 ETF buckets to the observed TradingView stock-sector universe.
  - Keep the existing stock aggregation behavior for Japan.

- `src/core/sector-screening-profiles.js`
  - Replace US 12-bucket profile activation with TradingView stock-sector profile activation.
  - Add or reshape US profiles so each active profile corresponds to one TradingView `sector`.
  - Keep semiconductor-specific handling for `Electronic Technology` rows where industry/symbol indicates semiconductors.

- `scripts/screener/run-fundamental-screening.mjs`
  - Update report wording so the Phase1 approach and conditions no longer imply 12 ETF proxy buckets for US.

- `tests/fundamental-screener.test.js`
  - Update existing tests that assume US sector ETF Phase1.
  - Add focused coverage showing `Producer Manufacturing` can become an active US Phase2 scope when Phase1 stock aggregation selects it.

- `docs/reports/screener/daily-ranking.md`
  - Regenerate the US daily screener report after implementation.

### Files to move after implementation

- Move this plan from `docs/exec-plans/active/` to `docs/exec-plans/completed/`.

## Out of Scope

- Do not change the final stock ranking formula weights unless required by the 20-sector Phase1 change.
- Do not remove the `Perf.6M > 600` / `Perf.Y > 1000` data-quality guards in this task.
- Do not add new external data providers.
- Do not change Japan screening behavior except where shared helpers require compatible naming.

## Implementation Steps

- [x] Update `sector-momentum.js` so `market === "america"` uses stock aggregation and validates selected sector count against the TradingView sector universe.
- [x] Update US sector profiles to activate from TradingView stock-sector labels directly.
- [x] Preserve semiconductor special handling without blocking non-semiconductor `Electronic Technology` names from a sensible profile.
- [x] Adjust report labels/condition text for stock-sector aggregation.
- [x] Update tests to cover the new US Phase1 behavior and `Producer Manufacturing` activation.
- [x] Regenerate `docs/reports/screener/daily-ranking.md` with the new 20-sector premise.

## Review Checklist

- [x] Phase1 rankings list TradingView stock sectors, not ETF bucket labels.
- [x] Phase2 request scopes are derived from selected TradingView sectors.
- [x] `Producer Manufacturing` can be selected and screened when its Phase1 rank is high.
- [x] Existing semiconductor `SNDK`/`MU` handling remains compatible.
- [x] The report explains the new premise clearly.

## Validation Commands

- `npm run test:unit -- tests/fundamental-screener.test.js`
- `node scripts/screener/run-fundamental-screening.mjs`
- `git diff --check`

## Risks

- US Phase1 coverage depends on the scanner range limit. If the market has more than `STOCK_RANGE_LIMIT` eligible names, sector averages may still be based on a truncated market-cap sorted sample.
- Some TradingView sectors need profile thresholds that were previously inherited from a broad ETF bucket. The first implementation should keep simple, conservative threshold reuse rather than inventing many new knobs.
- `Miscellaneous` may need a broad but conservative fallback profile, or it may be intentionally excluded if it is too heterogeneous.
