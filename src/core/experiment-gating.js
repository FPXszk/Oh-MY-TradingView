// ---------------------------------------------------------------------------
// Experiment Gating — deterministic gate decisions for campaign/backtest runs
// ---------------------------------------------------------------------------
// Additive module: does NOT modify existing campaign/backtest output contracts.
// Provides numeric metric normalization, gate decisions (promote/hold/reject),
// stable ranking, and summary artifact builders.
// ---------------------------------------------------------------------------

const METRIC_KEYS = [
  'net_profit',
  'closed_trades',
  'percent_profitable',
  'profit_factor',
  'max_drawdown',
];

export const DEFAULT_GATE_THRESHOLDS = Object.freeze({
  promote: {
    min_profit_factor: 1.2,
    min_closed_trades: 10,
    min_percent_profitable: 35,
  },
  reject: {
    max_profit_factor: 0.8,
    max_drawdown_pct: 80,
  },
});

function metricSummary(metrics) {
  return {
    net_profit: metrics.net_profit ?? null,
    closed_trades: metrics.closed_trades ?? null,
    percent_profitable: metrics.percent_profitable ?? null,
    profit_factor: metrics.profit_factor ?? null,
    max_drawdown: metrics.max_drawdown ?? null,
  };
}

export function computeMaxDrawdownPct(maxDrawdown, initialCapital) {
  if (!Number.isFinite(maxDrawdown) || !Number.isFinite(initialCapital) || initialCapital <= 0) {
    return null;
  }
  return Number(((maxDrawdown / initialCapital) * 100).toFixed(4));
}

// ---------------------------------------------------------------------------
// normalizeNumericMetric — parse raw metric value to finite number or null
// ---------------------------------------------------------------------------
export function normalizeNumericMetric(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  let text = value.trim();
  if (text.length === 0) {
    return null;
  }

  // Handle negative numbers in accounting-style parentheses: (1234.00) → -1234
  const parenMatch = text.match(/^\(([0-9,]+\.?\d*)\)$/);
  if (parenMatch) {
    const inner = parenMatch[1].replace(/,/g, '');
    const parsed = Number(inner);
    return Number.isFinite(parsed) ? -parsed : null;
  }

  // Strip currency symbols, percent signs, whitespace, commas
  text = text.replace(/[¥$€£%]/g, '').replace(/\s*(USD|JPY|EUR|GBP)\s*/gi, '').replace(/,/g, '').trim();

  if (text.length === 0) {
    return null;
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

// ---------------------------------------------------------------------------
// normalizeRunMetrics — extract normalized metrics from a campaign run entry
// ---------------------------------------------------------------------------
export function normalizeRunMetrics(run) {
  const result = run?.result;
  if (!result || result.success !== true) {
    return Object.fromEntries(METRIC_KEYS.map((key) => [key, null]));
  }

  // Prefer metrics from tester, fallback to fallback_metrics for degraded results
  const source = result.tester_available
    ? result.metrics
    : (result.degraded_result && result.fallback_metrics)
      ? result.fallback_metrics
      : result.metrics;

  if (!source || typeof source !== 'object') {
    return Object.fromEntries(METRIC_KEYS.map((key) => [key, null]));
  }

  const normalized = {};
  for (const key of METRIC_KEYS) {
    normalized[key] = normalizeNumericMetric(source[key]);
  }
  return normalized;
}

// ---------------------------------------------------------------------------
// gateDecision — deterministic promote/hold/reject
// ---------------------------------------------------------------------------
export function gateDecision(metrics, thresholds = DEFAULT_GATE_THRESHOLDS, { initialCapital } = {}) {
  const reasons = [];

  // Count how many metrics are available
  const available = METRIC_KEYS.filter((key) => metrics[key] !== null);
  if (available.length === 0) {
    return { decision: 'reject', reasons: ['Insufficient metric data — all metrics null'] };
  }

  const promote = thresholds.promote ?? {};
  const reject = thresholds.reject ?? {};

  // Reject checks (hard failures)
  if (metrics.profit_factor !== null && reject.max_profit_factor != null && metrics.profit_factor <= reject.max_profit_factor) {
    reasons.push(`profit_factor ${metrics.profit_factor} <= reject threshold ${reject.max_profit_factor}`);
  }

  const maxDrawdownPct = computeMaxDrawdownPct(metrics.max_drawdown, initialCapital);
  if (maxDrawdownPct !== null && reject.max_drawdown_pct != null && maxDrawdownPct >= reject.max_drawdown_pct) {
    reasons.push(`max_drawdown_pct ${maxDrawdownPct} >= reject threshold ${reject.max_drawdown_pct}`);
  }

  if (reasons.length > 0) {
    return { decision: 'reject', reasons };
  }

  // Promote checks (all must pass)
  const promoteChecks = [
    ['profit_factor', promote.min_profit_factor],
    ['closed_trades', promote.min_closed_trades],
    ['percent_profitable', promote.min_percent_profitable],
    ['net_profit', promote.min_net_profit],
  ];

  const activePromoteChecks = promoteChecks.filter(([, threshold]) => threshold != null);
  let allPromotePassed = activePromoteChecks.length > 0;
  for (const [metricName, threshold] of activePromoteChecks) {
    const metricValue = metrics[metricName];
    if (metricValue === null) {
      reasons.push(`${metricName} is missing for promote threshold ${threshold}`);
      allPromotePassed = false;
      continue;
    }
    if (metricValue < threshold) {
      reasons.push(`${metricName} ${metricValue} < promote threshold ${threshold}`);
      allPromotePassed = false;
    }
  }

  if (allPromotePassed) {
    return { decision: 'promote', reasons: [] };
  }

  return { decision: 'hold', reasons };
}

// ---------------------------------------------------------------------------
// rankCandidates — stable ranking of promoted candidates
// ---------------------------------------------------------------------------
export function rankCandidates(candidates) {
  const promoted = candidates.filter((c) => c.decision === 'promote');

  const sorted = promoted
    .map((c, index) => ({ ...c, _originalIndex: index }))
    .sort((a, b) => {
      const pfA = a.metrics?.profit_factor ?? 0;
      const pfB = b.metrics?.profit_factor ?? 0;
      if (pfB !== pfA) return pfB - pfA;

      const npA = a.metrics?.net_profit ?? 0;
      const npB = b.metrics?.net_profit ?? 0;
      if (npB !== npA) return npB - npA;

      return a._originalIndex - b._originalIndex;
    });

  return sorted.map((entry, index) => {
    const { _originalIndex, ...rest } = entry;
    return { ...rest, rank: index + 1 };
  });
}

// ---------------------------------------------------------------------------
// gateAllRuns — gate an entire array of campaign effective_results
// ---------------------------------------------------------------------------
export function gateAllRuns(runs, { thresholds = DEFAULT_GATE_THRESHOLDS, initialCapital } = {}) {
  return runs.map((run) => {
    const metrics = normalizeRunMetrics(run);
    const maxDrawdownPct = computeMaxDrawdownPct(metrics.max_drawdown, initialCapital);
    const gate = gateDecision(metrics, thresholds, { initialCapital });
    return {
      presetId: run.presetId,
      symbol: run.symbol,
      market: run.market,
      bucket: run.bucket,
      label: run.label,
      metrics: {
        ...metricSummary(metrics),
        max_drawdown_pct: maxDrawdownPct,
      },
      decision: gate.decision,
      reasons: gate.reasons,
    };
  });
}

// ---------------------------------------------------------------------------
// buildGatedSummary — additive artifact for post-campaign gating analysis
// ---------------------------------------------------------------------------
export function buildGatedSummary({
  campaignId,
  phase,
  effectiveRuns,
  thresholds = DEFAULT_GATE_THRESHOLDS,
  initialCapital,
}) {
  const gated = gateAllRuns(effectiveRuns, { thresholds, initialCapital });
  const ranked = rankCandidates(gated);

  const counts = { promote: 0, hold: 0, reject: 0 };
  for (const entry of gated) {
    counts[entry.decision] = (counts[entry.decision] ?? 0) + 1;
  }

  return {
    campaign_id: campaignId,
    phase,
    generated_at: new Date().toISOString(),
    thresholds,
    counts,
    ranked_candidates: ranked,
    gated_results: gated,
  };
}
