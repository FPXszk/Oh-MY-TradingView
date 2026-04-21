#!/usr/bin/env node

import { resolveStrategiesForMyScripts } from '../../src/core/my-scripts.js';
import { setSource, smartCompile } from '../../src/core/pine.js';

async function main() {
  const presetIds = process.argv.slice(2);
  const strategies = await resolveStrategiesForMyScripts(presetIds);
  const results = [];

  for (const strategy of strategies) {
    await setSource({ source: strategy.source });
    const compileResult = await smartCompile({ preferSaveAndAdd: true });
    results.push({
      id: strategy.id,
      name: strategy.name,
      success: compileResult.success && compileResult.has_errors === false,
      button_clicked: compileResult.button_clicked,
      study_added: compileResult.study_added,
      error_count: compileResult.error_count,
    });
  }

  process.stdout.write(`${JSON.stringify({ success: true, saved: results }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exitCode = 1;
});
