#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');
const REQUIRED_SMOKE_METRICS = [
  'net_profit',
  'profit_factor',
  'max_drawdown',
  'percent_profitable',
  'closed_trades',
];

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

function buildCampaignQueue(values) {
  return [
    { id: values['us-campaign'], resume: values['us-resume'] || null },
    { id: values['jp-campaign'], resume: values['jp-resume'] || null },
  ].filter((campaign) => typeof campaign.id === 'string' && campaign.id.trim().length > 0);
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
  const runner = process.env.RUN_FINETUNE_CAMPAIGN_RUNNER || join(PROJECT_ROOT, 'scripts', 'backtest', 'run-long-campaign.mjs');
  const args = [runner, campaignId, '--phase', phase, '--host', host, '--ports', ports.join(',')];
  if (dryRun) {
    args.push('--dry-run');
  }
  if (resume) {
    args.push('--resume', resume);
  }
  return runNode(args);
}

function isFiniteMetric(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function findSmokeMetricFailures(runs) {
  if (!Array.isArray(runs) || runs.length === 0) {
    return [{ presetId: 'n/a', symbol: 'n/a', reason: 'smoke recovered-results is empty' }];
  }

  const failures = [];
  for (const run of runs) {
    const result = run?.result || {};
    const metrics = result.metrics || {};
    const missingMetrics = REQUIRED_SMOKE_METRICS.filter((key) => !isFiniteMetric(metrics[key]));
    if (
      result.success !== true ||
      result.apply_failed === true ||
      result.tester_available !== true ||
      result.tester_reason_category ||
      missingMetrics.length > 0
    ) {
      failures.push({
        presetId: run?.presetId || 'n/a',
        symbol: run?.symbol || 'n/a',
        reason: result.tester_reason_category ||
          result.tester_reason ||
          (result.apply_failed ? 'apply_failed' : '') ||
          (missingMetrics.length > 0 ? `missing metrics: ${missingMetrics.join(',')}` : 'unknown smoke validation failure'),
      });
    }
  }
  return failures;
}

async function validateSmokeMetrics(campaignId, phase) {
  const resultsPath = join(PROJECT_ROOT, 'artifacts', 'campaigns', campaignId, phase, 'recovered-results.json');
  let runs;
  try {
    runs = JSON.parse(await readFile(resultsPath, 'utf8'));
  } catch (error) {
    throw new Error(`Smoke metrics gate failed: cannot read ${resultsPath}: ${error.message}`);
  }

  const failures = findSmokeMetricFailures(runs);
  if (failures.length > 0) {
    const examples = failures
      .slice(0, 10)
      .map((failure) => `${failure.presetId}/${failure.symbol}: ${failure.reason}`)
      .join('; ');
    throw new Error(
      `Smoke metrics gate failed for ${campaignId}/${phase}: ` +
      `${failures.length}/${Array.isArray(runs) ? runs.length : 0} runs lack direct Strategy Tester metrics. ` +
      `Examples: ${examples}`,
    );
  }

  process.stdout.write(`[smoke-metrics-gate] ${campaignId}/${phase}: ${runs.length}/${runs.length} runs have direct Strategy Tester metrics\n`);
}

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      host: { type: 'string', default: process.env.TV_CDP_HOST || '127.0.0.1' },
      ports: { type: 'string', default: process.env.TV_CAMPAIGN_PORTS || '9222' },
      phases: { type: 'string', default: 'smoke,full' },
      'us-campaign': { type: 'string', default: '' },
      'jp-campaign': { type: 'string', default: '' },
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
          'Ensure TradingView Desktop is running with CDP on the requested Windows-local port (default 9222).',
      );
    }
  }

  const campaigns = buildCampaignQueue(values);
  if (campaigns.length === 0) {
    throw new Error('At least one campaign is required');
  }
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
          if (!values['dry-run'] && phase === 'smoke') {
            await validateSmokeMetrics(campaign.id, phase);
          }
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
