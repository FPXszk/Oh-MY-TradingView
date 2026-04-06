# Dual-worker parallel backtest runbook

## Purpose

この runbook は、TradingView Desktop の worker1 / worker2 を使って、WSL から別々の backtest を並列実行するための既知の正常手順と、2026-04-06 時点の未解決制約をまとめる。

## Known-good topology

| worker | Windows session | direct CDP | WSL proxy | profile | onboarding recovery baseline |
|---|---|---:|---:|---|---|
| worker1 | Session0 | `9222` | `9223` | default | `BATS:AAPL` |
| worker2 | visible Session1 | `9224` | `9225` | `C:\TradingView\profiles\worker2` | `BATS:AAPL` |

## What required manual intervention

手動が必要だったのは **worker2 の初回ブラウザログイン** だけだった。

1. visible session で worker2 を起動する
2. Apple ログインをブラウザで完了する
3. `秘密鍵をコピー` が表示されたら押し、TradingView Desktop に戻る

> `秘密鍵` は Desktop へ返す一時的なログイントークンであり、他へ貼り付けたり保存したりしない。

## What the agent / CLI side could handle during this recovery

- `json/version` / `json/list` / CLI `status` による CDP 到達性確認
- Session0 の hidden worker2、`9224` 競合、`error code 32` の切り分け
- `dialog-window ... type=welcome` の検出
- browser handoff 後の onboarding 状態確認
- 一部条件下での onboarding の `次へ` / `わかりました` 押下と dialog 消失確認
- 単発 backtest 実行と結果取得

> 認証そのものを repo が自動化しているわけではない。  
> 認証後の状態確認・進行・検証を CDP 経由で実施できた、という意味で CLI / agent 側が処理できた。

## Stable launch and health-check sequence

### 1. Clean stop if needed

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.Name -eq "TradingView.exe" } |
  Select-Object ProcessId, SessionId, CommandLine |
  Format-List

Stop-Process -Id <PID1>,<PID2>
```

アクセス拒否時は管理者 PowerShell:

```powershell
Stop-Process -Id <PID> -Force
```

### 2. Launch both workers

```powershell
cmd /c start "" /D C:\TradingView C:\TradingView\TradingView.exe --remote-debugging-port=9222 --in-process-gpu
cmd /c start "" /D C:\TradingView C:\TradingView\TradingView.exe --remote-debugging-port=9224 --user-data-dir=C:\TradingView\profiles\worker2 --in-process-gpu
```

### 3. Verify proxy reachability from WSL

```bash
curl -sS http://172.31.144.1:9223/json/version
curl -sS http://172.31.144.1:9225/json/version
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status
```

期待値:

- `success: true`
- `api_available: true`
- worker2 の `json/list` に `dialog-window ... type=welcome` が出ていない

### 4. Run distinct backtests

個別確認:

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset ema-cross-9-21 --symbol NVDA
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js backtest preset rsi-mean-reversion --symbol NVDA
```

並列実行:

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

## Current known-good worker2 state

以下は onboarding 完了後に確認できた状態。

- target URL: `https://jp.tradingview.com/chart/JV6Tvois/`
- `status.success: true`
- `api_available: true`
- `chart_symbol: BATS:AAPL`
- `dialog-window ... type=welcome` が消失済み

## Latest verification result

### Confirmed

- `npm test` は `198/198` pass
- worker1 / worker2 の `json/version` は WSL proxy 経由で応答した
- worker1 / worker2 の `status` はともに success を返した
- worker2 は browser login / clipboard handoff / onboarding 完了後に saved chart まで復旧した
- worker2 では helper 単体 (`ensurePineEditorOpen`, `getSource`) や direct core replay の一部が成功した

### Stabilized in follow-up

- `src/core/pine.js` 側で editor ensure retry を強化した
- `src/core/backtest.js` 側で Strategy Tester の `指標` タブを明示活性化するようにした
- restore policy は default `skip` となり、backtest-applied strategy / indicator をチャート上に残す運用へ寄せた
- この current backtest 実装で
  - worker1 individual preset backtest -> success
  - worker2 individual preset backtest -> success
  - warmed parallel distinct preset backtest -> **3 ラウンド連続 success**
  を確認した

期待できる result shape:

- `success: true`
- `tester_available: true`
- `restore_policy: "skip"`
- `restore_success: true`
- `restore_skipped: true`

> 途中の失敗経緯と切り分けは  
> `docs/working-memory/session-logs/dual-worker-parallel-backtest-handoff_20260406_0735.md` と  
> `docs/working-memory/session-logs/tradingview-parallel-backtest-stabilization_20260406_0802.md` を参照。

## Stability conditions (confirmed 2026-04-06)

並列バックテストが安定するために確認された条件:

| # | 条件 | 理由 |
|---|---|---|
| 1 | dual-worker reachability が維持されていること | CDP proxy 経由で両 worker に到達できなければ前提が崩れる |
| 2 | `restore_policy: "skip"` であること | restore path の `main series is not started` を回避し、backtest-applied strategy を残す運用に寄せる |
| 3 | Strategy Tester `指標` タブを明示活性化できる現在の backtest 実装であること | tester panel が visible でも metrics rows / API が空のまま止まる場合があった |
| 4 | warmed state であること | fresh cold start 直後は Pine Editor false negative を含む不安定さが残りうる |

> fresh profile / fresh app restart 直後の再現性は未検証。

## Troubleshooting

### `error code 32` / bind conflict

- hidden Session0 worker2 が `9224` を掴んでいることが多い
- まず `Get-CimInstance Win32_Process` で `--remote-debugging-port=9224` の PID を確認する

### `Stop-Process` のアクセス拒否

- 管理者 PowerShell を使い `-Force` を付ける

### worker2 が黒画面に見える

- UI が正しく描画されていなくても、`status` / `json/list` / saved chart URL の側は正常なことがある
- 判定は UI の見た目ではなく CDP / CLI で行う

### parallel command が不安定だった理由

- `status` success は backtest readiness を保証しない
- 途中の切り分けでは
  - Pine Editor false negative
  - Strategy Tester panel は開くが `指標` タブ内容が未描画
  - restore path の `main series is not started`
  が混在していた
- follow-up では
  - editor ensure retry
  - tester `指標` タブの明示活性化
  - restore skip
  により、parallel command を安定運用コマンドとして使える状態まで寄せた

### `dialog-window ... type=welcome` が残る

- browser login が Desktop に戻っていない
- `秘密鍵をコピー` を押して Desktop 側へ戻し、必要なら onboarding を進める

## References

- `command.md`
- `docs/working-memory/session-logs/wsl-dual-worker-reachability_20260406_0305.md`
- `docs/working-memory/session-logs/dual-worker-distinct-strategy-backtest_20260406_0423.md`
- `docs/working-memory/session-logs/tradingview-parallel-backtest-verification_20260406_0053.md`
- `docs/working-memory/session-logs/dual-worker-parallel-backtest-handoff_20260406_0735.md`
