import { searchTwitterPosts } from './twitter-read.js';
import { searchRedditPosts } from './reach.js';
import {
  buildProviderStatusEntry,
  classifyProviderFailure,
  summarizeProviderCoverage,
} from './market-provider-status.js';

function requireSymbol(symbol) {
  if (typeof symbol !== 'string' || symbol.trim() === '') {
    throw new Error('symbol is required');
  }
  return symbol.trim().toUpperCase();
}

function extractObservedAt(item) {
  const candidates = [
    item?.createdAt,
    item?.created_at,
    item?.publishedAt,
    item?.date,
    item?.timestamp,
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || candidate.trim() === '') continue;
    const parsed = Date.parse(candidate);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }
  return null;
}

function latestObservedAt(items) {
  const timestamps = items
    .map(extractObservedAt)
    .filter(Boolean)
    .map((value) => Date.parse(value))
    .filter((value) => !Number.isNaN(value));
  if (timestamps.length === 0) {
    return null;
  }
  return new Date(Math.max(...timestamps)).toISOString();
}

function buildSkippedEntry(provider) {
  return buildProviderStatusEntry({
    provider,
    status: 'skipped',
    available: false,
    signal_present: false,
    missing_reason: 'not_requested',
  });
}

function communityEnabled(env) {
  return env?.OMTV_DISABLE_COMMUNITY_SNAPSHOT !== '1';
}

export async function buildMarketCommunitySnapshot({ symbol, maxResults = 5, _deps } = {}) {
  const ticker = requireSymbol(symbol);
  const env = _deps?.env || process.env;
  if (!communityEnabled(env)) {
    const skipped = {
      x: buildSkippedEntry('x'),
      reddit: buildSkippedEntry('reddit'),
    };
    return {
      success: false,
      symbol: ticker,
      query: ticker,
      counts: { x: 0, reddit: 0, total: 0 },
      latest_observed_at: null,
      source_presence: { x: false, reddit: false },
      provider_status: skipped,
      coverage_summary: summarizeProviderCoverage(Object.values(skipped)),
      warnings: [],
      snapshot_at: new Date().toISOString(),
      source: 'community-snapshot',
    };
  }

  const [twitterResult, redditResult] = await Promise.allSettled([
    searchTwitterPosts({ query: ticker, maxResults, _deps }),
    searchRedditPosts({ query: ticker, maxResults, _deps }),
  ]);

  const warnings = [];
  let xPosts = [];
  let redditPosts = [];

  let xStatus;
  if (twitterResult.status === 'fulfilled') {
    xPosts = Array.isArray(twitterResult.value.posts) ? twitterResult.value.posts : [];
    xStatus = buildProviderStatusEntry({
      provider: 'x',
      status: xPosts.length > 0 ? 'ok' : 'no_results',
      available: true,
      signal_present: xPosts.length > 0,
      missing_reason: xPosts.length > 0 ? null : 'no_recent_items',
    });
  } else {
    const failure = classifyProviderFailure(twitterResult.reason, { provider: 'x' });
    xStatus = buildProviderStatusEntry({
      provider: 'x',
      ...failure,
      available: false,
      signal_present: false,
    });
    if (xStatus.warning) {
      warnings.push(`twitter: ${xStatus.warning}`);
    }
  }

  let redditStatus;
  if (redditResult.status === 'fulfilled') {
    redditPosts = Array.isArray(redditResult.value.posts) ? redditResult.value.posts : [];
    redditStatus = buildProviderStatusEntry({
      provider: 'reddit',
      status: redditPosts.length > 0 ? 'ok' : 'no_results',
      available: true,
      signal_present: redditPosts.length > 0,
      missing_reason: redditPosts.length > 0 ? null : 'no_recent_items',
    });
  } else {
    const failure = classifyProviderFailure(redditResult.reason, { provider: 'reddit' });
    redditStatus = buildProviderStatusEntry({
      provider: 'reddit',
      ...failure,
      available: false,
      signal_present: false,
    });
    if (redditStatus.warning) {
      warnings.push(`reddit: ${redditStatus.warning}`);
    }
  }

  const allItems = [...xPosts, ...redditPosts];
  const provider_status = {
    x: xStatus,
    reddit: redditStatus,
  };

  return {
    success: Object.values(provider_status).some((entry) => entry.available),
    symbol: ticker,
    query: ticker,
    counts: {
      x: xPosts.length,
      reddit: redditPosts.length,
      total: xPosts.length + redditPosts.length,
    },
    latest_observed_at: latestObservedAt(allItems),
    source_presence: {
      x: xPosts.length > 0,
      reddit: redditPosts.length > 0,
    },
    provider_status,
    coverage_summary: summarizeProviderCoverage(Object.values(provider_status)),
    warnings,
    snapshot_at: new Date().toISOString(),
    source: 'community-snapshot',
  };
}
