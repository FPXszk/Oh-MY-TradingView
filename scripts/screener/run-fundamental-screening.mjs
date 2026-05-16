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

function fmtUsdMarketCap(val) {
  if (val === null || val === undefined) return 'N/A';
  const abs = Math.abs(Number(val));
  if (abs >= 1_000_000_000_000) return `$${(val / 1_000_000_000_000).toFixed(2)}T`;
  if (abs >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  return `$${Number(val).toLocaleString('en-US')}`;
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
    parts.push(`${next.symbol}より総合点が${fmt(row.rankScore - next.rankScore, 2)}点高い`);
  } else if (previous) {
    parts.push(`${previous.symbol}との差は総合点で${fmt(previous.rankScore - row.rankScore, 2)}点`);
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

function buildRankingMetricCells(row) {
  return [
    fmtUsdMarketCap(row.marketCapUsd),
    `${fmt(row.perfY)}%`,
    `${fmt(row.perf6m)}%`,
    `${fmt(row.perf3m)}%`,
    `${fmt(row.pctOf52wHigh)}%`,
    `${fmt(row.roic)}%`,
    `${fmt(row.grossProfitToAssets)}%`,
    `${fmt(row.fcfMargin)}%`,
    `${fmt(row.revenueGrowthTtm)}%`,
    buildRuleOf40Note(row),
    `${fmt(row.epsGrowthTtm)}%`,
    fmt(row.pFcf, 1),
    `${fmt(row.atrPct)}%`,
    fmt(row.rankScore, 2),
  ];
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

function buildProfileGuideRow(profile) {
  const thresholds = profile.thresholds ?? {};
  const relativeVolume = thresholds.relative_volume_min === undefined
    ? 'N/A'
    : Number(thresholds.relative_volume_min).toFixed(2);
  return `| セクタープロファイル | ${profile.label} | scope: ${profile.scope_labels?.join(', ') || profile.label} / hard gate: Perf.3M > ${thresholds.perf_3m_min_pct}% / P/FCF < ${thresholds.p_fcf_max} / scoring: RSI ${thresholds.rsi14_min}+、相対出来高 ${relativeVolume}x+、ROE ${thresholds.roe_min_pct}%+、粗利率 ${thresholds.gross_margin_min_pct}%+、FCFマージン ${thresholds.fcf_margin_min_pct}%+ |`;
}

function formatBlockWeights(result) {
  return (result.rankingBlocks ?? [])
    .map((block) => `${block.label} ${block.weight}%`)
    .join(' / ');
}

function summarizeBlockFields(block) {
  return (block.fields ?? [])
    .map((field) => field.label)
    .join(', ');
}

function describeBlockRole(blockKey) {
  switch (blockKey) {
    case 'priceMomentum':
      return '最も重視。上昇トレンドの強さと52週高値接近を評価';
    case 'sectorStrength':
      return '強いセクター追随かを確認';
    case 'quality':
      return '収益性とキャッシュ創出力を確認';
    case 'growth':
      return '売上・EPS・FCF の成長確認';
    case 'riskValue':
      return '過熱バリュエーションと変動リスクを抑制';
    case 'ruleOf40':
      return 'US software の質を補助的に確認';
    default:
      return '補助評価';
  }
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

function buildGuideRows(result) {
  const rows = [
    `| 共通条件 | ベース条件 | 時価総額 > $1B / EPS(TTM) > ${result.criteria.eps_min} / Close > SMA200 / Close > SMA50 / Close ≥ 52週高値 × ${result.criteria.price_pct_of_52wk_high_min}% |`,
  ];

  if (result.criteria.rule_of_40_policy) {
    rows.push(`| 補助ポリシー | Rule of 40 | ${result.criteria.rule_of_40_policy.scope} / ${result.criteria.rule_of_40_policy.formula} / ${result.criteria.rule_of_40_policy.pass_badge_min}+ を badge / ${result.criteria.rule_of_40_policy.warning_below} 未満を warning / hard filter なし |`);
  }
  if (result.criteria.allowed_exchanges) {
    rows.push(`| ユニバース | 取引所 | ${result.criteria.allowed_exchanges.join(', ')} |`);
  }
  if (result.criteria.symbol_allowlist_key) {
    rows.push(`| ユニバース | 銘柄ユニバース | ${result.criteria.symbol_allowlist_key} |`);
  }
  if (result.enrichedWithYahoo) {
    rows.push('| 補助ポリシー | Moomoo 補完 | 売上成長率 YoY はプロファイル別閾値を適用し、null は通過 |');
  }
  if (result.criteria.excluded_phase2_sectors?.length) {
    rows.push(`| ユニバース | Phase2 除外セクター | ${result.criteria.excluded_phase2_sectors.join(', ')} |`);
  }
  if (result.criteria.profile_summaries?.length) {
    result.criteria.profile_summaries.forEach((profile) => {
      rows.push(buildProfileGuideRow(profile));
    });
  } else {
    rows.push('| セクタープロファイル | なし | セクター別プロファイル条件はありません |');
  }

  return rows;
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
    lines.push(`- Phase1 ソース候補数: ${result.sectorMomentum.coverage?.scopedCandidates ?? 'N/A'} / reported ${result.sectorMomentum.coverage?.totalCandidatesReported ?? 'N/A'}`);
    if (result.sectorMomentum.benchmark?.symbol) {
      lines.push(`- 相対強度の基準: ${result.sectorMomentum.benchmark.exchange ?? '-'}:${result.sectorMomentum.benchmark.symbol}（SPY）`);
    }
    lines.push('- 12M / 6M / 3M はセクター構成銘柄の平均リターンです。');
    lines.push('');
    lines.push('| 順位 | セクター | 平均12M | 平均6M | 平均3M | SPY差12M | SPY差6M | SPY差3M | SMA50上 | SMA200上 | 52w高値90%内 | RSI | 相対出来高 | 構成数 | 順位合計 |');
    lines.push('|:---:|:---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
    result.sectorMomentum.rankings.forEach((entry, index) => {
      lines.push(
        `| ${index + 1} | ${entry.sector} | ${fmt(entry.perfY)}% | ${fmt(entry.perf6m)}% | ${fmt(entry.perf3m)}% | ${fmt(entry.relativeStrengthY)}pt | ${fmt(entry.relativeStrength6m)}pt | ${fmt(entry.relativeStrength3m)}pt | ${fmt(entry.pctAboveSma50)}% | ${fmt(entry.pctAboveSma200)}% | ${fmt(entry.pctNear52WeekHigh)}% | ${fmt(entry.rsi14)} | ${fmt(entry.relativeVolume, 2)}x | ${entry.memberCount ?? 'N/A'} | ${entry.rankScore} |`,
      );
    });
  }
  lines.push('');

  if (result.results.length === 0) {
    lines.push('> 本日は条件を満たす銘柄がありませんでした。');
    lines.push('');
  } else {
    lines.push('## 銘柄ランキング');
    lines.push('');
    lines.push('| 順位 | シンボル | セクター | 市場 | 時価総額 | 12M | 6M | 3M | 52w | ROIC | GP/A | FCF | 売上YoY | Rule40 | EPS YoY | P/FCF | ATR% | 総合点 |');
    lines.push('|:---:|:---|:---|:---:|:---|---:|---:|---:|---:|---:|---:|---:|---:|:---|---:|---:|---:|---:|');
    result.results.forEach((r, i) => {
      const metricCells = buildRankingMetricCells(r).join(' | ');
      lines.push(
        `| ${i + 1} | **${r.symbol}** | ${r.sector ?? 'N/A'} | ${r.exchange ?? '-'} | ${metricCells} |`,
      );
    });
    lines.push('');

    lines.push('## 上位5件の選定理由');
    lines.push('');
    topFive.forEach((row, index) => {
      lines.push(`### ${index + 1}位 ${row.symbol} (${row.exchange ?? '-'})`);
      lines.push(`- 総合点: ${fmt(row.rankScore, 2)}`);
      lines.push(`- ブロック: 価格 ${fmt(getBlock(row, 'priceMomentum')?.rank, 2)} / セクター ${fmt(getBlock(row, 'sectorStrength')?.rank, 2)} / 品質 ${fmt(getBlock(row, 'quality')?.rank, 2)} / 成長 ${fmt(getBlock(row, 'growth')?.rank, 2)} / リスク・割安 ${fmt(getBlock(row, 'riskValue')?.rank, 2)} / Rule40 ${fmt(getBlock(row, 'ruleOf40')?.rank, 2)}`);
      lines.push(`- 主要指標: 12M ${fmt(row.perfY)}% / 6M ${fmt(row.perf6m)}% / 3M ${fmt(row.perf3m)}% / ROIC ${fmt(row.roic)}% / GP/A ${fmt(row.grossProfitToAssets)}% / FCF ${fmt(row.fcfMargin)}% / Rule40 ${buildRuleOf40Note(row)}`);
      lines.push(`- リスク確認: ${buildRiskNote(row)}`);
      lines.push(`- 理由: ${buildExplanation(row, index, topFive)}`);
      lines.push('');
    });

  }

  lines.push('## Phase2 通過銘柄のセクター内訳');
  lines.push('');
  if (!result.sectorRanking || result.sectorRanking.length === 0) {
    lines.push('- 条件通過銘柄がないため、Phase2 のセクター内訳は算出できませんでした。');
  } else {
    lines.push('| セクター順位 | セクター | 通過銘柄数 | セクター内順位 | シンボル | 市場 | 時価総額 | 12M | 6M | 3M | 52w | ROIC | GP/A | FCF | 売上YoY | Rule40 | EPS YoY | P/FCF | ATR% | 総合点 |');
    lines.push('|:---:|:---|---:|:---:|:---|:---:|:---|---:|---:|---:|---:|---:|---:|---:|---:|:---|---:|---:|---:|---:|');
    result.sectorRanking.forEach((sector, index) => {
      const sectorRank = sector.phase1SectorRank ?? index + 1;
      (sector.topRows ?? []).forEach((row, rowIndex) => {
        const metricCells = buildRankingMetricCells(row).join(' | ');
        lines.push(
          `| ${sectorRank} | ${sector.sector} | ${sector.count} | ${rowIndex + 1} | **${row.symbol}** | ${row.exchange ?? '-'} | ${metricCells} |`,
        );
      });
    });
  }
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('**スコア算出:**');
  lines.push('');
  lines.push('| ブロック | 重み | 主な評価項目 | 役割 |');
  lines.push('|:---|---:|:---|:---|');
  (result.rankingBlocks ?? []).forEach((block) => {
    lines.push(`| ${block.label} | ${block.weight}% | ${summarizeBlockFields(block)} | ${describeBlockRole(block.key)} |`);
  });
  lines.push('');
  lines.push('**フィルター条件と scoring guide:**');
  lines.push('');
  lines.push('| 区分 | 項目 | 条件・説明 |');
  lines.push('|:---|:---|:---|');
  buildGuideRows(result).forEach((row) => lines.push(row));

  return lines.join('\n');
}

async function main() {
  console.log('[screener] Starting fundamental screener...');
  const runtime = getRuntimeConfig();

  let result;
  try {
    result = await runFundamentalScreener({
      limit: 30,
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
