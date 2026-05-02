@echo off
setlocal

if "%~1"=="" (
  echo Usage: %~nx0 config\night_batch\file.json [resume-current-round^|advance-next-round]
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
set "SKIP_SMOKE_FLAG="
if defined NIGHT_BATCH_SKIP_SMOKE set "SKIP_SMOKE_FLAG= --skip-smoke"
if "%~2"=="" (
  wsl.exe bash -lc "cd \"%REPO_WSL%\" && python3 python/night_batch.py archive-rounds"
  if errorlevel 1 exit /b %ERRORLEVEL%
)
set "ROUND_MODE=%~2"

if "%ROUND_MODE%"=="" (
  if "%NIGHT_BATCH_RUN_ID%"=="" (
    wsl.exe bash -lc "cd \"%REPO_WSL%\" && if ls artifacts/night-batch/round*/round-manifest.json >/dev/null 2>&1; then LOG_FILE=\$(mktemp); python3 python/night_batch.py smoke-prod --config \"%CONFIG_PATH%\" --round-mode resume-current-round%SKIP_SMOKE_FLAG% >\"\$LOG_FILE\" 2>&1; STATUS=\$?; cat \"\$LOG_FILE\"; if [ \"\$STATUS\" -eq 2 ] && grep -q 'Latest round fingerprint does not match the current strategy set' \"\$LOG_FILE\"; then echo '[diag] fingerprint mismatch on resume-current-round; retrying with advance-next-round'; python3 python/night_batch.py smoke-prod --config \"%CONFIG_PATH%\" --round-mode advance-next-round%SKIP_SMOKE_FLAG%; exit \$?; fi; exit \$STATUS; else python3 python/night_batch.py smoke-prod --config \"%CONFIG_PATH%\" --round-mode advance-next-round%SKIP_SMOKE_FLAG%; fi"
  ) else (
    wsl.exe bash -lc "cd \"%REPO_WSL%\" && if ls artifacts/night-batch/round*/round-manifest.json >/dev/null 2>&1; then LOG_FILE=\$(mktemp); python3 python/night_batch.py smoke-prod --config \"%CONFIG_PATH%\" --round-mode resume-current-round --run-id \"%NIGHT_BATCH_RUN_ID%\"%SKIP_SMOKE_FLAG% >\"\$LOG_FILE\" 2>&1; STATUS=\$?; cat \"\$LOG_FILE\"; if [ \"\$STATUS\" -eq 2 ] && grep -q 'Latest round fingerprint does not match the current strategy set' \"\$LOG_FILE\"; then echo '[diag] fingerprint mismatch on resume-current-round; retrying with advance-next-round'; python3 python/night_batch.py smoke-prod --config \"%CONFIG_PATH%\" --round-mode advance-next-round --run-id \"%NIGHT_BATCH_RUN_ID%\"%SKIP_SMOKE_FLAG%; exit \$?; fi; exit \$STATUS; else python3 python/night_batch.py smoke-prod --config \"%CONFIG_PATH%\" --round-mode advance-next-round --run-id \"%NIGHT_BATCH_RUN_ID%\"%SKIP_SMOKE_FLAG%; fi"
  )
) else (
  if "%NIGHT_BATCH_RUN_ID%"=="" (
    wsl.exe bash -lc "cd \"%REPO_WSL%\" && python3 python/night_batch.py smoke-prod --config \"%CONFIG_PATH%\" --round-mode \"%ROUND_MODE%\"%SKIP_SMOKE_FLAG%"
  ) else (
    wsl.exe bash -lc "cd \"%REPO_WSL%\" && python3 python/night_batch.py smoke-prod --config \"%CONFIG_PATH%\" --round-mode \"%ROUND_MODE%\" --run-id \"%NIGHT_BATCH_RUN_ID%\"%SKIP_SMOKE_FLAG%"
  )
)
set "BATCH_EXIT=%ERRORLEVEL%"

if /i not "%GITHUB_ACTIONS%"=="true" (
  wsl.exe bash -lc "cd \"%REPO_WSL%\" && python3 python/night_batch.py archive-rounds"
  set "ARCHIVE_EXIT=%ERRORLEVEL%"
  if not "%ARCHIVE_EXIT%"=="0" (
    echo [diag] ERROR: archive cleanup failed with exit code %ARCHIVE_EXIT%
    if "%BATCH_EXIT%"=="0" exit /b %ARCHIVE_EXIT%
  )
)

exit /b %BATCH_EXIT%
