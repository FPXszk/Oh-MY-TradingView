# External Priority Rollout — Phase 4 Browser Fallback Launch

## Problem

Phase 1 experiment gating, Phase 2 market-intel symbol analysis, and Phase 3 observability snapshot are already completed.  
The next approved direction is a **bounded browser fallback** that complements the existing TradingView Desktop + CDP path without replacing it.

The repo is already in a good position for this slice:

- `src/core/launch.js` already owns the primary TradingView Desktop launch flow
- `src/tools/launch.js` and `src/cli/commands/launch.js` already show the repo’s launch-surface pattern
- `src/connection.js` already selects TradingView web/chart page targets generically enough for Chrome/Chromium-based fallback sessions
- Phase 3 observability snapshot gives us a safe debugging surface once a fallback browser session is launched

There is **no overlap with current active exec-plans** because `docs/exec-plans/active/` was empty when this plan was drafted.

## Short Rationale

The bounded Phase 4 move is to add a **launch-only browser fallback surface** for TradingView web/chart pages:

- useful when TradingView Desktop is unavailable or needs recovery support
- aligned with the external research guidance that `agent-browser` should be a fallback/complement, not the new primary runtime
- small enough to stay additive and safe
- immediately debuggable via the existing observability snapshot work

The phase must **not** widen into general browser automation, workspace parity, or Pine/backtest parity on the browser path.

## Recommended Bounded Scope for Phase 4

Implement **Phase 4 only**: an additive browser-fallback launch surface for a Chromium-based browser that opens a TradingView web/chart URL with remote debugging enabled.

This phase should add:

- one dedicated core launcher for browser fallback
- one MCP tool
- one CLI command
- explicit executable override support
- dry-run support
- a default TradingView chart URL
- bounded browser executable auto-detection for known Chromium-based candidates
- additive documentation clarifying fallback intent and limits

This phase should **not** add:

- any breaking change to the existing `tv_launch` desktop contract
- browser-side Pine editing parity
- browser-side backtest/workspace/alerts parity
- generic multi-tab browser automation
- Playwright / Puppeteer / agent-browser runtime integration
- new browser session management, retries, or recovery orchestration
- changes to `src/connection.js` target selection unless a tiny additive fix is proven necessary

## Exact Files to Create / Modify / Delete

### Create

- `src/core/browser-launch.js`
  - dedicated Chromium-based TradingView web/chart launch builder + launcher
  - default URL handling, dry-run response, known executable candidates, detached launch
- `src/tools/browser-launch.js`
  - MCP registration for the new browser fallback launch tool
- `src/cli/commands/browser-launch.js`
  - additive CLI command for browser fallback launch
- `tests/browser-launch.test.js`
  - unit coverage for command building, URL defaults, port validation, candidate-path behavior, and dry-run output

### Modify

- `src/core/index.js`
  - export the new browser launch surface
- `src/server.js`
  - register the new MCP tool and mention it in tool guidance text
- `src/cli/index.js`
  - load the new CLI command
- `package.json`
  - include `tests/browser-launch.test.js` in existing test scripts
- `README.md`
  - document the new MCP tool and CLI command
  - clarify that browser fallback is for bounded observation/recovery, not a desktop replacement

### Delete

- None

## Impacted Surfaces and Public Naming Recommendation

Recommended additive public names:

- Core API: `buildBrowserLaunchCommand(options)` and `launchBrowserFallback(options)`
- MCP tool: `tv_launch_browser`
- CLI command: `tv launch-browser`

Recommended option shape:

- `port` — remote debugging port, default `9222`
- `executablePath` / CLI `--path` — explicit browser executable override
- `url` — TradingView target URL, default `https://www.tradingview.com/chart/`
- `dryRun` / CLI `--dry-run` — print launch contract without executing

Recommended result shape:

- `success`
- `dry_run`
- `browser`
- `command`
- `args`
- `port`
- `url`
- `pid` (when executed)
- `hint`

Naming guidance:

- keep existing desktop launch names untouched
- use “browser” in the new public surface name so callers understand this is additive and separate from desktop launch
- keep “fallback” as documentation language, not necessarily part of the MCP/CLI command name

## Implementation Steps

- [ ] Confirm final public names for the core API, MCP tool, and CLI command
- [ ] Define the bounded browser candidate list (for example Chrome / Chromium / Edge known paths) without expanding into full browser management
- [ ] Confirm the default TradingView chart URL and whether user-provided `url` should accept any URL or be documented as TradingView-focused only
- [ ] Confirm the dry-run response schema and execution response schema
- [ ] **RED:** add failing tests in `tests/browser-launch.test.js` for required response keys and default URL behavior
- [ ] **RED:** add failing tests for valid/invalid port handling
- [ ] **RED:** add failing tests for explicit executable override and first-existing-candidate selection
- [ ] **RED:** add failing tests proving dry-run does not mutate launch/session state
- [ ] **GREEN:** implement `buildBrowserLaunchCommand(options)` in `src/core/browser-launch.js`
- [ ] **GREEN:** implement `launchBrowserFallback(options)` in `src/core/browser-launch.js` using detached launch behavior consistent with the desktop launcher
- [ ] **GREEN:** export the new browser launch surface from `src/core/index.js`
- [ ] **GREEN:** expose the new surface through MCP as `tv_launch_browser`
- [ ] **GREEN:** expose the new surface through CLI as `tv launch-browser`
- [ ] Update `README.md` with one MCP example and one CLI example, plus bounded fallback language
- [ ] **REFACTOR:** keep executable resolution, command building, and launch execution separated into small helpers
- [ ] **REFACTOR:** verify the implementation stays additive and does not refactor the current desktop launch path unnecessarily

## RED / GREEN / REFACTOR Test Strategy

### RED

Add failing tests for:

- required top-level response fields from the browser launch contract
- default TradingView chart URL injection
- invalid port rejection
- explicit executable-path precedence over auto-detected candidates
- dry-run behavior that returns the resolved command contract without launching

### GREEN

Implement the smallest additive browser launch surface that makes those tests pass:

- build the Chromium launch arguments
- open the default TradingView chart URL
- enable remote debugging on the requested port
- reuse the existing launch style (detached process, explicit command/args result) without changing desktop behavior

### REFACTOR

- keep browser candidate resolution isolated from process spawning
- keep documentation/wiring separate from launch construction logic
- avoid broad launcher abstraction unless duplication becomes clearly harmful

### Coverage Note

For this bounded phase, coverage should be concentrated in `tests/browser-launch.test.js`.  
No new automated browser E2E is required unless implementation introduces environment-stable hooks that make such a test reliable; real end-to-end browser-session validation is handled by manual launch + existing observability tools.

## Validation Commands

- `node --test tests/browser-launch.test.js`
- `npm test`
- `node src/cli/index.js launch-browser --dry-run`
- `node src/cli/index.js launch-browser --dry-run --url https://www.tradingview.com/chart/`

Optional local smoke validation when a Chromium executable is available:

- `node src/cli/index.js launch-browser --path /path/to/chromium --port 9333`
- then validate the launched session with existing observability/health flows as appropriate

## Risks

- Chromium executable auto-detection can be platform-fragile if the candidate list grows too broad
- opening TradingView web may land on login or marketing states depending on the local browser profile
- if the new tool promises too much, users may assume unsupported Pine/backtest/workspace parity on the fallback browser path
- over-sharing code with the desktop launcher could accidentally destabilize the existing primary launch path
- browser launch success does not guarantee a useful TradingView chart session unless documentation stays explicit

## Out of Scope

- replacing TradingView Desktop as the primary path
- modifying the current `tv_launch` contract
- browser automation beyond the initial launch
- login handling, cookie/profile management, or session repair flows
- browser-only Pine workflow support
- browser-only backtest/workspace/alert flows
- general web automation for non-TradingView sites
- broad CDP connection changes beyond what already works for TradingView page targets

## Explicit No-Overlap Note

This Phase 4 plan does **not** overlap with any current active exec-plan.  
At draft time, `docs/exec-plans/active/` contained no other active plan files.

## Approval Gate

Do not start implementation until the user approves this Phase 4 plan.
