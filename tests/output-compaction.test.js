import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  compactMarketAnalysis,
  compactConfluenceRank,
  compactReachWeb,
  compactReachRss,
  compactReachReddit,
  compactReachRedditPost,
  compactReachYoutube,
  compactTwitterSearch,
  renderCompactPayload,
  compactTwitterTweetDetail,
  compactTwitterUserPosts,
  compactObserveSnapshot,
  applyCompaction,
} from '../src/core/output-compaction.js';
import { getSummaryProfile, listSummaryProfiles } from '../src/core/output-summary-profiles.js';

// ---------------------------------------------------------------------------
// compactMarketAnalysis
// ---------------------------------------------------------------------------

describe('compactMarketAnalysis', () => {
  it('produces summary with symbol and verdict from full analysis', () => {
    const input = {
      success: true,
      symbol: 'AAPL',
      analysis: {
        trend: { direction: 'bullish', strength: 'strong' },
        fundamentals: { pe_ratio: 28.5, market_cap: 3000000000000 },
        risk: { level: 'moderate', factors: ['valuation_premium'] },
        overall_summary: { confluence_score: 72, confluence_label: 'bullish' },
      },
    };

    const result = compactMarketAnalysis(input);
    assert.ok(result._compact, '_compact field must exist');
    assert.equal(result._compact.symbol, 'AAPL');
    assert.ok(result._compact.summary, 'summary string must exist');
    assert.ok(result._compact.summary.length > 0);
    assert.ok(result._compact.raw_hint, 'raw_hint must exist');
    assert.equal(result.success, true, 'original fields preserved');
    assert.equal(result.symbol, 'AAPL', 'original symbol preserved');
  });

  it('handles missing analysis gracefully', () => {
    const input = { success: false, error: 'API timeout' };
    const result = compactMarketAnalysis(input);
    assert.ok(result._compact);
    assert.ok(result._compact.summary.includes('unavailable') || result._compact.summary.includes('error'));
  });
});

// ---------------------------------------------------------------------------
// compactConfluenceRank
// ---------------------------------------------------------------------------

describe('compactConfluenceRank', () => {
  it('produces ranked summary from full confluence result', () => {
    const input = {
      success: true,
      ranked_symbols: [
        { symbol: 'NVDA', confluence_score: 85, confluence_label: 'strong_bullish' },
        { symbol: 'AAPL', confluence_score: 62, confluence_label: 'bullish' },
      ],
    };

    const result = compactConfluenceRank(input);
    assert.ok(result._compact);
    assert.ok(Array.isArray(result._compact.top), 'top array must exist');
    assert.equal(result._compact.top[0].symbol, 'NVDA');
    assert.ok(result._compact.raw_hint);
    assert.deepEqual(result.ranked_symbols, input.ranked_symbols, 'original rankings preserved');
  });
});

// ---------------------------------------------------------------------------
// compactReachWeb
// ---------------------------------------------------------------------------

describe('compactReachWeb', () => {
  it('truncates long web content to excerpt', () => {
    const longContent = 'A'.repeat(5000);
    const input = {
      success: true,
      source: 'jina_reader',
      title: 'Long Article',
      content: longContent,
    };

    const result = compactReachWeb(input);
    assert.ok(result._compact);
    assert.ok(result._compact.excerpt.length < longContent.length, 'excerpt shorter than full');
    assert.ok(result._compact.excerpt.length <= 502, 'excerpt within limit');
    assert.equal(result._compact.title, 'Long Article');
    assert.ok(result._compact.raw_hint);
  });

  it('preserves short content without truncation', () => {
    const input = {
      success: true,
      title: 'Short',
      content: 'Hello world',
    };
    const result = compactReachWeb(input);
    assert.equal(result._compact.excerpt, 'Hello world');
  });
});

// ---------------------------------------------------------------------------
// compactReachRss
// ---------------------------------------------------------------------------

describe('compactReachRss', () => {
  it('compacts RSS items to title + link only', () => {
    const input = {
      success: true,
      feedTitle: 'Tech News',
      count: 3,
      items: [
        { title: 'Article 1', link: 'https://a.com/1', publishedAt: '2026-04-15', summary: 'long...' },
        { title: 'Article 2', link: 'https://a.com/2', publishedAt: '2026-04-14', summary: 'long...' },
        { title: 'Article 3', link: 'https://a.com/3', publishedAt: '2026-04-13', summary: 'long...' },
      ],
    };

    const result = compactReachRss(input);
    assert.ok(result._compact);
    assert.equal(result._compact.feedTitle, 'Tech News');
    assert.equal(result._compact.items.length, 3);
    assert.equal(result._compact.items[0].title, 'Article 1');
    assert.equal(result._compact.items[0].link, 'https://a.com/1');
    assert.equal(result._compact.items[0].publishedAt, '2026-04-15');
    assert.equal(result._compact.items[0].summary, undefined, 'summary stripped');
  });
});

// ---------------------------------------------------------------------------
// compactReachReddit
// ---------------------------------------------------------------------------

describe('compactReachReddit', () => {
  it('compacts reddit posts to title + score + subreddit', () => {
    const input = {
      success: true,
      count: 1,
      posts: [
        { id: 'abc', title: 'NVDA earnings', subreddit: 'stocks', score: 42, author: 'alice', body: 'long body...' },
      ],
    };

    const result = compactReachReddit(input);
    assert.ok(result._compact);
    assert.equal(result._compact.posts[0].title, 'NVDA earnings');
    assert.equal(result._compact.posts[0].subreddit, 'stocks');
    assert.equal(result._compact.posts[0].score, 42);
    assert.equal(result._compact.posts[0].body, undefined, 'body stripped');
  });
});

describe('compactReachRedditPost', () => {
  it('compacts a reddit post read to post summary + comment count', () => {
    const input = {
      success: true,
      postId: 'abc123',
      commentCount: 2,
      post: {
        id: 'abc123',
        title: 'NVDA discussion',
        subreddit: 'stocks',
        score: 25,
        body: 'long post body...',
      },
      comments: [{ id: 'c1' }, { id: 'c2' }],
    };

    const result = compactReachRedditPost(input);
    assert.ok(result._compact);
    assert.equal(result._compact.postId, 'abc123');
    assert.equal(result._compact.commentCount, 2);
    assert.equal(result._compact.post.title, 'NVDA discussion');
    assert.equal(result._compact.post.body, undefined, 'body stripped');
  });
});

// ---------------------------------------------------------------------------
// compactReachYoutube
// ---------------------------------------------------------------------------

describe('compactReachYoutube', () => {
  it('compacts youtube result to title + author + transcript flag', () => {
    const input = {
      success: true,
      title: 'Market Update',
      author: 'analyst',
      transcriptAvailable: true,
      transcriptExcerpt: 'very long transcript...',
      description: 'full video description...',
    };

    const result = compactReachYoutube(input);
    assert.ok(result._compact);
    assert.equal(result._compact.title, 'Market Update');
    assert.equal(result._compact.author, 'analyst');
    assert.equal(result._compact.hasTranscript, true);
    assert.equal(result._compact.transcriptExcerpt, undefined, 'transcript stripped from compact');
  });
});

// ---------------------------------------------------------------------------
// compactTwitterSearch
// ---------------------------------------------------------------------------

describe('compactTwitterSearch', () => {
  it('compacts twitter search to id + author + truncated text', () => {
    const input = {
      success: true,
      query: 'NVDA',
      count: 2,
      posts: [
        { id: '1', text: 'A'.repeat(300), author: { username: 'alice' } },
        { id: '2', text: 'Short post', author: { username: 'bob' } },
      ],
    };

    const result = compactTwitterSearch(input);
    assert.ok(result._compact);
    assert.equal(result._compact.query, 'NVDA');
    assert.equal(result._compact.count, 2);
    assert.ok(result._compact.posts[0].text.length <= 142, 'text truncated');
    assert.equal(result._compact.posts[1].text, 'Short post');
    assert.ok(result._compact.raw_hint);
  });
});

// ---------------------------------------------------------------------------
// compactTwitterUserPosts
// ---------------------------------------------------------------------------

describe('compactTwitterUserPosts', () => {
  it('compacts user posts similarly to search', () => {
    const input = {
      success: true,
      username: 'jack',
      count: 1,
      posts: [
        { id: '10', text: 'Hello from Jack' },
      ],
    };

    const result = compactTwitterUserPosts(input);
    assert.ok(result._compact);
    assert.equal(result._compact.username, 'jack');
    assert.equal(result._compact.posts[0].text, 'Hello from Jack');
  });
});

describe('compactTwitterTweetDetail', () => {
  it('compacts tweet detail to tweet metadata + truncated text', () => {
    const input = {
      success: true,
      tweetId: '123',
      tweet: {
        id: '123',
        text: 'A'.repeat(300),
        author: { username: 'alice' },
      },
    };

    const result = compactTwitterTweetDetail(input);
    assert.ok(result._compact);
    assert.equal(result._compact.tweetId, '123');
    assert.equal(result._compact.tweet.id, '123');
    assert.equal(result._compact.tweet.author, 'alice');
    assert.ok(result._compact.tweet.text.length <= 142, 'text truncated');
  });
});

// ---------------------------------------------------------------------------
// compactObserveSnapshot
// ---------------------------------------------------------------------------

describe('compactObserveSnapshot', () => {
  it('compacts observe snapshot to key state fields', () => {
    const input = {
      success: true,
      snapshot_id: 'snapshot-20260415T120000Z',
      generated_at: '2026-04-15T12:00:00.000Z',
      connection: { host: 'localhost', port: 9222, url: 'http://localhost:9222', target_id: 'T1', target_title: 'Chart' },
      page_state: { url: 'https://tv.com/chart', title: 'TradingView', chart_symbol: 'AAPL', chart_resolution: 'D', chart_type: 1, api_available: true },
      runtime_errors: [{ message: 'err1' }, { message: 'err2' }],
      artifacts: { screenshot_path: '/path/to/page.png' },
      warnings: ['warn1'],
    };

    const result = compactObserveSnapshot(input);
    assert.ok(result._compact);
    assert.equal(result._compact.snapshot_id, 'snapshot-20260415T120000Z');
    assert.equal(result._compact.symbol, 'AAPL');
    assert.equal(result._compact.resolution, 'D');
    assert.equal(result._compact.connected, true);
    assert.equal(result._compact.errorCount, 2);
    assert.equal(result._compact.warningCount, 1);
    assert.ok(result._compact.raw_hint);
    assert.equal(result.success, true, 'original preserved');
  });

  it('handles failed snapshot gracefully', () => {
    const input = {
      success: false,
      error: 'CDP connection failed',
      snapshot_id: 'snap-1',
      bundle_dir: 'results/snap-1',
      artifacts: { manifest_path: 'results/snap-1/manifest.json' },
      page_state: { url: null, title: null, chart_symbol: null },
      runtime_errors: [],
      warnings: [],
    };

    const result = compactObserveSnapshot(input);
    assert.ok(result._compact);
    assert.equal(result._compact.connected, false);
    assert.ok(result._compact.summary.includes('failed') || result._compact.summary.includes('error'));
  });
});

// ---------------------------------------------------------------------------
// applyCompaction — generic dispatcher
// ---------------------------------------------------------------------------

describe('applyCompaction', () => {
  it('applies compaction for known surface names', () => {
    const input = {
      success: true,
      symbol: 'AAPL',
      analysis: {
        trend: { direction: 'up' },
        overall_summary: { confluence_score: 50, confluence_label: 'neutral' },
      },
    };
    const result = applyCompaction('market_symbol_analysis', input);
    assert.ok(result._compact);
  });

  it('returns input unchanged for unknown surfaces', () => {
    const input = { success: true, data: 'hello' };
    const result = applyCompaction('some_unknown_tool', input);
    assert.equal(result._compact, undefined, 'no _compact for unknown tool');
    assert.deepEqual(result, input);
  });

  it('preserves all original fields', () => {
    const input = {
      success: true,
      query: 'test',
      count: 1,
      posts: [{ id: '1', text: 'hello', author: { username: 'a' } }],
    };
    const result = applyCompaction('x_search_posts', input);
    assert.equal(result.success, true);
    assert.equal(result.query, 'test');
    assert.equal(result.count, 1);
    assert.ok(result._compact);
  });

  it('adds summary profile metadata for known surfaces', () => {
    const input = {
      success: true,
      query: 'test',
      count: 1,
      posts: [{ id: '1', text: 'hello', author: { username: 'a' } }],
    };
    const result = applyCompaction('x_search_posts', input);
    assert.equal(result._compact.profile_type, 'post_list');
  });
});

describe('renderCompactPayload', () => {
  it('emits a smaller payload when _compact exists', () => {
    const full = {
      success: true,
      query: 'NVDA',
      count: 2,
      source: 'twitter-cli',
      retrieved_at: '2026-04-15T12:00:00.000Z',
      posts: [
        { id: '1', text: 'A'.repeat(200), author: { username: 'alice' }, extra: 'x'.repeat(200) },
        { id: '2', text: 'B'.repeat(200), author: { username: 'bob' }, extra: 'y'.repeat(200) },
      ],
      _compact: {
        raw_hint: 'Re-run without compact mode to inspect the full result.',
        query: 'NVDA',
        count: 2,
        posts: [
          { id: '1', text: 'short', author: 'alice' },
          { id: '2', text: 'short', author: 'bob' },
        ],
      },
    };

    const compact = renderCompactPayload(full);
    assert.ok(JSON.stringify(compact).length < JSON.stringify(full).length);
    assert.equal(compact.success, true);
    assert.equal(compact.source, 'twitter-cli');
    assert.equal(compact.query, 'NVDA');
    assert.equal(compact.posts.length, 2);
  });

  it('returns input unchanged when _compact is absent', () => {
    const input = { success: true, data: 'hello' };
    assert.deepEqual(renderCompactPayload(input), input);
  });

  it('preserves observe artifact locations in compact mode', () => {
    const full = compactObserveSnapshot({
      success: true,
      snapshot_id: 'snap-1',
      bundle_dir: 'results/snap-1',
      artifacts: {
        manifest_path: 'results/snap-1/manifest.json',
        screenshot_path: 'results/snap-1/page.png',
      },
      connection: { target_id: 'target-1' },
      page_state: { chart_symbol: 'AAPL', chart_resolution: 'D' },
      runtime_errors: [],
      warnings: [],
    });

    const compact = renderCompactPayload(full);
    assert.equal(compact.bundle_dir, 'results/snap-1');
    assert.deepEqual(compact.artifacts, {
      manifest_path: 'results/snap-1/manifest.json',
      screenshot_path: 'results/snap-1/page.png',
    });
  });
});

// ---------------------------------------------------------------------------
// applyCompaction — artifact path / full output hint (additive contract)
// ---------------------------------------------------------------------------

describe('applyCompaction with artifactPath option', () => {
  it('adds artifact_path and full_output_hint when artifactPath is provided', () => {
    const input = {
      success: true,
      query: 'NVDA',
      count: 1,
      posts: [{ id: '1', text: 'hello', author: { username: 'a' } }],
    };
    const result = applyCompaction('x_search_posts', input, {
      artifactPath: '.output-artifacts/raw/x_search_posts/nvda.json',
    });
    assert.ok(result._compact);
    assert.equal(result._compact.artifact_path, '.output-artifacts/raw/x_search_posts/nvda.json');
    assert.ok(result._compact.full_output_hint, 'full_output_hint must exist');
    assert.ok(result._compact.full_output_hint.includes('.output-artifacts/'));
  });

  it('preserves raw_hint alongside artifact_path', () => {
    const input = {
      success: true,
      query: 'test',
      count: 0,
      posts: [],
    };
    const result = applyCompaction('x_search_posts', input, {
      artifactPath: 'some/path.json',
    });
    assert.ok(result._compact.raw_hint, 'raw_hint must still be present');
    assert.ok(result._compact.artifact_path, 'artifact_path must be added');
  });

  it('does not add artifact_path when opts is omitted', () => {
    const input = { success: true, symbol: 'AAPL', analysis: { trend: { direction: 'up' } } };
    const result = applyCompaction('market_symbol_analysis', input);
    assert.ok(result._compact);
    assert.equal(result._compact.artifact_path, undefined);
    assert.equal(result._compact.full_output_hint, undefined);
  });

  it('does not add artifact_path for unknown surfaces even with opts', () => {
    const input = { success: true, data: 'hello' };
    const result = applyCompaction('unknown_surface', input, {
      artifactPath: 'some/path.json',
    });
    assert.equal(result._compact, undefined, 'unknown surfaces return no _compact');
  });
});

// ---------------------------------------------------------------------------
// renderCompactPayload — artifact_path preservation
// ---------------------------------------------------------------------------

describe('renderCompactPayload with artifact_path', () => {
  it('preserves artifact_path and full_output_hint in rendered compact output', () => {
    const full = applyCompaction('x_search_posts', {
      success: true,
      query: 'test',
      count: 1,
      source: 'twitter-cli',
      posts: [{ id: '1', text: 'A'.repeat(200), author: { username: 'alice' } }],
    }, { artifactPath: '.output-artifacts/raw/x_search_posts/test.json' });

    const compact = renderCompactPayload(full);
    assert.equal(compact.artifact_path, '.output-artifacts/raw/x_search_posts/test.json');
    assert.ok(compact.full_output_hint);
    assert.ok(compact.raw_hint, 'raw_hint preserved');
    assert.equal(compact.profile_type, 'post_list');
  });

  it('observe bundle_dir/artifacts are not overwritten by artifact_path', () => {
    const full = compactObserveSnapshot({
      success: true,
      snapshot_id: 'snap-2',
      bundle_dir: 'results/snap-2',
      artifacts: { manifest_path: 'results/snap-2/manifest.json' },
      connection: { target_id: 'T1' },
      page_state: { chart_symbol: 'BTC', chart_resolution: '1H' },
      runtime_errors: [],
      warnings: [],
    });
    full._compact.artifact_path = '.output-artifacts/raw/tv_observe_snapshot/snap-2.json';
    full._compact.full_output_hint = 'Full raw output saved to: ...';

    const compact = renderCompactPayload(full);
    assert.equal(compact.bundle_dir, 'results/snap-2', 'original bundle_dir preserved');
    assert.deepEqual(compact.artifacts, { manifest_path: 'results/snap-2/manifest.json' });
    assert.ok(compact.artifact_path, 'new artifact_path also present');
  });
});

// ---------------------------------------------------------------------------
// compact payload size contract
// ---------------------------------------------------------------------------

describe('compact payload size contract', () => {
  it('compact twitter search is smaller than full', () => {
    const full = {
      success: true,
      query: 'NVDA',
      count: 5,
      source: 'twitter-cli',
      posts: Array.from({ length: 5 }, (_, i) => ({
        id: String(i),
        text: 'X'.repeat(500),
        author: { username: `user${i}`, bio: 'B'.repeat(200) },
        extra: 'Y'.repeat(300),
      })),
    };
    const compacted = applyCompaction('x_search_posts', full);
    const compact = renderCompactPayload(compacted);
    assert.ok(
      JSON.stringify(compact).length < JSON.stringify(full).length,
      'compact must be smaller than full',
    );
  });

  it('compact market analysis is smaller than full', () => {
    const full = {
      success: true,
      symbol: 'AAPL',
      analysis: {
        trend: { direction: 'bullish', strength: 'strong', details: 'D'.repeat(500) },
        fundamentals: { pe_ratio: 28.5, market_cap: 3e12, raw_data: 'R'.repeat(1000) },
        risk: { level: 'moderate', factors: ['a', 'b', 'c'], details: 'D'.repeat(800) },
        overall_summary: { confluence_score: 72, confluence_label: 'bullish' },
      },
    };
    const compacted = applyCompaction('market_symbol_analysis', full);
    const compact = renderCompactPayload(compacted);
    assert.ok(
      JSON.stringify(compact).length < JSON.stringify(full).length,
      'compact must be smaller than full',
    );
  });

  it('compact reach web is smaller than full for large content', () => {
    const full = {
      success: true,
      source: 'jina_reader',
      title: 'Big Article',
      content: 'C'.repeat(10000),
    };
    const compacted = applyCompaction('reach_read_web', full);
    const compact = renderCompactPayload(compacted);
    assert.ok(
      JSON.stringify(compact).length < JSON.stringify(full).length,
      'compact must be smaller than full',
    );
  });
});

// ---------------------------------------------------------------------------
// compact=false unchanged
// ---------------------------------------------------------------------------

describe('compact=false leaves result unchanged', () => {
  const surfaces = [
    'market_symbol_analysis',
    'x_search_posts',
    'reach_read_web',
    'tv_observe_snapshot',
  ];

  for (const s of surfaces) {
    it(`applyCompaction('${s}', ...) without renderCompactPayload preserves all original fields`, () => {
      const input = { success: true, data: 'original', extra: { nested: true } };
      const result = applyCompaction(s, input);
      assert.equal(result.success, true);
      assert.equal(result.data, 'original');
      assert.deepEqual(result.extra, { nested: true });
    });
  }

  it('renderCompactPayload returns input unchanged when _compact is absent', () => {
    const input = { success: true, data: 'hello', nested: { a: 1 } };
    const result = renderCompactPayload(input);
    assert.deepEqual(result, input);
  });
});

// ---------------------------------------------------------------------------
// output-summary-profiles
// ---------------------------------------------------------------------------

describe('output-summary-profiles', () => {
  it('getSummaryProfile returns a profile for known surfaces', () => {
    const p = getSummaryProfile('reach_read_web');
    assert.ok(p, 'profile must exist');
    assert.ok(p.type, 'profile must have a type');
    assert.ok(p.label, 'profile must have a label');
  });

  it('getSummaryProfile returns null for unknown surfaces', () => {
    const p = getSummaryProfile('totally_unknown');
    assert.equal(p, null);
  });

  it('listSummaryProfiles returns all defined profiles', () => {
    const profiles = listSummaryProfiles();
    assert.ok(Object.keys(profiles).length >= 5, 'at least 5 profiles expected');
    for (const [key, profile] of Object.entries(profiles)) {
      assert.ok(profile.type, `${key} must have type`);
      assert.ok(profile.label, `${key} must have label`);
    }
  });

  it('all compaction surfaces have a matching summary profile', () => {
    const compactionSurfaces = [
      'market_symbol_analysis',
      'market_confluence_rank',
      'reach_read_web',
      'reach_read_rss',
      'reach_search_reddit',
      'reach_read_reddit_post',
      'reach_read_youtube',
      'x_search_posts',
      'x_user_posts',
      'x_tweet_detail',
      'tv_observe_snapshot',
    ];
    for (const s of compactionSurfaces) {
      const p = getSummaryProfile(s);
      assert.ok(p, `summary profile must exist for ${s}`);
    }
  });
});
