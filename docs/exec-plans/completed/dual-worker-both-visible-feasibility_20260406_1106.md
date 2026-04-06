# Exec Plan: dual-worker 両 visible feasibility 検証

## Problem

既知の stable 構成は **Session0 hidden + visible Session1** の dual-worker parallel backtest であり、安定条件は以下まで確認済み。

- `restore_policy: "skip"`
- Strategy Tester の `指標` タブ活性化
- warm-up 後の parallel success
- worker2 は visible session で初回ログインが必要
- `--user-data-dir` 再利用で worker2 のログイン状態を保持可能

未検証なのは次の 2 点。

1. **両 worker を visible にした状態**でも parallel backtest が成立するか
2. **visible であること自体**が parallel 実行の不利条件かどうか

今回の目的は、現行 baseline と比較しながら **両 visible の可否を深掘り検証**し、無理なら **実運用可能な代替案**まで確定すること。

## Relationship to existing active plans

- 既存 active plan は `docs/exec-plans/active/wsl-dual-worker-reachability_20260406_0305.md`
- 既存 active plan の主眼は **WSL 到達性 / proxy 層**であり、本計画の主眼は **visible/hidden 構成差と parallel 安定性比較**
- reachability が再退行した場合のみ既存 active plan の確認手順を前提チェックとして再利用する
- よって **active plan の主題は重ならない**が、検証前提として既存 runbook / command を参照する

## Success criteria

- candidate 構成ごとに、以下を同じ観点で比較できること
  - 起動可否
  - CDP 到達性
  - warm-up 可否
  - individual backtest success
  - parallel backtest success / failure pattern
  - 手動介入量
- **両 visible が成立**するなら、その最小運用手順を確定する
- **両 visible が不成立**なら、理由を切り分けたうえで **実現可能な代替構成**を 1 つ推奨する

## 比較する候補構成

| ID | 構成 | 目的 | 判定観点 |
|---|---|---|---|
| A | `hidden(Session0) + visible(Session1)` baseline | 既知の正常系を再確認し、比較基準を固定する | 既存と同じ success shape / 3 round 程度の再現性 |
| B | `visible + visible`（同一 Windows user / 同一 interactive desktop で両方見える形） | 最優先で確認したい本命候補 | 起動時の single-instance 吸収有無、両 CDP port 維持、parallel success |
| C | `visible + visible`（別 Windows user / 別 interactive session） | B が OS / Electron 制約で無理な場合の代替候補 | session 分離後も両 worker が独立維持されるか、CDP/portproxy が安定するか |
| D | fallback: `hidden + visible` 維持、必要時のみ visible recovery | B/C が不成立のときの現実解 | 現行 stable を壊さず、手動 recovery 手順が明確か |

> 補足: B/C で「両 visible」が厳密に不可能でも、**運用上ほぼ同等の可観測性**を得られる案があれば D と合わせて採用候補に含める。

## Files / assets

### 作成

- `docs/exec-plans/active/dual-worker-both-visible-feasibility_20260406_1106.md`
- `docs/working-memory/session-logs/dual-worker-both-visible-feasibility_20260406_1106.md`

### 変更候補

- `command.md`
- `README.md`
- `docs/design-docs/dual-worker-parallel-backtest-runbook_20260406_0735.md`
- `src/core/backtest.js`
- `src/cli/commands/backtest.js`
- `tests/backtest.test.js`
- `tests/e2e.backtest.test.js`

### 参照のみ

- `command.md`
- `README.md`
- `src/connection.js`
- `src/core/backtest.js`
- `tests/e2e.backtest.test.js`
- `docs/design-docs/dual-worker-parallel-backtest-runbook_20260406_0735.md`
- `docs/working-memory/session-logs/tradingview-parallel-backtest-stabilization_20260406_0802.md`

## 実装・検証内容と影響範囲

### Investigation

- baseline A を再確認し、比較軸を固定する
- B の「同一 desktop 上で両 visible」可否を確認する
- B が失敗した場合、失敗理由を以下で分類する
  - TradingView / Electron の single-instance 吸収
  - session 制約
  - visible 化に伴う focus / render / tester 読み取り不安定化
  - login/profile 制約
- C の「別 Windows user / 別 session」で両 visible 相当を作れるか確認する
- A/B/C を同じ手順・同じ preset 組み合わせで比較する

### 実装（必要時のみ）

- 既存 result だけで比較不能なら、`src/core/backtest.js` に **opt-in の診断情報**を最小追加
- 既存 CLI だけで再現手順が曖昧なら、`command.md` / runbook を更新
- default 挙動は変えず、single-worker / current stable dual-worker を壊さない

### 影響範囲

- 主に dual-worker 運用 docs
- 条件付きで backtest result shape / CLI diagnostic
- 既存の single-worker path には非影響、もしくは opt-in 限定に留める

## TDD / 検証方針

このタスクは **環境検証中心** なので、基本は運用上の **RED -> GREEN -> REFACTOR** で進める。  
ただし repo 変更が入る場合のみコードテストも追加する。

### RED

- A を再実行して baseline を固定する
- B を試し、失敗するなら failure mode を再現する
- 必要なら unit test / E2E で diagnostic shape の失敗テストを先に追加する

### GREEN

- B または C で parallel success まで到達する
- それが無理なら D を **推奨 fallback** として確定する
- code change がある場合は `npm test` と既存 E2E を通す

### REFACTOR

- 採用構成の手順を最短化する
- runbook / command の重複記述を整理する
- code change がある場合は helper 化し、default path の複雑化を避ける

## Validation commands

### Repository

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

### Windows / PowerShell

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.Name -eq "TradingView.exe" } |
  Select-Object ProcessId, SessionId, CommandLine |
  Format-List

netsh interface portproxy show all
curl.exe http://127.0.0.1:9222/json/version
curl.exe http://127.0.0.1:9224/json/version
```

## Out of scope

- multi-worker orchestrator の新規実装
- `src/connection.js` の恒久 multi-endpoint 化
- Apple login 自動化
- repo 全体の backtest アーキテクチャ再設計
- 無関係な docs / tests / refactor
- fresh profile 全面作り直しを前提とした別問題の掘り下げ

## Risks

- TradingView/Electron の single-instance 挙動で、visible 化しても独立 window にならない可能性
- Windows Session0 は本質的に「visible」と両立しない可能性
- 別 Windows user / 別 session は CDP 到達性や portproxy 再現性が落ちる可能性
- visible window の focus 奪取で tester 描画や Pine 操作が不安定化する可能性
- worker2 の login/profile 状態が比較結果に混入する可能性
- docs-only で終わる見込みでも、比較不能なら最小の診断実装が必要になる可能性

## Implementation steps

- [ ] 既存 runbook / command / session log を確認し、baseline A の前提条件を固定する
- [ ] `hidden(Session0) + visible(Session1)` の現行 stable 構成で、warm-up 後の individual / parallel 成功を再確認する
- [ ] B 用に「同一 interactive desktop で両 visible」にできる最小起動パターンを定義する
- [ ] B を実行し、起動可否・CDP port 維持・window 可視性・parallel success を記録する
- [ ] B が失敗した場合、failure を single-instance / session 制約 / visible 由来の不安定化 のどれかに分類する
- [ ] B で個別 backtest は通るが parallel だけ落ちる場合、visible 自体が不利かどうかを baseline A と比較する
- [ ] B が不成立なら、C として別 Windows user / 別 interactive session で両 visible 相当の構成を試す
- [ ] C の individual / parallel / reachability / 手動介入量を A と比較する
- [ ] B/C がともに不成立なら、D として現行 `hidden + visible` を正式 fallback 候補にし、必要時 visible recovery の運用案を詰める
- [ ] 既存 result だけで比較不能な場合のみ、`src/core/backtest.js` / CLI に opt-in diagnostic を追加する RED を作る
- [ ] 必要な最小コード変更を実装し、`tests/backtest.test.js` / `tests/e2e.backtest.test.js` を更新する
- [ ] `npm test` と必要な E2E を通し、single-worker / current stable dual-worker に退行がないことを確認する
- [ ] 採用結論を `command.md` と `docs/design-docs/dual-worker-parallel-backtest-runbook_20260406_0735.md` に最小反映する
- [ ] session log に候補比較表、失敗理由、最終推奨構成を記録する

## Expected deliverable

最終的に以下のいずれかを reviewable に提示する。

1. **両 visible 可能**  
   - 成立条件
   - 最小起動手順
   - 既知の制約
   - baseline 比較結果

2. **両 visible は不可能 / 非実用**  
   - 不成立理由
   - どこまで試したか
   - **実現可能な代替構成**
   - 採用理由と運用手順

## Outcome

- **same-session visible + visible** は launch 可能だった
- worker1 を Task Scheduler `/IT` で Session1 へ載せ替え、worker2 と同じ visible Session1 に置けた
- ただし
  - individual preset backtest: 両 worker success
  - parallel distinct preset backtest: 両 workerとも `tester_reason_category: "metrics_unreadable"`
  となり、stable topology にはならなかった
- そのため、現時点の推奨構成は引き続き
  - worker1: Session0 hidden
  - worker2: Session1 visible
- `visible + visible` の次の候補は **別 Windows user / 別 interactive session** だが、今回は未検証
