import { loadPreset } from './backtest.js';
import { getErrors, saveCurrentScript, setSource } from './pine.js';

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
  const sourceSetter = deps.setSource || setSource;
  const errorReader = deps.getErrors || getErrors;
  const saver = deps.saveCurrentScript || saveCurrentScript;
  const wait = deps.wait || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const strategies = await resolver(presetIds);
  const results = [];

  for (const strategy of strategies) {
    await sourceSetter({ source: strategy.source });
    await wait(1000);
    const compileResult = await errorReader();
    let saveResult = null;

    if (compileResult.success && compileResult.has_errors === false) {
      saveResult = await saver({ scriptName: strategy.name });
    }

    results.push({
      id: strategy.id,
      name: strategy.name,
      success: Boolean(
        compileResult.success
          && compileResult.has_errors === false
          && saveResult?.success === true,
      ),
      button_clicked: compileResult.button_clicked,
      study_added: compileResult.study_added,
      error_count: compileResult.error_count,
      save_status: saveResult?.save_status || null,
      saved_name: saveResult?.script_name || null,
    });
  }

  return results;
}
