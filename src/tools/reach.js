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
import { applyCompaction, renderCompactPayload } from '../core/output-compaction.js';

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
      compact: z.boolean().optional().default(false)
        .describe('Return a compact summary instead of the full result'),
    },
    async ({ url, compact }) => {
      try {
        const result = await readWebContent({ url });
        const payload = compact
          ? renderCompactPayload(applyCompaction('reach_read_web', result))
          : result;
        return jsonResult(payload);
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
      compact: z.boolean().optional().default(false)
        .describe('Return a compact summary instead of the full result'),
    },
    async ({ url, maxItems, compact }) => {
      try {
        const result = await readRssFeed({ url, maxItems });
        const payload = compact
          ? renderCompactPayload(applyCompaction('reach_read_rss', result))
          : result;
        return jsonResult(payload);
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
      compact: z.boolean().optional().default(false)
        .describe('Return a compact summary instead of the full result'),
    },
    async ({ query, maxResults, compact }) => {
      try {
        const result = await searchRedditPosts({ query, maxResults });
        const payload = compact
          ? renderCompactPayload(applyCompaction('reach_search_reddit', result))
          : result;
        return jsonResult(payload);
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
      compact: z.boolean().optional().default(false)
        .describe('Return a compact summary instead of the full result'),
    },
    async ({ postId, compact }) => {
      try {
        const result = await readRedditPost({ postId });
        const payload = compact
          ? renderCompactPayload(applyCompaction('reach_read_reddit_post', result))
          : result;
        return jsonResult(payload);
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
      compact: z.boolean().optional().default(false)
        .describe('Return a compact summary instead of the full result'),
    },
    async ({ url, compact }) => {
      try {
        const result = await readYoutubeContent({ url });
        const payload = compact
          ? renderCompactPayload(applyCompaction('reach_read_youtube', result))
          : result;
        return jsonResult(payload);
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );
}
