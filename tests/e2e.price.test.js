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

describe('e2e: Price (requires TradingView Desktop)', async () => {
  let available = false;
  let price;

  before(async () => {
    available = await isCdpAvailable();
    if (!available) return;
    price = await import('../src/core/price.js');
  });

  after(async () => {
    if (available) {
      const { disconnect } = await import('../src/connection.js');
      await disconnect();
    }
  });

  it('getCurrentPrice returns price data', { skip: !await isCdpAvailable() && 'CDP not available' }, async () => {
    const result = await price.getCurrentPrice();
    assert.equal(result.success, true);
    assert.ok(typeof result.symbol === 'string');
    assert.ok(result.symbol.length > 0);
    assert.ok(typeof result.price === 'number');
    assert.ok(Number.isFinite(result.price));
    assert.ok(['bars_close', 'chart_api', 'dom'].includes(result.source));
    assert.ok(result.retrieved_at);
  });

  it('getCurrentPrice result has valid ISO timestamp', { skip: !await isCdpAvailable() && 'CDP not available' }, async () => {
    const result = await price.getCurrentPrice();
    const parsed = Date.parse(result.retrieved_at);
    assert.ok(!isNaN(parsed));
  });
});
