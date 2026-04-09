import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { computeConfluenceSummary } from '../src/core/market-confluence.js';

describe('computeConfluenceSummary', () => {
  it('returns a favourable score when trend and fundamentals align with low risk', () => {
    const result = computeConfluenceSummary(
      { stance: 'bullish', confidence: 'high', signals: [], warnings: [] },
      { stance: 'strong', confidence: 'high', signals: [], warnings: [] },
      { stance: 'active', confidence: 'high', signals: [], warnings: [] },
      { stance: 'low', confidence: 'medium', signals: [], warnings: [] },
      { quote: true, fundamentals: true, ta: true, news: true },
    );

    assert.equal(result.confluence_label, 'favourable');
    assert.ok(result.confluence_score >= 70);
    assert.equal(result.coverage_summary.core_available, 3);
    assert.equal(result.coverage_summary.news_available, true);
  });

  it('returns a mixed score when directional analysts conflict', () => {
    const result = computeConfluenceSummary(
      { stance: 'bullish', confidence: 'medium', signals: [], warnings: [] },
      { stance: 'weak', confidence: 'high', signals: [], warnings: [] },
      { stance: 'quiet', confidence: 'low', signals: [], warnings: [] },
      { stance: 'moderate', confidence: 'medium', signals: [], warnings: [] },
      { quote: true, fundamentals: true, ta: true, news: false },
    );

    assert.equal(result.confluence_label, 'mixed');
    assert.ok(result.confluence_score >= 40 && result.confluence_score <= 60);
    assert.equal(result.coverage_summary.core_available, 3);
    assert.equal(result.coverage_summary.news_available, false);
  });

  it('degrades to mixed low-confidence when fewer than two core datasets are available', () => {
    const result = computeConfluenceSummary(
      { stance: 'neutral', confidence: 'low', signals: [], warnings: ['No trend data available'] },
      { stance: 'strong', confidence: 'medium', signals: [], warnings: [] },
      { stance: 'quiet', confidence: 'low', signals: [], warnings: [] },
      { stance: 'unknown', confidence: 'low', signals: [], warnings: ['Risk data unavailable'] },
      { quote: false, fundamentals: true, ta: false, news: false },
    );

    assert.equal(result.confluence_label, 'mixed');
    assert.equal(result.confluence_score, 50);
    assert.equal(result.coverage_summary.core_available, 1);
    assert.ok(result.warnings.some((warning) => /fewer than two core datasets/i.test(warning)));
  });

  it('uses news only as coverage/support and not as directional score input', () => {
    const withoutNews = computeConfluenceSummary(
      { stance: 'bullish', confidence: 'medium', signals: [], warnings: [] },
      { stance: 'strong', confidence: 'medium', signals: [], warnings: [] },
      { stance: 'quiet', confidence: 'low', signals: [], warnings: [] },
      { stance: 'moderate', confidence: 'medium', signals: [], warnings: [] },
      { quote: true, fundamentals: true, ta: true, news: false },
    );
    const withNews = computeConfluenceSummary(
      { stance: 'bullish', confidence: 'medium', signals: [], warnings: [] },
      { stance: 'strong', confidence: 'medium', signals: [], warnings: [] },
      { stance: 'active', confidence: 'high', signals: [], warnings: [] },
      { stance: 'moderate', confidence: 'medium', signals: [], warnings: [] },
      { quote: true, fundamentals: true, ta: true, news: true },
    );

    assert.equal(withoutNews.confluence_score, withNews.confluence_score);
    assert.notEqual(withoutNews.coverage_summary.news_available, withNews.coverage_summary.news_available);
  });
});
