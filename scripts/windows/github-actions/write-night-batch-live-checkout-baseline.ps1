# write-night-batch-live-checkout-baseline.ps1
# Record SHA-256 hashes of protected config files at workflow start.
# The resulting baseline JSON is consumed by python/night_batch.py
# to detect mid-run changes before production execution.
#
# Usage (GitHub Actions step):
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/windows/github-actions/write-night-batch-live-checkout-baseline.ps1 -RunId "gha_<run_id>_<attempt>" -RunAttempt "<attempt>"

param(
    [Parameter(Mandatory = $true)]
    [string]$RunId,

    [Parameter(Mandatory = $true)]
    [string]$RunAttempt,

    [Parameter(Mandatory = $false)]
    [string]$BundleConfigPath = 'config/night_batch/bundle-foreground-reuse-config.json'
)

if (-not $BundleConfigPath) {
    $BundleConfigPath = 'config/night_batch/bundle-foreground-reuse-config.json'
}

function Normalize-RepoPath {
    param([string]$Value)
    if (-not $Value) { return $Value }
    return $Value.Replace('\', '/')
}

function Get-FileSha256 {
    param([string]$FilePath)
    if (-not (Test-Path $FilePath)) { return $null }
    $hash = Get-FileHash -Path $FilePath -Algorithm SHA256
    return $hash.Hash.ToLower()
}

$BundleConfigPath = Normalize-RepoPath $BundleConfigPath

$bundleConfig = Get-Content -Raw $BundleConfigPath | ConvertFrom-Json
$bundle = $bundleConfig.bundle
$usCampaign = $bundle.us_campaign
$jpCampaign = $bundle.jp_campaign

$strategyPresetsPath = 'config/backtest/strategy-presets.json'

$resolvedCampaigns = @()
$files = @()

$bundleConfigHash = Get-FileSha256 $BundleConfigPath
$files += @{ path = $BundleConfigPath; role = 'bundle_config'; sha256 = $bundleConfigHash }

$strategyPresetsHash = Get-FileSha256 $strategyPresetsPath
$files += @{ path = $strategyPresetsPath; role = 'strategy_presets'; sha256 = $strategyPresetsHash }

if ($usCampaign) {
    $usCampaignPath = Normalize-RepoPath "config/backtest/campaigns/latest/$usCampaign.json"
    $resolvedCampaigns += @{ id = $usCampaign; path = $usCampaignPath }
    $usCampaignHash = Get-FileSha256 $usCampaignPath
    $files += @{ path = $usCampaignPath; role = 'campaign_latest'; sha256 = $usCampaignHash }
}

if ($jpCampaign) {
    $jpCampaignPath = Normalize-RepoPath "config/backtest/campaigns/latest/$jpCampaign.json"
    $resolvedCampaigns += @{ id = $jpCampaign; path = $jpCampaignPath }
    $jpCampaignHash = Get-FileSha256 $jpCampaignPath
    $files += @{ path = $jpCampaignPath; role = 'campaign_latest'; sha256 = $jpCampaignHash }
}

$sortedFiles = $files | Sort-Object { $_.path }
$parts = @()
foreach ($f in $sortedFiles) {
    $parts += if ($f.sha256) { $f.sha256 } else { 'missing' }
}
$concat = $parts -join ':'
$sha256 = [System.Security.Cryptography.SHA256]::Create()
$bytes = [System.Text.Encoding]::UTF8.GetBytes($concat)
$hashBytes = $sha256.ComputeHash($bytes)
$aggregateFingerprint = ($hashBytes | ForEach-Object { $_.ToString('x2') }) -join ''

$baseline = [ordered]@{
    run_id                = $RunId
    run_attempt           = $RunAttempt
    algorithm             = 'sha256'
    bundle_config_path    = $BundleConfigPath
    resolved_campaigns    = $resolvedCampaigns
    files                 = $files
    aggregate_fingerprint = $aggregateFingerprint
    created_at            = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
}

$outputDir = 'docs/research/results/night-batch/_workflow'
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$baselinePath = Normalize-RepoPath (Join-Path $outputDir "$RunId-live-checkout-baseline.json")
$baseline | ConvertTo-Json -Depth 10 | Out-File -FilePath $baselinePath -Encoding utf8

Write-Host "[diag] live_checkout_baseline written to $baselinePath"

if ($env:GITHUB_ENV) {
    "NIGHT_BATCH_LIVE_CHECKOUT_BASELINE_PATH=$baselinePath" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append
}
