#!/usr/bin/env node
/**
 * GitHub Actions entry point for the daily fundamental screener.
 * Calls runFundamentalScreener, writes docs/reports/screener/daily-ranking.md,
 * then commits and pushes via git.
 *
 * Expected env vars (GitHub Actions sets these):
 *   GITHUB_ACTOR  – used for git author
 *   GITHUB_WORKSPACE (optional) – used to locate repo root
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { runFundamentalScreener } from '../../src/core/fundamental-screener.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const REPORT_PATH = join(REPO_ROOT, 'docs', 'reports', 'screener', 'daily-ranking.md');

function formatBigNumber(n) {
  if (n === null || n === undefined) return 'N/A';
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  return n.toFixed(0);
}

function fmt(val, digits = 1, suffix = '') {
  if (val === null || val === undefined) return 'N/A';
  return Number(val).toFixed(digits) + suffix;
}

function buildMarkdown(result) {
  const now = new Date(result.retrieved_at);
  const jst = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(now);

  const lines = [
    '# ファンダメンタル × モメンタム スクリーニング 上位10件',
    '',
    `更新: ${result.retrieved_at}（JST ${jst}）`,
    '',
    `スキャン対象: ${result.totalScanned.toLocaleString()} 銘柄 → サーバーフィルター通過: ${result.serverFiltered} → クライアントフィルター通過: ${result.clientFiltered} → 上位: ${result.matched}`,
    '',
  ];

  if (result.results.length === 0) {
    lines.push('> 本日は条件を満たす銘柄がありませんでした。');
    lines.push('');
  } else {
    lines.push('| 順位 | シンボル | 現在値 | RSI | Perf.3M | ROE | FCFマージン | 粗利率 | P/FCF | ネット負債 |');
    lines.push('|:---:|:---|---:|---:|---:|---:|---:|---:|---:|---:|');
    result.results.forEach((r, i) => {
      const netDebtStr = r.netDebt !== null
        ? (r.netDebt < 0 ? `**${formatBigNumber(r.netDebt)}**` : formatBigNumber(r.netDebt))
        : 'N/A';
      lines.push(
        `| ${i + 1} | **${r.symbol}** (${r.exchange ?? '-'}) | $${fmt(r.close, 2)} | ${fmt(r.rsi14)} | ${fmt(r.perf3m)}% | ${fmt(r.roe)}% | ${fmt(r.fcfMargin)}% | ${fmt(r.grossMargin)}% | ${fmt(r.pFcf)} | ${netDebtStr} |`,
      );
    });
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('**スコア算出:** `rank(Perf.3M) + rank(ROE) + rank(FCFマージン)`（合計が小さいほど上位）');
  lines.push('');
  lines.push('**フィルター条件:**');
  lines.push('- RSI(14) > 60, 時価総額 > $1B, 相対出来高 > 1.2x');
  lines.push('- EPS(TTM) > 0, ROE > 15%, 粗利率(TTM) > 40%, FCFマージン(TTM) > 10%');
  lines.push('- Close > SMA200, Close > SMA50, Close ≥ 52週高値 × 75%');
  lines.push('- Perf.3M > 10%, P/FCF < 50');

  return lines.join('\n');
}

async function main() {
  console.log('[screener] Starting fundamental screener...');

  let result;
  try {
    result = await runFundamentalScreener({ limit: 10 });
  } catch (err) {
    console.error('[screener] ERROR:', err.message);
    process.exit(1);
  }

  console.log(`[screener] totalScanned=${result.totalScanned} serverFiltered=${result.serverFiltered} clientFiltered=${result.clientFiltered} matched=${result.matched}`);

  const md = buildMarkdown(result);
  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, md, 'utf8');
  console.log(`[screener] Report written to ${REPORT_PATH}`);

  // Git commit and push
  try {
    execSync('git config user.name "github-actions[bot]"', { cwd: REPO_ROOT });
    execSync('git config user.email "github-actions[bot]@users.noreply.github.com"', { cwd: REPO_ROOT });
    execSync(`git add "${REPORT_PATH}"`, { cwd: REPO_ROOT });

    const status = execSync('git status --porcelain', { cwd: REPO_ROOT }).toString().trim();
    if (!status) {
      console.log('[screener] No changes to commit.');
      return;
    }

    execSync('git commit -m "chore: update daily screener ranking [skip ci]"', { cwd: REPO_ROOT });
    execSync('git push', { cwd: REPO_ROOT });
    console.log('[screener] Committed and pushed.');
  } catch (err) {
    console.error('[screener] Git error:', err.message);
    process.exit(1);
  }
}

main();
