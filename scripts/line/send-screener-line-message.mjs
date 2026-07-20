#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const DEFAULT_REPORT_PATH = 'docs/reports/screener/daily-ranking.md';
const DEFAULT_METADATA_PATH = 'docs/reports/screener/daily-ranking-run.json';
const DEFAULT_AUDIT_PATH = 'docs/reports/screener/daily-ranking-audit.json';
const LINE_PUSH_API_URL = 'https://api.line.me/v2/bot/message/push';

function readTextFileIfExists(path) {
  if (!path || !existsSync(path)) return '';
  return readFileSync(path, 'utf8');
}

function readJsonFileIfExists(path) {
  const text = readTextFileIfExists(path);
  if (!text) return null;
  return JSON.parse(text);
}

function resolveRepoFile(relativePath) {
  return join(REPO_ROOT, relativePath);
}

function extractFirstMatch(text, pattern) {
  const match = text.match(pattern);
  return match?.[1]?.trim() || null;
}

function collectTopRankedSymbols(reportText) {
  if (!reportText) return [];

  const lines = reportText.split('\n');
  const headerIndex = lines.findIndex((line) => line.startsWith('| 順位 |') && line.includes('| シンボル |'));
  if (headerIndex === -1) return [];

  const symbols = [];
  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.startsWith('|')) break;
    const cells = line.split('|').map((cell) => cell.trim());
    const symbol = cells[4]?.replaceAll('*', '').trim();
    if (symbol) symbols.push(symbol);
    if (symbols.length >= 3) break;
  }
  return symbols;
}

function extractPhase1TopSector(reportText) {
  return extractFirstMatch(
    reportText,
    /\|\s*1\s*\|\s*([^|]+?)\s*\|/,
  );
}

function extractHeadline(reportText) {
  return extractFirstMatch(
    reportText,
    /(セクター別取得候補.+)/,
  );
}

function extractUpdatedAt(reportText) {
  return extractFirstMatch(
    reportText,
    /更新:\s*(.+)/,
  );
}

export function buildGithubRunUrl(repository, runId) {
  if (!repository || !runId) return null;
  return `https://github.com/${repository}/actions/runs/${runId}`;
}

export function shouldSkipLineNotification({ channelAccessToken, toUserId }) {
  return !channelAccessToken || !toUserId;
}

export function buildLineMessageRequest({ toUserId, text }) {
  return {
    to: toUserId,
    messages: [
      {
        type: 'text',
        text,
      },
    ],
  };
}

export function buildScreenerNotificationText({
  status,
  workflowLabel,
  repository,
  runId,
  runAttempt,
  refName,
  reportText,
  audit,
}) {
  const runUrl = buildGithubRunUrl(repository, runId);
  const lines = [
    `${workflowLabel} ${status === 'success' ? '完了' : '失敗'}`,
    `ref: ${refName || 'unknown'}`,
    `run_attempt: ${runAttempt || 'unknown'}`,
  ];

  if (status === 'success') {
    const updatedAt = extractUpdatedAt(reportText);
    const headline = extractHeadline(reportText);
    const phase1TopSector = extractPhase1TopSector(reportText);
    const topSymbols = collectTopRankedSymbols(reportText);

    if (updatedAt) lines.push(`更新: ${updatedAt}`);
    if (headline) lines.push(headline);
    if (phase1TopSector) lines.push(`Phase1 1位: ${phase1TopSector}`);
    if (topSymbols.length > 0) lines.push(`Top3: ${topSymbols.join(', ')}`);
    if (audit) {
      lines.push(`監査: ${String(audit.status ?? 'unknown').toUpperCase()}`);
      lines.push(`Top10変動: ${audit.summary?.newTop10Entries ?? 0}件`);
      lines.push(`財務指標警告: ${audit.summary?.warnings ?? 0}件`);
      const maxGain = (audit.rankChanges ?? [])[0];
      if (maxGain) {
        lines.push(`最大順位変動: ${maxGain.symbol} ${maxGain.rankDelta > 0 ? '+' : ''}${maxGain.rankDelta}位`);
      }
      (audit.metricAnomalies ?? []).slice(0, 3).forEach((entry) => {
        lines.push(`警告: ${entry.symbol} ${entry.metricName} ${entry.reasons?.[0] ?? entry.status}`);
      });
    }
  } else {
    if (audit) {
      lines.push(`監査: ${String(audit.status ?? 'unknown').toUpperCase()}`);
      lines.push(`重大エラー: ${audit.summary?.errors ?? 0}件`);
      (audit.criticals ?? []).slice(0, 3).forEach((entry) => {
        lines.push(`対象: ${entry.symbol ?? '-'} ${entry.metricName ?? ''} ${entry.reason ?? entry.status ?? ''}`.trim());
      });
    } else {
      lines.push('report は未生成または未読込');
    }
  }

  if (runUrl) lines.push(`run: ${runUrl}`);
  return lines.join('\n');
}

async function pushLineMessage({ channelAccessToken, requestBody }) {
  const response = await fetch(LINE_PUSH_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LINE push failed: ${response.status} ${body}`);
  }
}

function getRuntimeInput() {
  const reportRelativePath = process.env.LINE_REPORT_PATH || DEFAULT_REPORT_PATH;
  const metadataRelativePath = process.env.LINE_METADATA_PATH || DEFAULT_METADATA_PATH;
  const auditRelativePath = process.env.LINE_AUDIT_PATH || DEFAULT_AUDIT_PATH;
  const metadata = readJsonFileIfExists(resolveRepoFile(metadataRelativePath));

  return {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    toUserId: process.env.LINE_TO_USER_ID || '',
    status: process.env.LINE_NOTIFY_STATUS || 'success',
    workflowLabel: process.env.LINE_WORKFLOW_LABEL || metadata?.workflow || 'daily-screener',
    repository: process.env.GITHUB_REPOSITORY || '',
    runId: process.env.GITHUB_RUN_ID || metadata?.run_id || '',
    runAttempt: process.env.GITHUB_RUN_ATTEMPT || metadata?.run_attempt || '',
    refName: process.env.GITHUB_REF_NAME || metadata?.ref_name || '',
    reportText: readTextFileIfExists(resolveRepoFile(reportRelativePath)),
    audit: readJsonFileIfExists(resolveRepoFile(auditRelativePath)),
  };
}

async function main() {
  const input = getRuntimeInput();
  if (shouldSkipLineNotification(input)) {
    console.log('[line] skipped: LINE_CHANNEL_ACCESS_TOKEN or LINE_TO_USER_ID is not set');
    return;
  }

  const text = buildScreenerNotificationText(input);
  const requestBody = buildLineMessageRequest({
    toUserId: input.toUserId,
    text,
  });

  await pushLineMessage({
    channelAccessToken: input.channelAccessToken,
    requestBody,
  });
  console.log(`[line] pushed ${input.status} notification for ${input.workflowLabel}`);
}

const isDirectRun = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isDirectRun) {
  main().catch((error) => {
    console.error(`[line] ${error.message}`);
    process.exitCode = 1;
  });
}
