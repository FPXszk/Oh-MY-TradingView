/**
 * Deterministic summarizer profiles for selected large-output surfaces.
  *
 * Profiles are the runtime source of truth for compaction-capable surfaces:
 * each profile carries metadata plus the compactor used for that surface.
 * This is intentionally kept as plain JS objects/functions — no DSL, no LLM.
 */

const EXCERPT_LIMIT = 500;
const TEXT_TRUNCATE = 140;
const RAW_HINT = 'Re-run without compact mode to inspect the full result.';

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

const SUMMARY_PROFILES = {
  reach_read_web: {
    type: 'long_text',
    label: 'Web page content',
    description: 'Full web page body via Jina Reader; typically very large.',
    compact: compactReachWeb,
  },
  reach_read_rss: {
    type: 'feed_list',
    label: 'RSS feed items',
    description: 'Normalized RSS/Atom feed entries with metadata.',
    compact: compactReachRss,
  },
  reach_search_reddit: {
    type: 'post_list',
    label: 'Reddit search results',
    description: 'Reddit post search results with body text.',
    compact: compactReachReddit,
  },
  reach_read_reddit_post: {
    type: 'post_detail',
    label: 'Reddit post with comments',
    description: 'Single Reddit post body and comment tree.',
    compact: compactReachRedditPost,
  },
  reach_read_youtube: {
    type: 'long_text',
    label: 'YouTube content',
    description: 'YouTube metadata and optional full transcript.',
    compact: compactReachYoutube,
  },
  x_search_posts: {
    type: 'post_list',
    label: 'Twitter search results',
    description: 'Twitter/X search result posts with author metadata.',
    compact: compactTwitterSearch,
  },
  x_user_posts: {
    type: 'post_list',
    label: 'Twitter user posts',
    description: 'Recent posts from a Twitter/X user.',
    compact: compactTwitterUserPosts,
  },
  x_tweet_detail: {
    type: 'post_detail',
    label: 'Tweet detail',
    description: 'Single tweet with author and reply context.',
    compact: compactTwitterTweetDetail,
  },
  market_symbol_analysis: {
    type: 'analysis',
    label: 'Market symbol analysis',
    description: 'Multi-analyst deterministic analysis: trend, fundamentals, risk.',
    compact: compactMarketAnalysis,
  },
  market_confluence_rank: {
    type: 'ranked_list',
    label: 'Confluence ranking',
    description: 'Symbols ranked by deterministic confluence score.',
    compact: compactConfluenceRank,
  },
  tv_observe_snapshot: {
    type: 'snapshot',
    label: 'Observability snapshot',
    description: 'CDP connection state, page state, runtime errors, and artifact bundle.',
    compact: compactObserveSnapshot,
  },
};

export function getSummaryProfile(surfaceName) {
  return SUMMARY_PROFILES[surfaceName] || null;
}

export function listSummaryProfiles() {
  return { ...SUMMARY_PROFILES };
}
