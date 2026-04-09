import { z } from 'zod';
import { jsonResult } from './_format.js';
import {
  getReachStatus,
  readWebContent,
  readRssFeed,
  searchRedditPosts,
  readRedditPost,
  readYoutubeContent,
} from '../core/reach.js';

export function registerReachTools(server) {
  server.tool(
    'reach_status',
    'Check external observation channel availability for web, RSS, Reddit, and YouTube. No CDP connection needed.',
    {},
    async () => {
      try {
        return jsonResult(await getReachStatus());
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'reach_read_web',
    'Read a public web page through a Jina Reader markdown proxy. Read-only. No CDP connection needed.',
    {
      url: z.string().url().describe('Public URL to read'),
    },
    async ({ url }) => {
      try {
        return jsonResult(await readWebContent({ url }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'reach_read_rss',
    'Read a public RSS or Atom feed and return normalized items. Read-only. No CDP connection needed.',
    {
      url: z.string().url().describe('RSS or Atom feed URL'),
      maxItems: z.number().int().min(1).max(20).optional().default(5)
        .describe('Maximum number of items to return'),
    },
    async ({ url, maxItems }) => {
      try {
        return jsonResult(await readRssFeed({ url, maxItems }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'reach_search_reddit',
    'Search public Reddit posts and return normalized results. Read-only. No CDP connection needed.',
    {
      query: z.string().describe('Reddit search query'),
      maxResults: z.number().int().min(1).max(20).optional().default(5)
        .describe('Maximum number of posts to return'),
    },
    async ({ query, maxResults }) => {
      try {
        return jsonResult(await searchRedditPosts({ query, maxResults }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'reach_read_reddit_post',
    'Read a public Reddit post and its top comment tree. Read-only. No CDP connection needed.',
    {
      postId: z.string().describe('Reddit post ID, with or without t3_ prefix'),
    },
    async ({ postId }) => {
      try {
        return jsonResult(await readRedditPost({ postId }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'reach_read_youtube',
    'Read public YouTube metadata, and optionally subtitles when yt-dlp is installed. Read-only. No CDP connection needed.',
    {
      url: z.string().url().describe('YouTube video URL'),
    },
    async ({ url }) => {
      try {
        return jsonResult(await readYoutubeContent({ url }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );
}
