import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { analyze, classifyMarkers } from '../src/core/pine.js';

describe('pine analyze — static analysis', () => {
  it('returns success with no issues for valid v6 indicator', () => {
    const source = `//@version=6
indicator("Test")
plot(close)`;
    const result = analyze({ source });
    assert.equal(result.success, true);
    assert.equal(result.issue_count, 0);
  });

  it('detects array out-of-bounds on array.get', () => {
    const source = `//@version=6
indicator("Test")
a = array.from(1, 2, 3)
x = array.get(a, 5)`;
    const result = analyze({ source });
    assert.ok(result.issue_count > 0, 'should detect OOB');
    assert.ok(result.diagnostics.some(d => d.message.includes('out of bounds')));
  });

  it('detects array out-of-bounds on array.set', () => {
    const source = `//@version=6
indicator("Test")
a = array.from(10, 20)
array.set(a, 3, 99)`;
    const result = analyze({ source });
    assert.ok(result.issue_count > 0);
    assert.ok(result.diagnostics.some(d => d.message.includes('out of bounds')));
  });

  it('warns on .first()/.last() on empty array', () => {
    const source = `//@version=6
indicator("Test")
a = array.new_float(0)
x = a.first()`;
    const result = analyze({ source });
    assert.ok(result.issue_count > 0);
    assert.ok(result.diagnostics.some(d => d.severity === 'warning'));
  });

  it('detects strategy calls without strategy declaration', () => {
    const source = `//@version=6
indicator("Test")
strategy.entry("Long", strategy.long)`;
    const result = analyze({ source });
    assert.ok(result.issue_count > 0);
    assert.ok(result.diagnostics.some(d => d.message.includes('strategy')));
  });

  it('suggests upgrade for old Pine versions', () => {
    const source = `//@version=4
study("Old")
plot(close)`;
    const result = analyze({ source });
    assert.ok(result.diagnostics.some(d => d.severity === 'info' && d.message.includes('upgrading')));
  });

  it('returns empty diagnostics for valid strategy script', () => {
    const source = `//@version=6
strategy("Test Strategy", overlay=true)
if close > open
    strategy.entry("Long", strategy.long)`;
    const result = analyze({ source });
    const errors = result.diagnostics.filter(d => d.severity === 'error');
    assert.equal(errors.length, 0);
  });

  it('classifies Monaco markers by severity', () => {
    const result = classifyMarkers([
      { message: 'compile failed', severity: 8 },
      { message: 'warning', severity: 4 },
      { message: 'info', severity: 2 },
      { message: 'hint', severity: 1 },
    ]);

    assert.equal(result.errors.length, 1);
    assert.equal(result.warnings.length, 1);
    assert.equal(result.infos.length, 2);
  });
});
