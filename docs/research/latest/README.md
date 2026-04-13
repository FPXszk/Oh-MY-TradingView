# Latest research handoff

このディレクトリは、**最新 1 世代** の backtest handoff と結果要約の入口です。

> ✅ **complete results 世代**: 現在の latest は fine-tune backtest の**完走結果**です。
> ただし最新 workflow success のうち `24353498557` は stale schedule による skip success なので、結果本体は `24341576697` を参照してください。

## 読む順番

1. この `README.md`
2. `next-long-run-finetune-complete-handoff_20260413_1623.md`（latest 引き継ぎ）
3. `next-long-run-finetune-complete-results_20260413_1623.md`（完了結果）
4. `../../references/backtests/next-long-run-finetune-complete_20260413.summary.json`（集計正本）
5. 直前の partial 世代を確認するなら `../next-long-run-finetune-partial-handoff_20260410_1503.md`
6. 判断経緯が必要なら `../../working-memory/session-logs/`

> 直前世代の current pointer は `docs/research/next-long-run-finetune-partial-handoff_20260410_1503.md`。
> market-matched 200 世代は `docs/research/next-long-run-market-matched-200-handoff_20260409_0643.md` を参照。

## 現在の要点

- latest executed run は `24341576697` で、**US full / JP full とも `1000/1000` success**
- latest workflow success `24353498557` は **stale schedule skip**
- latest 成績の repo 内正本は `docs/references/backtests/next-long-run-finetune-complete_20260413.summary.json`
- US winners:
  - avg net: `50-20 strict-entry-early`
  - PF: `60-20 strict-entry-late`
  - lowest avg drawdown: `55-20 tight-narrow`
- JP winners:
  - avg net: `55-20 strict`
  - PF: `55-18 tight-exit-tight`
  - lowest avg drawdown: `55-20 tight-narrow`
- local smoke (`external-phase1-run8-us-jp-top6`) は `60/60` success、gating は `promote 37 / hold 10 / reject 13`
- JP full は `profit_factor` / `win_rate` 欠損が 40 run あるため、品質指標の平均は利用可能値のみで集計
- 直前の partial 世代は `docs/research/next-long-run-finetune-partial-*_20260410_1503.md` へ退避する

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
