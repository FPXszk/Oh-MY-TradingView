import { beforeEach, afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { spawn } from 'node:child_process';

const PROJECT_ROOT = join(process.cwd());
const SCRIPT_PATH = join(PROJECT_ROOT, 'python', 'night_batch.py');
let RESULTS_DIR = join(PROJECT_ROOT, 'results', 'night-batch');
const ROUND_MODE_COMMANDS = new Set(['bundle', 'campaign', 'recover', 'nightly', 'smoke-prod']);

function toRepoRelativePath(path) {
  return relative(PROJECT_ROOT, path).replaceAll('\\', '/');
}

function runPython(args, options = {}) {
  const effectiveArgs = [...args];
  if (!effectiveArgs.includes('--round-mode')
      && effectiveArgs.length >= 2
      && ROUND_MODE_COMMANDS.has(effectiveArgs[1])) {
    effectiveArgs.splice(2, 0, '--round-mode', 'advance-next-round');
  }
  if ((effectiveArgs[1] === 'smoke-prod' || effectiveArgs[1] === 'production-child')
      && !effectiveArgs.includes('--detached-state-file')) {
    effectiveArgs.push('--detached-state-file', join(RESULTS_DIR, 'detached-production-state.json'));
  }
  return new Promise((resolve, reject) => {
    const child = spawn('python3', effectiveArgs, {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NIGHT_BATCH_RESULTS_DIR: RESULTS_DIR,
        ...(options.env || {}),
      },
    });

    let stdout = '';
    let stderr = '';
    const timeoutMs = options.timeoutMs ?? 30000;
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`python night_batch.py timed out after ${timeoutMs}ms: ${effectiveArgs.join(' ')}`));
    }, timeoutMs);
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ status: code, stdout, stderr });
    });
  });
}

function writeRoundFixture(roundNumber, { completed = false } = {}) {
  const roundDir = join(RESULTS_DIR, `round${roundNumber}`);
  mkdirSync(roundDir, { recursive: true });
  writeFileSync(join(roundDir, 'round-manifest.json'), JSON.stringify({
    round: roundNumber,
    mode: 'advance-next-round',
    runs: [{
      run_id: `fixture-${roundNumber}`,
      command: 'smoke-prod',
      started_at: '2026-04-10T00:00:00.000Z',
    }],
  }, null, 2), 'utf8');
  if (completed) {
    writeFileSync(join(roundDir, `20260410_${String(roundNumber).padStart(6, '0')}-summary.json`), JSON.stringify({
      success: true,
      command: 'smoke-prod',
      steps: [],
    }, null, 2), 'utf8');
  }
  return roundDir;
}

function readSummaryFromResult(result) {
  const match = result.stdout.match(/Summary written: (.+-summary\.md)/);
  assert.ok(match, `expected summary path in stdout:\n${result.stdout}`);
  const rawSummaryPath = match[1].trim();
  const summaryPath = rawSummaryPath.startsWith('/')
    ? rawSummaryPath.replace(/-summary\.md$/, '-summary.json')
    : join(PROJECT_ROOT, rawSummaryPath.replace(/-summary\.md$/, '-summary.json'));
  return JSON.parse(readFileSync(summaryPath, 'utf8'));
}

function writeExecutable(filePath, content) {
  writeFileSync(filePath, content, 'utf8');
  chmodSync(filePath, 0o755);
}

const STATUS_OK_SNIPPET = `
case "$*" in *status*) printf '{"success":true,"api_available":true}\\n'; exit 0;; esac
`;

function writeFakeNode(filePath, body = 'exit 0') {
  writeExecutable(filePath, `#!/bin/sh\n${STATUS_OK_SNIPPET}${body}\n`);
}

async function waitFor(check, timeoutMs = 4000, intervalMs = 100) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    if (check()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  assert.fail('timed out waiting for condition');
}

function listenOnLocalhost(server, requestedPort = 0) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(requestedPort, '127.0.0.1');
  });
}

async function listenOrSkip(testContext, server, requestedPort = 0) {
  try {
    await listenOnLocalhost(server, requestedPort);
  } catch (error) {
    if (error?.code === 'EPERM' || error?.code === 'EACCES') {
      testContext.skip(`local HTTP fixture cannot listen on 127.0.0.1: ${error.code}`);
      return false;
    }
    throw error;
  }
  return true;
}

describe('night_batch.py CLI', () => {
  let server = null;
  let port = null;
  let tempDir = null;
  let resultsDir = null;

  beforeEach(async (testContext) => {
    tempDir = mkdtempSync(join(tmpdir(), 'night-batch-test-'));
    resultsDir = join(tempDir, 'night-batch-results');
    RESULTS_DIR = resultsDir;
    mkdirSync(resultsDir, { recursive: true });

    server = createServer((req, res) => {
      if (req.url === '/json/version') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          Browser: 'TradingView/1.0',
          webSocketDebuggerUrl: `ws://127.0.0.1:${port}/devtools/browser/test`,
        }));
        return;
      }
      if (req.url === '/json/list') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([
          {
            id: 'chart-1',
            type: 'page',
            url: 'https://jp.tradingview.com/chart/JV6Tvois/',
            title: 'TradingView chart',
          },
        ]));
        return;
      }
      res.writeHead(404);
      res.end('not found');
    });
    if (!await listenOrSkip(testContext, server)) {
      server = null;
      return;
    }
    port = server.address().port;
  });

  afterEach(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      server = null;
    }
    port = null;
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
    RESULTS_DIR = join(PROJECT_ROOT, 'results', 'night-batch');
    resultsDir = null;
  });

  it('exists in python/night_batch.py', () => {
    assert.equal(existsSync(SCRIPT_PATH), true);
  });

  it('bundle dry-run passes preflight and prints the Node bundle command', async () => {
    const result = await runPython(
      [SCRIPT_PATH, 'bundle', '--host', '127.0.0.1', '--port', String(port), '--dry-run'],
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /run-finetune-bundle\.mjs/);
    assert.match(result.stdout, /--ports/);
    assert.match(result.stdout, new RegExp(String(port)));
  });

  it('report dry-run does not require CDP preflight', async () => {
    const result = await runPython(
      [
        SCRIPT_PATH,
        'report',
        '--us',
        'artifacts/us.json',
        '--jp',
        'artifacts/jp.json',
        '--out',
        'artifacts/report.md',
        '--dry-run',
      ],
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /generate-rich-report\.mjs/);
  });

  it('report dry-run auto-computes ranking-out when not explicitly provided', async () => {
    const result = await runPython(
      [
        SCRIPT_PATH,
        'report',
        '--us',
        'artifacts/us.json',
        '--jp',
        'artifacts/jp.json',
        '--out',
        'artifacts/report.md',
        '--dry-run',
      ],
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /--ranking-out/,
      'report must always include --ranking-out in the command');
    assert.match(result.stdout, /combined-ranking\.json/,
      'auto-computed ranking-out must end with combined-ranking.json');
    assert.match(result.stdout, /--catalog-out/,
      'report must always include --catalog-out in the command');
    assert.match(result.stdout, /strategy-catalog\.snapshot\.json/,
      'auto-computed catalog-out must end with strategy-catalog.snapshot.json');
  });

  it('nightly dry-run auto-computes ranking-out when not explicitly provided', async () => {
    const result = await runPython(
      [SCRIPT_PATH, 'nightly', '--host', '127.0.0.1', '--port', String(port), '--dry-run'],
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /--ranking-out/,
      'nightly must always include --ranking-out in the command');
    assert.match(result.stdout, /combined-ranking\.json/,
      'auto-computed ranking-out must end with combined-ranking.json');
    assert.match(result.stdout, /--catalog-out/,
      'nightly must always include --catalog-out in the command');
    assert.match(result.stdout, /strategy-catalog\.snapshot\.json/,
      'auto-computed catalog-out must end with strategy-catalog.snapshot.json');
  });

  it('report writes a deterministic latest backtest summary when recovered results exist', async () => {
    const fakeNodePath = join(tempDir, 'fake-report-node.sh');
    const fakeNodeLog = join(tempDir, 'fake-report-node.log');
    const usPath = join(tempDir, 'us-recovered-results.json');
    const jpPath = join(tempDir, 'jp-recovered-results.json');
    const reportPath = join(tempDir, 'rich-report.md');
    const latestSummaryPath = join(tempDir, 'main-backtest-current-summary.md');
    const latestRankingPath = join(tempDir, 'main-backtest-current-combined-ranking.json');

    writeExecutable(
      fakeNodePath,
      `#!/bin/sh
${STATUS_OK_SNIPPET}script="$1"
out=""
rankout=""
catalogout=""
strategyout=""
symbolout=""
printf '%s\n' "$*" >> "${fakeNodeLog}"
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--out" ]; then
    out="$2"
    shift 2
    continue
  fi
  if [ "$1" = "--ranking-out" ]; then
    rankout="$2"
    shift 2
    continue
  fi
  if [ "$1" = "--catalog-out" ]; then
    catalogout="$2"
    shift 2
    continue
  fi
  if [ "$1" = "--strategy-out" ]; then
    strategyout="$2"
    shift 2
    continue
  fi
  if [ "$1" = "--symbol-out" ]; then
    symbolout="$2"
    shift 2
    continue
  fi
  shift
done
case "$script" in
  *generate-strategy-reference.mjs)
    printf '# fake strategy reference\\n' > "$strategyout"
    printf '# fake symbol reference\\n' > "$symbolout"
    ;;
  *)
    printf '# fake rich report\\n' > "$out"
    if [ -n "$rankout" ]; then
      printf '[{"presetId":"preset-a","composite_score":2}]\\n' > "$rankout"
    fi
    if [ -n "$catalogout" ]; then
      printf '{"strategies":[{"id":"preset-a","lifecycle":{"status":"live"}}]}\\n' > "$catalogout"
    fi
    ;;
esac
exit 0
`,
    );

    writeFileSync(usPath, JSON.stringify([
      {
        presetId: 'preset-a',
        market: 'US',
        result: {
          success: true,
          tester_available: true,
          metrics: {
            net_profit: 100,
            profit_factor: 1.5,
            max_drawdown: 50,
            percent_profitable: 45,
            closed_trades: 10,
          },
        },
      },
      {
        presetId: 'preset-b',
        market: 'US',
        result: {
          success: true,
          tester_available: true,
          metrics: {
            net_profit: 80,
            profit_factor: 1.4,
            max_drawdown: 60,
            percent_profitable: 40,
            closed_trades: 11,
          },
        },
      },
    ], null, 2), 'utf8');
    writeFileSync(jpPath, JSON.stringify([
      {
        presetId: 'preset-a',
        market: 'JP',
        result: {
          success: true,
          tester_available: true,
          metrics: {
            net_profit: 90,
            profit_factor: 1.6,
            max_drawdown: 40,
            percent_profitable: 48,
            closed_trades: 9,
          },
        },
      },
      {
        presetId: 'preset-b',
        market: 'JP',
        result: {
          success: true,
          tester_available: true,
          metrics: {
            net_profit: 70,
            profit_factor: 1.3,
            max_drawdown: 55,
            percent_profitable: 42,
            closed_trades: 12,
          },
        },
      },
    ], null, 2), 'utf8');

    const result = await runPython(
      [
        SCRIPT_PATH,
        'report',
        '--node-bin',
        fakeNodePath,
        '--us',
        usPath,
        '--jp',
        jpPath,
        '--out',
        reportPath,
      ],
      {
        env: {
          NIGHT_BATCH_CURRENT_SUMMARY_PATH: latestSummaryPath,
          NIGHT_BATCH_CURRENT_RANKING_PATH: latestRankingPath,
        },
      },
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(existsSync(latestSummaryPath), true);
    assert.equal(existsSync(latestRankingPath), true);
    const latestRanking = JSON.parse(readFileSync(latestRankingPath, 'utf8'));
    assert.equal(Array.isArray(latestRanking), true);
    assert.equal(latestRanking[0].presetId, 'preset-a');
    const latestSummary = readFileSync(latestSummaryPath, 'utf8');
    assert.match(latestSummary, /Current main backtest summary/);
    assert.match(latestSummary, /## 結論/);
    assert.match(latestSummary, /## 全戦略スコア一覧/);
    assert.match(latestSummary, /## Top 5 戦略の銘柄別成績/);
    assert.match(latestSummary, /## 改善点と次回バックテスト確認事項/);
    assert.match(latestSummary, /ranking_artifact/,
      'latest summary must include ranking_artifact path when ranking JSON is produced');
    assert.match(latestSummary, /main-backtest-current-combined-ranking\.json/,
      'current summary must point at the canonical ranking artifact');
    assert.match(latestSummary, /strategy_catalog_snapshot/,
      'latest summary must include strategy_catalog_snapshot path when catalog snapshot is produced');
    assert.match(latestSummary, /Live \/ Retired diff/,
      'latest summary must include Live / Retired diff section');
    assert.match(latestSummary, /strategy_reference/,
      'latest summary must include strategy reference path when generated');
    const nodeInvocations = readFileSync(fakeNodeLog, 'utf8');
    assert.match(nodeInvocations, /generate-rich-report\.mjs/,
      'report must use the provided --node-bin for rich report generation');
    assert.match(nodeInvocations, /generate-strategy-reference\.mjs/,
      'report must use the provided --node-bin for strategy reference generation');
  });

  it('nightly dry-run includes both bundle and report commands', async () => {
    const result = await runPython(
      [SCRIPT_PATH, 'nightly', '--host', '127.0.0.1', '--port', String(port), '--dry-run'],
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /run-finetune-bundle\.mjs/);
    assert.match(result.stdout, /generate-rich-report\.mjs/);
  });

  it('bundle dry-run fails preflight when no TradingView chart target exists', async (t) => {
    await new Promise((resolve) => server.close(resolve));
    server = createServer((req, res) => {
      if (req.url === '/json/list') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('[]');
        return;
      }
      res.writeHead(404);
      res.end('not found');
    });
    if (!await listenOrSkip(t, server, port)) {
      server = null;
      return;
    }

    const result = await runPython(
      [SCRIPT_PATH, 'bundle', '--host', '127.0.0.1', '--port', String(port), '--dry-run'],
    );

    assert.equal(result.status, 1, result.stderr || result.stdout);
    assert.match(result.stdout, /Preflight failed/);
  });

  it('smoke-prod skips launch when startup check already sees a running TradingView instance', async () => {
    const fakeNodePath = join(tempDir, 'fake-node.sh');
    const fakeNodeLog = join(tempDir, 'fake-node.log');
    const launchMarker = join(tempDir, 'launch-marker.txt');
    const launchScript = join(tempDir, 'launch.sh');
    writeExecutable(
      fakeNodePath,
      `#!/bin/sh
${STATUS_OK_SNIPPET}printf '%s\n' "$*" >> "${fakeNodeLog}"
exit 0
`,
    );
    writeExecutable(
      launchScript,
      `#!/bin/sh
printf 'launched\n' > "${launchMarker}"
exit 0
`,
    );

    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--startup-check-host',
      '127.0.0.1',
      '--startup-check-port',
      String(port),
      '--launch-command',
      launchScript,
      '--node-bin',
      fakeNodePath,
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(existsSync(launchMarker), false);
    const loggedCommands = readFileSync(fakeNodeLog, 'utf8').trim().split('\n');
    assert.equal(loggedCommands.length, 2);
    assert.match(loggedCommands[0], /backtest/);
    assert.match(loggedCommands[1], /backtest/);

    const summary = readSummaryFromResult(result);
    const launchStep = summary.steps.find((step) => step.name === 'launch');
    assert.equal(launchStep.skipped, true);
    assert.equal(launchStep.success, true);
  });

  it('smoke-prod fails without launching when startup check fails', async () => {
    const fakeNodePath = join(tempDir, 'fake-node.sh');
    const launchMarker = join(tempDir, 'launch-marker.txt');
    const launchScript = join(tempDir, 'launch.sh');
    const deadServer = createServer(() => {});
    await new Promise((resolve) => deadServer.listen(0, '127.0.0.1', resolve));
    const deadPort = deadServer.address().port;
    await new Promise((resolve) => deadServer.close(resolve));
    writeExecutable(
      fakeNodePath,
      `#!/bin/sh
${STATUS_OK_SNIPPET}exit 0
`,
    );
    writeExecutable(
      launchScript,
      `#!/bin/sh
printf 'launched\n' > "${launchMarker}"
exit 0
`,
    );

    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--startup-check-host',
      '127.0.0.1',
      '--startup-check-port',
      String(deadPort),
      '--launch-command',
      launchScript,
      '--launch-wait-sec',
      '2',
      '--node-bin',
      fakeNodePath,
    ]);

    assert.equal(result.status, 1, result.stderr || result.stdout);
    assert.equal(existsSync(launchMarker), false);
    assert.match(result.stdout, /Preflight failed/);

    const summary = readSummaryFromResult(result);
    const startupStep = summary.steps.find((step) => step.name === 'startup-check');
    const launchStep = summary.steps.find((step) => step.name === 'launch');
    const preflightStep = summary.steps.find((step) => step.name === 'preflight');
    assert.equal(startupStep.success, false);
    assert.equal(launchStep.success, false);
    assert.equal(launchStep.skipped, true);
    assert.equal(preflightStep.success, false);
  });

  it('smoke-prod stops before production when the smoke backtest fails', async () => {
    const fakeNodePath = join(tempDir, 'fake-node.sh');
    const fakeNodeLog = join(tempDir, 'fake-node.log');
    const counterFile = join(tempDir, 'fake-node-count.txt');
    writeExecutable(
      fakeNodePath,
      `#!/bin/sh
${STATUS_OK_SNIPPET}count=0
if [ -f "${counterFile}" ]; then
  count=$(cat "${counterFile}")
fi
count=$((count + 1))
printf '%s' "$count" > "${counterFile}"
printf '%s\n' "$*" >> "${fakeNodeLog}"
if [ "$count" -eq 1 ]; then
  exit 1
fi
exit 0
`,
    );

    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--startup-check-host',
      '127.0.0.1',
      '--startup-check-port',
      String(port),
      '--node-bin',
      fakeNodePath,
    ]);

    assert.equal(result.status, 2, result.stderr || result.stdout);
    const loggedCommands = readFileSync(fakeNodeLog, 'utf8').trim().split('\n');
    assert.equal(loggedCommands.length, 1);

    const summary = readSummaryFromResult(result);
    const smokeStep = summary.steps.find((step) => step.name === 'smoke');
    const productionStep = summary.steps.find((step) => step.name === 'production');
    assert.equal(smokeStep.success, false);
    assert.equal(productionStep, undefined);
    assert.equal(summary.failed_step, 'smoke');
    assert.equal(summary.termination_reason, 'smoke-failed');
    assert.equal(summary.last_checkpoint, null);
  });

  it('smoke-prod reads smoke and production commands from a JSON config', async () => {
    const fakeNodePath = join(tempDir, 'fake-node.sh');
    const fakeNodeLog = join(tempDir, 'fake-node.log');
    const foregroundStateFile = join(tempDir, 'foreground-state.json');
    const configPath = join(tempDir, 'nightly.json');
    writeExecutable(
      fakeNodePath,
      `#!/bin/sh
${STATUS_OK_SNIPPET}printf '%s\n' "$*" >> "${fakeNodeLog}"
exit 0
`,
    );
    writeFileSync(
      configPath,
      JSON.stringify({
        runtime: {
          host: '127.0.0.1',
          port,
          startup_check_host: '127.0.0.1',
          startup_check_port: port,
          detach_after_smoke: false,
          detached_state_file: foregroundStateFile,
        },
        strategies: {
          smoke: { cli: 'backtest nvda-ma' },
          production: { cli: 'backtest preset rsi-mean-reversion --symbol NVDA' },
        },
      }),
      'utf8',
    );

    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--config',
      configPath,
      '--detached-state-file',
      foregroundStateFile,
      '--node-bin',
      fakeNodePath,
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const loggedCommands = readFileSync(fakeNodeLog, 'utf8').trim().split('\n');
    assert.match(loggedCommands[0], /backtest nvda-ma/);
    assert.match(loggedCommands[1], /rsi-mean-reversion/);

    const summary = readSummaryFromResult(result);
    assert.equal(summary.failed_step, null);
    assert.equal(summary.termination_reason, 'success');
    assert.equal(summary.last_checkpoint, null);

    const state = JSON.parse(readFileSync(foregroundStateFile, 'utf8'));
    assert.equal(state.status, 'completed');
    assert.equal(state.mode, 'foreground');
    assert.equal(state.termination_reason, 'success');
    assert.equal(typeof state.updated_at, 'string');
    assert.match(state.summary_path, /-summary\.json$/);
  });

  it('smoke-prod emits heartbeat logs while foreground steps are still running', async () => {
    const fakeNodePath = join(tempDir, 'fake-heartbeat-node.sh');
    const configPath = join(tempDir, 'nightly-heartbeat.json');
    writeExecutable(
      fakeNodePath,
      `#!/bin/sh
${STATUS_OK_SNIPPET}sleep 2
exit 0
`,
    );
    writeFileSync(
      configPath,
      JSON.stringify({
        runtime: {
          host: '127.0.0.1',
          port,
          startup_check_host: '127.0.0.1',
          startup_check_port: port,
          detach_after_smoke: false,
        },
        strategies: {
          smoke: { cli: 'backtest heartbeat-smoke' },
          production: { cli: 'backtest heartbeat-production' },
        },
      }),
      'utf8',
    );

    const result = await runPython(
      [
        SCRIPT_PATH,
        'smoke-prod',
        '--config',
        configPath,
        '--node-bin',
        fakeNodePath,
      ],
      {
        env: {
          NIGHT_BATCH_HEARTBEAT_SEC: '1',
        },
        timeoutMs: 10000,
      },
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(
      result.stdout,
      /Heartbeat: smoke still running \(/,
      'foreground smoke-prod must emit heartbeat logs during long-running steps',
    );
    assert.match(
      result.stdout,
      /Heartbeat: production still running \(/,
      'foreground smoke-prod must emit heartbeat logs during long-running production',
    );
  });

  it('smoke-prod dry-run with foreground bundle config succeeds even when no checkpoints exist yet', async () => {
    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--config',
      join(PROJECT_ROOT, 'config', 'night_batch', 'bundle-foreground-reuse-config.json'),
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--startup-check-host',
      '127.0.0.1',
      '--startup-check-port',
      String(port),
      '--dry-run',
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /next-long-run-us-12x10/);
    assert.match(result.stdout, /next-long-run-jp-12x10/);
    assert.doesNotMatch(result.stderr, /NoneType/);
  });

  it('smoke-prod dry-run records launch as skipped when workflow owns startup', async () => {
    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--startup-check-host',
      '127.0.0.1',
      '--startup-check-port',
      String(port),
      '--dry-run',
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);

    const summary = readSummaryFromResult(result);
    const launchStep = summary.steps.find((step) => step.name === 'launch');
    assert.equal(launchStep.success, true);
    assert.equal(launchStep.skipped, true);
  });

  it('smoke-prod lets CLI smoke-cli override the JSON config value', async () => {
    const fakeNodePath = join(tempDir, 'fake-node.sh');
    const fakeNodeLog = join(tempDir, 'fake-node.log');
    const configPath = join(tempDir, 'nightly.json');
    writeExecutable(
      fakeNodePath,
      `#!/bin/sh
${STATUS_OK_SNIPPET}printf '%s\n' "$*" >> "${fakeNodeLog}"
exit 0
`,
    );
    writeFileSync(
      configPath,
      JSON.stringify({
        runtime: {
          host: '127.0.0.1',
          port,
          startup_check_host: '127.0.0.1',
          startup_check_port: port,
          detach_after_smoke: false,
        },
        strategies: {
          smoke: { cli: 'backtest preset ema-cross-9-21 --symbol NVDA' },
          production: { cli: 'backtest preset rsi-mean-reversion --symbol NVDA' },
        },
      }),
      'utf8',
    );

    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--config',
      configPath,
      '--smoke-cli',
      'backtest nvda-ma',
      '--node-bin',
      fakeNodePath,
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const loggedCommands = readFileSync(fakeNodeLog, 'utf8').trim().split('\n');
    assert.match(loggedCommands[0], /backtest nvda-ma/);
    assert.doesNotMatch(loggedCommands[0], /ema-cross-9-21/);
  });

  it('smoke-prod detaches production after smoke when config enables it', async () => {
    const fakeNodePath = join(tempDir, 'fake-node.sh');
    const fakeNodeLog = join(tempDir, 'fake-node.log');
    const detachedStateFile = join(tempDir, 'detached-state.json');
    const configPath = join(tempDir, 'nightly.json');
    writeExecutable(
      fakeNodePath,
      `#!/bin/sh
${STATUS_OK_SNIPPET}printf '%s\n' "$*" >> "${fakeNodeLog}"
case "$*" in
  *"rsi-mean-reversion"*)
    sleep 2
    ;;
esac
exit 0
`,
    );
    writeFileSync(
      configPath,
      JSON.stringify({
        runtime: {
          host: '127.0.0.1',
          port,
          startup_check_host: '127.0.0.1',
          startup_check_port: port,
          detach_after_smoke: true,
          detached_state_file: detachedStateFile,
        },
        strategies: {
          smoke: { cli: 'backtest nvda-ma' },
          production: { cli: 'backtest preset rsi-mean-reversion --symbol NVDA' },
        },
      }),
      'utf8',
    );

    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--config',
      configPath,
      '--detached-state-file',
      detachedStateFile,
      '--node-bin',
      fakeNodePath,
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    await waitFor(() => existsSync(detachedStateFile));
    await waitFor(() => readFileSync(fakeNodeLog, 'utf8').includes('rsi-mean-reversion'));

    const summary = readSummaryFromResult(result);
    const detachStep = summary.steps.find((step) => step.name === 'detach-production');
    const productionStep = summary.steps.find((step) => step.name === 'production');
    assert.equal(detachStep.success, true);
    assert.equal(productionStep, undefined);

    const detachedState = JSON.parse(readFileSync(detachedStateFile, 'utf8'));
    assert.equal(typeof detachedState.pid, 'number');
    assert.match(detachedState.production_command.join(' '), /rsi-mean-reversion/);
  });

  it('smoke-prod accepts a Windows-style backslash config path', async () => {
    const fakeNodePath = join(tempDir, 'fake-node.sh');
    const configPath = join(tempDir, 'nightly.json');
    writeExecutable(
      fakeNodePath,
      `#!/bin/sh
${STATUS_OK_SNIPPET}exit 0
`,
    );
    writeFileSync(
      configPath,
      JSON.stringify({
        runtime: {
          host: '127.0.0.1',
          port,
          startup_check_host: '127.0.0.1',
          startup_check_port: port,
          detach_after_smoke: false,
        },
        strategies: {
          smoke: { cli: 'backtest nvda-ma' },
          production: { cli: 'backtest preset rsi-mean-reversion --symbol NVDA' },
        },
      }),
      'utf8',
    );

    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--config',
      configPath.replaceAll('/', '\\'),
      '--node-bin',
      fakeNodePath,
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);
  });

  it('smoke-prod refuses to start a detached run when another detached run is still active', async () => {
    const configPath = join(tempDir, 'nightly.json');
    const detachedStateFile = join(tempDir, 'detached-state.json');
    writeFileSync(
      detachedStateFile,
      JSON.stringify({
        status: 'running',
        pid: process.pid,
      }),
      'utf8',
    );
    writeFileSync(
      configPath,
      JSON.stringify({
        runtime: {
          host: '127.0.0.1',
          port,
          startup_check_host: '127.0.0.1',
          startup_check_port: port,
          detach_after_smoke: true,
          detached_state_file: detachedStateFile,
        },
        strategies: {
          smoke: { cli: 'backtest nvda-ma' },
          production: { cli: 'backtest preset rsi-mean-reversion --symbol NVDA' },
        },
      }),
      'utf8',
    );

    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--config',
      configPath,
      '--detached-state-file',
      detachedStateFile,
      '--dry-run',
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);

    const liveResult = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--config',
      configPath,
      '--detached-state-file',
      detachedStateFile,
    ]);

    assert.equal(liveResult.status, 2, liveResult.stderr || liveResult.stdout);
    assert.match(liveResult.stdout, /Detached production already running/);

    const summary = readSummaryFromResult(liveResult);
    const guardStep = summary.steps.find((step) => step.name === 'active-detached-run-guard');
    assert.equal(guardStep.success, false);
  });

  it('smoke-prod can reuse existing fine-tune bundle campaigns from JSON without duplicating strategy IDs', async () => {
    const fakeNodePath = join(tempDir, 'fake-node.sh');
    const fakeNodeLog = join(tempDir, 'fake-node.log');
    const configPath = join(tempDir, 'bundle.json');
    writeExecutable(
      fakeNodePath,
      `#!/bin/sh
${STATUS_OK_SNIPPET}printf '%s\n' "$*" >> "${fakeNodeLog}"
exit 0
`,
    );
    writeFileSync(
      configPath,
      JSON.stringify({
        runtime: {
          host: '127.0.0.1',
          port,
          startup_check_host: '127.0.0.1',
          startup_check_port: port,
          detach_after_smoke: false,
        },
        bundle: {
          us_campaign: 'next-long-run-us-finetune-100x10',
          jp_campaign: 'next-long-run-jp-finetune-100x10',
          smoke_phases: 'smoke',
          production_phases: 'full',
        },
      }),
      'utf8',
    );

    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--config',
      configPath,
      '--node-bin',
      fakeNodePath,
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const loggedCommands = readFileSync(fakeNodeLog, 'utf8').trim().split('\n');
    assert.match(loggedCommands[0], /run-finetune-bundle\.mjs/);
    assert.match(loggedCommands[0], /--phases smoke/);
    assert.match(loggedCommands[0], /next-long-run-us-finetune-100x10/);
    assert.match(loggedCommands[0], /next-long-run-jp-finetune-100x10/);
    assert.match(loggedCommands[1], /run-finetune-bundle\.mjs/);
    assert.match(loggedCommands[1], /--phases full/);
  });

  it('smoke-prod can run a single-market bundle when only us_campaign is configured', async () => {
    const fakeNodePath = join(tempDir, 'fake-node.sh');
    const fakeNodeLog = join(tempDir, 'fake-node.log');
    const configPath = join(tempDir, 'bundle-single-market.json');
    writeExecutable(
      fakeNodePath,
      `#!/bin/sh
${STATUS_OK_SNIPPET}printf '%s\n' "$*" >> "${fakeNodeLog}"
exit 0
`,
    );
    writeFileSync(
      configPath,
      JSON.stringify({
        runtime: {
          host: '127.0.0.1',
          port,
          startup_check_host: '127.0.0.1',
          startup_check_port: port,
          detach_after_smoke: false,
        },
        bundle: {
          us_campaign: 'breakout-6pack-us40',
          smoke_phases: 'smoke',
          production_phases: 'full',
        },
      }),
      'utf8',
    );

    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--config',
      configPath,
      '--node-bin',
      fakeNodePath,
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const loggedCommands = readFileSync(fakeNodeLog, 'utf8').trim().split('\n');
    assert.equal(loggedCommands.length, 2);
    assert.match(loggedCommands[0], /run-finetune-bundle\.mjs/);
    assert.match(loggedCommands[0], /breakout-6pack-us40/);
    assert.doesNotMatch(loggedCommands[0], /next-long-run-jp|jp-campaign/i);
    assert.match(loggedCommands[1], /run-finetune-bundle\.mjs/);
    assert.match(loggedCommands[1], /breakout-6pack-us40/);
  });

  it('smoke-prod can detach the full bundle phase after a smoke bundle gate', async () => {
    const fakeNodePath = join(tempDir, 'fake-node.sh');
    const fakeNodeLog = join(tempDir, 'fake-node.log');
    const detachedStateFile = join(tempDir, 'bundle-detached-state.json');
    const configPath = join(tempDir, 'bundle.json');
    writeExecutable(
      fakeNodePath,
      `#!/bin/sh
${STATUS_OK_SNIPPET}printf '%s\n' "$*" >> "${fakeNodeLog}"
case "$*" in
  *"--phases full"*)
    sleep 2
    ;;
esac
exit 0
`,
    );
    writeFileSync(
      configPath,
      JSON.stringify({
        runtime: {
          host: '127.0.0.1',
          port,
          startup_check_host: '127.0.0.1',
          startup_check_port: port,
          detach_after_smoke: true,
          detached_state_file: detachedStateFile,
        },
        bundle: {
          us_campaign: 'next-long-run-us-finetune-100x10',
          jp_campaign: 'next-long-run-jp-finetune-100x10',
          smoke_phases: 'smoke',
          production_phases: 'full',
        },
      }),
      'utf8',
    );

    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--config',
      configPath,
      '--detached-state-file',
      detachedStateFile,
      '--node-bin',
      fakeNodePath,
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    await waitFor(() => existsSync(detachedStateFile));
    await waitFor(() => readFileSync(fakeNodeLog, 'utf8').includes('--phases full'));

    const summary = readSummaryFromResult(result);
    const detachStep = summary.steps.find((step) => step.name === 'detach-production');
    assert.equal(detachStep.success, true);

    const detachedState = JSON.parse(readFileSync(detachedStateFile, 'utf8'));
    assert.match(detachedState.production_command.join(' '), /run-finetune-bundle\.mjs/);
    assert.match(detachedState.production_command.join(' '), /--phases full/);
  });

  it('production-child writes the latest backtest summary for detached bundle runs', async (t) => {
    if (process.env.CI) {
      t.skip('latest detached bundle summary uses local campaign artifacts');
      return;
    }
    const fakeNodePath = join(tempDir, 'fake-bundle-node.sh');
    const detachedStateFile = join(tempDir, 'bundle-detached-state.json');
    const latestSummaryPath = join(tempDir, 'main-backtest-current-summary.md');
    const latestRankingPath = join(tempDir, 'main-backtest-current-combined-ranking.json');
    const missingStrategyReferencePath = join(tempDir, 'missing-current-strategy-reference.md');
    const missingSymbolReferencePath = join(tempDir, 'missing-current-symbol-reference.md');
    const outputDir = join(tempDir, 'night-batch-output');
    const suffix = tempDir.split('/').pop();
    const usCampaign = `test-detached-us-${suffix}`;
    const jpCampaign = `test-detached-jp-${suffix}`;
    const usResultsDir = join(PROJECT_ROOT, 'artifacts', 'campaigns', usCampaign, 'full');
    const jpResultsDir = join(PROJECT_ROOT, 'artifacts', 'campaigns', jpCampaign, 'full');
    const usResultsPath = join(usResultsDir, 'recovered-results.json');
    const jpResultsPath = join(jpResultsDir, 'recovered-results.json');

    mkdirSync(usResultsDir, { recursive: true });
    mkdirSync(jpResultsDir, { recursive: true });
    writeExecutable(
      fakeNodePath,
      `#!/bin/sh
${STATUS_OK_SNIPPET}mkdir -p "${usResultsDir}" "${jpResultsDir}"
cat <<'EOF' > "${usResultsPath}"
[
  {
    "presetId": "preset-a",
    "market": "US",
    "result": {
      "success": true,
      "tester_available": true,
      "metrics": {
        "net_profit": 120,
        "profit_factor": 1.8,
        "max_drawdown": 45,
        "percent_profitable": 50,
        "closed_trades": 12
      }
    }
  }
]
EOF
cat <<'EOF' > "${jpResultsPath}"
[
  {
    "presetId": "preset-a",
    "market": "JP",
    "result": {
      "success": true,
      "tester_available": true,
      "metrics": {
        "net_profit": 90,
        "profit_factor": 1.6,
        "max_drawdown": 40,
        "percent_profitable": 48,
        "closed_trades": 10
      }
    }
  }
]
EOF
exit 0
`,
    );

    try {
      const result = await runPython([
        SCRIPT_PATH,
        'production-child',
        '--host',
        '127.0.0.1',
        '--port',
        String(port),
        '--production-command-json',
        JSON.stringify([fakeNodePath]),
        '--node-bin',
        fakeNodePath,
        '--production-checkpoint-roots-json',
        '[]',
        '--detached-state-file',
        detachedStateFile,
        '--output-dir',
        outputDir,
        '--bundle-us-campaign',
        usCampaign,
        '--bundle-jp-campaign',
        jpCampaign,
        '--bundle-production-phases',
        'full',
        '--dry-run',
      ], {
        env: {
          NIGHT_BATCH_CURRENT_SUMMARY_PATH: latestSummaryPath,
          NIGHT_BATCH_CURRENT_RANKING_PATH: latestRankingPath,
          NIGHT_BATCH_STRATEGY_REFERENCE_PATH: missingStrategyReferencePath,
          NIGHT_BATCH_SYMBOL_REFERENCE_PATH: missingSymbolReferencePath,
        },
      });

      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.equal(existsSync(latestSummaryPath), true);
      const latestSummary = readFileSync(latestSummaryPath, 'utf8');
      assert.match(latestSummary, /Current main backtest summary/);
      assert.match(latestSummary, /## 結論/);
      assert.doesNotMatch(latestSummary, /strategy_reference/,
        'latest summary must not point at strategy docs that were not generated in this run');
      assert.doesNotMatch(latestSummary, /symbol_reference/,
        'latest summary must not point at symbol docs that were not generated in this run');
    } finally {
      rmSync(join(PROJECT_ROOT, 'artifacts', 'campaigns', usCampaign), { recursive: true, force: true });
      rmSync(join(PROJECT_ROOT, 'artifacts', 'campaigns', jpCampaign), { recursive: true, force: true });
    }
  });

  it('advance-next-round creates a round directory and writes artifacts there', async () => {
    const fakeNodePath = join(tempDir, 'fake-node.sh');
    const fakeNodeLog = join(tempDir, 'fake-node.log');
    writeExecutable(
      fakeNodePath,
      `#!/bin/sh
${STATUS_OK_SNIPPET}printf '%s\n' "$*" >> "${fakeNodeLog}"
exit 0
`,
    );

    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--startup-check-host',
      '127.0.0.1',
      '--startup-check-port',
      String(port),
      '--node-bin',
      fakeNodePath,
      '--round-mode',
      'advance-next-round',
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);

    const summary = readSummaryFromResult(result);
    assert.equal(typeof summary.round, 'number');
    assert.ok(summary.round >= 1);
    assert.equal(summary.round_mode, 'advance-next-round');

    const roundDir = join(RESULTS_DIR, `round${summary.round}`);
    assert.equal(existsSync(roundDir), true);

    const manifestPath = join(roundDir, 'round-manifest.json');
    assert.equal(existsSync(manifestPath), true);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.round, summary.round);
    assert.ok(manifest.runs.length >= 1);

    rmSync(roundDir, { recursive: true, force: true });
  });

  it('resume-current-round errors when no round exists', async () => {
    const existingRounds = [];
    try {
      const { readdirSync } = await import('node:fs');
      for (const entry of readdirSync(RESULTS_DIR)) {
        if (entry.startsWith('round')) {
          existingRounds.push(entry);
        }
      }
    } catch {
      // RESULTS_DIR may not exist
    }
    for (const rd of existingRounds) {
      rmSync(join(RESULTS_DIR, rd), { recursive: true, force: true });
    }

    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--startup-check-host',
      '127.0.0.1',
      '--startup-check-port',
      String(port),
      '--dry-run',
      '--round-mode',
      'resume-current-round',
    ]);

    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert.match(result.stdout, /No existing round found/);

    for (const rd of existingRounds) {
      mkdirSync(join(RESULTS_DIR, rd), { recursive: true });
    }
  });

  it('archive-rounds moves completed rounds into the archive directory', async () => {
    const activeRound = writeRoundFixture(1);
    const completedRound = writeRoundFixture(2, { completed: true });

    const result = await runPython([SCRIPT_PATH, 'archive-rounds']);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(existsSync(activeRound), true);
    assert.equal(existsSync(completedRound), false);
    assert.equal(existsSync(join(RESULTS_DIR, 'archive', 'round2')), true);
    assert.equal(existsSync(join(RESULTS_DIR, 'archive', 'round1')), false);
  });

  it('archive-rounds preserves an existing archive target by moving it aside first', async () => {
    writeRoundFixture(2, { completed: true });
    const archiveTarget = join(RESULTS_DIR, 'archive', 'round2');
    mkdirSync(archiveTarget, { recursive: true });
    writeFileSync(join(archiveTarget, 'legacy.txt'), 'legacy archive\n', 'utf8');

    const result = await runPython([SCRIPT_PATH, 'archive-rounds']);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(existsSync(join(RESULTS_DIR, 'archive', 'round2')), true);
    assert.equal(existsSync(join(RESULTS_DIR, 'archive', 'round2.previous')), true);
    assert.equal(existsSync(join(RESULTS_DIR, 'archive', 'round2.previous', 'legacy.txt')), true);
    assert.equal(existsSync(join(RESULTS_DIR, 'archive', 'round2', 'round-manifest.json')), true);
  });

  it('resume-current-round ignores archived rounds', async () => {
    writeRoundFixture(2, { completed: true });
    const archiveResult = await runPython([SCRIPT_PATH, 'archive-rounds']);
    assert.equal(archiveResult.status, 0, archiveResult.stderr || archiveResult.stdout);

    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--startup-check-host',
      '127.0.0.1',
      '--startup-check-port',
      String(port),
      '--dry-run',
      '--round-mode',
      'resume-current-round',
    ]);

    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert.match(result.stdout, /No existing round found/);
  });

  it('advance-next-round counts archived rounds when selecting the next round', async () => {
    writeRoundFixture(1);
    writeRoundFixture(2, { completed: true });
    const archiveResult = await runPython([SCRIPT_PATH, 'archive-rounds']);
    assert.equal(archiveResult.status, 0, archiveResult.stderr || archiveResult.stdout);

    const fakeNodePath = join(tempDir, 'fake-node.sh');
    const fakeNodeLog = join(tempDir, 'fake-node.log');
    writeExecutable(
      fakeNodePath,
      `#!/bin/sh
${STATUS_OK_SNIPPET}printf '%s\n' "$*" >> "${fakeNodeLog}"
exit 0
`,
    );

    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--startup-check-host',
      '127.0.0.1',
      '--startup-check-port',
      String(port),
      '--node-bin',
      fakeNodePath,
      '--round-mode',
      'advance-next-round',
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);

    const summary = readSummaryFromResult(result);
    assert.equal(summary.round, 3);
    assert.equal(summary.round_mode, 'advance-next-round');
    assert.equal(existsSync(join(RESULTS_DIR, 'round3')), true);
    assert.equal(existsSync(join(RESULTS_DIR, 'archive', 'round2')), true);
  });

  it('resume-current-round skips smoke when it already completed in the round', async () => {
    const fakeNodePath = join(tempDir, 'fake-node.sh');
    const fakeNodeLog = join(tempDir, 'fake-node.log');
    writeExecutable(
      fakeNodePath,
      `#!/bin/sh
${STATUS_OK_SNIPPET}printf '%s\n' "$*" >> "${fakeNodeLog}"
exit 0
`,
    );

    const advanceResult = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--startup-check-host',
      '127.0.0.1',
      '--startup-check-port',
      String(port),
      '--node-bin',
      fakeNodePath,
      '--round-mode',
      'advance-next-round',
    ]);
    assert.equal(advanceResult.status, 0, advanceResult.stderr || advanceResult.stdout);

    const advanceSummary = readSummaryFromResult(advanceResult);
    const roundDir = join(RESULTS_DIR, `round${advanceSummary.round}`);

    const resumeResult = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--startup-check-host',
      '127.0.0.1',
      '--startup-check-port',
      String(port),
      '--node-bin',
      fakeNodePath,
      '--round-mode',
      'resume-current-round',
    ]);
    assert.equal(resumeResult.status, 0, resumeResult.stderr || resumeResult.stdout);

    const resumeSummary = readSummaryFromResult(resumeResult);
    const smokeStep = resumeSummary.steps.find((step) => step.name === 'smoke');
    assert.equal(smokeStep.skipped, true);
    assert.equal(smokeStep.success, true);
    assert.equal(resumeSummary.round_mode, 'resume-current-round');

    rmSync(roundDir, { recursive: true, force: true });
  });

  it('bundle dry-run with --us-resume and --jp-resume passes resume args through', async () => {
    const result = await runPython(
      [
        SCRIPT_PATH,
        'bundle',
        '--host',
        '127.0.0.1',
        '--port',
        String(port),
        '--dry-run',
        '--us-resume',
        'artifacts/campaigns/us/checkpoint-10.json',
        '--jp-resume',
        'artifacts/campaigns/jp/checkpoint-20.json',
      ],
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /--us-resume/);
    assert.match(result.stdout, /checkpoint-10\.json/);
    assert.match(result.stdout, /--jp-resume/);
    assert.match(result.stdout, /checkpoint-20\.json/);
  });

  it('smoke-prod fails fast with clear error when --config is an empty string', async () => {
    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--config',
      '',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--dry-run',
      '--round-mode',
      'advance-next-round',
    ]);

    assert.equal(result.status, 2, result.stderr || result.stdout);
    const combined = result.stdout + result.stderr;
    assert.ok(
      !combined.includes('IsADirectoryError'),
      'must not produce an IsADirectoryError; empty config should fail fast',
    );
    assert.match(combined, /--config must not be empty/);
  });

  it('smoke-prod fails fast with clear error when --config points to a directory', async () => {
    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--config',
      resultsDir,
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--dry-run',
      '--round-mode',
      'advance-next-round',
    ]);

    assert.notEqual(result.status, 0, 'should fail for directory config');
    const combined = result.stdout + result.stderr;
    assert.ok(
      !combined.includes('IsADirectoryError'),
      'must not produce an IsADirectoryError; should fail fast with a descriptive message',
    );
    assert.match(
      combined,
      /directory|not a file/i,
      'error message should mention that the path is a directory',
    );
  });

  it('baseline + bundle config hash mismatch blocks production', async () => {
    const { createHash } = await import('node:crypto');
    const bundleConfigPath = join(PROJECT_ROOT, 'config', 'night_batch', 'bundle-foreground-reuse-config.json');
    const strategyPresetsPath = join(PROJECT_ROOT, 'config', 'backtest', 'strategy-presets.json');
    const strategyCatalogPath = join(PROJECT_ROOT, 'config', 'backtest', 'strategy-catalog.json');
    const usCampaignPath = join(PROJECT_ROOT, 'config', 'backtest', 'campaigns', 'current', 'next-long-run-us-12x10.json');
    const jpCampaignPath = join(PROJECT_ROOT, 'config', 'backtest', 'campaigns', 'current', 'next-long-run-jp-12x10.json');

    const strategyHash = createHash('sha256').update(readFileSync(strategyPresetsPath)).digest('hex');
    const catalogHash = createHash('sha256').update(readFileSync(strategyCatalogPath)).digest('hex');
    const usHash = createHash('sha256').update(readFileSync(usCampaignPath)).digest('hex');
    const jpHash = createHash('sha256').update(readFileSync(jpCampaignPath)).digest('hex');

    const baselinePath = join(tempDir, 'baseline.json');
    writeFileSync(baselinePath, JSON.stringify({
      run_id: 'test_baseline',
      run_attempt: '1',
      algorithm: 'sha256',
      bundle_config_path: toRepoRelativePath(bundleConfigPath),
      resolved_campaigns: [],
      files: [
        { path: toRepoRelativePath(bundleConfigPath), role: 'bundle_config', sha256: 'wrong_hash_to_trigger_block' },
        { path: toRepoRelativePath(strategyPresetsPath), role: 'strategy_presets', sha256: strategyHash },
        { path: toRepoRelativePath(strategyCatalogPath), role: 'strategy_catalog', sha256: catalogHash },
        { path: toRepoRelativePath(usCampaignPath), role: 'campaign_current', sha256: usHash },
        { path: toRepoRelativePath(jpCampaignPath), role: 'campaign_current', sha256: jpHash },
      ],
      aggregate_fingerprint: 'dummy',
    }), 'utf8');

    const fakeNodePath = join(tempDir, 'fake-node-guard.sh');
    writeFakeNode(fakeNodePath);

    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--config', bundleConfigPath,
      '--host', '127.0.0.1',
      '--port', String(port),
      '--startup-check-host', '127.0.0.1',
      '--startup-check-port', String(port),
      '--node-bin', fakeNodePath,
    ], {
      env: { NIGHT_BATCH_LIVE_CHECKOUT_BASELINE_PATH: baselinePath.replaceAll('/', '\\') },
    });

    assert.equal(result.status, 2, result.stderr || result.stdout);
    const summary = readSummaryFromResult(result);
    const guardStep = summary.steps.find((s) => s.name === 'live-checkout-guard');
    assert.ok(guardStep, 'must have live-checkout-guard step');
    assert.equal(guardStep.success, false);
    assert.equal(summary.termination_reason, 'live-checkout-blocked');
  });

  it('baseline + strategy-presets hash mismatch produces warning but run succeeds', async () => {
    const { createHash } = await import('node:crypto');
    const bundleConfigPath = join(PROJECT_ROOT, 'config', 'night_batch', 'bundle-foreground-reuse-config.json');
    const strategyPresetsPath = join(PROJECT_ROOT, 'config', 'backtest', 'strategy-presets.json');
    const strategyCatalogPath = join(PROJECT_ROOT, 'config', 'backtest', 'strategy-catalog.json');
    const usCampaignPath = join(PROJECT_ROOT, 'config', 'backtest', 'campaigns', 'current', 'next-long-run-us-12x10.json');
    const jpCampaignPath = join(PROJECT_ROOT, 'config', 'backtest', 'campaigns', 'current', 'next-long-run-jp-12x10.json');

    const bundleHash = createHash('sha256').update(readFileSync(bundleConfigPath)).digest('hex');
    const catalogHash = createHash('sha256').update(readFileSync(strategyCatalogPath)).digest('hex');
    const usHash = createHash('sha256').update(readFileSync(usCampaignPath)).digest('hex');
    const jpHash = createHash('sha256').update(readFileSync(jpCampaignPath)).digest('hex');

    const baselinePath = join(tempDir, 'baseline-warn.json');
    writeFileSync(baselinePath, JSON.stringify({
      run_id: 'test_baseline_warn',
      run_attempt: '1',
      algorithm: 'sha256',
      bundle_config_path: toRepoRelativePath(bundleConfigPath),
      resolved_campaigns: [],
      files: [
        { path: toRepoRelativePath(bundleConfigPath), role: 'bundle_config', sha256: bundleHash },
        { path: toRepoRelativePath(strategyPresetsPath), role: 'strategy_presets', sha256: 'wrong_hash_for_warning' },
        { path: toRepoRelativePath(strategyCatalogPath), role: 'strategy_catalog', sha256: catalogHash },
        { path: toRepoRelativePath(usCampaignPath), role: 'campaign_current', sha256: usHash },
        { path: toRepoRelativePath(jpCampaignPath), role: 'campaign_current', sha256: jpHash },
      ],
      aggregate_fingerprint: 'dummy',
    }), 'utf8');

    const fakeNodePath = join(tempDir, 'fake-node-warn.sh');
    writeFakeNode(fakeNodePath);

    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--config', bundleConfigPath,
      '--host', '127.0.0.1',
      '--port', String(port),
      '--startup-check-host', '127.0.0.1',
      '--startup-check-port', String(port),
      '--node-bin', fakeNodePath,
    ], {
      env: { NIGHT_BATCH_LIVE_CHECKOUT_BASELINE_PATH: baselinePath },
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const summary = readSummaryFromResult(result);
    const guardStep = summary.steps.find((s) => s.name === 'live-checkout-guard');
    assert.ok(guardStep, 'must have live-checkout-guard step');
    assert.equal(guardStep.success, true);
    assert.ok(summary.live_checkout_protection, 'summary must contain live_checkout_protection');
    assert.equal(summary.live_checkout_protection.status, 'warning');
    assert.ok(summary.live_checkout_protection.warning_files.length >= 1,
      'must have at least one warning file');
  });

  it('baseline + campaign latest hash mismatch produces warning but run succeeds', async () => {
    const { createHash } = await import('node:crypto');
    const bundleConfigPath = join(PROJECT_ROOT, 'config', 'night_batch', 'bundle-foreground-reuse-config.json');
    const strategyPresetsPath = join(PROJECT_ROOT, 'config', 'backtest', 'strategy-presets.json');
    const strategyCatalogPath = join(PROJECT_ROOT, 'config', 'backtest', 'strategy-catalog.json');
    const usCampaignPath = join(PROJECT_ROOT, 'config', 'backtest', 'campaigns', 'current', 'next-long-run-us-12x10.json');
    const jpCampaignPath = join(PROJECT_ROOT, 'config', 'backtest', 'campaigns', 'current', 'next-long-run-jp-12x10.json');

    const bundleHash = createHash('sha256').update(readFileSync(bundleConfigPath)).digest('hex');
    const strategyHash = createHash('sha256').update(readFileSync(strategyPresetsPath)).digest('hex');
    const catalogHash = createHash('sha256').update(readFileSync(strategyCatalogPath)).digest('hex');
    const jpHash = createHash('sha256').update(readFileSync(jpCampaignPath)).digest('hex');

    const baselinePath = join(tempDir, 'baseline-campaign.json');
    writeFileSync(baselinePath, JSON.stringify({
      run_id: 'test_baseline_campaign',
      run_attempt: '1',
      algorithm: 'sha256',
      bundle_config_path: toRepoRelativePath(bundleConfigPath),
      resolved_campaigns: [],
      files: [
        { path: toRepoRelativePath(bundleConfigPath), role: 'bundle_config', sha256: bundleHash },
        { path: toRepoRelativePath(strategyPresetsPath), role: 'strategy_presets', sha256: strategyHash },
        { path: toRepoRelativePath(strategyCatalogPath), role: 'strategy_catalog', sha256: catalogHash },
        { path: toRepoRelativePath(usCampaignPath), role: 'campaign_current', sha256: 'wrong_campaign_hash' },
        { path: toRepoRelativePath(jpCampaignPath), role: 'campaign_current', sha256: jpHash },
      ],
      aggregate_fingerprint: 'dummy',
    }), 'utf8');

    const fakeNodePath = join(tempDir, 'fake-node-campaign.sh');
    writeFakeNode(fakeNodePath);

    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--config', bundleConfigPath,
      '--host', '127.0.0.1',
      '--port', String(port),
      '--startup-check-host', '127.0.0.1',
      '--startup-check-port', String(port),
      '--node-bin', fakeNodePath,
    ], {
      env: { NIGHT_BATCH_LIVE_CHECKOUT_BASELINE_PATH: baselinePath },
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const summary = readSummaryFromResult(result);
    const guardStep = summary.steps.find((s) => s.name === 'live-checkout-guard');
    assert.ok(guardStep, 'must have live-checkout-guard step');
    assert.equal(guardStep.success, true);
    assert.ok(summary.live_checkout_protection, 'summary must contain live_checkout_protection');
    assert.equal(summary.live_checkout_protection.status, 'warning');
    assert.ok(summary.live_checkout_protection.warning_files.some(
      (f) => f.role === 'campaign_current'),
      'must have campaign_current warning');
  });

  it('baseline + strategy-catalog hash mismatch produces warning but run succeeds', async () => {
    const { createHash } = await import('node:crypto');
    const bundleConfigPath = join(PROJECT_ROOT, 'config', 'night_batch', 'bundle-foreground-reuse-config.json');
    const strategyPresetsPath = join(PROJECT_ROOT, 'config', 'backtest', 'strategy-presets.json');
    const strategyCatalogPath = join(PROJECT_ROOT, 'config', 'backtest', 'strategy-catalog.json');
    const usCampaignPath = join(PROJECT_ROOT, 'config', 'backtest', 'campaigns', 'current', 'next-long-run-us-12x10.json');
    const jpCampaignPath = join(PROJECT_ROOT, 'config', 'backtest', 'campaigns', 'current', 'next-long-run-jp-12x10.json');

    const bundleHash = createHash('sha256').update(readFileSync(bundleConfigPath)).digest('hex');
    const strategyHash = createHash('sha256').update(readFileSync(strategyPresetsPath)).digest('hex');
    const usHash = createHash('sha256').update(readFileSync(usCampaignPath)).digest('hex');
    const jpHash = createHash('sha256').update(readFileSync(jpCampaignPath)).digest('hex');

    const baselinePath = join(tempDir, 'baseline-catalog.json');
    writeFileSync(baselinePath, JSON.stringify({
      run_id: 'test_baseline_catalog',
      run_attempt: '1',
      algorithm: 'sha256',
      bundle_config_path: toRepoRelativePath(bundleConfigPath),
      resolved_campaigns: [],
      files: [
        { path: toRepoRelativePath(bundleConfigPath), role: 'bundle_config', sha256: bundleHash },
        { path: toRepoRelativePath(strategyPresetsPath), role: 'strategy_presets', sha256: strategyHash },
        { path: toRepoRelativePath(strategyCatalogPath), role: 'strategy_catalog', sha256: 'wrong_catalog_hash' },
        { path: toRepoRelativePath(usCampaignPath), role: 'campaign_current', sha256: usHash },
        { path: toRepoRelativePath(jpCampaignPath), role: 'campaign_current', sha256: jpHash },
      ],
      aggregate_fingerprint: 'dummy',
    }), 'utf8');

    const fakeNodePath = join(tempDir, 'fake-node-catalog.sh');
    writeFakeNode(fakeNodePath);

    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--config', bundleConfigPath,
      '--host', '127.0.0.1',
      '--port', String(port),
      '--startup-check-host', '127.0.0.1',
      '--startup-check-port', String(port),
      '--node-bin', fakeNodePath,
    ], {
      env: { NIGHT_BATCH_LIVE_CHECKOUT_BASELINE_PATH: baselinePath },
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const summary = readSummaryFromResult(result);
    assert.equal(summary.live_checkout_protection.status, 'warning');
    assert.ok(summary.live_checkout_protection.warning_files.some(
      (f) => f.role === 'strategy_catalog'),
      'must have strategy_catalog warning');
  });

  it('missing baseline file blocks production when env var is set', async () => {
    const fakeNodePath = join(tempDir, 'fake-node-missing.sh');
    writeFakeNode(fakeNodePath);

    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--config',
      join(PROJECT_ROOT, 'config', 'night_batch', 'bundle-foreground-reuse-config.json'),
      '--host', '127.0.0.1',
      '--port', String(port),
      '--startup-check-host', '127.0.0.1',
      '--startup-check-port', String(port),
      '--node-bin', fakeNodePath,
    ], {
      env: {
        NIGHT_BATCH_LIVE_CHECKOUT_BASELINE_PATH: join(tempDir, 'nonexistent-baseline.json'),
      },
    });

    assert.equal(result.status, 2, result.stderr || result.stdout);
    const summary = readSummaryFromResult(result);
    const guardStep = summary.steps.find((s) => s.name === 'live-checkout-guard');
    assert.ok(guardStep, 'must have live-checkout-guard step');
    assert.equal(guardStep.success, false);
  });

  it('no baseline env var means guard is skipped', async () => {
    const fakeNodePath = join(tempDir, 'fake-node-nobaseline.sh');
    writeFakeNode(fakeNodePath);

    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--config',
      join(PROJECT_ROOT, 'config', 'night_batch', 'bundle-foreground-reuse-config.json'),
      '--host', '127.0.0.1',
      '--port', String(port),
      '--startup-check-host', '127.0.0.1',
      '--startup-check-port', String(port),
      '--node-bin', fakeNodePath,
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const summary = readSummaryFromResult(result);
    const guardStep = summary.steps.find((s) => s.name === 'live-checkout-guard');
    assert.equal(guardStep, undefined, 'no live-checkout-guard step when env var is not set');
  });
});

describe('night_batch.py readiness contract alignment', () => {
  let server = null;
  let port = null;
  let tempDir = null;
  let resultsDir = null;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'night-batch-readiness-'));
    resultsDir = join(tempDir, 'night-batch-results');
    RESULTS_DIR = resultsDir;
    mkdirSync(resultsDir, { recursive: true });
  });

  afterEach(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      server = null;
    }
    port = null;
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
    RESULTS_DIR = join(PROJECT_ROOT, 'results', 'night-batch');
    resultsDir = null;
  });

  it('preflight invokes readiness check (tv status) when node_bin is available', async (t) => {
    server = createServer((req, res) => {
      if (req.url === '/json/list') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([
          { id: 'chart-1', type: 'page', url: 'https://jp.tradingview.com/chart/abc/', title: 'Chart' },
        ]));
        return;
      }
      res.writeHead(404);
      res.end('not found');
    });
    if (!await listenOrSkip(t, server)) {
      server = null;
      return;
    }
    port = server.address().port;

    const fakeNodePath = join(tempDir, 'fake-node-status.sh');
    const fakeNodeLog = join(tempDir, 'fake-node-status.log');
    writeExecutable(
      fakeNodePath,
      `#!/bin/sh
printf '%s\\n' "$*" >> "${fakeNodeLog}"
case "$*" in
  *status*)
    printf '{"success":true,"api_available":true,"chart_symbol":"NVDA"}\\n'
    exit 0
    ;;
  *)
    exit 0
    ;;
esac
`,
    );

    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--host', '127.0.0.1',
      '--port', String(port),
      '--startup-check-host', '127.0.0.1',
      '--startup-check-port', String(port),
      '--node-bin', fakeNodePath,
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const summary = readSummaryFromResult(result);
    const preflightStep = summary.steps.find((s) => s.name === 'preflight');
    assert.ok(preflightStep, 'must have preflight step');
    assert.equal(preflightStep.success, true);

    const logged = readFileSync(fakeNodeLog, 'utf8');
    assert.match(logged, /status/,
      'preflight must invoke tv status to verify readiness contract');
  });

  it('preflight fails when chart target is visible but tv status reports api_available=false', async (t) => {
    server = createServer((req, res) => {
      if (req.url === '/json/list') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([
          { id: 'chart-1', type: 'page', url: 'https://jp.tradingview.com/chart/abc/', title: 'Chart' },
        ]));
        return;
      }
      res.writeHead(404);
      res.end('not found');
    });
    if (!await listenOrSkip(t, server)) {
      server = null;
      return;
    }
    port = server.address().port;

    const fakeNodePath = join(tempDir, 'fake-node-api-unavail.sh');
    writeExecutable(
      fakeNodePath,
      `#!/bin/sh
case "$*" in
  *status*)
    printf '{"success":false,"api_available":false,"apiError":"dialog blocking"}\\n'
    exit 1
    ;;
  *)
    exit 0
    ;;
esac
`,
    );

    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--host', '127.0.0.1',
      '--port', String(port),
      '--startup-check-host', '127.0.0.1',
      '--startup-check-port', String(port),
      '--node-bin', fakeNodePath,
      '--launch-wait-sec', '2',
    ]);

    assert.equal(result.status, 1, 'must fail with exit 1 when api_available is false');
    const summary = readSummaryFromResult(result);
    const preflightStep = summary.steps.find((s) => s.name === 'preflight');
    assert.ok(preflightStep, 'must have preflight step');
    assert.equal(preflightStep.success, false,
      'preflight must fail when tv status reports api_available=false even though /json/list sees chart target');
  });

  it('preflight recovers and retries when tv status fails with EPIPE before TradingView comes back', async (t) => {
    server = createServer((req, res) => {
      if (req.url === '/json/list') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([
          { id: 'chart-1', type: 'page', url: 'https://jp.tradingview.com/chart/abc/', title: 'Chart' },
        ]));
        return;
      }
      res.writeHead(404);
      res.end('not found');
    });
    if (!await listenOrSkip(t, server)) {
      server = null;
      return;
    }
    port = server.address().port;

    const readyFlag = join(tempDir, 'recovery-ready.flag');
    const fakeNodePath = join(tempDir, 'fake-node-recovery-preflight.sh');
    const fakeNodeLog = join(tempDir, 'fake-node-recovery-preflight.log');
    const fakeRecoveryPath = join(tempDir, 'fake-recovery-preflight.sh');
    const fakeRecoveryLog = join(tempDir, 'fake-recovery-preflight.log');
    const detachedStatePath = join(tempDir, 'detached-state.json');

    writeExecutable(
      fakeNodePath,
      `#!/bin/sh
printf '%s\\n' "$*" >> "${fakeNodeLog}"
case "$*" in
  *status*)
    if [ -f "${readyFlag}" ]; then
      printf '{"success":true,"api_available":true,"chart_symbol":"NVDA"}\\n'
      exit 0
    fi
    printf '{"success":false,"api_available":false,"error":"EPIPE: broken pipe, write"}\\n'
    exit 1
    ;;
  *)
    exit 0
    ;;
esac
`,
    );
    writeExecutable(
      fakeRecoveryPath,
      `#!/bin/sh
printf 'recover-preflight\\n' >> "${fakeRecoveryLog}"
touch "${readyFlag}"
exit 0
`,
    );

    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--host', '127.0.0.1',
      '--port', String(port),
      '--startup-check-host', '127.0.0.1',
      '--startup-check-port', String(port),
      '--node-bin', fakeNodePath,
      '--launch-wait-sec', '2',
      '--recovery-script', fakeRecoveryPath,
      '--recovery-step-retries', '1',
      '--detached-state-file', detachedStatePath,
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const summary = readSummaryFromResult(result);
    const preflightStep = summary.steps.find((s) => s.name === 'preflight');
    assert.ok(preflightStep, 'must have preflight step');
    assert.equal(preflightStep.success, true);
    assert.match(readFileSync(fakeRecoveryLog, 'utf8'), /recover-preflight/);
  });

  it('preflight normalizes ConnectionResetError into a recoverable RuntimeError', async () => {
    const script = `
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path.cwd() / 'python'))
import night_batch

def raise_connection_reset(*args, **kwargs):
    raise ConnectionResetError(104, 'Connection reset by peer')

night_batch.urllib.request.urlopen = raise_connection_reset

try:
    night_batch.preflight_visible_session('127.0.0.1', 9223, logging.getLogger('test'))
except RuntimeError as exc:
    print(str(exc))
    sys.exit(0)
except Exception as exc:
    print(f'{type(exc).__name__}: {exc}')
    sys.exit(2)

sys.exit(3)
`;

    const result = await new Promise((resolve, reject) => {
      const child = spawn('python3', ['-c', script], {
        cwd: PROJECT_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => {
        stdout += String(chunk);
      });
      child.stderr.on('data', (chunk) => {
        stderr += String(chunk);
      });
      child.on('error', reject);
      child.on('close', (code) => {
        resolve({ status: code, stdout, stderr });
      });
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Preflight failed for CDP session 127\.0\.0\.1:9223: \[Errno 104\] Connection reset by peer/);
  });

  it('smoke step reruns after recovery when CLI execution fails with EPIPE', async (t) => {
    server = createServer((req, res) => {
      if (req.url === '/json/list') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([
          { id: 'chart-1', type: 'page', url: 'https://jp.tradingview.com/chart/abc/', title: 'Chart' },
        ]));
        return;
      }
      res.writeHead(404);
      res.end('not found');
    });
    if (!await listenOrSkip(t, server)) {
      server = null;
      return;
    }
    port = server.address().port;

    const readyFlag = join(tempDir, 'recovery-ready-smoke.flag');
    const fakeNodePath = join(tempDir, 'fake-node-recovery-smoke.sh');
    const fakeNodeLog = join(tempDir, 'fake-node-recovery-smoke.log');
    const fakeRecoveryPath = join(tempDir, 'fake-recovery-smoke.sh');
    const fakeRecoveryLog = join(tempDir, 'fake-recovery-smoke.log');
    const detachedStatePath = join(tempDir, 'detached-state-smoke.json');

    writeExecutable(
      fakeNodePath,
      `#!/bin/sh
printf '%s\\n' "$*" >> "${fakeNodeLog}"
case "$*" in
  *status*)
    printf '{"success":true,"api_available":true,"chart_symbol":"NVDA"}\\n'
    exit 0
    ;;
  *2024-01-01*2024-12-31*)
    if [ -f "${readyFlag}" ]; then
      exit 0
    fi
    printf 'EPIPE: broken pipe, write\\n' >&2
    exit 1
    ;;
  *)
    exit 0
    ;;
esac
`,
    );
    writeExecutable(
      fakeRecoveryPath,
      `#!/bin/sh
printf 'recover-smoke\\n' >> "${fakeRecoveryLog}"
touch "${readyFlag}"
exit 0
`,
    );

    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--host', '127.0.0.1',
      '--port', String(port),
      '--startup-check-host', '127.0.0.1',
      '--startup-check-port', String(port),
      '--node-bin', fakeNodePath,
      '--recovery-script', fakeRecoveryPath,
      '--recovery-step-retries', '1',
      '--detached-state-file', detachedStatePath,
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const summary = readSummaryFromResult(result);
    const smokeStep = summary.steps.find((s) => s.name === 'smoke');
    assert.ok(smokeStep, 'must have smoke step');
    assert.equal(smokeStep.success, true);
    assert.match(readFileSync(fakeRecoveryLog, 'utf8'), /recover-smoke/);
    const fakeNodeCalls = readFileSync(fakeNodeLog, 'utf8');
    assert.ok((fakeNodeCalls.match(/2024-01-01/g) || []).length >= 2,
      'smoke CLI must be attempted again after recovery');
  });

  it('summary classifies readiness failure distinctly from preflight failure', async (t) => {
    server = createServer((req, res) => {
      if (req.url === '/json/list') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([
          { id: 'chart-1', type: 'page', url: 'https://jp.tradingview.com/chart/abc/', title: 'Chart' },
        ]));
        return;
      }
      res.writeHead(404);
      res.end('not found');
    });
    if (!await listenOrSkip(t, server)) {
      server = null;
      return;
    }
    port = server.address().port;

    const fakeNodePath = join(tempDir, 'fake-node-readiness-fail.sh');
    writeExecutable(
      fakeNodePath,
      `#!/bin/sh
case "$*" in
  *status*)
    printf '{"success":false,"api_available":false}\\n'
    exit 1
    ;;
  *)
    exit 0
    ;;
esac
`,
    );

    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--host', '127.0.0.1',
      '--port', String(port),
      '--startup-check-host', '127.0.0.1',
      '--startup-check-port', String(port),
      '--node-bin', fakeNodePath,
      '--launch-wait-sec', '2',
    ]);

    assert.notEqual(result.status, 0);
    const summary = readSummaryFromResult(result);
    assert.match(summary.termination_reason, /readiness|preflight/,
      'termination reason must indicate readiness or preflight failure');
  });

  it('surfaces non-JSON tv status bootstrap failures instead of reporting error=unknown', async (t) => {
    server = createServer((req, res) => {
      if (req.url === '/json/list') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([
          { id: 'chart-1', type: 'page', url: 'https://jp.tradingview.com/chart/abc/', title: 'Chart' },
        ]));
        return;
      }
      res.writeHead(404);
      res.end('not found');
    });
    if (!await listenOrSkip(t, server)) {
      server = null;
      return;
    }
    port = server.address().port;

    const fakeNodePath = join(tempDir, 'fake-node-bootstrap-fail.sh');
    writeExecutable(
      fakeNodePath,
      `#!/bin/sh
case "$*" in
  *status*)
    printf '%s\\n' "SyntaxError: missing export getTradingViewFinancialsBatch" >&2
    exit 1
    ;;
  *)
    exit 0
    ;;
esac
`,
    );

    const result = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--host', '127.0.0.1',
      '--port', String(port),
      '--startup-check-host', '127.0.0.1',
      '--startup-check-port', String(port),
      '--node-bin', fakeNodePath,
      '--launch-wait-sec', '2',
    ]);

    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.stdout, /error=unknown/,
      'bootstrap failures must not collapse into error=unknown');
    assert.match(result.stdout, /SyntaxError|exit code/i,
      'bootstrap failures must surface CLI stderr/stdout or exit code');
  });
});
