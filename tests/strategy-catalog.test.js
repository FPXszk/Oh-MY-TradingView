import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getLiveStrategies,
  getRetiredStrategies,
  findStrategyById,
  validateCatalogIntegrity,
} from '../src/core/strategy-catalog.js';

function fixtureCatalog() {
  return {
    $schema_version: '1.0.0',
    strategies: [
      { id: 'live-alpha', lifecycle: { status: 'live' } },
      { id: 'live-beta', lifecycle: { status: 'live' } },
      {
        id: 'retired-alpha',
        lifecycle: {
          status: 'retired',
          retire_reason: { code: 'superseded_by_family', note: 'fixture' },
          last_strong_generation: 'gen-1',
          replacement_family: 'live-alpha',
        },
      },
    ],
  };
}

describe('validateCatalogIntegrity', () => {
  it('accepts a valid catalog fixture', () => {
    const result = validateCatalogIntegrity(fixtureCatalog());
    assert.equal(result.valid, true, `Catalog errors: ${result.errors.join('; ')}`);
  });

  it('rejects catalog with duplicate ids', () => {
    const catalog = {
      strategies: [
        { id: 'dup', lifecycle: { status: 'live' } },
        { id: 'dup', lifecycle: { status: 'live' } },
      ],
    };
    const result = validateCatalogIntegrity(catalog);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /duplicate/.test(e)));
  });

  it('rejects invalid lifecycle status', () => {
    const catalog = {
      strategies: [
        { id: 'bad', lifecycle: { status: 'archived' } },
      ],
    };
    const result = validateCatalogIntegrity(catalog);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /invalid lifecycle\.status/.test(e)));
  });

  it('rejects retired entry missing retire_reason', () => {
    const catalog = {
      strategies: [
        {
          id: 'missing-reason',
          lifecycle: {
            status: 'retired',
            last_strong_generation: null,
            replacement_family: null,
          },
        },
      ],
    };
    const result = validateCatalogIntegrity(catalog);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /retire_reason/.test(e)));
  });

  it('rejects retired metadata missing required fields', () => {
    const catalog = {
      strategies: [
        {
          id: 'retired-without-metadata',
          lifecycle: {
            status: 'retired',
            retire_reason: { code: 'never_strong' },
          },
        },
      ],
    };
    const result = validateCatalogIntegrity(catalog);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /last_strong_generation/.test(e)));
    assert.ok(result.errors.some((e) => /replacement_family/.test(e)));
  });
});

describe('getLiveStrategies / getRetiredStrategies', () => {
  it('filters live and retired entries without relying on repository counts', () => {
    const catalog = fixtureCatalog();
    assert.deepEqual(getLiveStrategies(catalog).map((s) => s.id), ['live-alpha', 'live-beta']);
    assert.deepEqual(getRetiredStrategies(catalog).map((s) => s.id), ['retired-alpha']);
  });

  it('live and retired fixture entries do not overlap', () => {
    const catalog = fixtureCatalog();
    const liveIds = new Set(getLiveStrategies(catalog).map((s) => s.id));
    const retiredIds = getRetiredStrategies(catalog).map((s) => s.id);
    for (const id of retiredIds) {
      assert.equal(liveIds.has(id), false, `"${id}" in both live and retired`);
    }
  });
});

describe('findStrategyById', () => {
  it('finds a live strategy by fixture id', () => {
    const result = findStrategyById(fixtureCatalog(), 'live-alpha');
    assert.ok(result);
    assert.equal(result.id, 'live-alpha');
    assert.equal(result.lifecycle.status, 'live');
  });

  it('finds a retired strategy by fixture id', () => {
    const result = findStrategyById(fixtureCatalog(), 'retired-alpha');
    assert.ok(result);
    assert.equal(result.id, 'retired-alpha');
    assert.equal(result.lifecycle.status, 'retired');
  });

  it('returns null for unknown id', () => {
    const result = findStrategyById(fixtureCatalog(), 'nonexistent-strategy');
    assert.equal(result, null);
  });
});
