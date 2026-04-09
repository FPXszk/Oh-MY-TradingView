# External Priority Rollout — Phase 1 Experiment Gating

## Problem

The external research identified several reusable ideas, but applying all of them at once would create too much surface area. We need a ranked rollout and a bounded first implementation that improves strategy research throughput without changing live TradingView control flows.

## Priority Ranking

1. **`rv64m/autotrade` inspired experiment loop / risk-profit gating**
   - Best fit with the existing backtest, preset, and campaign pipeline.
   - Delivers deterministic value without introducing LLM or browser complexity.
2. **`virattt/ai-hedge-fund` inspired analyst/reasoning schema**
   - Valuable after Phase 1, once there is a smaller set of promoted candidates to explain.
3. **`vercel-labs/agent-browser` style fallback browser / observability**
   - Useful as a resilience layer, but secondary to improving the research loop first.
4. **`mmt.gg` market data integration evaluation**
   - Relevant for later crypto-specific expansion, not the best first move for the current project.
5. **Other `vercel-labs` utility repos**
   - Helpful as supporting tooling later, not direct product leverage now.

## Recommended Scope

Implement **Phase 1 only**: a backtest experiment gating layer that turns existing campaign results into ranked promotion decisions.

This phase should add:

- numeric metric normalization for campaign/backtest outputs
- deterministic gate decisions: `promote`, `hold`, `reject`
- stable ranking/scoring across results
- additional campaign artifacts for gated summaries and ranked candidates
- one dedicated phase-1 campaign config with a small preset set

This phase should **not** add:

- LLM reasoning or analyst agents
- browser fallback automation
- new market data providers
- real order execution or auto-trading

## Files

### Create

- `src/core/experiment-gating.js`
- `tests/experiment-gating.test.js`
- `config/backtest/campaigns/external-phase1-priority-top.json`

### Modify

- `src/core/campaign.js`
- `scripts/backtest/run-long-campaign.mjs`
- `src/core/backtest.js` (only if metrics normalization needs extra structured fields)
- `tests/campaign.test.js`
- `tests/backtest.test.js` (only if needed for metrics-shape regression coverage)
- `README.md`
- `docs/DOCUMENTATION_SYSTEM.md`
- `command.md` (if campaign operation guidance needs updating)

### Delete

- None

## Impact and Boundaries

- **Touched layers:** research/backtest/campaign artifact pipeline
- **Untouched layers:** CDP control, workspace automation, alerts, existing market-intel surface
- Preserve existing outputs such as `final-results.json`, `recovered-results.json`, and `recovered-summary.json`; extend via additive artifacts instead of replacing current contracts.

## Implementation Steps

- [ ] Confirm a bounded preset set for the first rollout campaign and define the phase-1 campaign config
- [ ] Add campaign gate schema for thresholds such as `min_closed_trades`, `min_profit_factor`, `min_net_profit`, `max_drawdown_pct`, and `promote_top_n`
- [ ] **RED:** add failing unit tests for metric normalization from string-heavy TradingView outputs
- [ ] **RED:** add failing tests for gate decisions and explicit rejection reasons
- [ ] **RED:** add failing tests for stable ranking and tie-break behavior
- [ ] **RED:** add failing campaign-level tests proving resumed/effective results produce the same ranking artifacts
- [ ] **GREEN:** implement the minimal pure gating module in `src/core/experiment-gating.js`
- [ ] **GREEN:** wire gating/ranking aggregation into `src/core/campaign.js`
- [ ] **GREEN:** update `scripts/backtest/run-long-campaign.mjs` to emit additive artifacts such as `gated-summary.json` and `ranked-candidates.json`
- [ ] Update docs and command guidance for the new phase-1 campaign workflow
- [ ] **REFACTOR:** keep gating logic pure and separate artifact-writing concerns from ranking logic

## Test Strategy

### RED -> GREEN -> REFACTOR

- **RED**
  - normalization of values like `"$1,234.56"` and `"61.9%"`
  - `promote` / `hold` / `reject` classification with reasons
  - deterministic ranking when scores tie
  - stable output after recovery/resume paths
- **GREEN**
  - add the smallest implementation that satisfies the new unit/integration tests
- **REFACTOR**
  - isolate pure functions and reduce coupling between runner output and evaluation logic

### Coverage Focus

- Unit coverage for `src/core/experiment-gating.js`
- Integration coverage for campaign aggregation and artifact generation
- Regression coverage for metrics shape differences if `src/core/backtest.js` needs adjustment

## Validation Commands

- `npm test`
- `node --test tests/experiment-gating.test.js tests/campaign.test.js tests/backtest.test.js`
- `node scripts/backtest/run-long-campaign.mjs external-phase1-priority-top --phase smoke --dry-run`

## Risks

- Thresholds may be too arbitrary if not grounded in current result distributions
- Metrics may arrive in inconsistent shapes or units
- Resume/recovery paths may accidentally produce unstable rankings
- Existing consumers may depend on current artifact structure if additive output is not kept separate

## Out of Scope

- Phase 2 reasoning schema for `market-intel`
- Phase 3 browser fallback / observability work
- `mmt.gg` or other external data-source integrations
- any real trading or execution automation

## Approval Gate

Do not start implementation until the user approves this phase-1 plan.
