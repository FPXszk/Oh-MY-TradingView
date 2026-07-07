import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_ROOT = process.cwd();
const WORKFLOW_PATH = join(PROJECT_ROOT, '.github', 'workflows', 'night-batch-self-hosted.yml');
const WRAPPER_PATH = join(PROJECT_ROOT, 'scripts', 'windows', 'run-night-batch-self-hosted.cmd');
const WRAPPER_HELPER_PATH = join(PROJECT_ROOT, 'scripts', 'windows', 'run-night-batch-self-hosted.ps1');
const BOOTSTRAP_PATH = join(PROJECT_ROOT, 'scripts', 'windows', 'bootstrap-self-hosted-runner.cmd');
const RUNNER_WRAPPER_PATH = join(PROJECT_ROOT, 'scripts', 'windows', 'run-self-hosted-runner-with-bootstrap.cmd');
const AUTOSTART_SCRIPT_PATH = join(PROJECT_ROOT, 'scripts', 'windows', 'register-self-hosted-runner-autostart.cmd');
const FIND_OUTPUTS_SCRIPT_PATH = join(PROJECT_ROOT, 'scripts', 'windows', 'github-actions', 'find-night-batch-outputs.ps1');
const APPEND_SUMMARY_SCRIPT_PATH = join(PROJECT_ROOT, 'scripts', 'windows', 'github-actions', 'append-night-batch-workflow-summary.ps1');
const READINESS_SCRIPT_PATH = join(PROJECT_ROOT, 'scripts', 'windows', 'github-actions', 'test-night-batch-readiness.ps1');
const GITATTRIBUTES_PATH = join(PROJECT_ROOT, '.gitattributes');
const BUNDLE_FG_CONFIG_PATH = join(PROJECT_ROOT, 'config', 'night_batch', 'bundle-foreground-reuse-config.json');
const BUNDLE_FG_FAILED36_CONFIG_PATH = join(PROJECT_ROOT, 'config', 'night_batch', 'bundle-foreground-reuse-failed36-config.json');
const EMR_NEXT_RUN84_FAILED_CONFIG_PATH = join(PROJECT_ROOT, 'config', 'night_batch', 'emr-next-50pack-run84-failed-us40-config.json');
const EMR_AE_TPQTY_100PACK_CONFIG_PATH = join(PROJECT_ROOT, 'config', 'night_batch', 'emr-ae-tpqty-100pack-focus8-config.json');
const BASELINE_WRITER_PATH = join(PROJECT_ROOT, 'scripts', 'windows', 'github-actions', 'write-night-batch-live-checkout-baseline.ps1');
const WINDOWS_RUNNER_SCRIPT_PATHS = [BOOTSTRAP_PATH, RUNNER_WRAPPER_PATH, AUTOSTART_SCRIPT_PATH];

describe('run-night-batch-self-hosted.cmd', () => {
  it('delegates night batch execution to the Windows-native PowerShell helper', () => {
    const script = readFileSync(WRAPPER_PATH, 'utf8');

    assert.match(script, /run-night-batch-self-hosted\.ps1/,
      'cmd wrapper must delegate implementation logic to PowerShell');
    assert.match(script, /-ConfigPath "%CONFIG_PATH%"/,
      'cmd wrapper must pass the config path through Windows cmd expansion');
    assert.match(script, /-RoundMode "%ROUND_MODE%"/,
      'cmd wrapper must pass an explicit round mode when provided');
    assert.doesNotMatch(script, /wsl\.exe|bash -lc/,
      'cmd wrapper must not depend on WSL');
  });

  it('falls back to advance-next-round when resume hits a fingerprint mismatch', () => {
    const script = readFileSync(WRAPPER_HELPER_PATH, 'utf8');

    assert.match(script, /Latest round fingerprint does not match the current strategy set/);
    assert.match(script, /fingerprint mismatch on resume-current-round; retrying with advance-next-round/);
    assert.match(script, /Select-String[\s\S]*Latest round fingerprint does not match the current strategy set/);
  });

  it('keeps the working directory anchored to the Windows repo path', () => {
    const script = readFileSync(WRAPPER_PATH, 'utf8');

    assert.match(script, /pushd "%REPO_WIN%"/);
    assert.doesNotMatch(script, /REPO_WSL|wsl\.exe/);
  });

  it('does not contain runner startup logic', () => {
    const script = readFileSync(WRAPPER_PATH, 'utf8');

    assert.doesNotMatch(script, /run\.cmd/i, 'night-batch wrapper must not call run.cmd');
    assert.doesNotMatch(script, /safe\.directory/i, 'night-batch wrapper must not set safe.directory');
  });
});

describe('bootstrap-self-hosted-runner.cmd', () => {
  it('exists as a standalone script', () => {
    assert.ok(existsSync(BOOTSTRAP_PATH), 'bootstrap-self-hosted-runner.cmd must exist');
  });

  it('sets git safe.directory for the runner workspace', () => {
    const script = readFileSync(BOOTSTRAP_PATH, 'utf8');

    assert.match(script, /git\s+config\s+--global\s+--add\s+safe\.directory/,
      'bootstrap must configure git safe.directory');
    assert.match(script, /Oh-MY-TradingView/,
      'bootstrap must target this repository workspace explicitly');
    assert.match(script, /WORKSPACE_DIR_GIT=%WORKSPACE_DIR:\\=\/%/,
      'bootstrap must normalize the workspace path for git');
    assert.doesNotMatch(script, /safe\.directory \*/,
      'bootstrap must not widen safe.directory to all repositories');
  });

  it('uses fail-fast error handling', () => {
    const script = readFileSync(BOOTSTRAP_PATH, 'utf8');

    assert.match(script, /exit\s+\/b\s+/i, 'bootstrap must exit on failure');
    assert.match(script, /if errorlevel 1 \(/i,
      'bootstrap must use runtime errorlevel checks after git config');
    assert.doesNotMatch(script, /if %ERRORLEVEL%/i,
      'bootstrap must avoid parse-time ERRORLEVEL expansion inside cmd blocks');
  });

  it('does not contain night-batch execution logic', () => {
    const script = readFileSync(BOOTSTRAP_PATH, 'utf8');

    assert.doesNotMatch(script, /night_batch/i,
      'bootstrap must not contain night-batch logic');
    assert.doesNotMatch(script, /smoke-prod/i,
      'bootstrap must not contain smoke-prod logic');
  });

  it('keeps runner bootstrap scripts ASCII-safe for cmd.exe', () => {
    for (const scriptPath of WINDOWS_RUNNER_SCRIPT_PATHS) {
      const bytes = readFileSync(scriptPath);
      const hasNonAscii = bytes.some(byte => byte > 0x7f);

      assert.equal(hasNonAscii, false,
        `${scriptPath} must stay ASCII-only to avoid Windows cmd encoding issues`);
    }
  });
});

describe('run-self-hosted-runner-with-bootstrap.cmd', () => {
  it('exists as a standalone wrapper', () => {
    assert.ok(existsSync(RUNNER_WRAPPER_PATH),
      'run-self-hosted-runner-with-bootstrap.cmd must exist');
  });

  it('calls bootstrap before delegating to run.cmd', () => {
    const script = readFileSync(RUNNER_WRAPPER_PATH, 'utf8');

    const lines = script.split(/\r?\n/).filter(l => !l.trimStart().startsWith('REM'));
    const execLines = lines.join('\n');
    const bootstrapIdx = execLines.indexOf('bootstrap-self-hosted-runner.cmd');
    const runCmdMatch = execLines.match(/\\run\.cmd/);

    assert.ok(bootstrapIdx >= 0, 'wrapper must call bootstrap-self-hosted-runner.cmd');
    assert.ok(runCmdMatch, 'wrapper must delegate to run.cmd');
    assert.ok(runCmdMatch.index > bootstrapIdx,
      'wrapper must call bootstrap before run.cmd');
    assert.match(script, /bootstrap-self-hosted-runner\.cmd"\s+"%RUNNER_DIR%"/,
      'wrapper must pass RUNNER_DIR through to bootstrap');
  });

  it('fails fast when bootstrap fails', () => {
    const script = readFileSync(RUNNER_WRAPPER_PATH, 'utf8');

    assert.match(script, /ERRORLEVEL/i,
      'wrapper must check ERRORLEVEL after bootstrap');
  });

  it('fails fast when run.cmd is missing', () => {
    const script = readFileSync(RUNNER_WRAPPER_PATH, 'utf8');

    assert.match(script, /if not exist "%RUNNER_DIR%\\run\.cmd"/i,
      'wrapper must guard against a missing run.cmd');
  });

  it('does not contain night-batch logic', () => {
    const script = readFileSync(RUNNER_WRAPPER_PATH, 'utf8');

    assert.doesNotMatch(script, /night_batch/i,
      'runner wrapper must not contain night-batch logic');
  });
});

describe('register-self-hosted-runner-autostart.cmd', () => {
  it('exists as a standalone script', () => {
    assert.ok(existsSync(AUTOSTART_SCRIPT_PATH),
      'register-self-hosted-runner-autostart.cmd must exist');
  });

  it('registers Task Scheduler autostart without using service mode', () => {
    const script = readFileSync(AUTOSTART_SCRIPT_PATH, 'utf8');

    assert.match(script, /schtasks/i,
      'autostart script must use schtasks');
    assert.match(script, /ONLOGON/i,
      'autostart script must register an ONLOGON trigger');
    assert.match(script, /run-self-hosted-runner-with-bootstrap\.cmd/i,
      'autostart script must launch the bootstrap runner wrapper');
    assert.doesNotMatch(script, /runsvc|svc\.sh|runasservice/i,
      'autostart script must not switch to service mode');
  });

  it('uses a generated launcher to avoid fragile schtasks quoting', () => {
    const script = readFileSync(AUTOSTART_SCRIPT_PATH, 'utf8');

    assert.match(script, /runner-autostart-launch\.cmd/i,
      'autostart script must generate a dedicated launcher file');
    assert.match(script, /AUTOSTART_LAUNCHER_SHORT/i,
      'autostart script must prefer a short launcher path for schtasks');
    assert.doesNotMatch(script, /cmd\.exe \/c/i,
      'autostart script must avoid nested cmd.exe /c quoting in schtasks');
  });

  it('generated launcher best-effort starts OpenD before the runner wrapper', () => {
    const script = readFileSync(AUTOSTART_SCRIPT_PATH, 'utf8');

    assert.match(script, /OPEND_EXE=%%APPDATA%%\\moomoo_OpenD\\moomoo_OpenD\.exe/i,
      'autostart launcher must resolve OpenD from the runner user APPDATA path');
    assert.match(script, /start "" "%%OPEND_EXE%%"/i,
      'autostart launcher must best-effort start OpenD when it exists');
    assert.match(script, /OpenD not found at %%OPEND_EXE%%/i,
      'autostart launcher must log when OpenD is missing instead of failing');
    assert.ok(
      script.indexOf('start "" "%%OPEND_EXE%%"') < script.indexOf('call "%WRAPPER_COPY%" "%RUNNER_DIR%"'),
      'autostart launcher must attempt OpenD before starting the runner wrapper',
    );
  });

  it('generated launcher best-effort starts TradingView with local debug-port readiness checks', () => {
    const script = readFileSync(AUTOSTART_SCRIPT_PATH, 'utf8');

    assert.match(script, /TV_DIRECT=%%LOCALAPPDATA%%\\TradingView\\TradingView\.exe/i,
      'autostart launcher must know the direct TradingView executable path');
    assert.match(script, /TV_PORT=9222/i,
      'autostart launcher must target the default local TradingView debug port');
    assert.match(script, /Invoke-WebRequest -UseBasicParsing -Uri \$startupUrl -TimeoutSec 3/i,
      'autostart launcher must probe the local TradingView CDP endpoint before launching');
    assert.match(script, /response\.Content -match 'tradingview' -and \$response\.Content -match '\/chart'/i,
      'autostart launcher must verify a TradingView chart target before skipping launch');
    assert.match(script, /Start-Process -FilePath \$env:TV_DIRECT -ArgumentList \('\-\-remote-debugging-port=' \+ \$env:TV_PORT\) -WindowStyle Normal/i,
      'autostart launcher must prefer direct TradingView launch with the remote debugging port');
    assert.match(script, /Get-ChildItem -Path \$env:TV_SHORTCUT_DIR -Filter '\*\.lnk' -File/i,
      'autostart launcher must fall back to searching the TradingView shortcut directory');
    assert.match(script, /Start-Process -FilePath \$shortcut -WindowStyle Normal/i,
      'autostart launcher must keep shortcut fallback launches visible');
    assert.match(script, /Start-Sleep -Seconds \(\[int\]\$env:TV_WAIT_SEC\)/i,
      'autostart launcher must wait briefly for TradingView to finish exposing the debug endpoint');
    assert.ok(
      script.indexOf('start "" "%%OPEND_EXE%%"') < script.indexOf('Invoke-WebRequest -UseBasicParsing -Uri $startupUrl -TimeoutSec 3'),
      'autostart launcher must handle OpenD before probing TradingView',
    );
    assert.ok(
      script.indexOf('Invoke-WebRequest -UseBasicParsing -Uri $startupUrl -TimeoutSec 3') < script.indexOf('call "%WRAPPER_COPY%" "%RUNNER_DIR%"'),
      'autostart launcher must handle TradingView before starting the runner wrapper',
    );
  });

  it('stages self-contained startup scripts under the runner directory', () => {
    const script = readFileSync(AUTOSTART_SCRIPT_PATH, 'utf8');

    assert.match(script, /BOOTSTRAP_COPY=%RUNNER_DIR%\\_diag\\bootstrap-self-hosted-runner\.cmd/i,
      'autostart script must stage bootstrap under the runner-owned _diag directory');
    assert.match(script, /WRAPPER_COPY=%RUNNER_DIR%\\_diag\\run-self-hosted-runner-with-bootstrap\.cmd/i,
      'autostart script must stage the wrapper under the runner-owned _diag directory');
    assert.match(script, /copy \/Y "%BOOTSTRAP_SOURCE%" "%BOOTSTRAP_COPY%"/i,
      'autostart script must copy bootstrap into the runner-owned _diag directory');
    assert.match(script, /copy \/Y "%WRAPPER_SOURCE%" "%WRAPPER_COPY%"/i,
      'autostart script must copy the wrapper into the runner-owned _diag directory');
  });
});

describe('.gitattributes', () => {
  it('forces CRLF checkout for cmd scripts', () => {
    assert.ok(existsSync(GITATTRIBUTES_PATH), '.gitattributes must exist');

    const attrs = readFileSync(GITATTRIBUTES_PATH, 'utf8');

    assert.match(attrs, /\*\.cmd\s+text\s+eol=crlf/i,
      '.gitattributes must force CRLF checkout for cmd files');
  });
});

describe('foreground bundle config default campaign', () => {
  const config = JSON.parse(readFileSync(BUNDLE_FG_CONFIG_PATH, 'utf8'));

  it('us_campaign defaults to ema-breakout-winrate-stopout-us40-50pack', () => {
    assert.equal(config.bundle.us_campaign, 'ema-breakout-winrate-stopout-us40-50pack',
      'bundle-foreground-reuse-config.json must default us_campaign to ema-breakout-winrate-stopout-us40-50pack');
  });

  it('jp_campaign is omitted for the US-only bundle default', () => {
    assert.equal('jp_campaign' in config.bundle, false,
      'bundle-foreground-reuse-config.json must not keep a JP default for the US-only bundle');
  });

  it('config path must not change', () => {
    assert.ok(existsSync(BUNDLE_FG_CONFIG_PATH),
      'config/night_batch/bundle-foreground-reuse-config.json must exist at the canonical path');
  });
});

describe('foreground bundle failed36 config', () => {
  const config = JSON.parse(readFileSync(BUNDLE_FG_FAILED36_CONFIG_PATH, 'utf8'));

  it('targets the failed36 campaign for workflow dispatch', () => {
    assert.equal(config.bundle.us_campaign, 'ema-breakout-winrate-stopout-failed-us40-pack',
      'bundle-foreground-reuse-failed36-config.json must target the failed36 campaign');
  });

  it('keeps foreground smoke and full production phases', () => {
    assert.equal(config.bundle.smoke_phases, 'smoke');
    assert.equal(config.bundle.production_phases, 'full');
    assert.equal(config.runtime.detach_after_smoke, false);
  });

  it('config path must exist at the dedicated failed36 location', () => {
    assert.ok(existsSync(BUNDLE_FG_FAILED36_CONFIG_PATH),
      'config/night_batch/bundle-foreground-reuse-failed36-config.json must exist');
  });
});

describe('emr-next run84 failed config', () => {
  const config = JSON.parse(readFileSync(EMR_NEXT_RUN84_FAILED_CONFIG_PATH, 'utf8'));

  it('targets the run84 failed-only campaign for workflow dispatch', () => {
    assert.equal(config.bundle.us_campaign, 'emr-next-50pack-run84-failed-us40-pack',
      'emr-next-50pack-run84-failed-us40-config.json must target the run84 failed-only campaign');
  });

  it('keeps foreground smoke and full production phases', () => {
    assert.equal(config.bundle.smoke_phases, 'smoke');
    assert.equal(config.bundle.production_phases, 'full');
    assert.equal(config.runtime.detach_after_smoke, false);
  });

  it('config path must exist at the dedicated run84 failed location', () => {
    assert.ok(existsSync(EMR_NEXT_RUN84_FAILED_CONFIG_PATH),
      'config/night_batch/emr-next-50pack-run84-failed-us40-config.json must exist');
  });
});

describe('emr-ae tpqty 100pack config', () => {
  const config = JSON.parse(readFileSync(EMR_AE_TPQTY_100PACK_CONFIG_PATH, 'utf8'));

  it('targets the tpqty 100pack focus-8 campaign for workflow dispatch', () => {
    assert.equal(config.bundle.us_campaign, 'emr-ae-tpqty-100pack-focus8',
      'emr-ae-tpqty-100pack-focus8-config.json must target the tpqty 100pack campaign');
  });

  it('keeps foreground smoke and full production phases', () => {
    assert.equal(config.bundle.smoke_phases, 'smoke');
    assert.equal(config.bundle.production_phases, 'full');
    assert.equal(config.runtime.detach_after_smoke, false);
  });

  it('config path must exist at the dedicated tpqty 100pack location', () => {
    assert.ok(existsSync(EMR_AE_TPQTY_100PACK_CONFIG_PATH),
      'config/night_batch/emr-ae-tpqty-100pack-focus8-config.json must exist');
  });
});

describe('night-batch-self-hosted workflow', () => {
  it('uses workflow_dispatch only and removes stale schedule freshness gating', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

    assert.match(workflow, /workflow_dispatch:/,
      'workflow must remain manually dispatchable');
    assert.doesNotMatch(workflow, /\n\s*schedule:/,
      'workflow must not retain a daily schedule trigger');
    assert.doesNotMatch(workflow, /Evaluate schedule freshness/,
      'workflow must not keep the stale schedule freshness step');
    assert.doesNotMatch(workflow, /should_run=/,
      'workflow must not export should_run gating outputs');
    assert.doesNotMatch(workflow, /Skipped stale scheduled run/i,
      'workflow must not report stale scheduled skips after schedule removal');
  });

  it('defaults workflow_dispatch config_path to the foreground monitoring config', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

    assert.match(workflow, /default:\s+config\/night_batch\/bundle-foreground-reuse-config\.json/,
      'workflow must default to the foreground monitoring config');
  });

  it('sets an explicit job timeout long enough for the foreground 50pack run', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

    assert.match(workflow, /start-night-batch:\s*\n\s+timeout-minutes:\s+540/,
      'workflow must set start-night-batch.timeout-minutes to 540');
  });

  it('publishes GitHub summary details and uploads artifacts after the run', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

    assert.match(workflow, /append-night-batch-workflow-summary\.ps1/,
      'workflow must call the summary script that writes to GITHUB_STEP_SUMMARY');
    assert.match(workflow, /Ensure TradingView is running/,
      'workflow must ensure TradingView is running before invoking the smoke run');
    assert.match(workflow, /ConvertFrom-Json/,
      'workflow must inspect the config path before starting TradingView');
    assert.match(workflow, /Start-Process -FilePath \$launch\.shortcut_path/,
      'workflow must start TradingView from the configured shortcut when needed');
    assert.match(workflow, /Start-Process -FilePath \$launch\.shortcut_path -WindowStyle Normal/,
      'workflow must request a normal visible TradingView window from the shortcut');
    assert.match(workflow, /Get-ChildItem -Path \$shortcutDir -Filter '\*\.lnk' -File/,
      'workflow must fall back to searching the TradingView folder for a shortcut');
    assert.match(workflow, /Start-Process -FilePath \$shortcut -WindowStyle Normal/,
      'workflow must keep fallback shortcut launches visible');
    assert.match(workflow, /Start-Process -FilePath \$launcher -ArgumentList "--remote-debugging-port=\$\(\$runtime\.startup_check_port\)" -WindowStyle Normal/,
      'workflow must keep direct launcher fallback visible');
    assert.doesNotMatch(workflow, /WindowStyle\s+Hidden/i,
      'workflow must not hide the TradingView window');
    assert.doesNotMatch(workflow, /--headless/i,
      'workflow must not launch TradingView in headless mode');
    assert.match(workflow, /actions\/upload-artifact@v4/,
      'workflow must upload night batch artifacts');
    assert.match(workflow, /Archive completed night batch rounds/,
      'workflow must archive completed rounds after artifact upload');
    assert.match(workflow, /Archive stale latest research docs/,
      'workflow must automatically archive stale latest research docs');
    assert.match(workflow, /archive-stale-latest\.mjs/,
      'workflow must invoke the latest-doc cleanup script');
    assert.ok(
      workflow.indexOf('Ensure TradingView is running') < workflow.indexOf('Run foreground production'),
      'workflow must launch TradingView before the smoke run',
    );
    assert.ok(
      workflow.indexOf('Archive completed night batch rounds') > workflow.indexOf('actions/upload-artifact@v4'),
      'workflow must archive rounds after the upload step',
    );
    assert.ok(
      workflow.indexOf('Archive stale latest research docs') > workflow.indexOf('Archive completed night batch rounds'),
      'workflow must archive stale latest docs after completed rounds are archived',
    );
  });
});

describe('night-batch summary step PowerShell safety', () => {
  const findScript = readFileSync(FIND_OUTPUTS_SCRIPT_PATH, 'utf8');
  const summaryScript = readFileSync(APPEND_SUMMARY_SCRIPT_PATH, 'utf8');

  it('summary script exists and is non-empty', () => {
    assert.ok(summaryScript.length > 0,
      'append-night-batch-workflow-summary.ps1 must exist and be non-empty');
  });

  it('summary script must not use inline subexpression-if inside Add-Content', () => {
    const addContentLines = summaryScript.split(/\r?\n/)
      .filter(l => l.includes('Add-Content'));
    for (const line of addContentLines) {
      assert.doesNotMatch(line, /\$\(if\s/,
        `Add-Content must not contain inline $(if ...) — found: ${line.trim()}`);
    }
  });

  it('summary script must pre-assign nullable fields before emitting them', () => {
    assert.match(summaryScript, /\$failedStep\s*=/,
      'summary script must pre-assign $failedStep');
    assert.match(summaryScript, /\$lastCheckpoint\s*=/,
      'summary script must pre-assign $lastCheckpoint');
  });

  it('summary script must still emit all required fields', () => {
    assert.match(summaryScript, /success/,
      'summary script must emit success field');
    assert.match(summaryScript, /termination_reason/,
      'summary script must emit termination_reason field');
    assert.match(summaryScript, /failed_step/,
      'summary script must emit failed_step field');
    assert.match(summaryScript, /last_checkpoint/,
      'summary script must emit last_checkpoint field');
    assert.match(summaryScript, /summary_json/,
      'summary script must emit summary_json field');
  });
});

describe('external PowerShell scripts for workflow summary', () => {
  it('find-night-batch-outputs.ps1 exists', () => {
    assert.ok(existsSync(FIND_OUTPUTS_SCRIPT_PATH),
      'scripts/windows/github-actions/find-night-batch-outputs.ps1 must exist');
  });

  it('append-night-batch-workflow-summary.ps1 exists', () => {
    assert.ok(existsSync(APPEND_SUMMARY_SCRIPT_PATH),
      'scripts/windows/github-actions/append-night-batch-workflow-summary.ps1 must exist');
  });

  it('find-night-batch-outputs.ps1 outputs round_dir, summary_json, summary_md', () => {
    const script = readFileSync(FIND_OUTPUTS_SCRIPT_PATH, 'utf8');

    assert.match(script, /round_dir=/,
      'find script must output round_dir');
    assert.match(script, /summary_json=/,
      'find script must output summary_json');
    assert.match(script, /summary_md=/,
      'find script must output summary_md');
  });

  it('find-night-batch-outputs.ps1 outputs rich_report, ranking_artifact, campaign manifests, and campaign_artifact_paths', () => {
    const script = readFileSync(FIND_OUTPUTS_SCRIPT_PATH, 'utf8');

    assert.match(script, /rich_report=/,
      'find script must output rich_report');
    assert.match(script, /ranking_artifact=/,
      'find script must output ranking_artifact');
    assert.match(script, /campaign_manifest_json=/,
      'find script must output campaign_manifest_json');
    assert.match(script, /campaign_manifest_md=/,
      'find script must output campaign_manifest_md');
    assert.match(script, /campaign_artifact_paths/i,
      'find script must output campaign_artifact_paths');
  });

  it('find-night-batch-outputs.ps1 searches artifacts/night-batch for workflow outputs', () => {
    const script = readFileSync(FIND_OUTPUTS_SCRIPT_PATH, 'utf8');

    assert.match(script, /artifacts\\night-batch/,
      'find script must search artifacts/night-batch where night_batch.py writes summaries');
    assert.match(script, /artifacts\/campaigns|artifacts\\campaigns/,
      'find script must derive campaign artifact directories from summary traces');
  });

  it('append-night-batch-workflow-summary.ps1 safely handles nullable fields', () => {
    const script = readFileSync(APPEND_SUMMARY_SCRIPT_PATH, 'utf8');

    assert.match(script, /\$failedStep/,
      'summary script must pre-assign $failedStep');
    assert.match(script, /\$lastCheckpoint/,
      'summary script must pre-assign $lastCheckpoint');
    assert.doesNotMatch(script, /\$\(if\s/,
      'summary script must not use inline $(if ...) pattern');
  });

  it('append-night-batch-workflow-summary.ps1 emits all required fields', () => {
    const script = readFileSync(APPEND_SUMMARY_SCRIPT_PATH, 'utf8');

    assert.match(script, /success/, 'summary script must emit success');
    assert.match(script, /termination_reason/, 'summary script must emit termination_reason');
    assert.match(script, /failed_step/, 'summary script must emit failed_step');
    assert.match(script, /last_checkpoint/, 'summary script must emit last_checkpoint');
    assert.match(script, /summary_json/, 'summary script must emit summary_json');
  });

  it('find-night-batch-outputs.ps1 accepts ExpectedRunId parameter', () => {
    const script = readFileSync(FIND_OUTPUTS_SCRIPT_PATH, 'utf8');

    assert.match(script, /param\s*\(/i,
      'find script must declare parameters via param()');
    assert.match(script, /ExpectedRunId/,
      'find script must accept ExpectedRunId parameter');
  });

  it('append-night-batch-workflow-summary.ps1 accepts SummaryJsonPath parameter', () => {
    const script = readFileSync(APPEND_SUMMARY_SCRIPT_PATH, 'utf8');

    assert.match(script, /param\s*\(/i,
      'summary script must declare parameters via param()');
    assert.match(script, /SummaryJsonPath/,
      'summary script must accept SummaryJsonPath parameter');
  });

  it('append-night-batch-workflow-summary.ps1 accepts RichReportPath, RankingArtifactPath, and campaign manifest parameters', () => {
    const script = readFileSync(APPEND_SUMMARY_SCRIPT_PATH, 'utf8');

    assert.match(script, /RichReportPath/,
      'summary script must accept RichReportPath parameter');
    assert.match(script, /RankingArtifactPath/,
      'summary script must accept RankingArtifactPath parameter');
    assert.match(script, /CampaignManifestJsonPath/,
      'summary script must accept CampaignManifestJsonPath parameter');
    assert.match(script, /CampaignManifestMdPath/,
      'summary script must accept CampaignManifestMdPath parameter');
  });

  it('append-night-batch-workflow-summary.ps1 emits rich_report, ranking_artifact, and campaign manifest paths when provided', () => {
    const script = readFileSync(APPEND_SUMMARY_SCRIPT_PATH, 'utf8');

    assert.match(script, /rich_report/,
      'summary script must emit rich_report field');
    assert.match(script, /ranking_artifact/,
      'summary script must emit ranking_artifact field');
    assert.match(script, /campaign_manifest_json/,
      'summary script must emit campaign_manifest_json field');
    assert.match(script, /campaign_manifest_md/,
      'summary script must emit campaign_manifest_md field');
  });
});

describe('workflow delegates to external PowerShell scripts', () => {
  const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

  it('Locate step calls find-night-batch-outputs.ps1', () => {
    assert.match(workflow, /find-night-batch-outputs\.ps1/,
      'workflow must call find-night-batch-outputs.ps1');
  });

  it('Append step calls append-night-batch-workflow-summary.ps1', () => {
    assert.match(workflow, /append-night-batch-workflow-summary\.ps1/,
      'workflow must call append-night-batch-workflow-summary.ps1');
  });

  it('Append step passes rich_report, ranking_artifact, and campaign manifest outputs', () => {
    assert.match(workflow, /RichReportPath/,
      'workflow Append step must pass RichReportPath');
    assert.match(workflow, /RankingArtifactPath/,
      'workflow Append step must pass RankingArtifactPath');
    assert.match(workflow, /CampaignManifestJsonPath/,
      'workflow Append step must pass CampaignManifestJsonPath');
    assert.match(workflow, /CampaignManifestMdPath/,
      'workflow Append step must pass CampaignManifestMdPath');
    assert.match(workflow, /rich_report/,
      'workflow must reference rich_report output');
    assert.match(workflow, /ranking_artifact/,
      'workflow must reference ranking_artifact output');
    assert.match(workflow, /campaign_manifest_json/,
      'workflow must reference campaign_manifest_json output');
    assert.match(workflow, /campaign_manifest_md/,
      'workflow must reference campaign_manifest_md output');
  });

  it('Upload step includes campaign artifact paths alongside the round directory', () => {
    assert.match(workflow, /campaign_artifact_paths/,
      'workflow upload step must reference campaign_artifact_paths output');
    assert.match(workflow, /path:\s*\|\s*[\s\S]*round_dir[\s\S]*campaign_artifact_paths/m,
      'workflow upload path must include both round_dir and campaign_artifact_paths');
  });

  it('workflow Locate step has no large inline PowerShell logic', () => {
    const locateMatch = workflow.match(
      /- name: Locate night batch outputs[\s\S]*?run: \|\n([\s\S]*?)(?=\n\s+- name:|\n\s+- uses:|\z)/
    );
    const locateRun = locateMatch ? locateMatch[1] : '';
    const nonEmptyLines = locateRun.split(/\r?\n/).filter(l => l.trim().length > 0);
    assert.ok(nonEmptyLines.length <= 5,
      `Locate step inline body must be thin (<=5 non-empty lines), got ${nonEmptyLines.length}`);
  });

  it('workflow Append step has no large inline PowerShell logic', () => {
    const appendMatch = workflow.match(
      /- name: Append night batch workflow summary[\s\S]*?run: \|\n([\s\S]*?)(?=\n\s+- name:|\n\s+- uses:|\z)/
    );
    const appendRun = appendMatch ? appendMatch[1] : '';
    const nonEmptyLines = appendRun.split(/\r?\n/).filter(l => l.trim().length > 0);
    assert.ok(nonEmptyLines.length <= 5,
      `Append step inline body must be thin (<=5 non-empty lines), got ${nonEmptyLines.length}`);
  });
});

describe('live checkout protection contract', () => {
  it('write-night-batch-live-checkout-baseline.ps1 exists', () => {
    assert.ok(existsSync(BASELINE_WRITER_PATH),
      'scripts/windows/github-actions/write-night-batch-live-checkout-baseline.ps1 must exist');
  });

  it('workflow has a baseline writer step', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');
    assert.match(workflow, /write-night-batch-live-checkout-baseline\.ps1/,
      'workflow must call write-night-batch-live-checkout-baseline.ps1');
    assert.match(workflow, /-BundleConfigPath '\$\{\{ inputs\.config_path \}\}'/,
      'workflow must pass workflow_dispatch config_path into the baseline writer');
  });

  it('baseline step appears before the smoke gate run step', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');
    const baselineIdx = workflow.indexOf('write-night-batch-live-checkout-baseline');
    const runIdx = workflow.indexOf('Run foreground production');
    assert.ok(baselineIdx > 0, 'baseline step must exist');
    assert.ok(baselineIdx < runIdx, 'baseline step must appear before the run step');
  });

  it('workflow passes NIGHT_BATCH_LIVE_CHECKOUT_BASELINE_PATH to runtime', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');
    assert.match(workflow, /NIGHT_BATCH_LIVE_CHECKOUT_BASELINE_PATH/,
      'workflow must reference NIGHT_BATCH_LIVE_CHECKOUT_BASELINE_PATH');
  });

  it('find-night-batch-outputs.ps1 outputs protection_report', () => {
    const script = readFileSync(FIND_OUTPUTS_SCRIPT_PATH, 'utf8');
    assert.match(script, /protection_report=/,
      'find script must output protection_report');
  });

  it('append-night-batch-workflow-summary.ps1 accepts ProtectionReportPath parameter', () => {
    const script = readFileSync(APPEND_SUMMARY_SCRIPT_PATH, 'utf8');
    assert.match(script, /ProtectionReportPath/,
      'summary script must accept ProtectionReportPath parameter');
  });

  it('append-night-batch-workflow-summary.ps1 emits Live checkout protection section', () => {
    const script = readFileSync(APPEND_SUMMARY_SCRIPT_PATH, 'utf8');
    assert.match(script, /Live checkout protection/,
      'summary script must emit Live checkout protection section');
  });
});

describe('night-batch-self-hosted workflow readiness diagnostics', () => {
  it('workflow includes readiness diagnostics before the smoke gate step', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');
    assert.match(workflow, /Readiness diagnostics/i,
      'workflow must have a readiness diagnostics step');
    const diagIdx = workflow.indexOf('Readiness diagnostics');
    const runIdx = workflow.indexOf('Run foreground production');
    assert.ok(diagIdx > 0, 'readiness diagnostics step must exist');
    assert.ok(diagIdx < runIdx,
      'readiness diagnostics must appear before the smoke gate step');
  });

  it('readiness diagnostics checks startup and runtime port connectivity', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');
    const script = readFileSync(READINESS_SCRIPT_PATH, 'utf8');
    assert.match(workflow, /startup_check_port/,
      'readiness diagnostics must reference startup_check_port (local 9222)');
    assert.match(script, /\bport\b.*readiness|readiness.*\bport\b/i,
      'readiness diagnostics must reference the runtime port');
    assert.doesNotMatch(workflow, /wsl\.exe|bash -lc/,
      'night batch workflow must not depend on WSL');
  });

  it('readiness diagnostics invokes tv status for api_available verification', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');
    const script = readFileSync(READINESS_SCRIPT_PATH, 'utf8');
    const diagSection = workflow.slice(
      workflow.indexOf('Readiness diagnostics'),
      workflow.indexOf('Run foreground production'),
    );
    assert.match(diagSection, /test-night-batch-readiness\.ps1/,
      'workflow must delegate readiness diagnostics to the helper script');
    assert.match(script, /status/,
      'readiness diagnostics must invoke status command');
  });

  it('readiness diagnostics avoids inline command substitution for tv status env setup', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');
    const diagSection = workflow.slice(
      workflow.indexOf('Readiness diagnostics'),
      workflow.indexOf('Run foreground production'),
    );
    assert.doesNotMatch(diagSection, /TV_CDP_HOST=\$\(python3 -c/,
      'readiness diagnostics must not inline host resolution into bash env assignment');
    assert.doesNotMatch(diagSection, /TV_CDP_PORT=\$\(python3 -c/,
      'readiness diagnostics must not inline port resolution into bash env assignment');
  });

  it('includes a required polling gate that must succeed before the smoke gate step', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');
    assert.match(workflow, /Wait for TradingView connection \(required gate\)/,
      'workflow must expose a clearly named required connection gate');
    assert.match(workflow, /wait-for-tradingview-readiness\.mjs/,
      'workflow must invoke the readiness polling script');
    assert.doesNotMatch(workflow, /Wait for TradingView connection \(required gate\)[\s\S]*continue-on-error:\s*true/i,
      'required connection gate must fail the workflow instead of continuing');
    assert.ok(
      workflow.indexOf('Wait for TradingView connection (required gate)')
        < workflow.indexOf('Run foreground production'),
      'required connection gate must run before the smoke gate step',
    );
  });
});
