# Exec Plan: dual-worker 並列バックテスト検証と引き継ぎ文書整備

## Problem

現在の dual-worker 運用は、到達性回復・worker2 初期化・saved chart 復旧までは進んでいる一方で、以下が未整理です。

- `docs/command.md` に高シグナルな runbook と不要な生ログが混在している
- worker1 / worker2 で **並列バックテストを本当に実行できるか** の最終確認が未完了
- 手動ログインが必要だった箇所と、CLI 単独で処理できた範囲が分散しており、次回セッションへ引き継ぎにくい
- 成功した状態（worker2 が saved chart を開き、`status success / api_available true / chart_symbol BATS:AAPL`）を durable な文書として残せていない

## Goal

1. 既存ログを整理し、**runbook / handoff / session log** の役割を分離する
2. worker1 / worker2 の **並列バックテスト実行可否** を既存 CLI コマンドで検証する
3. ここまでの経緯・成功条件・手動介入ポイント・CLI で自走できた範囲を文書化する
4. push 可能な状態まで docs を整える

## Relationship to existing active plans

- 既存 active plan は `docs/exec-plans/active/wsl-dual-worker-reachability_20260406_0305.md` のみ
- 本タスクはその plan の「proxy / 到達性復旧」の次段として、**文書整備 + 並列検証 + handoff 整理** を扱う
- 既存 active plan の内容を上書きせず、新しい exec-plan として並行管理する
- 入力として以下を参照する
  - `docs/working-memory/session-logs/wsl-dual-worker-reachability_20260406_0305.md`
  - `docs/working-memory/session-logs/dual-worker-distinct-strategy-backtest_20260406_0423.md`
  - `docs/command.md`
  - `docs/DOCUMENTATION_SYSTEM.md`

## Files to create / modify / move

### Create

- `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md`
  - dual-worker の起動前提、疎通確認、parallel 実行手順、手動ログイン要否、成功条件を整理した runbook
- `docs/working-memory/session-logs/dual-worker-parallel-backtest-handoff_20260406_0735.md`
  - 今回までの全手順、判断経緯、失敗→回復→成功の時系列、引き継ぎ事項を残す session log

### Modify

- `docs/command.md`
  - 生ログを削ぎ落とし、運用で再利用するコマンド群を高シグナルなメモとして整理
- `docs/DOCUMENTATION_SYSTEM.md`
  - 新規 runbook / session log への導線を追加し、どれが正本かを明確化

### Reference only

- `docs/working-memory/session-logs/wsl-dual-worker-reachability_20260406_0305.md`
- `docs/working-memory/session-logs/dual-worker-distinct-strategy-backtest_20260406_0423.md`

### Move

- 完了時に exec-plan 自身を
  `docs/exec-plans/active/dual-worker-docs-and-parallel-verification_20260406_0735.md`
  → `docs/exec-plans/completed/dual-worker-docs-and-parallel-verification_20260406_0735.md`
  へ移動

## Implementation contents and impact

### 1. Documentation normalization

- `docs/command.md` を「再実行に必要な最小コマンド集」に整理
- runbook には以下を明示
  - worker1: Session0 `9222` / WSL proxy `9223`
  - worker2: visible Session1 `9224` / WSL proxy `9225`
  - worker2 が当初 welcome dialog により attach failure だったこと
  - visible-session 起動 → browser login → clipboard token handoff → onboarding → saved chart 復旧の流れ
  - 現在の正常状態と確認方法
- session log には以下を明示
  - 何が CLI だけで処理できたか
  - どこで手動ログインが必要だったか
  - 何が成功済みで、次回どこから再開できるか

### 2. Parallel verification

- 既存 CLI コマンドだけを使い、worker1 / worker2 の状態確認を行う
- その後、別 worker に別ポートを向けて **並列バックテスト** を実行
- 成功なら結果と再現手順を記録
- 失敗なら失敗点を runbook ではなく session log 側に残し、runbook には安定運用手順のみ残す

### 3. Documentation publishing readiness

- `DOCUMENTATION_SYSTEM.md` に導線を追加し、次回の探索順序を明文化
- push 前提の docs セットとして、runbook / handoff / command reference の役割分担を固定する

## In scope

- dual-worker 運用文書の整理
- 並列バックテスト可否の実地検証
- 手動ログイン要否と CLI 自動化可能範囲の明文化
- セッションログの引き継ぎ可能化
- docs 導線の更新

## Out of scope

- CLI 本体の新機能追加
- TradingView / Apple login の自動化実装
- Windows / WSL の常駐運用自動化
- 既存の全 session log の全面リライト
- backtest ロジックや strategy 実装の変更
- dual-worker orchestration の新規実装

## TDD / validation strategy

本タスクは docs 中心だが、並列検証部分は **既存コマンドを使った RED → GREEN → REFACTOR** で扱う。

### RED

- worker1 / worker2 の `status` を確認し、並列実行前の前提を固定する
- 必要なら、従来の worker2 attach failure / welcome dialog 起因の不安定性を session log 上で再確認する

### GREEN

- worker1 / worker2 がそれぞれ `status success` を返すことを確認
- 2 worker に対して別 backtest コマンドを同時実行し、並列実行可否を確認
- 成功時は結果・条件・制約を docs に反映する

### REFACTOR

- `docs/command.md` のノイズを削減
- runbook と session log の責務を分離
- 次回セッションで迷わない導線へ整える

> 補足: docs 主体のため新規自動テスト追加は想定しない。`npm test` は repo 全体の既存回帰確認として実行する。

## Validation commands

### Repo baseline

```bash
npm test
```

### Worker reachability / status

```bash
curl -sS http://172.31.144.1:9223/json/version
curl -sS http://172.31.144.1:9225/json/version
curl -sS http://172.31.144.1:9225/json/list
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status
```

### Sequential baseline backtests

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset ema-cross-9-21 --symbol NVDA
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js backtest preset rsi-mean-reversion --symbol NVDA
```

### Parallel verification

```bash
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

### Legacy fallback cross-check

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest nvda-ma
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js backtest nvda-ma
```

## Risks

- worker2 のログイン状態や onboarding 状態が再度崩れる可能性がある
- saved chart URL や profile 状態がセッション依存で変化する可能性がある
- 並列実行時に TradingView UI 側のモーダル / study attach 競合が再発する可能性がある
- `docs/command.md` の整理で有用な生ログを消しすぎるリスクがあるため、raw な経緯は session log 側へ退避して保持する
- docs は成功時点の snapshot なので、IP / port / login 状態が将来変わる可能性がある

## Steps

- [ ] 既存関連文書を読み、runbook に残すべき内容と session log に残すべき内容を仕分ける
- [ ] `docs/command.md` の不要な生ログを洗い出し、再利用価値のあるコマンドだけを抽出する
- [ ] `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md` を新規作成する
- [ ] runbook に前提ポート、worker 状態、手動ログイン要否、CLI で処理できる範囲、正常系チェック手順を記載する
- [ ] `docs/working-memory/session-logs/dual-worker-parallel-backtest-handoff_20260406_0735.md` を新規作成する
- [ ] handoff log に、attach failure → visible-session 起動 → browser login → clipboard token handoff → onboarding → saved chart 復旧 → 現在成功状態、の経緯を時系列で残す
- [ ] `npm test` を実行し、repo の既存回帰確認を行う
- [ ] `status` / `curl` で worker1 / worker2 の前提状態を固定する
- [ ] worker1 / worker2 で backtest を個別実行し、並列実行前の単独成功可否を確認する
- [ ] 2 worker に対して backtest を並列実行し、成功 / 失敗 / 制約を記録する
- [ ] 検証結果を runbook には安定手順として、handoff log には経緯と観測結果として反映する
- [ ] `docs/DOCUMENTATION_SYSTEM.md` に新規文書への導線を追加する
- [ ] push 前提で docs セット全体を見直し、重複・責務混在・参照漏れを解消する
