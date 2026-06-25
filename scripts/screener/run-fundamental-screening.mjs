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
const TECHNICAL_BREAKDOWN_KEYS = ['priceMomentum', 'sectorStrength'];
const FUNDAMENTAL_BREAKDOWN_KEYS = ['quality', 'growth', 'riskValue', 'ruleOf40'];
const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];
const MARKET_CAP_BANDS_BY_MARKET = {
  america: [
    { min: 200_000_000_000, label: 'XL' },
    { min: 50_000_000_000, label: 'L+' },
    { min: 10_000_000_000, label: 'L' },
    { min: 5_000_000_000, label: 'M+' },
    { min: 2_000_000_000, label: 'M' },
    { min: 1_000_000_000, label: 'M-' },
    { min: 0, label: 'S' },
  ],
  japan: [
    { min: 10_000_000_000_000, label: 'XL' },
    { min: 5_000_000_000_000, label: 'L+' },
    { min: 1_000_000_000_000, label: 'L' },
    { min: 500_000_000_000, label: 'M+' },
    { min: 250_000_000_000, label: 'M' },
    { min: 100_000_000_000, label: 'M-' },
    { min: 0, label: 'S' },
  ],
};

function fmt(val, digits = 1, suffix = '') {
  if (val === null || val === undefined) return 'N/A';
  return Number(val).toFixed(digits) + suffix;
}

function getMarketCapBand(abs, market) {
  const bands = MARKET_CAP_BANDS_BY_MARKET[market] ?? MARKET_CAP_BANDS_BY_MARKET.america;
  return bands.find((band) => abs >= band.min)?.label ?? 'S';
}

function fmtMarketCap(val, market, currencySymbol) {
  if (val === null || val === undefined) return 'N/A';
  const abs = Math.abs(Number(val));
  const sizeBand = getMarketCapBand(abs, market);
  const marketCapLabel = abs >= 1_000_000_000_000
    ? `${currencySymbol}${(val / 1_000_000_000_000).toFixed(2)}T`
    : abs >= 1_000_000_000
      ? `${currencySymbol}${(val / 1_000_000_000).toFixed(1)}B`
      : abs >= 1_000_000
        ? `${currencySymbol}${(val / 1_000_000).toFixed(1)}M`
        : `${currencySymbol}${Number(val).toLocaleString('en-US')}`;
  return `${marketCapLabel} (${sizeBand})`;
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

function buildRuleOf40Note(row, market = 'america') {
  if (row.ruleOf40 === null || row.ruleOf40 === undefined) {
    const hasRevenue = row.revenueGrowthTtm !== null && row.revenueGrowthTtm !== undefined;
    const hasFcf = row.fcfMargin !== null && row.fcfMargin !== undefined;
    if (hasRevenue && hasFcf) {
      return fmt(Number((row.revenueGrowthTtm + row.fcfMargin).toFixed(1)));
    }
    if (hasRevenue && !hasFcf) return `売上${fmt(row.revenueGrowthTtm)}% / FCF欠け`;
    if (!hasRevenue && hasFcf) return `FCF${fmt(row.fcfMargin)}% / 売上欠け`;
    return '売上欠け / FCF欠け';
  }
  return fmt(row.ruleOf40);
}

function formatEpsGrowthCell(row) {
  if (row.epsGrowthDisplay) return row.epsGrowthDisplay;
  return `${fmt(row.epsGrowthTtm)}%`;
}

function rankToPositiveScore(rank, populationSize) {
  if (!Number.isFinite(rank) || !Number.isFinite(populationSize) || populationSize <= 0) {
    return null;
  }
  return ((populationSize + 1 - rank) / populationSize) * 100;
}

function buildScoreContributionBreakdown(row, populationSize) {
  if (!row.rankBreakdown || !Number.isFinite(row.rankScore)) {
    return null;
  }

  const groups = [
    { key: 'technical', blockKeys: TECHNICAL_BREAKDOWN_KEYS },
    { key: 'fundamental', blockKeys: FUNDAMENTAL_BREAKDOWN_KEYS },
  ];
  const summaries = groups
    .map((group) => {
      const blocks = group.blockKeys.map((key) => row.rankBreakdown?.[key]).filter(Boolean);
      const weight = blocks.reduce((sum, block) => sum + (Number.isFinite(block.weight) ? block.weight : 0), 0);
      if (blocks.length === 0 || weight <= 0) {
        return null;
      }

      const normalizedRank = blocks.reduce((sum, block) => sum + block.rank * (block.weight / weight), 0);
      const normalizedScore = rankToPositiveScore(normalizedRank, populationSize);
      if (!Number.isFinite(normalizedScore)) {
        return null;
      }

      return { key: group.key, weight, normalizedScore };
    })
    .filter(Boolean);

  if (summaries.length === 0) {
    return null;
  }

  const totalWeight = summaries.reduce((sum, summary) => sum + summary.weight, 0);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    return null;
  }

  const blendedScore = summaries.reduce(
    (sum, summary) => sum + summary.normalizedScore * (summary.weight / totalWeight),
    0,
  );
  if (!Number.isFinite(blendedScore) || blendedScore === 0) {
    return null;
  }

  const scale = row.rankScore / blendedScore;
  const values = Object.fromEntries(
    summaries.map((summary) => [
      summary.key,
      summary.normalizedScore * (summary.weight / totalWeight) * scale,
    ]),
  );

  if (!Number.isFinite(values.technical) || !Number.isFinite(values.fundamental)) {
    return null;
  }

  return values;
}

function buildTotalScoreCell(row, market, populationSize) {
  const total = fmt(row.rankScore, 2);
  const breakdown = buildScoreContributionBreakdown(row, populationSize);
  if (!breakdown) {
    return total;
  }

  return `${total} (T${fmt(breakdown.technical, 1)}/F${fmt(breakdown.fundamental, 1)})`;
}

function buildRankingMetricCells(row, market, populationSize, currencySymbol) {
  return [
    fmtMarketCap(row.marketCapUsd, market, currencySymbol),
    `${fmt(row.perfY)}%`,
    `${fmt(row.perf6m)}%`,
    `${fmt(row.perf3m)}%`,
    `${fmt(row.pctOf52wHigh)}%`,
    `${fmt(row.roic)}%`,
    `${fmt(row.grossProfitToAssets)}%`,
    `${fmt(row.fcfMargin)}%`,
    `${fmt(row.revenueGrowthTtm)}%`,
    buildRuleOf40Note(row, market),
    formatEpsGrowthCell(row),
    fmt(row.pFcf, 1),
    `${fmt(row.atrPct)}%`,
    buildTotalScoreCell(row, market, populationSize),
  ];
}

function formatThemeLine(row) {
  const primary = row.primaryTheme ?? 'Unclassified';
  const subthemes = row.subThemes?.length ? row.subThemes.join(', ') : '細粒度タグなし';
  return `${primary} / ${subthemes}`;
}

function formatSymbolWithCompanyName(row, market) {
  const symbol = row?.symbol ?? 'N/A';
  if (market === 'america') return symbol;
  const companyName = row?.companyNameJa
    ? String(row.companyNameJa).trim()
    : row?.companyName
      ? String(row.companyName).trim()
      : '';
  return companyName ? `${symbol} (${companyName})` : symbol;
}

function getBenchmarkDisplay(result) {
  const benchmark = result.sectorMomentum?.benchmark;
  const market = result.scannerScope?.market;
  if (benchmark?.columnLabel) return benchmark.columnLabel;
  if (market === 'japan') return 'TOPIX';
  return 'SPY';
}

function parseCsvList(value) {
  if (!value) return [];
  return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}

function buildRowLookupKey(row) {
  return `${row.exchange ?? ''}:${row.symbol ?? ''}`;
}

function buildRuleOf40CoverageLines(result) {
  const coverage = result.ruleOf40Coverage;
  if (!coverage) return [];

  const marketLabel = result.scannerScope?.market === 'america'
    ? 'Rule of 40'
    : 'Rule of 40 (参考表示)';

  return [
    `- ${marketLabel} 完全算出: ${coverage.complete}/${coverage.total}銘柄 (${fmt(coverage.completePct)}%)`,
    `- 欠損内訳: 売上のみあり ${coverage.revenueOnly}件 / FCFのみあり ${coverage.fcfOnly}件 / 両方欠け ${coverage.missingBoth}件`,
  ];
}

function buildRuleOf40MissingRows(result) {
  return (result.results ?? []).filter((row) => row.ruleOf40 === null || row.ruleOf40 === undefined);
}

function buildSourceCoverageLines(result) {
  const edinet = result.sourceDetails?.edinet;
  const usSupplement = result.sourceDetails?.usFundamentalSupplement;
  const usMissingSupplement = result.sourceDetails?.usMissingMetricSupplement;
  const lines = [];

  if (usSupplement?.enabled) {
    const symbols = usSupplement.symbols?.length ? ` (${usSupplement.symbols.join(', ')})` : '';
    lines.push(`- US FCF補完: ${usSupplement.supplementedRows}銘柄${symbols}`);
  }
  if (usMissingSupplement?.enabled) {
    const fieldSummary = Object.entries(usMissingSupplement.fields ?? {})
      .map(([field, count]) => `${field} ${count}`)
      .join(', ');
    const suffix = fieldSummary ? ` / ${fieldSummary}` : '';
    lines.push(`- US 指標補完: ${usMissingSupplement.supplementedRows}銘柄${suffix}`);
  }

  if (!edinet) return lines;

  if (!edinet.enabled) {
    return [...lines, '- EDINET: disabled (no API key)'];
  }

  if (edinet.reason === 'invalid_api_key') {
    return [...lines, '- EDINET: invalid API key'];
  }

  if (edinet.reason === 'api_error') {
    return [...lines, `- EDINET: api_error (${edinet.error ?? 'unknown'})`];
  }

  return [
    ...lines,
    `- EDINET: ${edinet.reason} / 対象 ${edinet.requestedSymbols}銘柄 / 書類一致 ${edinet.matchedFilings}件 / 指標補完 ${edinet.supplementedRows}銘柄`,
    `- EDINET lookback: ${edinet.lookbackDays ?? 'N/A'}日 / as-of ${edinet.asOfDate ?? 'N/A'}`,
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
  return `- ${profile.label}: scope は ${profile.scope_labels?.join(', ') || profile.label}。hard gate は Perf.3M > ${thresholds.perf_3m_min_pct}%。RSI ${thresholds.rsi14_min}+、相対出来高 ${relativeVolume}x+、ROE ${thresholds.roe_min_pct}%+、粗利率 ${thresholds.gross_margin_min_pct}%+、FCFマージン ${thresholds.fcf_margin_min_pct}%+、P/FCF ${thresholds.p_fcf_max} は scoring / risk penalty で評価`;
}

function buildProfileGuideRow(profile) {
  const thresholds = profile.thresholds ?? {};
  const relativeVolume = thresholds.relative_volume_min === undefined
    ? 'N/A'
    : Number(thresholds.relative_volume_min).toFixed(2);
  return `| セクタープロファイル | ${profile.label} | scope: ${profile.scope_labels?.join(', ') || profile.label} / hard gate: Perf.3M > ${thresholds.perf_3m_min_pct}% / scoring: RSI ${thresholds.rsi14_min}+、相対出来高 ${relativeVolume}x+、ROE ${thresholds.roe_min_pct}%+、粗利率 ${thresholds.gross_margin_min_pct}%+、FCFマージン ${thresholds.fcf_margin_min_pct}%+、P/FCF ${thresholds.p_fcf_max} は risk penalty |`;
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

function buildMetricGlossaryRows(market) {
  return [
    ['セクター順位', 'Phase1 でのセクター順位', '1 が最上位セクター'],
    ['セクター内順位', 'そのセクター内での順位', '1 がそのセクター内トップ'],
    ['シンボル', '銘柄のティッカー', '例: NVDA, AAPL'],
    ['市場', '上場市場', 'NASDAQ / NYSE / TSE など'],
    ['時価総額', '企業規模の目安', '大型株かどうかの確認に使う'],
    ['12M', '過去12か月の株価騰落率 (Perf.Y)', '長期モメンタム。高いほど 1 年で強い'],
    ['6M', '過去6か月の株価騰落率 (Perf.6M)', '中期モメンタム'],
    ['3M', '過去3か月の株価騰落率 (Perf.3M)', '足元の勢い。短中期モメンタム'],
    ['52w', '現在株価が 52 週高値の何%位置か', '100% に近いほど 52 週高値圏'],
    ['ROIC', '投下資本利益率', '事業に使った資本でどれだけ利益を生むか'],
    ['GP/A', 'Gross Profit / Assets = 粗利益 ÷ 総資産', '資産に対する稼ぐ力を見る quality 指標'],
    ['FCFマージン', 'フリーキャッシュフロー ÷ 売上', '売上がどれだけ現金として残るか'],
    ['売上YoY', '売上高の前年比成長率', '事業成長の確認'],
    ['Rule40', '売上YoY + FCF margin', market === 'america'
      ? '主に US software 系の成長と収益性をまとめて確認'
      : '日本株では参考表示のみ。EDINET 補完で埋まる場合がある'],
    ['EPS YoY', 'EPS の前年比成長率', '利益成長の確認。赤字分母由来の黒字転換は強調表示し、TradingView raw 値は併記する'],
    ['P/FCF', '株価 ÷ FCF の倍率', '低いほど割高感が小さい傾向'],
    ['ATR%', 'ATR ÷ 株価 × 100', '値動きの荒さ。高いほどボラティリティが高い'],
    ['総合点 (T/F)', 'repo 独自の総合スコア', '高いほど良い。T はテクニカル寄り、F はファンダ寄り'],
  ];
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
  const reportCount = result.scannerScope?.market === 'america' && Array.isArray(result.finalStockRanking)
    ? result.finalStockRanking.length
    : result.matched;
  return [
    `セクター別取得候補 ${result.totalScanned.toLocaleString()}銘柄`,
    `ユニバース条件通過 ${result.serverFiltered}銘柄`,
    `ランキング対象 ${result.clientFiltered}銘柄`,
    `レポート掲載 ${reportCount}銘柄`,
  ].join(' → ');
}

function buildGuideRows(result) {
  const rows = [
    `| 共通条件 | ベース条件 | 時価総額 > ${formatUsdThreshold(result.criteria.market_cap_min_usd)} / EPS(TTM) > ${result.criteria.eps_min} / Close > SMA200 / Close > SMA50 / Close ≥ 52週高値 × ${result.criteria.price_pct_of_52wk_high_min}% |`,
  ];

  if (result.criteria.rule_of_40_policy) {
    rows.push(`| 補助ポリシー | Rule of 40 | ${result.criteria.rule_of_40_policy.scope} / ${result.criteria.rule_of_40_policy.formula} / ${result.criteria.rule_of_40_policy.pass_badge_min}+ を badge / ${result.criteria.rule_of_40_policy.warning_below} 未満を warning / hard filter なし |`);
  }
  if (result.criteria.us_fundamental_supplement_policy) {
    rows.push(`| 補助ポリシー | US FCF補完 | ${result.criteria.us_fundamental_supplement_policy} |`);
  }
  if (result.criteria.us_missing_metric_supplement_policy) {
    rows.push(`| 補助ポリシー | US 指標補完 | ${result.criteria.us_missing_metric_supplement_policy} |`);
  }
  if (result.criteria.theme_taxonomy_policy) {
    rows.push(`| 補助ポリシー | Theme taxonomy | ${result.criteria.theme_taxonomy_policy.scope} / ${result.criteria.theme_taxonomy_policy.approach} / version ${result.criteria.theme_taxonomy_policy.version} |`);
  }
  if (result.criteria.allowed_exchanges) {
    rows.push(`| ユニバース | 取引所 | ${result.criteria.allowed_exchanges.join(', ')} |`);
  }
  if (result.criteria.symbol_allowlist_key) {
    rows.push(`| ユニバース | 銘柄ユニバース | ${result.criteria.symbol_allowlist_key} |`);
  }
  if (result.enrichedWithYahoo) {
    rows.push('| 補助ポリシー | Moomoo 補助 | 売上成長率 YoY は growth scoring に使い、EPS YoY / P/FCF は TradingView 欠損時の表内指標補完に使う |');
  }
  if (result.criteria.japan_fundamentals_policy) {
    rows.push(`| 補助ポリシー | 日本株ファンダ補完 | ${result.criteria.japan_fundamentals_policy} |`);
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

function formatUsdThreshold(value) {
  if (!Number.isFinite(Number(value))) return '$1B';
  const number = Number(value);
  if (number >= 1_000_000_000) return `$${Number((number / 1_000_000_000).toFixed(1)).toString().replace(/\.0$/, '')}B`;
  if (number >= 1_000_000) return `$${Number((number / 1_000_000).toFixed(1)).toString().replace(/\.0$/, '')}M`;
  return `$${number.toLocaleString('en-US')}`;
}

function getRuntimeConfig() {
  return {
    reportPath: process.env.SCREENER_REPORT_PATH ? join(REPO_ROOT, process.env.SCREENER_REPORT_PATH) : DEFAULT_REPORT_PATH,
    title: process.env.SCREENER_REPORT_TITLE || null,
    currencySymbol: process.env.SCREENER_CURRENCY_SYMBOL || DEFAULT_CURRENCY_SYMBOL,
    workflowLabel: process.env.SCREENER_WORKFLOW_LABEL || 'daily-screener',
    resultLimit: process.env.SCREENER_RESULT_LIMIT
      ? Number(process.env.SCREENER_RESULT_LIMIT)
      : 90,
    screenerOptions: {
      market: process.env.SCREENER_MARKET || 'america',
      exchangeAllowlist: parseExchangeAllowlist(process.env.SCREENER_EXCHANGES),
      forcePhase1Sectors: parseCsvList(process.env.SCREENER_FORCE_PHASE1_SECTORS),
      extraPhase1Sectors: parseCsvList(process.env.SCREENER_EXTRA_PHASE1_SECTORS),
      hierarchyFocusSector: process.env.SCREENER_HIERARCHY_SECTOR || undefined,
      hierarchyTopMiddleThemeCount: process.env.SCREENER_HIERARCHY_TOP_MIDDLE_THEMES
        ? Number(process.env.SCREENER_HIERARCHY_TOP_MIDDLE_THEMES)
        : undefined,
      hierarchyTopSmallThemeCount: process.env.SCREENER_HIERARCHY_TOP_SMALL_THEMES
        ? Number(process.env.SCREENER_HIERARCHY_TOP_SMALL_THEMES)
        : undefined,
      hierarchyTopStockCount: process.env.SCREENER_HIERARCHY_TOP_STOCKS
        ? Number(process.env.SCREENER_HIERARCHY_TOP_STOCKS)
        : undefined,
      grossMarginMinPct: process.env.SCREENER_GROSS_MARGIN_MIN_PCT
        ? Number(process.env.SCREENER_GROSS_MARGIN_MIN_PCT)
        : undefined,
      symbolAllowlistKey: process.env.SCREENER_SYMBOL_ALLOWLIST_KEY || undefined,
      selectedSectorCount: process.env.SCREENER_SELECTED_SECTOR_COUNT
        ? Number(process.env.SCREENER_SELECTED_SECTOR_COUNT)
        : 3,
      marketCapMinUsd: process.env.SCREENER_MARKET_CAP_MIN_USD
        ? Number(process.env.SCREENER_MARKET_CAP_MIN_USD)
        : undefined,
      scopeLabel: process.env.SCREENER_SCOPE_LABEL || undefined,
      edinetApiKey: process.env.EDINET_API_KEY || undefined,
    },
  };
}

export function buildMarkdown(result, options = {}) {
  const jst = formatJstDateParts(result.retrieved_at);
  const title = options.title ?? `スクリーニング結果 ${jst.dateWithWeekday}`;
  const currencySymbol = options.currencySymbol ?? DEFAULT_CURRENCY_SYMBOL;
  const market = result.scannerScope?.market;
  const populationSize = result.results.length;
  const benchmarkLabel = getBenchmarkDisplay(result);
  const resultRowsByKey = new Map((result.results ?? []).map((row) => [buildRowLookupKey(row), row]));
  const showRuleOf40CoverageSection = options.showRuleOf40CoverageSection ?? market !== 'america';
  const showPhase2SectorBreakdownSection = options.showPhase2SectorBreakdownSection ?? false;
  const showTopSelectionReasonsSection = options.showTopSelectionReasonsSection ?? false;

  const lines = [
    `# ${title}`,
    '',
    `更新: ${jst.timeOnly}`,
    '',
    buildHeadlineSummary(result),
    '',
  ];

  const ruleOf40CoverageLines = buildRuleOf40CoverageLines(result);
  const sourceCoverageLines = buildSourceCoverageLines(result);
  if (sourceCoverageLines.length > 0) {
    lines.push('## データソース状況');
    lines.push('');
    sourceCoverageLines.forEach((line) => lines.push(line));
    lines.push('');
  }
  if (showRuleOf40CoverageSection && ruleOf40CoverageLines.length > 0) {
    lines.push('## Rule of 40 算出状況');
    lines.push('');
    ruleOf40CoverageLines.forEach((line) => lines.push(line));
    lines.push('');

    const missingRows = buildRuleOf40MissingRows(result);
    if (missingRows.length > 0) {
      lines.push('| シンボル | セクター | 売上YoY | FCF margin | 状態 |');
      lines.push('|:---|:---|---:|---:|:---|');
      missingRows.forEach((row) => {
        const hasRevenue = row.revenueGrowthTtm !== null && row.revenueGrowthTtm !== undefined;
        const hasFcf = row.fcfMargin !== null && row.fcfMargin !== undefined;
        const status = hasRevenue && !hasFcf
          ? 'FCF欠け'
          : !hasRevenue && hasFcf
            ? '売上欠け'
            : '両方欠け';
        lines.push(`| ${row.symbol} | ${row.sector ?? '-'} | ${fmt(row.revenueGrowthTtm)}% | ${fmt(row.fcfMargin)}% | ${status} |`);
      });
      lines.push('');
    }
  }

  lines.push('## Phase1 セクターランキング');
  lines.push('');
  if (!result.sectorMomentum || !result.sectorMomentum.rankings || result.sectorMomentum.rankings.length === 0) {
    lines.push('- Phase1 セクター順位は算出できませんでした。');
  } else {
    lines.push(`- Phase1 ソース候補数: ${result.sectorMomentum.coverage?.scopedCandidates ?? 'N/A'} / reported ${result.sectorMomentum.coverage?.totalCandidatesReported ?? 'N/A'}`);
    if (result.sectorMomentum.benchmark?.symbol) {
      lines.push(`- 相対強度の基準: ${result.sectorMomentum.benchmark.exchange ?? '-'}:${result.sectorMomentum.benchmark.symbol}（${benchmarkLabel}）`);
    }
    lines.push('- 12M / 6M / 3M はセクター構成銘柄の平均リターンです。');
    lines.push('');
    lines.push(`| 順位 | セクター | 平均12M | 平均6M | 平均3M | ${benchmarkLabel}差12M | ${benchmarkLabel}差6M | ${benchmarkLabel}差3M | SMA50上 | SMA200上 | 52w高値90%内 | RSI | 相対出来高 | 構成数 | 順位合計 |`);
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
    if (result.themeRanking?.length && market === 'japan') {
      lines.push('## Phase2 テーマランキング');
      lines.push('');
      if (market === 'japan' && result.focusedHierarchy?.focusSector) {
        lines.push(`- 対象セクター: ${result.focusedHierarchy.focusSector}（Phase1 1位 / TradingView sector）`);
        lines.push(`- 集計対象: ${result.focusedHierarchy.focusSector} の通過銘柄 ${result.focusedHierarchy.candidateCount}件を、みんかぶ対応テーマへ分類`);
        lines.push('');
      }
      lines.push('| 順位 | テーマ | 通過銘柄数 | 平均3M | 平均総合点 | 主な小テーマ | 外部確認 |');
      lines.push('|:---:|:---|---:|---:|---:|:---|:---|');
      result.themeRanking.forEach((entry, index) => {
        lines.push(`| ${index + 1} | ${entry.theme} | ${entry.count} | ${fmt(entry.averagePerf3m)}% | ${fmt(entry.averageRankScore, 2)} | ${entry.topSubThemes?.join(', ') || 'N/A'} | ${entry.externalConfirmedBy?.join(', ') || 'なし'} |`);
      });
      lines.push('');
    }

    if (market === 'america') {
      lines.push('## Phase3 Industryランキング');
      lines.push('');
      lines.push('- 対象: Phase2通過銘柄をTradingView industryで集計（上位20 industry）');
      if (result.criteria?.industry_ranking?.missing_industry_count > 0) {
        lines.push(`- Industry欠損のため集計対象外: ${result.criteria.industry_ranking.missing_industry_count}銘柄`);
      }
      lines.push('');
      if (!result.industryRanking || result.industryRanking.length === 0) {
        lines.push('- Industryランキングは算出できませんでした。');
      } else {
        lines.push('| 順位 | セクター | Industry | 通過銘柄数 | 平均12M | 平均6M | 平均3M | 平均総合点 | 平均52w | 平均RSI | 上位銘柄 |');
        lines.push('|:---:|:---|:---|---:|---:|---:|---:|---:|---:|---:|:---|');
        result.industryRanking.forEach((entry, index) => {
          lines.push(`| ${index + 1} | ${entry.sector} | ${entry.industry} | ${entry.count} | ${fmt(entry.averagePerfY)}% | ${fmt(entry.averagePerf6m)}% | ${fmt(entry.averagePerf3m)}% | ${fmt(entry.averageRankScore, 2)} | ${fmt(entry.averagePctOf52wHigh)}% | ${fmt(entry.averageRsi14)} | ${entry.topSymbols?.join(', ') || 'N/A'} |`);
        });
      }
      lines.push('');

      lines.push('## Final 個別銘柄ランキング');
      lines.push('');
      lines.push(`- 対象Industry: ${result.industryRanking?.slice(0, 5).map((entry) => entry.industry).join(', ') || 'なし'}`);
      lines.push('');
      if (!result.finalStockRanking || result.finalStockRanking.length === 0) {
        lines.push('- 個別銘柄ランキングは算出できませんでした。');
      } else {
        const scoreHeader = '総合点 (T/F)';
        lines.push(`| 順位 | セクター | Industry | シンボル | 市場 | 時価総額 | 12M | 6M | 3M | 52w | ROIC | GP/A | FCFマージン | 売上YoY | Rule40 | EPS YoY | P/FCF | ATR% | ${scoreHeader} |`);
        lines.push('|:---:|:---|:---|:---|:---:|:---|---:|---:|---:|---:|---:|---:|---:|---:|:---|:---|---:|---:|---:|');
        result.finalStockRanking.forEach((row, index) => {
          const metricCells = buildRankingMetricCells(row, result.scannerScope?.market, populationSize, currencySymbol).join(' | ');
          lines.push(`| ${index + 1} | ${row.sector ?? 'Unknown'} | ${row.industry ?? 'Unknown'} | **${formatSymbolWithCompanyName(row, market)}** | ${row.exchange ?? '-'} | ${metricCells} |`);
        });
      }
      lines.push('');
    } else if (result.focusedHierarchy?.focusSector) {
      const focusSector = result.focusedHierarchy.focusSector;
      lines.push(`## Phase3 小テーマランキング (${focusSector})`);
      lines.push('');
      lines.push(`- Phase2 掲載中テーマ: ${result.focusedHierarchy.selectedMiddleThemes?.join(', ') || 'なし'}`);
      lines.push('');
      if (!result.focusedHierarchy.smallThemeRanking || result.focusedHierarchy.smallThemeRanking.length === 0) {
        lines.push('- 小テーマランキングは算出できませんでした。');
      } else {
        lines.push('| 順位 | 中テーマ | 小テーマ | 通過銘柄数 | 平均3M | 平均総合点 |');
        lines.push('|:---:|:---|:---|---:|---:|---:|');
        result.focusedHierarchy.smallThemeRanking.forEach((entry, index) => {
          lines.push(`| ${index + 1} | ${entry.middleTheme} | ${entry.smallTheme} | ${entry.count} | ${fmt(entry.averagePerf3m)}% | ${fmt(entry.averageRankScore, 2)} |`);
        });
      }
      lines.push('');

      const phase4Rows = result.focusedHierarchy.stockRanking;
      lines.push(`## Phase4 個別銘柄ランキング (${focusSector})`);
      lines.push('');
      lines.push(`- Phase3 掲載小テーマ: ${(result.focusedHierarchy.selectedSmallThemes || []).map((entry) => `${entry.middleTheme} / ${entry.smallTheme}`).join(', ') || 'なし'}`);
      lines.push('');
      if (!phase4Rows || phase4Rows.length === 0) {
        lines.push('- 個別銘柄ランキングは算出できませんでした。');
      } else {
        const scoreHeader = '総合点 (T/F)';
        lines.push(`| 順位 | 中テーマ | 小テーマ | シンボル | 市場 | 時価総額 | 12M | 6M | 3M | 52w | ROIC | GP/A | FCFマージン | 売上YoY | Rule40 | EPS YoY | P/FCF | ATR% | ${scoreHeader} |`);
        lines.push('|:---:|:---|:---|:---|:---:|:---|---:|---:|---:|---:|---:|---:|---:|---:|:---|:---|---:|---:|---:|');
        phase4Rows.forEach((row, index) => {
          const metricCells = buildRankingMetricCells(row, result.scannerScope?.market, populationSize, currencySymbol).join(' | ');
          lines.push(`| ${index + 1} | ${row.primaryTheme ?? 'Unclassified'} | ${row.subThemes?.[0] ?? '細粒度タグなし'} | **${formatSymbolWithCompanyName(row, market)}** | ${row.exchange ?? '-'} | ${metricCells} |`);
        });
      }
      lines.push('');
    }

    if (showPhase2SectorBreakdownSection) {
      lines.push('## Phase2 セクター別ランキング');
      lines.push('');
      lines.push(`- Phase1 採用は上位 ${result.sectorMomentum?.selectedSectors?.length ?? 0} セクターのみです。4位以下のセクターは Phase1 失格として除外しています。`);
      lines.push('');
      if (!result.sectorRanking || result.sectorRanking.length === 0) {
        lines.push('- 条件通過銘柄がないため、セクター別ランキングは算出できませんでした。');
        lines.push('');
      } else {
        result.sectorRanking.forEach((sector, index) => {
          const sectorRank = sector.phase1SectorRank ?? index + 1;
          const scoreHeader = '総合点 (T/F)';
          lines.push(`### ${sectorRank}位 ${sector.sector}`);
          lines.push('');
          lines.push(`- 通過銘柄数: ${sector.count}`);
          lines.push(`- セクター平均3M: ${fmt(sector.averagePerf3m)}% / 平均総合点: ${fmt(sector.averageRankScore, 2)}`);
          lines.push('');
          lines.push(`| セクター順位 | セクター内順位 | シンボル | 市場 | 時価総額 | 12M | 6M | 3M | 52w | ROIC | GP/A | FCFマージン | 売上YoY | Rule40 | EPS YoY | P/FCF | ATR% | ${scoreHeader} |`);
          lines.push('|:---:|:---:|:---|:---:|:---|---:|---:|---:|---:|---:|---:|---:|---:|:---|:---|---:|---:|---:|');
          (sector.topRows ?? []).slice(0, 30).forEach((row, rowIndex) => {
            const displayRow = resultRowsByKey.get(buildRowLookupKey(row)) ?? row;
            const metricCells = buildRankingMetricCells(displayRow, result.scannerScope?.market, populationSize, currencySymbol).join(' | ');
            lines.push(
              `| ${sectorRank} | ${rowIndex + 1} | **${formatSymbolWithCompanyName(displayRow, market)}** | ${displayRow.exchange ?? '-'} | ${metricCells} |`,
            );
          });
          lines.push('');
        });
      }
    }
  }

  if (showPhase2SectorBreakdownSection) {
    lines.push('## Phase2 通過銘柄のセクター内訳');
    lines.push('');
    if (!result.sectorRanking || result.sectorRanking.length === 0) {
      lines.push('- 条件通過銘柄がないため、Phase2 のセクター内訳は算出できませんでした。');
    } else {
      lines.push('| セクター順位 | セクター | 通過銘柄数 | 平均3M | 平均総合点 |');
      lines.push('|:---:|:---|---:|---:|---:|');
      result.sectorRanking.forEach((sector, index) => {
        const sectorRank = sector.phase1SectorRank ?? index + 1;
        lines.push(
          `| ${sectorRank} | ${sector.sector} | ${sector.count} | ${fmt(sector.averagePerf3m)}% | ${fmt(sector.averageRankScore, 2)} |`,
        );
      });
    }
    lines.push('');
  }

  if (showTopSelectionReasonsSection) {
    lines.push('## 上位3件の選定理由');
    lines.push('');
    result.results.slice(0, 3).forEach((row, index, rows) => {
      lines.push(`### ${index + 1}位 ${formatSymbolWithCompanyName(row, market)} (${row.exchange ?? '-'})`);
      lines.push(`- 総合点: ${fmt(row.rankScore, 2)}`);
      lines.push(`- テーマ: ${formatThemeLine(row)}`);
      lines.push(`- ブロック: 価格 ${fmt(getBlock(row, 'priceMomentum')?.rank, 2)} / セクター ${fmt(getBlock(row, 'sectorStrength')?.rank, 2)} / 品質 ${fmt(getBlock(row, 'quality')?.rank, 2)} / 成長 ${fmt(getBlock(row, 'growth')?.rank, 2)} / リスク・割安 ${fmt(getBlock(row, 'riskValue')?.rank, 2)} / Rule40 ${fmt(getBlock(row, 'ruleOf40')?.rank, 2)}`);
      lines.push(`- 主要指標: 12M ${fmt(row.perfY)}% / 6M ${fmt(row.perf6m)}% / 3M ${fmt(row.perf3m)}% / ROIC ${fmt(row.roic)}% / GP/A ${fmt(row.grossProfitToAssets)}% / FCF ${fmt(row.fcfMargin)}% / Rule40 ${buildRuleOf40Note(row, result.scannerScope?.market)}`);
      lines.push(`- リスク確認: ${buildRiskNote(row)}`);
      lines.push(`- 理由: ${buildExplanation(row, index, rows)}`);
      lines.push('');
    });
    lines.push('');
  }

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
  lines.push('**指標説明:**');
  lines.push('');
  lines.push('- この表は Phase2 の銘柄ランキング列を対象にしています。Phase1 の 12M / 6M / 3M はセクター構成銘柄の平均リターンです。');
  lines.push('- Phase1 の `52w高値90%内` は、セクター構成銘柄のうち 52 週高値の 90% 以内にいる銘柄比率です。');
  lines.push('');
  lines.push('| 列名 | 意味 | 見方 |');
  lines.push('|:---|:---|:---|');
  buildMetricGlossaryRows(market).forEach((row) => {
    lines.push(`| ${row[0]} | ${row[1]} | ${row[2]} |`);
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
      limit: runtime.resultLimit,
      enrichWithYahoo: true,
      _deps: runtime.screenerOptions,
    });
  } catch (err) {
    console.error('[screener] ERROR:', err.message);
    process.exit(1);
  }

  console.log(`[screener] totalScanned=${result.totalScanned} serverFiltered=${result.serverFiltered} phase1Filtered=${result.phase1Filtered} clientFiltered=${result.clientFiltered} matched=${result.matched}`);
  if (result.sourceDetails?.edinet) {
    const edinet = result.sourceDetails.edinet;
    console.log(
      `[screener] edinet enabled=${edinet.enabled} reason=${edinet.reason ?? 'n/a'} requested=${edinet.requestedSymbols ?? 0} documents=${edinet.documentCount ?? 0} docsWithSecCode=${edinet.documentsWithSecCode ?? 0} secCodeMatched=${edinet.secCodeMatchedSymbols ?? 0} eligibleDoc=${edinet.eligibleDescriptionMatchedSymbols ?? 0} csvEligible=${edinet.csvEligibleMatchedSymbols ?? 0} matchedFilings=${edinet.matchedFilings ?? 0} downloaded=${edinet.downloadedRows ?? 0} factRows=${edinet.rowsWithFactRows ?? 0} errors=${edinet.errorRows ?? 0} supplemented=${edinet.supplementedRows ?? 0}`,
    );
    if ((edinet.documentsWithSecCode ?? 0) === 0 && edinet.sampleCodeFields) {
      console.log(`[screener] edinet sampleCodeFields=${JSON.stringify(edinet.sampleCodeFields)}`);
    }
    if (Array.isArray(edinet.sampleDownloads) && edinet.sampleDownloads.length > 0) {
      console.log(`[screener] edinet sampleDownloads=${JSON.stringify(edinet.sampleDownloads)}`);
    }
    if (edinet.sampleError) {
      console.log(`[screener] edinet sampleError=${edinet.sampleError}`);
    }
    if (edinet.error) {
      console.log(`[screener] edinet error=${edinet.error}`);
    }
  }

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
