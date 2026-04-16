import {
  compactMarketAnalysis,
  compactConfluenceRank,
  compactReachWeb,
  compactReachRss,
  compactReachReddit,
  compactReachRedditPost,
  compactReachYoutube,
  compactTwitterSearch,
  compactTwitterUserPosts,
  compactTwitterTweetDetail,
  compactObserveSnapshot,
  getSummaryProfile,
} from './output-summary-profiles.js';

/**
 * Deterministic output compaction for noisy surfaces.
 *
 * Adds a `_compact` field to full results, and can render a reduced compact payload
 * for opt-in compact mode on selected surfaces.
 * Inspired by RTK's output compaction pattern: rule-based shaping, not LLM summarization.
 */

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

export {
  compactMarketAnalysis,
  compactConfluenceRank,
  compactReachWeb,
  compactReachRss,
  compactReachReddit,
  compactReachRedditPost,
  compactReachYoutube,
  compactTwitterSearch,
  compactTwitterUserPosts,
  compactTwitterTweetDetail,
  compactObserveSnapshot,
};

export function applyCompaction(surfaceName, result, opts) {
  const profile = getSummaryProfile(surfaceName);
  if (!profile?.compact) return result;
  const compacted = profile.compact(result);
  compacted._compact.profile_type = profile.type;
  if (opts?.artifactPath) {
    compacted._compact.artifact_path = opts.artifactPath;
    compacted._compact.full_output_hint = `Full raw output saved to: ${opts.artifactPath}`;
  }
  return compacted;
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
