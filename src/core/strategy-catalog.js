// ---------------------------------------------------------------------------
// Strategy catalog — single source of truth for strategy lifecycle metadata
// ---------------------------------------------------------------------------

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPublicStrategyRegistry } from './public-strategy-registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const CATALOG_PATH = join(__dirname, '..', '..', 'config', 'backtest', 'strategy-catalog.json');

const VALID_STATUSES = new Set(['live', 'retired']);

export async function loadCatalog(catalogPath = CATALOG_PATH, { includePublic = false } = {}) {
  const raw = await readFile(catalogPath, 'utf8');
  const catalog = JSON.parse(raw);
  if (!includePublic) {
    return catalog;
  }
  const registry = await loadPublicStrategyRegistry().catch(() => ({ strategies: [] }));
  const publicStrategies = Array.isArray(registry.strategies) ? registry.strategies : [];
  if (publicStrategies.length === 0) {
    return catalog;
  }

  return {
    ...catalog,
    strategies: [
      ...catalog.strategies,
      ...publicStrategies,
    ],
  };
}

export function getLiveStrategies(catalog) {
  return catalog.strategies.filter((s) => s.lifecycle.status === 'live');
}

export function getRetiredStrategies(catalog) {
  return catalog.strategies.filter((s) => s.lifecycle.status === 'retired');
}

export function findStrategyById(catalog, id) {
  return catalog.strategies.find((s) => s.id === id) || null;
}

export function validateCatalogIntegrity(catalog) {
  const errors = [];

  if (!catalog || !Array.isArray(catalog.strategies)) {
    return { valid: false, errors: ['catalog.strategies must be an array'] };
  }

  // Check unique IDs
  const seen = new Set();
  for (const strategy of catalog.strategies) {
    if (!strategy.id) {
      errors.push('strategy missing id');
      continue;
    }
    if (seen.has(strategy.id)) {
      errors.push(`duplicate strategy id: ${strategy.id}`);
    }
    seen.add(strategy.id);
  }

  // Check valid statuses
  for (const strategy of catalog.strategies) {
    if (!strategy.lifecycle || !VALID_STATUSES.has(strategy.lifecycle.status)) {
      errors.push(`strategy "${strategy.id}" has invalid lifecycle.status`);
    }
  }

  // Check retired required fields
  const retired = catalog.strategies.filter(
    (s) => s.lifecycle && s.lifecycle.status === 'retired',
  );
  for (const strategy of retired) {
    const lc = strategy.lifecycle;
    if (!lc.retire_reason) {
      errors.push(`retired strategy "${strategy.id}" missing retire_reason`);
    }
    if (!('last_strong_generation' in lc)) {
      errors.push(`retired strategy "${strategy.id}" missing last_strong_generation`);
    }
    if (!('replacement_family' in lc)) {
      errors.push(`retired strategy "${strategy.id}" missing replacement_family`);
    }
  }

  // Check no overlap between live and retired
  const liveIds = new Set(
    catalog.strategies
      .filter((s) => s.lifecycle?.status === 'live')
      .map((s) => s.id),
  );
  for (const strategy of retired) {
    if (liveIds.has(strategy.id)) {
      errors.push(`strategy "${strategy.id}" appears in both live and retired`);
    }
  }

  return { valid: errors.length === 0, errors };
}
