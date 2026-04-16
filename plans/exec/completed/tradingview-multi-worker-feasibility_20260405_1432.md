# Exec Plan: TradingView multi-worker feasibility on Windows + WSL

## Problem

The current repository assumes a single CDP endpoint and a single selected TradingView chart target. We need to verify, on the actual Windows host, whether a second TradingView Desktop worker can be launched with a separate debugging port and separate profile, then reached from WSL through a second portproxy path.

## Approach

Treat this as an environment feasibility check rather than a repository implementation task. First confirm the current worker baseline, then try a second TradingView launch with a different `--remote-debugging-port`, then retry with a separate `--user-data-dir` if needed, add a second Windows `portproxy`, and verify WSL reachability. Report success, failure mode, and the exact conditions observed.

## Files / assets touched

### Repository files

- `docs/exec-plans/active/tradingview-multi-worker-feasibility_20260405_1432.md`
  - This plan file.
- `src/connection.js`
  - Read-only confirmation of the current single-endpoint assumption.

### Windows-side temporary assets

- `C:\TradingView\TradingView.exe`
  - Existing launcher target, invoked with alternate arguments during the check.
- `C:\TradingView\profiles\worker2\`
  - Temporary profile directory candidate for the second instance.
- Optional temporary launcher:
  - `C:\TradingView\launch-worker2.bat`
- Temporary network config:
  - `127.0.0.1:9224` for the second TradingView CDP port
  - `0.0.0.0:9225 -> 127.0.0.1:9224` portproxy for WSL reachability
- Optional temporary Windows Firewall rule for the extra proxy port

## In scope

- Reconfirm the current worker baseline on `172.31.144.1:9223`
- Check current TradingView launch arguments and CDP wait port
- Try launching a second TradingView with a different debugging port
- Try launching a second TradingView with both a different debugging port and a different profile path
- Add a second portproxy path if the second local CDP port appears
- Verify WSL reachability to the second worker
- Summarize the observed result and what it means for future multi-worker support

## Out of scope

- Implementing multi-worker orchestration in the repo
- Changing `src/connection.js` to support multiple endpoints
- Adding CI automation for worker pools
- Long-term hardening of Windows launcher management

## Test strategy

This task may finish with **no repository code changes**. If that happens, use an operational RED -> GREEN -> REFACTOR flow instead of adding code tests.

### RED

- Attempt to launch a second worker and observe one of:
  - process refuses to start
  - process is absorbed by the existing instance
  - second CDP port never listens
  - WSL cannot reach the second port

### GREEN

- Confirm an independently reachable second CDP endpoint
- Confirm the second worker uses a different debugging port
- Confirm the second worker can run with a separate profile path if required
- Confirm the first worker on `9223` still works

### REFACTOR

- Reduce the launcher / profile / portproxy recipe to the minimum working shape
- Capture follow-up implementation requirements only if the environment check succeeds

### Validation commands

Repository:

```bash
node src/cli/index.js status
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status
```

WSL / Linux:

```bash
curl http://172.31.144.1:9223/json/version
curl http://172.31.144.1:9223/json/list
curl http://172.31.144.1:9225/json/version
curl http://172.31.144.1:9225/json/list
```

Windows / PowerShell:

```powershell
Get-CimInstance Win32_Process | Where-Object { $_.Name -eq "TradingView.exe" } | Select-Object ProcessId, CommandLine
netsh interface portproxy show all
curl.exe http://127.0.0.1:9222/json/version
curl.exe http://127.0.0.1:9224/json/version
```

## Risks

- TradingView Desktop may enforce a single-instance lock
- `--user-data-dir` may be ignored or insufficient
- The second worker may start but still not expose a second stable chart target
- Extra portproxy / firewall changes may remain if cleanup is missed
- Even if the environment succeeds, the repo still needs follow-up code to consume multiple workers

## Steps

- [ ] Confirm there is no overlapping active exec-plan for this work
- [ ] Reconfirm the current `9223 -> 9222` baseline from WSL and Windows
- [ ] Record the current TradingView process command line
- [ ] Attempt a second launch with only `--remote-debugging-port=9224`
- [ ] If needed, attempt a second launch with `--remote-debugging-port=9224 --user-data-dir=C:\TradingView\profiles\worker2`
- [ ] Check whether `127.0.0.1:9224` responds on Windows
- [ ] Add `0.0.0.0:9225 -> 127.0.0.1:9224` portproxy if the second local port appears
- [ ] Verify WSL reachability to `172.31.144.1:9225`
- [ ] Verify the original worker on `172.31.144.1:9223` still works
- [ ] Summarize whether the result is success, conditional success, or blocked by single-instance behavior
- [ ] Note cleanup actions for any temporary Windows assets or proxy rules

## Follow-up if successful

- Design a worker inventory format for multiple CDP endpoints
- Refactor connection handling away from a single global client
- Add orchestration for distributing strategy runs across workers
