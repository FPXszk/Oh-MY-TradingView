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
import { attachArtifactWarning, tryWriteRawArtifact } from '../core/output-artifacts.js';

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
        if (!compact) return jsonResult(result);
        const artifactInfo = await tryWriteRawArtifact('reach_read_web', { url }, result, { compact });
        const payload = renderCompactPayload(applyCompaction(
          'reach_read_web',
          attachArtifactWarning(result, artifactInfo),
          artifactInfo.artifactPath ? { artifactPath: artifactInfo.artifactPath } : undefined,
        ));
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
        if (!compact) return jsonResult(result);
        const artifactInfo = await tryWriteRawArtifact('reach_read_rss', { url, maxItems }, result, { compact });
        const payload = renderCompactPayload(applyCompaction(
          'reach_read_rss',
          attachArtifactWarning(result, artifactInfo),
          artifactInfo.artifactPath ? { artifactPath: artifactInfo.artifactPath } : undefined,
        ));
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
        if (!compact) return jsonResult(result);
        const artifactInfo = await tryWriteRawArtifact('reach_search_reddit', { query, maxResults }, result, { compact });
        const payload = renderCompactPayload(applyCompaction(
          'reach_search_reddit',
          attachArtifactWarning(result, artifactInfo),
          artifactInfo.artifactPath ? { artifactPath: artifactInfo.artifactPath } : undefined,
        ));
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
        if (!compact) return jsonResult(result);
        const artifactInfo = await tryWriteRawArtifact('reach_read_reddit_post', { postId }, result, { compact });
        const payload = renderCompactPayload(applyCompaction(
          'reach_read_reddit_post',
          attachArtifactWarning(result, artifactInfo),
          artifactInfo.artifactPath ? { artifactPath: artifactInfo.artifactPath } : undefined,
        ));
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
        if (!compact) return jsonResult(result);
        const artifactInfo = await tryWriteRawArtifact('reach_read_youtube', { url }, result, { compact });
        const payload = renderCompactPayload(applyCompaction(
          'reach_read_youtube',
          attachArtifactWarning(result, artifactInfo),
          artifactInfo.artifactPath ? { artifactPath: artifactInfo.artifactPath } : undefined,
        ));
        return jsonResult(payload);
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );
}
