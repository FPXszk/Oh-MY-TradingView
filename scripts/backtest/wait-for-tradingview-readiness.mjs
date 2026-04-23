#!/usr/bin/env node

import { resolve } from 'node:path';
import {
  connectionGateDefaults,
  loadNightBatchConnectionConfig,
  probeConnection,
  waitForConnection,
} from '../../src/core/night-batch-connection-gate.js';

function writeLine(message, stream = process.stdout) {
  stream.write(`${message}\n`);
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
