import { loadPreset } from './backtest.js';

export async function resolveStrategiesForMyScripts(presetIds, deps = {}) {
  if (!Array.isArray(presetIds) || presetIds.length === 0) {
    throw new Error('At least one preset id is required');
  }

  const loader = deps.loadPreset || loadPreset;
  const resolved = [];

  for (const presetId of presetIds) {
    if (typeof presetId !== 'string' || presetId.trim().length === 0) {
      throw new Error('Preset ids must be non-empty strings');
    }

    const { preset, source } = await loader(presetId);
    if (typeof source !== 'string' || source.trim().length === 0) {
      throw new Error(`Preset "${presetId}" is missing source`);
    }

    resolved.push({
      id: preset.id,
      name: preset.name,
      source,
      builder: preset.builder,
    });
  }

  return resolved;
}
