#!/usr/bin/env node

import CDP from 'chrome-remote-interface';
import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_CDP_HOST = '127.0.0.1';
const DEFAULT_CDP_PORT = 9222;
const DEFAULT_OUTPUT_DIR = 'docs/reports/screener/portfolio/capture/latest';
const DEFAULT_HISTORY_START_DATE = '2022/01/01';
const ACCOUNT_ASSETS_URL = 'https://site.sbisec.co.jp/account/assets';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..', '..');
const WINDOWS_CHROME_FOREGROUND_HELPER = join(PROJECT_ROOT, 'scripts', 'windows', 'focus-chrome-window.ps1');
const CSV_DOWNLOAD_STABILITY = {
  preClickWaitMs: 1500,
  postClickWaitMs: 2000,
  pollIntervalMs: 1000,
  detectionTimeoutMs: 20000,
  retryDelayMs: 2500,
  maxRounds: 2,
  settleStablePolls: 2,
  settleTimeoutMs: 12000,
};
const ROUTE_CAPTURE_STABILITY = {
  maxAttempts: 2,
  retryDelayMs: 2500,
  postNavigationSettleMs: 1500,
};
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
      { label: '保有銘柄', keywords: ['保有銘柄'], snapshotName: 'foreign-holdings-page' },
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
    dateRangeParams: { fromKey: 'baseDateFrom', toKey: 'baseDateTo' },
    fixedQueryParams: { baseDateType: 'CONTRACT', product: 'ALL' },
  },
  {
    key: 'dividendHistory',
    label: '配当金・分配金履歴',
    keywords: ['配当金・分配金履歴'],
    snapshotName: 'dividend-history-page',
    startDate: DEFAULT_HISTORY_START_DATE,
    dateRangeParams: { fromKey: 'dispositionDateFrom', toKey: 'dispositionDateTo' },
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

export function buildCsvDownloadAttemptPlan(keywordSets, maxRounds = CSV_DOWNLOAD_STABILITY.maxRounds) {
  const attempts = [];
  for (let round = 1; round <= maxRounds; round += 1) {
    for (const keywords of keywordSets) {
      attempts.push({ round, keywords });
    }
  }
  return attempts;
}

export function buildRouteCaptureAttemptPlan(maxAttempts = ROUTE_CAPTURE_STABILITY.maxAttempts) {
  return Array.from({ length: Math.max(1, maxAttempts) }, (_value, index) => index + 1);
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

async function bringChromeWindowToFront(interactionContext) {
  if (process.platform !== 'win32') {
    return { success: false, skipped: true, reason: 'non-windows' };
  }

  const preferredTitle = normalizeText(interactionContext?.targetTitle || interactionContext?.currentTitle || '');
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', WINDOWS_CHROME_FOREGROUND_HELPER,
        '-PreferredTitle', preferredTitle,
        '-FallbackTitlePattern', 'SBI証券',
        '-AsJson',
      ],
      {
        cwd: PROJECT_ROOT,
        timeout: 10000,
        maxBuffer: 1024 * 1024,
      },
      (error, stdout, stderr) => {
        const raw = String(stdout || stderr || '').trim();
        let payload = null;
        try {
          payload = raw ? JSON.parse(raw) : null;
        } catch {
          payload = null;
        }

        if (payload) {
          resolve(payload);
          return;
        }

        resolve({
          success: false,
          reason: error ? 'foreground-helper-failed' : 'foreground-helper-unparseable',
          message: raw || error?.message || 'foreground helper produced no output',
        });
      },
    );
  });
}

async function ensureSbiTargetActive(client, interactionContext) {
  if (!interactionContext?.host || !interactionContext?.port || !interactionContext?.targetId) {
    return;
  }

  await activateTarget(interactionContext.host, interactionContext.port, interactionContext.targetId);
  const windowForeground = await bringChromeWindowToFront(interactionContext);
  if (windowForeground?.success && !interactionContext.foregroundSuccessLogged) {
    interactionContext.notes?.push(`OS foreground helper succeeded: ${windowForeground.targetTitle || 'n/a'}`);
    interactionContext.foregroundSuccessLogged = true;
  } else if (!windowForeground?.success && !windowForeground?.skipped) {
    interactionContext.notes?.push(
      `OS foreground helper failed: ${windowForeground?.reason || windowForeground?.message || 'unknown failure'}`,
    );
  }
  await client.Page?.bringToFront?.().catch(() => {});
  await evaluateJson(client, `(() => {
    try {
      window.focus();
      return true;
    } catch {
      return false;
    }
  })()`).catch(() => null);
  await sleep(150);
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

export function diffDownloadStates(beforeFiles, afterFiles) {
  const beforeByPath = new Map((beforeFiles || []).map((file) => [file.path, file]));
  const addedFiles = [];
  const changedFiles = [];

  for (const file of afterFiles || []) {
    const previous = beforeByPath.get(file.path);
    if (!previous) {
      addedFiles.push(file);
      continue;
    }
    if (previous.mtimeMs !== file.mtimeMs || previous.size !== file.size) {
      changedFiles.push(file);
    }
  }

  return {
    addedFiles,
    changedFiles,
    hasMutation: addedFiles.length > 0 || changedFiles.length > 0,
  };
}

export function hasPendingDownloadFiles(files) {
  return (files || []).some((file) => {
    const path = String(file.path || '');
    return /\.crdownload$/i.test(path) || /\.tmp$/i.test(path) || /unconfirmed/i.test(path);
  });
}

export function shouldRetryRouteCapture(route, result) {
  if (!result) return true;
  if (!result.clicked) return true;
  if (!result.captured) return true;
  if (route?.key === 'usStocks') return false;
  return !result.csvDownload?.success;
}

export function shouldUseMouseDispatch(match) {
  if (!match) return false;
  if (match.tag === 'a' && match.href) return false;
  if (match.formAction) return false;
  if (match.type === 'submit') return false;
  return true;
}

async function triggerMatchedElement(client, match, keywords) {
  if (match.tag === 'a' && match.href) {
    if (/^https?:/i.test(match.href)) {
      await client.Page.navigate({ url: match.href }).catch(() => {});
    } else {
      await evaluateJson(client, `(() => {
        const href = ${jsString(match.href)};
        const link = [...document.querySelectorAll('a')].find((element) => element.href === href);
        if (link) link.click();
        return true;
      })()`);
    }
    return;
  }

  if (match.formAction || match.tag === 'button' || match.type === 'submit') {
    const submitResult = await evaluateJson(client, `(() => {
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
          return { element, score };
        })
        .filter(Boolean)
        .sort((left, right) => right.score - left.score);
      const best = candidates[0]?.element;
      if (!best) return { triggered: false, method: 'not-found' };
      best.scrollIntoView({ block: 'center', inline: 'center' });
      if (best.form && typeof best.form.requestSubmit === 'function') {
        best.form.requestSubmit(best);
        return { triggered: true, method: 'requestSubmit' };
      }
      return { triggered: false, method: 'needs-mouse-dispatch' };
    })()`);

    if (submitResult?.triggered) {
      return;
    }
  }

  await client.Input.dispatchMouseEvent({
    type: 'mouseMoved',
    x: match.centerX,
    y: match.centerY,
    button: 'none',
  });
  await client.Input.dispatchMouseEvent({
    type: 'mousePressed',
    x: match.centerX,
    y: match.centerY,
    button: 'left',
    clickCount: 1,
  });
  await client.Input.dispatchMouseEvent({
    type: 'mouseReleased',
    x: match.centerX,
    y: match.centerY,
    button: 'left',
    clickCount: 1,
  });
}

async function clickByKeywords(client, keywords, interactionContext = null) {
  await ensureSbiTargetActive(client, interactionContext);

  const match = await evaluateJson(client, `(() => {
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
        const rect = element.getBoundingClientRect();
        return {
          element,
          text,
          score,
          href: element.href || null,
          tag: element.tagName.toLowerCase(),
          type: element.type || null,
          id: element.id || null,
          name: element.name || null,
          onclick: element.getAttribute('onclick') || null,
          formAction: element.formAction || element.getAttribute('formaction') || element.form?.action || null,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        };
      })
      .filter(Boolean)
      .sort((left, right) => right.score - left.score);
    if (candidates.length === 0) {
      return { clicked: false, candidates: [] };
    }
    const best = candidates[0];
    best.element.scrollIntoView({ block: 'center', inline: 'center' });
    const rect = best.element.getBoundingClientRect();
    return {
      matched: true,
      text: best.text,
      href: best.href,
      tag: best.tag,
      type: best.type,
      id: best.id,
      name: best.name,
      onclick: best.onclick,
      formAction: best.formAction,
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      centerX: Math.round(rect.x + (rect.width / 2)),
      centerY: Math.round(rect.y + (rect.height / 2)),
      candidateCount: candidates.length,
      candidates: candidates.slice(0, 10).map((entry) => ({
        text: entry.text,
        score: entry.score,
        href: entry.href,
        tag: entry.tag,
        type: entry.type,
        id: entry.id,
        name: entry.name,
        onclick: entry.onclick,
        formAction: entry.formAction,
      })),
    };
  })()`);

  if (!match?.matched) {
    return match;
  }

  await triggerMatchedElement(client, match, keywords);

  return {
    clicked: true,
    ...match,
  };
}

async function readPageSettleState(client) {
  return evaluateJson(client, `(() => {
    const norm = (value) => String(value ?? '').replace(/\\s+/g, ' ').trim();
    const visible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style && style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    };
    const text = norm(document.body?.innerText || '');
    const clickableCount = [...document.querySelectorAll(${jsString(CLICKABLE_SELECTOR)})].filter(visible).length;
    const formControlCount = [...document.querySelectorAll('input, select, textarea')].filter(visible).length;
    return {
      url: location.href,
      readyState: document.readyState,
      title: document.title || '',
      textSample: text.slice(0, 240),
      textLength: text.length,
      clickableCount,
      formControlCount,
    };
  })()`);
}

function pageSettleSignature(state) {
  return [
    state?.url || '',
    state?.readyState || '',
    state?.title || '',
    String(state?.textLength ?? ''),
    state?.textSample || '',
    String(state?.clickableCount ?? ''),
    String(state?.formControlCount ?? ''),
  ].join('|');
}

async function waitForPageSettle(client, previousUrl, timeoutMs = 10000) {
  const startedAt = Date.now();
  let lastState = { url: previousUrl, readyState: 'unknown' };
  let lastSignature = null;
  let stablePolls = 0;
  while (Date.now() - startedAt < timeoutMs) {
    const state = await readPageSettleState(client);
    lastState = state;
    const signature = pageSettleSignature(state);
    stablePolls = signature === lastSignature ? stablePolls + 1 : 1;
    lastSignature = signature;
    const urlChanged = !previousUrl || state.url !== previousUrl;
    const stableEnough = stablePolls >= CSV_DOWNLOAD_STABILITY.settleStablePolls;
    if (state.readyState === 'complete' && stableEnough && (urlChanged || Date.now() - startedAt > 1000)) {
      return state;
    }
    await sleep(500);
  }
  return { ...lastState, readyState: 'timeout' };
}

async function navigateToUrl(client, url, timeoutMs = 15000, interactionContext = null) {
  await ensureSbiTargetActive(client, interactionContext);
  const previous = await evaluateJson(client, 'location.href');
  await client.Page.navigate({ url });
  return waitForPageSettle(client, previous, timeoutMs);
}

async function tryCsvDownloads(client, downloadDir, interactionContext = null) {
  const csvKeywordsList = [
    ['CSV'],
    ['CSVダウンロード'],
    ['ダウンロード', 'CSV'],
    ['保存', 'CSV'],
    ['出力', 'CSV'],
  ];
  const attempts = [];
  const keywordAttempts = buildCsvDownloadAttemptPlan(csvKeywordsList);

  for (const keywordAttempt of keywordAttempts) {
    const { round, keywords } = keywordAttempt;
    if (round > 1) {
      await sleep(CSV_DOWNLOAD_STABILITY.retryDelayMs);
    }
    await ensureSbiTargetActive(client, interactionContext);
    await sleep(CSV_DOWNLOAD_STABILITY.preClickWaitMs);
    const beforeFiles = await listFilesRecursive(downloadDir);
    const clicked = await clickByKeywords(client, keywords, interactionContext);
    attempts.push({
      round,
      keywords,
      preClickWaitMs: CSV_DOWNLOAD_STABILITY.preClickWaitMs,
      postClickWaitMs: CSV_DOWNLOAD_STABILITY.postClickWaitMs,
      detectionTimeoutMs: CSV_DOWNLOAD_STABILITY.detectionTimeoutMs,
      retryDelayMs: round > 1 ? CSV_DOWNLOAD_STABILITY.retryDelayMs : 0,
      ...clicked,
    });
    if (!clicked.clicked) continue;

    let downloadDetected = null;
    await sleep(CSV_DOWNLOAD_STABILITY.postClickWaitMs);
    const startedAt = Date.now();
    let stablePolls = 0;
    while (Date.now() - startedAt < CSV_DOWNLOAD_STABILITY.detectionTimeoutMs) {
      await sleep(CSV_DOWNLOAD_STABILITY.pollIntervalMs);
      const afterFiles = await listFilesRecursive(downloadDir);
      const mutation = diffDownloadStates(beforeFiles, afterFiles);
      if (!mutation.hasMutation) continue;
      if (hasPendingDownloadFiles(afterFiles)) {
        stablePolls = 0;
        downloadDetected = mutation;
        continue;
      }
      stablePolls += 1;
      downloadDetected = mutation;
      if (stablePolls >= CSV_DOWNLOAD_STABILITY.settleStablePolls) {
        downloadDetected = mutation;
        break;
      }
    }

    if (downloadDetected) {
      await classifyDownloadedFiles(downloadDir);
      const renamedFiles = await listFilesRecursive(downloadDir);
      return {
        success: true,
        attempts: attempts.map((attempt, index) => (
          index === attempts.length - 1
            ? {
              ...attempt,
              detectedAddedFiles: downloadDetected.addedFiles.map((file) => file.path),
              detectedChangedFiles: downloadDetected.changedFiles.map((file) => file.path),
            }
            : attempt
        )),
        files: renamedFiles.sort((left, right) => right.mtimeMs - left.mtimeMs),
      };
    }
  }

  return { success: false, attempts, files: [] };
}

async function inspectCsvDownloadTargets(client, keywordsList = [['CSV'], ['CSVダウンロード']]) {
  return evaluateJson(client, `(() => {
    const keywordSets = ${jsString(keywordsList)};
    const norm = (value) => String(value ?? '').replace(/\\s+/g, ' ').trim();
    const visible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style && style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    };
    const describeForm = (form) => {
      if (!form) return null;
      const hiddenInputs = [...form.querySelectorAll('input[type="hidden"]')]
        .slice(0, 20)
        .map((input) => ({
          name: input.name || null,
          value: norm(input.value || ''),
        }));
      return {
        action: form.action || null,
        method: (form.method || 'get').toLowerCase(),
        target: form.target || null,
        hiddenInputs,
      };
    };
    const candidates = [...document.querySelectorAll(${jsString(CLICKABLE_SELECTOR)})]
      .filter(visible)
      .map((element) => {
        const text = norm(element.innerText || element.value || element.getAttribute('aria-label') || element.title || '');
        if (!text) return null;
        const matchedKeywords = keywordSets.filter((keywords) => keywords.every((keyword) => text.includes(keyword)));
        if (matchedKeywords.length === 0) return null;
        return {
          text,
          tag: element.tagName.toLowerCase(),
          type: element.type || null,
          id: element.id || null,
          name: element.name || null,
          value: element.value || null,
          href: element.href || null,
          onclick: element.getAttribute('onclick') || null,
          formAction: element.formAction || element.getAttribute('formaction') || element.form?.action || null,
          outerHtml: (element.outerHTML || '').slice(0, 500),
          matchedKeywords,
          form: describeForm(element.form || null),
        };
      })
      .filter(Boolean)
      .slice(0, 10);
    return {
      candidateCount: candidates.length,
      candidates,
    };
  })()`);
}

async function fillFirstDateControl(client, value, interactionContext = null) {
  await ensureSbiTargetActive(client, interactionContext);
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
        if (/^\\d{4}\\/\\d{2}\\/\\d{2}$/.test(norm(element.value || ''))) score += 80;
        if (/yyyy|yyyy\\\/mm\\\/dd/i.test(text)) score += 30;
        return {
          element,
          text,
          type,
          score,
          x: Math.round(element.getBoundingClientRect().x),
          y: Math.round(element.getBoundingClientRect().y),
        };
      })
      .filter((entry) => entry.score > 0)
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        if (left.y !== right.y) return left.y - right.y;
        return left.x - right.x;
      });
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

async function trySubmitQuery(client, keywords = ['照会'], interactionContext = null) {
  const previousUrl = await evaluateJson(client, 'location.href');
  const clicked = await clickByKeywords(client, keywords, interactionContext);
  if (!clicked.clicked) return clicked;
  const settle = await waitForPageSettle(client, previousUrl, CSV_DOWNLOAD_STABILITY.settleTimeoutMs);
  return { ...clicked, settle };
}

async function readVisibleDateValues(client) {
  return evaluateJson(client, `(() => {
    const visible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style && style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    };
    return [...document.querySelectorAll('input, textarea')]
      .filter((element) => visible(element))
      .map((element) => String(element.value || '').trim())
      .filter((value) => /^\\d{4}\\/\\d{2}\\/\\d{2}$/.test(value))
      .slice(0, 4);
  })()`);
}

export function replaceDateRangeInUrl(currentUrl, params, fromValue, toValue, fixedQueryParams = null) {
  try {
    const url = new URL(currentUrl);
    url.searchParams.set(params.fromKey, fromValue);
    url.searchParams.set(params.toKey, toValue);
    for (const [key, value] of Object.entries(fixedQueryParams || {})) {
      url.searchParams.set(key, value);
    }
    url.searchParams.delete('period');
    return url.toString();
  } catch {
    return null;
  }
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
      if (route.csvDiagnostics?.candidateCount !== undefined) {
        lines.push(`- csv_candidates: ${route.csvDiagnostics.candidateCount}`);
      }
      const bestCandidate = route.csvDiagnostics?.candidates?.[0];
      if (bestCandidate) {
        lines.push(`- csv_candidate_tag: ${bestCandidate.tag || 'n/a'}`);
        lines.push(`- csv_candidate_name: ${bestCandidate.name || 'n/a'}`);
        lines.push(`- csv_candidate_form_action: ${bestCandidate.form?.action || bestCandidate.formAction || 'n/a'}`);
        lines.push(`- csv_candidate_form_method: ${bestCandidate.form?.method || 'n/a'}`);
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

async function runFallbackActions(client, outputDir, downloadDir, route, result, interactionContext) {
  if (!route.fallbackActions?.length) return;
  for (const action of route.fallbackActions) {
    const clicked = await clickByKeywords(client, action.keywords, interactionContext);
    result.notes.push(`Fallback action ${action.label}: ${JSON.stringify(clicked)}`);
    if (!clicked.clicked) continue;
    await waitForPageSettle(client, result.pageUrl || ACCOUNT_ASSETS_URL, 12000);
    const snapshot = await captureStage(client, outputDir, action.snapshotName);
    result.notes.push(`Fallback snapshot ${action.snapshotName}: ${snapshot.url}`);
    const csvDownload = await tryCsvDownloads(client, downloadDir, interactionContext);
    result.csvDownload = mergeCsvDownloadResults(outputDir, result.csvDownload, {
      ...csvDownload,
      files: toRelativeFiles(outputDir, csvDownload.files),
    });
  }
}

async function captureRouteFromAccountAssets(client, outputDir, downloadDir, route, interactionContext) {
  let bestResult = null;
  for (const attempt of buildRouteCaptureAttemptPlan()) {
    if (attempt > 1) {
      await sleep(ROUTE_CAPTURE_STABILITY.retryDelayMs);
    }
    const attemptResult = await captureRouteFromAccountAssetsOnce(client, outputDir, downloadDir, route, attempt, interactionContext);
    if (!bestResult || (attemptResult.csvDownload?.success && !bestResult.csvDownload?.success) || (attemptResult.captured && !bestResult.captured)) {
      bestResult = attemptResult;
    }
    if (!shouldRetryRouteCapture(route, attemptResult)) {
      return attemptResult;
    }
  }
  return bestResult;
}

async function captureRouteFromAccountAssetsOnce(client, outputDir, downloadDir, route, attempt, interactionContext) {
  const result = {
    key: route.key,
    label: route.label,
    snapshotName: route.snapshotName,
    attempt,
    attempted: true,
    clicked: false,
    captured: false,
    pageUrl: null,
    csvDownload: { success: false, attempts: [], files: [] },
    notes: [],
  };

  const navigation = await navigateToUrl(client, ACCOUNT_ASSETS_URL, 15000, interactionContext).catch((error) => ({
    url: null,
    readyState: `navigation-error:${error.message}`,
  }));
  result.notes.push(`Attempt ${attempt}: base navigation: ${JSON.stringify(navigation)}`);

  const clicked = await clickByKeywords(client, route.keywords, interactionContext);
  result.clicked = clicked.clicked;
  result.notes.push(`Attempt ${attempt}: click result: ${JSON.stringify(clicked)}`);
  if (!clicked.clicked) {
    return result;
  }

  const pageState = await waitForPageSettle(client, navigation.url || ACCOUNT_ASSETS_URL, 12000);
  result.pageUrl = pageState.url || null;
  await sleep(ROUTE_CAPTURE_STABILITY.postNavigationSettleMs);
  result.notes.push(`Attempt ${attempt}: post-navigation settle wait: ${ROUTE_CAPTURE_STABILITY.postNavigationSettleMs}ms`);

  if (route.startDate) {
    const fillResult = await fillFirstDateControl(client, route.startDate, interactionContext);
    result.notes.push(`Attempt ${attempt}: start-date fill result: ${JSON.stringify(fillResult)}`);
    if (fillResult.updated) {
      const submitResult = await trySubmitQuery(client, ['照会'], interactionContext);
      result.notes.push(`Attempt ${attempt}: submit result: ${JSON.stringify(submitResult)}`);
      await waitForPageSettle(client, pageState.url || navigation.url || ACCOUNT_ASSETS_URL, 12000);
      if (route.dateRangeParams) {
        const currentUrl = await evaluateJson(client, 'location.href');
        const dateValues = await readVisibleDateValues(client);
        const toDate = dateValues[1] || dateValues[0] || new Date().toISOString().slice(0, 10).replace(/-/g, '/');
        const rangedUrl = replaceDateRangeInUrl(
          currentUrl,
          route.dateRangeParams,
          route.startDate,
          toDate,
          route.fixedQueryParams,
        );
        result.notes.push(`Attempt ${attempt}: range URL candidate: ${rangedUrl || 'n/a'}`);
        if (rangedUrl && rangedUrl !== currentUrl) {
          const forcedNavigation = await navigateToUrl(client, rangedUrl, 15000, interactionContext).catch((error) => ({
            url: null,
            readyState: `navigation-error:${error.message}`,
          }));
          result.notes.push(`Attempt ${attempt}: forced range navigation: ${JSON.stringify(forcedNavigation)}`);
          await sleep(ROUTE_CAPTURE_STABILITY.postNavigationSettleMs);
          result.notes.push(`Attempt ${attempt}: post-range-navigation settle wait: ${ROUTE_CAPTURE_STABILITY.postNavigationSettleMs}ms`);
        }
      }
    }
  }

  const snapshot = await captureStage(client, outputDir, route.snapshotName);
  result.captured = true;
  result.pageUrl = snapshot.url || result.pageUrl;
  result.formControlCount = snapshot.formControls?.length ?? 0;
  result.csvDiagnostics = await inspectCsvDownloadTargets(client);
  result.notes.push(`Attempt ${attempt}: CSV diagnostics: ${JSON.stringify(result.csvDiagnostics)}`);

  if (route.key === 'usStocks') {
    const marketValue = (snapshot.text || '').match(/米国株式\\s+([0-9,]+)円/);
    if (/現在、お客様の預り情報はございません。/.test(snapshot.text || '')) {
      result.notes.push('US stocks route landed on a page that reports no custody information.');
    }
    if (marketValue?.[1]) {
      result.notes.push(`US market value seen on page text: ${marketValue[1]}円`);
    }
  }

  const csvDownload = await tryCsvDownloads(client, downloadDir, interactionContext);
  result.csvDownload = {
    ...csvDownload,
    files: toRelativeFiles(outputDir, csvDownload.files),
  };
  await runFallbackActions(client, outputDir, downloadDir, route, result, interactionContext);
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
        await client.Input?.enable?.().catch(() => {});
        const downloadBehavior = await ensureDownloadBehavior(client, downloadDir);
        if (!downloadBehavior.success) {
          summary.notes.push(`Download behavior could not be enabled: ${downloadBehavior.error}`);
        }

        const interactionContext = {
          host: options.cdpHost,
          port: options.cdpPort,
          targetId: target.id,
          targetTitle: target.title,
          notes: summary.notes,
          foregroundSuccessLogged: false,
        };

        await captureStage(client, outputDir, 'current-page');
        summary.currentPageSaved = true;

        const current = await snapshotPage(client);
        const hasEveryAsset = /毎資産/.test(current.text) || current.clickables.some((candidate) => /毎資産/.test(candidate.text));
        summary.everyAssetAttempted = true;

        if (!/毎資産/.test(current.title + current.text)) {
          const clicked = await clickByKeywords(client, ['毎資産', 'ポートフォリオ', '口座管理'], interactionContext);
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

        const currentPageCsv = await tryCsvDownloads(client, downloadDir, interactionContext);
        summary.csvDownload = currentPageCsv;
        summary.csvDownload.files = toRelativeFiles(outputDir, summary.csvDownload.files);

        const accountAssetsNavigation = await navigateToUrl(client, ACCOUNT_ASSETS_URL, 15000, interactionContext).catch((error) => ({
          url: null,
          readyState: `navigation-error:${error.message}`,
        }));
        summary.notes.push(`Account-assets navigation result: ${JSON.stringify(accountAssetsNavigation)}`);
        const accountAssets = await snapshotPage(client);
        if (/資産/.test(accountAssets.title + accountAssets.text) || /account\/assets/.test(accountAssets.url)) {
          await captureStage(client, outputDir, 'account-assets-page');
          summary.accountAssetsCaptured = true;
          const accountAssetsCsv = await tryCsvDownloads(client, downloadDir, interactionContext);
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
            const routeCapture = await captureRouteFromAccountAssets(client, outputDir, downloadDir, route, interactionContext);
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
