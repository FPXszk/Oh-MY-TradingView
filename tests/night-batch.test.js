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

describe('night_batch.py CLI', () => {
  let server = null;
  let port = null;
  let tempDir = null;
  let resultsDir = null;

  beforeEach(async () => {
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
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
    tempDir = mkdtempSync(join(tmpdir(), 'night-batch-test-'));
    resultsDir = join(tempDir, 'night-batch-results');
    RESULTS_DIR = resultsDir;
    mkdirSync(resultsDir, { recursive: true });
  });

  afterEach(async () => {
    if (!server) return;
    await new Promise((resolve) => server.close(resolve));
    server = null;
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
        'docs/research/results/us.json',
        '--jp',
        'docs/research/results/jp.json',
        '--out',
        'docs/research/results/report.md',
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
        'docs/research/results/us.json',
        '--jp',
        'docs/research/results/jp.json',
        '--out',
        'docs/research/results/report.md',
        '--dry-run',
      ],
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /--ranking-out/,
      'report must always include --ranking-out in the command');
    assert.match(result.stdout, /combined-ranking\.json/,
      'auto-computed ranking-out must end with combined-ranking.json');
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
  });

  it('report writes a deterministic latest backtest summary when recovered results exist', async () => {
    const fakeNodePath = join(tempDir, 'fake-report-node.sh');
    const usPath = join(tempDir, 'us-recovered-results.json');
    const jpPath = join(tempDir, 'jp-recovered-results.json');
    const reportPath = join(tempDir, 'rich-report.md');
    const latestSummaryPath = join(tempDir, 'main-backtest-latest-summary.md');

    writeExecutable(
      fakeNodePath,
      `#!/bin/sh
out=""
rankout=""
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
  shift
done
printf '# fake rich report\\n' > "$out"
if [ -n "$rankout" ]; then
  printf '[{"presetId":"preset-a","composite_score":2}]\\n' > "$rankout"
fi
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
          NIGHT_BATCH_LATEST_SUMMARY_PATH: latestSummaryPath,
        },
      },
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(existsSync(latestSummaryPath), true);
    const latestSummary = readFileSync(latestSummaryPath, 'utf8');
    assert.match(latestSummary, /Latest main backtest summary/);
    assert.match(latestSummary, /`preset-a`/);
    assert.match(latestSummary, /Combined top 10/);
    assert.match(latestSummary, /ranking_artifact/,
      'latest summary must include ranking_artifact path when ranking JSON is produced');
    assert.match(latestSummary, /Live \/ Retired diff/,
      'latest summary must include Live / Retired diff section');
  });

  it('nightly dry-run includes both bundle and report commands', async () => {
    const result = await runPython(
      [SCRIPT_PATH, 'nightly', '--host', '127.0.0.1', '--port', String(port), '--dry-run'],
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /run-finetune-bundle\.mjs/);
    assert.match(result.stdout, /generate-rich-report\.mjs/);
  });

  it('bundle dry-run fails preflight when no TradingView chart target exists', async () => {
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
    await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));

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
printf '%s\n' "$*" >> "${fakeNodeLog}"
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

  it('smoke-prod launches the shortcut path when startup check fails and then rechecks connectivity', async () => {
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
      String(deadPort),
      '--launch-command',
      launchScript,
      '--launch-wait-sec',
      '2',
      '--node-bin',
      fakeNodePath,
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(existsSync(launchMarker), true);

    const summary = readSummaryFromResult(result);
    const startupStep = summary.steps.find((step) => step.name === 'startup-check');
    const launchStep = summary.steps.find((step) => step.name === 'launch');
    const preflightStep = summary.steps.find((step) => step.name === 'preflight');
    assert.equal(startupStep.success, false);
    assert.equal(launchStep.success, true);
    assert.equal(launchStep.skipped, false);
    assert.equal(preflightStep.success, true);
  });

  it('smoke-prod stops before production when the smoke backtest fails', async () => {
    const fakeNodePath = join(tempDir, 'fake-node.sh');
    const fakeNodeLog = join(tempDir, 'fake-node.log');
    const counterFile = join(tempDir, 'fake-node-count.txt');
    writeExecutable(
      fakeNodePath,
      `#!/bin/sh
count=0
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
printf '%s\n' "$*" >> "${fakeNodeLog}"
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

  it('smoke-prod lets CLI smoke-cli override the JSON config value', async () => {
    const fakeNodePath = join(tempDir, 'fake-node.sh');
    const fakeNodeLog = join(tempDir, 'fake-node.log');
    const configPath = join(tempDir, 'nightly.json');
    writeExecutable(
      fakeNodePath,
      `#!/bin/sh
printf '%s\n' "$*" >> "${fakeNodeLog}"
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
printf '%s\n' "$*" >> "${fakeNodeLog}"
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
      '--dry-run',
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);

    const liveResult = await runPython([
      SCRIPT_PATH,
      'smoke-prod',
      '--config',
      configPath,
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
printf '%s\n' "$*" >> "${fakeNodeLog}"
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

  it('smoke-prod can detach the full bundle phase after a smoke bundle gate', async () => {
    const fakeNodePath = join(tempDir, 'fake-node.sh');
    const fakeNodeLog = join(tempDir, 'fake-node.log');
    const detachedStateFile = join(tempDir, 'bundle-detached-state.json');
    const configPath = join(tempDir, 'bundle.json');
    writeExecutable(
      fakeNodePath,
      `#!/bin/sh
printf '%s\n' "$*" >> "${fakeNodeLog}"
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

  it('production-child writes the latest backtest summary for detached bundle runs', async () => {
    const fakeNodePath = join(tempDir, 'fake-bundle-node.sh');
    const detachedStateFile = join(tempDir, 'bundle-detached-state.json');
    const latestSummaryPath = join(tempDir, 'main-backtest-latest-summary.md');
    const outputDir = join(tempDir, 'night-batch-output');
    const suffix = tempDir.split('/').pop();
    const usCampaign = `test-detached-us-${suffix}`;
    const jpCampaign = `test-detached-jp-${suffix}`;
    const usResultsDir = join(PROJECT_ROOT, 'docs', 'research', 'results', 'campaigns', usCampaign, 'full');
    const jpResultsDir = join(PROJECT_ROOT, 'docs', 'research', 'results', 'campaigns', jpCampaign, 'full');
    const usResultsPath = join(usResultsDir, 'recovered-results.json');
    const jpResultsPath = join(jpResultsDir, 'recovered-results.json');

    mkdirSync(usResultsDir, { recursive: true });
    mkdirSync(jpResultsDir, { recursive: true });
    writeExecutable(
      fakeNodePath,
      `#!/bin/sh
mkdir -p "${usResultsDir}" "${jpResultsDir}"
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
      ], {
        env: {
          NIGHT_BATCH_LATEST_SUMMARY_PATH: latestSummaryPath,
        },
      });

      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.equal(existsSync(latestSummaryPath), true);
      const latestSummary = readFileSync(latestSummaryPath, 'utf8');
      assert.match(latestSummary, /Latest main backtest summary/);
      assert.match(latestSummary, /preset-a/);
    } finally {
      rmSync(join(PROJECT_ROOT, 'docs', 'research', 'results', 'campaigns', usCampaign), { recursive: true, force: true });
      rmSync(join(PROJECT_ROOT, 'docs', 'research', 'results', 'campaigns', jpCampaign), { recursive: true, force: true });
    }
  });

  it('advance-next-round creates a round directory and writes artifacts there', async () => {
    const fakeNodePath = join(tempDir, 'fake-node.sh');
    const fakeNodeLog = join(tempDir, 'fake-node.log');
    writeExecutable(
      fakeNodePath,
      `#!/bin/sh
printf '%s\n' "$*" >> "${fakeNodeLog}"
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
printf '%s\n' "$*" >> "${fakeNodeLog}"
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
printf '%s\n' "$*" >> "${fakeNodeLog}"
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
        'docs/research/results/campaigns/us/checkpoint-10.json',
        '--jp-resume',
        'docs/research/results/campaigns/jp/checkpoint-20.json',
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
    const usCampaignPath = join(PROJECT_ROOT, 'config', 'backtest', 'campaigns', 'latest', 'next-long-run-us-12x10.json');
    const jpCampaignPath = join(PROJECT_ROOT, 'config', 'backtest', 'campaigns', 'latest', 'next-long-run-jp-12x10.json');

    const strategyHash = createHash('sha256').update(readFileSync(strategyPresetsPath)).digest('hex');
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
        { path: toRepoRelativePath(usCampaignPath), role: 'campaign_latest', sha256: usHash },
        { path: toRepoRelativePath(jpCampaignPath), role: 'campaign_latest', sha256: jpHash },
      ],
      aggregate_fingerprint: 'dummy',
    }), 'utf8');

    const fakeNodePath = join(tempDir, 'fake-node-guard.sh');
    writeExecutable(fakeNodePath, '#!/bin/sh\nexit 0\n');

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
    const usCampaignPath = join(PROJECT_ROOT, 'config', 'backtest', 'campaigns', 'latest', 'next-long-run-us-12x10.json');
    const jpCampaignPath = join(PROJECT_ROOT, 'config', 'backtest', 'campaigns', 'latest', 'next-long-run-jp-12x10.json');

    const bundleHash = createHash('sha256').update(readFileSync(bundleConfigPath)).digest('hex');
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
        { path: toRepoRelativePath(usCampaignPath), role: 'campaign_latest', sha256: usHash },
        { path: toRepoRelativePath(jpCampaignPath), role: 'campaign_latest', sha256: jpHash },
      ],
      aggregate_fingerprint: 'dummy',
    }), 'utf8');

    const fakeNodePath = join(tempDir, 'fake-node-warn.sh');
    writeExecutable(fakeNodePath, '#!/bin/sh\nexit 0\n');

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
    const usCampaignPath = join(PROJECT_ROOT, 'config', 'backtest', 'campaigns', 'latest', 'next-long-run-us-12x10.json');
    const jpCampaignPath = join(PROJECT_ROOT, 'config', 'backtest', 'campaigns', 'latest', 'next-long-run-jp-12x10.json');

    const bundleHash = createHash('sha256').update(readFileSync(bundleConfigPath)).digest('hex');
    const strategyHash = createHash('sha256').update(readFileSync(strategyPresetsPath)).digest('hex');
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
        { path: toRepoRelativePath(usCampaignPath), role: 'campaign_latest', sha256: 'wrong_campaign_hash' },
        { path: toRepoRelativePath(jpCampaignPath), role: 'campaign_latest', sha256: jpHash },
      ],
      aggregate_fingerprint: 'dummy',
    }), 'utf8');

    const fakeNodePath = join(tempDir, 'fake-node-campaign.sh');
    writeExecutable(fakeNodePath, '#!/bin/sh\nexit 0\n');

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
      (f) => f.role === 'campaign_latest'),
      'must have campaign_latest warning');
  });

  it('missing baseline file blocks production when env var is set', async () => {
    const fakeNodePath = join(tempDir, 'fake-node-missing.sh');
    writeExecutable(fakeNodePath, '#!/bin/sh\nexit 0\n');

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
    writeExecutable(fakeNodePath, '#!/bin/sh\nexit 0\n');

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
