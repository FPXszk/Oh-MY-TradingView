import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildMarkdown } from '../scripts/screener/run-fundamental-screening.mjs';

const PROJECT_ROOT = process.cwd();
const WORKFLOW_PATH = join(PROJECT_ROOT, '.github', 'workflows', 'daily-screener.yml');
const JP_WORKFLOW_PATH = join(PROJECT_ROOT, '.github', 'workflows', 'daily-screener-japan.yml');
const SYNC_SCRIPT_PATH = join(PROJECT_ROOT, 'scripts', 'windows', 'github-actions', 'sync-daily-screener-report-to-wsl.ps1');
const REPORT_TEMPLATE_PATH = join(PROJECT_ROOT, 'docs', 'reports', 'screener', 'TEMPLATE.md');

describe('Daily Fundamental Screener workflow', () => {
  it('preserves local self-hosted artifacts and avoids npm cache save warnings', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

    assert.match(workflow, /actions\/checkout@v4[\s\S]*?with:[\s\S]*?clean:\s+false/,
      'workflow checkout must not delete untracked local artifacts');
    assert.doesNotMatch(workflow, /cache:\s+['"]?npm['"]?/,
      'workflow must not enable setup-node npm cache on the Windows self-hosted runner');
  });

  it('publishes the report into the WSL checkout and uploads run metadata', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

    assert.match(workflow, /SCREENER_EXCHANGES:\s+NASDAQ,NYSE/,
      'US workflow must limit the report universe to NASDAQ and NYSE');
    assert.match(workflow, /SCREENER_GROSS_MARGIN_MIN_PCT:\s+'30'/,
      'US workflow must lower the gross-margin threshold to 30%');
    assert.match(workflow, /name:\s+Publish screener report to WSL main/,
      'workflow must run a dedicated WSL publish step after report generation');
    assert.match(workflow, /name:\s+Validate screener report output/,
      'workflow must fail fast if the screener did not emit the markdown report');
    assert.match(workflow, /sync-daily-screener-report-to-wsl\.ps1/,
      'workflow must call the WSL sync PowerShell script');
    assert.match(workflow, /SCREENER_METADATA_PATH:\s+docs\/reports\/screener\/daily-ranking-run\.json/,
      'workflow must generate and handle per-run metadata');
    assert.match(workflow, /actions\/upload-artifact@v4[\s\S]*?path:\s*\|[\s\S]*?\$\{\{\s*env\.SCREENER_REPORT_PATH\s*\}\}[\s\S]*?\$\{\{\s*env\.SCREENER_METADATA_PATH\s*\}\}/,
      'artifact upload must keep both the report and the run metadata');
  });

  it('defines a separate Japan workflow with TSE Prime scope', () => {
    const workflow = readFileSync(JP_WORKFLOW_PATH, 'utf8');

    assert.match(workflow, /name:\s+Daily Fundamental Screener Japan/,
      'Japan workflow must be defined separately');
    assert.match(workflow, /SCREENER_MARKET:\s+japan/,
      'Japan workflow must switch the scanner market to japan');
    assert.match(workflow, /SCREENER_EXCHANGES:\s+TSE/,
      'Japan workflow must filter to TSE listings');
    assert.match(workflow, /SCREENER_SYMBOL_ALLOWLIST_KEY:\s+jpx-prime/,
      'Japan workflow must restrict the universe to JPX Prime symbols');
    assert.match(workflow, /SCREENER_REPORT_PATH:\s+docs\/reports\/screener\/daily-ranking-jp\.md/,
      'Japan workflow must write a dedicated markdown report');
    assert.match(workflow, /SCREENER_METADATA_PATH:\s+docs\/reports\/screener\/daily-ranking-jp-run\.json/,
      'Japan workflow must write dedicated metadata');
  });
});

describe('daily screener WSL publish script', () => {
  it('copies only screener report files into WSL and pushes main', () => {
    const script = readFileSync(SYNC_SCRIPT_PATH, 'utf8');

    assert.match(script, /wsl\.exe/,
      'publish script must use WSL to reach the live checkout');
    assert.match(script, /\$normalizedWindowsPath\s*=\s*\$WindowsPath\s*-replace\s+'\\\\',\s*'\/'/,
      'publish script must normalize Windows backslashes before invoking wslpath');
    assert.match(script, /wsl\.exe wslpath -a \$normalizedWindowsPath/,
      'publish script must convert the normalized Windows path through wslpath');
    assert.match(script, /\[string\]\$ReportPath = 'docs\/reports\/screener\/daily-ranking\.md'/,
      'publish script must accept an overridable report path');
    assert.match(script, /\[string\]\$MetadataPath = 'docs\/reports\/screener\/daily-ranking-run\.json'/,
      'publish script must accept an overridable metadata path');
    assert.match(script, /git add -- '\$ReportPath' '\$MetadataPath'/,
      'publish script must stage only the configured screener report files');
    assert.match(script, /git push origin main/,
      'publish script must push the WSL checkout to main');
  });
});

describe('buildMarkdown', () => {
  const rankingBlocks = [
    {
      key: 'priceMomentum',
      label: 'Price momentum',
      weight: 67,
      fields: [
        { label: '12M momentum' },
        { label: '6M momentum' },
        { label: '3M momentum' },
        { label: '52w high proximity' },
      ],
    },
    {
      key: 'sectorStrength',
      label: 'Sector strength',
      weight: 10,
      fields: [
        { label: 'Phase1 sector rank' },
        { label: 'Sector 12M momentum' },
        { label: 'Sector 6M momentum' },
        { label: 'Sector 3M momentum' },
      ],
    },
    {
      key: 'quality',
      label: 'Profitability / quality',
      weight: 10,
      fields: [
        { label: 'ROIC' },
        { label: 'Gross profit / assets' },
        { label: 'Operating margin' },
        { label: 'FCF margin' },
        { label: 'Cash conversion' },
      ],
    },
    {
      key: 'growth',
      label: 'Growth confirmation',
      weight: 5,
      fields: [
        { label: 'Revenue YoY growth' },
        { label: 'EPS YoY growth' },
        { label: 'FCF YoY growth' },
        { label: 'Yahoo revenue growth' },
      ],
    },
    {
      key: 'riskValue',
      label: 'Risk / value guard',
      weight: 5,
      fields: [
        { label: 'P/FCF' },
        { label: 'EV/EBITDA' },
        { label: 'ATR %' },
        { label: 'Beta 1Y' },
        { label: 'Debt / equity' },
      ],
    },
    {
      key: 'ruleOf40',
      label: 'Rule of 40 (US software)',
      weight: 3,
      fields: [
        { label: 'Revenue growth + FCF margin' },
      ],
    },
  ];

  function rankBreakdown(rank) {
    return {
      priceMomentum: { label: 'Price momentum', weight: 67, rank, fields: { perf3m: rank } },
      sectorStrength: { label: 'Sector strength', weight: 10, rank, fields: { phase1SectorRankScore: rank } },
      quality: { label: 'Profitability / quality', weight: 10, rank, fields: { fcfMargin: rank } },
      growth: { label: 'Growth confirmation', weight: 5, rank, fields: { revenueGrowthTtm: rank } },
      riskValue: { label: 'Risk / value guard', weight: 5, rank, fields: { pFcf: rank } },
      ruleOf40: { label: 'Rule of 40 (US software)', weight: 3, rank, fields: { ruleOf40: rank } },
    };
  }

  it('renders phase1 sector ranking, phase2 sector breakdown, and market coverage', () => {
    const result = {
      retrieved_at: '2026-05-04T03:00:00.000Z',
      totalScanned: 26,
      serverFiltered: 26,
      phase1Filtered: 14,
      clientFiltered: 14,
      matched: 6,
      enrichedWithYahoo: true,
      rankingFormula: rankingBlocks.map((block) => block.key),
      rankingBlocks,
      scannerScope: {
        market: 'america',
        instrumentTypes: ['stock'],
        serverLimit: 160,
        profileRequestCount: 3,
        scopeLabel: 'NASDAQ + NYSE stocks only (OTC excluded)',
        note: 'filtered candidates for this run',
      },
      marketBreakdown: {
        serverFiltered: [{ name: 'NASDAQ', count: 10 }, { name: 'NYSE', count: 4 }],
        phase1Filtered: [{ name: 'NASDAQ', count: 6 }, { name: 'NYSE', count: 3 }],
        clientFiltered: [{ name: 'NASDAQ', count: 5 }, { name: 'NYSE', count: 2 }],
        matched: [{ name: 'NASDAQ', count: 4 }, { name: 'NYSE', count: 2 }],
      },
      criteria: {
        eps_min: 0,
        price_pct_of_52wk_high_min: 75,
        profile_summaries: [
          {
            label: 'Technology Services',
            scope_labels: ['Technology Services'],
            thresholds: {
              rsi14_min: 60,
              relative_volume_min: 1.0,
              roe_min_pct: 20,
              gross_margin_min_pct: 40,
              fcf_margin_min_pct: 15,
              perf_3m_min_pct: 10,
              p_fcf_max: 50,
            },
          },
          {
            label: 'Electronic Technology / Semiconductors',
            scope_labels: ['Electronic Technology'],
            thresholds: {
              rsi14_min: 60,
              relative_volume_min: 0.9,
              roe_min_pct: 15,
              gross_margin_min_pct: 30,
              fcf_margin_min_pct: 5,
              perf_3m_min_pct: 10,
              p_fcf_max: '50 (fabless), 100 (IDM/foundry)',
            },
          },
        ],
        excluded_phase2_sectors: [],
        allowed_exchanges: ['NASDAQ', 'NYSE'],
        extreme_momentum_policy: {
          perf_6m_extreme_pct: 600,
          perf_y_extreme_pct: 1000,
          action: 'retain_and_flag',
        },
        rule_of_40_policy: {
          scope: 'US Technology Services software-like industries only',
          formula: 'total_revenue_yoy_growth_ttm + free_cash_flow_margin_ttm',
          action: 'ranking_badge_warning_only',
          pass_badge_min: 40,
          warning_below: 20,
          hard_filter: false,
        },
      },
      sectorMomentum: {
        approach: 'stock-aggregation',
        approachLabel: 'US TradingView stock-sector aggregation',
        selectedCount: 3,
        selectedSectors: [
          { key: 'Technology Services', label: 'Technology Services', memberCount: 3 },
          { key: 'Electronic Technology', label: 'Electronic Technology', memberCount: 4 },
          { key: 'Finance', label: 'Finance', memberCount: 2 },
        ],
        selectedStockSectors: ['Technology Services', 'Electronic Technology', 'Finance'],
        rankingFormula: ['perfY', 'perf6m', 'perf3m', 'relativeVolume', 'rsi14', 'pctRsiAbove60'],
        coverage: { totalCandidatesReported: 20, scopedCandidates: 20, serverLimit: 20 },
        rankings: [
          {
            sector: 'Technology Services',
            memberCount: 3,
            perf1m: 22.8,
            perf3m: 11.1,
            perf6m: 18.4,
            perfY: 44.2,
            rsi14: 73.7,
            relativeVolume: 1.04,
            rankScore: 5,
          },
        ],
      },
      sectorRanking: [
        { sector: 'Technology Services', count: 3, averagePerf3m: 32.4, averageRankScore: 91.7, topSymbol: 'AAA' },
      ],
      results: [
        {
          symbol: 'AAA',
          exchange: 'NASDAQ',
          sector: 'Technology Services',
          marketCapUsd: 12_300_000_000,
          close: 100,
          perfY: 1200,
          perf6m: 55,
          perf3m: 40,
          pctOf52wHigh: 98,
          roe: 30,
          roic: 32,
          grossProfitToAssets: 42,
          fcfMargin: 25,
          revenueGrowthTtm: 35,
          ruleOf40: 60,
          epsGrowthTtm: 30,
          pFcf: 28,
          atrPct: 3.2,
          extremeMomentum: {
            isExtreme: true,
            flags: ['perfY_gt_1000'],
          },
          rankScore: 96,
          rankBreakdown: rankBreakdown(1),
        },
        {
          symbol: 'BBB',
          exchange: 'NASDAQ',
          sector: 'Technology Services',
          marketCapUsd: 9_800_000_000,
          close: 90,
          perfY: 70,
          perf6m: 50,
          perf3m: 35,
          pctOf52wHigh: 95,
          roe: 29,
          roic: 31,
          grossProfitToAssets: 40,
          fcfMargin: 21,
          revenueGrowthTtm: 30,
          ruleOf40: 51,
          epsGrowthTtm: 28,
          pFcf: 35,
          atrPct: 3.5,
          rankScore: 91,
          rankBreakdown: rankBreakdown(2),
        },
        {
          symbol: 'CCC',
          exchange: 'NYSE',
          sector: 'Consumer Non-Durables',
          marketCapUsd: 4_250_000_000,
          close: 80,
          perfY: 55,
          perf6m: 36,
          perf3m: 25,
          pctOf52wHigh: 90,
          roe: 24,
          roic: 22,
          grossProfitToAssets: 30,
          fcfMargin: 19,
          revenueGrowthTtm: 28,
          epsGrowthTtm: 22,
          pFcf: 25,
          atrPct: 2.8,
          rankScore: 78,
          rankBreakdown: rankBreakdown(3),
        },
        {
          symbol: 'DDD',
          exchange: 'NYSE',
          sector: 'Finance',
          marketCapUsd: 3_100_000_000,
          close: 70,
          perfY: 45,
          perf6m: 30,
          perf3m: 20,
          pctOf52wHigh: 88,
          roe: 18,
          roic: 18,
          grossProfitToAssets: 20,
          fcfMargin: 18,
          revenueGrowthTtm: 25,
          epsGrowthTtm: 18,
          pFcf: 22,
          atrPct: 2.5,
          rankScore: 64,
          rankBreakdown: rankBreakdown(4),
        },
        {
          symbol: 'EEE',
          exchange: 'NASDAQ',
          sector: 'Health Technology',
          marketCapUsd: 850_000_000,
          close: 60,
          perfY: 35,
          perf6m: 24,
          perf3m: 18,
          pctOf52wHigh: 82,
          roe: 17,
          roic: 17,
          grossProfitToAssets: 18,
          fcfMargin: 14,
          revenueGrowthTtm: 22,
          epsGrowthTtm: 16,
          pFcf: 50,
          atrPct: 5.5,
          rankScore: 42,
          rankBreakdown: rankBreakdown(5),
        },
        {
          symbol: 'FFF',
          exchange: 'NYSE',
          sector: 'Retail Trade',
          marketCapUsd: null,
          close: 50,
          perfY: 30,
          perf6m: 20,
          perf3m: 15,
          pctOf52wHigh: 80,
          roe: 16,
          roic: 16,
          grossProfitToAssets: 16,
          fcfMargin: 13,
          revenueGrowthTtm: null,
          epsGrowthTtm: 14,
          pFcf: 55,
          atrPct: 6.5,
          rankScore: 28,
          rankBreakdown: rankBreakdown(6),
        },
      ],
    };

    const markdown = buildMarkdown(result);

    assert.match(markdown, /# スクリーニング結果 2026\/05\/04（月）/);
    assert.match(markdown, /更新: 12:00 JST/);
    assert.doesNotMatch(markdown, /2026-05-04T03:00:00.000Z/);
    assert.match(markdown, /セクター別取得候補 26銘柄 → ユニバース条件通過 26銘柄 → ランキング対象 14銘柄 → レポート掲載 6銘柄/);
    assert.match(markdown, /## Phase1 セクターランキング/);
    assert.doesNotMatch(markdown, /アプローチ:/);
    assert.doesNotMatch(markdown, /採用セクター:/);
    assert.match(markdown, /## 銘柄ランキング/);
    assert.match(markdown, /\| 順位 \| シンボル \| セクター \| 市場 \| 時価総額 \| 12M \| 6M \| 3M \| 52w \| ROIC \| GP\/A \| FCF \| 売上YoY \| Rule40 \| EPS YoY \| P\/FCF \| ATR% \| 総合点 \|/);
    assert.match(markdown, /\| 1 \| \*\*AAA\*\* \| Technology Services \| NASDAQ \| \$12\.3B \|/);
    assert.match(markdown, /\| 5 \| \*\*EEE\*\* \| Health Technology \| NASDAQ \| \$850\.0M \|/);
    assert.match(markdown, /\| 6 \| \*\*FFF\*\* \| Retail Trade \| NYSE \| N\/A \|/);
    assert.match(markdown, /## 上位5件の選定理由/);
    assert.ok(markdown.indexOf('## 銘柄ランキング') < markdown.indexOf('## 上位5件の選定理由'));
    assert.match(markdown, /### 1位 AAA \(NASDAQ\)/);
    assert.match(markdown, /- 総合点: 96\.00/);
    assert.doesNotMatch(markdown, /低いほど良い/);
    assert.match(markdown, /Rule40/);
    assert.match(markdown, /60\.0（Rule 40\+）/);
    assert.doesNotMatch(markdown, /## 超急騰候補/);
    assert.match(markdown, /## Phase2 通過銘柄のセクター内訳/);
    assert.doesNotMatch(markdown, /## 市場カバレッジ/);
    assert.match(markdown, /\| 区分 \| 項目 \| 条件・説明 \|/);
    assert.match(markdown, /\| 共通条件 \| ベース条件 \| 時価総額 > \$1B \/ EPS\(TTM\) > 0 \/ Close > SMA200 \/ Close > SMA50 \/ Close ≥ 52週高値 × 75% \|/);
    assert.doesNotMatch(markdown, /\| 補助ポリシー \| 超急騰 \|/);
    assert.match(markdown, /\| 補助ポリシー \| Rule of 40 \| US Technology Services software-like industries only \/ total_revenue_yoy_growth_ttm \+ free_cash_flow_margin_ttm \/ 40\+ を badge \/ 20 未満を warning \/ hard filter なし \|/);
    assert.match(markdown, /\| ユニバース \| 取引所 \| NASDAQ, NYSE \|/);
    assert.match(markdown, /\| 補助ポリシー \| Yahoo Finance 補完 \| 売上成長率 YoY はプロファイル別閾値を適用し、null は通過 \|/);
    assert.match(markdown, /\| セクタープロファイル \| Technology Services \| scope: Technology Services \/ hard gate: Perf\.3M > 10% \/ P\/FCF < 50/);
    assert.match(markdown, /\| セクタープロファイル \| Electronic Technology \/ Semiconductors \| scope: Electronic Technology \/ hard gate: Perf\.3M > 10% \/ P\/FCF < 50 \(fabless\), 100 \(IDM\/foundry\)/);
    assert.match(markdown, /12M 1200\.0%の超急騰/);
    assert.doesNotMatch(markdown, /## 採用した P0 \/ P1 指標/);
    assert.doesNotMatch(markdown, /## 今後改善できそうな点/);
    assert.match(markdown, /\| ブロック \| 重み \| 主な評価項目 \| 役割 \|/);
    assert.match(markdown, /\| Price momentum \| 67% \| 12M momentum, 6M momentum, 3M momentum, 52w high proximity \| 最も重視。上昇トレンドの強さと52週高値接近を評価 \|/);
    assert.match(markdown, /\| Sector strength \| 10% \| Phase1 sector rank, Sector 12M momentum, Sector 6M momentum, Sector 3M momentum \| 強いセクター追随かを確認 \|/);
  });

  it('supports a Japan-specific title and currency symbol', () => {
    const result = {
      retrieved_at: '2026-05-04T03:00:00.000Z',
      totalScanned: 10,
      serverFiltered: 2,
      phase1Filtered: 2,
      clientFiltered: 2,
      matched: 2,
      enrichedWithYahoo: true,
      rankingFormula: rankingBlocks.map((block) => block.key),
      rankingBlocks,
      scannerScope: {
        market: 'japan',
        instrumentTypes: ['stock'],
        serverLimit: 160,
        profileRequestCount: 2,
        scopeLabel: 'JPX Prime domestic stocks snapshot (2026-03-31)',
        note: 'filtered candidates for this run',
      },
      marketBreakdown: {
        serverFiltered: [{ name: 'TSE', count: 2 }],
        phase1Filtered: [{ name: 'TSE', count: 2 }],
        clientFiltered: [{ name: 'TSE', count: 2 }],
        matched: [{ name: 'TSE', count: 2 }],
      },
      criteria: {
        eps_min: 0,
        price_pct_of_52wk_high_min: 75,
        profile_summaries: [
          {
            label: 'Japan Manufacturing',
            thresholds: {
              rsi14_min: 55,
              relative_volume_min: 0.8,
              roe_min_pct: 12,
              gross_margin_min_pct: 25,
              fcf_margin_min_pct: 5,
              perf_3m_min_pct: 8,
              p_fcf_max: 80,
            },
          },
        ],
        excluded_phase2_sectors: ['Finance'],
        allowed_exchanges: ['TSE'],
        symbol_allowlist_key: 'jpx-prime',
      },
      sectorMomentum: {
        approach: 'stock-aggregation',
        approachLabel: 'japan stock aggregation',
        selectedCount: 3,
        selectedSectors: [
          { key: 'Finance', label: 'Finance', memberCount: 8 },
        ],
        selectedStockSectors: ['Finance'],
        rankingFormula: ['perfY', 'perf6m', 'perf3m', 'relativeVolume', 'rsi14', 'pctRsiAbove60'],
        coverage: { totalCandidatesReported: 1200, scopedCandidates: 420, serverLimit: 2000 },
        rankings: [
          {
            sector: 'Finance',
            perf1m: 7.2,
            perf3m: 11.8,
            perf6m: 20.1,
            perfY: 32.5,
            rsi14: 62.5,
            relativeVolume: 1.21,
            memberCount: 8,
            rankScore: 4,
          },
        ],
      },
      sectorRanking: [],
      results: [
        {
          symbol: '7203',
          exchange: 'TSE',
          sector: 'Consumer Durables',
          marketCapUsd: 4_500_000_000_000,
          close: 3000,
          perfY: 30,
          perf6m: 20,
          perf3m: 12,
          pctOf52wHigh: 86,
          roe: 18,
          roic: 17,
          grossProfitToAssets: 16,
          fcfMargin: 11,
          revenueGrowthTtm: 22,
          epsGrowthTtm: 18,
          pFcf: 18,
          atrPct: 2.4,
          rankScore: 4,
          rankBreakdown: rankBreakdown(1),
        },
      ],
    };

    const markdown = buildMarkdown(result, {
      title: '日本株 ファンダメンタル × モメンタム スクリーニング 上位20件',
      currencySymbol: '¥',
    });

    assert.match(markdown, /# 日本株 ファンダメンタル × モメンタム スクリーニング 上位20件/);
    assert.match(markdown, /更新: 12:00 JST/);
    assert.match(markdown, /## Phase1 セクターランキング/);
    assert.doesNotMatch(markdown, /アプローチ:/);
    assert.match(markdown, /\| 1 \| \*\*7203\*\* \| Consumer Durables \| TSE \| \$4\.50T \|/);
    assert.match(markdown, /\| ユニバース \| 取引所 \| TSE \|/);
    assert.match(markdown, /\| ユニバース \| 銘柄ユニバース \| jpx-prime \|/);
  });
});

describe('daily screener template', () => {
  it('stores a human-editable report skeleton next to the generated reports', () => {
    const template = readFileSync(REPORT_TEMPLATE_PATH, 'utf8');

    assert.match(template, /# スクリーニング結果 YYYY\/MM\/DD（曜）/);
    assert.match(template, /更新: HH:MM JST/);
    assert.match(template, /セクター別取得候補 XXX銘柄 → ユニバース条件通過 XXX銘柄 → ランキング対象 XXX銘柄 → レポート掲載 XX銘柄/);
    assert.match(template, /実際の出力ロジックの正本は/);
    assert.match(template, /時価総額で確認/);
    assert.doesNotMatch(template, /## 市場カバレッジ/);
    assert.doesNotMatch(template, /## 採用した P0 \/ P1 指標/);
    assert.doesNotMatch(template, /## 今後改善できそうな点/);
    assert.doesNotMatch(template, /アプローチ/);
    assert.doesNotMatch(template, /採用セクター/);
    assert.doesNotMatch(template, /## 超急騰候補/);
    assert.doesNotMatch(template, /\| 補助ポリシー \| 超急騰 \|/);
    assert.ok(template.indexOf('## 銘柄ランキング') < template.indexOf('## 上位5件の選定理由'));
    assert.match(template, /\| 区分 \| 項目 \| 条件・説明 \|/);
    assert.match(template, /\| ブロック \| 重み \| 主な評価項目 \| 役割 \|/);
  });
});
