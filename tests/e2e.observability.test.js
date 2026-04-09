import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { resolve, join } from 'node:path';
import { rmSync, existsSync, readFileSync } from 'node:fs';
import { resolveCdpEndpoint } from '../src/connection.js';

const { url: CDP_BASE } = resolveCdpEndpoint();
const CDP_URL = `${CDP_BASE}/json/list`;

async function isCdpAvailable() {
  try {
    const resp = await fetch(CDP_URL, { signal: AbortSignal.timeout(3000) });
    return resp.ok;
  } catch {
    return false;
  }
}

const E2E_BASE_DIR = resolve(process.cwd(), 'results', 'observability', '__e2e_test__');

describe('e2e: Observability Snapshot (requires TradingView Desktop)', async () => {
  let available = false;
  let observability;

  before(async () => {
    available = await isCdpAvailable();
    if (!available) return;
    observability = await import('../src/core/observability.js');
  });

  after(async () => {
    if (available) {
      const { disconnect } = await import('../src/connection.js');
      await disconnect();
    }
    rmSync(E2E_BASE_DIR, { recursive: true, force: true });
  });

  it('captures a full observability snapshot', {
    skip: !await isCdpAvailable() && 'CDP not available',
  }, async () => {
    const result = await observability.captureObservabilitySnapshot({
      baseDir: E2E_BASE_DIR,
    });

    assert.equal(result.success, true, `snapshot failed: ${JSON.stringify(result)}`);
    assert.ok(result.snapshot_id);
    assert.ok(result.generated_at);
    assert.ok(result.bundle_dir);

    // Connection
    assert.ok(result.connection);
    assert.ok(result.connection.host);
    assert.ok(result.connection.port);

    // Page state
    assert.ok(result.page_state);
    assert.ok(typeof result.page_state.url === 'string');

    // Artifacts
    assert.ok(result.artifacts);
    const bundleAbs = resolve(process.cwd(), result.bundle_dir);
    assert.ok(existsSync(join(bundleAbs, 'manifest.json')), 'manifest.json exists');
    assert.ok(existsSync(join(bundleAbs, 'page-state.json')), 'page-state.json exists');
    assert.ok(existsSync(join(bundleAbs, 'runtime-errors.json')), 'runtime-errors.json exists');

    // Manifest is valid JSON
    const manifest = JSON.parse(readFileSync(join(bundleAbs, 'manifest.json'), 'utf8'));
    assert.equal(manifest.snapshot_id, result.snapshot_id);
  });

  it('snapshot result has valid ISO timestamp', {
    skip: !await isCdpAvailable() && 'CDP not available',
  }, async () => {
    const result = await observability.captureObservabilitySnapshot({
      baseDir: E2E_BASE_DIR,
    });
    const parsed = Date.parse(result.generated_at);
    assert.ok(!isNaN(parsed));
  });
});
