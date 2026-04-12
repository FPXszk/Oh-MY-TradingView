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
const GITATTRIBUTES_PATH = join(PROJECT_ROOT, '.gitattributes');
const README_PATH = join(PROJECT_ROOT, 'README.md');
const COMMAND_PATH = join(PROJECT_ROOT, 'command.md');
const WINDOWS_RUNNER_SCRIPT_PATHS = [BOOTSTRAP_PATH, RUNNER_WRAPPER_PATH, AUTOSTART_SCRIPT_PATH];

describe('run-night-batch-self-hosted.cmd', () => {
  it('passes config through cmd expansion instead of bash-side variables', () => {
    const script = readFileSync(WRAPPER_PATH, 'utf8');

    assert.match(script, /--config \\"%CONFIG_PATH%\\" --round-mode resume-current-round/);
    assert.match(script, /--config \\"%CONFIG_PATH%\\" --round-mode advance-next-round/);
    assert.match(script, /--config \\"%CONFIG_PATH%\\" --round-mode \\"%ROUND_MODE%\\"/);
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

describe('night-batch-self-hosted workflow', () => {
  it('defaults workflow_dispatch config_path to the foreground monitoring config', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

    assert.match(workflow, /default:\s+config\/night_batch\/bundle-foreground-reuse-config\.json/,
      'workflow must default to the foreground monitoring config');
  });

  it('publishes GitHub summary details and uploads artifacts after the run', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

    assert.match(workflow, /GITHUB_STEP_SUMMARY/,
      'workflow must append a run summary to GITHUB_STEP_SUMMARY');
    assert.match(workflow, /actions\/upload-artifact@v4/,
      'workflow must upload night batch artifacts');
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

  it('command.md documents the bootstrap startup procedure', () => {
    const cmd = readFileSync(COMMAND_PATH, 'utf8');

    assert.match(cmd, /bootstrap-self-hosted-runner\.cmd/,
      'command.md must reference bootstrap script');
    assert.match(cmd, /run-self-hosted-runner-with-bootstrap\.cmd/,
      'command.md must reference the bootstrap wrapper');
    assert.match(cmd, /service mode.*使わず/i,
      'command.md must preserve the non-service policy');
  });

  it('command.md documents manual hookup step', () => {
    const cmd = readFileSync(COMMAND_PATH, 'utf8');

    assert.match(cmd, /run\.cmd.*(?:代わり|instead|hookup|置き換え|bootstrap)/i,
      'command.md must explain using bootstrap wrapper instead of run.cmd directly');
  });

  it('command.md documents Task Scheduler based runner auto-start', () => {
    const cmd = readFileSync(COMMAND_PATH, 'utf8');

    assert.match(cmd, /Task Scheduler/i,
      'command.md must mention Task Scheduler for runner auto-start');
    assert.match(cmd, /register-self-hosted-runner-autostart\.cmd/i,
      'command.md must reference the autostart registration script');
    assert.match(cmd, /ONLOGON|logon/i,
      'command.md must describe the ONLOGON trigger');
  });
});

describe('night-batch summary step PowerShell safety', () => {
  const workflow = readFileSync(WORKFLOW_PATH, 'utf8');
  // Extract the "Append night batch workflow summary" step run block
  const summaryStepMatch = workflow.match(
    /- name: Append night batch workflow summary[\s\S]*?run: \|\n([\s\S]*?)(?=\n\s+- name:|\n\s+- uses:|\n\njobs:|\z)/
  );
  const summaryStepRun = summaryStepMatch ? summaryStepMatch[1] : '';

  it('summary step exists in workflow', () => {
    assert.ok(summaryStepRun.length > 0,
      'workflow must contain the Append night batch workflow summary step');
  });

  it('summary step must not use inline subexpression-if inside Add-Content', () => {
    // The pattern $(if ...) inside an Add-Content argument list causes
    // parser ambiguity in Windows PowerShell when combined with string
    // concatenation containing a leading hyphen.
    const addContentLines = summaryStepRun.split(/\r?\n/)
      .filter(l => l.includes('Add-Content'));
    for (const line of addContentLines) {
      assert.doesNotMatch(line, /\$\(if\s/,
        `Add-Content must not contain inline $(if ...) — found: ${line.trim()}`);
    }
  });

  it('summary step must pre-assign nullable fields before emitting them', () => {
    // Nullable fields (failed_step, last_checkpoint) must be assigned to
    // a variable with a fallback before being used in Add-Content.
    assert.match(summaryStepRun, /\$failedStep\s*=/,
      'summary step must pre-assign $failedStep');
    assert.match(summaryStepRun, /\$lastCheckpoint\s*=/,
      'summary step must pre-assign $lastCheckpoint');
  });

  it('summary step must still emit all required fields', () => {
    assert.match(summaryStepRun, /success/,
      'summary step must emit success field');
    assert.match(summaryStepRun, /termination_reason/,
      'summary step must emit termination_reason field');
    assert.match(summaryStepRun, /failed_step/,
      'summary step must emit failed_step field');
    assert.match(summaryStepRun, /last_checkpoint/,
      'summary step must emit last_checkpoint field');
    assert.match(summaryStepRun, /summary_json/,
      'summary step must emit summary_json field');
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
  });

  it('command.md documents live checkout protection during active run', () => {
    const cmd = readFileSync(COMMAND_PATH, 'utf8');

    assert.match(cmd, /live checkout.*(?:編集しない|変更しない|触らない|do not edit|do not modify)/i,
      'command.md must state that live checkout must not be edited during active run');
  });

  it('command.md documents strategy-presets.json as a protected live file', () => {
    const cmd = readFileSync(COMMAND_PATH, 'utf8');

    assert.match(cmd, /strategy-presets\.json/,
      'command.md must mention strategy-presets.json as a protected file');
  });

  it('command.md documents advance-next-round for explicit next run start', () => {
    const cmd = readFileSync(COMMAND_PATH, 'utf8');

    assert.match(cmd, /advance-next-round/,
      'command.md must reference advance-next-round');
    assert.match(cmd, /workflow.*production.*(?:完了|終了|complete|finish).*(?:確認|verify|check)/i,
      'command.md must instruct to confirm workflow-tracked production completion before updating');
  });

  it('command.md documents GitHub summary, artifact, and foreground state outputs', () => {
    const cmd = readFileSync(COMMAND_PATH, 'utf8');

    assert.match(cmd, /GITHUB_STEP_SUMMARY/i,
      'command.md must mention the GitHub summary output');
    assert.match(cmd, /upload-artifact|artifact/i,
      'command.md must mention artifact upload');
    assert.match(cmd, /roundN\/bundle-foreground-state\.json/i,
      'command.md must point to the round-scoped foreground state file path');
  });
});
