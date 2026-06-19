param(
    [Parameter(Mandatory = $true)]
    [string]$ConfigPath,

    [string]$RoundMode = ''
)

$ErrorActionPreference = 'Stop'

function Invoke-NightBatch {
    param(
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [string]$LogPath = ''
    )

    if ($LogPath) {
        & python @Arguments > $LogPath 2>&1
        $exitCode = $LASTEXITCODE
        Get-Content -Path $LogPath
        return $exitCode
    }

    & python @Arguments
    return $LASTEXITCODE
}

function New-SmokeArgs {
    param([Parameter(Mandatory = $true)][string]$Mode)

    $args = @(
        'python/night_batch.py',
        'smoke-prod',
        '--config', $ConfigPath,
        '--round-mode', $Mode
    )
    if ($env:NIGHT_BATCH_RUN_ID) {
        $args += @('--run-id', $env:NIGHT_BATCH_RUN_ID)
    }
    if ($env:NIGHT_BATCH_SKIP_SMOKE) {
        $args += '--skip-smoke'
    }
    return $args
}

if (-not $RoundMode) {
    $archiveExit = Invoke-NightBatch -Arguments @('python/night_batch.py', 'archive-rounds')
    if ($archiveExit -ne 0) {
        exit $archiveExit
    }
}

if ($RoundMode) {
    $batchExit = Invoke-NightBatch -Arguments (New-SmokeArgs -Mode $RoundMode)
} else {
    $hasRoundManifest = @(Get-ChildItem -Path 'artifacts/night-batch' -Filter 'round-manifest.json' -Recurse -ErrorAction SilentlyContinue).Count -gt 0
    if ($hasRoundManifest) {
        $logPath = Join-Path ([System.IO.Path]::GetTempPath()) ("night-batch-{0}.log" -f ([System.Guid]::NewGuid().ToString('N')))
        $resumeExit = Invoke-NightBatch -Arguments (New-SmokeArgs -Mode 'resume-current-round') -LogPath $logPath
        if ($resumeExit -eq 2 -and (Select-String -Path $logPath -SimpleMatch 'Latest round fingerprint does not match the current strategy set' -Quiet)) {
            Write-Host '[diag] fingerprint mismatch on resume-current-round; retrying with advance-next-round'
            $batchExit = Invoke-NightBatch -Arguments (New-SmokeArgs -Mode 'advance-next-round')
        } else {
            $batchExit = $resumeExit
        }
        Remove-Item -Path $logPath -Force -ErrorAction SilentlyContinue
    } else {
        $batchExit = Invoke-NightBatch -Arguments (New-SmokeArgs -Mode 'advance-next-round')
    }
}

if ($env:GITHUB_ACTIONS -ne 'true') {
    $archiveExit = Invoke-NightBatch -Arguments @('python/night_batch.py', 'archive-rounds')
    if ($archiveExit -ne 0) {
        Write-Host "[diag] ERROR: archive cleanup failed with exit code $archiveExit"
        if ($batchExit -eq 0) {
            exit $archiveExit
        }
    }
}

exit $batchExit
