import { register } from '../router.js';
import {
  getReachStatus,
  readWebContent,
  readRssFeed,
  searchRedditPosts,
  readRedditPost,
  readYoutubeContent,
} from '../../core/reach.js';
import { applyCompaction, renderCompactPayload } from '../../core/output-compaction.js';
import { attachArtifactWarning, tryWriteRawArtifact } from '../../core/output-artifacts.js';

register('reach', {
  description: 'External observation layer for web, RSS, Reddit, and YouTube (no CDP required)',
  subcommands: new Map([
    [
      'status',
      {
        description: 'Check which non-Twitter observation channels are ready',
        handler: () => getReachStatus(),
      },
    ],
    [
      'web',
      {
        description: 'Read a public web page via Jina Reader',
        options: {
          url: { type: 'string', short: 'u', description: 'Public URL to read' },
          compact: { type: 'boolean', short: 'c', description: 'Emit compact summary output' },
        },
        handler: async (opts) => {
          if (!opts.url) throw new Error('Usage: tv reach web --url https://example.com');
          const result = await readWebContent({ url: opts.url });
          if (!opts.compact) return result;
          const artifactInfo = await tryWriteRawArtifact('reach_read_web', { url: opts.url }, result, { compact: true });
          return renderCompactPayload(applyCompaction(
            'reach_read_web',
            attachArtifactWarning(result, artifactInfo),
            artifactInfo.artifactPath ? { artifactPath: artifactInfo.artifactPath } : undefined,
          ));
        },
      },
    ],
    [
      'rss',
      {
        description: 'Read a public RSS or Atom feed',
        options: {
          url: { type: 'string', short: 'u', description: 'Feed URL' },
          max: { type: 'string', short: 'm', description: 'Maximum item count (1-20)' },
          compact: { type: 'boolean', short: 'c', description: 'Emit compact summary output' },
        },
        handler: async (opts) => {
          if (!opts.url) throw new Error('Usage: tv reach rss --url https://example.com/feed.xml [--max 5]');
          const maxItems = opts.max ? Number(opts.max) : 5;
          const result = await readRssFeed({
            url: opts.url,
            maxItems,
          });
          if (!opts.compact) return result;
          const artifactInfo = await tryWriteRawArtifact(
            'reach_read_rss',
            { url: opts.url, maxItems },
            result,
            { compact: true },
          );
          return renderCompactPayload(applyCompaction(
            'reach_read_rss',
            attachArtifactWarning(result, artifactInfo),
            artifactInfo.artifactPath ? { artifactPath: artifactInfo.artifactPath } : undefined,
          ));
        },
      },
    ],
    [
      'reddit-search',
      {
        description: 'Search public Reddit posts',
        options: {
          query: { type: 'string', short: 'q', description: 'Search query' },
          max: { type: 'string', short: 'm', description: 'Maximum result count (1-20)' },
          compact: { type: 'boolean', short: 'c', description: 'Emit compact summary output' },
        },
        handler: async (opts) => {
          if (!opts.query) throw new Error('Usage: tv reach reddit-search --query "NVDA earnings" [--max 5]');
          const maxResults = opts.max ? Number(opts.max) : 5;
          const result = await searchRedditPosts({
            query: opts.query,
            maxResults,
          });
          if (!opts.compact) return result;
          const artifactInfo = await tryWriteRawArtifact(
            'reach_search_reddit',
            { query: opts.query, maxResults },
            result,
            { compact: true },
          );
          return renderCompactPayload(applyCompaction(
            'reach_search_reddit',
            attachArtifactWarning(result, artifactInfo),
            artifactInfo.artifactPath ? { artifactPath: artifactInfo.artifactPath } : undefined,
          ));
        },
      },
    ],
    [
      'reddit-post',
      {
        description: 'Read a public Reddit post and top comments',
        options: {
          id: { type: 'string', short: 'i', description: 'Reddit post ID' },
          compact: { type: 'boolean', short: 'c', description: 'Emit compact summary output' },
        },
        handler: async (opts) => {
          if (!opts.id) throw new Error('Usage: tv reach reddit-post --id abc123');
          const result = await readRedditPost({ postId: opts.id });
          if (!opts.compact) return result;
          const artifactInfo = await tryWriteRawArtifact('reach_read_reddit_post', { postId: opts.id }, result, { compact: true });
          return renderCompactPayload(applyCompaction(
            'reach_read_reddit_post',
            attachArtifactWarning(result, artifactInfo),
            artifactInfo.artifactPath ? { artifactPath: artifactInfo.artifactPath } : undefined,
          ));
        },
      },
    ],
    [
      'youtube',
      {
        description: 'Read YouTube metadata and optional subtitles',
        options: {
          url: { type: 'string', short: 'u', description: 'YouTube video URL' },
          compact: { type: 'boolean', short: 'c', description: 'Emit compact summary output' },
        },
        handler: async (opts) => {
          if (!opts.url) throw new Error('Usage: tv reach youtube --url https://www.youtube.com/watch?v=...');
          const result = await readYoutubeContent({ url: opts.url });
          if (!opts.compact) return result;
          const artifactInfo = await tryWriteRawArtifact('reach_read_youtube', { url: opts.url }, result, { compact: true });
          return renderCompactPayload(applyCompaction(
            'reach_read_youtube',
            attachArtifactWarning(result, artifactInfo),
            artifactInfo.artifactPath ? { artifactPath: artifactInfo.artifactPath } : undefined,
          ));
        },
      },
    ],
  ]),
});
