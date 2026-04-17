import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('classifyReadinessFailure', () => {
  it('classifies connection refused as bridge-unreachable', async () => {
    const { classifyReadinessFailure } = await import('../src/core/tradingview-readiness.js');
    const result = classifyReadinessFailure(new Error('connect ECONNREFUSED 172.31.144.1:9223'));
    assert.equal(result.category, 'bridge-unreachable');
  });

  it('classifies timeout as bridge-unreachable', async () => {
    const { classifyReadinessFailure } = await import('../src/core/tradingview-readiness.js');
    const result = classifyReadinessFailure(new Error('ETIMEDOUT'));
    assert.equal(result.category, 'bridge-unreachable');
  });

  it('classifies chart API unavailable as api-unavailable', async () => {
    const { classifyReadinessFailure } = await import('../src/core/tradingview-readiness.js');
    const result = classifyReadinessFailure(new Error('chart API is unavailable'));
    assert.equal(result.category, 'api-unavailable');
  });

  it('classifies unknown errors as unknown', async () => {
    const { classifyReadinessFailure } = await import('../src/core/tradingview-readiness.js');
    const result = classifyReadinessFailure(new Error('some random error'));
    assert.equal(result.category, 'unknown');
  });
});

describe('DISMISS_DIALOG_JS', () => {
  it('exports a non-empty JS expression string', async () => {
    const { DISMISS_DIALOG_JS } = await import('../src/core/tradingview-readiness.js');
    assert.equal(typeof DISMISS_DIALOG_JS, 'string');
    assert.ok(DISMISS_DIALOG_JS.length > 0);
    assert.match(DISMISS_DIALOG_JS, /キャンセル|close|閉じる/i,
      'dismiss JS must target common close/cancel button patterns');
  });
});

describe('healthCheckWithReadiness', () => {
  it('succeeds on first attempt when API is available', async () => {
    const { healthCheckWithReadiness } = await import('../src/core/tradingview-readiness.js');

    const fakeDeps = {
      collectPageState: async () => ({
        url: 'https://tradingview.com/chart/',
        title: 'Chart',
        symbol: 'NVDA',
        resolution: '1D',
        chartType: 'candlestick',
        apiAvailable: true,
      }),
      getClient: async () => ({ Input: { dispatchKeyEvent: async () => {} } }),
      getTargetInfo: async () => ({ id: 'target-1', url: 'https://tradingview.com/chart/', title: 'Chart' }),
      evaluate: async () => true,
    };

    const result = await healthCheckWithReadiness(fakeDeps);
    assert.equal(result.success, true);
    assert.equal(result.api_available, true);
  });

  it('recovers after dialog dismiss when API becomes available on retry', async () => {
    const { healthCheckWithReadiness } = await import('../src/core/tradingview-readiness.js');

    let callCount = 0;
    const fakeDeps = {
      collectPageState: async () => {
        callCount++;
        if (callCount === 1) {
          return { url: 'https://tradingview.com/chart/', apiAvailable: false, apiError: 'dialog blocking' };
        }
        return {
          url: 'https://tradingview.com/chart/',
          title: 'Chart',
          symbol: 'NVDA',
          resolution: '1D',
          chartType: 'candlestick',
          apiAvailable: true,
        };
      },
      getClient: async () => ({ Input: { dispatchKeyEvent: async () => {} } }),
      getTargetInfo: async () => ({ id: 'target-1', url: 'https://tradingview.com/chart/', title: 'Chart' }),
      evaluate: async () => true,
    };

    const result = await healthCheckWithReadiness(fakeDeps, { maxRetries: 3, retryDelayMs: 10 });
    assert.equal(result.success, true);
    assert.equal(result.api_available, true);
    assert.ok(result.readiness_retries >= 1, 'should have retried at least once');
  });

  it('fails with classified error after all retries exhausted', async () => {
    const { healthCheckWithReadiness } = await import('../src/core/tradingview-readiness.js');

    const fakeDeps = {
      collectPageState: async () => ({
        url: 'https://tradingview.com/chart/',
        apiAvailable: false,
        apiError: 'some persistent error',
      }),
      getClient: async () => ({ Input: { dispatchKeyEvent: async () => {} } }),
      getTargetInfo: async () => ({ id: 'target-1', url: 'https://tradingview.com/chart/', title: 'Chart' }),
      evaluate: async () => true,
    };

    const result = await healthCheckWithReadiness(fakeDeps, { maxRetries: 2, retryDelayMs: 10 });
    assert.equal(result.success, false);
    assert.equal(result.api_available, false);
    assert.ok(result.failure_category, 'must include failure_category');
    assert.equal(result.failure_category, 'api-unavailable');
  });

  it('fails immediately with bridge-unreachable when connection is refused', async () => {
    const { healthCheckWithReadiness } = await import('../src/core/tradingview-readiness.js');

    const fakeDeps = {
      collectPageState: async () => { throw new Error('connect ECONNREFUSED 172.31.144.1:9223'); },
      getClient: async () => { throw new Error('connect ECONNREFUSED 172.31.144.1:9223'); },
      getTargetInfo: async () => { throw new Error('connect ECONNREFUSED 172.31.144.1:9223'); },
      evaluate: async () => { throw new Error('connect ECONNREFUSED 172.31.144.1:9223'); },
    };

    const result = await healthCheckWithReadiness(fakeDeps, { maxRetries: 2, retryDelayMs: 10 });
    assert.equal(result.success, false);
    assert.equal(result.failure_category, 'bridge-unreachable');
  });
});
