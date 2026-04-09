import { z } from 'zod';
import { jsonResult } from './_format.js';
import {
  getTwitterStatus,
  getTwitterWhoAmI,
  getTwitterUserProfile,
  searchTwitterPosts,
  getTwitterUserPosts,
  getTwitterTweetDetail,
} from '../core/twitter-read.js';

export function registerTwitterReadTools(server) {
  server.tool(
    'x_status',
    'Check Twitter/X read-only authentication status via twitter-cli. No CDP connection needed.',
    {},
    async () => {
      try {
        return jsonResult(await getTwitterStatus());
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'x_whoami',
    'Return the authenticated Twitter/X account via twitter-cli. No CDP connection needed.',
    {},
    async () => {
      try {
        return jsonResult(await getTwitterWhoAmI());
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'x_search_posts',
    'Search Twitter/X posts via twitter-cli. Read-only. No CDP connection needed.',
    {
      query: z.string().describe('Search query'),
      timeline: z.string().optional().default('Latest').describe('Search timeline, e.g. Latest'),
      maxResults: z.number().int().min(1).max(100).optional().default(10)
        .describe('Maximum number of posts to return'),
    },
    async ({ query, timeline, maxResults }) => {
      try {
        return jsonResult(await searchTwitterPosts({ query, timeline, maxResults }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'x_user_profile',
    'Get a Twitter/X user profile via twitter-cli. Read-only. No CDP connection needed.',
    {
      username: z.string().describe('Twitter/X username without @'),
    },
    async ({ username }) => {
      try {
        return jsonResult(await getTwitterUserProfile({ username }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'x_user_posts',
    'Get recent posts from a Twitter/X user via twitter-cli. Read-only. No CDP connection needed.',
    {
      username: z.string().describe('Twitter/X username without @'),
      maxResults: z.number().int().min(1).max(100).optional().default(10)
        .describe('Maximum number of posts to return'),
    },
    async ({ username, maxResults }) => {
      try {
        return jsonResult(await getTwitterUserPosts({ username, maxResults }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'x_tweet_detail',
    'Get a single Twitter/X post detail via twitter-cli. Read-only. No CDP connection needed.',
    {
      tweetId: z.string().describe('Tweet ID or X status URL'),
    },
    async ({ tweetId }) => {
      try {
        return jsonResult(await getTwitterTweetDetail({ tweetId }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );
}
