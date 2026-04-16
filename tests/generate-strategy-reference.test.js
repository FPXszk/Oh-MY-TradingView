import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const PROJECT_ROOT = process.cwd();
const SCRIPT_PATH = join(PROJECT_ROOT, 'scripts', 'backtest', 'generate-strategy-reference.mjs');

describe('generate-strategy-reference', () => {
  it('explains the difference between latest config and score artifact sources', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'generate-strategy-reference-'));
    const usPath = join(tempRoot, 'us-results.json');
    const jpPath = join(tempRoot, 'jp-results.json');
    const strategyOut = join(tempRoot, 'latest-strategy-reference.md');
    const symbolOut = join(tempRoot, 'latest-symbol-reference.md');
    const catalogPath = join(tempRoot, 'strategy-catalog.json');
    const usCampaignPath = join(tempRoot, 'us-campaign.json');
    const jpCampaignPath = join(tempRoot, 'jp-campaign.json');
    const usUniversePath = join(tempRoot, 'us-universe.json');
    const jpUniversePath = join(tempRoot, 'jp-universe.json');

    writeFileSync(usPath, JSON.stringify([
      {
        presetId: 'strat-a',
        market: 'US',
        symbol: 'AAPL',
        label: 'Apple',
        result: {
          success: true,
          tester_available: true,
          metrics: {
            net_profit: 100,
            profit_factor: 1.8,
            max_drawdown: 20,
            percent_profitable: 55,
            closed_trades: 10,
          },
        },
      },
    ], null, 2), 'utf8');
    writeFileSync(jpPath, JSON.stringify([
      {
        presetId: 'strat-a',
        market: 'JP',
        symbol: 'TSE:7203',
        label: 'Toyota Motor',
        result: {
          success: true,
          tester_available: true,
          metrics: {
            net_profit: 80,
            profit_factor: 1.6,
            max_drawdown: 25,
            percent_profitable: 52,
            closed_trades: 9,
          },
        },
      },
    ], null, 2), 'utf8');
    writeFileSync(catalogPath, JSON.stringify({
      strategies: [
        {
          id: 'strat-a',
          name: 'Strategy A',
          lifecycle: { status: 'live' },
          parameters: { fast: 20, slow: 55 },
          stop_loss: { type: 'hard_percent', value: 8 },
          theme_axis: 'pullback',
          theme_notes: 'Primary candidate',
        },
        {
          id: 'strat-b',
          name: 'Strategy B',
          lifecycle: { status: 'retired' },
          parameters: { fast: 18, slow: 50 },
          stop_loss: { type: 'hard_percent', value: 10 },
          theme_axis: 'breakout',
          theme_notes: 'Fallback',
        },
      ],
    }, null, 2), 'utf8');
    writeFileSync(usCampaignPath, JSON.stringify({
      id: 'next-long-run-us-12x10',
      date_override: { from: '2000-01-01', to: '2099-12-31' },
    }, null, 2), 'utf8');
    writeFileSync(jpCampaignPath, JSON.stringify({
      id: 'next-long-run-jp-12x10',
      date_override: { from: '2000-01-01', to: '2099-12-31' },
    }, null, 2), 'utf8');
    writeFileSync(usUniversePath, JSON.stringify({
      id: 'next-long-run-us-12',
      symbols: [
        { market: 'US', symbol: 'AAPL', label: 'Apple', bucket: 'winners' },
        { market: 'US', symbol: 'NVDA', label: 'NVIDIA', bucket: 'winners' },
      ],
    }, null, 2), 'utf8');
    writeFileSync(jpUniversePath, JSON.stringify({
      id: 'next-long-run-jp-12',
      symbols: [
        { market: 'JP', symbol: 'TSE:7203', label: 'Toyota Motor', bucket: 'winners' },
      ],
    }, null, 2), 'utf8');

    const result = spawnSync('node', [
      SCRIPT_PATH,
      '--us', usPath,
      '--jp', jpPath,
      '--strategy-out', strategyOut,
      '--symbol-out', symbolOut,
      '--catalog-path', catalogPath,
      '--us-campaign-path', usCampaignPath,
      '--jp-campaign-path', jpCampaignPath,
      '--us-universe-path', usUniversePath,
      '--jp-universe-path', jpUniversePath,
    ], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    });

    try {
      assert.equal(result.status, 0, result.stderr || result.stdout);
      const strategyDoc = readFileSync(strategyOut, 'utf8');
      const symbolDoc = readFileSync(symbolOut, 'utf8');

      assert.match(strategyDoc, /score artifact \(US\): `.*us-results\.json`/);
      assert.match(strategyDoc, /score artifact \(JP\): `.*jp-results\.json`/);
      assert.match(symbolDoc, /US campaign: `next-long-run-us-12x10` \/ universe: `next-long-run-us-12`/);
      assert.match(symbolDoc, /score artifact \(US\): `.*us-results\.json`/);
      assert.match(symbolDoc, /campaign \/ universe は latest config、score 列は上記 artifact に含まれる銘柄だけ埋まります。/);
      assert.match(symbolDoc, /`NVDA` \| NVIDIA \| winners \| `—` \| — \| — \| — \| 2000-01-01 -> 2099-12-31/);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
