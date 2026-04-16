import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  ARTIFACT_BASE_DIR,
  REPO_ROOT,
  buildArtifactPath,
  resolveArtifactAbsolutePath,
  writeRawArtifact,
} from '../src/core/output-artifacts.js';

const TEST_BASE = path.join('tests', '.tmp-artifacts');

function cleanup() {
  try { fs.rmSync(TEST_BASE, { recursive: true, force: true }); } catch { /* noop */ }
}

// ---------------------------------------------------------------------------
// buildArtifactPath — deterministic path
// ---------------------------------------------------------------------------

describe('buildArtifactPath', () => {
  it('returns a deterministic path for the same surface + inputKey', () => {
    const a = buildArtifactPath('reach_read_web', 'https://example.com');
    const b = buildArtifactPath('reach_read_web', 'https://example.com');
    assert.equal(a, b, 'same inputs must produce identical paths');
  });

  it('returns different paths for different inputKeys', () => {
    const a = buildArtifactPath('reach_read_web', 'https://a.com');
    const b = buildArtifactPath('reach_read_web', 'https://b.com');
    assert.notEqual(a, b);
  });

  it('does not collide for different keys that sanitize similarly', () => {
    const a = buildArtifactPath('x_search_posts', 'foo/bar');
    const b = buildArtifactPath('x_search_posts', 'foo?bar');
    assert.notEqual(a, b);
  });

  it('does not collide when long keys share the same prefix', () => {
    const a = buildArtifactPath('x_search_posts', 'a'.repeat(205) + 'X');
    const b = buildArtifactPath('x_search_posts', 'a'.repeat(205) + 'Y');
    assert.notEqual(a, b);
  });

  it('does not collide for different surfaces that sanitize similarly', () => {
    const a = buildArtifactPath('a/b', 'key');
    const b = buildArtifactPath('a?b', 'key');
    assert.notEqual(a, b);
  });

  it('returns different paths for different surfaces', () => {
    const a = buildArtifactPath('reach_read_web', 'key1');
    const b = buildArtifactPath('x_search_posts', 'key1');
    assert.notEqual(a, b);
  });

  it('produces a path under the configured base directory', () => {
    const p = buildArtifactPath('reach_read_web', 'test', TEST_BASE);
    assert.ok(p.startsWith(TEST_BASE), `path must start with base dir: ${p}`);
  });

  it('uses ARTIFACT_BASE_DIR as default base', () => {
    const p = buildArtifactPath('reach_read_web', 'test');
    assert.ok(p.startsWith(ARTIFACT_BASE_DIR));
  });

  it('produces a .json file extension', () => {
    const p = buildArtifactPath('x_search_posts', 'query');
    assert.ok(p.endsWith('.json'));
  });
});

// ---------------------------------------------------------------------------
// buildArtifactPath — traversal / guard
// ---------------------------------------------------------------------------

describe('buildArtifactPath guard', () => {
  it('rejects surfaceName containing ".."', () => {
    assert.throws(
      () => buildArtifactPath('../evil', 'key'),
      /traversal/i,
    );
  });

  it('rejects inputKey containing null byte', () => {
    assert.throws(
      () => buildArtifactPath('reach_read_web', 'test\x00evil'),
      /null/i,
    );
  });

  it('rejects surfaceName containing null byte', () => {
    assert.throws(
      () => buildArtifactPath('reach\x00evil', 'key'),
      /null/i,
    );
  });

  it('rejects empty surfaceName', () => {
    assert.throws(
      () => buildArtifactPath('', 'key'),
      /empty|required/i,
    );
  });

  it('rejects empty inputKey', () => {
    assert.throws(
      () => buildArtifactPath('reach_read_web', ''),
      /empty|required/i,
    );
  });

  it('rejects a baseDir that escapes the repository root', () => {
    assert.throws(
      () => buildArtifactPath('reach_read_web', 'key', '../escaped'),
      /repository root/i,
    );
  });
});

// ---------------------------------------------------------------------------
// writeRawArtifact — compact-only write
// ---------------------------------------------------------------------------

describe('writeRawArtifact', () => {
  beforeEach(() => cleanup());
  afterEach(() => cleanup());

  it('writes JSON to the deterministic path when compact=true', async () => {
    const payload = { success: true, data: 'hello' };
    const result = await writeRawArtifact('reach_read_web', 'test-url', payload, {
      compact: true,
      baseDir: TEST_BASE,
    });

    assert.ok(result, 'must return artifact path');
    assert.ok(fs.existsSync(resolveArtifactAbsolutePath(result)), 'file must exist');

    const written = JSON.parse(fs.readFileSync(resolveArtifactAbsolutePath(result), 'utf-8'));
    assert.deepEqual(written, payload);
  });

  it('returns null and writes nothing when compact=false', async () => {
    const payload = { success: true, data: 'hello' };
    const result = await writeRawArtifact('reach_read_web', 'test-url', payload, {
      compact: false,
      baseDir: TEST_BASE,
    });

    assert.equal(result, null);
    assert.ok(!fs.existsSync(TEST_BASE), 'base dir must not be created');
  });

  it('returns null when compact is not provided (defaults to false)', async () => {
    const result = await writeRawArtifact('reach_read_web', 'test-url', { x: 1 }, {
      baseDir: TEST_BASE,
    });
    assert.equal(result, null);
  });

  it('overwrites existing artifact for the same normalized key', async () => {
    await writeRawArtifact('reach_read_web', { url: 'same-key', max: 5 }, { v: 1 }, {
      compact: true,
      baseDir: TEST_BASE,
    });
    const p = await writeRawArtifact('reach_read_web', { max: 5, url: 'same-key' }, { v: 2 }, {
      compact: true,
      baseDir: TEST_BASE,
    });

    const written = JSON.parse(fs.readFileSync(resolveArtifactAbsolutePath(p), 'utf-8'));
    assert.equal(written.v, 2);
  });

  it('anchors relative baseDir under the repository root', async () => {
    const artifactPath = await writeRawArtifact('reach_read_web', 'test-url', { ok: true }, {
      compact: true,
      baseDir: TEST_BASE,
    });

    const absolutePath = resolveArtifactAbsolutePath(artifactPath);
    assert.ok(absolutePath.startsWith(REPO_ROOT), 'artifact must stay under repository root');
    assert.ok(fs.existsSync(absolutePath), 'anchored artifact must exist');
  });
});
