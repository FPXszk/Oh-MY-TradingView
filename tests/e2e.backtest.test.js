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

describe('e2e: Backtest NVDA MA (requires TradingView Desktop)', async () => {
  let available = false;
  let backtest;

  before(async () => {
    available = await isCdpAvailable();
    if (!available) return;
    backtest = await import('../src/core/backtest.js');
  });

  after(async () => {
    if (available) {
      const { disconnect } = await import('../src/connection.js');
      await disconnect();
    }
  });

  it(
    'runNvdaMaBacktest returns structured result',
    { skip: !await isCdpAvailable() && 'CDP not available' },
    async () => {
      const result = await backtest.runNvdaMaBacktest();

      assert.equal(typeof result.success, 'boolean');
      assert.ok(result.symbol, 'symbol should be present');

      if (result.success) {
        assert.equal(typeof result.tester_available, 'boolean');
        if (result.tester_available) {
          assert.ok(result.metrics, 'metrics should be present when tester is available');
        } else {
          assert.ok(result.tester_reason, 'tester_reason should explain unavailability');
        }
      } else {
        assert.ok(Array.isArray(result.compile_errors), 'compile_errors should be an array');
      }
    },
  );

  it(
    'symbol contains NVDA',
    { skip: !await isCdpAvailable() && 'CDP not available' },
    async () => {
      const result = await backtest.runNvdaMaBacktest();
      assert.ok(
        String(result.symbol).toUpperCase().includes('NVDA'),
        `Expected symbol to contain NVDA, got: ${result.symbol}`,
      );
    },
  );
});
