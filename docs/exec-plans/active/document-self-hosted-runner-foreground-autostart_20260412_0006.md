# Exec Plan: document-self-hosted-runner-foreground-autostart_20260412_0006

## 1) 背景 / 目的

今回の self-hosted runner / foreground workflow / autostart hardening に関する会話内容を、後から再読できる形で固定化する。  
`command.md` の運用要約を整理しつつ、詳細経緯は session log に切り出し、Windows 実行ログの pasted logs はそのまま保持する。  
あわせて、直近の重要 commit `2c23e7a` / `8cccb48` / `e4828d7` の位置づけと、現在の運用状態（runner `omtv-win-01` は `online/busy`、workflow run `24282322391` は `in_progress`）を明文化する。

## 2) 変更 / 作成 / 削除するファイル

### 作成
- `docs/exec-plans/active/document-self-hosted-runner-foreground-autostart_20260412_0006.md`
- `docs/working-memory/session-logs/self-hosted-runner-foreground-autostart_20260412_0006.md`

### 更新
- `command.md`

### 参照のみ
- `.github/workflows/night-batch-self-hosted.yml`
- `scripts/windows/register-self-hosted-runner-autostart.cmd`
- `scripts/windows/run-self-hosted-runner-with-bootstrap.cmd`
- `scripts/windows/run-night-batch-self-hosted.cmd`
- 必要に応じて `README.md`

### 削除
- なし

## 3) 実装内容と影響範囲

### 実装内容
- `command.md` の self-hosted runner / foreground workflow / autostart 関連本文を整理する
- pasted logs の手前に、今回の要点・確認手順・参照先を短く追記する
- session log を新規追加し、今回の会話の判断経緯を時系列で固定化する
- 重要 commit `2c23e7a` / `8cccb48` / `e4828d7` の意味を文脈付きで記録する
- 現在の runner / workflow 状態を「運用状態スナップショット」として残す

### 影響範囲
- `command.md` を参照する日次運用フロー
- `docs/working-memory/session-logs/` の履歴参照導線
- self-hosted runner 障害時の一次切り分けメモ
- foreground monitoring / autostart hardening の導入経緯の再確認

## 4) スコープ

### In Scope
- 以下 6 点を運用者が再読できるように残す
  - 今回何をしたか
  - なぜ止まっていたか
  - どのように foreground monitoring に変えたか
  - autostart の失敗原因と修正
  - Windows 側の確認方法
  - 現在の運用状態
- `command.md` と session log の責務分離
- pasted logs を残したまま本文だけ整理

### Out of Scope
- workflow / runner script / Windows 設定の追加修正
- autostart 構成の再設計
- self-hosted runner の監視自動化追加
- 既存 docs の全面統合
- 実行中 workflow `24282322391` 自体への操作

## 5) active plan との重複確認

既存 active plan:
- `docs/exec-plans/active/investigate-night-batch-self-hosted-queued_20260410_2307.md`
- `docs/exec-plans/active/run-night-batch-self-hosted-workflow-dispatch_20260411_0025.md`

今回 plan は、上記の **調査 / dispatch 実行** の続きとして、確定した事実を **documentation と session log に固定化する follow-up** である。  
新しい調査や実装修正は扱わず、既存会話・既存 commit・運用メモを整理することに限定する。

## 6) TDD / Test Strategy

### RED
- 現状の `command.md` と既存 session logs だけでは、以下 6 点が一箇所で追えないことを確認する
  - 今回何をしたか
  - なぜ止まっていたか
  - foreground monitoring への変更
  - autostart の失敗原因と修正
  - Windows 側の確認方法
  - 現在の運用状態
- `command.md` の pasted logs が証跡としては有用でも、要点説明としては不足している状態を failure とみなす

### GREEN
- session log を追加し、上記 6 点を明示する
- `command.md` に運用者向け要約と session log 参照を追加する
- 重要 commit と current status を文書上で追跡可能にする

### REFACTOR
- `command.md` は運用メモとして短く保ち、詳細経緯は session log に寄せる
- 見出し・順序・表現のみ整え、既存 pasted logs 本体は変更しない
- 既存 active plan / session log と重複しない命名・章立てへ調整する

## 7) 実装ステップ

- [ ] `command.md` の self-hosted runner / foreground / autostart 関連節と pasted logs 境界を確認する
- [ ] 重要 commit `2c23e7a` / `8cccb48` / `e4828d7` の役割を 1〜2 行で要約する
- [ ] session log の章立てを作る
  - 背景
  - 今回何をしたか
  - なぜ止まっていたか
  - foreground monitoring への変更
  - autostart の失敗原因と修正
  - Windows 側の確認方法
  - 現在の運用状態
- [ ] `docs/working-memory/session-logs/self-hosted-runner-foreground-autostart_20260412_0006.md` を作成する
- [ ] `command.md` に短い要約と session log 参照を追加する
- [ ] `command.md` 末尾の pasted logs を保持したまま、その上の本文だけ必要最小限整理する
- [ ] live 状態（runner `omtv-win-01` が `online/busy`、run `24282322391` が `in_progress`）の扱いを note として明記する
- [ ] 差分を見直し、docs-only 変更に閉じていることを確認する
- [ ] validation commands を実行し、記述漏れ・表記揺れ・diff 崩れがないことを確認する
- [ ] 実装完了後、この plan を `docs/exec-plans/completed/` へ移して commit / push する

## 8) Validation Commands

```bash
git --no-pager diff -- command.md docs/working-memory/session-logs docs/exec-plans/active
git --no-pager diff --check
rg -n "2c23e7a|8cccb48|e4828d7|omtv-win-01|24282322391|foreground|autostart" command.md docs/working-memory/session-logs
rg -n "今回何をしたか|なぜ止まっていたか|Windows 側の確認方法|現在の運用状態" docs/working-memory/session-logs/*.md
```

docs-only 変更のため、コードテスト追加は原則不要。  
代わりに diff / `rg` / 文書構造確認で completeness を検証する。

## 9) Risks / 注意点

- runner `omtv-win-01` が `online/busy`、workflow run `24282322391` が `in_progress` のため、実行中 checkout と競合しないよう docs 変更範囲を限定する必要がある
- `command.md` に詳細を書きすぎると、運用要約と session log の責務が混ざる
- autostart 失敗原因の説明を簡略化しすぎると、実ログとの整合が崩れる
- 現在状態は時点情報なので、永続事実と区別して書く必要がある

## 10) 補足

- 詳細経緯の保存先は `docs/working-memory/session-logs/` を第一候補とする
- 恒久 runbook 化まで広げる場合は別 task で `docs/design-docs/` を検討する
- 今回は session log 追加と `command.md` 整理に留め、運用手順の全面再編はしない
