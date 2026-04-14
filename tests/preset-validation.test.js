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

async function loadRetiredPresets() {
  const raw = await readFile(
    join(__dirname, '..', 'docs', 'bad-strategy', 'retired-strategy-presets.json'),
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

  it('rejects an RSI mean-reversion preset missing required parameters', () => {
    const result = validatePreset({
      id: 'rsi-missing-entry',
      name: 'RSI Missing Entry',
      category: 'mean_reversion',
      builder: 'rsi_mean_reversion',
      parameters: {
        rsi_period: 2,
        exit_above: 65,
      },
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /parameters\.entry_below/.test(e)));
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
// validatePreset — rsi_regime_filter
// ---------------------------------------------------------------------------
describe('validatePreset — rsi_regime_filter', () => {
  it('accepts a valid RSI regime filter', () => {
    const result = validatePreset({
      id: 'rsi-regime-valid',
      name: 'RSI Regime Valid',
      category: 'breakout',
      builder: 'donchian_breakout',
      parameters: { entry_period: 20, exit_period: 10 },
      rsi_regime_filter: {
        rsi_period: 14,
        threshold: 55,
        direction: 'above',
      },
    });
    assert.equal(result.valid, true);
  });

  it('rejects RSI regime filter without threshold', () => {
    const result = validatePreset({
      id: 'rsi-regime-no-threshold',
      name: 'RSI Regime No Threshold',
      category: 'breakout',
      builder: 'donchian_breakout',
      parameters: { entry_period: 20, exit_period: 10 },
      rsi_regime_filter: {
        rsi_period: 14,
        direction: 'above',
      },
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /rsi_regime_filter\.threshold/.test(e)));
  });

  it('rejects RSI regime filter with unsupported direction', () => {
    const result = validatePreset({
      id: 'rsi-regime-bad-direction',
      name: 'RSI Regime Bad Direction',
      category: 'breakout',
      builder: 'donchian_breakout',
      parameters: { entry_period: 20, exit_period: 10 },
      rsi_regime_filter: {
        rsi_period: 14,
        threshold: 55,
        direction: 'below',
      },
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /rsi_regime_filter\.direction/.test(e)));
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
// Integration: live/retired preset policy
// ---------------------------------------------------------------------------
describe('strategy-presets.json integration', () => {
  const expectedLiveIds = [
    'donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight',
    'donchian-55-20-rsp-filter-rsi14-regime-48-hard-stop-8pct-theme-deep-pullback-tight-early',
    'donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback',
    'donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-10pct-theme-deep-pullback-earlier',
    'donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict',
    'donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early',
    'donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late',
    'donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight',
    'donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide',
    'donchian-55-20-rsp-filter-rsi14-regime-57-hard-stop-6pct-theme-deep-pullback-tight-narrow',
    'donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early',
    'donchian-60-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-late',
    'donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-6pct-theme-deep-pullback-strict-narrow',
    'donchian-55-18-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-exit-tight',
    'donchian-55-22-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-exit-wide',
  ];

  it('all live presets pass validation', async () => {
    const data = await loadPresets();
    for (const preset of data.strategies) {
      const result = validatePreset(preset);
      assert.equal(
        result.valid,
        true,
        'Preset "' + preset.id + '" failed: ' + result.errors.join('; '),
      );
    }
  });

  it('all live preset ids are unique', async () => {
    const data = await loadPresets();
    const result = validatePresetIds(data.strategies);
    assert.equal(
      result.valid,
      true,
      'Duplicate ids: ' + result.duplicates.join(', '),
    );
  });

  it('keeps exactly the strongest 15 live presets in deterministic order', async () => {
    const data = await loadPresets();
    assert.equal(data.strategies.length, 15);
    assert.deepEqual(data.strategies.map((preset) => preset.id), expectedLiveIds);
  });

  it('keeps only deep-pullback donchian breakout variants in the live preset file', async () => {
    const data = await loadPresets();
    for (const preset of data.strategies) {
      assert.equal(preset.category, 'breakout');
      assert.equal(preset.builder, 'donchian_breakout');
      assert.ok(Array.isArray(preset.tags));
      assert.ok(preset.tags.includes('theme-deep-pullback'), 'Preset "' + preset.id + '" must keep theme-deep-pullback tag');
      assert.ok(preset.tags.includes('rsi-regime'), 'Preset "' + preset.id + '" must keep rsi-regime tag');
      assert.match(preset.id, /theme-deep-pullback/);
    }
  });

  it('retires every non-live preset to docs/bad-strategy', async () => {
    const live = await loadPresets();
    const retired = await loadRetiredPresets();
    assert.equal(retired.strategies.length, 116);

    const liveIds = new Set(live.strategies.map((preset) => preset.id));
    const retiredIds = retired.strategies.map((preset) => preset.id);
    assert.equal(new Set(retiredIds).size, retiredIds.length);
    for (const id of retiredIds) {
      assert.equal(liveIds.has(id), false, 'Retired preset "' + id + '" must not remain live');
    }
  });

  it('live and retired IDs have zero overlap', async () => {
    const live = await loadPresets();
    const retired = await loadRetiredPresets();
    const liveIds = new Set(live.strategies.map((s) => s.id));
    for (const s of retired.strategies) {
      assert.equal(liveIds.has(s.id), false, 'overlap: "' + s.id + '" in both live and retired');
    }
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
