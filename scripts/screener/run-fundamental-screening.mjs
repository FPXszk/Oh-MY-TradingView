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
const DEFAULT_CURRENCY_SYMBOL = '$';
const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];

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
    case 'stock-aggregation':
      return sectorMomentum?.approachLabel?.includes('US')
        ? '米国 TradingView stock sector 集計'
        : '銘柄集計';
    default:
      return sectorMomentum?.approachLabel ?? 'N/A';
  }
}

function getBlock(row, key) {
  return row.rankBreakdown?.[key] ?? null;
}

function buildExplanation(row, index, rows) {
  const previous = index > 0 ? rows[index - 1] : null;
  const next = index < rows.length - 1 ? rows[index + 1] : null;
  const blocks = Object.entries(row.rankBreakdown ?? {}).sort((a, b) => a[1].rank - b[1].rank);
  const strongest = blocks[0] ?? null;
  const weakest = blocks[blocks.length - 1] ?? null;
  const parts = [];

  if (strongest) {
    parts.push(`${strongest[1].label} が候補群内 ${strongest[1].rank} 位相当`);
  }
  if (next) {
    parts.push(`${next.symbol}より総合点が${fmt(next.rankScore - row.rankScore, 2)}点良い`);
  } else if (previous) {
    parts.push(`${previous.symbol}との差は総合点で${fmt(row.rankScore - previous.rankScore, 2)}点`);
  }
  if (weakest && weakest[1].rank > 3) {
    parts.push(`弱点は ${weakest[1].label} の ${weakest[1].rank} 位相当`);
  }

  return parts.join('、') + '。';
}

function buildRiskNote(row) {
  const notes = [];
  if (row.atrPct !== null && row.atrPct !== undefined && row.atrPct > 6) {
    notes.push(`ATR ${fmt(row.atrPct)}%`);
  }
  if (row.beta1y !== null && row.beta1y !== undefined && row.beta1y > 1.5) {
    notes.push(`β ${fmt(row.beta1y, 2)}`);
  }
  if (row.debtToEquity !== null && row.debtToEquity !== undefined && row.debtToEquity > 150) {
    notes.push(`D/E ${fmt(row.debtToEquity)}%`);
  }
  if (row.pFcf !== null && row.pFcf !== undefined && row.pFcf > 60) {
    notes.push(`P/FCF ${fmt(row.pFcf, 1)}倍`);
  }
  if (row.extremeMomentum?.flags?.includes('perfY_gt_1000')) {
    notes.push(`12M ${fmt(row.perfY)}%の超急騰`);
  }
  if (row.extremeMomentum?.flags?.includes('perf6m_gt_600')) {
    notes.push(`6M ${fmt(row.perf6m)}%の超急騰`);
  }
  return notes.length > 0 ? notes.join('、') : '目立つ過熱/財務リスクなし';
}

function buildRuleOf40Note(row) {
  if (row.ruleOf40 === null || row.ruleOf40 === undefined) return 'N/A';
  const value = fmt(row.ruleOf40);
  if (row.ruleOf40 >= 40) return `${value}（Rule 40+）`;
  if (row.ruleOf40 < 20) return `${value}（20未満注意）`;
  return value;
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
  return `- ${profile.label}: scope は ${profile.scope_labels?.join(', ') || profile.label}。hard gate は Perf.3M > ${thresholds.perf_3m_min_pct}% / P/FCF < ${thresholds.p_fcf_max}。RSI ${thresholds.rsi14_min}+、相対出来高 ${relativeVolume}x+、ROE ${thresholds.roe_min_pct}%+、粗利率 ${thresholds.gross_margin_min_pct}%+、FCFマージン ${thresholds.fcf_margin_min_pct}%+ は scoring で評価`;
}

function formatBlockWeights(result) {
  return (result.rankingBlocks ?? [])
    .map((block) => `${block.label} ${block.weight}%`)
    .join(' / ');
}

function formatJstDateParts(isoString) {
  const now = new Date(isoString);
  const jstDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const weekday = WEEKDAYS_JA[new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })).getDay()];
  const jstTime = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
  return {
    dateWithWeekday: `${jstDate.replace(/-/g, '/')}（${weekday}）`,
    timeOnly: `${jstTime} JST`,
  };
}

function buildHeadlineSummary(result) {
  return [
    `セクター別取得候補 ${result.totalScanned.toLocaleString()}銘柄`,
    `ユニバース条件通過 ${result.serverFiltered}銘柄`,
    `ランキング対象 ${result.clientFiltered}銘柄`,
    `レポート掲載 ${result.matched}銘柄`,
  ].join(' → ');
}

function parseExchangeAllowlist(value) {
  if (!value) return null;
  const exchanges = value.split(',').map((entry) => entry.trim()).filter(Boolean);
  return exchanges.length > 0 ? exchanges : null;
}

function getRuntimeConfig() {
  return {
    reportPath: process.env.SCREENER_REPORT_PATH ? join(REPO_ROOT, process.env.SCREENER_REPORT_PATH) : DEFAULT_REPORT_PATH,
    title: process.env.SCREENER_REPORT_TITLE || null,
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
  const jst = formatJstDateParts(result.retrieved_at);
  const title = options.title ?? `スクリーニング結果 ${jst.dateWithWeekday}`;
  const currencySymbol = options.currencySymbol ?? DEFAULT_CURRENCY_SYMBOL;
  const topFive = result.results.slice(0, 5);

  const lines = [
    `# ${title}`,
    '',
    `更新: ${jst.timeOnly}`,
    '',
    buildHeadlineSummary(result),
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
    lines.push('| 順位 | セクター | 12M | 6M | 3M | 1M | RSI | 相対出来高 | 出来高/構成数 | 総合点 |');
    lines.push('|:---:|:---|---:|---:|---:|---:|---:|---:|:---|---:|');
    result.sectorMomentum.rankings.forEach((entry, index) => {
      lines.push(
        `| ${index + 1} | ${entry.sector} | ${fmt(entry.perfY)}% | ${fmt(entry.perf6m)}% | ${fmt(entry.perf3m)}% | ${fmt(entry.perf1m)}% | ${fmt(entry.rsi14)} | ${fmt(entry.relativeVolume, 2)}x | ${fmtCountOrVolume(entry)} | ${entry.rankScore} |`,
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
      lines.push(`- 総合点: ${fmt(row.rankScore, 2)}（低いほど良い）`);
      lines.push(`- ブロック: 価格 ${fmt(getBlock(row, 'priceMomentum')?.rank, 2)} / セクター ${fmt(getBlock(row, 'sectorStrength')?.rank, 2)} / 品質 ${fmt(getBlock(row, 'quality')?.rank, 2)} / 成長 ${fmt(getBlock(row, 'growth')?.rank, 2)} / リスク・割安 ${fmt(getBlock(row, 'riskValue')?.rank, 2)} / Rule40 ${fmt(getBlock(row, 'ruleOf40')?.rank, 2)}`);
      lines.push(`- 主要指標: 12M ${fmt(row.perfY)}% / 6M ${fmt(row.perf6m)}% / 3M ${fmt(row.perf3m)}% / ROIC ${fmt(row.roic)}% / GP/A ${fmt(row.grossProfitToAssets)}% / FCF ${fmt(row.fcfMargin)}% / Rule40 ${buildRuleOf40Note(row)}`);
      lines.push(`- リスク確認: ${buildRiskNote(row)}`);
      lines.push(`- 理由: ${buildExplanation(row, index, topFive)}`);
      lines.push('');
    });

    lines.push('## 銘柄ランキング');
    lines.push('');
    lines.push('| 順位 | シンボル | セクター | 市場 | 現在値 | 12M | 6M | 3M | 52w | ROIC | GP/A | FCF | 売上YoY | Rule40 | EPS YoY | P/FCF | ATR% | 総合点 |');
    lines.push('|:---:|:---|:---|:---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|:---|---:|---:|---:|---:|');
    result.results.forEach((r, i) => {
      lines.push(
        `| ${i + 1} | **${r.symbol}** | ${r.sector ?? 'N/A'} | ${r.exchange ?? '-'} | ${currencySymbol}${fmt(r.close, 2)} | ${fmt(r.perfY)}% | ${fmt(r.perf6m)}% | ${fmt(r.perf3m)}% | ${fmt(r.pctOf52wHigh)}% | ${fmt(r.roic)}% | ${fmt(r.grossProfitToAssets)}% | ${fmt(r.fcfMargin)}% | ${fmt(r.revenueGrowthTtm)}% | ${buildRuleOf40Note(r)} | ${fmt(r.epsGrowthTtm)}% | ${fmt(r.pFcf, 1)} | ${fmt(r.atrPct)}% | ${fmt(r.rankScore, 2)} |`,
      );
    });
    lines.push('');

    const extremeRows = result.results.filter((row) => row.extremeMomentum?.isExtreme);
    if (extremeRows.length > 0) {
      lines.push('## 超急騰候補');
      lines.push('');
      lines.push('| 順位 | シンボル | セクター | 12M | 6M | 3M | リスク確認 |');
      lines.push('|:---:|:---|:---|---:|---:|---:|:---|');
      extremeRows.forEach((row) => {
        const rank = result.results.findIndex((entry) => entry.symbol === row.symbol && entry.exchange === row.exchange) + 1;
        lines.push(`| ${rank} | **${row.symbol}** | ${row.sector ?? 'N/A'} | ${fmt(row.perfY)}% | ${fmt(row.perf6m)}% | ${fmt(row.perf3m)}% | ${buildRiskNote(row)} |`);
      });
      lines.push('');
    }
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

  lines.push('## 採用した P0 / P1 指標');
  lines.push('');
  lines.push(`- ブロック重み: ${formatBlockWeights(result)}`);
  lines.push('- Price momentum: `Perf.3M`, `Perf.6M`, `Perf.Y`, 52週高値比率');
  lines.push('- Sector strength: Phase1 TradingView stock sector rank、sector 12M/6M/3M momentum');
  lines.push('- Profitability / quality: ROIC、gross profit/assets、operating margin、FCF margin、cash conversion');
  lines.push('- Growth confirmation: 売上 YoY、EPS YoY、FCF YoY、Yahoo revenue growth');
  lines.push('- Risk / value guard: P/FCF、EV/EBITDA、ATR%、beta、D/E');
  if (result.criteria.rule_of_40_policy) {
    lines.push('- Rule of 40: US Technology Services の Software 系 industry に限り、売上 YoY + FCF margin を補助 rank として評価。40以上は badge、20未満は warning。hard filter にはしない');
  }
  lines.push('');
  lines.push('## 今後改善できそうな点');
  lines.push('');
  lines.push('- 12-1 momentum: OHLC 履歴を使い、直近1カ月を除外した標準 momentum を計算する');
  lines.push('- SUE / earnings surprise: 決算サプライズの外部データを追加し、EPS YoY proxy を置き換える');
  lines.push('- Residual momentum: sector / beta を除いた固有 momentum を別スコアとして検証する');
  lines.push('- 閾値 ablation: P/FCF、ATR%、D/E は hard filter ではなく、通過率と上位銘柄の質を見ながら閾値を調整する');
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push(`**スコア算出:** weighted block rank-sum: ${formatBlockWeights(result)}（合計が小さいほど上位）`);
  lines.push('');
  lines.push('**フィルター条件と scoring guide:**');
  lines.push(`- 共通条件: 時価総額 > $1B, EPS(TTM) > ${result.criteria.eps_min}, Close > SMA200, Close > SMA50, Close ≥ 52週高値 × ${result.criteria.price_pct_of_52wk_high_min}%`);
  if (result.criteria.extreme_momentum_policy) {
    lines.push(`- 超急騰ポリシー: Perf.6M > ${result.criteria.extreme_momentum_policy.perf_6m_extreme_pct}% または Perf.Y > ${result.criteria.extreme_momentum_policy.perf_y_extreme_pct}% でも除外せず、超急騰としてリスク確認に表示`);
  }
  if (result.criteria.rule_of_40_policy) {
    lines.push(`- Rule of 40: ${result.criteria.rule_of_40_policy.scope}。${result.criteria.rule_of_40_policy.formula} を補助 scoring に使い、${result.criteria.rule_of_40_policy.pass_badge_min}+ を badge、${result.criteria.rule_of_40_policy.warning_below} 未満を warning 表示。hard filter なし`);
  }
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
