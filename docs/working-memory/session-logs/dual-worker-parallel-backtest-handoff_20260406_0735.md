# Session log: dual-worker parallel backtest handoff

## Goal

- Normalize the dual-worker operating procedure into durable docs
- Record what required manual intervention versus what the CLI / agent handled
- Leave the environment in a handoff-ready state and record the final parallel verification result

## Snapshot after worker2 login recovery

- worker1
  - WSL endpoint: `172.31.144.1:9223`
  - status path previously recovered and healthy
- worker2
  - WSL endpoint: `172.31.144.1:9225`
  - saved chart target: `https://jp.tradingview.com/chart/JV6Tvois/`
  - `status.success: true`
  - `api_available: true`
  - `chart_symbol: BATS:AAPL`
  - onboarding dialog cleared

## Manual boundary vs agent-handled boundary

### Manual

- visible session で worker2 を起動すること
- browser で Apple ログインを完了すること
- `秘密鍵をコピー` を押して Desktop へ戻すこと

### Agent / CLI handled during this recovery

- hidden Session0 worker2 と `9224` 競合の特定
- `error code 32` と access denied の切り分け
- CDP reachability, `json/list`, CLI `status` の継続確認
- browser handoff 後の onboarding 状態観測
- onboarding の `次へ` / `わかりました` の押下
- welcome dialog 消失確認
- saved chart URL / symbol / API availability の確認

## Chronology

1. 既存 plan / session log を読み、dual-worker 到達性回復から作業を再開した
2. WSL から `9223` / `9225` が reset する退行を再現した
3. Windows 側で main process が短命になっていることを確認し、`powershell.exe + Start-Process` では起動が持続しないと判断した
4. `cmd /c start "" /D C:\TradingView ...` の detached launch へ切り替えた
5. これにより worker1 `9222` / worker2 `9224`、および WSL proxy `9223` / `9225` の到達性を回復した
6. repo 側では preset-driven backtest path を使い、worker1 で `ema-cross-9-21` 成功、worker2 で attach failure を確認した
7. `9225/json/list` に `dialog-window ... type=welcome` が見えていることから、worker2 blocker を repo 実装ではなく TradingView UI / profile state と切り分けた
8. Windows の見えるセッションでは TradingView が見えず、main window が Session0 に出ていることを確認した
9. visible session で worker2 を起動し直すためのコマンドを整理したが、`9224` 競合・`Stop-Process` access denied・PowerShell 直起動の混乱が発生した
10. 管理者 PowerShell で hidden worker2 を止めた後、visible session の worker2 を使える状態へ寄せた
11. browser login 後も welcome dialog は残ったが、Desktop 側で `tryObtainTokenFromClipboard()` が動くログを確認し、clipboard handoff が成功していると判断した
12. worker2 target が generic chart から saved chart `JV6Tvois` に変わり、`chart_symbol: BATS:AAPL` を返すようになった
13. onboarding dialog は CDP 経由で `次へ` → `次へ` → `次へ` → `わかりました` と進め、最終的に消失した
14. ここまでで worker2 は「ログイン済み / saved chart 復旧済み / onboarding 完了済み / CLI status success」の状態になった

## Key observations worth keeping

- `error code 32` は PowerShell 自体の問題ではなく、ほぼ `9224` の bind 競合だった
- `Stop-Process` の access denied は管理者 PowerShell で回避できた
- `& "C:\TradingView\TradingView.exe" ...` の直起動は今回の切り分けに向かず、Electron ログや `second-instance` のノイズを混ぜやすかった
- worker2 は UI が黒く見えていても、CDP / CLI 側では正常化している瞬間があった
- `json/list` の `dialog-window ... type=welcome` は worker2 の readiness 判定として非常に有効だった

## Final verification performed in this session

### Repo baseline

- `npm test`
  - pass
  - `198 / 198`

### Status baseline

- worker1
  - `curl http://172.31.144.1:9223/json/version` -> success
  - `status` -> success
- worker2
  - `curl http://172.31.144.1:9225/json/version` -> success
  - `status` -> success

### Sequential CLI baseline

- worker1 preset
  - `backtest preset ema-cross-9-21 --symbol NVDA`
  - success once
- worker1 legacy
  - `backtest nvda-ma`
  - success once
- worker2 preset
  - `backtest preset rsi-mean-reversion --symbol NVDA`
  - failed with `Could not open Pine Editor.`
- worker2 legacy
  - `backtest nvda-ma`
  - failed with `Could not open Pine Editor.`

### Direct helper / core replay checks

- worker1 / worker2 とも `ensurePineEditorOpen()` と `getSource()` は成功
- worker2 では step replay でも
  - `setActiveSymbol`
  - `getCurrentPrice`
  - `setSource`
  - `smartCompile`
  が成功
- worker2 では direct core call として
  - `runPresetBacktest({ presetId: 'rsi-mean-reversion', symbol: 'NVDA' })`
  - `runNvdaMaBacktest()`
  の両方が一度は成功

### Parallel CLI verification

fresh な CLI 2 プロセスで以下を同時起動した。

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset ema-cross-9-21 --symbol NVDA &
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js backtest preset rsi-mean-reversion --symbol NVDA &
wait
```

結果:

- worker1
  - exit `1`
  - `Could not open Pine Editor.`
- worker2
  - exit `1`
  - `Could not open Pine Editor.`

### Warmed parallel retry

事前に worker1 / worker2 で `ensurePineEditorOpen()` と `getSource()` を成功させた後、同じ並列コマンドを再実行した。

結果:

- worker1
  - exit `1`
  - `Could not open Pine Editor.`
- worker2
  - exit `1`
  - `Backtest completed, but state restore failed: study template restore failed: Error: Cannot start studies: main series is not started`

### Final state after verification

- worker1 `status` -> success, `chart_symbol: BATS:AAPL`
- worker2 `status` -> success, `chart_symbol: BATS:NVDA`
- つまり **CDP 到達性と chart API は維持** されたが、**backtest path はなお不安定**

## Final conclusion

- 今回のセッションで **worker2 の login / onboarding / saved chart 復旧** までは成功した
- しかし **worker1 / worker2 の distinct backtest を stable に parallel 実行できる** ことはまだ証明できなかった
- 現時点の最狭い blocker は
  - login ではない
  - portproxy でもない
  - **Pine Editor / chart state / restore path の不安定さ**
- 次回は `ensurePineEditorOpen()` と backtest orchestration の間で、どの UI state change が editor を不安定化させるかをコード側で追うのが最短

## Suggested next operator entry point

1. `command.md` で起動 / 停止 / status コマンドを確認する
2. `docs/design-docs/dual-worker-parallel-backtest-runbook_20260406_0735.md` で normal path を確認する
3. WSL から `status` を叩き、worker1 / worker2 の前提状態を固定する
4. その後に distinct strategy backtest を individual / parallel の順で検証する

## Related references

- `docs/working-memory/session-logs/wsl-dual-worker-reachability_20260406_0305.md`
- `docs/working-memory/session-logs/dual-worker-distinct-strategy-backtest_20260406_0423.md`
- `docs/working-memory/session-logs/tradingview-parallel-backtest-verification_20260406_0053.md`
- `docs/exec-plans/active/dual-worker-docs-and-parallel-verification_20260406_0735.md`
