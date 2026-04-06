# Exec Plan: Parallel TradingView backtest operational verification

## Problem

Prior session work established a stable dual-worker environment that is reachable from WSL:

- worker1: `172.31.144.1:9223 -> 127.0.0.1:9222`
- worker2: `172.31.144.1:9225 -> 127.0.0.1:9224`
- stable worker2 launch:
  `C:\TradingView\TradingView.exe --remote-debugging-port=9224 --user-data-dir=C:\TradingView\profiles\worker2 --in-process-gpu`

However, the repository still assumes a single CDP endpoint in `src/connection.js`, `README.md` documents only single-endpoint CLI usage, `src/cli/commands/backtest.js` exposes only `tv backtest nvda-ma`, and `src/core/backtest.js` performs a fixed backtest flow. The next task is to verify operationally whether two backtests can actually run at the same time against the two known endpoints, and to identify the real blocker if they cannot.

## Approach

Treat this as an **environment-level verification task first**, not an immediate multi-worker implementation. Re-read the prior handoff and completed plans, revalidate worker1 and worker2 reachability, then run the existing fixed backtest flow against `9223` and `9225` in separate processes with distinct `TV_CDP_PORT` values. Capture whether simultaneous execution is feasible, partially feasible, or blocked by TradingView behavior such as shared UI/chart state, profile state drift, or CDP/chart-target contention.

## Relationship to existing active plans

- `docs/exec-plans/active/` is currently empty, so there is **no overlapping active exec-plan**.
- This plan continues from:
  - `docs/working-memory/session-logs/tradingview-worker2-handoff_20260405_1514.md`
  - `docs/exec-plans/completed/tradingview-multi-worker-feasibility_20260405_1432.md`
  - `docs/exec-plans/completed/tradingview-worker2-proxy-debug_20260405_1449.md`
  - `docs/exec-plans/completed/tradingview-worker2-stabilization_20260405_1501.md`

## Files / assets touched

### Repository files

- `docs/exec-plans/active/tradingview-parallel-backtest-operational-verification_20260406_0053.md`
  - This plan file.
- `docs/working-memory/session-logs/tradingview-parallel-backtest-verification_20260406_0053.md`
  - Expected result artifact if the experiment is documented.
- `README.md`
  - Read-only reference for current single-endpoint usage unless a minimal repeatability note is needed.
- `src/connection.js`
  - Read-only confirmation of the current single-endpoint assumption.
- `src/cli/commands/backtest.js`
  - Read-only confirmation that only `tv backtest nvda-ma` exists.
- `src/core/backtest.js`
  - Read-only confirmation of the fixed backtest flow.
- `package.json`
  - Read-only source of existing test commands.

### Optional minimal additions only if needed for repeatability

- `scripts/ops/run-parallel-backtests.sh`
- `scripts/ops/check-workers.sh`
- `README.md` small operational note for dual-worker verification

These are optional and should be added only if manual commands are too fragile to repeat cleanly.

### Environment / external assets

- worker1 TradingView instance on `127.0.0.1:9222` proxied to `172.31.144.1:9223`
- worker2 TradingView instance on `127.0.0.1:9224` proxied to `172.31.144.1:9225`
- worker2 profile at `C:\TradingView\profiles\worker2`

## In scope

- Re-read prior handoff logs/plans so the experiment continues from existing session knowledge
- Revalidate that worker1 and worker2 are individually reachable from WSL
- Launch or relaunch workers if needed using the already-established stable recipe
- Run existing `nvda-ma` backtests against `9223` and `9225`
- Attempt simultaneous execution via separate processes with different `TV_CDP_PORT` values
- Determine whether simultaneous backtests are feasible in practice
- Document concrete blockers if they are not feasible
- Add only the smallest helper script or doc note if needed to make the experiment repeatable

## Out of scope

- Refactoring `src/connection.js` for multiple endpoints
- Adding repo-level worker inventory, scheduler, or orchestration
- Expanding the CLI beyond the existing fixed `tv backtest nvda-ma`
- Supporting more than two workers
- Long-term automation or CI for worker pools
- Broad TradingView environment hardening beyond what is needed for this verification

## Test strategy

This task may finish with **no repository code changes**, so the test plan is an operational **RED -> GREEN -> REFACTOR** cycle.

### RED

- Reproduce the current single-endpoint limitation at the repo level:
  - repo code has no worker selection/orchestration
  - simultaneous runs must therefore be invoked as separate processes with distinct `TV_CDP_PORT` values
- Attempt parallel backtests and observe failure modes such as:
  - one worker unreachable
  - one backtest hangs while the other runs
  - both CDP endpoints are reachable but TradingView UI/chart state contends
  - different profiles/chart tabs are not aligned enough to make the result comparable

### GREEN

- Confirm both workers pass status checks independently
- Confirm the existing fixed backtest runs successfully on `9223`
- Confirm the existing fixed backtest runs successfully on `9225`
- Run both backtests at the same time from separate processes and classify the outcome as:
  - full success
  - partial success with operational caveats
  - blocked, with the blocker written down clearly

### REFACTOR

- Reduce the verification recipe to the smallest repeatable command set
- If needed, codify only the minimal helper script or README note
- Avoid implementation drift into multi-worker repo orchestration before the experiment proves it is worth doing

## Validation commands

### Repository / existing test commands

```bash
npm test
npm run test:e2e
npm run test:all
```

Use these only if repository files are changed for helper scripts or docs that affect tested paths; otherwise the operational experiment may complete with no repo test changes.

### WSL worker reachability checks

```bash
curl -sS http://172.31.144.1:9223/json/version
curl -sS http://172.31.144.1:9223/json/list
curl -sS http://172.31.144.1:9225/json/version
curl -sS http://172.31.144.1:9225/json/list
```

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status
```

### Individual backtest checks

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest nvda-ma
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js backtest nvda-ma
```

### Parallel backtest experiment

```bash
(
  TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest nvda-ma
) &
(
  TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js backtest nvda-ma
) &
wait
```

### If worker relaunch is needed

```powershell
C:\TradingView\TradingView.exe --remote-debugging-port=9224 --user-data-dir=C:\TradingView\profiles\worker2 --in-process-gpu
```

Worker1 baseline reference:

```powershell
C:\TradingView\TradingView.exe --remote-debugging-port=9222
```

## Risks

- Dual CDP reachability does **not** guarantee safe parallel backtesting
- Parallel runs may still contend on TradingView UI/chart state, active symbol, Strategy Tester state, or study attachment timing even if both endpoints respond
- worker2 uses a separate profile, so login/chart layout/state may diverge from worker1
- repo code currently has no worker selection/orchestration, so the experiment depends on separate shell processes and environment variables rather than first-class multi-worker support
- Results may be timing-sensitive and require more than one repetition before being trusted

## Steps

- [ ] Re-read the worker2 handoff and prior completed feasibility/stabilization plans
- [ ] Confirm there is no overlapping active exec-plan
- [ ] Reconfirm worker1 status on `9223`
- [ ] Reconfirm worker2 status on `9225`
- [ ] Relaunch worker2 with the known stable command if it is not already healthy
- [ ] Run `tv backtest nvda-ma` against worker1 only and capture the result
- [ ] Run `tv backtest nvda-ma` against worker2 only and capture the result
- [ ] Run both backtests in parallel using separate processes with distinct `TV_CDP_PORT` values
- [ ] Repeat the parallel run enough times to distinguish a one-off race from a stable pattern
- [ ] Classify the outcome as success, partial success, or blocked
- [ ] If blocked, record the narrowest confirmed blocker:
  - [ ] endpoint instability
  - [ ] chart/profile state mismatch
  - [ ] TradingView UI/tester contention
  - [ ] repo single-endpoint assumptions preventing reliable invocation
- [ ] If repeatability needs a tiny helper, add the minimal script or doc note only
- [ ] Write the result to a new session log under `docs/working-memory/session-logs/`

## Follow-up if successful

- Define the minimum worker inventory format for `worker1` / `worker2`
- Refactor `src/connection.js` away from a single global endpoint
- Add explicit worker selection to CLI/MCP flows
- Introduce lightweight orchestration for distributing backtests across workers without shared-state collisions
