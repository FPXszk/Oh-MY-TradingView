# External Priority Rollout — Phase 2 Market Intel Symbol Analysis

## Problem

Phase 1 completed the experiment-gating layer and intentionally deferred the `ai-hedge-fund`-inspired reasoning surface. The approved Phase 2 move is to add a **bounded, deterministic, schema-first symbol analysis** feature inside the existing `market-intel` surface so promoted symbols can be explained with structured analyst-style output.

There is **no overlap with other active exec-plans** because `docs/exec-plans/active/` was empty when this plan was drafted.

## Recommended Scope

Implement **Phase 2 only**: a single-symbol market-intel analysis surface that combines the existing Yahoo Finance-backed inputs into one stable response contract.

This phase should add:

- one deterministic symbol-analysis schema
- additive synthesis of:
  - quote
  - fundamentals
  - recent news
  - TA summary
- analyst-style sections with explicit structured fields:
  - `trend_analyst`
  - `fundamentals_analyst`
  - `news_analyst`
  - `risk_analyst`
  - `overall_summary`
- one core orchestration function for symbol analysis
- one MCP tool
- one CLI command
- focused unit/integration-style tests around the new surface only

This phase should **not** add:

- LangGraph
- any multi-agent or debate workflow
- LLM-generated prose
- portfolio/watchlist/basket analysis
- new market data vendors
- changes to existing quote/fundamentals/news/snapshot/screener/ta contracts beyond additive reuse

## Proposed Contract Direction

Prefer these additive names unless implementation review finds a better repo-consistent variant:

- Core API: `getSymbolAnalysis(symbol)`
- MCP tool: `market_symbol_analysis`
- CLI command: `tv market analysis --symbol AAPL`

Response shape should remain schema-first and deterministic, for example:

- `success`
- `symbol`
- `generated_at`
- `source`
- `inputs`
  - `quote`
  - `fundamentals`
  - `ta_summary`
  - `news`
- `analysis`
  - `trend_analyst`
  - `fundamentals_analyst`
  - `news_analyst`
  - `risk_analyst`
  - `overall_summary`

Each analyst section should expose structured fields such as:

- `stance` (`bullish` / `neutral` / `bearish`)
- `confidence` (`low` / `medium` / `high`)
- `signals` (deterministic bullet list / string array)
- `warnings` (string array, may be empty)

The schema should tolerate partial upstream data and still return a valid response with explicit limitations instead of throwing away the whole analysis.

## Files

### Create

- `src/core/market-intel-analysis.js`
  - pure deterministic schema builder / heuristics
  - section-level helper functions for trend/fundamentals/news/risk/overall summary
- `tests/market-intel-analysis.test.js`
  - schema and heuristic unit coverage with mocked upstream inputs

### Modify

- `src/core/market-intel.js`
  - add orchestration function that fetches/reuses quote, fundamentals, news, and TA summary for one symbol
  - keep fetch/normalization responsibilities here, but delegate analysis synthesis to the new pure module
- `src/core/index.js`
  - export the new symbol-analysis surface
- `src/tools/market-intel.js`
  - register MCP tool `market_symbol_analysis`
- `src/cli/commands/market-intel.js`
  - add `analysis` subcommand and usage text
- `tests/market-intel.test.js`
  - add only focused wiring/regression coverage if needed for mocked-fetch orchestration behavior
- `README.md`
  - document the new MCP tool and CLI command with one example each

### Delete

- None

## Impact and Boundaries

- **Touched layers:** `market-intel` core composition, MCP registration, CLI registration, README
- **Untouched layers:** backtest/campaign pipeline, CDP/browser control, workspace, alerts, experiment gating, e2e flows
- Keep analysis **symbol-scoped only**
- Reuse existing Yahoo Finance-backed inputs already available inside `market-intel`
- Keep logic deterministic and inspectable; no hidden prompting or model calls
- Preserve current public market-intel outputs; the new surface must be additive

## Heuristic Boundaries

To keep scope bounded, the first implementation should use simple explicit rules instead of open-ended reasoning:

- **Trend analyst**
  - derive stance from price change, RSI14 band, and SMA20/SMA50 deviation direction
- **Fundamentals analyst**
  - derive stance/signals from PE, margins, growth, ROE, debt-to-equity, beta when available
- **News analyst**
  - summarize recency/count and lightweight headline cues only
  - avoid full sentiment/NLP systems; use deterministic keyword/shape-based heuristics if needed
- **Risk analyst**
  - flag volatility, high beta, negative growth, elevated leverage, overbought/oversold extremes, sparse-data conditions
- **Overall summary**
  - merge section stances into one bounded final stance and concise reason list

## Implementation Steps

- [ ] Confirm the exact response schema, including required top-level keys and per-section fields
- [ ] Confirm final public names for the core function, MCP tool, and CLI command
- [ ] Define deterministic heuristics for each analyst section and explicit precedence rules when signals conflict
- [ ] **RED:** add failing tests in `tests/market-intel-analysis.test.js` for required schema sections and field shapes
- [ ] **RED:** add failing tests for bullish / neutral / bearish section outputs from controlled synthetic inputs
- [ ] **RED:** add failing tests for partial-data behavior so the schema remains valid when one upstream input is sparse or missing
- [ ] **RED:** add focused mocked-fetch orchestration coverage in `tests/market-intel.test.js` only if needed to verify quote/fundamentals/news/TA composition
- [ ] **GREEN:** implement pure synthesis helpers in `src/core/market-intel-analysis.js`
- [ ] **GREEN:** implement `getSymbolAnalysis(symbol)` orchestration in `src/core/market-intel.js`
- [ ] **GREEN:** export the new surface from `src/core/index.js`
- [ ] **GREEN:** expose the new surface through MCP as `market_symbol_analysis`
- [ ] **GREEN:** expose the new surface through CLI as `tv market analysis --symbol <TICKER>`
- [ ] Update `README.md` with additive tool/command documentation
- [ ] **REFACTOR:** remove duplicated rule/formatting logic, keep synthesis pure, and keep transport formatting separate from analysis logic

## Test Strategy

### RED -> GREEN -> REFACTOR

- **RED**
  - schema contains all required analyst sections
  - section stances are deterministic for controlled input combinations
  - missing/sparse quote, fundamentals, news, or TA data degrades gracefully
  - MCP/CLI wiring reaches the new analysis surface correctly
- **GREEN**
  - add the smallest deterministic implementation that satisfies the new tests
- **REFACTOR**
  - isolate heuristics into small pure helpers and keep orchestration/fetch logic separate

### Coverage Focus

- Unit coverage concentrated in `tests/market-intel-analysis.test.js`
- Mocked-fetch orchestration coverage in `tests/market-intel.test.js` only where it protects the new contract
- No broad unrelated test expansion
- No new e2e coverage in this phase

## Validation Commands

- `node --test tests/market-intel-analysis.test.js`
- `node --test tests/market-intel.test.js tests/market-intel-analysis.test.js`
- `npm test`

`npm run test:e2e` and `npm run test:all` are explicitly **not required** for this bounded phase unless implementation unexpectedly touches broader surfaces.

## Risks

- Yahoo Finance data density may vary across symbols, making section completeness inconsistent
- Deterministic news heuristics may be too noisy if headline rules are not tightly bounded
- Overly complicated scoring rules could create hidden coupling and unstable expectations
- MCP/CLI responses may drift if schema generation and presentation logic are mixed together
- README examples may become stale if the public command/tool names change during implementation

## Out of Scope

- full `ai-hedge-fund` replication
- multi-agent collaboration or committee-style analyst flows
- LLM reasoning, prompts, or external AI services
- multi-symbol comparative analysis beyond existing `ta-rank`
- portfolio/watchlist rollups
- browser-assisted enrichment
- new external data integrations
- replacing existing `market_quote`, `market_fundamentals`, `market_news`, `market_snapshot`, `market_screener`, `market_ta_summary`, or `market_ta_rank`

## Approval Gate

Do not start implementation until the user approves this Phase 2 plan.
