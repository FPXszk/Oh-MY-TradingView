import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_ROOT = process.cwd();
const WRAPPER_PATH = join(PROJECT_ROOT, 'scripts', 'windows', 'run-night-batch-self-hosted.cmd');

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
});
