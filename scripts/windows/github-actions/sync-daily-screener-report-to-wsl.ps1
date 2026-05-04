# sync-daily-screener-report-to-wsl.ps1
# Copy the latest daily screener report files from the Windows GitHub Actions checkout
# into the WSL live checkout, then commit and push only those files to main.

param(
    [Parameter(Mandatory = $true)]
    [string]$WslRepoPath,

    [Parameter(Mandatory = $true)]
    [string]$CommitMessage
)

$ErrorActionPreference = 'Stop'
$ReportPath = 'docs/reports/screener/daily-ranking.md'
$MetadataPath = 'docs/reports/screener/daily-ranking-run.json'

function Assert-NoSingleQuote {
    param(
        [Parameter(Mandatory = $true)][string]$Value,
        [Parameter(Mandatory = $true)][string]$Label
    )

    if ($Value.Contains("'")) {
        throw "$Label must not contain single quotes: $Value"
    }
}

function Invoke-WslStrict {
    param([Parameter(Mandatory = $true)][string]$Command)

    & wsl.exe bash -lc $Command
    if ($LASTEXITCODE -ne 0) {
        throw "WSL command failed: $Command"
    }
}

function Convert-WindowsPathToWsl {
    param([Parameter(Mandatory = $true)][string]$WindowsPath)

    $converted = & wsl.exe wslpath -a $WindowsPath
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to convert Windows path to WSL path: $WindowsPath"
    }

    return ($converted | Select-Object -Last 1).Trim()
}

function Resolve-CheckoutFile {
    param([Parameter(Mandatory = $true)][string]$RelativePath)

    $windowsRelativePath = $RelativePath -replace '/', '\'
    $filePath = Join-Path $PWD $windowsRelativePath
    if (-not (Test-Path $filePath)) {
        throw "Expected file does not exist in the Windows checkout: $filePath"
    }

    return (Resolve-Path $filePath).Path
}

$reportSourceWin = Resolve-CheckoutFile -RelativePath $ReportPath
$metadataSourceWin = Resolve-CheckoutFile -RelativePath $MetadataPath

Assert-NoSingleQuote -Value $WslRepoPath -Label 'WslRepoPath'
Assert-NoSingleQuote -Value $CommitMessage -Label 'CommitMessage'
Assert-NoSingleQuote -Value $ReportPath -Label 'ReportPath'
Assert-NoSingleQuote -Value $MetadataPath -Label 'MetadataPath'

$reportSourceWsl = Convert-WindowsPathToWsl -WindowsPath $reportSourceWin
$metadataSourceWsl = Convert-WindowsPathToWsl -WindowsPath $metadataSourceWin

$resolvedWslRepo = & wsl.exe bash -lc "cd '$WslRepoPath' && pwd"
if ($LASTEXITCODE -ne 0) {
    throw "Failed to resolve WSL repository path: $WslRepoPath"
}
$resolvedWslRepo = ($resolvedWslRepo | Select-Object -Last 1).Trim()
if ([string]::IsNullOrWhiteSpace($resolvedWslRepo)) {
    throw "WSL repository path resolved to an empty value: $WslRepoPath"
}
Assert-NoSingleQuote -Value $resolvedWslRepo -Label 'ResolvedWslRepo'

Invoke-WslStrict -Command "test -d '$resolvedWslRepo/.git'"
Invoke-WslStrict -Command "cd '$resolvedWslRepo' && [ `"`$(git rev-parse --abbrev-ref HEAD)`" = 'main' ] || { echo '[publish] ERROR: WSL repo must be on main' >&2; exit 1; }"
Invoke-WslStrict -Command "cd '$resolvedWslRepo' && git remote get-url origin | grep -Eq '^(git@|ssh://)' || { echo '[publish] ERROR: origin must use SSH' >&2; exit 1; }"
Invoke-WslStrict -Command "cd '$resolvedWslRepo' && git pull --ff-only origin main"
Invoke-WslStrict -Command "mkdir -p '$resolvedWslRepo/docs/reports/screener'"
Invoke-WslStrict -Command "cp '$reportSourceWsl' '$resolvedWslRepo/$ReportPath'"
Invoke-WslStrict -Command "cp '$metadataSourceWsl' '$resolvedWslRepo/$MetadataPath'"
Invoke-WslStrict -Command "cd '$resolvedWslRepo' && git add -- docs/reports/screener/daily-ranking.md docs/reports/screener/daily-ranking-run.json"
Invoke-WslStrict -Command "cd '$resolvedWslRepo' && git -c user.name='github-actions[bot]' -c user.email='41898282+github-actions[bot]@users.noreply.github.com' commit -m '$CommitMessage'"
Invoke-WslStrict -Command "cd '$resolvedWslRepo' && git push origin main"

Write-Host "[publish] Synced daily screener report to $resolvedWslRepo and pushed main"
