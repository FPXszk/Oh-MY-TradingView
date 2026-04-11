@echo off
setlocal

REM ── run-self-hosted-runner-with-bootstrap.cmd ─────────────────
REM Thin wrapper: runs prerequisite bootstrap, then delegates to
REM the external GitHub Actions runner run.cmd.
REM
REM Usage:
REM   scripts\windows\run-self-hosted-runner-with-bootstrap.cmd [runner-dir]
REM
REM   runner-dir  Path to the actions-runner directory (default:
REM               C:\actions-runner).
REM
REM One-time hookup: call this script instead of run.cmd directly
REM when starting the self-hosted runner manually.
REM ──────────────────────────────────────────────────────────────

set "RUNNER_DIR=%~1"
if "%RUNNER_DIR%"=="" set "RUNNER_DIR=C:\actions-runner"

REM ── Step 1: Run prerequisite bootstrap ──
call "%~dp0bootstrap-self-hosted-runner.cmd" "%RUNNER_DIR%"
if %ERRORLEVEL% neq 0 (
  echo [runner-wrapper] Bootstrap failed. Aborting runner startup.
  exit /b %ERRORLEVEL%
)

REM ── Step 2: Delegate to external runner run.cmd ──
if not exist "%RUNNER_DIR%\run.cmd" (
  echo [runner-wrapper] ERROR: run.cmd not found under %RUNNER_DIR%
  exit /b 1
)

echo [runner-wrapper] Starting runner from %RUNNER_DIR%\run.cmd ...
call "%RUNNER_DIR%\run.cmd"
exit /b %ERRORLEVEL%
