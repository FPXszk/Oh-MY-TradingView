#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { RESEARCH_RESULTS_DIR } from '../../src/core/repo-paths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      phase: { type: 'string', default: 'full' },
      host: { type: 'string', default: process.env.TV_CDP_HOST || '' },
      ports: { type: 'string', default: process.env.TV_CAMPAIGN_PORTS || '' },
    },
    allowPositionals: true,
    strict: false,
  });

  const campaignId = positionals[0] || 'long-run-cross-market-100x5';
  const phase = values.phase || 'full';
  const outDir = join(RESEARCH_RESULTS_DIR, 'campaigns', campaignId, phase);

  let files;
  try {
    files = await readdir(outDir);
  } catch {
    process.stderr.write(`No results directory found: ${outDir}\n`);
    process.exit(1);
  }

  const checkpoints = files
    .filter((file) => file.startsWith('checkpoint-') && file.endsWith('.json'))
    .sort((left, right) => {
      const leftNumber = Number(left.replace('checkpoint-', '').replace('.json', ''));
      const rightNumber = Number(right.replace('checkpoint-', '').replace('.json', ''));
      return rightNumber - leftNumber;
    });

  if (checkpoints.length === 0) {
    process.stderr.write(`No checkpoints found in ${outDir}\n`);
    process.exit(1);
  }

  const latest = join(outDir, checkpoints[0]);
  const info = await stat(latest);
  process.stdout.write(`Latest checkpoint: ${latest}\n`);
  process.stdout.write(`  Last modified: ${info.mtime.toISOString()}\n\n`);

  const args = [join(__dirname, 'run-long-campaign.mjs'), campaignId, '--phase', phase, '--resume', latest];
  if (values.host) {
    args.push('--host', values.host);
  }
  if (values.ports) {
    args.push('--ports', values.ports);
  }

  execFileSync(process.execPath, args, {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    env: process.env,
  });
}

main().catch((error) => {
  process.stderr.write(`Fatal: ${error.message}\n`);
  process.exit(1);
});
