import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Import the modules under test
import {
  safeString,
  requireFinite,
  pickTarget,
  resolveCdpEndpoint,
  buildConnectionHint,
  createPopupGuardedEvaluator,
  createPopupGuardedAsyncEvaluator,
  setSessionPort,
  getSessionPort,
  clearSessionPort,
  sameEndpoint,
} from '../src/connection.js';

describe('safeString', () => {
  it('wraps plain string in JSON quotes', () => {
    assert.equal(safeString('hello'), '"hello"');
  });

  it('escapes double quotes', () => {
    assert.equal(safeString('say "hi"'), '"say \\"hi\\""');
  });

  it('produces a safe double-quoted string that prevents template injection', () => {
    const result = safeString('${evil}');
    // Result is a JSON double-quoted string — safe from backtick template interpolation
    assert.ok(result.startsWith('"') && result.endsWith('"'), 'should be double-quoted');
    assert.equal(result, '"${evil}"');
  });

  it('escapes newlines', () => {
    const result = safeString('line1\nline2');
    assert.ok(result.includes('\\n'));
  });

  it('coerces non-string to string', () => {
    assert.equal(safeString(42), '"42"');
    assert.equal(safeString(null), '"null"');
    assert.equal(safeString(undefined), '"undefined"');
  });
});

describe('requireFinite', () => {
  it('accepts valid integers', () => {
    assert.equal(requireFinite(42, 'port'), 42);
    assert.equal(requireFinite('100', 'val'), 100);
  });

  it('accepts valid floats', () => {
    assert.equal(requireFinite(3.14, 'pi'), 3.14);
  });

  it('rejects NaN', () => {
    assert.throws(() => requireFinite(NaN, 'x'), /must be a finite number/);
  });

  it('rejects Infinity', () => {
    assert.throws(() => requireFinite(Infinity, 'x'), /must be a finite number/);
    assert.throws(() => requireFinite(-Infinity, 'x'), /must be a finite number/);
  });

  it('rejects non-numeric strings', () => {
    assert.throws(() => requireFinite('abc', 'x'), /must be a finite number/);
  });
});

describe('pickTarget', () => {
  it('prefers tradingview.com/chart page target', () => {
    const targets = [
      { type: 'page', url: 'https://example.com', id: 'a' },
      { type: 'page', url: 'https://www.tradingview.com/chart/ABCD/', id: 'b' },
      { type: 'page', url: 'https://www.tradingview.com/', id: 'c' },
    ];
    const result = pickTarget(targets);
    assert.equal(result.id, 'b');
  });

  it('falls back to any tradingview page target', () => {
    const targets = [
      { type: 'page', url: 'https://example.com', id: 'a' },
      { type: 'page', url: 'https://www.tradingview.com/', id: 'c' },
    ];
    const result = pickTarget(targets);
    assert.equal(result.id, 'c');
  });

  it('returns null when no tradingview target found', () => {
    const targets = [
      { type: 'page', url: 'https://example.com', id: 'a' },
      { type: 'other', url: 'https://tradingview.com/chart/', id: 'b' },
    ];
    const result = pickTarget(targets);
    assert.equal(result, null);
  });

  it('returns null for empty array', () => {
    assert.equal(pickTarget([]), null);
  });
});

describe('resolveCdpEndpoint', () => {
  it('returns defaults when no env vars set', () => {
    const ep = resolveCdpEndpoint({});
    assert.equal(ep.host, 'localhost');
    assert.equal(ep.port, 9222);
  });

  it('returns WSL defaults when WSL_DISTRO_NAME is set', () => {
    const ep = resolveCdpEndpoint({ WSL_DISTRO_NAME: 'Ubuntu' });
    assert.equal(ep.host, '172.31.144.1');
    assert.equal(ep.port, 9223);
  });

  it('respects TV_CDP_HOST', () => {
    const ep = resolveCdpEndpoint({ TV_CDP_HOST: '172.20.10.1' });
    assert.equal(ep.host, '172.20.10.1');
    assert.equal(ep.port, 9222);
  });

  it('keeps WSL default port when only TV_CDP_HOST is overridden in WSL', () => {
    const ep = resolveCdpEndpoint({ WSL_DISTRO_NAME: 'Ubuntu', TV_CDP_HOST: '10.0.0.5' });
    assert.equal(ep.host, '10.0.0.5');
    assert.equal(ep.port, 9223);
  });

  it('respects TV_CDP_PORT', () => {
    const ep = resolveCdpEndpoint({ TV_CDP_PORT: '9333' });
    assert.equal(ep.host, 'localhost');
    assert.equal(ep.port, 9333);
  });

  it('keeps WSL default host when only TV_CDP_PORT is overridden in WSL', () => {
    const ep = resolveCdpEndpoint({ WSL_DISTRO_NAME: 'Ubuntu', TV_CDP_PORT: '9333' });
    assert.equal(ep.host, '172.31.144.1');
    assert.equal(ep.port, 9333);
  });

  it('respects both TV_CDP_HOST and TV_CDP_PORT', () => {
    const ep = resolveCdpEndpoint({ TV_CDP_HOST: '10.0.0.5', TV_CDP_PORT: '9444' });
    assert.equal(ep.host, '10.0.0.5');
    assert.equal(ep.port, 9444);
  });

  it('returns url property', () => {
    const ep = resolveCdpEndpoint({ TV_CDP_HOST: '10.0.0.5', TV_CDP_PORT: '9444' });
    assert.equal(ep.url, 'http://10.0.0.5:9444');
  });

  it('falls back to defaults for invalid port', () => {
    const ep = resolveCdpEndpoint({ TV_CDP_PORT: 'abc' });
    assert.equal(ep.port, 9222);
  });
});

describe('buildConnectionHint', () => {
  it('includes endpoint in message', () => {
    const hint = buildConnectionHint('172.20.10.1', 9222);
    assert.ok(hint.includes('172.20.10.1:9222'));
  });

  it('includes TV_CDP_HOST env var name', () => {
    const hint = buildConnectionHint('localhost', 9222);
    assert.ok(hint.includes('TV_CDP_HOST'));
  });

  it('includes TV_CDP_PORT env var name', () => {
    const hint = buildConnectionHint('localhost', 9222);
    assert.ok(hint.includes('TV_CDP_PORT'));
  });

  it('mentions WSL for non-localhost', () => {
    const hint = buildConnectionHint('172.20.10.1', 9222);
    assert.ok(hint.includes('WSL') || hint.includes('wsl'));
  });
});

// ---------------------------------------------------------------------------
// Session port persistence
// ---------------------------------------------------------------------------
describe('session port persistence', () => {
  it('getSessionPort returns null when nothing set', () => {
    clearSessionPort();
    assert.equal(getSessionPort(), null);
  });

  it('setSessionPort stores port and getSessionPort retrieves it', () => {
    clearSessionPort();
    setSessionPort(9333);
    assert.equal(getSessionPort(), 9333);
    clearSessionPort();
  });

  it('clearSessionPort resets stored port', () => {
    setSessionPort(9444);
    clearSessionPort();
    assert.equal(getSessionPort(), null);
  });

  it('resolveCdpEndpoint uses session port when TV_CDP_PORT is absent', () => {
    clearSessionPort();
    setSessionPort(9555);
    const ep = resolveCdpEndpoint({});
    assert.equal(ep.port, 9555);
    clearSessionPort();
  });

  it('resolveCdpEndpoint uses session port over WSL default port', () => {
    clearSessionPort();
    setSessionPort(9555);
    const ep = resolveCdpEndpoint({ WSL_DISTRO_NAME: 'Ubuntu' });
    assert.equal(ep.host, '172.31.144.1');
    assert.equal(ep.port, 9555);
    clearSessionPort();
  });

  it('resolveCdpEndpoint prefers TV_CDP_PORT over session port', () => {
    clearSessionPort();
    setSessionPort(9555);
    const ep = resolveCdpEndpoint({ TV_CDP_PORT: '9666' });
    assert.equal(ep.port, 9666);
    clearSessionPort();
  });

  it('resolveCdpEndpoint falls back to 9222 when no session port and no env', () => {
    clearSessionPort();
    const ep = resolveCdpEndpoint({});
    assert.equal(ep.port, 9222);
  });
});

describe('sameEndpoint', () => {
  it('returns true when host and port match', () => {
    assert.equal(sameEndpoint({ host: 'localhost', port: 9222 }, { host: 'localhost', port: 9222 }), true);
  });

  it('returns false when port differs', () => {
    assert.equal(sameEndpoint({ host: 'localhost', port: 9222 }, { host: 'localhost', port: 9333 }), false);
  });

  it('returns false when host differs or endpoint missing', () => {
    assert.equal(sameEndpoint({ host: 'localhost', port: 9222 }, { host: '127.0.0.1', port: 9222 }), false);
    assert.equal(sameEndpoint(null, { host: 'localhost', port: 9222 }), false);
  });
});

describe('createPopupGuardedEvaluator', () => {
  it('pre-cleans before the guarded action', async () => {
    const calls = [];
    const evaluate = createPopupGuardedEvaluator({
      evaluateImpl: async (expression) => {
        if (expression === 'ACTION') {
          calls.push('action');
          return 'done';
        }
        if (expression.includes('MutationObserver')) {
          calls.push('monitor');
          return { installed: true, observed: 0, dismissed: 0, hidden: 0 };
        }
        calls.push('cleanup');
        return { detected: 0, clicked: 0, hidden: 0 };
      },
      getClientImpl: async () => ({
        Input: { dispatchKeyEvent: async () => calls.push('escape') },
      }),
    });

    const result = await evaluate('ACTION', {
      popupGuard: { retryDelayMs: 0 },
    });
    assert.equal(result, 'done');
    assert.ok(calls.indexOf('cleanup') < calls.indexOf('action'));
  });

  it('retries once when popup is detected after a failure', async () => {
    let attempts = 0;
    const evaluate = createPopupGuardedEvaluator({
      evaluateImpl: async (expression) => {
        if (expression === 'ACTION') {
          attempts += 1;
          if (attempts === 1) {
            throw new Error('chart API is unavailable');
          }
          return 'recovered';
        }
        if (expression.includes('MutationObserver')) {
          return { installed: true, observed: 0, dismissed: 0, hidden: 0 };
        }
        if (expression.includes('role="dialog"')) {
          return ['広告モーダル'];
        }
        return { detected: 1, clicked: 1, hidden: 0 };
      },
      getClientImpl: async () => ({
        Input: { dispatchKeyEvent: async () => {} },
      }),
    });

    const result = await evaluate('ACTION', {
      popupGuard: { preClean: false, maxRetries: 1, retryDelayMs: 0 },
    });
    assert.equal(result, 'recovered');
    assert.equal(attempts, 2);
  });

  it('retries once when popup blocking is returned as an error payload', async () => {
    let attempts = 0;
    const evaluate = createPopupGuardedEvaluator({
      evaluateImpl: async (expression) => {
        if (expression === 'ACTION') {
          attempts += 1;
          if (attempts === 1) {
            return { error: 'chart API is unavailable' };
          }
          return { success: true };
        }
        if (expression.includes('MutationObserver')) {
          return { installed: true, observed: 0, dismissed: 0, hidden: 0 };
        }
        if (expression.includes('role="dialog"')) {
          return ['広告モーダル'];
        }
        return { detected: 1, clicked: 1, hidden: 0 };
      },
      getClientImpl: async () => ({
        Input: { dispatchKeyEvent: async () => {} },
      }),
    });

    const result = await evaluate('ACTION', {
      popupGuard: { preClean: false, maxRetries: 1, retryDelayMs: 0 },
    });
    assert.deepEqual(result, { success: true });
    assert.equal(attempts, 2);
  });
});

describe('createPopupGuardedAsyncEvaluator', () => {
  it('forces awaitPromise=true for guarded async evaluations', async () => {
    let receivedOptions = null;
    const evaluateAsync = createPopupGuardedAsyncEvaluator({
      evaluateImpl: async (_expression, options) => {
        receivedOptions = options;
        return 'async-ok';
      },
      getClientImpl: async () => ({
        Input: { dispatchKeyEvent: async () => {} },
      }),
    });

    const result = await evaluateAsync('ASYNC_ACTION', {
      popupGuard: { preClean: false, retryDelayMs: 0 },
    });
    assert.equal(result, 'async-ok');
    assert.equal(receivedOptions.awaitPromise, true);
  });
});
