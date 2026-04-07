# Session log: backtest unreadable reliability

## Goal

- `src/core/backtest.js` の category-aware retry 変更が、実機でどう効くかを確認する
- TradingView 再起動後の fresh 状態から worker 起動、status、single / parallel backtest を取り直す

## Startup

1. Windows 側で `cmd /c start` を使い、worker1 `9222` / worker2 `9224` を再起動した
2. portproxy は `9223 -> 9222`, `9225 -> 9224` のまま維持されていた
3. WSL の route は `default via 172.31.144.1` で、今回も gateway 経由で到達できた

## Status check

- worker1: `status.success: true`, `chart_symbol: BATS:AAPL`
- worker2: `status.success: true`, `chart_symbol: BATS:XOM`

## Live measurements

### cold single

1. worker1
   - command: `tv backtest preset ema-cross-9-21 --symbol NVDA`
   - result: success
   - `tester_available: true`
   - elapsed: `20.82s`
2. worker2
   - command: `tv backtest preset rsi-mean-reversion --symbol NVDA`
   - result: `apply_failed: true`
   - elapsed: `17.33s`

### warmed single rerun

1. worker1
   - result: success
   - elapsed: `10.06s`
2. worker2
   - result: success
   - elapsed: `10.11s`

### warmed parallel

1. worker1 `ema-cross-9-21`
   - result: success
   - elapsed: `30.68s`
2. worker2 `rsi-mean-reversion`
   - result: `tester_reason_category: "metrics_unreadable"`
   - elapsed: `35.55s`

### additional parallel observation

- 別 parallel run で worker1 も `metrics_unreadable` を再現した
- elapsed: `35.47s`

## Interpretation

- 第1弾の後、`metrics_unreadable` 専用 retry budget を短縮する change を追加した
- そのレビューで `panel_not_visible` の runtime wait budget を縮めすぎる恐れが見つかったため、そこは従来同等に戻した
- つまり最終形は、**shorten 対象を `metrics_unreadable` に限定し、`panel_not_visible` は守る** 方針になった

## Next implication

次の改善は、`metrics_unreadable` に対して次を検討するのが自然。

1. retry 回数 / 待機時間の adaptive 化
2. `fallback_metrics` を使った degraded success 判定
3. long-running batch では checkpoint 境界でのみ rerun 対象化

## Follow-up: metrics retry budget shortened

### 実装

- `metrics_unreadable` だけ追加 retry budget を短縮した
- 初回の 2.5 秒待機は維持し、その後の unreadable follow-up retry を短い delay 列へ切り出した
- review で `panel_not_visible` の runtime wait budget を縮めすぎる恐れが見つかったため、そこは従来同等へ戻した

### fresh restart 後の再計測

1. single
   - worker1 cold success: `20.67s`
   - worker2 cold success: `20.89s`
   - worker1 rerun success: `20.39s`
   - worker2 rerun success: `20.39s`
2. parallel
   - worker1 `metrics_unreadable`: `28.05s`
   - worker2 success: `20.48s`

### before / after

- before `metrics_unreadable`: `35.47s`, `35.55s`
- after `metrics_unreadable`: `28.05s`
- improvement: **約 7.4〜7.5 秒短縮**

### interpretation

- `metrics_unreadable` failure-side の wall-clock は縮んだ
- ただし single success 側は今回 20 秒台で、前回の 10 秒台 rerun より遅く、TradingView 側の揺れが残る
- 次に効かせるなら degraded success / fallback_metrics 判定の整理が有力

## Follow-up: fallback contract hardening

### 実装

- `attachFallbackMetrics()` を追加し、result への fallback 付与を共通化した
- `metrics_unreadable` かつ fallback 取得成功時は
  - `degraded_result: true`
  - `rerun_recommended: false`
  を返す contract を追加した
- `metrics_unreadable` かつ fallback 不可時のみ `rerun_recommended: true` とした
- review で、`runLocalFallbackBacktest()` は **NVDA MA 固定ロジック**であり preset に流用すると別戦略の値を返してしまうと分かった
- そのため最終形では、**strategy-aware fallback がある経路だけ fallback を返し、preset 側は `rerun_recommended: true` のみ返す** 形へ修正した

### live verification

1. preset worker1 warmup `ema-cross-9-21`
   - elapsed: `17.90s`
   - result: `tester_reason_category: "metrics_unreadable"`
   - `rerun_recommended: true`
   - `fallback_metrics` なし
2. preset worker1 rerun `ema-cross-9-21`
   - elapsed: `30.94s`
   - result: success
3. preset parallel
   - worker1: success / `20.56s`
   - worker2: success
4. worker2 warmup `rsi-mean-reversion`
   - elapsed: `20.57s`
   - result: success
5. live e2e
   - `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 npm run test:e2e`
   - success

### interpretation

- 目的は途中で修正され、最終的には **preset 経路に誤 fallback を載せない** ことが正しいと分かった
- そのうえで live では、preset `metrics_unreadable` が `rerun_recommended: true` のみ返すことを確認できた
- 今回の変更は failure-side の秒数をさらに大きく縮めたわけではない
- ただし **rerun の必要条件を誤解なく示す改善** としては有効で、degraded success を返してよい範囲を明確にできた
