import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_ROOT = process.cwd();
const PANIC_REVERSAL_DOC_PATH = join(
  PROJECT_ROOT,
  'docs',
  'strategy',
  'panic-reversal-regime-recovery.md',
);
const SESSION_LOG_PATH = join(
  PROJECT_ROOT,
  'docs',
  'sessions',
  'session_20260427_0110.md',
);

describe('panic reversal strategy docs', () => {
  it('keeps a stable strategy doc for panic reversal regime recovery', () => {
    assert.equal(
      existsSync(PANIC_REVERSAL_DOC_PATH),
      true,
      'docs/strategy/panic-reversal-regime-recovery.md must exist',
    );

    const doc = readFileSync(PANIC_REVERSAL_DOC_PATH, 'utf8');
    assert.match(doc, /RSP < 200SMA/, 'strategy doc must explain the weak-regime entry condition');
    assert.match(doc, /VIX > 30/, 'strategy doc must mention the panic filter');
    assert.match(doc, /RSI2.*10|10.*RSI2/s, 'strategy doc must mention the RSI2 bottom confirmation');
    assert.match(doc, /SMA25.*RSI65|RSI65.*SMA25/s, 'strategy doc must mention the recovery exit condition');
    assert.match(doc, /stop loss なし/, 'strategy doc must document the no-stop holding rule');
  });

  it('archives this implementation session under docs/sessions', () => {
    assert.equal(
      existsSync(SESSION_LOG_PATH),
      true,
      'docs/sessions/session_20260427_0110.md must exist',
    );

    const log = readFileSync(SESSION_LOG_PATH, 'utf8');
    assert.match(log, /panic reversal/i, 'session log must mention the panic reversal documentation task');
    assert.match(log, /Night Batch Self Hosted/, 'session log must record the workflow execution target');
  });
});
