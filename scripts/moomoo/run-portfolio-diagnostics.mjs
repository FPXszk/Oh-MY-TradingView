#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getMoomooPortfolioDiagnostics } from '../../src/core/moomoo.js';

const DEFAULT_REPORT_PATH = 'docs/reports/screener/portfolio/moomoo_portfolio_diagnostics.md';
const DEFAULT_JSON_PATH = 'docs/reports/screener/portfolio/moomoo_portfolio_diagnostics.json';

function envString(name, defaultValue) {
  const value = process.env[name];
  if (typeof value !== 'string' || value.trim() === '') return defaultValue;
  return value.trim();
}

function envOptionalString(name) {
  const value = process.env[name];
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  return value.trim();
}

function envBoolean(name, defaultValue = false) {
  const value = process.env[name];
  if (typeof value !== 'string' || value.trim() === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || value === '') return 'n/a';
  const number = Number(value);
  if (!Number.isFinite(number)) return 'n/a';
  return number.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatPct(value) {
  if (value === null || value === undefined || value === '') return 'n/a';
  const number = Number(value);
  if (!Number.isFinite(number)) return 'n/a';
  return `${number.toFixed(2)}%`;
}

function maskAccountId(value) {
  const text = String(value ?? '');
  if (text.length <= 4) return text || 'n/a';
  if (/^\*+[^*]{4}$/.test(text)) return text;
  return `${'*'.repeat(Math.max(0, text.length - 4))}${text.slice(-4)}`;
}

function renderPositionRows(positions) {
  if (!Array.isArray(positions) || positions.length === 0) {
    return '| Symbol | Name | Qty | Market Value | Unrealized P/L | Weight |\n|---|---|---:|---:|---:|---:|\n| n/a | n/a | n/a | n/a | n/a | n/a |';
  }

  const rows = positions.map((position) => [
    `\`${position.symbol || 'n/a'}\``,
    position.name || 'n/a',
    formatNumber(position.qty),
    formatNumber(position.marketValue),
    formatNumber(position.unrealizedPl),
    formatPct(position.weightPct),
  ]);

  return [
    '| Symbol | Name | Qty | Market Value | Unrealized P/L | Weight |',
    '|---|---|---:|---:|---:|---:|',
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

export function sanitizePortfolioDiagnosticsResult(result) {
  return {
    ...result,
    accounts: Array.isArray(result.accounts)
      ? result.accounts.map((entry) => ({
        ...entry,
        account: {
          ...(entry.account || {}),
          accId: maskAccountId(entry.account?.accId),
        },
      }))
      : [],
  };
}

export function buildPortfolioDiagnosticsReport(result, metadata = {}) {
  const totals = result.totals || {};
  const lines = [
    '# Moomoo Portfolio Diagnostics',
    '',
    `Generated at: ${metadata.generatedAt || result.retrieved_at || new Date().toISOString()}`,
    '',
    'Read-only diagnostics only. This report does not place, modify, cancel, or unlock trades.',
    '',
    '## Summary',
    '',
    '| Metric | Value |',
    '|---|---:|',
    `| Account count | ${formatNumber(totals.accountCount, 0)} |`,
    `| REAL account count | ${formatNumber(totals.realAccountCount, 0)} |`,
    `| SIMULATE account count | ${formatNumber(totals.simulateAccountCount, 0)} |`,
    `| Position count | ${formatNumber(totals.positionCount, 0)} |`,
    `| Total assets | ${formatNumber(totals.totalAssets)} |`,
    `| Cash | ${formatNumber(totals.cash)} |`,
    `| Market value | ${formatNumber(totals.marketValue)} |`,
    `| Unrealized P/L | ${formatNumber(totals.unrealizedPl)} |`,
    `| Cash ratio | ${formatPct(totals.cashRatioPct)} |`,
    `| Invested ratio | ${formatPct(totals.investedRatioPct)} |`,
    '',
    '## Accounts',
    '',
  ];

  const accounts = Array.isArray(result.accounts) ? result.accounts : [];
  if (accounts.length === 0) {
    lines.push('No accounts matched the requested filters.', '');
  }

  for (const entry of accounts) {
    const account = entry.account || {};
    const summary = entry.summary || {};
    lines.push(
      `### Account ${maskAccountId(account.accId)} (${account.trdEnv || 'n/a'})`,
      '',
      '| Metric | Value |',
      '|---|---:|',
      `| Currency | ${entry.currency || result.currency || 'n/a'} |`,
      `| Account type | ${account.accType || 'n/a'} |`,
      `| Position count | ${formatNumber(summary.positionCount, 0)} |`,
      `| Total assets | ${formatNumber(summary.totalAssets)} |`,
      `| Cash | ${formatNumber(summary.cash)} |`,
      `| Market value | ${formatNumber(summary.marketValue)} |`,
      `| Unrealized P/L | ${formatNumber(summary.unrealizedPl)} |`,
      `| Top position weight | ${formatPct(summary.topPositionWeightPct)} |`,
      '',
      renderPositionRows(entry.positions),
      '',
    );
  }

  if (Array.isArray(result.notes) && result.notes.length > 0) {
    lines.push('## Notes', '');
    for (const note of result.notes) {
      lines.push(`- ${note}`);
    }
    lines.push('');
  }

  if (metadata.workflowRunId) {
    lines.push('## Workflow', '');
    lines.push(`- run_id: ${metadata.workflowRunId}`);
    lines.push(`- run_attempt: ${metadata.workflowRunAttempt || 'n/a'}`);
    lines.push(`- ref_name: ${metadata.refName || 'n/a'}`);
    lines.push('');
  }

  return `${lines.join('\n').trim()}\n`;
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeText(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value, 'utf8');
}

async function main() {
  const reportPath = envString('MOOMOO_PORTFOLIO_REPORT_PATH', DEFAULT_REPORT_PATH);
  const jsonPath = envString('MOOMOO_PORTFOLIO_JSON_PATH', DEFAULT_JSON_PATH);
  const generatedAt = new Date().toISOString();

  const result = await getMoomooPortfolioDiagnostics({
    market: envString('MOOMOO_PORTFOLIO_MARKET', 'US'),
    trdEnv: envOptionalString('MOOMOO_PORTFOLIO_TRD_ENV'),
    accountId: envOptionalString('MOOMOO_PORTFOLIO_ACCOUNT_ID'),
    currency: envString('MOOMOO_PORTFOLIO_CURRENCY', 'USD'),
    includeSimulate: envBoolean('MOOMOO_PORTFOLIO_INCLUDE_SIMULATE', false),
    refreshCache: envBoolean('MOOMOO_PORTFOLIO_REFRESH_CACHE', true),
  });
  const sanitizedResult = sanitizePortfolioDiagnosticsResult(result);

  const payload = {
    ...sanitizedResult,
    workflow: {
      runId: envOptionalString('GITHUB_RUN_ID'),
      runAttempt: envOptionalString('GITHUB_RUN_ATTEMPT'),
      runNumber: envOptionalString('GITHUB_RUN_NUMBER'),
      refName: envOptionalString('GITHUB_REF_NAME'),
      sha: envOptionalString('GITHUB_SHA'),
      generatedAt,
    },
  };
  const report = buildPortfolioDiagnosticsReport(sanitizedResult, {
    generatedAt,
    workflowRunId: envOptionalString('GITHUB_RUN_ID'),
    workflowRunAttempt: envOptionalString('GITHUB_RUN_ATTEMPT'),
    refName: envOptionalString('GITHUB_REF_NAME'),
  });

  await writeJson(jsonPath, payload);
  await writeText(reportPath, report);

  console.log(JSON.stringify({
    success: true,
    reportPath,
    jsonPath,
    accountCount: result.totals?.accountCount ?? 0,
    positionCount: result.totals?.positionCount ?? 0,
    readOnly: true,
  }));
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (entryPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error?.stack || error?.message || String(error));
    process.exitCode = 1;
  });
}
