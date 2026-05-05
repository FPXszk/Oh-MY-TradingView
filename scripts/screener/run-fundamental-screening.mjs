#!/usr/bin/env node
/**
 * Report generator for the fundamental screener.
 * Calls runFundamentalScreener and writes docs/reports/screener/daily-ranking.md
 * into the current checkout. No git operations are performed.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runFundamentalScreener } from '../../src/core/fundamental-screener.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const DEFAULT_REPORT_PATH = join(REPO_ROOT, 'docs', 'reports', 'screener', 'daily-ranking.md');
const DEFAULT_TITLE = 'ファンダメンタル × モメンタム スクリーニング 上位20件';
const DEFAULT_CURRENCY_SYMBOL = '$';

function fmt(val, digits = 1, suffix = '') {
  if (val === null || val === undefined) return 'N/A';
  return Number(val).toFixed(digits) + suffix;
}

function fmtCountOrVolume(entry) {
  if (entry.memberCount !== null && entry.memberCount !== undefined) return `${entry.memberCount}銘柄`;
  if (entry.volume !== null && entry.volume !== undefined) return Number(entry.volume).toLocaleString('en-US');
  return 'N/A';
}

function formatSectorMomentumApproach(sectorMomentum) {
  switch (sectorMomentum?.approach) {
    case 'us-sector-etfs':
      return '米国 sector ETF proxy';
    case 'stock-aggregation':
      return '銘柄集計';
    default:
      return sectorMomentum?.approachLabel ?? 'N/A';
  }
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

function buildProfileConditionLine(profile) {
  const thresholds = profile.thresholds ?? {};
  const relativeVolume = thresholds.relative_volume_min === undefined
    ? 'N/A'
    : Number(thresholds.relative_volume_min).toFixed(2);
  return `- ${profile.label}: RSI > ${thresholds.rsi14_min}, 相対出来高 > ${relativeVolume}x, ROE > ${thresholds.roe_min_pct}%, 粗利率 > ${thresholds.gross_margin_min_pct}%, FCFマージン > ${thresholds.fcf_margin_min_pct}%, Perf.3M > ${thresholds.perf_3m_min_pct}%, P/FCF < ${thresholds.p_fcf_max}`;
}

function parseExchangeAllowlist(value) {
  if (!value) return null;
  const exchanges = value.split(',').map((entry) => entry.trim()).filter(Boolean);
  return exchanges.length > 0 ? exchanges : null;
}

function getRuntimeConfig() {
  return {
    reportPath: process.env.SCREENER_REPORT_PATH ? join(REPO_ROOT, process.env.SCREENER_REPORT_PATH) : DEFAULT_REPORT_PATH,
    title: process.env.SCREENER_REPORT_TITLE || DEFAULT_TITLE,
    currencySymbol: process.env.SCREENER_CURRENCY_SYMBOL || DEFAULT_CURRENCY_SYMBOL,
    workflowLabel: process.env.SCREENER_WORKFLOW_LABEL || 'daily-screener',
    screenerOptions: {
      market: process.env.SCREENER_MARKET || 'america',
      exchangeAllowlist: parseExchangeAllowlist(process.env.SCREENER_EXCHANGES),
      grossMarginMinPct: process.env.SCREENER_GROSS_MARGIN_MIN_PCT
        ? Number(process.env.SCREENER_GROSS_MARGIN_MIN_PCT)
        : undefined,
      symbolAllowlistKey: process.env.SCREENER_SYMBOL_ALLOWLIST_KEY || undefined,
      scopeLabel: process.env.SCREENER_SCOPE_LABEL || undefined,
    },
  };
}

export function buildMarkdown(result, options = {}) {
  const title = options.title ?? DEFAULT_TITLE;
  const currencySymbol = options.currencySymbol ?? DEFAULT_CURRENCY_SYMBOL;
  const now = new Date(result.retrieved_at);
  const jst = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(now);
  const topFive = result.results.slice(0, 5);

  const lines = [
    `# ${title}`,
    '',
    `更新: ${result.retrieved_at}（JST ${jst}）`,
    '',
    `Phase2候補取得: ${result.totalScanned.toLocaleString()} 銘柄 → スコープ通過: ${result.serverFiltered} → Phase1 選択セクター通過: ${result.phase1Filtered ?? result.serverFiltered} → クライアントフィルター通過: ${result.clientFiltered} → 上位: ${result.matched}`,
    '',
  ];

  lines.push('## Phase1 セクターランキング');
  lines.push('');
  if (!result.sectorMomentum || !result.sectorMomentum.rankings || result.sectorMomentum.rankings.length === 0) {
    lines.push('- Phase1 セクター順位は算出できませんでした。');
  } else {
    lines.push(`- アプローチ: ${formatSectorMomentumApproach(result.sectorMomentum)}`);
    lines.push(`- 採用セクター: ${result.sectorMomentum.selectedSectors.map((entry) => `${entry.label}${entry.proxySymbol ? ` (${entry.proxySymbol})` : ''}`).join(', ')}`);
    lines.push(`- Phase1 ソース候補数: ${result.sectorMomentum.coverage?.scopedCandidates ?? 'N/A'} / reported ${result.sectorMomentum.coverage?.totalCandidatesReported ?? 'N/A'}`);
    lines.push('');
    lines.push('| 順位 | セクター | 1M | 3M | RSI | 相対出来高 | 出来高/構成数 | 総合点 |');
    lines.push('|:---:|:---|---:|---:|---:|---:|:---|---:|');
    result.sectorMomentum.rankings.forEach((entry, index) => {
      lines.push(
        `| ${index + 1} | ${entry.sector} | ${fmt(entry.perf1m)}% | ${fmt(entry.perf3m)}% | ${fmt(entry.rsi14)} | ${fmt(entry.relativeVolume, 2)}x | ${fmtCountOrVolume(entry)} | ${entry.rankScore} |`,
      );
    });
  }
  lines.push('');

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
        `| ${i + 1} | **${r.symbol}** | ${r.sector ?? 'N/A'} | ${r.exchange ?? '-'} | ${currencySymbol}${fmt(r.close, 2)} | ${fmt(r.perf3m)}% | ${fmt(r.roe)}% | ${fmt(r.fcfMargin)}% | ${r.revenueGrowth === null || r.revenueGrowth === undefined ? 'N/A' : fmt(r.revenueGrowth * 100)}% | ${r.rankScore} |`,
      );
    });
    lines.push('');
  }

  lines.push('## Phase2 通過銘柄のセクター内訳');
  lines.push('');
  if (!result.sectorRanking || result.sectorRanking.length === 0) {
    lines.push('- 条件通過銘柄がないため、Phase2 のセクター内訳は算出できませんでした。');
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
  if (result.scannerScope.scopeLabel) {
    lines.push(`- ユニバース追加条件: ${result.scannerScope.scopeLabel}`);
  }
  lines.push(`- 観測レンジ: 今回は ${result.scannerScope.profileRequestCount ?? 1} 件のプロファイルスキャンを行い、各リクエスト最大 ${result.scannerScope.serverLimit} 件まで取得`);
  lines.push(buildMarketLines('スコープ通過', result.marketBreakdown?.serverFiltered));
  lines.push(buildMarketLines('Phase1 選択セクター通過', result.marketBreakdown?.phase1Filtered));
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
  lines.push(`- 共通条件: 時価総額 > $1B, EPS(TTM) > ${result.criteria.eps_min}, Close > SMA200, Close > SMA50, Close ≥ 52週高値 × ${result.criteria.price_pct_of_52wk_high_min}%`);
  if (result.criteria.profile_summaries?.length) {
    result.criteria.profile_summaries.forEach((profile) => {
      lines.push(buildProfileConditionLine(profile));
    });
  } else {
    lines.push('- セクター別プロファイル条件はありません。');
  }
  if (result.criteria.excluded_phase2_sectors?.length) {
    lines.push(`- Phase2 除外セクター: ${result.criteria.excluded_phase2_sectors.join(', ')}`);
  }
  if (result.criteria.allowed_exchanges) {
    lines.push(`- 取引所限定: ${result.criteria.allowed_exchanges.join(', ')}`);
  }
  if (result.criteria.symbol_allowlist_key) {
    lines.push(`- 銘柄ユニバース限定: ${result.criteria.symbol_allowlist_key}`);
  }
  if (result.enrichedWithYahoo) {
    lines.push('- Yahoo Finance 補完あり: 売上成長率 YoY はプロファイル別閾値を適用し、null は通過');
  }

  return lines.join('\n');
}

async function main() {
  console.log('[screener] Starting fundamental screener...');
  const runtime = getRuntimeConfig();

  let result;
  try {
    result = await runFundamentalScreener({
      limit: 20,
      enrichWithYahoo: true,
      _deps: runtime.screenerOptions,
    });
  } catch (err) {
    console.error('[screener] ERROR:', err.message);
    process.exit(1);
  }

  console.log(`[screener] totalScanned=${result.totalScanned} serverFiltered=${result.serverFiltered} phase1Filtered=${result.phase1Filtered} clientFiltered=${result.clientFiltered} matched=${result.matched}`);

  const md = buildMarkdown(result, {
    title: runtime.title,
    currencySymbol: runtime.currencySymbol,
  });
  mkdirSync(dirname(runtime.reportPath), { recursive: true });
  writeFileSync(runtime.reportPath, md, 'utf8');
  console.log(`[screener] Report written to ${runtime.reportPath}`);
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
