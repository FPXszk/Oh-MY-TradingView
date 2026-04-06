# Exec Plan: dual-worker 安定運用ドキュメント最終化と push

## Problem

TradingView dual-worker parallel backtest stabilization は実測上ほぼ収束しており、以下を確認済みです。

- worker1 / worker2 の individual preset backtest success
- warmed parallel distinct preset backtest 3 ラウンド連続 success
- 安定条件は `restore_policy: "skip"` と Strategy Tester の `指標` タブ活性化

未完了なのは、**安定運用に必要な知見を恒久ドキュメントへ反映し、session log を最終化し、関連 exec-plan を整理したうえで commit / push まで完了させること**です。

## Relationship to existing plans

- 既存 active plan:
  - `docs/exec-plans/active/tradingview-parallel-backtest-stabilization_20260406_0802.md`
  - `docs/exec-plans/active/wsl-dual-worker-reachability_20260406_0305.md`
- 今回は reachability の再調査ではなく、**stabilization 結果の文書化とクローズ処理** が対象です
- `wsl-dual-worker-reachability_20260406_0305.md` は参照のみとし、原則この plan の直接変更対象にはしません
- stabilization plan と今回の finalization plan は commit フェーズで `docs/exec-plans/completed/` へ移動します

## Files

### Create

- `docs/exec-plans/active/dual-worker-docs-finalization_20260406_1017.md`
- 必要時のみ:
  - `docs/working-memory/session-logs/dual-worker-docs-finalization_20260406_1017.md`

### Modify

- `README.md`
- `command.md`
- `docs/design-docs/dual-worker-parallel-backtest-runbook_20260406_0735.md`
- `docs/working-memory/session-logs/tradingview-parallel-backtest-stabilization_20260406_0802.md`
- 必要に応じて:
  - `docs/working-memory/session-logs/dual-worker-parallel-backtest-handoff_20260406_0735.md`

### Move

- `docs/exec-plans/active/tradingview-parallel-backtest-stabilization_20260406_0802.md`
  -> `docs/exec-plans/completed/tradingview-parallel-backtest-stabilization_20260406_0802.md`
- `docs/exec-plans/active/dual-worker-docs-finalization_20260406_1017.md`
  -> `docs/exec-plans/completed/dual-worker-docs-finalization_20260406_1017.md`

## Approach

1. runbook / command / README / session log の役割を分けて、同じ事実を矛盾なく残す
2. 安定化のために実施した操作、効いた変更、既知の制約を docs に明文化する
3. session log は時系列の完了記録として最終化する
4. 最後に exec-plan を completed へ移し、commit / push まで完了する

## In scope

- dual-worker 安定運用条件の文書化
- 安定化のために実施したコード変更・運用変更・検証結果の記録
- session log 最終化
- exec-plan の active -> completed 整理
- commit / push

## Out of scope

- backtest ロジックの追加改修
- fresh app restart / fresh profile での追加調査
- Apple login 自動化
- portproxy / worker launch 設計の再変更
- 無関係な README / docs 全面改稿

## Test strategy

### RED

- 現行 docs に残る「未安定」「暫定」など、現在の実測と矛盾する記述を洗い出す
- session log / runbook / command / README の差分を確認する

### GREEN

- 実測済みの安定条件に docs を揃える
- 既存コマンドで最低限の事実確認を行う
  - `npm test`
  - `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status`
  - `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status`
- 必要なら individual / parallel の再確認を行う

### REFACTOR

- README は要約と入口、command は実運用手順、session log は経緯、runbook は known-good 条件に責務分離する

## Validation commands

```bash
npm test
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset ema-cross-9-21 --symbol NVDA
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js backtest preset rsi-mean-reversion --symbol NVDA
git --no-pager diff -- README.md command.md docs/design-docs/dual-worker-parallel-backtest-runbook_20260406_0735.md docs/working-memory/session-logs/ docs/exec-plans/
git --no-pager status
```

## Risks

- docs に「確認済み」と「推定」が混ざると次回運用で誤読される
- `restore_policy: "skip"` の安定性と長期副作用を混同すると危険
- commit 前に active/completed の移動漏れがあると運用ルール違反になる
- push 時に `main` 側の先行更新があると競合解消が必要になる

## Implementation steps

- [ ] 既存 docs を横断して矛盾箇所を洗い出す
- [ ] runbook に known-good topology / stable condition / known limitation を最終反映する
- [ ] `command.md` を current known-good operation に更新する
- [ ] `README.md` に dual-worker 安定運用の要約と参照先を最小追記する
- [ ] stabilization session log を最終化し、必要なら finalization 専用 session log を追加する
- [ ] docs 間のリンクと参照先を整理する
- [ ] 必要な既存コマンドで最低限の再確認を行う
- [ ] stabilization plan を `docs/exec-plans/completed/` へ移動する
- [ ] finalization plan も `docs/exec-plans/completed/` へ移動する
- [ ] Conventional Commit で commit し、required trailer を付与する
- [ ] `main` に push する
