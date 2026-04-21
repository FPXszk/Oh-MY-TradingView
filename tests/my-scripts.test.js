import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveStrategiesForMyScripts } from '../src/core/my-scripts.js';

describe('resolveStrategiesForMyScripts', () => {
  it('resolves a mixed list of repo presets and public raw-source strategies in order', async () => {
    const strategies = await resolveStrategiesForMyScripts([
      'donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late',
      'tv-public-kdj-l2',
      'tv-public-agni-momentum',
    ]);

    assert.deepEqual(
      strategies.map((strategy) => strategy.id),
      [
        'donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late',
        'tv-public-kdj-l2',
        'tv-public-agni-momentum',
      ],
    );
    assert.equal(strategies[0].builder, 'donchian_breakout');
    assert.equal(strategies[1].builder, 'raw_source');
    assert.ok(strategies.every((strategy) => typeof strategy.name === 'string' && strategy.name.length > 0));
    assert.ok(strategies.every((strategy) => typeof strategy.source === 'string' && strategy.source.includes('strategy(')));
  });

  it('throws when preset ids are missing', async () => {
    await assert.rejects(
      () => resolveStrategiesForMyScripts([]),
      /At least one preset id is required/,
    );
  });

  it('throws when a resolved preset has no source', async () => {
    await assert.rejects(
      () => resolveStrategiesForMyScripts(['missing-source'], {
        loadPreset: async () => ({
          preset: { id: 'missing-source', name: 'Missing Source' },
          source: '',
        }),
      }),
      /missing source/,
    );
  });
});
