import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join, relative, resolve } from 'node:path';
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

import {
  generateSnapshotId,
  resolveSnapshotDir,
  buildManifest,
  allocateSnapshotBundle,
  normalizePageState,
  collectRuntimeErrors,
  collectConnectionInfo,
  captureObservabilitySnapshot,
} from '../src/core/observability.js';

// ---------------------------------------------------------------------------
// generateSnapshotId
// ---------------------------------------------------------------------------

describe('generateSnapshotId', () => {
  it('produces deterministic ID from a fixed date', () => {
    const date = new Date('2026-04-09T16:54:23.000Z');
    assert.equal(generateSnapshotId(date), 'snapshot-20260409T165423Z');
  });

  it('produces snapshot- prefix', () => {
    const id = generateSnapshotId(new Date());
    assert.ok(id.startsWith('snapshot-'));
  });

  it('uses UTC so output is timezone-independent', () => {
    const date = new Date('2026-01-01T00:00:00.000Z');
    assert.equal(generateSnapshotId(date), 'snapshot-20260101T000000Z');
  });
});

// ---------------------------------------------------------------------------
// resolveSnapshotDir
// ---------------------------------------------------------------------------

describe('resolveSnapshotDir', () => {
  it('resolves under the given base directory', () => {
    const base = '/some/base';
    const dir = resolveSnapshotDir('snapshot-20260409T165423Z', base);
    assert.equal(dir, resolve(base, 'snapshot-20260409T165423Z'));
  });

  it('rejects empty string', () => {
    assert.throws(() => resolveSnapshotDir(''), /non-empty string/);
  });

  it('rejects path traversal', () => {
    assert.throws(() => resolveSnapshotDir('../escape'), /traversal/);
  });

  it('rejects forward slash in ID', () => {
    assert.throws(() => resolveSnapshotDir('a/b'), /separators/);
  });

  it('rejects backslash in ID', () => {
    assert.throws(() => resolveSnapshotDir('a\\b'), /separators/);
  });
});

// ---------------------------------------------------------------------------
// buildManifest
// ---------------------------------------------------------------------------

describe('buildManifest', () => {
  it('returns expected shape with snapshot_id, generated_at, artifacts', () => {
    const m = buildManifest('snap-1', { screenshot_path: 'a.png' }, '2026-04-09T00:00:00.000Z');
    assert.equal(m.snapshot_id, 'snap-1');
    assert.equal(m.generated_at, '2026-04-09T00:00:00.000Z');
    assert.deepEqual(m.artifacts, { screenshot_path: 'a.png' });
  });

  it('does not mutate the input artifacts object', () => {
    const arts = { a: '1' };
    const m = buildManifest('s', arts, 'ts');
    arts.b = '2';
    assert.equal(m.artifacts.b, undefined);
  });
});

// ---------------------------------------------------------------------------
// normalizePageState
// ---------------------------------------------------------------------------

describe('normalizePageState', () => {
  it('normalizes a full page state', () => {
    const raw = {
      url: 'https://www.tradingview.com/chart/abc',
      title: 'TradingView — AAPL',
      symbol: 'AAPL',
      resolution: 'D',
      chartType: 1,
      apiAvailable: true,
    };
    const ps = normalizePageState(raw);
    assert.equal(ps.url, raw.url);
    assert.equal(ps.title, raw.title);
    assert.equal(ps.chart_symbol, 'AAPL');
    assert.equal(ps.chart_resolution, 'D');
    assert.equal(ps.chart_type, 1);
    assert.equal(ps.api_available, true);
  });

  it('handles missing fields gracefully', () => {
    const ps = normalizePageState({});
    assert.equal(ps.url, null);
    assert.equal(ps.title, null);
    assert.equal(ps.chart_symbol, null);
    assert.equal(ps.chart_resolution, null);
    assert.equal(ps.chart_type, null);
    assert.equal(ps.api_available, false);
  });

  it('handles null input', () => {
    const ps = normalizePageState(null);
    assert.equal(ps.url, null);
    assert.equal(ps.api_available, false);
  });
});

// ---------------------------------------------------------------------------
// collectRuntimeErrors
// ---------------------------------------------------------------------------

describe('collectRuntimeErrors', () => {
  it('returns errors from evaluateAsync', async () => {
    const errors = await collectRuntimeErrors({
      evaluateAsync: async () => [{ message: 'test error' }],
    });
    assert.deepEqual(errors, [{ message: 'test error' }]);
  });

  it('falls back to evaluate when evaluateAsync is unavailable', async () => {
    const errors = await collectRuntimeErrors({
      evaluate: async () => [{ message: 'fallback error' }],
    });
    assert.deepEqual(errors, [{ message: 'fallback error' }]);
  });

  it('throws when evaluation throws', async () => {
    await assert.rejects(
      () => collectRuntimeErrors({
        evaluateAsync: async () => { throw new Error('boom'); },
      }),
      /boom/,
    );
  });

  it('throws when evaluation returns non-array', async () => {
    await assert.rejects(
      () => collectRuntimeErrors({
        evaluateAsync: async () => 'not-array',
      }),
      /non-array payload/,
    );
  });
});

// ---------------------------------------------------------------------------
// collectConnectionInfo
// ---------------------------------------------------------------------------

describe('collectConnectionInfo', () => {
  it('returns connection info with target', async () => {
    const info = await collectConnectionInfo({
      resolveCdpEndpoint: () => ({ host: '1.2.3.4', port: 9225, url: 'http://1.2.3.4:9225' }),
      getTargetInfo: async () => ({ id: 'T1', url: 'https://tv.com/chart', title: 'Chart' }),
    });
    assert.equal(info.host, '1.2.3.4');
    assert.equal(info.port, 9225);
    assert.equal(info.target_id, 'T1');
    assert.equal(info.target_title, 'Chart');
  });

  it('returns partial info when getTargetInfo throws', async () => {
    const info = await collectConnectionInfo({
      resolveCdpEndpoint: () => ({ host: 'localhost', port: 9225, url: 'http://localhost:9225' }),
      getTargetInfo: async () => { throw new Error('no target'); },
    });
    assert.equal(info.host, 'localhost');
    assert.equal(info.target_id, null);
    assert.ok(info.error);
  });
});

// ---------------------------------------------------------------------------
// allocateSnapshotBundle
// ---------------------------------------------------------------------------

describe('allocateSnapshotBundle', () => {
  it('allocates the base snapshot directory when unused', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'tv-obs-bundle-'));
    try {
      const result = await allocateSnapshotBundle('snapshot-20260409T170000Z', tempDir);
      assert.equal(result.snapshotId, 'snapshot-20260409T170000Z');
      assert.equal(result.bundleDir, resolve(tempDir, 'snapshot-20260409T170000Z'));
      assert.ok(existsSync(result.bundleDir));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('allocates a suffixed snapshot directory when the base ID already exists', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'tv-obs-bundle-'));
    try {
      mkdirSync(resolve(tempDir, 'snapshot-20260409T170000Z'), { recursive: true });
      const result = await allocateSnapshotBundle('snapshot-20260409T170000Z', tempDir);
      assert.equal(result.snapshotId, 'snapshot-20260409T170000Z-2');
      assert.equal(result.bundleDir, resolve(tempDir, 'snapshot-20260409T170000Z-2'));
      assert.ok(existsSync(result.bundleDir));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// captureObservabilitySnapshot — full orchestrator
// ---------------------------------------------------------------------------

function makeMockDeps(overrides = {}) {
  const written = new Map();
  return {
    getClient: async () => ({}),
    getTargetInfo: async () => ({
      id: 'TGT-1',
      url: 'https://www.tradingview.com/chart/abc',
      title: 'TradingView — AAPL',
    }),
    collectPageState: async () => ({
      url: 'https://www.tradingview.com/chart/abc',
      title: 'TradingView — AAPL',
      symbol: 'AAPL',
      resolution: 'D',
      chartType: 1,
      apiAvailable: true,
    }),
    evaluate: async () => [],
    captureScreenshot: async () => ({
      success: true,
      base64: Buffer.from('fake-png').toString('base64'),
      format: 'png',
      dataLength: 8,
    }),
    mkdir: async () => {},
    writeFile: async (path, data) => { written.set(path, data); },
    resolveCdpEndpoint: () => ({ host: 'localhost', port: 9225, url: 'http://localhost:9225' }),
    _written: written,
    ...overrides,
  };
}

describe('captureObservabilitySnapshot', () => {
  it('returns all required top-level keys on success', async () => {
    const deps = makeMockDeps();
    const tempDir = mkdtempSync(join(tmpdir(), 'tv-obs-'));
    try {
      const result = await captureObservabilitySnapshot(
        { baseDir: tempDir, _now: new Date('2026-04-09T17:00:00.000Z') },
        deps,
      );
      assert.equal(result.success, true);
      assert.equal(result.snapshot_id, 'snapshot-20260409T170000Z');
      assert.ok(result.generated_at);
      assert.ok(result.bundle_dir);
      assert.ok(result.connection);
      assert.ok(result.page_state);
      assert.ok(Array.isArray(result.runtime_errors));
      assert.ok(result.artifacts);
      assert.ok(Array.isArray(result.warnings));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('page_state has normalized fields', async () => {
    const deps = makeMockDeps();
    const tempDir = mkdtempSync(join(tmpdir(), 'tv-obs-'));
    try {
      const result = await captureObservabilitySnapshot({ baseDir: tempDir }, deps);
      assert.equal(result.page_state.chart_symbol, 'AAPL');
      assert.equal(result.page_state.chart_resolution, 'D');
      assert.equal(result.page_state.api_available, true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('writes page-state.json, runtime-errors.json, manifest.json, and page.png artifacts', async () => {
    const deps = makeMockDeps();
    const tempDir = mkdtempSync(join(tmpdir(), 'tv-obs-'));
    try {
      const result = await captureObservabilitySnapshot(
        { baseDir: tempDir, _now: new Date('2026-04-09T17:00:00.000Z') },
        deps,
      );
      const writtenPaths = [...deps._written.keys()].map(p =>
        p.replace(/.*snapshot-20260409T170000Z[/\\]/, ''),
      );
      assert.ok(writtenPaths.includes('page-state.json'), 'page-state.json written');
      assert.ok(writtenPaths.includes('runtime-errors.json'), 'runtime-errors.json written');
      assert.ok(writtenPaths.includes('manifest.json'), 'manifest.json written');
      assert.ok(writtenPaths.includes('page.png'), 'page.png written');
      assert.ok(result.artifacts.page_state_path);
      assert.ok(result.artifacts.runtime_errors_path);
      assert.ok(result.artifacts.manifest_path);
      assert.ok(result.artifacts.screenshot_path);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('returns success:false when CDP connection fails', async () => {
    const deps = makeMockDeps({
      getClient: async () => { throw new Error('ECONNREFUSED'); },
    });
    const result = await captureObservabilitySnapshot({}, deps);
    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.ok(/CDP connection failed/.test(result.error));
    assert.ok(result.snapshot_id);
    assert.ok(result.generated_at);
    assert.ok(result.page_state);
    assert.deepEqual(result.artifacts, {});
    assert.deepEqual(result.runtime_errors, []);
  });

  it('adds warning when page state collection fails (partial result)', async () => {
    const deps = makeMockDeps({
      collectPageState: async () => { throw new Error('page-state-boom'); },
    });
    const tempDir = mkdtempSync(join(tmpdir(), 'tv-obs-'));
    try {
      const result = await captureObservabilitySnapshot({ baseDir: tempDir }, deps);
      assert.equal(result.success, true, 'overall snapshot still succeeds');
      assert.ok(result.page_state.error, 'page_state contains error info');
      assert.equal(result.page_state.chart_symbol, null);
      assert.ok(result.warnings.some(w => /page state/.test(w)));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('adds warning when screenshot capture fails (partial result)', async () => {
    const deps = makeMockDeps({
      captureScreenshot: async () => { throw new Error('screenshot-boom'); },
    });
    const tempDir = mkdtempSync(join(tmpdir(), 'tv-obs-'));
    try {
      const result = await captureObservabilitySnapshot({ baseDir: tempDir }, deps);
      assert.equal(result.success, true, 'overall snapshot still succeeds');
      assert.equal(result.artifacts.screenshot_path, undefined, 'no screenshot artifact');
      assert.ok(result.warnings.some(w => /screenshot/.test(w)));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('adds warning when runtime error collection fails (partial result)', async () => {
    const deps = makeMockDeps({
      evaluateAsync: async () => { throw new Error('runtime-probe-boom'); },
      evaluate: undefined,
    });
    const tempDir = mkdtempSync(join(tmpdir(), 'tv-obs-'));
    try {
      const result = await captureObservabilitySnapshot({ baseDir: tempDir }, deps);
      assert.equal(result.success, true, 'overall snapshot still succeeds');
      assert.deepEqual(result.runtime_errors, []);
      assert.ok(result.warnings.some(w => /runtime error collection failed: runtime-probe-boom/.test(w)));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('adds warning when bundle directory creation fails', async () => {
    const deps = makeMockDeps({
      mkdir: async () => { throw new Error('EACCES'); },
    });
    const result = await captureObservabilitySnapshot({}, deps);
    assert.equal(result.success, true);
    assert.deepEqual(result.artifacts, {});
    assert.ok(result.warnings.some(w => /bundle directory/.test(w)));
  });

  it('manifest.json contains snapshot_id and artifacts', async () => {
    const deps = makeMockDeps();
    const tempDir = mkdtempSync(join(tmpdir(), 'tv-obs-'));
    try {
      await captureObservabilitySnapshot(
        { baseDir: tempDir, _now: new Date('2026-01-01T00:00:00.000Z') },
        deps,
      );
      const manifestEntries = [...deps._written.entries()].filter(([p]) =>
        p.endsWith('manifest.json'),
      );
      assert.equal(manifestEntries.length, 1);
      const manifest = JSON.parse(manifestEntries[0][1]);
      assert.equal(manifest.snapshot_id, 'snapshot-20260101T000000Z');
      assert.ok(manifest.generated_at);
      assert.ok(manifest.artifacts);
      assert.ok(manifest.artifacts.manifest_path);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('connection contains host, port, url, target fields', async () => {
    const deps = makeMockDeps();
    const tempDir = mkdtempSync(join(tmpdir(), 'tv-obs-'));
    try {
      const result = await captureObservabilitySnapshot({ baseDir: tempDir }, deps);
      assert.equal(result.connection.host, 'localhost');
      assert.equal(result.connection.port, 9225);
      assert.ok(result.connection.url);
      assert.equal(result.connection.target_id, 'TGT-1');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('allocates a suffixed snapshot bundle when the base timestamp already exists', async () => {
    const deps = makeMockDeps();
    const tempDir = mkdtempSync(join(tmpdir(), 'tv-obs-'));
    try {
      delete deps.mkdir;
      mkdirSync(resolve(tempDir, 'snapshot-20260409T170000Z'), { recursive: true });
      const result = await captureObservabilitySnapshot(
        { baseDir: tempDir, _now: new Date('2026-04-09T17:00:00.000Z') },
        deps,
      );
      assert.equal(result.snapshot_id, 'snapshot-20260409T170000Z-2');
      assert.ok(/snapshot-20260409T170000Z-2$/.test(result.bundle_dir));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Artifact bundle writes to real FS
// ---------------------------------------------------------------------------

describe('captureObservabilitySnapshot (real FS)', () => {
  it('creates actual artifact files in the bundle directory', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'tv-obs-real-'));
    const deps = makeMockDeps({
      mkdir: undefined,
      writeFile: undefined,
    });
    delete deps.mkdir;
    delete deps.writeFile;

    try {
      const result = await captureObservabilitySnapshot(
        { baseDir: tempDir, _now: new Date('2026-06-15T12:30:45.000Z') },
        deps,
      );
      assert.equal(result.success, true);
      const bundleAbs = resolve(process.cwd(), result.bundle_dir);
      assert.ok(existsSync(join(bundleAbs, 'page-state.json')), 'page-state.json exists');
      assert.ok(existsSync(join(bundleAbs, 'runtime-errors.json')), 'runtime-errors.json exists');
      assert.ok(existsSync(join(bundleAbs, 'page.png')), 'page.png exists');
      assert.ok(existsSync(join(bundleAbs, 'manifest.json')), 'manifest.json exists');

      const manifest = JSON.parse(readFileSync(join(bundleAbs, 'manifest.json'), 'utf8'));
      assert.equal(manifest.snapshot_id, 'snapshot-20260615T123045Z');
      assert.ok(manifest.artifacts.page_state_path);
      assert.ok(manifest.artifacts.manifest_path);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
