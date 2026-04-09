import { access, constants } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const DEFAULT_MAX_RESULTS = 5;
const MAX_RESULTS_LIMIT = 20;
const DEFAULT_TIMEOUT_MS = 15000;
const EXEC_MAX_BUFFER = 10 * 1024 * 1024;
const USER_AGENT = 'Mozilla/5.0 (compatible; Oh-MY-TradingView/0.1)';
const YTDLP_TRANSCRIPT_LIMIT = 2000;

function resolveDeps(_deps = {}) {
  return {
    access: _deps.access || access,
    cwd: _deps.cwd || (() => process.cwd()),
    env: _deps.env || process.env,
    execFile: _deps.execFile || execFileAsync,
    fetch: _deps.fetch || globalThis.fetch,
  };
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} is required`);
  }
  return value.trim();
}

function requireUrl(value, label = 'url') {
  const normalized = requireString(value, label);
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`${label} valid URL is required`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${label} must use http or https`);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost'
    || hostname === '0.0.0.0'
    || hostname === '127.0.0.1'
    || hostname === '::1'
    || hostname.endsWith('.local')
    || /^10\./.test(hostname)
    || /^192\.168\./.test(hostname)
    || /^169\.254\./.test(hostname)
    || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  ) {
    throw new Error(`${label} must be a public http(s) URL`);
  }

  return parsed;
}

function normalizeMaxItems(value, label = 'maxItems') {
  if (value === undefined) return DEFAULT_MAX_RESULTS;
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < 1 || normalized > MAX_RESULTS_LIMIT) {
    throw new Error(`${label} must be an integer between 1 and ${MAX_RESULTS_LIMIT}`);
  }
  return normalized;
}

async function canExecute(path, accessFn) {
  try {
    await accessFn(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveYtDlpBin({ access: accessFn, cwd, env }) {
  if (typeof env.YTDLP_BIN === 'string' && env.YTDLP_BIN.trim() !== '') {
    return env.YTDLP_BIN.trim();
  }

  const localBin = join(cwd(), 'python', '.venv', 'bin', 'yt-dlp');
  if (await canExecute(localBin, accessFn)) {
    return localBin;
  }

  return null;
}

async function fetchText(url, { fetch: fetchFn }, label) {
  const response = await fetchFn(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/plain, text/markdown, application/xml, text/xml, application/rss+xml, application/atom+xml;q=0.9, */*;q=0.8',
    },
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`${label} failed: HTTP ${response.status}`);
  }

  return response.text();
}

async function fetchJson(url, { fetch: fetchFn }, label) {
  const response = await fetchFn(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json, text/plain;q=0.8, */*;q=0.5',
    },
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`${label} failed: HTTP ${response.status}`);
  }

  return response.json();
}

function toIsoDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value * 1000).toISOString();
  }
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function truncateText(value, max = 400) {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  return normalized.length > max ? `${normalized.slice(0, max)}…` : normalized;
}

function stripHtml(value) {
  if (typeof value !== 'string') return null;
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function buildJinaUrl(url) {
  const parsed = requireUrl(url);
  return `https://r.jina.ai/http://${parsed.host}${parsed.pathname}${parsed.search}`;
}

function extractMarkdownTitle(content) {
  const titleLine = content.match(/^Title:\s*(.+)$/m)?.[1]?.trim();
  if (titleLine) return titleLine;
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || null;
}

function extractTag(block, tagNames) {
  for (const tagName of tagNames) {
    const cdataRe = new RegExp(`<${tagName}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tagName}>`, 'i');
    const plainRe = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
    const cdataMatch = block.match(cdataRe);
    if (cdataMatch?.[1]) return stripHtml(cdataMatch[1]);
    const plainMatch = block.match(plainRe);
    if (plainMatch?.[1]) return stripHtml(plainMatch[1]);
  }
  return null;
}

function extractAttr(block, tagName, attrName) {
  const attrMatch = block.match(new RegExp(`<${tagName}[^>]*\\s${attrName}="([^"]+)"[^>]*\\/?>`, 'i'));
  return attrMatch?.[1] || null;
}

function parseRssOrAtom(xml, maxItems) {
  const trimmed = typeof xml === 'string' ? xml.trim() : '';
  if (!trimmed.startsWith('<') || (!trimmed.includes('<rss') && !trimmed.includes('<feed'))) {
    throw new Error('RSS feed parse failed: unsupported XML payload');
  }

  const isAtom = /<feed[\s>]/i.test(trimmed);
  const feedContainer = isAtom
    ? trimmed.match(/<feed\b[\s\S]*?<\/feed>/i)?.[0]
    : trimmed.match(/<channel\b[\s\S]*?<\/channel>/i)?.[0];
  const feedTitle = feedContainer ? extractTag(feedContainer, ['title']) : null;
  const itemRegex = isAtom ? /<entry\b[\s\S]*?<\/entry>/gi : /<item\b[\s\S]*?<\/item>/gi;
  const blocks = [...trimmed.matchAll(itemRegex)].map((match) => match[0]).slice(0, maxItems);

  if (blocks.length === 0) {
    throw new Error('RSS feed parse failed: no items found');
  }

  const items = blocks.map((block) => ({
    title: extractTag(block, ['title']),
    link: isAtom ? extractAttr(block, 'link', 'href') : extractTag(block, ['link']),
    publishedAt: extractTag(block, isAtom ? ['updated', 'published'] : ['pubDate', 'dc:date']),
    summary: extractTag(block, isAtom ? ['summary', 'content'] : ['description', 'content:encoded']),
  }));

  return {
    feedTitle,
    items,
  };
}

function normalizeRedditPost(post) {
  if (!post || typeof post !== 'object') {
    throw new Error('reddit response was malformed');
  }

  return {
    id: post.id ? String(post.id) : null,
    title: typeof post.title === 'string' ? post.title : null,
    subreddit: typeof post.subreddit === 'string' ? post.subreddit : null,
    author: typeof post.author === 'string' ? post.author : null,
    score: Number.isFinite(post.score) ? post.score : 0,
    numComments: Number.isFinite(post.num_comments) ? post.num_comments : 0,
    permalink: typeof post.permalink === 'string' ? `https://www.reddit.com${post.permalink}` : null,
    url: typeof post.url === 'string' ? post.url : null,
    selftext: typeof post.selftext === 'string' ? post.selftext : null,
    selftextExcerpt: truncateText(post.selftext, 240),
    createdAt: toIsoDate(post.created_utc),
  };
}

function normalizeRedditCommentNode(node) {
  if (!node || node.kind !== 't1' || !node.data) return null;
  const repliesRoot = node.data.replies?.data?.children;
  const replies = Array.isArray(repliesRoot)
    ? repliesRoot.map(normalizeRedditCommentNode).filter(Boolean)
    : [];

  return {
    id: node.data.id ? String(node.data.id) : null,
    author: typeof node.data.author === 'string' ? node.data.author : null,
    body: typeof node.data.body === 'string' ? node.data.body : null,
    score: Number.isFinite(node.data.score) ? node.data.score : 0,
    createdAt: toIsoDate(node.data.created_utc),
    replies,
  };
}

function pickSubtitleTrack(payload) {
  const groups = [payload.subtitles, payload.automatic_captions];
  const preferredLanguages = ['en', 'en-US', 'en-GB', 'ja'];

  for (const group of groups) {
    if (!group || typeof group !== 'object') continue;
    for (const language of preferredLanguages) {
      const entries = group[language];
      if (Array.isArray(entries)) {
        const match = entries.find((entry) => entry.ext === 'vtt' && entry.url);
        if (match) return { language, url: match.url };
      }
    }
    for (const [language, entries] of Object.entries(group)) {
      if (!Array.isArray(entries)) continue;
      const match = entries.find((entry) => entry.ext === 'vtt' && entry.url);
      if (match) return { language, url: match.url };
    }
  }

  return null;
}

function stripVttText(rawText) {
  return rawText
    .replace(/^WEBVTT.*$/gm, '')
    .replace(/^\d+$/gm, '')
    .replace(/^\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}\.\d{3}.*$/gm, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildYoutubeExecError(error) {
  const details = [
    error?.stderr,
    error?.stdout,
    error?.message,
  ]
    .filter((value) => typeof value === 'string' && value.trim() !== '')
    .join('\n')
    .trim();

  return new Error(`youtube read failed: ${details || 'yt-dlp returned a non-zero exit code'}`);
}

export async function getReachStatus({ _deps } = {}) {
  const deps = resolveDeps(_deps);
  const ytDlpBin = await resolveYtDlpBin(deps);

  return {
    success: true,
    channels: {
      web: {
        ready: true,
        mode: 'jina_reader',
        detail: 'Jina Reader over HTTPS',
      },
      rss: {
        ready: true,
        mode: 'http_xml',
        detail: 'Direct HTTP fetch and parse',
      },
      reddit: {
        ready: true,
        mode: 'public_json',
        detail: 'Public Reddit JSON endpoints',
      },
      youtube: {
        ready: true,
        mode: ytDlpBin ? 'yt-dlp' : 'oembed+jina',
        transcriptAvailable: Boolean(ytDlpBin),
        detail: ytDlpBin
          ? 'yt-dlp rich metadata and subtitle extraction'
          : 'Metadata fallback only; install yt-dlp for subtitles',
      },
    },
    checked_at: new Date().toISOString(),
    source: 'reach',
  };
}

export async function readWebContent({ url, _deps } = {}) {
  const normalizedUrl = requireUrl(url).toString();
  const deps = resolveDeps(_deps);
  const content = await fetchText(buildJinaUrl(normalizedUrl), deps, 'web read');

  return {
    success: true,
    url: normalizedUrl,
    title: extractMarkdownTitle(content),
    content,
    excerpt: truncateText(content, 280),
    retrieved_at: new Date().toISOString(),
    source: 'jina_reader',
  };
}

export async function readRssFeed({ url, maxItems, _deps } = {}) {
  const normalizedUrl = requireUrl(url).toString();
  const normalizedMaxItems = normalizeMaxItems(maxItems, 'maxItems');
  const deps = resolveDeps(_deps);
  const xml = await fetchText(normalizedUrl, deps, 'rss read');
  const { feedTitle, items } = parseRssOrAtom(xml, normalizedMaxItems);

  return {
    success: true,
    url: normalizedUrl,
    feedTitle,
    count: items.length,
    items,
    retrieved_at: new Date().toISOString(),
    source: 'rss_feed',
  };
}

export async function searchRedditPosts({ query, maxResults, _deps } = {}) {
  const normalizedQuery = requireString(query, 'query');
  const normalizedMaxResults = normalizeMaxItems(maxResults, 'maxResults');
  const deps = resolveDeps(_deps);
  const searchUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(normalizedQuery)}&limit=${normalizedMaxResults}&sort=relevance&t=month`;
  const payload = await fetchJson(searchUrl, deps, 'reddit search');
  const children = payload?.data?.children;

  if (!Array.isArray(children)) {
    throw new Error('reddit search response was malformed');
  }

  const posts = children.map((child) => normalizeRedditPost(child?.data)).filter((post) => post.id);

  return {
    success: true,
    query: normalizedQuery,
    count: posts.length,
    posts,
    retrieved_at: new Date().toISOString(),
    source: 'reddit_public_json',
  };
}

export async function readRedditPost({ postId, _deps } = {}) {
  const normalizedPostId = requireString(postId, 'postId').replace(/^t3_/, '');
  const deps = resolveDeps(_deps);
  const url = `https://www.reddit.com/comments/${encodeURIComponent(normalizedPostId)}.json?limit=10&depth=2&sort=top`;
  const payload = await fetchJson(url, deps, 'reddit post read');

  if (!Array.isArray(payload) || payload.length < 2) {
    throw new Error('reddit post response was malformed');
  }

  const postNode = payload[0]?.data?.children?.[0]?.data;
  const commentNodes = payload[1]?.data?.children;
  if (!postNode || !Array.isArray(commentNodes)) {
    throw new Error('reddit post response was malformed');
  }

  const comments = commentNodes.map(normalizeRedditCommentNode).filter(Boolean);

  return {
    success: true,
    postId: normalizedPostId,
    post: normalizeRedditPost(postNode),
    commentCount: comments.length,
    comments,
    retrieved_at: new Date().toISOString(),
    source: 'reddit_public_json',
  };
}

export async function readYoutubeContent({ url, _deps } = {}) {
  const normalizedUrl = requireUrl(url).toString();
  const deps = resolveDeps(_deps);
  const ytDlpBin = await resolveYtDlpBin(deps);

  if (!ytDlpBin) {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(normalizedUrl)}&format=json`;
    const [oembed, pageMarkdown] = await Promise.all([
      fetchJson(oembedUrl, deps, 'youtube oembed'),
      fetchText(buildJinaUrl(normalizedUrl), deps, 'youtube page read'),
    ]);

    return {
      success: true,
      url: normalizedUrl,
      title: typeof oembed.title === 'string' ? oembed.title : null,
      author: typeof oembed.author_name === 'string' ? oembed.author_name : null,
      authorUrl: typeof oembed.author_url === 'string' ? oembed.author_url : null,
      thumbnailUrl: typeof oembed.thumbnail_url === 'string' ? oembed.thumbnail_url : null,
      descriptionExcerpt: truncateText(pageMarkdown, 320),
      transcriptAvailable: false,
      transcriptExcerpt: null,
      warning: 'yt-dlp is not installed; using metadata-only fallback.',
      retrieved_at: new Date().toISOString(),
      source: 'youtube_oembed',
    };
  }

  let payload;
  try {
    const { stdout } = await deps.execFile(
      ytDlpBin,
      ['--dump-single-json', '--no-download', '--no-playlist', normalizedUrl],
      {
        env: deps.env,
        maxBuffer: EXEC_MAX_BUFFER,
      },
    );
    payload = JSON.parse(stdout);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('youtube read failed: yt-dlp returned invalid JSON');
    }
    throw buildYoutubeExecError(error);
  }

  const subtitleTrack = pickSubtitleTrack(payload);
  let transcriptExcerpt = null;

  if (subtitleTrack?.url) {
    try {
      const transcriptRaw = await fetchText(subtitleTrack.url, deps, 'youtube subtitle fetch');
      transcriptExcerpt = truncateText(stripVttText(transcriptRaw), YTDLP_TRANSCRIPT_LIMIT);
    } catch {
      transcriptExcerpt = null;
    }
  }

  return {
    success: true,
    url: normalizedUrl,
    title: typeof payload.title === 'string' ? payload.title : null,
    author: typeof payload.channel === 'string' ? payload.channel : (typeof payload.uploader === 'string' ? payload.uploader : null),
    descriptionExcerpt: truncateText(payload.description, 500),
    durationSeconds: Number.isFinite(payload.duration) ? payload.duration : null,
    thumbnailUrl: typeof payload.thumbnail === 'string' ? payload.thumbnail : null,
    transcriptAvailable: Boolean(subtitleTrack),
    transcriptLanguage: subtitleTrack?.language || null,
    transcriptExcerpt,
    retrieved_at: new Date().toISOString(),
    source: 'yt-dlp',
  };
}
