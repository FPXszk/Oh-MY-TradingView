import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveStrategiesForMyScripts, saveStrategiesToMyScripts } from '../src/core/my-scripts.js';

describe('resolveStrategiesForMyScripts', () => {
  it('resolves presets in order through the injected loader', async () => {
    const strategies = await resolveStrategiesForMyScripts([
      'fixture-alpha',
      'fixture-beta',
    ], {
      loadPreset: async (id) => ({
        preset: {
          id,
          name: id === 'fixture-alpha' ? 'Fixture Alpha' : 'Fixture Beta',
          builder: id === 'fixture-alpha' ? 'donchian_breakout' : 'raw_source',
        },
        source: id === 'fixture-alpha'
          ? 'strategy("Fixture Alpha")'
          : 'strategy("Fixture Beta")',
      }),
    });

    assert.deepEqual(
      strategies.map((strategy) => strategy.id),
      [
        'fixture-alpha',
        'fixture-beta',
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
  it('sets source before saving each resolved strategy into My Scripts', async () => {
    const calls = [];
    const result = await saveStrategiesToMyScripts(['alpha', 'beta'], {
      resolveStrategiesForMyScripts: async () => ([
        { id: 'alpha', name: 'Alpha Script', source: 'strategy("Alpha")' },
        { id: 'beta', name: 'Beta Script', source: 'strategy("Beta")' },
      ]),
      createNewPineScript: async () => {
        calls.push('new');
        return { success: true };
      },
      setSource: async ({ source }) => {
        calls.push(`set:${source}`);
        return { success: true };
      },
      saveCurrentScript: async ({ scriptName }) => {
        calls.push(`save:${scriptName}`);
        return { success: true, save_status: 'saved', script_name: scriptName };
      },
    });

    assert.deepEqual(calls, [
      'new',
      'set:strategy("Alpha")',
      'save:Alpha Script',
      'new',
      'set:strategy("Beta")',
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

  it('does not save when script saving fails', async () => {
    let saveCalls = 0;
    const result = await saveStrategiesToMyScripts(['broken'], {
      resolveStrategiesForMyScripts: async () => ([
        { id: 'broken', name: 'Broken Script', source: 'strategy("Broken")' },
      ]),
      createNewPineScript: async () => ({ success: true }),
      setSource: async () => ({ success: true }),
      saveCurrentScript: async () => {
        saveCalls += 1;
        return { success: false, save_status: 'error', script_name: 'Broken Script', error: 'Save failed' };
      },
    });

    assert.equal(saveCalls, 1);
    assert.equal(result[0].success, false);
    assert.equal(result[0].save_status, 'error');
    assert.equal(result[0].saved_name, 'Broken Script');
  });

  it('does not save when source replacement fails', async () => {
    let saveCalls = 0;
    const result = await saveStrategiesToMyScripts(['broken-source'], {
      resolveStrategiesForMyScripts: async () => ([
        { id: 'broken-source', name: 'Broken Source Script', source: 'strategy("Broken Source")' },
      ]),
      createNewPineScript: async () => ({ success: true }),
      setSource: async () => {
        throw new Error('Monaco found but setValue() failed.');
      },
      saveCurrentScript: async () => {
        saveCalls += 1;
        return { success: true, save_status: 'saved', script_name: 'Broken Source Script' };
      },
    });

    assert.equal(saveCalls, 0);
    assert.equal(result[0].success, false);
    assert.equal(result[0].save_status, null);
    assert.equal(result[0].saved_name, null);
    assert.match(result[0].error, /setValue\(\) failed/);
  });
});
