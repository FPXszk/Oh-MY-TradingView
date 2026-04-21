import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveStrategiesForMyScripts, saveStrategiesToMyScripts } from '../src/core/my-scripts.js';

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

describe('saveStrategiesToMyScripts', () => {
  it('compiles and then saves each resolved strategy into My Scripts', async () => {
    const calls = [];
    const result = await saveStrategiesToMyScripts(['alpha', 'beta'], {
      resolveStrategiesForMyScripts: async () => ([
        { id: 'alpha', name: 'Alpha Script', source: 'strategy("Alpha")' },
        { id: 'beta', name: 'Beta Script', source: 'strategy("Beta")' },
      ]),
      setSource: async ({ source }) => {
        calls.push(`set:${source}`);
      },
      wait: async (ms) => {
        calls.push(`wait:${ms}`);
      },
      getErrors: async () => {
        calls.push('errors');
        return { success: true, has_errors: false, error_count: 0, button_clicked: 'チャートに追加', study_added: true };
      },
      saveCurrentScript: async ({ scriptName }) => {
        calls.push(`save:${scriptName}`);
        return { success: true, save_status: 'saved', script_name: scriptName };
      },
    });

    assert.deepEqual(calls, [
      'set:strategy("Alpha")',
      'wait:1000',
      'errors',
      'save:Alpha Script',
      'set:strategy("Beta")',
      'wait:1000',
      'errors',
      'save:Beta Script',
    ]);
    assert.deepEqual(
      result.map((entry) => ({ id: entry.id, success: entry.success, save_status: entry.save_status, saved_name: entry.saved_name })),
      [
        { id: 'alpha', success: true, save_status: 'saved', saved_name: 'Alpha Script' },
        { id: 'beta', success: true, save_status: 'saved', saved_name: 'Beta Script' },
      ],
    );
  });

  it('does not save when compilation reports errors', async () => {
    let saveCalls = 0;
    const result = await saveStrategiesToMyScripts(['broken'], {
      resolveStrategiesForMyScripts: async () => ([
        { id: 'broken', name: 'Broken Script', source: 'strategy("Broken")' },
      ]),
      setSource: async () => {},
      wait: async () => {},
      getErrors: async () => ({
        success: true,
        has_errors: true,
        error_count: 2,
        button_clicked: 'チャートに追加',
        study_added: false,
      }),
      saveCurrentScript: async () => {
        saveCalls += 1;
        return { success: true, save_status: 'saved', script_name: 'Broken Script' };
      },
    });

    assert.equal(saveCalls, 0);
    assert.equal(result[0].success, false);
    assert.equal(result[0].save_status, null);
    assert.equal(result[0].saved_name, null);
  });
});
