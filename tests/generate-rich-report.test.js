import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const PROJECT_ROOT = process.cwd();
const SCRIPT_PATH = join(PROJECT_ROOT, 'scripts', 'backtest', 'generate-rich-report.mjs');

describe('generate-rich-report', () => {
  it('renders the human-facing template with conclusion, full scoreboard, top strategy symbol tables, and next actions', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'generate-rich-report-'));
    const usPath = join(tempRoot, 'us.json');
    const jpPath = join(tempRoot, 'jp.json');
    const outPath = join(tempRoot, 'report.md');
    const rankingPath = join(tempRoot, 'ranking.json');

    const runs = (market, symbols) => ([
      { presetId: 'strat-a', market, symbol: symbols[0], label: symbols[0], result: { success: true, tester_available: true, metrics: { net_profit: 130, profit_factor: 2.1, max_drawdown: 40, percent_profitable: 61, closed_trades: 10 } } },
      { presetId: 'strat-a', market, symbol: symbols[1], label: symbols[1], result: { success: true, tester_available: true, metrics: { net_profit: 90, profit_factor: 1.8, max_drawdown: 35, percent_profitable: 58, closed_trades: 9 } } },
      { presetId: 'strat-b', market, symbol: symbols[0], label: symbols[0], result: { success: true, tester_available: true, metrics: { net_profit: 110, profit_factor: 1.9, max_drawdown: 42, percent_profitable: 55, closed_trades: 11 } } },
      { presetId: 'strat-b', market, symbol: symbols[1], label: symbols[1], result: { success: true, tester_available: true, metrics: { net_profit: 70, profit_factor: 1.5, max_drawdown: 38, percent_profitable: 50, closed_trades: 10 } } },
      { presetId: 'strat-c', market, symbol: symbols[0], label: symbols[0], result: { success: true, tester_available: true, metrics: { net_profit: 95, profit_factor: 1.7, max_drawdown: 30, percent_profitable: 54, closed_trades: 8 } } },
      { presetId: 'strat-c', market, symbol: symbols[1], label: symbols[1], result: { success: true, tester_available: true, metrics: { net_profit: 75, profit_factor: 1.4, max_drawdown: 29, percent_profitable: 51, closed_trades: 9 } } },
    ]);

    writeFileSync(usPath, JSON.stringify(runs('US', ['AAPL', 'MSFT']), null, 2), 'utf8');
    writeFileSync(jpPath, JSON.stringify(runs('JP', ['TSE:7203', 'TSE:8002']), null, 2), 'utf8');

    const result = spawnSync('node', [
      SCRIPT_PATH,
      '--us', usPath,
      '--jp', jpPath,
      '--out', outPath,
      '--ranking-out', rankingPath,
    ], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    });

    try {
      assert.equal(result.status, 0, result.stderr || result.stdout);
      const report = readFileSync(outPath, 'utf8');
      assert.match(report, /## 結論/);
      assert.match(report, /## 全戦略スコア一覧/);
      assert.match(report, /## Top 5 戦略の銘柄別成績/);
      assert.match(report, /## 改善点と次回バックテスト確認事項/);
      assert.match(report, /`strat-a`/);
      assert.match(report, /`strat-b`/);
      assert.match(report, /AAPL/);
      assert.match(report, /TSE:7203/);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
