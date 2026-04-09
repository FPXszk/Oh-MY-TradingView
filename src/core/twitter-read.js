import { access, constants } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const DEFAULT_MAX_RESULTS = 10;
const MAX_RESULTS_LIMIT = 100;
const EXEC_MAX_BUFFER = 10 * 1024 * 1024;
const DEFAULT_SEARCH_TIMELINE = 'Latest';

function resolveDeps(_deps = {}) {
  return {
    access: _deps.access || access,
    execFile: _deps.execFile || execFileAsync,
    cwd: _deps.cwd || (() => process.cwd()),
    env: _deps.env || process.env,
  };
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} is required`);
  }
  return value.trim();
}

function normalizeMaxResults(value) {
  if (value === undefined) return DEFAULT_MAX_RESULTS;
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < 1 || normalized > MAX_RESULTS_LIMIT) {
    throw new Error(`maxResults must be an integer between 1 and ${MAX_RESULTS_LIMIT}`);
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

async function resolveTwitterBin({ access: accessFn, cwd, env }) {
  const explicitBin = env.TWITTER_BIN;
  if (typeof explicitBin === 'string' && explicitBin.trim() !== '') {
    return explicitBin.trim();
  }

  const venvBin = join(cwd(), 'python', '.venv', 'bin', 'twitter');
  if (await canExecute(venvBin, accessFn)) {
    return venvBin;
  }

  return 'twitter';
}

function buildCliError(label, error) {
  const details = [
    error?.stderr,
    error?.stdout,
    error?.message,
  ]
    .filter((value) => typeof value === 'string' && value.trim() !== '')
    .join('\n')
    .trim();

  if (error?.code === 'ENOENT' || /ENOENT|not found/i.test(details)) {
    return new Error('twitter-cli is not installed or not found. Install twitter-cli and ensure the `twitter` binary is available.');
  }

  if (/No Twitter cookies found|authentication required|Cookie expired|401|403|TWITTER_AUTH_TOKEN|TWITTER_CT0/i.test(details)) {
    return new Error('twitter-cli authentication required. Run `twitter whoami` locally or configure browser cookies / TWITTER_AUTH_TOKEN / TWITTER_CT0.');
  }

  return new Error(`${label} failed: ${details || 'twitter-cli returned a non-zero exit code'}`);
}

async function runTwitterCommand(args, { label, _deps } = {}) {
  const deps = resolveDeps(_deps);
  const twitterBin = await resolveTwitterBin(deps);

  try {
    return await deps.execFile(
      twitterBin,
      args,
      {
        env: deps.env,
        maxBuffer: EXEC_MAX_BUFFER,
      },
    );
  } catch (error) {
    throw buildCliError(label, error);
  }
}

function parseJsonEnvelope(stdout, label) {
  let payload;

  try {
    payload = JSON.parse(stdout);
  } catch {
    throw new Error(`Invalid JSON response from twitter-cli for ${label}`);
  }

  if (payload?.ok !== true) {
    const message = payload?.error || payload?.message || `${label} returned ok=false`;
    throw new Error(String(message));
  }

  if (!Object.prototype.hasOwnProperty.call(payload, 'data')) {
    throw new Error(`${label} response is missing data`);
  }

  return payload.data;
}

function ensureObject(value, label) {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    throw new Error(`${label} response was not an object`);
  }
  return value;
}

function ensureArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} response was not a list`);
  }
  return value;
}

function normalizeUser(user) {
  const normalized = ensureObject(user, 'twitter user');
  const username = typeof normalized.username === 'string'
    ? normalized.username
    : (typeof normalized.screenName === 'string' ? normalized.screenName : null);
  return {
    ...normalized,
    id: normalized.id === undefined || normalized.id === null ? null : String(normalized.id),
    username,
    name: typeof normalized.name === 'string' ? normalized.name : null,
  };
}

function normalizePost(post) {
  const normalized = ensureObject(post, 'twitter post');
  return {
    ...normalized,
    id: normalized.id === undefined || normalized.id === null ? null : String(normalized.id),
    text: typeof normalized.text === 'string' ? normalized.text : null,
  };
}

export async function getTwitterStatus({ _deps } = {}) {
  const { stdout } = await runTwitterCommand(['status', '--yaml'], { label: 'twitter status', _deps });
  return {
    success: true,
    authenticated: true,
    raw: stdout.trim(),
    checked_at: new Date().toISOString(),
    source: 'twitter-cli',
  };
}

export async function getTwitterWhoAmI({ _deps } = {}) {
  const { stdout } = await runTwitterCommand(['whoami', '--json'], { label: 'twitter whoami', _deps });
  const data = parseJsonEnvelope(stdout, 'twitter whoami');
  const payload = ensureObject(data, 'twitter whoami');
  const user = normalizeUser(payload.user || payload);

  return {
    success: true,
    user,
    checked_at: new Date().toISOString(),
    source: 'twitter-cli',
  };
}

export async function getTwitterUserProfile({ username, _deps } = {}) {
  const normalizedUsername = requireString(username, 'username');
  const { stdout } = await runTwitterCommand(['user', normalizedUsername, '--json'], { label: 'twitter user', _deps });
  const data = parseJsonEnvelope(stdout, 'twitter user');

  return {
    success: true,
    username: normalizedUsername,
    user: normalizeUser(data),
    retrieved_at: new Date().toISOString(),
    source: 'twitter-cli',
  };
}

export async function searchTwitterPosts({ query, timeline = DEFAULT_SEARCH_TIMELINE, maxResults, _deps } = {}) {
  const normalizedQuery = requireString(query, 'query');
  const normalizedTimeline = requireString(timeline, 'timeline');
  const normalizedMaxResults = normalizeMaxResults(maxResults);
  const { stdout } = await runTwitterCommand(
    ['search', normalizedQuery, '-t', normalizedTimeline, '-n', String(normalizedMaxResults), '--json'],
    { label: 'twitter search', _deps },
  );
  const data = ensureArray(parseJsonEnvelope(stdout, 'twitter search'), 'twitter search');
  const posts = data.map(normalizePost);

  return {
    success: true,
    query: normalizedQuery,
    timeline: normalizedTimeline,
    requestedMaxResults: normalizedMaxResults,
    count: posts.length,
    posts,
    retrieved_at: new Date().toISOString(),
    source: 'twitter-cli',
  };
}

export async function getTwitterUserPosts({ username, maxResults, _deps } = {}) {
  const normalizedUsername = requireString(username, 'username');
  const normalizedMaxResults = normalizeMaxResults(maxResults);
  const { stdout } = await runTwitterCommand(
    ['user-posts', normalizedUsername, '--max', String(normalizedMaxResults), '--json'],
    { label: 'twitter user-posts', _deps },
  );
  const data = ensureArray(parseJsonEnvelope(stdout, 'twitter user-posts'), 'twitter user-posts');
  const posts = data.map(normalizePost);

  return {
    success: true,
    username: normalizedUsername,
    requestedMaxResults: normalizedMaxResults,
    count: posts.length,
    posts,
    retrieved_at: new Date().toISOString(),
    source: 'twitter-cli',
  };
}

export async function getTwitterTweetDetail({ tweetId, _deps } = {}) {
  const normalizedTweetId = requireString(tweetId, 'tweetId');
  const { stdout } = await runTwitterCommand(['tweet', normalizedTweetId, '--json'], { label: 'twitter tweet', _deps });
  const data = parseJsonEnvelope(stdout, 'twitter tweet');
  const tweet = Array.isArray(data) ? data[0] : data;

  return {
    success: true,
    tweetId: normalizedTweetId,
    tweet: normalizePost(tweet),
    retrieved_at: new Date().toISOString(),
    source: 'twitter-cli',
  };
}
