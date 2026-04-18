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
const RUN_COPILOT_PANE_PATH = join(PROJECT_ROOT, 'scripts', 'dev', 'run-copilot-pane.sh');
const CAPTURE_COPILOT_PANE_EVIDENCE_PATH = join(
  PROJECT_ROOT,
  'scripts',
  'dev',
  'capture-copilot-pane-evidence.sh',
);
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
  });

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
      binDir = null;
    }
  });

  function runSessionIsHealthy({ windowName = 'dev', paneSummary }) {
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
        },
      },
    );
  }

  // -----------------------------------------------------------------------
  // Issue 1: C-t send-keys causes [server exited] in Copilot pane
  // -----------------------------------------------------------------------
  describe('no blind C-t keystroke to copilot pane', () => {
    it('must not send C-t to the copilot pane unconditionally', () => {
      const blindCtrlT = lines.filter(
        (l) => /send-keys\b.*C-t/.test(l) && !/^\s*#/.test(l),
      );
      assert.equal(
        blindCtrlT.length,
        0,
        `devinit.sh sends an unconditional C-t keystroke, which destabilises the Copilot pane:\n  ${blindCtrlT.join('\n  ')}`,
      );
    });
  });

  // -----------------------------------------------------------------------
  // Issue 1b: pane 0 must launch through a resilience wrapper
  // -----------------------------------------------------------------------
  describe('copilot pane resilience wrapper', () => {
    it('launches pane 0 through run-copilot-pane.sh instead of direct copilot invocation', () => {
      assert.match(
        script,
        /run-copilot-pane\.sh/,
        'devinit.sh must route pane 0 through the dedicated Copilot wrapper script',
      );
      assert.doesNotMatch(
        script,
        /copilot_cmd=.*\bcopilot --yolo\b/,
        'devinit.sh must not hard-code the raw Copilot command directly into pane 0 startup',
      );
    });

    it('ships helper scripts for evidence capture and bounded restart', () => {
      assert.equal(
        existsSync(RUN_COPILOT_PANE_PATH),
        true,
        'scripts/dev/run-copilot-pane.sh must exist',
      );
      assert.equal(
        existsSync(CAPTURE_COPILOT_PANE_EVIDENCE_PATH),
        true,
        'scripts/dev/capture-copilot-pane-evidence.sh must exist',
      );

      const runCopilotPane = readFileSync(RUN_COPILOT_PANE_PATH, 'utf8');
      const captureEvidence = readFileSync(CAPTURE_COPILOT_PANE_EVIDENCE_PATH, 'utf8');

      assert.match(
        runCopilotPane,
        /COPILOT_PANE_MAX_RESTARTS=1/,
        'run-copilot-pane.sh must enforce a single bounded respawn',
      );
      assert.match(
        runCopilotPane,
        /capture-copilot-pane-evidence\.sh/,
        'run-copilot-pane.sh must call the evidence capture helper before respawn',
      );
      assert.match(
        runCopilotPane,
        /logs\/devinit/,
        'run-copilot-pane.sh must record pane diagnostics under logs/devinit',
      );
      assert.match(
        runCopilotPane,
        /artifacts\/devinit/,
        'run-copilot-pane.sh must persist per-run evidence under artifacts/devinit',
      );
      assert.match(
        captureEvidence,
        /tmux\s+capture-pane/,
        'capture-copilot-pane-evidence.sh must save the pane output',
      );
      assert.match(
        captureEvidence,
        /tmux\s+list-panes/,
        'capture-copilot-pane-evidence.sh must save pane metadata',
      );
      assert.match(
        captureEvidence,
        /\bps\b/,
        'capture-copilot-pane-evidence.sh must capture a process snapshot',
      );
    });

    it('launches copilot via script(1) to guarantee a pseudo-TTY', () => {
      const runCopilotPane = readFileSync(RUN_COPILOT_PANE_PATH, 'utf8');
      assert.match(
        runCopilotPane,
        /\bscript\s+-qefc\b/,
        'run-copilot-pane.sh must use script -qefc to provide a pseudo-TTY for copilot',
      );
    });

    it('does not invoke copilot directly without a TTY wrapper', () => {
      const runCopilotPane = readFileSync(RUN_COPILOT_PANE_PATH, 'utf8');
      const lines = runCopilotPane.split('\n');
      const rawCopilotLines = lines.filter(
        (l) => /^\s*copilot\s+--/.test(l) && !/^\s*#/.test(l),
      );
      assert.equal(
        rawCopilotLines.length,
        0,
        `run-copilot-pane.sh must not invoke copilot directly (found: ${rawCopilotLines.join('; ')})`,
      );
    });

    it('does not use pane-wide exec tee redirect that breaks TTY', () => {
      const runCopilotPane = readFileSync(RUN_COPILOT_PANE_PATH, 'utf8');
      assert.doesNotMatch(
        runCopilotPane,
        /exec\s*>\s*>\(tee\b/,
        'run-copilot-pane.sh must not use exec > >(tee ...) which destroys the TTY for copilot',
      );
    });

    it('checks for script(1) availability and fails explicitly if missing', () => {
      const runCopilotPane = readFileSync(RUN_COPILOT_PANE_PATH, 'utf8');
      assert.match(
        runCopilotPane,
        /command\s+-v\s+script|which\s+script|type\s+script/,
        'run-copilot-pane.sh must check that script(1) is available before using it',
      );
    });

    it('preserves --yolo flag in the copilot invocation', () => {
      const runCopilotPane = readFileSync(RUN_COPILOT_PANE_PATH, 'utf8');
      assert.match(
        runCopilotPane,
        /--yolo/,
        'run-copilot-pane.sh must pass --yolo to copilot',
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
    it('accepts a healthy session even when the copilot pane title is dynamic', () => {
      const result = runSessionIsHealthy({
        paneSummary: [
          '0:0:🤖 Reviewing evidence:copilot',
          '1:0:logs:tail',
          '2:0:git:lazygit',
          '3:0:keepalive:bash',
        ].join('\n'),
      });
      assert.equal(
        result.status,
        0,
        `expected dynamic copilot pane title to be accepted:\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
      );
    });

    it('rejects a session when a required pane command no longer matches', () => {
      const result = runSessionIsHealthy({
        paneSummary: [
          '0:0:copilot:copilot',
          '1:0:logs:bash',
          '2:0:git:lazygit',
          '3:0:keepalive:bash',
        ].join('\n'),
      });
      assert.notEqual(
        result.status,
        0,
        'health check should fail when pane metadata no longer matches the expected command layout',
      );
    });

    it('rejects a session when the copilot pane has fallen back to bash', () => {
      const result = runSessionIsHealthy({
        paneSummary: [
          '0:0:🤖 Reviewing evidence:bash',
          '1:0:logs:tail',
          '2:0:git:lazygit',
          '3:0:keepalive:bash',
        ].join('\n'),
      });
      assert.notEqual(
        result.status,
        0,
        'health check should fail when pane 0 is no longer running copilot',
      );
    });

    it('uses pane index and current command for stable health checks', () => {
      const stableChecks = lines.filter(
        (l) => /pane_index|pane_current_command|pane_dead/.test(l) && !/^\s*#/.test(l),
      );
      assert.ok(
        stableChecks.length > 0,
        'health check should inspect stable tmux metadata instead of the dynamic copilot pane title',
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
