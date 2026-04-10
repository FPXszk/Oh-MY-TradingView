#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');

function runNode(args, { env = {}, stdio = 'pipe' } = {}) {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      args,
      {
        cwd: PROJECT_ROOT,
        env: {
          ...process.env,
          ...env,
        },
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        resolve({
          success: !error,
          code: typeof error?.code === 'number' ? error.code : 0,
          stdout: String(stdout || ''),
          stderr: String(stderr || ''),
        });
      },
    );
  });
}

function parsePortList(raw) {
  return String(raw || '')
    .split(',')
    .map((value) => Number(value.trim()))
    .filter(Number.isFinite);
}

async function runStatus(host, port) {
  const result = await runNode(
    [join(PROJECT_ROOT, 'src', 'cli', 'index.js'), 'status'],
    {
      env: {
        TV_CDP_HOST: host,
        TV_CDP_PORT: String(port),
      },
    },
  );

  let payload = null;
  try {
    payload = JSON.parse(result.stdout || result.stderr || '{}');
  } catch {
    payload = null;
  }

  return {
    port,
    success: result.success && payload?.success === true && payload?.api_available === true,
    payload,
    stderr: result.stderr,
  };
}

async function runCampaignPhase({ campaignId, phase, host, ports, dryRun, resume = null }) {
  const args = [join(PROJECT_ROOT, 'scripts', 'backtest', 'run-long-campaign.mjs'), campaignId, '--phase', phase, '--host', host, '--ports', ports.join(',')];
  if (dryRun) {
    args.push('--dry-run');
  }
  if (resume) {
    args.push('--resume', resume);
  }
  return runNode(args);
}

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      host: { type: 'string', default: process.env.TV_CDP_HOST || '172.31.144.1' },
      ports: { type: 'string', default: process.env.TV_CAMPAIGN_PORTS || '9225' },
      phases: { type: 'string', default: 'smoke,full' },
      'fallback-port': { type: 'string', default: '9223' },
      'us-campaign': { type: 'string', default: 'next-long-run-us-finetune-100x10' },
      'jp-campaign': { type: 'string', default: 'next-long-run-jp-finetune-100x10' },
      'dry-run': { type: 'boolean', default: false },
      'skip-preflight': { type: 'boolean', default: false },
    },
    allowPositionals: true,
    strict: true,
  });

  const host = values.host;
  const requestedPorts = parsePortList(values.ports);
  const phases = String(values.phases).split(',').map((value) => value.trim()).filter(Boolean);
  const fallbackPort = Number(values['fallback-port']);

  if (requestedPorts.length === 0) {
    throw new Error('At least one port is required');
  }
  if (!Number.isFinite(fallbackPort)) {
    throw new Error(`Invalid --fallback-port: ${values['fallback-port']}`);
  }

  let activePorts = [...requestedPorts];
  if (!values['skip-preflight'] && !values['dry-run']) {
    const checks = await Promise.all(requestedPorts.map((port) => runStatus(host, port)));
    const readyPorts = checks.filter((entry) => entry.success).map((entry) => entry.port);
    if (readyPorts.length === 0) {
      throw new Error('No worker port passed status preflight');
    }
    activePorts = readyPorts;
  }

  const campaigns = [values['us-campaign'], values['jp-campaign']];
  for (const phase of phases) {
    process.stdout.write(`\n=== Phase: ${phase} ===\n`);
    for (const campaignId of campaigns) {
      process.stdout.write(`Running ${campaignId} on ports ${activePorts.join(',')}\n`);
      let result = await runCampaignPhase({
        campaignId,
        phase,
        host,
        ports: activePorts,
        dryRun: values['dry-run'],
      });

      process.stdout.write(result.stdout);
      if (result.stderr) {
        process.stderr.write(result.stderr);
      }
      if (!result.success) {
        if (activePorts.length > 1) {
          throw new Error(`Campaign failed: ${campaignId} (${phase}). Rerun manually with --ports ${fallbackPort} if you need fallback execution.`);
        }
        throw new Error(`Campaign failed: ${campaignId} (${phase})`);
      }
    }
  }
}

main().catch((error) => {
  process.stderr.write(`Fatal: ${error.message}\n`);
  process.exit(1);
});
