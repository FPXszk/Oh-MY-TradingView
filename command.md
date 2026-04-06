# Command Reference: TradingView dual-worker operation

Windows 側は **PowerShell**、WSL 側は **bash** を前提にした運用メモ。

## 1. 現在の既知の正常トポロジ

- worker1
  - Windows CDP: `127.0.0.1:9222`
  - WSL proxy: `172.31.144.1:9223`
  - profile: default
- worker2
  - Windows CDP: `127.0.0.1:9224`
  - WSL proxy: `172.31.144.1:9225`
  - profile: `C:\TradingView\profiles\worker2`

> `172.31.144.1` はその時点の Windows host IP の例。再起動後に変わることがある。  
> `.env` で Apple ログインは自動化できない。

## 2. TradingView プロセス確認

### すべての TradingView プロセスを表示

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.Name -eq "TradingView.exe" } |
  Select-Object ProcessId, SessionId, CommandLine |
  Format-List
```

### worker2 (`9224`) だけ表示

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.Name -eq "TradingView.exe" -and $_.CommandLine -match "9224" } |
  Select-Object ProcessId, SessionId, CommandLine |
  Format-List
```

## 3. TradingView をクリーンに停止

### 通常 PowerShell

```powershell
Stop-Process -Id <PID1>,<PID2>,<PID3>
```

### アクセス拒否が出る場合は管理者 PowerShell

```powershell
Stop-Process -Id <PID> -Force
```

## 4. 安定していた起動コマンド

### worker1

```powershell
cmd /c start "" /D C:\TradingView C:\TradingView\TradingView.exe --remote-debugging-port=9222 --in-process-gpu
```

### worker2

```powershell
cmd /c start "" /D C:\TradingView C:\TradingView\TradingView.exe --remote-debugging-port=9224 --user-data-dir=C:\TradingView\profiles\worker2 --in-process-gpu
```

> `& "C:\TradingView\TradingView.exe" ...` の直起動は、PowerShell コンソールに Electron ログが流れ込みやすく、`second-instance` / bind 競合の切り分けも混ざるため、運用上は `cmd /c start` を優先する。

## 5. worker2 初回ログインの境界

### 手動が必要だった箇所

1. worker2 を visible session で起動する
2. ブラウザで Apple ログインを完了する
3. ブラウザに `秘密鍵をコピー` が出たら押し、Desktop へ戻る

> `秘密鍵` は実質的に Desktop へ戻すためのログイントークン。  
> 他の場所に貼り付けたり保存したりしない。

### その後に CLI / CDP 側で確認できること

- `json/list` で `dialog-window ... type=welcome` の有無を確認
- `status` で `success: true` / `api_available: true` を確認
- onboarding が表示された後は CDP 経由で状態確認・進行が可能

## 6. 疎通確認

### Windows で portproxy を確認

```powershell
netsh interface portproxy show all
```

期待値:

- `0.0.0.0:9223 -> 127.0.0.1:9222`
- `0.0.0.0:9225 -> 127.0.0.1:9224`

### WSL から CDP を確認

```bash
curl -sS http://172.31.144.1:9223/json/version
curl -sS http://172.31.144.1:9225/json/version
curl -sS http://172.31.144.1:9225/json/list
```

### WSL から CLI status を確認

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status
```

成功時は `success: true` と chart target 情報が返る。

## 7. backtest 実行コマンド

### 個別実行

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset ema-cross-9-21 --symbol NVDA
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js backtest preset rsi-mean-reversion --symbol NVDA
```

### 並列実行

```bash
(
  TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 \
  node src/cli/index.js backtest preset ema-cross-9-21 --symbol NVDA
) &
(
  TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 \
  node src/cli/index.js backtest preset rsi-mean-reversion --symbol NVDA
) &
wait
```

> 2026-04-06 の最新検証で、`restore_policy: "skip"` と Strategy Tester `指標` タブ活性化を含む
> 現在の backtest 実装にて、warmed parallel distinct preset backtest が 3 ラウンド連続 success した。  
> ただし fresh cold start 直後の並列再現性はまだ未検証。

## 7a. 並列実行の安定条件

- dual-worker reachability が維持されていること
- `restore_policy` が `skip` であること（現在の default）
- Strategy Tester の `指標` タブ活性化を伴う現在の backtest 実装であること
- warmed state として、parallel 前に各 worker で individual backtest success を一度通しておくこと

## 7b. both visible feasibility の結論

- **推奨の stable 構成は引き続き `Session0 hidden + visible Session1`**
- WSL から `cmd /c start` / `Start-Process` で TradingView を起動すると、新しい worker は Session0 に落ちやすい
- **Task Scheduler の `/IT` 起動**なら worker を Session1 に載せられる
- ただし **same-session の visible + visible** は
  - individual backtest: worker1 / worker2 とも success
  - parallel backtest: 両 worker とも `tester_reason_category: "metrics_unreadable"`
  となり、実運用の stable 構成にはならなかった
- そのため、可視性を上げたい場合でも **worker2 を visible に保ち、worker1 は Session0 hidden のまま使う**のが現時点の現実解

期待する result shape:

- `success: true`
- `tester_available: true`
- `restore_policy: "skip"`
- `restore_success: true`
- `restore_skipped: true`

## 8. よくある失敗パターン

### `error code 32` / socket address in use

- `9224` を別の hidden worker2 が掴んでいる
- `Get-CimInstance Win32_Process` で PID を確認し、必要なら管理者 PowerShell で停止する

### `Stop-Process` でアクセス拒否

- 管理者 PowerShell で `Stop-Process -Id <PID> -Force`

### `json/list` に `dialog-window ... type=welcome` が残る

- worker2 の browser login / onboarding が未完了
- この状態では `study_added: false` / `apply_failed: true` になりやすい

### 画面が黒いのに browser login は通ったように見える

- Desktop 側は起動済みでも、welcome / onboarding が前面描画できていないだけのことがある
- `status` と `json/list` を優先し、UI の見え方だけで失敗判定しない

### `status` は成功するのに backtest だけ失敗する

- 途中の切り分けでは、`status.success: true` / `api_available: true` の状態でも
  `Could not open Pine Editor.` や tester metrics unreadable が再現した
- 後続の安定化では
  - Pine Editor retry 強化
  - Strategy Tester `指標` タブ活性化
  - `restore_policy: "skip"`
  で warmed parallel の安定実行まで改善した
- fresh cold start 側は引き続き注意する

### 両方 visible にしたい

- **起動自体**は Task Scheduler `/IT` を使えば可能
- ただし 2026-04-06 の検証では、**same-session visible + visible** で parallel 実行時に両 worker が `metrics_unreadable` へ落ちた
- 現時点では **same-session visible + visible は非推奨**
- 追加で試す価値があるのは、**別 Windows user / 別 interactive session** を使った visible + visible だが、これは未検証

## 7c. 長時間 workload の分割指針（暫定）

- `Mag7 / alt` のような **意味上きれいな固定 2 分割** は、round8 follow-up では偏りと retry 範囲の大きさが目立った
- round8 `204 run` の follow-up では
  - fixed split: `84 / 120 run`
  - past runtime 基準: `20.13 min / 29.93 min`
  - worker2 途中断後の recovery target: `74 run`
  だった
- そのため、次回の暫定推奨は
  1. **strategy 単位チャンク + runtime-aware 配分**
  2. **30〜40 run shard + checkpoint / partial retry**
- 長時間 batch の前提条件も、warm-up 1 回成功ではなく
  - `tester_available: true` の **3 連続**
  - `metrics_unreadable = 0`
  - `restore_policy: "skip"` 系 result shape の確認
  まで引き上げる
- 本番中は **10 run ごと** に `status` / `json/version` を確認し、崩れたら full rerun ではなく partial retry を優先する
- ただし `20 run` の小 sample benchmark では
  - strategy-aware parallel: `279,535 ms`
  - 2-run shard parallel: `265,226 ms`
  で、**shard の方が速かった**
- つまり、`metrics_unreadable` が strategy 単位で固まる局面では、理論上の runtime 均等化より **細かい shard の分散効果** が勝つことがある

## 9. 参照先

- `docs/design-docs/dual-worker-parallel-backtest-runbook_20260406_0735.md`
- `docs/working-memory/session-logs/dual-worker-parallel-backtest-handoff_20260406_0735.md`
- `docs/working-memory/session-logs/tradingview-parallel-backtest-stabilization_20260406_0802.md`
- `docs/working-memory/session-logs/wsl-dual-worker-reachability_20260406_0305.md`
- `docs/working-memory/session-logs/dual-worker-distinct-strategy-backtest_20260406_0423.md`
