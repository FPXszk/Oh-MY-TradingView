# Dual-worker parallel backtest runbook

> **注意**: このランブックは dual-worker 並列の参照資料として残す。**現行の既定運用は worker1 single-worker（Windows `9222` -> WSL `9223`）/ sequential** であり、worker2 の `9224` / `9225` は履歴上の dual-worker 参照である。

## Purpose

この runbook は、TradingView Desktop の worker1 / worker2 を使って、WSL から別々の backtest を並列実行するための既知の正常手順と、2026-04-06 時点の未解決制約をまとめる。

> current handoff / latest result は `docs/research/current/` を先頭に読む。  
> 直前世代の docs は `docs/research/` 直下、2 世代以上前は `docs/research/archive/`（既定では読まない archive）。  
> この runbook の保証範囲は **dual-worker / 2 worker 並列** までで、4並列は未検証。

## pane/tab support と parallel backtest の関係

- `tv_tab_list` / `tv_tab_switch` は **現在 layout 内の chart slot** を操作するもので、top-level workspace tabs ではない
- `tv_pane_list` / `tv_pane_focus` もチャートペインの選択であり、別プロセスでの並列実行ではない
- 現在の backtest / pine / price / health の各フローは `window.TradingViewApi._activeChartWidgetWV.value()` 前提の **active-chart-only** 実装
- したがって pane/tab support は **chart slot の切替短縮・比較レイアウト・事前配置** の補助導線として有用だが、true parallel backtest の根拠にはならない
- true parallel backtest は本 runbook の dual-worker（別プロセス / 別 CDP port）ベースで実現する

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
> `logs/sessions/dual-worker-parallel-backtest-handoff_20260406_0735.md` と  
> `logs/sessions/tradingview-parallel-backtest-stabilization_20260406_0802.md` を参照。

## Stability conditions (confirmed 2026-04-06)

並列バックテストが安定するために確認された条件:

| # | 条件 | 理由 |
|---|---|---|
| 1 | dual-worker reachability が維持されていること | CDP proxy 経由で両 worker に到達できなければ前提が崩れる |
| 2 | `restore_policy: "skip"` であること | restore path の `main series is not started` を回避し、backtest-applied strategy を残す運用に寄せる |
| 3 | Strategy Tester `指標` タブを明示活性化できる現在の backtest 実装であること | tester panel が visible でも metrics rows / API が空のまま止まる場合があった |
| 4 | warmed state であること | fresh cold start 直後は Pine Editor false negative を含む不安定さが残りうる |

> fresh profile / fresh app restart 直後の再現性は未検証。

## Long-running research workload guidance (provisional)

round8 の `204 run` workload を `worker1=Mag7 84 run` / `worker2=alt 120 run` で固定分割した follow-up では、

- past runtime 基準で `20.13 min` vs `29.93 min`
- gap `9.8 min`
- 実測では worker2 途中断により `74 run` の retry

となり、**少なくとも round8 follow-up の観測では、固定 universe 分割は長時間 workload の運用形として粗かった** と分かった。

### Recommended split strategy

長時間の research batch では、**現時点の暫定運用指針として** 次を優先する。  
（小規模 20 run / 中規模 32 run の両 benchmark で shard が最速だったため、2026-04-06 時点で順位を更新）

1. **shard parallel**
   - 小・中規模ともに最速。unreadable の分散効果が runtime-aware 均等化を上回った
   - shard 粒度は workload に応じて調整し、health check と retry 境界を揃えやすい単位を優先する
2. **strategy-aware parallel**（fallback）
   - 理論的には runtime 均等化で均一な wall-clock を狙えるが、unreadable cluster が strategy 単位で固まる弱点がある
   - 将来的に unreadable パターンが変化した場合に再評価する

### Why

- 固定 `Mag7 / alt` 分割は retry 範囲が大きい
- shard parallel は unreadable を均等に分散し、結果として wall-clock が短くなった
- strategy-aware は unreadable cluster が strategy 単位で固まるリスクがあり、実測で shard に劣った
- checkpoint は観測・再開境界として有用だが、wall-clock 改善は期待しない
- naive な partial retry（unreadable 1 回で即 rollback）は retry amplification で逆効果になった

### Small-sample caveat

2026-04-06 の `20 run` sample benchmark では、warm-up 後でも `metrics_unreadable` が strategy ごとに固まり、

- strategy-aware parallel: `279,535 ms`, unreadable `8`
- 2-run shard parallel: `265,226 ms`, unreadable `7`

となり、**小さい workload では shard の方が速かった**。  
この時点では strategy-aware を暫定第一候補としていたが、中規模 sample で追試した結果（下記 Mid-sample update）、**shard の優位が再現したため第一候補を shard に変更した**。

### Mid-sample update

同日の `32 run` sample benchmark でも、

- strategy-aware parallel: `447,922 ms`, unreadable `14`
- shard parallel: `432,416 ms`, unreadable `12`
- hybrid parallel (`4-run micro-shard checkpoint`): `448,916 ms`, unreadable `14`

で、**shard の方が速い傾向が再現した**。  
また、`metrics_unreadable` を 1 回検知した時点で micro-shard rollback + partial retry へ切り替える現在の実装は、

- hybrid partial retry: `756,911 ms`

となり、**wall-clock を悪化させた**。

したがって現時点では、checkpoint は retry 境界として有用でも、**`unreadable 1 回` を即 rollback trigger にするのは非推奨**とみなす。

### 暫定順位（2026-04-06 時点、小・中規模 benchmark に基づく）

| 順位 | mode | 位置づけ |
|---|---|---|
| 1 | shard parallel | **第一候補**。小・中規模ともに最速 |
| 2 | strategy-aware parallel | fallback。理論優位はあるが実測で劣る |
| 3 | hybrid parallel | checkpoint の observability は有用だが wall-clock 改善なし |
| — | hybrid partial retry | **非推奨**。naive trigger は retry amplification で逆効果 |

> 長時間 workload（100+ run）での追試はまだ行っていない。大規模 sample で結果が変わる可能性は残る。

### Operational gates

長時間 batch の前に、各 worker で以下を満たすことを**暫定基準**とする。

1. `tester_available: true` を **3 連続**
2. `metrics_unreadable = 0` の warm-up を通す
3. `restore_policy: "skip"` / `restore_success: true` / `restore_skipped: true` を確認する

### Health check cadence

- **10 run ごと**に `status` / `json/version` を確認することを、現時点の暫定 cadence とする
- 応答なし、または readiness 崩れを検知したら当該 shard で止める
- recovery は full rerun を避けつつ、checkpoint を使った **限定的な partial retry** を検討する

### Restart budget

- 1 parallel session あたり worker 再起動は **最大 1 回** を暫定 budget とする
- 2 回目の crash では full batch 継続より原因切り分けを優先する

## Both-visible feasibility (follow-up)

2026-04-06 の follow-up で、worker1 も Session1 に載せて **visible + visible** を試した。

### Confirmed

- WSL から通常の `cmd /c start` / `Start-Process` で起動した新規 worker は Session0 に落ちた
- Task Scheduler の `/IT` 起動なら、TradingView worker を Session1 に載せられた
- worker1 / worker2 を同じ Session1 へ載せた状態で
  - individual preset backtest は両 worker success
  - parallel distinct preset backtest では両 worker が `metrics_unreadable`

### Current conclusion

- **same-session visible + visible は launch 可能だが、parallel backtest の stable topology ではなかった**
- 現時点の推奨構成は引き続き
  - worker1: Session0 hidden
  - worker2: Session1 visible
- 4並列は worker3 / worker4 の topology、追加 portproxy、warm-up gate、health cadence を含めて未検証であり、現行 runbook には含めない
- 追加で試す価値がある代替案は **別 Windows user / 別 interactive session の visible + visible** だが、これは未検証
- 検証後は worker1 を Session0 に戻し、warm-up 後に parallel が再び読める状態まで確認した

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

### visible + visible では individual は通るのに parallel だけ落ちる

- same-session visible + visible の follow-up では、individual success の後でも parallel 時に両 worker が `metrics_unreadable` を返した
- つまり visible 化そのものよりも、**同一 visible session に 2 worker を載せたこと**が tester metrics 読み取りに悪影響を与えている可能性がある

### `dialog-window ... type=welcome` が残る

- browser login が Desktop に戻っていない
- `秘密鍵をコピー` を押して Desktop 側へ戻し、必要なら onboarding を進める

## Current default policy (updated 2026-04-10)

2026-04-09 の実運用で parallel smoke が安定しなかった経験に基づき、既定の運用ポリシーを以下に変更した。

### 新標準

| 項目 | 既定値 | 旧既定値 |
|---|---|---|
| 実行モード | sequential（単一 worker） | parallel（dual-worker） |
| 既定ポート | `9225`（Session1 visible） | `9223,9225` |
| 既定 phases | `smoke → full` | `smoke → pilot → full` |
| fallback | `9223`（必要時のみ手動切替、auto-resume なし） | 自動 fallback |
| resume | 同一 phase checkpoint のみ | 同一 phase checkpoint のみ |

### Parallel opt-in

並列実行は完全削除ではなく、明示的な opt-in として残っている。

```bash
# parallel: --ports で複数ポートを明示
node scripts/backtest/run-long-campaign.mjs <campaign> --phase full --host 172.31.144.1 --ports 9223,9225

# sequential (default): 単一ポート
node scripts/backtest/run-long-campaign.mjs <campaign> --phase full --host 172.31.144.1 --ports 9225
```

### Pilot の扱い

- `pilot` phase は campaign config に互換目的で残っているが、標準フロー（`smoke → full`）からは外れている
- 既存の `pilot` checkpoint（例: `artifacts/campaigns/next-long-run-us-finetune-100x10/pilot/checkpoint-50.json`）は historical artifact として保持し、`full` への流用は不可

## References

- `docs/command.md`
- `docs/exec-plans/active/checkpoint-resume-sequential-visible-backtest_20260410_1052.md`
- `logs/sessions/wsl-dual-worker-reachability_20260406_0305.md`
- `logs/sessions/dual-worker-distinct-strategy-backtest_20260406_0423.md`
- `logs/sessions/tradingview-parallel-backtest-verification_20260406_0053.md`
- `logs/sessions/dual-worker-parallel-backtest-handoff_20260406_0735.md`
