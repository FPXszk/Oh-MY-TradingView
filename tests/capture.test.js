import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  captureScreenshot,
  resolveCaptureOutputPath,
  writeScreenshotFile,
} from '../src/core/capture.js';

// ---------------------------------------------------------------------------
// captureScreenshot — unit tests (CDP is mocked)
// ---------------------------------------------------------------------------

// We cannot call captureScreenshot without a real CDP connection,
// but we can verify that it properly rejects invalid states.
// The actual CDP interaction is tested in e2e tests.

describe('captureScreenshot', () => {
  it('resolves relative output paths under the screenshots directory', () => {
    const tempBase = mkdtempSync(join(tmpdir(), 'tv-capture-'));
    try {
      const resolved = resolveCaptureOutputPath('daily/chart.png', tempBase);
      assert.equal(resolved, join(tempBase, 'daily', 'chart.png'));
    } finally {
      rmSync(tempBase, { recursive: true, force: true });
    }
  });

  it('rejects absolute output paths', () => {
    assert.throws(
      () => resolveCaptureOutputPath('/tmp/chart.png'),
      /relative path under docs\/research\/results\/screenshots/,
    );
  });

  it('rejects parent traversal in output paths', () => {
    assert.throws(
      () => resolveCaptureOutputPath('../chart.png'),
      /must stay within docs\/research\/results\/screenshots/,
    );
  });

  it('writes files without allowing overwrite', async () => {
    const tempBase = mkdtempSync(join(tmpdir(), 'tv-capture-write-'));
    try {
      const firstPath = await writeScreenshotFile(Buffer.from('one'), 'chart.png', tempBase);
      assert.equal(readFileSync(firstPath, 'utf8'), 'one');

      await assert.rejects(
        () => writeScreenshotFile(Buffer.from('two'), 'chart.png', tempBase),
        /EEXIST/,
      );
      assert.equal(readFileSync(firstPath, 'utf8'), 'one');
    } finally {
      rmSync(tempBase, { recursive: true, force: true });
    }
  });

  it('is a function', () => {
    assert.equal(typeof captureScreenshot, 'function');
  });

  it('rejects when CDP is not connected', async () => {
    // Without TradingView running, getClient will fail
    await assert.rejects(
      () => captureScreenshot({ format: 'png' }),
      (err) => {
        assert.ok(err.message.length > 0);
        return true;
      },
    );
  });

  it('rejects when CDP is not connected even with jpeg format', async () => {
    await assert.rejects(
      () => captureScreenshot({ format: 'jpeg', quality: 50 }),
      (err) => {
        assert.ok(err.message.length > 0);
        return true;
      },
    );
  });
});
