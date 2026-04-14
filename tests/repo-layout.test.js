import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_ROOT = process.cwd();
const DOCS_COMMAND_PATH = join(PROJECT_ROOT, 'docs', 'command.md');
const ROOT_COMMAND_PATH = join(PROJECT_ROOT, 'command.md');
const DOCS_EXPLAIN_PATH = join(PROJECT_ROOT, 'docs', 'explain-forhuman.md');
const ROOT_EXPLAIN_PATH = join(PROJECT_ROOT, 'explain-forhuman.md');
const RESEARCH_ARCHIVE_DIR = join(PROJECT_ROOT, 'docs', 'research', 'archive');
const RESEARCH_OLD_DIR = join(PROJECT_ROOT, 'docs', 'research', 'old');
const DESIGN_DOCS_DIR = join(PROJECT_ROOT, 'docs', 'design-docs');
const RESEARCH_RESULTS_DIR = join(PROJECT_ROOT, 'docs', 'research', 'results');
const ROOT_RESULTS_DIR = join(PROJECT_ROOT, 'results');
const SESSION_LOGS_DIR = join(PROJECT_ROOT, 'docs', 'working-memory', 'session-logs');
const SESSION_LOGS_ARCHIVE_DIR = join(SESSION_LOGS_DIR, 'archive');
const CAMPAIGNS_LATEST_DIR = join(PROJECT_ROOT, 'config', 'backtest', 'campaigns', 'latest');
const CAMPAIGNS_ARCHIVE_DIR = join(PROJECT_ROOT, 'config', 'backtest', 'campaigns', 'archive');
const UNIVERSES_LATEST_DIR = join(PROJECT_ROOT, 'config', 'backtest', 'universes', 'latest');
const UNIVERSES_ARCHIVE_DIR = join(PROJECT_ROOT, 'config', 'backtest', 'universes', 'archive');
const EXEC_ACTIVE_DIR = join(PROJECT_ROOT, 'docs', 'exec-plans', 'active');
const STALE_ACTIVE_PLANS = [
  'document-self-hosted-runner-foreground-autostart_20260412_0006.md',
  'investigate-night-batch-self-hosted-queued_20260410_2307.md',
  'rerun-night-batch-after-run-cmd_20260410_1714.md',
  'run-night-batch-self-hosted-workflow-dispatch_20260411_0025.md',
];

describe('repository layout policy', () => {
  it('moves operator docs under docs/', () => {
    assert.equal(existsSync(DOCS_COMMAND_PATH), true, 'docs/command.md must exist');
    assert.equal(existsSync(DOCS_EXPLAIN_PATH), true, 'docs/explain-forhuman.md must exist');
    assert.equal(existsSync(ROOT_COMMAND_PATH), false, 'root command.md must be removed');
    assert.equal(existsSync(ROOT_EXPLAIN_PATH), false, 'root explain-forhuman.md must be removed');
  });

  it('uses archive naming and removes the design-docs directory', () => {
    assert.equal(existsSync(RESEARCH_ARCHIVE_DIR), true, 'docs/research/archive must exist');
    assert.equal(existsSync(RESEARCH_OLD_DIR), false, 'docs/research/old must be removed');
    assert.equal(existsSync(DESIGN_DOCS_DIR), false, 'docs/design-docs must be removed');
  });

  it('stores research artifacts under docs/research/results and removes the root results directory', () => {
    assert.equal(existsSync(RESEARCH_RESULTS_DIR), true, 'docs/research/results must exist');
    assert.equal(existsSync(ROOT_RESULTS_DIR), false, 'root results directory must be removed');
  });

  it('keeps only the latest session log outside archive', () => {
    assert.equal(existsSync(SESSION_LOGS_ARCHIVE_DIR), true, 'session log archive directory must exist');
    const topLevelMarkdown = readdirSync(SESSION_LOGS_DIR)
      .filter((name) => name.endsWith('.md'));
    assert.equal(topLevelMarkdown.length, 1, `expected exactly 1 latest session log, got ${topLevelMarkdown.length}`);
  });

  it('splits campaigns and universes into latest and archive', () => {
    assert.equal(existsSync(CAMPAIGNS_LATEST_DIR), true, 'campaign latest directory must exist');
    assert.equal(existsSync(CAMPAIGNS_ARCHIVE_DIR), true, 'campaign archive directory must exist');
    assert.equal(existsSync(UNIVERSES_LATEST_DIR), true, 'universe latest directory must exist');
    assert.equal(existsSync(UNIVERSES_ARCHIVE_DIR), true, 'universe archive directory must exist');

    assert.equal(
      existsSync(join(CAMPAIGNS_LATEST_DIR, 'next-long-run-us-12x10.json')),
      true,
      'latest US campaign must stay visible under latest/',
    );
    assert.equal(
      existsSync(join(CAMPAIGNS_LATEST_DIR, 'next-long-run-jp-12x10.json')),
      true,
      'latest JP campaign must stay visible under latest/',
    );
    assert.equal(
      existsSync(join(UNIVERSES_LATEST_DIR, 'next-long-run-us-12.json')),
      true,
      'latest US universe must stay visible under latest/',
    );
    assert.equal(
      existsSync(join(UNIVERSES_LATEST_DIR, 'next-long-run-jp-12.json')),
      true,
      'latest JP universe must stay visible under latest/',
    );
  });

  it('removes stale active exec plans from active/', () => {
    const activePlans = new Set(
      readdirSync(EXEC_ACTIVE_DIR).filter((name) => name.endsWith('.md')),
    );
    for (const stalePlan of STALE_ACTIVE_PLANS) {
      assert.equal(activePlans.has(stalePlan), false, `${stalePlan} must be moved out of active/`);
    }
  });

  it('prunes strategy-presets.json to the strongest 15 and records retired strategies', () => {
    const presets = JSON.parse(
      readFileSync(join(PROJECT_ROOT, 'config', 'backtest', 'strategy-presets.json'), 'utf8'),
    );
    assert.equal(presets.strategies.length, 15, `expected 15 strategies, got ${presets.strategies.length}`);
    assert.equal(
      existsSync(join(PROJECT_ROOT, 'docs', 'bad-strategy', 'README.md')),
      true,
      'docs/bad-strategy/README.md must exist',
    );
    const badStrategyDocs = readdirSync(join(PROJECT_ROOT, 'docs', 'bad-strategy'))
      .filter((name) => name.endsWith('.md'));
    assert.ok(
      badStrategyDocs.some((name) => name !== 'README.md'),
      'docs/bad-strategy must contain at least one retirement ledger',
    );
  });
});
