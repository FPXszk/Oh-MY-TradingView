/**
 * Deterministic output compaction for noisy surfaces.
 *
 * Adds a `_compact` field to full results, and can render a reduced compact payload
 * for opt-in compact mode on selected surfaces.
 * Inspired by RTK's output compaction pattern: rule-based shaping, not LLM summarization.
 */

const EXCERPT_LIMIT = 500;
const TEXT_TRUNCATE = 140;

const RAW_HINT = 'Re-run without compact mode to inspect the full result.';
const COMPACT_META_KEYS = [
  'success',
  'error',
  'source',
  'retrieved_at',
  'generated_at',
  'checked_at',
  'warning',
  'hint',
  'count',
  'successCount',
  'rankedCount',
  'failureCount',
  'omittedCount',
  'requestedMaxResults',
  'timeline',
  'url',
  'username',
  'query',
  'bundle_dir',
  'artifacts',
];

function truncate(str, limit) {
  if (!str || str.length <= limit) return str || '';
  return str.slice(0, limit) + '…';
}

export function compactMarketAnalysis(result) {
  const compact = { raw_hint: RAW_HINT };

  if (!result || !result.success || !result.analysis) {
    compact.summary = 'Analysis unavailable or error occurred.';
    compact.symbol = result?.symbol || null;
    return { ...result, _compact: compact };
  }

  const { symbol, analysis } = result;
  const confluenceScore = analysis.overall_summary?.confluence_score ?? null;
  const confluenceLabel = analysis.overall_summary?.confluence_label ?? null;
  const trend = analysis.trend?.direction || 'unknown';
  const strength = analysis.trend?.strength || 'unknown';
  const risk = analysis.risk?.level || 'unknown';

  compact.symbol = symbol;
  compact.summary = `${symbol}: trend=${trend} (${strength}), risk=${risk}` +
    (confluenceScore != null ? `, confluence=${confluenceScore} (${confluenceLabel})` : '');

  return { ...result, _compact: compact };
}

export function compactConfluenceRank(result) {
  const compact = { raw_hint: RAW_HINT };

  if (!result || !Array.isArray(result.ranked_symbols)) {
    compact.top = [];
    return { ...result, _compact: compact };
  }

  compact.top = result.ranked_symbols.map((r) => ({
    symbol: r.symbol,
    score: r.confluence_score,
    label: r.confluence_label,
  }));

  return { ...result, _compact: compact };
}

export function compactReachWeb(result) {
  const compact = { raw_hint: RAW_HINT };

  compact.title = result?.title || null;
  compact.excerpt = truncate(result?.content, EXCERPT_LIMIT);

  return { ...result, _compact: compact };
}

export function compactReachRss(result) {
  const compact = { raw_hint: RAW_HINT };

  compact.feedTitle = result?.feedTitle || null;
  compact.items = (result?.items || []).map((item) => ({
    title: item.title,
    link: item.link,
    publishedAt: item.publishedAt,
  }));

  return { ...result, _compact: compact };
}

export function compactReachReddit(result) {
  const compact = { raw_hint: RAW_HINT };

  compact.count = result?.count || 0;
  compact.posts = (result?.posts || []).map((p) => ({
    id: p.id,
    title: p.title,
    subreddit: p.subreddit,
    score: p.score,
  }));

  return { ...result, _compact: compact };
}

export function compactReachRedditPost(result) {
  const compact = { raw_hint: RAW_HINT };

  compact.postId = result?.postId || null;
  compact.commentCount = result?.commentCount || 0;
  compact.post = result?.post
    ? {
        id: result.post.id,
        title: result.post.title,
        subreddit: result.post.subreddit,
        score: result.post.score,
      }
    : null;

  return { ...result, _compact: compact };
}

export function compactReachYoutube(result) {
  const compact = { raw_hint: RAW_HINT };

  compact.title = result?.title || null;
  compact.author = result?.author || null;
  compact.hasTranscript = result?.transcriptAvailable || false;

  return { ...result, _compact: compact };
}

export function compactTwitterSearch(result) {
  const compact = { raw_hint: RAW_HINT };

  compact.query = result?.query || null;
  compact.count = result?.count || 0;
  compact.posts = (result?.posts || []).map((p) => ({
    id: p.id,
    text: truncate(p.text, TEXT_TRUNCATE),
    author: p.author?.username || p.author,
  }));

  return { ...result, _compact: compact };
}

export function compactTwitterUserPosts(result) {
  const compact = { raw_hint: RAW_HINT };

  compact.username = result?.username || null;
  compact.count = result?.count || 0;
  compact.posts = (result?.posts || []).map((p) => ({
    id: p.id,
    text: truncate(p.text, TEXT_TRUNCATE),
  }));

  return { ...result, _compact: compact };
}

export function compactTwitterTweetDetail(result) {
  const compact = { raw_hint: RAW_HINT };

  compact.tweetId = result?.tweetId || null;
  compact.tweet = result?.tweet
    ? {
        id: result.tweet.id,
        text: truncate(result.tweet.text, TEXT_TRUNCATE),
        author: result.tweet.author?.username || result.tweet.author || null,
      }
    : null;

  return { ...result, _compact: compact };
}

export function compactObserveSnapshot(result) {
  const compact = { raw_hint: RAW_HINT };

  compact.snapshot_id = result?.snapshot_id || null;
  compact.connected = result?.success === true && !!result?.connection?.target_id;
  compact.symbol = result?.page_state?.chart_symbol || null;
  compact.resolution = result?.page_state?.chart_resolution || null;
  compact.errorCount = Array.isArray(result?.runtime_errors) ? result.runtime_errors.length : 0;
  compact.warningCount = Array.isArray(result?.warnings) ? result.warnings.length : 0;

  if (!result?.success) {
    compact.summary = `Snapshot failed: ${result?.error || 'unknown error'}`;
  } else {
    compact.summary = `${compact.symbol || 'no symbol'} @ ${compact.resolution || '?'}, ` +
      `${compact.errorCount} errors, ${compact.warningCount} warnings`;
  }

  return { ...result, _compact: compact };
}

const SURFACE_MAP = {
  market_symbol_analysis: compactMarketAnalysis,
  market_confluence_rank: compactConfluenceRank,
  reach_read_web: compactReachWeb,
  reach_read_rss: compactReachRss,
  reach_search_reddit: compactReachReddit,
  reach_read_reddit_post: compactReachRedditPost,
  reach_read_youtube: compactReachYoutube,
  x_search_posts: compactTwitterSearch,
  x_user_posts: compactTwitterUserPosts,
  x_tweet_detail: compactTwitterTweetDetail,
  tv_observe_snapshot: compactObserveSnapshot,
};

export function applyCompaction(surfaceName, result) {
  const fn = SURFACE_MAP[surfaceName];
  if (!fn) return result;
  return fn(result);
}

export function renderCompactPayload(result) {
  if (!result || typeof result !== 'object' || !result._compact) {
    return result;
  }

  const payload = {};
  for (const key of COMPACT_META_KEYS) {
    if (result[key] !== undefined) {
      payload[key] = result[key];
    }
  }

  return {
    ...payload,
    ...result._compact,
  };
}
