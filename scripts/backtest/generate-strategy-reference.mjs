#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');

function fmtNumber(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return value.toFixed(digits);
}

function formatStopLoss(stopLoss) {
  if (!stopLoss || typeof stopLoss !== 'object') {
    return '—';
  }
  if (stopLoss.type === 'hard_percent') {
    return `${stopLoss.value}% hard stop`;
  }
  return stopLoss.type || '—';
}

function formatRegime(strategy) {
  const regime = strategy.regime_filter;
  const rsi = strategy.rsi_regime_filter;
  const parts = [];
  if (regime?.reference_symbol && regime?.reference_ma_period) {
    parts.push(`${regime.reference_symbol}>${String(regime.reference_ma_type || '').toUpperCase()}${regime.reference_ma_period}`);
  }
  if (Number.isFinite(rsi?.threshold)) {
    parts.push(`RSI${rsi.rsi_period ?? 14} ${rsi.direction === 'above' ? '>' : '<'} ${rsi.threshold}`);
  }
  return parts.length > 0 ? parts.join(' / ') : '—';
}

function formatParameters(strategy) {
  const params = strategy.parameters;
  if (!params || typeof params !== 'object') {
    return '—';
  }
  return Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');
}

async function readJson(path) {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw);
}

function toDisplayPath(path) {
  if (typeof path !== 'string' || path.length === 0) {
    return '—';
  }
  if (!isAbsolute(path)) {
    return path;
  }
  return relative(PROJECT_ROOT, path) || '.';
}

function buildStrategyIndex(catalog, combinedRanking, sourcePaths) {
  const rankingMap = new Map((combinedRanking || []).map((entry) => [entry.presetId, entry]));
  const liveCount = catalog.strategies.filter((strategy) => strategy.lifecycle?.status === 'live').length;
  const retiredCount = catalog.strategies.filter((strategy) => strategy.lifecycle?.status === 'retired').length;

  const lines = [
    '# Latest strategy reference',
    '',
    'このファイルは **戦略カタログの人間向け入口** です。初見でも「どの戦略があり、どの market / 期間 / 条件で見ているか」を追えるように整理しています。',
    '',
    `- catalog source: \`config/backtest/strategy-catalog.json\``,
    `- score artifact (US): \`${toDisplayPath(sourcePaths.us)}\``,
    `- score artifact (JP): \`${toDisplayPath(sourcePaths.jp)}\``,
    `- live count: ${liveCount}`,
    `- retired count: ${retiredCount}`,
    '',
    '## 読み方',
    '',
    '- `latest score` は利用可能な最新 backtest artifact から合成した順位です。未計測の戦略は `—` です。',
    '- `lifecycle` は live / retired を表します。',
    '- `theme notes` / `mag7 notes` は、この repo でその戦略をどう見ていたかの人間向け説明です。',
    '',
    '## 全戦略一覧',
    '',
    '| lifecycle | strategy | name | latest score | markets | parameters | regime | stop | theme axis | theme notes |',
    '| --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |',
  ];

  for (const strategy of catalog.strategies) {
    const ranking = rankingMap.get(strategy.id);
    lines.push(
      `| ${strategy.lifecycle?.status ?? 'unknown'} | \`${strategy.id}\` | ${strategy.name ?? '—'} | ${ranking?.composite_score ?? '—'} | ${ranking?.markets?.join(', ') ?? '—'} | ${formatParameters(strategy)} | ${formatRegime(strategy)} | ${formatStopLoss(strategy.stop_loss)} | ${strategy.theme_axis ?? '—'} | ${strategy.theme_notes ?? '—'} |`,
    );
  }

  lines.push(
    '',
    '## 最新結果で観測できた上位候補',
    '',
    '| rank | strategy | markets | avg net | avg PF | avg MDD | tested symbols |',
    '| ---: | --- | --- | ---: | ---: | ---: | ---: |',
    ...combinedRanking.slice(0, 10).map((entry) => `| ${entry.rank} | \`${entry.presetId}\` | ${entry.markets.join(', ')} | ${fmtNumber(entry.avg_net_profit)} | ${fmtNumber(entry.avg_profit_factor, 4)} | ${fmtNumber(entry.avg_max_drawdown)} | ${entry.symbol_results.length} |`),
    '',
  );

  return `${lines.join('\n')}\n`;
}

function buildSymbolIndex({ usUniverse, jpUniverse, usCampaign, jpCampaign, usSummary, jpSummary, sourcePaths }) {
  const symbolMap = new Map();
  for (const entry of usSummary.symbol_summaries || []) {
    symbolMap.set(`US::${entry.symbol}`, entry);
  }
  for (const entry of jpSummary.symbol_summaries || []) {
    symbolMap.set(`JP::${entry.symbol}`, entry);
  }

  const renderUniverseTable = (universe, campaign) => [
    '| symbol | label | bucket | latest best strategy | avg net | avg PF | avg MDD | campaign period |',
    '| --- | --- | --- | --- | ---: | ---: | ---: | --- |',
    ...universe.symbols.map((symbol) => {
      const summary = symbolMap.get(`${symbol.market}::${symbol.symbol}`);
      return `| \`${symbol.symbol}\` | ${symbol.label} | ${symbol.bucket ?? '—'} | \`${summary?.best_preset_id ?? '—'}\` | ${fmtNumber(summary?.avg_net_profit)} | ${fmtNumber(summary?.avg_profit_factor, 4)} | ${fmtNumber(summary?.avg_max_drawdown)} | ${campaign.date_override.from} -> ${campaign.date_override.to} |`;
    }),
  ].join('\n');

  return [
    '# Latest symbol reference',
    '',
    'このファイルは **銘柄側から戦略を見るための入口** です。latest config 上の campaign / universe と、上記 artifact で観測できた best strategy をまとめます。',
    '',
    `- US campaign: \`${usCampaign.id}\` / universe: \`${usUniverse.id}\``,
    `- JP campaign: \`${jpCampaign.id}\` / universe: \`${jpUniverse.id}\``,
    `- score artifact (US): \`${toDisplayPath(sourcePaths.us)}\``,
    `- score artifact (JP): \`${toDisplayPath(sourcePaths.jp)}\``,
    '- note: campaign / universe は latest config、score 列は上記 artifact に含まれる銘柄だけ埋まります。',
    '',
    '## US latest universe',
    '',
    renderUniverseTable(usUniverse, usCampaign),
    '',
    '## JP latest universe',
    '',
    renderUniverseTable(jpUniverse, jpCampaign),
    '',
  ].join('\n');
}

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      us: { type: 'string' },
      jp: { type: 'string' },
      'strategy-out': { type: 'string', default: 'docs/research/strategy/latest-strategy-reference.md' },
      'symbol-out': { type: 'string', default: 'docs/research/strategy/latest-symbol-reference.md' },
      'catalog-path': { type: 'string', default: join(PROJECT_ROOT, 'config', 'backtest', 'strategy-catalog.json') },
      'us-campaign-path': { type: 'string', default: join(PROJECT_ROOT, 'config', 'backtest', 'campaigns', 'latest', 'next-long-run-us-12x10.json') },
      'jp-campaign-path': { type: 'string', default: join(PROJECT_ROOT, 'config', 'backtest', 'campaigns', 'latest', 'next-long-run-jp-12x10.json') },
      'us-universe-path': { type: 'string', default: join(PROJECT_ROOT, 'config', 'backtest', 'universes', 'latest', 'next-long-run-us-12.json') },
      'jp-universe-path': { type: 'string', default: join(PROJECT_ROOT, 'config', 'backtest', 'universes', 'latest', 'next-long-run-jp-12.json') },
    },
    strict: true,
  });

  if (!values.us || !values.jp) {
    throw new Error('Usage: node scripts/backtest/generate-strategy-reference.mjs --us <path> --jp <path>');
  }

  const [
    { summarizeMarketCampaign, buildCombinedStrategyRanking },
    strategyCatalogModule,
    usRuns,
    jpRuns,
    catalog,
    usCampaign,
    jpCampaign,
    usUniverse,
    jpUniverse,
  ] = await Promise.all([
    import(join(PROJECT_ROOT, 'src', 'core', 'campaign-report.js')),
    import(join(PROJECT_ROOT, 'src', 'core', 'strategy-catalog.js')),
    readJson(values.us),
    readJson(values.jp),
    readJson(values['catalog-path']),
    readJson(values['us-campaign-path']),
    readJson(values['jp-campaign-path']),
    readJson(values['us-universe-path']),
    readJson(values['jp-universe-path']),
  ]);

  const usSummary = summarizeMarketCampaign({
    runs: usRuns,
    market: 'US',
    topLimit: Number.MAX_SAFE_INTEGER,
  });
  const jpSummary = summarizeMarketCampaign({
    runs: jpRuns,
    market: 'JP',
    topLimit: Number.MAX_SAFE_INTEGER,
  });
  const combinedRanking = buildCombinedStrategyRanking([usSummary, jpSummary], {
    topLimit: Number.MAX_SAFE_INTEGER,
  });

  const sourcePaths = {
    us: values.us,
    jp: values.jp,
  };
  const strategyContent = buildStrategyIndex(catalog, combinedRanking, sourcePaths);
  const symbolContent = buildSymbolIndex({
    usUniverse,
    jpUniverse,
    usCampaign,
    jpCampaign,
    usSummary,
    jpSummary,
    sourcePaths,
  });

  await mkdir(dirname(values['strategy-out']), { recursive: true });
  await mkdir(dirname(values['symbol-out']), { recursive: true });
  await writeFile(values['strategy-out'], strategyContent);
  await writeFile(values['symbol-out'], symbolContent);
  process.stdout.write(`Wrote strategy reference: ${values['strategy-out']}\n`);
  process.stdout.write(`Wrote symbol reference: ${values['symbol-out']}\n`);
}

main().catch((error) => {
  process.stderr.write(`Fatal: ${error.message}\n`);
  process.exit(1);
});
