# Latest research handoff

このディレクトリは、**最新 1 世代** の backtest handoff と結果要約の入口です。

> ⚠️ **暫定世代**: 現在の latest は fine-tune backtest の**中断時点の partial report** です。
> 最終結論には使えません。確定した結論が必要な場合は直前世代 `docs/research/next-long-run-market-matched-200-*_20260409_0643.md` を参照してください。

## 読む順番

1. この `README.md`
2. `next-long-run-finetune-partial-handoff_20260410_1503.md`（中断引き継ぎ）
3. `next-long-run-finetune-partial-results_20260410_1503.md`（暫定結果）
4. 直前世代（確定済み）を確認するなら `../next-long-run-market-matched-200-handoff_20260409_0643.md`
5. 2 世代前を確認するなら `../market-specific-long-run-deep-dive-handoff_20260408_1857.md`
6. 判断経緯が必要なら `docs/working-memory/session-logs/`

> 直前世代の current pointer は `docs/research/next-long-run-market-matched-200-handoff_20260409_0643.md`。
> 2 世代以上前は原則 `docs/research/old/` へ移動するが、移行途中の文書が `docs/research/` に残る場合がある。

## 現在の要点

- **今回の latest は暫定世代**であり、fine-tune backtest が途中停止した時点の checkpoint から作成している
- 確定した戦略判断が必要な場合は、直前世代（market-matched 200）の結論を引き続き使用すること
- 現在の known-good は
  - **worker1 single-worker**（2026-04-09 market-matched 200 で smoke `60/60`、pilot `150/150`、full `600/600`）
  - healthy profile が揃ったときの **dual-worker / 2 worker parallel**
  の 2 系統
- latest result の正本は recovered artifact / recovered summary / checkpoint を優先する
- 直近の主テーマは **next long-run fine-tune**（US 100 symbols × 10 presets / JP 100 symbols × 10 presets）
- fine-tune の進捗:
  - US smoke: `100/100` ✅
  - JP smoke: `100/100` ✅
  - US pilot: `50/250` ⚠️ 中断
  - US full: `490/1000` ⚠️ 中断（5/10 preset 処理済み）
  - JP pilot / full: latest artifact 上は未着手扱い
- **未検証問題**: US full の先頭 2 preset で全 100 symbols の metrics が完全一致しており、原因未調査
- 直前世代 strategy signal は引き続き有効:
  - US: avg net `50-20 strict-entry-early`, PF / wins `60-20 strict-entry-late`
  - JP: avg net `55-20 tight`, PF `55-18 tight-exit-tight`
- top 5 Pine source export は `docs/references/pine/next-long-run-market-matched-200_20260409_1525/` を参照（fine-tune 完走前のため未更新）
- worker2 は distinct parallel smoke 安定化まで本線に戻さない方針を継続

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
