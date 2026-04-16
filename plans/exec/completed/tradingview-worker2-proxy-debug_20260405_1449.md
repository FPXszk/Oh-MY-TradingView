# Exec Plan: Debug WSL reachability to TradingView worker2 proxy

## Problem

The stable baseline is the existing worker on `172.31.144.1:9223 -> 127.0.0.1:9222`. A second TradingView worker can be launched on Windows with `--remote-debugging-port=9224 --user-data-dir=C:\TradingView\profiles\worker2`, and Windows-local requests to `127.0.0.1:9224` and proxied `172.31.144.1:9225` have responded transiently. However, WSL requests to `172.31.144.1:9225` fail with `Connection reset by peer` or `Empty reply from server`.

## Approach

Treat this as an environment debugging task, not a repository implementation task. Recreate the worker2 setup, observe listener lifetime and portproxy behavior on Windows, compare Windows-host access against WSL access in the same timing window, and classify the dominant cause among timing, listener lifetime, portproxy behavior, firewall, or path-specific access differences.

## Files / assets touched

### Repository files

- `docs/exec-plans/active/tradingview-worker2-proxy-debug_20260405_1449.md`
  - This plan file.
- `docs/exec-plans/active/tradingview-multi-worker-feasibility_20260405_1432.md`
  - Read-only reference because this task overlaps with the earlier feasibility check.
- `README.md`
  - Read-only confirmation of the stable 9223 baseline and WSL portproxy guidance.
- `src/connection.js`
  - Read-only confirmation that the repo still assumes a single endpoint.
- `src/cli/index.js`
  - Read-only reuse of existing status checks if needed.

### Windows-side temporary assets

- `C:\TradingView\profiles\worker2\`
  - Temporary profile directory for the second instance.
- Temporary TradingView launch arguments:
  - `--remote-debugging-port=9224`
  - `--user-data-dir=C:\TradingView\profiles\worker2`
- Temporary portproxy:
  - `0.0.0.0:9225 -> 127.0.0.1:9224`
- Optional temporary firewall rule:
  - inbound allow for TCP `9225`
- Temporary evidence capture:
  - PowerShell output, `curl.exe`, `Get-NetTCPConnection`, `netstat`, and process listings

## In scope

- Reconfirm the stable `9223 -> 9222` path
- Recreate the worker2 `9224` listener and `9225` proxy path
- Measure how long `9224` stays reachable on Windows
- Compare Windows-local, Windows-host, and WSL access to the same worker2 path
- Identify the dominant cause category
- Cleanup temporary worker2 settings after the investigation

## Out of scope

- Implementing repository multi-worker orchestration
- Refactoring `src/connection.js`
- Adding tests or CI changes
- Permanent Windows network configuration

## Test strategy

This task may complete with **no repository code changes**, so use an operational RED -> GREEN -> REFACTOR cycle.

### RED

- Reproduce at least one of:
  - `Connection reset by peer` from WSL to `172.31.144.1:9225`
  - `Empty reply from server` from WSL to `172.31.144.1:9225`
- Capture synchronized Windows evidence for the same interval.

### GREEN

- Narrow the dominant cause to one or two categories:
  - listener lifetime
  - timing
  - portproxy behavior
  - firewall
  - host-path difference

### REFACTOR

- Reduce the successful reproduction recipe to the minimum set of steps
- Separate environment findings from any future repository changes

## Validation commands

WSL:

```bash
curl -v --max-time 3 http://172.31.144.1:9223/json/version
curl -v --max-time 3 http://172.31.144.1:9225/json/version
curl -v --max-time 3 http://172.31.144.1:9225/json/list
for i in $(seq 1 10); do date -Iseconds; curl -sS -o /dev/null -w '%{http_code} %{time_total}\n' http://172.31.144.1:9225/json/version || true; sleep 1; done
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
Start-Process "C:\TradingView\TradingView.exe" -ArgumentList "--remote-debugging-port=9224","--user-data-dir=C:\TradingView\profiles\worker2"
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=9225 connectaddress=127.0.0.1 connectport=9224
netsh advfirewall firewall add rule name="TradingView Worker2 9225" dir=in action=allow protocol=TCP localport=9225
netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=9225
netsh advfirewall firewall delete rule name="TradingView Worker2 9225"
```

## Risks

- The second TradingView instance may expose a short-lived listener, making symptoms timing-sensitive
- The proxy path may behave differently for Windows-host access and WSL access
- Temporary proxy or firewall settings may linger if cleanup is missed
- Even if the environment issue is explained, the repo still cannot use multiple workers without follow-up implementation

## Steps

- [ ] Confirm the overlap with the earlier active feasibility plan and keep this plan scoped only to proxy-path debugging
- [ ] Reconfirm the stable `172.31.144.1:9223 -> 127.0.0.1:9222` baseline
- [ ] Recreate `C:\TradingView\profiles\worker2`
- [ ] Launch worker2 on `9224` with the separate profile
- [ ] Observe Windows-local `127.0.0.1:9224` reachability over time
- [ ] Recreate `0.0.0.0:9225 -> 127.0.0.1:9224`
- [ ] Compare Windows access to `172.31.144.1:9225` against WSL access to the same endpoint in the same timing window
- [ ] Capture listener, process, and proxy state during failures
- [ ] Classify the dominant cause and summarize the next best action
- [ ] Remove temporary `9225` proxy, firewall rule, and worker2 profile assets
