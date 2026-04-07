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
        if (result.restore_success !== undefined) {
          assert.equal(typeof result.restore_success, 'boolean');
          if (!result.restore_success) {
            assert.equal(typeof result.restore_error, 'string');
            assert.ok(result.restore_error.length > 0);
          }
        }

        // apply_failed must be present on success path
        if (result.apply_failed !== undefined) {
          assert.equal(typeof result.apply_failed, 'boolean');
          if (result.apply_failed) {
            assert.ok(result.apply_reason, 'apply_reason should explain apply failure');
            assert.equal(result.tester_available, false);
          }
        }

        if (
          result.apply_failed === false &&
          result.tester_reason_category === 'no_strategy_applied'
        ) {
          assert.fail(
            'apply_failed=false contradicts tester_reason_category=no_strategy_applied',
          );
        }

        if (result.tester_available) {
          assert.ok(result.metrics, 'metrics should be present when tester is available');
        } else {
          assert.ok(result.tester_reason, 'tester_reason should explain unavailability');
          if (result.tester_reason_category) {
            const validCategories = ['panel_not_visible', 'no_strategy_applied', 'metrics_unreadable', 'unknown'];
            assert.ok(
              validCategories.includes(result.tester_reason_category),
              `tester_reason_category should be one of ${validCategories.join(', ')}, got: ${result.tester_reason_category}`,
            );
          }
        }

        // fallback metrics must indicate source
        if (result.fallback_metrics) {
          assert.ok(result.fallback_source, 'fallback_source should be present with fallback_metrics');
        }

        if (result.tester_reason_category === 'metrics_unreadable') {
          assert.equal(typeof result.rerun_recommended, 'boolean');
          if (result.fallback_metrics) {
            assert.equal(result.degraded_result, true);
            assert.equal(result.rerun_recommended, false);
          } else {
            assert.equal(result.degraded_result, undefined);
            assert.equal(result.rerun_recommended, true);
          }
        }
      } else {
        assert.ok(Array.isArray(result.compile_errors), 'compile_errors should be an array');
        if (result.editor_open_failed) {
          assert.equal(typeof result.editor_open_reason, 'string');
          assert.ok(result.editor_open_reason.length > 0);
        }
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
