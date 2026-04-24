import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const PROJECT_ROOT = process.cwd();
const DEVINIT_PATH = join(PROJECT_ROOT, 'devinit.sh');
const script = readFileSync(DEVINIT_PATH, 'utf8');
const lines = script.split('\n');

function writeExecutable(filePath, content) {
  writeFileSync(filePath, content, 'utf8');
  chmodSync(filePath, 0o755);
}

describe('devinit.sh stability', () => {
  let tempDir = null;
  let binDir = null;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'devinit-test-'));
    binDir = join(tempDir, 'bin');
    mkdirSync(binDir, { recursive: true });
    writeExecutable(join(binDir, 'tmux'), `#!/bin/sh
    case "$1" in
  display-message)
    printf '%s\n' "\${TMUX_TEST_WINDOW_NAME:-dev}"
    ;;
  list-panes)
    case "$*" in
      *'#{pane_index}:#{pane_dead}:#{pane_title}:#{pane_current_command}'*)
        printf '%s\n' "\${TMUX_TEST_PANE_SUMMARY}"
        ;;
      *)
        printf 'pane-0\npane-1\npane-2\npane-3\n'
        ;;
    esac
    ;;
  *)
    printf 'unsupported tmux invocation: %s\n' "$*" >&2
    exit 1
    ;;
esac
`);
    writeExecutable(join(binDir, 'ps'), `#!/bin/sh
printf '%s\n' "\${PS_TEST_OUTPUT:-}"
`);
  });

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
      binDir = null;
    }
  });

  function runSessionIsHealthy({ windowName = 'dev', paneSummary, psOutput = '' }) {
    return spawnSync(
      'bash',
      ['-lc', 'source "$1"; session_is_healthy', 'bash', DEVINIT_PATH],
      {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${binDir}:${process.env.PATH}`,
          TMUX_TEST_WINDOW_NAME: windowName,
          TMUX_TEST_PANE_SUMMARY: paneSummary,
          PS_TEST_OUTPUT: psOutput,
        },
      },
    );
  }

  // -----------------------------------------------------------------------
  // Issue 1: C-t send-keys causes [server exited] in the agent pane
  // -----------------------------------------------------------------------
  describe('no blind C-t keystroke to agent pane', () => {
    it('must not send C-t to the agent pane unconditionally', () => {
      const blindCtrlT = lines.filter(
        (l) => /send-keys\b.*C-t/.test(l) && !/^\s*#/.test(l),
      );
      assert.equal(
        blindCtrlT.length,
        0,
        `devinit.sh sends an unconditional C-t keystroke, which destabilises the agent pane:\n  ${blindCtrlT.join('\n  ')}`,
      );
    });
  });

  describe('codex pane direct launch', () => {
    it('launches pane 0 directly with codex instead of a wrapper script', () => {
      assert.match(
        script,
        /agent_cmd=.*\bcodex --full-auto\b/,
        'devinit.sh must launch pane 0 with a direct codex command',
      );
      assert.match(
        script,
        /--sandbox workspace-write/,
        'direct codex launch must keep workspace-write sandbox',
      );
      assert.match(
        script,
        /--ask-for-approval never/,
        'direct codex launch must keep ask-for-approval never',
      );
      assert.match(
        script,
        /--cd/,
        'direct codex launch must keep --cd',
      );
      assert.match(
        script,
        /--add-dir/,
        'direct codex launch must keep --add-dir',
      );
      assert.doesNotMatch(
        script,
        /run-codex-pane\.sh/,
        'devinit.sh must not route pane 0 through a codex wrapper',
      );
      assert.doesNotMatch(
        script,
        /run-copilot-pane\.sh/,
        'devinit.sh must not route copilot through a wrapper either',
      );
    });

    it('does not require devinit wrapper helper scripts', () => {
      assert.equal(
        existsSync(join(PROJECT_ROOT, 'scripts', 'dev', 'run-codex-pane.sh')),
        false,
        'run-codex-pane.sh should be removed from the active repo layout',
      );
      assert.equal(
        existsSync(join(PROJECT_ROOT, 'scripts', 'dev', 'capture-codex-pane-evidence.sh')),
        false,
        'capture-codex-pane-evidence.sh should be removed from the active repo layout',
      );
      assert.equal(
        existsSync(join(PROJECT_ROOT, 'scripts', 'dev', 'run-copilot-pane.sh')),
        false,
        'run-copilot-pane.sh should be removed from the active repo layout',
      );
      assert.equal(
        existsSync(join(PROJECT_ROOT, 'scripts', 'dev', 'capture-copilot-pane-evidence.sh')),
        false,
        'capture-copilot-pane-evidence.sh should be removed from the active repo layout',
      );
    });
  });

  // -----------------------------------------------------------------------
  // Issue 2: misleading startup message mentions smartphone mode
  // -----------------------------------------------------------------------
  describe('startup message accuracy', () => {
    it('must not claim smartphone mode', () => {
      const smartphoneLines = lines.filter(
        (l) => /スマホ/.test(l) && !/^\s*#/.test(l),
      );
      assert.equal(
        smartphoneLines.length,
        0,
        `startup message misleadingly references smartphone mode:\n  ${smartphoneLines.join('\n  ')}`,
      );
    });
  });

  // -----------------------------------------------------------------------
  // Issue 3: brittle pane-title exact-match health check
  // -----------------------------------------------------------------------
  describe('session_is_healthy pane-title check', () => {
    it('accepts a healthy session even when the codex pane title is dynamic', () => {
      const result = runSessionIsHealthy({
        paneSummary: [
          '0:0:codex working:bash:4001',
          '1:0:logs:tail:4002',
          '2:0:git:lazygit:4003',
          '3:0:keepalive:bash:4004',
        ].join('\n'),
        psOutput: [
          '4001 3999 -bash',
          '4100 4001 codex --full-auto --sandbox workspace-write --ask-for-approval never',
        ].join('\n'),
      });
      assert.equal(
        result.status,
        0,
        `expected dynamic codex pane title to be accepted:\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
      );
    });

    it('rejects a session when a required pane command no longer matches', () => {
      const result = runSessionIsHealthy({
        paneSummary: [
          '0:0:codex:bash:4001',
          '1:0:logs:bash:4002',
          '2:0:git:lazygit:4003',
          '3:0:keepalive:bash:4004',
        ].join('\n'),
        psOutput: [
          '4001 3999 -bash',
          '4100 4001 codex --full-auto --sandbox workspace-write --ask-for-approval never',
        ].join('\n'),
      });
      assert.notEqual(
        result.status,
        0,
        'health check should fail when pane metadata no longer matches the expected command layout',
      );
    });

    it('rejects a session when the codex pane has fallen back to bash', () => {
      const result = runSessionIsHealthy({
        paneSummary: [
          '0:0:codex working:bash:4001',
          '1:0:logs:tail:4002',
          '2:0:git:lazygit:4003',
          '3:0:keepalive:bash:4004',
        ].join('\n'),
        psOutput: [
          '4001 3999 -bash',
          '4100 4001 bash',
        ].join('\n'),
      });
      assert.notEqual(
        result.status,
        0,
        'health check should fail when pane 0 no longer has a live codex descendant',
      );
    });

    it('uses pane pid and process inspection for stable health checks', () => {
      const stableChecks = lines.filter(
        (l) => /pane_index|pane_current_command|pane_dead|pane_pid|\bps\b/.test(l) && !/^\s*#/.test(l),
      );
      assert.ok(
        stableChecks.length > 0,
        'health check should inspect stable tmux metadata plus process state instead of the dynamic codex pane title',
      );
    });
  });

  // -----------------------------------------------------------------------
  // Structural sanity: the script must still create 4 panes
  // -----------------------------------------------------------------------
  describe('layout invariants', () => {
    it('creates exactly 4 panes (3 split-window commands)', () => {
      const splits = lines.filter(
        (l) => /tmux\s+split-window\b/.test(l) && !/^\s*#/.test(l),
      );
      assert.equal(splits.length, 3, `expected 3 split-window calls, got ${splits.length}`);
    });

    it('assigns titles to all four panes', () => {
      const titleAssignments = lines.filter(
        (l) => /select-pane\s.*-T\s/.test(l) && !/^\s*#/.test(l),
      );
      assert.equal(titleAssignments.length, 4, `expected 4 pane title assignments, got ${titleAssignments.length}`);
    });
  });
});
