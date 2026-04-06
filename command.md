# Command Reference: TradingView cleanup / worker2 launch

Windows 側は **PowerShell**、WSL 側は **bash** を前提にした実運用用メモ。

## 前提

- worker2 executable: `C:\TradingView\TradingView.exe`
- worker2 profile: `C:\TradingView\profiles\worker2`
- worker2 debug port: `9224`
- WSL proxy port: `9225`
- current WSL host example: `172.31.144.1`

> `.env` で Apple ログインは自動化できない。  
> ログイン状態を再利用したい場合は `--user-data-dir=C:\TradingView\profiles\worker2` を使う。

## 1. TradingView プロセス確認

### すべての TradingView プロセスを表示

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.Name -eq "TradingView.exe" } |
  Select-Object ProcessId, CommandLine |
  Format-List
```

### worker2 (`9224`) だけ表示

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.Name -eq "TradingView.exe" -and $_.CommandLine -match "9224" } |
  Select-Object ProcessId, CommandLine |
  Format-List
```

> 出力が空なら worker2 は起動していない。

## 2. TradingView をクリーンに停止

### まず PID を確認

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.Name -eq "TradingView.exe" } |
  Select-Object ProcessId, CommandLine |
  Format-List
```

### 確認した PID を明示指定して停止

```powershell
Stop-Process -Id <PID>

```

複数ある場合は、確認した PID を並べて停止する。

```powershell
Stop-Process -Id <PID1>,<PID2>,<PID3>
Stop-Process -Id <PID>

```

### 停止できたか再確認

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.Name -eq "TradingView.exe" } |
  Select-Object ProcessId, CommandLine |
  Format-List
```

> 出力が空になれば停止完了。

## 3. worker2 を手動起動

### 方法 A: Start-Process で起動

```powershell
Start-Process "C:\TradingView\TradingView.exe" -ArgumentList "--remote-debugging-port=9224","--user-data-dir=C:\TradingView\profiles\worker2","--in-process-gpu"
```

### 方法 B: 直接起動

```powershell
& "C:\TradingView\TradingView.exe" --remote-debugging-port=9224 --user-data-dir=C:\TradingView\profiles\worker2 --in-process-gpu
```

### 起動後に worker2 プロセス確認

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.Name -eq "TradingView.exe" -and $_.CommandLine -match "9224" } |
  Select-Object ProcessId, CommandLine |
  Format-List
```

> 同じコマンドを再実行しても、新しい見た目の変化が少ないことがある。  
> まず上の確認コマンドで既に起動中かを確認すること。

## 4. 初回ログイン

1. worker2 を上のコマンドで起動
2. 開いた TradingView で **Apple ログインを手動実施**
3. チャートが開ける状態まで進める
4. 以後は同じ `--user-data-dir` を使って profile を再利用する

> worker2 で `json/list` に `app/dialog-window ... type=welcome` が出る場合、  
> profile の初期化 / ログインが完了しておらず、backtest が `study_added: false` のまま失敗することがある。  
> 一時的に close しても再表示する場合は、TradingView ウィンドウ側で手動ログインまたは初期セットアップ完了が必要。

### 手動ログイン後の再試行手順

1. worker2 を `--user-data-dir=C:\TradingView\profiles\worker2` 付きで起動
2. TradingView ウィンドウ側で **ブラウザログイン** または初期セットアップを完了
3. `curl http://172.31.144.1:9225/json/list` で `dialog-window ... type=welcome` が消えていることを確認
4. `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status` を再実行
5. `chart_symbol` と `api_available: true` が返ったら backtest を再試行

```bash
curl http://172.31.144.1:9225/json/list
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js backtest nvda-ma
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js backtest preset rsi-mean-reversion --symbol NVDA
```

## 5. portproxy / CDP 確認

### Windows で portproxy を確認

```powershell
netsh interface portproxy show all
```

期待値:

- `0.0.0.0:9225 -> 127.0.0.1:9224`

### WSL から worker2 の CDP を確認

```bash
curl http://172.31.144.1:9225/json/version
```

JSON が返れば CDP 到達性はある。

## 6. CLI で worker2 状態確認

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status
```

成功時は `success: true` と chart target 情報が返る。

## 7. よく使う確認セット

### 全停止 → 起動 → 確認

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.Name -eq "TradingView.exe" } |
  Select-Object ProcessId, CommandLine |
  Format-List
```

```powershell
Stop-Process -Id <PID1>,<PID2>,<PID3>
```

```powershell
Start-Process "C:\TradingView\TradingView.exe" -ArgumentList "--remote-debugging-port=9224","--user-data-dir=C:\TradingView\profiles\worker2","--in-process-gpu"
```

```powershell
netsh interface portproxy show all
```

```bash
curl http://172.31.144.1:9225/json/version
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status
```

## 8. 今回ユーザーが手で実行するコマンド

### worker2 を見えるセッションで起動

```powershell
cmd /c start "" /D C:\TradingView C:\TradingView\TradingView.exe --remote-debugging-port=9224 --user-data-dir=C:\TradingView\profiles\worker2 --in-process-gpu
```
Stop-Process -Id <PID1>,<PID2>,<PID3>
C:\TradingView\TradingView.exe --remote-debugging-port=9224 --user-data-dir=C:\TradingView\profiles\worker2 --in-process-gpu

このコマンドを **Windows の見えているデスクトップで開いた PowerShell または Win+R から** 実行する。




Windows PowerShell
Copyright (C) Microsoft Corporation. All rights reserved.

新機能と改善のために最新の PowerShell をインストールしてください!https://aka.ms/PSWindows

PS C:\Users\szk> cmd /c start "" /D C:\TradingView C:\TradingView\TradingView.exe --remote-debugging-port=9224 --user-data-dir=C:\TradingView\profiles\worker2 --in-process-gpu
PS C:\Users\szk> Stop-Process -Id 5356
Stop-Process : 次のエラーのため、プロセス "TradingView (5356)" を停止できません: アクセスが拒否されました。
発生場所 行:1 文字:1
+ Stop-Process -Id 5356
+ ~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : CloseError: (System.Diagnostics.Process (TradingView):Process) [Stop-Process]、ProcessCom
    mandException
    + FullyQualifiedErrorId : CouldNotStopProcess,Microsoft.PowerShell.Commands.StopProcessCommand

PS C:\Users\szk>













Copyright (C) Microsoft Corporation. All rights reserved.

新機能と改善のために最新の PowerShell をインストールしてください!https://aka.ms/PSWindows

PS C:\WINDOWS\system32> Stop-Process -Id <PID1>,<PID2>,<PID3>
>> ^C
PS C:\WINDOWS\system32> Stop-Process -Id 5356 -Force
PS C:\WINDOWS\system32> & "C:\TradingView\TradingView.exe" --remote-debugging-port=9224 --user-data-dir=C:\TradingView\profiles\worker2 --in-process-gpu
>>
PS C:\WINDOWS\system32> ^A^A26-04-06 15:59:45.814   [DBG] AppEventService.focusWebContent()
 : 用語 '' は、コマンドレット、関数、スクリプト ファイル、または操作可能なプログラムの名前として認識されません。名
前が正しく記述されていることを確認し、パスが含まれている場合はそのパスが正しいことを確認してから、再試行してください。
発生場所 行:1 文字:1n ws://127.0.0.1:9224/devtools/browser/72af5670-f663-42dc-bf5d-9a85759b35d1
+ 26-04-06 15:52:04.185   [DBG] Check config path: 'C:\Users\szk\Documents\TradingView\configs\config.json'
+ ~~-04-06 15:52:04.185   [DBG] Check config path: 'C:\TradingView\resources\app.asar\configs\config.json'
    + CategoryInfo          : ObjectNotFound: (:String) [], CommandNotFoundExceptionconfigs\config.json'
    + FullyQualifiedErrorId : CommandNotFoundExceptionnfigFromEnvironment(): "TVD_DEBUGMODE: false"
 026-04-06 15:52:04.186   [DBG] Configuration.updateConfigFromEnvironment(): "TVD_LOG_VIEW_ENABLED: false"
PS C:\WINDOWS\system32>   [DBG] Initializing UserService
PS C:\WINDOWS\system32>   [INF] Initializing AppEventService
PS C:\WINDOWS\system32>   [DBG] Initializing AuthenticationHandler
PS C:\WINDOWS\system32>   [DBG] Logger initialized
PS C:\WINDOWS\system32>   [DBG] Initializing PersistenceService
PS C:\WINDOWS\system32> & "C:\TradingView\TradingView.exe" --remote-debugging-port=9224 --user-data-dir=C:\TradingView\profiles\worker2 --in-process-gpuMainService.subscribeAppEvents()
>> 6-04-06 15:52:04.356   [DBG] Initializing LocaleService
PS C:\WINDOWS\system32>   [INF] Main service created. appPath: 'C:\TradingView\resources\app.asar', documentsPath: 'C:\U
Initializing LoggerServiceView'
2026-04-06 16:03:13.174   [DBG] Electron.App (second-instance): AppEventsServiceHandler
2026-04-06 16:03:13.174   [DBG] AppEventService.openForwardedUrl()
2026-04-06 16:03:13.174   [DBG] Electron.App (second-instance): WindowServiceHandler
2026-04-06 16:03:13.182   [DBG] AppEventService.focusWebContent()
2026-04-06 16:03:13.189   [DBG] AppEventService.focusWebContent()
2026-04-06 16:03:13.189   [DBG] AuthenticationHandler.tryObtainTokenFromClipboard()
[14496:0406/160313.205:ERROR:net\socket\tcp_socket_win.cc:530] bind() returned an error: 通常、各ソケット アドレスに対してプロトコル、ネットワーク アドレス、またはポー