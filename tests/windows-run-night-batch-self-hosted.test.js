import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_ROOT = process.cwd();
const WORKFLOW_PATH = join(PROJECT_ROOT, '.github', 'workflows', 'night-batch-self-hosted.yml');
const WRAPPER_PATH = join(PROJECT_ROOT, 'scripts', 'windows', 'run-night-batch-self-hosted.cmd');
const BOOTSTRAP_PATH = join(PROJECT_ROOT, 'scripts', 'windows', 'bootstrap-self-hosted-runner.cmd');
const RUNNER_WRAPPER_PATH = join(PROJECT_ROOT, 'scripts', 'windows', 'run-self-hosted-runner-with-bootstrap.cmd');
const AUTOSTART_SCRIPT_PATH = join(PROJECT_ROOT, 'scripts', 'windows', 'register-self-hosted-runner-autostart.cmd');
const FIND_OUTPUTS_SCRIPT_PATH = join(PROJECT_ROOT, 'scripts', 'windows', 'github-actions', 'find-night-batch-outputs.ps1');
const APPEND_SUMMARY_SCRIPT_PATH = join(PROJECT_ROOT, 'scripts', 'windows', 'github-actions', 'append-night-batch-workflow-summary.ps1');
const GITATTRIBUTES_PATH = join(PROJECT_ROOT, '.gitattributes');
const README_PATH = join(PROJECT_ROOT, 'README.md');
const REPORTS_README_PATH = join(PROJECT_ROOT, 'docs', 'reports', 'README.md');
const RUN8_REPORT_PATH = join(PROJECT_ROOT, 'docs', 'reports', 'night-batch-self-hosted-run8.md');
const BUNDLE_FG_CONFIG_PATH = join(PROJECT_ROOT, 'config', 'night_batch', 'bundle-foreground-reuse-config.json');
const BASELINE_WRITER_PATH = join(PROJECT_ROOT, 'scripts', 'windows', 'github-actions', 'write-night-batch-live-checkout-baseline.ps1');
const WINDOWS_RUNNER_SCRIPT_PATHS = [BOOTSTRAP_PATH, RUNNER_WRAPPER_PATH, AUTOSTART_SCRIPT_PATH];

describe('run-night-batch-self-hosted.cmd', () => {
  it('passes config through cmd expansion instead of bash-side variables', () => {
    const script = readFileSync(WRAPPER_PATH, 'utf8');

    assert.match(script, /--config \\"%CONFIG_PATH%\\" --round-mode resume-current-round/);
    assert.match(script, /--config \\"%CONFIG_PATH%\\" --round-mode advance-next-round/);
    assert.match(script, /--config \\"%CONFIG_PATH%\\" --round-mode \\"%ROUND_MODE%\\"/);
    assert.match(script, /archive-rounds/,
      'wrapper must archive completed rounds before and after manual runs');
    assert.match(script, /GITHUB_ACTIONS/,
      'wrapper must skip post-run archive cleanup inside GitHub Actions');
    assert.ok(
      script.indexOf('archive-rounds') < script.indexOf('ROUND_MODE'),
      'wrapper must clean completed rounds before selecting the round mode',
    );
    assert.doesNotMatch(script, /--config \\"\$CONFIG_PATH\\"/);
    assert.doesNotMatch(script, /--round-mode \\"\$ROUND_MODE\\"/);
  });

  it('keeps the WSL working directory anchored to the resolved repo path', () => {
    const script = readFileSync(WRAPPER_PATH, 'utf8');

    assert.match(script, /cd \\"%REPO_WSL%\\"/);
    assert.doesNotMatch(script, /cd \\"\$REPO_WSL\\"/);
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

  it('us_campaign defaults to 12x10', () => {
    assert.equal(config.bundle.us_campaign, 'next-long-run-us-12x10',
      'bundle-foreground-reuse-config.json must default us_campaign to 12x10');
  });

  it('jp_campaign defaults to 12x10', () => {
    assert.equal(config.bundle.jp_campaign, 'next-long-run-jp-12x10',
      'bundle-foreground-reuse-config.json must default jp_campaign to 12x10');
  });

  it('config path must not change', () => {
    assert.ok(existsSync(BUNDLE_FG_CONFIG_PATH),
      'config/night_batch/bundle-foreground-reuse-config.json must exist at the canonical path');
  });
});

describe('night-batch-self-hosted workflow', () => {
  it('defaults workflow_dispatch config_path to the foreground monitoring config', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

    assert.match(workflow, /default:\s+config\/night_batch\/bundle-foreground-reuse-config\.json/,
      'workflow must default to the foreground monitoring config');
  });

  it('publishes GitHub summary details and uploads artifacts after the run', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

    assert.match(workflow, /append-night-batch-workflow-summary\.ps1/,
      'workflow must call the summary script that writes to GITHUB_STEP_SUMMARY');
    assert.match(workflow, /Ensure TradingView is running/,
      'workflow must ensure TradingView is running before invoking the WSL smoke run');
    assert.match(workflow, /ConvertFrom-Json/,
      'workflow must inspect the config path before starting TradingView');
    assert.match(workflow, /Start-Process -FilePath \$launch\.shortcut_path/,
      'workflow must start TradingView from the configured shortcut when needed');
    assert.match(workflow, /Get-ChildItem -Path \$shortcutDir -Filter '\*\.lnk' -File/,
      'workflow must fall back to searching the TradingView folder for a shortcut');
    assert.match(workflow, /actions\/upload-artifact@v4/,
      'workflow must upload night batch artifacts');
    assert.match(workflow, /Archive completed night batch rounds/,
      'workflow must archive completed rounds after artifact upload');
    assert.match(workflow, /Archive stale latest research docs/,
      'workflow must automatically archive stale latest research docs');
    assert.match(workflow, /archive-stale-latest\.mjs/,
      'workflow must invoke the latest-doc cleanup script');
    assert.ok(
      workflow.indexOf('Ensure TradingView is running') < workflow.indexOf('Run smoke gate and foreground production'),
      'workflow must launch TradingView before the WSL smoke run',
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

describe('docs: non-service self-hosted runner policy', () => {
  it('README documents that service mode is not used', () => {
    const readme = readFileSync(README_PATH, 'utf8');

    assert.match(readme, /service\s+(mode|モード).*(?:使用しない|使わない|不?採用|NOT\s+used|not\s+supported)/i,
      'README must state that service mode is not used');
    assert.match(readme, /OS.*バージョン/i,
      'README must mention the OS version constraint');
  });

  it('README documents manual run.cmd startup', () => {
    const readme = readFileSync(README_PATH, 'utf8');

    assert.match(readme, /run\.cmd/,
      'README must reference run.cmd for manual startup');
  });

  it('README documents the bootstrap wrapper', () => {
    const readme = readFileSync(README_PATH, 'utf8');

    assert.match(readme, /run-self-hosted-runner-with-bootstrap\.cmd/,
      'README must reference the bootstrap wrapper');
  });

  it('README documents Task Scheduler based runner auto-start', () => {
    const readme = readFileSync(README_PATH, 'utf8');

    assert.match(readme, /Task Scheduler/i,
      'README must mention Task Scheduler for runner auto-start');
    assert.match(readme, /register-self-hosted-runner-autostart\.cmd/i,
      'README must reference the autostart registration script');
  });

  it('README no longer relies on docs/command.md for runner guidance', () => {
    const readme = readFileSync(README_PATH, 'utf8');

    assert.doesNotMatch(readme, /docs\/command\.md/,
      'README must not route users to removed docs/command.md');
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

  it('find-night-batch-outputs.ps1 outputs rich_report and ranking_artifact', () => {
    const script = readFileSync(FIND_OUTPUTS_SCRIPT_PATH, 'utf8');

    assert.match(script, /rich_report=/,
      'find script must output rich_report');
    assert.match(script, /ranking_artifact=/,
      'find script must output ranking_artifact');
  });

  it('find-night-batch-outputs.ps1 searches artifacts/night-batch for workflow outputs', () => {
    const script = readFileSync(FIND_OUTPUTS_SCRIPT_PATH, 'utf8');

    assert.match(script, /artifacts\\night-batch/,
      'find script must search artifacts/night-batch where night_batch.py writes summaries');
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

  it('append-night-batch-workflow-summary.ps1 accepts RichReportPath and RankingArtifactPath parameters', () => {
    const script = readFileSync(APPEND_SUMMARY_SCRIPT_PATH, 'utf8');

    assert.match(script, /RichReportPath/,
      'summary script must accept RichReportPath parameter');
    assert.match(script, /RankingArtifactPath/,
      'summary script must accept RankingArtifactPath parameter');
  });

  it('append-night-batch-workflow-summary.ps1 emits rich_report and ranking_artifact when provided', () => {
    const script = readFileSync(APPEND_SUMMARY_SCRIPT_PATH, 'utf8');

    assert.match(script, /rich_report/,
      'summary script must emit rich_report field');
    assert.match(script, /ranking_artifact/,
      'summary script must emit ranking_artifact field');
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

  it('Append step passes rich_report and ranking_artifact outputs', () => {
    assert.match(workflow, /RichReportPath/,
      'workflow Append step must pass RichReportPath');
    assert.match(workflow, /RankingArtifactPath/,
      'workflow Append step must pass RankingArtifactPath');
    assert.match(workflow, /rich_report/,
      'workflow must reference rich_report output');
    assert.match(workflow, /ranking_artifact/,
      'workflow must reference ranking_artifact output');
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

describe('docs: run 8 report', () => {
  it('run 8 report exists', () => {
    assert.ok(existsSync(RUN8_REPORT_PATH),
      'docs/reports/night-batch-self-hosted-run8.md must exist');
  });

  it('run 8 report contains essential information', () => {
    const report = readFileSync(RUN8_REPORT_PATH, 'utf8');

    assert.match(report, /run_number.*8|run 8/i,
      'report must mention run_number 8');
    assert.match(report, /24282322391/,
      'report must mention run_id 24282322391');
    assert.match(report, /success.*true|success: true/i,
      'report must note that backtest result was success');
    assert.match(report, /termination_reason.*success/i,
      'report must note termination_reason');
    assert.match(report, /PowerShell/i,
      'report must mention PowerShell as root cause');
  });

  it('docs/reports/README classifies run 8 report as an incident reference', () => {
    const readme = readFileSync(REPORTS_README_PATH, 'utf8');

    assert.match(readme, /night-batch-self-hosted-run8\.md/,
      'docs/reports/README must link to run 8 report');
    assert.match(readme, /incident|postmortem|archive/i,
      'docs/reports/README must explain the archive role of docs/reports');
  });
});

describe('docs: next strategy update policy', () => {
  it('README documents that live checkout must not be edited during active run', () => {
    const readme = readFileSync(README_PATH, 'utf8');

    assert.match(readme, /live checkout.*(?:編集しない|変更しない|触らない|do not edit|do not modify)/i,
      'README must state that live checkout must not be edited during active run');
  });

  it('README documents that workflow monitoring continues until production completes', () => {
    const readme = readFileSync(README_PATH, 'utf8');

    assert.match(readme, /workflow.*production.*(?:完了|complete).*(?:待つ|監視|monitor|追跡)/i,
      'README must state that the workflow monitors production to completion');
  });

  it('README documents preparing next strategy in separate workspace', () => {
    const readme = readFileSync(README_PATH, 'utf8');

    assert.match(readme, /(?:worktree|clone|branch).*(?:次|next|別|separate)/i,
      'README must mention preparing next strategy in a separate worktree/clone/branch');
  });

  it('README documents GitHub summary, artifact, and foreground state outputs', () => {
    const readme = readFileSync(README_PATH, 'utf8');

    assert.match(readme, /GITHUB_STEP_SUMMARY/i,
      'README must mention the GitHub summary output');
    assert.match(readme, /upload-artifact|artifact/i,
      'README must mention artifact upload');
    assert.match(readme, /roundN\/bundle-foreground-state\.json/i,
      'README must point to the round-scoped foreground state file path');
    assert.match(readme, /archive\/roundN/i,
      'README must mention archived round output path');
  });

  it('README documents advance-next-round for explicit next run start', () => {
    const readme = readFileSync(README_PATH, 'utf8');

    assert.match(readme, /advance-next-round/,
      'README must reference advance-next-round');
    assert.match(readme, /workflow.*production.*(?:完了|終了|complete|finish).*(?:確認|verify|check)/i,
      'README must instruct to confirm workflow-tracked production completion before updating');
    assert.match(readme, /archive\/roundN/i,
      'README must mention archived round output path');
  });

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
    const runIdx = workflow.indexOf('Run smoke gate and foreground production');
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
    const runIdx = workflow.indexOf('Run smoke gate and foreground production');
    assert.ok(diagIdx > 0, 'readiness diagnostics step must exist');
    assert.ok(diagIdx < runIdx,
      'readiness diagnostics must appear before the smoke gate step');
  });

  it('readiness diagnostics checks both 9222 and 9223 port connectivity', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');
    assert.match(workflow, /startup_check_port/,
      'readiness diagnostics must reference startup_check_port (local 9222)');
    assert.match(workflow, /\bport\b.*readiness|readiness.*\bport\b/i,
      'readiness diagnostics must reference the WSL bridge port');
  });

  it('readiness diagnostics invokes tv status for api_available verification', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');
    const diagSection = workflow.slice(
      workflow.indexOf('Readiness diagnostics'),
      workflow.indexOf('Run smoke gate and foreground production'),
    );
    assert.match(diagSection, /status/,
      'readiness diagnostics must invoke status command');
  });

  it('readiness diagnostics avoids inline command substitution for tv status env setup', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');
    const diagSection = workflow.slice(
      workflow.indexOf('Readiness diagnostics'),
      workflow.indexOf('Run smoke gate and foreground production'),
    );
    assert.doesNotMatch(diagSection, /TV_CDP_HOST=\$\(python3 -c/,
      'readiness diagnostics must not inline host resolution into bash env assignment');
    assert.doesNotMatch(diagSection, /TV_CDP_PORT=\$\(python3 -c/,
      'readiness diagnostics must not inline port resolution into bash env assignment');
  });
});
