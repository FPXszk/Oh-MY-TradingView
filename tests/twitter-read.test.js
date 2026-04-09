import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getTwitterStatus,
  getTwitterWhoAmI,
  getTwitterUserProfile,
  searchTwitterPosts,
  getTwitterUserPosts,
  getTwitterTweetDetail,
} from '../src/core/twitter-read.js';
import { registerTwitterReadTools } from '../src/tools/twitter-read.js';

function mockDeps(impl) {
  return { _deps: { execFile: impl } };
}

function createExecSuccess(stdout, stderr = '') {
  return async () => ({ stdout, stderr });
}

function createExecFailure({ message, code = 1, stdout = '', stderr = '' }) {
  return async () => {
    const error = new Error(message);
    error.code = code;
    error.stdout = stdout;
    error.stderr = stderr;
    throw error;
  };
}

describe('twitter-read validation', () => {
  it('rejects missing search query', async () => {
    await assert.rejects(
      () => searchTwitterPosts({}),
      /query is required/,
    );
  });

  it('rejects missing username for user profile', async () => {
    await assert.rejects(
      () => getTwitterUserProfile({}),
      /username is required/,
    );
  });

  it('rejects missing username for user posts', async () => {
    await assert.rejects(
      () => getTwitterUserPosts({}),
      /username is required/,
    );
  });

  it('rejects missing tweet id', async () => {
    await assert.rejects(
      () => getTwitterTweetDetail({}),
      /tweetId is required/,
    );
  });
});

describe('twitter-read success paths', () => {
  it('returns auth status from twitter-cli status output', async () => {
    const result = await getTwitterStatus(
      mockDeps(createExecSuccess('authenticated: true\nmode: cookies\n')),
    );

    assert.equal(result.success, true);
    assert.equal(result.authenticated, true);
    assert.match(result.raw, /authenticated: true/);
  });

  it('normalizes whoami user payload', async () => {
    const result = await getTwitterWhoAmI(
      mockDeps(createExecSuccess(JSON.stringify({
        ok: true,
        data: {
          user: {
            id: '42',
            username: 'fpxszk',
            name: 'FPX',
          },
        },
      }))),
    );

    assert.equal(result.success, true);
    assert.equal(result.user.username, 'fpxszk');
    assert.equal(result.user.id, '42');
  });

  it('normalizes user profile payload', async () => {
    const result = await getTwitterUserProfile({
      username: 'jack',
      ...mockDeps(createExecSuccess(JSON.stringify({
        ok: true,
        data: {
          id: '12',
          screenName: 'jack',
          name: 'Jack',
          followersCount: 10,
        },
      }))),
    });

    assert.equal(result.success, true);
    assert.equal(result.user.username, 'jack');
    assert.equal(result.user.name, 'Jack');
  });

  it('normalizes search results', async () => {
    const result = await searchTwitterPosts({
      query: 'NVDA',
      maxResults: 3,
      ...mockDeps(createExecSuccess(JSON.stringify({
        ok: true,
        data: [
          { id: '1', text: 'hello', author: { username: 'a' } },
          { id: '2', text: 'world', author: { username: 'b' } },
        ],
      }))),
    });

    assert.equal(result.success, true);
    assert.equal(result.query, 'NVDA');
    assert.equal(result.count, 2);
    assert.equal(result.posts[0].id, '1');
  });

  it('normalizes user posts', async () => {
    const result = await getTwitterUserPosts({
      username: 'jack',
      maxResults: 2,
      ...mockDeps(createExecSuccess(JSON.stringify({
        ok: true,
        data: [
          { id: '10', text: 'first' },
          { id: '11', text: 'second' },
        ],
      }))),
    });

    assert.equal(result.success, true);
    assert.equal(result.username, 'jack');
    assert.equal(result.count, 2);
    assert.equal(result.posts[1].id, '11');
  });

  it('normalizes tweet detail from array payloads', async () => {
    const result = await getTwitterTweetDetail({
      tweetId: '123',
      ...mockDeps(createExecSuccess(JSON.stringify({
        ok: true,
        data: [
          { id: '123', text: 'detail text' },
        ],
      }))),
    });

    assert.equal(result.success, true);
    assert.equal(result.tweet.id, '123');
    assert.equal(result.tweet.text, 'detail text');
  });
});

describe('twitter-read error handling', () => {
  it('surfaces missing twitter-cli binary clearly', async () => {
    await assert.rejects(
      () => getTwitterWhoAmI(mockDeps(createExecFailure({
        message: 'spawn twitter ENOENT',
        code: 'ENOENT',
      }))),
      /twitter-cli is not installed/,
    );
  });

  it('surfaces authentication failures clearly', async () => {
    await assert.rejects(
      () => getTwitterWhoAmI(mockDeps(createExecFailure({
        message: 'authentication required',
        stderr: 'No Twitter cookies found',
      }))),
      /authentication required/i,
    );
  });

  it('rejects malformed JSON envelopes', async () => {
    await assert.rejects(
      () => getTwitterWhoAmI(mockDeps(createExecSuccess('{bad json'))),
      /Invalid JSON response/,
    );
  });

  it('rejects unsuccessful envelopes', async () => {
    await assert.rejects(
      () => getTwitterWhoAmI(mockDeps(createExecSuccess(JSON.stringify({
        ok: false,
        error: 'not authorized',
      })))),
      /not authorized/,
    );
  });
});

describe('registerTwitterReadTools', () => {
  it('registers read-only tool names only', () => {
    const calls = [];
    const server = {
      tool(name, description, schema, handler) {
        calls.push({ name, description, schema, handler });
      },
    };

    registerTwitterReadTools(server);

    assert.deepEqual(
      calls.map((call) => call.name),
      [
        'x_status',
        'x_whoami',
        'x_search_posts',
        'x_user_profile',
        'x_user_posts',
        'x_tweet_detail',
      ],
    );
    assert.equal(
      calls.some((call) => ['x_post', 'x_reply', 'x_like', 'x_follow', 'x_delete'].includes(call.name)),
      false,
    );
  });
});
