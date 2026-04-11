# Exec Plan: self-hosted-runner-reboot-autostart_20260411_2124

## 1) 背景 / 目的

Windows self-hosted runner `omtv-win-01` が再起動後に自動で online へ戻る前提だったが、実際には offline のままで workflow が queued になっている。  
service mode は採用しない方針を維持しつつ、**reboot 後に bootstrap 付き runner wrapper が自動起動する導線**を repo と運用手順に追加する。

## 2) 推奨方針

- **標準案: Task Scheduler（Recommended）**
  - runner 用 Windows ユーザーの **At logon** trigger で `scripts\windows\run-self-hosted-runner-with-bootstrap.cmd` を起動する
  - service mode を使わず、既存 bootstrap wrapper をそのまま再利用できる
  - Startup folder より失敗時の確認手段が多く、再設定もしやすい
- **非標準 / fallback**
  - Startup folder
  - ただしログイン順や権限差分で不安定になりやすいため標準採用しない

## 3) 変更 / 作成 / 削除するファイル

### 作成
- `docs/exec-plans/active/self-hosted-runner-reboot-autostart_20260411_2124.md`
- `scripts/windows/register-self-hosted-runner-autostart.cmd`（Task Scheduler 登録用）

### 更新
- `README.md`
- `command.md`
- `tests/windows-run-night-batch-self-hosted.test.js`

### 条件付き更新
- `scripts/windows/run-self-hosted-runner-with-bootstrap.cmd`
  - Task Scheduler 向け引数やログ出力が必要な場合のみ
- `scripts/windows/bootstrap-self-hosted-runner.cmd`
  - 起動前提条件の追加確認が必要な場合のみ

### 削除
- なし

## 4) 実装内容と影響範囲

### 実装内容
- Task Scheduler 登録用 script を追加する
- 既存 bootstrap wrapper を scheduler 経由でも使える前提を docs に明記する
- 再起動後 auto-start の公式手順を README / command.md に追加する
- tests に「service mode 非採用のまま、Task Scheduler ベースで auto-start する」前提を追加する

### 影響範囲
- Windows self-hosted runner 運用手順
- runner 再起動後の復旧フロー
- self-hosted runner 関連 docs / tests

## 5) スコープ

### In Scope
- repo に auto-start 登録 script を追加する
- docs / tests を新運用に合わせる
- runner 再起動後に online 復帰できる公式手順を整える

### Out of Scope
- Windows 実機の Task Scheduler 登録そのものの代行
- service mode への切り替え
- WSL / Windows OS の永続設定全般の全面見直し
- runner アプリ自体の再インストール

## 6) active plan との重複確認

- `investigate-night-batch-self-hosted-queued_20260410_2307.md`
  - queued 原因調査であり、今回の auto-start 実装とは別
- `rerun-night-batch-after-run-cmd_20260410_1714.md`
  - manual rerun 観測であり、今回の reboot 後 auto-start 導線とは別
- `run-night-batch-self-hosted-workflow-dispatch_20260411_0025.md`
  - workflow dispatch 観測であり、今回の runner 復旧導線とは別

今回 plan は **runner の reboot 後 online 復帰方法を repo と docs に実装する** 点で、既存 active plan と重複しない。

## 7) TDD / テスト戦略

### RED
- `tests/windows-run-night-batch-self-hosted.test.js` に、
  - Task Scheduler 登録 script の存在
  - README / command.md が auto-start を Task Scheduler ベースで説明していること
  - service mode を使わないこと
  を期待するテストを追加して失敗させる

### GREEN
- Task Scheduler 登録 script と docs 更新で最小限通す

### REFACTOR
- wrapper / bootstrap 側の重複説明を整理する
- auto-start script の引数・既定値・エラーハンドリングを読みやすく整える

## 8) 検証コマンド

- `node --test tests/windows-run-night-batch-self-hosted.test.js`
- `npm test`

## 9) リスク / 注意点

- 実機 Windows 側で Task Scheduler 登録をまだ実行していない場合、repo 更新だけでは runner は online にならない
- ログオン trigger 依存のため、対象ユーザーのログイン条件を docs で明示する必要がある
- hard reboot 直後の自動ログイン有無までは repo だけでは保証できない
- Startup folder 方式との混同を避けるため、公式手順を一本化する必要がある

## 10) 実装ステップ

- [ ] `tests/windows-run-night-batch-self-hosted.test.js` に auto-start 用 RED テストを追加する
- [ ] `scripts/windows/register-self-hosted-runner-autostart.cmd` を追加する
- [ ] 必要なら runner wrapper / bootstrap の scheduler 起動向け補助を追加する
- [ ] `README.md` に reboot 後 auto-start の公式手順を追加する
- [ ] `command.md` に Task Scheduler 登録 / 確認 / 解除手順を追加する
- [ ] `node --test tests/windows-run-night-batch-self-hosted.test.js` を通す
- [ ] `npm test` で既存回帰を確認する
