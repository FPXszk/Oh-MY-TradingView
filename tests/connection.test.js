import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Import the modules under test
import {
  safeString,
  requireFinite,
  pickTarget,
  resolveCdpEndpoint,
  buildConnectionHint,
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

  it('respects TV_CDP_HOST', () => {
    const ep = resolveCdpEndpoint({ TV_CDP_HOST: '172.20.10.1' });
    assert.equal(ep.host, '172.20.10.1');
    assert.equal(ep.port, 9222);
  });

  it('respects TV_CDP_PORT', () => {
    const ep = resolveCdpEndpoint({ TV_CDP_PORT: '9333' });
    assert.equal(ep.host, 'localhost');
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
