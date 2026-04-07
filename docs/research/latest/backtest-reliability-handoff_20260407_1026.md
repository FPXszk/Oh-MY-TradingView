# Backtest reliability handoff

- status: ACTIVE
- latest docs entrypoint: `docs/research/latest/README.md`
- focus: unreadable による待機時間と rerun コストの削減

## 前回までの到達点

1. dual-worker / 2 worker parallel は warmed state で安定化していた
2. known-good 条件は `restore_policy: "skip"`、Strategy Tester `指標` タブ活性化、warm-up 成功の確認
3. latest result の採用は raw summary ではなく recovered summary を優先する運用に寄せていた

## いまの主要な未解決

1. fresh / cold start 直後の再現性
2. 長時間 batch における `metrics_unreadable` と rerun コスト
3. `fallback_metrics` が返るケースと、真に rerun が必要なケースの切り分け

## 今回の改善パス 1

`src/core/backtest.js` の tester read retry を見直し、次の方針へ寄せた。

1. `panel_not_visible` は full retry budget を使い切らず早期終了する
2. `no_strategy_applied` は引き続き即打ち切る
3. `metrics_unreadable` だけを再試行継続対象に残す

その後のレビュー反映で、runtime 上は `panel_not_visible` の可視化待機予算を従来同等に戻し、**短縮対象を `metrics_unreadable` に限定**した。  
これにより、遅延表示の recoverable case を落としにくくしつつ、parallel 時の unreadable 滞留だけを削る構成になっている。

## 2026-04-07 実機確認結果

TradingView 再起動後に worker1 / worker2 を起動し直し、WSL から `172.31.144.1:9223` / `172.31.144.1:9225` で再接続して検証した。

### 起動と疎通

- worker1 `9222` / worker2 `9224` は Windows localhost で疎通した
- WSL 側の gateway は今回も `172.31.144.1` だった
- status は worker1 / worker2 とも success

### cold / rerun / parallel の結果

1. cold single
   - worker1 `ema-cross-9-21`: success, `tester_available: true`, `20.82s`
   - worker2 `rsi-mean-reversion`: `apply_failed: true`, `17.33s`
2. warmed single rerun
   - worker1 `ema-cross-9-21`: success, `10.06s`
   - worker2 `rsi-mean-reversion`: success, `10.11s`
3. warmed parallel
   - worker1 `ema-cross-9-21`: success, `30.68s`
   - worker2 `rsi-mean-reversion`: `tester_reason_category: "metrics_unreadable"`, `35.55s`
4. 別 parallel run でも worker1 が `metrics_unreadable` を再現し、`35.47s` だった

### 結論

- 今回の第1弾改善で **`panel_not_visible` / `no_strategy_applied` に対する無駄待機削減の下地** は入った
- ただし今回の実機で壁になったのは主に **`metrics_unreadable`** で、observed wall-clock の支配要因はこちらだった
- つまり、**今回の変更は有害ではなく、single rerun の success も維持できたが、実測上の遅さの本丸はまだ残っている**
- 次に効かせるべきは `metrics_unreadable` の retry / fallback / degraded result 判定である

## 2026-04-07 metrics retry budget 追加後の実機結果

`metrics_unreadable` 専用 retry budget を短縮した後、fresh restart から再計測した。

### single

- worker1 cold: success / `20.67s`
- worker2 cold: success / `20.89s`
- worker1 rerun: success / `20.39s`
- worker2 rerun: success / `20.39s`

### parallel

- worker1: `metrics_unreadable` / `28.05s`
- worker2: success / `20.48s`

### before / after 比較

- before: `metrics_unreadable` は `35.47s`, `35.55s`
- after: `metrics_unreadable` は `28.05s`
- 差分: **約 7.4〜7.5 秒短縮**

### 読み方

- 今回の短縮は、`metrics_unreadable` 失敗時の無駄待機を削った効果として説明しやすい
- 一方で single success は今回は 20 秒台で、前回の 10 秒台 warm rerun より遅かったため、single 側の wall-clock は chart state / TradingView 側の揺れも大きい
- したがって、**今回の改善は failure-side の短縮には効いたが、全体最適にはまだ追加の改善余地がある**

## 2026-04-07 fallback contract 整理 + 実機確認

`metrics_unreadable` の retry 短縮後、次フェーズとして **strategy-aware fallback がある経路だけ** degraded success を返す contract を整理した。

### 最終 contract

1. NVDA MA のように strategy-aware な local fallback がある経路
   - `fallback_source: "chart_bars_local"`
   - `fallback_metrics`
   - `degraded_result: true`
   - `rerun_recommended: false`
2. preset 経路の `metrics_unreadable`
   - `rerun_recommended: true`
   - `fallback_metrics` は返さない

generic な chart bars fallback を preset に流用すると、**別戦略の成績を返してしまう** と review で分かったため、preset 側の fallback 付与は採用しなかった。

### 実機結果

1. preset worker1 warmup `ema-cross-9-21`
   - `tester_reason_category: "metrics_unreadable"`
   - `rerun_recommended: true`
   - `fallback_metrics` なし
   - `17.90s`
2. preset worker1 rerun `ema-cross-9-21`
   - success
   - `30.94s`
3. preset parallel
   - worker1 `ema-cross-9-21`: success / `20.56s`
   - worker2 `rsi-mean-reversion`: success
4. NVDA MA 系 live e2e
   - `npm run test:e2e` success
   - strategy-aware fallback contract を壊していないことを確認
5. worker2 warmup `rsi-mean-reversion`
   - success
   - `20.57s`

### 意味

- これで **preset 経路では誤った fallback を返さず、`metrics_unreadable` は rerun 候補として明示する** 形を live で確認できた
- 一方で **NVDA MA のように strategy-aware fallback がある経路だけ** は、引き続き degraded success を返せる
- 直近の wall-clock 短縮量は依然として `metrics_unreadable` retry budget 短縮の **約 7.46s / 約21.0%** が主成果
- 今回の追加価値は、**fallback を返してよい範囲と rerun が必要な範囲を result shape 上で誤解なく分けた** 点にある

## 次の入口

1. `docs/research/latest/top4-period-slicing-handoff_20260407_1641.md`
2. `docs/research/latest/top4-period-slicing-results_20260407_1641.md`
3. `command.md` の長時間 workload 指針
4. `docs/working-memory/session-logs/tradingview-parallel-backtest-stabilization_20260406_0802.md`

## 2026-04-07 websocket report fallback 実装 + 再起動後検証

retry budget 短縮と fallback contract 整理の次段として、`metrics_unreadable` 時の UI 読み取り依存をさらに減らすため、WebSocket `du` frame の report payload を fallback 候補にする実装を入れた。

### 実装

1. `src/core/backtest-report-websocket.js` を追加し、TradingView の `~m~<len>~m~...` framing を decode できるようにした
2. framed payload 内の複数 message から `du` を抽出し、`report.performance` を持つ candidate だけを拾う helper を追加した
3. `src/core/backtest.js` では `metrics_unreadable` 時のみ `websocket_report` を評価するようにし、NVDA MA 経路では既存 `chart_bars_local` を backup として残した
4. preset 経路に generic fallback は流用せず、fallback が返る場合も source は `websocket_report` のみとした

### 再起動後 live 結果

1. warm-up
   - worker1 `ema-cross-9-21`: success / `20.66s`
   - worker2 `rsi-mean-reversion`: success / `20.65s`
2. parallel attempt 1
   - worker1: success / `20.48s`
   - worker2: `metrics_unreadable` / `27.99s`
   - `fallback_source`: なし
3. parallel attempt 2
   - worker1: `metrics_unreadable` / `27.98s`
   - worker2: success / `27.98s`
   - `fallback_source`: なし

### diagnostics

1. framed payload decode 後は `du` frame 自体は観測できた
2. ただし今回の probe では `du` の中身は `sds_*` bar update だけで、`report.performance` を含む candidate は観測できなかった
3. そのため `websocket_report` fallback は live では未発火で、**現時点の speedup は未確認**

### 現在の判断

- parser / listener の framing 対応は必要だったため、コード上の前進はある
- 一方で **report-bearing frame の再現条件がまだ足りず、実測上の failure-side 短縮は証明できていない**
- 現時点の確実な改善として残るのは、引き続き `metrics_unreadable` retry budget 短縮の **約 7.46s / 約21.0%** である
