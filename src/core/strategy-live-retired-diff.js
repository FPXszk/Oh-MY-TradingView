// ---------------------------------------------------------------------------
// Strategy live/retired diff — comparison and reporting utilities
// ---------------------------------------------------------------------------

import { getLiveStrategies, getRetiredStrategies } from './strategy-catalog.js';

function deriveFamilyId(strategy) {
  if (strategy.theme_axis) {
    return strategy.theme_axis;
  }
  const firstTag = Array.isArray(strategy.tags) && strategy.tags.length > 0
    ? strategy.tags[0]
    : 'unknown';
  return `${strategy.builder}-${firstTag}`;
}

export function computeFamilyDiff(catalog) {
  const familyMap = new Map();

  for (const strategy of catalog.strategies) {
    const familyId = deriveFamilyId(strategy);
    if (!familyMap.has(familyId)) {
      familyMap.set(familyId, { family_id: familyId, live_count: 0, retired_count: 0 });
    }
    const entry = familyMap.get(familyId);
    if (strategy.lifecycle.status === 'live') {
      entry.live_count += 1;
    } else {
      entry.retired_count += 1;
    }
  }

  return [...familyMap.values()].sort((a, b) => {
    const diff = b.live_count - a.live_count;
    if (diff !== 0) return diff;
    return b.retired_count - a.retired_count;
  });
}

export function buildRetiredLedger(catalog) {
  return getRetiredStrategies(catalog).map((strategy) => ({
    presetId: strategy.id,
    retire_reason: strategy.lifecycle.retire_reason,
    last_strong_generation: strategy.lifecycle.last_strong_generation,
    replacement_family: strategy.lifecycle.replacement_family,
  }));
}

export function buildDiffArtifact(catalog) {
  const live = getLiveStrategies(catalog);
  const retired = getRetiredStrategies(catalog);
  const familyDiff = computeFamilyDiff(catalog);
  const retiredLedger = buildRetiredLedger(catalog);

  return {
    generated_at: new Date().toISOString(),
    live_count: live.length,
    retired_count: retired.length,
    total_count: catalog.strategies.length,
    family_diff: familyDiff,
    retired_ledger: retiredLedger,
  };
}

export function formatDiffSummarySection(diffArtifact) {
  const lines = [
    '## Live / Retired diff',
    '',
    `- live_count: ${diffArtifact.live_count}`,
    `- retired_count: ${diffArtifact.retired_count}`,
    `- total_count: ${diffArtifact.total_count}`,
    '',
    '| family | live | retired |',
    '| --- | ---: | ---: |',
  ];

  for (const family of diffArtifact.family_diff) {
    lines.push(`| ${family.family_id} | ${family.live_count} | ${family.retired_count} |`);
  }

  return lines.join('\n');
}
