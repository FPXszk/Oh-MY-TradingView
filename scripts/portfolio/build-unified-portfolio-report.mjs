#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  loadPortfolioDataFromCaptureDir,
} from '../sbi/build-portfolio-report.mjs';
import {
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
  --skip-sbi            Build a moomoo-only report without SBI capture inputs
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
    if (arg === '--skip-sbi') {
      options.skipSbi = true;
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

function formatSignedPct(value, digits = 2) {
  if (!Number.isFinite(value)) return 'n/a';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(digits)}%`;
}

function renderTable(headers, rows) {
  const safeRows = rows.length > 0 ? rows : [headers.map(() => 'n/a')];
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...safeRows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function estimateUsdJpyRate(usStocks) {
  for (const row of usStocks) {
    const jpy = Number(row.marketValueJpy);
    const usd = Number(row.marketValueUsd);
    if (Number.isFinite(jpy) && jpy > 0 && Number.isFinite(usd) && usd > 0) {
      return jpy / usd;
    }
  }
  return null;
}

function buildUnifiedPositionList(sbiData, moomooPayload, moomooCurrency) {
  const positions = [];

  for (const row of sbiData.usStocks) {
    const plJpy = Number.isFinite(row.unrealizedPlJpy) ? row.unrealizedPlJpy : null;
    const mvJpy = Number.isFinite(row.marketValueJpy) ? row.marketValueJpy : null;
    const costJpy = (plJpy !== null && mvJpy !== null) ? mvJpy - plJpy : null;
    const plRateRaw = (costJpy !== null && costJpy !== 0) ? (plJpy / costJpy * 100) : null;
    positions.push({
      ticker: row.ticker || '-',
      name: row.name || 'n/a',
      account: `SBI/${row.accountType || 'n/a'}`,
      qty: Number.isFinite(row.quantity) ? formatNumber(row.quantity, 0, 'en-US') : 'n/a',
      pl: plJpy !== null ? formatSignedCurrency(plJpy, 'JPY', 0) : 'n/a',
      plRate: formatSignedPct(plRateRaw),
      _category: /\betf\b/i.test(row.name || '') ? 1 : 2,
      _plSortKey: plJpy,
      _plRateRaw: plRateRaw,
    });
  }

  for (const row of sbiData.funds) {
    const mvJpy = Number.isFinite(row.marketValueJpy) ? row.marketValueJpy : null;
    let plJpy = Number.isFinite(row.unrealizedPlJpy) ? row.unrealizedPlJpy : null;
    let costJpy = null;

    if (plJpy !== null && mvJpy !== null) {
      costJpy = mvJpy - plJpy;
    } else if (Number.isFinite(row.averageCost) && Number.isFinite(row.quantity) && mvJpy !== null) {
      // Compute from averageCost (yen per 10,000 units) and quantity
      costJpy = row.averageCost * row.quantity / 10000;
      plJpy = mvJpy - costJpy;
    }

    const plRateRaw = (costJpy !== null && costJpy !== 0) ? (plJpy / costJpy * 100) : null;
    positions.push({
      ticker: '-',
      name: row.name || 'n/a',
      account: `SBI/${row.accountType || 'n/a'}`,
      qty: Number.isFinite(row.quantity) ? formatNumber(row.quantity, 0, 'en-US') : 'n/a',
      pl: plJpy !== null ? formatSignedCurrency(plJpy, 'JPY', 0) : 'n/a',
      plRate: formatSignedPct(plRateRaw),
      _category: 0,
      _plSortKey: plJpy,
      _plRateRaw: plRateRaw,
    });
  }

  for (const account of moomooPayload.accounts || []) {
    for (const pos of account.positions || []) {
      const unrealizedPl = Number(pos.unrealizedPl);
      const marketValue = Number(pos.marketValue);
      const plRateRaw = Number.isFinite(pos.plRatioPct)
        ? pos.plRatioPct
        : (Number.isFinite(unrealizedPl) && Number.isFinite(marketValue) && marketValue !== unrealizedPl
          ? (unrealizedPl / (marketValue - unrealizedPl) * 100)
          : null);
      const qty = pos.qty ?? pos.quantity ?? null;
      positions.push({
        ticker: pos.symbol || 'n/a',
        name: pos.name || 'n/a',
        account: 'moomoo',
        qty: qty != null && qty !== '' ? String(Number(qty)) : 'n/a',
        pl: Number.isFinite(unrealizedPl) ? formatSignedCurrency(unrealizedPl, moomooCurrency, 2) : 'n/a',
        plRate: formatSignedPct(plRateRaw),
        _category: /\betf\b/i.test(pos.name || '') ? 1 : 2,
        _plSortKey: Number.isFinite(unrealizedPl) ? unrealizedPl : null,
        _plRateRaw: plRateRaw,
      });
    }
  }

  return positions;
}

function buildRealizedAndDividendSection(sbiData) {
  const lines = ['## 💰 実現損益 & 配当', ''];

  if (sbiData.realizedSummary.length > 0) {
    lines.push('### 実現損益サマリー', '');
    lines.push(renderTable(
      ['商品', '実現損益(税引前・円)', '利益合計(円)', '損失合計(円)'],
      sbiData.realizedSummary.map((row) => [
        row.product || 'n/a',
        formatSignedCurrency(row.realizedPlJpy, 'JPY', 0),
        formatCurrency(row.gainJpy, 'JPY', 0),
        formatSignedCurrency(row.lossJpy, 'JPY', 0),
      ]),
    ));
    lines.push('');
  } else {
    lines.push('当期実現損益なし', '');
  }

  const hasDividendSummary = (sbiData.distributionSummary || []).length > 0;

  if (hasDividendSummary) {
    lines.push('### 配当・分配金サマリー', '');
    lines.push(renderTable(
      ['商品', '受取額(税引後・円)', '受取額(税引後・USD)'],
      sbiData.distributionSummary.map((row) => [
        row.product || 'n/a',
        formatCurrency(row.amountJpy, 'JPY', 0),
        Number.isFinite(row.amountUsd) ? formatCurrency(row.amountUsd, 'USD', 2) : 'n/a',
      ]),
    ));
    lines.push('');
  } else {
    lines.push('配当受取なし', '');
  }

  return lines;
}

function buildMoomooOnlyReport({ moomooPayload, generatedAt, workflow }) {
  const sanitizedMoomoo = sanitizePortfolioDiagnosticsResult(moomooPayload);
  const moomooTotals = sanitizedMoomoo.totals || {};
  const moomooCurrency = sanitizedMoomoo.currency || 'USD';
  const moomooTime = sanitizedMoomoo.retrieved_at || 'n/a';
  const moomooPl = Number(moomooTotals.unrealizedPl);
  const moomooCashRatioText = Number.isFinite(Number(moomooTotals.cashRatioPct))
    ? `${Number(moomooTotals.cashRatioPct).toFixed(0)}%`
    : 'n/a';
  const positions = buildUnifiedPositionList({
    usStocks: [],
    funds: [],
  }, sanitizedMoomoo, moomooCurrency);

  positions.sort((a, b) => {
    if (a._category !== b._category) return a._category - b._category;
    return (b._plSortKey || 0) - (a._plSortKey || 0);
  });

  const alertList = positions.filter((pos) => Number.isFinite(pos._plRateRaw) && pos._plRateRaw < -20);
  const lines = [
    `# Portfolio Health Check — ${generatedAt.slice(0, 10)}`,
    '- SBI取得: skipped (disabled)',
    `- moomoo取得: ${moomooTime}`,
    '',
    '## 🚦 ヘルスサマリー',
    '',
    `SBI取得は無効。moomoo全ポジション含み${moomooPl >= 0 ? '益' : '損'} ${formatSignedCurrency(moomooPl, moomooCurrency, 2)}、現金比率${moomooCashRatioText}。`,
    '',
    '## 📊 資産スナップショット',
    '',
    renderTable(
      ['口座', '総資産', '評価損益', '現金比率', '取得時刻'],
      [[
        'moomoo',
        formatCurrency(Number(moomooTotals.totalAssets), moomooCurrency, 2),
        formatSignedCurrency(Number(moomooTotals.unrealizedPl), moomooCurrency, 2),
        Number.isFinite(Number(moomooTotals.cashRatioPct)) ? `${Number(moomooTotals.cashRatioPct).toFixed(1)}%` : 'n/a',
        moomooTime,
      ]],
    ),
    '',
    '## 📋 ポジション一覧（統合）',
    '',
    renderTable(
      ['ティッカー', '銘柄', '口座', '数量', '評価損益', '損益率'],
      positions.map((pos) => [pos.ticker, pos.name, pos.account, pos.qty, pos.pl, pos.plRate]),
    ),
    '',
    '## 💰 実現損益 & 配当',
    '',
    'SBI取得は無効のためスキップ',
    '',
  ];

  if (alertList.length > 0) {
    lines.push('## ⚠️ アラート', '');
    lines.push('含み損率 -20% 超のポジション:', '');
    for (const pos of alertList) {
      lines.push(`- ${pos.ticker}（${pos.name} / ${pos.account}）: ${pos.pl} / ${pos.plRate}`);
    }
    lines.push('');
  }

  lines.push(...buildMetaSection(sanitizedMoomoo.workflow || moomooPayload.workflow || workflow));
  return `${lines.join('\n').trim()}\n`;
}

function buildMetaSection(workflow) {
  if (!workflow) return [];
  const lines = ['## 🔧 取得メタ情報', ''];
  if (workflow.runId) lines.push(`- run_id: ${workflow.runId}`);
  if (workflow.runAttempt) lines.push(`- run_attempt: ${workflow.runAttempt}`);
  if (workflow.refName) lines.push(`- ref_name: ${workflow.refName}`);
  if (workflow.runNumber) lines.push(`- run_number: ${workflow.runNumber}`);
  if (workflow.sha) lines.push(`- sha: ${workflow.sha}`);
  lines.push('');
  return lines;
}

export function buildUnifiedPortfolioReport({ sbiData, moomooPayload, generatedAt, workflow }) {
  if (!sbiData) {
    return buildMoomooOnlyReport({ moomooPayload, generatedAt, workflow });
  }

  const sanitizedMoomoo = sanitizePortfolioDiagnosticsResult(moomooPayload);
  const moomooTotals = sanitizedMoomoo.totals || {};
  const moomooCurrency = sanitizedMoomoo.currency || 'USD';
  const sbiAssets = sbiData.assetsSummary;

  // Section 1: Header
  const dateStr = generatedAt.slice(0, 10);
  const sbiTime = sbiAssets.asOf || 'n/a';
  const moomooTime = sanitizedMoomoo.retrieved_at || 'n/a';

  // Section 2: Health summary
  const cashJpy = sbiAssets.products.find((row) => row.product === '預り金(円)')?.marketValueJpy ?? null;
  const cashUsdJpy = sbiAssets.products.find((row) => row.product === '預り金(米ドル)')?.marketValueJpy ?? null;
  const sbiTotalCashJpy = (Number.isFinite(cashJpy) ? cashJpy : 0) + (Number.isFinite(cashUsdJpy) ? cashUsdJpy : 0);
  const sbiCashRatioPct = Number.isFinite(sbiAssets.totalAssetsJpy) && sbiAssets.totalAssetsJpy > 0
    ? (sbiTotalCashJpy / sbiAssets.totalAssetsJpy * 100)
    : null;

  const leadingStock = [...sbiData.usStocks]
    .filter((row) => Number.isFinite(row.unrealizedPlJpy))
    .sort((a, b) => (b.unrealizedPlJpy || 0) - (a.unrealizedPlJpy || 0))[0];
  const leadingTicker = leadingStock?.ticker || null;

  const moomooPl = Number(moomooTotals.unrealizedPl);
  const moomooCashRatioText = Number.isFinite(Number(moomooTotals.cashRatioPct))
    ? `${Number(moomooTotals.cashRatioPct).toFixed(0)}%`
    : 'n/a';

  let healthText = `SBI評価損益 ${formatSignedCurrency(sbiAssets.totalUnrealizedPlJpy, 'JPY', 0)}`;
  if (Number.isFinite(sbiAssets.totalUnrealizedPlPct)) {
    healthText += ` (${formatSignedPct(sbiAssets.totalUnrealizedPlPct)})`;
  }
  healthText += '。';
  if (leadingTicker) healthText += `${leadingTicker}が主要牽引。`;
  healthText += `moomoo全ポジション含み${moomooPl >= 0 ? '益' : '損'} ${formatSignedCurrency(moomooPl, moomooCurrency, 2)}、現金比率${moomooCashRatioText}。`;

  // Section 3: Asset snapshot
  const usdJpyRate = estimateUsdJpyRate(sbiData.usStocks);
  const rateNote = Number.isFinite(usdJpyRate)
    ? `※ 推定 USD/JPY レート: ${usdJpyRate.toFixed(2)}`
    : '※ USD/JPY レート不明';

  // Section 4: Unified position list (投資信託 → ETF → 個別株, P/L descending within each)
  const positions = buildUnifiedPositionList(sbiData, sanitizedMoomoo, moomooCurrency);
  positions.sort((a, b) => {
    if (a._category !== b._category) return a._category - b._category;
    return (b._plSortKey || 0) - (a._plSortKey || 0);
  });

  // Section 6: Alerts
  const alertList = positions.filter((pos) => Number.isFinite(pos._plRateRaw) && pos._plRateRaw < -20);

  const lines = [
    `# Portfolio Health Check — ${dateStr}`,
    `- SBI取得: ${sbiTime}`,
    `- moomoo取得: ${moomooTime}`,
    '',
    '## 🚦 ヘルスサマリー',
    '',
    healthText,
    '',
    '## 📊 資産スナップショット',
    '',
    renderTable(
      ['口座', '総資産', '評価損益', '現金比率', '取得時刻'],
      [
        [
          'SBI',
          formatCurrency(sbiAssets.totalAssetsJpy, 'JPY', 0),
          formatSignedCurrency(sbiAssets.totalUnrealizedPlJpy, 'JPY', 0),
          Number.isFinite(sbiCashRatioPct) ? `${sbiCashRatioPct.toFixed(1)}%` : 'n/a',
          sbiTime,
        ],
        [
          'moomoo',
          formatCurrency(Number(moomooTotals.totalAssets), moomooCurrency, 2),
          formatSignedCurrency(Number(moomooTotals.unrealizedPl), moomooCurrency, 2),
          Number.isFinite(Number(moomooTotals.cashRatioPct)) ? `${Number(moomooTotals.cashRatioPct).toFixed(1)}%` : 'n/a',
          moomooTime,
        ],
      ],
    ),
    '',
    rateNote,
    '',
    '## 📋 ポジション一覧（統合）',
    '',
    renderTable(
      ['ティッカー', '銘柄', '口座', '数量', '評価損益', '損益率'],
      positions.map((pos) => [pos.ticker, pos.name, pos.account, pos.qty, pos.pl, pos.plRate]),
    ),
    '',
    ...buildRealizedAndDividendSection(sbiData),
  ];

  if (alertList.length > 0) {
    lines.push('## ⚠️ アラート', '');
    lines.push('含み損率 -20% 超のポジション:', '');
    for (const pos of alertList) {
      lines.push(`- ${pos.ticker}（${pos.name} / ${pos.account}）: ${pos.pl} / ${pos.plRate}`);
    }
    lines.push('');
  }

  lines.push(...buildMetaSection(sanitizedMoomoo.workflow || moomooPayload.workflow || workflow));

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

  const moomooPayload = await readFile(moomooJsonPath, 'utf8').then((value) => JSON.parse(value));
  const sbiData = options.skipSbi
    ? null
    : await loadPortfolioDataFromCaptureDir(captureDir).then((result) => result.data);

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
