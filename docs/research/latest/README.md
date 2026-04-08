# Latest research handoff

このディレクトリは、**最新 1 世代** の backtest handoff と結果要約の入口です。

## 読む順番

1. この `README.md`
2. `market-specific-long-run-deep-dive-handoff_20260408_1857.md`
3. `market-specific-long-run-deep-dive-results_20260408_1857.md`
4. 直前世代を確認するなら `../long-run-cross-market-campaign-handoff_20260408_0320.md`
5. 判断経緯が必要なら `docs/working-memory/session-logs/`

> 直前世代の current pointer は `docs/research/long-run-cross-market-campaign-handoff_20260408_0320.md`。
> 2 世代以上前は `docs/research/old/` に移動済みで、既定では読まない。

## 現在の要点

- 現在の known-good は
  - **worker1 single-worker**（2026-04-08 deep dive で smoke `60/60`、pilot `150/150`、full `300/300`）
  - healthy profile が揃ったときの **dual-worker / 2 worker parallel**
  の 2 系統
- latest result の正本は recovered artifact / recovered summary を優先する
- 直近の主テーマは **market-specific long-run deep dive**（US 50 symbols × 3 entry sweep / JP 50 symbols × 3 exit sweep）
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

## 世代管理ルール

- ここには **最新 1 世代** の handoff / result docs と `README.md` だけを置く
- 新しい世代が入ったら、直前世代の docs は `docs/research/` 直下へ移動する
- 2 世代以上前の docs は `docs/research/old/` へ移動し、既定では読まない archive 扱いにする
- 数値の正本は `docs/references/backtests/` の raw / summary artifact を参照する
- 並列運用の正本は `docs/design-docs/dual-worker-parallel-backtest-runbook_20260406_0735.md` と `command.md`
- 現時点の known-good は **worker1 single-worker** と **dual-worker / 2 worker parallel** までで、4並列は未検証

## pane/tab support と parallel backtest の関係

- `tv_tab_list` / `tv_tab_switch` は **現在 layout 内の chart slot** を操作するもので、top-level workspace tabs ではない
- 現在の backtest / pine / price / health の各フローは `window.TradingViewApi._activeChartWidgetWV.value()` 前提の **active-chart-only** 実装
- したがって pane/tab support は **chart slot の切替短縮・比較レイアウト・事前配置** の補助導線として有用だが、true parallel backtest の根拠にはならない
- true parallel backtest の正本は `docs/design-docs/dual-worker-parallel-backtest-runbook_20260406_0735.md`（dual-worker ベース）
