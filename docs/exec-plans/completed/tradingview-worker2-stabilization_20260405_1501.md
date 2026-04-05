# Exec Plan: TradingView Desktop worker2 stabilization and sustained dual-worker setup

## Problem

Worker1 remains stable on `172.31.144.1:9223 -> 127.0.0.1:9222`, but worker2 only becomes reachable transiently when launched with `--remote-debugging-port=9224 --user-data-dir=C:\TradingView\profiles\worker2`. The strongest observed failure mode is that the worker2 `9224` listener disappears while the `9225` portproxy remains, causing downstream resets. The next task is to find launch conditions that keep worker2 alive long enough to make dual-worker operation real, not just briefly observable.

## Approach

Continue from the earlier feasibility and proxy-debug investigations, but shift the target from diagnosis to stabilization. Recreate the unstable baseline, then run staged experiments over launch conditions: separate profile, working directory, startup wait, GPU and renderer-related flags, and if useful a reproducible Windows launcher script. Success means worker2 stays reachable on `9224` for a sustained window, `9225` stays reachable from WSL, and worker1 on `9223` remains healthy at the same time.

## Relationship to existing active plans

- `docs/exec-plans/active/tradingview-multi-worker-feasibility_20260405_1432.md`
  - Established that a second worker is possible only with separate profile data.
- `docs/exec-plans/active/tradingview-worker2-proxy-debug_20260405_1449.md`
  - Established that the main blocker is worker2 listener lifetime rather than WSL alone.
- This new plan **builds on both** and focuses only on stabilizing worker2 until a repeatable dual-worker setup exists.

## Files / assets touched

### Repository files

- `docs/exec-plans/active/tradingview-worker2-stabilization_20260405_1501.md`
  - This plan file.
- `README.md`
  - Read-only reference for the stable worker1 baseline and current CDP access assumptions.
- `src/connection.js`
  - Read-only confirmation that the repo still assumes a single endpoint.
- `src/cli/index.js`
  - Read-only use of existing status checks.

### Optional repository additions if needed

- `scripts/windows/launch-worker2.ps1`
- `scripts/windows/launch-worker2.bat`
- `scripts/check-worker-stability.js`

These are only added if repeated manual commands are too noisy or too fragile.

### Windows-side temporary assets

- `C:\TradingView\profiles\worker2\`
- Optional variant profiles:
  - `C:\TradingView\profiles\worker2a\`
  - `C:\TradingView\profiles\worker2b\`
- Temporary launcher candidates:
  - `C:\TradingView\launch-worker2.ps1`
  - `C:\TradingView\launch-worker2.bat`
- Temporary port and proxy settings:
  - `127.0.0.1:9224`
  - `0.0.0.0:9225 -> 127.0.0.1:9224`
- Optional firewall rule:
  - inbound allow for TCP `9225`

## In scope

- Reconfirm the stable worker1 baseline
- Recreate the known unstable worker2 baseline
- Try staged worker2 launch conditions
- Measure worker2 listener lifetime and WSL reachability
- Find a repeatable recipe for sustained dual-worker access
- Use a launcher script if it materially improves stability or repeatability
- Summarize the minimum working recipe and what still blocks repo-level multi-worker support

## Out of scope

- Implementing repo multi-worker orchestration
- Refactoring `src/connection.js` for multiple endpoints
- CI or long-term automation
- More than two concurrent workers
- Permanent Windows network hardening beyond what is needed for the validated recipe

## Test strategy

This task may complete with **no repository code changes**, so validation follows an operational RED -> GREEN -> REFACTOR cycle.

### RED

- Reproduce the current unstable state:
  - worker2 starts but `9224` disappears quickly, or
  - `9225` resets because `9224` is gone.

### GREEN

- Confirm all of the following together:
  - worker2 keeps `127.0.0.1:9224` alive for a sustained window
  - WSL reaches `172.31.144.1:9225` repeatedly during that window
  - worker1 on `172.31.144.1:9223` remains healthy
  - the recipe is repeatable, not a one-off race

### REFACTOR

- Remove unnecessary flags or steps
- Reduce the recipe to the smallest stable launch method
- If needed, codify the recipe in a minimal launcher script

### Validation commands

WSL:

```bash
curl -v --max-time 3 http://172.31.144.1:9223/json/version
curl -v --max-time 3 http://172.31.144.1:9225/json/version
curl -v --max-time 3 http://172.31.144.1:9225/json/list
for i in $(seq 1 10); do date -Iseconds; curl -sS -o /dev/null -w '%{http_code} %{time_total}\n' http://172.31.144.1:9225/json/version || true; sleep 3; done
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status
```

Windows:

```powershell
Get-CimInstance Win32_Process | Where-Object { $_.Name -eq "TradingView.exe" } | Select-Object ProcessId, CreationDate, CommandLine
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 9222,9224,9225 } | Select-Object LocalAddress, LocalPort, OwningProcess, State
netsh interface portproxy show all
curl.exe -v http://127.0.0.1:9224/json/version
curl.exe -v http://172.31.144.1:9225/json/version
```

Worker2 launch candidates:

```powershell
Start-Process "C:\TradingView\TradingView.exe" -WorkingDirectory "C:\TradingView" -ArgumentList "--remote-debugging-port=9224","--user-data-dir=C:\TradingView\profiles\worker2"
```

```powershell
Start-Process "C:\TradingView\TradingView.exe" -WorkingDirectory "C:\TradingView" -ArgumentList "--remote-debugging-port=9224","--user-data-dir=C:\TradingView\profiles\worker2","--disable-gpu"
```

```powershell
Start-Process "C:\TradingView\TradingView.exe" -WorkingDirectory "C:\TradingView" -ArgumentList "--remote-debugging-port=9224","--user-data-dir=C:\TradingView\profiles\worker2","--disable-gpu","--disable-renderer-backgrounding","--disable-backgrounding-occluded-windows","--no-first-run"
```

Proxy setup:

```powershell
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=9225 connectaddress=127.0.0.1 connectport=9224
netsh advfirewall firewall add rule name="TradingView Worker2 9225" dir=in action=allow protocol=TCP localport=9225
```

Cleanup:

```powershell
netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=9225
netsh advfirewall firewall delete rule name="TradingView Worker2 9225"
```

If repository helper scripts are added:

```bash
npm test
npm run test:e2e
npm run test:all
```

## Risks

- TradingView Desktop may remain fundamentally unstable as a second visible instance
- Some flags may suppress instability but also break chart rendering or CDP target usability
- Success may depend on startup timing or UI state, reducing repeatability
- Temporary network or launcher settings may linger if cleanup is missed
- Even after success, repo code still needs follow-up to use multiple workers programmatically

## Steps

- [ ] Confirm this plan is the new active phase after the earlier feasibility and proxy-debug plans
- [ ] Reconfirm stable worker1 on `9223`
- [ ] Recreate the known unstable worker2 baseline on `9224`
- [ ] Measure how long `9224` and proxied `9225` remain usable without extra flags
- [ ] Retry with working directory fixed and profile recreated cleanly
- [ ] Retry with staged stabilizing flags, starting from `--disable-gpu`
- [ ] Retry with broader renderer/background flags only if simpler flags are insufficient
- [ ] Recreate `9225` proxy and validate repeated WSL access during each promising run
- [ ] Confirm worker1 on `9223` remains healthy while worker2 is active
- [ ] If manual launch remains flaky, create a minimal launcher script and retest
- [ ] Reduce the successful recipe to the smallest repeatable form
- [ ] Document the result as one of:
  - [ ] sustained dual-worker success
  - [ ] conditional success with fragile launcher recipe
  - [ ] blocked by TradingView second-instance instability
- [ ] Cleanup temporary assets that are not part of the final agreed working setup
