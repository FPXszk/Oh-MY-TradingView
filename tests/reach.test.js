import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getReachStatus,
  readWebContent,
  readRssFeed,
  searchRedditPosts,
  readRedditPost,
  readYoutubeContent,
} from '../src/core/reach.js';
import { registerReachTools } from '../src/tools/reach.js';

function createFetchResponse(body, ok = true, status = 200) {
  return {
    ok,
    status,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
  };
}

function createFetchMock(routes) {
  return async (url) => {
    const key = String(url);
    const route = routes[key];
    if (!route) {
      throw new Error(`unexpected fetch: ${key}`);
    }
    if (route instanceof Error) {
      throw route;
    }
    return route;
  };
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

describe('reach validation', () => {
  it('rejects missing web url', async () => {
    await assert.rejects(
      () => readWebContent({}),
      /url is required/,
    );
  });

  it('rejects invalid rss maxItems', async () => {
    await assert.rejects(
      () => readRssFeed({ url: 'https://example.com/feed.xml', maxItems: 0 }),
      /maxItems must be an integer between 1 and 20/,
    );
  });

  it('rejects private rss urls', async () => {
    await assert.rejects(
      () => readRssFeed({ url: 'http://127.0.0.1/feed.xml' }),
      /public http\(s\) URL/,
    );
  });

  it('rejects missing reddit query', async () => {
    await assert.rejects(
      () => searchRedditPosts({}),
      /query is required/,
    );
  });

  it('rejects missing reddit post id', async () => {
    await assert.rejects(
      () => readRedditPost({}),
      /postId is required/,
    );
  });

  it('rejects invalid youtube url', async () => {
    await assert.rejects(
      () => readYoutubeContent({ url: 'notaurl' }),
      /valid URL is required/,
    );
  });
});

describe('reach success paths', () => {
  it('returns normalized reach status with youtube richer mode when yt-dlp exists', async () => {
    const result = await getReachStatus({
      _deps: {
        access: async () => undefined,
        cwd: () => '/tmp',
        env: {},
      },
    });

    assert.equal(result.success, true);
    assert.equal(result.channels.web.ready, true);
    assert.equal(result.channels.rss.ready, true);
    assert.equal(result.channels.reddit.ready, true);
    assert.equal(result.channels.youtube.ready, true);
    assert.equal(result.channels.youtube.mode, 'yt-dlp');
  });

  it('returns normalized web content via Jina Reader', async () => {
    const result = await readWebContent({
      url: 'https://example.com/post',
      _deps: {
        fetch: createFetchMock({
          'https://r.jina.ai/http://example.com/post': createFetchResponse('Title: Example Post\n\nMarkdown Content:\n# Example Post\n\nHello world content'),
        }),
      },
    });

    assert.equal(result.success, true);
    assert.equal(result.source, 'jina_reader');
    assert.equal(result.title, 'Example Post');
    assert.match(result.content, /Hello world/);
  });

  it('returns normalized rss items', async () => {
    const result = await readRssFeed({
      url: 'https://example.com/feed.xml',
      maxItems: 2,
      _deps: {
        fetch: createFetchMock({
          'https://example.com/feed.xml': createFetchResponse(`<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Example Feed</title>
    <item>
      <title>First</title>
      <link>https://example.com/first</link>
      <pubDate>Thu, 09 Apr 2026 10:00:00 GMT</pubDate>
      <description>Hello first</description>
    </item>
    <item>
      <title>Second</title>
      <link>https://example.com/second</link>
      <pubDate>Thu, 09 Apr 2026 09:00:00 GMT</pubDate>
      <description>Hello second</description>
    </item>
  </channel>
</rss>`),
        }),
      },
    });

    assert.equal(result.success, true);
    assert.equal(result.feedTitle, 'Example Feed');
    assert.equal(result.count, 2);
    assert.equal(result.items[0].title, 'First');
  });

  it('returns normalized reddit search results', async () => {
    const result = await searchRedditPosts({
      query: 'NVDA earnings',
      maxResults: 2,
      _deps: {
        fetch: createFetchMock({
          'https://www.reddit.com/search.json?q=NVDA%20earnings&limit=2&sort=relevance&t=month': createFetchResponse({
            data: {
              children: [
                {
                  data: {
                    id: 'abc123',
                    title: 'NVDA discussion',
                    subreddit: 'stocks',
                    author: 'alice',
                    score: 42,
                    num_comments: 5,
                    permalink: '/r/stocks/comments/abc123/nvda_discussion/',
                    selftext: 'body text',
                    url: 'https://www.reddit.com/r/stocks/comments/abc123/nvda_discussion/',
                    created_utc: 1775720000,
                  },
                },
              ],
            },
          }),
        }),
      },
    });

    assert.equal(result.success, true);
    assert.equal(result.count, 1);
    assert.equal(result.posts[0].id, 'abc123');
    assert.equal(result.posts[0].subreddit, 'stocks');
  });

  it('returns normalized reddit post with comment tree', async () => {
    const result = await readRedditPost({
      postId: 'abc123',
      _deps: {
        fetch: createFetchMock({
          'https://www.reddit.com/comments/abc123.json?limit=10&depth=2&sort=top': createFetchResponse([
            {
              data: {
                children: [
                  {
                    data: {
                      id: 'abc123',
                      title: 'NVDA discussion',
                      selftext: 'post body',
                      subreddit: 'stocks',
                      author: 'alice',
                      score: 50,
                      num_comments: 2,
                      permalink: '/r/stocks/comments/abc123/nvda_discussion/',
                      url: 'https://www.reddit.com/r/stocks/comments/abc123/nvda_discussion/',
                      created_utc: 1775720000,
                    },
                  },
                ],
              },
            },
            {
              data: {
                children: [
                  {
                    kind: 't1',
                    data: {
                      id: 'c1',
                      author: 'bob',
                      body: 'first comment',
                      score: 10,
                      created_utc: 1775720100,
                      replies: {
                        data: {
                          children: [
                            {
                              kind: 't1',
                              data: {
                                id: 'c2',
                                author: 'carol',
                                body: 'reply comment',
                                score: 4,
                                created_utc: 1775720200,
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
            },
          ]),
        }),
      },
    });

    assert.equal(result.success, true);
    assert.equal(result.post.id, 'abc123');
    assert.equal(result.commentCount, 1);
    assert.equal(result.comments[0].replies[0].id, 'c2');
  });

  it('returns youtube metadata fallback when yt-dlp is unavailable', async () => {
    const result = await readYoutubeContent({
      url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
      _deps: {
        access: async () => {
          throw new Error('missing');
        },
        cwd: () => '/tmp',
        env: {},
        fetch: createFetchMock({
          'https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DjNQXAC9IVRw&format=json': createFetchResponse({
            title: 'Me at the zoo',
            author_name: 'jawed',
            author_url: 'https://www.youtube.com/@jawed',
            thumbnail_url: 'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg',
          }),
          'https://r.jina.ai/http://www.youtube.com/watch?v=jNQXAC9IVRw': createFetchResponse('Title: Me at the zoo\n\nMarkdown Content:\nJawed visits the zoo.'),
        }),
      },
    });

    assert.equal(result.success, true);
    assert.equal(result.title, 'Me at the zoo');
    assert.equal(result.author, 'jawed');
    assert.equal(result.transcriptAvailable, false);
    assert.match(result.warning, /yt-dlp/i);
  });

  it('returns youtube metadata and transcript excerpt when yt-dlp is available', async () => {
    const result = await readYoutubeContent({
      url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
      _deps: {
        access: async () => undefined,
        cwd: () => '/tmp',
        env: {},
        execFile: createExecSuccess(JSON.stringify({
          id: 'jNQXAC9IVRw',
          title: 'Me at the zoo',
          uploader: 'jawed',
          channel: 'jawed',
          description: 'video description',
          duration: 19,
          webpage_url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
          automatic_captions: {
            en: [
              { ext: 'vtt', url: 'https://example.com/subs.vtt' },
            ],
          },
        })),
        fetch: createFetchMock({
          'https://example.com/subs.vtt': createFetchResponse(`WEBVTT

00:00:00.000 --> 00:00:01.000
hello there

00:00:01.000 --> 00:00:02.000
general kenobi
`),
        }),
      },
    });

    assert.equal(result.success, true);
    assert.equal(result.source, 'yt-dlp');
    assert.equal(result.transcriptAvailable, true);
    assert.match(result.transcriptExcerpt, /hello there/);
  });

  it('ignores unsupported youtube subtitle formats', async () => {
    const result = await readYoutubeContent({
      url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
      _deps: {
        access: async () => undefined,
        cwd: () => '/tmp',
        env: {},
        execFile: createExecSuccess(JSON.stringify({
          id: 'jNQXAC9IVRw',
          title: 'Me at the zoo',
          uploader: 'jawed',
          automatic_captions: {
            en: [
              { ext: 'json3', url: 'https://example.com/subs.json3' },
            ],
          },
        })),
        fetch: createFetchMock({}),
      },
    });

    assert.equal(result.transcriptAvailable, false);
    assert.equal(result.transcriptExcerpt, null);
  });
});

describe('reach error handling', () => {
  it('surfaces Jina fetch failure clearly', async () => {
    await assert.rejects(
      () => readWebContent({
        url: 'https://example.com/post',
        _deps: {
          fetch: createFetchMock({
            'https://r.jina.ai/http://example.com/post': createFetchResponse('bad gateway', false, 502),
          }),
        },
      }),
      /HTTP 502/,
    );
  });

  it('surfaces malformed rss clearly', async () => {
    await assert.rejects(
      () => readRssFeed({
        url: 'https://example.com/feed.xml',
        _deps: {
          fetch: createFetchMock({
            'https://example.com/feed.xml': createFetchResponse('not xml at all'),
          }),
        },
      }),
      /RSS feed parse failed/,
    );
  });

  it('surfaces malformed reddit payload clearly', async () => {
    await assert.rejects(
      () => searchRedditPosts({
        query: 'NVDA',
        _deps: {
          fetch: createFetchMock({
            'https://www.reddit.com/search.json?q=NVDA&limit=5&sort=relevance&t=month': createFetchResponse({ bad: true }),
          }),
        },
      }),
      /reddit search response was malformed/,
    );
  });

  it('surfaces yt-dlp execution failures clearly', async () => {
    await assert.rejects(
      () => readYoutubeContent({
        url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
        _deps: {
          access: async () => undefined,
          cwd: () => '/tmp',
          env: {},
          execFile: createExecFailure({ message: 'boom', stderr: 'yt-dlp broke' }),
        },
      }),
      /youtube read failed: yt-dlp broke/,
    );
  });
});

describe('registerReachTools', () => {
  it('registers read-only reach tool names only', () => {
    const calls = [];
    const server = {
      tool(name, description, schema, handler) {
        calls.push({ name, description, schema, handler });
      },
    };

    registerReachTools(server);

    assert.deepEqual(
      calls.map((call) => call.name),
      [
        'reach_status',
        'reach_read_web',
        'reach_read_rss',
        'reach_search_reddit',
        'reach_read_reddit_post',
        'reach_read_youtube',
      ],
    );
  });
});
