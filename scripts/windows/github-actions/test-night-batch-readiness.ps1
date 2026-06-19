param(
    [Parameter(Mandatory = $true)]
    [string]$ConfigPath
)

$ErrorActionPreference = 'Stop'

$config = Get-Content -Raw -Path $ConfigPath | ConvertFrom-Json
$runtime = $config.runtime
if (-not $runtime) {
    throw "Config is missing runtime section: $ConfigPath"
}

function Test-CdpEndpoint {
    param(
        [Parameter(Mandatory = $true)][string]$Label,
        [Parameter(Mandatory = $true)][string]$HostName,
        [Parameter(Mandatory = $true)][int]$Port
    )

    Write-Host "[readiness-diag] $Label"
    Write-Host "  host=$HostName port=$Port"
    try {
        Invoke-RestMethod -Uri "http://${HostName}:${Port}/json/list" -TimeoutSec 3 | Out-Null
        Write-Host '  status=reachable'
    } catch {
        Write-Host "  status=unreachable: $($_.Exception.Message)"
    }
}

$startupHost = if ($runtime.startup_check_host) { [string]$runtime.startup_check_host } else { '127.0.0.1' }
$startupPort = if ($runtime.startup_check_port) { [int]$runtime.startup_check_port } else { 9222 }
$runtimeHost = if ($runtime.host) { [string]$runtime.host } else { '127.0.0.1' }
$runtimePort = if ($runtime.port) { [int]$runtime.port } else { 9222 }

Write-Host '[readiness-diag] Checking Windows native port connectivity and readiness'
Test-CdpEndpoint -Label 'startup_check_port:' -HostName $startupHost -Port $startupPort
Test-CdpEndpoint -Label 'runtime port readiness:' -HostName $runtimeHost -Port $runtimePort

Write-Host '[readiness-diag] tv status readiness:'
$env:TV_CDP_HOST = $runtimeHost
$env:TV_CDP_PORT = [string]$runtimePort
& node src/cli/index.js status
if ($LASTEXITCODE -ne 0) {
    Write-Host '[readiness-diag] tv status: FAILED'
}
Write-Host '[readiness-diag] done'
