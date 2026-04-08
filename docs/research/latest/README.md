# Latest research handoff

このディレクトリは、直近の backtest handoff と結果要約の入口です。

## 読む順番

1. この `README.md`
2. `market-specific-long-run-deep-dive-handoff_20260408_1857.md`
3. `market-specific-long-run-deep-dive-results_20260408_1857.md`
4. `long-run-cross-market-campaign-handoff_20260408_0320.md`
5. `backtest-websocket-report-fallback_20260407_1334.md`
6. `backtest-reliability-handoff_20260407_1026.md`
7. `top4-period-slicing-handoff_20260407_1641.md`
8. `top4-period-slicing-results_20260407_1641.md`
9. 判断経緯が必要なら `docs/working-memory/session-logs/`

## 現在の要点

- 現在の known-good は
  - **worker1 single-worker**（2026-04-08 deep dive で smoke `60/60`、pilot `150/150`、full `300/300`）
  - healthy profile が揃ったときの **dual-worker / 2 worker parallel**
  の 2 系統
- latest result の正本は recovered artifact / recovered summary を優先する
- 直近の主テーマは **100 symbols × 5 strategies の long-run campaign** と、長時間 batch での unreadable / rerun コスト
- 2026-04-07 の reliability pass では、repo core 側で `no_strategy_applied` を早期終了しつつ、`metrics_unreadable` 側の retry budget 短縮に着手した
- 一度は **strategy-aware fallback がある経路（当時は NVDA MA）だけ** `fallback_metrics` / `degraded_result` を返し、preset 経路の `metrics_unreadable` は `rerun_recommended: true` で扱う形に整理した
- その次段で WebSocket `du` frame の report payload fallback を実装し、preset 経路でも **完全な report metrics を観測できた場合のみ** `websocket_report` による degraded success を許可する形へ拡張した
- ただし **2026-04-07 の再起動後 live run では report-bearing frame を再現できず、speedup は未確認**
- 2026-04-08 の campaign 実行では smoke `47/50`, pilot `110/125`, full `485/500` まで recovered できた
- 2026-04-08 の market-specific deep dive では
  - US full: `150/150`
  - JP full: `150/150`
  - combined full: `300/300`
  を回収できた
- strategy signal は
  - US: avg net `50-20 strict-entry-early`, PF / wins `60-20 strict-entry-late`
  - JP: avg net `55-20 tight`, PF / wins `55-18 tight-exit-tight`
  に分かれた
- `9225` 側 worker2 は welcome / onboarding 問題が残り、今回の deep dive 本番には投入していない

## 運用ルール

- ここには **直近の handoff / result docs** だけを置く
- 数値の正本は `docs/references/backtests/` の raw / summary artifact を参照する
- 並列運用の正本は `docs/design-docs/dual-worker-parallel-backtest-runbook_20260406_0735.md` と `command.md`
- 現時点の known-good は **worker1 single-worker** と **dual-worker / 2 worker parallel** までで、4並列は未検証
