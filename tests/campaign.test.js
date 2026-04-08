import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  validateDateRange,
  mergeDateOverride,
  filterStrategies,
  buildRunMatrix,
  validateCampaignConfig,
  loadCampaign,
  buildCampaignFingerprint,
  buildLegacyCampaignFingerprint,
  buildCheckpoint,
  checkpointMatchesCampaign,
  summarizeResults,
  filterRunsToMatrix,
  findPendingRuns,
  selectPhaseSymbols,
  partitionRuns,
  needsRerun,
} from '../src/core/campaign.js';

import { loadPreset } from '../src/core/backtest.js';
import { buildResearchStrategySource } from '../src/core/research-backtest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// validateDateRange
// ---------------------------------------------------------------------------
describe('validateDateRange', () => {
  it('accepts valid ISO date range', () => {
    const r = validateDateRange({ from: '2000-01-01', to: '2025-12-31' });
    assert.equal(r.valid, true);
    assert.deepEqual(r.errors, []);
  });

  it('rejects non-ISO from date', () => {
    const r = validateDateRange({ from: 'Jan 1 2000', to: '2025-12-31' });
    assert.equal(r.valid, false);
    assert.ok(r.errors.some((e) => /from/.test(e)));
  });

  it('rejects non-ISO to date', () => {
    const r = validateDateRange({ from: '2000-01-01', to: '25-12-31' });
    assert.equal(r.valid, false);
    assert.ok(r.errors.some((e) => /to/.test(e)));
  });

  it('rejects from > to', () => {
    const r = validateDateRange({ from: '2030-01-01', to: '2000-01-01' });
    assert.equal(r.valid, false);
    assert.ok(r.errors.some((e) => /must not be after/.test(e)));
  });

  it('rejects impossible calendar dates', () => {
    const r = validateDateRange({ from: '2024-13-40', to: '2024-13-41' });
    assert.equal(r.valid, false);
  });

  it('rejects null input', () => {
    const r = validateDateRange(null);
    assert.equal(r.valid, false);
  });

  it('accepts same from and to date', () => {
    const r = validateDateRange({ from: '2020-06-15', to: '2020-06-15' });
    assert.equal(r.valid, true);
  });
});

// ---------------------------------------------------------------------------
// mergeDateOverride
// ---------------------------------------------------------------------------
describe('mergeDateOverride', () => {
  const defaults = {
    initial_capital: 10000,
    date_range: { from: '2015-01-01', to: '2025-12-31' },
  };

  it('returns original defaults when override is null', () => {
    const result = mergeDateOverride(defaults, null);
    assert.equal(result, defaults);
  });

  it('replaces date_range when override provided', () => {
    const result = mergeDateOverride(defaults, { from: '2000-01-01', to: '2099-12-31' });
    assert.deepEqual(result.date_range, { from: '2000-01-01', to: '2099-12-31' });
    assert.equal(result.initial_capital, 10000);
  });

  it('does not mutate original defaults object', () => {
    mergeDateOverride(defaults, { from: '2000-01-01', to: '2099-12-31' });
    assert.deepEqual(defaults.date_range, { from: '2015-01-01', to: '2025-12-31' });
  });

  it('merges partial override with existing defaults', () => {
    const result = mergeDateOverride(defaults, { from: '2000-01-01' });
    assert.deepEqual(result.date_range, { from: '2000-01-01', to: '2025-12-31' });
  });
});

// ---------------------------------------------------------------------------
// filterStrategies
// ---------------------------------------------------------------------------
describe('filterStrategies', () => {
  const strategies = [
    { id: 'a', status: 'implemented', builder: 'ma_cross', tags: ['baseline', 'ma'] },
    { id: 'b', status: 'planned', builder: 'donchian_breakout', tags: ['breakout'] },
    { id: 'c', status: 'implemented', builder: 'rsi_mean_reversion', tags: ['mean-reversion'] },
    { id: 'd', status: 'implemented', builder: 'ma_cross', tags: [] },
  ];

  it('returns all strategies when filter is null', () => {
    assert.equal(filterStrategies(strategies, null).length, 4);
  });

  it('filters by status', () => {
    const result = filterStrategies(strategies, { status: ['implemented'] });
    assert.equal(result.length, 3);
    assert.ok(result.every((s) => s.status === 'implemented'));
  });

  it('filters by builder', () => {
    const result = filterStrategies(strategies, { builders: ['ma_cross'] });
    assert.equal(result.length, 2);
  });

  it('filters by tags_any', () => {
    const result = filterStrategies(strategies, { tags_any: ['breakout', 'mean-reversion'] });
    assert.equal(result.length, 2);
  });

  it('combines multiple filters', () => {
    const result = filterStrategies(strategies, {
      status: ['implemented'],
      builders: ['ma_cross'],
      tags_any: ['baseline'],
    });
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'a');
  });

  it('returns empty array when nothing matches', () => {
    const result = filterStrategies(strategies, { status: ['deprecated'] });
    assert.equal(result.length, 0);
  });
});

// ---------------------------------------------------------------------------
// buildRunMatrix
// ---------------------------------------------------------------------------
describe('buildRunMatrix', () => {
  it('builds cartesian product of strategies and symbols', () => {
    const strategies = [{ id: 'strat-a' }, { id: 'strat-b' }];
    const symbols = ['AAPL', 'MSFT', 'GOOGL'];
    const matrix = buildRunMatrix({ strategies, symbols });
    assert.equal(matrix.length, 6);
    assert.deepEqual(matrix[0], { presetId: 'strat-a', symbol: 'AAPL' });
    assert.deepEqual(matrix[5], { presetId: 'strat-b', symbol: 'GOOGL' });
  });

  it('returns empty array for empty strategies', () => {
    assert.equal(buildRunMatrix({ strategies: [], symbols: ['AAPL'] }).length, 0);
  });

  it('returns empty array for empty symbols', () => {
    assert.equal(buildRunMatrix({ strategies: [{ id: 'x' }], symbols: [] }).length, 0);
  });
});

// ---------------------------------------------------------------------------
// validateCampaignConfig
// ---------------------------------------------------------------------------
describe('validateCampaignConfig', () => {
  const validConfig = {
    id: 'test-campaign',
    universe: 'long-run-cross-market-100',
    date_override: { from: '2000-01-01', to: '2099-12-31' },
    preset_ids: ['ema-cross-9-21'],
    phases: {
      smoke: { symbol_count: 10 },
      pilot: { symbol_count: 25 },
      full: { symbol_count: 100 },
    },
    execution: {
      checkpoint_every: 10,
      cooldown_ms: 2000,
      max_consecutive_failures: 5,
    },
  };

  it('accepts valid config', () => {
    const r = validateCampaignConfig(validConfig);
    assert.equal(r.valid, true);
    assert.deepEqual(r.errors, []);
  });

  it('rejects null config', () => {
    const r = validateCampaignConfig(null);
    assert.equal(r.valid, false);
  });

  it('rejects missing id', () => {
    const r = validateCampaignConfig({ ...validConfig, id: '' });
    assert.equal(r.valid, false);
    assert.ok(r.errors.some((e) => /id/.test(e)));
  });

  it('rejects missing universe', () => {
    const r = validateCampaignConfig({ ...validConfig, universe: '' });
    assert.equal(r.valid, false);
    assert.ok(r.errors.some((e) => /universe/.test(e)));
  });

  it('rejects invalid date_override', () => {
    const r = validateCampaignConfig({ ...validConfig, date_override: { from: 'bad', to: 'bad' } });
    assert.equal(r.valid, false);
  });

  it('accepts config without optional fields', () => {
    const r = validateCampaignConfig({
      id: 'minimal',
      universe: 'long-run-cross-market-100',
      preset_ids: ['ema-cross-9-21'],
    });
    assert.equal(r.valid, true);
  });

  it('rejects empty preset_ids', () => {
    const r = validateCampaignConfig({ ...validConfig, preset_ids: [] });
    assert.equal(r.valid, false);
  });

  it('rejects non-string preset_ids entries', () => {
    const r = validateCampaignConfig({ ...validConfig, preset_ids: ['ema-cross-9-21', 10] });
    assert.equal(r.valid, false);
  });

  it('rejects negative cooldown_ms', () => {
    const r = validateCampaignConfig({
      ...validConfig,
      execution: { cooldown_ms: -100 },
    });
    assert.equal(r.valid, false);
  });
});

// ---------------------------------------------------------------------------
// selectPhaseSymbols / partitionRuns / needsRerun
// ---------------------------------------------------------------------------
describe('selectPhaseSymbols', () => {
  const symbols = Array.from({ length: 12 }, (_, index) => ({
    symbol: `SYM${index + 1}`,
    market: index < 6 ? 'US' : 'JP',
    bucket: index < 6 ? 'us-equity' : 'jp-equity',
  }));

  it('returns all symbols for full phase when no phase config exists', () => {
    assert.equal(selectPhaseSymbols(symbols, 'full').length, 12);
  });

  it('returns explicit symbol count for configured phase', () => {
    const phaseSymbols = selectPhaseSymbols(symbols, 'smoke', { smoke: { symbol_count: 5 } });
    assert.equal(phaseSymbols.length, 5);
  });
});

describe('partitionRuns', () => {
  it('splits runs into near-even worker shards', () => {
    const runs = Array.from({ length: 11 }, (_, index) => ({ presetId: `p${index}`, symbol: `s${index}` }));
    const shards = partitionRuns(runs, 2);
    assert.equal(shards.length, 2);
    assert.equal(shards[0].length + shards[1].length, 11);
    assert.ok(Math.abs(shards[0].length - shards[1].length) <= 1);
  });
});

describe('needsRerun', () => {
  it('returns true for metrics_unreadable results', () => {
    assert.equal(needsRerun({ success: true, tester_available: false, tester_reason_category: 'metrics_unreadable' }), true);
  });

  it('returns false for degraded fallback success that does not recommend rerun', () => {
    assert.equal(
      needsRerun({
        success: true,
        tester_available: false,
        tester_reason_category: 'metrics_unreadable',
        degraded_result: true,
        rerun_recommended: false,
        fallback_metrics: {
          net_profit: 123,
          closed_trades: 4,
        },
      }),
      false,
    );
  });

  it('returns true for apply_failed results', () => {
    assert.equal(needsRerun({ success: false, apply_failed: true }), true);
  });

  it('returns false for successful readable results', () => {
    assert.equal(needsRerun({ success: true, tester_available: true }), false);
  });
});

// ---------------------------------------------------------------------------
// summarizeResults
// ---------------------------------------------------------------------------
describe('summarizeResults', () => {
  it('counts success, failure, and unreadable', () => {
    const results = [
      { success: true, tester_available: true },
      { success: true, tester_available: true },
      { success: false },
      { success: true, tester_available: false, tester_reason_category: 'metrics_unreadable' },
    ];
    const s = summarizeResults(results);
    assert.equal(s.success, 2);
    assert.equal(s.failure, 1);
    assert.equal(s.unreadable, 1);
    assert.equal(s.total, 4);
  });

  it('counts degraded fallback success as success', () => {
    const s = summarizeResults([
      {
        success: true,
        tester_available: false,
        tester_reason_category: 'metrics_unreadable',
        degraded_result: true,
        rerun_recommended: false,
        fallback_metrics: {
          net_profit: 123,
          closed_trades: 4,
        },
      },
    ]);
    assert.equal(s.success, 1);
    assert.equal(s.failure, 0);
    assert.equal(s.unreadable, 0);
    assert.equal(s.total, 1);
  });

  it('returns zeros for empty array', () => {
    const s = summarizeResults([]);
    assert.equal(s.total, 0);
  });
});

// ---------------------------------------------------------------------------
// findPendingRuns
// ---------------------------------------------------------------------------
describe('findPendingRuns', () => {
  it('returns runs not in completed set', () => {
    const matrix = [
      { presetId: 'a', symbol: 'AAPL' },
      { presetId: 'a', symbol: 'MSFT' },
      { presetId: 'b', symbol: 'AAPL' },
    ];
    const completed = [{ presetId: 'a', symbol: 'AAPL' }];
    const pending = findPendingRuns(matrix, completed);
    assert.equal(pending.length, 2);
    assert.deepEqual(pending[0], { presetId: 'a', symbol: 'MSFT' });
  });

  it('returns full matrix when nothing completed', () => {
    const matrix = [{ presetId: 'x', symbol: 'Y' }];
    assert.equal(findPendingRuns(matrix, []).length, 1);
  });

  it('returns empty when all completed', () => {
    const matrix = [{ presetId: 'x', symbol: 'Y' }];
    assert.equal(findPendingRuns(matrix, [{ presetId: 'x', symbol: 'Y' }]).length, 0);
  });
});

describe('filterRunsToMatrix', () => {
  it('drops resumed entries that are not in the current matrix', () => {
    const matrix = [{ presetId: 'a', symbol: 'AAPL' }];
    const filtered = filterRunsToMatrix(
      [
        { presetId: 'a', symbol: 'AAPL', result: { success: true, tester_available: true } },
        { presetId: 'other', symbol: 'ZZZ', result: { success: false } },
      ],
      matrix,
    );
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].presetId, 'a');
  });
});

describe('buildCampaignFingerprint', () => {
  it('changes when the phase changes', () => {
    const smoke = buildCampaignFingerprint({
      config: { id: 'campaign', preset_ids: ['a'] },
      defaults: { date_range: { from: '2000-01-01', to: '2099-12-31' } },
      phase: 'smoke',
      matrix: [{ presetId: 'a', symbol: 'AAPL' }],
    });
    const full = buildCampaignFingerprint({
      config: { id: 'campaign', preset_ids: ['a'] },
      defaults: { date_range: { from: '2000-01-01', to: '2099-12-31' } },
      phase: 'full',
      matrix: [{ presetId: 'a', symbol: 'AAPL' }],
    });
    assert.notEqual(smoke, full);
  });

  it('changes when matrix run keys change even if total_runs stays the same', () => {
    const aapl = buildCampaignFingerprint({
      config: { id: 'campaign', universe: 'u1', preset_ids: ['a'] },
      defaults: { date_range: { from: '2000-01-01', to: '2099-12-31' } },
      phase: 'full',
      matrix: [{ presetId: 'a', symbol: 'AAPL' }],
    });
    const msft = buildCampaignFingerprint({
      config: { id: 'campaign', universe: 'u1', preset_ids: ['a'] },
      defaults: { date_range: { from: '2000-01-01', to: '2099-12-31' } },
      phase: 'full',
      matrix: [{ presetId: 'a', symbol: 'MSFT' }],
    });
    assert.notEqual(aapl, msft);
  });
});

describe('checkpointMatchesCampaign', () => {
  const matrix = [{ presetId: 'a', symbol: 'AAPL' }];
  const fingerprintArgs = {
    config: { id: 'campaign', universe: 'u1', preset_ids: ['a'] },
    defaults: { date_range: { from: '2000-01-01', to: '2099-12-31' } },
    phase: 'full',
    matrix,
  };

  it('accepts current fingerprint', () => {
    assert.equal(
      checkpointMatchesCampaign({
        checkpoint: {
          campaign_id: 'campaign',
          phase: 'full',
          campaign_fingerprint: buildCampaignFingerprint(fingerprintArgs),
          results: [{ presetId: 'a', symbol: 'AAPL' }],
        },
        campaignId: 'campaign',
        phase: 'full',
        matrix,
        campaignFingerprint: buildCampaignFingerprint(fingerprintArgs),
        legacyCampaignFingerprint: buildLegacyCampaignFingerprint(fingerprintArgs),
      }),
      true,
    );
  });

  it('accepts legacy fingerprint only when all stored runs are within the current matrix', () => {
    assert.equal(
      checkpointMatchesCampaign({
        checkpoint: {
          campaign_id: 'campaign',
          phase: 'full',
          campaign_fingerprint: buildLegacyCampaignFingerprint(fingerprintArgs),
          results: [{ presetId: 'a', symbol: 'AAPL' }],
        },
        campaignId: 'campaign',
        phase: 'full',
        matrix,
        campaignFingerprint: buildCampaignFingerprint(fingerprintArgs),
        legacyCampaignFingerprint: buildLegacyCampaignFingerprint(fingerprintArgs),
      }),
      true,
    );
  });

  it('rejects legacy fingerprint when checkpoint contains runs outside the current matrix', () => {
    assert.equal(
      checkpointMatchesCampaign({
        checkpoint: {
          campaign_id: 'campaign',
          phase: 'full',
          campaign_fingerprint: buildLegacyCampaignFingerprint(fingerprintArgs),
          results: [{ presetId: 'a', symbol: 'MSFT' }],
        },
        campaignId: 'campaign',
        phase: 'full',
        matrix,
        campaignFingerprint: buildCampaignFingerprint(fingerprintArgs),
        legacyCampaignFingerprint: buildLegacyCampaignFingerprint(fingerprintArgs),
      }),
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// buildCheckpoint
// ---------------------------------------------------------------------------
describe('buildCheckpoint', () => {
  it('builds checkpoint with summary', () => {
    const cp = buildCheckpoint({
      campaignId: 'test',
      campaignFingerprint: 'fp-1',
      completedRuns: [{ presetId: 'a', symbol: 'AAPL', result: { success: true, tester_available: true } }],
      startedAt: '2025-01-01T00:00:00Z',
    });
    assert.equal(cp.campaign_id, 'test');
    assert.equal(cp.campaign_fingerprint, 'fp-1');
    assert.equal(cp.completed, 1);
    assert.equal(cp.summary.success, 1);
    assert.ok(cp.updated_at);
  });
});

// ---------------------------------------------------------------------------
// loadCampaign — integration (reads actual config files)
// ---------------------------------------------------------------------------
describe('loadCampaign', () => {
  it('loads long-run-cross-market-100x5 campaign with 100 symbols and 5 strategies', async () => {
    const campaign = await loadCampaign('long-run-cross-market-100x5');
    assert.ok(campaign.config);
    assert.equal(campaign.config.id, 'long-run-cross-market-100x5');
    assert.ok(campaign.universe);
    assert.equal(campaign.symbols.length, 100);
    assert.equal(campaign.strategies.length, 5);
    assert.equal(campaign.matrix.length, 500);
    assert.equal(campaign.totalRuns, campaign.matrix.length);
  });

  it('applies date override from campaign config', async () => {
    const campaign = await loadCampaign('long-run-cross-market-100x5');
    assert.equal(campaign.defaults.date_range.from, '2000-01-01');
    assert.equal(campaign.defaults.date_range.to, '2099-12-31');
  });

  it('uses the approved preset shortlist in order', async () => {
    const campaign = await loadCampaign('long-run-cross-market-100x5');
    assert.deepEqual(
      campaign.strategies.map((strategy) => strategy.id),
      [
        'donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight',
        'donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early',
        'donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide',
        'donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early',
        'donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight',
      ],
    );
  });

  it('selects the smoke phase symbol subset', async () => {
    const campaign = await loadCampaign('long-run-cross-market-100x5', { phase: 'smoke' });
    assert.equal(campaign.phase, 'smoke');
    assert.equal(campaign.symbols.length, 10);
    assert.equal(campaign.matrix.length, 50);
  });

  it('selects the pilot phase symbol subset', async () => {
    const campaign = await loadCampaign('long-run-cross-market-100x5', { phase: 'pilot' });
    assert.equal(campaign.phase, 'pilot');
    assert.equal(campaign.symbols.length, 25);
    assert.equal(campaign.matrix.length, 125);
  });

  it('rejects unknown campaign id', async () => {
    await assert.rejects(
      () => loadCampaign('nonexistent-campaign'),
      /ENOENT|no such file/i,
    );
  });
});

// ---------------------------------------------------------------------------
// loadPreset with dateOverride — date override flows into Pine source
// ---------------------------------------------------------------------------
describe('loadPreset with dateOverride', () => {
  it('uses default date range when no override', async () => {
    const { source } = await loadPreset('ema-cross-9-21');
    assert.ok(source.includes('timestamp(2015, 1, 1'));
    assert.ok(source.includes('timestamp(2025, 12, 31'));
  });

  it('overrides date range in generated Pine source', async () => {
    const { source, defaults } = await loadPreset('ema-cross-9-21', {
      dateOverride: { from: '2000-01-01', to: '2099-12-31' },
    });
    assert.ok(source.includes('timestamp(2000, 1, 1'));
    assert.ok(source.includes('timestamp(2099, 12, 31'));
    assert.equal(defaults.date_range.from, '2000-01-01');
    assert.equal(defaults.date_range.to, '2099-12-31');
  });

  it('does not affect other defaults when overriding dates', async () => {
    const { defaults } = await loadPreset('ema-cross-9-21', {
      dateOverride: { from: '2000-01-01', to: '2099-12-31' },
    });
    assert.equal(defaults.initial_capital, 10000);
    assert.equal(defaults.commission, 0);
  });

  it('generated source matches buildResearchStrategySource with overridden defaults', async () => {
    const dateOverride = { from: '2000-01-01', to: '2099-12-31' };
    const { preset, defaults, source } = await loadPreset('ema-cross-9-21', { dateOverride });
    const expected = buildResearchStrategySource(preset, defaults);
    assert.equal(source, expected);
  });
});

// ---------------------------------------------------------------------------
// Campaign config file — structural validation
// ---------------------------------------------------------------------------
describe('campaign config file validation', () => {
  it('long-run-cross-market-100x5.json is valid JSON', async () => {
    const raw = await readFile(
      join(__dirname, '..', 'config', 'backtest', 'campaigns', 'long-run-cross-market-100x5.json'),
      'utf8',
    );
    const config = JSON.parse(raw);
    assert.equal(config.id, 'long-run-cross-market-100x5');
    assert.ok(config.date_override);
    assert.equal(config.date_override.from, '2000-01-01');
    assert.equal(config.name, 'Long-Run Cross-Market 5 strategies × 100 symbols');
    assert.equal(config.preset_ids.length, 5);
  });

  it('campaign config passes validateCampaignConfig', async () => {
    const raw = await readFile(
      join(__dirname, '..', 'config', 'backtest', 'campaigns', 'long-run-cross-market-100x5.json'),
      'utf8',
    );
    const config = JSON.parse(raw);
    const result = validateCampaignConfig(config);
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it('long-run-us-entry-sweep-50x3.json is valid JSON', async () => {
    const raw = await readFile(
      join(__dirname, '..', 'config', 'backtest', 'campaigns', 'long-run-us-entry-sweep-50x3.json'),
      'utf8',
    );
    const config = JSON.parse(raw);
    assert.equal(config.id, 'long-run-us-entry-sweep-50x3');
    assert.equal(config.universe, 'long-run-us-50');
    assert.equal(config.date_override.from, '2000-01-01');
    assert.deepEqual(config.preset_ids, [
      'donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early',
      'donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict',
      'donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late',
    ]);
  });

  it('long-run-jp-exit-sweep-50x3.json is valid JSON', async () => {
    const raw = await readFile(
      join(__dirname, '..', 'config', 'backtest', 'campaigns', 'long-run-jp-exit-sweep-50x3.json'),
      'utf8',
    );
    const config = JSON.parse(raw);
    assert.equal(config.id, 'long-run-jp-exit-sweep-50x3');
    assert.equal(config.universe, 'long-run-jp-50');
    assert.equal(config.date_override.from, '2000-01-01');
    assert.deepEqual(config.preset_ids, [
      'donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight',
      'donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight',
      'donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide',
    ]);
  });

  it('new deep-dive campaign configs pass validateCampaignConfig', async () => {
    for (const fileName of ['long-run-us-entry-sweep-50x3.json', 'long-run-jp-exit-sweep-50x3.json']) {
      const raw = await readFile(
        join(__dirname, '..', 'config', 'backtest', 'campaigns', fileName),
        'utf8',
      );
      const config = JSON.parse(raw);
      const result = validateCampaignConfig(config);
      assert.equal(result.valid, true);
      assert.deepEqual(result.errors, []);
    }
  });
});

describe('market-specific long-run deep-dive configs', () => {
  it('loads US entry sweep campaign with US-only 50 symbol universe', async () => {
    const campaign = await loadCampaign('long-run-us-entry-sweep-50x3');
    assert.equal(campaign.symbols.length, 50);
    assert.equal(campaign.strategies.length, 3);
    assert.equal(campaign.matrix.length, 150);
    assert.ok(campaign.symbols.every((entry) => entry.market === 'US'));
    assert.deepEqual(
      campaign.strategies.map((strategy) => strategy.id),
      [
        'donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early',
        'donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict',
        'donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late',
      ],
    );
    assert.equal(campaign.defaults.date_range.from, '2000-01-01');
    assert.equal(campaign.defaults.date_range.to, '2099-12-31');
  });

  it('loads JP exit sweep campaign with JP-only 50 symbol universe', async () => {
    const campaign = await loadCampaign('long-run-jp-exit-sweep-50x3');
    assert.equal(campaign.symbols.length, 50);
    assert.equal(campaign.strategies.length, 3);
    assert.equal(campaign.matrix.length, 150);
    assert.ok(campaign.symbols.every((entry) => entry.market === 'JP'));
    assert.deepEqual(
      campaign.strategies.map((strategy) => strategy.id),
      [
        'donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight',
        'donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight',
        'donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide',
      ],
    );
    assert.equal(campaign.defaults.date_range.from, '2000-01-01');
    assert.equal(campaign.defaults.date_range.to, '2099-12-31');
  });

  it('uses 10/25/50 phase sizing for both deep-dive campaigns', async () => {
    const usSmoke = await loadCampaign('long-run-us-entry-sweep-50x3', { phase: 'smoke' });
    const usPilot = await loadCampaign('long-run-us-entry-sweep-50x3', { phase: 'pilot' });
    const jpSmoke = await loadCampaign('long-run-jp-exit-sweep-50x3', { phase: 'smoke' });
    const jpPilot = await loadCampaign('long-run-jp-exit-sweep-50x3', { phase: 'pilot' });

    assert.equal(usSmoke.symbols.length, 10);
    assert.equal(usPilot.symbols.length, 25);
    assert.equal(jpSmoke.symbols.length, 10);
    assert.equal(jpPilot.symbols.length, 25);
  });
});
