# sync-portfolio-reports-to-wsl.ps1
# LEGACY WSL publish helper. Current Windows-native workflows publish with
# sync-portfolio-reports-to-main.ps1 from the Windows checkout.
# Copy portfolio workflow outputs from the Windows GitHub Actions checkout
# into the WSL live checkout, then commit and push only those paths to main.

param(
    [Parameter(Mandatory = $true)]
    [string]$WslRepoPath,

    [Parameter(Mandatory = $true)]
    [string]$CommitMessage,

    [Parameter(Mandatory = $true)]
    [string[]]$RelativePaths
)

$ErrorActionPreference = 'Stop'

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

    $normalizedWindowsPath = $WindowsPath -replace '\\', '/'
    $converted = & wsl.exe wslpath -a $normalizedWindowsPath
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to convert Windows path to WSL path: $WindowsPath"
    }

    return ($converted | Select-Object -Last 1).Trim()
}

function Resolve-CheckoutPath {
    param([Parameter(Mandatory = $true)][string]$RelativePath)

    $windowsRelativePath = $RelativePath -replace '/', '\'
    $resolvedPath = Join-Path $PWD $windowsRelativePath
    if (-not (Test-Path $resolvedPath)) {
        throw "Expected path does not exist in the Windows checkout: $resolvedPath"
    }

    return (Resolve-Path $resolvedPath).Path
}

function Normalize-RelativePaths {
    param([Parameter(Mandatory = $true)][string[]]$Values)

    $normalized = @()
    foreach ($value in $Values) {
        foreach ($candidate in ($value -split ',')) {
            $trimmed = $candidate.Trim().Trim('"')
            if (-not [string]::IsNullOrWhiteSpace($trimmed)) {
                $normalized += $trimmed
            }
        }
    }

    return $normalized
}

Assert-NoSingleQuote -Value $WslRepoPath -Label 'WslRepoPath'
Assert-NoSingleQuote -Value $CommitMessage -Label 'CommitMessage'
$RelativePaths = Normalize-RelativePaths -Values $RelativePaths
if ($RelativePaths.Count -eq 0) {
    throw 'RelativePaths must contain at least one path'
}

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

$resolvedSourcePaths = @()
foreach ($relativePath in $RelativePaths) {
    Assert-NoSingleQuote -Value $relativePath -Label 'RelativePath'
    $resolvedSourcePaths += [PSCustomObject]@{
        RelativePath = $relativePath
        WindowsPath  = Resolve-CheckoutPath -RelativePath $relativePath
    }
}

foreach ($item in $resolvedSourcePaths) {
    $sourceWsl = Convert-WindowsPathToWsl -WindowsPath $item.WindowsPath
    $targetWsl = "$resolvedWslRepo/$($item.RelativePath)"
    $parentWsl = [System.IO.Path]::GetDirectoryName($item.RelativePath.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
    if ([string]::IsNullOrWhiteSpace($parentWsl)) {
        $parentWsl = '.'
    }
    $parentWsl = $parentWsl.Replace('\', '/')

    Invoke-WslStrict -Command "mkdir -p '$resolvedWslRepo/$parentWsl'"
    Invoke-WslStrict -Command "rm -rf '$targetWsl'"
    Invoke-WslStrict -Command "cp -R '$sourceWsl' '$targetWsl'"
}

$quotedRelativePaths = ($RelativePaths | ForEach-Object { "'$_'" }) -join ' '
Invoke-WslStrict -Command "cd '$resolvedWslRepo' && git add -- $quotedRelativePaths"

$hasStagedChanges = & wsl.exe bash -lc "cd '$resolvedWslRepo' && if git diff --cached --quiet; then echo no; else echo yes; fi"
if ($LASTEXITCODE -ne 0) {
    throw 'Failed to inspect staged changes in WSL repo'
}
$hasStagedChanges = ($hasStagedChanges | Select-Object -Last 1).Trim()

if ($hasStagedChanges -eq 'no') {
    Write-Host "[publish] No changes detected after syncing portfolio outputs"
    exit 0
}

Invoke-WslStrict -Command "cd '$resolvedWslRepo' && git -c user.name='github-actions[bot]' -c user.email='41898282+github-actions[bot]@users.noreply.github.com' commit -m '$CommitMessage'"
Invoke-WslStrict -Command "cd '$resolvedWslRepo' && git push origin main"

Write-Host "[publish] Synced portfolio outputs to $resolvedWslRepo and pushed main"
