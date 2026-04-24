import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const PROJECT_ROOT = process.cwd();
const SCRIPT_PATH = join(PROJECT_ROOT, 'scripts', 'backtest', 'generate-current-artifact-scoreboards.mjs');

describe('generate-current-artifact-scoreboards', () => {
  it('renders campaign ranking tables from artifacts/campaigns strategy-ranking.json', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'artifact-scoreboards-'));
    const artifactsRoot = join(tempRoot, 'artifacts', 'campaigns');
    const currentDir = join(tempRoot, 'docs', 'research', 'current');
    const campaignDir = join(artifactsRoot, 'selected-us40-10pack', 'full');
    const outPath = join(currentDir, 'artifacts-backtest-scoreboards.md');

    mkdirSync(campaignDir, { recursive: true });
    mkdirSync(currentDir, { recursive: true });

    writeFileSync(join(campaignDir, 'strategy-ranking.json'), JSON.stringify({
      campaign_id: 'selected-us40-10pack',
      phase: 'full',
      generated_at: '2026-04-24T06:08:00.000Z',
      source_run_id: 'gha_24872765258_1',
      source_kind: 'workflow',
      source_results_path: 'artifacts/campaigns/selected-us40-10pack/full/recovered-results.json',
      rows: [
        {
          rank: 1,
          presetId: 'strat-a',
          run_count: 40,
          success_count: 40,
          avg_net_profit: 722.5,
          avg_profit_factor: 1.548,
          avg_max_drawdown: 399.92,
          avg_percent_profitable: 43.68,
        },
        {
          rank: 2,
          presetId: 'strat-b',
          run_count: 40,
          success_count: 40,
          avg_net_profit: 717.72,
          avg_profit_factor: 1.547,
          avg_max_drawdown: 399.68,
          avg_percent_profitable: 43.68,
        },
      ],
    }, null, 2), 'utf8');

    const result = spawnSync('node', [
      SCRIPT_PATH,
      '--artifacts-root', artifactsRoot,
      '--out', outPath,
    ], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    });

    try {
      assert.equal(result.status, 0, result.stderr || result.stdout);
      const report = readFileSync(outPath, 'utf8');
      assert.match(report, /# Artifact Backtest Scoreboards/);
      assert.match(report, /selected-us40-10pack/);
      assert.match(report, /gha_24872765258_1/);
      assert.match(report, /\| rank \| strategy \| avg net profit \| avg profit factor \| avg max drawdown \| avg win rate \| success \/ runs \|/);
      assert.match(report, /`strat-a`/);
      assert.match(report, /722\.50/);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
