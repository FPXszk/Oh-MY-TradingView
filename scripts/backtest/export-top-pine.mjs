#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');

function sanitizeFileName(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      ranking: { type: 'string' },
      'out-dir': { type: 'string' },
      limit: { type: 'string', default: '5' },
      apply: { type: 'boolean', default: false },
      'date-from': { type: 'string', default: '2000-01-01' },
      'date-to': { type: 'string', default: '2099-12-31' },
    },
    allowPositionals: true,
    strict: true,
  });

  if (!values.ranking || !values['out-dir']) {
    throw new Error('Usage: node scripts/backtest/export-top-pine.mjs --ranking <path> --out-dir <dir> [--apply]');
  }

  const limit = Number(values.limit);
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error(`Invalid --limit: ${values.limit}`);
  }

  const rankingPath = join(PROJECT_ROOT, values.ranking);
  const outDir = join(PROJECT_ROOT, values['out-dir']);
  const ranking = JSON.parse(await readFile(rankingPath, 'utf8'));
  const selected = (Array.isArray(ranking) ? ranking : []).slice(0, limit);

  const { loadPreset } = await import(join(PROJECT_ROOT, 'src', 'core', 'backtest.js'));
  const pine = values.apply
    ? await import(join(PROJECT_ROOT, 'src', 'core', 'pine.js'))
    : null;

  await mkdir(outDir, { recursive: true });

  const manifest = [];
  const applyFailures = [];
  for (let index = 0; index < selected.length; index += 1) {
    const entry = selected[index];
    const { preset, source } = await loadPreset(entry.presetId, {
      dateOverride: {
        from: values['date-from'],
        to: values['date-to'],
      },
    });

    const fileName = `${String(index + 1).padStart(2, '0')}_${sanitizeFileName(entry.presetId)}.pine`;
    const filePath = join(outDir, fileName);
    await writeFile(filePath, source);

    let applyResult = null;
    if (values.apply) {
      await pine.setSource({ source });
      const compileResult = await pine.smartCompile();
      let applied = compileResult.study_added === true;
      let method = compileResult.button_clicked || null;

      if (!compileResult.has_errors && !applied) {
        const retry = await pine.retryApplyStrategy(preset.name);
        applied = retry.applied;
        method = retry.method || method;
      }

      applyResult = {
        compile_result: compileResult,
        applied,
        method,
      };

      if (compileResult.has_errors || !applied) {
        applyFailures.push({
          presetId: entry.presetId,
          compileResult,
          applied,
          method,
        });
      }
    }

    manifest.push({
      rank: entry.rank ?? index + 1,
      market: entry.market ?? null,
      presetId: entry.presetId,
      file: filePath.replace(`${PROJECT_ROOT}/`, ''),
      apply_result: applyResult,
    });
  }

  const manifestPath = join(outDir, 'manifest.json');
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  process.stdout.write(`Exported ${manifest.length} Pine files to ${outDir}\n`);
  process.stdout.write(`Manifest: ${manifestPath}\n`);
  if (applyFailures.length > 0) {
    applyFailures.forEach((failure) => {
      process.stderr.write(`Apply failed: ${failure.presetId} (has_errors=${failure.compileResult.has_errors}, applied=${failure.applied}, method=${failure.method || 'n/a'})\n`);
    });
    process.exit(1);
  }
}

main().catch((error) => {
  process.stderr.write(`Fatal: ${error.message}\n`);
  process.exit(1);
});
