import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildMarkdown } from '../scripts/screener/run-fundamental-screening.mjs';

const PROJECT_ROOT = process.cwd();
const WORKFLOW_PATH = join(PROJECT_ROOT, '.github', 'workflows', 'daily-screener.yml');
const JP_WORKFLOW_PATH = join(PROJECT_ROOT, '.github', 'workflows', 'daily-screener-japan.yml');
const SYNC_SCRIPT_PATH = join(PROJECT_ROOT, 'scripts', 'windows', 'github-actions', 'sync-daily-screener-report-to-main.ps1');
const REPORT_TEMPLATE_PATH = join(PROJECT_ROOT, 'docs', 'reports', 'screener', 'TEMPLATE.md');

describe('Daily Fundamental Screener workflow', () => {
  it('preserves local self-hosted artifacts and avoids npm cache save warnings', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

    assert.match(workflow, /actions\/checkout@v4[\s\S]*?with:[\s\S]*?clean:\s+false/,
      'workflow checkout must not delete untracked local artifacts');
    assert.doesNotMatch(workflow, /cache:\s+['"]?npm['"]?/,
      'workflow must not enable setup-node npm cache on the Windows self-hosted runner');
  });

  it('publishes the report from the Windows checkout and uploads run metadata', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

    assert.match(workflow, /SCREENER_EXCHANGES:\s+NASDAQ,NYSE/,
      'US workflow must limit the report universe to NASDAQ and NYSE');
    assert.match(workflow, /SCREENER_RESULT_LIMIT:\s+'90'/,
      'US workflow must publish up to 30 names for each of the top 3 sectors');
    assert.match(workflow, /SCREENER_SELECTED_SECTOR_COUNT:\s+'3'/,
      'US workflow must narrow phase1 sector selection to the strongest 3 sectors');
    assert.match(workflow, /SCREENER_EXTRA_PHASE1_SECTORS:\s+Technology Services/,
      'US workflow must keep AI cloud names such as NBIS observable even when Technology Services is outside the top 3 sectors');
    assert.match(workflow, /SCREENER_GROSS_MARGIN_MIN_PCT:\s+'30'/,
      'US workflow must lower the gross-margin threshold to 30%');
    assert.match(workflow, /name:\s+Publish screener report to main/,
      'workflow must run a dedicated publish step after report generation');
    assert.match(workflow, /name:\s+Validate screener report output/,
      'workflow must fail fast if the screener did not emit the markdown report');
    assert.match(workflow, /sync-daily-screener-report-to-main\.ps1/,
      'workflow must call the Windows native sync PowerShell script');
    assert.match(workflow, /SCREENER_METADATA_PATH:\s+docs\/reports\/screener\/daily-ranking-run\.json/,
      'workflow must generate and handle per-run metadata');
    assert.match(workflow, /actions\/upload-artifact@v4[\s\S]*?path:\s*\|[\s\S]*?\$\{\{\s*env\.SCREENER_REPORT_PATH\s*\}\}[\s\S]*?\$\{\{\s*env\.SCREENER_METADATA_PATH\s*\}\}/,
      'artifact upload must keep both the report and the run metadata');
    assert.match(workflow, /name:\s+Notify LINE on success/,
      'US workflow must send a LINE notification after a successful run');
    assert.match(workflow, /name:\s+Notify LINE on failure/,
      'US workflow must send a LINE notification when the run fails');
    assert.match(workflow, /LINE_CHANNEL_ACCESS_TOKEN:\s+\$\{\{\s*secrets\.LINE_CHANNEL_ACCESS_TOKEN\s*\}\}/,
      'US workflow must pass the LINE channel access token secret');
    assert.match(workflow, /LINE_TO_USER_ID:\s+\$\{\{\s*secrets\.LINE_TO_USER_ID\s*\}\}/,
      'US workflow must pass the LINE destination user id secret');
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
    assert.match(workflow, /SCREENER_RESULT_LIMIT:\s+'60'/,
      'Japan workflow must widen the published report limit enough to surface ATH candidates like 5802 and 4980');
    assert.match(workflow, /SCREENER_REPORT_PATH:\s+docs\/reports\/screener\/daily-ranking-jp\.md/,
      'Japan workflow must write a dedicated markdown report');
    assert.match(workflow, /SCREENER_METADATA_PATH:\s+docs\/reports\/screener\/daily-ranking-jp-run\.json/,
      'Japan workflow must write dedicated metadata');
    assert.match(workflow, /EDINET_API_KEY:\s+\$\{\{\s*secrets\.EDINET_API_KEY\s*\}\}/,
      'Japan workflow must pass the EDINET API key when available');
    assert.match(workflow, /name:\s+Notify LINE on success/,
      'Japan workflow must send a LINE notification after a successful run');
    assert.match(workflow, /name:\s+Notify LINE on failure/,
      'Japan workflow must send a LINE notification when the run fails');
    assert.doesNotMatch(workflow, /SCREENER_REPORT_TITLE:/,
      'Japan workflow should rely on the shared date-based default title');
  });
});

describe('daily screener Windows native publish script', () => {
  it('stages only screener report files and pushes main', () => {
    const script = readFileSync(SYNC_SCRIPT_PATH, 'utf8');

    assert.doesNotMatch(script, /wsl\.exe|wslpath|bash -lc/,
      'publish script must not depend on WSL');
    assert.match(script, /\[string\]\$ReportPath = 'docs\/reports\/screener\/daily-ranking\.md'/,
      'publish script must accept an overridable report path');
    assert.match(script, /\[string\]\$MetadataPath = 'docs\/reports\/screener\/daily-ranking-run\.json'/,
      'publish script must accept an overridable metadata path');
    assert.match(script, /git add -- \$ReportPath \$MetadataPath/,
      'publish script must stage only the configured screener report files');
    assert.match(script, /git push origin HEAD:main/,
      'publish script must push the Windows checkout commit to main');
  });
});

describe('buildMarkdown', () => {
  const rankingBlocks = [
    {
      key: 'priceMomentum',
      label: 'Price momentum',
      weight: 32,
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
      weight: 15,
      fields: [
        { label: 'Phase1 sector rank' },
      ],
    },
    {
      key: 'quality',
      label: 'Profitability / quality',
      weight: 25,
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
      weight: 10,
      fields: [
        { label: 'Revenue YoY growth' },
        { label: 'EPS YoY growth' },
        { label: 'FCF YoY growth' },
        { label: 'Moomoo revenue growth' },
      ],
    },
    {
      key: 'riskValue',
      label: 'Risk / value guard',
      weight: 15,
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

  const rankingBlocksJapan = [
    {
      key: 'priceMomentum',
      label: 'Price momentum',
      weight: 35,
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
      weight: 15,
      fields: [
        { label: 'Phase1 sector rank' },
      ],
    },
    {
      key: 'quality',
      label: 'Profitability / quality',
      weight: 25,
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
      weight: 10,
      fields: [
        { label: 'Revenue YoY growth' },
        { label: 'EPS YoY growth' },
        { label: 'FCF YoY growth' },
        { label: 'Moomoo revenue growth' },
      ],
    },
    {
      key: 'riskValue',
      label: 'Risk / value guard',
      weight: 15,
      fields: [
        { label: 'P/FCF' },
        { label: 'EV/EBITDA' },
        { label: 'ATR %' },
        { label: 'Beta 1Y' },
        { label: 'Debt / equity' },
      ],
    },
  ];

  function rankBreakdown(rank) {
    return {
      priceMomentum: { label: 'Price momentum', weight: 32, rank, fields: { perf3m: rank } },
      sectorStrength: { label: 'Sector strength', weight: 15, rank, fields: { phase1SectorRankScore: rank } },
      quality: { label: 'Profitability / quality', weight: 25, rank, fields: { fcfMargin: rank } },
      growth: { label: 'Growth confirmation', weight: 10, rank, fields: { revenueGrowthTtm: rank } },
      riskValue: { label: 'Risk / value guard', weight: 15, rank, fields: { pFcf: rank } },
      ruleOf40: { label: 'Rule of 40 (US software)', weight: 3, rank, fields: { ruleOf40Score: rank } },
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
              p_fcf_max: '50 (fabless), 120 (IDM/foundry)',
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
        us_fundamental_supplement_policy: 'TradingView FCF gaps are supplemented from configured official/adapter data when available; supplemented rows keep source metadata.',
        us_missing_metric_supplement_policy: 'TradingView missing table metrics are supplemented from Moomoo/adapter/SEC companyfacts data when available; unavailable or non-meaningful values stay N/A.',
        theme_taxonomy_policy: {
          version: 'us-theme-prototype-v2',
          scope: 'US Phase3 matched candidates only',
          approach: 'repo custom theme taxonomy layered on top of TradingView sector/industry',
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
        benchmark: { symbol: 'SPY', exchange: 'BATS', label: 'SPY', columnLabel: 'SPY', perf3m: 10.2, perf6m: 18.4, perfY: 30.5 },
        rankingFormula: ['perfY', 'perf6m', 'perf3m', 'relativeStrengthY', 'relativeStrength6m', 'relativeStrength3m', 'pctAboveSma50', 'pctAboveSma200', 'pctNear52WeekHigh'],
        coverage: { totalCandidatesReported: 20, scopedCandidates: 20, serverLimit: 20 },
        rankings: [
          {
            sector: 'Technology Services',
            memberCount: 3,
            perf3m: 11.1,
            perf6m: 18.4,
            perfY: 44.2,
            relativeStrength3m: 0.9,
            relativeStrength6m: 0.0,
            relativeStrengthY: 13.7,
            pctAboveSma50: 100,
            pctAboveSma200: 100,
            pctNear52WeekHigh: 66.7,
            rsi14: 73.7,
            relativeVolume: 1.04,
            rankScore: 5,
          },
        ],
      },
      sectorRanking: [
        {
          sector: 'Technology Services',
          phase1SectorRank: 1,
          count: 3,
          averagePerf3m: 32.4,
          averageRankScore: 91.7,
          topRows: [
            {
              symbol: 'AAA',
              exchange: 'NASDAQ',
              sector: 'Technology Services',
              marketCapUsd: 12_300_000_000,
              perfY: 1200,
              perf6m: 55,
              perf3m: 40,
              pctOf52wHigh: 98,
              roic: 32,
              grossProfitToAssets: 42,
              fcfMargin: 25,
              revenueGrowthTtm: 35,
              ruleOf40: 60,
              epsGrowthTtm: 30,
              pFcf: 28,
              atrPct: 3.2,
              rankScore: 96,
            },
            {
              symbol: 'BBB',
              exchange: 'NASDAQ',
              sector: 'Technology Services',
              marketCapUsd: 9_800_000_000,
              perfY: 70,
              perf6m: 50,
              perf3m: 35,
              pctOf52wHigh: 95,
              roic: 31,
              grossProfitToAssets: 40,
              fcfMargin: 21,
              revenueGrowthTtm: 30,
              ruleOf40: 51,
              epsGrowthTtm: 28,
              pFcf: 35,
              atrPct: 3.5,
              rankScore: 91,
            },
            {
              symbol: 'FFF',
              exchange: 'NYSE',
              sector: 'Technology Services',
              marketCapUsd: null,
              perfY: 30,
              perf6m: 20,
              perf3m: 15,
              pctOf52wHigh: 80,
              roic: 16,
              grossProfitToAssets: 16,
              fcfMargin: 13,
              revenueGrowthTtm: null,
              ruleOf40: null,
              epsGrowthTtm: 14,
              pFcf: 55,
              atrPct: 6.5,
              rankScore: 28,
            },
          ],
        },
      ],
      themeRanking: [
        {
          theme: 'Cloud Software',
          count: 2,
          averagePerf3m: 27.5,
          averageRankScore: 88.4,
          externalConfirmationCount: 4,
          externalConfirmedBy: ['Morningstar', 'MSCI', 'Nasdaq', 'moomoo'],
          topSubThemes: ['Cloud Platforms', 'Data Infrastructure Software'],
        },
        {
          theme: 'Memory',
          count: 2,
          averagePerf3m: 24.8,
          averageRankScore: 76.2,
          externalConfirmationCount: 4,
          externalConfirmedBy: ['Morningstar', 'MSCI', 'Nasdaq', 'moomoo'],
          topSubThemes: ['HBM / DRAM', 'NAND / Storage'],
        },
      ],
      focusedHierarchy: {
        focusSector: 'Electronic Technology',
        candidateCount: 4,
        selectedMiddleThemes: ['AI Compute', 'Memory', 'Semiconductor Equipment'],
        selectedSmallThemes: [
          { middleTheme: 'AI Compute', smallTheme: 'AI Accelerators' },
          { middleTheme: 'Memory', smallTheme: 'HBM / DRAM' },
          { middleTheme: 'Semiconductor Equipment', smallTheme: 'Test / Metrology / Inspection' },
        ],
        middleThemeRanking: [
          {
            middleTheme: 'AI Compute',
            count: 2,
            averagePerf3m: 31.2,
            averageRankScore: 94.4,
            topSmallThemes: ['AI Accelerators'],
          },
          {
            middleTheme: 'Memory',
            count: 2,
            averagePerf3m: 24.8,
            averageRankScore: 76.2,
            topSmallThemes: ['HBM / DRAM', 'NAND / Storage'],
          },
          {
            middleTheme: 'Semiconductor Equipment',
            count: 1,
            averagePerf3m: 23.4,
            averageRankScore: 74.1,
            topSmallThemes: ['Test / Metrology / Inspection'],
          },
        ],
        smallThemeRanking: [
          {
            middleTheme: 'AI Compute',
            smallTheme: 'AI Accelerators',
            count: 2,
            averagePerf3m: 31.2,
            averageRankScore: 94.4,
          },
          {
            middleTheme: 'Memory',
            smallTheme: 'HBM / DRAM',
            count: 1,
            averagePerf3m: 26.1,
            averageRankScore: 80.4,
          },
          {
            middleTheme: 'Semiconductor Equipment',
            smallTheme: 'Test / Metrology / Inspection',
            count: 1,
            averagePerf3m: 23.4,
            averageRankScore: 74.1,
          },
        ],
        stockRanking: [
          {
            symbol: 'NVDA',
            companyName: 'NVIDIA Corporation',
            exchange: 'NASDAQ',
            primaryTheme: 'AI Compute',
            subThemes: ['AI Accelerators'],
            marketCapUsd: 3_100_000_000_000,
            perfY: 180,
            perf6m: 72,
            perf3m: 38,
            pctOf52wHigh: 97,
            roic: 43,
            grossProfitToAssets: 50,
            fcfMargin: 41,
            revenueGrowthTtm: 88,
            ruleOf40: 129,
            epsGrowthTtm: 74,
            pFcf: 42,
            atrPct: 3.8,
            rankScore: 98,
            rankBreakdown: rankBreakdown(1),
          },
          {
            symbol: 'MU',
            companyName: 'Micron Technology, Inc.',
            exchange: 'NASDAQ',
            primaryTheme: 'Memory',
            subThemes: ['HBM / DRAM', 'Memory Controllers / Interface IP'],
            marketCapUsd: 130_000_000_000,
            perfY: 62,
            perf6m: 28,
            perf3m: 15,
            pctOf52wHigh: 92,
            roic: 18,
            grossProfitToAssets: 19,
            fcfMargin: 10,
            revenueGrowthTtm: 55,
            ruleOf40: 65,
            epsGrowthTtm: 41,
            pFcf: 26,
            atrPct: 4.1,
            rankScore: 82,
            rankBreakdown: rankBreakdown(2),
          },
          {
            symbol: 'KLAC',
            companyName: 'KLA Corporation',
            exchange: 'NASDAQ',
            primaryTheme: 'Semiconductor Equipment',
            subThemes: ['Test / Metrology / Inspection'],
            marketCapUsd: 95_000_000_000,
            perfY: 74,
            perf6m: 34,
            perf3m: 23,
            pctOf52wHigh: 94,
            roic: 26,
            grossProfitToAssets: 37,
            fcfMargin: 29,
            revenueGrowthTtm: 21,
            ruleOf40: 50,
            epsGrowthTtm: 20,
            pFcf: 30,
            atrPct: 3.2,
            rankScore: 77,
            rankBreakdown: rankBreakdown(3),
          },
        ],
      },
      ruleOf40Coverage: {
        total: 6,
        complete: 5,
        revenueOnly: 0,
        fcfOnly: 1,
        missingBoth: 0,
        completePct: 83.3,
      },
      results: [
        {
          symbol: 'AAA',
          companyName: 'Alpha Apps Inc.',
          exchange: 'NASDAQ',
          sector: 'Technology Services',
          phase1SectorRank: 1,
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
          primaryTheme: 'Cloud Software',
          subThemes: ['Cloud Platforms'],
          rankScore: 96,
          rankBreakdown: rankBreakdown(1),
        },
        {
          symbol: 'BBB',
          companyName: 'Beta Backends Corp.',
          exchange: 'NASDAQ',
          sector: 'Technology Services',
          phase1SectorRank: 1,
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
          primaryTheme: 'Cloud Software',
          subThemes: ['Data Infrastructure Software'],
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
          primaryTheme: 'Memory',
          subThemes: ['HBM / DRAM'],
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
          primaryTheme: 'Industrial / Power Electronics',
          subThemes: ['Industrial Electrification'],
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
          primaryTheme: 'Unclassified',
          subThemes: [],
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
          primaryTheme: 'Electronic Components',
          subThemes: ['MLCC / Passive Components'],
          rankScore: 28,
          rankBreakdown: rankBreakdown(6),
        },
      ],
    };

    result.industryRanking = [
      {
        sector: 'Technology Services',
        industry: 'Packaged Software',
        count: 2,
        averagePerfY: 635,
        averagePerf6m: 52.5,
        averagePerf3m: 37.5,
        relativeStrengthY: 604.5,
        relativeStrength6m: 34.1,
        relativeStrength3m: 27.3,
        pctAboveSma50: 100,
        pctAboveSma200: 100,
        pctNear52WeekHigh: 100,
        averageRsi14: 69.5,
        averageRelativeVolume: 1.25,
        industryScore: 96.5,
        topSymbols: ['AAA', 'BBB'],
      },
      {
        sector: 'Consumer Non-Durables',
        industry: 'Food: Specialty/Candy',
        count: 1,
        averagePerfY: 55,
        averagePerf6m: 36,
        averagePerf3m: 25,
        relativeStrengthY: 24.5,
        relativeStrength6m: 17.6,
        relativeStrength3m: 14.8,
        pctAboveSma50: 100,
        pctAboveSma200: 100,
        pctNear52WeekHigh: 100,
        averageRsi14: 64,
        averageRelativeVolume: 1.1,
        industryScore: 78,
        topSymbols: ['CCC'],
      },
    ];
    result.finalStockRanking = [
      { ...result.results[0], industry: 'Packaged Software' },
      { ...result.results[1], industry: 'Packaged Software' },
      { ...result.results[2], industry: 'Food: Specialty/Candy' },
    ];
    result.phase5SectorTopStocks = [
      {
        ...result.results[1],
        industry: 'Packaged Software',
        phase5SectorRank: 1,
        phase5SectorStockRank: 1,
      },
      {
        ...result.results[0],
        industry: 'Packaged Software',
        phase5SectorRank: 1,
        phase5SectorStockRank: 2,
      },
      {
        ...result.results[2],
        industry: 'Food: Specialty/Candy',
        phase5SectorRank: 2,
        phase5SectorStockRank: 1,
      },
      {
        symbol: 'HHH',
        exchange: 'NASDAQ',
        sector: 'Technology Services',
        industry: 'Information Technology Services',
        marketCapUsd: 7_200_000_000,
        perfY: 82,
        perf6m: 44,
        perf3m: 33,
        pctOf52wHigh: 96,
        roic: 29,
        grossProfitToAssets: 39,
        fcfMargin: 23,
        revenueGrowthTtm: 34,
        ruleOf40: 57,
        epsGrowthTtm: 27,
        pFcf: 32,
        atrPct: 3.1,
        rankScore: 88,
        rankBreakdown: rankBreakdown(2),
        phase5SectorRank: 10,
        phase5SectorStockRank: 1,
      },
    ];
    result.hiddenPhase4Candidates = [result.phase5SectorTopStocks[3]];
    result.criteria.industry_ranking = {
      source: 'TradingView scanner industry',
      top_industries_displayed: 2,
      final_industries_selected: 2,
      missing_industry_count: 0,
    };

    const markdown = buildMarkdown(result);

    assert.match(markdown, /# スクリーニング結果 2026\/05\/04（月）/);
    assert.match(markdown, /更新: 12:00 JST/);
    assert.doesNotMatch(markdown, /2026-05-04T03:00:00.000Z/);
    assert.match(markdown, /セクター別取得候補 26銘柄 → ユニバース条件通過 26銘柄 → ランキング対象 14銘柄 → レポート掲載 3銘柄/);
    assert.doesNotMatch(markdown, /## Rule of 40 算出状況/);
    assert.doesNotMatch(markdown, /- Rule of 40 完全算出: 5\/6銘柄 \(83\.3%\)/);
    assert.doesNotMatch(markdown, /- 欠損内訳: 売上のみあり 0件 \/ FCFのみあり 1件 \/ 両方欠け 0件/);
    assert.doesNotMatch(markdown, /\| シンボル \| セクター \| 売上YoY \| FCF margin \| 状態 \|/);
    assert.match(markdown, /## Phase1 セクターランキング/);
    assert.match(markdown, /相対強度の基準: BATS:SPY（SPY）/);
    assert.match(markdown, /12M \/ 6M \/ 3M はセクター構成銘柄の平均リターンです/);
    assert.doesNotMatch(markdown, /アプローチ:/);
    assert.doesNotMatch(markdown, /採用セクター:/);
    assert.match(markdown, /\| 順位 \| セクター \| 平均12M \| 平均6M \| 平均3M \| SPY差12M \| SPY差6M \| SPY差3M \| SMA50上 \| SMA200上 \| 52w高値90%内 \| RSI \| 相対出来高 \| 構成数 \| 順位合計 \|/);
    assert.match(markdown, /\| 1 \| Technology Services \| 44\.2% \| 18\.4% \| 11\.1% \| 13\.7pt \| 0\.0pt \| 0\.9pt \| 100\.0% \| 100\.0% \| 66\.7% \| 73\.7 \| 1\.04x \| 3 \| 5 \|/);
    assert.doesNotMatch(markdown, /## Phase2 テーマランキング/);
    assert.doesNotMatch(markdown, /## Phase2 中テーマランキング/);
    assert.doesNotMatch(markdown, /## Phase3 小テーマランキング/);
    assert.match(markdown, /## Phase2 Industryランキング/);
    assert.match(markdown, /- 対象: Phase1上位セクター内の広いTradingView scanner取得銘柄をindustryで集計（上位20 industry）/);
    assert.match(markdown, /\| 順位 \| セクター \| Industry \| 構成銘柄数 \| 平均12M \| 平均6M \| 平均3M \| SPY差12M \| SPY差6M \| SPY差3M \| SMA50上比率 \| SMA200上比率 \| 52w高値90%内比率 \| 平均RSI \| 平均相対出来高 \| Industry総合スコア \| 上位銘柄 \|/);
    assert.match(markdown, /\| 1 \| Technology Services \| Packaged Software \| 2 \| 635\.0% \| 52\.5% \| 37\.5% \| 604\.5pt \| 34\.1pt \| 27\.3pt \| 100\.0% \| 100\.0% \| 100\.0% \| 69\.5 \| 1\.25x \| 96\.50 \| AAA, BBB \|/);
    assert.match(markdown, /## Phase4 個別銘柄ランキング/);
    assert.doesNotMatch(markdown, /## Final 個別銘柄ランキング/);
    assert.match(markdown, /\| 順位 \| セクター \| Industry \| シンボル \| 市場 \| 時価総額 \| 12M \| 6M \| 3M \| 52w \| ROIC \| GP\/A \| FCFマージン \| 売上YoY \| Rule40 \| EPS YoY \| P\/FCF \| ATR% \| 総合点 \(T\/F\) \|/);
    assert.match(markdown, /- 対象Industry（Phase3上位20）: Packaged Software, Food: Specialty\/Candy/);
    assert.match(markdown, /- 表示上限: 全業種横断の総合点上位40銘柄/);
    assert.match(markdown, /\| 1 \| Technology Services \| Packaged Software \| \*\*AAA\*\* \| NASDAQ \| \$12\.3B \(L\) \|/);
    assert.match(markdown, /\| 2 \| Technology Services \| Packaged Software \| \*\*BBB\*\* \| NASDAQ \| \$9\.8B \(M\+\) \|/);
    assert.match(markdown, /\| 3 \| Consumer Non-Durables \| Food: Specialty\/Candy \| \*\*CCC\*\* \| NYSE \| \$4\.3B \(M\) \|/);
    assert.match(markdown, /※ 以下の「-」行はPhase5から抽出したHidden Phase4 Candidateです。Phase4 Top40には未掲載ですが、Phase5内でSector上位かつPhase4掲載水準以上の総合点を持つ銘柄です。/);
    assert.match(markdown, /\| - \| Technology Services \| Information Technology Services \| \*\*HHH\*\* \| NASDAQ \| \$7\.2B \(M\+\) \| 82\.0% \| 44\.0% \| 33\.0% \| 96\.0% \| 29\.0% \| 39\.0% \| 23\.0% \| 34\.0% \| 57\.0 \| 27\.0% \| 32\.0 \| 3\.1% \| 88\.00 \(T41\.4\/F46\.6\) \|/);
    assert.match(markdown, /## Phase5 Sector別 個別銘柄ランキング/);
    assert.match(markdown, /- 対象: Phase1 Sector Ranking 上位20セクター/);
    assert.match(markdown, /- 表示上限: 各セクターの総合点上位5銘柄（最大100銘柄）/);
    assert.match(markdown, /\| Sector Rank \| Sector内Rank \| Sector \| Industry \| Symbol \| Market \| Market Cap \| 12M \| 6M \| 3M \| 52w \| ROIC \| GP\/A \| FCF Margin \| Revenue YoY \| Rule40 \| EPS YoY \| P\/FCF \| ATR% \| 総合点 \(T\/F\) \|/);
    assert.match(markdown, /\| 1 \| 1 \| Technology Services \| Packaged Software \| \*\*BBB\*\* \| NASDAQ \| \$9\.8B \(M\+\) \|/);
    assert.match(markdown, /\| 1 \| 2 \| Technology Services \| Packaged Software \| \*\*AAA\*\* \| NASDAQ \| \$12\.3B \(L\) \|/);
    assert.match(markdown, /\| 2 \| 1 \| Consumer Non-Durables \| Food: Specialty\/Candy \| \*\*CCC\*\* \| NYSE \| \$4\.3B \(M\) \|/);
    assert.match(markdown, /\| 10 \| 1 \| Technology Services \| Information Technology Services \| \*\*HHH\*\* \| NASDAQ \| \$7\.2B \(M\+\) \|/);
    assert.doesNotMatch(markdown, /## Phase6/);
    assert.doesNotMatch(markdown, /\*\*NVDA \(NVIDIA Corporation\)\*\*/);
    assert.doesNotMatch(markdown, /\*\*AAA \(Alpha Apps Inc\.\)\*\*/);
    assert.doesNotMatch(markdown, /## Phase2 セクター別ランキング/);
    assert.doesNotMatch(markdown, /## 上位3件の選定理由/);
    assert.doesNotMatch(markdown, /### 1位 AAA \(NASDAQ\)/);
    assert.doesNotMatch(markdown, /- 総合点: 96\.00/);
    assert.doesNotMatch(markdown, /- テーマ: Cloud Software \/ Cloud Platforms/);
    assert.doesNotMatch(markdown, /低いほど良い/);
    assert.match(markdown, /Rule40/);
    assert.match(markdown, /35\.0% \| 60\.0 \| 30\.0% \| 28\.0 \| 3\.2% \| 96\.00 \(T45\.1\/F50\.9\) \|/);
    assert.doesNotMatch(markdown, /（Rule 40\+）/);
    assert.doesNotMatch(markdown, /（20未満注意）/);
    assert.doesNotMatch(markdown, /## 超急騰候補/);
    assert.doesNotMatch(markdown, /## Phase2 通過銘柄のセクター内訳/);
    assert.doesNotMatch(markdown, /\| セクター順位 \| セクター \| 通過銘柄数 \| 平均3M \| 平均総合点 \|/);
    assert.doesNotMatch(markdown, /\| 1 \| Technology Services \| 3 \| 32\.4% \| 91\.70 \|/);
    assert.doesNotMatch(markdown, /## 市場カバレッジ/);
    assert.match(markdown, /\| 区分 \| 項目 \| 条件・説明 \|/);
    assert.match(markdown, /\| 共通条件 \| ベース条件 \| 時価総額 > \$1B \/ Close > SMA200 \/ Close > SMA50 \/ Close ≥ 52週高値 × 75% \|/);
    assert.doesNotMatch(markdown, /\| 補助ポリシー \| 超急騰 \|/);
    assert.match(markdown, /\| 補助ポリシー \| Rule of 40 \| US Technology Services software-like industries only \/ total_revenue_yoy_growth_ttm \+ free_cash_flow_margin_ttm \/ 40\+ を badge \/ 20 未満を warning \/ hard filter なし \|/);
    assert.match(markdown, /\| 補助ポリシー \| Theme taxonomy \| US Phase3 matched candidates only \/ repo custom theme taxonomy layered on top of TradingView sector\/industry \/ version us-theme-prototype-v2 \|/);
    assert.match(markdown, /\| ユニバース \| 取引所 \| NASDAQ, NYSE \|/);
    assert.match(markdown, /\| 補助ポリシー \| US 指標補完 \| TradingView missing table metrics are supplemented from Moomoo\/adapter\/SEC companyfacts data when available; unavailable or non-meaningful values stay N\/A\. \|/);
    assert.match(markdown, /\| 補助ポリシー \| Moomoo 補助 \| 売上成長率 YoY は growth scoring に使い、EPS YoY \/ P\/FCF は TradingView 欠損時の表内指標補完に使う \|/);
    assert.match(markdown, /\| セクタープロファイル \| Technology Services \| scope: Technology Services \/ hard gate: Perf\.3M > 10% \/ scoring: RSI 60\+、相対出来高 1\.00x\+、ROE 20%\+、粗利率 40%\+、FCFマージン 15%\+、P\/FCF 50 は risk penalty \|/);
    assert.match(markdown, /\| セクタープロファイル \| Electronic Technology \/ Semiconductors \| scope: Electronic Technology \/ hard gate: Perf\.3M > 10% \/ scoring: RSI 60\+、相対出来高 0\.90x\+、ROE 15%\+、粗利率 30%\+、FCFマージン 5%\+、P\/FCF 50 \(fabless\), 120 \(IDM\/foundry\) は risk penalty \|/);
    assert.doesNotMatch(markdown, /## 採用した P0 \/ P1 指標/);
    assert.doesNotMatch(markdown, /## 今後改善できそうな点/);
    assert.match(markdown, /\| ブロック \| 重み \| 主な評価項目 \| 役割 \|/);
    assert.match(markdown, /\| Price momentum \| 32% \| 12M momentum, 6M momentum, 3M momentum, 52w high proximity \| 最も重視。上昇トレンドの強さと52週高値接近を評価 \|/);
    assert.match(markdown, /\| Sector strength \| 15% \| Phase1 sector rank \| 強いセクター追随かを確認 \|/);
    assert.match(markdown, /\| Profitability \/ quality \| 25% \| ROIC, Gross profit \/ assets, Operating margin, FCF margin, Cash conversion \| 収益性とキャッシュ創出力を確認 \|/);
    assert.match(markdown, /\| Growth confirmation \| 10% \| Revenue YoY growth, EPS YoY growth, FCF YoY growth, Moomoo revenue growth \| 売上・EPS・FCF の成長確認 \|/);
    assert.match(markdown, /\| Risk \/ value guard \| 15% \| P\/FCF, EV\/EBITDA, ATR %, Beta 1Y, Debt \/ equity \| 過熱バリュエーションと変動リスクを抑制 \|/);
    assert.match(markdown, /\*\*指標説明:\*\*/);
    assert.match(markdown, /この表は個別銘柄ランキング列を対象にしています。Phase1 の 12M \/ 6M \/ 3M はセクター構成銘柄の平均リターンです。/);
    assert.match(markdown, /Phase1 の `52w高値90%内` は、セクター構成銘柄のうち 52 週高値の 90% 以内にいる銘柄比率です。/);
    assert.match(markdown, /\| 列名 \| 意味 \| 見方 \|/);
    assert.match(markdown, /\| 12M \| 過去12か月の株価騰落率 \(Perf\.Y\) \| 長期モメンタム。高いほど 1 年で強い \|/);
    assert.match(markdown, /\| 52w \| 現在株価が 52 週高値の何%位置か \| 100% に近いほど 52 週高値圏 \|/);
    assert.match(markdown, /\| FCFマージン \| フリーキャッシュフロー ÷ 売上 \| 売上がどれだけ現金として残るか \|/);
    assert.match(markdown, /\| EPS YoY \| EPS の前年比成長率 \| 利益成長の確認。赤字分母由来の黒字転換は強調表示し、TradingView raw 値は併記する \|/);
    assert.match(markdown, /\| 総合点 \(T\/F\) \| repo 独自の総合スコア \| 高いほど良い。T はテクニカル寄り、F はファンダ寄り \|/);

    const markdownWithoutHierarchy = buildMarkdown({
      ...result,
      focusedHierarchy: null,
    });
    assert.match(markdownWithoutHierarchy, /## Phase4 個別銘柄ランキング/);
    assert.match(markdownWithoutHierarchy, /\| 1 \| Technology Services \| Packaged Software \| \*\*AAA\*\* \| NASDAQ \|/);
  });

  it('highlights EPS turnaround labels in ranking tables', () => {
    const result = {
      retrieved_at: '2026-05-04T03:00:00.000Z',
      totalScanned: 1,
      serverFiltered: 1,
      phase1Filtered: 1,
      clientFiltered: 1,
      matched: 1,
      enrichedWithYahoo: false,
      scannerScope: { market: 'america' },
      criteria: {
        market_cap_min_usd: 1_000_000_000,
        price_pct_of_52wk_high_min: 75,
      },
      rankingBlocks,
      sectorMomentum: {
        approach: 'stock-aggregation',
        benchmarkSymbol: 'BATS:SPY',
        benchmarkLabel: 'SPY',
      },
      phase1SectorRanking: [],
      industryRanking: [
        {
          sector: 'Electronic Technology',
          industry: 'Computer Peripherals',
          count: 1,
          averagePerfY: 80,
          averagePerf6m: 40,
          averagePerf3m: 25,
          averageRankScore: 90,
          averagePctOf52wHigh: 95,
          averageRsi14: 65,
          topSymbols: ['SNDK'],
        },
      ],
      focusedHierarchy: {
        focusSector: 'Electronic Technology',
        candidateCount: 1,
        selectedMiddleThemes: ['Memory'],
        selectedSmallThemes: [
          { middleTheme: 'Memory', smallTheme: 'NAND / Storage' },
        ],
        middleThemeRanking: [
          {
            middleTheme: 'Memory',
            count: 1,
            averagePerf3m: 25,
            averageRankScore: 90,
            topSmallThemes: ['NAND / Storage'],
          },
        ],
        smallThemeRanking: [
          {
            middleTheme: 'Memory',
            smallTheme: 'NAND / Storage',
            count: 1,
            averagePerf3m: 25,
            averageRankScore: 90,
          },
        ],
      },
      results: [
        {
          symbol: 'SNDK',
          exchange: 'NASDAQ',
          sector: 'Electronic Technology',
          industry: 'Computer Peripherals',
          marketCapUsd: 5_000_000_000,
          perfY: 80,
          perf6m: 40,
          perf3m: 25,
          pctOf52wHigh: 95,
          roic: 25,
          grossProfitToAssets: 30,
          fcfMargin: 20,
          revenueGrowthTtm: 30,
          ruleOf40: null,
          epsGrowthTtm: -144.5,
          epsGrowthDisplay: '黒字転換 (raw -144.5%)',
          pFcf: 20,
          atrPct: 3.2,
          primaryTheme: 'Memory',
          subThemes: ['NAND / Storage'],
          rankScore: 90,
          rankBreakdown: rankBreakdown(1),
        },
      ],
    };
    result.finalStockRanking = result.results;
    const markdown = buildMarkdown(result);

    assert.match(markdown, /\| 1 \| Electronic Technology \| Computer Peripherals \| \*\*SNDK\*\* \| NASDAQ \| \$5\.0B \(M\+\) \| 80\.0% \| 40\.0% \| 25\.0% \| 95\.0% \| 25\.0% \| 30\.0% \| 20\.0% \| 30\.0% \| 50\.0 \| 黒字転換 \(raw -144\.5%\) \| 20\.0 \| 3\.2% \|/);
    assert.doesNotMatch(markdown, /Hidden Phase4 Candidate/);
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
      sourceDetails: {
        edinet: {
          enabled: false,
          reason: 'missing_api_key',
          requestedSymbols: 2,
          matchedFilings: 0,
          supplementedRows: 0,
        },
      },
      ruleOf40Coverage: {
        total: 1,
        complete: 1,
        revenueOnly: 0,
        fcfOnly: 0,
        missingBoth: 0,
        completePct: 100,
      },
      rankingFormula: rankingBlocksJapan.map((block) => block.key),
      rankingBlocks: rankingBlocksJapan,
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
              p_fcf_max: 140,
            },
          },
        ],
        excluded_phase2_sectors: ['Finance'],
        allowed_exchanges: ['TSE'],
        symbol_allowlist_key: 'jpx-prime',
        japan_fundamentals_policy: 'TradingView を主軸にしつつ、FCF / PFCF / cash-conversion の欠損は EDINET 公式開示で補完する',
      },
      sectorMomentum: {
        approach: 'stock-aggregation',
        approachLabel: 'japan stock aggregation',
        selectedCount: 3,
        selectedSectors: [
          { key: 'Finance', label: 'Finance', memberCount: 8 },
        ],
        selectedStockSectors: ['Finance'],
        benchmark: { symbol: '1306', exchange: 'TSE', label: 'TOPIX', columnLabel: 'TOPIX', perf3m: 8.4, perf6m: 14.8, perfY: 25.1 },
        rankingFormula: ['perfY', 'perf6m', 'perf3m', 'relativeStrengthY', 'relativeStrength6m', 'relativeStrength3m', 'pctAboveSma50', 'pctAboveSma200', 'pctNear52WeekHigh'],
        coverage: { totalCandidatesReported: 1200, scopedCandidates: 420, serverLimit: 2000 },
        rankings: [
          {
            sector: 'Finance',
            perf3m: 11.8,
            perf6m: 20.1,
            perfY: 32.5,
            relativeStrength3m: 3.4,
            relativeStrength6m: 5.3,
            relativeStrengthY: 7.4,
            pctAboveSma50: 75.0,
            pctAboveSma200: 87.5,
            pctNear52WeekHigh: 62.5,
            rsi14: 62.5,
            relativeVolume: 1.21,
            memberCount: 8,
            rankScore: 4,
          },
        ],
      },
      themeRanking: [
        {
          theme: 'Electronic Components',
          count: 1,
          averagePerf3m: 12,
          averageRankScore: 4,
          externalConfirmationCount: 1,
          externalConfirmedBy: ['Minkabu'],
          topSubThemes: ['Passives / RF Modules'],
        },
      ],
      focusedHierarchy: {
        focusSector: 'Electronic Technology',
        candidateCount: 1,
        selectedMiddleThemes: ['Electronic Components'],
        selectedSmallThemes: [
          { middleTheme: 'Electronic Components', smallTheme: 'Passives / RF Modules' },
        ],
        middleThemeRanking: [
          {
            middleTheme: 'Electronic Components',
            count: 1,
            averagePerf3m: 12,
            averageRankScore: 4,
            topSmallThemes: ['Passives / RF Modules'],
          },
        ],
        smallThemeRanking: [
          {
            middleTheme: 'Electronic Components',
            smallTheme: 'Passives / RF Modules',
            count: 1,
            averagePerf3m: 12,
            averageRankScore: 4,
          },
        ],
        stockRanking: [
          {
            symbol: '7203',
            companyName: 'Toyota Motor Corporation',
            companyNameJa: 'トヨタ自動車',
            exchange: 'TSE',
            primaryTheme: 'Electronic Components',
            subThemes: ['Passives / RF Modules'],
            marketCapUsd: 4_500_000_000_000,
            perfY: 30,
            perf6m: 20,
            perf3m: 12,
            pctOf52wHigh: 86,
            roic: 17,
            grossProfitToAssets: 16,
            fcfMargin: 11,
            revenueGrowthTtm: 22,
            ruleOf40: 33,
            epsGrowthTtm: 18,
            pFcf: 18,
            atrPct: 2.4,
            rankScore: 4,
            rankBreakdown: rankBreakdown(1),
          },
        ],
      },
      sectorRanking: [],
      results: [
        {
          symbol: '7203',
          companyName: 'Toyota Motor Corporation',
          companyNameJa: 'トヨタ自動車',
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
          ruleOf40: 33,
          epsGrowthTtm: 18,
          pFcf: 18,
          atrPct: 2.4,
          rankScore: 4,
          rankBreakdown: rankBreakdown(1),
        },
      ],
    };

    const markdown = buildMarkdown(result, {
      currencySymbol: '¥',
    });

    assert.match(markdown, /# スクリーニング結果 2026\/05\/04（月）/);
    assert.match(markdown, /更新: 12:00 JST/);
    assert.match(markdown, /## データソース状況/);
    assert.match(markdown, /- EDINET: disabled \(no API key\)/);
    assert.match(markdown, /## Rule of 40 算出状況/);
    assert.match(markdown, /- Rule of 40 \(参考表示\) 完全算出: 1\/1銘柄 \(100\.0%\)/);
    assert.match(markdown, /## Phase1 セクターランキング/);
    assert.match(markdown, /相対強度の基準: TSE:1306（TOPIX）/);
    assert.match(markdown, /## Phase2 テーマランキング/);
    assert.match(markdown, /対象セクター: Electronic Technology（Phase1 1位 \/ TradingView sector）/);
    assert.match(markdown, /集計対象: Electronic Technology の通過銘柄 1件を、みんかぶ対応テーマへ分類/);
    assert.match(markdown, /\| 1 \| Electronic Components \| 1 \| 12\.0% \| 4\.00 \| Passives \/ RF Modules \| Minkabu \|/);
    assert.match(markdown, /\| 順位 \| セクター \| 平均12M \| 平均6M \| 平均3M \| TOPIX差12M \| TOPIX差6M \| TOPIX差3M \| SMA50上 \| SMA200上 \| 52w高値90%内 \| RSI \| 相対出来高 \| 構成数 \| 順位合計 \|/);
    assert.match(markdown, /\| 1 \| Finance \| 32\.5% \| 20\.1% \| 11\.8% \| 7\.4pt \| 5\.3pt \| 3\.4pt \| 75\.0% \| 87\.5% \| 62\.5% \| 62\.5 \| 1\.21x \| 8 \| 4 \|/);
    assert.doesNotMatch(markdown, /アプローチ:/);
    assert.doesNotMatch(markdown, /## Phase2 中テーマランキング \(Electronic Technology\)/);
    assert.match(markdown, /\| 1 \| Electronic Components \| Passives \/ RF Modules \| \*\*7203 \(トヨタ自動車\)\*\* \| TSE \| ¥4\.50T \(L\) \|/);
    assert.match(markdown, /- Phase2 掲載中テーマ: Electronic Components/);
    assert.match(markdown, /- Phase3 掲載小テーマ: Electronic Components \/ Passives \/ RF Modules/);
    assert.doesNotMatch(markdown, /## Phase2 セクター別ランキング/);
    assert.doesNotMatch(markdown, /## 上位3件の選定理由/);
    assert.match(markdown, /\| 順位 \| 中テーマ \| 小テーマ \| シンボル \| 市場 \| 時価総額 \| 12M \| 6M \| 3M \| 52w \| ROIC \| GP\/A \| FCFマージン \| 売上YoY \| Rule40 \| EPS YoY \| P\/FCF \| ATR% \| 総合点 \(T\/F\) \|/);
    assert.match(markdown, /\| 補助ポリシー \| 日本株ファンダ補完 \| TradingView を主軸にしつつ、FCF \/ PFCF \/ cash-conversion の欠損は EDINET 公式開示で補完する \|/);
    assert.match(markdown, /2\.4% \| 4\.00 \(T1\.9\/F2\.1\) \|/);
    assert.match(markdown, /\| ユニバース \| 取引所 \| TSE \|/);
    assert.match(markdown, /\| ユニバース \| 銘柄ユニバース \| jpx-prime \|/);
    assert.match(markdown, /\| 総合点 \(T\/F\) \| repo 独自の総合スコア \| 高いほど良い。T はテクニカル寄り、F はファンダ寄り \|/);
  });

  it('renders an explicit EDINET invalid API key state', () => {
    const markdown = buildMarkdown({
      retrieved_at: '2026-06-11T06:45:00.000Z',
      totalScanned: 10,
      serverFiltered: 2,
      phase1Filtered: 2,
      clientFiltered: 2,
      matched: 2,
      sourceDetails: {
        edinet: {
          enabled: true,
          reason: 'invalid_api_key',
          error: 'EDINET documents list API error: 401 Access denied due to invalid subscription key.',
        },
      },
      ruleOf40Coverage: {
        total: 0,
        complete: 0,
        revenueOnly: 0,
        fcfOnly: 0,
        missingBoth: 0,
        completePct: 0,
      },
      rankingBlocks: [],
      scannerScope: {
        market: 'japan',
      },
      sectorMomentum: {
        benchmark: { symbol: '1306', label: 'TOPIX' },
        selectedSectors: [],
        rankings: [],
      },
      criteria: {},
      themeRanking: [],
      focusedHierarchy: null,
      sectorRanking: [],
      results: [],
    }, {
      currencySymbol: '¥',
    });

    assert.match(markdown, /- EDINET: invalid API key/);
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
    assert.match(template, /相対強度の基準: benchmark/);
    assert.match(template, /benchmark差/);
    assert.doesNotMatch(template, /## 市場カバレッジ/);
    assert.doesNotMatch(template, /## 採用した P0 \/ P1 指標/);
    assert.doesNotMatch(template, /## 今後改善できそうな点/);
    assert.doesNotMatch(template, /アプローチ/);
    assert.doesNotMatch(template, /採用セクター/);
    assert.doesNotMatch(template, /## 超急騰候補/);
    assert.doesNotMatch(template, /\| 補助ポリシー \| 超急騰 \|/);
    assert.doesNotMatch(template, /## 上位5件の選定理由/);
    assert.doesNotMatch(template, /## Phase2 通過銘柄のセクター内訳/);
    assert.match(template, /\| 区分 \| 項目 \| 条件・説明 \|/);
    assert.match(template, /\| ブロック \| 重み \| 主な評価項目 \| 役割 \|/);
    assert.match(template, /\*\*指標説明:\*\*/);
    assert.match(template, /\| 列名 \| 意味 \| 見方 \|/);
    assert.match(template, /\| 12M \| 過去12か月の株価騰落率 \(Perf\.Y\) \| 長期モメンタム。高いほど 1 年で強い \|/);
  });
});
