# append-night-batch-workflow-summary.ps1
# Read night batch summary JSON and append a structured summary to
# GITHUB_STEP_SUMMARY. Safely handles nullable fields to avoid
# PowerShell parser ambiguity on Windows.
#
# Usage (GitHub Actions step):
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/windows/github-actions/append-night-batch-workflow-summary.ps1 -SummaryJsonPath "<path>" [-SummaryMdPath "<path>"]

param(
    [Parameter(Mandatory = $true)]
    [AllowEmptyString()]
    [string]$SummaryJsonPath,

    [Parameter(Mandatory = $false)]
    [string]$SummaryMdPath = ''
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

if ($SummaryMdPath -ne '') {
    Add-Content $env:GITHUB_STEP_SUMMARY ''
    Add-Content $env:GITHUB_STEP_SUMMARY '### Summary markdown'
    Add-Content $env:GITHUB_STEP_SUMMARY ''
    Get-Content $SummaryMdPath | Add-Content $env:GITHUB_STEP_SUMMARY
}
