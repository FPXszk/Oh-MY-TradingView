import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeNumericMetric,
  normalizeRunMetrics,
  computeMaxDrawdownPct,
  gateDecision,
  rankCandidates,
  gateAllRuns,
  buildGatedSummary,
  DEFAULT_GATE_THRESHOLDS,
} from '../src/core/experiment-gating.js';

// ---------------------------------------------------------------------------
// normalizeNumericMetric — parse raw metric strings/numbers to numeric values
// ---------------------------------------------------------------------------
describe('normalizeNumericMetric', () => {
  it('returns number as-is for finite numeric input', () => {
    assert.equal(normalizeNumericMetric(42.5), 42.5);
  });

  it('returns 0 for zero', () => {
    assert.equal(normalizeNumericMetric(0), 0);
  });

  it('returns null for null/undefined input', () => {
    assert.equal(normalizeNumericMetric(null), null);
    assert.equal(normalizeNumericMetric(undefined), null);
  });

  it('returns null for NaN', () => {
    assert.equal(normalizeNumericMetric(NaN), null);
  });

  it('returns null for Infinity', () => {
    assert.equal(normalizeNumericMetric(Infinity), null);
    assert.equal(normalizeNumericMetric(-Infinity), null);
  });

  it('parses numeric strings', () => {
    assert.equal(normalizeNumericMetric('123.45'), 123.45);
    assert.equal(normalizeNumericMetric('-10'), -10);
  });

  it('strips currency/percent suffixes', () => {
    assert.equal(normalizeNumericMetric('1,234.56 USD'), 1234.56);
    assert.equal(normalizeNumericMetric('45.2%'), 45.2);
  });

  it('strips Japanese yen sign and parenthetical currency', () => {
    assert.equal(normalizeNumericMetric('¥1234'), 1234);
    assert.equal(normalizeNumericMetric('(1234.00)'), -1234);
  });

  it('returns null for non-parseable strings', () => {
    assert.equal(normalizeNumericMetric('N/A'), null);
    assert.equal(normalizeNumericMetric('---'), null);
    assert.equal(normalizeNumericMetric(''), null);
  });

  it('handles negative numbers in parentheses', () => {
    assert.equal(normalizeNumericMetric('(500.25)'), -500.25);
  });
});

// ---------------------------------------------------------------------------
// normalizeRunMetrics — extract normalized metrics from a campaign run result
// ---------------------------------------------------------------------------
describe('normalizeRunMetrics', () => {
  it('extracts metrics from a successful tester-available result', () => {
    const run = {
      presetId: 'strat-a',
      symbol: 'AAPL',
      result: {
        success: true,
        tester_available: true,
        metrics: {
          net_profit: 1500.50,
          closed_trades: 42,
          percent_profitable: 55.2,
          profit_factor: 1.85,
          max_drawdown: 800.00,
        },
      },
    };
    const m = normalizeRunMetrics(run);
    assert.equal(m.net_profit, 1500.50);
    assert.equal(m.closed_trades, 42);
    assert.equal(m.percent_profitable, 55.2);
    assert.equal(m.profit_factor, 1.85);
    assert.equal(m.max_drawdown, 800.00);
  });

  it('extracts from fallback_metrics when degraded_result is true', () => {
    const run = {
      presetId: 'strat-b',
      symbol: 'MSFT',
      result: {
        success: true,
        tester_available: false,
        degraded_result: true,
        rerun_recommended: false,
        fallback_metrics: {
          net_profit: 200,
          closed_trades: 10,
          percent_profitable: 40,
          profit_factor: 1.2,
          max_drawdown: 300,
        },
      },
    };
    const m = normalizeRunMetrics(run);
    assert.equal(m.net_profit, 200);
    assert.equal(m.closed_trades, 10);
  });

  it('returns all-null metrics for failed runs', () => {
    const run = {
      presetId: 'strat-c',
      symbol: 'GOOG',
      result: { success: false, error: 'timeout' },
    };
    const m = normalizeRunMetrics(run);
    assert.equal(m.net_profit, null);
    assert.equal(m.closed_trades, null);
    assert.equal(m.profit_factor, null);
  });

  it('returns all-null metrics when result is null', () => {
    const run = { presetId: 'strat-d', symbol: 'TSLA', result: null };
    const m = normalizeRunMetrics(run);
    assert.equal(m.net_profit, null);
  });
});

// ---------------------------------------------------------------------------
// gateDecision — deterministic promote/hold/reject based on thresholds
// ---------------------------------------------------------------------------
describe('gateDecision', () => {
  const thresholds = DEFAULT_GATE_THRESHOLDS;

  it('promotes a run that meets all promote thresholds', () => {
    const metrics = {
      net_profit: 500,
      closed_trades: 20,
      percent_profitable: 45,
      profit_factor: 1.5,
      max_drawdown: 1000,
    };
    const d = gateDecision(metrics, thresholds);
    assert.equal(d.decision, 'promote');
    assert.ok(Array.isArray(d.reasons));
    assert.equal(d.reasons.length, 0);
  });

  it('rejects a run with negative profit factor', () => {
    const metrics = {
      net_profit: -500,
      closed_trades: 20,
      percent_profitable: 30,
      profit_factor: 0.5,
      max_drawdown: 5000,
    };
    const d = gateDecision(metrics, thresholds);
    assert.equal(d.decision, 'reject');
    assert.ok(d.reasons.length > 0);
  });

  it('holds a run that has some metrics below promote but above reject', () => {
    const metrics = {
      net_profit: 10,
      closed_trades: 8,
      percent_profitable: 38,
      profit_factor: 1.05,
      max_drawdown: 2000,
    };
    const d = gateDecision(metrics, thresholds);
    assert.equal(d.decision, 'hold');
    assert.ok(d.reasons.some((reason) => /closed_trades/.test(reason)));
  });

  it('rejects when all metrics are null (no data)', () => {
    const metrics = {
      net_profit: null,
      closed_trades: null,
      percent_profitable: null,
      profit_factor: null,
      max_drawdown: null,
    };
    const d = gateDecision(metrics, thresholds);
    assert.equal(d.decision, 'reject');
    assert.ok(d.reasons.some((r) => /insufficient/i.test(r)));
  });

  it('uses custom thresholds when provided', () => {
    const custom = {
      promote: { min_profit_factor: 3.0, min_closed_trades: 50, min_percent_profitable: 60 },
      reject: { max_profit_factor: 0.3, max_drawdown_pct: 90 },
    };
    const metrics = {
      net_profit: 1000,
      closed_trades: 20,
      percent_profitable: 55,
      profit_factor: 2.0,
      max_drawdown: 500,
    };
    const d = gateDecision(metrics, custom);
    assert.equal(d.decision, 'hold');
  });

  it('holds when a required promote metric is missing', () => {
    const metrics = {
      net_profit: 1000,
      closed_trades: null,
      percent_profitable: 55,
      profit_factor: 2.0,
      max_drawdown: 500,
    };
    const d = gateDecision(metrics, thresholds);
    assert.equal(d.decision, 'hold');
    assert.ok(d.reasons.some((reason) => /closed_trades is missing/.test(reason)));
  });

  it('rejects when drawdown percentage breaches the reject threshold', () => {
    const metrics = {
      net_profit: 500,
      closed_trades: 20,
      percent_profitable: 45,
      profit_factor: 1.4,
      max_drawdown: 9000,
    };
    const d = gateDecision(metrics, thresholds, { initialCapital: 10000 });
    assert.equal(d.decision, 'reject');
    assert.ok(d.reasons.some((reason) => /max_drawdown_pct/.test(reason)));
  });

  it('decision is deterministic — same input always yields same output', () => {
    const metrics = {
      net_profit: 100,
      closed_trades: 15,
      percent_profitable: 42,
      profit_factor: 1.3,
      max_drawdown: 1500,
    };
    const d1 = gateDecision(metrics, thresholds);
    const d2 = gateDecision(metrics, thresholds);
    assert.equal(d1.decision, d2.decision);
    assert.deepEqual(d1.reasons, d2.reasons);
  });
});

describe('computeMaxDrawdownPct', () => {
  it('computes drawdown percentage from absolute drawdown and initial capital', () => {
    assert.equal(computeMaxDrawdownPct(2500, 10000), 25);
  });

  it('returns null when inputs are not usable', () => {
    assert.equal(computeMaxDrawdownPct(null, 10000), null);
    assert.equal(computeMaxDrawdownPct(2500, 0), null);
  });
});

// ---------------------------------------------------------------------------
// rankCandidates — stable ranking of gated candidates
// ---------------------------------------------------------------------------
describe('rankCandidates', () => {
  it('ranks promoted candidates by profit_factor descending', () => {
    const candidates = [
      { presetId: 'a', symbol: 'AAPL', decision: 'promote', metrics: { profit_factor: 2.0, net_profit: 100 } },
      { presetId: 'b', symbol: 'MSFT', decision: 'promote', metrics: { profit_factor: 3.0, net_profit: 200 } },
      { presetId: 'c', symbol: 'GOOG', decision: 'promote', metrics: { profit_factor: 1.5, net_profit: 50 } },
    ];
    const ranked = rankCandidates(candidates);
    assert.equal(ranked[0].presetId, 'b');
    assert.equal(ranked[1].presetId, 'a');
    assert.equal(ranked[2].presetId, 'c');
    assert.equal(ranked[0].rank, 1);
    assert.equal(ranked[1].rank, 2);
    assert.equal(ranked[2].rank, 3);
  });

  it('uses net_profit as tiebreaker when profit_factor is equal', () => {
    const candidates = [
      { presetId: 'a', symbol: 'AAPL', decision: 'promote', metrics: { profit_factor: 2.0, net_profit: 100 } },
      { presetId: 'b', symbol: 'MSFT', decision: 'promote', metrics: { profit_factor: 2.0, net_profit: 300 } },
    ];
    const ranked = rankCandidates(candidates);
    assert.equal(ranked[0].presetId, 'b');
    assert.equal(ranked[1].presetId, 'a');
  });

  it('uses stable sort — original order preserved for identical metrics', () => {
    const candidates = [
      { presetId: 'a', symbol: 'AAPL', decision: 'promote', metrics: { profit_factor: 2.0, net_profit: 100 } },
      { presetId: 'b', symbol: 'MSFT', decision: 'promote', metrics: { profit_factor: 2.0, net_profit: 100 } },
    ];
    const ranked = rankCandidates(candidates);
    assert.equal(ranked[0].presetId, 'a');
    assert.equal(ranked[1].presetId, 'b');
  });

  it('returns empty array for empty input', () => {
    assert.deepEqual(rankCandidates([]), []);
  });

  it('does not include non-promote candidates in ranking', () => {
    const candidates = [
      { presetId: 'a', symbol: 'AAPL', decision: 'promote', metrics: { profit_factor: 2.0, net_profit: 100 } },
      { presetId: 'b', symbol: 'MSFT', decision: 'hold', metrics: { profit_factor: 1.1, net_profit: 10 } },
      { presetId: 'c', symbol: 'GOOG', decision: 'reject', metrics: { profit_factor: 0.5, net_profit: -100 } },
    ];
    const ranked = rankCandidates(candidates);
    assert.equal(ranked.length, 1);
    assert.equal(ranked[0].presetId, 'a');
  });
});

// ---------------------------------------------------------------------------
// gateAllRuns — gate an array of campaign effective_results
// ---------------------------------------------------------------------------
describe('gateAllRuns', () => {
  it('gates each run and returns gated entries with decision', () => {
    const runs = [
      {
        presetId: 'strat-a',
        symbol: 'AAPL',
        result: {
          success: true,
          tester_available: true,
          metrics: { net_profit: 1000, closed_trades: 30, percent_profitable: 50, profit_factor: 2.0, max_drawdown: 500 },
        },
      },
      {
        presetId: 'strat-b',
        symbol: 'MSFT',
        result: { success: false, error: 'timeout' },
      },
    ];
    const gated = gateAllRuns(runs);
    assert.equal(gated.length, 2);
    assert.equal(gated[0].decision, 'promote');
    assert.equal(gated[1].decision, 'reject');
  });

  it('preserves presetId and symbol on each gated entry', () => {
    const runs = [
      {
        presetId: 'strat-x',
        symbol: 'TSLA',
        result: {
          success: true,
          tester_available: true,
          metrics: { net_profit: 100, closed_trades: 10, percent_profitable: 45, profit_factor: 1.5, max_drawdown: 200 },
        },
      },
    ];
    const gated = gateAllRuns(runs);
    assert.equal(gated[0].presetId, 'strat-x');
    assert.equal(gated[0].symbol, 'TSLA');
  });

  it('preserves market and bucket metadata when present', () => {
    const runs = [
      {
        presetId: 'strat-x',
        symbol: 'TSLA',
        market: 'US',
        bucket: 'us-equity',
        label: 'Tesla',
        result: {
          success: true,
          tester_available: true,
          metrics: { net_profit: 100, closed_trades: 10, percent_profitable: 45, profit_factor: 1.5, max_drawdown: 200 },
        },
      },
    ];
    const gated = gateAllRuns(runs, { initialCapital: 10000 });
    assert.equal(gated[0].market, 'US');
    assert.equal(gated[0].bucket, 'us-equity');
    assert.equal(gated[0].label, 'Tesla');
    assert.equal(gated[0].metrics.max_drawdown_pct, 2);
  });

  it('accepts custom thresholds', () => {
    const runs = [
      {
        presetId: 'strat-a',
        symbol: 'AAPL',
        result: {
          success: true,
          tester_available: true,
          metrics: { net_profit: 100, closed_trades: 5, percent_profitable: 35, profit_factor: 1.1, max_drawdown: 200 },
        },
      },
    ];
    const strictThresholds = {
      promote: { min_profit_factor: 3.0, min_closed_trades: 50, min_percent_profitable: 70 },
      reject: { max_profit_factor: 0.3, max_drawdown_pct: 90 },
    };
    const gated = gateAllRuns(runs, { thresholds: strictThresholds });
    assert.equal(gated[0].decision, 'hold');
  });

  it('returns empty array for empty input', () => {
    assert.deepEqual(gateAllRuns([]), []);
  });
});

// ---------------------------------------------------------------------------
// buildGatedSummary — additive artifact for post-campaign gating analysis
// ---------------------------------------------------------------------------
describe('buildGatedSummary', () => {
  const runs = [
    {
      presetId: 'strat-a',
      symbol: 'AAPL',
      result: {
        success: true,
        tester_available: true,
        metrics: { net_profit: 2000, closed_trades: 50, percent_profitable: 55, profit_factor: 2.5, max_drawdown: 400 },
      },
    },
    {
      presetId: 'strat-a',
      symbol: 'MSFT',
      result: {
        success: true,
        tester_available: true,
        metrics: { net_profit: 500, closed_trades: 20, percent_profitable: 45, profit_factor: 1.3, max_drawdown: 300 },
      },
    },
    {
      presetId: 'strat-b',
      symbol: 'AAPL',
      result: { success: false, error: 'timeout' },
    },
  ];

  it('produces a summary with counts by decision', () => {
    const summary = buildGatedSummary({ campaignId: 'test-campaign', phase: 'full', effectiveRuns: runs });
    assert.equal(summary.campaign_id, 'test-campaign');
    assert.equal(summary.phase, 'full');
    assert.equal(typeof summary.counts.promote, 'number');
    assert.equal(typeof summary.counts.hold, 'number');
    assert.equal(typeof summary.counts.reject, 'number');
    assert.equal(summary.counts.promote + summary.counts.hold + summary.counts.reject, 3);
  });

  it('includes ranked_candidates array sorted by rank', () => {
    const summary = buildGatedSummary({ campaignId: 'test-campaign', phase: 'full', effectiveRuns: runs });
    assert.ok(Array.isArray(summary.ranked_candidates));
    if (summary.ranked_candidates.length > 1) {
      assert.ok(summary.ranked_candidates[0].rank <= summary.ranked_candidates[1].rank);
    }
  });

  it('includes all gated entries', () => {
    const summary = buildGatedSummary({ campaignId: 'test-campaign', phase: 'full', effectiveRuns: runs });
    assert.ok(Array.isArray(summary.gated_results));
    assert.equal(summary.gated_results.length, 3);
  });

  it('includes generated_at timestamp', () => {
    const summary = buildGatedSummary({ campaignId: 'test-campaign', phase: 'full', effectiveRuns: runs });
    assert.ok(summary.generated_at);
    assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(summary.generated_at));
  });

  it('includes thresholds used in the summary', () => {
    const summary = buildGatedSummary({ campaignId: 'test-campaign', phase: 'full', effectiveRuns: runs });
    assert.ok(summary.thresholds);
    assert.ok(summary.thresholds.promote);
    assert.ok(summary.thresholds.reject);
  });

  it('passes initial capital through to gated results for drawdown percentage', () => {
    const summary = buildGatedSummary({
      campaignId: 'test-campaign',
      phase: 'full',
      effectiveRuns: runs,
      initialCapital: 10000,
    });
    assert.equal(summary.gated_results[0].metrics.max_drawdown_pct, 4);
  });

  it('handles empty effectiveRuns gracefully', () => {
    const summary = buildGatedSummary({ campaignId: 'empty', phase: 'smoke', effectiveRuns: [] });
    assert.equal(summary.counts.promote, 0);
    assert.equal(summary.counts.hold, 0);
    assert.equal(summary.counts.reject, 0);
    assert.deepEqual(summary.ranked_candidates, []);
    assert.deepEqual(summary.gated_results, []);
  });

  it('attaches additive confluence/community/provider snapshots when supplied', () => {
    const summary = buildGatedSummary({
      campaignId: 'test-campaign',
      phase: 'full',
      effectiveRuns: runs,
      marketSnapshots: {
        AAPL: {
          analysis: {
            overall_summary: {
              confluence_score: 72,
              confluence_label: 'favourable',
              confluence_breakdown: { trend: { contribution: 20 } },
              coverage_summary: { core_available: 3 },
              provider_coverage_summary: { available_count: 4 },
            },
            provider_status: {
              quote: { status: 'ok' },
            },
            community_snapshot: {
              counts: { x: 2, reddit: 1, total: 3 },
            },
          },
        },
      },
    });

    const aapl = summary.gated_results.find((entry) => entry.symbol === 'AAPL');
    assert.deepEqual(aapl.confluence_snapshot, {
      score: 72,
      label: 'favourable',
      breakdown: { trend: { contribution: 20 } },
      coverage_summary: { core_available: 3 },
      provider_coverage_summary: { available_count: 4 },
    });
    assert.deepEqual(aapl.provider_status, {
      quote: { status: 'ok' },
    });
    assert.deepEqual(aapl.community_snapshot, {
      counts: { x: 2, reddit: 1, total: 3 },
    });
  });

  it('matches market snapshots case-insensitively by symbol', () => {
    const summary = buildGatedSummary({
      campaignId: 'test-campaign',
      phase: 'full',
      effectiveRuns: runs.map((run) => ({ ...run, symbol: run.symbol.toLowerCase() })),
      marketSnapshots: {
        AAPL: {
          analysis: {
            overall_summary: {
              confluence_score: 72,
              confluence_label: 'favourable',
              confluence_breakdown: { trend: { contribution: 20 } },
              coverage_summary: { core_available: 3 },
              provider_coverage_summary: { available_count: 4 },
            },
            provider_status: {
              quote: { status: 'ok' },
            },
            community_snapshot: {
              counts: { x: 2, reddit: 1, total: 3 },
            },
          },
        },
      },
    });

    const aapl = summary.gated_results.find((entry) => entry.symbol === 'aapl');
    assert.equal(aapl.confluence_snapshot.score, 72);
    assert.deepEqual(aapl.provider_status, {
      quote: { status: 'ok' },
    });
  });

  it('matches lowercase snapshot keys to uppercase run symbols', () => {
    const summary = buildGatedSummary({
      campaignId: 'test-campaign',
      phase: 'full',
      effectiveRuns: runs,
      marketSnapshots: {
        aapl: {
          analysis: {
            overall_summary: {
              confluence_score: 72,
              confluence_label: 'favourable',
              confluence_breakdown: { trend: { contribution: 20 } },
              coverage_summary: { core_available: 3 },
              provider_coverage_summary: { available_count: 4 },
            },
            provider_status: {
              quote: { status: 'ok' },
            },
            community_snapshot: {
              counts: { x: 2, reddit: 1, total: 3 },
            },
          },
        },
      },
    });

    const aapl = summary.gated_results.find((entry) => entry.symbol === 'AAPL');
    assert.equal(aapl.confluence_snapshot.score, 72);
    assert.deepEqual(aapl.provider_status, {
      quote: { status: 'ok' },
    });
  });

  it('keeps provider/community enrichment for schema-shaped failed analyses', () => {
    const summary = buildGatedSummary({
      campaignId: 'test-campaign',
      phase: 'full',
      effectiveRuns: runs,
      marketSnapshots: {
        AAPL: {
          success: false,
          symbol: 'AAPL',
          inputs: {
            fundamentals_missing_reason: 'fetch_failed',
          },
          analysis: {
            overall_summary: {
              confluence_score: 50,
              confluence_label: 'mixed',
              confluence_breakdown: { fundamentals: { contribution: 0 } },
              coverage_summary: { core_available: 2 },
              provider_coverage_summary: { available_count: 3 },
            },
            provider_status: {
              fundamentals: { status: 'provider_error', missing_reason: 'fetch_failed' },
            },
            community_snapshot: {
              counts: { x: 0, reddit: 0, total: 0 },
            },
          },
        },
      },
    });

    const aapl = summary.gated_results.find((entry) => entry.symbol === 'AAPL');
    assert.equal(aapl.confluence_snapshot.label, 'mixed');
    assert.deepEqual(aapl.provider_status, {
      fundamentals: { status: 'provider_error', missing_reason: 'fetch_failed' },
    });
    assert.deepEqual(aapl.community_snapshot, {
      counts: { x: 0, reddit: 0, total: 0 },
    });
  });
});
