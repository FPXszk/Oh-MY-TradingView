# Latest research handoff

このディレクトリは、直近の backtest handoff と結果要約の入口です。

## 読む順番

1. この `README.md`
2. `top4-backtest-handoff_20260407_0529.md`
3. `top4-backtest-results_20260407_0529.md`
4. 判断経緯が必要なら `docs/working-memory/session-logs/`

## 運用ルール

- ここには **直近の handoff / result docs** だけを置く
- 数値の正本は `docs/references/backtests/` の raw / summary artifact を参照する
- 並列運用の正本は `docs/design-docs/dual-worker-parallel-backtest-runbook_20260406_0735.md` と `command.md`
- 現時点の known-good は **dual-worker / 2 worker parallel** までで、4並列は未検証
