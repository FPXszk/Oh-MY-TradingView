# Latest research handoff

このディレクトリは、直近の backtest handoff と結果要約の入口です。

## 読む順番

1. この `README.md`
2. `long-run-cross-market-campaign-handoff_20260408_0320.md`
3. `backtest-websocket-report-fallback_20260407_1334.md`
4. `backtest-reliability-handoff_20260407_1026.md`
5. `top4-period-slicing-handoff_20260407_1641.md`
6. `top4-period-slicing-results_20260407_1641.md`
7. 判断経緯が必要なら `docs/working-memory/session-logs/`

## 現在の要点

- known-good は引き続き **dual-worker / 2 worker parallel**、`restore_policy: "skip"`、Strategy Tester `指標` タブ活性化、warm-up 後の warmed state
- latest result の正本は recovered artifact / recovered summary を優先する
- 直近の主テーマは **100 symbols × 5 strategies の long-run campaign** と、長時間 batch での unreadable / rerun コスト
- 2026-04-07 の reliability pass では、repo core 側で `no_strategy_applied` を早期終了しつつ、`metrics_unreadable` 側の retry budget 短縮に着手した
- 一度は **strategy-aware fallback がある経路（当時は NVDA MA）だけ** `fallback_metrics` / `degraded_result` を返し、preset 経路の `metrics_unreadable` は `rerun_recommended: true` で扱う形に整理した
- その次段で WebSocket `du` frame の report payload fallback を実装し、preset 経路でも **完全な report metrics を観測できた場合のみ** `websocket_report` による degraded success を許可する形へ拡張した
- ただし **2026-04-07 の再起動後 live run では report-bearing frame を再現できず、speedup は未確認**
- 2026-04-08 の campaign 実行では smoke `47/50`, pilot `110/125`, full `485/500` まで recovered できた
- 次段の deep dive 用 config は `long-run-us-entry-sweep-50x3` と `long-run-jp-exit-sweep-50x3` を追加済み。2026-04-08 セッションでは dry-run まで確認できたが、live 実行は CDP host `172.31.144.1:9223/9225` 到達不可でブロックされた

## 運用ルール

- ここには **直近の handoff / result docs** だけを置く
- 数値の正本は `docs/references/backtests/` の raw / summary artifact を参照する
- 並列運用の正本は `docs/design-docs/dual-worker-parallel-backtest-runbook_20260406_0735.md` と `command.md`
- 現時点の known-good は **dual-worker / 2 worker parallel** までで、4並列は未検証
