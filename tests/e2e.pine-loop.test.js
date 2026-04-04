import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCdpEndpoint } from '../src/connection.js';

/**
 * E2E tests require TradingView Desktop running with CDP.
 * Endpoint is resolved from TV_CDP_HOST / TV_CDP_PORT (default localhost:9222).
 */

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

describe('e2e: Pine loop (requires TradingView Desktop)', async () => {
  let available = false;
  let core;

  before(async () => {
    available = await isCdpAvailable();
    if (!available) return;
    const healthMod = await import('../src/core/health.js');
    const pineMod = await import('../src/core/pine.js');
    core = { health: healthMod, pine: pineMod };
  });

  after(async () => {
    if (available) {
      const { disconnect } = await import('../src/connection.js');
      await disconnect();
    }
  });

  it('tv_health_check returns success', { skip: !await isCdpAvailable() && 'CDP not available' }, async () => {
    const result = await core.health.healthCheck();
    assert.equal(result.success, true);
    assert.equal(result.cdp_connected, true);
    assert.ok(result.target_url);
  });

  it('tv_discover returns API info', { skip: !await isCdpAvailable() && 'CDP not available' }, async () => {
    const result = await core.health.discover();
    assert.equal(result.success, true);
    assert.ok(typeof result.apis_available === 'number');
  });

  it('pine_set_source + pine_compile + pine_get_errors cycle', { skip: !await isCdpAvailable() && 'CDP not available' }, async () => {
    const testScript = `//@version=6
indicator("E2E Test", overlay=true)
plot(close)`;

    const setResult = await core.pine.setSource({ source: testScript });
    assert.equal(setResult.success, true);

    const compileResult = await core.pine.compile();
    assert.equal(compileResult.success, true);

    const errResult = await core.pine.getErrors();
    assert.equal(errResult.success, true);
    assert.ok(typeof errResult.error_count === 'number');
  });

  it('pine_smart_compile runs end-to-end', { skip: !await isCdpAvailable() && 'CDP not available' }, async () => {
    const result = await core.pine.smartCompile();
    assert.equal(result.success, true);
    assert.ok(typeof result.has_errors === 'boolean');
  });

  it('pine_get_source returns current editor content', { skip: !await isCdpAvailable() && 'CDP not available' }, async () => {
    const result = await core.pine.getSource();
    assert.equal(result.success, true);
    assert.ok(result.source.length > 0);
    assert.ok(result.line_count > 0);
  });
});
