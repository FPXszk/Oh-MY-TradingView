# Command Reference: TradingView backtest operation

Windows 側は **PowerShell**、WSL 側は **bash** を前提にした運用メモ。

> 現在の handoff と最新結果は `docs/research/latest/` を先頭に読む。  
> 直前世代の docs は `docs/research/` 直下、2 世代以上前は `docs/research/old/`（既定では読まない archive）。  
> **既定の実行モードは worker1 single-worker（Windows `9222` -> WSL `9223`）/ sequential**。worker2 の `9224` / `9225` は dual-worker 参照用の履歴として残す。4並列は未検証。

## 1. 現在の既知の正常トポロジ

- worker1
  - Windows CDP: `127.0.0.1:9222`
  - WSL proxy: `172.31.144.1:9223`
  - profile: default
- worker2（historical dual-worker reference）
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

## 4. 現在の verified 起動手順

### startup-first の確認順

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9222/json/list | Select-Object -ExpandProperty Content
```

これで **TradingView chart target** を含む payload が返れば、そのまま WSL `9223` 疎通確認へ進む。  
返らない場合は、**現在の verified launch method** として次の shortcut を使う。

```powershell
Start-Process -FilePath 'C:\TradingView\TradingView.exe - ショートカット.lnk'
```

### worker1 direct launch fallback

```powershell
cmd /c start "" /D C:\TradingView C:\TradingView\TradingView.exe --remote-debugging-port=9222 --in-process-gpu
```

### worker2（historical dual-worker reference）

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
- `0.0.0.0:9225 -> 127.0.0.1:9224`（worker2 を意図的に使う historical dual-worker 時のみ）

### WSL から CDP を確認

```bash
curl -sS http://172.31.144.1:9223/json/version
curl -sS http://172.31.144.1:9223/json/list
```

### WSL から CLI status を確認

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status
```

成功時は `success: true` と chart target 情報が返る。**現在の既定運用では WSL 側の正本は `9223` であり、`9223` が死んでいる場合は他ポートへ暗黙フォールバックしない。**

## 7. backtest 実行コマンド

### 個別実行

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset ema-cross-9-21 --symbol NVDA
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset rsi-mean-reversion --symbol NVDA
```

### 日付範囲オーバーライド付き個別実行

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 \
  node src/cli/index.js backtest preset ema-cross-9-21 --symbol NVDA --date-from 2000-01-01 --date-to 2099-12-31
```

### 並列実行（historical dual-worker reference）

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
    "worker_ports": [9223],
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

# 標準: worker1 single-worker (Windows 9222 -> WSL 9223) / sequential
node scripts/backtest/run-long-campaign.mjs long-run-cross-market-100x5 --phase smoke --host 172.31.144.1 --ports 9223
node scripts/backtest/run-long-campaign.mjs long-run-cross-market-100x5 --phase full --host 172.31.144.1 --ports 9223
```

### 中断からの復旧

```bash
# 最新チェックポイントから自動再開（同一 phase のみ）
node scripts/backtest/recover-campaign.mjs long-run-cross-market-100x5 --phase full --host 172.31.144.1 --ports 9223

# 特定のチェックポイントから再開（同一 phase 必須）
node scripts/backtest/run-long-campaign.mjs long-run-cross-market-100x5 \
  --phase full \
  --host 172.31.144.1 \
  --ports 9223 \
  --resume results/campaigns/long-run-cross-market-100x5/full/checkpoint-50.json
```

結果は `results/campaigns/<campaign-id>/<phase>/` に保存される。チェックポイントは `execution.checkpoint_every` ごとに書き出され、resume 時は `campaign_id` / `phase` / fingerprint が一致する checkpoint だけを受け付ける。**phase 跨ぎの resume は fingerprint 不一致で拒否される**（例: pilot checkpoint を full に流用不可）。

`config/backtest/campaigns/external-phase1-priority-top.json` のように
`experiment_gating.enabled: true` を持つ campaign では、既存の
`final-results.json` / `recovered-results.json` / `recovered-summary.json` に加えて、
次の additive artifact も出力される。

- `gated-summary.json`: gate 閾値、件数集計、全候補の判定結果、ranked candidate 一覧
- `ranked-candidates.json`: `promote` 判定だけを stable rank 付きで抜き出した一覧
- `market-intel-snapshots.json`: symbol ごとの `market_symbol_analysis` snapshot。`confluence_snapshot` / `provider_status` / `community_snapshot` の元データ

```bash
node scripts/backtest/run-long-campaign.mjs external-phase1-priority-top --phase smoke --dry-run
node scripts/backtest/run-long-campaign.mjs external-phase1-priority-top --phase smoke --host 172.31.144.1 --ports 9223
npm run tv -- market analysis --symbol AAPL
npm run tv -- market confluence-rank AAPL MSFT NVDA --limit 3
```

### market-specific long-run deep dive

```bash
# US entry sweep
node scripts/backtest/run-long-campaign.mjs long-run-us-entry-sweep-50x3 --phase smoke --dry-run
node scripts/backtest/run-long-campaign.mjs long-run-us-entry-sweep-50x3 --phase smoke --host 172.31.144.1 --ports 9223
node scripts/backtest/run-long-campaign.mjs long-run-us-entry-sweep-50x3 --phase full --host 172.31.144.1 --ports 9223

# JP exit sweep
node scripts/backtest/run-long-campaign.mjs long-run-jp-exit-sweep-50x3 --phase smoke --dry-run
node scripts/backtest/run-long-campaign.mjs long-run-jp-exit-sweep-50x3 --phase smoke --host 172.31.144.1 --ports 9223
node scripts/backtest/run-long-campaign.mjs long-run-jp-exit-sweep-50x3 --phase full --host 172.31.144.1 --ports 9223

# recovery（同一 phase のみ）
node scripts/backtest/recover-campaign.mjs long-run-us-entry-sweep-50x3 --phase full --host 172.31.144.1 --ports 9223
node scripts/backtest/recover-campaign.mjs long-run-jp-exit-sweep-50x3 --phase full --host 172.31.144.1 --ports 9223
```

US は `50/55/60` の entry period 比較、JP は `18/20/22` の exit period 比較に固定している。どちらも `2000-01-01 -> latest` の long-run 条件を使い、既存 runner をそのまま再利用する。

### market-matched 100-symbol long-run (200 total)

```bash
# US entry sweep 100x3
node scripts/backtest/run-long-campaign.mjs long-run-us-entry-sweep-100x3 --phase smoke --dry-run
node scripts/backtest/run-long-campaign.mjs long-run-us-entry-sweep-100x3 --phase smoke --host 172.31.144.1 --ports 9223
node scripts/backtest/run-long-campaign.mjs long-run-us-entry-sweep-100x3 --phase full --host 172.31.144.1 --ports 9223

# JP exit sweep 100x3
node scripts/backtest/run-long-campaign.mjs long-run-jp-exit-sweep-100x3 --phase smoke --dry-run
node scripts/backtest/run-long-campaign.mjs long-run-jp-exit-sweep-100x3 --phase smoke --host 172.31.144.1 --ports 9223
node scripts/backtest/run-long-campaign.mjs long-run-jp-exit-sweep-100x3 --phase full --host 172.31.144.1 --ports 9223

# recovery（同一 phase のみ）
node scripts/backtest/recover-campaign.mjs long-run-us-entry-sweep-100x3 --phase full --host 172.31.144.1 --ports 9223
node scripts/backtest/recover-campaign.mjs long-run-jp-exit-sweep-100x3 --phase full --host 172.31.144.1 --ports 9223
```

50x3 と同じ strategy split だが universe を 100 symbols に拡張した構成。現行の既定は **worker1 single-worker（Windows `9222` -> WSL `9223`）/ sequential / smoke → full**。`pilot` は互換目的で残っているが標準フローでは使わない。worker2 の `9224` / `9225` は dual-worker 参照用の履歴としてのみ扱う。

### next fine-tune 100x10 bundle (US 10 + JP 10)

```bash
# dry-run（マトリクス確認のみ）
node scripts/backtest/run-finetune-bundle.mjs --dry-run

# 標準実行: worker1 single-worker (Windows 9222 -> WSL 9223) / sequential / smoke -> full
node scripts/backtest/run-finetune-bundle.mjs --phases smoke --host 172.31.144.1
node scripts/backtest/run-finetune-bundle.mjs --phases full --host 172.31.144.1

# direct campaign dry-run if needed
node scripts/backtest/run-long-campaign.mjs next-long-run-us-finetune-100x10 --phase smoke --dry-run
node scripts/backtest/run-long-campaign.mjs next-long-run-jp-finetune-100x10 --phase smoke --dry-run
```

fine-tune bundle は `next-long-run-us-finetune-100x10` / `next-long-run-jp-finetune-100x10` を順に流す。既定は **worker1 single-worker（Windows `9222` -> WSL `9223`）/ sequential / smoke → full**。full は US `1000 runs` + JP `1000 runs` の合計 `2000 runs`。`pilot` は互換目的で残っているが、標準フローからは外れている。**`9223` が不調なときは暗黙 fallback せず停止し、Windows `9222` -> WSL `9223` の経路を回復してから再実行する。**

### Python night batch orchestration

```bash
# US/JP 100x10 fine-tune bundle を smoke -> full foreground で監視実行
python3 python/night_batch.py smoke-prod --config config/night_batch/bundle-foreground-reuse-config.json

# ローカル都合で detached 実行したい場合はこちら
python3 python/night_batch.py smoke-prod --config config/night_batch/bundle-detached-reuse-config.json

# JSON config を読んで startup check -> smoke -> detached production
python3 python/night_batch.py smoke-prod --config config/night_batch/nightly.default.json

# 戦略だけ一時 override したい場合
python3 python/night_batch.py smoke-prod \
  --config config/night_batch/nightly.default.json \
  --smoke-cli "backtest nvda-ma"

# wrapper / workflow 事前確認
python3 python/night_batch.py smoke-prod --config config/night_batch/nightly.default.json --dry-run

# fine-tune bundle の夜間実行
python3 python/night_batch.py bundle --host 172.31.144.1 --port 9223

# bundle -> rich report まで一続きで実行
python3 python/night_batch.py nightly --host 172.31.144.1 --port 9223

# 既存 artifact から rich report のみ再生成
python3 python/night_batch.py report \
  --us results/campaigns/next-long-run-us-finetune-100x10/full/recovered-results.json \
  --jp results/campaigns/next-long-run-jp-finetune-100x10/full/recovered-results.json \
  --out results/night-batch/morning-report.md
```

`config/night_batch/bundle-foreground-reuse-config.json` は、既存 `next-long-run-us-finetune-100x10` / `next-long-run-jp-finetune-100x10` を参照して **smoke -> full foreground** を GitHub Actions で完走監視するための config。  
`config/night_batch/bundle-detached-reuse-config.json` は、ローカル都合で detached 実行を明示したい場合の代替 config。  

`config/night_batch/nightly.default.json` は single-backtest ベースのサンプルとして残す。  
CLI の `--smoke-cli` / `--production-cli` は config より優先されるので、昼間に案を一時差し替えて夜間実行へ流すこともできる。

`smoke-prod` は次の順で動く:

1. Windows local `9222` の startup check（TradingView chart target 必須）
2. 未起動なら `C:\TradingView\TradingView.exe - ショートカット.lnk` で launch
3. WSL `172.31.144.1:9223` の connectivity / chart preflight
4. smoke backtest を 1 本実行
5. `detach_after_smoke: false` なら production を foreground で最後まで監視し、state の `updated_at` を heartbeat として更新
6. `detach_after_smoke: true` のときだけ production を detached child として起動
7. `results/night-batch/` へ summary / log / state を出力（`--round-mode` 指定時は `results/night-batch/roundN/` へ）

既定の config では backtest CLI は次の 2 段:

- smoke: `backtest preset ema-cross-9-21 --symbol NVDA --date-from 2024-01-01 --date-to 2024-12-31`
- production: `backtest preset ema-cross-9-21 --symbol NVDA --date-from 2000-01-01 --date-to 2099-12-31`

Python 側の責務は **startup check / launch-if-needed / WSL 側 `9223` 接続 preflight / Node CLI subprocess 実行 / state heartbeat / summary 書き出し** であり、TradingView 操作本体を再実装しない。

### Round management（ラウンド管理）

night batch のアーティファクト（log / summary / detached state）を `results/night-batch/roundN/` に整理する仕組み。`--round-mode` を指定しない場合は従来どおり `results/night-batch/` 直下にフラット出力される。

```bash
# 新しいラウンドを開始（既存の最大ラウンド番号 +1）
python3 python/night_batch.py smoke-prod \
  --config config/night_batch/bundle-foreground-reuse-config.json \
  --round-mode advance-next-round

# dry-run で事前確認
python3 python/night_batch.py smoke-prod \
  --config config/night_batch/bundle-foreground-reuse-config.json \
  --round-mode advance-next-round \
  --dry-run

# 既存ラウンドを再開（smoke 完了済みならスキップ、bundle は checkpoint から resume）
python3 python/night_batch.py smoke-prod \
  --config config/night_batch/bundle-foreground-reuse-config.json \
  --round-mode resume-current-round

# 明示的に checkpoint を指定して resume
python3 python/night_batch.py smoke-prod \
  --config config/night_batch/bundle-foreground-reuse-config.json \
  --round-mode resume-current-round \
  --us-resume results/campaigns/next-long-run-us-finetune-100x10/full/checkpoint-50.json \
  --jp-resume results/campaigns/next-long-run-jp-finetune-100x10/full/checkpoint-30.json
```

ラウンドディレクトリの構造:

```
results/night-batch/round1/
├── round-manifest.json     # ラウンドのメタデータ（番号・開始時刻・実行履歴）
├── 20260410_230000.log
├── 20260410_230000-summary.json
├── 20260410_230000-summary.md
└── bundle-foreground-state.json
```

**ルール:**

- `advance-next-round`: 既存フォルダの最大番号 +1 でディレクトリを作成
- `resume-current-round`: 最新のラウンドを再利用。ラウンドが存在しない場合はエラー
- resume 時、smoke が既に成功していればスキップし production（bundle full）へ直行
- bundle の resume は既存の campaign checkpoint support を使い、`--us-resume` / `--jp-resume` で明示指定も可能

### Manual recovery（手動復旧）

```bash
# ラウンドの状態確認
ls results/night-batch/round*/round-manifest.json
cat results/night-batch/round1/round-manifest.json

# campaign checkpoint の確認
ls results/campaigns/next-long-run-us-finetune-100x10/full/checkpoint-*.json
ls results/campaigns/next-long-run-jp-finetune-100x10/full/checkpoint-*.json

# 特定 checkpoint から campaign 単体を再開
node scripts/backtest/run-long-campaign.mjs next-long-run-us-finetune-100x10 \
  --phase full --host 172.31.144.1 --ports 9223 \
  --resume results/campaigns/next-long-run-us-finetune-100x10/full/checkpoint-50.json

# bundle 単体を checkpoint 付きで再開
node scripts/backtest/run-finetune-bundle.mjs \
  --phases full --host 172.31.144.1 \
  --us-resume results/campaigns/next-long-run-us-finetune-100x10/full/checkpoint-50.json \
  --jp-resume results/campaigns/next-long-run-jp-finetune-100x10/full/checkpoint-30.json

# recover コマンドで最新 checkpoint を自動検出
node scripts/backtest/recover-campaign.mjs next-long-run-us-finetune-100x10 \
  --phase full --host 172.31.144.1 --ports 9223
```

### Self-hosted schedule / manual launch

> **Runner は service mode を使わず、手動 `run.cmd` 起動で運用する。** 使用中の Windows OS バージョン / 実行環境では service mode 前提の運用を安定してサポートできないため。

#### Runner 起動（bootstrap 付き）

runner を起動する際は `run.cmd` を直接叩く代わりに、repo 管理の bootstrap wrapper を使う。bootstrap-self-hosted-runner.cmd が prerequisite fix（`git safe.directory` 等）を先に実行し、成功後に `run.cmd` へ進む。

```cmd
scripts\windows\run-self-hosted-runner-with-bootstrap.cmd C:\actions-runner
```

**One-time hookup**: 従来の `C:\actions-runner\run.cmd` 直接実行を上記 wrapper に一度だけ置き換える。以後の prerequisite 更新は repo 側 script で追従できる。

#### Runner 自動起動（Task Scheduler）

reboot 後も runner を自動で online に戻す公式手順は、**service mode ではなく Task Scheduler** を使う方法。標準 trigger は **runner 用 Windows ユーザーの ONLOGON**。

```cmd
scripts\windows\register-self-hosted-runner-autostart.cmd C:\actions-runner
```

- 登録 script は `register-self-hosted-runner-autostart.cmd`
- 実行対象は `run-self-hosted-runner-with-bootstrap.cmd`
- trigger は **Task Scheduler / ONLOGON / 30 秒 delay**
- 削除:

```cmd
schtasks /Delete /TN "OhMyTradingViewRunnerAutostart" /F
```

- 確認:

```cmd
schtasks /Query /TN "OhMyTradingViewRunnerAutostart" /V /FO LIST
```

> **前提:** ONLOGON trigger なので、対象 Windows ユーザーのログインが必要。  
> 完全無人 reboot 復旧が必要なら OS 側の auto-logon を別途設定する。

#### Night batch wrapper

Windows Command Prompt からは次で同じ config を起動できる。

```cmd
scripts\windows\run-night-batch-self-hosted.cmd config\night_batch\bundle-foreground-reuse-config.json

# 新ラウンドを明示開始したい場合
scripts\windows\run-night-batch-self-hosted.cmd config\night_batch\bundle-foreground-reuse-config.json advance-next-round
```

引数 2 を省略した wrapper は、`round-manifest.json` が既にあれば `resume-current-round`、無ければ `advance-next-round` を自動選択する。

workflow は `.github/workflows/night-batch-self-hosted.yml` にあり、既定 cron は **毎日 00:00 JST**（`0 15 * * *` UTC）。  
想定 runner は **self-hosted Windows** で、既定 config は `config/night_batch/bundle-foreground-reuse-config.json`。runner が online であれば動作し、service 常駐は前提としない。workflow は smoke と production を **完了まで監視**し、GitHub Actions の success/failure を production 完了結果に揃える。workflow では `checkout clean: false` を維持しつつ、終了時に **`GITHUB_STEP_SUMMARY`** へ要約を書き出し、**`actions/upload-artifact`** で最新 round 成果物を回収する。**00:00 JST の起動窓を外れた stale scheduled run は skip** する。

workflow 既定 config の state file は、`--round-mode` を付けた実行では `results/night-batch/roundN/bundle-foreground-state.json` に配置される。  
この state の `updated_at` が heartbeat、summary の `termination_reason` / `failed_step` / `last_checkpoint` が GitHub 側の切り分け材料になる。hard reboot / power loss では最後の summary / artifact upload が完了しない可能性は残る。

#### 次 strategy 更新手順（live checkout 保護）

> **foreground workflow の終了は production 完了まで追跡した結果を意味する。** ただし active な workflow job / runner が live checkout を使っている間は、live checkout を変更しない。

次 strategy を考えたい / 更新したい場合は、**最初に self-hosted runner / workflow job が live checkout を使用中か確認する**。foreground workflow では production 完了まで待つため、workflow 後は **`GITHUB_STEP_SUMMARY` / artifact / `results/night-batch/roundN/bundle-foreground-state.json`** で終了理由を確認する。

active な self-hosted runner / detached night-batch が動いている間は、**live checkout を編集しない**。以下は mid-run 変更禁止対象の例：

| 禁止対象 | 理由 |
|---|---|
| `config/backtest/strategy-presets.json` | production が参照する strategy 定義 |
| `config/night_batch/bundle-foreground-reuse-config.json` | 実行中 run の config 本体 |
| `config/backtest/` 配下 | strategy / backtest 入力全般 |

##### 手順

1. **runner 使用中チェック**: GitHub Actions の self-hosted workflow job や smoke 起動中が無いことを確認する。workflow job 実行中は live checkout を使っているため、この段階では触らない。
2. **workflow 完了チェック**: 最新 run の **`GITHUB_STEP_SUMMARY` / artifact / `results/night-batch/roundN/bundle-foreground-state.json`** を確認し、workflow が production 完了まで追跡した結果を確認する。
3. **別ワークスペースで次 strategy を準備する**: 別の worktree / clone / branch で次ラウンドの strategy / config 変更を準備し、live checkout とは分離する。
4. **detached 完了後に live checkout を更新する**: 1 と 2 の両方を満たした後、準備した差分を live checkout に反映する。
5. **`advance-next-round` を明示して次 run を開始する**:

```cmd
scripts\windows\run-night-batch-self-hosted.cmd config\night_batch\bundle-foreground-reuse-config.json advance-next-round
```

### latest rich result regeneration

```bash
node scripts/backtest/generate-rich-report.mjs \
  --us docs/references/backtests/long-run-us-entry-sweep-100x3-full-recovered_20260409_0643.json \
  --jp docs/references/backtests/long-run-jp-exit-sweep-100x3-full-recovered_20260409_0643.json \
  --out docs/research/latest/next-long-run-market-matched-200-results_20260409_0643.md \
  --ranking-out docs/references/backtests/next-long-run-market-matched-200-combined-ranking_20260409_1525.json \
  --date-from 2000-01-01 \
  --date-to latest
```

この rich report は strategy-level の avg net / median net / PF / MDD / trades / win rate に加え、US / JP 別の top 10 / bottom 10 symbols と改善案まで含む日本語 operator report を生成する。

### top 5 Pine export

```bash
# source export only
node scripts/backtest/export-top-pine.mjs \
  --ranking docs/references/backtests/next-long-run-market-matched-200-combined-ranking_20260409_1525.json \
  --out-dir docs/references/pine/next-long-run-market-matched-200_20260409_1525

# apply to active chart when operator explicitly wants chart registration
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 \
node scripts/backtest/export-top-pine.mjs \
  --ranking docs/references/backtests/next-long-run-market-matched-200-combined-ranking_20260409_1525.json \
  --out-dir docs/references/pine/next-long-run-market-matched-200_20260409_1525 \
  --apply
```

`--apply` は local chart への順次適用であり、TradingView library への public publish ではない。active chart を変更するため、shared な運用中セッションでは source export のみを既定とする。

## 10. 参照先

- `docs/design-docs/dual-worker-parallel-backtest-runbook_20260406_0735.md`
- `docs/working-memory/session-logs/dual-worker-parallel-backtest-handoff_20260406_0735.md`
- `docs/working-memory/session-logs/tradingview-parallel-backtest-stabilization_20260406_0802.md`
- `docs/working-memory/session-logs/wsl-dual-worker-reachability_20260406_0305.md`
- `docs/working-memory/session-logs/dual-worker-distinct-strategy-backtest_20260406_0423.md`
