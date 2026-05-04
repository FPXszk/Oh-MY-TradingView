import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildMarkdown } from '../scripts/screener/run-fundamental-screening.mjs';

const PROJECT_ROOT = process.cwd();
const WORKFLOW_PATH = join(PROJECT_ROOT, '.github', 'workflows', 'daily-screener.yml');
const JP_WORKFLOW_PATH = join(PROJECT_ROOT, '.github', 'workflows', 'daily-screener-japan.yml');
const SYNC_SCRIPT_PATH = join(PROJECT_ROOT, 'scripts', 'windows', 'github-actions', 'sync-daily-screener-report-to-wsl.ps1');

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
        scopeLabel: 'NASDAQ + NYSE stocks only (OTC excluded)',
        note: 'filtered candidates for this run',
      },
      marketBreakdown: {
        serverFiltered: [{ name: 'NASDAQ', count: 10 }, { name: 'NYSE', count: 4 }],
        clientFiltered: [{ name: 'NASDAQ', count: 5 }, { name: 'NYSE', count: 2 }],
        matched: [{ name: 'NASDAQ', count: 4 }, { name: 'NYSE', count: 2 }],
      },
      criteria: {
        rsi14_min: 60,
        relative_volume_min: 1.2,
        eps_min: 0,
        roe_min_pct: 15,
        gross_margin_min_pct: 30,
        fcf_margin_min_pct: 10,
        price_pct_of_52wk_high_min: 75,
        perf3m_min_pct: 10,
        p_fcf_max: 50,
        allowed_exchanges: ['NASDAQ', 'NYSE'],
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
          exchange: 'NYSE',
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
          exchange: 'NYSE',
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
      assert.match(markdown, /ユニバース追加条件: NASDAQ \+ NYSE stocks only \(OTC excluded\)/);
      assert.match(markdown, /サーバーフィルター通過: NASDAQ 10件, NYSE 4件/);
      assert.match(markdown, /粗利率\(TTM\) > 30%/);
      assert.match(markdown, /取引所限定: NASDAQ, NYSE/);
      assert.match(markdown, /## 見ている指標と追加候補/);
      assert.match(markdown, /Yahoo Finance 補完あり: 売上成長率 YoY > 20%/);
  });

  it('supports a Japan-specific title and currency symbol', () => {
    const result = {
      retrieved_at: '2026-05-04T03:00:00.000Z',
      totalScanned: 10,
      serverFiltered: 2,
      clientFiltered: 2,
      matched: 2,
      enrichedWithYahoo: true,
      rankingFormula: ['perf3m', 'roe', 'fcfMargin', 'revenueGrowth'],
      scannerScope: {
        market: 'japan',
        instrumentTypes: ['stock'],
        serverLimit: 160,
        scopeLabel: 'JPX Prime domestic stocks snapshot (2026-03-31)',
        note: 'filtered candidates for this run',
      },
      marketBreakdown: {
        serverFiltered: [{ name: 'TSE', count: 2 }],
        clientFiltered: [{ name: 'TSE', count: 2 }],
        matched: [{ name: 'TSE', count: 2 }],
      },
      criteria: {
        rsi14_min: 60,
        relative_volume_min: 1.2,
        eps_min: 0,
        roe_min_pct: 15,
        gross_margin_min_pct: 30,
        fcf_margin_min_pct: 10,
        price_pct_of_52wk_high_min: 75,
        perf3m_min_pct: 10,
        p_fcf_max: 50,
        allowed_exchanges: ['TSE'],
        symbol_allowlist_key: 'jpx-prime',
      },
      sectorRanking: [],
      results: [
        {
          symbol: '7203',
          exchange: 'TSE',
          sector: 'Consumer Durables',
          close: 3000,
          perf3m: 12,
          roe: 18,
          fcfMargin: 11,
          revenueGrowth: 0.22,
          rankScore: 4,
          rankBreakdown: { perf3m: 1, roe: 1, fcfMargin: 1, revenueGrowth: 1 },
        },
      ],
    };

    const markdown = buildMarkdown(result, {
      title: '日本株 ファンダメンタル × モメンタム スクリーニング 上位20件',
      currencySymbol: '¥',
    });

    assert.match(markdown, /# 日本株 ファンダメンタル × モメンタム スクリーニング 上位20件/);
    assert.match(markdown, /¥3000\.00/);
    assert.match(markdown, /取引所限定: TSE/);
    assert.match(markdown, /銘柄ユニバース限定: jpx-prime/);
  });
});
