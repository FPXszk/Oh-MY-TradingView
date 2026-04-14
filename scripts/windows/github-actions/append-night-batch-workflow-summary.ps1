# append-night-batch-workflow-summary.ps1
# Read night batch summary JSON and append a structured summary to
# GITHUB_STEP_SUMMARY. Safely handles nullable fields to avoid
# PowerShell parser ambiguity on Windows.
#
# Usage (GitHub Actions step):
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/windows/github-actions/append-night-batch-workflow-summary.ps1 -SummaryJsonPath "<path>" [-SummaryMdPath "<path>"] [-RichReportPath "<path>"] [-RankingArtifactPath "<path>"]

param(
    [Parameter(Mandatory = $true)]
    [AllowEmptyString()]
    [string]$SummaryJsonPath,

    [Parameter(Mandatory = $false)]
    [string]$SummaryMdPath = '',

    [Parameter(Mandatory = $false)]
    [string]$RichReportPath = '',

    [Parameter(Mandatory = $false)]
    [string]$RankingArtifactPath = '',

    [Parameter(Mandatory = $false)]
    [string]$ProtectionReportPath = ''
)

Add-Content $env:GITHUB_STEP_SUMMARY '## Night batch result'
Add-Content $env:GITHUB_STEP_SUMMARY ''

if ($SummaryJsonPath -eq '') {
    Add-Content $env:GITHUB_STEP_SUMMARY '- summary_json: not found'
    exit 0
}

$summary = Get-Content -Raw $SummaryJsonPath | ConvertFrom-Json

$failedStep = if ($summary.failed_step) { $summary.failed_step } else { 'N/A' }
$lastCheckpoint = if ($summary.last_checkpoint) { $summary.last_checkpoint } else { 'N/A' }

Add-Content $env:GITHUB_STEP_SUMMARY "- success: $($summary.success)"
Add-Content $env:GITHUB_STEP_SUMMARY "- termination_reason: $($summary.termination_reason)"
Add-Content $env:GITHUB_STEP_SUMMARY "- failed_step: $failedStep"
Add-Content $env:GITHUB_STEP_SUMMARY "- last_checkpoint: $lastCheckpoint"
Add-Content $env:GITHUB_STEP_SUMMARY "- summary_json: $SummaryJsonPath"

if ($RichReportPath -ne '') {
    Add-Content $env:GITHUB_STEP_SUMMARY "- rich_report: $RichReportPath"
}
if ($RankingArtifactPath -ne '') {
    Add-Content $env:GITHUB_STEP_SUMMARY "- ranking_artifact: $RankingArtifactPath"
}

if ($SummaryMdPath -ne '') {
    Add-Content $env:GITHUB_STEP_SUMMARY ''
    Add-Content $env:GITHUB_STEP_SUMMARY '### Summary markdown'
    Add-Content $env:GITHUB_STEP_SUMMARY ''
    Get-Content $SummaryMdPath | Add-Content $env:GITHUB_STEP_SUMMARY
}

if ($ProtectionReportPath -ne '' -and (Test-Path $ProtectionReportPath)) {
    $protection = Get-Content -Raw $ProtectionReportPath | ConvertFrom-Json
    Add-Content $env:GITHUB_STEP_SUMMARY ''
    Add-Content $env:GITHUB_STEP_SUMMARY '## Live checkout protection'
    Add-Content $env:GITHUB_STEP_SUMMARY ''
    $protStatus = if ($protection.status) { $protection.status } else { 'unknown' }
    Add-Content $env:GITHUB_STEP_SUMMARY "- status: $protStatus"
    $blockedCount = if ($protection.blocked_files) { $protection.blocked_files.Count } else { 0 }
    $warningCount = if ($protection.warning_files) { $protection.warning_files.Count } else { 0 }
    Add-Content $env:GITHUB_STEP_SUMMARY "- blocked_files: $blockedCount"
    Add-Content $env:GITHUB_STEP_SUMMARY "- warning_files: $warningCount"
    Add-Content $env:GITHUB_STEP_SUMMARY "- baseline_path: $($protection.baseline_path)"
    Add-Content $env:GITHUB_STEP_SUMMARY "- report_path: $ProtectionReportPath"
}
