# Session log: WSL dual-worker reachability check

## Goal

- Confirm whether worker1 and worker2 are currently reachable from WSL
- Confirm whether CLI `status` can call both workers individually
- Decide whether the environment is ready for the next parallel experiment

## Expected model

- worker1: `172.31.144.1:9223 -> 127.0.0.1:9222`
- worker2: `172.31.144.1:9225 -> 127.0.0.1:9224`
- Parallel use means both workers stay started at the same time while separate processes point at different `TV_CDP_PORT` values

## WSL checks

### curl

Commands:

```bash
curl -sS http://172.31.144.1:9223/json/version
curl -sS http://172.31.144.1:9225/json/version
curl -sS http://172.31.144.1:9223/json/list
curl -sS http://172.31.144.1:9225/json/list
```

Observed result:

- all four calls failed with `curl: (56) Recv failure: Connection reset by peer`

### CLI status

Commands:

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status
```

Observed result:

- both calls failed
- worker1:
  - `CDP connection failed after 5 attempts: fetch failed`
  - `Tried: http://172.31.144.1:9223/json/list`
- worker2:
  - `CDP connection failed after 5 attempts: fetch failed`
  - `Tried: http://172.31.144.1:9225/json/list`

## Windows fallback checks

### TradingView process view

- Process list did **not** show a healthy main worker1 process with `--remote-debugging-port=9222`
- Process list did **not** show a healthy worker2 process with `--remote-debugging-port=9224`
- One notable process was:
  - `"C:\TradingView\TradingView.exe" "tradingview://browser-auth/?token=..."`
- worker2-specific process filter returned no active `9224` process

### Follow-up process shape check after user restart

- A main process **was** later observed on `9222`, but it was:
  - `"C:\TradingView\TradingView.exe" --remote-debugging-port=9222 --user-data-dir=C:\TradingView\profiles\worker2 --in-process-gpu`
- This means the currently reachable worker on `9223 -> 9222` is **using the worker2 profile**
- A direct filter for a main `9224` process still returned **no result**
- Re-running the worker2 launch command for `9224` did **not** create a new main process on `9224`
- `127.0.0.1:9224/json/version` still failed after that retry

### portproxy

```powershell
netsh interface portproxy show all
```

Observed result:

- `0.0.0.0:9223 -> 127.0.0.1:9222`
- `0.0.0.0:9225 -> 127.0.0.1:9224`

### Windows localhost endpoint checks

Checks:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9222/json/version -TimeoutSec 3
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9224/json/version -TimeoutSec 3
```

Observed result:

- both failed with `リモート サーバーに接続できません。`

### Clean relaunch and corrected process shape

- After an explicit clean stop and relaunch sequence, both intended main processes appeared:
  - `"C:\TradingView\TradingView.exe" --remote-debugging-port=9222`
  - `"C:\TradingView\TradingView.exe" --remote-debugging-port=9224 --user-data-dir=C:\TradingView\profiles\worker2 --in-process-gpu`
- Direct localhost CDP checks then succeeded on both:
  - `127.0.0.1:9222/json/version` -> success
  - `127.0.0.1:9224/json/version` -> success

### Portproxy path after recreation

- Recreated the portproxy rules for:
  - `0.0.0.0:9223 -> 127.0.0.1:9222`
  - `0.0.0.0:9225 -> 127.0.0.1:9224`
- Despite that, the proxy path still failed:
  - Windows `curl.exe http://127.0.0.1:9223/json/version` -> connection reset
  - Windows `curl.exe http://127.0.0.1:9225/json/version` -> connection reset
  - Windows `curl.exe http://172.31.144.1:9223/json/version` -> connection reset
  - Windows `curl.exe http://172.31.144.1:9225/json/version` -> connection reset
  - WSL `curl http://172.31.144.1:9223/json/version` -> connection reset
  - WSL `curl http://172.31.144.1:9225/json/version` -> connection reset
- CLI `status` from WSL still failed for both `9223` and `9225`

## Conclusion

> This section is the **original conclusion from the earlier failed run**.  
> See `## 2026-04-06 follow-up recovery` below for the superseding result.

- The current environment is **not ready** for another WSL-driven parallel experiment
- The narrowest blocker observed at this point is:
  - **portproxy exists, but no healthy local CDP listener is currently responding on `127.0.0.1:9222` or `127.0.0.1:9224`**
- After the user restart attempt, the narrower updated blocker is:
  - **only one main TradingView instance is currently alive for CDP, and it is using the worker2 profile on `9222`; a second main instance on `9224` is still not appearing**
- After the clean relaunch, the blocker changed again to:
  - **both TradingView workers are now alive locally, but the `9223/9225` portproxy HTTP forwarding path still resets requests**

This is the most likely explanation for both symptoms observed in this check:

1. WSL sees `connection reset by peer`
2. CLI `status` fails for both `9223` and `9225`

And after the user restart attempt:

1. `9223` succeeds because `9222` now has a responding main process
2. `9225` still fails because `9224` still has no responding main process

After the clean relaunch:

1. direct Windows localhost access to `9222` and `9224` succeeds
2. proxy access via `9223` and `9225` still resets on both Windows and WSL

## Minimal recovery action

1. Keep the current healthy local workers:
   - worker1 on `9222`
   - worker2 on `9224`
2. Treat the next blocker as **Windows portproxy forwarding**, not TradingView launch
3. The next minimal recovery action should target the proxy layer itself (for example IP Helper / portproxy service state or an alternate forwarding method)
4. Current verified TradingView launch commands remain:

```powershell
Start-Process "C:\TradingView\TradingView.exe" -ArgumentList "--remote-debugging-port=9224","--user-data-dir=C:\TradingView\profiles\worker2","--in-process-gpu"
```

5. Current verified localhost checks:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9222/json/version -TimeoutSec 3
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9224/json/version -TimeoutSec 3
```

6. Once the proxy layer is fixed, rerun WSL checks:

```bash
curl -sS http://172.31.144.1:9223/json/version
curl -sS http://172.31.144.1:9225/json/version
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status
```

## 2026-04-06 follow-up recovery

- A fresh rerun initially reproduced the old symptom set:
  - WSL `172.31.144.1:9223` / `:9225` reset
  - Windows `127.0.0.1:9223` / `:9225` reset
  - `netsh interface portproxy show all` still showed
    - `0.0.0.0:9223 -> 127.0.0.1:9222`
    - `0.0.0.0:9225 -> 127.0.0.1:9224`
  - `iphlpsvc` was running
- The immediate blocker on this rerun was actually earlier than portproxy:
  - no `TradingView.exe` main process was alive
  - `127.0.0.1:9222/json/version` and `127.0.0.1:9224/json/version` both failed

### What did not stick

- Launching workers from WSL via `powershell.exe` + `Start-Process` could make a worker answer briefly inside the same command, but the main process disappeared after the launcher command exited
- So the missing piece was not `iphlpsvc` restart or `portproxy` recreation; it was a **durable Windows-side launch method**

### Minimal recovery that worked

Used detached `cmd /c start` launches from Windows PowerShell:

```powershell
cmd /c start "" /D C:\TradingView C:\TradingView\TradingView.exe --remote-debugging-port=9222 --in-process-gpu
cmd /c start "" /D C:\TradingView C:\TradingView\TradingView.exe --remote-debugging-port=9224 --user-data-dir=C:\TradingView\profiles\worker2 --in-process-gpu
```

### Verified healthy state after detached launch

- Windows main processes:
  - `C:\TradingView\TradingView.exe --remote-debugging-port=9222 --in-process-gpu`
  - `C:\TradingView\TradingView.exe --remote-debugging-port=9224 --user-data-dir=C:\TradingView\profiles\worker2 --in-process-gpu`
- Windows localhost:
  - `127.0.0.1:9222/json/version` -> `200`
  - `127.0.0.1:9224/json/version` -> `200`
- Windows proxy:
  - `127.0.0.1:9223/json/version` -> success
  - `127.0.0.1:9225/json/version` -> success
- WSL proxy:
  - `172.31.144.1:9223/json/version` -> success
  - `172.31.144.1:9225/json/version` -> success
- CLI:
  - `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status` -> success
  - `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status` -> success

## Updated conclusion

- The environment is now ready again for WSL-driven dual-worker use
- On this rerun, the decisive fix was **durable detached worker launch**, not proxy rule changes
- `portproxy` and `iphlpsvc` were already healthy once the workers stayed alive
