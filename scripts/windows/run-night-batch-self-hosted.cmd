@echo off
setlocal

if "%~1"=="" (
  echo Usage: %~nx0 config\night_batch\file.json [resume-current-round^|advance-next-round]
  exit /b 1
)

for %%I in ("%~dp0..\..") do set "REPO_WIN=%%~fI"

set "CONFIG_PATH=%~1"
set "ROUND_MODE=%~2"

pushd "%REPO_WIN%"
if errorlevel 1 exit /b %ERRORLEVEL%

if "%ROUND_MODE%"=="" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\windows\run-night-batch-self-hosted.ps1" -ConfigPath "%CONFIG_PATH%"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\windows\run-night-batch-self-hosted.ps1" -ConfigPath "%CONFIG_PATH%" -RoundMode "%ROUND_MODE%"
)
set "BATCH_EXIT=%ERRORLEVEL%"
popd

exit /b %BATCH_EXIT%
