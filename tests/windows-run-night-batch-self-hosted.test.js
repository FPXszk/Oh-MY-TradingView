import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_ROOT = process.cwd();
const WRAPPER_PATH = join(PROJECT_ROOT, 'scripts', 'windows', 'run-night-batch-self-hosted.cmd');
const BOOTSTRAP_PATH = join(PROJECT_ROOT, 'scripts', 'windows', 'bootstrap-self-hosted-runner.cmd');
const RUNNER_WRAPPER_PATH = join(PROJECT_ROOT, 'scripts', 'windows', 'run-self-hosted-runner-with-bootstrap.cmd');
const README_PATH = join(PROJECT_ROOT, 'README.md');
const COMMAND_PATH = join(PROJECT_ROOT, 'command.md');

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
});

describe('docs: next strategy update policy', () => {
  it('README documents that live checkout must not be edited during active run', () => {
    const readme = readFileSync(README_PATH, 'utf8');

    assert.match(readme, /live checkout.*(?:編集しない|変更しない|触らない|do not edit|do not modify)/i,
      'README must state that live checkout must not be edited during active run');
  });

  it('README documents workflow end does not mean production end', () => {
    const readme = readFileSync(README_PATH, 'utf8');

    assert.match(readme, /workflow.*(?:終了|end|complete).*(?:safe|安全|production.*(?:継続|続行|active))/i,
      'README must warn that workflow completion does not imply production completion');
  });

  it('README documents preparing next strategy in separate workspace', () => {
    const readme = readFileSync(README_PATH, 'utf8');

    assert.match(readme, /(?:worktree|clone|branch).*(?:次|next|別|separate)/i,
      'README must mention preparing next strategy in a separate worktree/clone/branch');
  });

  it('README separates runner usage checks from detached completion checks', () => {
    const readme = readFileSync(README_PATH, 'utf8');

    assert.match(readme, /runner.*detached.*別々|別々.*runner.*detached/i,
      'README must explicitly separate runner/workflow activity checks from detached completion checks');
    assert.match(readme, /roundN\/bundle-detached-reuse-state\.json/i,
      'README must point to the round-scoped detached state file path');
    assert.doesNotMatch(readme, /workflow.*results\/night-batch\/bundle-detached-reuse-state\.json/i,
      'README must not claim the workflow/manual wrapper path uses the flat detached state file');
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
    assert.match(cmd, /(?:detached|production).*(?:完了|終了|complete|finish).*(?:確認|verify|check)/i,
      'command.md must instruct to confirm detached completion before updating');
  });

  it('command.md requires both runner-usage and round-scoped detached checks', () => {
    const cmd = readFileSync(COMMAND_PATH, 'utf8');

    assert.match(cmd, /runner 使用中チェック/i,
      'command.md must require a dedicated runner-usage check');
    assert.match(cmd, /detached 完了チェック/i,
      'command.md must require a dedicated detached completion check');
    assert.match(cmd, /roundN\/bundle-detached-reuse-state\.json/i,
      'command.md must point to the round-scoped detached state file path');
  });
});
