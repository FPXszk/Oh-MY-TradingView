import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  listAlerts,
  createPriceAlert,
  deleteAlert,
} from '../src/core/alerts.js';

// ---------------------------------------------------------------------------
// Mock helpers — simulate CDP evaluate responses
// ---------------------------------------------------------------------------

function mockEvaluate(returnValue) {
  return async () => returnValue;
}

function mockDeps(returnValue) {
  return { _deps: { evaluate: mockEvaluate(returnValue), evaluateAsync: mockEvaluate(returnValue) } };
}

// ---------------------------------------------------------------------------
// createPriceAlert — validation
// ---------------------------------------------------------------------------

describe('createPriceAlert — validation', () => {
  it('rejects missing price', async () => {
    await assert.rejects(
      () => createPriceAlert({}),
      /price must be a finite number/,
    );
  });

  it('rejects NaN price', async () => {
    await assert.rejects(
      () => createPriceAlert({ price: 'abc' }),
      /price must be a finite number/,
    );
  });

  it('rejects Infinity price', async () => {
    await assert.rejects(
      () => createPriceAlert({ price: Infinity }),
      /price must be a finite number/,
    );
  });

  it('rejects invalid condition', async () => {
    await assert.rejects(
      () => createPriceAlert({ price: 100, condition: 'invalid' }),
      /condition must be one of/,
    );
  });
});

// ---------------------------------------------------------------------------
// deleteAlert — validation
// ---------------------------------------------------------------------------

describe('deleteAlert — validation', () => {
  it('rejects missing id', async () => {
    await assert.rejects(
      () => deleteAlert({}),
      /alert id is required/,
    );
  });

  it('rejects null id', async () => {
    await assert.rejects(
      () => deleteAlert({ id: null }),
      /alert id is required/,
    );
  });

  it('rejects empty string id', async () => {
    await assert.rejects(
      () => deleteAlert({ id: '  ' }),
      /alert id is required/,
    );
  });
});

// ---------------------------------------------------------------------------
// listAlerts — mocked CDP
// ---------------------------------------------------------------------------

describe('listAlerts — mocked CDP', () => {
  it('returns alerts list on success', async () => {
    const result = await listAlerts(mockDeps({
      alerts: [
        { id: 'a1', symbol: 'AAPL', price: 150, active: true, condition: 'crossing', name: 'test' },
      ],
    }));
    assert.equal(result.success, true);
    assert.equal(result.count, 1);
    assert.equal(result.alerts[0].id, 'a1');
    assert.equal(result.alerts[0].symbol, 'AAPL');
    assert.ok(result.retrieved_at);
  });

  it('returns empty list on success', async () => {
    const result = await listAlerts(mockDeps({ alerts: [] }));
    assert.equal(result.success, true);
    assert.equal(result.count, 0);
  });

  it('throws on CDP error', async () => {
    await assert.rejects(
      () => listAlerts(mockDeps({ error: 'Alerts API not available' })),
      /listAlerts failed.*Alerts API not available/,
    );
  });
});

// ---------------------------------------------------------------------------
// createPriceAlert — mocked CDP
// ---------------------------------------------------------------------------

describe('createPriceAlert — mocked CDP', () => {
  it('returns created alert on success', async () => {
    const result = await createPriceAlert({
      price: 150.5,
      condition: 'crossing_up',
      message: 'breakout',
      ...mockDeps({
        id: 'new-1',
        symbol: 'AAPL',
        price: 150.5,
        condition: 'crossing_up',
      }),
    });
    assert.equal(result.success, true);
    assert.equal(result.id, 'new-1');
    assert.equal(result.price, 150.5);
    assert.equal(result.condition, 'crossing_up');
  });

  it('accepts default condition', async () => {
    const result = await createPriceAlert({
      price: 200,
      ...mockDeps({
        id: 'new-2',
        symbol: 'MSFT',
        price: 200,
        condition: 'crossing',
      }),
    });
    assert.equal(result.success, true);
    assert.equal(result.condition, 'crossing');
  });

  it('throws on CDP error', async () => {
    await assert.rejects(
      () => createPriceAlert({
        price: 100,
        ...mockDeps({ error: 'createPriceAlert not supported' }),
      }),
      /createPriceAlert failed/,
    );
  });
});

// ---------------------------------------------------------------------------
// deleteAlert — mocked CDP
// ---------------------------------------------------------------------------

describe('deleteAlert — mocked CDP', () => {
  it('returns deleted id on success', async () => {
    const result = await deleteAlert({ id: 'a1', ...mockDeps({ deleted: 'a1' }) });
    assert.equal(result.success, true);
    assert.equal(result.deletedId, 'a1');
  });

  it('preserves numeric alert ids from the underlying API', async () => {
    const result = await deleteAlert({ id: 42, ...mockDeps({ deleted: 42 }) });
    assert.equal(result.success, true);
    assert.equal(result.deletedId, 42);
  });

  it('throws when alert not found', async () => {
    await assert.rejects(
      () => deleteAlert({ id: 'missing', ...mockDeps({ error: 'Alert with id missing not found' }) }),
      /deleteAlert failed.*not found/,
    );
  });
});
