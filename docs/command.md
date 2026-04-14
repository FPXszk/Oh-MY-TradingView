# Command Reference: TradingView backtest operation

Windows 側は **PowerShell**、WSL 側は **bash** を前提にした運用メモ。

> 現在の handoff と最新結果は `docs/research/latest/` を先頭に読む。  
> latest から外れた docs は `docs/research/archive/` を見る。`docs/research/` は routing と results のみを置く。  
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
  --resume docs/research/results/campaigns/long-run-cross-market-100x5/full/checkpoint-50.json
```

結果は `docs/research/results/campaigns/<campaign-id>/<phase>/` に保存される。チェックポイントは `execution.checkpoint_every` ごとに書き出され、resume 時は `campaign_id` / `phase` / fingerprint が一致する checkpoint だけを受け付ける。**phase 跨ぎの resume は fingerprint 不一致で拒否される**（例: pilot checkpoint を full に流用不可）。

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
# US/JP 12x10 bundle を smoke -> full foreground で監視実行
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
  --us docs/research/results/campaigns/next-long-run-us-finetune-100x10/full/recovered-results.json \
  --jp docs/research/results/campaigns/next-long-run-jp-finetune-100x10/full/recovered-results.json \
  --out docs/research/results/night-batch/morning-report.md
```

`config/night_batch/bundle-foreground-reuse-config.json` は、`next-long-run-us-12x10` / `next-long-run-jp-12x10` を参照して **smoke -> full foreground** を GitHub Actions で完走監視するための config（旧既定は `finetune-100x10`）。  
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
7. `docs/research/results/night-batch/` へ summary / log / state を出力（`--round-mode` 指定時は `docs/research/results/night-batch/roundN/` へ）

既定の config では backtest CLI は次の 2 段:

- smoke: `backtest preset ema-cross-9-21 --symbol NVDA --date-from 2024-01-01 --date-to 2024-12-31`
- production: `backtest preset ema-cross-9-21 --symbol NVDA --date-from 2000-01-01 --date-to 2099-12-31`

Python 側の責務は **startup check / launch-if-needed / WSL 側 `9223` 接続 preflight / Node CLI subprocess 実行 / state heartbeat / summary 書き出し** であり、TradingView 操作本体を再実装しない。

### Round management（ラウンド管理）

night batch のアーティファクト（log / summary / detached state）を `docs/research/results/night-batch/roundN/` に整理する仕組み。完了した round は `docs/research/results/night-batch/archive/roundN/` に自動退避される。`--round-mode` を指定しない場合は従来どおり `docs/research/results/night-batch/` 直下にフラット出力される。

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
  --us-resume docs/research/results/campaigns/next-long-run-us-finetune-100x10/full/checkpoint-50.json \
  --jp-resume docs/research/results/campaigns/next-long-run-jp-finetune-100x10/full/checkpoint-30.json
```

ラウンドディレクトリの構造:

```
docs/research/results/night-batch/round1/
├── round-manifest.json     # ラウンドのメタデータ（番号・開始時刻・実行履歴）
├── 20260410_230000.log
├── 20260410_230000-summary.json
├── 20260410_230000-summary.md
└── bundle-foreground-state.json
```

**ルール:**

- `advance-next-round`: 既存フォルダの最大番号 +1 でディレクトリを作成
- `resume-current-round`: 最新の**アクティブ**なラウンドを再利用。アーカイブ済み round は対象外で、存在しない場合はエラー
- resume 時、smoke が既に成功していればスキップし production（bundle full）へ直行
- bundle の resume は既存の campaign checkpoint support を使い、`--us-resume` / `--jp-resume` で明示指定も可能
- 完了済み round の整理は `python3 python/night_batch.py archive-rounds` でも実行できる

### Manual recovery（手動復旧）

```bash
# アクティブなラウンドの状態確認
ls docs/research/results/night-batch/round*/round-manifest.json
cat docs/research/results/night-batch/round1/round-manifest.json

# アーカイブ済みラウンドの状態確認
ls docs/research/results/night-batch/archive/round*/round-manifest.json

# 完了済みラウンドを手動で整理
python3 python/night_batch.py archive-rounds

# campaign checkpoint の確認
ls docs/research/results/campaigns/next-long-run-us-finetune-100x10/full/checkpoint-*.json
ls docs/research/results/campaigns/next-long-run-jp-finetune-100x10/full/checkpoint-*.json

# 特定 checkpoint から campaign 単体を再開
node scripts/backtest/run-long-campaign.mjs next-long-run-us-finetune-100x10 \
  --phase full --host 172.31.144.1 --ports 9223 \
  --resume docs/research/results/campaigns/next-long-run-us-finetune-100x10/full/checkpoint-50.json

# bundle 単体を checkpoint 付きで再開
node scripts/backtest/run-finetune-bundle.mjs \
  --phases full --host 172.31.144.1 \
  --us-resume docs/research/results/campaigns/next-long-run-us-finetune-100x10/full/checkpoint-50.json \
  --jp-resume docs/research/results/campaigns/next-long-run-jp-finetune-100x10/full/checkpoint-30.json

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

reboot 後も runner を自動で online に戻す公式手順は、**service mode ではなく Task Scheduler** を使う方法。標準 trigger は **runner 用 Windows ユーザーの ONLOGON**。登録 script は Task Scheduler 用 launcher と runner 配下の self-contained startup script copy を生成する。

```cmd
scripts\windows\register-self-hosted-runner-autostart.cmd C:\actions-runner
```

- 登録 script は `register-self-hosted-runner-autostart.cmd`
- Task Scheduler が直接起動するのは `C:\actions-runner\_diag\runner-autostart-launch.cmd`
- launcher の中から `C:\actions-runner\_diag\run-self-hosted-runner-with-bootstrap.cmd` を呼ぶ
- bootstrap も `C:\actions-runner\_diag\bootstrap-self-hosted-runner.cmd` に複製して live checkout 非依存にする
- trigger は **Task Scheduler / ONLOGON / 30 秒 delay**
- 実行ログ: `C:\actions-runner\_diag\runner-autostart.log`
- 削除:

```cmd
schtasks /Delete /TN "OhMyTradingViewRunnerAutostart" /F
```

- 確認:

```cmd
schtasks /Query /TN "OhMyTradingViewRunnerAutostart" /V /FO LIST
```

`register-self-hosted-runner-autostart.cmd` 実行時に `楳笏...` のような文字化けコマンドが出る場合は、**古い UTF-8 / 非 ASCII コメント入り batch が live checkout に残っている**のが有力。最新 `main` に更新してから再実行する。

> **前提:** ONLOGON trigger なので、対象 Windows ユーザーのログインが必要。  
> 完全無人 reboot 復旧が必要なら OS 側の auto-logon を別途設定する。

#### Night batch wrapper

Windows Command Prompt からは次で同じ config を起動できる。

```cmd
scripts\windows\run-night-batch-self-hosted.cmd config\night_batch\bundle-foreground-reuse-config.json

# 新ラウンドを明示開始したい場合
scripts\windows\run-night-batch-self-hosted.cmd config\night_batch\bundle-foreground-reuse-config.json advance-next-round
```

引数 2 を省略した wrapper は、完了済み round を `docs/research/results/night-batch/archive/roundN/` に退避したうえで、`round-manifest.json` が残っている**アクティブ** round があれば `resume-current-round`、無ければ `advance-next-round` を自動選択する。

workflow は `.github/workflows/night-batch-self-hosted.yml` にあり、既定 cron は **毎日 00:00 JST**（`0 15 * * *` UTC）。  
想定 runner は **self-hosted Windows** で、既定 config は `config/night_batch/bundle-foreground-reuse-config.json`。runner が online であれば動作し、service 常駐は前提としない。workflow は smoke と production を **完了まで監視**し、GitHub Actions の success/failure を production 完了結果に揃える。workflow では `checkout clean: false` を維持しつつ、終了時に **`GITHUB_STEP_SUMMARY`** へ要約を書き出し、**`actions/upload-artifact`** で最新 round 成果物を回収し、完了後に round を `docs/research/results/night-batch/archive/roundN/` へ退避する。**00:00 JST の起動窓を外れた stale scheduled run は skip** する。

workflow 既定 config の state file は、`--round-mode` を付けた実行では `docs/research/results/night-batch/roundN/bundle-foreground-state.json` に配置される。  
この state の `updated_at` が heartbeat、summary の `termination_reason` / `failed_step` / `last_checkpoint` が GitHub 側の切り分け材料になる。hard reboot / power loss では最後の summary / artifact upload が完了しない可能性は残る。

workflow の summary / artifact 周りの PowerShell ロジックは `scripts/windows/github-actions/` 配下の外部スクリプトに分離している。inline PowerShell の構文エラーで workflow が failure になった事例と対策は [run 8 レポート](docs/reports/night-batch-self-hosted-run8.md) を参照。

detached 方式から foreground monitoring へ切り替えた直接理由は、**workflow success != production complete** だったため。旧方式では smoke 完了後に detached child を起動して job が success になり得たが、その後に runner cleanup / reboot / stale state が起きると production 完走を GitHub Actions 上で保証できなかった。現在は foreground workflow 完了を production 完了に揃えている。

autostart hardening では、Windows `cmd.exe` で UTF-8 非 ASCII コメントが壊れる問題と、`schtasks /Create /TR` の quoting 崩れを避けるため、**ASCII-only `.cmd` + `*.cmd eol=crlf` + `_diag` 配下の self-contained launcher / wrapper / bootstrap copy** に統一した。

#### 運用確認コマンド

Task Scheduler / runner / workflow が正しくつながっているかは、最低限次の 3 系統で確認する。

```powershell
schtasks /Query /TN "OhMyTradingViewRunnerAutostart" /V /FO LIST
Get-Content C:\actions-runner\_diag\runner-autostart.log -Tail 100
gh api repos/FPXszk/Oh-MY-TradingView/actions/runners --jq '.runners[] | select(.name=="omtv-win-01") | {name: .name, status: .status, busy: .busy}'
```

成功シグナルの例:

- `schtasks /Query` の `タスク名` が `\OhMyTradingViewRunnerAutostart`
- `実行するタスク` が `C:\ACTION~1\_diag\RUNNER~1.CMD`
- `状態` が `実行中`
- `runner-autostart.log` に `Prerequisites OK` / `Connected to GitHub` / `Listening for Jobs` / `Running job: start-night-batch`
- GitHub 側 runner が `online` かつ job 実行中は `busy: true`

`register-self-hosted-runner-autostart.cmd` 実行時に `楳笏...` のような文字化けコマンドが出る場合は、**古い UTF-8 / 非 ASCII コメント入り batch が残っている**可能性が高い。最新 `main` を pull してから再登録する。

#### 次 strategy 更新手順（live checkout 保護）

> **foreground workflow の終了は production 完了まで追跡した結果を意味する。** ただし active な workflow job / runner が live checkout を使っている間は、live checkout を変更しない。

次 strategy を考えたい / 更新したい場合は、**最初に self-hosted runner / workflow job が live checkout を使用中か確認する**。foreground workflow では production 完了まで待つため、workflow 後は **`GITHUB_STEP_SUMMARY` / artifact / `docs/research/results/night-batch/roundN/bundle-foreground-state.json`** で終了理由を確認する。

active な self-hosted runner / detached night-batch が動いている間は、**live checkout を編集しない**。以下は mid-run 変更禁止対象の例：

| 禁止対象 | 理由 |
|---|---|
| `config/backtest/strategy-presets.json` | production が参照する strategy 定義 |
| `config/night_batch/bundle-foreground-reuse-config.json` | 実行中 run の config 本体 |
| `config/backtest/` 配下 | strategy / backtest 入力全般 |

##### 手順

1. **runner 使用中チェック**: GitHub Actions の self-hosted workflow job や smoke 起動中が無いことを確認する。workflow job 実行中は live checkout を使っているため、この段階では触らない。
2. **workflow 完了チェック**: 最新 run の **`GITHUB_STEP_SUMMARY` / artifact / `docs/research/results/night-batch/roundN/bundle-foreground-state.json`** を確認し、workflow が production 完了まで追跡した結果を確認する。
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

- `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md`
- `docs/working-memory/session-logs/dual-worker-parallel-backtest-handoff_20260406_0735.md`
- `docs/working-memory/session-logs/tradingview-parallel-backtest-stabilization_20260406_0802.md`
- `docs/working-memory/session-logs/wsl-dual-worker-reachability_20260406_0305.md`
- `docs/working-memory/session-logs/dual-worker-distinct-strategy-backtest_20260406_0423.md`


## 11. Operator pasted log excerpts

以下は operator が現場から `docs/command.md` 末尾へ貼り付けた **paste transcript**。  
転記時に先頭文字が欠けることがあるため、厳密な raw 原本ではなく、**状況確認用の抜粋ログ**として扱う。





error

d C:\actions-runner
'楳笏笏笏笏笏笏笏笏笏笏笏' は、内部コマンドまたは外部コマンド、
操作可能なプログラムまたはバッチ ファイルとして認識されていません。
'arts' は、内部コマンドまたは外部コマンド、
操作可能なプログラムまたはバッチ ファイルとして認識されていません。
'ult:' は、内部コマンドまたは外部コマンド、
操作可能なプログラムまたはバッチ ファイルとして認識されていません。
'task' は、内部コマンドまたは外部コマンド、
操作可能なプログラムまたはバッチ ファイルとして認識されていません。
'm' は、内部コマンドまたは外部コマンド、
操作可能なプログラムまたはバッチ ファイルとして認識されていません。
'楳笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏' は、内 部コマンドまたは外部コマンド、
操作可能なプログラムまたはバッチ ファイルとして認識されていません。
[runner-autostart] ERROR: wrapper not found at C:\actions-runner\_work\Oh-MY-TradingView\Oh-MY-TradingView\scripts\windows\run-self-hosted-runner-with-bootstrap.cmd
PS C:\actions-runner\_work\Oh-MY-TradingView\Oh-MY-TradingView> schtasks /Delete /TN "OhMyTradingViewRunnerAutostart" /F
エラー: 指定されたファイルが見つかりません。
PS C:\actions-runner\_work\Oh-MY-TradingView\Oh-MY-TradingView> scripts\windows\register-self-hosted-runner-autostart.cmd C:\actions-runner
'楳笏笏笏笏笏笏笏笏笏笏笏' は、内部コマンドまたは外部コマンド、
操作可能なプログラムまたはバッチ ファイルとして認識されていません。
'arts' は、内部コマンドまたは外部コマンド、
操作可能なプログラムまたはバッチ ファイルとして認識されていません。
'ult:' は、内部コマンドまたは外部コマンド、
操作可能なプログラムまたはバッチ ファイルとして認識されていません。
'task' は、内部コマンドまたは外部コマンド、
操作可能なプログラムまたはバッチ ファイルとして認識されていません。
'm' は、内部コマンドまたは外部コマンド、
操作可能なプログラムまたはバッチ ファイルとして認識されていません。
'楳笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏' は、内 部コマンドまたは外部コマンド、
操作可能なプログラムまたはバッチ ファイルとして認識されていません。
[runner-autostart] Re-registering Task Scheduler entry "OhMyTradingViewRunnerAutostart" ...
エラー: 無効な引数またはオプションです - 'C:\actions-runner'。
"SCHTASKS /CREATE /?" と入力すると使用法が表示されます。
[runner-autostart] Task Scheduler registration complete.
[runner-autostart] Task name: OhMyTradingViewRunnerAutostart
[runner-autostart] Runner dir: C:\actions-runner
[runner-autostart] Trigger: ONLOGON + 30s delay
[runner-autostart] Wrapper: C:\actions-runner\_work\Oh-MY-TradingView\Oh-MY-TradingView\scripts\windows\run-self-hosted-runner-with-bootstrap.cmd
[runner-autostart] Log: C:\actions-runner\_diag\runner-autostart.log
[runner-autostart] Verify with: schtasks /Query /TN "OhMyTradingViewRunnerAutostart" /V /FO LIST
[runner-autostart] Remove with: schtasks /Delete /TN "OhMyTradingViewRunnerAutostart" /F
PS C:\actions-runner\_work\Oh-MY-TradingView\Oh-MY-TradingView>









2
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 70,
          "col": 3,
          "lit": "sparse-checkout-cone-mode"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 73,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 74,
          "col": 3,
          "lit": "fetch-depth"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 76,
          "col": 14,
          "lit": "1"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 77,
          "col": 3,
          "lit": "fetch-tags"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 79,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 80,
          "col": 3,
          "lit": "show-progress"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 82,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 83,
          "col": 3,
          "lit": "lfs"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 85,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 86,
          "col": 3,
          "lit": "submodules"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 94,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 95,
          "col": 3,
          "lit": "set-safe-directory"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 97,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 98,
          "col": 3,
          "lit": "github-server-url"
        },
        "value": ""
      }
    ]
  },
  "execution": {
    "executionType": "nodeJS",
    "hasPre": false,
    "hasPost": true,
    "script": "dist/index.js",
    "pre": null,
    "post": "dist/index.js",
    "nodeVersion": "node20",
    "cleanupCondition": "always()",
    "initCondition": "always()"
  },
  "deprecated": null
}
[2026-04-10 17:17:22Z INFO ActionManager] Action node.js file: dist/index.js, no more preparation.
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-10 17:17:22Z INFO ActionManager] Load action that reference repository from 'C:\actions-runner\_work\_actions\actions\checkout\v4'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Loaded action.yml file: {
  "name": "Checkout",
  "description": "Checkout a Git repository at a particular version",
  "inputs": {
    "type": 2,
    "map": [
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 4,
          "col": 3,
          "lit": "repository"
        },
        "value": {
          "type": 3,
          "file": 2,
          "line": 6,
          "col": 14,
          "expr": "github.repository"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 7,
          "col": 3,
          "lit": "ref"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 12,
          "col": 3,
          "lit": "token"
        },
        "value": {
          "type": 3,
          "file": 2,
          "line": 24,
          "col": 14,
          "expr": "github.token"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 25,
          "col": 3,
          "lit": "ssh-key"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 37,
          "col": 3,
          "lit": "ssh-known-hosts"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 42,
          "col": 3,
          "lit": "ssh-strict"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 47,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 48,
          "col": 3,
          "lit": "ssh-user"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 51,
          "col": 14,
          "lit": "git"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 52,
          "col": 3,
          "lit": "persist-credentials"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 54,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 55,
          "col": 3,
          "lit": "path"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 57,
          "col": 3,
          "lit": "clean"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 59,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 60,
          "col": 3,
          "lit": "filter"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 64,
          "col": 14,
          "lit": ""
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 65,
          "col": 3,
          "lit": "sparse-checkout"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 69,
          "col": 14,
          "lit": ""
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 70,
          "col": 3,
          "lit": "sparse-checkout-cone-mode"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 73,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 74,
          "col": 3,
          "lit": "fetch-depth"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 76,
          "col": 14,
          "lit": "1"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 77,
          "col": 3,
          "lit": "fetch-tags"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 79,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 80,
          "col": 3,
          "lit": "show-progress"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 82,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 83,
          "col": 3,
          "lit": "lfs"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 85,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 86,
          "col": 3,
          "lit": "submodules"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 94,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 95,
          "col": 3,
          "lit": "set-safe-directory"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 97,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 98,
          "col": 3,
          "lit": "github-server-url"
        },
        "value": ""
      }
    ]
  },
  "execution": {
    "executionType": "nodeJS",
    "hasPre": false,
    "hasPost": true,
    "script": "dist/index.js",
    "pre": null,
    "post": "dist/index.js",
    "nodeVersion": "node20",
    "cleanupCondition": "always()",
    "initCondition": "always()"
  },
  "deprecated": null
}
[2026-04-10 17:17:22Z INFO ActionManager] Action pre node.js file: N/A.
[2026-04-10 17:17:22Z INFO ActionManager] Action node.js file: dist/index.js.
[2026-04-10 17:17:22Z INFO ActionManager] Action post node.js file: dist/index.js.
[2026-04-10 17:17:22Z INFO JobExtension] Adding .
[2026-04-10 17:17:22Z INFO JobExtension] Adding .
[2026-04-10 17:17:22Z INFO JobExtension] Adding .
[2026-04-10 17:17:22Z INFO JobExtension] Adding .
[2026-04-10 17:17:22Z INFO JobExtension] Adding .
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-10 17:17:22Z INFO JobExtension] Total accessible running process: 300.
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-10 17:17:22Z INFO JobExtension] Start checking server connectivity.
[2026-04-10 17:17:22Z INFO JobExtension] Check server connectivity for https://broker.actions.githubusercontent.com/health.
[2026-04-10 17:17:22Z INFO JobExtension] Check server connectivity for https://token.actions.githubusercontent.com/ready.
[2026-04-10 17:17:22Z INFO JobExtension] Check server connectivity for https://run.actions.githubusercontent.com/health.
[2026-04-10 17:17:22Z INFO JobExtension] Start checking service connectivity in background.
[2026-04-10 17:17:22Z INFO ExecutionContext] Publish step telemetry for current step {
  "action": "setup_job",
  "type": "runner",
  "stage": "Pre",
  "stepId": "b7905fc3-070c-445a-8aa8-cebab4b16fcc",
  "result": "succeeded",
  "errorMessages": [],
  "executionTimeInSeconds": 2,
  "startTime": "2026-04-10T17:17:20.4529698Z",
  "finishTime": "2026-04-10T17:17:22.1217215Z"
}.
[2026-04-10 17:17:22Z INFO JobRunner] Total job steps: 5.
[2026-04-10 17:17:22Z INFO JobRunner] Run all job steps.
[2026-04-10 17:17:22Z INFO StepsRunner] Processing step: DisplayName='Run actions/checkout@v4'
[2026-04-10 17:17:22Z INFO StepsRunner] Evaluating: success()
[2026-04-10 17:17:22Z INFO StepsRunner] Result: true
[2026-04-10 17:17:22Z INFO StepsRunner] Starting the step.
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-10 17:17:22Z INFO StepsRunner] Which2: 'chcp'
[2026-04-10 17:17:22Z INFO StepsRunner] Location: 'C:\Windows\system32\chcp.COM'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper] Starting process:
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   File name: 'C:\Windows\system32\chcp.COM'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Arguments: '65001'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Working directory: 'C:\actions-runner\_work'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Require exit code zero: 'False'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Encoding web name:  ; code page: ''
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Force kill process on cancellation: 'False'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Redirected STDIN: 'False'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Persist current code page: 'True'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Keep redirected STDIN open: 'False'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   High priority process: 'False'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper] Process started with process id 14176, waiting for process exit.
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper] Finished process 14176 with exit code 0, and elapsed time 00:00:00.0352501.
[2026-04-10 17:17:22Z INFO StepsRunner] Successfully returned to code page 65001 (UTF8)
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-10 17:17:22Z INFO ActionManager] Load action that reference repository from 'C:\actions-runner\_work\_actions\actions\checkout\v4'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Loaded action.yml file: {
  "name": "Checkout",
  "description": "Checkout a Git repository at a particular version",
  "inputs": {
    "type": 2,
    "map": [
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 4,
          "col": 3,
          "lit": "repository"
        },
        "value": {
          "type": 3,
          "file": 2,
          "line": 6,
          "col": 14,
          "expr": "github.repository"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 7,
          "col": 3,
          "lit": "ref"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 12,
          "col": 3,
          "lit": "token"
        },
        "value": {
          "type": 3,
          "file": 2,
          "line": 24,
          "col": 14,
          "expr": "github.token"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 25,
          "col": 3,
          "lit": "ssh-key"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 37,
          "col": 3,
          "lit": "ssh-known-hosts"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 42,
          "col": 3,
          "lit": "ssh-strict"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 47,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 48,
          "col": 3,
          "lit": "ssh-user"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 51,
          "col": 14,
          "lit": "git"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 52,
          "col": 3,
          "lit": "persist-credentials"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 54,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 55,
          "col": 3,
          "lit": "path"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 57,
          "col": 3,
          "lit": "clean"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 59,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 60,
          "col": 3,
          "lit": "filter"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 64,
          "col": 14,
          "lit": ""
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 65,
          "col": 3,
          "lit": "sparse-checkout"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 69,
          "col": 14,
          "lit": ""
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 70,
          "col": 3,
          "lit": "sparse-checkout-cone-mode"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 73,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 74,
          "col": 3,
          "lit": "fetch-depth"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 76,
          "col": 14,
          "lit": "1"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 77,
          "col": 3,
          "lit": "fetch-tags"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 79,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 80,
          "col": 3,
          "lit": "show-progress"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 82,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 83,
          "col": 3,
          "lit": "lfs"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 85,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 86,
          "col": 3,
          "lit": "submodules"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 94,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 95,
          "col": 3,
          "lit": "set-safe-directory"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 97,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 98,
          "col": 3,
          "lit": "github-server-url"
        },
        "value": ""
      }
    ]
  },
  "execution": {
    "executionType": "nodeJS",
    "hasPre": false,
    "hasPost": true,
    "script": "dist/index.js",
    "pre": null,
    "post": "dist/index.js",
    "nodeVersion": "node20",
    "cleanupCondition": "always()",
    "initCondition": "always()"
  },
  "deprecated": null
}
[2026-04-10 17:17:22Z INFO ActionManager] Action pre node.js file: N/A.
[2026-04-10 17:17:22Z INFO ActionManager] Action node.js file: dist/index.js.
[2026-04-10 17:17:22Z INFO ActionManager] Action post node.js file: dist/index.js.
[2026-04-10 17:17:22Z INFO ExecutionContext] Reserve record order 7 to 12 for post job actions.
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-10 17:17:22Z INFO ExecutionContext] Write event payload to C:\actions-runner\_work\_temp\_github_workflow\event.json
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-10 17:17:22Z INFO ExtensionManager] Getting extensions for interface: 'GitHub.Runner.Worker.IFileCommandExtension'
[2026-04-10 17:17:22Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.AddPathFileCommand, Runner.Worker
[2026-04-10 17:17:22Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.SetEnvFileCommand, Runner.Worker
[2026-04-10 17:17:22Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.CreateStepSummaryCommand, Runner.Worker
[2026-04-10 17:17:22Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.SaveStateFileCommand, Runner.Worker
[2026-04-10 17:17:22Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.SetOutputFileCommand, Runner.Worker
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'repository': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 6,
  "col": 14,
  "lit": "FPXszk/Oh-MY-TradingView"
}
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'ref': default value evaluate result: ""
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'token': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 24,
  "col": 14,
  "lit": "***"
}
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'ssh-key': default value evaluate result: ""
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'ssh-known-hosts': default value evaluate result: ""
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'ssh-strict': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 47,
  "col": 14,
  "lit": "true"
}
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'ssh-user': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 51,
  "col": 14,
  "lit": "git"
}
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'persist-credentials': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 54,
  "col": 14,
  "lit": "true"
}
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'path': default value evaluate result: ""
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'filter': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 64,
  "col": 14,
  "lit": ""
}
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'sparse-checkout': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 69,
  "col": 14,
  "lit": ""
}
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'sparse-checkout-cone-mode': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 73,
  "col": 14,
  "lit": "true"
}
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'fetch-depth': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 76,
  "col": 14,
  "lit": "1"
}
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'fetch-tags': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 79,
  "col": 14,
  "lit": "false"
}
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'show-progress': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 82,
  "col": 14,
  "lit": "true"
}
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'lfs': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 85,
  "col": 14,
  "lit": "false"
}
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'submodules': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 94,
  "col": 14,
  "lit": "false"
}
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'set-safe-directory': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 97,
  "col": 14,
  "lit": "true"
}
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'github-server-url': default value evaluate result: ""
[2026-04-10 17:17:22Z INFO ExtensionManager] Getting extensions for interface: 'GitHub.Runner.Worker.IActionCommandExtension'
[2026-04-10 17:17:22Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.InternalPluginSetRepoPathCommandExtension, Runner.Worker
[2026-04-10 17:17:22Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.SetEnvCommandExtension, Runner.Worker
[2026-04-10 17:17:22Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.SetOutputCommandExtension, Runner.Worker
[2026-04-10 17:17:22Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.SaveStateCommandExtension, Runner.Worker
[2026-04-10 17:17:22Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.AddPathCommandExtension, Runner.Worker
[2026-04-10 17:17:22Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.AddMaskCommandExtension, Runner.Worker
[2026-04-10 17:17:22Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.AddMatcherCommandExtension, Runner.Worker
[2026-04-10 17:17:22Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.RemoveMatcherCommandExtension, Runner.Worker
[2026-04-10 17:17:22Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.WarningCommandExtension, Runner.Worker
[2026-04-10 17:17:22Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.ErrorCommandExtension, Runner.Worker
[2026-04-10 17:17:22Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.NoticeCommandExtension, Runner.Worker
[2026-04-10 17:17:22Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.DebugCommandExtension, Runner.Worker
[2026-04-10 17:17:22Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.GroupCommandExtension, Runner.Worker
[2026-04-10 17:17:22Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.EndGroupCommandExtension, Runner.Worker
[2026-04-10 17:17:22Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.EchoCommandExtension, Runner.Worker
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command internal-set-repo-path
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command set-env
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command set-output
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command save-state
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command add-path
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command add-mask
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command add-matcher
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command remove-matcher
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command warning
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command error
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command notice
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command debug
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command group
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command endgroup
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command echo
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Externals': 'C:\actions-runner\externals'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper] Starting process:
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   File name: 'C:\actions-runner\externals\node20\bin\node.exe'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Arguments: '"C:\actions-runner\_work\_actions\actions\checkout\v4\dist/index.js"'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Working directory: 'C:\actions-runner\_work\Oh-MY-TradingView\Oh-MY-TradingView'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Require exit code zero: 'False'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Encoding web name: utf-8 ; code page: '65001'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Force kill process on cancellation: 'False'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Redirected STDIN: 'False'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Persist current code page: 'True'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Keep redirected STDIN open: 'False'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   High priority process: 'False'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper] Process started with process id 21116, waiting for process exit.
[2026-04-10 17:17:22Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'b7905fc3-070c-445a-8aa8-cebab4b16fcc', success rate: 1/1.
[2026-04-10 17:17:22Z INFO JobServerQueue] Try to append 1 batches web console lines for record '86fb9ce9-7870-415e-97f4-6e130587b445', success rate: 1/1.
[2026-04-10 17:17:22Z INFO JobServerQueue] Got a step log file to send to results service.
[2026-04-10 17:17:22Z INFO JobServerQueue] Starting upload of step log file to results service ResultsLog, C:\actions-runner\_diag\blocks\e1371cd8-f4ba-4728-82c8-f1602a2a51ec_b7905fc3-070c-445a-8aa8-cebab4b16fcc.1
[2026-04-10 17:17:22Z INFO JobServerQueue] Try to upload 1 log files or attachments, success rate: 1/1.
[2026-04-10 17:17:22Z INFO AddMaskCommandExtension] Add new secret mask with length of 76
[2026-04-10 17:17:22Z INFO JobServerQueue] Try to append 1 batches web console lines for record '86fb9ce9-7870-415e-97f4-6e130587b445', success rate: 1/1.
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper] Finished process 21116 with exit code 1, and elapsed time 00:00:00.4232581.
[2026-04-10 17:17:22Z INFO CreateStepSummaryCommand] Step Summary file (C:\actions-runner\_work\_temp\_runner_file_commands\step_summary_e65932db-1d51-4e26-bb9d-07cca64d2ad1) is empty; skipping attachment upload
[2026-04-10 17:17:22Z INFO StepsRunner] Step result: Failed
[2026-04-10 17:17:22Z INFO ExecutionContext] Publish step telemetry for current step {
  "action": "actions/checkout",
  "ref": "v4",
  "type": "node20",
  "stage": "Main",
  "stepId": "86fb9ce9-7870-415e-97f4-6e130587b445",
  "stepContextName": "__actions_checkout",
  "hasPreStep": false,
  "hasPostStep": true,
  "result": "failed",
  "errorMessages": [
    "--local can only be used inside a git repository",
    "detected dubious ownership in repository at 'C:/actions-runner/_work/Oh-MY-TradingView/Oh-MY-TradingView'",
    "The process 'C:\\Program Files\\Git\\cmd\\git.exe' failed with exit code 128"
  ],
  "executionTimeInSeconds": 1,
  "startTime": "2026-04-10T17:17:22.1300714Z",
  "finishTime": "2026-04-10T17:17:22.6441728Z"
}.
[2026-04-10 17:17:22Z INFO StepsRunner] Update job result with current step result 'Failed'.
[2026-04-10 17:17:22Z INFO StepsRunner] Current state: job state = 'Failed'
[2026-04-10 17:17:22Z INFO StepsRunner] Processing step: DisplayName='Evaluate schedule freshness'
[2026-04-10 17:17:22Z INFO StepsRunner] Evaluating: success()
[2026-04-10 17:17:22Z INFO StepsRunner] Result: false
[2026-04-10 17:17:22Z INFO StepsRunner] Skipping step due to condition evaluation.
[2026-04-10 17:17:22Z INFO StepsRunner] No need for updating job result with current step result 'Skipped'.
[2026-04-10 17:17:22Z INFO StepsRunner] Current state: job state = 'Failed'
[2026-04-10 17:17:22Z INFO StepsRunner] Processing step: DisplayName='Install dependencies in WSL workspace'
[2026-04-10 17:17:22Z INFO StepsRunner] Evaluating: (success() && (steps.freshness.outputs.should_run == 'true'))
[2026-04-10 17:17:22Z INFO StepsRunner] Expanded: (false && (steps['freshness']['outputs']['should_run'] == 'true'))
[2026-04-10 17:17:22Z INFO StepsRunner] Result: false
[2026-04-10 17:17:22Z INFO StepsRunner] Skipping step due to condition evaluation.
[2026-04-10 17:17:22Z INFO StepsRunner] No need for updating job result with current step result 'Skipped'.
[2026-04-10 17:17:22Z INFO StepsRunner] Current state: job state = 'Failed'
[2026-04-10 17:17:22Z INFO StepsRunner] Processing step: DisplayName='Start smoke gate and detached production'
[2026-04-10 17:17:22Z INFO StepsRunner] Evaluating: (success() && (steps.freshness.outputs.should_run == 'true'))
[2026-04-10 17:17:22Z INFO StepsRunner] Expanded: (false && (steps['freshness']['outputs']['should_run'] == 'true'))
[2026-04-10 17:17:22Z INFO StepsRunner] Result: false
[2026-04-10 17:17:22Z INFO StepsRunner] Skipping step due to condition evaluation.
[2026-04-10 17:17:22Z INFO StepsRunner] No need for updating job result with current step result 'Skipped'.
[2026-04-10 17:17:22Z INFO StepsRunner] Current state: job state = 'Failed'
[2026-04-10 17:17:22Z INFO StepsRunner] Processing step: DisplayName='Report skipped stale schedule'
[2026-04-10 17:17:22Z INFO StepsRunner] Evaluating: (success() && (steps.freshness.outputs.should_run != 'true'))
[2026-04-10 17:17:22Z INFO StepsRunner] Expanded: (false && (steps['freshness']['outputs']['should_run'] != 'true'))
[2026-04-10 17:17:22Z INFO StepsRunner] Result: false
[2026-04-10 17:17:22Z INFO StepsRunner] Skipping step due to condition evaluation.
[2026-04-10 17:17:22Z INFO StepsRunner] No need for updating job result with current step result 'Skipped'.
[2026-04-10 17:17:22Z INFO StepsRunner] Current state: job state = 'Failed'
[2026-04-10 17:17:22Z INFO StepsRunner] Processing step: DisplayName='Post Run actions/checkout@v4'
[2026-04-10 17:17:22Z INFO StepsRunner] Evaluating: always()
[2026-04-10 17:17:22Z INFO StepsRunner] Result: true
[2026-04-10 17:17:22Z INFO StepsRunner] Starting the step.
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-10 17:17:22Z INFO StepsRunner] Which2: 'chcp'
[2026-04-10 17:17:22Z INFO StepsRunner] Location: 'C:\Windows\system32\chcp.COM'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper] Starting process:
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   File name: 'C:\Windows\system32\chcp.COM'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Arguments: '65001'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Working directory: 'C:\actions-runner\_work'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Require exit code zero: 'False'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Encoding web name:  ; code page: ''
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Force kill process on cancellation: 'False'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Redirected STDIN: 'False'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Persist current code page: 'True'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Keep redirected STDIN open: 'False'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   High priority process: 'False'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper] Process started with process id 14400, waiting for process exit.
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper] Finished process 14400 with exit code 0, and elapsed time 00:00:00.0064461.
[2026-04-10 17:17:22Z INFO StepsRunner] Successfully returned to code page 65001 (UTF8)
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-10 17:17:22Z INFO ActionManager] Load action that reference repository from 'C:\actions-runner\_work\_actions\actions\checkout\v4'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Loaded action.yml file: {
  "name": "Checkout",
  "description": "Checkout a Git repository at a particular version",
  "inputs": {
    "type": 2,
    "map": [
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 4,
          "col": 3,
          "lit": "repository"
        },
        "value": {
          "type": 3,
          "file": 2,
          "line": 6,
          "col": 14,
          "expr": "github.repository"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 7,
          "col": 3,
          "lit": "ref"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 12,
          "col": 3,
          "lit": "token"
        },
        "value": {
          "type": 3,
          "file": 2,
          "line": 24,
          "col": 14,
          "expr": "github.token"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 25,
          "col": 3,
          "lit": "ssh-key"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 37,
          "col": 3,
          "lit": "ssh-known-hosts"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 42,
          "col": 3,
          "lit": "ssh-strict"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 47,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 48,
          "col": 3,
          "lit": "ssh-user"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 51,
          "col": 14,
          "lit": "git"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 52,
          "col": 3,
          "lit": "persist-credentials"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 54,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 55,
          "col": 3,
          "lit": "path"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 57,
          "col": 3,
          "lit": "clean"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 59,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 60,
          "col": 3,
          "lit": "filter"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 64,
          "col": 14,
          "lit": ""
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 65,
          "col": 3,
          "lit": "sparse-checkout"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 69,
          "col": 14,
          "lit": ""
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 70,
          "col": 3,
          "lit": "sparse-checkout-cone-mode"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 73,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 74,
          "col": 3,
          "lit": "fetch-depth"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 76,
          "col": 14,
          "lit": "1"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 77,
          "col": 3,
          "lit": "fetch-tags"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 79,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 80,
          "col": 3,
          "lit": "show-progress"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 82,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 83,
          "col": 3,
          "lit": "lfs"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 85,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 86,
          "col": 3,
          "lit": "submodules"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 94,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 95,
          "col": 3,
          "lit": "set-safe-directory"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 97,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 98,
          "col": 3,
          "lit": "github-server-url"
        },
        "value": ""
      }
    ]
  },
  "execution": {
    "executionType": "nodeJS",
    "hasPre": false,
    "hasPost": true,
    "script": "dist/index.js",
    "pre": null,
    "post": "dist/index.js",
    "nodeVersion": "node20",
    "cleanupCondition": "always()",
    "initCondition": "always()"
  },
  "deprecated": null
}
[2026-04-10 17:17:22Z INFO ActionManager] Action pre node.js file: N/A.
[2026-04-10 17:17:22Z INFO ActionManager] Action node.js file: dist/index.js.
[2026-04-10 17:17:22Z INFO ActionManager] Action post node.js file: dist/index.js.
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-10 17:17:22Z INFO ExecutionContext] Write event payload to C:\actions-runner\_work\_temp\_github_workflow\event.json
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-10 17:17:22Z INFO ExtensionManager] Getting extensions for interface: 'GitHub.Runner.Worker.IFileCommandExtension'
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'repository': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 6,
  "col": 14,
  "lit": "FPXszk/Oh-MY-TradingView"
}
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'ref': default value evaluate result: ""
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'token': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 24,
  "col": 14,
  "lit": "***"
}
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'ssh-key': default value evaluate result: ""
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'ssh-known-hosts': default value evaluate result: ""
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'ssh-strict': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 47,
  "col": 14,
  "lit": "true"
}
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'ssh-user': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 51,
  "col": 14,
  "lit": "git"
}
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'persist-credentials': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 54,
  "col": 14,
  "lit": "true"
}
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'path': default value evaluate result: ""
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'filter': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 64,
  "col": 14,
  "lit": ""
}
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'sparse-checkout': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 69,
  "col": 14,
  "lit": ""
}
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'sparse-checkout-cone-mode': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 73,
  "col": 14,
  "lit": "true"
}
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'fetch-depth': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 76,
  "col": 14,
  "lit": "1"
}
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'fetch-tags': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 79,
  "col": 14,
  "lit": "false"
}
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'show-progress': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 82,
  "col": 14,
  "lit": "true"
}
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'lfs': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 85,
  "col": 14,
  "lit": "false"
}
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'submodules': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 94,
  "col": 14,
  "lit": "false"
}
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'set-safe-directory': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 97,
  "col": 14,
  "lit": "true"
}
[2026-04-10 17:17:22Z INFO ActionManifestManagerLegacy] Input 'github-server-url': default value evaluate result: ""
[2026-04-10 17:17:22Z INFO ExtensionManager] Getting extensions for interface: 'GitHub.Runner.Worker.IActionCommandExtension'
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command internal-set-repo-path
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command set-env
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command set-output
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command save-state
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command add-path
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command add-mask
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command add-matcher
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command remove-matcher
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command warning
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command error
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command notice
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command debug
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command group
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command endgroup
[2026-04-10 17:17:22Z INFO ActionCommandManager] Register action command extension for command echo
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:22Z INFO HostContext] Well known directory 'Externals': 'C:\actions-runner\externals'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper] Starting process:
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   File name: 'C:\actions-runner\externals\node20\bin\node.exe'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Arguments: '"C:\actions-runner\_work\_actions\actions\checkout\v4\dist/index.js"'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Working directory: 'C:\actions-runner\_work\Oh-MY-TradingView\Oh-MY-TradingView'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Require exit code zero: 'False'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Encoding web name: utf-8 ; code page: '65001'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Force kill process on cancellation: 'False'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Redirected STDIN: 'False'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Persist current code page: 'True'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   Keep redirected STDIN open: 'False'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper]   High priority process: 'False'
[2026-04-10 17:17:22Z INFO ProcessInvokerWrapper] Process started with process id 13592, waiting for process exit.
[2026-04-10 17:17:22Z INFO AddMaskCommandExtension] Add new secret mask with length of 32
[2026-04-10 17:17:22Z INFO JobServerQueue] Try to append 1 batches web console lines for record '86fb9ce9-7870-415e-97f4-6e130587b445', success rate: 1/1.
[2026-04-10 17:17:22Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'a00fbeae-4363-4006-96cf-4b85e4ef3f5f', success rate: 1/1.
[2026-04-10 17:17:23Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'a00fbeae-4363-4006-96cf-4b85e4ef3f5f', success rate: 1/1.
[2026-04-10 17:17:23Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-10 17:17:23Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-10 17:17:23Z INFO ProcessInvokerWrapper] Finished process 13592 with exit code 0, and elapsed time 00:00:00.4801288.
[2026-04-10 17:17:23Z INFO CreateStepSummaryCommand] Step Summary file (C:\actions-runner\_work\_temp\_runner_file_commands\step_summary_219eb856-1d09-4bf0-99d2-376d487073e9) is empty; skipping attachment upload
[2026-04-10 17:17:23Z INFO StepsRunner] Step result:
[2026-04-10 17:17:23Z INFO ExecutionContext] Publish step telemetry for current step {
  "action": "actions/checkout",
  "ref": "v4",
  "type": "node20",
  "stage": "Post",
  "stepId": "a00fbeae-4363-4006-96cf-4b85e4ef3f5f",
  "result": "succeeded",
  "errorMessages": [
    "The process 'C:\\Program Files\\Git\\cmd\\git.exe' failed with exit code 128"
  ],
  "executionTimeInSeconds": 1,
  "startTime": "2026-04-10T17:17:22.6511124Z",
  "finishTime": "2026-04-10T17:17:23.1518526Z"
}.
[2026-04-10 17:17:23Z INFO StepsRunner] No need for updating job result with current step result 'Succeeded'.
[2026-04-10 17:17:23Z INFO StepsRunner] Current state: job state = 'Failed'
[2026-04-10 17:17:23Z INFO JobRunner] Finalize job.
[2026-04-10 17:17:23Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:23Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:23Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-10 17:17:23Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:23Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:23Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-10 17:17:23Z INFO JobExtension] Initialize Env context
[2026-04-10 17:17:23Z INFO JobExtension] Initialize steps context
[2026-04-10 17:17:23Z INFO JobExtension] Total accessible running process: 300.
[2026-04-10 17:17:23Z INFO JobExtension] Wait for all connectivity checks to finish.
[2026-04-10 17:17:23Z INFO JobExtension] Connectivity check result: GitHub.Runner.Worker.JobExtension+CheckResult
[2026-04-10 17:17:23Z INFO JobExtension] Connectivity check result: GitHub.Runner.Worker.JobExtension+CheckResult
[2026-04-10 17:17:23Z INFO JobExtension] Connectivity check result: GitHub.Runner.Worker.JobExtension+CheckResult
[2026-04-10 17:17:23Z INFO ExecutionContext] Publish step telemetry for current step {
  "action": "complete_job",
  "type": "runner",
  "stage": "Post",
  "stepId": "f0e65f64-db14-488a-bee6-00b1bd846c7d",
  "result": "succeeded",
  "errorMessages": [
    "Node.js 20 actions are deprecated. The following actions are running on Node.js 20 and may not work as expected: actions/checkout@v4. Actions will be forced to run with Node.js 24 by default starting June 2nd, 2026. Node.js 20 will be removed from the runn"
  ],
  "executionTimeInSeconds": 1,
  "startTime": "2026-04-10T17:17:23.1570486Z",
  "finishTime": "2026-04-10T17:17:23.1724247Z"
}.
[2026-04-10 17:17:23Z INFO JobRunner] Job result after all job steps finish: Failed
[2026-04-10 17:17:23Z INFO JobRunner] Completing the job execution context.
[2026-04-10 17:17:23Z INFO JobRunner] Shutting down the job server queue.
[2026-04-10 17:17:23Z INFO JobServerQueue] Fire signal to shutdown all queues.
[2026-04-10 17:17:23Z INFO JobServerQueue] Tried to upload 1 file(s) to results, success rate: 1/1.
[2026-04-10 17:17:24Z INFO JobServerQueue] All queue process task stopped.
[2026-04-10 17:17:24Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'a00fbeae-4363-4006-96cf-4b85e4ef3f5f', success rate: 1/1.
[2026-04-10 17:17:24Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'f0e65f64-db14-488a-bee6-00b1bd846c7d', success rate: 1/1.
[2026-04-10 17:17:24Z INFO JobServerQueue] Web console line queue drained.
[2026-04-10 17:17:24Z INFO JobServerQueue] Uploading 4 files in one shot.
[2026-04-10 17:17:24Z INFO JobServerQueue] Try to upload 4 log files or attachments, success rate: 4/4.
[2026-04-10 17:17:24Z INFO JobServerQueue] File upload queue drained.
[2026-04-10 17:17:24Z INFO JobServerQueue] Starting results-based upload queue...
[2026-04-10 17:17:24Z INFO JobServerQueue] Uploading 4 file(s) in one shot through results service.
[2026-04-10 17:17:24Z INFO JobServerQueue] Got a step log file to send to results service.
[2026-04-10 17:17:24Z INFO JobServerQueue] Starting upload of step log file to results service ResultsLog, C:\actions-runner\_diag\blocks\e1371cd8-f4ba-4728-82c8-f1602a2a51ec_86fb9ce9-7870-415e-97f4-6e130587b445.1
[2026-04-10 17:17:25Z INFO JobServerQueue] Got a step log file to send to results service.
[2026-04-10 17:17:25Z INFO JobServerQueue] Starting upload of step log file to results service ResultsLog, C:\actions-runner\_diag\blocks\e1371cd8-f4ba-4728-82c8-f1602a2a51ec_a00fbeae-4363-4006-96cf-4b85e4ef3f5f.1
[2026-04-10 17:17:25Z INFO JobServerQueue] Got a step log file to send to results service.
[2026-04-10 17:17:25Z INFO JobServerQueue] Starting upload of step log file to results service ResultsLog, C:\actions-runner\_diag\blocks\e1371cd8-f4ba-4728-82c8-f1602a2a51ec_f0e65f64-db14-488a-bee6-00b1bd846c7d.1
[2026-04-10 17:17:26Z INFO JobServerQueue] Got a job log file to send to results service.
[2026-04-10 17:17:26Z INFO JobServerQueue] Starting upload of job log file to results service ResultsLog, C:\actions-runner\_diag\blocks\e1371cd8-f4ba-4728-82c8-f1602a2a51ec_716f0733-aac9-5382-ac93-8ebe284f765e.1
[2026-04-10 17:17:27Z INFO JobServerQueue] Tried to upload 4 file(s) to results, success rate: 4/4.
[2026-04-10 17:17:27Z INFO JobServerQueue] Results upload queue drained.
[2026-04-10 17:17:27Z INFO JobServerQueue] Timeline update queue drained.
[2026-04-10 17:17:27Z INFO JobServerQueue] Disposing job server ...
[2026-04-10 17:17:27Z INFO JobServerQueue] Disposing results server ...
[2026-04-10 17:17:27Z INFO JobServerQueue] All queue process tasks have been stopped, and all queues are drained.
[2026-04-10 17:17:27Z INFO TempDirectoryManager] Cleaning runner temp folder: C:\actions-runner\_work\_temp
[2026-04-10 17:17:27Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-10 17:17:27Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-10 17:17:27Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-10 17:17:27Z INFO HostContext] Well known config file 'Telemetry': 'C:\actions-runner\_diag\.telemetry'
[2026-04-10 17:17:27Z INFO JobRunner] Raising job completed against run service
[2026-04-10 17:17:27Z INFO Worker] Job completed.
[2026-04-11 02:45:56Z INFO HostContext] No proxy settings were found based on environmental variables (http_proxy/https_proxy/HTTP_PROXY/HTTPS_PROXY)
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:56Z INFO HostContext] Well known config file 'Credentials': 'C:\actions-runner\.credentials'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:56Z INFO HostContext] Well known config file 'Runner': 'C:\actions-runner\.runner'
[2026-04-11 02:45:56Z INFO Worker] Version: 2.333.1
[2026-04-11 02:45:56Z INFO Worker] Commit: 6792966801e8925346735b68c03bf9f347af4646
[2026-04-11 02:45:56Z INFO Worker] Culture: ja-JP
[2026-04-11 02:45:56Z INFO Worker] UI Culture: ja-JP
[2026-04-11 02:45:56Z INFO Worker] Waiting to receive the job message from the channel.
[2026-04-11 02:45:56Z INFO ProcessChannel] Receiving message of length 21813, with hash '6683f7477eab1a158dc09dc067e3e60f28b2682c7c38a7b76cc3b47e31805628'
[2026-04-11 02:45:56Z INFO Worker] Message received.
[2026-04-11 02:45:56Z INFO Worker] Job message:
 {
  "fileTable": [
    ".github/workflows/night-batch-self-hosted.yml"
  ],
  "mask": [
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    }
  ],
  "steps": [
    {
      "type": "action",
      "reference": {
        "type": "repository",
        "name": "actions/checkout",
        "ref": "v4",
        "repositoryType": "GitHub"
      },
      "contextName": "__actions_checkout",
      "inputs": {
        "type": 2,
        "file": 1,
        "line": 21,
        "col": 11,
        "map": [
          {
            "key": {
              "type": 0,
              "file": 1,
              "line": 21,
              "col": 11,
              "lit": "clean"
            },
            "value": {
              "type": 0,
              "file": 1,
              "line": 21,
              "col": 18,
              "lit": "false"
            }
          }
        ]
      },
      "condition": "success()",
      "id": "4ab064ef-03dc-4e11-9aab-e9dfe9508434",
      "name": "__actions_checkout"
    },
    {
      "type": "action",
      "reference": {
        "type": "script"
      },
      "displayNameToken": {
        "type": 0,
        "file": 1,
        "line": 23,
        "col": 15,
        "lit": "Evaluate schedule freshness"
      },
      "contextName": "freshness",
      "inputs": {
        "type": 2,
        "map": [
          {
            "key": "script",
            "value": {
              "type": 3,
              "file": 1,
              "line": 26,
              "col": 14,
              "expr": "format('$shouldRun = ''true''\nif (''{0}'' -eq ''schedule'') {{\n  $jst = [System.TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTimeOffset]::UtcNow, ''Tokyo Standard Time'')\n  if ($jst.Hour -ne 0) {{\n    Write-Host \"Skipping stale scheduled run at $($jst.ToString(''yyyy-MM-dd HH:mm:ss zzz''))\"\n    $shouldRun = ''false''\n  }}\n}}\n\"should_run=$shouldRun\" | Out-File -FilePath $env:GITHUB_OUTPUT -Encoding utf8 -Append\n', github.event_name)"
            }
          },
          {
            "key": "shell",
            "value": {
              "type": 0,
              "file": 1,
              "line": 25,
              "col": 16,
              "lit": "powershell -NoProfile -ExecutionPolicy Bypass -command \". '{0}'\""
            }
          }
        ]
      },
      "condition": "success()",
      "id": "97871dd8-23a5-4065-af8e-3e57a1b536a2",
      "name": "freshness"
    },
    {
      "type": "action",
      "reference": {
        "type": "script"
      },
      "displayNameToken": {
        "type": 0,
        "file": 1,
        "line": 37,
        "col": 15,
        "lit": "Install dependencies in WSL workspace"
      },
      "contextName": "__run",
      "inputs": {
        "type": 2,
        "map": [
          {
            "key": "script",
            "value": {
              "type": 0,
              "file": 1,
              "line": 40,
              "col": 14,
              "lit": "for /f \"usebackq delims=\" %%I in (`wsl.exe wslpath -a \"%CD%\"`) do set \"REPO_WSL=%%I\"\nif not defined REPO_WSL exit /b 1\nwsl.exe bash -lc \"cd \\\"%REPO_WSL%\\\" && npm ci --silent\"\n"
            }
          },
          {
            "key": "shell",
            "value": {
              "type": 0,
              "file": 1,
              "line": 39,
              "col": 16,
              "lit": "cmd"
            }
          }
        ]
      },
      "condition": "success() && (steps.freshness.outputs.should_run == 'true')",
      "id": "580dea02-81bb-459f-bad9-6910a4b95a3b",
      "name": "__run"
    },
    {
      "type": "action",
      "reference": {
        "type": "script"
      },
      "displayNameToken": {
        "type": 0,
        "file": 1,
        "line": 45,
        "col": 15,
        "lit": "Start smoke gate and detached production"
      },
      "contextName": "__run_2",
      "inputs": {
        "type": 2,
        "map": [
          {
            "key": "script",
            "value": {
              "type": 3,
              "file": 1,
              "line": 48,
              "col": 14,
              "expr": "format('set \"NIGHT_BATCH_CONFIG={0}\"\nif \"%NIGHT_BATCH_CONFIG%\"==\"\" (\n  if \"{1}\"==\"workflow_dispatch\" (\n    echo [diag] ERROR: workflow_dispatch requires a non-empty config_path\n    exit /b 1\n  )\n  set \"NIGHT_BATCH_CONFIG=config/night_batch/bundle-detached-reuse-config.json\"\n)\necho [diag] config_path=%NIGHT_BATCH_CONFIG%\necho [diag] CD=%CD%\nif not exist \"%NIGHT_BATCH_CONFIG%\" (\n  echo [diag] WARNING: config file not found at %NIGHT_BATCH_CONFIG%\n)\nscripts\\windows\\run-night-batch-self-hosted.cmd \"%NIGHT_BATCH_CONFIG%\"\nset \"BATCH_EXIT=%ERRORLEVEL%\"\necho [diag] wrapper exit code=%BATCH_EXIT%\nexit /b %BATCH_EXIT%\n', inputs.config_path, github.event_name)"
            }
          },
          {
            "key": "shell",
            "value": {
              "type": 0,
              "file": 1,
              "line": 47,
              "col": 16,
              "lit": "cmd"
            }
          }
        ]
      },
      "condition": "success() && (steps.freshness.outputs.should_run == 'true')",
      "id": "7b54e584-9807-4a49-908c-2da88b936f12",
      "name": "__run_2"
    },
    {
      "type": "action",
      "reference": {
        "type": "script"
      },
      "displayNameToken": {
        "type": 0,
        "file": 1,
        "line": 67,
        "col": 15,
        "lit": "Report skipped stale schedule"
      },
      "contextName": "__run_3",
      "inputs": {
        "type": 2,
        "map": [
          {
            "key": "script",
            "value": {
              "type": 0,
              "file": 1,
              "line": 70,
              "col": 14,
              "lit": "Write-Host 'Skipped stale scheduled run outside the 00:00 JST launch window.'"
            }
          },
          {
            "key": "shell",
            "value": {
              "type": 0,
              "file": 1,
              "line": 69,
              "col": 16,
              "lit": "powershell -NoProfile -ExecutionPolicy Bypass -command \". '{0}'\""
            }
          }
        ]
      },
      "condition": "success() && (steps.freshness.outputs.should_run != 'true')",
      "id": "6c44f30c-13eb-4844-91cb-08a0685fb1ec",
      "name": "__run_3"
    }
  ],
  "variables": {
    "Actions.EnableHttpRedirects": {
      "value": "true"
    },
    "DistributedTask.AddWarningToNode12Action": {
      "value": "true"
    },
    "DistributedTask.AddWarningToNode16Action": {
      "value": "true"
    },
    "DistributedTask.AllowRunnerContainerHooks": {
      "value": "true"
    },
    "DistributedTask.DeprecateStepOutputCommands": {
      "value": "true"
    },
    "DistributedTask.DetailUntarFailure": {
      "value": "true"
    },
    "DistributedTask.EnableCompositeActions": {
      "value": "true"
    },
    "DistributedTask.EnableJobServerQueueTelemetry": {
      "value": "true"
    },
    "DistributedTask.EnhancedAnnotations": {
      "value": "true"
    },
    "DistributedTask.ForceGithubJavascriptActionsToNode16": {
      "value": "true"
    },
    "DistributedTask.ForceGithubJavascriptActionsToNode20": {
      "value": "true"
    },
    "DistributedTask.LogTemplateErrorsAsDebugMessages": {
      "value": "true"
    },
    "DistributedTask.MarkJobAsFailedOnWorkerCrash": {
      "value": "true"
    },
    "DistributedTask.NewActionMetadata": {
      "value": "true"
    },
    "DistributedTask.UploadStepSummary": {
      "value": "true"
    },
    "DistributedTask.UseActionArchiveCache": {
      "value": "true"
    },
    "DistributedTask.UseWhich2": {
      "value": "true"
    },
    "RunService.FixEmbeddedIssues": {
      "value": "true"
    },
    "actions.runner.requirenode24": {
      "value": "false"
    },
    "actions.runner.usenode24bydefault": {
      "value": "false"
    },
    "actions.runner.warnonnode20": {
      "value": "true"
    },
    "actions_add_check_run_id_to_job_context": {
      "value": "true"
    },
    "actions_batch_action_resolution": {
      "value": "false"
    },
    "actions_container_action_runner_temp": {
      "value": "true"
    },
    "actions_display_helpful_actions_download_errors": {
      "value": "true"
    },
    "actions_runner_compare_workflow_parser": {
      "value": "false"
    },
    "actions_runner_deprecate_linux_arm32": {
      "value": "false"
    },
    "actions_runner_emit_composite_markers": {
      "value": "false"
    },
    "actions_runner_kill_linux_arm32": {
      "value": "false"
    },
    "actions_runner_node20_removal_date": {
      "value": ""
    },
    "actions_runner_node24_default_date": {
      "value": ""
    },
    "actions_service_container_command": {
      "value": "true"
    },
    "actions_set_orchestration_id_env_for_actions": {
      "value": "true"
    },
    "actions_skip_retry_complete_job_upon_known_errors": {
      "value": "true"
    },
    "actions_snapshot_preflight_hosted_runner_check": {
      "value": "false"
    },
    "actions_snapshot_preflight_image_gen_pool_check": {
      "value": "false"
    },
    "actions_use_bearer_token_for_codeload": {
      "value": "false"
    },
    "actions_uses_cache_service_v2": {
      "value": "true"
    },
    "github_token": {
      "value": "***",
      "isSecret": true
    },
    "system.from_run_service": {
      "value": "true"
    },
    "system.github.job": {
      "value": "start-night-batch"
    },
    "system.github.launch_endpoint": {
      "value": "https://launch.actions.githubusercontent.com"
    },
    "system.github.results_endpoint": {
      "value": "https://results-receiver.actions.githubusercontent.com/"
    },
    "system.github.results_upload_with_sdk": {
      "value": "true"
    },
    "system.github.token": {
      "value": "***",
      "isSecret": true
    },
    "system.github.token.permissions": {
      "value": "{\"Contents\":\"read\",\"Metadata\":\"read\",\"Packages\":\"read\"}"
    },
    "system.orchestrationId": {
      "value": "b3c8b52a-415f-4b1a-a07f-589986b6f2e0.start-night-batch.__default"
    },
    "system.phaseDisplayName": {
      "value": "start-night-batch"
    },
    "system.runner.lowdiskspacethreshold": {
      "value": "100"
    },
    "system.runnerEnvironment": {
      "value": "self-hosted"
    },
    "system.runnerGroupName": {
      "value": "Default"
    }
  },
  "messageType": "RunnerJobRequest",
  "plan": {
    "scopeIdentifier": "00000000-0000-0000-0000-000000000000",
    "planType": "actions",
    "version": 0,
    "planId": "b3c8b52a-415f-4b1a-a07f-589986b6f2e0",
    "planGroup": null,
    "artifactUri": null,
    "artifactLocation": null,
    "definition": null,
    "owner": null
  },
  "timeline": {
    "id": "b3c8b52a-415f-4b1a-a07f-589986b6f2e0",
    "changeId": 0,
    "location": null
  },
  "jobId": "3ae07984-1f30-573b-b1d1-19e93f92a2b5",
  "jobDisplayName": "start-night-batch",
  "jobName": "__default",
  "requestId": 0,
  "lockedUntil": "0001-01-01T00:00:00",
  "resources": {
    "endpoints": [
      {
        "data": {
          "ServerId": "",
          "ServerName": "",
          "CacheServerUrl": "https://artifactcache.actions.githubusercontent.com/fxVVKbIXsGW6VUtgk79y6hl4lLQopPt0MYpHoDTMFEQzqqyAuC/",
          "FeedStreamUrl": "wss://results-receiver.actions.githubusercontent.com/_ws/ingest.sock",
          "ResultsServiceUrl": "https://results-receiver.actions.githubusercontent.com/",
          "PipelinesServiceUrl": "https://pipelinesghubeus21.actions.githubusercontent.com/fxVVKbIXsGW6VUtgk79y6hl4lLQopPt0MYpHoDTMFEQzqqyAuC/",
          "GenerateIdTokenUrl": "",
          "ConnectivityChecks": "[\"https://broker.actions.githubusercontent.com/health\",\"https://token.actions.githubusercontent.com/ready\",\"https://run.actions.githubusercontent.com/health\"]"
        },
        "name": "SystemVssConnection",
        "url": "https://run-actions-3-azure-eastus.actions.githubusercontent.com/27/",
        "authorization": {
          "parameters": {
            "AccessToken": "***"
          },
          "scheme": "OAuth"
        },
        "isShared": false,
        "isReady": true
      }
    ]
  },
  "contextData": {
    "github": {
      "t": 2,
      "d": [
        {
          "k": "ref",
          "v": "refs/heads/main"
        },
        {
          "k": "sha",
          "v": "b78238dce1c7700de71e146a521397863ac9f691"
        },
        {
          "k": "repository",
          "v": "FPXszk/Oh-MY-TradingView"
        },
        {
          "k": "repository_owner",
          "v": "FPXszk"
        },
        {
          "k": "repository_owner_id",
          "v": "106506797"
        },
        {
          "k": "repositoryUrl",
          "v": "git://github.com/FPXszk/Oh-MY-TradingView.git"
        },
        {
          "k": "run_id",
          "v": "24255059078"
        },
        {
          "k": "run_number",
          "v": "7"
        },
        {
          "k": "retention_days",
          "v": "90"
        },
        {
          "k": "run_attempt",
          "v": "2"
        },
        {
          "k": "artifact_cache_size_limit",
          "v": "10"
        },
        {
          "k": "repository_visibility",
          "v": "public"
        },
        {
          "k": "actor_id",
          "v": "106506797"
        },
        {
          "k": "actor",
          "v": "FPXszk"
        },
        {
          "k": "workflow",
          "v": "Night Batch Self Hosted"
        },
        {
          "k": "head_ref",
          "v": ""
        },
        {
          "k": "base_ref",
          "v": ""
        },
        {
          "k": "event_name",
          "v": "workflow_dispatch"
        },
        {
          "k": "server_url",
          "v": "https://github.com"
        },
        {
          "k": "api_url",
          "v": "https://api.github.com"
        },
        {
          "k": "graphql_url",
          "v": "https://api.github.com/graphql"
        },
        {
          "k": "ref_name",
          "v": "main"
        },
        {
          "k": "ref_protected",
          "v": false
        },
        {
          "k": "ref_type",
          "v": "branch"
        },
        {
          "k": "secret_source",
          "v": "Actions"
        },
        {
          "k": "event",
          "v": {
            "t": 2,
            "d": [
              {
                "k": "ref",
                "v": "refs/heads/main"
              },
              {
                "k": "workflow",
                "v": ".github/workflows/night-batch-self-hosted.yml"
              },
              {
                "k": "inputs",
                "v": {
                  "t": 2,
                  "d": [
                    {
                      "k": "config_path",
                      "v": "config/night_batch/bundle-detached-reuse-config.json"
                    }
                  ]
                }
              },
              {
                "k": "repository",
                "v": {
                  "t": 2,
                  "d": [
                    {
                      "k": "id",
                      "v": 1200380563.0
                    },
                    {
                      "k": "node_id",
                      "v": "R_kgDOR4xakw"
                    },
                    {
                      "k": "name",
                      "v": "Oh-MY-TradingView"
                    },
                    {
                      "k": "full_name",
                      "v": "FPXszk/Oh-MY-TradingView"
                    },
                    {
                      "k": "private",
                      "v": false
                    },
                    {
                      "k": "owner",
                      "v": {
                        "t": 2,
                        "d": [
                          {
                            "k": "login",
                            "v": "FPXszk"
                          },
                          {
                            "k": "id",
                            "v": 106506797.0
                          },
                          {
                            "k": "node_id",
                            "v": "U_kgDOBlkqLQ"
                          },
                          {
                            "k": "avatar_url",
                            "v": "https://avatars.githubusercontent.com/u/106506797?v=4"
                          },
                          {
                            "k": "gravatar_id",
                            "v": ""
                          },
                          {
                            "k": "url",
                            "v": "https://api.github.com/users/FPXszk"
                          },
                          {
                            "k": "html_url",
                            "v": "https://github.com/FPXszk"
                          },
                          {
                            "k": "followers_url",
                            "v": "https://api.github.com/users/FPXszk/followers"
                          },
                          {
                            "k": "following_url",
                            "v": "https://api.github.com/users/FPXszk/following{/other_user}"
                          },
                          {
                            "k": "gists_url",
                            "v": "https://api.github.com/users/FPXszk/gists{/gist_id}"
                          },
                          {
                            "k": "starred_url",
                            "v": "https://api.github.com/users/FPXszk/starred{/owner}{/repo}"
                          },
                          {
                            "k": "subscriptions_url",
                            "v": "https://api.github.com/users/FPXszk/subscriptions"
                          },
                          {
                            "k": "organizations_url",
                            "v": "https://api.github.com/users/FPXszk/orgs"
                          },
                          {
                            "k": "repos_url",
                            "v": "https://api.github.com/users/FPXszk/repos"
                          },
                          {
                            "k": "events_url",
                            "v": "https://api.github.com/users/FPXszk/events{/privacy}"
                          },
                          {
                            "k": "received_events_url",
                            "v": "https://api.github.com/users/FPXszk/received_events"
                          },
                          {
                            "k": "type",
                            "v": "User"
                          },
                          {
                            "k": "user_view_type",
                            "v": "public"
                          },
                          {
                            "k": "site_admin",
                            "v": false
                          }
                        ]
                      }
                    },
                    {
                      "k": "html_url",
                      "v": "https://github.com/FPXszk/Oh-MY-TradingView"
                    },
                    {
                      "k": "description",
                      "v": null
                    },
                    {
                      "k": "fork",
                      "v": false
                    },
                    {
                      "k": "url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView"
                    },
                    {
                      "k": "forks_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/forks"
                    },
                    {
                      "k": "keys_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/keys{/key_id}"
                    },
                    {
                      "k": "collaborators_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/collaborators{/collaborator}"
                    },
                    {
                      "k": "teams_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/teams"
                    },
                    {
                      "k": "hooks_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/hooks"
                    },
                    {
                      "k": "issue_events_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/issues/events{/number}"
                    },
                    {
                      "k": "events_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/events"
                    },
                    {
                      "k": "assignees_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/assignees{/user}"
                    },
                    {
                      "k": "branches_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/branches{/branch}"
                    },
                    {
                      "k": "tags_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/tags"
                    },
                    {
                      "k": "blobs_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/git/blobs{/sha}"
                    },
                    {
                      "k": "git_tags_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/git/tags{/sha}"
                    },
                    {
                      "k": "git_refs_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/git/refs{/sha}"
                    },
                    {
                      "k": "trees_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/git/trees{/sha}"
                    },
                    {
                      "k": "statuses_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/statuses/{sha}"
                    },
                    {
                      "k": "languages_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/languages"
                    },
                    {
                      "k": "stargazers_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/stargazers"
                    },
                    {
                      "k": "contributors_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/contributors"
                    },
                    {
                      "k": "subscribers_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/subscribers"
                    },
                    {
                      "k": "subscription_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/subscription"
                    },
                    {
                      "k": "commits_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/commits{/sha}"
                    },
                    {
                      "k": "git_commits_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/git/commits{/sha}"
                    },
                    {
                      "k": "comments_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/comments{/number}"
                    },
                    {
                      "k": "issue_comment_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/issues/comments{/number}"
                    },
                    {
                      "k": "contents_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/contents/{+path}"
                    },
                    {
                      "k": "compare_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/compare/{base}...{head}"
                    },
                    {
                      "k": "merges_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/merges"
                    },
                    {
                      "k": "archive_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/{archive_format}{/ref}"
                    },
                    {
                      "k": "downloads_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/downloads"
                    },
                    {
                      "k": "issues_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/issues{/number}"
                    },
                    {
                      "k": "pulls_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/pulls{/number}"
                    },
                    {
                      "k": "milestones_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/milestones{/number}"
                    },
                    {
                      "k": "notifications_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/notifications{?since,all,participating}"
                    },
                    {
                      "k": "labels_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/labels{/name}"
                    },
                    {
                      "k": "releases_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/releases{/id}"
                    },
                    {
                      "k": "deployments_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/deployments"
                    },
                    {
                      "k": "created_at",
                      "v": "2026-04-03T10:48:01Z"
                    },
                    {
                      "k": "updated_at",
                      "v": "2026-04-10T16:48:40Z"
                    },
                    {
                      "k": "pushed_at",
                      "v": "2026-04-10T16:48:37Z"
                    },
                    {
                      "k": "git_url",
                      "v": "git://github.com/FPXszk/Oh-MY-TradingView.git"
                    },
                    {
                      "k": "ssh_url",
                      "v": "git@github.com:FPXszk/Oh-MY-TradingView.git"
                    },
                    {
                      "k": "clone_url",
                      "v": "https://github.com/FPXszk/Oh-MY-TradingView.git"
                    },
                    {
                      "k": "svn_url",
                      "v": "https://github.com/FPXszk/Oh-MY-TradingView"
                    },
                    {
                      "k": "homepage",
                      "v": null
                    },
                    {
                      "k": "size",
                      "v": 2523.0
                    },
                    {
                      "k": "stargazers_count",
                      "v": 1.0
                    },
                    {
                      "k": "watchers_count",
                      "v": 1.0
                    },
                    {
                      "k": "language",
                      "v": "JavaScript"
                    },
                    {
                      "k": "has_issues",
                      "v": true
                    },
                    {
                      "k": "has_projects",
                      "v": true
                    },
                    {
                      "k": "has_downloads",
                      "v": true
                    },
                    {
                      "k": "has_wiki",
                      "v": true
                    },
                    {
                      "k": "has_pages",
                      "v": false
                    },
                    {
                      "k": "has_discussions",
                      "v": false
                    },
                    {
                      "k": "forks_count",
                      "v": 0.0
                    },
                    {
                      "k": "mirror_url",
                      "v": null
                    },
                    {
                      "k": "archived",
                      "v": false
                    },
                    {
                      "k": "disabled",
                      "v": false
                    },
                    {
                      "k": "open_issues_count",
                      "v": 0.0
                    },
                    {
                      "k": "license",
                      "v": null
                    },
                    {
                      "k": "allow_forking",
                      "v": true
                    },
                    {
                      "k": "is_template",
                      "v": false
                    },
                    {
                      "k": "web_commit_signoff_required",
                      "v": false
                    },
                    {
                      "k": "has_pull_requests",
                      "v": true
                    },
                    {
                      "k": "pull_request_creation_policy",
                      "v": "all"
                    },
                    {
                      "k": "topics",
                      "v": {
                        "t": 1
                      }
                    },
                    {
                      "k": "visibility",
                      "v": "public"
                    },
                    {
                      "k": "forks",
                      "v": 0.0
                    },
                    {
                      "k": "open_issues",
                      "v": 0.0
                    },
                    {
                      "k": "watchers",
                      "v": 1.0
                    },
                    {
                      "k": "default_branch",
                      "v": "main"
                    }
                  ]
                }
              },
              {
                "k": "sender",
                "v": {
                  "t": 2,
                  "d": [
                    {
                      "k": "login",
                      "v": "FPXszk"
                    },
                    {
                      "k": "id",
                      "v": 106506797.0
                    },
                    {
                      "k": "node_id",
                      "v": "U_kgDOBlkqLQ"
                    },
                    {
                      "k": "avatar_url",
                      "v": "https://avatars.githubusercontent.com/u/106506797?v=4"
                    },
                    {
                      "k": "gravatar_id",
                      "v": ""
                    },
                    {
                      "k": "url",
                      "v": "https://api.github.com/users/FPXszk"
                    },
                    {
                      "k": "html_url",
                      "v": "https://github.com/FPXszk"
                    },
                    {
                      "k": "followers_url",
                      "v": "https://api.github.com/users/FPXszk/followers"
                    },
                    {
                      "k": "following_url",
                      "v": "https://api.github.com/users/FPXszk/following{/other_user}"
                    },
                    {
                      "k": "gists_url",
                      "v": "https://api.github.com/users/FPXszk/gists{/gist_id}"
                    },
                    {
                      "k": "starred_url",
                      "v": "https://api.github.com/users/FPXszk/starred{/owner}{/repo}"
                    },
                    {
                      "k": "subscriptions_url",
                      "v": "https://api.github.com/users/FPXszk/subscriptions"
                    },
                    {
                      "k": "organizations_url",
                      "v": "https://api.github.com/users/FPXszk/orgs"
                    },
                    {
                      "k": "repos_url",
                      "v": "https://api.github.com/users/FPXszk/repos"
                    },
                    {
                      "k": "events_url",
                      "v": "https://api.github.com/users/FPXszk/events{/privacy}"
                    },
                    {
                      "k": "received_events_url",
                      "v": "https://api.github.com/users/FPXszk/received_events"
                    },
                    {
                      "k": "type",
                      "v": "User"
                    },
                    {
                      "k": "user_view_type",
                      "v": "public"
                    },
                    {
                      "k": "site_admin",
                      "v": false
                    }
                  ]
                }
              }
            ]
          }
        },
        {
          "k": "workflow_ref",
          "v": "FPXszk/Oh-MY-TradingView/.github/workflows/night-batch-self-hosted.yml@refs/heads/main"
        },
        {
          "k": "workflow_sha",
          "v": "b78238dce1c7700de71e146a521397863ac9f691"
        },
        {
          "k": "repository_id",
          "v": "1200380563"
        },
        {
          "k": "triggering_actor",
          "v": "FPXszk"
        }
      ]
    },
    "inputs": {
      "t": 2,
      "d": [
        {
          "k": "config_path",
          "v": "config/night_batch/bundle-detached-reuse-config.json"
        }
      ]
    },
    "job": {
      "t": 2,
      "d": [
        {
          "k": "check_run_id",
          "v": 70881197196.0
        },
        {
          "k": "workflow_ref",
          "v": "FPXszk/Oh-MY-TradingView/.github/workflows/night-batch-self-hosted.yml@refs/heads/main"
        },
        {
          "k": "workflow_sha",
          "v": "b78238dce1c7700de71e146a521397863ac9f691"
        },
        {
          "k": "workflow_repository",
          "v": "FPXszk/Oh-MY-TradingView"
        },
        {
          "k": "workflow_file_path",
          "v": ".github/workflows/night-batch-self-hosted.yml"
        }
      ]
    },
    "matrix": null,
    "needs": {
      "t": 2
    },
    "strategy": {
      "t": 2,
      "d": [
        {
          "k": "fail-fast",
          "v": true
        },
        {
          "k": "job-index",
          "v": 0.0
        },
        {
          "k": "job-total",
          "v": 1.0
        },
        {
          "k": "max-parallel",
          "v": 1.0
        }
      ]
    },
    "vars": {
      "t": 2
    }
  },
  "billingOwnerId": "U_kgDOBlkqLQ"
}
[2026-04-11 02:45:56Z INFO JobRunner] Job ID 3ae07984-1f30-573b-b1d1-19e93f92a2b5
[2026-04-11 02:45:56Z INFO ConfigurationStore] currentAssemblyLocation: C:\actions-runner\bin\Runner.Worker.dll
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:56Z INFO ConfigurationStore] binPath: C:\actions-runner\bin
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:56Z INFO ConfigurationStore] RootFolder: C:\actions-runner
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:56Z INFO HostContext] Well known config file 'Runner': 'C:\actions-runner\.runner'
[2026-04-11 02:45:56Z INFO ConfigurationStore] ConfigFilePath: C:\actions-runner\.runner
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:56Z INFO HostContext] Well known config file 'MigratedRunner': 'C:\actions-runner\.runner_migrated'
[2026-04-11 02:45:56Z INFO ConfigurationStore] MigratedConfigFilePath: C:\actions-runner\.runner_migrated
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:56Z INFO HostContext] Well known config file 'Credentials': 'C:\actions-runner\.credentials'
[2026-04-11 02:45:56Z INFO ConfigurationStore] CredFilePath: C:\actions-runner\.credentials
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:56Z INFO HostContext] Well known config file 'MigratedCredentials': 'C:\actions-runner\.credentials_migrated'
[2026-04-11 02:45:56Z INFO ConfigurationStore] MigratedCredFilePath: C:\actions-runner\.credentials_migrated
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:56Z INFO HostContext] Well known config file 'Service': 'C:\actions-runner\.service'
[2026-04-11 02:45:56Z INFO ConfigurationStore] ServiceConfigFilePath: C:\actions-runner\.service
[2026-04-11 02:45:56Z INFO ConfigurationStore] Read setting file: 310 chars
[2026-04-11 02:45:56Z INFO JobRunner] Initializing launch client
[2026-04-11 02:45:56Z INFO JobServerQueue] Initializing results client
[2026-04-11 02:45:56Z INFO ResultServer] Creating websocket client ...wss://results-receiver.actions.githubusercontent.com/_ws/ingest.sock
[2026-04-11 02:45:56Z INFO ResultServer] Attempting to start websocket client with delay 00:00:00.
[2026-04-11 02:45:56Z INFO JobServerQueue] Start process web console line queue.
[2026-04-11 02:45:56Z INFO JobServerQueue] Start process file upload queue.
[2026-04-11 02:45:56Z INFO JobServerQueue] Start results file upload queue.
[2026-04-11 02:45:56Z INFO JobServerQueue] Starting results-based upload queue...
[2026-04-11 02:45:56Z INFO JobServerQueue] Start process timeline update queue.
[2026-04-11 02:45:56Z INFO ExecutionContext] Initializing Job context
[2026-04-11 02:45:56Z INFO ExecutionContext] Initialize GitHub context
[2026-04-11 02:45:56Z INFO ExecutionContext] Initialize Env context
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 02:45:56Z INFO JobRunner] Starting the job execution context.
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:45:56Z INFO JobRunner] Validating directory permissions for: 'C:\actions-runner\_work'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Tools': 'C:\actions-runner\_work\_tool'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-11 02:45:56Z INFO JobRunner] Getting job extension.
[2026-04-11 02:45:56Z INFO JobRunner] Initialize job. Getting all job steps.
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:56Z INFO HostContext] Well known config file 'Credentials': 'C:\actions-runner\.credentials'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:56Z INFO HostContext] Well known config file 'SetupInfo': 'C:\actions-runner\.setup_info'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:45:56Z INFO PipelineDirectoryManager] Loading tracking config if exists: C:\actions-runner\_work\_PipelineMapping\FPXszk/Oh-MY-TradingView\PipelineFolder.json
[2026-04-11 02:45:56Z INFO PipelineDirectoryManager] Creating a new tracking config file.
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:45:56Z INFO PipelineDirectoryManager] Creating pipeline directory.
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:45:56Z INFO PipelineDirectoryManager] Creating workspace directory.
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:45:56Z INFO JobExtension] Downloading actions
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:45:56Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-11 02:45:56Z INFO Worker] Listening for cancel message from the channel.
[2026-04-11 02:45:56Z INFO Worker] Waiting for the job to complete or for a cancel message from the channel.
[2026-04-11 02:45:56Z INFO ResultServer] Successfully started websocket client.
[2026-04-11 02:45:56Z INFO JobServerQueue] Try to append 1 batches web console lines for record '5f56933f-59fb-4783-8b93-32ee57060c8e', success rate: 1/1.
[2026-04-11 02:45:57Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:57Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:57Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:45:57Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-11 02:45:57Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:57Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:57Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:45:57Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-11 02:45:57Z INFO ActionManager] Save archive 'https://api.github.com/repos/actions/checkout/zipball/34e114876b0b11c390a56381ad16ebd13914f8d5' into C:\actions-runner\_work\_actions\_temp_76ac6612-144b-477b-a43f-c92e0091d26c\0ca25a86-6d1e-44a7-b793-3bf9e5e829dc.zip.
[2026-04-11 02:45:57Z INFO JobServerQueue] Job timeline record has been updated for the first time.
[2026-04-11 02:45:57Z INFO JobServerQueue] Try to append 1 batches web console lines for record '5f56933f-59fb-4783-8b93-32ee57060c8e', success rate: 1/1.
[2026-04-11 02:45:57Z INFO ActionManager] Request URL: https://api.github.com/repos/actions/checkout/zipball/34e114876b0b11c390a56381ad16ebd13914f8d5 X-GitHub-Request-Id: E6C5:2FFD9C:BAFB:566B2:69D9B5F3 Http Status: OK
[2026-04-11 02:45:57Z INFO ActionManager] Finished getting action repository.
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-11 02:45:58Z INFO ActionManifestManagerLegacy] Load schema file with definitions: [
  "null",
  "boolean",
  "number",
  "string",
  "sequence",
  "mapping",
  "any",
  "action-root",
  "inputs",
  "input",
  "outputs",
  "output-definition",
  "runs",
  "container-runs",
  "container-runs-args",
  "container-runs-env",
  "node-runs",
  "plugin-runs",
  "composite-runs",
  "composite-steps",
  "composite-step",
  "run-step",
  "uses-step",
  "container-runs-context",
  "output-value",
  "input-default-context",
  "non-empty-string",
  "string-steps-context",
  "boolean-steps-context",
  "step-env",
  "step-if",
  "step-with"
]
[2026-04-11 02:45:58Z INFO ActionManifestManager] Load schema file with definitions: [
  "null",
  "boolean",
  "number",
  "string",
  "sequence",
  "mapping",
  "any",
  "action-root",
  "inputs",
  "input",
  "outputs",
  "output-definition",
  "runs",
  "container-runs",
  "container-runs-args",
  "container-runs-env",
  "node-runs",
  "plugin-runs",
  "composite-runs",
  "composite-steps",
  "composite-step",
  "run-step",
  "uses-step",
  "container-runs-context",
  "output-value",
  "input-default-context",
  "non-empty-string",
  "string-steps-context",
  "boolean-steps-context",
  "step-env",
  "step-if",
  "step-with"
]
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-11 02:45:58Z INFO ActionManifestManagerLegacy] Loaded action.yml file: {
  "name": "Checkout",
  "description": "Checkout a Git repository at a particular version",
  "inputs": {
    "type": 2,
    "map": [
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 4,
          "col": 3,
          "lit": "repository"
        },
        "value": {
          "type": 3,
          "file": 2,
          "line": 6,
          "col": 14,
          "expr": "github.repository"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 7,
          "col": 3,
          "lit": "ref"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 12,
          "col": 3,
          "lit": "token"
        },
        "value": {
          "type": 3,
          "file": 2,
          "line": 24,
          "col": 14,
          "expr": "github.token"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 25,
          "col": 3,
          "lit": "ssh-key"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 37,
          "col": 3,
          "lit": "ssh-known-hosts"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 42,
          "col": 3,
          "lit": "ssh-strict"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 47,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 48,
          "col": 3,
          "lit": "ssh-user"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 51,
          "col": 14,
          "lit": "git"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 52,
          "col": 3,
          "lit": "persist-credentials"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 54,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 55,
          "col": 3,
          "lit": "path"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 57,
          "col": 3,
          "lit": "clean"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 59,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 60,
          "col": 3,
          "lit": "filter"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 64,
          "col": 14,
          "lit": ""
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 65,
          "col": 3,
          "lit": "sparse-checkout"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 69,
          "col": 14,
          "lit": ""
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 70,
          "col": 3,
          "lit": "sparse-checkout-cone-mode"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 73,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 74,
          "col": 3,
          "lit": "fetch-depth"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 76,
          "col": 14,
          "lit": "1"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 77,
          "col": 3,
          "lit": "fetch-tags"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 79,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 80,
          "col": 3,
          "lit": "show-progress"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 82,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 83,
          "col": 3,
          "lit": "lfs"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 85,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 86,
          "col": 3,
          "lit": "submodules"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 94,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 95,
          "col": 3,
          "lit": "set-safe-directory"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 97,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 98,
          "col": 3,
          "lit": "github-server-url"
        },
        "value": ""
      }
    ]
  },
  "execution": {
    "executionType": "nodeJS",
    "hasPre": false,
    "hasPost": true,
    "script": "dist/index.js",
    "pre": null,
    "post": "dist/index.js",
    "nodeVersion": "node20",
    "cleanupCondition": "always()",
    "initCondition": "always()"
  },
  "deprecated": null
}
[2026-04-11 02:45:58Z INFO ActionManager] Action node.js file: dist/index.js, no more preparation.
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-11 02:45:58Z INFO ActionManager] Load action that reference repository from 'C:\actions-runner\_work\_actions\actions\checkout\v4'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-11 02:45:58Z INFO ActionManifestManagerLegacy] Loaded action.yml file: {
  "name": "Checkout",
  "description": "Checkout a Git repository at a particular version",
  "inputs": {
    "type": 2,
    "map": [
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 4,
          "col": 3,
          "lit": "repository"
        },
        "value": {
          "type": 3,
          "file": 2,
          "line": 6,
          "col": 14,
          "expr": "github.repository"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 7,
          "col": 3,
          "lit": "ref"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 12,
          "col": 3,
          "lit": "token"
        },
        "value": {
          "type": 3,
          "file": 2,
          "line": 24,
          "col": 14,
          "expr": "github.token"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 25,
          "col": 3,
          "lit": "ssh-key"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 37,
          "col": 3,
          "lit": "ssh-known-hosts"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 42,
          "col": 3,
          "lit": "ssh-strict"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 47,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 48,
          "col": 3,
          "lit": "ssh-user"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 51,
          "col": 14,
          "lit": "git"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 52,
          "col": 3,
          "lit": "persist-credentials"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 54,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 55,
          "col": 3,
          "lit": "path"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 57,
          "col": 3,
          "lit": "clean"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 59,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 60,
          "col": 3,
          "lit": "filter"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 64,
          "col": 14,
          "lit": ""
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 65,
          "col": 3,
          "lit": "sparse-checkout"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 69,
          "col": 14,
          "lit": ""
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 70,
          "col": 3,
          "lit": "sparse-checkout-cone-mode"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 73,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 74,
          "col": 3,
          "lit": "fetch-depth"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 76,
          "col": 14,
          "lit": "1"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 77,
          "col": 3,
          "lit": "fetch-tags"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 79,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 80,
          "col": 3,
          "lit": "show-progress"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 82,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 83,
          "col": 3,
          "lit": "lfs"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 85,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 86,
          "col": 3,
          "lit": "submodules"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 94,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 95,
          "col": 3,
          "lit": "set-safe-directory"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 97,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 98,
          "col": 3,
          "lit": "github-server-url"
        },
        "value": ""
      }
    ]
  },
  "execution": {
    "executionType": "nodeJS",
    "hasPre": false,
    "hasPost": true,
    "script": "dist/index.js",
    "pre": null,
    "post": "dist/index.js",
    "nodeVersion": "node20",
    "cleanupCondition": "always()",
    "initCondition": "always()"
  },
  "deprecated": null
}
[2026-04-11 02:45:58Z INFO ActionManager] Action pre node.js file: N/A.
[2026-04-11 02:45:58Z INFO ActionManager] Action node.js file: dist/index.js.
[2026-04-11 02:45:58Z INFO ActionManager] Action post node.js file: dist/index.js.
[2026-04-11 02:45:58Z INFO JobExtension] Adding .
[2026-04-11 02:45:58Z INFO JobExtension] Adding .
[2026-04-11 02:45:58Z INFO JobExtension] Adding .
[2026-04-11 02:45:58Z INFO JobExtension] Adding .
[2026-04-11 02:45:58Z INFO JobExtension] Adding .
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 02:45:58Z INFO JobExtension] Total accessible running process: 303.
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:45:58Z INFO JobExtension] Start checking server connectivity.
[2026-04-11 02:45:58Z INFO JobExtension] Check server connectivity for https://broker.actions.githubusercontent.com/health.
[2026-04-11 02:45:58Z INFO JobExtension] Check server connectivity for https://token.actions.githubusercontent.com/ready.
[2026-04-11 02:45:58Z INFO JobExtension] Check server connectivity for https://run.actions.githubusercontent.com/health.
[2026-04-11 02:45:58Z INFO JobExtension] Start checking service connectivity in background.
[2026-04-11 02:45:58Z INFO ExecutionContext] Publish step telemetry for current step {
  "action": "setup_job",
  "type": "runner",
  "stage": "Pre",
  "stepId": "5f56933f-59fb-4783-8b93-32ee57060c8e",
  "result": "succeeded",
  "errorMessages": [],
  "executionTimeInSeconds": 2,
  "startTime": "2026-04-11T02:45:56.3914917Z",
  "finishTime": "2026-04-11T02:45:58.1439053Z"
}.
[2026-04-11 02:45:58Z INFO JobRunner] Total job steps: 5.
[2026-04-11 02:45:58Z INFO JobRunner] Run all job steps.
[2026-04-11 02:45:58Z INFO StepsRunner] Processing step: DisplayName='Run actions/checkout@v4'
[2026-04-11 02:45:58Z INFO StepsRunner] Evaluating: success()
[2026-04-11 02:45:58Z INFO StepsRunner] Result: true
[2026-04-11 02:45:58Z INFO StepsRunner] Starting the step.
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:45:58Z INFO StepsRunner] Which2: 'chcp'
[2026-04-11 02:45:58Z INFO StepsRunner] Location: 'C:\Windows\system32\chcp.COM'
[2026-04-11 02:45:58Z INFO ProcessInvokerWrapper] Starting process:
[2026-04-11 02:45:58Z INFO ProcessInvokerWrapper]   File name: 'C:\Windows\system32\chcp.COM'
[2026-04-11 02:45:58Z INFO ProcessInvokerWrapper]   Arguments: '65001'
[2026-04-11 02:45:58Z INFO ProcessInvokerWrapper]   Working directory: 'C:\actions-runner\_work'
[2026-04-11 02:45:58Z INFO ProcessInvokerWrapper]   Require exit code zero: 'False'
[2026-04-11 02:45:58Z INFO ProcessInvokerWrapper]   Encoding web name:  ; code page: ''
[2026-04-11 02:45:58Z INFO ProcessInvokerWrapper]   Force kill process on cancellation: 'False'
[2026-04-11 02:45:58Z INFO ProcessInvokerWrapper]   Redirected STDIN: 'False'
[2026-04-11 02:45:58Z INFO ProcessInvokerWrapper]   Persist current code page: 'True'
[2026-04-11 02:45:58Z INFO ProcessInvokerWrapper]   Keep redirected STDIN open: 'False'
[2026-04-11 02:45:58Z INFO ProcessInvokerWrapper]   High priority process: 'False'
[2026-04-11 02:45:58Z INFO ProcessInvokerWrapper] Process started with process id 7700, waiting for process exit.
[2026-04-11 02:45:58Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 02:45:58Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 02:45:58Z INFO ProcessInvokerWrapper] Finished process 7700 with exit code 0, and elapsed time 00:00:00.0354728.
[2026-04-11 02:45:58Z INFO StepsRunner] Successfully returned to code page 65001 (UTF8)
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-11 02:45:58Z INFO ActionManager] Load action that reference repository from 'C:\actions-runner\_work\_actions\actions\checkout\v4'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-11 02:45:58Z INFO ActionManifestManagerLegacy] Loaded action.yml file: {
  "name": "Checkout",
  "description": "Checkout a Git repository at a particular version",
  "inputs": {
    "type": 2,
    "map": [
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 4,
          "col": 3,
          "lit": "repository"
        },
        "value": {
          "type": 3,
          "file": 2,
          "line": 6,
          "col": 14,
          "expr": "github.repository"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 7,
          "col": 3,
          "lit": "ref"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 12,
          "col": 3,
          "lit": "token"
        },
        "value": {
          "type": 3,
          "file": 2,
          "line": 24,
          "col": 14,
          "expr": "github.token"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 25,
          "col": 3,
          "lit": "ssh-key"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 37,
          "col": 3,
          "lit": "ssh-known-hosts"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 42,
          "col": 3,
          "lit": "ssh-strict"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 47,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 48,
          "col": 3,
          "lit": "ssh-user"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 51,
          "col": 14,
          "lit": "git"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 52,
          "col": 3,
          "lit": "persist-credentials"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 54,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 55,
          "col": 3,
          "lit": "path"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 57,
          "col": 3,
          "lit": "clean"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 59,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 60,
          "col": 3,
          "lit": "filter"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 64,
          "col": 14,
          "lit": ""
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 65,
          "col": 3,
          "lit": "sparse-checkout"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 69,
          "col": 14,
          "lit": ""
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 70,
          "col": 3,
          "lit": "sparse-checkout-cone-mode"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 73,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 74,
          "col": 3,
          "lit": "fetch-depth"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 76,
          "col": 14,
          "lit": "1"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 77,
          "col": 3,
          "lit": "fetch-tags"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 79,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 80,
          "col": 3,
          "lit": "show-progress"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 82,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 83,
          "col": 3,
          "lit": "lfs"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 85,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 86,
          "col": 3,
          "lit": "submodules"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 94,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 95,
          "col": 3,
          "lit": "set-safe-directory"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 97,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 98,
          "col": 3,
          "lit": "github-server-url"
        },
        "value": ""
      }
    ]
  },
  "execution": {
    "executionType": "nodeJS",
    "hasPre": false,
    "hasPost": true,
    "script": "dist/index.js",
    "pre": null,
    "post": "dist/index.js",
    "nodeVersion": "node20",
    "cleanupCondition": "always()",
    "initCondition": "always()"
  },
  "deprecated": null
}
[2026-04-11 02:45:58Z INFO ActionManager] Action pre node.js file: N/A.
[2026-04-11 02:45:58Z INFO ActionManager] Action node.js file: dist/index.js.
[2026-04-11 02:45:58Z INFO ActionManager] Action post node.js file: dist/index.js.
[2026-04-11 02:45:58Z INFO ExecutionContext] Reserve record order 7 to 12 for post job actions.
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-11 02:45:58Z INFO ExecutionContext] Write event payload to C:\actions-runner\_work\_temp\_github_workflow\event.json
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-11 02:45:58Z INFO ExtensionManager] Getting extensions for interface: 'GitHub.Runner.Worker.IFileCommandExtension'
[2026-04-11 02:45:58Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.AddPathFileCommand, Runner.Worker
[2026-04-11 02:45:58Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.SetEnvFileCommand, Runner.Worker
[2026-04-11 02:45:58Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.CreateStepSummaryCommand, Runner.Worker
[2026-04-11 02:45:58Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.SaveStateFileCommand, Runner.Worker
[2026-04-11 02:45:58Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.SetOutputFileCommand, Runner.Worker
[2026-04-11 02:45:58Z INFO ActionManifestManagerLegacy] Input 'repository': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 6,
  "col": 14,
  "lit": "FPXszk/Oh-MY-TradingView"
}
[2026-04-11 02:45:58Z INFO ActionManifestManagerLegacy] Input 'ref': default value evaluate result: ""
[2026-04-11 02:45:58Z INFO ActionManifestManagerLegacy] Input 'token': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 24,
  "col": 14,
  "lit": "***"
}
[2026-04-11 02:45:58Z INFO ActionManifestManagerLegacy] Input 'ssh-key': default value evaluate result: ""
[2026-04-11 02:45:58Z INFO ActionManifestManagerLegacy] Input 'ssh-known-hosts': default value evaluate result: ""
[2026-04-11 02:45:58Z INFO ActionManifestManagerLegacy] Input 'ssh-strict': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 47,
  "col": 14,
  "lit": "true"
}
[2026-04-11 02:45:58Z INFO ActionManifestManagerLegacy] Input 'ssh-user': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 51,
  "col": 14,
  "lit": "git"
}
[2026-04-11 02:45:58Z INFO ActionManifestManagerLegacy] Input 'persist-credentials': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 54,
  "col": 14,
  "lit": "true"
}
[2026-04-11 02:45:58Z INFO ActionManifestManagerLegacy] Input 'path': default value evaluate result: ""
[2026-04-11 02:45:58Z INFO ActionManifestManagerLegacy] Input 'filter': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 64,
  "col": 14,
  "lit": ""
}
[2026-04-11 02:45:58Z INFO ActionManifestManagerLegacy] Input 'sparse-checkout': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 69,
  "col": 14,
  "lit": ""
}
[2026-04-11 02:45:58Z INFO ActionManifestManagerLegacy] Input 'sparse-checkout-cone-mode': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 73,
  "col": 14,
  "lit": "true"
}
[2026-04-11 02:45:58Z INFO ActionManifestManagerLegacy] Input 'fetch-depth': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 76,
  "col": 14,
  "lit": "1"
}
[2026-04-11 02:45:58Z INFO ActionManifestManagerLegacy] Input 'fetch-tags': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 79,
  "col": 14,
  "lit": "false"
}
[2026-04-11 02:45:58Z INFO ActionManifestManagerLegacy] Input 'show-progress': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 82,
  "col": 14,
  "lit": "true"
}
[2026-04-11 02:45:58Z INFO ActionManifestManagerLegacy] Input 'lfs': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 85,
  "col": 14,
  "lit": "false"
}
[2026-04-11 02:45:58Z INFO ActionManifestManagerLegacy] Input 'submodules': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 94,
  "col": 14,
  "lit": "false"
}
[2026-04-11 02:45:58Z INFO ActionManifestManagerLegacy] Input 'set-safe-directory': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 97,
  "col": 14,
  "lit": "true"
}
[2026-04-11 02:45:58Z INFO ActionManifestManagerLegacy] Input 'github-server-url': default value evaluate result: ""
[2026-04-11 02:45:58Z INFO ExtensionManager] Getting extensions for interface: 'GitHub.Runner.Worker.IActionCommandExtension'
[2026-04-11 02:45:58Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.InternalPluginSetRepoPathCommandExtension, Runner.Worker
[2026-04-11 02:45:58Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.SetEnvCommandExtension, Runner.Worker
[2026-04-11 02:45:58Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.SetOutputCommandExtension, Runner.Worker
[2026-04-11 02:45:58Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.SaveStateCommandExtension, Runner.Worker
[2026-04-11 02:45:58Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.AddPathCommandExtension, Runner.Worker
[2026-04-11 02:45:58Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.AddMaskCommandExtension, Runner.Worker
[2026-04-11 02:45:58Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.AddMatcherCommandExtension, Runner.Worker
[2026-04-11 02:45:58Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.RemoveMatcherCommandExtension, Runner.Worker
[2026-04-11 02:45:58Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.WarningCommandExtension, Runner.Worker
[2026-04-11 02:45:58Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.ErrorCommandExtension, Runner.Worker
[2026-04-11 02:45:58Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.NoticeCommandExtension, Runner.Worker
[2026-04-11 02:45:58Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.DebugCommandExtension, Runner.Worker
[2026-04-11 02:45:58Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.GroupCommandExtension, Runner.Worker
[2026-04-11 02:45:58Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.EndGroupCommandExtension, Runner.Worker
[2026-04-11 02:45:58Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.EchoCommandExtension, Runner.Worker
[2026-04-11 02:45:58Z INFO ActionCommandManager] Register action command extension for command internal-set-repo-path
[2026-04-11 02:45:58Z INFO ActionCommandManager] Register action command extension for command set-env
[2026-04-11 02:45:58Z INFO ActionCommandManager] Register action command extension for command set-output
[2026-04-11 02:45:58Z INFO ActionCommandManager] Register action command extension for command save-state
[2026-04-11 02:45:58Z INFO ActionCommandManager] Register action command extension for command add-path
[2026-04-11 02:45:58Z INFO ActionCommandManager] Register action command extension for command add-mask
[2026-04-11 02:45:58Z INFO ActionCommandManager] Register action command extension for command add-matcher
[2026-04-11 02:45:58Z INFO ActionCommandManager] Register action command extension for command remove-matcher
[2026-04-11 02:45:58Z INFO ActionCommandManager] Register action command extension for command warning
[2026-04-11 02:45:58Z INFO ActionCommandManager] Register action command extension for command error
[2026-04-11 02:45:58Z INFO ActionCommandManager] Register action command extension for command notice
[2026-04-11 02:45:58Z INFO ActionCommandManager] Register action command extension for command debug
[2026-04-11 02:45:58Z INFO ActionCommandManager] Register action command extension for command group
[2026-04-11 02:45:58Z INFO ActionCommandManager] Register action command extension for command endgroup
[2026-04-11 02:45:58Z INFO ActionCommandManager] Register action command extension for command echo
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:45:58Z INFO HostContext] Well known directory 'Externals': 'C:\actions-runner\externals'
[2026-04-11 02:45:58Z INFO ProcessInvokerWrapper] Starting process:
[2026-04-11 02:45:58Z INFO ProcessInvokerWrapper]   File name: 'C:\actions-runner\externals\node20\bin\node.exe'
[2026-04-11 02:45:58Z INFO ProcessInvokerWrapper]   Arguments: '"C:\actions-runner\_work\_actions\actions\checkout\v4\dist/index.js"'
[2026-04-11 02:45:58Z INFO ProcessInvokerWrapper]   Working directory: 'C:\actions-runner\_work\Oh-MY-TradingView\Oh-MY-TradingView'
[2026-04-11 02:45:58Z INFO ProcessInvokerWrapper]   Require exit code zero: 'False'
[2026-04-11 02:45:58Z INFO ProcessInvokerWrapper]   Encoding web name: utf-8 ; code page: '65001'
[2026-04-11 02:45:58Z INFO ProcessInvokerWrapper]   Force kill process on cancellation: 'False'
[2026-04-11 02:45:58Z INFO ProcessInvokerWrapper]   Redirected STDIN: 'False'
[2026-04-11 02:45:58Z INFO ProcessInvokerWrapper]   Persist current code page: 'True'
[2026-04-11 02:45:58Z INFO ProcessInvokerWrapper]   Keep redirected STDIN open: 'False'
[2026-04-11 02:45:58Z INFO ProcessInvokerWrapper]   High priority process: 'False'
[2026-04-11 02:45:58Z INFO JobServerQueue] Try to append 1 batches web console lines for record '5f56933f-59fb-4783-8b93-32ee57060c8e', success rate: 1/1.
[2026-04-11 02:45:58Z INFO ProcessInvokerWrapper] Process started with process id 26800, waiting for process exit.
[2026-04-11 02:45:58Z INFO JobServerQueue] Try to append 1 batches web console lines for record '4ab064ef-03dc-4e11-9aab-e9dfe9508434', success rate: 1/1.
[2026-04-11 02:45:58Z INFO JobServerQueue] Got a step log file to send to results service.
[2026-04-11 02:45:58Z INFO JobServerQueue] Starting upload of step log file to results service ResultsLog, C:\actions-runner\_diag\blocks\b3c8b52a-415f-4b1a-a07f-589986b6f2e0_5f56933f-59fb-4783-8b93-32ee57060c8e.1
[2026-04-11 02:45:58Z INFO JobServerQueue] Try to upload 1 log files or attachments, success rate: 1/1.
[2026-04-11 02:45:58Z INFO AddMaskCommandExtension] Add new secret mask with length of 76
[2026-04-11 02:45:58Z INFO JobServerQueue] Try to append 1 batches web console lines for record '4ab064ef-03dc-4e11-9aab-e9dfe9508434', success rate: 1/1.
[2026-04-11 02:45:58Z INFO JobServerQueue] Try to append 1 batches web console lines for record '4ab064ef-03dc-4e11-9aab-e9dfe9508434', success rate: 1/1.
[2026-04-11 02:45:59Z INFO JobServerQueue] Try to append 1 batches web console lines for record '4ab064ef-03dc-4e11-9aab-e9dfe9508434', success rate: 1/1.
[2026-04-11 02:45:59Z INFO JobServerQueue] Tried to upload 1 file(s) to results, success rate: 1/1.
[2026-04-11 02:45:59Z INFO JobServerQueue] Try to append 1 batches web console lines for record '4ab064ef-03dc-4e11-9aab-e9dfe9508434', success rate: 1/1.
[2026-04-11 02:46:00Z INFO JobServerQueue] Try to append 1 batches web console lines for record '4ab064ef-03dc-4e11-9aab-e9dfe9508434', success rate: 1/1.
[2026-04-11 02:46:01Z INFO JobServerQueue] Try to append 1 batches web console lines for record '4ab064ef-03dc-4e11-9aab-e9dfe9508434', success rate: 1/1.
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper] Finished process 26800 with exit code 0, and elapsed time 00:00:03.8939202.
[2026-04-11 02:46:02Z INFO CreateStepSummaryCommand] Step Summary file (C:\actions-runner\_work\_temp\_runner_file_commands\step_summary_15d40059-399b-4ef0-959b-763ce5f870d3) is empty; skipping attachment upload
[2026-04-11 02:46:02Z INFO StepsRunner] Step result:
[2026-04-11 02:46:02Z INFO ExecutionContext] Publish step telemetry for current step {
  "action": "actions/checkout",
  "ref": "v4",
  "type": "node20",
  "stage": "Main",
  "stepId": "4ab064ef-03dc-4e11-9aab-e9dfe9508434",
  "stepContextName": "__actions_checkout",
  "hasPreStep": false,
  "hasPostStep": true,
  "result": "succeeded",
  "errorMessages": [],
  "executionTimeInSeconds": 4,
  "startTime": "2026-04-11T02:45:58.1523795Z",
  "finishTime": "2026-04-11T02:46:02.137316Z"
}.
[2026-04-11 02:46:02Z INFO StepsRunner] No need for updating job result with current step result 'Succeeded'.
[2026-04-11 02:46:02Z INFO StepsRunner] Current state: job state = ''
[2026-04-11 02:46:02Z INFO StepsRunner] Processing step: DisplayName='Evaluate schedule freshness'
[2026-04-11 02:46:02Z INFO StepsRunner] Evaluating: success()
[2026-04-11 02:46:02Z INFO StepsRunner] Result: true
[2026-04-11 02:46:02Z INFO StepsRunner] Starting the step.
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:46:02Z INFO StepsRunner] Which2: 'chcp'
[2026-04-11 02:46:02Z INFO StepsRunner] Location: 'C:\Windows\system32\chcp.COM'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper] Starting process:
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   File name: 'C:\Windows\system32\chcp.COM'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Arguments: '65001'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Working directory: 'C:\actions-runner\_work'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Require exit code zero: 'False'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Encoding web name:  ; code page: ''
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Force kill process on cancellation: 'False'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Redirected STDIN: 'False'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Persist current code page: 'True'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Keep redirected STDIN open: 'False'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   High priority process: 'False'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper] Process started with process id 23676, waiting for process exit.
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper] Finished process 23676 with exit code 0, and elapsed time 00:00:00.0059194.
[2026-04-11 02:46:02Z INFO StepsRunner] Successfully returned to code page 65001 (UTF8)
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-11 02:46:02Z INFO ExecutionContext] Write event payload to C:\actions-runner\_work\_temp\_github_workflow\event.json
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-11 02:46:02Z INFO ExtensionManager] Getting extensions for interface: 'GitHub.Runner.Worker.IFileCommandExtension'
[2026-04-11 02:46:02Z INFO ExtensionManager] Getting extensions for interface: 'GitHub.Runner.Worker.IActionCommandExtension'
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command internal-set-repo-path
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command set-env
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command set-output
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command save-state
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command add-path
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command add-mask
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command add-matcher
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command remove-matcher
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command warning
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command error
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command notice
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command debug
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command group
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command endgroup
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command echo
[2026-04-11 02:46:02Z INFO ScriptHandler] Which2: 'powershell'
[2026-04-11 02:46:02Z INFO ScriptHandler] Location: 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.EXE'
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-11 02:46:02Z INFO ScriptHandler] Which2: 'powershell'
[2026-04-11 02:46:02Z INFO ScriptHandler] Location: 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.EXE'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper] Starting process:
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   File name: 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.EXE'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Arguments: '-NoProfile -ExecutionPolicy Bypass -command ". 'C:\actions-runner\_work\_temp\5453af44-f1d7-4130-bf87-44b09d7ad372.ps1'"'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Working directory: 'C:\actions-runner\_work\Oh-MY-TradingView\Oh-MY-TradingView'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Require exit code zero: 'False'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Encoding web name:  ; code page: ''
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Force kill process on cancellation: 'False'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Redirected STDIN: 'False'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Persist current code page: 'True'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Keep redirected STDIN open: 'False'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   High priority process: 'False'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper] Process started with process id 25784, waiting for process exit.
[2026-04-11 02:46:02Z INFO JobServerQueue] Try to append 1 batches web console lines for record '4ab064ef-03dc-4e11-9aab-e9dfe9508434', success rate: 1/1.
[2026-04-11 02:46:02Z INFO JobServerQueue] Try to append 1 batches web console lines for record '97871dd8-23a5-4065-af8e-3e57a1b536a2', success rate: 1/1.
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper] Finished process 25784 with exit code 0, and elapsed time 00:00:00.2351170.
[2026-04-11 02:46:02Z INFO CreateStepSummaryCommand] Step Summary file (C:\actions-runner\_work\_temp\_runner_file_commands\step_summary_488e1d2b-9d22-44a0-9767-ed5f48b0c653) is empty; skipping attachment upload
[2026-04-11 02:46:02Z INFO StepsRunner] Step result:
[2026-04-11 02:46:02Z INFO ExecutionContext] Publish step telemetry for current step {
  "action": "powershell",
  "type": "run",
  "stage": "Main",
  "stepId": "97871dd8-23a5-4065-af8e-3e57a1b536a2",
  "stepContextName": "freshness",
  "result": "succeeded",
  "errorMessages": [],
  "executionTimeInSeconds": 1,
  "startTime": "2026-04-11T02:46:02.138002Z",
  "finishTime": "2026-04-11T02:46:02.3959435Z"
}.
[2026-04-11 02:46:02Z INFO StepsRunner] No need for updating job result with current step result 'Succeeded'.
[2026-04-11 02:46:02Z INFO StepsRunner] Current state: job state = ''
[2026-04-11 02:46:02Z INFO StepsRunner] Processing step: DisplayName='Install dependencies in WSL workspace'
[2026-04-11 02:46:02Z INFO StepsRunner] Evaluating: (success() && (steps.freshness.outputs.should_run == 'true'))
[2026-04-11 02:46:02Z INFO StepsRunner] Expanded: (true && ('true' == 'true'))
[2026-04-11 02:46:02Z INFO StepsRunner] Result: true
[2026-04-11 02:46:02Z INFO StepsRunner] Starting the step.
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:46:02Z INFO StepsRunner] Which2: 'chcp'
[2026-04-11 02:46:02Z INFO StepsRunner] Location: 'C:\Windows\system32\chcp.COM'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper] Starting process:
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   File name: 'C:\Windows\system32\chcp.COM'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Arguments: '65001'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Working directory: 'C:\actions-runner\_work'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Require exit code zero: 'False'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Encoding web name:  ; code page: ''
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Force kill process on cancellation: 'False'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Redirected STDIN: 'False'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Persist current code page: 'True'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Keep redirected STDIN open: 'False'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   High priority process: 'False'
[2026-04-11 02:46:02Z INFO JobServerQueue] Got a step log file to send to results service.
[2026-04-11 02:46:02Z INFO JobServerQueue] Starting upload of step log file to results service ResultsLog, C:\actions-runner\_diag\blocks\b3c8b52a-415f-4b1a-a07f-589986b6f2e0_4ab064ef-03dc-4e11-9aab-e9dfe9508434.1
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper] Process started with process id 26788, waiting for process exit.
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper] Finished process 26788 with exit code 0, and elapsed time 00:00:00.0059014.
[2026-04-11 02:46:02Z INFO StepsRunner] Successfully returned to code page 65001 (UTF8)
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-11 02:46:02Z INFO ExecutionContext] Write event payload to C:\actions-runner\_work\_temp\_github_workflow\event.json
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-11 02:46:02Z INFO ExtensionManager] Getting extensions for interface: 'GitHub.Runner.Worker.IFileCommandExtension'
[2026-04-11 02:46:02Z INFO ExtensionManager] Getting extensions for interface: 'GitHub.Runner.Worker.IActionCommandExtension'
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command internal-set-repo-path
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command set-env
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command set-output
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command save-state
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command add-path
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command add-mask
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command add-matcher
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command remove-matcher
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command warning
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command error
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command notice
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command debug
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command group
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command endgroup
[2026-04-11 02:46:02Z INFO ActionCommandManager] Register action command extension for command echo
[2026-04-11 02:46:02Z INFO ScriptHandler] Which2: 'cmd'
[2026-04-11 02:46:02Z INFO ScriptHandler] Location: 'C:\Windows\system32\cmd.EXE'
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:46:02Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-11 02:46:02Z INFO ScriptHandler] Which2: 'cmd'
[2026-04-11 02:46:02Z INFO ScriptHandler] Location: 'C:\Windows\system32\cmd.EXE'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper] Starting process:
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   File name: 'C:\Windows\system32\cmd.EXE'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Arguments: '/D /E:ON /V:OFF /S /C "CALL "C:\actions-runner\_work\_temp\450803f5-bcb5-4fee-9abd-2b8bd8b0dc05.cmd""'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Working directory: 'C:\actions-runner\_work\Oh-MY-TradingView\Oh-MY-TradingView'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Require exit code zero: 'False'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Encoding web name:  ; code page: ''
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Force kill process on cancellation: 'False'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Redirected STDIN: 'False'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Persist current code page: 'True'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   Keep redirected STDIN open: 'False'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper]   High priority process: 'False'
[2026-04-11 02:46:02Z INFO ProcessInvokerWrapper] Process started with process id 18476, waiting for process exit.
[2026-04-11 02:46:02Z INFO JobServerQueue] Try to append 1 batches web console lines for record '580dea02-81bb-459f-bad9-6910a4b95a3b', success rate: 1/1.
[2026-04-11 02:46:02Z INFO JobServerQueue] Try to upload 2 log files or attachments, success rate: 2/2.
[2026-04-11 02:46:02Z INFO JobServerQueue] Got a step log file to send to results service.
[2026-04-11 02:46:02Z INFO JobServerQueue] Starting upload of step log file to results service ResultsLog, C:\actions-runner\_diag\blocks\b3c8b52a-415f-4b1a-a07f-589986b6f2e0_97871dd8-23a5-4065-af8e-3e57a1b536a2.1
[2026-04-11 02:46:03Z INFO JobServerQueue] Tried to upload 2 file(s) to results, success rate: 2/2.
[2026-04-11 02:46:08Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:46:08Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:46:08Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper] Finished process 18476 with exit code 0, and elapsed time 00:00:12.2048972.
[2026-04-11 02:46:14Z INFO CreateStepSummaryCommand] Step Summary file (C:\actions-runner\_work\_temp\_runner_file_commands\step_summary_4a8d0895-9cdf-4a41-ad95-24313af7f4da) is empty; skipping attachment upload
[2026-04-11 02:46:14Z INFO StepsRunner] Step result:
[2026-04-11 02:46:14Z INFO ExecutionContext] Publish step telemetry for current step {
  "action": "cmd",
  "type": "run",
  "stage": "Main",
  "stepId": "580dea02-81bb-459f-bad9-6910a4b95a3b",
  "stepContextName": "__run",
  "result": "succeeded",
  "errorMessages": [],
  "executionTimeInSeconds": 13,
  "startTime": "2026-04-11T02:46:02.3967333Z",
  "finishTime": "2026-04-11T02:46:14.6139956Z"
}.
[2026-04-11 02:46:14Z INFO StepsRunner] No need for updating job result with current step result 'Succeeded'.
[2026-04-11 02:46:14Z INFO StepsRunner] Current state: job state = ''
[2026-04-11 02:46:14Z INFO StepsRunner] Processing step: DisplayName='Start smoke gate and detached production'
[2026-04-11 02:46:14Z INFO StepsRunner] Evaluating: (success() && (steps.freshness.outputs.should_run == 'true'))
[2026-04-11 02:46:14Z INFO StepsRunner] Expanded: (true && ('true' == 'true'))
[2026-04-11 02:46:14Z INFO StepsRunner] Result: true
[2026-04-11 02:46:14Z INFO StepsRunner] Starting the step.
[2026-04-11 02:46:14Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:46:14Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:46:14Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:46:14Z INFO StepsRunner] Which2: 'chcp'
[2026-04-11 02:46:14Z INFO StepsRunner] Location: 'C:\Windows\system32\chcp.COM'
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper] Starting process:
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper]   File name: 'C:\Windows\system32\chcp.COM'
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper]   Arguments: '65001'
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper]   Working directory: 'C:\actions-runner\_work'
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper]   Require exit code zero: 'False'
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper]   Encoding web name:  ; code page: ''
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper]   Force kill process on cancellation: 'False'
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper]   Redirected STDIN: 'False'
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper]   Persist current code page: 'True'
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper]   Keep redirected STDIN open: 'False'
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper]   High priority process: 'False'
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper] Process started with process id 22088, waiting for process exit.
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper] Finished process 22088 with exit code 0, and elapsed time 00:00:00.0066637.
[2026-04-11 02:46:14Z INFO StepsRunner] Successfully returned to code page 65001 (UTF8)
[2026-04-11 02:46:14Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:46:14Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:46:14Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:46:14Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-11 02:46:14Z INFO ExecutionContext] Write event payload to C:\actions-runner\_work\_temp\_github_workflow\event.json
[2026-04-11 02:46:14Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:46:14Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:46:14Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:46:14Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-11 02:46:14Z INFO ExtensionManager] Getting extensions for interface: 'GitHub.Runner.Worker.IFileCommandExtension'
[2026-04-11 02:46:14Z INFO ExtensionManager] Getting extensions for interface: 'GitHub.Runner.Worker.IActionCommandExtension'
[2026-04-11 02:46:14Z INFO ActionCommandManager] Register action command extension for command internal-set-repo-path
[2026-04-11 02:46:14Z INFO ActionCommandManager] Register action command extension for command set-env
[2026-04-11 02:46:14Z INFO ActionCommandManager] Register action command extension for command set-output
[2026-04-11 02:46:14Z INFO ActionCommandManager] Register action command extension for command save-state
[2026-04-11 02:46:14Z INFO ActionCommandManager] Register action command extension for command add-path
[2026-04-11 02:46:14Z INFO ActionCommandManager] Register action command extension for command add-mask
[2026-04-11 02:46:14Z INFO ActionCommandManager] Register action command extension for command add-matcher
[2026-04-11 02:46:14Z INFO ActionCommandManager] Register action command extension for command remove-matcher
[2026-04-11 02:46:14Z INFO ActionCommandManager] Register action command extension for command warning
[2026-04-11 02:46:14Z INFO ActionCommandManager] Register action command extension for command error
[2026-04-11 02:46:14Z INFO ActionCommandManager] Register action command extension for command notice
[2026-04-11 02:46:14Z INFO ActionCommandManager] Register action command extension for command debug
[2026-04-11 02:46:14Z INFO ActionCommandManager] Register action command extension for command group
[2026-04-11 02:46:14Z INFO ActionCommandManager] Register action command extension for command endgroup
[2026-04-11 02:46:14Z INFO ActionCommandManager] Register action command extension for command echo
[2026-04-11 02:46:14Z INFO ScriptHandler] Which2: 'cmd'
[2026-04-11 02:46:14Z INFO ScriptHandler] Location: 'C:\Windows\system32\cmd.EXE'
[2026-04-11 02:46:14Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:46:14Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:46:14Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:46:14Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-11 02:46:14Z INFO ScriptHandler] Which2: 'cmd'
[2026-04-11 02:46:14Z INFO ScriptHandler] Location: 'C:\Windows\system32\cmd.EXE'
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper] Starting process:
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper]   File name: 'C:\Windows\system32\cmd.EXE'
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper]   Arguments: '/D /E:ON /V:OFF /S /C "CALL "C:\actions-runner\_work\_temp\e0f3ccdf-1491-48f4-aff1-42acb7b1691b.cmd""'
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper]   Working directory: 'C:\actions-runner\_work\Oh-MY-TradingView\Oh-MY-TradingView'
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper]   Require exit code zero: 'False'
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper]   Encoding web name:  ; code page: ''
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper]   Force kill process on cancellation: 'False'
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper]   Redirected STDIN: 'False'
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper]   Persist current code page: 'True'
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper]   Keep redirected STDIN open: 'False'
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper]   High priority process: 'False'
[2026-04-11 02:46:14Z INFO ProcessInvokerWrapper] Process started with process id 26716, waiting for process exit.
[2026-04-11 02:46:14Z INFO JobServerQueue] Got a step log file to send to results service.
[2026-04-11 02:46:14Z INFO JobServerQueue] Starting upload of step log file to results service ResultsLog, C:\actions-runner\_diag\blocks\b3c8b52a-415f-4b1a-a07f-589986b6f2e0_580dea02-81bb-459f-bad9-6910a4b95a3b.1
[2026-04-11 02:46:14Z INFO JobServerQueue] Try to append 1 batches web console lines for record '7b54e584-9807-4a49-908c-2da88b936f12', success rate: 1/1.
[2026-04-11 02:46:15Z INFO JobServerQueue] Tried to upload 1 file(s) to results, success rate: 1/1.
[2026-04-11 02:46:15Z INFO JobServerQueue] Try to append 1 batches web console lines for record '7b54e584-9807-4a49-908c-2da88b936f12', success rate: 1/1.
[2026-04-11 02:46:15Z INFO JobServerQueue] Try to upload 1 log files or attachments, success rate: 1/1.
[2026-04-11 02:46:17Z INFO JobServerQueue] Try to append 1 batches web console lines for record '7b54e584-9807-4a49-908c-2da88b936f12', success rate: 1/1.
[2026-04-11 02:46:18Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:46:18Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:46:18Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:46:18Z INFO JobServerQueue] Try to append 1 batches web console lines for record '7b54e584-9807-4a49-908c-2da88b936f12', success rate: 1/1.
[2026-04-11 02:46:28Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:46:28Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:46:28Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:46:38Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:46:38Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:46:38Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:46:48Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:46:48Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:46:48Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:46:58Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:46:58Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:46:58Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:46:59Z INFO JobServerQueue] Stop aggressive process web console line queue.
[2026-04-11 02:47:08Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:47:08Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:47:08Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:47:18Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:47:18Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:47:18Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:47:28Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:47:28Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:47:28Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:47:38Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:47:38Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:47:38Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:47:48Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:47:48Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:47:48Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:47:58Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:47:58Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:47:58Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:48:08Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:48:08Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:48:08Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:48:09Z INFO JobServerQueue] Try to append 1 batches web console lines for record '7b54e584-9807-4a49-908c-2da88b936f12', success rate: 1/1.
[2026-04-11 02:48:18Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:48:18Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:48:18Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:48:20Z INFO JobServerQueue] Try to append 1 batches web console lines for record '7b54e584-9807-4a49-908c-2da88b936f12', success rate: 1/1.
[2026-04-11 02:48:21Z INFO JobServerQueue] Try to append 1 batches web console lines for record '7b54e584-9807-4a49-908c-2da88b936f12', success rate: 1/1.
[2026-04-11 02:48:28Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:48:28Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:48:28Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:48:38Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:48:38Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:48:38Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:48:48Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:48:48Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:48:48Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:48:58Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:48:58Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:48:58Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:49:08Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:49:08Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:49:08Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:49:18Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:49:18Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:49:18Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:49:28Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:49:28Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:49:28Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:49:38Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:49:38Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:49:38Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:49:48Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:49:48Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:49:48Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:49:58Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:49:58Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:49:58Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:50:08Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:50:08Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:50:08Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:50:15Z INFO JobServerQueue] Try to append 1 batches web console lines for record '7b54e584-9807-4a49-908c-2da88b936f12', success rate: 1/1.
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper] Finished process 26716 with exit code 0, and elapsed time 00:04:02.2250687.
[2026-04-11 02:50:16Z INFO CreateStepSummaryCommand] Step Summary file (C:\actions-runner\_work\_temp\_runner_file_commands\step_summary_b7421e32-4c4d-4b55-82aa-6fdd3e20140f) is empty; skipping attachment upload
[2026-04-11 02:50:16Z INFO StepsRunner] Step result:
[2026-04-11 02:50:16Z INFO ExecutionContext] Publish step telemetry for current step {
  "action": "cmd",
  "type": "run",
  "stage": "Main",
  "stepId": "7b54e584-9807-4a49-908c-2da88b936f12",
  "stepContextName": "__run_2",
  "result": "succeeded",
  "errorMessages": [],
  "executionTimeInSeconds": 243,
  "startTime": "2026-04-11T02:46:14.6146192Z",
  "finishTime": "2026-04-11T02:50:16.8550074Z"
}.
[2026-04-11 02:50:16Z INFO StepsRunner] No need for updating job result with current step result 'Succeeded'.
[2026-04-11 02:50:16Z INFO StepsRunner] Current state: job state = ''
[2026-04-11 02:50:16Z INFO StepsRunner] Processing step: DisplayName='Report skipped stale schedule'
[2026-04-11 02:50:16Z INFO StepsRunner] Evaluating: (success() && (steps.freshness.outputs.should_run != 'true'))
[2026-04-11 02:50:16Z INFO StepsRunner] Expanded: (true && ('true' != 'true'))
[2026-04-11 02:50:16Z INFO StepsRunner] Result: false
[2026-04-11 02:50:16Z INFO StepsRunner] Skipping step due to condition evaluation.
[2026-04-11 02:50:16Z INFO StepsRunner] No need for updating job result with current step result 'Skipped'.
[2026-04-11 02:50:16Z INFO StepsRunner] Current state: job state = ''
[2026-04-11 02:50:16Z INFO StepsRunner] Processing step: DisplayName='Post Run actions/checkout@v4'
[2026-04-11 02:50:16Z INFO StepsRunner] Evaluating: always()
[2026-04-11 02:50:16Z INFO StepsRunner] Result: true
[2026-04-11 02:50:16Z INFO StepsRunner] Starting the step.
[2026-04-11 02:50:16Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:50:16Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:50:16Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:50:16Z INFO StepsRunner] Which2: 'chcp'
[2026-04-11 02:50:16Z INFO StepsRunner] Location: 'C:\Windows\system32\chcp.COM'
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper] Starting process:
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper]   File name: 'C:\Windows\system32\chcp.COM'
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper]   Arguments: '65001'
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper]   Working directory: 'C:\actions-runner\_work'
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper]   Require exit code zero: 'False'
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper]   Encoding web name:  ; code page: ''
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper]   Force kill process on cancellation: 'False'
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper]   Redirected STDIN: 'False'
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper]   Persist current code page: 'True'
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper]   Keep redirected STDIN open: 'False'
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper]   High priority process: 'False'
[2026-04-11 02:50:16Z INFO JobServerQueue] Try to upload 1 log files or attachments, success rate: 1/1.
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper] Process started with process id 26768, waiting for process exit.
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper] Finished process 26768 with exit code 0, and elapsed time 00:00:00.0353063.
[2026-04-11 02:50:16Z INFO StepsRunner] Successfully returned to code page 65001 (UTF8)
[2026-04-11 02:50:16Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:50:16Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:50:16Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:50:16Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-11 02:50:16Z INFO ActionManager] Load action that reference repository from 'C:\actions-runner\_work\_actions\actions\checkout\v4'
[2026-04-11 02:50:16Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:50:16Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:50:16Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:50:16Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-11 02:50:16Z INFO ActionManifestManagerLegacy] Loaded action.yml file: {
  "name": "Checkout",
  "description": "Checkout a Git repository at a particular version",
  "inputs": {
    "type": 2,
    "map": [
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 4,
          "col": 3,
          "lit": "repository"
        },
        "value": {
          "type": 3,
          "file": 2,
          "line": 6,
          "col": 14,
          "expr": "github.repository"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 7,
          "col": 3,
          "lit": "ref"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 12,
          "col": 3,
          "lit": "token"
        },
        "value": {
          "type": 3,
          "file": 2,
          "line": 24,
          "col": 14,
          "expr": "github.token"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 25,
          "col": 3,
          "lit": "ssh-key"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 37,
          "col": 3,
          "lit": "ssh-known-hosts"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 42,
          "col": 3,
          "lit": "ssh-strict"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 47,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 48,
          "col": 3,
          "lit": "ssh-user"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 51,
          "col": 14,
          "lit": "git"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 52,
          "col": 3,
          "lit": "persist-credentials"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 54,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 55,
          "col": 3,
          "lit": "path"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 57,
          "col": 3,
          "lit": "clean"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 59,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 60,
          "col": 3,
          "lit": "filter"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 64,
          "col": 14,
          "lit": ""
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 65,
          "col": 3,
          "lit": "sparse-checkout"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 69,
          "col": 14,
          "lit": ""
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 70,
          "col": 3,
          "lit": "sparse-checkout-cone-mode"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 73,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 74,
          "col": 3,
          "lit": "fetch-depth"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 76,
          "col": 14,
          "lit": "1"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 77,
          "col": 3,
          "lit": "fetch-tags"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 79,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 80,
          "col": 3,
          "lit": "show-progress"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 82,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 83,
          "col": 3,
          "lit": "lfs"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 85,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 86,
          "col": 3,
          "lit": "submodules"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 94,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 95,
          "col": 3,
          "lit": "set-safe-directory"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 97,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 98,
          "col": 3,
          "lit": "github-server-url"
        },
        "value": ""
      }
    ]
  },
  "execution": {
    "executionType": "nodeJS",
    "hasPre": false,
    "hasPost": true,
    "script": "dist/index.js",
    "pre": null,
    "post": "dist/index.js",
    "nodeVersion": "node20",
    "cleanupCondition": "always()",
    "initCondition": "always()"
  },
  "deprecated": null
}
[2026-04-11 02:50:16Z INFO ActionManager] Action pre node.js file: N/A.
[2026-04-11 02:50:16Z INFO ActionManager] Action node.js file: dist/index.js.
[2026-04-11 02:50:16Z INFO ActionManager] Action post node.js file: dist/index.js.
[2026-04-11 02:50:16Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:50:16Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:50:16Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:50:16Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-11 02:50:16Z INFO ExecutionContext] Write event payload to C:\actions-runner\_work\_temp\_github_workflow\event.json
[2026-04-11 02:50:16Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:50:16Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:50:16Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:50:16Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-11 02:50:16Z INFO ExtensionManager] Getting extensions for interface: 'GitHub.Runner.Worker.IFileCommandExtension'
[2026-04-11 02:50:16Z INFO ActionManifestManagerLegacy] Input 'repository': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 6,
  "col": 14,
  "lit": "FPXszk/Oh-MY-TradingView"
}
[2026-04-11 02:50:16Z INFO ActionManifestManagerLegacy] Input 'ref': default value evaluate result: ""
[2026-04-11 02:50:16Z INFO ActionManifestManagerLegacy] Input 'token': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 24,
  "col": 14,
  "lit": "***"
}
[2026-04-11 02:50:16Z INFO ActionManifestManagerLegacy] Input 'ssh-key': default value evaluate result: ""
[2026-04-11 02:50:16Z INFO ActionManifestManagerLegacy] Input 'ssh-known-hosts': default value evaluate result: ""
[2026-04-11 02:50:16Z INFO ActionManifestManagerLegacy] Input 'ssh-strict': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 47,
  "col": 14,
  "lit": "true"
}
[2026-04-11 02:50:16Z INFO ActionManifestManagerLegacy] Input 'ssh-user': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 51,
  "col": 14,
  "lit": "git"
}
[2026-04-11 02:50:16Z INFO ActionManifestManagerLegacy] Input 'persist-credentials': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 54,
  "col": 14,
  "lit": "true"
}
[2026-04-11 02:50:16Z INFO ActionManifestManagerLegacy] Input 'path': default value evaluate result: ""
[2026-04-11 02:50:16Z INFO ActionManifestManagerLegacy] Input 'filter': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 64,
  "col": 14,
  "lit": ""
}
[2026-04-11 02:50:16Z INFO ActionManifestManagerLegacy] Input 'sparse-checkout': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 69,
  "col": 14,
  "lit": ""
}
[2026-04-11 02:50:16Z INFO ActionManifestManagerLegacy] Input 'sparse-checkout-cone-mode': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 73,
  "col": 14,
  "lit": "true"
}
[2026-04-11 02:50:16Z INFO ActionManifestManagerLegacy] Input 'fetch-depth': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 76,
  "col": 14,
  "lit": "1"
}
[2026-04-11 02:50:16Z INFO ActionManifestManagerLegacy] Input 'fetch-tags': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 79,
  "col": 14,
  "lit": "false"
}
[2026-04-11 02:50:16Z INFO ActionManifestManagerLegacy] Input 'show-progress': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 82,
  "col": 14,
  "lit": "true"
}
[2026-04-11 02:50:16Z INFO ActionManifestManagerLegacy] Input 'lfs': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 85,
  "col": 14,
  "lit": "false"
}
[2026-04-11 02:50:16Z INFO ActionManifestManagerLegacy] Input 'submodules': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 94,
  "col": 14,
  "lit": "false"
}
[2026-04-11 02:50:16Z INFO ActionManifestManagerLegacy] Input 'set-safe-directory': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 97,
  "col": 14,
  "lit": "true"
}
[2026-04-11 02:50:16Z INFO ActionManifestManagerLegacy] Input 'github-server-url': default value evaluate result: ""
[2026-04-11 02:50:16Z INFO ExtensionManager] Getting extensions for interface: 'GitHub.Runner.Worker.IActionCommandExtension'
[2026-04-11 02:50:16Z INFO ActionCommandManager] Register action command extension for command internal-set-repo-path
[2026-04-11 02:50:16Z INFO ActionCommandManager] Register action command extension for command set-env
[2026-04-11 02:50:16Z INFO ActionCommandManager] Register action command extension for command set-output
[2026-04-11 02:50:16Z INFO ActionCommandManager] Register action command extension for command save-state
[2026-04-11 02:50:16Z INFO ActionCommandManager] Register action command extension for command add-path
[2026-04-11 02:50:16Z INFO ActionCommandManager] Register action command extension for command add-mask
[2026-04-11 02:50:16Z INFO ActionCommandManager] Register action command extension for command add-matcher
[2026-04-11 02:50:16Z INFO ActionCommandManager] Register action command extension for command remove-matcher
[2026-04-11 02:50:16Z INFO ActionCommandManager] Register action command extension for command warning
[2026-04-11 02:50:16Z INFO ActionCommandManager] Register action command extension for command error
[2026-04-11 02:50:16Z INFO ActionCommandManager] Register action command extension for command notice
[2026-04-11 02:50:16Z INFO ActionCommandManager] Register action command extension for command debug
[2026-04-11 02:50:16Z INFO ActionCommandManager] Register action command extension for command group
[2026-04-11 02:50:16Z INFO ActionCommandManager] Register action command extension for command endgroup
[2026-04-11 02:50:16Z INFO ActionCommandManager] Register action command extension for command echo
[2026-04-11 02:50:16Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:50:16Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:50:16Z INFO HostContext] Well known directory 'Externals': 'C:\actions-runner\externals'
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper] Starting process:
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper]   File name: 'C:\actions-runner\externals\node20\bin\node.exe'
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper]   Arguments: '"C:\actions-runner\_work\_actions\actions\checkout\v4\dist/index.js"'
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper]   Working directory: 'C:\actions-runner\_work\Oh-MY-TradingView\Oh-MY-TradingView'
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper]   Require exit code zero: 'False'
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper]   Encoding web name: utf-8 ; code page: '65001'
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper]   Force kill process on cancellation: 'False'
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper]   Redirected STDIN: 'False'
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper]   Persist current code page: 'True'
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper]   Keep redirected STDIN open: 'False'
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper]   High priority process: 'False'
[2026-04-11 02:50:16Z INFO ProcessInvokerWrapper] Process started with process id 26636, waiting for process exit.
[2026-04-11 02:50:17Z INFO JobServerQueue] Try to append 1 batches web console lines for record '7b54e584-9807-4a49-908c-2da88b936f12', success rate: 1/1.
[2026-04-11 02:50:17Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'f27706f1-9c3c-4f92-8da1-ba5a9ab915bd', success rate: 1/1.
[2026-04-11 02:50:17Z INFO AddMaskCommandExtension] Add new secret mask with length of 32
[2026-04-11 02:50:17Z INFO JobServerQueue] Got a step log file to send to results service.
[2026-04-11 02:50:17Z INFO JobServerQueue] Starting upload of step log file to results service ResultsLog, C:\actions-runner\_diag\blocks\b3c8b52a-415f-4b1a-a07f-589986b6f2e0_7b54e584-9807-4a49-908c-2da88b936f12.1
[2026-04-11 02:50:17Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'f27706f1-9c3c-4f92-8da1-ba5a9ab915bd', success rate: 1/1.
[2026-04-11 02:50:18Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'f27706f1-9c3c-4f92-8da1-ba5a9ab915bd', success rate: 1/1.
[2026-04-11 02:50:18Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:50:18Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:50:18Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 02:50:18Z INFO JobServerQueue] Tried to upload 1 file(s) to results, success rate: 1/1.
[2026-04-11 02:50:18Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'f27706f1-9c3c-4f92-8da1-ba5a9ab915bd', success rate: 1/1.
[2026-04-11 02:50:18Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 02:50:18Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 02:50:18Z INFO ProcessInvokerWrapper] Finished process 26636 with exit code 0, and elapsed time 00:00:01.7402007.
[2026-04-11 02:50:18Z INFO CreateStepSummaryCommand] Step Summary file (C:\actions-runner\_work\_temp\_runner_file_commands\step_summary_4f53b514-3f6d-45c4-8671-46c82fd8399d) is empty; skipping attachment upload
[2026-04-11 02:50:18Z INFO StepsRunner] Step result:
[2026-04-11 02:50:18Z INFO ExecutionContext] Publish step telemetry for current step {
  "action": "actions/checkout",
  "ref": "v4",
  "type": "node20",
  "stage": "Post",
  "stepId": "f27706f1-9c3c-4f92-8da1-ba5a9ab915bd",
  "result": "succeeded",
  "errorMessages": [],
  "executionTimeInSeconds": 2,
  "startTime": "2026-04-11T02:50:16.8593602Z",
  "finishTime": "2026-04-11T02:50:18.6522247Z"
}.
[2026-04-11 02:50:18Z INFO StepsRunner] No need for updating job result with current step result 'Succeeded'.
[2026-04-11 02:50:18Z INFO StepsRunner] Current state: job state = ''
[2026-04-11 02:50:18Z INFO JobRunner] Finalize job.
[2026-04-11 02:50:18Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:50:18Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:50:18Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 02:50:18Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:50:18Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:50:18Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 02:50:18Z INFO JobExtension] Initialize Env context
[2026-04-11 02:50:18Z INFO JobExtension] Initialize steps context
[2026-04-11 02:50:18Z INFO JobExtension] Total accessible running process: 304.
[2026-04-11 02:50:18Z INFO JobExtension] Inspecting process environment variables. PID: 26652 (wslhost)
[2026-04-11 02:50:18Z INFO JobExtension] Inspecting process environment variables. PID: 26040 (conhost)
[2026-04-11 02:50:18Z INFO JobExtension] Inspecting process environment variables. PID: 6524 (msedge)
[2026-04-11 02:50:18Z INFO JobExtension] Inspecting process environment variables. PID: 19028 (msedge)
[2026-04-11 02:50:18Z INFO JobExtension] Inspecting process environment variables. PID: 5868 (svchost)
[2026-04-11 02:50:18Z INFO JobExtension] Inspecting process environment variables. PID: 26628 (chrome)
[2026-04-11 02:50:18Z INFO JobExtension] Inspecting process environment variables. PID: 17708 (chrome)
[2026-04-11 02:50:18Z INFO JobExtension] Inspecting process environment variables. PID: 27128 (chrome)
[2026-04-11 02:50:18Z INFO JobExtension] Wait for all connectivity checks to finish.
[2026-04-11 02:50:18Z INFO JobExtension] Connectivity check result: GitHub.Runner.Worker.JobExtension+CheckResult
[2026-04-11 02:50:18Z INFO JobExtension] Connectivity check result: GitHub.Runner.Worker.JobExtension+CheckResult
[2026-04-11 02:50:18Z INFO JobExtension] Connectivity check result: GitHub.Runner.Worker.JobExtension+CheckResult
[2026-04-11 02:50:18Z INFO ExecutionContext] Publish step telemetry for current step {
  "action": "complete_job",
  "type": "runner",
  "stage": "Post",
  "stepId": "d4bc2cc4-4e2e-4f2c-9276-7d4c91840c2e",
  "result": "succeeded",
  "errorMessages": [
    "Node.js 20 actions are deprecated. The following actions are running on Node.js 20 and may not work as expected: actions/checkout@v4. Actions will be forced to run with Node.js 24 by default starting June 2nd, 2026. Node.js 20 will be removed from the runn"
  ],
  "executionTimeInSeconds": 1,
  "startTime": "2026-04-11T02:50:18.6556845Z",
  "finishTime": "2026-04-11T02:50:18.699186Z"
}.
[2026-04-11 02:50:18Z INFO JobRunner] Job result after all job steps finish: Succeeded
[2026-04-11 02:50:18Z INFO JobRunner] Completing the job execution context.
[2026-04-11 02:50:18Z INFO JobRunner] Shutting down the job server queue.
[2026-04-11 02:50:18Z INFO JobServerQueue] Fire signal to shutdown all queues.
[2026-04-11 02:50:19Z INFO JobServerQueue] All queue process task stopped.
[2026-04-11 02:50:19Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'd4bc2cc4-4e2e-4f2c-9276-7d4c91840c2e', success rate: 1/1.
[2026-04-11 02:50:19Z INFO JobServerQueue] Web console line queue drained.
[2026-04-11 02:50:19Z INFO JobServerQueue] Uploading 3 files in one shot.
[2026-04-11 02:50:19Z INFO JobServerQueue] Try to upload 3 log files or attachments, success rate: 3/3.
[2026-04-11 02:50:19Z INFO JobServerQueue] File upload queue drained.
[2026-04-11 02:50:19Z INFO JobServerQueue] Starting results-based upload queue...
[2026-04-11 02:50:19Z INFO JobServerQueue] Uploading 3 file(s) in one shot through results service.
[2026-04-11 02:50:19Z INFO JobServerQueue] Got a step log file to send to results service.
[2026-04-11 02:50:19Z INFO JobServerQueue] Starting upload of step log file to results service ResultsLog, C:\actions-runner\_diag\blocks\b3c8b52a-415f-4b1a-a07f-589986b6f2e0_f27706f1-9c3c-4f92-8da1-ba5a9ab915bd.1
[2026-04-11 02:50:20Z INFO JobServerQueue] Got a step log file to send to results service.
[2026-04-11 02:50:20Z INFO JobServerQueue] Starting upload of step log file to results service ResultsLog, C:\actions-runner\_diag\blocks\b3c8b52a-415f-4b1a-a07f-589986b6f2e0_d4bc2cc4-4e2e-4f2c-9276-7d4c91840c2e.1
[2026-04-11 02:50:20Z INFO JobServerQueue] Got a job log file to send to results service.
[2026-04-11 02:50:20Z INFO JobServerQueue] Starting upload of job log file to results service ResultsLog, C:\actions-runner\_diag\blocks\b3c8b52a-415f-4b1a-a07f-589986b6f2e0_3ae07984-1f30-573b-b1d1-19e93f92a2b5.1
[2026-04-11 02:50:21Z INFO JobServerQueue] Tried to upload 3 file(s) to results, success rate: 3/3.
[2026-04-11 02:50:21Z INFO JobServerQueue] Results upload queue drained.
[2026-04-11 02:50:21Z INFO JobServerQueue] Timeline update queue drained.
[2026-04-11 02:50:21Z INFO JobServerQueue] Disposing job server ...
[2026-04-11 02:50:21Z INFO JobServerQueue] Disposing results server ...
[2026-04-11 02:50:21Z INFO JobServerQueue] All queue process tasks have been stopped, and all queues are drained.
[2026-04-11 02:50:21Z INFO TempDirectoryManager] Cleaning runner temp folder: C:\actions-runner\_work\_temp
[2026-04-11 02:50:21Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 02:50:21Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 02:50:21Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 02:50:21Z INFO HostContext] Well known config file 'Telemetry': 'C:\actions-runner\_diag\.telemetry'
[2026-04-11 02:50:21Z INFO JobRunner] Raising job completed against run service
[2026-04-11 02:50:22Z INFO Worker] Job completed.
[2026-04-11 14:43:46Z INFO HostContext] No proxy settings were found based on environmental variables (http_proxy/https_proxy/HTTP_PROXY/HTTPS_PROXY)
[2026-04-11 14:43:46Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:46Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:46Z INFO HostContext] Well known config file 'Credentials': 'C:\actions-runner\.credentials'
[2026-04-11 14:43:46Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:46Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:46Z INFO HostContext] Well known config file 'Runner': 'C:\actions-runner\.runner'
[2026-04-11 14:43:46Z INFO Worker] Version: 2.333.1
[2026-04-11 14:43:46Z INFO Worker] Commit: 6792966801e8925346735b68c03bf9f347af4646
[2026-04-11 14:43:46Z INFO Worker] Culture: ja-JP
[2026-04-11 14:43:46Z INFO Worker] UI Culture: ja-JP
[2026-04-11 14:43:46Z INFO Worker] Waiting to receive the job message from the channel.
[2026-04-11 14:43:46Z INFO ProcessChannel] Receiving message of length 27028, with hash '4265551f656a71a1b1a36dddb3760d20a0f09a61edfcd46b43e7a82778650908'
[2026-04-11 14:43:46Z INFO Worker] Message received.
[2026-04-11 14:43:47Z INFO Worker] Job message:
 {
  "fileTable": [
    ".github/workflows/night-batch-self-hosted.yml"
  ],
  "mask": [
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    },
    {
      "type": "regex",
      "value": "***"
    }
  ],
  "steps": [
    {
      "type": "action",
      "reference": {
        "type": "repository",
        "name": "actions/checkout",
        "ref": "v4",
        "repositoryType": "GitHub"
      },
      "contextName": "__actions_checkout",
      "inputs": {
        "type": 2,
        "file": 1,
        "line": 21,
        "col": 11,
        "map": [
          {
            "key": {
              "type": 0,
              "file": 1,
              "line": 21,
              "col": 11,
              "lit": "clean"
            },
            "value": {
              "type": 0,
              "file": 1,
              "line": 21,
              "col": 18,
              "lit": "false"
            }
          }
        ]
      },
      "condition": "success()",
      "id": "e84f023f-200d-468c-a40d-a97596112ea9",
      "name": "__actions_checkout"
    },
    {
      "type": "action",
      "reference": {
        "type": "script"
      },
      "displayNameToken": {
        "type": 0,
        "file": 1,
        "line": 23,
        "col": 15,
        "lit": "Evaluate schedule freshness"
      },
      "contextName": "freshness",
      "inputs": {
        "type": 2,
        "map": [
          {
            "key": "script",
            "value": {
              "type": 3,
              "file": 1,
              "line": 26,
              "col": 14,
              "expr": "format('$shouldRun = ''true''\nif (''{0}'' -eq ''schedule'') {{\n  $jst = [System.TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTimeOffset]::UtcNow, ''Tokyo Standard Time'')\n  if ($jst.Hour -ne 0) {{\n    Write-Host \"Skipping stale scheduled run at $($jst.ToString(''yyyy-MM-dd HH:mm:ss zzz''))\"\n    $shouldRun = ''false''\n  }}\n}}\n\"should_run=$shouldRun\" | Out-File -FilePath $env:GITHUB_OUTPUT -Encoding utf8 -Append\n', github.event_name)"
            }
          },
          {
            "key": "shell",
            "value": {
              "type": 0,
              "file": 1,
              "line": 25,
              "col": 16,
              "lit": "powershell -NoProfile -ExecutionPolicy Bypass -command \". '{0}'\""
            }
          }
        ]
      },
      "condition": "success()",
      "id": "fee79f78-5a76-403c-bb6f-f1868e65ea4e",
      "name": "freshness"
    },
    {
      "type": "action",
      "reference": {
        "type": "script"
      },
      "displayNameToken": {
        "type": 0,
        "file": 1,
        "line": 37,
        "col": 15,
        "lit": "Install dependencies in WSL workspace"
      },
      "contextName": "__run",
      "inputs": {
        "type": 2,
        "map": [
          {
            "key": "script",
            "value": {
              "type": 0,
              "file": 1,
              "line": 40,
              "col": 14,
              "lit": "for /f \"usebackq delims=\" %%I in (`wsl.exe wslpath -a \"%CD%\"`) do set \"REPO_WSL=%%I\"\nif not defined REPO_WSL exit /b 1\nwsl.exe bash -lc \"cd \\\"%REPO_WSL%\\\" && npm ci --silent\"\n"
            }
          },
          {
            "key": "shell",
            "value": {
              "type": 0,
              "file": 1,
              "line": 39,
              "col": 16,
              "lit": "cmd"
            }
          }
        ]
      },
      "condition": "success() && (steps.freshness.outputs.should_run == 'true')",
      "id": "ee18cf64-9f73-485a-ad5c-01b0ae20d09c",
      "name": "__run"
    },
    {
      "type": "action",
      "reference": {
        "type": "script"
      },
      "displayNameToken": {
        "type": 0,
        "file": 1,
        "line": 45,
        "col": 15,
        "lit": "Run smoke gate and foreground production"
      },
      "contextName": "__run_2",
      "inputs": {
        "type": 2,
        "map": [
          {
            "key": "script",
            "value": {
              "type": 3,
              "file": 1,
              "line": 48,
              "col": 14,
              "expr": "format('set \"NIGHT_BATCH_CONFIG={0}\"\nset \"NIGHT_BATCH_RUN_ID=gha_{1}_{2}\"\nif \"%NIGHT_BATCH_CONFIG%\"==\"\" (\n  if \"{3}\"==\"workflow_dispatch\" (\n    echo [diag] ERROR: workflow_dispatch requires a non-empty config_path\n    exit /b 1\n  )\n  set \"NIGHT_BATCH_CONFIG=config/night_batch/bundle-foreground-reuse-config.json\"\n)\nfor /f \"usebackq delims=\" %%I in (`wsl.exe wslpath -a \"%CD%\"`) do set \"REPO_WSL=%%I\"\nif not defined REPO_WSL exit /b 1\necho [diag] config_path=%NIGHT_BATCH_CONFIG%\necho [diag] night_batch_run_id=%NIGHT_BATCH_RUN_ID%\necho [diag] CD=%CD%\nif not exist \"%NIGHT_BATCH_CONFIG%\" (\n  echo [diag] WARNING: config file not found at %NIGHT_BATCH_CONFIG%\n)\nwsl.exe bash -lc \"cd \\\"%REPO_WSL%\\\" && python3 -c \\\"import json, sys; data = json.load(open(sys.argv[1], encoding=''utf-8'')); detach = data.get(''runtime'', {{}}).get(''detach_after_smoke''); sys.exit(0 if detach is not True else 9)\\\" \\\"%NIGHT_BATCH_CONFIG%\\\"\"\nset \"CONFIG_CHECK_EXIT=%ERRORLEVEL%\"\nif \"%CONFIG_CHECK_EXIT%\"==\"9\" (\n  echo [diag] ERROR: workflow requires runtime.detach_after_smoke=false in %NIGHT_BATCH_CONFIG%\n  exit /b 1\n)\nif not \"%CONFIG_CHECK_EXIT%\"==\"0\" (\n  echo [diag] ERROR: failed to validate night batch config %NIGHT_BATCH_CONFIG%\n  exit /b %CONFIG_CHECK_EXIT%\n)\nscripts\\windows\\run-night-batch-self-hosted.cmd \"%NIGHT_BATCH_CONFIG%\"\nset \"BATCH_EXIT=%ERRORLEVEL%\"\necho [diag] wrapper exit code=%BATCH_EXIT%\nexit /b %BATCH_EXIT%\n', inputs.config_path, github.run_id, github.run_attempt, github.event_name)"
            }
          },
          {
            "key": "shell",
            "value": {
              "type": 0,
              "file": 1,
              "line": 47,
              "col": 16,
              "lit": "cmd"
            }
          }
        ]
      },
      "condition": "success() && (steps.freshness.outputs.should_run == 'true')",
      "id": "cd608d22-ef99-4c51-ae7c-4b312c4abedd",
      "name": "__run_2"
    },
    {
      "type": "action",
      "reference": {
        "type": "script"
      },
      "displayNameToken": {
        "type": 0,
        "file": 1,
        "line": 81,
        "col": 15,
        "lit": "Locate night batch outputs"
      },
      "contextName": "night_batch_outputs",
      "inputs": {
        "type": 2,
        "map": [
          {
            "key": "script",
            "value": {
              "type": 3,
              "file": 1,
              "line": 85,
              "col": 14,
              "expr": "format('$expectedRunId = ''gha_{0}_{1}''\n$artifactDir = ''''\n$summaryJson = ''''\n$summaryMd = ''''\nif (Test-Path ''results\\night-batch'') {{\n  $summaryJsonFile = Get-ChildItem -Path ''results\\night-batch'' -Recurse -File -Filter ($expectedRunId + ''-summary.json'') | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1\n  if ($summaryJsonFile) {{\n    $artifactDir = $summaryJsonFile.Directory.FullName\n    $summaryJson = $summaryJsonFile.FullName\n    $summaryMdCandidate = $summaryJsonFile.FullName -replace ''-summary\\.json$'', ''-summary.md''\n    if (Test-Path $summaryMdCandidate) {{\n      $summaryMd = $summaryMdCandidate\n    }}\n  }}\n}}\n\"round_dir=$artifactDir\" | Out-File -FilePath $env:GITHUB_OUTPUT -Encoding utf8 -Append\n\"summary_json=$summaryJson\" | Out-File -FilePath $env:GITHUB_OUTPUT -Encoding utf8 -Append\n\"summary_md=$summaryMd\" | Out-File -FilePath $env:GITHUB_OUTPUT -Encoding utf8 -Append\n', github.run_id, github.run_attempt)"
            }
          },
          {
            "key": "shell",
            "value": {
              "type": 0,
              "file": 1,
              "line": 84,
              "col": 16,
              "lit": "powershell -NoProfile -ExecutionPolicy Bypass -command \". '{0}'\""
            }
          }
        ]
      },
      "condition": "always() && steps.freshness.outputs.should_run == 'true'",
      "id": "a9d1046f-22af-43d7-bddb-e417832847bf",
      "name": "night_batch_outputs"
    },
    {
      "type": "action",
      "reference": {
        "type": "script"
      },
      "displayNameToken": {
        "type": 0,
        "file": 1,
        "line": 105,
        "col": 15,
        "lit": "Append night batch workflow summary"
      },
      "contextName": "__run_3",
      "inputs": {
        "type": 2,
        "map": [
          {
            "key": "script",
            "value": {
              "type": 3,
              "file": 1,
              "line": 108,
              "col": 14,
              "expr": "format('Add-Content $env:GITHUB_STEP_SUMMARY ''## Night batch result''\nAdd-Content $env:GITHUB_STEP_SUMMARY ''''\n$summaryPath = ''{0}''\nif ($summaryPath -eq '''') {{\n  Add-Content $env:GITHUB_STEP_SUMMARY ''- summary_json: not found''\n  exit 0\n}}\n$summary = Get-Content -Raw $summaryPath | ConvertFrom-Json\nAdd-Content $env:GITHUB_STEP_SUMMARY (''- success: '' + $summary.success)\nAdd-Content $env:GITHUB_STEP_SUMMARY (''- termination_reason: '' + $summary.termination_reason)\nAdd-Content $env:GITHUB_STEP_SUMMARY (''- failed_step: '' + ($(if ($summary.failed_step) {{ $summary.failed_step }} else {{ ''窶・' }})))\nAdd-Content $env:GITHUB_STEP_SUMMARY (''- last_checkpoint: '' + ($(if ($summary.last_checkpoint) {{ $summary.last_checkpoint }} else {{ ''窶・' }})))\nAdd-Content $env:GITHUB_STEP_SUMMARY (''- summary_json: '' + $summaryPath)\n$summaryMdPath = ''{1}''\nif ($summaryMdPath -ne '''') {{\n  Add-Content $env:GITHUB_STEP_SUMMARY ''''\n  Add-Content $env:GITHUB_STEP_SUMMARY ''### Summary markdown''\n  Add-Content $env:GITHUB_STEP_SUMMARY ''''\n  Get-Content $summaryMdPath | Add-Content $env:GITHUB_STEP_SUMMARY\n}}\n', steps.night_batch_outputs.outputs.summary_json, steps.night_batch_outputs.outputs.summary_md)"
            }
          },
          {
            "key": "shell",
            "value": {
              "type": 0,
              "file": 1,
              "line": 107,
              "col": 16,
              "lit": "powershell -NoProfile -ExecutionPolicy Bypass -command \". '{0}'\""
            }
          }
        ]
      },
      "condition": "always() && steps.freshness.outputs.should_run == 'true'",
      "id": "2fbc83f7-62bb-43ed-a442-97385e84f653",
      "name": "__run_3"
    },
    {
      "type": "action",
      "reference": {
        "type": "repository",
        "name": "actions/upload-artifact",
        "ref": "v4",
        "repositoryType": "GitHub"
      },
      "displayNameToken": {
        "type": 0,
        "file": 1,
        "line": 130,
        "col": 15,
        "lit": "Upload night batch artifacts"
      },
      "contextName": "__actions_upload-artifact",
      "inputs": {
        "type": 2,
        "file": 1,
        "line": 134,
        "col": 11,
        "map": [
          {
            "key": {
              "type": 0,
              "file": 1,
              "line": 134,
              "col": 11,
              "lit": "name"
            },
            "value": {
              "type": 3,
              "file": 1,
              "line": 134,
              "col": 17,
              "expr": "format('night-batch-{0}-{1}', github.run_id, github.run_attempt)"
            }
          },
          {
            "key": {
              "type": 0,
              "file": 1,
              "line": 135,
              "col": 11,
              "lit": "path"
            },
            "value": {
              "type": 3,
              "file": 1,
              "line": 135,
              "col": 17,
              "expr": "steps.night_batch_outputs.outputs.round_dir"
            }
          },
          {
            "key": {
              "type": 0,
              "file": 1,
              "line": 136,
              "col": 11,
              "lit": "if-no-files-found"
            },
            "value": {
              "type": 0,
              "file": 1,
              "line": 136,
              "col": 30,
              "lit": "warn"
            }
          }
        ]
      },
      "condition": "always() && steps.freshness.outputs.should_run == 'true' && steps.night_batch_outputs.outputs.round_dir != ''",
      "id": "093f46b9-6e02-436d-92a5-e1fd4bfa7990",
      "name": "__actions_upload-artifact"
    },
    {
      "type": "action",
      "reference": {
        "type": "script"
      },
      "displayNameToken": {
        "type": 0,
        "file": 1,
        "line": 138,
        "col": 15,
        "lit": "Report skipped stale schedule"
      },
      "contextName": "__run_4",
      "inputs": {
        "type": 2,
        "map": [
          {
            "key": "script",
            "value": {
              "type": 0,
              "file": 1,
              "line": 141,
              "col": 14,
              "lit": "Write-Host 'Skipped stale scheduled run outside the 00:00 JST launch window.'"
            }
          },
          {
            "key": "shell",
            "value": {
              "type": 0,
              "file": 1,
              "line": 140,
              "col": 16,
              "lit": "powershell -NoProfile -ExecutionPolicy Bypass -command \". '{0}'\""
            }
          }
        ]
      },
      "condition": "success() && (steps.freshness.outputs.should_run != 'true')",
      "id": "6866d50b-3608-4833-86a9-533af1525452",
      "name": "__run_4"
    }
  ],
  "variables": {
    "Actions.EnableHttpRedirects": {
      "value": "true"
    },
    "DistributedTask.AddWarningToNode12Action": {
      "value": "true"
    },
    "DistributedTask.AddWarningToNode16Action": {
      "value": "true"
    },
    "DistributedTask.AllowRunnerContainerHooks": {
      "value": "true"
    },
    "DistributedTask.DeprecateStepOutputCommands": {
      "value": "true"
    },
    "DistributedTask.DetailUntarFailure": {
      "value": "true"
    },
    "DistributedTask.EnableCompositeActions": {
      "value": "true"
    },
    "DistributedTask.EnableJobServerQueueTelemetry": {
      "value": "true"
    },
    "DistributedTask.EnhancedAnnotations": {
      "value": "true"
    },
    "DistributedTask.ForceGithubJavascriptActionsToNode16": {
      "value": "true"
    },
    "DistributedTask.ForceGithubJavascriptActionsToNode20": {
      "value": "true"
    },
    "DistributedTask.LogTemplateErrorsAsDebugMessages": {
      "value": "true"
    },
    "DistributedTask.MarkJobAsFailedOnWorkerCrash": {
      "value": "true"
    },
    "DistributedTask.NewActionMetadata": {
      "value": "true"
    },
    "DistributedTask.UploadStepSummary": {
      "value": "true"
    },
    "DistributedTask.UseActionArchiveCache": {
      "value": "true"
    },
    "DistributedTask.UseWhich2": {
      "value": "true"
    },
    "RunService.FixEmbeddedIssues": {
      "value": "true"
    },
    "actions.runner.requirenode24": {
      "value": "false"
    },
    "actions.runner.usenode24bydefault": {
      "value": "false"
    },
    "actions.runner.warnonnode20": {
      "value": "true"
    },
    "actions_add_check_run_id_to_job_context": {
      "value": "true"
    },
    "actions_batch_action_resolution": {
      "value": "false"
    },
    "actions_container_action_runner_temp": {
      "value": "true"
    },
    "actions_display_helpful_actions_download_errors": {
      "value": "true"
    },
    "actions_runner_compare_workflow_parser": {
      "value": "false"
    },
    "actions_runner_deprecate_linux_arm32": {
      "value": "false"
    },
    "actions_runner_emit_composite_markers": {
      "value": "false"
    },
    "actions_runner_kill_linux_arm32": {
      "value": "false"
    },
    "actions_runner_node20_removal_date": {
      "value": ""
    },
    "actions_runner_node24_default_date": {
      "value": ""
    },
    "actions_service_container_command": {
      "value": "true"
    },
    "actions_set_orchestration_id_env_for_actions": {
      "value": "true"
    },
    "actions_skip_retry_complete_job_upon_known_errors": {
      "value": "true"
    },
    "actions_snapshot_preflight_hosted_runner_check": {
      "value": "false"
    },
    "actions_snapshot_preflight_image_gen_pool_check": {
      "value": "false"
    },
    "actions_use_bearer_token_for_codeload": {
      "value": "false"
    },
    "actions_uses_cache_service_v2": {
      "value": "true"
    },
    "github_token": {
      "value": "***",
      "isSecret": true
    },
    "system.from_run_service": {
      "value": "true"
    },
    "system.github.job": {
      "value": "start-night-batch"
    },
    "system.github.launch_endpoint": {
      "value": "https://launch.actions.githubusercontent.com"
    },
    "system.github.results_endpoint": {
      "value": "https://results-receiver.actions.githubusercontent.com/"
    },
    "system.github.results_upload_with_sdk": {
      "value": "true"
    },
    "system.github.token": {
      "value": "***",
      "isSecret": true
    },
    "system.github.token.permissions": {
      "value": "{\"Contents\":\"read\",\"Metadata\":\"read\",\"Packages\":\"read\"}"
    },
    "system.orchestrationId": {
      "value": "2d31777a-5a08-418a-99cf-95b2c873149c.start-night-batch.__default"
    },
    "system.phaseDisplayName": {
      "value": "start-night-batch"
    },
    "system.runner.lowdiskspacethreshold": {
      "value": "100"
    },
    "system.runnerEnvironment": {
      "value": "self-hosted"
    },
    "system.runnerGroupName": {
      "value": "Default"
    }
  },
  "messageType": "RunnerJobRequest",
  "plan": {
    "scopeIdentifier": "00000000-0000-0000-0000-000000000000",
    "planType": "actions",
    "version": 0,
    "planId": "2d31777a-5a08-418a-99cf-95b2c873149c",
    "planGroup": null,
    "artifactUri": null,
    "artifactLocation": null,
    "definition": null,
    "owner": null
  },
  "timeline": {
    "id": "2d31777a-5a08-418a-99cf-95b2c873149c",
    "changeId": 0,
    "location": null
  },
  "jobId": "70869668-86ba-5fd6-962e-e5e37689181b",
  "jobDisplayName": "start-night-batch",
  "jobName": "__default",
  "requestId": 0,
  "lockedUntil": "0001-01-01T00:00:00",
  "resources": {
    "endpoints": [
      {
        "data": {
          "ServerId": "",
          "ServerName": "",
          "CacheServerUrl": "https://artifactcache.actions.githubusercontent.com/fxVVKbIXsGW6VUtgk79y6hl4lLQopPt0MYpHoDTMFEQzqqyAuC/",
          "FeedStreamUrl": "wss://results-receiver.actions.githubusercontent.com/_ws/ingest.sock",
          "ResultsServiceUrl": "https://results-receiver.actions.githubusercontent.com/",
          "PipelinesServiceUrl": "https://pipelinesghubeus21.actions.githubusercontent.com/fxVVKbIXsGW6VUtgk79y6hl4lLQopPt0MYpHoDTMFEQzqqyAuC/",
          "GenerateIdTokenUrl": "",
          "ConnectivityChecks": "[\"https://broker.actions.githubusercontent.com/health\",\"https://token.actions.githubusercontent.com/ready\",\"https://run.actions.githubusercontent.com/health\"]"
        },
        "name": "SystemVssConnection",
        "url": "https://run-actions-1-azure-eastus.actions.githubusercontent.com/171/",
        "authorization": {
          "parameters": {
            "AccessToken": "***"
          },
          "scheme": "OAuth"
        },
        "isShared": false,
        "isReady": true
      }
    ]
  },
  "contextData": {
    "github": {
      "t": 2,
      "d": [
        {
          "k": "ref",
          "v": "refs/heads/main"
        },
        {
          "k": "sha",
          "v": "2c23e7ab53d11d74711583aa35e15ef26ccb50f0"
        },
        {
          "k": "repository",
          "v": "FPXszk/Oh-MY-TradingView"
        },
        {
          "k": "repository_owner",
          "v": "FPXszk"
        },
        {
          "k": "repository_owner_id",
          "v": "106506797"
        },
        {
          "k": "repositoryUrl",
          "v": "git://github.com/FPXszk/Oh-MY-TradingView.git"
        },
        {
          "k": "run_id",
          "v": "24282322391"
        },
        {
          "k": "run_number",
          "v": "8"
        },
        {
          "k": "retention_days",
          "v": "90"
        },
        {
          "k": "run_attempt",
          "v": "1"
        },
        {
          "k": "artifact_cache_size_limit",
          "v": "10"
        },
        {
          "k": "repository_visibility",
          "v": "public"
        },
        {
          "k": "actor_id",
          "v": "106506797"
        },
        {
          "k": "actor",
          "v": "FPXszk"
        },
        {
          "k": "workflow",
          "v": "Night Batch Self Hosted"
        },
        {
          "k": "head_ref",
          "v": ""
        },
        {
          "k": "base_ref",
          "v": ""
        },
        {
          "k": "event_name",
          "v": "workflow_dispatch"
        },
        {
          "k": "server_url",
          "v": "https://github.com"
        },
        {
          "k": "api_url",
          "v": "https://api.github.com"
        },
        {
          "k": "graphql_url",
          "v": "https://api.github.com/graphql"
        },
        {
          "k": "ref_name",
          "v": "main"
        },
        {
          "k": "ref_protected",
          "v": false
        },
        {
          "k": "ref_type",
          "v": "branch"
        },
        {
          "k": "secret_source",
          "v": "Actions"
        },
        {
          "k": "event",
          "v": {
            "t": 2,
            "d": [
              {
                "k": "ref",
                "v": "refs/heads/main"
              },
              {
                "k": "workflow",
                "v": ".github/workflows/night-batch-self-hosted.yml"
              },
              {
                "k": "inputs",
                "v": {
                  "t": 2,
                  "d": [
                    {
                      "k": "config_path",
                      "v": "config/night_batch/bundle-foreground-reuse-config.json"
                    }
                  ]
                }
              },
              {
                "k": "repository",
                "v": {
                  "t": 2,
                  "d": [
                    {
                      "k": "id",
                      "v": 1200380563.0
                    },
                    {
                      "k": "node_id",
                      "v": "R_kgDOR4xakw"
                    },
                    {
                      "k": "name",
                      "v": "Oh-MY-TradingView"
                    },
                    {
                      "k": "full_name",
                      "v": "FPXszk/Oh-MY-TradingView"
                    },
                    {
                      "k": "private",
                      "v": false
                    },
                    {
                      "k": "owner",
                      "v": {
                        "t": 2,
                        "d": [
                          {
                            "k": "login",
                            "v": "FPXszk"
                          },
                          {
                            "k": "id",
                            "v": 106506797.0
                          },
                          {
                            "k": "node_id",
                            "v": "U_kgDOBlkqLQ"
                          },
                          {
                            "k": "avatar_url",
                            "v": "https://avatars.githubusercontent.com/u/106506797?v=4"
                          },
                          {
                            "k": "gravatar_id",
                            "v": ""
                          },
                          {
                            "k": "url",
                            "v": "https://api.github.com/users/FPXszk"
                          },
                          {
                            "k": "html_url",
                            "v": "https://github.com/FPXszk"
                          },
                          {
                            "k": "followers_url",
                            "v": "https://api.github.com/users/FPXszk/followers"
                          },
                          {
                            "k": "following_url",
                            "v": "https://api.github.com/users/FPXszk/following{/other_user}"
                          },
                          {
                            "k": "gists_url",
                            "v": "https://api.github.com/users/FPXszk/gists{/gist_id}"
                          },
                          {
                            "k": "starred_url",
                            "v": "https://api.github.com/users/FPXszk/starred{/owner}{/repo}"
                          },
                          {
                            "k": "subscriptions_url",
                            "v": "https://api.github.com/users/FPXszk/subscriptions"
                          },
                          {
                            "k": "organizations_url",
                            "v": "https://api.github.com/users/FPXszk/orgs"
                          },
                          {
                            "k": "repos_url",
                            "v": "https://api.github.com/users/FPXszk/repos"
                          },
                          {
                            "k": "events_url",
                            "v": "https://api.github.com/users/FPXszk/events{/privacy}"
                          },
                          {
                            "k": "received_events_url",
                            "v": "https://api.github.com/users/FPXszk/received_events"
                          },
                          {
                            "k": "type",
                            "v": "User"
                          },
                          {
                            "k": "user_view_type",
                            "v": "public"
                          },
                          {
                            "k": "site_admin",
                            "v": false
                          }
                        ]
                      }
                    },
                    {
                      "k": "html_url",
                      "v": "https://github.com/FPXszk/Oh-MY-TradingView"
                    },
                    {
                      "k": "description",
                      "v": null
                    },
                    {
                      "k": "fork",
                      "v": false
                    },
                    {
                      "k": "url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView"
                    },
                    {
                      "k": "forks_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/forks"
                    },
                    {
                      "k": "keys_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/keys{/key_id}"
                    },
                    {
                      "k": "collaborators_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/collaborators{/collaborator}"
                    },
                    {
                      "k": "teams_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/teams"
                    },
                    {
                      "k": "hooks_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/hooks"
                    },
                    {
                      "k": "issue_events_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/issues/events{/number}"
                    },
                    {
                      "k": "events_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/events"
                    },
                    {
                      "k": "assignees_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/assignees{/user}"
                    },
                    {
                      "k": "branches_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/branches{/branch}"
                    },
                    {
                      "k": "tags_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/tags"
                    },
                    {
                      "k": "blobs_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/git/blobs{/sha}"
                    },
                    {
                      "k": "git_tags_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/git/tags{/sha}"
                    },
                    {
                      "k": "git_refs_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/git/refs{/sha}"
                    },
                    {
                      "k": "trees_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/git/trees{/sha}"
                    },
                    {
                      "k": "statuses_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/statuses/{sha}"
                    },
                    {
                      "k": "languages_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/languages"
                    },
                    {
                      "k": "stargazers_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/stargazers"
                    },
                    {
                      "k": "contributors_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/contributors"
                    },
                    {
                      "k": "subscribers_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/subscribers"
                    },
                    {
                      "k": "subscription_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/subscription"
                    },
                    {
                      "k": "commits_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/commits{/sha}"
                    },
                    {
                      "k": "git_commits_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/git/commits{/sha}"
                    },
                    {
                      "k": "comments_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/comments{/number}"
                    },
                    {
                      "k": "issue_comment_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/issues/comments{/number}"
                    },
                    {
                      "k": "contents_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/contents/{+path}"
                    },
                    {
                      "k": "compare_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/compare/{base}...{head}"
                    },
                    {
                      "k": "merges_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/merges"
                    },
                    {
                      "k": "archive_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/{archive_format}{/ref}"
                    },
                    {
                      "k": "downloads_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/downloads"
                    },
                    {
                      "k": "issues_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/issues{/number}"
                    },
                    {
                      "k": "pulls_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/pulls{/number}"
                    },
                    {
                      "k": "milestones_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/milestones{/number}"
                    },
                    {
                      "k": "notifications_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/notifications{?since,all,participating}"
                    },
                    {
                      "k": "labels_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/labels{/name}"
                    },
                    {
                      "k": "releases_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/releases{/id}"
                    },
                    {
                      "k": "deployments_url",
                      "v": "https://api.github.com/repos/FPXszk/Oh-MY-TradingView/deployments"
                    },
                    {
                      "k": "created_at",
                      "v": "2026-04-03T10:48:01Z"
                    },
                    {
                      "k": "updated_at",
                      "v": "2026-04-11T12:18:28Z"
                    },
                    {
                      "k": "pushed_at",
                      "v": "2026-04-11T12:18:20Z"
                    },
                    {
                      "k": "git_url",
                      "v": "git://github.com/FPXszk/Oh-MY-TradingView.git"
                    },
                    {
                      "k": "ssh_url",
                      "v": "git@github.com:FPXszk/Oh-MY-TradingView.git"
                    },
                    {
                      "k": "clone_url",
                      "v": "https://github.com/FPXszk/Oh-MY-TradingView.git"
                    },
                    {
                      "k": "svn_url",
                      "v": "https://github.com/FPXszk/Oh-MY-TradingView"
                    },
                    {
                      "k": "homepage",
                      "v": null
                    },
                    {
                      "k": "size",
                      "v": 2609.0
                    },
                    {
                      "k": "stargazers_count",
                      "v": 1.0
                    },
                    {
                      "k": "watchers_count",
                      "v": 1.0
                    },
                    {
                      "k": "language",
                      "v": "JavaScript"
                    },
                    {
                      "k": "has_issues",
                      "v": true
                    },
                    {
                      "k": "has_projects",
                      "v": true
                    },
                    {
                      "k": "has_downloads",
                      "v": true
                    },
                    {
                      "k": "has_wiki",
                      "v": true
                    },
                    {
                      "k": "has_pages",
                      "v": false
                    },
                    {
                      "k": "has_discussions",
                      "v": false
                    },
                    {
                      "k": "forks_count",
                      "v": 0.0
                    },
                    {
                      "k": "mirror_url",
                      "v": null
                    },
                    {
                      "k": "archived",
                      "v": false
                    },
                    {
                      "k": "disabled",
                      "v": false
                    },
                    {
                      "k": "open_issues_count",
                      "v": 0.0
                    },
                    {
                      "k": "license",
                      "v": null
                    },
                    {
                      "k": "allow_forking",
                      "v": true
                    },
                    {
                      "k": "is_template",
                      "v": false
                    },
                    {
                      "k": "web_commit_signoff_required",
                      "v": false
                    },
                    {
                      "k": "has_pull_requests",
                      "v": true
                    },
                    {
                      "k": "pull_request_creation_policy",
                      "v": "all"
                    },
                    {
                      "k": "topics",
                      "v": {
                        "t": 1
                      }
                    },
                    {
                      "k": "visibility",
                      "v": "public"
                    },
                    {
                      "k": "forks",
                      "v": 0.0
                    },
                    {
                      "k": "open_issues",
                      "v": 0.0
                    },
                    {
                      "k": "watchers",
                      "v": 1.0
                    },
                    {
                      "k": "default_branch",
                      "v": "main"
                    }
                  ]
                }
              },
              {
                "k": "sender",
                "v": {
                  "t": 2,
                  "d": [
                    {
                      "k": "login",
                      "v": "FPXszk"
                    },
                    {
                      "k": "id",
                      "v": 106506797.0
                    },
                    {
                      "k": "node_id",
                      "v": "U_kgDOBlkqLQ"
                    },
                    {
                      "k": "avatar_url",
                      "v": "https://avatars.githubusercontent.com/u/106506797?v=4"
                    },
                    {
                      "k": "gravatar_id",
                      "v": ""
                    },
                    {
                      "k": "url",
                      "v": "https://api.github.com/users/FPXszk"
                    },
                    {
                      "k": "html_url",
                      "v": "https://github.com/FPXszk"
                    },
                    {
                      "k": "followers_url",
                      "v": "https://api.github.com/users/FPXszk/followers"
                    },
                    {
                      "k": "following_url",
                      "v": "https://api.github.com/users/FPXszk/following{/other_user}"
                    },
                    {
                      "k": "gists_url",
                      "v": "https://api.github.com/users/FPXszk/gists{/gist_id}"
                    },
                    {
                      "k": "starred_url",
                      "v": "https://api.github.com/users/FPXszk/starred{/owner}{/repo}"
                    },
                    {
                      "k": "subscriptions_url",
                      "v": "https://api.github.com/users/FPXszk/subscriptions"
                    },
                    {
                      "k": "organizations_url",
                      "v": "https://api.github.com/users/FPXszk/orgs"
                    },
                    {
                      "k": "repos_url",
                      "v": "https://api.github.com/users/FPXszk/repos"
                    },
                    {
                      "k": "events_url",
                      "v": "https://api.github.com/users/FPXszk/events{/privacy}"
                    },
                    {
                      "k": "received_events_url",
                      "v": "https://api.github.com/users/FPXszk/received_events"
                    },
                    {
                      "k": "type",
                      "v": "User"
                    },
                    {
                      "k": "user_view_type",
                      "v": "public"
                    },
                    {
                      "k": "site_admin",
                      "v": false
                    }
                  ]
                }
              }
            ]
          }
        },
        {
          "k": "workflow_ref",
          "v": "FPXszk/Oh-MY-TradingView/.github/workflows/night-batch-self-hosted.yml@refs/heads/main"
        },
        {
          "k": "workflow_sha",
          "v": "2c23e7ab53d11d74711583aa35e15ef26ccb50f0"
        },
        {
          "k": "repository_id",
          "v": "1200380563"
        },
        {
          "k": "triggering_actor",
          "v": "FPXszk"
        }
      ]
    },
    "inputs": {
      "t": 2,
      "d": [
        {
          "k": "config_path",
          "v": "config/night_batch/bundle-foreground-reuse-config.json"
        }
      ]
    },
    "job": {
      "t": 2,
      "d": [
        {
          "k": "check_run_id",
          "v": 70906028027.0
        },
        {
          "k": "workflow_ref",
          "v": "FPXszk/Oh-MY-TradingView/.github/workflows/night-batch-self-hosted.yml@refs/heads/main"
        },
        {
          "k": "workflow_sha",
          "v": "2c23e7ab53d11d74711583aa35e15ef26ccb50f0"
        },
        {
          "k": "workflow_repository",
          "v": "FPXszk/Oh-MY-TradingView"
        },
        {
          "k": "workflow_file_path",
          "v": ".github/workflows/night-batch-self-hosted.yml"
        }
      ]
    },
    "matrix": null,
    "needs": {
      "t": 2
    },
    "strategy": {
      "t": 2,
      "d": [
        {
          "k": "fail-fast",
          "v": true
        },
        {
          "k": "job-index",
          "v": 0.0
        },
        {
          "k": "job-total",
          "v": 1.0
        },
        {
          "k": "max-parallel",
          "v": 1.0
        }
      ]
    },
    "vars": {
      "t": 2
    }
  },
  "billingOwnerId": "U_kgDOBlkqLQ"
}
[2026-04-11 14:43:47Z INFO JobRunner] Job ID 70869668-86ba-5fd6-962e-e5e37689181b
[2026-04-11 14:43:47Z INFO ConfigurationStore] currentAssemblyLocation: C:\actions-runner\bin\Runner.Worker.dll
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:47Z INFO ConfigurationStore] binPath: C:\actions-runner\bin
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:47Z INFO ConfigurationStore] RootFolder: C:\actions-runner
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:47Z INFO HostContext] Well known config file 'Runner': 'C:\actions-runner\.runner'
[2026-04-11 14:43:47Z INFO ConfigurationStore] ConfigFilePath: C:\actions-runner\.runner
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:47Z INFO HostContext] Well known config file 'MigratedRunner': 'C:\actions-runner\.runner_migrated'
[2026-04-11 14:43:47Z INFO ConfigurationStore] MigratedConfigFilePath: C:\actions-runner\.runner_migrated
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:47Z INFO HostContext] Well known config file 'Credentials': 'C:\actions-runner\.credentials'
[2026-04-11 14:43:47Z INFO ConfigurationStore] CredFilePath: C:\actions-runner\.credentials
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:47Z INFO HostContext] Well known config file 'MigratedCredentials': 'C:\actions-runner\.credentials_migrated'
[2026-04-11 14:43:47Z INFO ConfigurationStore] MigratedCredFilePath: C:\actions-runner\.credentials_migrated
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:47Z INFO HostContext] Well known config file 'Service': 'C:\actions-runner\.service'
[2026-04-11 14:43:47Z INFO ConfigurationStore] ServiceConfigFilePath: C:\actions-runner\.service
[2026-04-11 14:43:47Z INFO ConfigurationStore] Read setting file: 310 chars
[2026-04-11 14:43:47Z INFO JobRunner] Initializing launch client
[2026-04-11 14:43:47Z INFO JobServerQueue] Initializing results client
[2026-04-11 14:43:47Z INFO ResultServer] Creating websocket client ...wss://results-receiver.actions.githubusercontent.com/_ws/ingest.sock
[2026-04-11 14:43:47Z INFO ResultServer] Attempting to start websocket client with delay 00:00:00.
[2026-04-11 14:43:47Z INFO JobServerQueue] Start process web console line queue.
[2026-04-11 14:43:47Z INFO JobServerQueue] Start process file upload queue.
[2026-04-11 14:43:47Z INFO JobServerQueue] Start results file upload queue.
[2026-04-11 14:43:47Z INFO JobServerQueue] Starting results-based upload queue...
[2026-04-11 14:43:47Z INFO JobServerQueue] Start process timeline update queue.
[2026-04-11 14:43:47Z INFO ExecutionContext] Initializing Job context
[2026-04-11 14:43:47Z INFO ExecutionContext] Initialize GitHub context
[2026-04-11 14:43:47Z INFO ExecutionContext] Initialize Env context
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 14:43:47Z INFO JobRunner] Starting the job execution context.
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:47Z INFO JobRunner] Validating directory permissions for: 'C:\actions-runner\_work'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Tools': 'C:\actions-runner\_work\_tool'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-11 14:43:47Z INFO JobRunner] Getting job extension.
[2026-04-11 14:43:47Z INFO JobRunner] Initialize job. Getting all job steps.
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:47Z INFO HostContext] Well known config file 'Credentials': 'C:\actions-runner\.credentials'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:47Z INFO HostContext] Well known config file 'SetupInfo': 'C:\actions-runner\.setup_info'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:47Z INFO PipelineDirectoryManager] Loading tracking config if exists: C:\actions-runner\_work\_PipelineMapping\FPXszk/Oh-MY-TradingView\PipelineFolder.json
[2026-04-11 14:43:47Z INFO PipelineDirectoryManager] Updating job run properties.
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:47Z INFO JobExtension] Downloading actions
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:47Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-11 14:43:47Z INFO Worker] Listening for cancel message from the channel.
[2026-04-11 14:43:47Z INFO Worker] Waiting for the job to complete or for a cancel message from the channel.
[2026-04-11 14:43:47Z INFO ResultServer] Successfully started websocket client.
[2026-04-11 14:43:47Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'c94aa1a5-14cf-4b9c-8e53-c1293d6fe29b', success rate: 1/1.
[2026-04-11 14:43:48Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:48Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:48Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:48Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-11 14:43:48Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:48Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:48Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:48Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-11 14:43:48Z INFO ActionManager] Save archive 'https://api.github.com/repos/actions/checkout/zipball/34e114876b0b11c390a56381ad16ebd13914f8d5' into C:\actions-runner\_work\_actions\_temp_8d4c2b9d-6d1e-4b8d-97c9-a3d621159615\202a7361-c57c-4e20-8041-71354f36de40.zip.
[2026-04-11 14:43:48Z INFO JobServerQueue] Job timeline record has been updated for the first time.
[2026-04-11 14:43:48Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'c94aa1a5-14cf-4b9c-8e53-c1293d6fe29b', success rate: 1/1.
[2026-04-11 14:43:48Z INFO ActionManager] Request URL: https://api.github.com/repos/actions/checkout/zipball/34e114876b0b11c390a56381ad16ebd13914f8d5 X-GitHub-Request-Id: EAA8:25BBF8:1EC50:D52CB:69DA5E31 Http Status: OK
[2026-04-11 14:43:48Z INFO ActionManager] Finished getting action repository.
[2026-04-11 14:43:48Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:48Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:48Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:48Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-11 14:43:48Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:48Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:48Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:48Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-11 14:43:48Z INFO ActionManager] Save archive 'https://api.github.com/repos/actions/upload-artifact/zipball/ea165f8d65b6e75b540449e92b4886f43607fa02' into C:\actions-runner\_work\_actions\_temp_3c793b50-7cd6-4bd5-bd1b-208e3dde93c9\a363a9a1-50d7-4d95-9768-448732086ac0.zip.
[2026-04-11 14:43:49Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'c94aa1a5-14cf-4b9c-8e53-c1293d6fe29b', success rate: 1/1.
[2026-04-11 14:43:49Z INFO ActionManager] Request URL: https://api.github.com/repos/actions/upload-artifact/zipball/ea165f8d65b6e75b540449e92b4886f43607fa02 X-GitHub-Request-Id: EAAB:C321:1F5C3:D5DCF:69DA5E32 Http Status: OK
[2026-04-11 14:43:49Z INFO ActionManager] Finished getting action repository.
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-11 14:43:49Z INFO ActionManifestManagerLegacy] Load schema file with definitions: [
  "null",
  "boolean",
  "number",
  "string",
  "sequence",
  "mapping",
  "any",
  "action-root",
  "inputs",
  "input",
  "outputs",
  "output-definition",
  "runs",
  "container-runs",
  "container-runs-args",
  "container-runs-env",
  "node-runs",
  "plugin-runs",
  "composite-runs",
  "composite-steps",
  "composite-step",
  "run-step",
  "uses-step",
  "container-runs-context",
  "output-value",
  "input-default-context",
  "non-empty-string",
  "string-steps-context",
  "boolean-steps-context",
  "step-env",
  "step-if",
  "step-with"
]
[2026-04-11 14:43:49Z INFO ActionManifestManager] Load schema file with definitions: [
  "null",
  "boolean",
  "number",
  "string",
  "sequence",
  "mapping",
  "any",
  "action-root",
  "inputs",
  "input",
  "outputs",
  "output-definition",
  "runs",
  "container-runs",
  "container-runs-args",
  "container-runs-env",
  "node-runs",
  "plugin-runs",
  "composite-runs",
  "composite-steps",
  "composite-step",
  "run-step",
  "uses-step",
  "container-runs-context",
  "output-value",
  "input-default-context",
  "non-empty-string",
  "string-steps-context",
  "boolean-steps-context",
  "step-env",
  "step-if",
  "step-with"
]
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-11 14:43:49Z INFO ActionManifestManagerLegacy] Loaded action.yml file: {
  "name": "Checkout",
  "description": "Checkout a Git repository at a particular version",
  "inputs": {
    "type": 2,
    "map": [
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 4,
          "col": 3,
          "lit": "repository"
        },
        "value": {
          "type": 3,
          "file": 2,
          "line": 6,
          "col": 14,
          "expr": "github.repository"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 7,
          "col": 3,
          "lit": "ref"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 12,
          "col": 3,
          "lit": "token"
        },
        "value": {
          "type": 3,
          "file": 2,
          "line": 24,
          "col": 14,
          "expr": "github.token"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 25,
          "col": 3,
          "lit": "ssh-key"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 37,
          "col": 3,
          "lit": "ssh-known-hosts"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 42,
          "col": 3,
          "lit": "ssh-strict"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 47,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 48,
          "col": 3,
          "lit": "ssh-user"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 51,
          "col": 14,
          "lit": "git"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 52,
          "col": 3,
          "lit": "persist-credentials"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 54,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 55,
          "col": 3,
          "lit": "path"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 57,
          "col": 3,
          "lit": "clean"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 59,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 60,
          "col": 3,
          "lit": "filter"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 64,
          "col": 14,
          "lit": ""
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 65,
          "col": 3,
          "lit": "sparse-checkout"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 69,
          "col": 14,
          "lit": ""
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 70,
          "col": 3,
          "lit": "sparse-checkout-cone-mode"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 73,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 74,
          "col": 3,
          "lit": "fetch-depth"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 76,
          "col": 14,
          "lit": "1"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 77,
          "col": 3,
          "lit": "fetch-tags"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 79,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 80,
          "col": 3,
          "lit": "show-progress"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 82,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 83,
          "col": 3,
          "lit": "lfs"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 85,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 86,
          "col": 3,
          "lit": "submodules"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 94,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 95,
          "col": 3,
          "lit": "set-safe-directory"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 97,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 98,
          "col": 3,
          "lit": "github-server-url"
        },
        "value": ""
      }
    ]
  },
  "execution": {
    "executionType": "nodeJS",
    "hasPre": false,
    "hasPost": true,
    "script": "dist/index.js",
    "pre": null,
    "post": "dist/index.js",
    "nodeVersion": "node20",
    "cleanupCondition": "always()",
    "initCondition": "always()"
  },
  "deprecated": null
}
[2026-04-11 14:43:49Z INFO ActionManager] Action node.js file: dist/index.js, no more preparation.
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-11 14:43:49Z INFO ActionManager] Load action that reference repository from 'C:\actions-runner\_work\_actions\actions\checkout\v4'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-11 14:43:49Z INFO ActionManifestManagerLegacy] Loaded action.yml file: {
  "name": "Checkout",
  "description": "Checkout a Git repository at a particular version",
  "inputs": {
    "type": 2,
    "map": [
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 4,
          "col": 3,
          "lit": "repository"
        },
        "value": {
          "type": 3,
          "file": 2,
          "line": 6,
          "col": 14,
          "expr": "github.repository"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 7,
          "col": 3,
          "lit": "ref"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 12,
          "col": 3,
          "lit": "token"
        },
        "value": {
          "type": 3,
          "file": 2,
          "line": 24,
          "col": 14,
          "expr": "github.token"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 25,
          "col": 3,
          "lit": "ssh-key"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 37,
          "col": 3,
          "lit": "ssh-known-hosts"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 42,
          "col": 3,
          "lit": "ssh-strict"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 47,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 48,
          "col": 3,
          "lit": "ssh-user"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 51,
          "col": 14,
          "lit": "git"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 52,
          "col": 3,
          "lit": "persist-credentials"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 54,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 55,
          "col": 3,
          "lit": "path"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 57,
          "col": 3,
          "lit": "clean"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 59,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 60,
          "col": 3,
          "lit": "filter"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 64,
          "col": 14,
          "lit": ""
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 65,
          "col": 3,
          "lit": "sparse-checkout"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 69,
          "col": 14,
          "lit": ""
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 70,
          "col": 3,
          "lit": "sparse-checkout-cone-mode"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 73,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 74,
          "col": 3,
          "lit": "fetch-depth"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 76,
          "col": 14,
          "lit": "1"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 77,
          "col": 3,
          "lit": "fetch-tags"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 79,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 80,
          "col": 3,
          "lit": "show-progress"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 82,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 83,
          "col": 3,
          "lit": "lfs"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 85,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 86,
          "col": 3,
          "lit": "submodules"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 94,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 95,
          "col": 3,
          "lit": "set-safe-directory"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 97,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 98,
          "col": 3,
          "lit": "github-server-url"
        },
        "value": ""
      }
    ]
  },
  "execution": {
    "executionType": "nodeJS",
    "hasPre": false,
    "hasPost": true,
    "script": "dist/index.js",
    "pre": null,
    "post": "dist/index.js",
    "nodeVersion": "node20",
    "cleanupCondition": "always()",
    "initCondition": "always()"
  },
  "deprecated": null
}
[2026-04-11 14:43:49Z INFO ActionManager] Action pre node.js file: N/A.
[2026-04-11 14:43:49Z INFO ActionManager] Action node.js file: dist/index.js.
[2026-04-11 14:43:49Z INFO ActionManager] Action post node.js file: dist/index.js.
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-11 14:43:49Z INFO ActionManifestManagerLegacy] Ignore action property author.
[2026-04-11 14:43:49Z INFO ActionManifestManagerLegacy] Loaded action.yml file: {
  "name": "Upload a Build Artifact",
  "description": "Upload a build artifact that can be used by subsequent workflow steps",
  "inputs": {
    "type": 2,
    "map": [
      {
        "key": {
          "type": 0,
          "file": 3,
          "line": 5,
          "col": 3,
          "lit": "name"
        },
        "value": {
          "type": 0,
          "file": 3,
          "line": 7,
          "col": 14,
          "lit": "artifact"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 3,
          "line": 8,
          "col": 3,
          "lit": "path"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 3,
          "line": 11,
          "col": 3,
          "lit": "if-no-files-found"
        },
        "value": {
          "type": 0,
          "file": 3,
          "line": 19,
          "col": 14,
          "lit": "warn"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 3,
          "line": 20,
          "col": 3,
          "lit": "retention-days"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 3,
          "line": 26,
          "col": 3,
          "lit": "compression-level"
        },
        "value": {
          "type": 0,
          "file": 3,
          "line": 36,
          "col": 14,
          "lit": "6"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 3,
          "line": 37,
          "col": 3,
          "lit": "overwrite"
        },
        "value": {
          "type": 0,
          "file": 3,
          "line": 42,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 3,
          "line": 43,
          "col": 3,
          "lit": "include-hidden-files"
        },
        "value": {
          "type": 0,
          "file": 3,
          "line": 47,
          "col": 14,
          "lit": "false"
        }
      }
    ]
  },
  "execution": {
    "executionType": "nodeJS",
    "hasPre": false,
    "hasPost": false,
    "script": "dist/upload/index.js",
    "pre": null,
    "post": null,
    "nodeVersion": "node20",
    "cleanupCondition": "always()",
    "initCondition": "always()"
  },
  "deprecated": null
}
[2026-04-11 14:43:49Z INFO ActionManager] Action node.js file: dist/upload/index.js, no more preparation.
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-11 14:43:49Z INFO ActionManager] Load action that reference repository from 'C:\actions-runner\_work\_actions\actions\upload-artifact\v4'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-11 14:43:49Z INFO ActionManifestManagerLegacy] Ignore action property author.
[2026-04-11 14:43:49Z INFO ActionManifestManagerLegacy] Loaded action.yml file: {
  "name": "Upload a Build Artifact",
  "description": "Upload a build artifact that can be used by subsequent workflow steps",
  "inputs": {
    "type": 2,
    "map": [
      {
        "key": {
          "type": 0,
          "file": 3,
          "line": 5,
          "col": 3,
          "lit": "name"
        },
        "value": {
          "type": 0,
          "file": 3,
          "line": 7,
          "col": 14,
          "lit": "artifact"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 3,
          "line": 8,
          "col": 3,
          "lit": "path"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 3,
          "line": 11,
          "col": 3,
          "lit": "if-no-files-found"
        },
        "value": {
          "type": 0,
          "file": 3,
          "line": 19,
          "col": 14,
          "lit": "warn"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 3,
          "line": 20,
          "col": 3,
          "lit": "retention-days"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 3,
          "line": 26,
          "col": 3,
          "lit": "compression-level"
        },
        "value": {
          "type": 0,
          "file": 3,
          "line": 36,
          "col": 14,
          "lit": "6"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 3,
          "line": 37,
          "col": 3,
          "lit": "overwrite"
        },
        "value": {
          "type": 0,
          "file": 3,
          "line": 42,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 3,
          "line": 43,
          "col": 3,
          "lit": "include-hidden-files"
        },
        "value": {
          "type": 0,
          "file": 3,
          "line": 47,
          "col": 14,
          "lit": "false"
        }
      }
    ]
  },
  "execution": {
    "executionType": "nodeJS",
    "hasPre": false,
    "hasPost": false,
    "script": "dist/upload/index.js",
    "pre": null,
    "post": null,
    "nodeVersion": "node20",
    "cleanupCondition": "always()",
    "initCondition": "always()"
  },
  "deprecated": null
}
[2026-04-11 14:43:49Z INFO ActionManager] Action pre node.js file: N/A.
[2026-04-11 14:43:49Z INFO ActionManager] Action node.js file: dist/upload/index.js.
[2026-04-11 14:43:49Z INFO ActionManager] Action post node.js file: N/A.
[2026-04-11 14:43:49Z INFO JobExtension] Adding .
[2026-04-11 14:43:49Z INFO JobExtension] Adding .
[2026-04-11 14:43:49Z INFO JobExtension] Adding .
[2026-04-11 14:43:49Z INFO JobExtension] Adding .
[2026-04-11 14:43:49Z INFO JobExtension] Adding .
[2026-04-11 14:43:49Z INFO JobExtension] Adding .
[2026-04-11 14:43:49Z INFO JobExtension] Adding .
[2026-04-11 14:43:49Z INFO JobExtension] Adding .
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 14:43:49Z INFO JobExtension] Total accessible running process: 268.
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:49Z INFO JobExtension] Start checking server connectivity.
[2026-04-11 14:43:49Z INFO JobExtension] Check server connectivity for https://broker.actions.githubusercontent.com/health.
[2026-04-11 14:43:49Z INFO JobExtension] Check server connectivity for https://token.actions.githubusercontent.com/ready.
[2026-04-11 14:43:49Z INFO JobExtension] Check server connectivity for https://run.actions.githubusercontent.com/health.
[2026-04-11 14:43:49Z INFO JobExtension] Start checking service connectivity in background.
[2026-04-11 14:43:49Z INFO ExecutionContext] Publish step telemetry for current step {
  "action": "setup_job",
  "type": "runner",
  "stage": "Pre",
  "stepId": "c94aa1a5-14cf-4b9c-8e53-c1293d6fe29b",
  "result": "succeeded",
  "errorMessages": [],
  "executionTimeInSeconds": 3,
  "startTime": "2026-04-11T14:43:47.1846181Z",
  "finishTime": "2026-04-11T14:43:49.8595377Z"
}.
[2026-04-11 14:43:49Z INFO JobRunner] Total job steps: 8.
[2026-04-11 14:43:49Z INFO JobRunner] Run all job steps.
[2026-04-11 14:43:49Z INFO StepsRunner] Processing step: DisplayName='Run actions/checkout@v4'
[2026-04-11 14:43:49Z INFO StepsRunner] Evaluating: success()
[2026-04-11 14:43:49Z INFO StepsRunner] Result: true
[2026-04-11 14:43:49Z INFO StepsRunner] Starting the step.
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:49Z INFO StepsRunner] Which2: 'chcp'
[2026-04-11 14:43:49Z INFO StepsRunner] Location: 'C:\Windows\system32\chcp.COM'
[2026-04-11 14:43:49Z INFO ProcessInvokerWrapper] Starting process:
[2026-04-11 14:43:49Z INFO ProcessInvokerWrapper]   File name: 'C:\Windows\system32\chcp.COM'
[2026-04-11 14:43:49Z INFO ProcessInvokerWrapper]   Arguments: '65001'
[2026-04-11 14:43:49Z INFO ProcessInvokerWrapper]   Working directory: 'C:\actions-runner\_work'
[2026-04-11 14:43:49Z INFO ProcessInvokerWrapper]   Require exit code zero: 'False'
[2026-04-11 14:43:49Z INFO ProcessInvokerWrapper]   Encoding web name:  ; code page: ''
[2026-04-11 14:43:49Z INFO ProcessInvokerWrapper]   Force kill process on cancellation: 'False'
[2026-04-11 14:43:49Z INFO ProcessInvokerWrapper]   Redirected STDIN: 'False'
[2026-04-11 14:43:49Z INFO ProcessInvokerWrapper]   Persist current code page: 'True'
[2026-04-11 14:43:49Z INFO ProcessInvokerWrapper]   Keep redirected STDIN open: 'False'
[2026-04-11 14:43:49Z INFO ProcessInvokerWrapper]   High priority process: 'False'
[2026-04-11 14:43:49Z INFO ProcessInvokerWrapper] Process started with process id 21160, waiting for process exit.
[2026-04-11 14:43:49Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 14:43:49Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 14:43:49Z INFO ProcessInvokerWrapper] Finished process 21160 with exit code 0, and elapsed time 00:00:00.0353245.
[2026-04-11 14:43:49Z INFO StepsRunner] Successfully returned to code page 65001 (UTF8)
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-11 14:43:49Z INFO ActionManager] Load action that reference repository from 'C:\actions-runner\_work\_actions\actions\checkout\v4'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Actions': 'C:\actions-runner\_work\_actions'
[2026-04-11 14:43:49Z INFO ActionManifestManagerLegacy] Loaded action.yml file: {
  "name": "Checkout",
  "description": "Checkout a Git repository at a particular version",
  "inputs": {
    "type": 2,
    "map": [
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 4,
          "col": 3,
          "lit": "repository"
        },
        "value": {
          "type": 3,
          "file": 2,
          "line": 6,
          "col": 14,
          "expr": "github.repository"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 7,
          "col": 3,
          "lit": "ref"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 12,
          "col": 3,
          "lit": "token"
        },
        "value": {
          "type": 3,
          "file": 2,
          "line": 24,
          "col": 14,
          "expr": "github.token"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 25,
          "col": 3,
          "lit": "ssh-key"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 37,
          "col": 3,
          "lit": "ssh-known-hosts"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 42,
          "col": 3,
          "lit": "ssh-strict"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 47,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 48,
          "col": 3,
          "lit": "ssh-user"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 51,
          "col": 14,
          "lit": "git"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 52,
          "col": 3,
          "lit": "persist-credentials"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 54,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 55,
          "col": 3,
          "lit": "path"
        },
        "value": ""
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 57,
          "col": 3,
          "lit": "clean"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 59,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 60,
          "col": 3,
          "lit": "filter"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 64,
          "col": 14,
          "lit": ""
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 65,
          "col": 3,
          "lit": "sparse-checkout"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 69,
          "col": 14,
          "lit": ""
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 70,
          "col": 3,
          "lit": "sparse-checkout-cone-mode"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 73,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 74,
          "col": 3,
          "lit": "fetch-depth"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 76,
          "col": 14,
          "lit": "1"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 77,
          "col": 3,
          "lit": "fetch-tags"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 79,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 80,
          "col": 3,
          "lit": "show-progress"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 82,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 83,
          "col": 3,
          "lit": "lfs"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 85,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 86,
          "col": 3,
          "lit": "submodules"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 94,
          "col": 14,
          "lit": "false"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 95,
          "col": 3,
          "lit": "set-safe-directory"
        },
        "value": {
          "type": 0,
          "file": 2,
          "line": 97,
          "col": 14,
          "lit": "true"
        }
      },
      {
        "key": {
          "type": 0,
          "file": 2,
          "line": 98,
          "col": 3,
          "lit": "github-server-url"
        },
        "value": ""
      }
    ]
  },
  "execution": {
    "executionType": "nodeJS",
    "hasPre": false,
    "hasPost": true,
    "script": "dist/index.js",
    "pre": null,
    "post": "dist/index.js",
    "nodeVersion": "node20",
    "cleanupCondition": "always()",
    "initCondition": "always()"
  },
  "deprecated": null
}
[2026-04-11 14:43:49Z INFO ActionManager] Action pre node.js file: N/A.
[2026-04-11 14:43:49Z INFO ActionManager] Action node.js file: dist/index.js.
[2026-04-11 14:43:49Z INFO ActionManager] Action post node.js file: dist/index.js.
[2026-04-11 14:43:49Z INFO ExecutionContext] Reserve record order 10 to 18 for post job actions.
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Diag': 'C:\actions-runner\_diag'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-11 14:43:49Z INFO ExecutionContext] Write event payload to C:\actions-runner\_work\_temp\_github_workflow\event.json
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-11 14:43:49Z INFO ExtensionManager] Getting extensions for interface: 'GitHub.Runner.Worker.IFileCommandExtension'
[2026-04-11 14:43:49Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.AddPathFileCommand, Runner.Worker
[2026-04-11 14:43:49Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.SetEnvFileCommand, Runner.Worker
[2026-04-11 14:43:49Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.CreateStepSummaryCommand, Runner.Worker
[2026-04-11 14:43:49Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.SaveStateFileCommand, Runner.Worker
[2026-04-11 14:43:49Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.SetOutputFileCommand, Runner.Worker
[2026-04-11 14:43:49Z INFO ActionManifestManagerLegacy] Input 'repository': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 6,
  "col": 14,
  "lit": "FPXszk/Oh-MY-TradingView"
}
[2026-04-11 14:43:49Z INFO ActionManifestManagerLegacy] Input 'ref': default value evaluate result: ""
[2026-04-11 14:43:49Z INFO ActionManifestManagerLegacy] Input 'token': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 24,
  "col": 14,
  "lit": "***"
}
[2026-04-11 14:43:49Z INFO ActionManifestManagerLegacy] Input 'ssh-key': default value evaluate result: ""
[2026-04-11 14:43:49Z INFO ActionManifestManagerLegacy] Input 'ssh-known-hosts': default value evaluate result: ""
[2026-04-11 14:43:49Z INFO ActionManifestManagerLegacy] Input 'ssh-strict': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 47,
  "col": 14,
  "lit": "true"
}
[2026-04-11 14:43:49Z INFO ActionManifestManagerLegacy] Input 'ssh-user': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 51,
  "col": 14,
  "lit": "git"
}
[2026-04-11 14:43:49Z INFO ActionManifestManagerLegacy] Input 'persist-credentials': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 54,
  "col": 14,
  "lit": "true"
}
[2026-04-11 14:43:49Z INFO ActionManifestManagerLegacy] Input 'path': default value evaluate result: ""
[2026-04-11 14:43:49Z INFO ActionManifestManagerLegacy] Input 'filter': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 64,
  "col": 14,
  "lit": ""
}
[2026-04-11 14:43:49Z INFO ActionManifestManagerLegacy] Input 'sparse-checkout': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 69,
  "col": 14,
  "lit": ""
}
[2026-04-11 14:43:49Z INFO ActionManifestManagerLegacy] Input 'sparse-checkout-cone-mode': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 73,
  "col": 14,
  "lit": "true"
}
[2026-04-11 14:43:49Z INFO ActionManifestManagerLegacy] Input 'fetch-depth': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 76,
  "col": 14,
  "lit": "1"
}
[2026-04-11 14:43:49Z INFO ActionManifestManagerLegacy] Input 'fetch-tags': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 79,
  "col": 14,
  "lit": "false"
}
[2026-04-11 14:43:49Z INFO ActionManifestManagerLegacy] Input 'show-progress': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 82,
  "col": 14,
  "lit": "true"
}
[2026-04-11 14:43:49Z INFO ActionManifestManagerLegacy] Input 'lfs': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 85,
  "col": 14,
  "lit": "false"
}
[2026-04-11 14:43:49Z INFO ActionManifestManagerLegacy] Input 'submodules': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 94,
  "col": 14,
  "lit": "false"
}
[2026-04-11 14:43:49Z INFO ActionManifestManagerLegacy] Input 'set-safe-directory': default value evaluate result: {
  "type": 0,
  "file": 2,
  "line": 97,
  "col": 14,
  "lit": "true"
}
[2026-04-11 14:43:49Z INFO ActionManifestManagerLegacy] Input 'github-server-url': default value evaluate result: ""
[2026-04-11 14:43:49Z INFO ExtensionManager] Getting extensions for interface: 'GitHub.Runner.Worker.IActionCommandExtension'
[2026-04-11 14:43:49Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.InternalPluginSetRepoPathCommandExtension, Runner.Worker
[2026-04-11 14:43:49Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.SetEnvCommandExtension, Runner.Worker
[2026-04-11 14:43:49Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.SetOutputCommandExtension, Runner.Worker
[2026-04-11 14:43:49Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.SaveStateCommandExtension, Runner.Worker
[2026-04-11 14:43:49Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.AddPathCommandExtension, Runner.Worker
[2026-04-11 14:43:49Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.AddMaskCommandExtension, Runner.Worker
[2026-04-11 14:43:49Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.AddMatcherCommandExtension, Runner.Worker
[2026-04-11 14:43:49Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.RemoveMatcherCommandExtension, Runner.Worker
[2026-04-11 14:43:49Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.WarningCommandExtension, Runner.Worker
[2026-04-11 14:43:49Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.ErrorCommandExtension, Runner.Worker
[2026-04-11 14:43:49Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.NoticeCommandExtension, Runner.Worker
[2026-04-11 14:43:49Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.DebugCommandExtension, Runner.Worker
[2026-04-11 14:43:49Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.GroupCommandExtension, Runner.Worker
[2026-04-11 14:43:49Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.EndGroupCommandExtension, Runner.Worker
[2026-04-11 14:43:49Z INFO ExtensionManager] Creating instance: GitHub.Runner.Worker.EchoCommandExtension, Runner.Worker
[2026-04-11 14:43:49Z INFO ActionCommandManager] Register action command extension for command internal-set-repo-path
[2026-04-11 14:43:49Z INFO ActionCommandManager] Register action command extension for command set-env
[2026-04-11 14:43:49Z INFO ActionCommandManager] Register action command extension for command set-output
[2026-04-11 14:43:49Z INFO ActionCommandManager] Register action command extension for command save-state
[2026-04-11 14:43:49Z INFO ActionCommandManager] Register action command extension for command add-path
[2026-04-11 14:43:49Z INFO ActionCommandManager] Register action command extension for command add-mask
[2026-04-11 14:43:49Z INFO ActionCommandManager] Register action command extension for command add-matcher
[2026-04-11 14:43:49Z INFO ActionCommandManager] Register action command extension for command remove-matcher
[2026-04-11 14:43:49Z INFO ActionCommandManager] Register action command extension for command warning
[2026-04-11 14:43:49Z INFO ActionCommandManager] Register action command extension for command error
[2026-04-11 14:43:49Z INFO ActionCommandManager] Register action command extension for command notice
[2026-04-11 14:43:49Z INFO ActionCommandManager] Register action command extension for command debug
[2026-04-11 14:43:49Z INFO ActionCommandManager] Register action command extension for command group
[2026-04-11 14:43:49Z INFO ActionCommandManager] Register action command extension for command endgroup
[2026-04-11 14:43:49Z INFO ActionCommandManager] Register action command extension for command echo
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:49Z INFO HostContext] Well known directory 'Externals': 'C:\actions-runner\externals'
[2026-04-11 14:43:49Z INFO ProcessInvokerWrapper] Starting process:
[2026-04-11 14:43:49Z INFO ProcessInvokerWrapper]   File name: 'C:\actions-runner\externals\node20\bin\node.exe'
[2026-04-11 14:43:49Z INFO ProcessInvokerWrapper]   Arguments: '"C:\actions-runner\_work\_actions\actions\checkout\v4\dist/index.js"'
[2026-04-11 14:43:49Z INFO ProcessInvokerWrapper]   Working directory: 'C:\actions-runner\_work\Oh-MY-TradingView\Oh-MY-TradingView'
[2026-04-11 14:43:49Z INFO ProcessInvokerWrapper]   Require exit code zero: 'False'
[2026-04-11 14:43:49Z INFO ProcessInvokerWrapper]   Encoding web name: utf-8 ; code page: '65001'
[2026-04-11 14:43:49Z INFO ProcessInvokerWrapper]   Force kill process on cancellation: 'False'
[2026-04-11 14:43:49Z INFO ProcessInvokerWrapper]   Redirected STDIN: 'False'
[2026-04-11 14:43:49Z INFO ProcessInvokerWrapper]   Persist current code page: 'True'
[2026-04-11 14:43:49Z INFO ProcessInvokerWrapper]   Keep redirected STDIN open: 'False'
[2026-04-11 14:43:49Z INFO ProcessInvokerWrapper]   High priority process: 'False'
[2026-04-11 14:43:49Z INFO ProcessInvokerWrapper] Process started with process id 4980, waiting for process exit.
[2026-04-11 14:43:50Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'c94aa1a5-14cf-4b9c-8e53-c1293d6fe29b', success rate: 1/1.
[2026-04-11 14:43:50Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'e84f023f-200d-468c-a40d-a97596112ea9', success rate: 1/1.
[2026-04-11 14:43:50Z INFO JobServerQueue] Got a step log file to send to results service.
[2026-04-11 14:43:50Z INFO JobServerQueue] Starting upload of step log file to results service ResultsLog, C:\actions-runner\_diag\blocks\2d31777a-5a08-418a-99cf-95b2c873149c_c94aa1a5-14cf-4b9c-8e53-c1293d6fe29b.1
[2026-04-11 14:43:50Z INFO JobServerQueue] Try to upload 1 log files or attachments, success rate: 1/1.
[2026-04-11 14:43:50Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'e84f023f-200d-468c-a40d-a97596112ea9', success rate: 1/1.
[2026-04-11 14:43:50Z INFO AddMaskCommandExtension] Add new secret mask with length of 76
[2026-04-11 14:43:50Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'e84f023f-200d-468c-a40d-a97596112ea9', success rate: 1/1.
[2026-04-11 14:43:51Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'e84f023f-200d-468c-a40d-a97596112ea9', success rate: 1/1.
[2026-04-11 14:43:51Z INFO JobServerQueue] Tried to upload 1 file(s) to results, success rate: 1/1.
[2026-04-11 14:43:51Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'e84f023f-200d-468c-a40d-a97596112ea9', success rate: 1/1.
[2026-04-11 14:43:51Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'e84f023f-200d-468c-a40d-a97596112ea9', success rate: 1/1.
[2026-04-11 14:43:52Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'e84f023f-200d-468c-a40d-a97596112ea9', success rate: 1/1.
[2026-04-11 14:43:52Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'e84f023f-200d-468c-a40d-a97596112ea9', success rate: 1/1.
[2026-04-11 14:43:53Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'e84f023f-200d-468c-a40d-a97596112ea9', success rate: 1/1.
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper] Finished process 4980 with exit code 0, and elapsed time 00:00:03.3374650.
[2026-04-11 14:43:53Z INFO CreateStepSummaryCommand] Step Summary file (C:\actions-runner\_work\_temp\_runner_file_commands\step_summary_6d407f0b-4816-4073-9485-74e025e0e608) is empty; skipping attachment upload
[2026-04-11 14:43:53Z INFO StepsRunner] Step result:
[2026-04-11 14:43:53Z INFO ExecutionContext] Publish step telemetry for current step {
  "action": "actions/checkout",
  "ref": "v4",
  "type": "node20",
  "stage": "Main",
  "stepId": "e84f023f-200d-468c-a40d-a97596112ea9",
  "stepContextName": "__actions_checkout",
  "hasPreStep": false,
  "hasPostStep": true,
  "result": "succeeded",
  "errorMessages": [],
  "executionTimeInSeconds": 4,
  "startTime": "2026-04-11T14:43:49.8673463Z",
  "finishTime": "2026-04-11T14:43:53.2843066Z"
}.
[2026-04-11 14:43:53Z INFO StepsRunner] No need for updating job result with current step result 'Succeeded'.
[2026-04-11 14:43:53Z INFO StepsRunner] Current state: job state = ''
[2026-04-11 14:43:53Z INFO StepsRunner] Processing step: DisplayName='Evaluate schedule freshness'
[2026-04-11 14:43:53Z INFO StepsRunner] Evaluating: success()
[2026-04-11 14:43:53Z INFO StepsRunner] Result: true
[2026-04-11 14:43:53Z INFO StepsRunner] Starting the step.
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:53Z INFO StepsRunner] Which2: 'chcp'
[2026-04-11 14:43:53Z INFO StepsRunner] Location: 'C:\Windows\system32\chcp.COM'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper] Starting process:
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   File name: 'C:\Windows\system32\chcp.COM'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Arguments: '65001'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Working directory: 'C:\actions-runner\_work'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Require exit code zero: 'False'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Encoding web name:  ; code page: ''
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Force kill process on cancellation: 'False'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Redirected STDIN: 'False'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Persist current code page: 'True'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Keep redirected STDIN open: 'False'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   High priority process: 'False'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper] Process started with process id 16564, waiting for process exit.
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper] Finished process 16564 with exit code 0, and elapsed time 00:00:00.0061942.
[2026-04-11 14:43:53Z INFO StepsRunner] Successfully returned to code page 65001 (UTF8)
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-11 14:43:53Z INFO ExecutionContext] Write event payload to C:\actions-runner\_work\_temp\_github_workflow\event.json
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-11 14:43:53Z INFO ExtensionManager] Getting extensions for interface: 'GitHub.Runner.Worker.IFileCommandExtension'
[2026-04-11 14:43:53Z INFO ExtensionManager] Getting extensions for interface: 'GitHub.Runner.Worker.IActionCommandExtension'
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command internal-set-repo-path
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command set-env
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command set-output
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command save-state
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command add-path
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command add-mask
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command add-matcher
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command remove-matcher
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command warning
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command error
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command notice
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command debug
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command group
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command endgroup
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command echo
[2026-04-11 14:43:53Z INFO ScriptHandler] Which2: 'powershell'
[2026-04-11 14:43:53Z INFO ScriptHandler] Location: 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.EXE'
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-11 14:43:53Z INFO ScriptHandler] Which2: 'powershell'
[2026-04-11 14:43:53Z INFO ScriptHandler] Location: 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.EXE'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper] Starting process:
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   File name: 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.EXE'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Arguments: '-NoProfile -ExecutionPolicy Bypass -command ". 'C:\actions-runner\_work\_temp\dfe8e4ba-0e13-46a1-b719-92362aef29a6.ps1'"'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Working directory: 'C:\actions-runner\_work\Oh-MY-TradingView\Oh-MY-TradingView'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Require exit code zero: 'False'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Encoding web name:  ; code page: ''
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Force kill process on cancellation: 'False'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Redirected STDIN: 'False'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Persist current code page: 'True'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Keep redirected STDIN open: 'False'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   High priority process: 'False'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper] Process started with process id 8692, waiting for process exit.
[2026-04-11 14:43:53Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'e84f023f-200d-468c-a40d-a97596112ea9', success rate: 1/1.
[2026-04-11 14:43:53Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'fee79f78-5a76-403c-bb6f-f1868e65ea4e', success rate: 1/1.
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper] Finished process 8692 with exit code 0, and elapsed time 00:00:00.2241909.
[2026-04-11 14:43:53Z INFO CreateStepSummaryCommand] Step Summary file (C:\actions-runner\_work\_temp\_runner_file_commands\step_summary_d1c58692-5804-4e1a-ac72-ffaa62579d1f) is empty; skipping attachment upload
[2026-04-11 14:43:53Z INFO StepsRunner] Step result:
[2026-04-11 14:43:53Z INFO ExecutionContext] Publish step telemetry for current step {
  "action": "powershell",
  "type": "run",
  "stage": "Main",
  "stepId": "fee79f78-5a76-403c-bb6f-f1868e65ea4e",
  "stepContextName": "freshness",
  "result": "succeeded",
  "errorMessages": [],
  "executionTimeInSeconds": 1,
  "startTime": "2026-04-11T14:43:53.2849774Z",
  "finishTime": "2026-04-11T14:43:53.530138Z"
}.
[2026-04-11 14:43:53Z INFO StepsRunner] No need for updating job result with current step result 'Succeeded'.
[2026-04-11 14:43:53Z INFO StepsRunner] Current state: job state = ''
[2026-04-11 14:43:53Z INFO StepsRunner] Processing step: DisplayName='Install dependencies in WSL workspace'
[2026-04-11 14:43:53Z INFO StepsRunner] Evaluating: (success() && (steps.freshness.outputs.should_run == 'true'))
[2026-04-11 14:43:53Z INFO StepsRunner] Expanded: (true && ('true' == 'true'))
[2026-04-11 14:43:53Z INFO StepsRunner] Result: true
[2026-04-11 14:43:53Z INFO StepsRunner] Starting the step.
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:53Z INFO StepsRunner] Which2: 'chcp'
[2026-04-11 14:43:53Z INFO StepsRunner] Location: 'C:\Windows\system32\chcp.COM'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper] Starting process:
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   File name: 'C:\Windows\system32\chcp.COM'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Arguments: '65001'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Working directory: 'C:\actions-runner\_work'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Require exit code zero: 'False'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Encoding web name:  ; code page: ''
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Force kill process on cancellation: 'False'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Redirected STDIN: 'False'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Persist current code page: 'True'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Keep redirected STDIN open: 'False'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   High priority process: 'False'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper] Process started with process id 10988, waiting for process exit.
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper] Finished process 10988 with exit code 0, and elapsed time 00:00:00.0064428.
[2026-04-11 14:43:53Z INFO StepsRunner] Successfully returned to code page 65001 (UTF8)
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-11 14:43:53Z INFO ExecutionContext] Write event payload to C:\actions-runner\_work\_temp\_github_workflow\event.json
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-11 14:43:53Z INFO ExtensionManager] Getting extensions for interface: 'GitHub.Runner.Worker.IFileCommandExtension'
[2026-04-11 14:43:53Z INFO ExtensionManager] Getting extensions for interface: 'GitHub.Runner.Worker.IActionCommandExtension'
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command internal-set-repo-path
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command set-env
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command set-output
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command save-state
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command add-path
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command add-mask
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command add-matcher
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command remove-matcher
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command warning
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command error
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command notice
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command debug
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command group
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command endgroup
[2026-04-11 14:43:53Z INFO ActionCommandManager] Register action command extension for command echo
[2026-04-11 14:43:53Z INFO ScriptHandler] Which2: 'cmd'
[2026-04-11 14:43:53Z INFO ScriptHandler] Location: 'C:\Windows\system32\cmd.EXE'
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:43:53Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-11 14:43:53Z INFO ScriptHandler] Which2: 'cmd'
[2026-04-11 14:43:53Z INFO ScriptHandler] Location: 'C:\Windows\system32\cmd.EXE'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper] Starting process:
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   File name: 'C:\Windows\system32\cmd.EXE'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Arguments: '/D /E:ON /V:OFF /S /C "CALL "C:\actions-runner\_work\_temp\b4b3fe4c-abca-42eb-a75d-c792ffc96d18.cmd""'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Working directory: 'C:\actions-runner\_work\Oh-MY-TradingView\Oh-MY-TradingView'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Require exit code zero: 'False'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Encoding web name:  ; code page: ''
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Force kill process on cancellation: 'False'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Redirected STDIN: 'False'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Persist current code page: 'True'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   Keep redirected STDIN open: 'False'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper]   High priority process: 'False'
[2026-04-11 14:43:53Z INFO ProcessInvokerWrapper] Process started with process id 8528, waiting for process exit.
[2026-04-11 14:43:53Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'ee18cf64-9f73-485a-ad5c-01b0ae20d09c', success rate: 1/1.
[2026-04-11 14:43:54Z INFO JobServerQueue] Try to upload 2 log files or attachments, success rate: 2/2.
[2026-04-11 14:43:54Z INFO JobServerQueue] Got a step log file to send to results service.
[2026-04-11 14:43:54Z INFO JobServerQueue] Starting upload of step log file to results service ResultsLog, C:\actions-runner\_diag\blocks\2d31777a-5a08-418a-99cf-95b2c873149c_e84f023f-200d-468c-a40d-a97596112ea9.1
[2026-04-11 14:43:54Z INFO JobServerQueue] Got a step log file to send to results service.
[2026-04-11 14:43:54Z INFO JobServerQueue] Starting upload of step log file to results service ResultsLog, C:\actions-runner\_diag\blocks\2d31777a-5a08-418a-99cf-95b2c873149c_fee79f78-5a76-403c-bb6f-f1868e65ea4e.1
[2026-04-11 14:43:55Z INFO JobServerQueue] Tried to upload 2 file(s) to results, success rate: 2/2.
[2026-04-11 14:43:59Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:43:59Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:43:59Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper] Finished process 8528 with exit code 0, and elapsed time 00:00:14.5707445.
[2026-04-11 14:44:08Z INFO CreateStepSummaryCommand] Step Summary file (C:\actions-runner\_work\_temp\_runner_file_commands\step_summary_da3a197c-63f7-4639-bf7c-2ab67d933ca0) is empty; skipping attachment upload
[2026-04-11 14:44:08Z INFO StepsRunner] Step result:
[2026-04-11 14:44:08Z INFO ExecutionContext] Publish step telemetry for current step {
  "action": "cmd",
  "type": "run",
  "stage": "Main",
  "stepId": "ee18cf64-9f73-485a-ad5c-01b0ae20d09c",
  "stepContextName": "__run",
  "result": "succeeded",
  "errorMessages": [],
  "executionTimeInSeconds": 15,
  "startTime": "2026-04-11T14:43:53.5308781Z",
  "finishTime": "2026-04-11T14:44:08.1418129Z"
}.
[2026-04-11 14:44:08Z INFO StepsRunner] No need for updating job result with current step result 'Succeeded'.
[2026-04-11 14:44:08Z INFO StepsRunner] Current state: job state = ''
[2026-04-11 14:44:08Z INFO StepsRunner] Processing step: DisplayName='Run smoke gate and foreground production'
[2026-04-11 14:44:08Z INFO StepsRunner] Evaluating: (success() && (steps.freshness.outputs.should_run == 'true'))
[2026-04-11 14:44:08Z INFO StepsRunner] Expanded: (true && ('true' == 'true'))
[2026-04-11 14:44:08Z INFO StepsRunner] Result: true
[2026-04-11 14:44:08Z INFO StepsRunner] Starting the step.
[2026-04-11 14:44:08Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:44:08Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:44:08Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:44:08Z INFO StepsRunner] Which2: 'chcp'
[2026-04-11 14:44:08Z INFO StepsRunner] Location: 'C:\Windows\system32\chcp.COM'
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper] Starting process:
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper]   File name: 'C:\Windows\system32\chcp.COM'
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper]   Arguments: '65001'
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper]   Working directory: 'C:\actions-runner\_work'
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper]   Require exit code zero: 'False'
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper]   Encoding web name:  ; code page: ''
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper]   Force kill process on cancellation: 'False'
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper]   Redirected STDIN: 'False'
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper]   Persist current code page: 'True'
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper]   Keep redirected STDIN open: 'False'
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper]   High priority process: 'False'
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper] Process started with process id 1936, waiting for process exit.
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper] STDOUT/STDERR stream read finished.
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper] Finished process 1936 with exit code 0, and elapsed time 00:00:00.0057320.
[2026-04-11 14:44:08Z INFO StepsRunner] Successfully returned to code page 65001 (UTF8)
[2026-04-11 14:44:08Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:44:08Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:44:08Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:44:08Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-11 14:44:08Z INFO ExecutionContext] Write event payload to C:\actions-runner\_work\_temp\_github_workflow\event.json
[2026-04-11 14:44:08Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:44:08Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:44:08Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:44:08Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-11 14:44:08Z INFO ExtensionManager] Getting extensions for interface: 'GitHub.Runner.Worker.IFileCommandExtension'
[2026-04-11 14:44:08Z INFO ExtensionManager] Getting extensions for interface: 'GitHub.Runner.Worker.IActionCommandExtension'
[2026-04-11 14:44:08Z INFO ActionCommandManager] Register action command extension for command internal-set-repo-path
[2026-04-11 14:44:08Z INFO ActionCommandManager] Register action command extension for command set-env
[2026-04-11 14:44:08Z INFO ActionCommandManager] Register action command extension for command set-output
[2026-04-11 14:44:08Z INFO ActionCommandManager] Register action command extension for command save-state
[2026-04-11 14:44:08Z INFO ActionCommandManager] Register action command extension for command add-path
[2026-04-11 14:44:08Z INFO ActionCommandManager] Register action command extension for command add-mask
[2026-04-11 14:44:08Z INFO ActionCommandManager] Register action command extension for command add-matcher
[2026-04-11 14:44:08Z INFO ActionCommandManager] Register action command extension for command remove-matcher
[2026-04-11 14:44:08Z INFO ActionCommandManager] Register action command extension for command warning
[2026-04-11 14:44:08Z INFO ActionCommandManager] Register action command extension for command error
[2026-04-11 14:44:08Z INFO ActionCommandManager] Register action command extension for command notice
[2026-04-11 14:44:08Z INFO ActionCommandManager] Register action command extension for command debug
[2026-04-11 14:44:08Z INFO ActionCommandManager] Register action command extension for command group
[2026-04-11 14:44:08Z INFO ActionCommandManager] Register action command extension for command endgroup
[2026-04-11 14:44:08Z INFO ActionCommandManager] Register action command extension for command echo
[2026-04-11 14:44:08Z INFO ScriptHandler] Which2: 'cmd'
[2026-04-11 14:44:08Z INFO ScriptHandler] Location: 'C:\Windows\system32\cmd.EXE'
[2026-04-11 14:44:08Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:44:08Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:44:08Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:44:08Z INFO HostContext] Well known directory 'Temp': 'C:\actions-runner\_work\_temp'
[2026-04-11 14:44:08Z INFO ScriptHandler] Which2: 'cmd'
[2026-04-11 14:44:08Z INFO ScriptHandler] Location: 'C:\Windows\system32\cmd.EXE'
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper] Starting process:
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper]   File name: 'C:\Windows\system32\cmd.EXE'
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper]   Arguments: '/D /E:ON /V:OFF /S /C "CALL "C:\actions-runner\_work\_temp\d27fc848-4641-4b9a-8e1d-167c5a71c8d8.cmd""'
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper]   Working directory: 'C:\actions-runner\_work\Oh-MY-TradingView\Oh-MY-TradingView'
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper]   Require exit code zero: 'False'
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper]   Encoding web name:  ; code page: ''
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper]   Force kill process on cancellation: 'False'
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper]   Redirected STDIN: 'False'
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper]   Persist current code page: 'True'
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper]   Keep redirected STDIN open: 'False'
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper]   High priority process: 'False'
[2026-04-11 14:44:08Z INFO ProcessInvokerWrapper] Process started with process id 20924, waiting for process exit.
[2026-04-11 14:44:08Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'cd608d22-ef99-4c51-ae7c-4b312c4abedd', success rate: 1/1.
[2026-04-11 14:44:08Z INFO JobServerQueue] Try to upload 1 log files or attachments, success rate: 1/1.
[2026-04-11 14:44:08Z INFO JobServerQueue] Got a step log file to send to results service.
[2026-04-11 14:44:08Z INFO JobServerQueue] Starting upload of step log file to results service ResultsLog, C:\actions-runner\_diag\blocks\2d31777a-5a08-418a-99cf-95b2c873149c_ee18cf64-9f73-485a-ad5c-01b0ae20d09c.1
[2026-04-11 14:44:09Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'cd608d22-ef99-4c51-ae7c-4b312c4abedd', success rate: 1/1.
[2026-04-11 14:44:09Z INFO JobServerQueue] Tried to upload 1 file(s) to results, success rate: 1/1.
[2026-04-11 14:44:09Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:44:09Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:44:09Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:44:13Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'cd608d22-ef99-4c51-ae7c-4b312c4abedd', success rate: 1/1.
[2026-04-11 14:44:16Z INFO JobServerQueue] Try to append 1 batches web console lines for record 'cd608d22-ef99-4c51-ae7c-4b312c4abedd', success rate: 1/1.
[2026-04-11 14:44:19Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:44:19Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:44:19Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:44:29Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:44:29Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:44:29Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:44:39Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:44:39Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:44:39Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:44:49Z INFO JobServerQueue] Stop aggressive process web console line queue.
[2026-04-11 14:44:49Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:44:49Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:44:49Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
[2026-04-11 14:44:59Z INFO HostContext] Well known directory 'Bin': 'C:\actions-runner\bin'
[2026-04-11 14:44:59Z INFO HostContext] Well known directory 'Root': 'C:\actions-runner'
[2026-04-11 14:44:59Z INFO HostContext] Well known directory 'Work': 'C:\actions-runner\_work'
PS C:\actions-runner\_work\Oh-MY-TradingView\Oh-MY-TradingView> wsl -l -v
  NAME      STATE           VERSION
* Ubuntu    Running         2













---
026-04-11 14:43:46Z: Running job: start-night-batch
PS C:\actions-runner\_work\Oh-MY-TradingView\Oh-MY-TradingView> schtasks /Query /TN "OhMyTradingViewRunnerAutostart" /V /FO LIST

フォルダー\
ホスト名:                                       DESKTOP-995HK1T
タスク名:                                       \OhMyTradingViewRunnerAutostart
次回の実行時刻:                                 N/A
状態:                                           実行中
ログオン モード:                                対話型のみ
前回の実行時刻:                                 2026/04/11 23:43:37
前回の結果:                                     267009
作成者:                                         DESKTOP-995HK1T\szk
実行するタスク:                                 C:\ACTION~1\_diag\RUNNER~1.CMD
開始:                                           N/A
コメント:                                       N/A
スケジュールされたタスクの状態:                 有効
アイドル時間:                                   無効
電源管理:                                       バッテリ モードで停止, バッテリで開始しない
ユーザーとして実行:                             szk
再度スケジュールされない場合はタスクを削除する: 無効
タスクを停止するまでの時間:                     72:00:00
スケジュール:                                   スケジュール データをこの形式で使用することはできません。
スケジュールの種類:                             ログオン時
開始時刻:                                       N/A
開始日:                                         N/A
終了日:                                         N/A
日:                                             N/A
月:                                             N/A
繰り返し: 間隔:                                 N/A
繰り返し: 終了時刻:                             N/A
繰り返し: 期間:                                 N/A
繰り返し: 実行中の場合は停止:                   N/A
PS C:\actions-runner\_work\Oh-MY-TradingView\Oh-MY-TradingView> Get-Content C:\actions-runner\_diag\runner-autostart.log -Tail 100
[bootstrap] Ensuring git safe.directory for C:/actions-runner/_work/Oh-MY-TradingView/Oh-MY-TradingView ...
[bootstrap] git safe.directory added.
[bootstrap] Prerequisites OK.
[runner-wrapper] Starting runner from C:\actions-runner\run.cmd ...
        1 個のファイルをコピーしました。

√ Connected to GitHub

Current runner version: '2.333.1'
2026-04-11 14:43:42Z: Listening for Jobs
2026-04-11 14:43:46Z: Running job: start-night-batch
PS C:\actions-runner\_work\Oh-MY-TradingView\Oh-MY-TradingView>
