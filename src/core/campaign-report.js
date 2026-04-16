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
        symbol_results: sortByNetProfitDesc(group.validRuns)
          .map((entry) => buildRunMetricEntry(entry, { initialCapital })),
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
  const summaries = Array.isArray(marketSummaries) ? marketSummaries : [];
  const combined = new Map();

  for (const summary of summaries) {
    const strategyRows = Array.isArray(summary?.strategy_summaries) ? summary.strategy_summaries : [];
    const market = summary?.market ?? null;
    const netRanks = new Map(
      [...strategyRows]
        .sort((left, right) => {
          const rightNet = right.avg_net_profit ?? Number.NEGATIVE_INFINITY;
          const leftNet = left.avg_net_profit ?? Number.NEGATIVE_INFINITY;
          if (rightNet !== leftNet) {
            return rightNet - leftNet;
          }
          return String(left.presetId).localeCompare(String(right.presetId));
        })
        .map((entry, index) => [entry.presetId, index + 1]),
    );
    const pfRanks = new Map(
      [...strategyRows]
        .sort((left, right) => {
          const rightPf = right.avg_profit_factor ?? Number.NEGATIVE_INFINITY;
          const leftPf = left.avg_profit_factor ?? Number.NEGATIVE_INFINITY;
          if (rightPf !== leftPf) {
            return rightPf - leftPf;
          }
          return String(left.presetId).localeCompare(String(right.presetId));
        })
        .map((entry, index) => [entry.presetId, index + 1]),
    );
    const ddRanks = new Map(
      [...strategyRows]
        .sort((left, right) => {
          const leftDd = left.avg_max_drawdown ?? Number.POSITIVE_INFINITY;
          const rightDd = right.avg_max_drawdown ?? Number.POSITIVE_INFINITY;
          if (leftDd !== rightDd) {
            return leftDd - rightDd;
          }
          return String(left.presetId).localeCompare(String(right.presetId));
        })
        .map((entry, index) => [entry.presetId, index + 1]),
    );

    for (const entry of strategyRows) {
      const current = combined.get(entry.presetId) ?? {
        presetId: entry.presetId,
        markets: new Set(),
        composite_score: 0,
        avg_net_profit_values: [],
        avg_profit_factor_values: [],
        avg_max_drawdown_values: [],
        avg_max_drawdown_pct_values: [],
        avg_closed_trades_values: [],
        avg_percent_profitable_values: [],
        symbol_results_map: new Map(),
      };
      current.markets.add(entry.market ?? market ?? 'Unknown');
      current.composite_score += (netRanks.get(entry.presetId) ?? 0)
        + (pfRanks.get(entry.presetId) ?? 0)
        + (ddRanks.get(entry.presetId) ?? 0);
      if (Number.isFinite(entry.avg_net_profit)) {
        current.avg_net_profit_values.push(entry.avg_net_profit);
      }
      if (Number.isFinite(entry.avg_profit_factor)) {
        current.avg_profit_factor_values.push(entry.avg_profit_factor);
      }
      if (Number.isFinite(entry.avg_max_drawdown)) {
        current.avg_max_drawdown_values.push(entry.avg_max_drawdown);
      }
      if (Number.isFinite(entry.avg_max_drawdown_pct)) {
        current.avg_max_drawdown_pct_values.push(entry.avg_max_drawdown_pct);
      }
      if (Number.isFinite(entry.avg_closed_trades)) {
        current.avg_closed_trades_values.push(entry.avg_closed_trades);
      }
      if (Number.isFinite(entry.avg_percent_profitable)) {
        current.avg_percent_profitable_values.push(entry.avg_percent_profitable);
      }
      for (const symbolResult of entry.symbol_results || []) {
        const symbolKey = `${symbolResult.market ?? entry.market ?? market ?? 'Unknown'}::${symbolResult.symbol}`;
        current.symbol_results_map.set(symbolKey, {
          ...symbolResult,
          market: symbolResult.market ?? entry.market ?? market ?? null,
        });
      }
      combined.set(entry.presetId, current);
    }
  }

  const ranked = [...combined.values()]
    .map((entry) => ({
      presetId: entry.presetId,
      markets: [...entry.markets].filter(Boolean).sort(),
      composite_score: entry.composite_score,
      avg_net_profit: average(entry.avg_net_profit_values, 2),
      avg_profit_factor: average(entry.avg_profit_factor_values, 4),
      avg_max_drawdown: average(entry.avg_max_drawdown_values, 2),
      avg_max_drawdown_pct: average(entry.avg_max_drawdown_pct_values, 4),
      avg_closed_trades: average(entry.avg_closed_trades_values, 2),
      avg_percent_profitable: average(entry.avg_percent_profitable_values, 2),
      symbol_results: [...entry.symbol_results_map.values()].sort((left, right) => {
        const rightNet = right.net_profit ?? Number.NEGATIVE_INFINITY;
        const leftNet = left.net_profit ?? Number.NEGATIVE_INFINITY;
        if (rightNet !== leftNet) {
          return rightNet - leftNet;
        }
        return String(left.symbol).localeCompare(String(right.symbol));
      }),
    }))
    .sort((left, right) => {
      if (left.composite_score !== right.composite_score) {
        return left.composite_score - right.composite_score;
      }

      const rightNet = right.avg_net_profit ?? Number.NEGATIVE_INFINITY;
      const leftNet = left.avg_net_profit ?? Number.NEGATIVE_INFINITY;
      if (rightNet !== leftNet) {
        return rightNet - leftNet;
      }

      const rightPf = right.avg_profit_factor ?? Number.NEGATIVE_INFINITY;
      const leftPf = left.avg_profit_factor ?? Number.NEGATIVE_INFINITY;
      if (rightPf !== leftPf) {
        return rightPf - leftPf;
      }

      const leftDdPct = left.avg_max_drawdown_pct ?? Number.POSITIVE_INFINITY;
      const rightDdPct = right.avg_max_drawdown_pct ?? Number.POSITIVE_INFINITY;
      if (leftDdPct !== rightDdPct) {
        return leftDdPct - rightDdPct;
      }

      return String(left.presetId).localeCompare(String(right.presetId));
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

  const limit = Number.isFinite(topLimit) && topLimit > 0 ? topLimit : ranked.length;
  return ranked.slice(0, limit);
}
