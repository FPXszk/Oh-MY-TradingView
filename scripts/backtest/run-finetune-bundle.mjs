#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');

/** Patterns that indicate a recoverable TradingView crash (mirrors night_batch.py). */
const RECOVERABLE_PATTERN = /EPIPE|broken pipe|process.*(not found|missing|gone|exited|crashed)/i;

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

function isRecoverable(text) {
  return RECOVERABLE_PATTERN.test(text || '');
}

/**
 * Invoke the recovery shell script and wait for it to complete.
 * Returns { success, stdout, stderr }.
 */
function callRecoveryScript(script, { host, port, maxRetries, timeoutSec }) {
  return new Promise((resolve) => {
    execFile(
      script,
      [
        '--host', host,
        '--port', String(port),
        '--max-retries', String(maxRetries),
        '--readiness-timeout', String(timeoutSec),
      ],
      { cwd: PROJECT_ROOT, timeout: (timeoutSec + 30) * 1000 },
      (error, stdout, stderr) => {
        resolve({ success: !error, stdout: String(stdout || ''), stderr: String(stderr || '') });
      },
    );
  });
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
      ports: { type: 'string', default: process.env.TV_CAMPAIGN_PORTS || '9223' },
      phases: { type: 'string', default: 'smoke,full' },
      'us-campaign': { type: 'string', default: 'next-long-run-us-finetune-100x10' },
      'jp-campaign': { type: 'string', default: 'next-long-run-jp-finetune-100x10' },
      'dry-run': { type: 'boolean', default: false },
      'skip-preflight': { type: 'boolean', default: false },
      'us-resume': { type: 'string', default: '' },
      'jp-resume': { type: 'string', default: '' },
      'recovery-script': { type: 'string', default: '' },
      'recovery-step-retries': { type: 'string', default: '0' },
      'recovery-timeout-sec': { type: 'string', default: '60' },
    },
    allowPositionals: true,
    strict: true,
  });

  const host = values.host;
  const requestedPorts = parsePortList(values.ports);
  const phases = String(values.phases).split(',').map((value) => value.trim()).filter(Boolean);
  const recoveryScript = values['recovery-script'] || '';
  const recoveryStepRetries = Math.max(0, parseInt(values['recovery-step-retries'], 10) || 0);
  const recoveryTimeoutSec = Math.max(10, parseInt(values['recovery-timeout-sec'], 10) || 60);

  if (requestedPorts.length === 0) {
    throw new Error('At least one port is required');
  }

  let activePorts = [...requestedPorts];
  if (!values['skip-preflight'] && !values['dry-run']) {
    let preflightPassed = false;
    for (let attempt = 0; attempt <= recoveryStepRetries; attempt++) {
      const checks = await Promise.all(requestedPorts.map((port) => runStatus(host, port)));
      const readyPorts = checks.filter((entry) => entry.success).map((entry) => entry.port);
      if (readyPorts.length > 0) {
        activePorts = readyPorts;
        preflightPassed = true;
        break;
      }

      if (attempt < recoveryStepRetries && recoveryScript) {
        const combinedOutput = checks
          .map((c) => `${JSON.stringify(c.payload || {})} ${c.stderr}`)
          .join(' ');
        if (!isRecoverable(combinedOutput)) {
          break;
        }
        process.stderr.write(
          `[recovery] Preflight failed with recoverable error (attempt ${attempt + 1}/${recoveryStepRetries}). Invoking recovery script...\n`,
        );
        const recovery = await callRecoveryScript(recoveryScript, {
          host,
          port: requestedPorts[0],
          maxRetries: 1,
          timeoutSec: recoveryTimeoutSec,
        });
        if (recovery.stdout) {
          process.stderr.write(recovery.stdout);
        }
        if (!recovery.success) {
          process.stderr.write(`[recovery] Recovery script exited with error: ${recovery.stderr}\n`);
          break;
        }
        process.stderr.write(`[recovery] Recovery complete. Retrying preflight...\n`);
      } else {
        break;
      }
    }

    if (!preflightPassed) {
      throw new Error(
        `No requested worker port passed status preflight (${requestedPorts.join(',')}). ` +
          'Ensure the Windows-local 9222 TradingView instance is exposed to WSL on the requested port (default 9223).',
      );
    }
  }

  const campaigns = [
    { id: values['us-campaign'], resume: values['us-resume'] || null },
    { id: values['jp-campaign'], resume: values['jp-resume'] || null },
  ];
  for (const phase of phases) {
    process.stdout.write(`\n=== Phase: ${phase} ===\n`);
    for (const campaign of campaigns) {
      process.stdout.write(`Running ${campaign.id} on ports ${activePorts.join(',')}\n`);
      if (campaign.resume) {
        process.stdout.write(`  Resume checkpoint: ${campaign.resume}\n`);
      }

      let campaignSucceeded = false;
      for (let attempt = 0; attempt <= recoveryStepRetries; attempt++) {
        const result = await runCampaignPhase({
          campaignId: campaign.id,
          phase,
          host,
          ports: activePorts,
          dryRun: values['dry-run'],
          resume: campaign.resume,
        });

        process.stdout.write(result.stdout);
        if (result.stderr) {
          process.stderr.write(result.stderr);
        }

        if (result.success) {
          campaignSucceeded = true;
          break;
        }

        if (attempt < recoveryStepRetries && recoveryScript) {
          const combinedOutput = `${result.stdout} ${result.stderr}`;
          if (!isRecoverable(combinedOutput)) {
            break;
          }
          process.stderr.write(
            `[recovery] Campaign ${campaign.id} (${phase}) failed with recoverable error (attempt ${attempt + 1}/${recoveryStepRetries}). Invoking recovery script...\n`,
          );
          const recovery = await callRecoveryScript(recoveryScript, {
            host,
            port: activePorts[0],
            maxRetries: 1,
            timeoutSec: recoveryTimeoutSec,
          });
          if (recovery.stdout) {
            process.stderr.write(recovery.stdout);
          }
          if (!recovery.success) {
            process.stderr.write(`[recovery] Recovery script exited with error: ${recovery.stderr}\n`);
            break;
          }
          process.stderr.write(`[recovery] Recovery complete. Retrying campaign ${campaign.id} (${phase})...\n`);
        } else {
          break;
        }
      }

      if (!campaignSucceeded) {
        throw new Error(
          `Campaign failed: ${campaign.id} (${phase}). ` +
          `Active ports: ${activePorts.join(',')}. No implicit fallback is performed.`,
        );
      }
    }
  }
}

main().catch((error) => {
  process.stderr.write(`Fatal: ${error.message}\n`);
  process.exit(1);
});

