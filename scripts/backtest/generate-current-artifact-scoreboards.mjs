#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import {
  collectCampaignStrategyRankingArtifacts,
  renderCurrentArtifactScoreboardsMarkdown,
} from '../../src/core/artifact-scoreboards.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');

const { values } = parseArgs({
  options: {
    'artifacts-root': { type: 'string' },
    out: { type: 'string' },
  },
});

const artifactsRoot = values['artifacts-root'] || join(PROJECT_ROOT, 'artifacts', 'campaigns');
const outPath = values.out || join(PROJECT_ROOT, 'docs', 'research', 'current', 'artifacts-backtest-scoreboards.md');

const artifacts = await collectCampaignStrategyRankingArtifacts(artifactsRoot, PROJECT_ROOT);
const content = renderCurrentArtifactScoreboardsMarkdown(artifacts);
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, content, 'utf8');
process.stdout.write(`Wrote artifact scoreboards: ${outPath}\n`);
