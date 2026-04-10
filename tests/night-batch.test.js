import { beforeEach, afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const PROJECT_ROOT = join(process.cwd());
const SCRIPT_PATH = join(PROJECT_ROOT, 'python', 'night_batch.py');
const RESULTS_DIR = join(PROJECT_ROOT, 'results', 'night-batch');

function runPython(args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('python3', args, {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...(options.env || {}) },
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

function readSummaryFromResult(result) {
  const match = result.stdout.match(/Summary written: results\/night-batch\/([0-9_]+)-summary\.md/);
  assert.ok(match, `expected summary path in stdout:\n${result.stdout}`);
  const summaryPath = join(RESULTS_DIR, `${match[1]}-summary.json`);
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
        'results/us.json',
        '--jp',
        'results/jp.json',
        '--out',
        'results/report.md',
        '--dry-run',
      ],
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /generate-rich-report\.mjs/);
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
  });

  it('smoke-prod reads smoke and production commands from a JSON config', async () => {
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
});
