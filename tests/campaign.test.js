import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

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
  summarizeFailureReason,
  filterRunsToMatrix,
  findPendingRuns,
  selectPhaseSymbols,
  partitionRuns,
  needsRerun,
  buildPresetFailureBudgetState,
  filterRunsByFailureBudget,
} from '../src/core/campaign.js';

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

  it('accepts strategy_ids without preset_ids', () => {
    const r = validateCampaignConfig({
      id: 'public-top10-us-40x10',
      universe: 'public-top10-us-40',
      strategy_ids: ['tv-public-kdj-l2'],
    });
    assert.equal(r.valid, true);
    assert.deepEqual(r.errors, []);
  });

  it('rejects empty preset_ids', () => {
    const r = validateCampaignConfig({ ...validConfig, preset_ids: [] });
    assert.equal(r.valid, false);
  });

  it('rejects non-string preset_ids entries', () => {
    const r = validateCampaignConfig({ ...validConfig, preset_ids: ['ema-cross-9-21', 10] });
    assert.equal(r.valid, false);
  });

  it('rejects non-string strategy_ids entries', () => {
    const r = validateCampaignConfig({
      id: 'public-top10-us-40x10',
      universe: 'public-top10-us-40',
      strategy_ids: ['tv-public-kdj-l2', 10],
    });
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

describe('preset failure budget helpers', () => {
  it('blocks only the preset that exhausts consecutive failures', () => {
    const completedRuns = [
      { presetId: 'bad', symbol: 'AAPL', attempt: 'primary', result: { success: false, tester_reason_category: 'apply_failed' } },
      { presetId: 'good', symbol: 'AAPL', attempt: 'primary', result: { success: true, tester_available: true } },
      { presetId: 'bad', symbol: 'MSFT', attempt: 'primary', result: { success: false, tester_reason_category: 'apply_failed' } },
    ];
    const matrix = [
      { presetId: 'bad', symbol: 'NVDA' },
      { presetId: 'good', symbol: 'NVDA' },
    ];

    const state = buildPresetFailureBudgetState(completedRuns, 2);
    assert.deepEqual(state.blockedPresetIds, ['bad']);
    assert.equal(state.blockedPresets[0].presetId, 'bad');
    assert.equal(state.blockedPresets[0].consecutiveFailures, 2);

    const filtered = filterRunsByFailureBudget(matrix, completedRuns, 2);
    assert.deepEqual(filtered.runs, [{ presetId: 'good', symbol: 'NVDA' }]);
    assert.deepEqual(filtered.blockedPresetIds, ['bad']);
    assert.equal(filtered.skippedRuns.length, 1);
    assert.deepEqual(filtered.skippedRuns[0], { presetId: 'bad', symbol: 'NVDA' });
  });

  it('resets consecutive failures after a success for the same preset', () => {
    const completedRuns = [
      { presetId: 'mixed', symbol: 'AAPL', attempt: 'primary', result: { success: false, tester_reason_category: 'apply_failed' } },
      { presetId: 'mixed', symbol: 'MSFT', attempt: 'primary', result: { success: true, tester_available: true } },
      { presetId: 'mixed', symbol: 'NVDA', attempt: 'primary', result: { success: false, tester_reason_category: 'apply_failed' } },
    ];

    const state = buildPresetFailureBudgetState(completedRuns, 2);
    assert.deepEqual(state.blockedPresetIds, []);
    assert.equal(state.presets.find((preset) => preset.presetId === 'mixed').consecutiveFailures, 1);
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

describe('summarizeFailureReason', () => {
  it('prefers explicit result.error', () => {
    assert.equal(summarizeFailureReason({ error: 'Timed out after 1000ms' }), 'Timed out after 1000ms');
  });

  it('renders compile error details when compile_errors exist', () => {
    assert.equal(
      summarizeFailureReason({
        compile_errors: [{ line: 180, message: 'Mismatched input ?' }],
      }),
      'compile_error (line 180: Mismatched input ?)',
    );
  });

  it('falls back to apply reason and tester reason when needed', () => {
    assert.equal(summarizeFailureReason({ apply_reason: 'No strategy is applied' }), 'No strategy is applied');
    assert.equal(summarizeFailureReason({ tester_reason_category: 'metrics_unreadable' }), 'metrics_unreadable');
    assert.equal(summarizeFailureReason({ tester_reason: 'Strategy Tester unavailable' }), 'Strategy Tester unavailable');
  });

  it('returns unknown when no structured reason exists', () => {
    assert.equal(summarizeFailureReason({ success: false }), 'unknown');
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

  it('does not change when only experiment_gating config changes', () => {
    const baseArgs = {
      config: {
        id: 'campaign',
        universe: 'u1',
        preset_ids: ['a'],
        experiment_gating: {
          enabled: true,
          thresholds: {
            promote: { min_profit_factor: 1.2 },
          },
        },
      },
      defaults: { date_range: { from: '2000-01-01', to: '2099-12-31' }, initial_capital: 10000 },
      phase: 'full',
      matrix: [{ presetId: 'a', symbol: 'AAPL' }],
    };
    const loose = buildCampaignFingerprint(baseArgs);
    const strict = buildCampaignFingerprint({
      ...baseArgs,
      config: {
        ...baseArgs.config,
        experiment_gating: {
          enabled: true,
          thresholds: {
            promote: { min_profit_factor: 2.0 },
          },
        },
      },
    });
    assert.equal(loose, strict);
  });

  it('changes when initial capital changes', () => {
    const baseArgs = {
      config: { id: 'campaign', universe: 'u1', preset_ids: ['a'] },
      defaults: { date_range: { from: '2000-01-01', to: '2099-12-31' }, initial_capital: 10000 },
      phase: 'full',
      matrix: [{ presetId: 'a', symbol: 'AAPL' }],
    };
    const lowCapital = buildCampaignFingerprint(baseArgs);
    const highCapital = buildCampaignFingerprint({
      ...baseArgs,
      defaults: {
        ...baseArgs.defaults,
        initial_capital: 25000,
      },
    });
    assert.notEqual(lowCapital, highCapital);
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

  it('rejects legacy fingerprint by default even when runs match the matrix', () => {
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
      false,
    );
  });

  it('accepts legacy fingerprint only when explicitly allowed and all stored runs are within the current matrix', () => {
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
        allowLegacyFingerprint: true,
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
        allowLegacyFingerprint: true,
      }),
      false,
    );
  });

  it('rejects legacy fingerprint when compatibility mode is disabled by initial-capital-sensitive changes', () => {
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
        campaignFingerprint: buildCampaignFingerprint({
          ...fingerprintArgs,
          defaults: {
            ...fingerprintArgs.defaults,
            initial_capital: 25000,
          },
        }),
        legacyCampaignFingerprint: buildLegacyCampaignFingerprint(fingerprintArgs),
        allowLegacyFingerprint: false,
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
  it('rejects unknown campaign id', async () => {
    await assert.rejects(
      () => loadCampaign('nonexistent-campaign'),
      /not found under/i,
    );
  });
});

// ---------------------------------------------------------------------------
// experiment_gating validation in validateCampaignConfig
// ---------------------------------------------------------------------------
describe('experiment_gating config validation', () => {
  const baseConfig = {
    id: 'test-gating',
    universe: 'long-run-cross-market-100',
    preset_ids: ['sma-cross-5-20'],
  };

  it('accepts config with valid experiment_gating', () => {
    const r = validateCampaignConfig({
      ...baseConfig,
      experiment_gating: {
        enabled: true,
        thresholds: {
          promote: { min_profit_factor: 1.5 },
          reject: { max_profit_factor: 0.5 },
        },
      },
    });
    assert.equal(r.valid, true);
  });

  it('accepts config without experiment_gating', () => {
    const r = validateCampaignConfig(baseConfig);
    assert.equal(r.valid, true);
  });

  it('rejects non-boolean experiment_gating.enabled', () => {
    const r = validateCampaignConfig({
      ...baseConfig,
      experiment_gating: { enabled: 'yes' },
    });
    assert.equal(r.valid, false);
    assert.ok(r.errors.some((e) => /enabled/.test(e)));
  });

  it('rejects non-object experiment_gating.thresholds', () => {
    const r = validateCampaignConfig({
      ...baseConfig,
      experiment_gating: { enabled: true, thresholds: 'strict' },
    });
    assert.equal(r.valid, false);
    assert.ok(r.errors.some((e) => /thresholds/.test(e)));
  });

  it('rejects array-shaped threshold containers', () => {
    const topLevel = validateCampaignConfig({
      ...baseConfig,
      experiment_gating: [],
    });
    assert.equal(topLevel.valid, false);

    const nested = validateCampaignConfig({
      ...baseConfig,
      experiment_gating: {
        enabled: true,
        thresholds: {
          promote: [],
        },
      },
    });
    assert.equal(nested.valid, false);
    assert.ok(nested.errors.some((e) => /promote/.test(e)));
  });

  it('rejects invalid nested promote threshold values', () => {
    const r = validateCampaignConfig({
      ...baseConfig,
      experiment_gating: {
        enabled: true,
        thresholds: {
          promote: { min_closed_trades: 0 },
        },
      },
    });
    assert.equal(r.valid, false);
    assert.ok(r.errors.some((e) => /min_closed_trades/.test(e)));
  });

  it('rejects invalid nested reject threshold values', () => {
    const r = validateCampaignConfig({
      ...baseConfig,
      experiment_gating: {
        enabled: true,
        thresholds: {
          reject: { max_drawdown_pct: -1 },
        },
      },
    });
    assert.equal(r.valid, false);
    assert.ok(r.errors.some((e) => /max_drawdown_pct/.test(e)));
  });
});

// ---------------------------------------------------------------------------
// cross-phase resume guard (same-phase only)
// ---------------------------------------------------------------------------
describe('cross-phase resume guard', () => {
  const matrix = [{ presetId: 'a', symbol: 'AAPL' }];
  const smokeArgs = {
    config: { id: 'campaign', universe: 'u1', preset_ids: ['a'] },
    defaults: { date_range: { from: '2000-01-01', to: '2099-12-31' } },
    phase: 'smoke',
    matrix,
  };
  const fullArgs = { ...smokeArgs, phase: 'full' };

  it('rejects smoke checkpoint when resuming full phase', () => {
    const smokeFingerprint = buildCampaignFingerprint(smokeArgs);
    const fullFingerprint = buildCampaignFingerprint(fullArgs);
    assert.notEqual(smokeFingerprint, fullFingerprint);
    assert.equal(
      checkpointMatchesCampaign({
        checkpoint: {
          campaign_id: 'campaign',
          phase: 'smoke',
          campaign_fingerprint: smokeFingerprint,
          results: [{ presetId: 'a', symbol: 'AAPL' }],
        },
        campaignId: 'campaign',
        phase: 'full',
        matrix,
        campaignFingerprint: fullFingerprint,
        legacyCampaignFingerprint: buildLegacyCampaignFingerprint(fullArgs),
      }),
      false,
    );
  });

  it('rejects pilot checkpoint when resuming full phase', () => {
    const pilotArgs = { ...smokeArgs, phase: 'pilot' };
    const pilotFingerprint = buildCampaignFingerprint(pilotArgs);
    const fullFingerprint = buildCampaignFingerprint(fullArgs);
    assert.equal(
      checkpointMatchesCampaign({
        checkpoint: {
          campaign_id: 'campaign',
          phase: 'pilot',
          campaign_fingerprint: pilotFingerprint,
          results: [{ presetId: 'a', symbol: 'AAPL' }],
        },
        campaignId: 'campaign',
        phase: 'full',
        matrix,
        campaignFingerprint: fullFingerprint,
        legacyCampaignFingerprint: buildLegacyCampaignFingerprint(fullArgs),
      }),
      false,
    );
  });

  it('accepts same-phase checkpoint for resume', () => {
    const fullFingerprint = buildCampaignFingerprint(fullArgs);
    assert.equal(
      checkpointMatchesCampaign({
        checkpoint: {
          campaign_id: 'campaign',
          phase: 'full',
          campaign_fingerprint: fullFingerprint,
          results: [{ presetId: 'a', symbol: 'AAPL' }],
        },
        campaignId: 'campaign',
        phase: 'full',
        matrix,
        campaignFingerprint: fullFingerprint,
        legacyCampaignFingerprint: buildLegacyCampaignFingerprint(fullArgs),
      }),
      true,
    );
  });
});
