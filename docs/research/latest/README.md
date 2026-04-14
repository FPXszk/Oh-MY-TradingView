# Latest research handoff

このディレクトリは、**最新 1 世代** の backtest handoff と結果要約の入口です。

> ✅ **12x10 registration 世代**: 現在の latest は fine-tune 100x10 完走結果から選定した **上位 10 戦略 × US/JP 各 12 銘柄** の campaign 登録です。
> 前世代の fine-tune complete results は `docs/research/next-long-run-finetune-complete-handoff_20260413_1623.md` を参照してください。

## 読む順番

1. この `README.md`
2. `next-long-run-us-jp-12x10-handoff_20260414_0009.md`（latest 引き継ぎ）
3. `next-long-run-us-jp-12x10-details_20260414_0009.md`（選定詳細）
4. 判断経緯が必要なら `../../working-memory/session-logs/next-long-run-us-jp-12x10-registration_20260414_0009.md`

> 直前世代の current pointer は `docs/research/next-long-run-finetune-complete-handoff_20260413_1623.md`。
> 直前世代の results は `docs/research/next-long-run-finetune-complete-results_20260413_1623.md`。

## 現在の要点

- 10 戦略は fine-tune 100x10 完走後の成績比較から選定
- US 12 銘柄: winners 4 + mature-range 4 + defense-test 4
- JP 12 銘柄: winners 4 + mature-range 4 + defense-test 4
- 期間: 2000-01-01 〜 2099-12-31（latest available bar まで）
- campaign ID: `next-long-run-us-12x10` / `next-long-run-jp-12x10`
- universe ID: `next-long-run-us-12` / `next-long-run-jp-12`
- phase sizing: smoke=3 / pilot=6 / full=12（各 phase で 3 カテゴリ全カバー）

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
