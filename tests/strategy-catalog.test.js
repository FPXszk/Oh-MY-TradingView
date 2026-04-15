import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  loadCatalog,
  getLiveStrategies,
  getRetiredStrategies,
  findStrategyById,
  validateCatalogIntegrity,
} from '../src/core/strategy-catalog.js';
import { buildExpansionLiveIds } from './strategy-expansion-fixtures.js';

const PROJECT_ROOT = process.cwd();
const expectedLiveIds = buildExpansionLiveIds();

// ---------------------------------------------------------------------------
// loadCatalog
// ---------------------------------------------------------------------------
describe('loadCatalog', () => {
  it('loads catalog successfully', async () => {
    const catalog = await loadCatalog();
    assert.ok(catalog);
    assert.ok(Array.isArray(catalog.strategies));
    assert.equal(catalog.$schema_version, '1.0.0');
  });
});

// ---------------------------------------------------------------------------
// validateCatalogIntegrity
// ---------------------------------------------------------------------------
describe('validateCatalogIntegrity', () => {
  it('validates the real catalog without errors', async () => {
    const catalog = await loadCatalog();
    const result = validateCatalogIntegrity(catalog);
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
});

// ---------------------------------------------------------------------------
// getLiveStrategies / getRetiredStrategies
// ---------------------------------------------------------------------------
describe('getLiveStrategies / getRetiredStrategies', () => {
  it('live count is 25', async () => {
    const catalog = await loadCatalog();
    const live = getLiveStrategies(catalog);
    assert.equal(live.length, 25);
  });

  it('retired count is 126', async () => {
    const catalog = await loadCatalog();
    const retired = getRetiredStrategies(catalog);
    assert.equal(retired.length, 126);
  });

  it('live IDs match expected list', async () => {
    const catalog = await loadCatalog();
    const live = getLiveStrategies(catalog);
    assert.deepEqual(live.map((s) => s.id), expectedLiveIds);
  });

  it('live and retired do not overlap', async () => {
    const catalog = await loadCatalog();
    const liveIds = new Set(getLiveStrategies(catalog).map((s) => s.id));
    const retiredIds = getRetiredStrategies(catalog).map((s) => s.id);
    for (const id of retiredIds) {
      assert.equal(liveIds.has(id), false, `"${id}" in both live and retired`);
    }
  });

  it('all strategy IDs are unique across catalog', async () => {
    const catalog = await loadCatalog();
    const ids = catalog.strategies.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('live and retired projection files stay aligned with the catalog', async () => {
    const catalog = await loadCatalog();
    const liveIds = getLiveStrategies(catalog).map((s) => s.id);
    const retiredIds = getRetiredStrategies(catalog).map((s) => s.id);
    const liveFile = JSON.parse(readFileSync(join(PROJECT_ROOT, 'config', 'backtest', 'strategy-presets.json'), 'utf8'));
    const retiredFile = JSON.parse(readFileSync(join(PROJECT_ROOT, 'docs', 'bad-strategy', 'retired-strategy-presets.json'), 'utf8'));
    assert.deepEqual(liveFile.strategies.map((s) => s.id), liveIds);
    assert.deepEqual(retiredFile.strategies.map((s) => s.id), retiredIds);
  });
});

// ---------------------------------------------------------------------------
// findStrategyById
// ---------------------------------------------------------------------------
describe('findStrategyById', () => {
  it('finds a live strategy by id', async () => {
    const catalog = await loadCatalog();
    const result = findStrategyById(catalog, expectedLiveIds[0]);
    assert.ok(result);
    assert.equal(result.id, expectedLiveIds[0]);
    assert.equal(result.lifecycle.status, 'live');
  });

  it('returns null for unknown id', async () => {
    const catalog = await loadCatalog();
    const result = findStrategyById(catalog, 'nonexistent-strategy');
    assert.equal(result, null);
  });
});

// ---------------------------------------------------------------------------
// retired entries have required lifecycle fields
// ---------------------------------------------------------------------------
describe('retired lifecycle metadata', () => {
  it('every retired entry has retire_reason, last_strong_generation, replacement_family', async () => {
    const catalog = await loadCatalog();
    const retired = getRetiredStrategies(catalog);
    for (const strategy of retired) {
      const lc = strategy.lifecycle;
      assert.ok(lc.retire_reason, `"${strategy.id}" missing retire_reason`);
      assert.ok('last_strong_generation' in lc, `"${strategy.id}" missing last_strong_generation`);
      assert.ok('replacement_family' in lc, `"${strategy.id}" missing replacement_family`);
    }
  });

  it('retire_reason.code is one of the valid codes', async () => {
    const catalog = await loadCatalog();
    const validCodes = new Set(['fell_below_live_cutline', 'superseded_by_family', 'never_strong']);
    const retired = getRetiredStrategies(catalog);
    for (const strategy of retired) {
      assert.ok(
        validCodes.has(strategy.lifecycle.retire_reason.code),
        `"${strategy.id}" has invalid code: ${strategy.lifecycle.retire_reason.code}`,
      );
    }
  });
});
