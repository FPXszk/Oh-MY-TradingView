import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { loadCatalog } from '../src/core/strategy-catalog.js';
import {
  computeFamilyDiff,
  buildRetiredLedger,
  buildDiffArtifact,
  formatDiffSummarySection,
} from '../src/core/strategy-live-retired-diff.js';

// ---------------------------------------------------------------------------
// computeFamilyDiff
// ---------------------------------------------------------------------------
describe('computeFamilyDiff', () => {
  it('returns correct counts for real catalog', async () => {
    const catalog = await loadCatalog();
    const families = computeFamilyDiff(catalog);
    assert.ok(Array.isArray(families));
    assert.ok(families.length > 0);

    const totalLive = families.reduce((sum, f) => sum + f.live_count, 0);
    const totalRetired = families.reduce((sum, f) => sum + f.retired_count, 0);
    assert.equal(totalLive, 25);
    assert.equal(totalRetired, 126);
  });

  it('every entry has family_id, live_count, retired_count', async () => {
    const catalog = await loadCatalog();
    const families = computeFamilyDiff(catalog);
    for (const family of families) {
      assert.ok(typeof family.family_id === 'string');
      assert.ok(typeof family.live_count === 'number');
      assert.ok(typeof family.retired_count === 'number');
    }
  });

  it('works with minimal synthetic catalog', () => {
    const catalog = {
      strategies: [
        { id: 'a', builder: 'donchian_breakout', theme_axis: 'tight', tags: [], lifecycle: { status: 'live' } },
        { id: 'b', builder: 'donchian_breakout', theme_axis: 'old-theme', tags: [], lifecycle: { status: 'retired', replacement_family: { family_id: 'dead-family', replacement_live_ids: ['a'] } } },
        { id: 'c', builder: 'ma_cross', tags: ['baseline'], lifecycle: { status: 'retired', replacement_family: { family_id: 'tight' } } },
      ],
    };
    const families = computeFamilyDiff(catalog);
    const tight = families.find((f) => f.family_id === 'tight');
    assert.ok(tight);
    assert.equal(tight.live_count, 1);
    assert.equal(tight.retired_count, 2, 'retired strategies should aggregate into replacement family');
  });

  it('aggregates retired strategies by replacement_family.family_id', async () => {
    const catalog = await loadCatalog();
    const families = computeFamilyDiff(catalog);
    const liveFamilies = families.filter((f) => f.live_count > 0);
    assert.ok(liveFamilies.length > 0, 'should have families with live strategies');
    const retiredInLiveFamilies = liveFamilies.reduce((sum, f) => sum + f.retired_count, 0);
    assert.ok(retiredInLiveFamilies > 0, 'retired strategies should appear in live family buckets via replacement_family');
  });
});

// ---------------------------------------------------------------------------
// buildRetiredLedger
// ---------------------------------------------------------------------------
describe('buildRetiredLedger', () => {
  it('returns all retired entries', async () => {
    const catalog = await loadCatalog();
    const ledger = buildRetiredLedger(catalog);
    assert.equal(ledger.length, 126);
  });

  it('every entry has presetId, retire_reason, last_strong_generation, replacement_family', async () => {
    const catalog = await loadCatalog();
    const ledger = buildRetiredLedger(catalog);
    for (const entry of ledger) {
      assert.ok(typeof entry.presetId === 'string');
      assert.ok('retire_reason' in entry);
      assert.ok('last_strong_generation' in entry);
      assert.ok('replacement_family' in entry);
    }
  });
});

// ---------------------------------------------------------------------------
// buildDiffArtifact
// ---------------------------------------------------------------------------
describe('buildDiffArtifact', () => {
  it('includes expected structure', async () => {
    const catalog = await loadCatalog();
    const artifact = buildDiffArtifact(catalog);
    assert.ok(artifact.generated_at);
    assert.equal(artifact.live_count, 25);
    assert.equal(artifact.retired_count, 126);
    assert.equal(artifact.total_count, 151);
    assert.ok(Array.isArray(artifact.family_diff));
    assert.ok(Array.isArray(artifact.retired_ledger));
  });
});

// ---------------------------------------------------------------------------
// formatDiffSummarySection
// ---------------------------------------------------------------------------
describe('formatDiffSummarySection', () => {
  it('returns markdown with counts', async () => {
    const catalog = await loadCatalog();
    const artifact = buildDiffArtifact(catalog);
    const markdown = formatDiffSummarySection(artifact);
    assert.ok(markdown.includes('## Live / Retired diff'));
    assert.ok(markdown.includes('live_count: 25'));
    assert.ok(markdown.includes('retired_count: 126'));
    assert.ok(markdown.includes('| family |'));
  });

  it('handles missing ranking artifact gracefully', () => {
    const artifact = {
      live_count: 0,
      retired_count: 0,
      total_count: 0,
      family_diff: [],
      retired_ledger: [],
    };
    const markdown = formatDiffSummarySection(artifact);
    assert.ok(markdown.includes('## Live / Retired diff'));
    assert.ok(markdown.includes('live_count: 0'));
  });
});
