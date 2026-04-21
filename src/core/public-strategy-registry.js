import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PUBLIC_STRATEGY_REGISTRY_PATH = join(
  __dirname,
  '..',
  '..',
  'config',
  'backtest',
  'public-library-top-strategies.json',
);

function normalizeLifecycle(entry) {
  const lifecycle = entry.lifecycle && typeof entry.lifecycle === 'object'
    ? entry.lifecycle
    : {};
  return {
    status: lifecycle.status || 'live',
    ...(lifecycle.retire_reason ? { retire_reason: lifecycle.retire_reason } : {}),
    ...(lifecycle.last_strong_generation != null ? { last_strong_generation: lifecycle.last_strong_generation } : {}),
    ...(lifecycle.replacement_family != null ? { replacement_family: lifecycle.replacement_family } : {}),
  };
}

export async function loadPublicStrategyRegistry(
  registryPath = PUBLIC_STRATEGY_REGISTRY_PATH,
) {
  const raw = await readFile(registryPath, 'utf8');
  const payload = JSON.parse(raw);
  const entries = Array.isArray(payload.strategies) ? payload.strategies : [];

  const strategies = [];
  for (const entry of entries) {
    const sourcePath = typeof entry.source_path === 'string' && entry.source_path.trim()
      ? join(dirname(registryPath), entry.source_path)
      : null;
    const source = sourcePath ? await readFile(sourcePath, 'utf8') : null;
    strategies.push({
      id: entry.id,
      name: entry.name,
      category: entry.category || 'public-library',
      builder: 'raw_source',
      parameters: entry.parameters && typeof entry.parameters === 'object' ? entry.parameters : {},
      source,
      public_library: {
        rank: entry.rank,
        author: entry.author,
        url: entry.url,
        snapshot_at: payload.snapshot_at || null,
        sort: payload.sort || null,
      },
      lifecycle: normalizeLifecycle(entry),
      tags: Array.isArray(entry.tags) ? entry.tags : ['public-library', 'open-source'],
    });
  }

  return {
    ...payload,
    strategies,
  };
}
