#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');

function fmtNumber(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }
  return value.toFixed(digits);
}

function fmtPercent(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }
  return `${value.toFixed(digits)}%`;
}

function summarizeOutcome(runs) {
  const allRuns = Array.isArray(runs) ? runs : [];
  const success = allRuns.filter((run) => run?.result?.success === true).length;
  const failure = allRuns.length - success;
  const unreadable = allRuns.filter((run) => run?.result?.tester_reason_category === 'metrics_unreadable').length;
  return { total: allRuns.length, success, failure, unreadable };
}

function renderCoverageTable(usOutcome, jpOutcome) {
  return [
    '| market | success | failure | unreadable | total |',
    '| --- | ---: | ---: | ---: | ---: |',
    `| US | ${usOutcome.success} | ${usOutcome.failure} | ${usOutcome.unreadable} | ${usOutcome.total} |`,
    `| JP | ${jpOutcome.success} | ${jpOutcome.failure} | ${jpOutcome.unreadable} | ${jpOutcome.total} |`,
  ].join('\n');
}

function renderMarketSnapshotTable(summary) {
  const rows = summary.ranked_strategies.slice(0, 5).map((entry) => [
    `\`${entry.presetId}\``,
    fmtNumber(entry.avg_net_profit),
    fmtNumber(entry.avg_profit_factor, 4),
    fmtNumber(entry.avg_max_drawdown),
    fmtPercent(entry.avg_percent_profitable),
    fmtNumber(entry.avg_closed_trades),
  ]);

  return [
    '| strategy | avg net | avg PF | avg MDD | avg win rate | avg trades |',
    '| --- | ---: | ---: | ---: | ---: | ---: |',
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function renderAllStrategyScoreboard(ranking) {
  return [
    '| rank | strategy | markets | composite score | avg net | avg PF | avg MDD | avg win rate | tested symbols |',
    '| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...ranking.map((entry) => `| ${entry.rank} | \`${entry.presetId}\` | ${entry.markets.join(', ')} | ${entry.composite_score} | ${fmtNumber(entry.avg_net_profit)} | ${fmtNumber(entry.avg_profit_factor, 4)} | ${fmtNumber(entry.avg_max_drawdown)} | ${fmtPercent(entry.avg_percent_profitable)} | ${entry.symbol_results.length} |`),
  ].join('\n');
}

function renderTopStrategySymbolTables(ranking) {
  return ranking.slice(0, 5).map((entry) => [
    `### ${entry.rank}. \`${entry.presetId}\``,
    '',
    `- markets: ${entry.markets.join(', ')}`,
    `- composite score: ${entry.composite_score}`,
    `- avg net: ${fmtNumber(entry.avg_net_profit)} / avg PF: ${fmtNumber(entry.avg_profit_factor, 4)} / avg MDD: ${fmtNumber(entry.avg_max_drawdown)}`,
    '',
    '| symbol | label | market | net profit | profit factor | max drawdown | max drawdown % | trades | win rate |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...(entry.symbol_results.length > 0
      ? entry.symbol_results.map((symbolRow) => `| \`${symbolRow.symbol}\` | ${symbolRow.label || symbolRow.symbol} | ${symbolRow.market || 'n/a'} | ${fmtNumber(symbolRow.net_profit)} | ${fmtNumber(symbolRow.profit_factor, 4)} | ${fmtNumber(symbolRow.max_drawdown)} | ${fmtPercent(symbolRow.max_drawdown_pct)} | ${fmtNumber(symbolRow.closed_trades)} | ${fmtPercent(symbolRow.percent_profitable)} |`)
      : ['| n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a |']),
  ].join('\n')).join('\n\n');
}

function renderConclusion(combinedRanking, usSummary, jpSummary) {
  const bestOverall = combinedRanking[0];
  const bestUs = usSummary.ranked_strategies[0];
  const bestJp = jpSummary.ranked_strategies[0];

  return [
    `- **総合首位**: \`${bestOverall?.presetId ?? 'n/a'}\`（score ${bestOverall?.composite_score ?? 'n/a'} / avg net ${fmtNumber(bestOverall?.avg_net_profit)} / avg PF ${fmtNumber(bestOverall?.avg_profit_factor, 4)}）`,
    `- **US 本命**: \`${bestUs?.presetId ?? 'n/a'}\`（avg net ${fmtNumber(bestUs?.avg_net_profit)} / avg PF ${fmtNumber(bestUs?.avg_profit_factor, 4)}）`,
    `- **JP 本命**: \`${bestJp?.presetId ?? 'n/a'}\`（avg net ${fmtNumber(bestJp?.avg_net_profit)} / avg PF ${fmtNumber(bestJp?.avg_profit_factor, 4)}）`,
    `- **読み方**: 全戦略の順位は market ごとの net / PF / drawdown 順位を合算した composite score を基準にし、そのうえで Top 5 の銘柄別明細で偏りを確認する。`,
  ].join('\n');
}

function renderImprovementIdeas(combinedRanking, usSummary, jpSummary) {
  const topFive = combinedRanking.slice(0, 5).map((entry) => `\`${entry.presetId}\``).join(', ');
  const usLeaders = usSummary.ranked_strategies.slice(0, 3).map((entry) => `\`${entry.presetId}\``).join(', ');
  const jpLeaders = jpSummary.ranked_strategies.slice(0, 3).map((entry) => `\`${entry.presetId}\``).join(', ');

  return [
    `1. **Top 5 の再確認**: ${topFive || 'n/a'} について、symbol table で一部銘柄依存が強すぎないかを次回 backtest で再確認する。`,
    `2. **US 側の確認事項**: ${usLeaders || 'n/a'} の差が entry timing 由来か stop 幅由来かを、同一 symbol 群で切り分ける。`,
    `3. **JP 側の確認事項**: ${jpLeaders || 'n/a'} の差が exit の締め方由来か regime 閾値由来かを追加比較する。`,
    '4. **次回のテンプレ運用**: rich report は全戦略スコア一覧を正本にし、Top 5 の銘柄別成績表で human review を行う。',
  ].join('\n');
}

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      us: { type: 'string' },
      jp: { type: 'string' },
      out: { type: 'string' },
      'ranking-out': { type: 'string' },
      'diff-out': { type: 'string' },
      'catalog-path': { type: 'string' },
      'catalog-out': { type: 'string' },
      'date-from': { type: 'string', default: '2000-01-01' },
      'date-to': { type: 'string', default: 'latest' },
      title: { type: 'string', default: 'Next long-run market-matched 200 results' },
      'top-limit': { type: 'string', default: '10' },
      'initial-capital': { type: 'string', default: '10000' },
    },
    allowPositionals: true,
    strict: true,
  });

  if (!values.us || !values.jp || !values.out) {
    throw new Error('Usage: node scripts/backtest/generate-rich-report.mjs --us <path> --jp <path> --out <path> [--ranking-out <path>]');
  }

  const topLimit = Number(values['top-limit']);
  const initialCapital = Number(values['initial-capital']);
  if (!Number.isFinite(topLimit) || topLimit <= 0) {
    throw new Error(`Invalid --top-limit: ${values['top-limit']}`);
  }
  if (!Number.isFinite(initialCapital) || initialCapital <= 0) {
    throw new Error(`Invalid --initial-capital: ${values['initial-capital']}`);
  }

  const [
    { summarizeMarketCampaign, buildCombinedStrategyRanking },
    usRuns,
    jpRuns,
  ] = await Promise.all([
    import(join(PROJECT_ROOT, 'src', 'core', 'campaign-report.js')),
    readFile(values.us, 'utf8').then((raw) => JSON.parse(raw)),
    readFile(values.jp, 'utf8').then((raw) => JSON.parse(raw)),
  ]);

  const usSummary = summarizeMarketCampaign({
    runs: usRuns,
    market: 'US',
    initialCapital,
    topLimit: Math.max(topLimit, 5),
  });
  const jpSummary = summarizeMarketCampaign({
    runs: jpRuns,
    market: 'JP',
    initialCapital,
    topLimit: Math.max(topLimit, 5),
  });
  const combinedRanking = buildCombinedStrategyRanking([usSummary, jpSummary], { topLimit: Number.MAX_SAFE_INTEGER });
  const usOutcome = summarizeOutcome(usRuns);
  const jpOutcome = summarizeOutcome(jpRuns);

  if (values['ranking-out']) {
    await writeFile(values['ranking-out'], `${JSON.stringify(combinedRanking, null, 2)}\n`);
  }

  const catalogPath = values['catalog-path'] || join(PROJECT_ROOT, 'config', 'backtest', 'strategy-catalog.json');
  if (values['diff-out'] || values['catalog-out']) {
    const { loadCatalog } = await import(join(PROJECT_ROOT, 'src', 'core', 'strategy-catalog.js'));
    const { buildDiffArtifact } = await import(join(PROJECT_ROOT, 'src', 'core', 'strategy-live-retired-diff.js'));
    const catalog = await loadCatalog(catalogPath);
    if (values['catalog-out']) {
      await writeFile(values['catalog-out'], `${JSON.stringify(catalog, null, 2)}\n`);
      process.stdout.write(`Wrote catalog snapshot: ${values['catalog-out']}\n`);
    }
    if (values['diff-out']) {
      const diffArtifact = buildDiffArtifact(catalog);
      diffArtifact.catalog_path = values['catalog-out'] || values['catalog-path'] || 'config/backtest/strategy-catalog.json';
      await writeFile(values['diff-out'], `${JSON.stringify(diffArtifact, null, 2)}\n`);
      process.stdout.write(`Wrote diff artifact: ${values['diff-out']}\n`);
    }
  }

  const content = [
    `# ${values.title}`,
    '',
    '- status: COMPLETED',
    '- style: detailed Japanese operator report',
    `- date range: ${values['date-from']} -> ${values['date-to']}`,
    '',
    '## 参照アーティファクト',
    '',
    `- US recovered full: \`${values.us}\``,
    `- JP recovered full: \`${values.jp}\``,
    ...(values['ranking-out'] ? [`- combined ranking: \`${values['ranking-out']}\``] : []),
    ...(values['catalog-out'] ? [`- strategy catalog snapshot: \`${values['catalog-out']}\``] : []),
    '',
    '## 結論',
    '',
    renderConclusion(combinedRanking, usSummary, jpSummary),
    '',
    '## 実行カバレッジ',
    '',
    renderCoverageTable(usOutcome, jpOutcome),
    '',
    '## 市場別スナップショット',
    '',
    '### US 上位 5',
    '',
    renderMarketSnapshotTable(usSummary),
    '',
    '### JP 上位 5',
    '',
    renderMarketSnapshotTable(jpSummary),
    '',
    '## 全戦略スコア一覧',
    '',
    renderAllStrategyScoreboard(combinedRanking),
    '',
    '## Top 5 戦略の銘柄別成績',
    '',
    renderTopStrategySymbolTables(combinedRanking),
    '',
    '## 改善点と次回バックテスト確認事項',
    '',
    renderImprovementIdeas(combinedRanking, usSummary, jpSummary),
    '',
  ].join('\n');

  await writeFile(values.out, `${content}\n`);
  process.stdout.write(`Wrote rich report: ${values.out}\n`);
  if (values['ranking-out']) {
    process.stdout.write(`Wrote combined ranking: ${values['ranking-out']}\n`);
  }
}

main().catch((error) => {
  process.stderr.write(`Fatal: ${error.message}\n`);
  process.exit(1);
});
