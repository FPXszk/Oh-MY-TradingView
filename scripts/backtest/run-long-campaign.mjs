#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { RESEARCH_RESULTS_DIR } from '../../src/core/repo-paths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parsePorts(rawPorts, fallbackPorts) {
  const source = rawPorts
    ? String(rawPorts).split(',').map((value) => Number(value.trim())).filter(Number.isFinite)
    : fallbackPorts;

  if (!Array.isArray(source) || source.length === 0) {
    throw new Error('At least one worker port is required');
  }

  return source.map((port, index) => ({
    name: `worker${index + 1}`,
    port,
  }));
}

function parseJsonPayload(stdout, stderr, error) {
  const payload = [stdout, stderr].map((value) => String(value || '').trim()).find(Boolean);
  if (!payload) {
    return {
      success: false,
      error: error?.message || 'No CLI output received',
    };
  }

  try {
    return JSON.parse(payload);
  } catch {
    return {
      success: false,
      error: 'Could not parse CLI output as JSON',
      stdout: String(stdout || '').trim(),
      stderr: String(stderr || '').trim(),
    };
  }
}

function runPresetCli({ run, worker, host, dateOverride }) {
  const args = [
    join(PROJECT_ROOT, 'src', 'cli', 'index.js'),
    'backtest',
    'preset',
    run.presetId,
    '--symbol',
    run.symbol,
  ];

  if (dateOverride?.from) {
    args.push('--date-from', dateOverride.from);
  }
  if (dateOverride?.to) {
    args.push('--date-to', dateOverride.to);
  }

  const startedAt = new Date().toISOString();
  const startedMs = Date.now();

  return new Promise((resolve) => {
    execFile(
      process.execPath,
      args,
      {
        cwd: PROJECT_ROOT,
        env: {
          ...process.env,
          TV_CDP_HOST: host,
          TV_CDP_PORT: String(worker.port),
        },
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        resolve({
          worker: worker.name,
          port: worker.port,
          started_at: startedAt,
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - startedMs,
          exit_code: typeof error?.code === 'number' ? error.code : 0,
          result: parseJsonPayload(stdout, stderr, error),
        });
      },
    );
  });
}

function stripRun(entry) {
  return {
    presetId: entry.presetId,
    symbol: entry.symbol,
    market: entry.market,
    bucket: entry.bucket,
    label: entry.label,
  };
}

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      phase: { type: 'string', default: 'full' },
      'dry-run': { type: 'boolean', default: false },
      resume: { type: 'string', default: '' },
      host: { type: 'string', default: process.env.TV_CDP_HOST || '' },
      ports: { type: 'string', default: process.env.TV_CAMPAIGN_PORTS || '' },
    },
    allowPositionals: true,
    strict: false,
  });

  const campaignId = positionals[0] || 'long-run-cross-market-100x5';
  const phase = values.phase || 'full';

  const campaignModule = await import(join(PROJECT_ROOT, 'src', 'core', 'campaign.js'));
  const {
    loadCampaign,
    partitionRuns,
    collapseCompletedRuns,
    filterRunsToMatrix,
    buildCampaignFingerprint,
    buildLegacyCampaignFingerprint,
    buildCheckpoint,
    checkpointMatchesCampaign,
    summarizeResults,
    isRecoveredSuccess,
    needsRerun,
    findPendingRuns,
  } = campaignModule;

  const campaign = await loadCampaign(campaignId, { phase });
  const execution = campaign.config.execution ?? {};
  const host = values.host || process.env.TV_CDP_HOST || '127.0.0.1';
  const workers = parsePorts(values.ports, execution.worker_ports ?? []);
  const checkpointEvery = execution.checkpoint_every ?? 10;
  const cooldownMs = execution.cooldown_ms ?? 0;
  const maxConsecutiveFailures = execution.max_consecutive_failures ?? 5;
  const maxRerunPasses = execution.max_rerun_passes ?? 1;
  const outDir = join(RESEARCH_RESULTS_DIR, 'campaigns', campaignId, phase);
  const campaignFingerprint = buildCampaignFingerprint({
    config: campaign.config,
    defaults: campaign.defaults,
    phase,
    matrix: campaign.matrix,
  });
  const legacyCampaignFingerprint = buildLegacyCampaignFingerprint({
    config: campaign.config,
    defaults: campaign.defaults,
    phase,
    matrix: campaign.matrix,
  });

  await mkdir(outDir, { recursive: true });

  process.stdout.write(`Campaign: ${campaign.config.name}\n`);
  process.stdout.write(`  Phase: ${phase}\n`);
  process.stdout.write(`  Strategies: ${campaign.strategies.length}\n`);
  process.stdout.write(`  Symbols: ${campaign.symbols.length}\n`);
  process.stdout.write(`  Workers: ${workers.map((worker) => `${worker.name}:${host}:${worker.port}`).join(', ')}\n`);
  process.stdout.write(`  Date range: ${campaign.defaults.date_range.from} → ${campaign.defaults.date_range.to}\n`);
  process.stdout.write(`  Total runs: ${campaign.matrix.length}\n\n`);

  if (values['dry-run']) {
    const symbolShards = partitionRuns(campaign.symbols, workers.length);
    symbolShards.forEach((shard, index) => {
      process.stdout.write(`Shard ${index + 1}: ${shard.length} symbols\n`);
      shard.slice(0, 5).forEach((symbolEntry) => {
        process.stdout.write(`  - ${symbolEntry.symbol} (${symbolEntry.bucket})\n`);
      });
    });
    process.exit(0);
  }

  let rawResults = [];
  let startedAt = new Date().toISOString();

  if (values.resume) {
    const checkpoint = JSON.parse(await readFile(values.resume, 'utf8'));
    if (!checkpointMatchesCampaign({
      checkpoint,
      campaignId,
      phase,
      matrix: campaign.matrix,
      campaignFingerprint,
      legacyCampaignFingerprint,
      allowLegacyFingerprint: false,
    })) {
      throw new Error('Checkpoint fingerprint mismatch; resume target does not match the current campaign config');
    }

    rawResults = Array.isArray(checkpoint.results) ? filterRunsToMatrix(checkpoint.results, campaign.matrix) : [];
    startedAt = checkpoint.started_at || startedAt;
    process.stdout.write(`Resuming from ${values.resume}\n`);
    process.stdout.write(`  Previous attempts: ${rawResults.length}\n\n`);
  }

  let checkpointWrites = Promise.resolve();
  async function queueCheckpoint(force = false) {
    if (!force && rawResults.length % checkpointEvery !== 0) {
      return;
    }

    checkpointWrites = checkpointWrites.then(async () => {
      const checkpoint = buildCheckpoint({
        campaignId,
        phase,
        campaignFingerprint,
        completedRuns: rawResults,
        startedAt,
      });
      const checkpointPath = join(outDir, `checkpoint-${rawResults.length}.json`);
      await writeFile(checkpointPath, `${JSON.stringify(checkpoint, null, 2)}\n`);
      process.stdout.write(`  → checkpoint saved: ${checkpointPath}\n`);
    });

    await checkpointWrites;
  }

  async function runPass(runs, passLabel) {
    if (runs.length === 0) {
      return false;
    }

    process.stdout.write(`${passLabel}: ${runs.length} runs queued\n`);

    let nextIndex = 0;
    let aborted = false;

    await Promise.all(
      workers.map(async (worker) => {
        let consecutiveFailures = 0;

        while (!aborted) {
          const run = runs[nextIndex];
          nextIndex += 1;
          if (!run) {
            break;
          }

          process.stdout.write(`[${passLabel}] ${worker.name} ${run.presetId} × ${run.symbol} ... `);
          const executionResult = await runPresetCli({
            run,
            worker,
            host,
            dateOverride: campaign.config.date_override,
          });

          const entry = {
            ...stripRun(run),
            attempt: passLabel,
            worker: executionResult.worker,
            port: executionResult.port,
            started_at: executionResult.started_at,
            finished_at: executionResult.finished_at,
            duration_ms: executionResult.duration_ms,
            exit_code: executionResult.exit_code,
            result: executionResult.result,
          };

          rawResults.push(entry);

          if (isRecoveredSuccess(entry.result)) {
            consecutiveFailures = 0;
            process.stdout.write(`OK (${entry.duration_ms} ms)\n`);
          } else {
            consecutiveFailures += 1;
            process.stdout.write(`FAIL (${entry.result.error || entry.result.tester_reason_category || 'unknown'})\n`);
          }

          await queueCheckpoint(false);

          if (consecutiveFailures >= maxConsecutiveFailures) {
            aborted = true;
            process.stderr.write(`\nAborting ${passLabel}: ${worker.name} hit ${maxConsecutiveFailures} consecutive failures.\n`);
            break;
          }

          if (cooldownMs > 0) {
            await sleep(cooldownMs);
          }
        }
      }),
    );

    return aborted;
  }

  const primaryPending = findPendingRuns(campaign.matrix, rawResults);
  const primaryAborted = await runPass(primaryPending, 'primary');

  let rerunAborted = false;
  if (!primaryAborted) {
    for (let rerunPass = 1; rerunPass <= maxRerunPasses; rerunPass += 1) {
      const effectiveRuns = collapseCompletedRuns(rawResults);
      const rerunQueue = effectiveRuns.filter((entry) => needsRerun(entry.result)).map(stripRun);
      if (rerunQueue.length === 0) {
        break;
      }

      rerunAborted = await runPass(rerunQueue, `rerun-${rerunPass}`);
      if (rerunAborted) {
        break;
      }
    }
  }

  await queueCheckpoint(true);
  await checkpointWrites;

  const effectiveRuns = collapseCompletedRuns(rawResults);
  const summary = summarizeResults(effectiveRuns.map((entry) => entry.result));
  const finalPayload = {
    campaign_id: campaignId,
    phase,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    aborted: primaryAborted || rerunAborted,
    summary,
    attempts: rawResults.length,
    effective_results: effectiveRuns,
    results: rawResults,
  };

  const rawPath = join(outDir, 'final-results.json');
  const recoveredPath = join(outDir, 'recovered-results.json');
  const summaryPath = join(outDir, 'recovered-summary.json');

  await writeFile(rawPath, `${JSON.stringify(finalPayload, null, 2)}\n`);
  await writeFile(recoveredPath, `${JSON.stringify(effectiveRuns, null, 2)}\n`);
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);

  // --- Experiment gating (additive artifacts) ---
  const gatingConfig = campaign.config.experiment_gating;
  if (gatingConfig?.enabled) {
    const { buildGatedSummary } = await import(join(PROJECT_ROOT, 'src', 'core', 'experiment-gating.js'));
    const { getMultiSymbolAnalysis } = await import(join(PROJECT_ROOT, 'src', 'core', 'market-intel.js'));
    const gatingThresholds = gatingConfig.thresholds ?? undefined;
    const symbols = [...new Set(effectiveRuns.map((entry) => entry.symbol).filter(Boolean))];
    const marketIntelSnapshots = symbols.length > 0
      ? await getMultiSymbolAnalysis(symbols)
      : {
        success: false,
        count: 0,
        successCount: 0,
        failureCount: 0,
        analyses: [],
        error: 'No symbols available for market intelligence snapshots',
      };
    const marketSnapshotsBySymbol = Object.fromEntries(
      (marketIntelSnapshots.analyses || [])
        .filter((entry) => entry?.symbol && (entry?.analysis || entry?.inputs))
        .map((entry) => [entry.symbol.trim().toUpperCase(), entry]),
    );
     const gatedSummary = buildGatedSummary({
       campaignId,
       phase,
       effectiveRuns,
       initialCapital: campaign.defaults.initial_capital,
       marketSnapshots: marketSnapshotsBySymbol,
       ...(gatingThresholds ? { thresholds: gatingThresholds } : {}),
      });

     const gatedSummaryPath = join(outDir, 'gated-summary.json');
     const rankedCandidatesPath = join(outDir, 'ranked-candidates.json');
     const marketIntelSnapshotsPath = join(outDir, 'market-intel-snapshots.json');

     await writeFile(gatedSummaryPath, `${JSON.stringify(gatedSummary, null, 2)}\n`);
     await writeFile(rankedCandidatesPath, `${JSON.stringify(gatedSummary.ranked_candidates, null, 2)}\n`);
     await writeFile(marketIntelSnapshotsPath, `${JSON.stringify(marketIntelSnapshots, null, 2)}\n`);

     process.stdout.write(`\nExperiment Gating:\n`);
    process.stdout.write(`  Promoted: ${gatedSummary.counts.promote}\n`);
    process.stdout.write(`  Hold: ${gatedSummary.counts.hold}\n`);
    process.stdout.write(`  Rejected: ${gatedSummary.counts.reject}\n`);
     process.stdout.write(`  Ranked candidates: ${gatedSummary.ranked_candidates.length}\n`);
     process.stdout.write(`  Gated summary: ${gatedSummaryPath}\n`);
     process.stdout.write(`  Ranked candidates: ${rankedCandidatesPath}\n`);
     process.stdout.write(`  Market intel snapshots: ${marketIntelSnapshotsPath}\n`);
  }

  process.stdout.write('\nCampaign complete.\n');
  process.stdout.write(`  Success: ${summary.success}\n`);
  process.stdout.write(`  Failure: ${summary.failure}\n`);
  process.stdout.write(`  Unreadable: ${summary.unreadable}\n`);
  process.stdout.write(`  Total: ${summary.total}\n`);
  process.stdout.write(`  Raw results: ${rawPath}\n`);
  process.stdout.write(`  Recovered results: ${recoveredPath}\n`);
  process.stdout.write(`  Summary: ${summaryPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`Fatal: ${error.message}\n`);
  process.exit(1);
});
