import { access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROJECT_ROOT = join(__dirname, '..', '..');
export const RESEARCH_RESULTS_DIR = join(PROJECT_ROOT, 'docs', 'research', 'results');
export const SCREENSHOT_OUTPUT_DIR = join(RESEARCH_RESULTS_DIR, 'screenshots');
export const OBSERVABILITY_OUTPUT_DIR = join(RESEARCH_RESULTS_DIR, 'observability');

export const BACKTEST_CAMPAIGNS_DIR = join(PROJECT_ROOT, 'config', 'backtest', 'campaigns');
export const BACKTEST_UNIVERSES_DIR = join(PROJECT_ROOT, 'config', 'backtest', 'universes');
export const BACKTEST_PRESETS_PATH = join(PROJECT_ROOT, 'config', 'backtest', 'strategy-presets.json');

function buildSearchDirs(baseDir) {
  return [
    join(baseDir, 'latest'),
    baseDir,
    join(baseDir, 'archive'),
  ];
}

export const BACKTEST_CAMPAIGN_SEARCH_DIRS = buildSearchDirs(BACKTEST_CAMPAIGNS_DIR);
export const BACKTEST_UNIVERSE_SEARCH_DIRS = buildSearchDirs(BACKTEST_UNIVERSES_DIR);

export async function resolveNamedJsonPath(searchDirs, id, label) {
  for (const dir of searchDirs) {
    const candidate = join(dir, `${id}.json`);
    try {
      await access(candidate, fsConstants.R_OK);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error(`${label} "${id}" not found under: ${searchDirs.join(', ')}`);
}
