# External Priority Rollout — Phase 3 Observability Snapshot

## Problem

Phase 1 completed experiment gating and Phase 2 completed market-intel symbol analysis.  
The next approved direction is the agent-browser-inspired browser fallback / observability track, but the user explicitly selected the **safer bounded slice first**: a one-shot observability/debug layer before any browser fallback automation.

The repo already has most of the primitives needed for that slice:

- `src/core/health.js` returns active page/chart state
- `src/core/capture.js` captures screenshots safely into `docs/research/results/screenshots/`
- `src/core/backtest.js` already contains diagnostic/probe-oriented helpers
- `src/core/stream.js` demonstrates the repo preference for bounded, non-daemon collection
- `src/server.js` and `README.md` already expose additive MCP / CLI surfaces cleanly

There is **no overlap with other active exec-plans** because `docs/exec-plans/active/` was empty when this plan was drafted.

## Rationale

Observability/debug is the right next bounded step because it:

- reuses the current TradingView Desktop + CDP architecture instead of trying to replace it
- captures the most useful agent-browser-inspired value first: structured runtime state, artifacts, and error visibility
- improves supportability for later browser-fallback work without committing to automation complexity yet
- fits the repo's existing pattern of deterministic, one-shot tools instead of introducing an always-on runtime

In short: **surface what the current page/session looks like now**, with enough structure to debug CDP, TradingView page state, and future fallback decisions.

## Recommended Scope

Implement **Phase 3 only**: one additive observability surface that collects a deterministic debug snapshot bundle for the active TradingView page/session.

This phase should add:

- one core snapshot orchestrator
- one MCP tool
- one CLI command
- one deterministic artifact bundle under `docs/research/results/observability/`
- structured metadata such as:
  - resolved CDP endpoint / target info
  - current page URL / title
  - chart/runtime probe fields available cheaply from the active page
  - screenshot artifact path or inline capture mode
  - recent page/runtime errors when cheaply collectible
  - warnings / partial-failure notes instead of hard-failing the whole snapshot whenever possible

This phase should **not** add:

- browser fallback automation
- Playwright/Puppeteer style general browser runtime
- dashboard server
- always-on observer / background daemon
- continuous log streaming / recording
- generalized “record everything” tracing
- unrelated backtest/workspace/alert feature changes

## Proposed Public Shape

Prefer these additive public names unless implementation review finds a better repo-consistent variant:

- Core API: `captureObservabilitySnapshot(options)`
- MCP tool: `tv_observe_snapshot`
- CLI command: `tv observe snapshot`

Recommended response shape:

- `success`
- `snapshot_id`
- `generated_at`
- `bundle_dir`
- `connection`
  - `host`
  - `port`
  - `url`
  - `target_id`
  - `target_title`
  - `target_url`
- `page_state`
  - `url`
  - `title`
  - `chart_symbol`
  - `chart_resolution`
  - `chart_type`
  - `api_available`
- `runtime_probes`
  - bounded key/value fields only
- `artifacts`
  - `manifest_path`
  - `screenshot_path` or inline screenshot metadata
- `errors`
  - recent runtime/page errors if available
- `warnings`
  - partial capture / skipped domains / unsupported fields

Prefer saving artifacts to:

- `docs/research/results/observability/<snapshot-id>/manifest.json`
- `docs/research/results/observability/<snapshot-id>/page-state.json`
- `docs/research/results/observability/<snapshot-id>/runtime-errors.json`
- `docs/research/results/observability/<snapshot-id>/page.png`

## Files

### Create

- `src/core/observability.js`
  - one-shot snapshot orchestration
  - bundle directory naming / manifest generation
  - bounded runtime probe and error collection
- `src/tools/observe.js`
  - MCP registration for `tv_observe_snapshot`
- `src/cli/commands/observe.js`
  - CLI surface for `tv observe snapshot`
- `tests/observability.test.js`
  - unit coverage for snapshot result shape, artifact manifest shape, partial-failure handling
- `tests/e2e.observability.test.js`
  - bounded CDP-backed smoke test that skips when TradingView / CDP is unavailable

### Modify

- `src/core/health.js`
  - factor reusable page-state collection so observability can reuse it without duplicating logic
- `src/core/capture.js`
  - expose small additive helpers needed to save screenshot artifacts into the observability bundle safely
- `src/core/index.js`
  - export the new observability surface
- `src/server.js`
  - register the new MCP tool and document it in server instructions
- `src/cli/index.js`
  - load the new observe command
- `package.json`
  - include new unit/e2e test files in existing scripts
- `README.md`
  - document the new MCP tool and CLI command with one example each
- `tests/capture.test.js`
  - extend path/output helper coverage if capture bundle helpers are added

### Possible Modify (only if implementation needs it)

- `src/connection.js`
  - only if a tiny reusable helper is needed for endpoint/target diagnostic summary beyond existing exports

### Delete

- None

## Impact and Boundaries

- **Touched layers:** CDP diagnostics/read-only observation, screenshot capture reuse, MCP registration, CLI registration, README
- **Untouched layers:** fallback automation, workspace mutation flows, alert mutation flows, market-intel logic, backtest execution contract
- **Data collection model:** strictly one-shot and caller-triggered
- **Failure model:** prefer structured partial results with warnings over all-or-nothing failure when the connection exists but one probe/artifact fails

## Reuse Guidance

Reuse existing helpers where practical, but keep the implementation additive:

- reuse `health` page/chart-state logic for current URL/title/symbol/resolution/chart type
- reuse `capture` path safety and screenshot capture behavior for screenshot artifacts
- reuse diagnostic/probe ideas already present in `backtest` only when they are cheap and read-only
- follow `stream`'s bounded-collection philosophy, but do **not** turn observability into a polling loop

If reusing a `backtest` diagnostic helper would drag in backtest-specific assumptions, prefer a small observability-local helper instead.

## Implementation Steps

- [ ] Confirm final public naming for the core API, MCP tool, and CLI command
- [ ] Confirm the exact snapshot schema and which fields are required versus best-effort
- [ ] Define the bounded artifact layout under `docs/research/results/observability/`
- [ ] Decide whether screenshots default to saved artifact mode, inline mode, or both with an option gate
- [ ] Define the minimal set of runtime probes that are cheap, deterministic, and read-only
- [ ] Define the minimal error collection window (for example, a short one-shot listener window or immediate best-effort pull only)
- [ ] **RED:** add failing tests in `tests/observability.test.js` for required top-level snapshot keys and artifact manifest keys
- [ ] **RED:** add failing tests for partial-failure behavior so one failed probe does not discard the whole snapshot
- [ ] **RED:** add failing tests for deterministic bundle path handling and manifest content
- [ ] **RED:** extend `tests/capture.test.js` only if new capture helper behavior is introduced
- [ ] **RED:** add `tests/e2e.observability.test.js` as a skipped-when-unavailable smoke test for real CDP wiring
- [ ] **GREEN:** implement `src/core/observability.js` orchestration with small helper functions
- [ ] **GREEN:** refactor `src/core/health.js` for reusable page-state gathering
- [ ] **GREEN:** add any minimal additive capture helper needed for observability artifacts
- [ ] **GREEN:** export the new surface from `src/core/index.js`
- [ ] **GREEN:** expose the new surface through MCP as `tv_observe_snapshot`
- [ ] **GREEN:** expose the new surface through CLI as `tv observe snapshot`
- [ ] Update `README.md` with additive tool/command documentation and one snapshot example
- [ ] **REFACTOR:** isolate bundle building, warning/error normalization, and probe collection into small pure helpers

## Test Strategy

### RED -> GREEN -> REFACTOR

- **RED**
  - snapshot schema contains all required sections
  - bundle directory / manifest paths are deterministic and safe
  - partial failures become `warnings` / structured `errors`, not opaque crashes
  - MCP/CLI wiring reaches the new core surface correctly
  - e2e smoke confirms the tool can run against a real TradingView target when available
- **GREEN**
  - add the smallest one-shot implementation that satisfies the new tests
- **REFACTOR**
  - keep transport formatting separate from snapshot assembly
  - keep runtime probes small and pure where possible
  - keep artifact-writing helpers isolated from CDP orchestration

### Coverage Focus

- Unit coverage concentrated in `tests/observability.test.js`
- Focused helper regression in `tests/capture.test.js` only if needed
- One bounded E2E smoke in `tests/e2e.observability.test.js`
- No broad unrelated test expansion

## Validation Commands

- `node --test tests/observability.test.js`
- `node --test tests/capture.test.js tests/observability.test.js`
- `node --test tests/e2e.observability.test.js`
- `npm test`
- `npm run test:e2e`
- `node src/cli/index.js observe snapshot`

If a saved-artifact option is added, also validate a named output bundle path via CLI.

## Risks

- screenshot/base64 payloads can grow quickly if inline capture is the default
- runtime error collection may be noisy or empty depending on CDP domain availability and timing
- overreaching into `backtest` diagnostics could accidentally widen scope into strategy-specific debugging
- if snapshot failure semantics are too strict, the new surface will be less useful during degraded states
- if bundle layout is not deterministic, tests and downstream troubleshooting become brittle

## Out of Scope

- browser fallback execution
- autonomous retry / recovery flows
- dashboard UI or long-running debug server
- continuous streaming / timeline recording
- accessibility tree crawling beyond a tiny bounded probe if one is added at all
- mutation of TradingView page state beyond what existing helpers already do for safe observation
- changing existing `tv_health_check`, `tv_capture_screenshot`, or `tv_stream_price` contracts beyond additive reuse

## Approval Gate

Do not start implementation until the user approves this Phase 3 plan.
