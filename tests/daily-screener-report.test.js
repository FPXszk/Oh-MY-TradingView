import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildMarkdown, loadRepoDotEnv } from '../scripts/screener/run-fundamental-screening.mjs';

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
        unified_scoring: {
          score_basis: 'phase4_candidates_plus_phase5_sector_top3_candidates',
          phase4_candidate_count: 3,
          phase5_candidate_count: 4,
          phase5_unified_candidate_top_stocks_per_sector: 3,
          deduped_count: 4,
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
    result.unifiedPhase4Ranking = [
      { ...result.finalStockRanking[0], unifiedRank: 1, unifiedRankScore: 96, unifiedRankBreakdown: rankBreakdown(1), sourceBuckets: ['phase4'] },
      { ...result.finalStockRanking[1], unifiedRank: 2, unifiedRankScore: 91, unifiedRankBreakdown: rankBreakdown(2), sourceBuckets: ['phase4', 'phase5'] },
      { ...result.finalStockRanking[2], unifiedRank: 3, unifiedRankScore: 28, unifiedRankBreakdown: rankBreakdown(6), sourceBuckets: ['phase4', 'phase5'] },
      { ...result.phase5SectorTopStocks[3], unifiedRank: 4, unifiedRankScore: 88, unifiedRankBreakdown: rankBreakdown(2), sourceBuckets: ['phase5'] },
    ];
    result.unifiedPhase5SectorTopStocks = result.phase5SectorTopStocks.map((row) => {
      const unifiedRow = result.unifiedPhase4Ranking.find((entry) => entry.symbol === row.symbol);
      return unifiedRow ? { ...row, ...unifiedRow, phase5SectorRank: row.phase5SectorRank, phase5SectorStockRank: row.phase5SectorStockRank } : row;
    });
    result.unifiedRankedRows = result.unifiedPhase4Ranking;
    result.unifiedScoringMeta = {
      enabled: true,
      candidateCount: 4,
      phase4CandidateCount: 3,
      phase5CandidateCount: 4,
      dedupedCount: 4,
      phase4OnlyCount: 1,
      phase5OnlyCount: 1,
      bothCount: 2,
      phase5UnifiedCandidateTopStocksPerSector: 3,
      scoreBasis: 'phase4_candidates_plus_phase5_sector_top3_candidates',
    };
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
    assert.match(markdown, /セクター別取得候補 26銘柄 → ユニバース条件通過 26銘柄 → ランキング対象 14銘柄 → レポート掲載 4銘柄/);
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
    assert.match(markdown, /\| 順位 \| 出所 \| セクター \| Industry \| シンボル \| 市場 \| 時価総額 \| 12M \| 6M \| 3M \| 52w \| ROIC \| GP\/A \| FCFマージン \| 売上YoY \| Rule40 \| EPS YoY \| P\/FCF \| ATR% \| 総合点 \(T\/F\) \|/);
    assert.match(markdown, /- 対象Industry（Phase3上位20）: Packaged Software, Food: Specialty\/Candy/);
    assert.match(markdown, /- 表示上限: 全業種横断の総合点上位40銘柄/);
    assert.match(markdown, /- スコア: Phase4候補 \+ Phase5 Sector別Top3候補を共通母集団で再採点した unifiedRankScore/);
    assert.match(markdown, /- 出所: Phase4 \/ Phase5 \/ Both は、候補がどの経路で検出されたかを示す/);
    assert.match(markdown, /\| 1 \| Phase4 \| Technology Services \| Packaged Software \| \*\*AAA\*\* \| NASDAQ \| \$12\.3B \(L\) \|/);
    assert.match(markdown, /\| 2 \| Both \| Technology Services \| Packaged Software \| \*\*BBB\*\* \| NASDAQ \| \$9\.8B \(M\+\) \|/);
    assert.match(markdown, /\| 3 \| Both \| Consumer Non-Durables \| Food: Specialty\/Candy \| \*\*CCC\*\* \| NYSE \| \$4\.3B \(M\) \|/);
    assert.doesNotMatch(markdown, /Hidden Phase4 Candidate/);
    assert.doesNotMatch(markdown, /\| - \|/);
    assert.match(markdown, /\| 4 \| Phase5 \| Technology Services \| Information Technology Services \| \*\*HHH\*\* \| NASDAQ \| \$7\.2B \(M\+\) \| 82\.0% \| 44\.0% \| 33\.0% \| 96\.0% \| 29\.0% \| 39\.0% \| 23\.0% \| 34\.0% \| 57\.0 \| 27\.0% \| 32\.0 \| 3\.1% \| 88\.00 \(T41\.4\/F46\.6\) \|/);
    assert.match(markdown, /## Phase5 Sector別 個別銘柄ランキング/);
    assert.match(markdown, /- 対象: Phase1 Sector Ranking 上位20セクター/);
    assert.match(markdown, /- 表示上限: 各セクターの総合点上位5銘柄（最大100銘柄）/);
    assert.match(markdown, /- 総合点: 各セクターTop3候補はPhase4表と同じ unifiedRankScore、4位・5位はPhase5表示用スコア（Phase4候補でもある場合は unifiedRankScore）/);
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
    assert.match(markdown, /\| 採点ポリシー \| unifiedRankScore \| Phase4候補とPhase5 Sector別Top3候補は共通母集団で1回だけ採点。Phase5表の4位・5位は表示用スコアだが、Phase4候補でもある場合は unifiedRankScore を持つ。Phase1\/Phase2の集計スコアとは別物。 \|/);
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
    assert.match(markdownWithoutHierarchy, /\| 1 \| Phase4 \| Technology Services \| Packaged Software \| \*\*AAA\*\* \| NASDAQ \|/);
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

    assert.match(markdown, /\| 1 \| - \| Electronic Technology \| Computer Peripherals \| \*\*SNDK\*\* \| NASDAQ \| \$5\.0B \(M\+\) \| 80\.0% \| 40\.0% \| 25\.0% \| 95\.0% \| 25\.0% \| 30\.0% \| 20\.0% \| 30\.0% \| 50\.0 \| 黒字転換 \(raw -144\.5%\) \| 20\.0 \| 3\.2% \|/);
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
        profileUnmatched: {
          rows: 0,
          sectors: [],
          industries: [],
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
            label: 'Japan Semiconductor & Electronics',
            scope_labels: ['Electronic Technology'],
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
          {
            label: 'Japan Electronics Other',
            scope_labels: ['Electronic Technology'],
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
        industry_ranking: {
          source: 'TradingView scanner industry',
          top_industries_displayed: 1,
          final_industries_selected: 1,
          missing_industry_count: 0,
        },
        unified_scoring: {
          score_basis: 'phase4_candidates_plus_phase5_sector_top3_candidates',
          phase4_candidate_count: 1,
          phase5_candidate_count: 1,
          phase5_unified_candidate_top_stocks_per_sector: 3,
          deduped_count: 2,
        },
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
      industryRanking: [
        {
          sector: 'Consumer Durables',
          industry: 'Motor Vehicles',
          count: 1,
          averagePerfY: 30,
          averagePerf6m: 20,
          averagePerf3m: 12,
          relativeStrengthY: 4.9,
          relativeStrength6m: 5.2,
          relativeStrength3m: 3.6,
          pctAboveSma50: 100,
          pctAboveSma200: 100,
          pctNear52WeekHigh: 100,
          averageRsi14: 63,
          averageRelativeVolume: 1.1,
          industryScore: 72.5,
          topSymbols: ['7203'],
        },
      ],
      finalStockRanking: [
        {
          symbol: '7203',
          companyName: 'Toyota Motor Corporation',
          companyNameJa: 'トヨタ自動車',
          exchange: 'TSE',
          sector: 'Consumer Durables',
          industry: 'Motor Vehicles',
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
      phase5SectorTopStocks: [
        {
          symbol: '6501',
          companyName: 'Hitachi, Ltd.',
          companyNameJa: '日立製作所',
          exchange: 'TSE',
          sector: 'Producer Manufacturing',
          industry: 'Industrial Machinery',
          primaryTheme: 'Industrial Automation',
          subThemes: ['Factory Automation'],
          marketCapUsd: 18_000_000_000_000,
          perfY: 42,
          perf6m: 25,
          perf3m: 14,
          pctOf52wHigh: 92,
          roic: 18,
          grossProfitToAssets: 17,
          fcfMargin: 12,
          revenueGrowthTtm: 16,
          ruleOf40: 28,
          epsGrowthTtm: 20,
          pFcf: 22,
          atrPct: 2.1,
          rankScore: 5,
          rankBreakdown: rankBreakdown(1),
          phase5SectorRank: 2,
          phase5SectorStockRank: 1,
        },
      ],
      unifiedPhase4Ranking: [
        {
          symbol: '7203',
          companyName: 'Toyota Motor Corporation',
          companyNameJa: 'トヨタ自動車',
          exchange: 'TSE',
          sector: 'Consumer Durables',
          industry: 'Motor Vehicles',
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
          unifiedRank: 1,
          unifiedRankScore: 4,
          unifiedRankBreakdown: rankBreakdown(1),
          sourceBuckets: ['phase4'],
        },
        {
          symbol: '6501',
          companyName: 'Hitachi, Ltd.',
          companyNameJa: '日立製作所',
          exchange: 'TSE',
          sector: 'Producer Manufacturing',
          industry: 'Industrial Machinery',
          primaryTheme: 'Industrial Automation',
          subThemes: ['Factory Automation'],
          marketCapUsd: 18_000_000_000_000,
          perfY: 42,
          perf6m: 25,
          perf3m: 14,
          pctOf52wHigh: 92,
          roic: 18,
          grossProfitToAssets: 17,
          fcfMargin: 12,
          revenueGrowthTtm: 16,
          ruleOf40: 28,
          epsGrowthTtm: 20,
          pFcf: 22,
          atrPct: 2.1,
          unifiedRank: 2,
          unifiedRankScore: 5,
          unifiedRankBreakdown: rankBreakdown(1),
          sourceBuckets: ['phase5'],
        },
      ],
      unifiedPhase5SectorTopStocks: [
        {
          symbol: '6501',
          companyName: 'Hitachi, Ltd.',
          companyNameJa: '日立製作所',
          exchange: 'TSE',
          sector: 'Producer Manufacturing',
          industry: 'Industrial Machinery',
          primaryTheme: 'Industrial Automation',
          subThemes: ['Factory Automation'],
          marketCapUsd: 18_000_000_000_000,
          perfY: 42,
          perf6m: 25,
          perf3m: 14,
          pctOf52wHigh: 92,
          roic: 18,
          grossProfitToAssets: 17,
          fcfMargin: 12,
          revenueGrowthTtm: 16,
          ruleOf40: 28,
          epsGrowthTtm: 20,
          pFcf: 22,
          atrPct: 2.1,
          unifiedRank: 2,
          unifiedRankScore: 5,
          unifiedRankBreakdown: rankBreakdown(1),
          sourceBuckets: ['phase5'],
          phase5SectorRank: 2,
          phase5SectorStockRank: 1,
        },
      ],
      unifiedRankedRows: [
        { symbol: '7203', unifiedRank: 1, unifiedRankScore: 4, unifiedRankBreakdown: rankBreakdown(1) },
        { symbol: '6501', unifiedRank: 2, unifiedRankScore: 5, unifiedRankBreakdown: rankBreakdown(1) },
      ],
      unifiedScoringMeta: {
        enabled: true,
        candidateCount: 2,
        phase4CandidateCount: 1,
        phase5CandidateCount: 1,
        dedupedCount: 2,
        phase4OnlyCount: 1,
        phase5OnlyCount: 1,
        bothCount: 0,
        phase5UnifiedCandidateTopStocksPerSector: 3,
        scoreBasis: 'phase4_candidates_plus_phase5_sector_top3_candidates',
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
    assert.doesNotMatch(markdown, /## Rule of 40 算出状況/);
    assert.doesNotMatch(markdown, /- Rule of 40 \(参考表示\) 完全算出: 1\/1銘柄 \(100\.0%\)/);
    assert.match(markdown, /## Phase1 セクターランキング/);
    assert.match(markdown, /相対強度の基準: TSE:1306（TOPIX）/);
    assert.doesNotMatch(markdown, /## Phase2 テーマランキング/);
    assert.doesNotMatch(markdown, /対象セクター: Electronic Technology（Phase1 1位 \/ TradingView sector）/);
    assert.doesNotMatch(markdown, /集計対象: Electronic Technology の通過銘柄 1件を、みんかぶ対応テーマへ分類/);
    assert.match(markdown, /\| 順位 \| セクター \| 平均12M \| 平均6M \| 平均3M \| TOPIX差12M \| TOPIX差6M \| TOPIX差3M \| SMA50上 \| SMA200上 \| 52w高値90%内 \| RSI \| 相対出来高 \| 構成数 \| 順位合計 \|/);
    assert.match(markdown, /\| 1 \| Finance \| 32\.5% \| 20\.1% \| 11\.8% \| 7\.4pt \| 5\.3pt \| 3\.4pt \| 75\.0% \| 87\.5% \| 62\.5% \| 62\.5 \| 1\.21x \| 8 \| 4 \|/);
    assert.doesNotMatch(markdown, /アプローチ:/);
    assert.match(markdown, /## Phase2 Industryランキング/);
    assert.match(markdown, /\| 順位 \| セクター \| Industry \| 構成銘柄数 \| 平均12M \| 平均6M \| 平均3M \| TOPIX差12M \| TOPIX差6M \| TOPIX差3M \| SMA50上比率 \| SMA200上比率 \| 52w高値90%内比率 \| 平均RSI \| 平均相対出来高 \| Industry総合スコア \| 上位銘柄 \|/);
    assert.match(markdown, /\| 1 \| Consumer Durables \| Motor Vehicles \| 1 \| 30\.0% \| 20\.0% \| 12\.0% \| 4\.9pt \| 5\.2pt \| 3\.6pt \| 100\.0% \| 100\.0% \| 100\.0% \| 63\.0 \| 1\.10x \| 72\.50 \| 7203 \|/);
    assert.doesNotMatch(markdown, /## Phase2 中テーマランキング \(Electronic Technology\)/);
    assert.doesNotMatch(markdown, /## Phase3 小テーマランキング/);
    assert.match(markdown, /## Phase4 個別銘柄ランキング/);
    assert.match(markdown, /\| 順位 \| 出所 \| セクター \| Industry \| テーマ \| シンボル \| 市場 \| 品質 \| 時価総額 \| 12M \| 6M \| 3M \| 52w \| ROIC \| GP\/A \| FCFマージン \| 売上YoY \| Rule40 \| EPS YoY \| P\/FCF \| ATR% \| 総合点 \(T\/F\) \|/);
    assert.match(markdown, /\| 1 \| Phase4 \| Consumer Durables \| Motor Vehicles \| Electronic Components \/ Passives \/ RF Modules \| \*\*7203 \(トヨタ自動車\)\*\* \| TSE \| - \| ¥4\.50T \(L\) \|/);
    assert.match(markdown, /\| 2 \| Phase5 \| Producer Manufacturing \| Industrial Machinery \| Industrial Automation \/ Factory Automation \| \*\*6501 \(日立製作所\)\*\* \| TSE \| - \| ¥18\.00T \(XL\) \|/);
    assert.match(markdown, /## Phase5 Sector別 個別銘柄ランキング/);
    assert.match(markdown, /\| Sector Rank \| Sector内Rank \| Sector \| Industry \| Theme \| Symbol \| Market \| Market Cap \| 12M \| 6M \| 3M \| 52w \| ROIC \| GP\/A \| FCF Margin \| Revenue YoY \| Rule40 \| EPS YoY \| P\/FCF \| ATR% \| 総合点 \(T\/F\) \|/);
    assert.match(markdown, /\| 2 \| 1 \| Producer Manufacturing \| Industrial Machinery \| Industrial Automation \/ Factory Automation \| \*\*6501 \(日立製作所\)\*\* \| TSE \| ¥18\.00T \(XL\) \|/);
    assert.doesNotMatch(markdown, /## Phase2 セクター別ランキング/);
    assert.doesNotMatch(markdown, /## 上位3件の選定理由/);
    assert.match(markdown, /\| 補助ポリシー \| 日本株ファンダ補完 \| TradingView を主軸にしつつ、FCF \/ PFCF \/ cash-conversion の欠損は EDINET 公式開示で補完する \|/);
    assert.match(markdown, /2\.4% \| 4\.00 \(T1\.9\/F2\.1\) \|/);
    assert.match(markdown, /\| ユニバース \| 取引所 \| TSE \|/);
    assert.match(markdown, /\| ユニバース \| 銘柄ユニバース \| jpx-prime \|/);
    assert.match(markdown, /\| ユニバース \| Profile未割り当て \| 0銘柄 \|/);
    assert.match(markdown, /\| セクタープロファイル \| Japan Electronics Other \| scope: Electronic Technology \/ hard gate: Perf\.3M > 8% \/ scoring: RSI 55\+、相対出来高 0\.80x\+、ROE 12%\+、粗利率 25%\+、FCFマージン 5%\+、P\/FCF 140 は risk penalty \|/);
    assert.match(markdown, /\| 採点ポリシー \| unifiedRankScore \| Phase4候補とPhase5 Sector別Top3候補は共通母集団で1回だけ採点。Phase5表の4位・5位は表示用スコアだが、Phase4候補でもある場合は unifiedRankScore を持つ。Phase1\/Phase2の集計スコアとは別物。 \|/);
    assert.match(markdown, /\| 総合点 \(T\/F\) \| repo 独自の総合スコア \| 高いほど良い。T はテクニカル寄り、F はファンダ寄り \|/);
  });

  it('renders the Japan financial audit section and quality badge', () => {
    const result = {
      retrieved_at: '2026-07-20T12:00:00.000Z',
      totalScanned: 2,
      serverFiltered: 2,
      phase1Filtered: 2,
      clientFiltered: 2,
      matched: 1,
      enrichedWithYahoo: true,
      sourceDetails: {
        edinet: {
          enabled: true,
          reason: 'active',
          requestedSymbols: 1,
          matchedFilings: 1,
          supplementedRows: 1,
          lookbackDays: 180,
          asOfDate: '2026-07-20',
        },
        profileUnmatched: { rows: 0, sectors: [], industries: [] },
      },
      ruleOf40Coverage: { total: 0, complete: 0, revenueOnly: 0, fcfOnly: 0, missingBoth: 0, completePct: 0 },
      rankingBlocks: rankingBlocksJapan,
      scannerScope: { market: 'japan', serverLimit: 90 },
      criteria: {
        price_pct_of_52wk_high_min: 75,
        profile_summaries: [],
        industry_ranking: { missing_industry_count: 0 },
        japan_fundamentals_policy: '検証済みEDINETを優先',
      },
      sectorMomentum: { rankings: [] },
      industryRanking: [{ sector: 'Process Industries', industry: 'Industrial Specialties' }],
      results: [
        {
          symbol: '4634',
          exchange: 'TSE',
          rankScore: 90,
          rankBreakdown: rankBreakdown(1),
        },
      ],
      unifiedRankedRows: [],
      unifiedPhase4Ranking: [
        {
          symbol: '4634',
          exchange: 'TSE',
          unifiedRank: 1,
          unifiedRankScore: 90,
          rankScore: 90,
          sourceBuckets: ['phase4'],
          sector: 'Process Industries',
          industry: 'Industrial Specialties',
          companyNameJa: 'artience',
          marketCapUsd: 200_000_000_000,
          perfY: 40,
          perf6m: 20,
          perf3m: 10,
          pctOf52wHigh: 98,
          roic: 5,
          grossProfitToAssets: 15,
          fcfMargin: 4.68,
          revenueGrowthTtm: 1.3,
          ruleOf40: 5.98,
          pFcf: 12,
          atrPct: 2,
          rankBreakdown: rankBreakdown(1),
          metricProvenance: {
            fcfMargin: {
              source: 'edinet',
              status: 'warning',
              rankEligible: true,
              finalValue: 4.68,
              warnings: ['tradingview_edinet_fcf_margin_diff_gte_20pt'],
            },
          },
        },
      ],
      unifiedPhase5SectorTopStocks: [],
      phase5SectorTopStocks: [],
      audit: {
        status: 'warning',
        summary: { warnings: 1, errors: 0, rankChangesOverThreshold: 1, newTop10Entries: 1 },
        rankChanges: [
          {
            symbol: '4634',
            rankBeforeSupplement: 6,
            rankAfterSupplement: 1,
            rankDelta: 5,
            scoreDelta: 20,
            changedMetrics: ['fcfMargin'],
            sources: { fcfMargin: 'edinet' },
          },
        ],
        metricAnomalies: [
          {
            symbol: '4634',
            metricName: 'fcfMargin',
            value: 4.68,
            status: 'warning',
            rankEligible: true,
            source: 'edinet',
            reasons: ['tradingview_edinet_fcf_margin_diff_gte_20pt'],
          },
        ],
        evidenceRows: [],
      },
    };

    const markdown = buildMarkdown(result, { currencySymbol: '¥' });

    assert.match(markdown, /## 財務データ監査/);
    assert.match(markdown, /- 監査結果: WARNING/);
    assert.match(markdown, /### EDINET一次情報・計算結果/);
    assert.match(markdown, /### 最終採用値・フォールバック結果/);
    assert.match(markdown, /\| 4634 \| 6 \| 1 \| 5 \| 20\.00 \| fcfMargin \| edinet \|/);
    assert.match(markdown, /\| 4634 \| fcfMargin \| 4\.68 \| warning \| 可 \| edinet \|/);
    assert.match(markdown, /\| 1 \| Phase4 \| Process Industries \| Industrial Specialties \| Unclassified \/ 細粒度タグなし \| \*\*4634 \(artience\)\*\* \| TSE \| WARN \|/);
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

describe('loadRepoDotEnv', () => {
  it('loads missing values from a dotenv file without overwriting existing environment values', () => {
    const dir = mkdtempSync(join(tmpdir(), 'omtv-dotenv-'));
    const envFilePath = join(dir, '.env');
    const env = {
      EDINET_API_KEY: 'from-existing-env',
    };

    try {
      writeFileSync(
        envFilePath,
        [
          '# local screener secrets',
          'EDINET_API_KEY=from-dotenv',
          'SCREENER_MARKET=japan',
          'QUOTED_VALUE="quoted value"',
          'INVALID-KEY=ignored',
          '',
        ].join('\n'),
        'utf8',
      );

      const result = loadRepoDotEnv({ envFilePath, env });

      assert.equal(result.loaded, true);
      assert.deepEqual(result.applied, ['SCREENER_MARKET', 'QUOTED_VALUE']);
      assert.equal(env.EDINET_API_KEY, 'from-existing-env');
      assert.equal(env.SCREENER_MARKET, 'japan');
      assert.equal(env.QUOTED_VALUE, 'quoted value');
      assert.equal(env['INVALID-KEY'], undefined);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
