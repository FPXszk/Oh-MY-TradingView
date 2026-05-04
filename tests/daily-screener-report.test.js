import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildMarkdown } from '../scripts/screener/run-fundamental-screening.mjs';

const PROJECT_ROOT = process.cwd();
const WORKFLOW_PATH = join(PROJECT_ROOT, '.github', 'workflows', 'daily-screener.yml');

describe('Daily Fundamental Screener workflow', () => {
  it('preserves local self-hosted artifacts and avoids npm cache save warnings', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

    assert.match(workflow, /actions\/checkout@v4[\s\S]*?with:[\s\S]*?clean:\s+false/,
      'workflow checkout must not delete untracked local artifacts');
    assert.doesNotMatch(workflow, /cache:\s+['"]?npm['"]?/,
      'workflow must not enable setup-node npm cache on the Windows self-hosted runner');
  });
});

describe('buildMarkdown', () => {
  it('renders top 20 heading, top 5 explanations, sector ranking, and market coverage', () => {
    const result = {
      retrieved_at: '2026-05-04T03:00:00.000Z',
      totalScanned: 26,
      serverFiltered: 26,
      clientFiltered: 14,
      matched: 6,
      enrichedWithYahoo: true,
      rankingFormula: ['perf3m', 'roe', 'fcfMargin', 'revenueGrowth'],
      scannerScope: {
        market: 'america',
        instrumentTypes: ['stock'],
        serverLimit: 160,
        note: 'filtered candidates for this run',
      },
      marketBreakdown: {
        serverFiltered: [{ name: 'NASDAQ', count: 10 }, { name: 'OTC', count: 4 }],
        clientFiltered: [{ name: 'NASDAQ', count: 5 }, { name: 'OTC', count: 2 }],
        matched: [{ name: 'NASDAQ', count: 4 }, { name: 'OTC', count: 2 }],
      },
      sectorRanking: [
        { sector: 'Technology Services', count: 3, averagePerf3m: 32.4, averageRankScore: 5.3, topSymbol: 'AAA' },
      ],
      results: [
        {
          symbol: 'AAA',
          exchange: 'NASDAQ',
          sector: 'Technology Services',
          close: 100,
          perf3m: 40,
          roe: 30,
          fcfMargin: 25,
          revenueGrowth: 0.35,
          rankScore: 4,
          rankBreakdown: { perf3m: 1, roe: 2, fcfMargin: 1, revenueGrowth: 1 },
        },
        {
          symbol: 'BBB',
          exchange: 'NASDAQ',
          sector: 'Technology Services',
          close: 90,
          perf3m: 35,
          roe: 29,
          fcfMargin: 21,
          revenueGrowth: 0.3,
          rankScore: 5,
          rankBreakdown: { perf3m: 2, roe: 1, fcfMargin: 2, revenueGrowth: 2 },
        },
        {
          symbol: 'CCC',
          exchange: 'OTC',
          sector: 'Consumer Non-Durables',
          close: 80,
          perf3m: 25,
          roe: 24,
          fcfMargin: 19,
          revenueGrowth: 0.28,
          rankScore: 8,
          rankBreakdown: { perf3m: 3, roe: 3, fcfMargin: 3, revenueGrowth: 3 },
        },
        {
          symbol: 'DDD',
          exchange: 'NYSE',
          sector: 'Finance',
          close: 70,
          perf3m: 20,
          roe: 18,
          fcfMargin: 18,
          revenueGrowth: 0.25,
          rankScore: 11,
          rankBreakdown: { perf3m: 4, roe: 4, fcfMargin: 4, revenueGrowth: 4 },
        },
        {
          symbol: 'EEE',
          exchange: 'NASDAQ',
          sector: 'Health Technology',
          close: 60,
          perf3m: 18,
          roe: 17,
          fcfMargin: 14,
          revenueGrowth: 0.22,
          rankScore: 14,
          rankBreakdown: { perf3m: 5, roe: 5, fcfMargin: 5, revenueGrowth: 5 },
        },
        {
          symbol: 'FFF',
          exchange: 'OTC',
          sector: 'Retail Trade',
          close: 50,
          perf3m: 15,
          roe: 16,
          fcfMargin: 13,
          revenueGrowth: null,
          rankScore: 17,
          rankBreakdown: { perf3m: 6, roe: 6, fcfMargin: 6, revenueGrowth: 6 },
        },
      ],
    };

    const markdown = buildMarkdown(result);

    assert.match(markdown, /# ファンダメンタル × モメンタム スクリーニング 上位20件/);
    assert.match(markdown, /## 上位5件の選定理由/);
    assert.match(markdown, /### 1位 AAA \(NASDAQ\)/);
    assert.match(markdown, /## 銘柄ランキング/);
    assert.match(markdown, /## セクターランキング/);
    assert.match(markdown, /## 市場カバレッジ/);
    assert.match(markdown, /サーバーフィルター通過: NASDAQ 10件, OTC 4件/);
    assert.match(markdown, /## 見ている指標と追加候補/);
    assert.match(markdown, /Yahoo Finance 補完あり: 売上成長率 YoY > 20%/);
  });
});
