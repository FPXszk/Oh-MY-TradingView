import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdownReport } from '../scripts/screener/render-markdown-report.mjs';

describe('screener HTML report renderer', () => {
  it('renders Japanese headings, emphasis, and GFM tables in a standalone document', () => {
    const markdown = `# スクリーニング結果

## Phase4 個別銘柄ランキング

| 順位 | シンボル | 総合点 |
|:---:|:---|---:|
| 1 | **VLO** | 67.88 |
`;

    const html = renderMarkdownReport(markdown);

    assert.match(html, /^<!doctype html>/);
    assert.match(html, /<html lang="ja">/);
    assert.match(html, /<meta charset="utf-8">/);
    assert.match(html, /<title>スクリーニング結果<\/title>/);
    assert.match(html, /<h2>Phase4 個別銘柄ランキング<\/h2>/);
    assert.match(html, /<strong>VLO<\/strong>/);
    assert.match(html, /<div class="table-scroll"><table>/);
    assert.match(html, /<th[^>]*>順位<\/th>/);
    assert.match(html, /overflow-x: auto/);
    assert.match(html, /position: sticky/);
  });

  it('escapes the report title used in the HTML head', () => {
    const html = renderMarkdownReport('# A & B <Report>');

    assert.match(html, /<title>A &amp; B &lt;Report&gt;<\/title>/);
  });
});
