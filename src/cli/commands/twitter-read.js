import { register } from '../router.js';
import {
  getTwitterStatus,
  getTwitterWhoAmI,
  getTwitterUserProfile,
  searchTwitterPosts,
  getTwitterUserPosts,
  getTwitterTweetDetail,
} from '../../core/twitter-read.js';

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
        },
        handler: (opts) => {
          if (!opts.query) throw new Error('Usage: tv x search --query "NVDA" [--timeline Latest] [--max 10]');
          return searchTwitterPosts({
            query: opts.query,
            timeline: opts.timeline || 'Latest',
            maxResults: opts.max ? Number(opts.max) : undefined,
          });
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
        },
        handler: (opts) => {
          if (!opts.username) throw new Error('Usage: tv x user-posts --username jack [--max 10]');
          return getTwitterUserPosts({
            username: opts.username,
            maxResults: opts.max ? Number(opts.max) : undefined,
          });
        },
      },
    ],
    [
      'tweet',
      {
        description: 'Get a single Twitter/X post detail',
        options: {
          id: { type: 'string', short: 'i', description: 'Tweet ID or X status URL' },
        },
        handler: (opts) => {
          if (!opts.id) throw new Error('Usage: tv x tweet --id 1234567890');
          return getTwitterTweetDetail({ tweetId: opts.id });
        },
      },
    ],
  ]),
});
