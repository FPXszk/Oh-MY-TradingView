@echo off
setlocal

if "%~1"=="" (
  echo Usage: %~nx0 config\night_batch\file.json
  exit /b 1
)

for %%I in ("%~dp0..\..") do set "REPO_WIN=%%~fI"
for /f "usebackq delims=" %%I in (`wsl.exe wslpath -a "%REPO_WIN%"`) do set "REPO_WSL=%%I"

if not defined REPO_WSL (
  echo Failed to resolve WSL repository path from %REPO_WIN%
  exit /b 1
)

set "CONFIG_PATH=%~1"
set "CONFIG_PATH=%CONFIG_PATH:\=/%"
wsl.exe bash -lc "cd \"$REPO_WSL\" && python3 python/night_batch.py smoke-prod --config \"$CONFIG_PATH\""
exit /b %ERRORLEVEL%
