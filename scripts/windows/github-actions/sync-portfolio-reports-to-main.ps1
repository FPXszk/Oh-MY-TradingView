# Publish portfolio workflow outputs from the Windows checkout to main.

param(
    [Parameter(Mandatory = $true)]
    [string]$CommitMessage,

    [Parameter(Mandatory = $true)]
    [string[]]$RelativePaths
)

$ErrorActionPreference = 'Stop'

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

function Resolve-CheckoutPath {
    param([Parameter(Mandatory = $true)][string]$RelativePath)

    $resolvedPath = Join-Path $PWD ($RelativePath -replace '/', '\')
    if (-not (Test-Path $resolvedPath)) {
        throw "Expected path does not exist in the Windows checkout: $resolvedPath"
    }
    return (Resolve-Path $resolvedPath).Path
}

$RelativePaths = Normalize-RelativePaths -Values $RelativePaths
if ($RelativePaths.Count -eq 0) {
    throw 'RelativePaths must contain at least one path'
}

foreach ($relativePath in $RelativePaths) {
    Resolve-CheckoutPath -RelativePath $relativePath | Out-Null
}

$origin = (& git remote get-url origin).Trim()
if ($LASTEXITCODE -ne 0 -or ($origin -notmatch '^(git@|ssh://)')) {
    throw 'origin must use SSH before publishing reports'
}

& git fetch origin main
if ($LASTEXITCODE -ne 0) {
    throw 'git fetch origin main failed'
}

$head = (& git rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0) {
    throw 'git rev-parse HEAD failed'
}
$originMain = (& git rev-parse origin/main).Trim()
if ($LASTEXITCODE -ne 0) {
    throw 'git rev-parse origin/main failed'
}
if ($head -ne $originMain) {
    throw 'checkout HEAD must match origin/main before publishing reports'
}

& git add -- $RelativePaths
if ($LASTEXITCODE -ne 0) {
    throw 'git add failed'
}

& git diff --cached --quiet
$diffExit = $LASTEXITCODE
if ($diffExit -eq 0) {
    Write-Host '[publish] No portfolio output changes detected'
    exit 0
}
if ($diffExit -ne 1) {
    throw 'git diff --cached --quiet failed'
}

& git -c user.name='github-actions[bot]' -c user.email='41898282+github-actions[bot]@users.noreply.github.com' commit -m $CommitMessage
if ($LASTEXITCODE -ne 0) {
    throw 'git commit failed'
}

& git push origin HEAD:main
if ($LASTEXITCODE -ne 0) {
    throw 'git push origin HEAD:main failed'
}

Write-Host '[publish] Published portfolio output changes to main'
