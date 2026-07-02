#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_SYMBOL_MAP = 'config/tradingview-symbol-map.json';
const OUTPUT_US = 'tradingview_us_from_sbi.csv';
const OUTPUT_JP = 'tradingview_jp_stocks_from_sbi.csv';
const OUTPUT_SKIPPED = 'tradingview_conversion_skipped.csv';
const OUTPUT_REPORT = 'conversion_report.md';

const US_MARKET_PREFIX = new Map([
  ['NASDAQ', 'NASDAQ'],
  ['New York Stock Exchange', 'NYSE'],
  ['NYSE ARCA', 'AMEX'],
  ['CBOE', 'CBOE'],
]);

const FUND_KEYWORDS = [
  'emaxis',
  'ｅｍａｘｉｓ',
  'ifree',
  'ｉｆｒｅｅ',
  'インベスコ',
  '投信',
  'ファンド',
  'オープン',
];

function printHelp() {
  console.log(`Usage: node scripts/portfolio/convert-sbi-to-tradingview.mjs --us <csv> --jp <csv> --example <csv> --out <dir>

Convert SBI trade history CSV files to TradingView Portfolios import CSV files.

Options:
  --us <path>          SBI US stock execution history CSV
  --jp <path>          SBI Japan stock trade history CSV
  --example <path>     TradingView Portfolios sample CSV
  --out <dir>          Output directory
  --symbol-map <path>  Symbol override JSON (default: config/tradingview-symbol-map.json)
  --help              Show this help
`);
}

function parseArgs(argv) {
  const options = { symbolMap: DEFAULT_SYMBOL_MAP };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') {
      options.help = true;
      continue;
    }
    if (!arg.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
    const key = arg.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
    options[key] = value;
    index += 1;
  }
  return options;
}

function cleanCell(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

export function parseCsv(text) {
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
    } else if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => cleanCell(value) !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell);
    if (row.some((value) => cleanCell(value) !== '')) rows.push(row);
  }
  return rows;
}

export function stringifyCsv(rows) {
  return `${rows.map((row) => row.map(formatCsvCell).join(',')).join('\n')}\n`;
}

function formatCsvCell(value) {
  const text = value === undefined || value === null ? '' : String(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

export function decodeCsvBuffer(buffer) {
  const candidates = ['utf-8', 'shift_jis'].map((encoding) => {
    const text = new TextDecoder(encoding).decode(buffer);
    const replacements = (text.match(/\uFFFD/g) || []).length;
    return { encoding, text, replacements };
  });
  candidates.sort((a, b) => a.replacements - b.replacements);
  return candidates[0];
}

async function readCsvRows(path) {
  const decoded = decodeCsvBuffer(await readFile(path));
  return { ...decoded, rows: parseCsv(decoded.text) };
}

function findTable(rows, requiredHeaders) {
  const index = rows.findIndex((row) => requiredHeaders.every((header) => row.includes(header)));
  if (index === -1) throw new Error(`CSV header not found: ${requiredHeaders.join(', ')}`);
  const headers = rows[index].map(cleanCell);
  return {
    headers,
    rows: rows.slice(index + 1).map((row) => rowToObject(headers, row)),
  };
}

function rowToObject(headers, row) {
  const result = {};
  headers.forEach((header, index) => {
    result[header] = cleanCell(row[index]);
  });
  return result;
}

function normalizeNumber(value, fallback = '0') {
  const text = cleanCell(value).replaceAll(',', '');
  if (!text || text === '--') return fallback;
  return text;
}

function normalizeCommission(value) {
  return normalizeNumber(value, '0');
}

function formatClosingTime(value) {
  const text = cleanCell(value);
  let match = text.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
  if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')} 0:00:00`;
  match = text.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')} 0:00:00`;
  return '';
}

function detectSide(rawSide, buyText, sellText) {
  if (rawSide === buyText) return 'Buy';
  if (rawSide === sellText) return 'Sell';
  return '';
}

function pickCommission(row) {
  return normalizeCommission(row['手数料'] || row['手数料/諸経費等'] || row['手数料等'] || '');
}

function isFund(row) {
  const haystack = `${row['銘柄'] || ''} ${row['銘柄名'] || ''} ${row['取引'] || ''}`.toLowerCase();
  return FUND_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

function extractUsSymbolAndMarket(name) {
  const match = cleanCell(name).match(/\s([A-Z0-9.\-]+)\s*\/\s*(.+)$/);
  if (!match) return null;
  return { ticker: match[1], market: match[2].trim() };
}

function convertUsRow(row, symbolMap) {
  const parsed = extractUsSymbolAndMarket(row['銘柄名']);
  if (!parsed) return { skipped: skipRow('us', 'ticker_or_market_not_found', row) };
  const side = detectSide(row['取引'], '買付', '売却');
  if (!side) return { skipped: skipRow('us', `unsupported_side:${row['取引']}`, row) };

  const mappedSymbol = symbolMap.us?.[parsed.ticker];
  const prefix = US_MARKET_PREFIX.get(parsed.market);
  if (!mappedSymbol && !prefix) return { skipped: skipRow('us', `unknown_market:${parsed.market}`, row) };

  return {
    output: {
      Symbol: mappedSymbol || `${prefix}:${parsed.ticker}`,
      Side: side,
      Qty: normalizeNumber(row['約定数量']),
      'Fill Price': normalizeNumber(row['約定単価']),
      Commission: pickCommission(row),
      'Closing Time': formatClosingTime(row['国内約定日']),
    },
  };
}

function convertJpRow(row, symbolMap) {
  if (isFund(row)) return { skipped: skipRow('jp', 'investment_fund_excluded', row) };
  const code = cleanCell(row['銘柄コード']);
  if (!code) return { skipped: skipRow('jp', 'stock_code_not_found', row) };
  const side = detectSide(row['取引'], '株式現物買', '株式現物売');
  if (!side) return { skipped: skipRow('jp', `unsupported_side:${row['取引']}`, row) };

  return {
    output: {
      Symbol: symbolMap.jp?.[code] || `TSE:${code}`,
      Side: side,
      Qty: normalizeNumber(row['約定数量']),
      'Fill Price': normalizeNumber(row['約定単価']),
      Commission: pickCommission(row),
      'Closing Time': formatClosingTime(row['約定日']),
    },
  };
}

function skipRow(source, reason, row) {
  return {
    Source: source,
    Reason: reason,
    Date: row['国内約定日'] || row['約定日'] || '',
    Name: row['銘柄名'] || row['銘柄'] || '',
    Code: row['銘柄コード'] || '',
    Side: row['取引'] || '',
    Qty: row['約定数量'] || '',
    Market: row['市場'] || '',
  };
}

function convertRows(source, rows, converter, symbolMap) {
  const converted = [];
  const skipped = [];
  for (const row of rows) {
    const result = converter(row, symbolMap);
    if (result.output) converted.push(result.output);
    if (result.skipped) skipped.push(result.skipped);
  }
  return { source, converted, skipped };
}

function toTradingViewRows(header, converted) {
  return [header, ...converted.map((row) => header.map((column) => row[column] ?? ''))];
}

function buildReport({ us, jp, skipped, outputFiles, encodings }) {
  const lines = ['# TradingView Portfolio CSV Conversion Report', ''];
  lines.push('## Summary', '');
  lines.push('| Source | Converted | Skipped | Buy | Sell | Encoding |');
  lines.push('|---|---:|---:|---:|---:|---|');
  for (const item of [us, jp]) {
    lines.push(`| ${item.source} | ${item.converted.length} | ${item.skipped.length} | ${countSide(item.converted, 'Buy')} | ${countSide(item.converted, 'Sell')} | ${encodings[item.source]} |`);
  }
  lines.push(`| total | ${us.converted.length + jp.converted.length} | ${skipped.length} | ${countSide([...us.converted, ...jp.converted], 'Buy')} | ${countSide([...us.converted, ...jp.converted], 'Sell')} | - |`);
  lines.push('', '## Output Files', '');
  for (const file of outputFiles) lines.push(`- ${file}`);
  lines.push('', '## Symbol Counts', '');
  lines.push('### US', '', ...symbolCountLines(us.converted), '', '### JP', '', ...symbolCountLines(jp.converted));
  lines.push('', '## Skipped Reasons', '', ...reasonCountLines(skipped));
  lines.push('', '## Manual Import Steps', '');
  lines.push('1. TradingViewでUSD建てポートフォリオを作成し、`tradingview_us_from_sbi.csv` をImportする。');
  lines.push('2. TradingViewでJPY建てポートフォリオを作成し、`tradingview_jp_stocks_from_sbi.csv` をImportする。');
  lines.push('3. 投資信託は今回はTradingViewへ変換せず、SBI管理のままにする。');
  lines.push('');
  return lines.join('\n');
}

function countSide(rows, side) {
  return rows.filter((row) => row.Side === side).length;
}

function symbolCountLines(rows) {
  const counts = new Map();
  for (const row of rows) counts.set(row.Symbol, (counts.get(row.Symbol) || 0) + 1);
  if (counts.size === 0) return ['No converted rows.'];
  return ['| Symbol | Count |', '|---|---:|', ...[...counts.entries()].sort().map(([symbol, count]) => `| ${symbol} | ${count} |`)];
}

function reasonCountLines(rows) {
  const counts = new Map();
  for (const row of rows) counts.set(row.Reason, (counts.get(row.Reason) || 0) + 1);
  if (counts.size === 0) return ['No skipped rows.'];
  return ['| Reason | Count |', '|---|---:|', ...[...counts.entries()].sort().map(([reason, count]) => `| ${reason} | ${count} |`)];
}

async function readSymbolMap(path) {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8'));
    return { us: parsed.us || {}, jp: parsed.jp || {} };
  } catch (error) {
    if (error.code === 'ENOENT') return { us: {}, jp: {} };
    throw error;
  }
}

export async function convertSbiToTradingView(options) {
  for (const key of ['us', 'jp', 'example', 'out']) {
    if (!options[key]) throw new Error(`Missing required option: --${key}`);
  }

  const [exampleCsv, usCsv, jpCsv, symbolMap] = await Promise.all([
    readCsvRows(options.example),
    readCsvRows(options.us),
    readCsvRows(options.jp),
    readSymbolMap(options.symbolMap || DEFAULT_SYMBOL_MAP),
  ]);
  const header = exampleCsv.rows[0]?.map(cleanCell);
  if (!header?.length) throw new Error('TradingView example CSV header is empty');

  const usTable = findTable(usCsv.rows, ['国内約定日', '銘柄名', '取引', '約定数量', '約定単価']);
  const jpTable = findTable(jpCsv.rows, ['約定日', '銘柄', '銘柄コード', '取引', '約定数量', '約定単価']);
  const us = convertRows('us', usTable.rows, convertUsRow, symbolMap);
  const jp = convertRows('jp', jpTable.rows, convertJpRow, symbolMap);
  const skipped = [...us.skipped, ...jp.skipped];

  await mkdir(options.out, { recursive: true });
  const usPath = join(options.out, OUTPUT_US);
  const jpPath = join(options.out, OUTPUT_JP);
  const skippedPath = join(options.out, OUTPUT_SKIPPED);
  const reportPath = join(options.out, OUTPUT_REPORT);
  await writeFile(usPath, stringifyCsv(toTradingViewRows(header, us.converted)), 'utf8');
  await writeFile(jpPath, stringifyCsv(toTradingViewRows(header, jp.converted)), 'utf8');
  await writeFile(skippedPath, stringifyCsv([Object.keys(skipRow('', '', {})), ...skipped.map((row) => Object.values(row))]), 'utf8');
  await writeFile(reportPath, buildReport({
    us,
    jp,
    skipped,
    outputFiles: [usPath, jpPath, skippedPath, reportPath],
    encodings: { us: usCsv.encoding, jp: jpCsv.encoding },
  }), 'utf8');

  return { us, jp, skipped, output: { usPath, jpPath, skippedPath, reportPath } };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (options.symbolMap) options.symbolMap = resolve(options.symbolMap);
  await mkdir(dirname(resolve(options.out || '.')), { recursive: true });
  const result = await convertSbiToTradingView({ ...options, out: resolve(options.out) });
  console.log(`Converted US rows: ${result.us.converted.length}`);
  console.log(`Converted JP rows: ${result.jp.converted.length}`);
  console.log(`Skipped rows: ${result.skipped.length}`);
  console.log(`Report: ${result.output.reportPath}`);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
