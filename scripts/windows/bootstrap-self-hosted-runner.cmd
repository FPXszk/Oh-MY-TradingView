@echo off
setlocal

REM -- bootstrap-self-hosted-runner.cmd --
REM Prerequisite fix for self-hosted Windows runner.
REM Run this BEFORE starting the GitHub Actions runner (run.cmd).
REM
REM Currently handles:
REM   1. Git dubious ownership - adds this repository workspace to
REM      git safe.directory so actions/checkout does not fail.

set "RUNNER_DIR=%~1"
if "%RUNNER_DIR%"=="" set "RUNNER_DIR=C:\actions-runner"

set "REPO_NAME=Oh-MY-TradingView"
set "WORKSPACE_DIR=%RUNNER_DIR%\_work\%REPO_NAME%\%REPO_NAME%"
set "WORKSPACE_DIR_GIT=%WORKSPACE_DIR:\=/%"

echo [bootstrap] Ensuring git safe.directory for %WORKSPACE_DIR_GIT% ...

git config --global --get-all safe.directory 2>nul | findstr /I /X /C:"%WORKSPACE_DIR_GIT%" >nul
if not errorlevel 1 goto safe_directory_ready

git config --global --add safe.directory "%WORKSPACE_DIR_GIT%"
if errorlevel 1 (
  echo [bootstrap] ERROR: failed to set git safe.directory for %WORKSPACE_DIR_GIT%
  exit /b 1
)
echo [bootstrap] git safe.directory added.
goto bootstrap_done

:safe_directory_ready
echo [bootstrap] git safe.directory already configured.

:bootstrap_done

echo [bootstrap] Prerequisites OK.
exit /b 0
