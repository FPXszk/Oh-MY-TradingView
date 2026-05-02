#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import {
  connectionGateDefaults,
  loadNightBatchConnectionConfig,
  probeConnection,
  shouldAttemptReadinessRecovery,
  waitForConnection,
} from '../../src/core/night-batch-connection-gate.js';
import { launchDesktop } from '../../src/core/launch.js';

const execFileAsync = promisify(execFile);

function writeLine(message, stream = process.stdout) {
  stream.write(`${message}\n`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function killTradingViewProcess() {
  try {
    await execFileAsync('taskkill.exe', ['/F', '/IM', 'TradingView.exe']);
  } catch (error) {
    const detail = `${error?.stdout || ''}\n${error?.stderr || ''}\n${error?.message || ''}`;
    if (/not found|no running instance|見つかりません|見当たりません/i.test(detail)) {
      return;
    }
    throw error;
  }
}

async function restartTradingView(connection, log) {
  log('stalled readiness detected; restarting TradingView once');
  await killTradingViewProcess();
  const launched = await launchDesktop({ port: connection.startupPort });
  log(`relaunch requested (pid=${launched.pid ?? 'unknown'} port=${launched.port})`);
  const waitMs = Math.max(0, connection.launchWaitSec) * 1000;
  if (waitMs > 0) {
    log(`waiting ${Math.ceil(waitMs / 1000)}s for TradingView relaunch`);
    await sleep(waitMs);
  }
}

function parseArgs(argv) {
  const args = {
    timeoutSec: Math.floor(connectionGateDefaults.timeoutMs / 1000),
    intervalSec: Math.floor(connectionGateDefaults.intervalMs / 1000),
    configPath: null,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--config') {
      args.configPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === '--timeout-sec') {
      args.timeoutSec = Number(argv[index + 1]);
      index += 1;
      continue;
    }
    if (token === '--interval-sec') {
      args.intervalSec = Number(argv[index + 1]);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  if (!args.configPath) {
    throw new Error('Missing required --config argument');
  }
  if (!Number.isFinite(args.timeoutSec) || args.timeoutSec <= 0) {
    throw new Error(`Invalid --timeout-sec value: ${args.timeoutSec}`);
  }
  if (!Number.isFinite(args.intervalSec) || args.intervalSec <= 0) {
    throw new Error(`Invalid --interval-sec value: ${args.intervalSec}`);
  }

  return args;
}

async function main(argv) {
  const args = parseArgs(argv);
  const configPath = resolve(args.configPath);
  const connection = await loadNightBatchConnectionConfig(configPath);

  writeLine('[connection-gate] Waiting for TradingView connection');
  writeLine(`[connection-gate] config=${configPath}`);
  writeLine(
    `[connection-gate] startup_check=http://${connection.startupHost}:${connection.startupPort}/json/list`,
  );
  writeLine(
    `[connection-gate] bridge=http://${connection.host}:${connection.port}/json/list`,
  );

  const result = await waitForConnection({
    timeoutMs: args.timeoutSec * 1000,
    intervalMs: args.intervalSec * 1000,
    probe: () => probeConnection(connection),
    shouldRecover: (probeResult) => shouldAttemptReadinessRecovery(probeResult),
    recover: async () => restartTradingView(connection, (message) => writeLine(`[connection-gate] ${message}`)),
    maxRecoveryAttempts: 1,
    log: (message) => writeLine(`[connection-gate] ${message}`),
  });

  if (!result.success) {
    writeLine(
      `[connection-gate] FAILED after ${result.attempts} attempts (${Math.ceil(result.elapsedMs / 1000)}s): ${result.summary}`,
      process.stderr,
    );
    process.exitCode = 1;
    return;
  }

  writeLine(
    `[connection-gate] Connected after ${result.attempts} attempts (${Math.ceil(result.elapsedMs / 1000)}s)`,
  );
}

main(process.argv).catch((error) => {
  writeLine(`[connection-gate] ${error instanceof Error ? error.message : String(error)}`, process.stderr);
  process.exitCode = 1;
});
