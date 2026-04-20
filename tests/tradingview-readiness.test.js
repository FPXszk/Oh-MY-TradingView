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

  it('classifies EPIPE as cli-epipe', async () => {
    const { classifyReadinessFailure } = await import('../src/core/tradingview-readiness.js');
    const result = classifyReadinessFailure(new Error('EPIPE: broken pipe, write'));
    assert.equal(result.category, 'cli-epipe');
  });

  it('classifies process-missing errors', async () => {
    const { classifyReadinessFailure } = await import('../src/core/tradingview-readiness.js');
    const result = classifyReadinessFailure(new Error('TradingView process not found'));
    assert.equal(result.category, 'process-missing');
  });

  it('classifies CDP unreachable (port closed) as cdp-unreachable', async () => {
    const { classifyReadinessFailure } = await import('../src/core/tradingview-readiness.js');
    const result = classifyReadinessFailure(new Error('CDP port 9222 is not reachable'));
    assert.equal(result.category, 'cdp-unreachable');
  });

  it('classifies MCP unhealthy errors', async () => {
    const { classifyReadinessFailure } = await import('../src/core/tradingview-readiness.js');
    const result = classifyReadinessFailure(new Error('MCP server is unhealthy'));
    assert.equal(result.category, 'mcp-unhealthy');
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

describe('POPUP_MONITOR_JS', () => {
  it('installs a MutationObserver-based popup monitor', async () => {
    const { POPUP_MONITOR_JS } = await import('../src/core/tradingview-readiness.js');
    assert.equal(typeof POPUP_MONITOR_JS, 'string');
    assert.match(POPUP_MONITOR_JS, /MutationObserver/,
      'popup monitor JS must install a MutationObserver');
  });
});

describe('readVisibleDialogTexts', () => {
  it('returns dialog texts from visible dialogs', async () => {
    const { readVisibleDialogTexts } = await import('../src/core/tradingview-readiness.js');
    const result = await readVisibleDialogTexts({
      evaluate: async () => ['限定セール中！', 'ログインしてください'],
    });
    assert.deepEqual(result, ['限定セール中！', 'ログインしてください']);
  });

  it('returns an empty array when evaluate returns a non-array', async () => {
    const { readVisibleDialogTexts } = await import('../src/core/tradingview-readiness.js');
    const result = await readVisibleDialogTexts({
      evaluate: async () => null,
    });
    assert.deepEqual(result, []);
  });
});

describe('dismissTransientDialogs', () => {
  it('calls dismiss JS and then sends Escape', async () => {
    const { dismissTransientDialogs } = await import('../src/core/tradingview-readiness.js');
    const calls = [];
    await dismissTransientDialogs({
      evaluate: async () => {
        calls.push('evaluate');
        return { detected: 1, clicked: 1, hidden: 0 };
      },
      getClient: async () => ({
        Input: {
          dispatchKeyEvent: async (event) => {
            calls.push(`key:${event.type}`);
          },
        },
      }),
    }, { settleMs: 0 });
    assert.deepEqual(calls, ['evaluate', 'evaluate', 'key:keyDown', 'key:keyUp']);
  });

  it('does not send Escape when no popup was handled', async () => {
    const { dismissTransientDialogs } = await import('../src/core/tradingview-readiness.js');
    const calls = [];
    await dismissTransientDialogs({
      evaluate: async () => {
        calls.push('evaluate');
        return { detected: 0, clicked: 0, hidden: 0, texts: [] };
      },
      getClient: async () => ({
        Input: {
          dispatchKeyEvent: async (event) => {
            calls.push(`key:${event.type}`);
          },
        },
      }),
    }, { settleMs: 0 });
    assert.deepEqual(calls, ['evaluate', 'evaluate']);
  });

  it('sends Escape when forceEscape is enabled for a visible blocker', async () => {
    const { dismissTransientDialogs } = await import('../src/core/tradingview-readiness.js');
    const calls = [];
    await dismissTransientDialogs({
      evaluate: async () => {
        calls.push('evaluate');
        return { detected: 0, clicked: 0, hidden: 0, texts: [] };
      },
      getClient: async () => ({
        Input: {
          dispatchKeyEvent: async (event) => {
            calls.push(`key:${event.type}`);
          },
        },
      }),
    }, { settleMs: 0, forceEscape: true });
    assert.deepEqual(calls, ['evaluate', 'evaluate', 'key:keyDown', 'key:keyUp']);
  });
});

describe('withPopupGuard', () => {
  it('succeeds on the first attempt without retry', async () => {
    const { withPopupGuard } = await import('../src/core/tradingview-readiness.js');
    const result = await withPopupGuard(
      async () => 'ok',
      {
        evaluate: async () => ({ detected: 0, clicked: 0, hidden: 0 }),
        getClient: async () => ({ Input: { dispatchKeyEvent: async () => {} } }),
      },
      { preClean: false, maxRetries: 1 },
    );
    assert.equal(result, 'ok');
  });

  it('retries after dismissing a detected popup', async () => {
    const { withPopupGuard } = await import('../src/core/tradingview-readiness.js');
    let attempt = 0;
    let dialogReads = 0;
    const result = await withPopupGuard(
      async () => {
        attempt += 1;
        if (attempt === 1) {
          throw new Error('chart API is unavailable');
        }
        return 'recovered';
      },
      {
        evaluate: async (expression) => {
          if (expression.includes('MutationObserver')) {
            return { installed: true, observed: 0, dismissed: 0, hidden: 0 };
          }
          if (expression.includes('role="dialog"')) {
            dialogReads += 1;
            return dialogReads === 1 ? ['広告モーダル'] : [];
          }
          return { detected: 1, clicked: 1, hidden: 0 };
        },
        getClient: async () => ({ Input: { dispatchKeyEvent: async () => {} } }),
      },
      { preClean: false, maxRetries: 1, retryDelayMs: 0 },
    );
    assert.equal(result, 'recovered');
    assert.equal(attempt, 2);
  });

  it('does not retry non-popup failures when no popup is detected', async () => {
    const { withPopupGuard } = await import('../src/core/tradingview-readiness.js');
    let attempt = 0;
    await assert.rejects(
      () => withPopupGuard(
        async () => {
          attempt += 1;
          throw new Error('workspace model unavailable');
        },
        {
          evaluate: async (expression) => {
            if (expression.includes('MutationObserver')) {
              return { installed: true, observed: 0, dismissed: 0, hidden: 0 };
            }
            if (expression.includes('role="dialog"')) {
              return [];
            }
            return { detected: 0, clicked: 0, hidden: 0 };
          },
          getClient: async () => ({ Input: { dispatchKeyEvent: async () => {} } }),
        },
        { preClean: false, maxRetries: 2, retryDelayMs: 0 },
      ),
      /workspace model unavailable/,
    );
    assert.equal(attempt, 1);
  });

  it('retries when the action resolves an error payload caused by popup blocking', async () => {
    const { withPopupGuard } = await import('../src/core/tradingview-readiness.js');
    let attempt = 0;
    const result = await withPopupGuard(
      async () => {
        attempt += 1;
        if (attempt === 1) {
          return { error: 'chart API is unavailable' };
        }
        return { success: true };
      },
      {
        evaluate: async (expression) => {
          if (expression.includes('MutationObserver')) {
            return { installed: true, observed: 0, dismissed: 0, hidden: 0 };
          }
          if (expression.includes('role="dialog"')) {
            return ['広告モーダル'];
          }
          return { detected: 1, clicked: 1, hidden: 0 };
        },
        getClient: async () => ({ Input: { dispatchKeyEvent: async () => {} } }),
      },
      { preClean: false, maxRetries: 1, retryDelayMs: 0 },
    );
    assert.deepEqual(result, { success: true });
    assert.equal(attempt, 2);
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

// ---------------------------------------------------------------------------
// tradingview-recovery.js
// ---------------------------------------------------------------------------
describe('classifyCrashFailure', () => {
  it('classifies process-missing when TradingView process is gone', async () => {
    const { classifyCrashFailure } = await import('../src/core/tradingview-recovery.js');
    const result = classifyCrashFailure({ processAlive: false, portOpen: false, mcpHealthy: false });
    assert.equal(result.severity, 'critical');
    assert.equal(result.category, 'process-missing');
  });

  it('classifies cdp-unreachable when process exists but port is closed', async () => {
    const { classifyCrashFailure } = await import('../src/core/tradingview-recovery.js');
    const result = classifyCrashFailure({ processAlive: true, portOpen: false, mcpHealthy: false });
    assert.equal(result.severity, 'moderate');
    assert.equal(result.category, 'cdp-unreachable');
  });

  it('classifies mcp-unhealthy when port is open but MCP fails', async () => {
    const { classifyCrashFailure } = await import('../src/core/tradingview-recovery.js');
    const result = classifyCrashFailure({ processAlive: true, portOpen: true, mcpHealthy: false });
    assert.equal(result.severity, 'mild');
    assert.equal(result.category, 'mcp-unhealthy');
  });

  it('returns healthy when everything is fine', async () => {
    const { classifyCrashFailure } = await import('../src/core/tradingview-recovery.js');
    const result = classifyCrashFailure({ processAlive: true, portOpen: true, mcpHealthy: true });
    assert.equal(result.severity, 'none');
    assert.equal(result.category, 'healthy');
  });
});

describe('computeBackoff', () => {
  it('computes exponential backoff with correct delays', async () => {
    const { computeBackoff } = await import('../src/core/tradingview-recovery.js');
    assert.equal(computeBackoff(0), 5000);
    assert.equal(computeBackoff(1), 15000);
    assert.equal(computeBackoff(2), 30000);
    assert.equal(computeBackoff(3), 60000);
  });

  it('caps at max delay for high attempt numbers', async () => {
    const { computeBackoff } = await import('../src/core/tradingview-recovery.js');
    assert.equal(computeBackoff(10), 60000);
    assert.equal(computeBackoff(100), 60000);
  });
});

describe('buildRecoveryPlan', () => {
  it('returns reconnect-only plan for mild failure', async () => {
    const { buildRecoveryPlan } = await import('../src/core/tradingview-recovery.js');
    const plan = buildRecoveryPlan({ severity: 'mild', category: 'mcp-unhealthy' });
    assert.deepEqual(plan.actions, ['reconnect-mcp']);
    assert.equal(plan.maxRetries, 3);
  });

  it('returns full restart plan for critical failure', async () => {
    const { buildRecoveryPlan } = await import('../src/core/tradingview-recovery.js');
    const plan = buildRecoveryPlan({ severity: 'critical', category: 'process-missing' });
    assert.ok(plan.actions.includes('kill-existing'));
    assert.ok(plan.actions.includes('relaunch'));
    assert.ok(plan.actions.includes('wait-readiness'));
    assert.ok(plan.actions.includes('reconnect-mcp'));
    assert.equal(plan.maxRetries, 2);
  });

  it('returns restart plan for moderate failure', async () => {
    const { buildRecoveryPlan } = await import('../src/core/tradingview-recovery.js');
    const plan = buildRecoveryPlan({ severity: 'moderate', category: 'cdp-unreachable' });
    assert.ok(plan.actions.includes('kill-existing'));
    assert.ok(plan.actions.includes('relaunch'));
    assert.equal(plan.maxRetries, 2);
  });

  it('returns no-action plan when healthy', async () => {
    const { buildRecoveryPlan } = await import('../src/core/tradingview-recovery.js');
    const plan = buildRecoveryPlan({ severity: 'none', category: 'healthy' });
    assert.deepEqual(plan.actions, []);
    assert.equal(plan.maxRetries, 0);
  });
});

describe('executeRecovery', () => {
  it('succeeds on reconnect-only recovery', async () => {
    const { executeRecovery } = await import('../src/core/tradingview-recovery.js');
    const log = [];
    const fakeDeps = {
      reconnectMcp: async () => { log.push('reconnect'); return true; },
      killExisting: async () => { log.push('kill'); },
      relaunch: async () => { log.push('relaunch'); return { pid: 1234 }; },
      waitReadiness: async () => { log.push('readiness'); return true; },
      log: (msg) => log.push(`log:${msg}`),
    };
    const plan = { actions: ['reconnect-mcp'], maxRetries: 3 };
    const result = await executeRecovery(plan, fakeDeps, { retryDelayMs: 0 });
    assert.equal(result.success, true);
    assert.ok(log.includes('reconnect'));
    assert.ok(!log.includes('kill'));
  });

  it('executes full recovery sequence for critical failure', async () => {
    const { executeRecovery } = await import('../src/core/tradingview-recovery.js');
    const log = [];
    const fakeDeps = {
      reconnectMcp: async () => { log.push('reconnect'); return true; },
      killExisting: async () => { log.push('kill'); },
      relaunch: async () => { log.push('relaunch'); return { pid: 5678 }; },
      waitReadiness: async () => { log.push('readiness'); return true; },
      log: (msg) => log.push(`log:${msg}`),
    };
    const plan = { actions: ['kill-existing', 'relaunch', 'wait-readiness', 'reconnect-mcp'], maxRetries: 2 };
    const result = await executeRecovery(plan, fakeDeps, { retryDelayMs: 0 });
    assert.equal(result.success, true);
    assert.deepEqual(log.filter((l) => !l.startsWith('log:')), ['kill', 'relaunch', 'readiness', 'reconnect']);
  });

  it('retries on failure and eventually succeeds', async () => {
    const { executeRecovery } = await import('../src/core/tradingview-recovery.js');
    let attempt = 0;
    const fakeDeps = {
      reconnectMcp: async () => {
        attempt++;
        if (attempt < 2) throw new Error('MCP reconnect failed');
        return true;
      },
      killExisting: async () => {},
      relaunch: async () => ({ pid: 999 }),
      waitReadiness: async () => true,
      log: () => {},
    };
    const plan = { actions: ['reconnect-mcp'], maxRetries: 3 };
    const result = await executeRecovery(plan, fakeDeps, { retryDelayMs: 0 });
    assert.equal(result.success, true);
    assert.equal(result.attempts, 2);
  });

  it('fails after exhausting retries', async () => {
    const { executeRecovery } = await import('../src/core/tradingview-recovery.js');
    const fakeDeps = {
      reconnectMcp: async () => { throw new Error('MCP reconnect failed'); },
      killExisting: async () => {},
      relaunch: async () => ({ pid: 111 }),
      waitReadiness: async () => true,
      log: () => {},
    };
    const plan = { actions: ['reconnect-mcp'], maxRetries: 2 };
    const result = await executeRecovery(plan, fakeDeps, { retryDelayMs: 0 });
    assert.equal(result.success, false);
    assert.equal(result.attempts, 2);
    assert.match(result.lastError, /MCP reconnect failed/);
  });
});
