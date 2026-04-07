# Backtest websocket report fallback

- status: IMPLEMENTED / LIVE SPEEDUP UNCONFIRMED
- scope: `metrics_unreadable` 時の UI 読み取り依存を減らすため、TradingView WebSocket `du` frame の report payload を safe fallback 候補として導入

## 変更点

1. `src/core/backtest-report-websocket.js`
   - `~m~<len>~m~...` framing を decode できるようにした
   - framed payload 内の複数 JSON message から `du` を抽出できるようにした
   - `netProfit` だけでは採用せず、5 指標が揃った complete report だけを fallback 候補にするようにした
   - candidate 収集と single-session guard を pure helper 化した
2. `src/core/backtest.js`
   - WebSocket listener は raw payload を保持するように変更
   - `metrics_unreadable` 時のみ WebSocket report fallback を評価
   - NVDA MA 経路では既存 `chart_bars_local` を backup fallback として維持
   - preset 経路でも `websocket_report` のみ degraded success 候補にし、generic fallback は引き続き禁止
3. `tests/backtest.test.js`
   - framed payload parsing
   - heartbeat skip
   - candidate selection / mixed-session reject
4. `tests/e2e.backtest.test.js`
   - preset 経路で `fallback_metrics` が返る場合は `websocket_report` のみ許可する assertion を追加

## 2026-04-07 live verification

TradingView 再起動後に worker1 / worker2 を起動し直して確認した。

### warm-up

1. worker1 `ema-cross-9-21`
   - success
   - `20.66s`
2. worker2 `rsi-mean-reversion`
   - success
   - `20.65s`

### parallel after implementation

1. attempt 1
   - worker1 `ema-cross-9-21`: success / `20.48s`
   - worker2 `rsi-mean-reversion`: `metrics_unreadable` / `27.99s`
   - `fallback_source`: なし
   - `rerun_recommended: true`
2. attempt 2
   - worker1 `ema-cross-9-21`: `metrics_unreadable` / `27.98s`
   - worker2 `rsi-mean-reversion`: success / `27.98s`
   - `fallback_source`: なし

### diagnostics

framed payload decode 後の live probe では次を確認した。

1. WebSocket payload は実際に `~m~<len>~m~...` framing 付きだった
2. `du` payload 自体は観測できた
3. ただし今回の probe で観測できた `du` は `sds_*` bar update だけで、`report.performance` を含む candidate は 0 件だった

## 現時点の意味

- **実装自体は安全に導入済み**。framed payload を無視していた不具合は修正済み
- ただし **今回の再起動後 live run では report-bearing `du` frame を再現できず、`websocket_report` fallback は未発火**
- そのため、今回の live では `metrics_unreadable` failure-side の wall-clock は従来の `27.98s` 前後から明確には短縮していない

## 次の調査入口

1. report payload が載る条件（strategy / tab state / timing）を追加採取する
2. result 判定後に短い grace window を置くべきかを再評価する
3. WebSocket 以外の strategy-aware source を併用するかを検討する
