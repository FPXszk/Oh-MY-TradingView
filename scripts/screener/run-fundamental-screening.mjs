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

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { runFundamentalScreener } from '../../src/core/fundamental-screener.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const REPORT_PATH = join(REPO_ROOT, 'docs', 'reports', 'screener', 'daily-ranking.md');

function fmt(val, digits = 1, suffix = '') {
  if (val === null || val === undefined) return 'N/A';
  return Number(val).toFixed(digits) + suffix;
}

function findStrengths(row) {
  const breakdown = Object.entries(row.rankBreakdown ?? {});
  const sorted = breakdown.sort((a, b) => a[1] - b[1]);
  return {
    strongest: sorted[0] ?? null,
    second: sorted[1] ?? null,
    weakest: sorted[sorted.length - 1] ?? null,
  };
}

function formatRankField(field) {
  switch (field) {
    case 'perf3m':
      return '3か月モメンタム';
    case 'roe':
      return 'ROE';
    case 'fcfMargin':
      return 'FCFマージン';
    case 'revenueGrowth':
      return '売上成長率';
    default:
      return field;
  }
}

function buildExplanation(row, index, rows) {
  const { strongest, second, weakest } = findStrengths(row);
  const previous = index > 0 ? rows[index - 1] : null;
  const next = index < rows.length - 1 ? rows[index + 1] : null;
  const parts = [];

  if (strongest) {
    parts.push(`${formatRankField(strongest[0])}が候補群で${strongest[1]}位`);
  }
  if (second && second[0] !== strongest?.[0]) {
    parts.push(`${formatRankField(second[0])}も${second[1]}位`);
  }
  if (next) {
    parts.push(`${next.symbol}より総合点が${next.rankScore - row.rankScore}点良い`);
  } else if (previous) {
    parts.push(`${previous.symbol}との差は総合点で${row.rankScore - previous.rankScore}点`);
  }
  if (weakest && weakest[1] > 3) {
    parts.push(`一方で${formatRankField(weakest[0])}は${weakest[1]}位で弱点`);
  }

  return parts.join('、') + '。';
}

function buildMarketLines(label, entries) {
  if (!entries || entries.length === 0) {
    return `- ${label}: データなし`;
  }
  return `- ${label}: ${entries.map((entry) => `${entry.name} ${entry.count}件`).join(', ')}`;
}

export function buildMarkdown(result) {
  const now = new Date(result.retrieved_at);
  const jst = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(now);
  const topFive = result.results.slice(0, 5);

  const lines = [
    '# ファンダメンタル × モメンタム スクリーニング 上位20件',
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
    lines.push('## 上位5件の選定理由');
    lines.push('');
    topFive.forEach((row, index) => {
      lines.push(`### ${index + 1}位 ${row.symbol} (${row.exchange ?? '-'})`);
      lines.push(`- 総合点: ${row.rankScore}`);
      lines.push(`- 内訳: 3M ${row.rankBreakdown?.perf3m ?? 'N/A'}位 / ROE ${row.rankBreakdown?.roe ?? 'N/A'}位 / FCF ${row.rankBreakdown?.fcfMargin ?? 'N/A'}位${row.rankBreakdown?.revenueGrowth ? ` / 売上成長 ${row.rankBreakdown.revenueGrowth}位` : ''}`);
      lines.push(`- 理由: ${buildExplanation(row, index, topFive)}`);
      lines.push('');
    });

    lines.push('## 銘柄ランキング');
    lines.push('');
    lines.push('| 順位 | シンボル | セクター | 市場 | 現在値 | Perf.3M | ROE | FCFマージン | 売上成長 | 総合点 |');
    lines.push('|:---:|:---|:---|:---:|---:|---:|---:|---:|---:|---:|');
    result.results.forEach((r, i) => {
      lines.push(
        `| ${i + 1} | **${r.symbol}** | ${r.sector ?? 'N/A'} | ${r.exchange ?? '-'} | $${fmt(r.close, 2)} | ${fmt(r.perf3m)}% | ${fmt(r.roe)}% | ${fmt(r.fcfMargin)}% | ${r.revenueGrowth === null || r.revenueGrowth === undefined ? 'N/A' : fmt(r.revenueGrowth * 100)}% | ${r.rankScore} |`,
      );
    });
    lines.push('');
  }

  lines.push('## セクターランキング');
  lines.push('');
  if (!result.sectorRanking || result.sectorRanking.length === 0) {
    lines.push('- 条件通過銘柄がないため、セクター順位は算出できませんでした。');
  } else {
    lines.push('| 順位 | セクター | 通過銘柄数 | 平均Perf.3M | 平均総合点 | 代表銘柄 |');
    lines.push('|:---:|:---|---:|---:|---:|:---|');
    result.sectorRanking.forEach((sector, index) => {
      lines.push(
        `| ${index + 1} | ${sector.sector} | ${sector.count} | ${fmt(sector.averagePerf3m)}% | ${fmt(sector.averageRankScore)} | ${sector.topSymbol ?? 'N/A'} |`,
      );
    });
  }
  lines.push('');

  lines.push('## 市場カバレッジ');
  lines.push('');
  lines.push(`- スキャンスコープ: TradingView Scanner API の \`${result.scannerScope.market}\` 市場、対象は \`${result.scannerScope.instrumentTypes.join(', ')}\``);
  lines.push(`- 観測レンジ: 今回は最大 ${result.scannerScope.serverLimit} 件まで取得し、その範囲で市場別内訳を集計`);
  lines.push(buildMarketLines('サーバーフィルター通過', result.marketBreakdown?.serverFiltered));
  lines.push(buildMarketLines('クライアントフィルター通過', result.marketBreakdown?.clientFiltered));
  lines.push(buildMarketLines('最終採用', result.marketBreakdown?.matched));
  lines.push(`- 補足: ${result.scannerScope.note}`);
  lines.push('');

  lines.push('## 見ている指標と追加候補');
  lines.push('');
  lines.push('- 現在の主指標: RSI、3か月リターン、相対出来高、52週高値比率、ROE、粗利率、FCFマージン、EPS、P/FCF、売上成長率');
  lines.push('- 追加候補: `debtToEquity` は財務レバレッジ確認に有効。高ROEが負債依存かを切り分けられる');
  lines.push('- 追加候補: `earningsGrowth` は売上成長だけでは見えない利益成長の質を補える');
  lines.push('- 追加候補: `profitMargins` は粗利率より下流の収益性を見られるので、営業効率の確認に向く');
  lines.push('- 追加候補: `forwardPE` や `price_book_fq` は過熱感チェックに使えるが、成長株を早く切りすぎる副作用がある');
  lines.push('- 追加候補: `dividendYield` は本スクリーナーの性格上は優先度低め。高配当より成長・効率の説明力を優先した方が整合的');
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push(`**スコア算出:** \`rank(${result.rankingFormula.join(') + rank(')})\`（合計が小さいほど上位）`);
  lines.push('');
  lines.push('**フィルター条件:**');
  lines.push('- RSI(14) > 60, 時価総額 > $1B, 相対出来高 > 1.2x');
  lines.push('- EPS(TTM) > 0, ROE > 15%, 粗利率(TTM) > 40%, FCFマージン(TTM) > 10%');
  lines.push('- Close > SMA200, Close > SMA50, Close ≥ 52週高値 × 75%');
  lines.push('- Perf.3M > 10%, P/FCF < 50');
  if (result.enrichedWithYahoo) {
    lines.push('- Yahoo Finance 補完あり: 売上成長率 YoY > 20%');
  }

  return lines.join('\n');
}

async function main() {
  console.log('[screener] Starting fundamental screener...');

  let result;
  try {
    result = await runFundamentalScreener({ limit: 20, enrichWithYahoo: true });
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

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
