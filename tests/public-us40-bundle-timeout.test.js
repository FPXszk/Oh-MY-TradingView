import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { validateCampaignConfig } from '../src/core/campaign.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('public us40 bundle timeout policy', () => {
  const validConfig = {
    id: 'test-campaign',
    universe: 'long-run-cross-market-100',
    date_override: { from: '2000-01-01', to: '2099-12-31' },
    preset_ids: ['ema-cross-9-21'],
    phases: {
      smoke: { symbol_count: 10 },
      pilot: { symbol_count: 25 },
      full: { symbol_count: 100 },
    },
    execution: {
      checkpoint_every: 10,
      cooldown_ms: 2000,
      max_consecutive_failures: 5,
    },
  };

  it('rejects non-positive per_run_timeout_ms', () => {
    const r = validateCampaignConfig({
      ...validConfig,
      execution: {
        ...validConfig.execution,
        per_run_timeout_ms: 0,
      },
    });
    assert.equal(r.valid, false);
    assert.ok(r.errors.some((e) => /execution\.per_run_timeout_ms/.test(e)));
  });

  it('accepts positive per_run_timeout_ms', () => {
    const r = validateCampaignConfig({
      ...validConfig,
      execution: {
        ...validConfig.execution,
        per_run_timeout_ms: 120000,
      },
    });
    assert.equal(r.valid, true);
    assert.deepEqual(r.errors, []);
  });

  it('does not default JP campaign when only US is intended', async () => {
    const raw = await readFile(
      join(__dirname, '..', 'scripts', 'backtest', 'run-finetune-bundle.mjs'),
      'utf8',
    );
    assert.match(raw, /'jp-campaign': \{ type: 'string', default: '' \}/);
    assert.match(raw, /'us-campaign': \{ type: 'string', default: '' \}/);
    assert.doesNotMatch(raw, /default: 'next-long-run-jp-finetune-100x10'/);
  });

  it('reads execution.per_run_timeout_ms from campaign config', async () => {
    const raw = await readFile(
      join(__dirname, '..', 'scripts', 'backtest', 'run-long-campaign.mjs'),
      'utf8',
    );
    assert.match(raw, /execution\.per_run_timeout_ms/);
    assert.match(raw, /timeout:\s*perRunTimeoutMs/);
  });

  it('public-top10-us-40x10 sets a per-run timeout', async () => {
    const raw = await readFile(
      join(__dirname, '..', 'config', 'backtest', 'campaigns', 'current', 'public-top10-us-40x10.json'),
      'utf8',
    );
    const config = JSON.parse(raw);
    assert.equal(typeof config.execution.per_run_timeout_ms, 'number');
    assert.ok(config.execution.per_run_timeout_ms > 0);
  });
});
