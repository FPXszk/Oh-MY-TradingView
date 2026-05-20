#!/usr/bin/env node

import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_DOWNLOADS_DIR = '/mnt/c/Users/szk/Downloads';
const DEFAULT_OUTPUT_DIR = '/mnt/c/Users/szk/Documents/レポート/スクリーンワー/portfolio_new';
const DEFAULT_OUTPUT_NAME = 'sbi_portfolio_report.md';

function printHelp() {
  console.log(`Usage: node scripts/sbi/build-portfolio-report.mjs [options]

Build a read-only SBI portfolio markdown report from downloaded CSV files.

Options:
  --downloads-dir <path>     Directory to scan for the latest SBI CSV files
  --capture-dir <path>       Capture output directory produced by sbi:portfolio-capture
  --output <path>            Output markdown path
  --assets-summary <path>    Override assets summary CSV path
  --us-stocks <path>         Override US stocks portfolio CSV path
  --fund-portfolio <path>    Override fund portfolio CSV path
  --realized-all <path>      Override realized P/L summary CSV path
  --realized-domestic <path> Override domestic realized P/L CSV path
  --realized-foreign <path>  Override foreign realized P/L CSV path
  --realized-fund <path>     Override fund realized P/L CSV path
  --history-domestic <path>  Override domestic/fund trade history CSV path
  --history-foreign <path>   Override foreign trade history CSV path
  --distribution-history <path> Override dividend/distribution history CSV path
  --help                     Show this help
`);
}

function parseArgs(argv) {
  const options = {
    downloadsDir: DEFAULT_DOWNLOADS_DIR,
    output: join(DEFAULT_OUTPUT_DIR, DEFAULT_OUTPUT_NAME),
    captureDir: null,
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

function cleanCell(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  const source = text.replace(/^\uFEFF/, '');
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cleanCell(cell));
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      row.push(cleanCell(cell));
      cell = '';
      if (row.some((value) => value !== '')) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    cell += char;
  }

  if (cell !== '' || row.length > 0) {
    row.push(cleanCell(cell));
    if (row.some((value) => value !== '')) {
      rows.push(row);
    }
  }

  return rows;
}

function parseNumber(value) {
  const text = cleanCell(value);
  if (!text || text === '--' || text === '----/--/--') return null;
  const normalized = text
    .replace(/,/g, '')
    .replace(/％/g, '%')
    .replace(/口$/u, '')
    .replace(/[^0-9.+\-%]/gu, '');
  const number = Number(normalized.replace(/%$/, ''));
  return Number.isFinite(number) ? number : null;
}

function createEmptyAssetsSummary() {
  return {
    asOf: '',
    totalAssetsJpy: null,
    totalDayChangeJpy: null,
    totalUnrealizedPlJpy: null,
    totalUnrealizedPlPct: null,
    products: [],
  };
}

function formatInteger(value) {
  if (!Number.isFinite(value)) return 'n/a';
  return Math.round(value).toLocaleString('ja-JP');
}

function formatCurrency(value, currency = 'JPY', digits = 0) {
  if (!Number.isFinite(value)) return 'n/a';
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatSignedYen(value) {
  if (!Number.isFinite(value)) return 'n/a';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${formatCurrency(value, 'JPY', 0)}`;
}

function formatSignedUsd(value) {
  if (!Number.isFinite(value)) return 'n/a';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${formatCurrency(value, 'USD', 2)}`;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return 'n/a';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
}

function toIsoDate(input) {
  const text = cleanCell(input);
  if (!text) return '';
  let match = text.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  match = text.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  match = text.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    return `20${year}-${month}-${day}`;
  }
  return text;
}

function getLatestMatch(entries, matcher) {
  const matched = entries
    .filter((entry) => matcher(entry.name))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
  return matched[0] ? resolve(matched[0].path) : null;
}

async function discoverInputPaths(downloadsDir) {
  const names = await readdir(downloadsDir);
  const stats = await Promise.all(
    names.map(async (name) => {
      const path = join(downloadsDir, name);
      const details = await stat(path);
      return { name, path, mtimeMs: details.mtimeMs, isFile: details.isFile() };
    }),
  );
  const files = stats.filter((entry) => entry.isFile);

  return {
    assetsSummary: getLatestMatch(files, (name) => /^sbi_assets_summary\.csv$/i.test(name)),
    usStocks: getLatestMatch(files, (name) => /^sbi_us_stocks\.csv$/i.test(name)),
    fundPortfolio: getLatestMatch(files, (name) => /^SaveFile\.csv$/i.test(name)),
    realizedAll: getLatestMatch(files, (name) => /^ALLTYPE_.*\.csv$/i.test(name)),
    realizedDomestic: getLatestMatch(files, (name) => /^DOMESTIC_STOCK_.*\.csv$/i.test(name)),
    realizedForeign: getLatestMatch(files, (name) => /^FOREIGN_STOCK_.*\.csv$/i.test(name)),
    realizedFund: getLatestMatch(files, (name) => /^FUND_.*\.csv$/i.test(name)),
    historyDomestic: getLatestMatch(files, (name) => /^SaveFile_.*\.csv$/i.test(name)),
    historyForeign: getLatestMatch(files, (name) => /^yakujo.*\.csv$/i.test(name)),
    distributionHistory: getLatestMatch(files, (name) => /^DISTRIBUTION_.*\.csv$/i.test(name)),
  };
}

function detectSbiCsvKind(text) {
  const normalized = text.replace(/^\uFEFF/, '');
  const rows = parseCsv(normalized);
  if (rows.some((row) => cleanCell(row[0]) === '取得日時') && /総資産残高/.test(normalized)) return 'assetsSummary';
  if (rows.some((row) => cleanCell(row[0]) === '口座種別' && cleanCell(row[1]) === '銘柄名' && cleanCell(row[2]) === 'ティッカー')) return 'usStocks';
  if (/投資信託（金額\//.test(normalized) || /保有証券一覧/.test(normalized)) return 'fundPortfolio';
  if (rows.some((row) => cleanCell(row[0]) === '商品' && cleanCell(row[1]) === '実現損益(税引前・円)')) return 'realizedAll';
  if (rows.some((row) => cleanCell(row[0]) === '約定日' && ['口座', '国', 'ファンド名'].includes(cleanCell(row[1])))) {
    if (rows.some((row) => cleanCell(row[1]) === 'ファンド名')) return 'realizedFund';
    if (rows.some((row) => cleanCell(row[1]) === '国')) return 'realizedForeign';
    return 'realizedDomestic';
  }
  if (rows.some((row) => cleanCell(row[0]) === '約定日' && cleanCell(row[1]) === '銘柄' && cleanCell(row[2]) === '銘柄コード')) return 'historyDomestic';
  if (rows.some((row) => cleanCell(row[0]) === '国内約定日' && cleanCell(row[1]) === '通貨' && cleanCell(row[2]) === '銘柄名')) return 'historyForeign';
  if (rows.some((row) => cleanCell(row[0]) === '商品' && cleanCell(row[1]) === '受取額(税引後・円)')) return 'distributionHistory';
  return null;
}

async function discoverCaptureInputPaths(captureDir) {
  const names = await readdir(captureDir).catch(() => []);
  const downloadDir = join(captureDir, 'downloads');
  const downloadNames = await readdir(downloadDir).catch(() => []);
  const inputs = {
    assetsSummary: null,
    usStocks: null,
    fundPortfolio: null,
    realizedAll: null,
    realizedDomestic: null,
    realizedForeign: null,
    realizedFund: null,
    historyDomestic: null,
    historyForeign: null,
    distributionHistory: null,
    otherDownloads: [],
    accountAssetsPage: names.includes('account-assets-page.json') ? join(captureDir, 'account-assets-page.json') : null,
    everyAssetPage: names.includes('every-asset-page.json') ? join(captureDir, 'every-asset-page.json') : null,
    currentPage: names.includes('current-page.json') ? join(captureDir, 'current-page.json') : null,
    usStocksPage: names.includes('us-stocks-page.json') ? join(captureDir, 'us-stocks-page.json') : null,
    foreignTopPage: names.includes('foreign-top-page.json') ? join(captureDir, 'foreign-top-page.json') : null,
    foreignHoldingsPage: names.includes('foreign-holdings-page.json') ? join(captureDir, 'foreign-holdings-page.json') : null,
  };

  for (const name of downloadNames) {
    const path = join(downloadDir, name);
    const details = await stat(path).catch(() => null);
    if (!details?.isFile()) continue;
    const text = decodeCsvBuffer(await readFile(path));
    const kind = detectSbiCsvKind(text);
    if (kind && !inputs[kind]) {
      inputs[kind] = path;
      continue;
    }
    inputs.otherDownloads.push(path);
  }

  return inputs;
}

function mapRows(rows, headerIndex) {
  const header = rows[headerIndex];
  const data = [];
  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    if (row.length === 0 || row.every((value) => cleanCell(value) === '')) continue;
    if (row[0] === '合計' || row[0] === '総合計') break;
    const entry = {};
    for (let column = 0; column < header.length; column += 1) {
      entry[header[column]] = cleanCell(row[column]);
    }
    data.push(entry);
  }
  return data;
}

function buildProductsFromAssetRows(rows) {
  return rows
    .map((row) => {
      const product = cleanCell(row[0]);
      const marketValueJpy = parseNumber(row[1]);
      if (!product || !Number.isFinite(marketValueJpy)) return null;
      return {
        product,
        marketValueJpy,
        unrealizedPlJpy: parseNumber(row[2]),
        unrealizedPlPct: parseNumber(row[3]),
        dayChangeJpy: parseNumber(row[4]),
        monthChangePct: parseNumber(row[5]),
      };
    })
    .filter(Boolean);
}

export function parseAssetsSummaryCsv(text) {
  const rows = parseCsv(text);
  const timestampRow = rows.find((row) => row[0] === '取得日時');
  const summaryHeaderIndex = rows.findIndex((row) => row[0] === '商品' && row[1] === '評価額(円)');
  const products = mapRows(rows, summaryHeaderIndex).map((row) => ({
    product: row['商品'],
    marketValueJpy: parseNumber(row['評価額(円)']),
    unrealizedPlJpy: parseNumber(row['評価損益(円)']),
    unrealizedPlPct: parseNumber(row['評価損益率(%)']),
    dayChangeJpy: parseNumber(row['前日比(円)']),
    monthChangePct: parseNumber(row['前月比率(%)']),
  }));

  const summaryMap = new Map(rows
    .filter((row) => row.length >= 2)
    .map((row) => [row[0], row[1]]));

  return {
    asOf: timestampRow?.[1] || '',
    totalAssetsJpy: parseNumber(summaryMap.get('総資産残高')),
    totalDayChangeJpy: parseNumber(summaryMap.get('前日比')),
    totalUnrealizedPlJpy: parseNumber(summaryMap.get('評価損益')),
    totalUnrealizedPlPct: parseNumber(summaryMap.get('評価損益率(%)')),
    products,
  };
}

export function parseAssetsSummarySnapshot(snapshot) {
  const result = createEmptyAssetsSummary();
  const rows = snapshot?.tables?.flatMap((table) => table.rows || []) || [];
  const metrics = new Map();

  for (const row of rows) {
    if (row.length < 2) continue;
    for (let index = 0; index < row.length - 1; index += 1) {
      const label = cleanCell(row[index]);
      const next = cleanCell(row[index + 1]);
      if (label && next) {
        metrics.set(label, next);
      }
    }
  }

  result.totalAssetsJpy = parseNumber(
    metrics.get('総資産') ||
    metrics.get('総資産残高') ||
    metrics.get('資産合計'),
  );
  result.totalUnrealizedPlJpy = parseNumber(
    metrics.get('評価損益') ||
    metrics.get('含み損益'),
  );
  result.totalUnrealizedPlPct = parseNumber(
    metrics.get('評価損益率(%)') ||
    metrics.get('含み損益（％）') ||
    metrics.get('含み損益率'),
  );
  result.totalDayChangeJpy = parseNumber(
    metrics.get('前日比') ||
    metrics.get('前日比(円)'),
  );

  const knownProducts = ['国内株式', '米国株式', '投資信託', '預り金(円)', '預り金（円）', '預り金(米ドル)', '預り金（米ドル）'];
  const productRows = rows.filter((row) => knownProducts.includes(cleanCell(row[0])));
  result.products = buildProductsFromAssetRows(productRows)
    .map((row) => ({
      ...row,
      product: row.product
        .replace('預り金（円）', '預り金(円)')
        .replace('預り金（米ドル）', '預り金(米ドル)'),
    }));

  if (
    result.totalAssetsJpy === null &&
    result.totalUnrealizedPlJpy === null &&
    result.products.length === 0 &&
    snapshot?.text
  ) {
    const text = snapshot.text;
    const metricValue = (label) => {
      const start = text.indexOf(label);
      if (start === -1) return null;
      const slice = text.slice(start, start + 120);
      const match = slice.match(/[+\-]?[0-9,]+円/);
      return match ? parseNumber(match[0]) : null;
    };
    const totalAssets = metricValue('資産残高');
    const dayChange = metricValue('前日比');
    const unrealized = metricValue('評価損益');
    const unrealizedPct = text.match(/評価損益率\s+([+\-]?[0-9.]+)%/);
    result.totalAssetsJpy = totalAssets;
    result.totalDayChangeJpy = dayChange;
    result.totalUnrealizedPlJpy = unrealized;
    result.totalUnrealizedPlPct = parseNumber(unrealizedPct?.[1]);

    const productPattern = /(米国株式|投資信託|預り金\(円\)|預り金\(米ドル\)|国内株式)\s+([+\-]?[0-9,]+)円(?:\s+([+\-]?[0-9,]+)円\s+([+\-]?[0-9.]+)%){0,1}/g;
    const products = [];
    for (const match of text.matchAll(productPattern)) {
      products.push({
        product: match[1],
        marketValueJpy: parseNumber(match[2]),
        unrealizedPlJpy: parseNumber(match[3]),
        unrealizedPlPct: parseNumber(match[4]),
        dayChangeJpy: null,
        monthChangePct: null,
      });
    }
    result.products = products;
  }

  return result;
}

export function parseUsStocksCsv(text) {
  const rows = parseCsv(text);
  const headerIndex = rows.findIndex((row) => row[0] === '口座種別' && row[1] === '銘柄名');
  if (headerIndex === -1) return [];
  return mapRows(rows, headerIndex).map((row) => ({
    accountType: row['口座種別'],
    name: row['銘柄名'],
    ticker: row['ティッカー'],
    exchange: row['取引所'],
    quantity: parseNumber(row['保有数量']),
    averageCostUsd: parseNumber(row['取得単価(USD)']),
    currentPriceUsd: parseNumber(row['現在値(USD)']),
    marketValueUsd: parseNumber(row['外貨建評価額(USD)']),
    marketValueJpy: parseNumber(row['円換算評価額(円)']),
    unrealizedPlUsd: parseNumber(row['外貨建評価損益(USD)']),
    unrealizedPlJpy: parseNumber(row['円換算評価損益(円)']),
  }));
}

export function parseUsStocksSnapshot(snapshot) {
  const rows = snapshot?.tables?.flatMap((table) => table.rows || []) || [];
  const headerIndex = rows.findIndex((row) => row.some((cell) => cleanCell(cell) === '銘柄' || cleanCell(cell) === '銘柄名') && (
    row.some((cell) => /数量|保有数量/.test(cleanCell(cell))) ||
    row.some((cell) => /評価額/.test(cleanCell(cell)))
  ));
  if (headerIndex !== -1) {
    const mapped = mapRows(rows, headerIndex).map((row) => ({
      accountType: row['口座'] || row['口座種別'] || '',
      name: row['銘柄'] || row['銘柄名'] || '',
      ticker: row['ティッカー'] || row['銘柄コード'] || '',
      exchange: row['取引所'] || '',
      quantity: parseNumber(row['数量'] || row['保有数量']),
      averageCostUsd: parseNumber(row['取得単価(USD)'] || row['取得単価']),
      currentPriceUsd: parseNumber(row['現在値(USD)'] || row['現在値']),
      marketValueUsd: parseNumber(row['外貨建評価額(USD)']),
      marketValueJpy: parseNumber(row['円換算評価額(円)'] || row['評価額']),
      unrealizedPlUsd: parseNumber(row['外貨建評価損益(USD)']),
      unrealizedPlJpy: parseNumber(row['円換算評価損益(円)'] || row['損益'] || row['評価損益']),
    })).filter((row) => row.name);
    if (mapped.length) return mapped;
  }

  if (/現在、お客様の預り情報はございません。/.test(snapshot?.text || '')) {
    return [];
  }

  const text = cleanCell(snapshot?.text);
  const sectionPattern = /株式\(([^)]+)\)\s+総評価合計[\s\S]*?(?=株式\(|預り金\s+通貨|お問い合わせ|ページ上部|$)/gu;
  const rowPattern = /(.+?)\s+([A-Z.-]+?)(NYSE|NASDAQ|NYSEArca|NYSEAmerican|CBOE|OTCMarket)\s+([0-9.,]+)\s+USD\s+[0-9,]+\s+円\s+([0-9,]+)\s+\(\d+\)\s+[0-9.,]+\s+USD\s+[0-9,]+\s+円\s+[0-9.,]+\s+USD\s+[0-9,]+\s+円\s+([0-9.,]+)\s+USD\s+([0-9,]+)\s+円\s+([+\-]?[0-9.,]+)\s+USD\s+([+\-]?[0-9,]+)\s+円\s+現買\s+現売\s+積立/gu;
  const positions = [];

  for (const sectionMatch of text.matchAll(sectionPattern)) {
    const accountType = cleanCell(sectionMatch[1]);
    const sectionText = sectionMatch[0];
    const tableStart = sectionText.indexOf('取引 ');
    const rowsText = tableStart >= 0 ? sectionText.slice(tableStart + '取引 '.length) : sectionText;
    for (const rowMatch of rowsText.matchAll(rowPattern)) {
      positions.push({
        accountType,
        name: cleanCell(rowMatch[1]),
        ticker: cleanCell(rowMatch[2]),
        exchange: cleanCell(rowMatch[3]),
        quantity: parseNumber(rowMatch[5]),
        averageCostUsd: null,
        currentPriceUsd: parseNumber(rowMatch[4]),
        marketValueUsd: parseNumber(rowMatch[6]),
        marketValueJpy: parseNumber(rowMatch[7]),
        unrealizedPlUsd: parseNumber(rowMatch[8]),
        unrealizedPlJpy: parseNumber(rowMatch[9]),
      });
    }
  }

  if (positions.length) return positions;

  return [];
}

export function parseFundPortfolioCsv(text) {
  const rows = parseCsv(text);
  const funds = [];
  let section = null;
  let currentHeader = null;

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const first = row[0];
    if ((first?.startsWith('投資信託（金額/') || first?.startsWith('投資信託(金額/')) && !first.includes('合計')) {
      section = first.replace('投資信託（金額/', '').replace('）', '');
      section = section.replace('投資信託(金額/', '').replace(')', '');
      currentHeader = null;
      continue;
    }
    if (first === 'ファンド名') {
      currentHeader = row;
      continue;
    }
    if (!section || !currentHeader) continue;
    if (
      first?.startsWith('投資信託（金額/') ||
      first?.startsWith('投資信託(金額/') ||
      first === '評価額合計' ||
      first === '総合計' ||
      first.includes('合計')
    ) {
      currentHeader = null;
      continue;
    }
    if (!first) continue;
    const entry = {};
    for (let column = 0; column < currentHeader.length; column += 1) {
      entry[currentHeader[column]] = cleanCell(row[column]);
    }
    funds.push({
      accountType: section,
      name: entry['ファンド名'],
      quantity: parseNumber(entry['保有口数'] || entry['数量']),
      averageCost: parseNumber(entry['取得単価']),
      currentPrice: parseNumber(entry['基準価額']),
      costBasisJpy: parseNumber(entry['取得金額']),
      marketValueJpy: parseNumber(entry['評価額']),
      unrealizedPlJpy: parseNumber(entry['評価損益']),
      distributionMethod: entry['分配金受取方法'],
    });
  }

  return funds;
}

export function parseFundPortfolioSnapshot(snapshot) {
  const rows = snapshot?.tables?.flatMap((table) => table.rows || []) || [];
  const funds = [];
  let section = null;
  let header = null;

  for (const row of rows) {
    const first = cleanCell(row[0]);
    if (first.startsWith('投資信託') && !first.includes('合計')) {
      section = first;
      header = null;
      continue;
    }
    if (first === 'ファンド名') {
      header = row;
      continue;
    }
    if (!section || !header || !first) continue;
    if (first.includes('合計') || first === '総合計') {
      header = null;
      continue;
    }
    const entry = {};
    for (let index = 0; index < header.length; index += 1) {
      entry[header[index]] = cleanCell(row[index]);
    }
    funds.push({
      accountType: section,
      name: entry['ファンド名'],
      quantity: parseNumber(entry['数量'] || entry['保有口数']),
      averageCost: parseNumber(entry['取得単価']),
      currentPrice: parseNumber(entry['現在値'] || entry['基準価額']),
      costBasisJpy: parseNumber(entry['取得金額']),
      marketValueJpy: parseNumber(entry['評価額']),
      unrealizedPlJpy: parseNumber(entry['損益'] || entry['評価損益']),
      distributionMethod: entry['分配金受取方法'] || '',
    });
  }

  return funds.filter((row) => row.name);
}

export function parseRealizedSummaryCsv(text) {
  const rows = parseCsv(text);
  const headerIndex = rows.findIndex((row) => row[0] === '商品' && row[1] === '実現損益(税引前・円)');
  if (headerIndex === -1) return [];
  return mapRows(rows, headerIndex).map((row) => ({
    product: row['商品'],
    realizedPlJpy: parseNumber(row['実現損益(税引前・円)']),
    gainJpy: parseNumber(row['利益金額(円)']),
    lossJpy: parseNumber(row['損失金額(円)']),
  }));
}

export function parseRealizedDetailCsv(text, type) {
  const rows = parseCsv(text);
  const headerIndex = rows.findIndex((row) => row[0] === '約定日' && (
    row[1] === '口座' || row[1] === '国' || row[1] === 'ファンド名'
  ));
  if (headerIndex === -1) return [];
  return mapRows(rows, headerIndex).map((row) => ({
    type,
    date: toIsoDate(row['約定日']),
    accountType: row['口座'],
    name: row['銘柄名'] || row['ファンド名'] || row['銘柄名/ティッカー'],
    action: row['取引'],
    quantity: parseNumber(row['数量']),
    proceedsJpy: parseNumber(row['売却/決済額'] || row['売却額'] || row['解約額単価']),
    averageCostJpy: parseNumber(row['平均取得価額']),
    realizedPlJpy: parseNumber(row['実現損益(税引前・円)']),
  }));
}

export function parseDomesticHistoryCsv(text) {
  const rows = parseCsv(text);
  const headerIndex = rows.findIndex((row) => row[0] === '約定日' && row[1] === '銘柄');
  if (headerIndex === -1) return [];
  return mapRows(rows, headerIndex).map((row) => ({
    date: toIsoDate(row['約定日']),
    category: row['取引']?.startsWith('投信') ? '投資信託' : '国内株式',
    name: row['銘柄'],
    code: row['銘柄コード'],
    market: row['市場'],
    action: row['取引'],
    accountType: cleanCell(row['預り']),
    taxType: row['課税'],
    quantity: parseNumber(row['約定数量']),
    unitPrice: parseNumber(row['約定単価']),
    settlementDate: toIsoDate(row['受渡日']),
    settlementAmountJpy: parseNumber(row['受渡金額/決済損益']),
  }));
}

export function parseForeignHistoryCsv(text) {
  const rows = parseCsv(text);
  const headerIndex = rows.findIndex((row) => row[0] === '国内約定日' && row[1] === '通貨');
  if (headerIndex === -1) return [];
  return mapRows(rows, headerIndex).map((row) => ({
    date: toIsoDate(row['国内約定日']),
    category: '米国株式',
    currency: row['通貨'],
    name: row['銘柄名'],
    action: row['取引'],
    accountType: row['預り区分'],
    quantity: parseNumber(row['約定数量']),
    unitPrice: parseNumber(row['約定単価']),
    settlementDate: toIsoDate(row['国内受渡日']),
    settlementAmount: parseNumber(row['受渡金額']),
  }));
}

export function parseDistributionHistoryCsv(text) {
  const rows = parseCsv(text);
  const summaryHeaderIndex = rows.findIndex((row) => row[0] === '商品' && row[1] === '受取額(税引後・円)');
  const detailHeaderIndex = rows.findIndex((row) => row[0] === '受渡日' && row[1] === '口座' && row[2] === '商品');

  const summary = summaryHeaderIndex === -1 ? [] : mapRows(rows, summaryHeaderIndex).map((row) => ({
    product: row['商品'],
    amountJpy: parseNumber(row['受取額(税引後・円)']),
    amountUsd: parseNumber(row['受取額(税引後・USD)']),
  }));

  const entries = detailHeaderIndex === -1 ? [] : mapRows(rows, detailHeaderIndex).map((row) => ({
    date: toIsoDate(row['受渡日']),
    accountType: row['口座'],
    product: row['商品'],
    name: row['銘柄名'],
    quantity: parseNumber(row['数量']),
    amount: parseNumber(row['受取額(税引後・円)']),
    currency: row['商品'] === '米国株式' ? 'USD' : 'JPY',
  }));

  return { summary, entries };
}

function sumNumbers(values) {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
}

function mergeAssetsSummary(primary, fallback) {
  const base = primary || createEmptyAssetsSummary();
  const merged = {
    asOf: base.asOf || fallback?.asOf || '',
    totalAssetsJpy: base.totalAssetsJpy ?? fallback?.totalAssetsJpy ?? null,
    totalDayChangeJpy: base.totalDayChangeJpy ?? fallback?.totalDayChangeJpy ?? null,
    totalUnrealizedPlJpy: base.totalUnrealizedPlJpy ?? fallback?.totalUnrealizedPlJpy ?? null,
    totalUnrealizedPlPct: base.totalUnrealizedPlPct ?? fallback?.totalUnrealizedPlPct ?? null,
    products: base.products?.length ? base.products : (fallback?.products || []),
  };
  return merged;
}

function inferDomesticHoldings(assetsSummary) {
  const domesticRow = assetsSummary.products.find((row) => row.product === '国内株式');
  if (!domesticRow || domesticRow.marketValueJpy === 0) {
    return { count: 0, marketValueJpy: 0, inferred: true };
  }
  return { count: null, marketValueJpy: domesticRow.marketValueJpy, inferred: false };
}

function buildRecentTradeRows(domesticHistory, foreignHistory, limit = 20) {
  return [...domesticHistory, ...foreignHistory]
    .sort((left, right) => String(right.date).localeCompare(String(left.date)))
    .slice(0, limit);
}

function buildTopRealizedRows(realizedDetails, limit = 5) {
  const gains = [...realizedDetails]
    .filter((row) => Number.isFinite(row.realizedPlJpy))
    .sort((left, right) => (right.realizedPlJpy ?? -Infinity) - (left.realizedPlJpy ?? -Infinity))
    .slice(0, limit);
  const losses = [...realizedDetails]
    .filter((row) => Number.isFinite(row.realizedPlJpy))
    .sort((left, right) => (left.realizedPlJpy ?? Infinity) - (right.realizedPlJpy ?? Infinity))
    .slice(0, limit);
  return { gains, losses };
}

function formatDistributionAmount(amount, currency) {
  if (!Number.isFinite(amount)) return 'n/a';
  return currency === 'USD'
    ? formatCurrency(amount, 'USD', 2)
    : formatCurrency(amount, 'JPY', 0);
}

function renderTable(headers, rows) {
  const lines = [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
  ];
  for (const row of rows) {
    lines.push(`| ${row.join(' | ')} |`);
  }
  return lines.join('\n');
}

function buildSupplementalArtifactRows(paths) {
  return (paths || []).map((path) => [basename(path)]);
}

export function buildPortfolioReport(data) {
  const domesticHoldings = inferDomesticHoldings(data.assetsSummary);
  const recentTrades = buildRecentTradeRows(data.domesticHistory, data.foreignHistory);
  const realizedDetails = [
    ...data.realizedDomestic,
    ...data.realizedForeign,
    ...data.realizedFund,
  ];
  const topRealized = buildTopRealizedRows(realizedDetails);
  const recentDistributions = [...(data.distributionEntries || [])]
    .sort((left, right) => String(right.date).localeCompare(String(left.date)))
    .slice(0, 20);
  const totalUsMarketValueJpy = sumNumbers(data.usStocks.map((row) => row.marketValueJpy));
  const totalFundMarketValueJpy = sumNumbers(data.funds.map((row) => row.marketValueJpy));
  const cashJpy = data.assetsSummary.products.find((row) => row.product === '預り金(円)')?.marketValueJpy ?? null;
  const cashUsdJpy = data.assetsSummary.products.find((row) => row.product === '預り金(米ドル)')?.marketValueJpy ?? null;

  const lines = [
    '# SBI Portfolio Report',
    '',
    `- 取得日時: ${data.assetsSummary.asOf || 'n/a'}`,
    `- 生成元: ${data.sources.assetsSummary ? basename(data.sources.assetsSummary) : 'n/a'} ほか`,
    '- 取得方法: 読み取り専用。ログインや発注は自動化していません。',
    data.sources.distributionHistory ? `- 配当履歴CSV: ${basename(data.sources.distributionHistory)}` : null,
    '',
    '## 全体サマリー',
    '',
    renderTable(
      ['項目', '金額'],
      [
        ['総資産残高', formatCurrency(data.assetsSummary.totalAssetsJpy, 'JPY', 0)],
        ['評価損益', formatSignedYen(data.assetsSummary.totalUnrealizedPlJpy)],
        ['評価損益率', formatPercent(data.assetsSummary.totalUnrealizedPlPct)],
        ['前日比', formatSignedYen(data.assetsSummary.totalDayChangeJpy)],
        ['円預り金', formatCurrency(cashJpy, 'JPY', 0)],
        ['米ドル預り金（円換算）', formatCurrency(cashUsdJpy, 'JPY', 0)],
      ],
    ),
    '',
    '## 現在のポートフォリオ',
    '',
    renderTable(
      ['区分', '件数', '評価額', 'メモ'],
      [
        [
          '日本株',
          domesticHoldings.count === null ? 'n/a' : String(domesticHoldings.count),
          formatCurrency(domesticHoldings.marketValueJpy, 'JPY', 0),
          domesticHoldings.inferred ? '資産サマリー上は保有なし' : '別CSVが必要',
        ],
        ['米国株', String(data.usStocks.length), formatCurrency(totalUsMarketValueJpy, 'JPY', 0), '円換算評価額ベース'],
        ['投資信託', String(data.funds.length), formatCurrency(totalFundMarketValueJpy, 'JPY', 0), '現保有分のみ'],
      ],
    ),
    '',
    '### 日本株',
    '',
    domesticHoldings.marketValueJpy === 0
      ? '現時点では、日本株の現保有は資産サマリー上 0 円として確認できました。'
      : '日本株の現保有一覧を出すには、専用の保有一覧 CSV が追加で必要です。',
    '',
    '### 米国株',
    '',
    renderTable(
      ['口座', '銘柄', 'ティッカー', '数量', '評価額(円)', '評価損益(円)', '評価損益(USD)'],
      data.usStocks.map((row) => [
        row.accountType || 'n/a',
        row.name || 'n/a',
        row.ticker || 'n/a',
        formatInteger(row.quantity),
        formatCurrency(row.marketValueJpy, 'JPY', 0),
        formatSignedYen(row.unrealizedPlJpy),
        formatSignedUsd(row.unrealizedPlUsd),
      ]),
    ),
    '',
    '### 投資信託',
    '',
    renderTable(
      ['口座', 'ファンド', '保有口数', '評価額(円)', '評価損益(円)', '分配金'],
      data.funds.map((row) => [
        row.accountType || 'n/a',
        row.name || 'n/a',
        formatInteger(row.quantity),
        formatCurrency(row.marketValueJpy, 'JPY', 0),
        formatSignedYen(row.unrealizedPlJpy),
        row.distributionMethod || 'n/a',
      ]),
    ),
    '',
    '## 実現損益',
    '',
    renderTable(
      ['商品', '実現損益(税引前・円)', '利益合計(円)', '損失合計(円)'],
      data.realizedSummary.map((row) => [
        row.product || 'n/a',
        formatSignedYen(row.realizedPlJpy),
        formatCurrency(row.gainJpy, 'JPY', 0),
        formatSignedYen(row.lossJpy),
      ]),
    ),
    '',
    '### 実現益 上位',
    '',
    renderTable(
      ['日付', '区分', '銘柄', '口座', '損益'],
      topRealized.gains.map((row) => [
        row.date || 'n/a',
        row.type || 'n/a',
        row.name || 'n/a',
        row.accountType || 'n/a',
        formatSignedYen(row.realizedPlJpy),
      ]),
    ),
    '',
    '### 実現損 上位',
    '',
    renderTable(
      ['日付', '区分', '銘柄', '口座', '損益'],
      topRealized.losses.map((row) => [
        row.date || 'n/a',
        row.type || 'n/a',
        row.name || 'n/a',
        row.accountType || 'n/a',
        formatSignedYen(row.realizedPlJpy),
      ]),
    ),
    '',
    '## 配当金・分配金履歴',
    '',
    renderTable(
      ['商品', '受取額(税引後・円)', '受取額(税引後・USD)'],
      (data.distributionSummary || []).map((row) => [
        row.product || 'n/a',
        formatCurrency(row.amountJpy, 'JPY', 0),
        formatCurrency(row.amountUsd, 'USD', 2),
      ]),
    ),
    '',
    '### 直近受取 20 件',
    '',
    renderTable(
      ['日付', '口座', '商品', '銘柄', '数量', '受取額'],
      recentDistributions.map((row) => [
        row.date || 'n/a',
        row.accountType || 'n/a',
        row.product || 'n/a',
        row.name || 'n/a',
        formatInteger(row.quantity),
        formatDistributionAmount(row.amount, row.currency),
      ]),
    ),
    '',
    '## 約定履歴サマリー',
    '',
    renderTable(
      ['項目', '件数'],
      [
        ['国内株・投信 約定件数', String(data.domesticHistory.length)],
        ['米国株 約定件数', String(data.foreignHistory.length)],
        ['全約定件数', String(data.domesticHistory.length + data.foreignHistory.length)],
      ],
    ),
    '',
    '### 直近約定 20 件',
    '',
    renderTable(
      ['日付', '区分', '銘柄', '取引', '口座', '数量', '受渡/受取'],
      recentTrades.map((row) => [
        row.date || 'n/a',
        row.category || 'n/a',
        row.name || 'n/a',
        row.action || 'n/a',
        row.accountType || 'n/a',
        formatInteger(row.quantity),
        row.category === '米国株式'
          ? `${row.currency || ''} ${row.settlementAmount ?? 'n/a'}`
          : formatCurrency(row.settlementAmountJpy, 'JPY', 0),
      ]),
    ),
    '',
  ];

  if (data.sources.otherDownloads?.length) {
    lines.push('## 補助artifact', '');
    lines.push('capture で取得できたものの、現時点では未解析の CSV / 補助ファイルです。', '');
    lines.push(
      renderTable(
        ['ファイル'],
        buildSupplementalArtifactRows(data.sources.otherDownloads),
      ),
      '',
    );
  }

  return `${lines.filter(Boolean).join('\n').trim()}\n`;
}

function decodeCsvBuffer(buffer) {
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  if (!utf8.includes('�')) return utf8;
  return new TextDecoder('shift_jis').decode(buffer);
}

async function readCsvText(path) {
  const buffer = await readFile(path);
  return decodeCsvBuffer(buffer);
}

export async function buildPortfolioReportFromFiles(inputPaths, outputPath) {
  const [
    assetsSummaryText,
    usStocksText,
    fundPortfolioText,
    realizedAllText,
    realizedDomesticText,
    realizedForeignText,
    realizedFundText,
    historyDomesticText,
    historyForeignText,
    distributionHistoryText,
  ] = await Promise.all([
    readCsvText(inputPaths.assetsSummary),
    readCsvText(inputPaths.usStocks),
    readCsvText(inputPaths.fundPortfolio),
    readCsvText(inputPaths.realizedAll),
    readCsvText(inputPaths.realizedDomestic),
    readCsvText(inputPaths.realizedForeign),
    readCsvText(inputPaths.realizedFund),
    readCsvText(inputPaths.historyDomestic),
    readCsvText(inputPaths.historyForeign),
    readCsvText(inputPaths.distributionHistory),
  ]);
  const distributionHistory = parseDistributionHistoryCsv(distributionHistoryText);

  const data = {
    assetsSummary: parseAssetsSummaryCsv(assetsSummaryText),
    usStocks: parseUsStocksCsv(usStocksText),
    funds: parseFundPortfolioCsv(fundPortfolioText),
    realizedSummary: parseRealizedSummaryCsv(realizedAllText),
    realizedDomestic: parseRealizedDetailCsv(realizedDomesticText, '国内株式'),
    realizedForeign: parseRealizedDetailCsv(realizedForeignText, '米国株式'),
    realizedFund: parseRealizedDetailCsv(realizedFundText, '投資信託'),
    domesticHistory: parseDomesticHistoryCsv(historyDomesticText),
    foreignHistory: parseForeignHistoryCsv(historyForeignText),
    distributionSummary: distributionHistory.summary,
    distributionEntries: distributionHistory.entries,
    sources: inputPaths,
  };

  const report = buildPortfolioReport(data);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, report, 'utf8');
  return { report, data };
}

async function readSnapshotJson(path) {
  if (!path) return null;
  return JSON.parse(await readFile(path, 'utf8'));
}

export async function buildPortfolioReportFromCaptureDir(captureDir, outputPath) {
  const inputPaths = await discoverCaptureInputPaths(captureDir);
  const accountAssetsSnapshot = await readSnapshotJson(inputPaths.accountAssetsPage);
  const everyAssetSnapshot = await readSnapshotJson(inputPaths.everyAssetPage);
  const usStocksSnapshot = await readSnapshotJson(inputPaths.usStocksPage);
  const foreignTopSnapshot = await readSnapshotJson(inputPaths.foreignTopPage);
  const foreignHoldingsSnapshot = await readSnapshotJson(inputPaths.foreignHoldingsPage);

  const assetsSummary = inputPaths.assetsSummary
    ? parseAssetsSummaryCsv(await readCsvText(inputPaths.assetsSummary))
    : mergeAssetsSummary(createEmptyAssetsSummary(), parseAssetsSummarySnapshot(accountAssetsSnapshot));

  const funds = inputPaths.fundPortfolio
    ? parseFundPortfolioCsv(await readCsvText(inputPaths.fundPortfolio))
    : parseFundPortfolioSnapshot(everyAssetSnapshot);

  const usStocks = inputPaths.usStocks
    ? parseUsStocksCsv(await readCsvText(inputPaths.usStocks))
    : [
      ...parseUsStocksSnapshot(usStocksSnapshot),
      ...parseUsStocksSnapshot(foreignTopSnapshot),
      ...parseUsStocksSnapshot(foreignHoldingsSnapshot),
    ].filter((row, index, rows) => rows.findIndex((candidate) => candidate.name === row.name && candidate.ticker === row.ticker) === index);
  const distributionHistory = inputPaths.distributionHistory
    ? parseDistributionHistoryCsv(await readCsvText(inputPaths.distributionHistory))
    : { summary: [], entries: [] };

  const data = {
    assetsSummary,
    usStocks,
    funds,
    realizedSummary: inputPaths.realizedAll ? parseRealizedSummaryCsv(await readCsvText(inputPaths.realizedAll)) : [],
    realizedDomestic: inputPaths.realizedDomestic ? parseRealizedDetailCsv(await readCsvText(inputPaths.realizedDomestic), '国内株式') : [],
    realizedForeign: inputPaths.realizedForeign ? parseRealizedDetailCsv(await readCsvText(inputPaths.realizedForeign), '米国株式') : [],
    realizedFund: inputPaths.realizedFund ? parseRealizedDetailCsv(await readCsvText(inputPaths.realizedFund), '投資信託') : [],
    domesticHistory: inputPaths.historyDomestic ? parseDomesticHistoryCsv(await readCsvText(inputPaths.historyDomestic)) : [],
    foreignHistory: inputPaths.historyForeign ? parseForeignHistoryCsv(await readCsvText(inputPaths.historyForeign)) : [],
    distributionSummary: distributionHistory.summary,
    distributionEntries: distributionHistory.entries,
    sources: {
      ...inputPaths,
      captureDir,
    },
  };

  const report = buildPortfolioReport(data);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, report, 'utf8');
  return { report, data, inputPaths };
}

function ensureInputs(paths) {
  const required = [
    'assetsSummary',
    'usStocks',
    'fundPortfolio',
    'realizedAll',
    'realizedDomestic',
    'realizedForeign',
    'realizedFund',
    'historyDomestic',
    'historyForeign',
    'distributionHistory',
  ];
  for (const key of required) {
    if (!paths[key]) {
      throw new Error(`Required input could not be found: ${key}`);
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const outputPath = resolve(options.output);
  let data;
  if (options.captureDir) {
    ({ data } = await buildPortfolioReportFromCaptureDir(resolve(options.captureDir), outputPath));
  } else {
    const discovered = await discoverInputPaths(resolve(options.downloadsDir));
    const inputPaths = {
      assetsSummary: options.assetsSummary || discovered.assetsSummary,
      usStocks: options.usStocks || discovered.usStocks,
      fundPortfolio: options.fundPortfolio || discovered.fundPortfolio,
      realizedAll: options.realizedAll || discovered.realizedAll,
      realizedDomestic: options.realizedDomestic || discovered.realizedDomestic,
      realizedForeign: options.realizedForeign || discovered.realizedForeign,
      realizedFund: options.realizedFund || discovered.realizedFund,
      historyDomestic: options.historyDomestic || discovered.historyDomestic,
      historyForeign: options.historyForeign || discovered.historyForeign,
      distributionHistory: options.distributionHistory || discovered.distributionHistory,
    };

    ensureInputs(inputPaths);
    ({ data } = await buildPortfolioReportFromFiles(inputPaths, outputPath));
  }

  console.log(JSON.stringify({
    success: true,
    outputPath,
    asOf: data.assetsSummary.asOf,
    totalAssetsJpy: data.assetsSummary.totalAssetsJpy,
    usPositionCount: data.usStocks.length,
    fundPositionCount: data.funds.length,
    realizedSummaryCount: data.realizedSummary.length,
    domesticTradeCount: data.domesticHistory.length,
    foreignTradeCount: data.foreignHistory.length,
    readOnly: true,
  }, null, 2));
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (entryPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error?.stack || error?.message || String(error));
    process.exitCode = 1;
  });
}
