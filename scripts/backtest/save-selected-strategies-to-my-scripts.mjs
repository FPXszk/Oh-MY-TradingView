#!/usr/bin/env node

import { saveStrategiesToMyScripts } from '../../src/core/my-scripts.js';

async function main() {
  const results = await saveStrategiesToMyScripts(process.argv.slice(2));

  process.stdout.write(`${JSON.stringify({ success: true, saved: results }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exitCode = 1;
});
