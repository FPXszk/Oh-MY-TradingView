import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  validatePreset,
  validatePresetIds,
  filterPresetsByRound,
} from '../src/core/preset-validation.js';

import { buildNvdaMaSource } from '../src/core/backtest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadPresets() {
  const raw = await readFile(
    join(__dirname, '..', 'config', 'backtest', 'strategy-presets.json'),
    'utf8',
  );
  return JSON.parse(raw);
}

// ---------------------------------------------------------------------------
// validatePreset — basic required fields
// ---------------------------------------------------------------------------
describe('validatePreset', () => {
  it('accepts a minimal valid preset', () => {
    const result = validatePreset({
      id: 'test-minimal',
      name: 'Test Minimal',
      category: 'breakout',
      builder: 'donchian_breakout',
      parameters: { entry_period: 20, exit_period: 10 },
    });
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it('rejects a preset missing id', () => {
    const result = validatePreset({
      name: 'No Id',
      category: 'breakout',
      builder: 'donchian_breakout',
      parameters: {},
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /id/.test(e)));
  });

  it('rejects a preset missing builder', () => {
    const result = validatePreset({
      id: 'no-builder',
      name: 'No Builder',
      category: 'breakout',
      parameters: {},
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /builder/.test(e)));
  });

  it('rejects a preset missing parameters', () => {
    const result = validatePreset({
      id: 'no-params',
      name: 'No Params',
      category: 'breakout',
      builder: 'donchian_breakout',
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /parameters/.test(e)));
  });
});

// ---------------------------------------------------------------------------
// validatePreset — exit_overlay
// ---------------------------------------------------------------------------
describe('validatePreset — exit_overlay', () => {
  it('accepts atr_trailing_stop exit overlay', () => {
    const result = validatePreset({
      id: 'atr-exit',
      name: 'ATR Exit',
      category: 'breakout',
      builder: 'donchian_breakout',
      parameters: { entry_period: 55, exit_period: 20 },
      exit_overlay: { type: 'atr_trailing_stop', atr_period: 14, atr_multiplier: 3 },
    });
    assert.equal(result.valid, true);
  });

  it('accepts bollinger_2sigma_exit exit overlay', () => {
    const result = validatePreset({
      id: 'bb-exit',
      name: 'BB Exit',
      category: 'breakout',
      builder: 'donchian_breakout',
      parameters: { entry_period: 55, exit_period: 20 },
      exit_overlay: { type: 'bollinger_2sigma_exit', bb_length: 20, bb_stddev: 2 },
    });
    assert.equal(result.valid, true);
  });

  it('accepts chandelier_exit exit overlay', () => {
    const result = validatePreset({
      id: 'chand-exit',
      name: 'Chandelier Exit',
      category: 'breakout',
      builder: 'donchian_breakout',
      parameters: { entry_period: 55, exit_period: 20 },
      exit_overlay: { type: 'chandelier_exit', atr_period: 22, atr_multiplier: 3 },
    });
    assert.equal(result.valid, true);
  });

  it('rejects exit_overlay without type', () => {
    const result = validatePreset({
      id: 'bad-exit',
      name: 'Bad Exit',
      category: 'breakout',
      builder: 'donchian_breakout',
      parameters: { entry_period: 55, exit_period: 20 },
      exit_overlay: { atr_period: 14 },
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /exit_overlay\.type/.test(e)));
  });

  it('rejects unknown exit_overlay type', () => {
    const result = validatePreset({
      id: 'unknown-exit',
      name: 'Unknown Exit',
      category: 'breakout',
      builder: 'donchian_breakout',
      parameters: { entry_period: 55, exit_period: 20 },
      exit_overlay: { type: 'magic_exit' },
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /exit_overlay\.type/.test(e)));
  });

  it('rejects unsupported channel_exit overlay', () => {
    const result = validatePreset({
      id: 'channel-exit',
      name: 'Channel Exit',
      category: 'breakout',
      builder: 'donchian_breakout',
      parameters: { entry_period: 55, exit_period: 20 },
      exit_overlay: { type: 'channel_exit', length: 20 },
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /exit_overlay\.type/.test(e)));
  });
});

// ---------------------------------------------------------------------------
// validatePreset — stop_loss
// ---------------------------------------------------------------------------
describe('validatePreset — stop_loss', () => {
  it('accepts hard_percent stop loss', () => {
    const result = validatePreset({
      id: 'hard-stop',
      name: 'Hard Stop',
      category: 'breakout',
      builder: 'donchian_breakout',
      parameters: { entry_period: 55, exit_period: 20 },
      stop_loss: { type: 'hard_percent', value: 8 },
    });
    assert.equal(result.valid, true);
  });

  it('accepts atr_stop stop loss', () => {
    const result = validatePreset({
      id: 'atr-stop',
      name: 'ATR Stop',
      category: 'breakout',
      builder: 'donchian_breakout',
      parameters: { entry_period: 55, exit_period: 20 },
      stop_loss: { type: 'atr_stop', atr_period: 14, atr_multiplier: 2 },
    });
    assert.equal(result.valid, true);
  });

  it('rejects stop_loss without type', () => {
    const result = validatePreset({
      id: 'no-stop-type',
      name: 'No Stop Type',
      category: 'breakout',
      builder: 'donchian_breakout',
      parameters: { entry_period: 55, exit_period: 20 },
      stop_loss: { value: 8 },
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /stop_loss\.type/.test(e)));
  });

  it('rejects hard_percent without value', () => {
    const result = validatePreset({
      id: 'no-stop-val',
      name: 'No Stop Value',
      category: 'breakout',
      builder: 'donchian_breakout',
      parameters: { entry_period: 55, exit_period: 20 },
      stop_loss: { type: 'hard_percent' },
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /value/.test(e)));
  });

  it('rejects atr_stop without atr_period', () => {
    const result = validatePreset({
      id: 'no-atr-period',
      name: 'No ATR Period',
      category: 'breakout',
      builder: 'donchian_breakout',
      parameters: { entry_period: 55, exit_period: 20 },
      stop_loss: { type: 'atr_stop', atr_multiplier: 2 },
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /atr_period/.test(e)));
  });

  it('rejects atr_stop without atr_multiplier', () => {
    const result = validatePreset({
      id: 'no-atr-mult',
      name: 'No ATR Mult',
      category: 'breakout',
      builder: 'donchian_breakout',
      parameters: { entry_period: 55, exit_period: 20 },
      stop_loss: { type: 'atr_stop', atr_period: 14 },
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /atr_multiplier/.test(e)));
  });

  it('rejects unknown stop_loss type', () => {
    const result = validatePreset({
      id: 'bad-stop-type',
      name: 'Bad Stop Type',
      category: 'breakout',
      builder: 'donchian_breakout',
      parameters: { entry_period: 55, exit_period: 20 },
      stop_loss: { type: 'magical_stop' },
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /stop_loss\.type/.test(e)));
  });
});

// ---------------------------------------------------------------------------
// validatePreset — regime_filter
// ---------------------------------------------------------------------------
describe('validatePreset — regime_filter', () => {
  it('accepts spy_above_sma200 regime filter', () => {
    const result = validatePreset({
      id: 'spy-filter',
      name: 'SPY Filter',
      category: 'breakout',
      builder: 'donchian_breakout',
      parameters: { entry_period: 55, exit_period: 20 },
      regime_filter: {
        type: 'spy_above_sma200',
        reference_symbol: 'SPY',
        reference_ma_type: 'sma',
        reference_ma_period: 200,
        action_when_false: 'no_new_entry',
      },
    });
    assert.equal(result.valid, true);
  });

  it('accepts rsp_above_sma200 regime filter', () => {
    const result = validatePreset({
      id: 'rsp-filter',
      name: 'RSP Filter',
      category: 'breakout',
      builder: 'donchian_breakout',
      parameters: { entry_period: 55, exit_period: 20 },
      regime_filter: {
        type: 'rsp_above_sma200',
        reference_symbol: 'RSP',
        reference_ma_type: 'sma',
        reference_ma_period: 200,
        action_when_false: 'no_new_entry',
      },
    });
    assert.equal(result.valid, true);
  });

  it('rejects regime_filter without type', () => {
    const result = validatePreset({
      id: 'no-regime-type',
      name: 'No Regime Type',
      category: 'breakout',
      builder: 'donchian_breakout',
      parameters: { entry_period: 55, exit_period: 20 },
      regime_filter: { reference_symbol: 'SPY' },
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /regime_filter\.type/.test(e)));
  });

  it('rejects unsupported regime_filter type', () => {
    const result = validatePreset({
      id: 'bad-regime-type',
      name: 'Bad Regime Type',
      category: 'breakout',
      builder: 'donchian_breakout',
      parameters: { entry_period: 55, exit_period: 20 },
      regime_filter: {
        type: 'vix_below_sma200',
        reference_symbol: 'VIX',
        reference_ma_type: 'sma',
        reference_ma_period: 200,
        action_when_false: 'no_new_entry',
      },
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /regime_filter\.type/.test(e)));
  });

  it('rejects regime_filter without generator-required fields', () => {
    const result = validatePreset({
      id: 'missing-regime-fields',
      name: 'Missing Regime Fields',
      category: 'breakout',
      builder: 'donchian_breakout',
      parameters: { entry_period: 55, exit_period: 20 },
      regime_filter: {
        type: 'spy_above_sma200',
      },
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /reference_symbol/.test(e)));
    assert.ok(result.errors.some((e) => /reference_ma_type/.test(e)));
    assert.ok(result.errors.some((e) => /reference_ma_period/.test(e)));
    assert.ok(result.errors.some((e) => /action_when_false/.test(e)));
  });
});

// ---------------------------------------------------------------------------
// validatePresetIds
// ---------------------------------------------------------------------------
describe('validatePresetIds', () => {
  it('passes when all ids are unique', () => {
    const result = validatePresetIds([
      { id: 'a' },
      { id: 'b' },
      { id: 'c' },
    ]);
    assert.equal(result.valid, true);
    assert.deepEqual(result.duplicates, []);
  });

  it('detects duplicate ids', () => {
    const result = validatePresetIds([
      { id: 'a' },
      { id: 'b' },
      { id: 'a' },
    ]);
    assert.equal(result.valid, false);
    assert.ok(result.duplicates.includes('a'));
  });
});

// ---------------------------------------------------------------------------
// filterPresetsByRound
// ---------------------------------------------------------------------------
describe('filterPresetsByRound', () => {
  it('filters presets by implementation_stage', () => {
    const presets = [
      { id: 'r1', implementation_stage: 'baseline' },
      { id: 'r2', implementation_stage: 'round2' },
      { id: 'r4', implementation_stage: 'round4' },
    ];
    const r4 = filterPresetsByRound(presets, 'round4');
    assert.equal(r4.length, 1);
    assert.equal(r4[0].id, 'r4');
  });

  it('returns empty for unmatched round', () => {
    const presets = [{ id: 'r1', implementation_stage: 'baseline' }];
    assert.deepEqual(filterPresetsByRound(presets, 'round99'), []);
  });
});

// ---------------------------------------------------------------------------
// Integration: full presets file validation
// ---------------------------------------------------------------------------
describe('strategy-presets.json integration', () => {
  it('all presets pass validation', async () => {
    const data = await loadPresets();
    for (const preset of data.strategies) {
      const result = validatePreset(preset);
      assert.equal(
        result.valid,
        true,
        `Preset "${preset.id}" failed: ${result.errors.join('; ')}`,
      );
    }
  });

  it('all preset ids are unique', async () => {
    const data = await loadPresets();
    const result = validatePresetIds(data.strategies);
    assert.equal(
      result.valid,
      true,
      `Duplicate ids: ${result.duplicates.join(', ')}`,
    );
  });

  it('contains round4 presets', async () => {
    const data = await loadPresets();
    const r4 = filterPresetsByRound(data.strategies, 'round4');
    assert.ok(r4.length >= 20, `Expected >=20 round4 presets, got ${r4.length}`);
  });

  it('all round4 presets are breakout category or have breakout builder', async () => {
    const data = await loadPresets();
    const r4 = filterPresetsByRound(data.strategies, 'round4');
    const breakoutBuilders = ['donchian_breakout', 'keltner_breakout', 'bollinger_breakout_exit'];
    for (const p of r4) {
      const ok = p.category === 'breakout' || breakoutBuilders.includes(p.builder);
      assert.ok(ok, `Round4 preset "${p.id}" is not breakout-related`);
    }
  });

  it('all round4 presets have "round4" tag', async () => {
    const data = await loadPresets();
    const r4 = filterPresetsByRound(data.strategies, 'round4');
    for (const p of r4) {
      assert.ok(
        Array.isArray(p.tags) && p.tags.includes('round4'),
        `Preset "${p.id}" missing "round4" tag`,
      );
    }
  });

  it('round4 includes all planned Donchian 55/20 variants', async () => {
    const data = await loadPresets();
    const r4 = filterPresetsByRound(data.strategies, 'round4');
    const r4Ids = new Set(r4.map((p) => p.id));
    const expectedDonchian55 = [
      'donchian-55-20-baseline',
      'donchian-55-20-spy-filter',
      'donchian-55-20-rsp-filter',
      'donchian-55-20-atr-trail',
      'donchian-55-20-hard-stop-8pct',
      'donchian-55-20-hard-stop-atr2',
      'donchian-55-20-2sigma-exit',
      'donchian-55-20-no-avg-down',
    ];
    for (const id of expectedDonchian55) {
      assert.ok(r4Ids.has(id), `Missing round4 preset: ${id}`);
    }
  });

  it('round4 includes all planned Donchian 20/10 variants', async () => {
    const data = await loadPresets();
    const r4 = filterPresetsByRound(data.strategies, 'round4');
    const r4Ids = new Set(r4.map((p) => p.id));
    const expected = [
      'donchian-20-10-baseline',
      'donchian-20-10-hard-stop-8pct',
      'donchian-20-10-atr-trail',
      'donchian-20-10-2sigma-exit',
    ];
    for (const id of expected) {
      assert.ok(r4Ids.has(id), `Missing round4 preset: ${id}`);
    }
  });

  it('round4 includes all planned Keltner variants', async () => {
    const data = await loadPresets();
    const r4 = filterPresetsByRound(data.strategies, 'round4');
    const r4Ids = new Set(r4.map((p) => p.id));
    const expected = [
      'keltner-breakout-baseline-r4',
      'keltner-atr-trail-r4',
      'keltner-breakout-hard-stop-atr2',
      'keltner-breakout-2sigma-exit',
    ];
    for (const id of expected) {
      assert.ok(r4Ids.has(id), `Missing round4 preset: ${id}`);
    }
  });

  it('round4 includes all planned guard combos', async () => {
    const data = await loadPresets();
    const r4 = filterPresetsByRound(data.strategies, 'round4');
    const r4Ids = new Set(r4.map((p) => p.id));
    const expected = [
      'donchian-55-20-spy-filter-hard-stop',
      'donchian-55-20-rsp-filter-atr-trail',
      'keltner-breakout-spy-filter',
      'breakout-bollinger-2sigma-exit',
    ];
    for (const id of expected) {
      assert.ok(r4Ids.has(id), `Missing round4 preset: ${id}`);
    }
  });

  it('round1-3 presets are unchanged', async () => {
    const data = await loadPresets();
    const nonR4 = data.strategies.filter(
      (p) => p.implementation_stage !== 'round4',
    );
    assert.equal(nonR4.length, 30, 'Expected 30 round1-3 presets to remain');
  });
});

// ---------------------------------------------------------------------------
// No averaging down — confirm engine behavior
// ---------------------------------------------------------------------------
describe('no averaging down — engine confirmation', () => {
  it('Pine source does not enable pyramiding', () => {
    const src = buildNvdaMaSource();
    assert.ok(!src.includes('pyramiding'), 'Source should not set pyramiding (defaults to 0)');
  });

  it('Pine source only enters when long is triggered', () => {
    const src = buildNvdaMaSource();
    const entryMatch = src.match(/strategy\.entry/g);
    assert.equal(entryMatch.length, 1, 'Should have exactly one entry call');
  });
});
