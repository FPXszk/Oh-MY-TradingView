#!/usr/bin/env node

import CDP from 'chrome-remote-interface';
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_CDP_HOST = '127.0.0.1';
const DEFAULT_CDP_PORT = 9222;
const DEFAULT_OUTPUT_DIR = 'docs/reports/screener/portfolio/capture/latest';
const DEFAULT_HISTORY_START_DATE = '2022/01/01';
const ACCOUNT_ASSETS_URL = 'https://site.sbisec.co.jp/account/assets';
const CLICKABLE_SELECTOR = [
  'a',
  'button',
  'input[type="button"]',
  'input[type="submit"]',
  '[role="button"]',
].join(',');
const ROUTE_DEFINITIONS = [
  {
    key: 'usStocks',
    label: '米国株式',
    keywords: ['米国株式'],
    snapshotName: 'us-stocks-page',
    fallbackActions: [
      { label: '外国株式トップ', keywords: ['外国株式トップ'], snapshotName: 'foreign-top-page' },
      { label: '保有資産評価', keywords: ['保有資産評価'], snapshotName: 'us-holdings-page' },
      { label: '資産損益', keywords: ['資産損益'], snapshotName: 'us-profit-loss-page' },
    ],
  },
  {
    key: 'realizedDetail',
    label: '実現損益詳細',
    keywords: ['実現損益詳細'],
    snapshotName: 'realized-detail-page',
    startDate: DEFAULT_HISTORY_START_DATE,
  },
  {
    key: 'dividendHistory',
    label: '配当金・分配金履歴',
    keywords: ['配当金・分配金履歴'],
    snapshotName: 'dividend-history-page',
    startDate: DEFAULT_HISTORY_START_DATE,
  },
];

function printHelp() {
  console.log(`Usage: node scripts/sbi/capture-portfolio-data.mjs [options]

Capture read-only SBI portfolio data from an already logged-in Chrome session.

Options:
  --cdp-host <host>     CDP host (default: 127.0.0.1)
  --cdp-port <port>     CDP port (default: 9222)
  --output-dir <path>   Output directory for capture artifacts
  --dry-run             Probe targets only, do not click or navigate
  --help                Show this help
`);
}

function parseArgs(argv) {
  const options = {
    cdpHost: DEFAULT_CDP_HOST,
    cdpPort: DEFAULT_CDP_PORT,
    outputDir: DEFAULT_OUTPUT_DIR,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') {
      options.help = true;
      continue;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
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
    options[key] = key === 'cdpPort' ? Number(value) : value;
    index += 1;
  }

  return options;
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeName(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'untitled';
}

function decodeCsvBuffer(buffer) {
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  if (!utf8.includes('�')) return utf8;
  return new TextDecoder('shift_jis').decode(buffer);
}

function detectSbiCsvKind(text) {
  const normalized = text.replace(/^\uFEFF/, '');
  if (/^取得日時,/m.test(normalized) && /総資産残高/.test(normalized)) return 'sbi_assets_summary.csv';
  if (/口座種別,銘柄名,ティッカー,取引所/m.test(normalized)) return 'sbi_us_stocks.csv';
  if (/投資信託（金額\//.test(normalized) || /保有証券一覧/.test(normalized)) return 'SaveFile.csv';
  if (/^商品,実現損益\(税引前・円\),利益金額\(円\),損失金額\(円\)/m.test(normalized)) return 'ALLTYPE_capture.csv';
  if (/^約定日,(口座|国|ファンド名)/m.test(normalized)) {
    if (/ファンド名/.test(normalized)) return 'FUND_capture.csv';
    if (/国/.test(normalized)) return 'FOREIGN_STOCK_capture.csv';
    return 'DOMESTIC_STOCK_capture.csv';
  }
  if (/^約定日,銘柄,銘柄コード,市場,取引/m.test(normalized)) return 'SaveFile_capture.csv';
  if (/^国内約定日,通貨,銘柄名,取引,預り区分/m.test(normalized)) return 'yakujo_capture.csv';
  return null;
}

export function scoreSbiTarget(target) {
  const title = normalizeText(target?.title);
  const url = String(target?.url ?? '');
  if (target?.type !== 'page') return -1;

  let score = 0;
  if (/sbisec|sbi/i.test(url)) score += 100;
  if (/etgate/i.test(url)) score += 40;
  if (/portfolio|account|assets/i.test(url)) score += 10;
  if (/SBI|証券|ポートフォリオ|口座|資産/.test(title)) score += 30;
  return score;
}

export function pickSbiTarget(targets) {
  return [...(targets || [])]
    .map((target) => ({ target, score: scoreSbiTarget(target) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)[0]?.target ?? null;
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function listTargets(host, port) {
  const response = await fetch(`http://${host}:${port}/json/list`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    throw new Error(`Failed to list CDP targets: HTTP ${response.status}`);
  }
  return response.json();
}

async function probeEndpoint(host, port) {
  const baseUrl = `http://${host}:${port}`;
  const result = {
    baseUrl,
    reachable: false,
    versionOk: false,
    listOk: false,
    browser: null,
    protocolVersion: null,
    targetCount: null,
    errors: [],
  };

  try {
    const versionResponse = await fetch(`${baseUrl}/json/version`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!versionResponse.ok) {
      result.errors.push(`GET /json/version failed: HTTP ${versionResponse.status}`);
    } else {
      const versionPayload = await versionResponse.json();
      result.reachable = true;
      result.versionOk = true;
      result.browser = versionPayload.Browser ?? null;
      result.protocolVersion = versionPayload['Protocol-Version'] ?? null;
      result.webSocketDebuggerUrl = versionPayload.webSocketDebuggerUrl ?? null;
    }
  } catch (error) {
    result.errors.push(`GET /json/version failed: ${error.message}`);
  }

  try {
    const listResponse = await fetch(`${baseUrl}/json/list`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!listResponse.ok) {
      result.errors.push(`GET /json/list failed: HTTP ${listResponse.status}`);
    } else {
      const targets = await listResponse.json();
      result.reachable = true;
      result.listOk = true;
      result.targetCount = Array.isArray(targets) ? targets.length : null;
    }
  } catch (error) {
    result.errors.push(`GET /json/list failed: ${error.message}`);
  }

  return result;
}

async function evaluateJson(client, expression) {
  const result = await client.Runtime.evaluate({
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    const message = result.exceptionDetails.exception?.description ||
      result.exceptionDetails.text ||
      'Unknown evaluation error';
    throw new Error(message);
  }
  return result.result?.value;
}

function jsString(value) {
  return JSON.stringify(value);
}

async function activateTarget(host, port, targetId) {
  await fetch(`http://${host}:${port}/json/activate/${targetId}`, {
    method: 'GET',
    signal: AbortSignal.timeout(5000),
  }).catch(() => {});
}

async function ensureDownloadBehavior(client, downloadPath) {
  await mkdir(downloadPath, { recursive: true });
  try {
    await client.Page.setDownloadBehavior({
      behavior: 'allow',
      downloadPath,
    });
    return { success: true, method: 'Page.setDownloadBehavior' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function classifyDownloadedFiles(downloadDir) {
  const files = await listFilesRecursive(downloadDir);
  const renamed = [];
  for (const file of files) {
    const targetName = detectSbiCsvKind(decodeCsvBuffer(await readFile(file.path)));
    if (!targetName) continue;
    const targetPath = join(downloadDir, targetName);
    if (targetPath !== file.path) {
      await rename(file.path, targetPath).catch(() => {});
    }
    const details = await stat(targetPath).catch(() => null);
    renamed.push({
      path: targetPath,
      mtimeMs: details?.mtimeMs ?? file.mtimeMs,
      size: details?.size ?? file.size,
    });
  }
  return renamed;
}

async function listFilesRecursive(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFilesRecursive(path));
    } else if (entry.isFile()) {
      const details = await stat(path);
      files.push({
        path,
        mtimeMs: details.mtimeMs,
        size: details.size,
      });
    }
  }
  return files;
}

async function snapshotPage(client) {
  return evaluateJson(client, `(() => {
    const norm = (value) => String(value ?? '').replace(/\\s+/g, ' ').trim();
    const visible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style && style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    };
    const clickables = [...document.querySelectorAll(${jsString(CLICKABLE_SELECTOR)})]
      .filter(visible)
      .map((element) => {
        const text = norm(element.innerText || element.value || element.getAttribute('aria-label') || element.title || '');
        if (!text) return null;
        const rect = element.getBoundingClientRect();
        return {
          text,
          tag: element.tagName.toLowerCase(),
          href: element.href || null,
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      })
      .filter(Boolean)
      .slice(0, 200);
    const tables = [...document.querySelectorAll('table')]
      .slice(0, 12)
      .map((table, index) => ({
        index,
        rows: [...table.querySelectorAll('tr')]
          .slice(0, 40)
          .map((row) => [...row.querySelectorAll('th,td')].map((cell) => norm(cell.innerText)).filter(Boolean))
          .filter((row) => row.length > 0),
      }))
      .filter((table) => table.rows.length > 0);
    const labelText = (element) => {
      const fromLabel = element.labels?.[0]?.innerText;
      if (fromLabel) return norm(fromLabel);
      const aria = element.getAttribute('aria-label');
      if (aria) return norm(aria);
      const placeholder = element.getAttribute('placeholder');
      if (placeholder) return norm(placeholder);
      const title = element.getAttribute('title');
      if (title) return norm(title);
      const parentText = element.closest('label, td, th, div, span')?.innerText;
      return norm(parentText || element.name || element.id || '');
    };
    const formControls = [...document.querySelectorAll('input, select, textarea')]
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const base = {
          tag: element.tagName.toLowerCase(),
          type: element.type || null,
          name: element.name || null,
          id: element.id || null,
          value: norm(element.value || ''),
          label: labelText(element),
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
        if (element.tagName.toLowerCase() === 'select') {
          return {
            ...base,
            options: [...element.options].slice(0, 20).map((option) => ({
              text: norm(option.text),
              value: option.value,
              selected: option.selected,
            })),
          };
        }
        return base;
      })
      .slice(0, 120);
    return {
      title: document.title,
      url: location.href,
      text: norm(document.body?.innerText || ''),
      clickables,
      tables,
      formControls,
    };
  })()`);
}

export function pickBestTextCandidate(candidates, keywords) {
  const normalizedKeywords = keywords.map((keyword) => normalizeText(keyword)).filter(Boolean);
  return [...(candidates || [])]
    .map((candidate) => {
      const text = normalizeText(candidate.text);
      let score = 0;
      for (const keyword of normalizedKeywords) {
        if (text === keyword) score += 100;
        else if (text.includes(keyword)) score += 40;
      }
      if (/csv/i.test(text)) score += 10;
      return { ...candidate, score };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score)[0] ?? null;
}

async function clickByKeywords(client, keywords) {
  return evaluateJson(client, `(() => {
    const keywords = ${jsString(keywords)};
    const norm = (value) => String(value ?? '').replace(/\\s+/g, ' ').trim();
    const visible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style && style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    };
    const candidates = [...document.querySelectorAll(${jsString(CLICKABLE_SELECTOR)})]
      .filter(visible)
      .map((element) => {
        const text = norm(element.innerText || element.value || element.getAttribute('aria-label') || element.title || '');
        if (!text) return null;
        let score = 0;
        for (const keyword of keywords) {
          if (text === keyword) score += 100;
          else if (text.includes(keyword)) score += 40;
        }
        if (score === 0) return null;
        return { element, text, score, href: element.href || null };
      })
      .filter(Boolean)
      .sort((left, right) => right.score - left.score);
    if (candidates.length === 0) {
      return { clicked: false, candidates: [] };
    }
    const best = candidates[0];
    best.element.click();
    return {
      clicked: true,
      text: best.text,
      href: best.href,
      candidateCount: candidates.length,
      candidates: candidates.slice(0, 10).map((entry) => ({ text: entry.text, score: entry.score, href: entry.href })),
    };
  })()`);
}

async function waitForPageSettle(client, previousUrl, timeoutMs = 10000) {
  const startedAt = Date.now();
  let lastUrl = previousUrl;
  while (Date.now() - startedAt < timeoutMs) {
    const state = await evaluateJson(client, `(() => ({ url: location.href, readyState: document.readyState }))()`);
    lastUrl = state.url;
    if (state.readyState === 'complete' && (!previousUrl || state.url !== previousUrl || Date.now() - startedAt > 1000)) {
      return state;
    }
    await sleep(500);
  }
  return { url: lastUrl, readyState: 'timeout' };
}

async function navigateToUrl(client, url, timeoutMs = 15000) {
  const previous = await evaluateJson(client, 'location.href');
  await client.Page.navigate({ url });
  return waitForPageSettle(client, previous, timeoutMs);
}

async function tryCsvDownloads(client, downloadDir) {
  const beforeFiles = await listFilesRecursive(downloadDir);
  const csvKeywordsList = [
    ['CSV'],
    ['CSVダウンロード'],
    ['ダウンロード', 'CSV'],
    ['保存', 'CSV'],
    ['出力', 'CSV'],
  ];
  const attempts = [];

  for (const keywords of csvKeywordsList) {
    const clicked = await clickByKeywords(client, keywords);
    attempts.push({ keywords, ...clicked });
    if (!clicked.clicked) continue;
    await sleep(4000);
    const afterFiles = await listFilesRecursive(downloadDir);
    const beforeSet = new Set(beforeFiles.map((entry) => entry.path));
    const newFiles = afterFiles.filter((entry) => !beforeSet.has(entry.path));
    if (newFiles.length > 0) {
      await classifyDownloadedFiles(downloadDir);
      const renamedFiles = await listFilesRecursive(downloadDir);
      return {
        success: true,
        attempts,
        files: renamedFiles.sort((left, right) => right.mtimeMs - left.mtimeMs),
      };
    }
  }

  return { success: false, attempts, files: [] };
}

async function fillFirstDateControl(client, value) {
  return evaluateJson(client, `(() => {
    const targetValue = ${jsString(value)};
    const norm = (input) => String(input ?? '').replace(/\\s+/g, ' ').trim();
    const visible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style && style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    };
    const labelText = (element) => {
      const fromLabel = element.labels?.[0]?.innerText;
      if (fromLabel) return norm(fromLabel);
      return norm(
        element.getAttribute('aria-label') ||
        element.getAttribute('placeholder') ||
        element.name ||
        element.id ||
        element.closest('label, td, th, div, span')?.innerText ||
        '',
      );
    };
    const candidates = [...document.querySelectorAll('input, textarea')]
      .filter((element) => visible(element))
      .filter((element) => {
        const type = String(element.type || '').toLowerCase();
        return !['hidden', 'checkbox', 'radio', 'button', 'submit', 'reset'].includes(type);
      })
      .map((element) => {
        const text = labelText(element);
        const type = String(element.type || '').toLowerCase();
        let score = 0;
        if (type === 'date') score += 100;
        if (/(日付|期間|from|date|開始|から)/i.test(text)) score += 60;
        if (/yyyy|yyyy\/mm\/dd/i.test(text)) score += 30;
        return { element, text, type, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score);
    if (candidates.length === 0) {
      return { updated: false, candidateCount: 0 };
    }
    const best = candidates[0];
    best.element.focus();
    best.element.value = targetValue;
    best.element.dispatchEvent(new Event('input', { bubbles: true }));
    best.element.dispatchEvent(new Event('change', { bubbles: true }));
    return {
      updated: true,
      candidateCount: candidates.length,
      label: best.text,
      type: best.type,
      value: best.element.value,
    };
  })()`);
}

async function trySubmitQuery(client, keywords = ['照会']) {
  const clicked = await clickByKeywords(client, keywords);
  if (!clicked.clicked) return clicked;
  await sleep(2000);
  return clicked;
}

async function captureStage(client, outputDir, name) {
  const snapshot = await snapshotPage(client);
  const safeName = sanitizeName(name);
  await writeFile(join(outputDir, `${safeName}.json`), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  await writeFile(join(outputDir, `${safeName}.txt`), `${snapshot.text}\n`, 'utf8');
  return snapshot;
}

export function buildCaptureSummaryMarkdown(summary) {
  const lines = [
    '# SBI Portfolio Capture Summary',
    '',
    `- generated_at: ${summary.generatedAt}`,
    `- cdp_endpoint: ${summary.cdpEndpoint.host}:${summary.cdpEndpoint.port}`,
    `- target_title: ${summary.target?.title || 'n/a'}`,
    `- target_url: ${summary.target?.url || 'n/a'}`,
    `- dry_run: ${summary.dryRun ? 'true' : 'false'}`,
    '',
    '## Endpoint Probe',
    '',
    `- endpoint_reachable: ${summary.endpointProbe?.reachable ? 'true' : 'false'}`,
    `- version_ok: ${summary.endpointProbe?.versionOk ? 'true' : 'false'}`,
    `- list_ok: ${summary.endpointProbe?.listOk ? 'true' : 'false'}`,
    `- browser: ${summary.endpointProbe?.browser || 'n/a'}`,
    `- protocol_version: ${summary.endpointProbe?.protocolVersion || 'n/a'}`,
    `- target_count: ${summary.endpointProbe?.targetCount ?? 'n/a'}`,
    '',
    '## Capture',
    '',
    `- current_page_saved: ${summary.currentPageSaved ? 'true' : 'false'}`,
    `- every_asset_attempted: ${summary.everyAssetAttempted ? 'true' : 'false'}`,
    `- every_asset_captured: ${summary.everyAssetCaptured ? 'true' : 'false'}`,
    `- account_assets_captured: ${summary.accountAssetsCaptured ? 'true' : 'false'}`,
    `- csv_download_success: ${summary.csvDownload?.success ? 'true' : 'false'}`,
    '',
  ];

  if (summary.endpointProbe?.errors?.length) {
    lines.push('## Endpoint Probe Errors', '');
    for (const error of summary.endpointProbe.errors) {
      lines.push(`- ${error}`);
    }
    lines.push('');
  }

  if (summary.csvDownload?.files?.length) {
    lines.push('## Downloaded Files', '');
    for (const file of summary.csvDownload.files) {
      lines.push(`- ${file.relativePath || file.path}`);
    }
    lines.push('');
  }

  if (summary.routeCaptures?.length) {
    lines.push('## Route Captures', '');
    for (const route of summary.routeCaptures) {
      lines.push(`### ${route.label}`, '');
      lines.push(`- attempted: ${route.attempted ? 'true' : 'false'}`);
      lines.push(`- clicked: ${route.clicked ? 'true' : 'false'}`);
      lines.push(`- captured: ${route.captured ? 'true' : 'false'}`);
      lines.push(`- csv_download_success: ${route.csvDownload?.success ? 'true' : 'false'}`);
      lines.push(`- page_url: ${route.pageUrl || 'n/a'}`);
      if (route.snapshotName) {
        lines.push(`- snapshot: ${route.snapshotName}`);
      }
      if (route.formControlCount !== undefined) {
        lines.push(`- form_controls: ${route.formControlCount}`);
      }
      if (route.csvDownload?.files?.length) {
        lines.push(`- downloaded_files: ${route.csvDownload.files.map((file) => file.relativePath || file.path).join(', ')}`);
      }
      if (route.notes?.length) {
        for (const note of route.notes) {
          lines.push(`- note: ${note}`);
        }
      }
      lines.push('');
    }
  }

  if (summary.notes?.length) {
    lines.push('## Notes', '');
    for (const note of summary.notes) {
      lines.push(`- ${note}`);
    }
    lines.push('');
  }

  return `${lines.join('\n').trim()}\n`;
}

function toRelativeFiles(outputDir, files) {
  return (files || []).map((file) => ({
    ...file,
    relativePath: relative(outputDir, file.path),
  }));
}

function mergeDownloadedFiles(outputDir, existingFiles, newFiles) {
  const mergedByPath = new Map();
  for (const file of [...(existingFiles || []), ...(newFiles || [])]) {
    mergedByPath.set(file.path, {
      ...file,
      relativePath: relative(outputDir, file.path),
    });
  }
  return [...mergedByPath.values()].sort((left, right) => right.mtimeMs - left.mtimeMs);
}

function mergeCsvDownloadResults(outputDir, current, next) {
  const base = current || { success: false, attempts: [], files: [] };
  return {
    success: base.success || next.success,
    attempts: [...(base.attempts || []), ...(next.attempts || [])],
    files: mergeDownloadedFiles(outputDir, base.files || [], next.files || []),
  };
}

async function runFallbackActions(client, outputDir, downloadDir, route, result) {
  if (!route.fallbackActions?.length) return;
  for (const action of route.fallbackActions) {
    const clicked = await clickByKeywords(client, action.keywords);
    result.notes.push(`Fallback action ${action.label}: ${JSON.stringify(clicked)}`);
    if (!clicked.clicked) continue;
    await waitForPageSettle(client, result.pageUrl || ACCOUNT_ASSETS_URL, 12000);
    const snapshot = await captureStage(client, outputDir, action.snapshotName);
    result.notes.push(`Fallback snapshot ${action.snapshotName}: ${snapshot.url}`);
    const csvDownload = await tryCsvDownloads(client, downloadDir);
    result.csvDownload = mergeCsvDownloadResults(outputDir, result.csvDownload, {
      ...csvDownload,
      files: toRelativeFiles(outputDir, csvDownload.files),
    });
  }
}

async function captureRouteFromAccountAssets(client, outputDir, downloadDir, route) {
  const result = {
    key: route.key,
    label: route.label,
    snapshotName: route.snapshotName,
    attempted: true,
    clicked: false,
    captured: false,
    pageUrl: null,
    csvDownload: { success: false, attempts: [], files: [] },
    notes: [],
  };

  const navigation = await navigateToUrl(client, ACCOUNT_ASSETS_URL, 15000).catch((error) => ({
    url: null,
    readyState: `navigation-error:${error.message}`,
  }));
  result.notes.push(`Base navigation: ${JSON.stringify(navigation)}`);

  const clicked = await clickByKeywords(client, route.keywords);
  result.clicked = clicked.clicked;
  result.notes.push(`Click result: ${JSON.stringify(clicked)}`);
  if (!clicked.clicked) {
    return result;
  }

  const pageState = await waitForPageSettle(client, navigation.url || ACCOUNT_ASSETS_URL, 12000);
  result.pageUrl = pageState.url || null;

  if (route.startDate) {
    const fillResult = await fillFirstDateControl(client, route.startDate);
    result.notes.push(`Start-date fill result: ${JSON.stringify(fillResult)}`);
    if (fillResult.updated) {
      const submitResult = await trySubmitQuery(client, ['照会']);
      result.notes.push(`Submit result: ${JSON.stringify(submitResult)}`);
      await waitForPageSettle(client, pageState.url || navigation.url || ACCOUNT_ASSETS_URL, 12000);
    }
  }

  const snapshot = await captureStage(client, outputDir, route.snapshotName);
  result.captured = true;
  result.pageUrl = snapshot.url || result.pageUrl;
  result.formControlCount = snapshot.formControls?.length ?? 0;

  if (route.key === 'usStocks') {
    const marketValue = (snapshot.text || '').match(/米国株式\\s+([0-9,]+)円/);
    if (/現在、お客様の預り情報はございません。/.test(snapshot.text || '')) {
      result.notes.push('US stocks route landed on a page that reports no custody information.');
    }
    if (marketValue?.[1]) {
      result.notes.push(`US market value seen on page text: ${marketValue[1]}円`);
    }
  }

  const csvDownload = await tryCsvDownloads(client, downloadDir);
  result.csvDownload = {
    ...csvDownload,
    files: toRelativeFiles(outputDir, csvDownload.files),
  };
  await runFallbackActions(client, outputDir, downloadDir, route, result);
  return result;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const outputDir = resolve(options.outputDir);
  const downloadDir = join(outputDir, 'downloads');
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(downloadDir, { recursive: true });

  const summary = {
    generatedAt: new Date().toISOString(),
    cdpEndpoint: { host: options.cdpHost, port: options.cdpPort },
    endpointProbe: null,
    dryRun: options.dryRun,
    outputDir,
    target: null,
    currentPageSaved: false,
    everyAssetAttempted: false,
    everyAssetCaptured: false,
    accountAssetsCaptured: false,
    csvDownload: null,
    routeCaptures: [],
    notes: [],
  };
  try {
    summary.endpointProbe = await probeEndpoint(options.cdpHost, options.cdpPort);
    if (!summary.endpointProbe.reachable) {
      throw new Error(`CDP endpoint is unreachable at ${summary.endpointProbe.baseUrl}. Start Chrome with --remote-debugging-port=${options.cdpPort}.`);
    }

    const targets = await listTargets(options.cdpHost, options.cdpPort);
    const target = pickSbiTarget(targets);
    if (!target) {
      throw new Error(`No SBI Securities tab found on the configured CDP endpoint. Found ${targets.length} target(s), but none matched SBI.`);
    }

    summary.target = {
      id: target.id,
      title: target.title,
      url: target.url,
    };
    await writeFile(join(outputDir, 'targets.json'), `${JSON.stringify(targets, null, 2)}\n`, 'utf8');
    await activateTarget(options.cdpHost, options.cdpPort, target.id);

    if (options.dryRun) {
      summary.notes.push('Dry-run mode: target probe only.');
    } else {
      const client = await CDP({ host: options.cdpHost, port: options.cdpPort, target: target.id });
      try {
        await client.Page.enable();
        await client.Runtime.enable();
        const downloadBehavior = await ensureDownloadBehavior(client, downloadDir);
        if (!downloadBehavior.success) {
          summary.notes.push(`Download behavior could not be enabled: ${downloadBehavior.error}`);
        }

        await captureStage(client, outputDir, 'current-page');
        summary.currentPageSaved = true;

        const current = await snapshotPage(client);
        const hasEveryAsset = /毎資産/.test(current.text) || current.clickables.some((candidate) => /毎資産/.test(candidate.text));
        summary.everyAssetAttempted = true;

        if (!/毎資産/.test(current.title + current.text)) {
          const clicked = await clickByKeywords(client, ['毎資産', 'ポートフォリオ', '口座管理']);
          summary.notes.push(`Every-asset navigation click result: ${JSON.stringify(clicked)}`);
          if (clicked.clicked) {
            await waitForPageSettle(client, current.url, 12000);
          }
        }

        const everyAsset = await snapshotPage(client);
        if (/毎資産|資産/.test(everyAsset.title + everyAsset.text) || hasEveryAsset) {
          await captureStage(client, outputDir, 'every-asset-page');
          summary.everyAssetCaptured = true;
        }

        const currentPageCsv = await tryCsvDownloads(client, downloadDir);
        summary.csvDownload = currentPageCsv;
        summary.csvDownload.files = toRelativeFiles(outputDir, summary.csvDownload.files);

        const accountAssetsNavigation = await navigateToUrl(client, ACCOUNT_ASSETS_URL, 15000).catch((error) => ({
          url: null,
          readyState: `navigation-error:${error.message}`,
        }));
        summary.notes.push(`Account-assets navigation result: ${JSON.stringify(accountAssetsNavigation)}`);
        const accountAssets = await snapshotPage(client);
        if (/資産/.test(accountAssets.title + accountAssets.text) || /account\/assets/.test(accountAssets.url)) {
          await captureStage(client, outputDir, 'account-assets-page');
          summary.accountAssetsCaptured = true;
          const accountAssetsCsv = await tryCsvDownloads(client, downloadDir);
          if (accountAssetsCsv.success) {
            summary.csvDownload = {
              success: true,
              attempts: [...summary.csvDownload.attempts, ...accountAssetsCsv.attempts],
              files: mergeDownloadedFiles(outputDir, summary.csvDownload.files, accountAssetsCsv.files),
            };
          } else {
            summary.csvDownload.attempts.push(...accountAssetsCsv.attempts);
          }

          for (const route of ROUTE_DEFINITIONS) {
            const routeCapture = await captureRouteFromAccountAssets(client, outputDir, downloadDir, route);
            summary.routeCaptures.push(routeCapture);
            if (routeCapture.csvDownload?.success) {
              summary.csvDownload = {
                success: true,
                attempts: [...summary.csvDownload.attempts, ...routeCapture.csvDownload.attempts],
                files: mergeDownloadedFiles(outputDir, summary.csvDownload.files, routeCapture.csvDownload.files),
              };
            }
          }
        } else {
          for (const route of ROUTE_DEFINITIONS) {
            summary.routeCaptures.push({
              key: route.key,
              label: route.label,
              snapshotName: route.snapshotName,
              attempted: false,
              clicked: false,
              captured: false,
              pageUrl: null,
              csvDownload: { success: false, attempts: [], files: [] },
              notes: ['Skipped because account-assets page was not captured.'],
            });
          }
        }
      } finally {
        await client.close().catch(() => {});
      }
    }
  } catch (error) {
    summary.notes.push(`Capture failed: ${error.message}`);
    await writeFile(join(outputDir, 'capture-error.txt'), `${error.stack || error.message}\n`, 'utf8');
    await writeFile(join(outputDir, 'capture-summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    await writeFile(join(outputDir, 'capture-summary.md'), buildCaptureSummaryMarkdown(summary), 'utf8');
    throw error;
  }

  await writeFile(join(outputDir, 'capture-summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await writeFile(join(outputDir, 'capture-summary.md'), buildCaptureSummaryMarkdown(summary), 'utf8');

  console.log(JSON.stringify({
    success: true,
    outputDir,
    endpointReachable: summary.endpointProbe?.reachable ?? false,
    endpointTargetCount: summary.endpointProbe?.targetCount ?? null,
    targetTitle: summary.target?.title ?? null,
    targetUrl: summary.target?.url ?? null,
    everyAssetCaptured: summary.everyAssetCaptured,
    accountAssetsCaptured: summary.accountAssetsCaptured,
    csvDownloadSuccess: summary.csvDownload?.success ?? false,
    downloadedFiles: summary.csvDownload?.files?.map((file) => file.relativePath) ?? [],
    dryRun: summary.dryRun,
  }, null, 2));
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (entryPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error?.stack || error?.message || String(error));
    process.exitCode = 1;
  });
}
