const CORE_INPUTS = ['quote', 'fundamentals', 'ta'];
const ALL_INPUTS = ['quote', 'fundamentals', 'ta', 'news'];

const CONFIDENCE_SCALE = {
  high: 1,
  medium: 0.7,
  low: 0.4,
};

const COMPONENT_RULES = {
  trend: {
    weight: 20,
    directionMap: {
      bullish: 1,
      neutral: 0,
      bearish: -1,
      unknown: 0,
    },
  },
  fundamentals: {
    weight: 17,
    directionMap: {
      strong: 1,
      fair: 0,
      weak: -1,
      unknown: 0,
    },
  },
  risk: {
    weight: 13,
    directionMap: {
      low: 1,
      moderate: 0,
      elevated: -1,
      unknown: 0,
    },
  },
};

function clampScore(value) {
  return Math.max(0, Math.min(100, value));
}

function normalizeConfidence(confidence) {
  return CONFIDENCE_SCALE[confidence] ?? CONFIDENCE_SCALE.low;
}

function mapConfluenceLabel(score) {
  if (score >= 70) {
    return 'favourable';
  }
  if (score >= 60) {
    return 'leaning_positive';
  }
  if (score <= 30) {
    return 'unfavourable';
  }
  if (score <= 40) {
    return 'leaning_negative';
  }
  return 'mixed';
}

function buildBreakdownEntry(name, analyst) {
  const rule = COMPONENT_RULES[name];
  const stance = analyst?.stance ?? 'unknown';
  const confidence = analyst?.confidence ?? 'low';
  const direction = rule.directionMap[stance] ?? 0;
  const contribution = Math.round(direction * rule.weight * normalizeConfidence(confidence));

  return {
    stance,
    confidence,
    direction,
    max_points: rule.weight,
    contribution,
  };
}

export function buildCoverageSummary(inputCoverage = {}) {
  const available_inputs = ALL_INPUTS.filter((key) => inputCoverage[key]);
  const missing_inputs = ALL_INPUTS.filter((key) => !inputCoverage[key]);
  const core_available = CORE_INPUTS.filter((key) => inputCoverage[key]).length;

  return {
    core_available,
    core_total: CORE_INPUTS.length,
    news_available: Boolean(inputCoverage.news),
    available_inputs,
    missing_inputs,
    is_degraded: core_available < 2,
  };
}

export function computeConfluenceSummary(
  trend,
  fundamentals,
  news,
  risk,
  inputCoverage = {},
) {
  const confluence_breakdown = {
    trend: buildBreakdownEntry('trend', trend),
    fundamentals: buildBreakdownEntry('fundamentals', fundamentals),
    risk: buildBreakdownEntry('risk', risk),
    news: {
      stance: news?.stance ?? 'unknown',
      confidence: news?.confidence ?? 'low',
      role: 'coverage_only',
      contribution: 0,
    },
  };
  const coverage_summary = buildCoverageSummary(inputCoverage);
  const warnings = [];

  if (coverage_summary.is_degraded) {
    warnings.push('Overall summary degraded: fewer than two core datasets are available');
  }

  const raw_score = 50
    + confluence_breakdown.trend.contribution
    + confluence_breakdown.fundamentals.contribution
    + confluence_breakdown.risk.contribution;
  const confluence_score = coverage_summary.is_degraded ? 50 : clampScore(raw_score);
  const confluence_label = coverage_summary.is_degraded ? 'mixed' : mapConfluenceLabel(confluence_score);

  return {
    confluence_score,
    confluence_label,
    confluence_breakdown,
    coverage_summary,
    warnings,
  };
}
