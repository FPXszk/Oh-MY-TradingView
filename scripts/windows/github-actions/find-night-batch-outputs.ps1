# find-night-batch-outputs.ps1
# Locate night batch output files (summary JSON / MD / artifact dir / rich report / ranking)
# and write their paths to GITHUB_OUTPUT.
#
# Usage (GitHub Actions step):
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/windows/github-actions/find-night-batch-outputs.ps1 -ExpectedRunId "gha_<run_id>_<attempt>"

param(
    [Parameter(Mandatory = $true)]
    [string]$ExpectedRunId
)

$artifactDir = ''
$summaryJson = ''
$summaryMd = ''
$richReport = ''
$rankingArtifact = ''
$protectionReport = ''

$searchRoots = @(
    'artifacts\night-batch',
    'results\night-batch'
)

foreach ($searchRoot in $searchRoots) {
    if (-not (Test-Path $searchRoot)) {
        continue
    }

    $summaryJsonFile = Get-ChildItem -Path $searchRoot -Recurse -File `
        -Filter ($ExpectedRunId + '-summary.json') |
        Sort-Object LastWriteTimeUtc -Descending |
        Select-Object -First 1

    if (-not $summaryJsonFile) {
        continue
    }

    $artifactDir = $summaryJsonFile.Directory.FullName
    $summaryJson = $summaryJsonFile.FullName
    $summaryMdCandidate = $summaryJsonFile.FullName -replace '-summary\.json$', '-summary.md'
    if (Test-Path $summaryMdCandidate) {
        $summaryMd = $summaryMdCandidate
    }
    $richReportFile = Get-ChildItem -Path $artifactDir -File -Filter '*-rich-report.md' |
        Sort-Object LastWriteTimeUtc -Descending |
        Select-Object -First 1
    if ($richReportFile) {
        $richReport = $richReportFile.FullName
    }
    $rankingFile = Get-ChildItem -Path $artifactDir -File -Filter '*-combined-ranking.json' |
        Sort-Object LastWriteTimeUtc -Descending |
        Select-Object -First 1
    if ($rankingFile) {
        $rankingArtifact = $rankingFile.FullName
    }
    $protectionReportFile = Get-ChildItem -Path $artifactDir -File -Filter '*-live-checkout-protection.json' |
        Sort-Object LastWriteTimeUtc -Descending |
        Select-Object -First 1
    if ($protectionReportFile) {
        $protectionReport = $protectionReportFile.FullName
    }

    break
}

"round_dir=$artifactDir"            | Out-File -FilePath $env:GITHUB_OUTPUT -Encoding utf8 -Append
"summary_json=$summaryJson"          | Out-File -FilePath $env:GITHUB_OUTPUT -Encoding utf8 -Append
"summary_md=$summaryMd"              | Out-File -FilePath $env:GITHUB_OUTPUT -Encoding utf8 -Append
"rich_report=$richReport"            | Out-File -FilePath $env:GITHUB_OUTPUT -Encoding utf8 -Append
"ranking_artifact=$rankingArtifact"  | Out-File -FilePath $env:GITHUB_OUTPUT -Encoding utf8 -Append
"protection_report=$protectionReport" | Out-File -FilePath $env:GITHUB_OUTPUT -Encoding utf8 -Append
