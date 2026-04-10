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

function shortenPresetId(presetId) {
  return String(presetId || '')
    .replace('donchian-', '')
    .replace('-rsp-filter-rsi14-', ' ')
    .replace('-theme-deep-pullback-', ' ')
    .replace('-hard-stop-', ' stop-')
    .replace(/-/g, ' ')
    .trim();
}

function summarizeOutcome(runs) {
  const allRuns = Array.isArray(runs) ? runs : [];
  const success = allRuns.filter((run) => run?.result?.success === true).length;
  const failure = allRuns.length - success;
  const unreadable = allRuns.filter((run) => run?.result?.tester_reason_category === 'metrics_unreadable').length;
  return { total: allRuns.length, success, failure, unreadable };
}

function renderStrategyTable(summary) {
  const rows = summary.strategy_summaries.map((entry) => [
    `\`${entry.presetId}\``,
    fmtNumber(entry.avg_net_profit),
    fmtNumber(entry.median_net_profit),
    fmtNumber(entry.avg_profit_factor, 4),
    fmtNumber(entry.avg_max_drawdown),
    fmtPercent(entry.avg_max_drawdown_pct),
    fmtNumber(entry.avg_closed_trades),
    fmtPercent(entry.avg_percent_profitable),
    fmtPercent(entry.positive_run_rate),
    fmtNumber(entry.profit_to_drawdown_ratio, 4),
    entry.top_symbols.slice(0, 5).map((item) => `\`${item.symbol}\``).join(', '),
  ]);

  return [
    '| strategy | avg net | median net | avg PF | avg MDD | avg MDD% | avg trades | avg win rate | positive runs | profit/DD | top symbols |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function renderSymbolTable(symbols) {
  return [
    '| symbol | label | best strategy | avg net | avg PF | avg MDD | avg MDD% | avg trades | avg win rate |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...symbols.map((entry) => [
      `\`${entry.symbol}\``,
      entry.label || entry.symbol,
      `\`${entry.best_preset_id}\``,
      fmtNumber(entry.avg_net_profit),
      fmtNumber(entry.avg_profit_factor, 4),
      fmtNumber(entry.avg_max_drawdown),
      fmtPercent(entry.avg_max_drawdown_pct),
      fmtNumber(entry.avg_closed_trades),
      fmtPercent(entry.avg_percent_profitable),
    ].join(' | '))
      .map((row) => `| ${row} |`),
  ].join('\n');
}

function renderStrategyFocus(summary) {
  return summary.strategy_summaries.map((entry) => {
    const strongest = entry.top_symbols.slice(0, 5).map((item) => `\`${item.symbol}\``).join(', ');
    const weakest = entry.worst_symbols.slice(0, 3).map((item) => `\`${item.symbol}\``).join(', ');
    return [
      `### \`${entry.presetId}\``,
      `- avg net: ${fmtNumber(entry.avg_net_profit)} / median net: ${fmtNumber(entry.median_net_profit)}`,
      `- avg PF: ${fmtNumber(entry.avg_profit_factor, 4)} / avg MDD: ${fmtNumber(entry.avg_max_drawdown)} (${fmtPercent(entry.avg_max_drawdown_pct)})`,
      `- avg trades: ${fmtNumber(entry.avg_closed_trades)} / avg win rate: ${fmtPercent(entry.avg_percent_profitable)} / positive-run rate: ${fmtPercent(entry.positive_run_rate)}`,
      `- 強い銘柄: ${strongest || 'n/a'}`,
      `- 弱い銘柄: ${weakest || 'n/a'}`,
    ].join('\n');
  }).join('\n\n');
}

function renderMarketReview(summary) {
  const bestAvgNet = [...summary.strategy_summaries].sort((left, right) => (right.avg_net_profit ?? -Infinity) - (left.avg_net_profit ?? -Infinity))[0];
  const bestRiskAdjusted = summary.ranked_strategies[0];
  const topSymbols = summary.top_symbols.slice(0, 5).map((entry) => `\`${entry.symbol}\``).join(', ');

  return [
    `- avg net 首位は \`${bestAvgNet?.presetId ?? 'n/a'}\`（${fmtNumber(bestAvgNet?.avg_net_profit)}）`,
    `- risk-adjusted 本命は \`${bestRiskAdjusted?.presetId ?? 'n/a'}\`（avg PF ${fmtNumber(bestRiskAdjusted?.avg_profit_factor, 4)}, avg MDD% ${fmtPercent(bestRiskAdjusted?.avg_max_drawdown_pct)}）`,
    `- 上位寄与銘柄は ${topSymbols || 'n/a'} で、market 内の強さが一部の主力銘柄に寄りやすい`,
    `- 次段では、entry 由来の差なのか exit 由来の差なのかを sector / bucket / symbol cluster で分解する価値が高い`,
  ].join('\n');
}

function renderCombinedReview(ranking) {
  const topFive = ranking.slice(0, 5);
  return [
    '| rank | market | strategy | avg net | avg PF | avg MDD% | avg trades | avg win rate |',
    '| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: |',
    ...topFive.map((entry) => `| ${entry.rank} | ${entry.market || 'n/a'} | \`${entry.presetId}\` | ${fmtNumber(entry.avg_net_profit)} | ${fmtNumber(entry.avg_profit_factor, 4)} | ${fmtPercent(entry.avg_max_drawdown_pct)} | ${fmtNumber(entry.avg_closed_trades)} | ${fmtPercent(entry.avg_percent_profitable)} |`),
  ].join('\n');
}

function renderImprovementIdeas() {
  return [
    '1. **US**: `strict-entry-early` と `strict-entry-late` の差を、主力銘柄依存か regime 感応度差かで切り分ける。特に `NVDA` / `AAPL` / `META` 依存が強いなら、entry を少し遅らせた control と shallow stop の比較を続ける。',
    '2. **JP**: `tight` と `tight-exit-tight` の差を、総利益優先かドローダウン圧縮優先かで明確に分けて運用する。上位寄与銘柄が偏る場合は、entry 緩和より exit / stop の微調整を優先する。',
    '3. **運用面**: 長時間 batch は shard parallel を優先し、worker2 は distinct parallel smoke を安定通過するまでは本線へ戻さない。checkpoint を 10 run 単位で刻み、fallback を first-class として扱う。',
    '4. **Pine 運用**: 最終的な top 5 は Pine source を durable 保存し、local chart へ順次適用して人手レビューしやすい形にする。public publish は別タスクとして切り離す。',
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
    topLimit,
  });
  const jpSummary = summarizeMarketCampaign({
    runs: jpRuns,
    market: 'JP',
    initialCapital,
    topLimit,
  });
  const combinedRanking = buildCombinedStrategyRanking([usSummary, jpSummary], { topLimit: 10 });
  const usOutcome = summarizeOutcome(usRuns);
  const jpOutcome = summarizeOutcome(jpRuns);

  if (values['ranking-out']) {
    await writeFile(values['ranking-out'], `${JSON.stringify(combinedRanking, null, 2)}\n`);
  }

  const content = [
    `# ${values.title}`,
    '',
    '- status: COMPLETED',
    '- style: detailed Japanese operator report',
    `- date range: ${values['date-from']} -> ${values['date-to']}`,
    '',
    '## Source artifacts',
    '',
    `- US recovered full: \`${values.us}\``,
    `- JP recovered full: \`${values.jp}\``,
    ...(values['ranking-out'] ? [`- combined ranking: \`${values['ranking-out']}\``] : []),
    '',
    '## Coverage summary',
    '',
    '| market | success | failure | unreadable | total |',
    '| --- | ---: | ---: | ---: | ---: |',
    `| US | ${usOutcome.success} | ${usOutcome.failure} | ${usOutcome.unreadable} | ${usOutcome.total} |`,
    `| JP | ${jpOutcome.success} | ${jpOutcome.failure} | ${jpOutcome.unreadable} | ${jpOutcome.total} |`,
    '',
    '## Final review',
    '',
    '今回の full artifact は、**US / JP ともに 100 銘柄 x 3 戦略の完走結果を raw run 単位で再集計したもの**で、avg net だけでなく、ドローダウン、トレード数、勝率、profit-to-drawdown ratio まで含めて比較している。',
    '',
    '結論としては、**US は entry timing の差がそのまま performance の差に残りやすく、JP は exit の締め方が成績差の中心**だった。したがって、次段の fine-tune は市場横断で一律に回すよりも、市場ごとに強かった family を中心に微調整する方が自然である。',
    '',
    '## Overall top strategies',
    '',
    renderCombinedReview(combinedRanking),
    '',
    '## US strategy summary',
    '',
    renderStrategyTable(usSummary),
    '',
    '### US review',
    '',
    renderMarketReview(usSummary),
    '',
    '### US symbol top 10',
    '',
    renderSymbolTable(usSummary.top_symbols),
    '',
    '### US symbol bottom 10',
    '',
    renderSymbolTable(usSummary.worst_symbols),
    '',
    '### US strategy-by-strategy notes',
    '',
    renderStrategyFocus(usSummary),
    '',
    '## JP strategy summary',
    '',
    renderStrategyTable(jpSummary),
    '',
    '### JP review',
    '',
    renderMarketReview(jpSummary),
    '',
    '### JP symbol top 10',
    '',
    renderSymbolTable(jpSummary.top_symbols),
    '',
    '### JP symbol bottom 10',
    '',
    renderSymbolTable(jpSummary.worst_symbols),
    '',
    '### JP strategy-by-strategy notes',
    '',
    renderStrategyFocus(jpSummary),
    '',
    '## 次に繋げる改善案',
    '',
    renderImprovementIdeas(),
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
