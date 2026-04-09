import { register } from '../router.js';
import {
  getReachStatus,
  readWebContent,
  readRssFeed,
  searchRedditPosts,
  readRedditPost,
  readYoutubeContent,
} from '../../core/reach.js';

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
        },
        handler: (opts) => {
          if (!opts.url) throw new Error('Usage: tv reach web --url https://example.com');
          return readWebContent({ url: opts.url });
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
        },
        handler: (opts) => {
          if (!opts.url) throw new Error('Usage: tv reach rss --url https://example.com/feed.xml [--max 5]');
          return readRssFeed({
            url: opts.url,
            maxItems: opts.max ? Number(opts.max) : undefined,
          });
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
        },
        handler: (opts) => {
          if (!opts.query) throw new Error('Usage: tv reach reddit-search --query "NVDA earnings" [--max 5]');
          return searchRedditPosts({
            query: opts.query,
            maxResults: opts.max ? Number(opts.max) : undefined,
          });
        },
      },
    ],
    [
      'reddit-post',
      {
        description: 'Read a public Reddit post and top comments',
        options: {
          id: { type: 'string', short: 'i', description: 'Reddit post ID' },
        },
        handler: (opts) => {
          if (!opts.id) throw new Error('Usage: tv reach reddit-post --id abc123');
          return readRedditPost({ postId: opts.id });
        },
      },
    ],
    [
      'youtube',
      {
        description: 'Read YouTube metadata and optional subtitles',
        options: {
          url: { type: 'string', short: 'u', description: 'YouTube video URL' },
        },
        handler: (opts) => {
          if (!opts.url) throw new Error('Usage: tv reach youtube --url https://www.youtube.com/watch?v=...');
          return readYoutubeContent({ url: opts.url });
        },
      },
    ],
  ]),
});
