#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildPortfolioReport,
  loadPortfolioDataFromCaptureDir,
} from '../sbi/build-portfolio-report.mjs';
import {
  buildPortfolioDiagnosticsReport,
  sanitizePortfolioDiagnosticsResult,
} from '../moomoo/run-portfolio-diagnostics.mjs';

const DEFAULT_CAPTURE_DIR = 'docs/reports/screener/portfolio/capture/latest';
const DEFAULT_MOOMOO_JSON_PATH = 'docs/reports/screener/portfolio/moomoo_portfolio_diagnostics.json';
const DEFAULT_OUTPUT_PATH = 'docs/reports/screener/portfolio/portfolio_health_check_report.md';

function printHelp() {
  console.log(`Usage: node scripts/portfolio/build-unified-portfolio-report.mjs [options]

Build a single Markdown report that combines SBI and moomoo portfolio outputs.

Options:
  --capture-dir <path>  SBI capture output directory
  --moomoo-json <path>  moomoo diagnostics JSON path
  --output <path>       Output markdown path
  --help                Show this help
`);
}

function parseArgs(argv) {
  const options = {
    captureDir: DEFAULT_CAPTURE_DIR,
    moomooJson: DEFAULT_MOOMOO_JSON_PATH,
    output: DEFAULT_OUTPUT_PATH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') {
      options.help = true;
      continue;
    }
    if (!arg.startsWith('--')) {
      throw new Error(`Unexpected argument: ${arg}`);
    }
    const key = arg.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${arg}`);
    }
    options[key] = value;
    index += 1;
  }

  return options;
}

function formatNumber(value, digits = 0, locale = 'ja-JP') {
  if (!Number.isFinite(value)) return 'n/a';
  return Number(value).toLocaleString(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatCurrency(value, currency = 'JPY', digits = 0) {
  if (!Number.isFinite(value)) return 'n/a';
  return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'ja-JP', {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatSignedCurrency(value, currency = 'JPY', digits = 0) {
  if (!Number.isFinite(value)) return 'n/a';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${formatCurrency(value, currency, digits)}`;
}

function renderTable(headers, rows) {
  const safeRows = rows.length > 0 ? rows : [headers.map(() => 'n/a')];
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...safeRows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function formatSbiCash(assetsSummary) {
  const cashJpy = assetsSummary.products.find((row) => row.product === '預り金(円)')?.marketValueJpy ?? null;
  const cashUsdJpy = assetsSummary.products.find((row) => row.product === '預り金(米ドル)')?.marketValueJpy ?? null;
  return [
    Number.isFinite(cashJpy) ? `円 ${formatCurrency(cashJpy, 'JPY', 0)}` : null,
    Number.isFinite(cashUsdJpy) ? `米ドル預り金(円換算) ${formatCurrency(cashUsdJpy, 'JPY', 0)}` : null,
  ].filter(Boolean).join(' / ') || 'n/a';
}

function createHoldingRow({
  type,
  label,
  symbol,
  sbiQuantity = null,
  moomooQuantity = null,
  sbiValueJpy = null,
  moomooValue = null,
  moomooCurrency = 'USD',
}) {
  const totalQuantity = [sbiQuantity, moomooQuantity]
    .filter(Number.isFinite)
    .reduce((sum, value) => sum + value, 0);
  return {
    type,
    label,
    symbol,
    totalQuantity: Number.isFinite(totalQuantity) ? totalQuantity : null,
    sbiQuantity,
    moomooQuantity,
    sbiValueJpy,
    moomooValue,
    moomooCurrency,
  };
}

function buildCombinedHoldings(sbiData, moomooPayload) {
  const holdings = new Map();
  const mergeNumber = (left, right) => {
    if (Number.isFinite(left) && Number.isFinite(right)) return left + right;
    if (Number.isFinite(left)) return left;
    if (Number.isFinite(right)) return right;
    return null;
  };
  const upsert = (key, next) => {
    const current = holdings.get(key);
    holdings.set(key, current ? {
      ...current,
      totalQuantity: mergeNumber(current.totalQuantity, next.totalQuantity),
      sbiQuantity: mergeNumber(current.sbiQuantity, next.sbiQuantity),
      moomooQuantity: mergeNumber(current.moomooQuantity, next.moomooQuantity),
      sbiValueJpy: mergeNumber(current.sbiValueJpy, next.sbiValueJpy),
      moomooValue: mergeNumber(current.moomooValue, next.moomooValue),
      moomooCurrency: next.moomooCurrency ?? current.moomooCurrency,
    } : next);
  };

  for (const row of sbiData.usStocks) {
    const key = `stock:${row.ticker || row.name}`;
    upsert(key, createHoldingRow({
      type: '米国株',
      label: row.name || row.ticker || 'n/a',
      symbol: row.ticker || 'n/a',
      sbiQuantity: row.quantity,
      sbiValueJpy: row.marketValueJpy,
    }));
  }

  for (const row of sbiData.funds) {
    const key = `fund:${row.name}`;
    upsert(key, createHoldingRow({
      type: '投資信託',
      label: row.name || 'n/a',
      symbol: '-',
      sbiQuantity: row.quantity,
      sbiValueJpy: row.marketValueJpy,
    }));
  }

  const moomooCurrency = moomooPayload.currency || 'USD';
  for (const account of moomooPayload.accounts || []) {
    for (const position of account.positions || []) {
      const key = `stock:${position.symbol || position.name}`;
      upsert(key, createHoldingRow({
        type: '米国株',
        label: position.name || position.symbol || 'n/a',
        symbol: position.symbol || 'n/a',
        moomooQuantity: Number(position.qty),
        moomooValue: Number(position.marketValue),
        moomooCurrency,
      }));
    }
  }

  return [...holdings.values()]
    .sort((left, right) => left.label.localeCompare(right.label, 'ja'))
    .map((row) => [
      row.type,
      row.label,
      row.symbol || '-',
      Number.isFinite(row.totalQuantity) ? formatNumber(row.totalQuantity, 2, 'en-US') : 'n/a',
      Number.isFinite(row.sbiQuantity) ? formatNumber(row.sbiQuantity, 2, 'en-US') : '-',
      Number.isFinite(row.moomooQuantity) ? formatNumber(row.moomooQuantity, 2, 'en-US') : '-',
      [
        Number.isFinite(row.sbiValueJpy) ? `SBI ${formatCurrency(row.sbiValueJpy, 'JPY', 0)}` : null,
        Number.isFinite(row.moomooValue) ? `moomoo ${formatCurrency(row.moomooValue, row.moomooCurrency, 2)}` : null,
      ].filter(Boolean).join(' / ') || 'n/a',
    ]);
}

function buildExecutiveSummary(sbiData, moomooPayload) {
  const sbiAssets = sbiData.assetsSummary;
  const moomooTotals = moomooPayload.totals || {};
  return renderTable(
    ['項目', 'SBI', 'moomoo', 'メモ'],
    [
      [
        '口座数',
        '1',
        formatNumber(moomooTotals.accountCount, 0, 'en-US'),
        'SBI は単一口座レポートとして扱う',
      ],
      [
        '保有明細数',
        String(sbiData.usStocks.length + sbiData.funds.length),
        formatNumber(moomooTotals.positionCount, 0, 'en-US'),
        'SBI は米国株 + 投資信託、moomoo は position 数',
      ],
      [
        '総資産',
        formatCurrency(sbiAssets.totalAssetsJpy, 'JPY', 0),
        formatCurrency(Number(moomooTotals.totalAssets), moomooPayload.currency || 'USD', 2),
        '通貨が異なるため単純合算はしていません',
      ],
      [
        '現金',
        formatSbiCash(sbiAssets),
        formatCurrency(Number(moomooTotals.cash), moomooPayload.currency || 'USD', 2),
        'SBI は円預り金 + 米ドル預り金(円換算)',
      ],
      [
        '評価額',
        formatCurrency(
          sbiData.usStocks.reduce((sum, row) => sum + (row.marketValueJpy || 0), 0)
            + sbiData.funds.reduce((sum, row) => sum + (row.marketValueJpy || 0), 0),
          'JPY',
          0,
        ),
        formatCurrency(Number(moomooTotals.marketValue), moomooPayload.currency || 'USD', 2),
        '保有ポジション分のみ',
      ],
      [
        '評価損益',
        formatSignedCurrency(sbiAssets.totalUnrealizedPlJpy, 'JPY', 0),
        formatSignedCurrency(Number(moomooTotals.unrealizedPl), moomooPayload.currency || 'USD', 2),
        'SBI は資産サマリー、moomoo は diagnostics totals',
      ],
    ],
  );
}

function demoteReport(markdown, heading) {
  const lines = String(markdown || '').trim().split('\n');
  return lines.map((line, index) => {
    if (index === 0 && /^#\s/.test(line)) return `## ${heading}`;
    const match = line.match(/^(#{1,5})\s(.*)$/);
    if (!match) return line;
    return `${match[1]}# ${match[2]}`;
  }).join('\n');
}

export function buildUnifiedPortfolioReport({ sbiData, moomooPayload, generatedAt, workflow }) {
  const sanitizedMoomoo = sanitizePortfolioDiagnosticsResult(moomooPayload);
  const sbiReport = buildPortfolioReport(sbiData);
  const moomooReport = buildPortfolioDiagnosticsReport(sanitizedMoomoo, {
    generatedAt,
    workflowRunId: workflow?.runId,
    workflowRunAttempt: workflow?.runAttempt,
    refName: workflow?.refName,
  });

  const lines = [
    '# Portfolio Health Check Report',
    '',
    `- Generated at: ${generatedAt}`,
    `- SBI取得日時: ${sbiData.assetsSummary.asOf || 'n/a'}`,
    `- moomoo取得日時: ${sanitizedMoomoo.retrieved_at || 'n/a'}`,
    '',
    '## 総合サマリー',
    '',
    buildExecutiveSummary(sbiData, sanitizedMoomoo),
    '',
    '## 総合保有一覧',
    '',
    'SBI と moomoo の保有を 1 つの表で見られるようにし、同一シンボルは 1 行に寄せています。',
    '',
    renderTable(
      ['区分', '資産', 'シンボル', '合計数量', 'SBI数量', 'moomoo数量', '評価額'],
      buildCombinedHoldings(sbiData, sanitizedMoomoo),
    ),
    '',
    demoteReport(sbiReport, 'SBI 詳細'),
    '',
    demoteReport(moomooReport, 'moomoo 詳細'),
    '',
  ];

  return `${lines.join('\n').trim()}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const captureDir = resolve(options.captureDir);
  const moomooJsonPath = resolve(options.moomooJson);
  const outputPath = resolve(options.output);

  const [{ data: sbiData }, moomooPayload] = await Promise.all([
    loadPortfolioDataFromCaptureDir(captureDir),
    readFile(moomooJsonPath, 'utf8').then((value) => JSON.parse(value)),
  ]);

  const generatedAt = new Date().toISOString();
  const report = buildUnifiedPortfolioReport({
    sbiData,
    moomooPayload,
    generatedAt,
    workflow: moomooPayload.workflow,
  });

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, report, 'utf8');

  console.log(JSON.stringify({
    success: true,
    outputPath,
    captureDir,
    moomooJsonPath,
    generatedAt,
  }));
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (entryPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error?.stack || error?.message || String(error));
    process.exitCode = 1;
  });
}
