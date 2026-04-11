@echo off
setlocal

REM ── register-self-hosted-runner-autostart.cmd ───────────────────
REM Register a Task Scheduler entry so the self-hosted runner starts
REM automatically after the runner user logs in.
REM
REM Usage:
REM   scripts\windows\register-self-hosted-runner-autostart.cmd [runner-dir] [task-name]
REM
REM   runner-dir  Path to the actions-runner directory (default:
REM               C:\actions-runner)
REM   task-name   Scheduled task name (default:
REM               OhMyTradingViewRunnerAutostart)
REM
REM Notes:
REM - service mode is intentionally NOT used.
REM - Run this from the Windows user session that should own the
REM   interactive runner login.
REM ────────────────────────────────────────────────────────────────

set "RUNNER_DIR=%~1"
if "%RUNNER_DIR%"=="" set "RUNNER_DIR=C:\actions-runner"

set "TASK_NAME=%~2"
if "%TASK_NAME%"=="" set "TASK_NAME=OhMyTradingViewRunnerAutostart"

set "WRAPPER_PATH=%~dp0run-self-hosted-runner-with-bootstrap.cmd"
set "AUTOSTART_LOG=%RUNNER_DIR%\_diag\runner-autostart.log"
set "TASK_CMD=cmd.exe /c """"%WRAPPER_PATH%"" ""%RUNNER_DIR%"" >> ""%AUTOSTART_LOG%"" 2>&1"""

if not exist "%WRAPPER_PATH%" (
  echo [runner-autostart] ERROR: wrapper not found at %WRAPPER_PATH%
  exit /b 1
)

if not exist "%RUNNER_DIR%\run.cmd" (
  echo [runner-autostart] ERROR: run.cmd not found under %RUNNER_DIR%
  exit /b 1
)

if not exist "%RUNNER_DIR%\_diag" (
  mkdir "%RUNNER_DIR%\_diag"
  if errorlevel 1 (
    echo [runner-autostart] ERROR: failed to create %RUNNER_DIR%\_diag
    exit /b 1
  )
)

echo [runner-autostart] Re-registering Task Scheduler entry "%TASK_NAME%" ...
schtasks /Query /TN "%TASK_NAME%" >nul 2>&1
if not errorlevel 1 (
  schtasks /Delete /TN "%TASK_NAME%" /F >nul
  if errorlevel 1 (
    echo [runner-autostart] ERROR: failed to delete existing task %TASK_NAME%
    exit /b 1
  )
)

schtasks /Create /F /SC ONLOGON /DELAY 0000:30 /TN "%TASK_NAME%" /TR "%TASK_CMD%" /IT >nul
if errorlevel 1 (
  echo [runner-autostart] ERROR: failed to create task %TASK_NAME%
  exit /b 1
)

echo [runner-autostart] Task Scheduler registration complete.
echo [runner-autostart] Task name: %TASK_NAME%
echo [runner-autostart] Runner dir: %RUNNER_DIR%
echo [runner-autostart] Trigger: ONLOGON + 30s delay
echo [runner-autostart] Wrapper: %WRAPPER_PATH%
echo [runner-autostart] Log: %AUTOSTART_LOG%
echo [runner-autostart] Verify with: schtasks /Query /TN "%TASK_NAME%" /V /FO LIST
echo [runner-autostart] Remove with: schtasks /Delete /TN "%TASK_NAME%" /F
exit /b 0
