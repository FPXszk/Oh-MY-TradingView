import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildMarketCommunitySnapshot } from '../src/core/market-community-snapshot.js';

function createTwitterExecStub(posts = []) {
  return async (_bin, args) => {
    if (args[0] === 'search') {
      return {
        stdout: JSON.stringify({
          ok: true,
          data: posts,
        }),
      };
    }
    throw new Error(`Unexpected twitter args: ${args.join(' ')}`);
  };
}

function createRedditFetchStub(posts = []) {
  return async () => ({
    ok: true,
    json: async () => ({
      data: {
        children: posts.map((post) => ({
          data: post,
        })),
      },
    }),
  });
}

describe('buildMarketCommunitySnapshot', () => {
  it('aggregates x and reddit counts, recency, and source presence', async () => {
    const result = await buildMarketCommunitySnapshot({
      symbol: 'NVDA',
      _deps: {
        access: async () => {},
        cwd: () => '/tmp',
        env: {},
        execFile: createTwitterExecStub([
          { id: '1', text: 'NVDA rally', createdAt: '2026-04-09T12:00:00.000Z' },
          { id: '2', text: 'NVDA earnings', createdAt: '2026-04-09T13:00:00.000Z' },
        ]),
        fetch: createRedditFetchStub([
          { id: 'a', title: 'NVDA on reddit', created_utc: 1775730000, score: 10, num_comments: 5 },
        ]),
      },
    });

    assert.equal(result.success, true);
    assert.equal(result.counts.x, 2);
    assert.equal(result.counts.reddit, 1);
    assert.equal(result.counts.total, 3);
    assert.equal(result.source_presence.x, true);
    assert.equal(result.source_presence.reddit, true);
    assert.ok(result.latest_observed_at);
    assert.equal(result.provider_status.x.status, 'ok');
    assert.equal(result.provider_status.reddit.status, 'ok');
  });

  it('preserves partial success when twitter auth is missing', async () => {
    const result = await buildMarketCommunitySnapshot({
      symbol: 'AAPL',
      _deps: {
        access: async () => {},
        cwd: () => '/tmp',
        env: {},
        execFile: async () => {
          const error = new Error('twitter auth failed');
          error.stderr = 'authentication required';
          throw error;
        },
        fetch: createRedditFetchStub([]),
      },
    });

    assert.equal(result.success, true);
    assert.equal(result.counts.x, 0);
    assert.equal(result.counts.reddit, 0);
    assert.equal(result.provider_status.x.status, 'auth_required');
    assert.equal(result.provider_status.reddit.status, 'no_results');
    assert.ok(result.warnings.some((warning) => /twitter/i.test(warning)));
  });

  it('reports disabled collection as skipped and unavailable', async () => {
    const result = await buildMarketCommunitySnapshot({
      symbol: 'AAPL',
      _deps: {
        env: { OMTV_DISABLE_COMMUNITY_SNAPSHOT: '1' },
      },
    });

    assert.equal(result.success, false);
    assert.equal(result.coverage_summary.available_count, 0);
    assert.equal(result.provider_status.x.status, 'skipped');
    assert.equal(result.provider_status.reddit.status, 'skipped');
  });
});
