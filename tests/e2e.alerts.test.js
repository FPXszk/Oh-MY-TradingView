import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
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

describe('e2e: Alerts (requires TradingView Desktop)', async () => {
  let available = false;
  let alerts;

  before(async () => {
    available = await isCdpAvailable();
    if (!available) return;
    alerts = await import('../src/core/alerts.js');
  });

  after(async () => {
    if (available) {
      const { disconnect } = await import('../src/connection.js');
      await disconnect();
    }
  });

  it('listAlerts returns alert array', { skip: !await isCdpAvailable() && 'CDP not available' }, async () => {
    let result;
    try {
      result = await alerts.listAlerts();
    } catch (err) {
      if (/alerts api not available/i.test(err.message)) return;
      throw err;
    }
    assert.equal(result.success, true);
    assert.ok(Array.isArray(result.alerts));
    assert.ok(typeof result.count === 'number');
  });
});
