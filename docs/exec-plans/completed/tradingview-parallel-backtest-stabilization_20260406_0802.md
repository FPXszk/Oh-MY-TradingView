# Exec Plan: TradingView 並列バックテスト安定化

## Problem

- 直近フェーズで **individual backtest は worker1 / worker2 とも success** に復帰した
- warmed parallel でも **worker1 は tester metrics 取得まで success** を確認できた
- ただし worker2 は warmed parallel 時に
  - `tester_available: false`
  - `tester_reason_category: metrics_unreadable`
  - `restore_error: study template restore failed: Cannot start studies: main series is not started`
  が残る
- 現時点の最狭 blocker は **worker2 parallel 時の tester metrics unreadable と restore timing failure**

## Relationship to existing plans

- 既存 active plan は `docs/exec-plans/active/wsl-dual-worker-reachability_20260406_0305.md`
- その plan の主眼だった到達性復旧は、後続の session log で概ね収束済み
- 今回は overlap を避けるため、**reachability 再調査ではなく backtest 安定化** を新規 plan として切り出す
- 到達性が再退行した場合のみ、既存 reachability plan の確認手順を前提チェックとして再利用する

## Approach

次フェーズでは主戦場を `src/core/backtest.js` に寄せ、**post-restore を必須成功条件から外し、pre-run 正規化と tester 読み取り安定化を優先**する。  
ユーザー方針どおり、**元の5インジケーターへ戻すことは要件に含めない**。restore は `required` ではなく `best-effort` / `skip` 寄りで扱い、parallel 時の metrics 取得を優先する。  
TDD は RED -> GREEN -> REFACTOR で進め、restore policy と metrics unreadable の扱いを unit/e2e で固定したうえで、individual -> warmed parallel の順に再検証する。

## Files

### Create

- `docs/exec-plans/active/tradingview-parallel-backtest-stabilization_20260406_0802.md`
- `tests/pine.editor.test.js` または既存 test への追記（pure helper 分離が必要な場合のみ）
- `docs/working-memory/session-logs/tradingview-parallel-backtest-stabilization_20260406_0802.md`（必要時のみ）

### Modify

- `src/core/backtest.js`
- `tests/backtest.test.js`
- `tests/e2e.backtest.test.js`
- `docs/working-memory/session-logs/tradingview-parallel-backtest-stabilization_20260406_0802.md`
- `docs/command.md`（安定条件が更新できた場合のみ）
- `src/cli/index.js`（restore policy を CLI 指定可能にする場合のみ）
- `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md`（結論更新が必要な場合のみ）

### Secondary scope only if regression reappears

- `src/core/pine.js`

### Move later

- 実装完了後に本 plan を `docs/exec-plans/completed/` へ移動

## In scope

- restore を `required` ではなく `best-effort` / `skip` 可能にする設計検討と実装
- backtest 成功条件と後処理成功条件の分離
- worker2 parallel 時の `metrics_unreadable` 直前の state capture 強化
- pre-run の chart/study 正規化を追加し、post-restore 依存を減らす変更
- single-worker の backtest 実行を壊さずに、parallel worker2 の tester_available 安定化を狙う変更
- 必要最小限の docs / session log 更新

## Out of scope

- Apple login 自動化
- `src/connection.js` の multi-endpoint 化
- repo 全体の multi-worker orchestrator 新規実装
- Windows portproxy / worker launch の再設計
- 元の5インジケーター構成への復元
- restore 成功を backtest 成功の必須条件に戻すこと
- 無関係な backtest strategy や research workflow の変更

## Test strategy

### RED

- `tests/backtest.test.js` に restore policy (`required` / `best-effort` / `skip`) の失敗テストを追加する
- `tests/backtest.test.js` に `metrics_unreadable` 時の state/debug 情報の shape を固定する
- `tests/e2e.backtest.test.js` に restore 非必須でも structured result が崩れないことを追加する

### GREEN

- `src/core/backtest.js` に restore policy を実装する
- default policy を `best-effort` または `skip` 寄りに変更する
- post-restore failure を warning 化し、backtest 本体と分離する
- pre-run の chart/study 正規化と metrics read 前の待機/観測を追加する
- `npm test` を通す
- CDP が見える環境では `npm run test:e2e` を通し、single-worker path の退行がないことを確認する
- その後 `status` / individual backtest / parallel backtest の順で実運用再現を行う

### REFACTOR

- restore policy / result 付与 / state capture を helper 化する
- `runNvdaMaBacktest()` / `runPresetBacktest()` の policy 適用差分を減らす

## Validation commands

```bash
npm test
npm run test:e2e
npm run test:all
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset ema-cross-9-21 --symbol NVDA
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js backtest preset rsi-mean-reversion --symbol NVDA
(
  TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 \
  node src/cli/index.js backtest preset ema-cross-9-21 --symbol NVDA
) &
(
  TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 \
  node src/cli/index.js backtest preset rsi-mean-reversion --symbol NVDA
) &
wait
```

## Risks

- TradingView UI / internal API 依存のため、E2E の揺れで原因切り分けが難しくなる可能性がある
- worker2 profile 固有状態が tester / restore に影響していると、repo 修正だけでは完治しない可能性がある
- restore を弱めると chart 汚染が蓄積する可能性があるため、pre-run 正規化をセットで入れる必要がある
- `success:true` / `tester_available:false` のねじれを放置すると判定が曖昧なまま残る
- `src/core/backtest.js` は既に大きいため、安易な追記だけで済ませると可読性が悪化する

## Implementation steps

- [ ] 直近 session log / runbook の結論を前提として整理し、reachability 問題と今回の blocker を明確に分離する
- [x] `tests/backtest.test.js` に restore failure / result shape の RED を追加する
- [x] `src/core/pine.js` と `src/core/backtest.js` に Pine Editor 診断と retry を追加する
- [x] `tests/e2e.backtest.test.js` に restore result shape の検証を追加する
- [x] individual worker1 / worker2 の preset backtest を success まで戻す
- [ ] 「元の5インジケーターへ戻す」前提を plan から外し、restore policy を `best-effort` / `skip` 前提で再定義する
- [ ] restore policy (`required` / `best-effort` / `skip`) の RED を `tests/backtest.test.js` に追加する
- [ ] `metrics_unreadable` 時の state/debug shape の RED を追加する
- [ ] `src/core/backtest.js` に restore policy を実装し、default を `best-effort` または `skip` 寄りに変更する
- [ ] post-restore failure を warning 扱いにし、backtest 本体と分離する
- [ ] pre-run の chart/study 正規化を追加し、restore 依存を減らす
- [ ] `runNvdaMaBacktest()` / `runPresetBacktest()` の policy 適用差分を減らす
- [ ] `npm test` と必要な E2E を回し、single-worker path の退行がないことを確認する
- [ ] individual -> warmed parallel の順で実環境再現を行い、worker2 の `tester_available` 安定化を確認する
- [ ] 効いた変更と未解決条件を session log / runbook に反映する
