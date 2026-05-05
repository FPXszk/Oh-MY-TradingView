# Exec-plan: runner-autostart-diagnosis-and-restart_20260505_1320

## 概要

目的: Windows 起動/ログオン時に self-hosted GitHub Actions runner を立ち上げる仕組みの**場所と役割を明確化**し、現在 queue で止まっている workflow を捌ける状態まで **runner を手動で再起動**する。

現時点で確認済みの事実:

- GitHub Actions 側では `Daily Fundamental Screener` run `25358101207` が `queued`
- job `74351482057` は `labels=["self-hosted","windows"]` で `runner_id=0`, `runner_name=""`
- README と repo script では、service mode ではなく **Task Scheduler** を使う設計
- 既定タスク名は **`OhMyTradingViewRunnerAutostart`**
- live 環境には以下が存在する:
  - `C:\actions-runner\run.cmd`
  - `C:\actions-runner\_diag\runner-autostart-launch.cmd`
  - `C:\actions-runner\_diag\run-self-hosted-runner-with-bootstrap.cmd`
  - `C:\actions-runner\_diag\bootstrap-self-hosted-runner.cmd`
  - `C:\actions-runner\_diag\runner-autostart.log`
- `schtasks /Query /TN "OhMyTradingViewRunnerAutostart" /V /FO LIST` では:
  - trigger: **ONLOGON + 30 秒 delay**
  - action: `C:\actions-runner\_diag\runner-autostart-launch.cmd`
  - user: `szk`
  - last result: `3221225786`（表示系では `-1073741510`）
- 最新 listener log (`C:\actions-runner\_diag\Runner_20260505-013520-utc.log`) の末尾は
  - `Runner execution been cancelled.`
  - 直前に transport/read cancel 系エラー
  - そのため、ユーザーが落としてしまった PowerShell/runner プロセスの影響で offline になっている可能性が高い

## 変更ファイル

- `docs/exec-plans/active/runner-autostart-diagnosis-and-restart_20260505_1320.md`（この計画のみ）

コード変更は行わない。

## 影響範囲

- Windows Task Scheduler の `OhMyTradingViewRunnerAutostart`
- `C:\actions-runner\_diag\runner-autostart-launch.cmd`
- `C:\actions-runner\_diag\run-self-hosted-runner-with-bootstrap.cmd`
- `C:\actions-runner\run.cmd`
- GitHub Actions queued run `25358101207`

## 範囲外

- runner 自動起動方式そのものの設計変更
- service mode への移行
- workflow YAML や runner bootstrap script の修正
- TradingView 本体の再設定

## 実施ステップ

- [ ] runner 自動起動の場所と中身を最終確認する
  - Task Scheduler task 名
  - launcher / wrapper / bootstrap / log の実パス
  - README / script と live 環境の一致確認

- [ ] 現在の offline 原因を確定する
  - runner process 不在確認
  - latest listener log の cancel 終端確認
  - queued run が `runner_id=0` のまま止まっていることを再確認

- [ ] 手動で runner を再起動する
  - 第一候補: `schtasks /Run /TN "OhMyTradingViewRunnerAutostart"`
  - 代替: launcher 直起動、必要なら wrapper 直起動
  - bootstrap 成功後に `run.cmd` まで到達することを log / process で確認

- [ ] GitHub 側で queue 解消を確認する
  - queued job に runner が割り当たるか確認
  - `Daily Fundamental Screener` の進行状態を監視
  - 失敗した場合は runner 起動までの問題に限定して報告

## テスト戦略

- RED/GREEN のコード変更はなし
- 検証は ops 状態確認で行う
  - runner process が存在すること
  - autostart log に `Listening for Jobs` が出ること
  - queued run が `queued` から進むこと

## 検証コマンド

- `schtasks /Query /TN "OhMyTradingViewRunnerAutostart" /V /FO LIST`
- `powershell.exe -NoProfile -Command "Get-Process Runner.Listener,Runner.Worker -ErrorAction SilentlyContinue"`
- `powershell.exe -NoProfile -Command "Get-Content 'C:\actions-runner\_diag\runner-autostart.log' -Tail 120"`
- `gh run view 25358101207`
- `gh run watch 25358101207`

## リスク・注意点

- `schtasks /Run` は対象ユーザー `szk` の interactive 条件に依存する
- 既存 runner session が残っていると `A session for this runner already exists.` conflict が再発する可能性がある
- Windows 側 process 起動が detached でないと、この端末から閉じたときに再び runner を落とす恐れがある
- 今回は queued workflow を捌くことが主目的であり、run 本体失敗時の業務ロジック調査までは広げない

## 競合確認

- `docs/exec-plans/active/run-night-batch_20260429_2344.md`
- `docs/exec-plans/active/night-batch-rerun-focus8-200pack_20260505_0300.md`
- `docs/exec-plans/active/repo-structure-align-and-archive-rules_20260424_2015.md`

直接のファイル競合はない。ただし operational には同じ self-hosted Windows runner を使うため、runner 再起動は night-batch 系 task と同じ実機資源に影響する。

---

作成者: Copilot
作成日時: 2026-05-05T13:20:00+09:00
