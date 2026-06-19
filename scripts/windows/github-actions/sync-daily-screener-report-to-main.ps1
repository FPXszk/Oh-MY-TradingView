# Publish daily screener report files from the Windows checkout to main.

param(
    [Parameter(Mandatory = $true)]
    [string]$CommitMessage,

    [string]$ReportPath = 'docs/reports/screener/daily-ranking.md',

    [string]$MetadataPath = 'docs/reports/screener/daily-ranking-run.json'
)

$ErrorActionPreference = 'Stop'

function Resolve-CheckoutFile {
    param([Parameter(Mandatory = $true)][string]$RelativePath)

    $filePath = Join-Path $PWD ($RelativePath -replace '/', '\')
    if (-not (Test-Path $filePath)) {
        throw "Expected file does not exist in the Windows checkout: $filePath"
    }
    return (Resolve-Path $filePath).Path
}

Resolve-CheckoutFile -RelativePath $ReportPath | Out-Null
Resolve-CheckoutFile -RelativePath $MetadataPath | Out-Null

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

& git add -- $ReportPath $MetadataPath
if ($LASTEXITCODE -ne 0) {
    throw 'git add failed'
}

& git diff --cached --quiet
$diffExit = $LASTEXITCODE
if ($diffExit -eq 0) {
    Write-Host '[publish] No daily screener report changes detected'
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

Write-Host '[publish] Published daily screener report changes to main'
