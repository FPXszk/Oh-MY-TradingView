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

function deriveReplacementFamilyId(strategy, liveFamilyIds, liveStrategiesById) {
  const replacementFamily = strategy.lifecycle?.replacement_family;
  const replacementFamilyId = replacementFamily?.family_id;

  if (replacementFamilyId && liveFamilyIds.has(replacementFamilyId)) {
    return replacementFamilyId;
  }

  if (Array.isArray(replacementFamily?.replacement_live_ids)) {
    for (const liveId of replacementFamily.replacement_live_ids) {
      const liveStrategy = liveStrategiesById.get(liveId);
      if (liveStrategy) {
        return deriveFamilyId(liveStrategy);
      }
    }
  }

  return replacementFamilyId || deriveFamilyId(strategy);
}

export function computeFamilyDiff(catalog) {
  const familyMap = new Map();
  const liveStrategies = getLiveStrategies(catalog);
  const liveFamilyIds = new Set(liveStrategies.map((strategy) => deriveFamilyId(strategy)));
  const liveStrategiesById = new Map(liveStrategies.map((strategy) => [strategy.id, strategy]));

  for (const strategy of catalog.strategies) {
    const isRetired = strategy.lifecycle.status === 'retired';
    const familyId = isRetired
      ? deriveReplacementFamilyId(strategy, liveFamilyIds, liveStrategiesById)
      : deriveFamilyId(strategy);
    if (!familyMap.has(familyId)) {
      familyMap.set(familyId, { family_id: familyId, live_count: 0, retired_count: 0 });
    }
    const entry = familyMap.get(familyId);
    if (isRetired) {
      entry.retired_count += 1;
    } else {
      entry.live_count += 1;
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
