#!/usr/bin/env node

import { loadPublicStrategyRegistry } from '../../src/core/public-strategy-registry.js';
import { setSource, smartCompile } from '../../src/core/pine.js';

async function main() {
  const registry = await loadPublicStrategyRegistry();
  const strategies = [...registry.strategies]
    .sort((left, right) => (left.public_library?.rank || 999) - (right.public_library?.rank || 999))
    .slice(0, 3);

  if (strategies.length === 0) {
    throw new Error('No public library strategies found in registry');
  }

  const results = [];
  for (const strategy of strategies) {
    if (typeof strategy.source !== 'string' || strategy.source.trim().length === 0) {
      throw new Error(`Strategy "${strategy.id}" is missing source`);
    }

    await setSource({ source: strategy.source });
    const compileResult = await smartCompile({ preferSaveAndAdd: true });
    results.push({
      id: strategy.id,
      name: strategy.name,
      rank: strategy.public_library?.rank ?? null,
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
