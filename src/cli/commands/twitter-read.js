import { register } from '../router.js';
import {
  getTwitterStatus,
  getTwitterWhoAmI,
  getTwitterUserProfile,
  searchTwitterPosts,
  getTwitterUserPosts,
  getTwitterTweetDetail,
} from '../../core/twitter-read.js';
import { applyCompaction, renderCompactPayload } from '../../core/output-compaction.js';
import { attachArtifactWarning, tryWriteRawArtifact } from '../../core/output-artifacts.js';

register('x', {
  description: 'Twitter/X read-only via twitter-cli (no CDP required)',
  subcommands: new Map([
    [
      'status',
      {
        description: 'Check Twitter/X authentication status',
        handler: () => getTwitterStatus(),
      },
    ],
    [
      'whoami',
      {
        description: 'Show the authenticated Twitter/X account',
        handler: () => getTwitterWhoAmI(),
      },
    ],
    [
      'search',
      {
        description: 'Search Twitter/X posts',
        options: {
          query: { type: 'string', short: 'q', description: 'Search query' },
          timeline: { type: 'string', short: 't', description: 'Search timeline (default: Latest)' },
          max: { type: 'string', short: 'm', description: 'Maximum result count (1-100)' },
          compact: { type: 'boolean', short: 'c', description: 'Emit compact summary output' },
        },
        handler: async (opts) => {
          if (!opts.query) throw new Error('Usage: tv x search --query "NVDA" [--timeline Latest] [--max 10]');
          const timeline = opts.timeline || 'Latest';
          const maxResults = opts.max ? Number(opts.max) : 10;
          const result = await searchTwitterPosts({
            query: opts.query,
            timeline,
            maxResults,
          });
          if (!opts.compact) return result;
          const artifactInfo = await tryWriteRawArtifact(
            'x_search_posts',
            {
              query: opts.query,
              timeline,
              maxResults,
            },
            result,
            { compact: true },
          );
          return renderCompactPayload(applyCompaction(
            'x_search_posts',
            attachArtifactWarning(result, artifactInfo),
            artifactInfo.artifactPath ? { artifactPath: artifactInfo.artifactPath } : undefined,
          ));
        },
      },
    ],
    [
      'user',
      {
        description: 'Get a Twitter/X user profile',
        options: {
          username: { type: 'string', short: 'u', description: 'Twitter/X username without @' },
        },
        handler: (opts) => {
          if (!opts.username) throw new Error('Usage: tv x user --username jack');
          return getTwitterUserProfile({ username: opts.username });
        },
      },
    ],
    [
      'user-posts',
      {
        description: 'Get recent posts from a Twitter/X user',
        options: {
          username: { type: 'string', short: 'u', description: 'Twitter/X username without @' },
          max: { type: 'string', short: 'm', description: 'Maximum result count (1-100)' },
          compact: { type: 'boolean', short: 'c', description: 'Emit compact summary output' },
        },
        handler: async (opts) => {
          if (!opts.username) throw new Error('Usage: tv x user-posts --username jack [--max 10]');
          const maxResults = opts.max ? Number(opts.max) : 10;
          const result = await getTwitterUserPosts({
            username: opts.username,
            maxResults,
          });
          if (!opts.compact) return result;
          const artifactInfo = await tryWriteRawArtifact(
            'x_user_posts',
            { username: opts.username, maxResults },
            result,
            { compact: true },
          );
          return renderCompactPayload(applyCompaction(
            'x_user_posts',
            attachArtifactWarning(result, artifactInfo),
            artifactInfo.artifactPath ? { artifactPath: artifactInfo.artifactPath } : undefined,
          ));
        },
      },
    ],
    [
      'tweet',
      {
        description: 'Get a single Twitter/X post detail',
        options: {
          id: { type: 'string', short: 'i', description: 'Tweet ID or X status URL' },
          compact: { type: 'boolean', short: 'c', description: 'Emit compact summary output' },
        },
        handler: async (opts) => {
          if (!opts.id) throw new Error('Usage: tv x tweet --id 1234567890');
          const result = await getTwitterTweetDetail({ tweetId: opts.id });
          if (!opts.compact) return result;
          const artifactInfo = await tryWriteRawArtifact('x_tweet_detail', { tweetId: opts.id }, result, { compact: true });
          return renderCompactPayload(applyCompaction(
            'x_tweet_detail',
            attachArtifactWarning(result, artifactInfo),
            artifactInfo.artifactPath ? { artifactPath: artifactInfo.artifactPath } : undefined,
          ));
        },
      },
    ],
  ]),
});
