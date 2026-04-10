import { computeMaxDrawdownPct, normalizeRunMetrics } from './experiment-gating.js';

const DEFAULT_TOP_LIMIT = 10;

function roundNumber(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return null;
  }
  return Number(value.toFixed(digits));
}

function average(values, digits = 2) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }
  return roundNumber(values.reduce((sum, value) => sum + value, 0) / values.length, digits);
}

function median(values, digits = 2) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return roundNumber(sorted[middle], digits);
  }
  return roundNumber((sorted[middle - 1] + sorted[middle]) / 2, digits);
}

function hasAnyMetric(metrics) {
  return Object.values(metrics || {}).some((value) => value !== null);
}

function summarizeNumericMetrics(entries, { initialCapital } = {}) {
  const netProfits = entries.map((entry) => entry.metrics.net_profit).filter(Number.isFinite);
  const profitFactors = entries.map((entry) => entry.metrics.profit_factor).filter(Number.isFinite);
  const maxDrawdowns = entries.map((entry) => entry.metrics.max_drawdown).filter(Number.isFinite);
  const closedTrades = entries.map((entry) => entry.metrics.closed_trades).filter(Number.isFinite);
  const percentProfitable = entries.map((entry) => entry.metrics.percent_profitable).filter(Number.isFinite);
  const maxDrawdownPcts = maxDrawdowns
    .map((value) => computeMaxDrawdownPct(value, initialCapital))
    .filter(Number.isFinite);

  const positiveRunCount = netProfits.filter((value) => value > 0).length;
  const avgNetProfit = average(netProfits, 2);
  const avgMaxDrawdown = average(maxDrawdowns, 2);

  return {
    avg_net_profit: avgNetProfit,
    median_net_profit: median(netProfits, 2),
    avg_profit_factor: average(profitFactors, 4),
    median_profit_factor: median(profitFactors, 4),
    avg_max_drawdown: avgMaxDrawdown,
    avg_max_drawdown_pct: average(maxDrawdownPcts, 4),
    avg_closed_trades: average(closedTrades, 2),
    avg_percent_profitable: average(percentProfitable, 2),
    positive_run_rate: entries.length > 0
      ? roundNumber((positiveRunCount / entries.length) * 100, 2)
      : null,
    profit_to_drawdown_ratio:
      Number.isFinite(avgNetProfit) && Number.isFinite(avgMaxDrawdown) && avgMaxDrawdown > 0
        ? roundNumber(avgNetProfit / avgMaxDrawdown, 4)
        : null,
  };
}

function sortByNetProfitDesc(entries) {
  return [...entries].sort((left, right) => {
    const rightNet = right.metrics.net_profit ?? Number.NEGATIVE_INFINITY;
    const leftNet = left.metrics.net_profit ?? Number.NEGATIVE_INFINITY;
    if (rightNet !== leftNet) {
      return rightNet - leftNet;
    }

    const rightPf = right.metrics.profit_factor ?? Number.NEGATIVE_INFINITY;
    const leftPf = left.metrics.profit_factor ?? Number.NEGATIVE_INFINITY;
    if (rightPf !== leftPf) {
      return rightPf - leftPf;
    }

    return String(left.symbol).localeCompare(String(right.symbol));
  });
}

function sortByNetProfitAsc(entries) {
  return [...entries].sort((left, right) => {
    const leftNet = left.metrics.net_profit ?? Number.POSITIVE_INFINITY;
    const rightNet = right.metrics.net_profit ?? Number.POSITIVE_INFINITY;
    if (leftNet !== rightNet) {
      return leftNet - rightNet;
    }

    const leftPf = left.metrics.profit_factor ?? Number.POSITIVE_INFINITY;
    const rightPf = right.metrics.profit_factor ?? Number.POSITIVE_INFINITY;
    if (leftPf !== rightPf) {
      return leftPf - rightPf;
    }

    return String(left.symbol).localeCompare(String(right.symbol));
  });
}

function buildRunMetricEntry(entry, { initialCapital } = {}) {
  return {
    symbol: entry.symbol,
    label: entry.label ?? entry.symbol,
    market: entry.market ?? null,
    presetId: entry.presetId,
    net_profit: entry.metrics.net_profit,
    profit_factor: entry.metrics.profit_factor,
    max_drawdown: entry.metrics.max_drawdown,
    max_drawdown_pct: computeMaxDrawdownPct(entry.metrics.max_drawdown, initialCapital),
    closed_trades: entry.metrics.closed_trades,
    percent_profitable: entry.metrics.percent_profitable,
  };
}

function normalizeEntries(runs) {
  return (Array.isArray(runs) ? runs : [])
    .map((run, index) => {
      const metrics = normalizeRunMetrics(run);
      return {
        index,
        presetId: run?.presetId ?? null,
        symbol: run?.symbol ?? null,
        label: run?.label ?? run?.symbol ?? null,
        market: run?.market ?? null,
        success: run?.result?.success === true,
        metrics,
      };
    })
    .filter((entry) => entry.presetId && entry.symbol);
}

export function summarizeStrategyRuns(runs, { initialCapital = 10000, topLimit = DEFAULT_TOP_LIMIT } = {}) {
  const normalized = normalizeEntries(runs);
  const groups = new Map();

  for (const entry of normalized) {
    const current = groups.get(entry.presetId) ?? {
      presetId: entry.presetId,
      market: entry.market,
      firstIndex: entry.index,
      runs: [],
      validRuns: [],
      successCount: 0,
    };
    current.runs.push(entry);
    if (entry.success) {
      current.successCount += 1;
    }
    if (hasAnyMetric(entry.metrics)) {
      current.validRuns.push(entry);
    }
    groups.set(entry.presetId, current);
  }

  return [...groups.values()]
    .sort((left, right) => left.firstIndex - right.firstIndex)
    .map((group) => {
      const metricSummary = summarizeNumericMetrics(group.validRuns, { initialCapital });
      return {
        presetId: group.presetId,
        market: group.market,
        run_count: group.runs.length,
        success_count: group.successCount,
        ...metricSummary,
        top_symbols: sortByNetProfitDesc(group.validRuns)
          .slice(0, topLimit)
          .map((entry) => buildRunMetricEntry(entry, { initialCapital })),
        worst_symbols: sortByNetProfitAsc(group.validRuns)
          .slice(0, topLimit)
          .map((entry) => buildRunMetricEntry(entry, { initialCapital })),
      };
    });
}

function pickBestPreset(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return null;
  }

  const sorted = [...entries].sort((left, right) => {
    const rightNet = right.metrics.net_profit ?? Number.NEGATIVE_INFINITY;
    const leftNet = left.metrics.net_profit ?? Number.NEGATIVE_INFINITY;
    if (rightNet !== leftNet) {
      return rightNet - leftNet;
    }

    const rightPf = right.metrics.profit_factor ?? Number.NEGATIVE_INFINITY;
    const leftPf = left.metrics.profit_factor ?? Number.NEGATIVE_INFINITY;
    if (rightPf !== leftPf) {
      return rightPf - leftPf;
    }

    const leftDd = left.metrics.max_drawdown ?? Number.POSITIVE_INFINITY;
    const rightDd = right.metrics.max_drawdown ?? Number.POSITIVE_INFINITY;
    if (leftDd !== rightDd) {
      return leftDd - rightDd;
    }

    return left.index - right.index;
  });

  return sorted[0];
}

export function summarizeSymbolRuns(runs, { initialCapital = 10000 } = {}) {
  const normalized = normalizeEntries(runs);
  const groups = new Map();

  for (const entry of normalized) {
    const current = groups.get(entry.symbol) ?? {
      symbol: entry.symbol,
      label: entry.label ?? entry.symbol,
      market: entry.market,
      firstIndex: entry.index,
      runs: [],
      validRuns: [],
      successCount: 0,
    };
    current.runs.push(entry);
    if (entry.success) {
      current.successCount += 1;
    }
    if (hasAnyMetric(entry.metrics)) {
      current.validRuns.push(entry);
    }
    groups.set(entry.symbol, current);
  }

  return [...groups.values()]
    .sort((left, right) => left.firstIndex - right.firstIndex)
    .map((group) => {
      const metricSummary = summarizeNumericMetrics(group.validRuns, { initialCapital });
      const bestPreset = pickBestPreset(group.validRuns);
      return {
        symbol: group.symbol,
        label: group.label,
        market: group.market,
        run_count: group.runs.length,
        success_count: group.successCount,
        best_preset_id: bestPreset?.presetId ?? null,
        best_net_profit: bestPreset?.metrics.net_profit ?? null,
        ...metricSummary,
      };
    });
}

export function rankStrategySummaries(summaries) {
  return [...(Array.isArray(summaries) ? summaries : [])]
    .map((entry, index) => ({ ...entry, _originalIndex: index }))
    .sort((left, right) => {
      const rightPf = right.avg_profit_factor ?? Number.NEGATIVE_INFINITY;
      const leftPf = left.avg_profit_factor ?? Number.NEGATIVE_INFINITY;
      if (rightPf !== leftPf) {
        return rightPf - leftPf;
      }

      const rightNet = right.avg_net_profit ?? Number.NEGATIVE_INFINITY;
      const leftNet = left.avg_net_profit ?? Number.NEGATIVE_INFINITY;
      if (rightNet !== leftNet) {
        return rightNet - leftNet;
      }

      const leftDdPct = left.avg_max_drawdown_pct ?? Number.POSITIVE_INFINITY;
      const rightDdPct = right.avg_max_drawdown_pct ?? Number.POSITIVE_INFINITY;
      if (leftDdPct !== rightDdPct) {
        return leftDdPct - rightDdPct;
      }

      return left._originalIndex - right._originalIndex;
    })
    .map((entry, index) => {
      const { _originalIndex, ...rest } = entry;
      return { ...rest, rank: index + 1 };
    });
}

function rankSymbolSummaries(summaries, direction = 'desc') {
  return [...(Array.isArray(summaries) ? summaries : [])].sort((left, right) => {
    const leftNet = left.avg_net_profit ?? (direction === 'desc' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY);
    const rightNet = right.avg_net_profit ?? (direction === 'desc' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY);
    if (leftNet !== rightNet) {
      return direction === 'desc' ? rightNet - leftNet : leftNet - rightNet;
    }

    const leftPf = left.avg_profit_factor ?? (direction === 'desc' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY);
    const rightPf = right.avg_profit_factor ?? (direction === 'desc' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY);
    if (leftPf !== rightPf) {
      return direction === 'desc' ? rightPf - leftPf : leftPf - rightPf;
    }

    return String(left.symbol).localeCompare(String(right.symbol));
  });
}

export function summarizeMarketCampaign({
  runs,
  market = null,
  initialCapital = 10000,
  topLimit = DEFAULT_TOP_LIMIT,
} = {}) {
  const filteredRuns = market
    ? (Array.isArray(runs) ? runs.filter((run) => run?.market === market) : [])
    : (Array.isArray(runs) ? runs : []);

  const strategySummaries = summarizeStrategyRuns(filteredRuns, { initialCapital, topLimit });
  const symbolSummaries = summarizeSymbolRuns(filteredRuns, { initialCapital });

  return {
    market,
    total_runs: filteredRuns.length,
    strategy_summaries: strategySummaries,
    ranked_strategies: rankStrategySummaries(strategySummaries),
    symbol_summaries: symbolSummaries,
    top_symbols: rankSymbolSummaries(symbolSummaries, 'desc').slice(0, topLimit),
    worst_symbols: rankSymbolSummaries(symbolSummaries, 'asc').slice(0, topLimit),
  };
}

export function buildCombinedStrategyRanking(marketSummaries, { topLimit = DEFAULT_TOP_LIMIT } = {}) {
  const strategyRows = (Array.isArray(marketSummaries) ? marketSummaries : [])
    .flatMap((summary) => (summary?.strategy_summaries || []).map((entry) => ({
      ...entry,
      market: entry.market ?? summary?.market ?? null,
    })));

  return rankStrategySummaries(strategyRows).slice(0, topLimit);
}
