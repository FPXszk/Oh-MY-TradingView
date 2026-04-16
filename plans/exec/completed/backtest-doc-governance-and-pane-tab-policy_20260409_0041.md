# 実行計画: backtest doc governance and pane/tab policy (20260409_0041)

- ステータス: ACTIVE / REVIEW REQUIRED
- 種別: docs governance / backtest routing clarification
- 前提ブランチ: `main`

## Problem / approach

`docs/research/latest/` は「直近の backtest handoff / result を最短で読む入口」のはずだが、現状は複数世代の backtest docs が混在しており、latest と archive の境界が崩れている。加えて、直近コミットで追加した workspace pane/tab support が parallel backtest を意味するように見えやすいが、実装実態はそうではない。

今回の方針は次の 2 本立てにする。

1. **docs governance を整理する**
   - `docs/research/latest/` には **最新 1 世代** の backtest handoff / results と `README.md` だけを残す
   - latest から外れた docs は、まず通常保管先の `docs/research/` に戻す
   - そのうち **最新から 2 世代以上前** の backtest docs は `docs/research/archive/` に移し、既定では読まない archive 扱いにする
2. **pane/tab と parallel backtest の関係を正本 docs に明記する**
   - `tv_tab_*` は top-level app tabs ではなく **current layout 内の chart slot** 操作
   - 現在の backtest stack は `window.TradingViewApi._activeChartWidgetWV.value()` 前提の active-chart-only
   - したがって pane/tab support は backtest 効率化の補助導線には使えても、**true parallel backtest の根拠にはならない**
   - true parallel backtest の正本は dual-worker runbook とする

## Source of truth / current evidence

- `docs/research/latest/README.md`
- `docs/working-memory/session-logs/market-specific-long-run-deep-dive_20260408_0616.md`
- `docs/working-memory/session-logs/priority-high-desktop-ops-alerts-ta_20260408_2156.md`
- `src/core/workspace.js`
- `src/core/backtest.js`
- `src/core/pine.js`
- `src/core/price.js`
- `src/core/health.js`
- `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md`
- `README.md`
- `docs/DOCUMENTATION_SYSTEM.md`
- `docs/command.md`

## Goal

1. latest の役割を「最新 1 世代の backtest handoff / results の入口」に戻す
2. `docs/research/` / `docs/research/archive/` の役割を明確化する
3. pane/tab support と parallel backtest を混同しない説明を docs に残す
4. いま何をしていたかを、session log と latest README から最短で復元できる状態を維持する

## In scope

- `docs/research/latest/` の backtest docs 棚卸しと再配置
- `docs/research/archive/` の新設と README 追加
- README / DOCUMENTATION_SYSTEM / command / runbook の routing 更新
- pane/tab vs parallel backtest の結論追記

## Out of scope

- `src/core/backtest.js` / `src/core/workspace.js` など本番コード変更
- tab/pane を target にした新しい backtest API 実装
- parallel backtest の新 benchmark 実行
- dual-worker 以外の新 execution topology 追加
- backtest metrics unreadable の根治修正

## Files to create / modify / move

### Create

- `docs/research/archive/README.md`

### Modify

- `README.md`
- `docs/DOCUMENTATION_SYSTEM.md`
- `docs/research/latest/README.md`
- `docs/command.md`
- `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md`

### Move: latest -> research

- `docs/research/latest/long-run-cross-market-campaign-handoff_20260408_0320.md`

### Move: latest -> research/old

- `docs/research/latest/backtest-reliability-handoff_20260407_1026.md`
- `docs/research/latest/backtest-websocket-report-fallback_20260407_1334.md`
- `docs/research/latest/top4-backtest-handoff_20260407_0529.md`
- `docs/research/latest/top4-backtest-results_20260407_0529.md`
- `docs/research/latest/top4-period-slicing-handoff_20260407_1641.md`
- `docs/research/latest/top4-period-slicing-results_20260407_1641.md`

### Keep in latest

- `docs/research/latest/README.md`
- `docs/research/latest/market-specific-long-run-deep-dive-handoff_20260408_1857.md`
- `docs/research/latest/market-specific-long-run-deep-dive-results_20260408_1857.md`

## Risks / watchpoints

- docs 移動後に README / routing links が壊れる可能性がある
- generation rule を曖昧に書くと、次回以降また latest が肥大化する
- old を「消えた docs」と誤認させないため、役割説明が必要
- pane/tab の説明が弱いと、将来また parallel backtest と誤解される

## Validation commands

```bash
find docs/research -maxdepth 2 -type f | sort
rg -n "docs/research/latest|docs/research/archive|dual-worker|tv_tab|parallel" README.md docs/DOCUMENTATION_SYSTEM.md docs/command.md docs/research/latest/README.md docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md docs/research/archive/README.md
git --no-pager diff --check
git --no-pager diff --stat
```

## Test strategy (docs-only)

### RED

- 現状 `docs/research/latest/` に複数世代が混在しており、運用ルールと実体が不一致
- pane/tab と parallel backtest の関係が docs 上で一意に説明されていない

### GREEN

- latest が最新 1 世代だけになる
- 直前世代は `docs/research/`、2 世代以上前は `docs/research/archive/` に整理される
- routing docs から同じ結論へたどれる

### REFACTOR

- latest / research / old の責務が重複しないよう説明を整理する
- pane/tab の注意書きは latest README と runbook の役割に応じて最小限に分担する

## Implementation steps

- [ ] `docs/research/latest/` 配下を latest / previous / old に世代分類する
- [ ] latest に残す対象を `market-specific-long-run-deep-dive-*` + `README.md` に固定する
- [ ] `long-run-cross-market-campaign-handoff_20260408_0320.md` を `docs/research/` へ移動する
- [ ] 2 世代以上前の backtest docs を `docs/research/archive/` へ移動する
- [ ] `docs/research/archive/README.md` を作成し、既定では old を読まないルールと参照条件を書く
- [ ] `docs/research/latest/README.md` を更新し、読む順番を最新 1 世代へ絞る
- [ ] `docs/research/latest/README.md` に pane/tab support は parallel backtest の根拠ではない旨を追記する
- [ ] `docs/DOCUMENTATION_SYSTEM.md` を更新し、latest / research / old の役割と generation-based archival rule を明文化する
- [ ] `README.md` と `docs/command.md` の docs 導線を整理する
- [ ] `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md` に、pane/tab support は true parallel backtest ではない旨を補強する
- [ ] 文書リンクと配置ポリシーを validation commands で確認する
- [ ] 実装完了後、この plan を `docs/exec-plans/completed/` へ移動する

## Notes

- 現在の known-good execution は **worker1 single-worker** と **warmed dual-worker / 2 worker parallel**
- 直近コミット `9c6d1e6` は workspace / alerts / TA tools の追加であり、parallel backtest 実装ではない
- `tv_tab_*` は top-level workspace tabs ではなく current layout 内 chart slot の切替
- 現状の backtest 効率化で pane/tab を活かすなら、まずは **切替短縮・比較レイアウト・事前配置** の補助導線として扱うのが安全
