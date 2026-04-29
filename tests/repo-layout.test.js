import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_ROOT = process.cwd();
const ROOT_README_PATH = join(PROJECT_ROOT, 'README.md');
const CODEX_DIR = join(PROJECT_ROOT, '.codex');
const CODEX_CONFIG_PATH = join(CODEX_DIR, 'config.toml');
const DOCS_EXPLAIN_PATH = join(PROJECT_ROOT, 'docs', 'explain-forhuman.md');
const DOCS_DOCUMENTATION_SYSTEM_PATH = join(PROJECT_ROOT, 'docs', 'DOCUMENTATION_SYSTEM.md');
const DOCS_REPORTS_DIR = join(PROJECT_ROOT, 'docs', 'reports');
const DOCS_RESEARCH_DIR = join(PROJECT_ROOT, 'docs', 'research');
const DOCS_REFERENCES_DIR = join(PROJECT_ROOT, 'docs', 'references');
const DOCS_THEME_MOMENTUM_PATH = join(PROJECT_ROOT, 'docs', 'strategy', 'theme-momentum-definition.md');
const DOCS_RETIRED_STRATEGY_DIR = join(PROJECT_ROOT, 'docs', 'research', 'archive', 'retired');
const RESEARCH_ARCHIVE_DIR = join(PROJECT_ROOT, 'docs', 'research', 'archive');
const ARTIFACTS_DIR = join(PROJECT_ROOT, 'artifacts');
const ARTIFACTS_CAMPAIGNS_DIR = join(PROJECT_ROOT, 'artifacts', 'campaigns');
const SESSION_LOGS_DIR = join(PROJECT_ROOT, 'docs', 'sessions');
const SESSION_LOGS_ARCHIVE_DIR = join(SESSION_LOGS_DIR, 'archive');
const CAMPAIGNS_DIR = join(PROJECT_ROOT, 'config', 'backtest', 'campaigns');
const CAMPAIGNS_ARCHIVE_DIR = join(PROJECT_ROOT, 'config', 'backtest', 'campaigns', 'archive');
const UNIVERSES_DIR = join(PROJECT_ROOT, 'config', 'backtest', 'universes');
const UNIVERSES_ARCHIVE_DIR = join(PROJECT_ROOT, 'config', 'backtest', 'universes', 'archive');
const EXEC_ACTIVE_DIR = join(PROJECT_ROOT, 'docs', 'exec-plans', 'active');
const STALE_ACTIVE_PLANS = [
  'document-self-hosted-runner-foreground-autostart_20260412_0006.md',
  'investigate-night-batch-self-hosted-queued_20260410_2307.md',
  'rerun-night-batch-after-run-cmd_20260410_1714.md',
  'run-night-batch-self-hosted-workflow-dispatch_20260411_0025.md',
];

describe('repository layout policy', () => {
  it('keeps shared Codex settings under .codex/config.toml', () => {
    assert.equal(existsSync(CODEX_DIR), true, '.codex directory must exist');
    assert.equal(statSync(CODEX_DIR).isDirectory(), true, '.codex must be a directory');
    assert.equal(existsSync(CODEX_CONFIG_PATH), true, '.codex/config.toml must exist');

    const config = readFileSync(CODEX_CONFIG_PATH, 'utf8');
    assert.match(config, /^model = "gpt-5\.4"$/m, 'Codex should use the current frontier model');
    assert.match(config, /^model_reasoning_effort = "medium"$/m, 'Codex should use medium reasoning by default');
    assert.match(config, /^\[plugins\."github@openai-curated"\]$/m, 'GitHub plugin settings must be present');
    assert.match(config, /^enabled = true$/m, 'GitHub plugin must be enabled');
    assert.match(config, /^\[mcp_servers\.oh-my-tradingview\]$/m, 'Codex MCP server settings must be present');
    assert.match(config, /^command = "node"$/m, 'Codex MCP server must use node');
    assert.match(config, /args = \["\/home\/fpxszk\/code\/Oh-MY-TradingView\/src\/server\.js"\]/,
      'Codex MCP server must point at this repository server.js');
    assert.match(config, /^\[mcp_servers\.oh-my-tradingview\.env\]$/m, 'Codex MCP env settings must be present');
    assert.match(config, /^TV_CDP_HOST = "172\.31\.144\.1"$/m, 'Codex MCP should default to the verified WSL host');
    assert.match(config, /^TV_CDP_PORT = "9223"$/m, 'Codex MCP should default to the verified WSL port');
  });

  it('keeps human entrypoints under docs/ and removes obsolete command.md', () => {
    assert.equal(existsSync(join(PROJECT_ROOT, 'docs', 'command.md')), false, 'docs/command.md must be removed');
    assert.equal(existsSync(DOCS_DOCUMENTATION_SYSTEM_PATH), true, 'docs/DOCUMENTATION_SYSTEM.md must exist');
    assert.equal(existsSync(DOCS_EXPLAIN_PATH), true, 'docs/explain-forhuman.md must exist');
    assert.equal(existsSync(join(PROJECT_ROOT, 'command.md')), false, 'root command.md must be removed');
    assert.equal(existsSync(join(PROJECT_ROOT, 'explain-forhuman.md')), false, 'root explain-forhuman.md must be removed');
  });

  it('keeps docs structure with research, references, reports, sessions, strategy directories', () => {
    assert.equal(existsSync(DOCS_RESEARCH_DIR), true, 'docs/research must exist');
    assert.equal(existsSync(RESEARCH_ARCHIVE_DIR), true, 'docs/research/archive must exist');
    assert.equal(existsSync(DOCS_REFERENCES_DIR), true, 'docs/references must exist');
    assert.equal(existsSync(DOCS_REPORTS_DIR), true, 'docs/reports must exist');
    assert.equal(existsSync(SESSION_LOGS_DIR), true, 'docs/sessions must exist');
    assert.equal(existsSync(join(PROJECT_ROOT, 'docs', 'strategy')), true, 'docs/strategy must exist');
    assert.equal(existsSync(ARTIFACTS_DIR), true, 'artifacts must exist');
    assert.equal(existsSync(ARTIFACTS_CAMPAIGNS_DIR), true, 'artifacts/campaigns must exist');
  });

  it('keeps the theme momentum definition at a stable strategy doc path', () => {
    assert.equal(existsSync(DOCS_THEME_MOMENTUM_PATH), true,
      'docs/strategy/theme-momentum-definition.md must exist');

    const rootReadme = readFileSync(ROOT_README_PATH, 'utf8');
    assert.match(rootReadme, /theme-momentum-definition\.md/,
      'README.md must point readers to theme-momentum-definition.md');
  });

  it('uses research/archive naming and removes obsolete doc buckets', () => {
    assert.equal(existsSync(RESEARCH_ARCHIVE_DIR), true, 'docs/research/archive must exist');
    assert.equal(existsSync(join(PROJECT_ROOT, 'docs', 'research', 'latest')), false, 'docs/research/latest must be removed');
    assert.equal(existsSync(join(PROJECT_ROOT, 'docs', 'research', 'old')), false, 'docs/research/old must be removed');
    assert.equal(existsSync(join(PROJECT_ROOT, 'docs', 'design-docs')), false, 'docs/design-docs must be removed');
    assert.equal(existsSync(join(PROJECT_ROOT, 'results')), false, 'root results directory must be removed');
  });

  it('keeps only the session log archive under docs/sessions and removes old working-memory path', () => {
    assert.equal(existsSync(SESSION_LOGS_ARCHIVE_DIR), true, 'session log archive directory must exist');
    assert.equal(existsSync(join(PROJECT_ROOT, 'docs', 'working-memory', 'session-logs')), false,
      'docs/working-memory/session-logs must be removed');
    assert.equal(existsSync(join(PROJECT_ROOT, 'logs', 'sessions')), false,
      'logs/sessions must be removed');
  });

  it('splits campaigns and universes into base and archive', () => {
    assert.equal(existsSync(CAMPAIGNS_DIR), true, 'campaigns directory must exist');
    assert.equal(existsSync(CAMPAIGNS_ARCHIVE_DIR), true, 'campaign archive directory must exist');
    assert.equal(existsSync(UNIVERSES_DIR), true, 'universes directory must exist');
    assert.equal(existsSync(UNIVERSES_ARCHIVE_DIR), true, 'universe archive directory must exist');

    assert.equal(
      existsSync(join(CAMPAIGNS_ARCHIVE_DIR, 'next-long-run-us-12x10.json')),
      true,
      'archived US long-run campaign must exist under campaigns/archive/',
    );
    assert.equal(
      existsSync(join(CAMPAIGNS_ARCHIVE_DIR, 'next-long-run-jp-12x10.json')),
      true,
      'archived JP long-run campaign must exist under campaigns/archive/',
    );
    assert.equal(
      existsSync(join(UNIVERSES_ARCHIVE_DIR, 'next-long-run-us-12.json')),
      true,
      'archived US universe must exist under universes/archive/',
    );
    assert.equal(
      existsSync(join(UNIVERSES_ARCHIVE_DIR, 'next-long-run-jp-12.json')),
      true,
      'archived JP universe must exist under universes/archive/',
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

  it('prunes strategy-presets.json to 124 live strategies and records retired strategies', () => {
    const expectedLiveStrategies = 124;
    const presets = JSON.parse(
      readFileSync(join(PROJECT_ROOT, 'config', 'backtest', 'strategy-presets.json'), 'utf8'),
    );
    assert.equal(
      presets.strategies.length,
      expectedLiveStrategies,
      `expected ${expectedLiveStrategies} strategies, got ${presets.strategies.length}`,
    );
    assert.equal(
      existsSync(DOCS_RETIRED_STRATEGY_DIR),
      true,
      'docs/research/archive/retired must exist',
    );
    const retiredFiles = readdirSync(DOCS_RETIRED_STRATEGY_DIR)
      .filter((name) => !name.endsWith(':Zone.Identifier'))
      .filter((name) => name.endsWith('.md') || name.endsWith('.json'));
    assert.ok(
      retiredFiles.length > 0,
      'docs/research/archive/retired must contain at least one retirement ledger',
    );
  });

  it('strategy-catalog.json exists and has 126 strategies', () => {
    const catalogPath = join(PROJECT_ROOT, 'config', 'backtest', 'strategy-catalog.json');
    assert.equal(existsSync(catalogPath), true, 'strategy-catalog.json must exist');
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
    assert.equal(catalog.strategies.length, 126, `expected 126 strategies in catalog, got ${catalog.strategies.length}`);
  });

  it('base campaigns and archive campaigns do not overlap', () => {
    const baseCampaigns = new Set(
      readdirSync(CAMPAIGNS_DIR).filter((name) => name.endsWith('.json')),
    );
    const archiveCampaigns = new Set(
      readdirSync(CAMPAIGNS_ARCHIVE_DIR).filter((name) => name.endsWith('.json')),
    );
    for (const name of baseCampaigns) {
      assert.equal(archiveCampaigns.has(name), false,
        `campaign ${name} must not exist in both campaigns/ and archive/`);
    }
  });

  it('base universes and archive universes do not overlap', () => {
    const baseUniverses = new Set(
      readdirSync(UNIVERSES_DIR).filter((name) => name.endsWith('.json')),
    );
    const archiveUniverses = new Set(
      readdirSync(UNIVERSES_ARCHIVE_DIR).filter((name) => name.endsWith('.json')),
    );
    for (const name of baseUniverses) {
      assert.equal(archiveUniverses.has(name), false,
        `universe ${name} must not exist in both universes/ and archive/`);
    }
  });

  it('current campaigns reference universes that exist under universes/', () => {
    const allUniverseIds = new Set();
    for (const dir of [UNIVERSES_DIR, UNIVERSES_ARCHIVE_DIR]) {
      for (const name of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
        const content = JSON.parse(readFileSync(join(dir, name), 'utf8'));
        allUniverseIds.add(content.id);
      }
    }
    const campaignFiles = readdirSync(CAMPAIGNS_DIR).filter((name) => name.endsWith('.json'));
    for (const file of campaignFiles) {
      const campaign = JSON.parse(readFileSync(join(CAMPAIGNS_DIR, file), 'utf8'));
      assert.ok(allUniverseIds.has(campaign.universe),
        `campaign ${file} references universe "${campaign.universe}" which must exist in universes/`);
    }
  });

  it('current campaign strategy_ids are a subset of live strategy-presets.json', () => {
    const presets = JSON.parse(
      readFileSync(join(PROJECT_ROOT, 'config', 'backtest', 'strategy-presets.json'), 'utf8'),
    );
    const livePresetIds = new Set(presets.strategies.map((s) => s.id));
    const campaignFiles = readdirSync(CAMPAIGNS_DIR).filter((name) => name.endsWith('.json'));
    for (const file of campaignFiles) {
      const campaign = JSON.parse(readFileSync(join(CAMPAIGNS_DIR, file), 'utf8'));
      for (const strategyId of campaign.strategy_ids || campaign.preset_ids || []) {
        assert.ok(livePresetIds.has(strategyId),
          `campaign ${file} uses strategy "${strategyId}" not in live strategy-presets.json`);
      }
    }
  });

  it('docs/research/manifest.json lists only files that actually exist', () => {
    const manifestPath = join(PROJECT_ROOT, 'docs', 'research', 'manifest.json');
    assert.ok(existsSync(manifestPath), 'manifest.json must exist');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert.ok(Array.isArray(manifest.keep), 'manifest.keep must be an array');
    for (const name of manifest.keep) {
      assert.ok(
        existsSync(join(PROJECT_ROOT, 'docs', 'research', name)),
        `manifest.json lists "${name}" which does not exist in docs/research/`,
      );
    }
  });
});

describe('repository layout policy', () => {
  it('keeps shared Codex settings under .codex/config.toml', () => {
    assert.equal(existsSync(CODEX_DIR), true, '.codex directory must exist');
    assert.equal(statSync(CODEX_DIR).isDirectory(), true, '.codex must be a directory');
    assert.equal(existsSync(CODEX_CONFIG_PATH), true, '.codex/config.toml must exist');

    const config = readFileSync(CODEX_CONFIG_PATH, 'utf8');
    assert.match(config, /^model = "gpt-5\.4"$/m, 'Codex should use the current frontier model');
    assert.match(config, /^model_reasoning_effort = "medium"$/m, 'Codex should use medium reasoning by default');
    assert.match(config, /^\[plugins\."github@openai-curated"\]$/m, 'GitHub plugin settings must be present');
    assert.match(config, /^enabled = true$/m, 'GitHub plugin must be enabled');
    assert.match(config, /^\[mcp_servers\.oh-my-tradingview\]$/m, 'Codex MCP server settings must be present');
    assert.match(config, /^command = "node"$/m, 'Codex MCP server must use node');
    assert.match(config, /args = \["\/home\/fpxszk\/code\/Oh-MY-TradingView\/src\/server\.js"\]/,
      'Codex MCP server must point at this repository server.js');
    assert.match(config, /^\[mcp_servers\.oh-my-tradingview\.env\]$/m, 'Codex MCP env settings must be present');
    assert.match(config, /^TV_CDP_HOST = "172\.31\.144\.1"$/m, 'Codex MCP should default to the verified WSL host');
    assert.match(config, /^TV_CDP_PORT = "9223"$/m, 'Codex MCP should default to the verified WSL port');
  });

  it('keeps human entrypoints under docs/ and removes obsolete command.md', () => {
    assert.equal(existsSync(join(PROJECT_ROOT, 'docs', 'command.md')), false, 'docs/command.md must be removed');
    assert.equal(existsSync(DOCS_DOCUMENTATION_SYSTEM_PATH), true, 'docs/DOCUMENTATION_SYSTEM.md must exist');
    assert.equal(existsSync(DOCS_EXPLAIN_PATH), true, 'docs/explain-forhuman.md must exist');
    assert.equal(existsSync(join(PROJECT_ROOT, 'command.md')), false, 'root command.md must be removed');
    assert.equal(existsSync(join(PROJECT_ROOT, 'explain-forhuman.md')), false, 'root explain-forhuman.md must be removed');
  });

  it('keeps docs structure with research, references, reports, sessions, strategy directories', () => {
    assert.equal(existsSync(DOCS_RESEARCH_DIR), true, 'docs/research must exist');
    assert.equal(existsSync(RESEARCH_ARCHIVE_DIR), true, 'docs/research/archive must exist');
    assert.equal(existsSync(DOCS_REFERENCES_DIR), true, 'docs/references must exist');
    assert.equal(existsSync(DOCS_REPORTS_DIR), true, 'docs/reports must exist');
    assert.equal(existsSync(SESSION_LOGS_DIR), true, 'docs/sessions must exist');
    assert.equal(existsSync(join(PROJECT_ROOT, 'docs', 'strategy')), true, 'docs/strategy must exist');
    assert.equal(existsSync(ARTIFACTS_DIR), true, 'artifacts must exist');
    assert.equal(existsSync(ARTIFACTS_CAMPAIGNS_DIR), true, 'artifacts/campaigns must exist');
  });

  it('keeps the theme momentum definition at a stable strategy doc path', () => {
    assert.equal(existsSync(DOCS_THEME_MOMENTUM_PATH), true,
      'docs/strategy/theme-momentum-definition.md must exist');

    const rootReadme = readFileSync(ROOT_README_PATH, 'utf8');
    assert.match(rootReadme, /theme-momentum-definition\.md/,
      'README.md must point readers to theme-momentum-definition.md');
  });

  it('uses research/archive naming and removes obsolete doc buckets', () => {
    assert.equal(existsSync(RESEARCH_ARCHIVE_DIR), true, 'docs/research/archive must exist');
    assert.equal(existsSync(join(PROJECT_ROOT, 'docs', 'research', 'latest')), false, 'docs/research/latest must be removed');
    assert.equal(existsSync(join(PROJECT_ROOT, 'docs', 'research', 'old')), false, 'docs/research/old must be removed');
    assert.equal(existsSync(join(PROJECT_ROOT, 'docs', 'design-docs')), false, 'docs/design-docs must be removed');
    assert.equal(existsSync(join(PROJECT_ROOT, 'results')), false, 'root results directory must be removed');
  });

  it('keeps only the session log archive under docs/sessions and removes old working-memory path', () => {
    assert.equal(existsSync(SESSION_LOGS_ARCHIVE_DIR), true, 'session log archive directory must exist');
    assert.equal(existsSync(join(PROJECT_ROOT, 'docs', 'working-memory', 'session-logs')), false,
      'docs/working-memory/session-logs must be removed');
    assert.equal(existsSync(join(PROJECT_ROOT, 'logs', 'sessions')), false,
      'logs/sessions must be removed');
  });

  it('splits campaigns and universes into base and archive', () => {
    assert.equal(existsSync(CAMPAIGNS_DIR), true, 'campaigns directory must exist');
    assert.equal(existsSync(CAMPAIGNS_ARCHIVE_DIR), true, 'campaign archive directory must exist');
    assert.equal(existsSync(UNIVERSES_DIR), true, 'universes directory must exist');
    assert.equal(existsSync(UNIVERSES_ARCHIVE_DIR), true, 'universe archive directory must exist');

    assert.equal(
      existsSync(join(CAMPAIGNS_ARCHIVE_DIR, 'next-long-run-us-12x10.json')),
      true,
      'archived US long-run campaign must exist under campaigns/archive/',
    );
    assert.equal(
      existsSync(join(CAMPAIGNS_ARCHIVE_DIR, 'next-long-run-jp-12x10.json')),
      true,
      'archived JP long-run campaign must exist under campaigns/archive/',
    );
    assert.equal(
      existsSync(join(UNIVERSES_ARCHIVE_DIR, 'next-long-run-us-12.json')),
      true,
      'archived US universe must exist under universes/archive/',
    );
    assert.equal(
      existsSync(join(UNIVERSES_ARCHIVE_DIR, 'next-long-run-jp-12.json')),
      true,
      'archived JP universe must exist under universes/archive/',
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

  it('prunes strategy-presets.json to 124 live strategies and records retired strategies', () => {
    const expectedLiveStrategies = 124;
    const presets = JSON.parse(
      readFileSync(join(PROJECT_ROOT, 'config', 'backtest', 'strategy-presets.json'), 'utf8'),
    );
    assert.equal(
      presets.strategies.length,
      expectedLiveStrategies,
      `expected ${expectedLiveStrategies} strategies, got ${presets.strategies.length}`,
    );
    assert.equal(
      existsSync(DOCS_RETIRED_STRATEGY_DIR),
      true,
      'docs/research/archive/retired must exist',
    );
    const retiredFiles = readdirSync(DOCS_RETIRED_STRATEGY_DIR)
      .filter((name) => !name.endsWith(':Zone.Identifier'))
      .filter((name) => name.endsWith('.md') || name.endsWith('.json'));
    assert.ok(
      retiredFiles.length > 0,
      'docs/research/archive/retired must contain at least one retirement ledger',
    );
  });

  it('strategy-catalog.json exists and has 126 strategies', () => {
    const catalogPath = join(PROJECT_ROOT, 'config', 'backtest', 'strategy-catalog.json');
    assert.equal(existsSync(catalogPath), true, 'strategy-catalog.json must exist');
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
    assert.equal(catalog.strategies.length, 126, `expected 126 strategies in catalog, got ${catalog.strategies.length}`);
  });

  it('base campaigns and archive campaigns do not overlap', () => {
    const baseCampaigns = new Set(
      readdirSync(CAMPAIGNS_DIR).filter((name) => name.endsWith('.json')),
    );
    const archiveCampaigns = new Set(
      readdirSync(CAMPAIGNS_ARCHIVE_DIR).filter((name) => name.endsWith('.json')),
    );
    for (const name of baseCampaigns) {
      assert.equal(archiveCampaigns.has(name), false,
        `campaign ${name} must not exist in both campaigns/ and archive/`);
    }
  });

  it('base universes and archive universes do not overlap', () => {
    const baseUniverses = new Set(
      readdirSync(UNIVERSES_DIR).filter((name) => name.endsWith('.json')),
    );
    const archiveUniverses = new Set(
      readdirSync(UNIVERSES_ARCHIVE_DIR).filter((name) => name.endsWith('.json')),
    );
    for (const name of baseUniverses) {
      assert.equal(archiveUniverses.has(name), false,
        `universe ${name} must not exist in both universes/ and archive/`);
    }
  });

  it('current campaigns reference universes that exist under universes/', () => {
    const allUniverseIds = new Set();
    for (const dir of [UNIVERSES_DIR, UNIVERSES_ARCHIVE_DIR]) {
      for (const name of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
        const content = JSON.parse(readFileSync(join(dir, name), 'utf8'));
        allUniverseIds.add(content.id);
      }
    }
    const campaignFiles = readdirSync(CAMPAIGNS_DIR).filter((name) => name.endsWith('.json'));
    for (const file of campaignFiles) {
      const campaign = JSON.parse(readFileSync(join(CAMPAIGNS_DIR, file), 'utf8'));
      assert.ok(allUniverseIds.has(campaign.universe),
        `campaign ${file} references universe "${campaign.universe}" which must exist in universes/`);
    }
  });

  it('current campaign strategy_ids are a subset of live strategy-presets.json', () => {
    const presets = JSON.parse(
      readFileSync(join(PROJECT_ROOT, 'config', 'backtest', 'strategy-presets.json'), 'utf8'),
    );
    const livePresetIds = new Set(presets.strategies.map((s) => s.id));
    const campaignFiles = readdirSync(CAMPAIGNS_DIR).filter((name) => name.endsWith('.json'));
    for (const file of campaignFiles) {
      const campaign = JSON.parse(readFileSync(join(CAMPAIGNS_DIR, file), 'utf8'));
      for (const strategyId of campaign.strategy_ids || campaign.preset_ids || []) {
        assert.ok(livePresetIds.has(strategyId),
          `campaign ${file} uses strategy "${strategyId}" not in live strategy-presets.json`);
      }
    }
  });

  it('docs/research/manifest.json lists only files that actually exist', () => {
    const manifestPath = join(PROJECT_ROOT, 'docs', 'research', 'manifest.json');
    assert.ok(existsSync(manifestPath), 'manifest.json must exist');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert.ok(Array.isArray(manifest.keep), 'manifest.keep must be an array');
    for (const name of manifest.keep) {
      assert.ok(
        existsSync(join(PROJECT_ROOT, 'docs', 'research', name)),
        `manifest.json lists "${name}" which does not exist in docs/research/`,
      );
    }
  });
});
