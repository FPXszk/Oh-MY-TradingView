# Session log: TradingView parallel backtest verification

## Goal

- Reconstruct the prior multi-worker state from session logs and exec-plans
- Verify whether two TradingView Desktop workers can execute `tv backtest nvda-ma` at the same time from WSL
- Determine whether any blocker is environment-level, TradingView-level, or repository-level

## Starting point

- Reference handoff:
  - `docs/working-memory/session-logs/tradingview-worker2-handoff_20260405_1514.md`
- Known stable recipe from that handoff:
  - worker1: `172.31.144.1:9223 -> 127.0.0.1:9222`
  - worker2: `172.31.144.1:9225 -> 127.0.0.1:9224`
  - worker2 launch:
    - `C:\TradingView\TradingView.exe --remote-debugging-port=9224 --user-data-dir=C:\TradingView\profiles\worker2 --in-process-gpu`
- Repo constraint:
  - `src/connection.js` still assumes a single endpoint per process, so multi-worker use must currently be done by launching separate CLI processes with different `TV_CDP_PORT` values

## Repo baseline

- `npm test` passed: 192 / 192

## Worker health before the experiment

### worker1

- `curl http://172.31.144.1:9223/json/version`
  - success
- `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status`
  - success
  - chart symbol: `BATS:AAPL`

### worker2

- Initial `curl http://172.31.144.1:9225/json/version`
  - `Recv failure: Connection reset by peer`
- `netsh interface portproxy show all`
  - `0.0.0.0:9225 -> 127.0.0.1:9224` was still present
- Windows process listing showed only the worker1 main process on `9222`
- Conclusion:
  - this was the same degraded state seen earlier where the proxy remains but the worker2 listener is gone

## worker2 recovery

- Relaunched worker2 with:

```powershell
C:\TradingView\TradingView.exe --remote-debugging-port=9224 --user-data-dir=C:\TradingView\profiles\worker2 --in-process-gpu
```

- Verification after relaunch:
  - Windows process list contained a main process with `--remote-debugging-port=9224 --user-data-dir=C:\TradingView\profiles\worker2 --in-process-gpu`
  - WSL `9225` probe loop returned `200` five times in a row
  - `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status`
    - success
    - chart symbol: `FX:JPN225`
    - target URL: `https://jp.tradingview.com/chart/`

## Backtest attempts

### First simultaneous attempt

Commands were launched against both workers at the same time.

- worker1 (`9223`)
  - failed
  - error: `Could not open Pine Editor or Monaco not found.`
- worker2 (`9225`)
  - success
  - `tester_available: true`
  - `apply_failed: false`

This showed that both workers were callable, but the results were not yet stable enough to classify.

### Sequential isolation retry

Ran the two backtests one after another.

- worker1 (`9223`)
  - success
  - `tester_available: true`
  - `apply_failed: false`
- worker2 (`9225`)
  - process exit succeeded
  - result shape was partial success:
    - `tester_available: false`
    - `apply_failed: true`
    - `apply_reason: "Strategy not verified in chart studies after compile + retry"`
    - `fallback_source: "chart_bars_local"`

This narrowed the issue: worker2 was already flaky even without simultaneous execution.

### Deliberate parallel runs

Ran two full parallel rounds with separate processes:

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest nvda-ma &
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js backtest nvda-ma &
wait
```

#### Round 1

- worker1
  - exit `0`
  - success
  - `tester_available: true`
  - `apply_failed: false`
- worker2
  - exit `0`
  - success-shaped response, but only via fallback
  - `tester_available: false`
  - `apply_failed: true`
  - `fallback_source: "chart_bars_local"`

#### Round 2

- worker1
  - exit `0`
  - success
  - `tester_available: true`
  - `apply_failed: false`
- worker2
  - exit `0`
  - same partial-success shape as round 1
  - `tester_available: false`
  - `apply_failed: true`
  - `fallback_source: "chart_bars_local"`

## Conclusion

### What is confirmed

- **Parallel process launch is feasible**
  - two independent CLI processes can target `9223` and `9225` at the same time
  - both processes complete without crashing
- **Dual-worker CDP reachability is feasible**
  - worker1 and worker2 can coexist and be reached from WSL

### What is not yet solved

- **The current dual-worker verification is still worker2-limited**
  - worker1 consistently returns full Strategy Tester metrics
  - worker2 consistently degrades to `apply_failed: true` + `chart_bars_local` fallback in the repeated parallel runs
  - because worker2 also showed degraded behavior during the sequential isolation retry, the current evidence does not prove that parallelism itself is the primary cause

### Current narrowest hypothesis

The narrowest current hypothesis is **worker2-side TradingView/chart/profile state**, not the repository's single-endpoint architecture:

- worker2 already showed degraded behavior during the sequential isolation retry
- the repo-level singleton client in `src/connection.js` is process-local, so it does not explain cross-process failure
- worker2 status points at a more generic chart target/profile state than worker1

Possible sub-causes still to test:

1. worker2 profile/chart state mismatch
2. TradingView UI timing differences on worker2
3. study/strategy attach verification being less reliable on the worker2 profile

## Recommendation

- Do **not** implement repo multi-worker orchestration yet
- First normalize worker2 so it more closely matches worker1:
  - logged-in state
  - chart tab state
  - chart layout / panel visibility
- Re-run the same experiment after worker2 profile preparation
- Only if manual retests remain timing-sensitive should a tiny helper script such as `scripts/ops/run-parallel-backtests.sh` be added
