import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CAMPAIGNS_DIR = join(__dirname, '..', '..', 'config', 'backtest', 'campaigns');
const UNIVERSES_DIR = join(__dirname, '..', '..', 'config', 'backtest', 'universes');
const PRESETS_PATH = join(__dirname, '..', '..', 'config', 'backtest', 'strategy-presets.json');

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_FROM = '2015-01-01';
const DEFAULT_TO = '2025-12-31';

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function buildRunKey(entry) {
  return `${entry.presetId}::${entry.symbol}`;
}

function parseRealIsoDate(value) {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) {
    return null;
  }

  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function normalizeSymbolEntry(entry, index) {
  if (typeof entry === 'string' && entry.trim()) {
    return {
      symbol: entry.trim(),
      label: entry.trim(),
      market: 'unknown',
      bucket: 'unknown',
      order: index,
    };
  }

  if (!entry || typeof entry !== 'object' || typeof entry.symbol !== 'string' || entry.symbol.trim().length === 0) {
    throw new Error(`Universe symbol entry at index ${index} must be a string or object with a non-empty symbol`);
  }

  return {
    symbol: entry.symbol.trim(),
    label: typeof entry.label === 'string' && entry.label.trim() ? entry.label.trim() : entry.symbol.trim(),
    market: typeof entry.market === 'string' && entry.market.trim() ? entry.market.trim() : 'unknown',
    bucket: typeof entry.bucket === 'string' && entry.bucket.trim() ? entry.bucket.trim() : 'unknown',
    order: index,
  };
}

function normalizeUniverseSymbols(universe) {
  const rawSymbols = Array.isArray(universe.symbols)
    ? universe.symbols
    : Array.isArray(universe.canonical_symbols)
      ? universe.canonical_symbols
      : [];

  return rawSymbols.map((entry, index) => normalizeSymbolEntry(entry, index));
}

function resolveStrategies(strategies, config) {
  if (Array.isArray(config.preset_ids) && config.preset_ids.length > 0) {
    return config.preset_ids.map((presetId) => {
      const preset = strategies.find((strategy) => strategy.id === presetId);
      if (!preset) {
        throw new Error(`Campaign preset "${presetId}" not found in strategy-presets.json`);
      }
      return preset;
    });
  }

  let result = filterStrategies(strategies, config.strategy_filter);
  if (config.strategy_limit && config.strategy_limit < result.length) {
    result = result.slice(0, config.strategy_limit);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Date override helpers (pure — unit testable)
// ---------------------------------------------------------------------------
export function validateDateRange(dateRange) {
  const errors = [];
  if (!dateRange || typeof dateRange !== 'object') {
    errors.push('date_override must be an object with "from" and "to" fields');
    return { valid: false, errors };
  }

  if (!parseRealIsoDate(dateRange.from)) {
    errors.push(`date_override.from must be ISO date (YYYY-MM-DD), got: ${dateRange.from}`);
  }
  if (!parseRealIsoDate(dateRange.to)) {
    errors.push(`date_override.to must be ISO date (YYYY-MM-DD), got: ${dateRange.to}`);
  }
  if (errors.length === 0 && dateRange.from > dateRange.to) {
    errors.push(`date_override.from (${dateRange.from}) must not be after to (${dateRange.to})`);
  }
  return { valid: errors.length === 0, errors };
}

export function mergeDateOverride(defaults, dateOverride) {
  if (!dateOverride) return defaults;

  return {
    ...defaults,
    date_range: {
      from: dateOverride.from ?? defaults.date_range?.from ?? DEFAULT_FROM,
      to: dateOverride.to ?? defaults.date_range?.to ?? DEFAULT_TO,
    },
  };
}

// ---------------------------------------------------------------------------
// Strategy filtering (pure — unit testable)
// ---------------------------------------------------------------------------
export function filterStrategies(strategies, filter) {
  if (!filter) return strategies;
  let result = strategies;

  if (filter.status && filter.status.length > 0) {
    result = result.filter((strategy) => filter.status.includes(strategy.status));
  }
  if (filter.builders && filter.builders.length > 0) {
    result = result.filter((strategy) => filter.builders.includes(strategy.builder));
  }
  if (filter.tags_any && filter.tags_any.length > 0) {
    result = result.filter((strategy) => {
      const tags = strategy.tags ?? [];
      return filter.tags_any.some((tag) => tags.includes(tag));
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Symbol / phase helpers (pure — unit testable)
// ---------------------------------------------------------------------------
export function selectPhaseSymbols(symbols, phase = 'full', phases) {
  if (!Array.isArray(symbols)) {
    return [];
  }

  const phaseConfig = phases?.[phase];
  if (!phaseConfig) {
    return symbols;
  }

  if (Array.isArray(phaseConfig.symbols) && phaseConfig.symbols.length > 0) {
    const allowed = new Set(phaseConfig.symbols);
    return symbols.filter((symbol) => allowed.has(symbol.symbol));
  }

  if (isPositiveInteger(phaseConfig.symbol_count)) {
    return symbols.slice(0, phaseConfig.symbol_count);
  }

  return symbols;
}

export function partitionRuns(items, workerCount) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }
  if (!isPositiveInteger(workerCount)) {
    throw new Error(`workerCount must be a positive integer, got: ${workerCount}`);
  }

  const shards = Array.from({ length: workerCount }, () => []);
  items.forEach((item, index) => {
    shards[index % workerCount].push(item);
  });
  return shards;
}

// ---------------------------------------------------------------------------
// Run matrix builder (pure — unit testable)
// ---------------------------------------------------------------------------
export function buildRunMatrix({ strategies, symbols }) {
  const runs = [];
  for (const strategy of strategies) {
    for (const symbolEntry of symbols) {
      const symbol = typeof symbolEntry === 'string' ? symbolEntry : symbolEntry.symbol;
      const run = { presetId: strategy.id, symbol };
      if (symbolEntry && typeof symbolEntry === 'object') {
        run.market = symbolEntry.market;
        run.bucket = symbolEntry.bucket;
        run.label = symbolEntry.label;
      }
      runs.push(run);
    }
  }
  return runs;
}

// ---------------------------------------------------------------------------
// Campaign config validation (pure — unit testable)
// ---------------------------------------------------------------------------
export function validateCampaignConfig(config) {
  const errors = [];
  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['config must be a non-null object'] };
  }

  if (typeof config.id !== 'string' || config.id.length === 0) {
    errors.push('id is required and must be a non-empty string');
  }
  if (typeof config.universe !== 'string' || config.universe.length === 0) {
    errors.push('universe is required and must be a non-empty string');
  }
  if (config.date_override) {
    const dateValidation = validateDateRange(config.date_override);
    if (!dateValidation.valid) {
      errors.push(...dateValidation.errors);
    }
  }

  if (Array.isArray(config.preset_ids)) {
    if (config.preset_ids.length === 0) {
      errors.push('preset_ids must contain at least one preset id');
    }
    if (!config.preset_ids.every((presetId) => typeof presetId === 'string' && presetId.length > 0)) {
      errors.push('preset_ids must contain only non-empty strings');
    }
  } else if (!config.strategy_filter) {
    errors.push('preset_ids or strategy_filter is required');
  }

  if (config.strategy_limit != null && !isPositiveInteger(config.strategy_limit)) {
    errors.push('strategy_limit must be a positive integer');
  }
  if (config.symbol_limit != null && !isPositiveInteger(config.symbol_limit)) {
    errors.push('symbol_limit must be a positive integer');
  }

  if (config.phases != null) {
    if (!config.phases || typeof config.phases !== 'object') {
      errors.push('phases must be an object when provided');
    } else {
      for (const [phaseName, phaseConfig] of Object.entries(config.phases)) {
        if (!phaseConfig || typeof phaseConfig !== 'object') {
          errors.push(`phases.${phaseName} must be an object`);
          continue;
        }
        if (phaseConfig.symbol_count != null && !isPositiveInteger(phaseConfig.symbol_count)) {
          errors.push(`phases.${phaseName}.symbol_count must be a positive integer`);
        }
        if (phaseConfig.symbols != null) {
          if (!Array.isArray(phaseConfig.symbols) || phaseConfig.symbols.length === 0) {
            errors.push(`phases.${phaseName}.symbols must be a non-empty array when provided`);
          } else if (!phaseConfig.symbols.every((symbol) => typeof symbol === 'string' && symbol.length > 0)) {
            errors.push(`phases.${phaseName}.symbols must contain only non-empty strings`);
          }
        }
      }
    }
  }

  if (config.execution) {
    const execution = config.execution;
    if (execution.checkpoint_every != null && !isPositiveInteger(execution.checkpoint_every)) {
      errors.push('execution.checkpoint_every must be a positive integer');
    }
    if (execution.cooldown_ms != null && (!Number.isInteger(execution.cooldown_ms) || execution.cooldown_ms < 0)) {
      errors.push('execution.cooldown_ms must be a non-negative integer');
    }
    if (execution.max_consecutive_failures != null && !isPositiveInteger(execution.max_consecutive_failures)) {
      errors.push('execution.max_consecutive_failures must be a positive integer');
    }
    if (execution.max_rerun_passes != null && (!Number.isInteger(execution.max_rerun_passes) || execution.max_rerun_passes < 0)) {
      errors.push('execution.max_rerun_passes must be a non-negative integer');
    }
    if (execution.worker_ports != null) {
      if (!Array.isArray(execution.worker_ports) || execution.worker_ports.length === 0) {
        errors.push('execution.worker_ports must be a non-empty array when provided');
      } else if (!execution.worker_ports.every((port) => isPositiveInteger(port))) {
        errors.push('execution.worker_ports must contain positive integers only');
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Campaign loader (file I/O — integration testable)
// ---------------------------------------------------------------------------
export async function loadCampaign(campaignId, { phase = 'full' } = {}) {
  const configPath = join(CAMPAIGNS_DIR, `${campaignId}.json`);
  const raw = await readFile(configPath, 'utf8');
  const config = JSON.parse(raw);

  const validation = validateCampaignConfig(config);
  if (!validation.valid) {
    throw new Error(`Campaign "${campaignId}" validation failed: ${validation.errors.join('; ')}`);
  }

  if (phase !== 'full' && !config.phases?.[phase]) {
    throw new Error(`Campaign "${campaignId}" does not define phase "${phase}"`);
  }

  const universePath = join(UNIVERSES_DIR, `${config.universe}.json`);
  const universeRaw = await readFile(universePath, 'utf8');
  const universe = JSON.parse(universeRaw);
  let symbols = selectPhaseSymbols(normalizeUniverseSymbols(universe), phase, config.phases);
  if (config.symbol_limit && config.symbol_limit < symbols.length) {
    symbols = symbols.slice(0, config.symbol_limit);
  }

  const presetsRaw = await readFile(PRESETS_PATH, 'utf8');
  const presetsData = JSON.parse(presetsRaw);
  let strategies = resolveStrategies(presetsData.strategies, config);
  if (strategies.length === 0) {
    throw new Error(`Campaign "${campaignId}" resolved zero executable strategies`);
  }

  const defaults = mergeDateOverride(presetsData.common_defaults, config.date_override);
  const matrix = buildRunMatrix({ strategies, symbols });

  return {
    config,
    universe,
    phase,
    symbols,
    strategies,
    defaults,
    matrix,
    totalRuns: matrix.length,
  };
}

// ---------------------------------------------------------------------------
// Checkpoint helpers (pure — unit testable)
// ---------------------------------------------------------------------------
export function collapseCompletedRuns(completedRuns) {
  const latestByRun = new Map();
  for (const entry of completedRuns) {
    latestByRun.set(buildRunKey(entry), entry);
  }
  return [...latestByRun.values()];
}

export function filterRunsToMatrix(entries, matrix) {
  const allowed = new Set(matrix.map((entry) => buildRunKey(entry)));
  return entries.filter((entry) => allowed.has(buildRunKey(entry)));
}

export function buildLegacyCampaignFingerprint({ config, defaults, phase, matrix }) {
  return createHash('sha1').update(JSON.stringify({
    campaign_id: config.id,
    phase,
    preset_ids: config.preset_ids ?? null,
    date_range: defaults.date_range ?? null,
    total_runs: matrix.length,
  })).digest('hex');
}

export function buildCampaignFingerprint({ config, defaults, phase, matrix }) {
  const matrixKeysHash = createHash('sha1')
    .update(matrix.map((entry) => buildRunKey(entry)).sort().join('\n'))
    .digest('hex');

  return createHash('sha1').update(JSON.stringify({
    campaign_id: config.id,
    universe: config.universe ?? null,
    phase,
    preset_ids: config.preset_ids ?? null,
    date_range: defaults.date_range ?? null,
    total_runs: matrix.length,
    matrix_keys_hash: matrixKeysHash,
  })).digest('hex');
}

export function checkpointMatchesCampaign({
  checkpoint,
  campaignId,
  phase,
  matrix,
  campaignFingerprint,
  legacyCampaignFingerprint,
}) {
  if (checkpoint.campaign_id && checkpoint.campaign_id !== campaignId) {
    return false;
  }

  if (checkpoint.phase && checkpoint.phase !== phase) {
    return false;
  }

  if (checkpoint.campaign_fingerprint === campaignFingerprint) {
    return true;
  }

  if (checkpoint.campaign_fingerprint !== legacyCampaignFingerprint) {
    return false;
  }

  const checkpointResults = Array.isArray(checkpoint.results) ? checkpoint.results : [];
  return filterRunsToMatrix(checkpointResults, matrix).length === checkpointResults.length;
}

export function buildCheckpoint({ campaignId, phase = 'full', campaignFingerprint, completedRuns, startedAt }) {
  const effectiveRuns = collapseCompletedRuns(completedRuns);
  return {
    campaign_id: campaignId,
    phase,
    campaign_fingerprint: campaignFingerprint,
    started_at: startedAt,
    updated_at: new Date().toISOString(),
    completed: effectiveRuns.length,
    results: completedRuns,
    effective_results: effectiveRuns,
    summary: summarizeResults(effectiveRuns.map((entry) => entry.result)),
  };
}

export function isRecoveredSuccess(result) {
  if (!result || result.success !== true) {
    return false;
  }

  if (result.tester_available) {
    return true;
  }

  return result.degraded_result === true
    && result.rerun_recommended === false
    && result.fallback_metrics
    && typeof result.fallback_metrics === 'object';
}

export function summarizeResults(results) {
  let success = 0;
  let failure = 0;
  let unreadable = 0;
  for (const result of results) {
    if (isRecoveredSuccess(result)) {
      success += 1;
    } else if (result?.tester_reason_category === 'metrics_unreadable') {
      unreadable += 1;
    } else {
      failure += 1;
    }
  }
  return { success, failure, unreadable, total: results.length };
}

export function needsRerun(result) {
  if (!result) {
    return true;
  }
  if (isRecoveredSuccess(result)) {
    return false;
  }
  if (result.tester_reason_category === 'metrics_unreadable') {
    return true;
  }
  if (result.apply_failed) {
    return true;
  }
  return result.success !== true;
}

export function findPendingRuns(matrix, completedRuns) {
  const effectiveRuns = collapseCompletedRuns(completedRuns);
  const done = new Set(effectiveRuns.map((entry) => buildRunKey(entry)));
  return matrix.filter((run) => !done.has(buildRunKey(run)));
}
