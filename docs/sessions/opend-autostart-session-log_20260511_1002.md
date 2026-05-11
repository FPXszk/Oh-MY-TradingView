# Session Log 20260511_1002

## 作業概要

Windows ログオン時に self-hosted runner / WSL / moomoo OpenD が期待どおり起動しなかった件について、commit `48aa91b0fe6f1923efc36ab0e31dfc241292eed3` の変更内容と実機状態を確認した。

結論として、repo 側の変更は `register-self-hosted-runner-autostart.cmd` が生成する launcher に OpenD 起動を追加する内容だったが、実機の `C:\actions-runner\_diag\runner-autostart-launch.cmd` が古いままだったため OpenD が起動していなかった。

## 調査したこと

- `48aa91b0fe6f1923efc36ab0e31dfc241292eed3` の差分確認
- `scripts/windows/register-self-hosted-runner-autostart.cmd` の launcher 生成内容確認
- 実機側 `C:\actions-runner\_diag\runner-autostart-launch.cmd` の内容確認
- Task Scheduler `OhMyTradingViewRunnerAutostart` の登録状態確認
- `runner-autostart.log` と runner log の確認
- Windows 側 OpenD 実行ファイルの存在確認

## 判明した原因

### 1. 生成済み launcher が古かった

実機の `C:\actions-runner\_diag\runner-autostart-launch.cmd` は、当初以下の runner 起動だけの内容だった。

```cmd
@echo off
setlocal
call "C:\actions-runner\_diag\run-self-hosted-runner-with-bootstrap.cmd" "C:\actions-runner" >> "C:\actions-runner\_diag\runner-autostart.log" 2>&1
exit /b %ERRORLEVEL%
```

そのため、commit `48aa91b0` で repo 側に追加された OpenD 起動処理は、実機のログオン launcher にはまだ反映されていなかった。

### 2. WSL はログオン launcher の直接責務ではなかった

この autostart は Windows self-hosted runner をログオン時に起動するためのものだった。
WSL は runner job の中で `run-night-batch-self-hosted.cmd` が呼ばれたときに使われる設計であり、ログオン直後に WSL を直接起動する設計ではなかった。

### 3. WSL パス上の `.cmd` は Windows から直接実行すると LF 改行で失敗した

管理者 cmd から WSL 側の登録スクリプトを直接実行すると、以下で失敗した。

```text
指定されたバッチ ラベルが見つかりません - stage_runner_scripts
```

原因は WSL 側 checkout の `.cmd` が LF 改行で、Windows の batch label 解釈に失敗したこと。

### 4. `_diag` 配下から登録スクリプトを実行すると self-copy で失敗した

`C:\actions-runner\_diag\register-self-hosted-runner-autostart.cmd` から実行すると、source と destination が同じになり、startup script copy の段階で失敗した。

```text
[runner-autostart] ERROR: failed to stage runner startup scripts under C:\actions-runner\_diag
```

## 実施した復旧

### 1. 実機 launcher を更新

repo 側の登録スクリプト、runner wrapper、bootstrap を Windows 側へ CRLF でコピーし、`C:\actions-runner\_diag\runner-autostart-launch.cmd` を再生成した。

更新後の launcher には以下が入った。

```cmd
set "AUTOSTART_LOG=C:\actions-runner\_diag\runner-autostart.log"
set "OPEND_EXE=%APPDATA%\moomoo_OpenD\moomoo_OpenD.exe"
if exist "%OPEND_EXE%" (
  echo [runner-autostart] Starting OpenD from %OPEND_EXE% >> "%AUTOSTART_LOG%"
  start "" "%OPEND_EXE%"
) else (
  echo [runner-autostart] OpenD not found at %OPEND_EXE% >> "%AUTOSTART_LOG%"
)
call "C:\actions-runner\_diag\run-self-hosted-runner-with-bootstrap.cmd" "C:\actions-runner" >> "%AUTOSTART_LOG%" 2>&1
exit /b %ERRORLEVEL%
```

### 2. OpenD 起動を確認

`C:\Users\szk\AppData\Roaming\moomoo_OpenD\moomoo_OpenD.exe` の存在を確認し、OpenD を起動した。

確認時点で `moomoo_OpenD.exe` は PID `3368` で起動していた。

### 3. runner 起動を確認

確認時点で `Runner.Listener.exe` は PID `20376` で起動していた。

runner log では `Listening for Jobs` まで到達していた。

### 4. Task Scheduler 再登録を完了

`C:\actions-runner\_autostart-register\` に CRLF 版の登録スクリプト一式を用意し、管理者 cmd から以下を実行した。

```cmd
C:\actions-runner\_autostart-register\register-self-hosted-runner-autostart.cmd C:\actions-runner
```

ユーザー側で実行し、以下の成功ログを確認した。

```text
[runner-autostart] Task Scheduler registration complete.
```

`schtasks /Query /TN "OhMyTradingViewRunnerAutostart" /V /FO LIST` では以下を確認した。

- 状態: `準備完了`
- スケジュールの種類: `ログオン時`
- 実行するタスク: `C:\ACTION~1\_diag\RUNNER~1.CMD`
- ユーザーとして実行: `szk`
- ログオン モード: `対話型のみ`

## 現在の状態

- `C:\actions-runner\_diag\runner-autostart-launch.cmd` は OpenD 起動行を含む状態
- Task Scheduler `OhMyTradingViewRunnerAutostart` は再登録済み
- OpenD 単体起動は確認済み
- self-hosted runner 起動は確認済み
- 次回ログオン時に runner launcher 経由で OpenD 起動が走る構成になった

## 残タスク

### repo 側の改善候補

`register-self-hosted-runner-autostart.cmd` は `_diag` 配下から実行すると self-copy で失敗する。
今後修正するなら、source と destination が同じ場合は copy を skip するか、登録スクリプトを `_diag` から実行しない前提を README に明記する。

### 実機確認

次回 Windows 再起動またはサインアウト/サインイン後、以下で確認する。

```cmd
tasklist /FI "IMAGENAME eq moomoo_OpenD.exe"
tasklist /FI "IMAGENAME eq Runner.Listener.exe"
type C:\actions-runner\_diag\runner-autostart.log
```

## 関連ファイル

- `scripts/windows/register-self-hosted-runner-autostart.cmd`
- `scripts/windows/run-self-hosted-runner-with-bootstrap.cmd`
- `scripts/windows/bootstrap-self-hosted-runner.cmd`
- `README.md`
- `docs/exec-plans/completed/revert-smokeprod-opend-and-add-logon-opend_20260510_1810.md`
