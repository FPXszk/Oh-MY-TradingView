import { readdir, readFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import { summarizeStrategyRuns, rankStrategySummaries } from './campaign-report.js';

export const DEFAULT_CURRENT_SCOREBOARDS_PATH = join(
  process.cwd(),
  'docs',
  'research',
  'current',
  'artifacts-backtest-scoreboards.md',
);

function fmt(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }
  return value.toFixed(digits);
}

function toRel(projectRoot, pathValue) {
  return relative(projectRoot, pathValue).replaceAll('\\', '/');
}

export function buildCampaignStrategyRankingArtifact({
  campaignId,
  phase,
  runs,
  initialCapital = 10000,
  generatedAt = new Date().toISOString(),
  sourceRunId = null,
  sourceKind = 'manual',
  sourceResultsPath = null,
} = {}) {
  const rankedRows = rankStrategySummaries(
    summarizeStrategyRuns(runs, {
      initialCapital,
      topLimit: Number.MAX_SAFE_INTEGER,
    }),
  ).map((row) => ({
    rank: row.rank,
    presetId: row.presetId,
    run_count: row.run_count,
    success_count: row.success_count,
    avg_net_profit: row.avg_net_profit,
    avg_profit_factor: row.avg_profit_factor,
    avg_max_drawdown: row.avg_max_drawdown,
    avg_percent_profitable: row.avg_percent_profitable,
  }));

  return {
    campaign_id: campaignId,
    phase,
    generated_at: generatedAt,
    source_run_id: sourceRunId,
    source_kind: sourceKind,
    source_results_path: sourceResultsPath,
    strategy_count: rankedRows.length,
    rows: rankedRows,
  };
}

export function renderCampaignStrategyRankingMarkdown(artifact) {
  const rows = Array.isArray(artifact?.rows) ? artifact.rows : [];
  const lines = [
    `# ${artifact.campaign_id} / ${artifact.phase} Strategy Ranking`,
    '',
    `- generated_at: \`${artifact.generated_at ?? 'n/a'}\``,
    `- source_run_id: \`${artifact.source_run_id ?? 'n/a'}\``,
    `- source_kind: \`${artifact.source_kind ?? 'n/a'}\``,
    `- source_results: \`${artifact.source_results_path ?? 'n/a'}\``,
    '',
    '| rank | strategy | avg net profit | avg profit factor | avg max drawdown | avg win rate | success / runs |',
    '| ---: | --- | ---: | ---: | ---: | ---: | ---: |',
  ];

  for (const row of rows) {
    lines.push(
      `| ${row.rank} | \`${row.presetId}\` | ${fmt(row.avg_net_profit)} | ${fmt(row.avg_profit_factor, 3)} | ${fmt(row.avg_max_drawdown)} | ${fmt(row.avg_percent_profitable)}% | ${row.success_count} / ${row.run_count} |`,
    );
  }

  return `${lines.join('\n')}\n`;
}

export async function collectCampaignStrategyRankingArtifacts(artifactsRoot, projectRoot = process.cwd()) {
  const campaignEntries = await readdir(artifactsRoot, { withFileTypes: true }).catch(() => []);
  const collected = [];

  for (const campaignEntry of campaignEntries) {
    if (!campaignEntry.isDirectory()) {
      continue;
    }
    const campaignDir = join(artifactsRoot, campaignEntry.name);
    const phaseEntries = await readdir(campaignDir, { withFileTypes: true }).catch(() => []);
    for (const phaseEntry of phaseEntries) {
      if (!phaseEntry.isDirectory()) {
        continue;
      }
      const phaseDir = join(campaignDir, phaseEntry.name);
      const rankingPath = join(phaseDir, 'strategy-ranking.json');
      try {
        const artifact = JSON.parse(await readFile(rankingPath, 'utf8'));
        collected.push({
          ...artifact,
          campaign_dir: toRel(projectRoot, phaseDir),
          ranking_path: toRel(projectRoot, rankingPath),
        });
      } catch {
        // Ignore campaigns without ranking artifacts yet.
      }
    }
  }

  return collected.sort((left, right) => {
    const rightTime = Date.parse(right.generated_at ?? '') || 0;
    const leftTime = Date.parse(left.generated_at ?? '') || 0;
    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }
    return `${left.campaign_id}/${left.phase}`.localeCompare(`${right.campaign_id}/${right.phase}`);
  });
}

export function renderCurrentArtifactScoreboardsMarkdown(artifacts) {
  const rows = Array.isArray(artifacts) ? artifacts : [];
  const lines = [
    '# Artifact Backtest Scoreboards',
    '',
    'このファイルは `artifacts/campaigns/*/*/strategy-ranking.json` を正本として自動生成する current 一覧です。',
    '',
  ];

  if (rows.length === 0) {
    lines.push('現在利用可能な campaign ranking artifact はありません。', '');
    return `${lines.join('\n')}\n`;
  }

  for (const artifact of rows) {
    lines.push(
      `## ${artifact.campaign_id} / ${artifact.phase}`,
      '',
      `- generated_at: \`${artifact.generated_at ?? 'n/a'}\``,
      `- source_run_id: \`${artifact.source_run_id ?? 'n/a'}\``,
      `- source_kind: \`${artifact.source_kind ?? 'n/a'}\``,
      `- ranking_artifact: \`${artifact.ranking_path ?? basename(artifact.campaign_id)}\``,
      `- campaign_dir: \`${artifact.campaign_dir ?? 'n/a'}\``,
      '',
      '| rank | strategy | avg net profit | avg profit factor | avg max drawdown | avg win rate | success / runs |',
      '| ---: | --- | ---: | ---: | ---: | ---: | ---: |',
    );
    for (const row of artifact.rows || []) {
      lines.push(
        `| ${row.rank} | \`${row.presetId}\` | ${fmt(row.avg_net_profit)} | ${fmt(row.avg_profit_factor, 3)} | ${fmt(row.avg_max_drawdown)} | ${fmt(row.avg_percent_profitable)}% | ${row.success_count} / ${row.run_count} |`,
      );
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}
