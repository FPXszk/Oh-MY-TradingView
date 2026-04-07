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
    const round1To3 = data.strategies.filter(
      (p) => !['round4', 'round5', 'round6', 'round7', 'round8', 'round9', 'round10'].includes(p.implementation_stage),
    );
    assert.equal(round1To3.length, 30, 'Expected 30 round1-3 presets to remain');
  });

  it('contains round5 presets', async () => {
    const data = await loadPresets();
    const r5 = filterPresetsByRound(data.strategies, 'round5');
    assert.equal(r5.length, 20, `Expected 20 round5 presets, got ${r5.length}`);
  });

  it('all round5 presets have "round5" tag', async () => {
    const data = await loadPresets();
    const r5 = filterPresetsByRound(data.strategies, 'round5');
    for (const p of r5) {
      assert.ok(
        Array.isArray(p.tags) && p.tags.includes('round5'),
        `Preset "${p.id}" missing "round5" tag`,
      );
    }
  });

  it('round5 includes all planned RSI long-only variants', async () => {
    const data = await loadPresets();
    const r5 = filterPresetsByRound(data.strategies, 'round5');
    const r5Ids = new Set(r5.map((p) => p.id));
    const expected = [
      'rsi2-buy-10-sell-65-long-only',
      'rsi2-buy-10-sell-70-spy-filter-long-only',
      'rsi3-buy-15-sell-65-long-only',
      'rsi5-buy-25-sell-55-long-only',
    ];
    for (const id of expected) {
      assert.ok(r5Ids.has(id), `Missing round5 preset: ${id}`);
    }
  });

  it('round5 RSI long-only variants reuse the RSI mean-reversion builder', async () => {
    const data = await loadPresets();
    const r5 = filterPresetsByRound(data.strategies, 'round5');
    const rsiLongOnly = r5.filter((p) => p.id.includes('long-only'));
    assert.equal(rsiLongOnly.length, 4);
    for (const preset of rsiLongOnly) {
      assert.equal(
        preset.builder,
        'rsi_mean_reversion',
        `Preset "${preset.id}" should reuse rsi_mean_reversion`,
      );
    }
  });

  it('contains round6 presets', async () => {
    const data = await loadPresets();
    const r6 = filterPresetsByRound(data.strategies, 'round6');
    assert.equal(r6.length, 10, `Expected 10 round6 presets, got ${r6.length}`);
  });

  it('all round6 presets have "round6" tag', async () => {
    const data = await loadPresets();
    const r6 = filterPresetsByRound(data.strategies, 'round6');
    for (const p of r6) {
      assert.ok(
        Array.isArray(p.tags) && p.tags.includes('round6'),
        `Preset "${p.id}" missing "round6" tag`,
      );
    }
  });

  it('round6 includes all planned theme-trend variants', async () => {
    const data = await loadPresets();
    const r6 = filterPresetsByRound(data.strategies, 'round6');
    const r6Ids = new Set(r6.map((p) => p.id));
    const expected = [
      'donchian-55-20-spy-filter-rsi14-regime-55',
      'donchian-55-20-rsp-filter-rsi14-regime-50',
      'donchian-55-20-spy-filter-rsi14-regime-50-hard-stop-8pct',
      'donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct',
      'donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-10pct',
      'donchian-20-10-rsp-filter-rsi14-regime-50-hard-stop-10pct',
      'donchian-20-10-spy-filter-rsi14-regime-55-hard-stop-6pct',
      'donchian-20-10-rsp-filter-rsi14-regime-55-hard-stop-6pct',
      'rsi2-buy-10-sell-65-rsp-filter-long-only',
      'rsi3-buy-15-sell-65-spy-filter-long-only',
    ];
    for (const id of expected) {
      assert.ok(r6Ids.has(id), `Missing round6 preset: ${id}`);
    }
  });

  it('round6 stays within existing builder families', async () => {
    const data = await loadPresets();
    const r6 = filterPresetsByRound(data.strategies, 'round6');
    for (const preset of r6) {
      const allowedBuilders = ['donchian_breakout', 'rsi_mean_reversion'];
      assert.ok(
        allowedBuilders.includes(preset.builder),
        `Preset "${preset.id}" uses unexpected builder "${preset.builder}"`,
      );
    }
  });

  it('contains round7 presets', async () => {
    const data = await loadPresets();
    const r7 = filterPresetsByRound(data.strategies, 'round7');
    assert.equal(r7.length, 10, `Expected 10 round7 presets, got ${r7.length}`);
  });

  it('all round7 presets have "round7" tag', async () => {
    const data = await loadPresets();
    const r7 = filterPresetsByRound(data.strategies, 'round7');
    for (const p of r7) {
      assert.ok(
        Array.isArray(p.tags) && p.tags.includes('round7'),
        `Preset "${p.id}" missing "round7" tag`,
      );
    }
  });

  it('round7 includes all planned theme-trend variants', async () => {
    const data = await loadPresets();
    const r7 = filterPresetsByRound(data.strategies, 'round7');
    const r7Ids = new Set(r7.map((p) => p.id));
    const expected = [
      'donchian-55-20-rsp-filter-rsi14-regime-45-theme-breadth-early',
      'donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-6pct-theme-breadth-quality',
      'donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict',
      'donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-6pct-theme-quality-strict',
      'donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback',
      'donchian-20-10-spy-filter-rsi14-regime-45-hard-stop-10pct-theme-acceleration-reentry',
      'donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-8pct-theme-acceleration-balanced',
      'donchian-20-10-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-acceleration',
      'rsi2-buy-10-sell-70-rsp-filter-long-only-theme-shallow-dip',
      'rsi3-buy-20-sell-70-spy-filter-long-only-theme-deep-dip',
    ];
    for (const id of expected) {
      assert.ok(r7Ids.has(id), `Missing round7 preset: ${id}`);
    }
  });

  it('round7 stays within existing builder families', async () => {
    const data = await loadPresets();
    const r7 = filterPresetsByRound(data.strategies, 'round7');
    for (const preset of r7) {
      const allowedBuilders = ['donchian_breakout', 'rsi_mean_reversion'];
      assert.ok(
        allowedBuilders.includes(preset.builder),
        `Preset "${preset.id}" uses unexpected builder "${preset.builder}"`,
      );
    }
  });

  it('round7 presets keep theme metadata and taxonomy aligned', async () => {
    const data = await loadPresets();
    const r7 = filterPresetsByRound(data.strategies, 'round7');
    const expectedThemeAxes = new Map([
      ['donchian-55-20-rsp-filter-rsi14-regime-45-theme-breadth-early', 'breadth-persistence-early'],
      ['donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-6pct-theme-breadth-quality', 'breadth-quality'],
      ['donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict', 'quality-strict'],
      ['donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-6pct-theme-quality-strict', 'quality-strict-stop'],
      ['donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback', 'deep-pullback'],
      ['donchian-20-10-spy-filter-rsi14-regime-45-hard-stop-10pct-theme-acceleration-reentry', 'acceleration-reentry'],
      ['donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-8pct-theme-acceleration-balanced', 'acceleration-balanced'],
      ['donchian-20-10-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-acceleration', 'breadth-acceleration'],
      ['rsi2-buy-10-sell-70-rsp-filter-long-only-theme-shallow-dip', 'shallow-dip-reclaim'],
      ['rsi3-buy-20-sell-70-spy-filter-long-only-theme-deep-dip', 'deep-dip-reclaim'],
    ]);
    const expectedAxisTags = new Map([
      ['donchian-55-20-rsp-filter-rsi14-regime-45-theme-breadth-early', 'theme-persistence'],
      ['donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-6pct-theme-breadth-quality', 'theme-quality'],
      ['donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict', 'theme-quality'],
      ['donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-6pct-theme-quality-strict', 'theme-quality'],
      ['donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback', 'theme-deep-pullback'],
      ['donchian-20-10-spy-filter-rsi14-regime-45-hard-stop-10pct-theme-acceleration-reentry', 'theme-reentry'],
      ['donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-8pct-theme-acceleration-balanced', 'theme-balanced'],
      ['donchian-20-10-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-acceleration', 'theme-acceleration'],
      ['rsi2-buy-10-sell-70-rsp-filter-long-only-theme-shallow-dip', 'theme-shallow-dip'],
      ['rsi3-buy-20-sell-70-spy-filter-long-only-theme-deep-dip', 'theme-deep-dip'],
    ]);

    assert.equal(r7.length, expectedThemeAxes.size, 'Round7 preset expectations are out of sync');

    for (const preset of r7) {
      assert.equal(
        preset.theme_axis,
        expectedThemeAxes.get(preset.id),
        `Preset "${preset.id}" has unexpected theme_axis`,
      );
      assert.equal(typeof preset.theme_notes, 'string', `Preset "${preset.id}" should include theme_notes`);
      assert.ok(preset.theme_notes.length > 0, `Preset "${preset.id}" should have non-empty theme_notes`);
      assert.ok(
        preset.tags.includes(expectedAxisTags.get(preset.id)),
        `Preset "${preset.id}" should include taxonomy tag "${expectedAxisTags.get(preset.id)}"`,
      );
    }
  });

  it('contains round8 presets', async () => {
    const data = await loadPresets();
    const r8 = filterPresetsByRound(data.strategies, 'round8');
    assert.equal(r8.length, 12, `Expected 12 round8 presets, got ${r8.length}`);
  });

  it('all round8 presets have "round8" tag', async () => {
    const data = await loadPresets();
    const r8 = filterPresetsByRound(data.strategies, 'round8');
    for (const p of r8) {
      assert.ok(
        Array.isArray(p.tags) && p.tags.includes('round8'),
        `Preset "${p.id}" missing "round8" tag`,
      );
    }
  });

  it('round8 includes all planned neighborhood variants', async () => {
    const data = await loadPresets();
    const r8 = filterPresetsByRound(data.strategies, 'round8');
    const r8Ids = new Set(r8.map((p) => p.id));
    const expected = [
      'donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier',
      'donchian-55-20-rsp-filter-rsi14-regime-50-theme-breadth-balanced',
      'donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-early-guarded',
      'donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-quality-early',
      'donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-6pct-theme-breadth-quality-strict',
      'donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-10pct-theme-deep-pullback-earlier',
      'donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight',
      'donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced',
      'donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-6pct-theme-quality-strict-guarded',
      'donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-8pct-theme-quality-strict-stop-wide',
      'donchian-20-10-spy-filter-rsi14-regime-55-hard-stop-8pct-theme-acceleration-balanced-strict',
      'donchian-20-10-spy-filter-rsi14-regime-45-hard-stop-8pct-theme-acceleration-reentry-tight',
    ];
    for (const id of expected) {
      assert.ok(r8Ids.has(id), `Missing round8 preset: ${id}`);
    }
  });

  it('round8 stays within existing builder families', async () => {
    const data = await loadPresets();
    const r8 = filterPresetsByRound(data.strategies, 'round8');
    for (const preset of r8) {
      const allowedBuilders = ['donchian_breakout'];
      assert.ok(
        allowedBuilders.includes(preset.builder),
        `Preset "${preset.id}" uses unexpected builder "${preset.builder}"`,
      );
    }
  });

  it('round8 presets keep theme metadata and taxonomy aligned', async () => {
    const data = await loadPresets();
    const r8 = filterPresetsByRound(data.strategies, 'round8');
    const expectedThemeAxes = new Map([
      ['donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier', 'breadth-persistence-earlier'],
      ['donchian-55-20-rsp-filter-rsi14-regime-50-theme-breadth-balanced', 'breadth-persistence-balanced'],
      ['donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-early-guarded', 'breadth-persistence-early-guarded'],
      ['donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-quality-early', 'breadth-quality-early'],
      ['donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-6pct-theme-breadth-quality-strict', 'breadth-quality-strict'],
      ['donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-10pct-theme-deep-pullback-earlier', 'deep-pullback-earlier'],
      ['donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight', 'deep-pullback-tight'],
      ['donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced', 'quality-strict-balanced'],
      ['donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-6pct-theme-quality-strict-guarded', 'quality-strict-guarded'],
      ['donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-8pct-theme-quality-strict-stop-wide', 'quality-strict-stop-wide'],
      ['donchian-20-10-spy-filter-rsi14-regime-55-hard-stop-8pct-theme-acceleration-balanced-strict', 'acceleration-balanced-strict'],
      ['donchian-20-10-spy-filter-rsi14-regime-45-hard-stop-8pct-theme-acceleration-reentry-tight', 'acceleration-reentry-tight'],
    ]);
    const expectedAxisTags = new Map([
      ['donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier', 'theme-persistence'],
      ['donchian-55-20-rsp-filter-rsi14-regime-50-theme-breadth-balanced', 'theme-persistence'],
      ['donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-early-guarded', 'theme-persistence'],
      ['donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-quality-early', 'theme-quality'],
      ['donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-6pct-theme-breadth-quality-strict', 'theme-quality'],
      ['donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-10pct-theme-deep-pullback-earlier', 'theme-deep-pullback'],
      ['donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight', 'theme-deep-pullback'],
      ['donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced', 'theme-quality'],
      ['donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-6pct-theme-quality-strict-guarded', 'theme-quality'],
      ['donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-8pct-theme-quality-strict-stop-wide', 'theme-quality'],
      ['donchian-20-10-spy-filter-rsi14-regime-55-hard-stop-8pct-theme-acceleration-balanced-strict', 'theme-balanced'],
      ['donchian-20-10-spy-filter-rsi14-regime-45-hard-stop-8pct-theme-acceleration-reentry-tight', 'theme-reentry'],
    ]);

    assert.equal(r8.length, expectedThemeAxes.size, 'Round8 preset expectations are out of sync');

    for (const preset of r8) {
      assert.equal(
        preset.theme_axis,
        expectedThemeAxes.get(preset.id),
        `Preset "${preset.id}" has unexpected theme_axis`,
      );
      assert.equal(typeof preset.theme_notes, 'string', `Preset "${preset.id}" should include theme_notes`);
      assert.ok(preset.theme_notes.length > 0, `Preset "${preset.id}" should have non-empty theme_notes`);
      assert.ok(
        preset.tags.includes(expectedAxisTags.get(preset.id)),
        `Preset "${preset.id}" should include taxonomy tag "${expectedAxisTags.get(preset.id)}"`,
      );
    }
  });

  it('round8 executable duplicates are explicit and limited', async () => {
    const data = await loadPresets();
    const r8 = filterPresetsByRound(data.strategies, 'round8');
    const sortKeysDeep = (value) => {
      if (Array.isArray(value)) {
        return value.map(sortKeysDeep);
      }
      if (value && typeof value === 'object') {
        return Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, sortKeysDeep(value[key])]),
        );
      }
      return value;
    };
    const canonicalize = (preset) => JSON.stringify(sortKeysDeep({
      builder: preset.builder,
      parameters: preset.parameters,
      regime_filter: preset.regime_filter ?? null,
      rsi_regime_filter: preset.rsi_regime_filter ?? null,
      stop_loss: preset.stop_loss ?? null,
      exit_overlay: preset.exit_overlay ?? null,
    }));

    const grouped = new Map();
    for (const preset of r8) {
      const key = canonicalize(preset);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(preset.id);
    }

    const duplicateGroups = [...grouped.values()]
      .filter((ids) => ids.length > 1)
      .map((ids) => ids.sort());

    assert.deepEqual(duplicateGroups, [[
      'donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-early-guarded',
      'donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-quality-early',
    ]]);
  });

  it('contains round9 presets', async () => {
    const data = await loadPresets();
    const r9 = filterPresetsByRound(data.strategies, 'round9');
    assert.equal(r9.length, 7, `Expected 7 round9 presets, got ${r9.length}`);
  });

  it('all round9 presets have "round9" tag', async () => {
    const data = await loadPresets();
    const r9 = filterPresetsByRound(data.strategies, 'round9');
    for (const p of r9) {
      assert.ok(
        Array.isArray(p.tags) && p.tags.includes('round9'),
        `Preset "${p.id}" missing "round9" tag`,
      );
    }
  });

  it('round9 includes all planned strong7 deepening variants', async () => {
    const data = await loadPresets();
    const r9 = filterPresetsByRound(data.strategies, 'round9');
    const r9Ids = new Set(r9.map((p) => p.id));
    const expected = [
      'donchian-55-20-rsp-filter-rsi14-regime-40-hard-stop-6pct-theme-breadth-earlier-guarded',
      'donchian-55-20-spy-filter-rsi14-regime-50-hard-stop-6pct-theme-quality-strict-balanced-guarded',
      'donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict',
      'donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-8pct-theme-quality-strict-guarded-wide',
      'donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide',
      'donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-8pct-theme-breadth-early-guarded-wide',
      'donchian-55-20-spy-filter-rsi14-regime-45-theme-quality-strict-relaxed',
    ];
    for (const id of expected) {
      assert.ok(r9Ids.has(id), `Missing round9 preset: ${id}`);
    }
  });

  it('round9 stays within existing builder families', async () => {
    const data = await loadPresets();
    const r9 = filterPresetsByRound(data.strategies, 'round9');
    for (const preset of r9) {
      const allowedBuilders = ['donchian_breakout'];
      assert.ok(
        allowedBuilders.includes(preset.builder),
        `Preset "${preset.id}" uses unexpected builder "${preset.builder}"`,
      );
    }
  });

  it('round9 presets keep theme metadata and taxonomy aligned', async () => {
    const data = await loadPresets();
    const r9 = filterPresetsByRound(data.strategies, 'round9');
    const expectedThemeAxes = new Map([
      ['donchian-55-20-rsp-filter-rsi14-regime-40-hard-stop-6pct-theme-breadth-earlier-guarded', 'breadth-persistence-earlier-guarded'],
      ['donchian-55-20-spy-filter-rsi14-regime-50-hard-stop-6pct-theme-quality-strict-balanced-guarded', 'quality-strict-balanced-guarded'],
      ['donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict', 'deep-pullback-strict'],
      ['donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-8pct-theme-quality-strict-guarded-wide', 'quality-strict-guarded-wide'],
      ['donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide', 'breadth-quality-balanced-wide'],
      ['donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-8pct-theme-breadth-early-guarded-wide', 'breadth-persistence-early-guarded-wide'],
      ['donchian-55-20-spy-filter-rsi14-regime-45-theme-quality-strict-relaxed', 'quality-strict-relaxed'],
    ]);
    const expectedAxisTags = new Map([
      ['donchian-55-20-rsp-filter-rsi14-regime-40-hard-stop-6pct-theme-breadth-earlier-guarded', 'theme-persistence'],
      ['donchian-55-20-spy-filter-rsi14-regime-50-hard-stop-6pct-theme-quality-strict-balanced-guarded', 'theme-quality'],
      ['donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict', 'theme-deep-pullback'],
      ['donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-8pct-theme-quality-strict-guarded-wide', 'theme-quality'],
      ['donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide', 'theme-quality'],
      ['donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-8pct-theme-breadth-early-guarded-wide', 'theme-persistence'],
      ['donchian-55-20-spy-filter-rsi14-regime-45-theme-quality-strict-relaxed', 'theme-quality'],
    ]);

    assert.equal(r9.length, expectedThemeAxes.size, 'Round9 preset expectations are out of sync');

    for (const preset of r9) {
      assert.equal(
        preset.theme_axis,
        expectedThemeAxes.get(preset.id),
        `Preset "${preset.id}" has unexpected theme_axis`,
      );
      assert.equal(typeof preset.theme_notes, 'string', `Preset "${preset.id}" should include theme_notes`);
      assert.ok(preset.theme_notes.length > 0, `Preset "${preset.id}" should have non-empty theme_notes`);
      assert.ok(
        preset.tags.includes(expectedAxisTags.get(preset.id)),
        `Preset "${preset.id}" should include taxonomy tag "${expectedAxisTags.get(preset.id)}"`,
      );
    }
  });

  it('round9 executable duplicates are absent', async () => {
    const data = await loadPresets();
    const r9 = filterPresetsByRound(data.strategies, 'round9');
    const sortKeysDeep = (value) => {
      if (Array.isArray(value)) {
        return value.map(sortKeysDeep);
      }
      if (value && typeof value === 'object') {
        return Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, sortKeysDeep(value[key])]),
        );
      }
      return value;
    };
    const canonicalize = (preset) => JSON.stringify(sortKeysDeep({
      builder: preset.builder,
      parameters: preset.parameters,
      regime_filter: preset.regime_filter ?? null,
      rsi_regime_filter: preset.rsi_regime_filter ?? null,
      stop_loss: preset.stop_loss ?? null,
      exit_overlay: preset.exit_overlay ?? null,
    }));

    const grouped = new Map();
    for (const preset of r9) {
      const key = canonicalize(preset);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(preset.id);
    }

    const duplicateGroups = [...grouped.values()]
      .filter((ids) => ids.length > 1)
      .map((ids) => ids.sort());

    assert.deepEqual(duplicateGroups, []);
  });

  it('round9 presets have no cross-round executable duplicates', async () => {
    const data = await loadPresets();
    const r9 = filterPresetsByRound(data.strategies, 'round9');
    const r9Ids = new Set(r9.map((p) => p.id));
    const sortKeysDeep = (value) => {
      if (Array.isArray(value)) {
        return value.map(sortKeysDeep);
      }
      if (value && typeof value === 'object') {
        return Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, sortKeysDeep(value[key])]),
        );
      }
      return value;
    };
    const canonicalize = (preset) => JSON.stringify(sortKeysDeep({
      builder: preset.builder,
      parameters: preset.parameters,
      regime_filter: preset.regime_filter ?? null,
      rsi_regime_filter: preset.rsi_regime_filter ?? null,
      stop_loss: preset.stop_loss ?? null,
      exit_overlay: preset.exit_overlay ?? null,
    }));

    const allCanonMap = new Map();
    for (const preset of data.strategies) {
      const key = canonicalize(preset);
      if (!allCanonMap.has(key)) allCanonMap.set(key, []);
      allCanonMap.get(key).push(preset.id);
    }

    const crossDups = [...allCanonMap.values()]
      .filter((ids) => ids.length > 1 && ids.some((id) => r9Ids.has(id)))
      .map((ids) => ids.sort());

    assert.deepEqual(crossDups, [], `Round9 cross-round executable duplicates found: ${JSON.stringify(crossDups)}`);
  });

  it('contains round10 presets', async () => {
    const data = await loadPresets();
    const r10 = filterPresetsByRound(data.strategies, 'round10');
    assert.equal(r10.length, 6, `Expected 6 round10 presets, got ${r10.length}`);
  });

  it('all round10 presets have "round10" tag', async () => {
    const data = await loadPresets();
    const r10 = filterPresetsByRound(data.strategies, 'round10');
    for (const p of r10) {
      assert.ok(
        Array.isArray(p.tags) && p.tags.includes('round10'),
        `Preset "${p.id}" missing "round10" tag`,
      );
    }
  });

  it('round10 includes all planned top4 continuation variants', async () => {
    const data = await loadPresets();
    const r10 = filterPresetsByRound(data.strategies, 'round10');
    const r10Ids = new Set(r10.map((p) => p.id));
    const expected = [
      'donchian-55-20-spy-filter-rsi14-regime-45-hard-stop-8pct-theme-quality-strict-relaxed-guarded',
      'donchian-55-20-spy-filter-rsi14-regime-45-hard-stop-6pct-theme-quality-strict-relaxed-tight',
      'donchian-55-20-rsp-filter-rsi14-regime-57-hard-stop-6pct-theme-deep-pullback-tight-narrow',
      'donchian-55-20-rsp-filter-rsi14-regime-48-hard-stop-8pct-theme-deep-pullback-tight-early',
      'donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-6pct-theme-deep-pullback-strict-narrow',
      'donchian-55-20-rsp-filter-rsi14-regime-52-hard-stop-8pct-theme-breadth-quality-balanced-mid',
    ];
    for (const id of expected) {
      assert.ok(r10Ids.has(id), `Missing round10 preset: ${id}`);
    }
  });

  it('round10 stays within existing builder families', async () => {
    const data = await loadPresets();
    const r10 = filterPresetsByRound(data.strategies, 'round10');
    for (const preset of r10) {
      const allowedBuilders = ['donchian_breakout'];
      assert.ok(
        allowedBuilders.includes(preset.builder),
        `Preset "${preset.id}" uses unexpected builder "${preset.builder}"`,
      );
    }
  });

  it('round10 presets keep theme metadata and taxonomy aligned', async () => {
    const data = await loadPresets();
    const r10 = filterPresetsByRound(data.strategies, 'round10');
    const expectedThemeAxes = new Map([
      ['donchian-55-20-spy-filter-rsi14-regime-45-hard-stop-8pct-theme-quality-strict-relaxed-guarded', 'quality-strict-relaxed-guarded'],
      ['donchian-55-20-spy-filter-rsi14-regime-45-hard-stop-6pct-theme-quality-strict-relaxed-tight', 'quality-strict-relaxed-tight'],
      ['donchian-55-20-rsp-filter-rsi14-regime-57-hard-stop-6pct-theme-deep-pullback-tight-narrow', 'deep-pullback-tight-narrow'],
      ['donchian-55-20-rsp-filter-rsi14-regime-48-hard-stop-8pct-theme-deep-pullback-tight-early', 'deep-pullback-tight-early'],
      ['donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-6pct-theme-deep-pullback-strict-narrow', 'deep-pullback-strict-narrow'],
      ['donchian-55-20-rsp-filter-rsi14-regime-52-hard-stop-8pct-theme-breadth-quality-balanced-mid', 'breadth-quality-balanced-mid'],
    ]);
    const expectedAxisTags = new Map([
      ['donchian-55-20-spy-filter-rsi14-regime-45-hard-stop-8pct-theme-quality-strict-relaxed-guarded', 'theme-quality'],
      ['donchian-55-20-spy-filter-rsi14-regime-45-hard-stop-6pct-theme-quality-strict-relaxed-tight', 'theme-quality'],
      ['donchian-55-20-rsp-filter-rsi14-regime-57-hard-stop-6pct-theme-deep-pullback-tight-narrow', 'theme-deep-pullback'],
      ['donchian-55-20-rsp-filter-rsi14-regime-48-hard-stop-8pct-theme-deep-pullback-tight-early', 'theme-deep-pullback'],
      ['donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-6pct-theme-deep-pullback-strict-narrow', 'theme-deep-pullback'],
      ['donchian-55-20-rsp-filter-rsi14-regime-52-hard-stop-8pct-theme-breadth-quality-balanced-mid', 'theme-quality'],
    ]);

    assert.equal(r10.length, expectedThemeAxes.size, 'Round10 preset expectations are out of sync');

    for (const preset of r10) {
      assert.equal(
        preset.theme_axis,
        expectedThemeAxes.get(preset.id),
        `Preset "${preset.id}" has unexpected theme_axis`,
      );
      assert.equal(typeof preset.theme_notes, 'string', `Preset "${preset.id}" should include theme_notes`);
      assert.ok(preset.theme_notes.length > 0, `Preset "${preset.id}" should have non-empty theme_notes`);
      assert.ok(
        preset.tags.includes(expectedAxisTags.get(preset.id)),
        `Preset "${preset.id}" should include taxonomy tag "${expectedAxisTags.get(preset.id)}"`,
      );
    }
  });

  it('round10 executable duplicates are absent', async () => {
    const data = await loadPresets();
    const r10 = filterPresetsByRound(data.strategies, 'round10');
    const sortKeysDeep = (value) => {
      if (Array.isArray(value)) {
        return value.map(sortKeysDeep);
      }
      if (value && typeof value === 'object') {
        return Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, sortKeysDeep(value[key])]),
        );
      }
      return value;
    };
    const canonicalize = (preset) => JSON.stringify(sortKeysDeep({
      builder: preset.builder,
      parameters: preset.parameters,
      regime_filter: preset.regime_filter ?? null,
      rsi_regime_filter: preset.rsi_regime_filter ?? null,
      stop_loss: preset.stop_loss ?? null,
      exit_overlay: preset.exit_overlay ?? null,
    }));

    const grouped = new Map();
    for (const preset of r10) {
      const key = canonicalize(preset);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(preset.id);
    }

    const duplicateGroups = [...grouped.values()]
      .filter((ids) => ids.length > 1)
      .map((ids) => ids.sort());

    assert.deepEqual(duplicateGroups, []);
  });

  it('round10 presets have no cross-round executable duplicates', async () => {
    const data = await loadPresets();
    const r10 = filterPresetsByRound(data.strategies, 'round10');
    const r10Ids = new Set(r10.map((p) => p.id));
    const sortKeysDeep = (value) => {
      if (Array.isArray(value)) {
        return value.map(sortKeysDeep);
      }
      if (value && typeof value === 'object') {
        return Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, sortKeysDeep(value[key])]),
        );
      }
      return value;
    };
    const canonicalize = (preset) => JSON.stringify(sortKeysDeep({
      builder: preset.builder,
      parameters: preset.parameters,
      regime_filter: preset.regime_filter ?? null,
      rsi_regime_filter: preset.rsi_regime_filter ?? null,
      stop_loss: preset.stop_loss ?? null,
      exit_overlay: preset.exit_overlay ?? null,
    }));

    const allCanonMap = new Map();
    for (const preset of data.strategies) {
      const key = canonicalize(preset);
      if (!allCanonMap.has(key)) allCanonMap.set(key, []);
      allCanonMap.get(key).push(preset.id);
    }

    const crossDups = [...allCanonMap.values()]
      .filter((ids) => ids.length > 1 && ids.some((id) => r10Ids.has(id)))
      .map((ids) => ids.sort());

    assert.deepEqual(crossDups, [], `Round10 cross-round executable duplicates found: ${JSON.stringify(crossDups)}`);
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
