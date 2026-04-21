import { loadPreset } from './backtest.js';
import { createNewPineScript, saveCurrentScript, setSource } from './pine.js';

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

export async function saveStrategiesToMyScripts(presetIds, deps = {}) {
  const resolver = deps.resolveStrategiesForMyScripts || resolveStrategiesForMyScripts;
  const newScriptCreator = deps.createNewPineScript || createNewPineScript;
  const sourceSetter = deps.setSource || setSource;
  const saver = deps.saveCurrentScript || saveCurrentScript;
  const strategies = await resolver(presetIds);
  const results = [];

  for (const strategy of strategies) {
    let saveResult = null;

    try {
      await newScriptCreator();
      await sourceSetter({ source: strategy.source });
      saveResult = await saver({ scriptName: strategy.name });
    } catch (e) {
      saveResult = {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }

    results.push({
      id: strategy.id,
      name: strategy.name,
      success: Boolean(saveResult?.success === true || saveResult?.save_status === 'saved'),
      save_status: saveResult?.save_status || null,
      saved_name: saveResult?.script_name || null,
      error: saveResult?.error || null,
    });
  }

  return results;
}
