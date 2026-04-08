# Command Reference: TradingView dual-worker operation

Windows 側は **PowerShell**、WSL 側は **bash** を前提にした運用メモ。

> 現在の handoff と最新結果は `docs/research/latest/` を先頭に読む。  
> この文書で known-good として扱うのは **dual-worker / 2 worker 並列** までで、4並列は未検証。

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

### 日付範囲オーバーライド付き個別実行

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 \
  node src/cli/index.js backtest preset ema-cross-9-21 --symbol NVDA --date-from 2000-01-01 --date-to 2099-12-31
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
- そのため、暫定推奨は以下の通り（小・中規模 benchmark の実測結果を反映して更新）
  1. **shard parallel**（小・中規模ともに最速。unreadable 分散効果が runtime-aware 均等化を上回った）
  2. **strategy-aware parallel**（理論的な runtime 均等化の利点はあるが、実測では shard に劣る）
- ここでいう parallel は **current stable topology の 2 worker 並列** を指す
- checkpoint は観測・再開境界として有用
- ただし、naive な `unreadable 1 回` 即 rollback の partial retry は非推奨
- 長時間 batch の前提条件も、warm-up 1 回成功ではなく
  - `tester_available: true` の **3 連続**
  - `metrics_unreadable = 0`
  - `restore_policy: "skip"` 系 result shape の確認
  まで引き上げる
- 本番中は **10 run ごと** に `status` / `json/version` を確認し、崩れたらまず当該 shard で止める
- recovery は full rerun を避けつつ、checkpoint を使った **限定的な partial retry** を検討する
- repo core の tester read では、`panel_not_visible` は従来同等の可視化待機予算を維持しつつ、`no_strategy_applied` は早期終了し、`metrics_unreadable` のみ追加再試行対象を短縮する
- さらに 2026-04-07 の follow-up で、`metrics_unreadable` に対する result contract を整理した
- result に
  - `tester_reason_category: "metrics_unreadable"`
  - `fallback_source`
  - `fallback_metrics`
  - `degraded_result: true`
  - `rerun_recommended: false`
  が揃っている場合は、**strategy-aware fallback がある経路に限って**即 rerun より checkpoint 継続を優先する
- preset のように strategy-aware fallback が無い経路では、`metrics_unreadable` は `rerun_recommended: true` を返すだけで、`fallback_metrics` は付けない
- ただし `20 run` の小 sample benchmark では
  - strategy-aware parallel: `279,535 ms`
  - 2-run shard parallel: `265,226 ms`
  で、**shard の方が速かった**
- つまり、`metrics_unreadable` が strategy 単位で固まる局面では、理論上の runtime 均等化より **細かい shard の分散効果** が勝つことがある
- `32 run` の中規模 sample でも
  - strategy-aware parallel: `447,922 ms`
  - shard parallel: `432,416 ms`
  - hybrid parallel: `448,916 ms`
  で、やはり **shard が最速** だった
- 一方、`metrics_unreadable` を 1 回検知したらその micro-shard を rollback して partial retry する current 実装は
  - hybrid partial retry: `756,911 ms`
  となり、**sequential より遅くなった**
- そのため、現時点では **checkpoint は観測・再開境界として使い、`unreadable 1 回` を即 rollback trigger にしない** 方が安全
- なお、この順位更新は `20 run` / `32 run` benchmark に基づくもので、`100+ run` の大規模 workload での追試はまだ未実施
- 4並列は port / topology / health gate を含めて未検証であり、この文書の運用保証範囲には含めない

## 9. キャンペーンバッチ実行

### キャンペーン設定

`config/backtest/campaigns/` に JSON 形式のキャンペーン定義を配置する。

```json
{
  "id": "long-run-cross-market-100x5",
  "universe": "long-run-cross-market-100",
  "preset_ids": [
    "donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight",
    "donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early",
    "donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide",
    "donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early",
    "donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight"
  ],
  "date_override": { "from": "2000-01-01", "to": "2099-12-31" },
  "phases": {
    "smoke": { "symbol_count": 10 },
    "pilot": { "symbol_count": 25 },
    "full": { "symbol_count": 100 }
  },
  "execution": {
    "worker_ports": [9223, 9225],
    "checkpoint_every": 10,
    "cooldown_ms": 1000,
    "max_consecutive_failures": 5,
    "max_rerun_passes": 2
  }
}
```

### キャンペーン実行

```bash
# ドライラン（実行せずマトリクスを確認）
node scripts/backtest/run-long-campaign.mjs long-run-cross-market-100x5 --phase smoke --dry-run

# smoke / pilot / full
node scripts/backtest/run-long-campaign.mjs long-run-cross-market-100x5 --phase smoke --host 172.31.144.1 --ports 9223,9225
node scripts/backtest/run-long-campaign.mjs long-run-cross-market-100x5 --phase pilot --host 172.31.144.1 --ports 9223,9225
node scripts/backtest/run-long-campaign.mjs long-run-cross-market-100x5 --phase full --host 172.31.144.1 --ports 9223,9225
```

### 中断からの復旧

```bash
# 最新チェックポイントから自動再開
node scripts/backtest/recover-campaign.mjs long-run-cross-market-100x5 --phase full --host 172.31.144.1 --ports 9223,9225

# 特定のチェックポイントから再開
node scripts/backtest/run-long-campaign.mjs long-run-cross-market-100x5 \
  --phase pilot \
  --host 172.31.144.1 \
  --ports 9223,9225 \
  --resume results/campaigns/long-run-cross-market-100x5/pilot/checkpoint-50.json
```

結果は `results/campaigns/<campaign-id>/<phase>/` に保存される。チェックポイントは `execution.checkpoint_every` ごとに書き出され、resume 時は `campaign_id` / `phase` / fingerprint が一致する checkpoint だけを受け付ける。

### market-specific long-run deep dive

```bash
# US entry sweep
node scripts/backtest/run-long-campaign.mjs long-run-us-entry-sweep-50x3 --phase smoke --dry-run
node scripts/backtest/run-long-campaign.mjs long-run-us-entry-sweep-50x3 --phase smoke --host 172.31.144.1 --ports 9223,9225
node scripts/backtest/run-long-campaign.mjs long-run-us-entry-sweep-50x3 --phase pilot --host 172.31.144.1 --ports 9223,9225
node scripts/backtest/run-long-campaign.mjs long-run-us-entry-sweep-50x3 --phase full --host 172.31.144.1 --ports 9223,9225

# JP exit sweep
node scripts/backtest/run-long-campaign.mjs long-run-jp-exit-sweep-50x3 --phase smoke --dry-run
node scripts/backtest/run-long-campaign.mjs long-run-jp-exit-sweep-50x3 --phase smoke --host 172.31.144.1 --ports 9223,9225
node scripts/backtest/run-long-campaign.mjs long-run-jp-exit-sweep-50x3 --phase pilot --host 172.31.144.1 --ports 9223,9225
node scripts/backtest/run-long-campaign.mjs long-run-jp-exit-sweep-50x3 --phase full --host 172.31.144.1 --ports 9223,9225

# recovery
node scripts/backtest/recover-campaign.mjs long-run-us-entry-sweep-50x3 --phase full --host 172.31.144.1 --ports 9223,9225
node scripts/backtest/recover-campaign.mjs long-run-jp-exit-sweep-50x3 --phase full --host 172.31.144.1 --ports 9223,9225
```

US は `50/55/60` の entry period 比較、JP は `18/20/22` の exit period 比較に固定している。どちらも `2000-01-01 -> latest` の long-run 条件を使い、既存 runner をそのまま再利用する。

## 10. 参照先

- `docs/design-docs/dual-worker-parallel-backtest-runbook_20260406_0735.md`
- `docs/working-memory/session-logs/dual-worker-parallel-backtest-handoff_20260406_0735.md`
- `docs/working-memory/session-logs/tradingview-parallel-backtest-stabilization_20260406_0802.md`
- `docs/working-memory/session-logs/wsl-dual-worker-reachability_20260406_0305.md`
- `docs/working-memory/session-logs/dual-worker-distinct-strategy-backtest_20260406_0423.md`
