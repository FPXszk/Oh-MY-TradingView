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
$campaignManifestJson = ''
$campaignManifestMd = ''
$campaignArtifactDirs = [System.Collections.Generic.List[string]]::new()

$searchRoots = @(
    'artifacts\night-batch',
    'results\night-batch'
)

function Resolve-RepoPath {
    param(
        [Parameter(Mandatory = $false)]
        [string]$PathValue = ''
    )

    if ([string]::IsNullOrWhiteSpace($PathValue)) {
        return ''
    }

    $normalized = $PathValue -replace '/', '\'
    if ([System.IO.Path]::IsPathRooted($normalized)) {
        return $normalized
    }

    return Join-Path $PWD $normalized
}

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

    try {
        $summaryData = Get-Content -Raw -Path $summaryJson | ConvertFrom-Json
        $campaignManifestJson = Resolve-RepoPath ([string]$summaryData.campaign_manifest_json_path)
        $campaignManifestMd = Resolve-RepoPath ([string]$summaryData.campaign_manifest_md_path)

        foreach ($artifactEntry in @($summaryData.campaign_artifacts)) {
            $campaignDirPath = [string]$artifactEntry.campaign_dir
            if ([string]::IsNullOrWhiteSpace($campaignDirPath)) {
                $campaign = [string]$artifactEntry.campaign
                $phase = [string]$artifactEntry.phase
                if (-not [string]::IsNullOrWhiteSpace($campaign) -and -not [string]::IsNullOrWhiteSpace($phase)) {
                    $campaignDirPath = "artifacts/campaigns/$campaign/$phase"
                }
            }
            $campaignDir = Resolve-RepoPath $campaignDirPath
            if ($campaignDir -ne '' -and (Test-Path $campaignDir) -and (-not $campaignArtifactDirs.Contains($campaignDir))) {
                $campaignArtifactDirs.Add($campaignDir)
            }
        }

        foreach ($step in @($summaryData.steps)) {
            foreach ($capturedLine in @($step.captured_lines)) {
                $line = [string]$capturedLine.line
                if ($line -match '^artifacts/campaigns/([^/]+)/([^/]+)/') {
                    $campaignDir = Join-Path $PWD ("artifacts\campaigns\" + $Matches[1] + "\" + $Matches[2])
                    if ((Test-Path $campaignDir) -and (-not $campaignArtifactDirs.Contains($campaignDir))) {
                        $campaignArtifactDirs.Add($campaignDir)
                    }
                }
            }
        }
    } catch {
        # best-effort only
    }

    break
}

"round_dir=$artifactDir"            | Out-File -FilePath $env:GITHUB_OUTPUT -Encoding utf8 -Append
"summary_json=$summaryJson"          | Out-File -FilePath $env:GITHUB_OUTPUT -Encoding utf8 -Append
"summary_md=$summaryMd"              | Out-File -FilePath $env:GITHUB_OUTPUT -Encoding utf8 -Append
"rich_report=$richReport"            | Out-File -FilePath $env:GITHUB_OUTPUT -Encoding utf8 -Append
"ranking_artifact=$rankingArtifact"  | Out-File -FilePath $env:GITHUB_OUTPUT -Encoding utf8 -Append
"protection_report=$protectionReport" | Out-File -FilePath $env:GITHUB_OUTPUT -Encoding utf8 -Append
"campaign_manifest_json=$campaignManifestJson" | Out-File -FilePath $env:GITHUB_OUTPUT -Encoding utf8 -Append
"campaign_manifest_md=$campaignManifestMd" | Out-File -FilePath $env:GITHUB_OUTPUT -Encoding utf8 -Append
"campaign_artifact_paths<<EOF"       | Out-File -FilePath $env:GITHUB_OUTPUT -Encoding utf8 -Append
$campaignArtifactDirs                | Out-File -FilePath $env:GITHUB_OUTPUT -Encoding utf8 -Append
"EOF"                                | Out-File -FilePath $env:GITHUB_OUTPUT -Encoding utf8 -Append
