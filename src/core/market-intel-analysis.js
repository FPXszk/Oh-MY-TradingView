/**
 * Deterministic, schema-first symbol analysis.
 *
 * Aggregates data from the existing market-intel layer (quote, fundamentals,
 * news, TA summary) and runs rule-based analyst logic. No LLMs involved.
 */

import {
  getSymbolQuote,
  getSymbolFundamentals,
  getFinancialNews,
  getMultiSymbolTaSummary,
} from './market-intel.js';
import { computeConfluenceSummary } from './market-confluence.js';
import {
  buildProviderStatusEntry,
  classifyProviderFailure,
  summarizeProviderCoverage,
} from './market-provider-status.js';
import { buildMarketCommunitySnapshot } from './market-community-snapshot.js';

// ---------------------------------------------------------------------------
// Data collection — fetch all inputs with graceful degradation
// ---------------------------------------------------------------------------

function buildInputEntry(provider, settledResult, value, { allowEmptyAvailability = false, emptyReason = 'empty_payload' } = {}) {
  if (settledResult.status === 'rejected') {
    const failure = classifyProviderFailure(settledResult.reason, { provider });
    return buildProviderStatusEntry({
      provider,
      ...failure,
      available: false,
      signal_present: false,
    });
  }

  if (value) {
    return buildProviderStatusEntry({
      provider,
      status: 'ok',
      available: true,
      signal_present: true,
    });
  }

  if (allowEmptyAvailability) {
    return buildProviderStatusEntry({
      provider,
      status: 'no_results',
      available: true,
      signal_present: false,
      missing_reason: emptyReason,
    });
  }

  return buildProviderStatusEntry({
    provider,
    status: 'no_results',
    available: false,
    signal_present: false,
    missing_reason: emptyReason,
  });
}

function buildCommunityProviderStatus(communitySnapshot) {
  const providerEntries = Object.values(communitySnapshot?.provider_status || {}).filter(Boolean);
  const availableCount = communitySnapshot?.coverage_summary?.available_count
    ?? providerEntries.filter((entry) => entry.available).length;
  const allNotRequested = providerEntries.length > 0
    && providerEntries.every((entry) => entry.missing_reason === 'not_requested');

  if (allNotRequested) {
    return buildProviderStatusEntry({
      provider: 'community',
      status: 'skipped',
      available: false,
      signal_present: false,
      missing_reason: 'not_requested',
    });
  }

  if (communitySnapshot?.counts?.total > 0) {
    return buildProviderStatusEntry({
      provider: 'community',
      status: 'ok',
      available: true,
      signal_present: true,
    });
  }

  if (availableCount > 0) {
    return buildProviderStatusEntry({
      provider: 'community',
      status: 'no_results',
      available: true,
      signal_present: false,
      missing_reason: 'no_recent_items',
    });
  }

  return buildProviderStatusEntry({
    provider: 'community',
    status: 'degraded',
    available: false,
    signal_present: false,
    missing_reason: 'fetch_failed',
    warning: Array.isArray(communitySnapshot?.warnings) && communitySnapshot.warnings.length > 0
      ? communitySnapshot.warnings.join('; ')
      : null,
  });
}

async function collectInputs(symbol) {
  const [quoteResult, fundamentalsResult, taResult, newsResult, communityResult] = await Promise.allSettled([
    getSymbolQuote(symbol),
    getSymbolFundamentals(symbol),
    getMultiSymbolTaSummary([symbol]),
    getFinancialNews(symbol),
    buildMarketCommunitySnapshot({ symbol }),
  ]);

  const quote = quoteResult.status === 'fulfilled' ? quoteResult.value : null;
  const fundamentals = fundamentalsResult.status === 'fulfilled' ? fundamentalsResult.value : null;

  const taSummary = taResult.status === 'fulfilled' ? taResult.value.summaries?.[0] : null;
  const ta = taSummary?.success ? taSummary : null;

  const news = newsResult.status === 'fulfilled' ? newsResult.value : null;
  const communitySnapshot = communityResult.status === 'fulfilled'
    ? communityResult.value
    : {
      success: false,
      symbol,
      query: symbol,
      counts: { x: 0, reddit: 0, total: 0 },
      latest_observed_at: null,
      source_presence: { x: false, reddit: false },
      provider_status: {},
      coverage_summary: summarizeProviderCoverage([]),
      warnings: [],
      snapshot_at: new Date().toISOString(),
      source: 'community-snapshot',
    };

  const providerStatus = {
    quote: buildInputEntry('quote', quoteResult, quote),
    fundamentals: buildInputEntry('fundamentals', fundamentalsResult, fundamentals),
    ta: taSummary && !taSummary.success
      ? buildProviderStatusEntry({
        provider: 'ta',
        ...classifyProviderFailure(new Error(taSummary.error || 'TA request failed'), { provider: 'ta' }),
        available: false,
        signal_present: false,
      })
      : buildInputEntry('ta', taResult, ta),
    news: buildInputEntry('news', newsResult, news?.count > 0 ? news : null, {
      allowEmptyAvailability: newsResult.status === 'fulfilled' && Boolean(news),
      emptyReason: 'no_recent_items',
    }),
    community: buildCommunityProviderStatus(communitySnapshot),
  };

  return {
    quote,
    fundamentals,
    ta,
    news,
    communitySnapshot,
    providerStatus,
    missingReasons: {
      quote: providerStatus.quote.missing_reason,
      fundamentals: providerStatus.fundamentals.missing_reason,
      ta: providerStatus.ta.missing_reason,
      news: providerStatus.news.missing_reason,
    },
  };
}

// ---------------------------------------------------------------------------
// Trend analyst — RSI, SMA, price action
// ---------------------------------------------------------------------------

function analyzeTrend(quote, ta) {
  const signals = [];
  const warnings = [];
  let bullishPoints = 0;
  let bearishPoints = 0;

  if (!ta && !quote) {
    return { stance: 'neutral', confidence: 'low', signals: [], warnings: ['No trend data available'] };
  }

  if (ta) {
    const { rsi14, sma20, sma50, latestClose, sma20Deviation, sma50Deviation } = ta;

    if (rsi14 !== null && rsi14 !== undefined) {
      if (rsi14 > 70) {
        signals.push(`RSI(14) at ${rsi14} — overbought territory`);
        bearishPoints += 1;
        warnings.push('RSI indicates overbought conditions');
      } else if (rsi14 < 30) {
        signals.push(`RSI(14) at ${rsi14} — oversold territory`);
        bullishPoints += 1;
        warnings.push('RSI indicates oversold conditions');
      } else if (rsi14 >= 50) {
        signals.push(`RSI(14) at ${rsi14} — above midline`);
        bullishPoints += 1;
      } else {
        signals.push(`RSI(14) at ${rsi14} — below midline`);
        bearishPoints += 1;
      }
    }

    if (sma20 !== null && sma20 !== undefined && latestClose !== null) {
      if (latestClose > sma20) {
        signals.push(`Price above SMA20 (deviation: ${sma20Deviation ?? 'N/A'}%)`);
        bullishPoints += 1;
      } else if (latestClose < sma20) {
        signals.push(`Price below SMA20 (deviation: ${sma20Deviation ?? 'N/A'}%)`);
        bearishPoints += 1;
      } else {
        signals.push('Price at SMA20');
      }
    }

    if (sma50 !== null && sma50 !== undefined && latestClose !== null) {
      if (latestClose > sma50) {
        signals.push(`Price above SMA50 (deviation: ${sma50Deviation ?? 'N/A'}%)`);
        bullishPoints += 1;
      } else if (latestClose < sma50) {
        signals.push(`Price below SMA50 (deviation: ${sma50Deviation ?? 'N/A'}%)`);
        bearishPoints += 1;
      } else {
        signals.push('Price at SMA50');
      }
    }

    if (sma20 !== null && sma50 !== null && sma20 !== undefined && sma50 !== undefined) {
      if (sma20 > sma50) {
        signals.push('SMA20 above SMA50 — short-term trend favourable');
        bullishPoints += 1;
      } else if (sma20 < sma50) {
        signals.push('SMA20 below SMA50 — short-term trend unfavourable');
        bearishPoints += 1;
      }
    }
  }

  if (quote) {
    const { priceChangePercent } = quote;
    if (priceChangePercent !== null && priceChangePercent !== undefined) {
      if (priceChangePercent > 0) {
        signals.push(`Day change: +${priceChangePercent}%`);
        bullishPoints += 1;
      } else if (priceChangePercent < 0) {
        signals.push(`Day change: ${priceChangePercent}%`);
        bearishPoints += 1;
      } else {
        signals.push('Day change: 0%');
      }
    }
  }

  let stance;
  const net = bullishPoints - bearishPoints;
  if (net >= 2) {
    stance = 'bullish';
  } else if (net <= -2) {
    stance = 'bearish';
  } else {
    stance = 'neutral';
  }

  const total = bullishPoints + bearishPoints;
  let confidence;
  if (total === 0) {
    confidence = 'low';
  } else {
    const dominance = Math.abs(net) / total;
    if (dominance >= 0.6) {
      confidence = 'high';
    } else if (dominance >= 0.3) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }
  }

  return { stance, confidence, signals, warnings };
}

// ---------------------------------------------------------------------------
// Fundamentals analyst
// ---------------------------------------------------------------------------

function analyzeFundamentals(fundamentals) {
  if (!fundamentals) {
    return { stance: 'neutral', confidence: 'low', signals: [], warnings: ['Fundamentals data unavailable'] };
  }

  const signals = [];
  const warnings = [];
  let strongPoints = 0;
  let weakPoints = 0;

  const { profitMargins, revenueGrowth, earningsGrowth, returnOnEquity, debtToEquity, trailingPE, forwardPE } = fundamentals;

  if (profitMargins !== null && profitMargins !== undefined) {
    if (profitMargins > 0.15) {
      signals.push(`Profit margins: ${(profitMargins * 100).toFixed(1)}% — healthy`);
      strongPoints += 1;
    } else if (profitMargins > 0) {
      signals.push(`Profit margins: ${(profitMargins * 100).toFixed(1)}% — thin`);
    } else {
      signals.push(`Profit margins: ${(profitMargins * 100).toFixed(1)}% — negative`);
      weakPoints += 1;
    }
  }

  if (revenueGrowth !== null && revenueGrowth !== undefined) {
    if (revenueGrowth > 0.05) {
      signals.push(`Revenue growth: ${(revenueGrowth * 100).toFixed(1)}%`);
      strongPoints += 1;
    } else if (revenueGrowth >= 0) {
      signals.push(`Revenue growth: ${(revenueGrowth * 100).toFixed(1)}% — stagnant`);
    } else {
      signals.push(`Revenue growth: ${(revenueGrowth * 100).toFixed(1)}% — declining`);
      weakPoints += 1;
    }
  }

  if (earningsGrowth !== null && earningsGrowth !== undefined) {
    if (earningsGrowth > 0.05) {
      signals.push(`Earnings growth: ${(earningsGrowth * 100).toFixed(1)}%`);
      strongPoints += 1;
    } else if (earningsGrowth >= 0) {
      signals.push(`Earnings growth: ${(earningsGrowth * 100).toFixed(1)}% — flat`);
    } else {
      signals.push(`Earnings growth: ${(earningsGrowth * 100).toFixed(1)}% — declining`);
      weakPoints += 1;
    }
  }

  if (returnOnEquity !== null && returnOnEquity !== undefined) {
    if (returnOnEquity > 0.15) {
      signals.push(`ROE: ${(returnOnEquity * 100).toFixed(1)}% — strong`);
      strongPoints += 1;
    } else if (returnOnEquity > 0) {
      signals.push(`ROE: ${(returnOnEquity * 100).toFixed(1)}%`);
    } else {
      signals.push(`ROE: ${(returnOnEquity * 100).toFixed(1)}% — negative`);
      weakPoints += 1;
    }
  }

  if (debtToEquity !== null && debtToEquity !== undefined) {
    if (debtToEquity > 200) {
      signals.push(`Debt-to-equity: ${debtToEquity} — high leverage`);
      weakPoints += 1;
      warnings.push('High debt-to-equity ratio');
    } else if (debtToEquity > 100) {
      signals.push(`Debt-to-equity: ${debtToEquity} — moderate`);
    } else {
      signals.push(`Debt-to-equity: ${debtToEquity} — conservative`);
      strongPoints += 1;
    }
  }

  if (trailingPE !== null && trailingPE !== undefined) {
    signals.push(`Trailing P/E: ${trailingPE}`);
  }
  if (forwardPE !== null && forwardPE !== undefined) {
    signals.push(`Forward P/E: ${forwardPE}`);
  }

  let stance;
  if (strongPoints >= 3 && weakPoints === 0) {
    stance = 'strong';
  } else if (weakPoints >= 3) {
    stance = 'weak';
  } else if (strongPoints > weakPoints) {
    stance = 'strong';
  } else if (weakPoints > strongPoints) {
    stance = 'weak';
  } else {
    stance = 'fair';
  }

  const total = strongPoints + weakPoints;
  let confidence;
  if (total === 0) {
    confidence = 'low';
  } else {
    const dominance = Math.abs(strongPoints - weakPoints) / total;
    if (dominance >= 0.6) {
      confidence = 'high';
    } else if (dominance >= 0.3) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }
  }

  return { stance, confidence, signals, warnings };
}

// ---------------------------------------------------------------------------
// News analyst
// ---------------------------------------------------------------------------

function analyzeNews(newsData) {
  if (!newsData) {
    return { stance: 'neutral', confidence: 'low', signals: [], warnings: ['News data unavailable'] };
  }

  const signals = [];
  const warnings = [];
  const articles = newsData.news || [];

  if (articles.length === 0) {
    return { stance: 'quiet', confidence: 'medium', signals: ['No recent news articles found'], warnings: [] };
  }

  signals.push(`${articles.length} recent news article(s) found`);
  for (const article of articles.slice(0, 5)) {
    if (article.title) {
      signals.push(`${article.title} (${article.publisher || 'unknown'})`);
    }
  }

  const confidence = articles.length >= 5 ? 'high' : articles.length >= 2 ? 'medium' : 'low';

  return { stance: 'active', confidence, signals, warnings };
}

// ---------------------------------------------------------------------------
// Risk analyst
// ---------------------------------------------------------------------------

function analyzeRisk(quote, ta, fundamentals) {
  const signals = [];
  const warnings = [];
  let riskPoints = 0;
  let lowRiskSignals = 0;

  if (!quote && !ta && !fundamentals) {
    return {
      stance: 'unknown',
      confidence: 'low',
      signals: [],
      warnings: ['Risk data unavailable'],
    };
  }

  if (fundamentals) {
    const beta = fundamentals.beta;
    if (beta !== null && beta !== undefined) {
      if (beta > 1.5) {
        signals.push(`Beta: ${beta} — high volatility relative to market`);
        riskPoints += 2;
        warnings.push('High beta indicates above-market volatility');
      } else if (beta > 1.0) {
        signals.push(`Beta: ${beta} — moderate volatility`);
        riskPoints += 1;
      } else {
        signals.push(`Beta: ${beta} — low volatility relative to market`);
        lowRiskSignals += 1;
      }
    }

    const debtToEquity = fundamentals.debtToEquity;
    if (debtToEquity !== null && debtToEquity !== undefined) {
      if (debtToEquity > 200) {
        signals.push(`Debt-to-equity: ${debtToEquity} — high leverage risk`);
        riskPoints += 1;
        warnings.push('Elevated leverage risk');
      } else if (debtToEquity <= 100) {
        signals.push(`Debt-to-equity: ${debtToEquity} — leverage looks contained`);
        lowRiskSignals += 1;
      }
    }
  }

  if (ta) {
    const { rsi14 } = ta;
    if (rsi14 !== null && rsi14 !== undefined) {
      if (rsi14 > 75 || rsi14 < 25) {
        signals.push(`RSI(14) at ${rsi14} — extreme reading`);
        riskPoints += 1;
        warnings.push('RSI at extreme level — reversal risk');
      }
    }
  }

  if (quote) {
    const { regularMarketPrice, fiftyTwoWeekHigh, fiftyTwoWeekLow } = quote;
    if (
      regularMarketPrice !== null && regularMarketPrice !== undefined &&
      fiftyTwoWeekHigh !== null && fiftyTwoWeekHigh !== undefined &&
      fiftyTwoWeekLow !== null && fiftyTwoWeekLow !== undefined
    ) {
      const range = fiftyTwoWeekHigh - fiftyTwoWeekLow;
      if (range > 0) {
        const positionInRange = ((regularMarketPrice - fiftyTwoWeekLow) / range) * 100;
        signals.push(`52-week range position: ${positionInRange.toFixed(1)}%`);
        if (positionInRange > 90) {
          warnings.push('Trading near 52-week high');
          riskPoints += 1;
        } else if (positionInRange < 10) {
          warnings.push('Trading near 52-week low');
          riskPoints += 1;
        }
      }
    }
  }

  let stance;
  if (signals.length === 0) {
    stance = 'unknown';
    warnings.push('Insufficient risk signals available');
  } else if (riskPoints >= 3) {
    stance = 'elevated';
  } else if (riskPoints >= 1) {
    stance = 'moderate';
  } else if (lowRiskSignals > 0) {
    stance = 'low';
  } else {
    stance = 'unknown';
    warnings.push('Low-risk classification requires explicit low-risk evidence');
  }

  const confidence = signals.length >= 3 ? 'high' : signals.length >= 1 ? 'medium' : 'low';

  return { stance, confidence, signals, warnings };
}

// ---------------------------------------------------------------------------
// Overall summary — aggregate
// ---------------------------------------------------------------------------

function buildOverallSummary(
  trend,
  fundamentalsAnalysis,
  newsAnalysis,
  riskAnalysis,
  inputCoverage = {},
  providerStatus = {},
  communitySnapshot = null,
) {
  const signals = [];
  const warnings = [];
  const confluence = computeConfluenceSummary(
    trend,
    fundamentalsAnalysis,
    newsAnalysis,
    riskAnalysis,
    inputCoverage,
  );

  signals.push(`Trend: ${trend.stance} (${trend.confidence} confidence)`);
  signals.push(`Fundamentals: ${fundamentalsAnalysis.stance} (${fundamentalsAnalysis.confidence} confidence)`);
  signals.push(`News: ${newsAnalysis.stance} (${newsAnalysis.confidence} confidence)`);
  signals.push(`Risk: ${riskAnalysis.stance} (${riskAnalysis.confidence} confidence)`);

  warnings.push(...trend.warnings);
  warnings.push(...fundamentalsAnalysis.warnings);
  warnings.push(...newsAnalysis.warnings);
  warnings.push(...riskAnalysis.warnings);
  warnings.push(...confluence.warnings);

  const coreCoverageCount = [
    inputCoverage.quote,
    inputCoverage.fundamentals,
    inputCoverage.ta,
  ].filter(Boolean).length;

  if (coreCoverageCount < 2) {
    warnings.push('Overall summary degraded: fewer than two core datasets are available');
    return {
      stance: 'mixed',
      confidence: 'low',
      signals,
      warnings,
      confluence_score: confluence.confluence_score,
      confluence_label: confluence.confluence_label,
      confluence_breakdown: confluence.confluence_breakdown,
      coverage_summary: confluence.coverage_summary,
      provider_coverage_summary: summarizeProviderCoverage(Object.values(providerStatus)),
      community_snapshot_summary: communitySnapshot
        ? {
          counts: communitySnapshot.counts,
          source_presence: communitySnapshot.source_presence,
          latest_observed_at: communitySnapshot.latest_observed_at,
        }
        : null,
    };
  }

  // Derive overall stance from component stances
  let positiveCount = 0;
  let negativeCount = 0;

  if (trend.stance === 'bullish') positiveCount += 1;
  if (trend.stance === 'bearish') negativeCount += 1;

  if (fundamentalsAnalysis.stance === 'strong') positiveCount += 1;
  if (fundamentalsAnalysis.stance === 'weak') negativeCount += 1;

  if (riskAnalysis.stance === 'elevated') negativeCount += 1;
  if (riskAnalysis.stance === 'low') positiveCount += 1;

  let stance;
  if (positiveCount >= 2 && negativeCount === 0) {
    stance = 'favourable';
  } else if (negativeCount >= 2 && positiveCount === 0) {
    stance = 'unfavourable';
  } else if (positiveCount > negativeCount) {
    stance = 'leaning_positive';
  } else if (negativeCount > positiveCount) {
    stance = 'leaning_negative';
  } else {
    stance = 'mixed';
  }

  const confidence = warnings.length === 0 ? 'high' : warnings.length <= 2 ? 'medium' : 'low';

  return {
    stance,
    confidence,
    signals,
    warnings,
    confluence_score: confluence.confluence_score,
    confluence_label: confluence.confluence_label,
    confluence_breakdown: confluence.confluence_breakdown,
    coverage_summary: confluence.coverage_summary,
    provider_coverage_summary: summarizeProviderCoverage(Object.values(providerStatus)),
    community_snapshot_summary: communitySnapshot
      ? {
        counts: communitySnapshot.counts,
        source_presence: communitySnapshot.source_presence,
        latest_observed_at: communitySnapshot.latest_observed_at,
      }
      : null,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get a deterministic, multi-analyst symbol analysis.
 * Aggregates quote, fundamentals, TA summary, and news data, then runs
 * rule-based analyst logic to produce structured output.
 *
 * @param {string} symbol - Ticker symbol (e.g. 'AAPL')
 * @returns {Promise<object>} Analysis result
 */
export async function getSymbolAnalysis(symbol) {
  if (!symbol || typeof symbol !== 'string') {
    throw new Error('symbol is required');
  }

  const ticker = symbol.trim().toUpperCase();
  const inputs = await collectInputs(ticker);

  const trendAnalysis = analyzeTrend(inputs.quote, inputs.ta);
  const fundamentalsAnalysis = analyzeFundamentals(inputs.fundamentals);
  const newsAnalysis = analyzeNews(inputs.news);
  const riskAnalysis = analyzeRisk(inputs.quote, inputs.ta, inputs.fundamentals);
  const overallSummary = buildOverallSummary(
    trendAnalysis,
    fundamentalsAnalysis,
    newsAnalysis,
    riskAnalysis,
    {
      quote: Boolean(inputs.quote),
      fundamentals: Boolean(inputs.fundamentals),
      ta: Boolean(inputs.ta),
      news: Boolean(inputs.news),
    },
    inputs.providerStatus,
    inputs.communitySnapshot,
  );
  const hasCoreInput = Boolean(inputs.quote || inputs.fundamentals || inputs.ta);
  const topLevelWarnings = [];

  if (!inputs.quote) {
    topLevelWarnings.push('Quote data unavailable — quote-dependent signals are degraded');
  }
  if (!inputs.fundamentals) {
    topLevelWarnings.push('Fundamentals data unavailable');
  }
  if (!inputs.ta) {
    topLevelWarnings.push('TA summary unavailable');
  }
  if (!inputs.news) {
    topLevelWarnings.push('News data unavailable');
  }
  topLevelWarnings.push(...(inputs.communitySnapshot?.warnings || []));

  return {
    success: hasCoreInput,
    symbol: ticker,
    generated_at: new Date().toISOString(),
    source: 'yahoo_finance',
    ...(hasCoreInput ? {} : { error: 'No core market-intel inputs available for analysis' }),
    warnings: topLevelWarnings,
    inputs: {
      quote: inputs.quote,
      quote_missing_reason: inputs.missingReasons.quote,
      fundamentals: inputs.fundamentals,
      fundamentals_missing_reason: inputs.missingReasons.fundamentals,
      ta_summary: inputs.ta,
      ta_missing_reason: inputs.missingReasons.ta,
      news: inputs.news,
      news_missing_reason: inputs.missingReasons.news,
    },
    analysis: {
      trend_analyst: trendAnalysis,
      fundamentals_analyst: fundamentalsAnalysis,
      news_analyst: newsAnalysis,
      risk_analyst: riskAnalysis,
      provider_status: inputs.providerStatus,
      community_snapshot: inputs.communitySnapshot,
      overall_summary: overallSummary,
    },
  };
}
