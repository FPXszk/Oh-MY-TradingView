#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listWatchlistSymbols } from '../../src/core/workspace.js';
import { evaluateSymbolsAgainstFundamentalScreener } from '../../src/core/fundamental-screener.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const DEFAULT_REPORT_PATH = join(REPO_ROOT, 'docs', 'reports', 'screener', 'ath-watchlist-analysis.md');

function fmt(val, digits = 1, suffix = '') {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return 'N/A';
  return Number(val).toFixed(digits) + suffix;
}

function formatReason(reason) {
  switch (true) {
    case /^phase1_sector_not_selected/.test(reason):
      return `Phase1 の採用セクター外 ${reason.match(/\((.*)\)/)?.[1] ?? ''}`.trim();
    case /^exchange_not_allowed/.test(reason):
      return `対象取引所外 ${reason.match(/\((.*)\)/)?.[1] ?? ''}`.trim();
    case /^symbol_not_in_allowlist/.test(reason):
      return `許可ユニバース外 ${reason.match(/\((.*)\)/)?.[1] ?? ''}`.trim();
    case /^close<=SMA200/.test(reason):
      return 'SMA200 を上回れず';
    case /^close<=SMA50/.test(reason):
      return 'SMA50 を上回れず';
    case /^52w_high_proximity/.test(reason):
      return '52週高値への接近不足';
    case /^perf3m<=/.test(reason):
      return '3か月モメンタム不足';
    case /^p_fcf>=/.test(reason):
      return 'P/FCF が高すぎる';
    case /^revenue_growth<=/.test(reason):
      return '売上成長率が workflow 最低基準未満';
    case /^no_profile_for_sector/.test(reason):
      return '現行セクタープロファイル対象外';
    case /^symbol_not_returned_by_scanner/.test(reason):
      return 'TradingView Scanner が返さず';
    default:
      return reason;
  }
}

function summarizeReasons(reasons) {
  if (!reasons || reasons.length === 0) return '現行 workflow 基準を通過';
  return reasons.map(formatReason).join(' / ');
}

function strongestLabel(entry) {
  if (!entry.found) return '判定不能';
  if (entry.workflowDetected) return '最強候補';
  if (entry.workflowEligible) return '基準通過だが workflow 未掲載';
  return '基準外';
}

function sortResults(entries) {
  return [...entries].sort((left, right) => {
    const leftBucket = left.workflowDetected ? 0 : left.workflowEligible ? 1 : left.found ? 2 : 3;
    const rightBucket = right.workflowDetected ? 0 : right.workflowEligible ? 1 : right.found ? 2 : 3;
    if (leftBucket !== rightBucket) return leftBucket - rightBucket;
    if ((right.rankScore ?? 0) !== (left.rankScore ?? 0)) return (right.rankScore ?? 0) - (left.rankScore ?? 0);
    return String(left.requestedSymbol).localeCompare(String(right.requestedSymbol));
  });
}

function buildMarketSection(title, marketResult) {
  const rows = sortResults(marketResult.results || []);
  const lines = [
    `## ${title}`,
    '',
    `- Phase1 採用セクター: ${(marketResult.phase1SelectedSectors || []).join(', ') || 'なし'}`,
    `- workflow 掲載数: ${rows.filter((entry) => entry.workflowDetected).length}/${rows.length}`,
    `- 基準通過だが workflow 未掲載: ${rows.filter((entry) => entry.workflowEligible && !entry.workflowDetected).length}件`,
    '',
    '| 順位 | 銘柄 | 判定 | workflow掲載 | 総合点 | セクター | 12M | 6M | 3M | 52w | P/FCF | 理由 |',
    '|:---:|:---|:---|:---:|---:|:---|---:|---:|---:|---:|---:|:---|',
  ];

  rows.forEach((entry, index) => {
    lines.push(
      `| ${index + 1} | ${entry.requestedSymbol} | ${strongestLabel(entry)} | ${entry.workflowDetected ? 'Yes' : 'No'} | ${fmt(entry.rankScore, 2)} | ${entry.sector ?? 'N/A'} | ${fmt(entry.perfY)}% | ${fmt(entry.perf6m)}% | ${fmt(entry.perf3m)}% | ${fmt(entry.pctOf52wHigh)}% | ${fmt(entry.pFcf, 1)} | ${summarizeReasons(entry.failureReasons)} |`,
    );
  });
  lines.push('');

  const topDetected = rows.filter((entry) => entry.workflowDetected).slice(0, 5);
  if (topDetected.length > 0) {
    lines.push('### 上位メモ');
    lines.push('');
    topDetected.forEach((entry, index) => {
      const blockRanks = entry.rankBreakdown
        ? Object.values(entry.rankBreakdown).map((block) => `${block.label} ${fmt(block.rank, 2)}位相当`).join(' / ')
        : 'N/A';
      lines.push(`- ${index + 1}位 ${entry.requestedSymbol}: ${entry.sector ?? 'N/A'}。${blockRanks}。`);
    });
    lines.push('');
  }

  return lines;
}

function splitSymbolsByMarket(symbols) {
  const buckets = {
    us: [],
    jp: [],
    other: [],
  };

  symbols.forEach((symbol) => {
    if (/^(NASDAQ|NYSE):/i.test(symbol)) {
      buckets.us.push(symbol);
      return;
    }
    if (/^TSE:/i.test(symbol)) {
      buckets.jp.push(symbol);
      return;
    }
    buckets.other.push(symbol);
  });

  return buckets;
}

async function main() {
  console.log('[ath] Reading active TradingView watchlist...');
  const watchlist = await listWatchlistSymbols();
  const { us, jp, other } = splitSymbolsByMarket(watchlist.symbols || []);

  const usSelectedSectorCount = process.env.ATH_US_SELECTED_SECTOR_COUNT
    ? Number(process.env.ATH_US_SELECTED_SECTOR_COUNT)
    : 8;
  const jpSelectedSectorCount = process.env.ATH_JP_SELECTED_SECTOR_COUNT
    ? Number(process.env.ATH_JP_SELECTED_SECTOR_COUNT)
    : undefined;
  const usResultLimit = process.env.ATH_US_RESULT_LIMIT
    ? Number(process.env.ATH_US_RESULT_LIMIT)
    : 70;
  const jpResultLimit = process.env.ATH_JP_RESULT_LIMIT
    ? Number(process.env.ATH_JP_RESULT_LIMIT)
    : 60;

  console.log(`[ath] Evaluating ${us.length} US symbols and ${jp.length} JP symbols...`);
  const [usResult, jpResult] = await Promise.all([
    evaluateSymbolsAgainstFundamentalScreener({
      symbols: us,
      enrichWithYahoo: true,
      _deps: {
        market: 'america',
        exchangeAllowlist: ['NASDAQ', 'NYSE'],
        selectedSectorCount: usSelectedSectorCount,
        resultLimit: usResultLimit,
        scopeLabel: 'NASDAQ + NYSE stocks only (OTC excluded)',
      },
    }),
    evaluateSymbolsAgainstFundamentalScreener({
      symbols: jp,
      enrichWithYahoo: true,
      _deps: {
        market: 'japan',
        exchangeAllowlist: ['TSE'],
        symbolAllowlistKey: 'jpx-prime',
        selectedSectorCount: jpSelectedSectorCount,
        resultLimit: jpResultLimit,
        scopeLabel: 'JPX Prime domestic stocks snapshot (2026-03-31)',
      },
    }),
  ]);

  const lines = [
    '# ATH Watchlist Screening Alignment',
    '',
    `更新: ${new Date().toISOString()}`,
    '',
    `- 取得ウォッチリスト件数: ${watchlist.count}`,
    `- US: ${us.length}件 / JP: ${jp.length}件 / 対象外市場: ${other.length}件`,
    '- 判定基準: 現行 Daily Fundamental Screener workflow の US / JP 条件',
    '- 「最強候補」は watchlist 内で強く、かつ現行 workflow 結果にも実際に掲載された銘柄',
    '- 「基準通過だが workflow 未掲載」は候補自体は通るが、workflow 上位掲載まで届いていない銘柄',
    '',
  ];

  if (other.length > 0) {
    lines.push('## 対象外市場');
    lines.push('');
    other.forEach((symbol) => lines.push(`- ${symbol}: 現行 US / JP workflow の市場外のため今回は順位評価の対象外`));
    lines.push('');
  }

  lines.push(...buildMarketSection('US 銘柄', usResult));
  lines.push(...buildMarketSection('日本株', jpResult));

  const report = lines.join('\n');
  mkdirSync(dirname(DEFAULT_REPORT_PATH), { recursive: true });
  writeFileSync(DEFAULT_REPORT_PATH, report, 'utf8');

  console.log(`[ath] Wrote ${DEFAULT_REPORT_PATH}`);
  process.exit(0);
}

main().catch((error) => {
  console.error('[ath] Failed:', error);
  process.exitCode = 1;
});
