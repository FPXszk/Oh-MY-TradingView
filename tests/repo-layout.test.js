import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_ROOT = process.cwd();
const ROOT_README_PATH = join(PROJECT_ROOT, 'README.md');
const DOCS_COMMAND_PATH = join(PROJECT_ROOT, 'docs', 'command.md');
const ROOT_COMMAND_PATH = join(PROJECT_ROOT, 'command.md');
const DOCS_README_PATH = join(PROJECT_ROOT, 'docs', 'README.md');
const DOCS_EXPLAIN_PATH = join(PROJECT_ROOT, 'docs', 'explain-forhuman.md');
const ROOT_EXPLAIN_PATH = join(PROJECT_ROOT, 'explain-forhuman.md');
const DOCS_REPORTS_README_PATH = join(PROJECT_ROOT, 'docs', 'reports', 'README.md');
const DOCS_RESEARCH_README_PATH = join(PROJECT_ROOT, 'docs', 'research', 'README.md');
const DOCS_CAMPAIGNS_README_PATH = join(PROJECT_ROOT, 'docs', 'research', 'campaigns', 'README.md');
const DOCS_UNIVERSES_README_PATH = join(PROJECT_ROOT, 'docs', 'research', 'universes', 'README.md');
const DOCS_GUIDES_NEWCOMER_PATH = join(PROJECT_ROOT, 'docs', 'guides', 'newcomer.md');
const DOCS_GUIDES_SYSTEM_PATH = join(PROJECT_ROOT, 'docs', 'guides', 'developer-doc-system.md');
const DOCS_RUNBOOK_NIGHT_BATCH_PATH = join(PROJECT_ROOT, 'docs', 'runbooks', 'night-batch.md');
const DOCS_RUNBOOK_RUNNER_PATH = join(PROJECT_ROOT, 'docs', 'runbooks', 'runner-self-hosted.md');
const DOCS_RUNBOOK_RECOVERY_PATH = join(PROJECT_ROOT, 'docs', 'runbooks', 'recovery.md');
const DOCS_DECISIONS_README_PATH = join(PROJECT_ROOT, 'docs', 'decisions', 'README.md');
const REFS_README_PATH = join(PROJECT_ROOT, 'references', 'README.md');
const BACKTEST_REFS_README_PATH = join(PROJECT_ROOT, 'references', 'backtests', 'README.md');
const PINE_REFS_README_PATH = join(PROJECT_ROOT, 'references', 'pine', 'README.md');
const EXTERNAL_REFS_README_PATH = join(PROJECT_ROOT, 'references', 'external', 'README.md');
const ARTIFACTS_README_PATH = join(PROJECT_ROOT, 'artifacts', 'README.md');
const LOGS_README_PATH = join(PROJECT_ROOT, 'logs', 'README.md');
const PLANS_README_PATH = join(PROJECT_ROOT, 'plans', 'README.md');
const DOCS_STRATEGY_README_PATH = join(PROJECT_ROOT, 'docs', 'research', 'strategy', 'README.md');
const DOCS_THEME_MOMENTUM_PATH = join(PROJECT_ROOT, 'docs', 'research', 'strategy', 'theme-momentum-definition.md');
const DOCS_RETIRED_STRATEGY_DIR = join(PROJECT_ROOT, 'docs', 'research', 'strategy', 'retired');
const RESEARCH_ARCHIVE_DIR = join(PROJECT_ROOT, 'docs', 'research', 'archive');
const RESEARCH_CURRENT_DIR = join(PROJECT_ROOT, 'docs', 'research', 'current');
const RESEARCH_LATEST_DIR = join(PROJECT_ROOT, 'docs', 'research', 'latest');
const RESEARCH_OLD_DIR = join(PROJECT_ROOT, 'docs', 'research', 'old');
const DESIGN_DOCS_DIR = join(PROJECT_ROOT, 'docs', 'design-docs');
const DOCS_RESULTS_DIR = join(PROJECT_ROOT, 'docs', 'research', 'results');
const ROOT_RESULTS_DIR = join(PROJECT_ROOT, 'results');
const ARTIFACTS_DIR = join(PROJECT_ROOT, 'artifacts');
const SESSION_LOGS_DIR = join(PROJECT_ROOT, 'logs', 'sessions');
const SESSION_LOGS_ARCHIVE_DIR = join(SESSION_LOGS_DIR, 'archive');
const OLD_SESSION_LOGS_DIR = join(PROJECT_ROOT, 'docs', 'working-memory', 'session-logs');
const CAMPAIGNS_LATEST_DIR = join(PROJECT_ROOT, 'config', 'backtest', 'campaigns', 'current');
const CAMPAIGNS_ARCHIVE_DIR = join(PROJECT_ROOT, 'config', 'backtest', 'campaigns', 'archive');
const UNIVERSES_LATEST_DIR = join(PROJECT_ROOT, 'config', 'backtest', 'universes', 'current');
const UNIVERSES_ARCHIVE_DIR = join(PROJECT_ROOT, 'config', 'backtest', 'universes', 'archive');
const EXEC_ACTIVE_DIR = join(PROJECT_ROOT, 'plans', 'exec', 'active');
const STALE_ACTIVE_PLANS = [
  'document-self-hosted-runner-foreground-autostart_20260412_0006.md',
  'investigate-night-batch-self-hosted-queued_20260410_2307.md',
  'rerun-night-batch-after-run-cmd_20260410_1714.md',
  'run-night-batch-self-hosted-workflow-dispatch_20260411_0025.md',
];

describe('repository layout policy', () => {
  it('keeps human entrypoints under docs/ and removes obsolete command.md', () => {
    assert.equal(existsSync(DOCS_COMMAND_PATH), false, 'docs/command.md must be removed');
    assert.equal(existsSync(DOCS_README_PATH), true, 'docs/README.md must exist');
    assert.equal(existsSync(DOCS_EXPLAIN_PATH), true, 'docs/explain-forhuman.md must exist');
    assert.equal(existsSync(ROOT_COMMAND_PATH), false, 'root command.md must be removed');
    assert.equal(existsSync(ROOT_EXPLAIN_PATH), false, 'root explain-forhuman.md must be removed');
  });

  it('documents human and machine storage roots with dedicated README files', () => {
    assert.equal(existsSync(DOCS_RESEARCH_README_PATH), true, 'docs/research/README.md must exist');
    assert.equal(existsSync(DOCS_CAMPAIGNS_README_PATH), true, 'docs/research/campaigns/README.md must exist');
    assert.equal(existsSync(DOCS_UNIVERSES_README_PATH), true, 'docs/research/universes/README.md must exist');
    assert.equal(existsSync(DOCS_GUIDES_NEWCOMER_PATH), true, 'docs/guides/newcomer.md must exist');
    assert.equal(existsSync(DOCS_GUIDES_SYSTEM_PATH), true, 'docs/guides/developer-doc-system.md must exist');
    assert.equal(existsSync(DOCS_RUNBOOK_NIGHT_BATCH_PATH), true, 'docs/runbooks/night-batch.md must exist');
    assert.equal(existsSync(DOCS_RUNBOOK_RUNNER_PATH), true, 'docs/runbooks/runner-self-hosted.md must exist');
    assert.equal(existsSync(DOCS_RUNBOOK_RECOVERY_PATH), true, 'docs/runbooks/recovery.md must exist');
    assert.equal(existsSync(DOCS_DECISIONS_README_PATH), true, 'docs/decisions/README.md must exist');
    assert.equal(existsSync(DOCS_REPORTS_README_PATH), true, 'docs/reports/README.md must exist');
    assert.equal(existsSync(REFS_README_PATH), true, 'references/README.md must exist');
    assert.equal(existsSync(BACKTEST_REFS_README_PATH), true, 'references/backtests/README.md must exist');
    assert.equal(existsSync(PINE_REFS_README_PATH), true, 'references/pine/README.md must exist');
    assert.equal(existsSync(EXTERNAL_REFS_README_PATH), true, 'references/external/README.md must exist');
    assert.equal(existsSync(ARTIFACTS_README_PATH), true, 'artifacts/README.md must exist');
    assert.equal(existsSync(LOGS_README_PATH), true, 'logs/README.md must exist');
    assert.equal(existsSync(PLANS_README_PATH), true, 'plans/README.md must exist');
    assert.equal(existsSync(DOCS_STRATEGY_README_PATH), true, 'docs/research/strategy/README.md must exist');
  });

  it('keeps the theme momentum definition at a stable strategy doc path', () => {
    assert.equal(existsSync(DOCS_THEME_MOMENTUM_PATH), true,
      'docs/research/strategy/theme-momentum-definition.md must exist');

    const rootReadme = readFileSync(ROOT_README_PATH, 'utf8');
    const strategyReadme = readFileSync(DOCS_STRATEGY_README_PATH, 'utf8');

    assert.match(rootReadme, /theme-momentum-definition\.md/,
      'README.md must point readers to theme-momentum-definition.md');
    assert.match(strategyReadme, /theme-momentum-definition\.md/,
      'docs/research/strategy/README.md must point readers to theme-momentum-definition.md');
  });

  it('uses current/archive naming and removes obsolete doc buckets', () => {
    assert.equal(existsSync(RESEARCH_CURRENT_DIR), true, 'docs/research/current must exist');
    assert.equal(existsSync(RESEARCH_ARCHIVE_DIR), true, 'docs/research/archive must exist');
    assert.equal(existsSync(RESEARCH_LATEST_DIR), false, 'docs/research/current must be removed');
    assert.equal(existsSync(RESEARCH_OLD_DIR), false, 'docs/research/old must be removed');
    assert.equal(existsSync(DESIGN_DOCS_DIR), false, 'docs/design-docs must be removed');
  });

  it('stores generated artifacts under artifacts/ and removes artifacts', () => {
    assert.equal(existsSync(ARTIFACTS_DIR), true, 'artifacts must exist');
    assert.equal(existsSync(DOCS_RESULTS_DIR), false, 'artifacts must be removed');
    assert.equal(existsSync(ROOT_RESULTS_DIR), false, 'root results directory must be removed');
  });

  it('keeps only the latest session log under logs/sessions and removes old working-memory path', () => {
    assert.equal(existsSync(SESSION_LOGS_ARCHIVE_DIR), true, 'session log archive directory must exist');
    assert.equal(existsSync(OLD_SESSION_LOGS_DIR), false, 'logs/sessions must be removed');
    const topLevelMarkdown = readdirSync(SESSION_LOGS_DIR)
      .filter((name) => name.endsWith('.md'));
    assert.equal(topLevelMarkdown.length, 1, `expected exactly 1 latest session log, got ${topLevelMarkdown.length}`);
  });

  it('splits campaigns and universes into current and archive', () => {
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

  it('prunes strategy-presets.json to the strongest 30 and records retired strategies', () => {
    const presets = JSON.parse(
      readFileSync(join(PROJECT_ROOT, 'config', 'backtest', 'strategy-presets.json'), 'utf8'),
    );
    assert.equal(presets.strategies.length, 30, `expected 30 strategies, got ${presets.strategies.length}`);
    assert.equal(
      existsSync(join(DOCS_RETIRED_STRATEGY_DIR, 'README.md')),
      true,
      'docs/research/strategy/retired/README.md must exist',
    );
    const badStrategyDocs = readdirSync(DOCS_RETIRED_STRATEGY_DIR)
      .filter((name) => name.endsWith('.md') || name.endsWith('.json'));
    assert.ok(
      badStrategyDocs.some((name) => name !== 'README.md'),
      'docs/research/strategy/retired must contain at least one retirement ledger',
    );
  });

  it('strategy-catalog.json exists and has 152 strategies', () => {
    const catalogPath = join(PROJECT_ROOT, 'config', 'backtest', 'strategy-catalog.json');
    assert.equal(existsSync(catalogPath), true, 'strategy-catalog.json must exist');
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
    assert.equal(catalog.strategies.length, 152, `expected 152 strategies in catalog, got ${catalog.strategies.length}`);
  });

  it('retired strategy README mentions catalog as source of truth', () => {
    const readme = readFileSync(join(DOCS_RETIRED_STRATEGY_DIR, 'README.md'), 'utf8');
    assert.ok(readme.includes('strategy-catalog.json'), 'README.md must mention strategy-catalog.json');
    assert.ok(readme.includes('source of truth'), 'README.md must mention source of truth');
  });

  it('latest campaigns and archive campaigns do not overlap', () => {
    const latestCampaigns = new Set(
      readdirSync(CAMPAIGNS_LATEST_DIR).filter((name) => name.endsWith('.json')),
    );
    const archiveCampaigns = new Set(
      readdirSync(CAMPAIGNS_ARCHIVE_DIR).filter((name) => name.endsWith('.json')),
    );
    for (const name of latestCampaigns) {
      assert.equal(archiveCampaigns.has(name), false,
        `campaign ${name} must not exist in both latest/ and archive/`);
    }
  });

  it('latest universes and archive universes do not overlap', () => {
    const latestUniverses = new Set(
      readdirSync(UNIVERSES_LATEST_DIR).filter((name) => name.endsWith('.json')),
    );
    const archiveUniverses = new Set(
      readdirSync(UNIVERSES_ARCHIVE_DIR).filter((name) => name.endsWith('.json')),
    );
    for (const name of latestUniverses) {
      assert.equal(archiveUniverses.has(name), false,
        `universe ${name} must not exist in both latest/ and archive/`);
    }
  });

  it('current campaigns reference universes that exist under universes/current', () => {
    const latestUniverseIds = new Set(
      readdirSync(UNIVERSES_LATEST_DIR)
        .filter((name) => name.endsWith('.json'))
        .map((name) => {
          const content = JSON.parse(readFileSync(join(UNIVERSES_LATEST_DIR, name), 'utf8'));
          return content.id;
        }),
    );
    const campaignFiles = readdirSync(CAMPAIGNS_LATEST_DIR).filter((name) => name.endsWith('.json'));
    for (const file of campaignFiles) {
      const campaign = JSON.parse(readFileSync(join(CAMPAIGNS_LATEST_DIR, file), 'utf8'));
      assert.ok(latestUniverseIds.has(campaign.universe),
        `campaign ${file} references universe "${campaign.universe}" which must exist in universes/current/`);
    }
  });

  it('latest campaign preset_ids are a subset of live strategy-presets.json', () => {
    const presets = JSON.parse(
      readFileSync(join(PROJECT_ROOT, 'config', 'backtest', 'strategy-presets.json'), 'utf8'),
    );
    const livePresetIds = new Set(presets.strategies.map((s) => s.id));
    const campaignFiles = readdirSync(CAMPAIGNS_LATEST_DIR).filter((name) => name.endsWith('.json'));
    for (const file of campaignFiles) {
      const campaign = JSON.parse(readFileSync(join(CAMPAIGNS_LATEST_DIR, file), 'utf8'));
      for (const presetId of campaign.preset_ids) {
        assert.ok(livePresetIds.has(presetId),
          `campaign ${file} uses preset "${presetId}" not in live strategy-presets.json`);
      }
    }
  });

  it('docs/research/current/manifest.json lists only files that actually exist', () => {
    const manifestPath = join(PROJECT_ROOT, 'docs', 'research', 'current', 'manifest.json');
    assert.ok(existsSync(manifestPath), 'manifest.json must exist');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert.ok(Array.isArray(manifest.keep), 'manifest.keep must be an array');
    for (const name of manifest.keep) {
      assert.ok(
        existsSync(join(PROJECT_ROOT, 'docs', 'research', 'current', name)),
        `manifest.json lists "${name}" which does not exist in docs/research/current/`,
      );
    }
  });
});
