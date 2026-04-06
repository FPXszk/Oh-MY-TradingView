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
