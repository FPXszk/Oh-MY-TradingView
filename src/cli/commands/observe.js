import { register } from '../router.js';
import { captureObservabilitySnapshot } from '../../core/observability.js';
import { applyCompaction, renderCompactPayload } from '../../core/output-compaction.js';
import { attachArtifactWarning, tryWriteRawArtifact } from '../../core/output-artifacts.js';

register('observe', {
  description: 'Observability snapshot of the active TradingView session',
  subcommands: new Map([
    [
      'snapshot',
      {
        description: 'Capture a one-shot observability snapshot (connection, page state, screenshot)',
        options: {
          compact: { type: 'boolean', short: 'c', description: 'Emit compact summary output' },
        },
        handler: async (opts) => {
          const result = await captureObservabilitySnapshot();
          if (!result.success) {
            const failure = {
              ...result,
              error: result.error || 'Observability snapshot failed',
              hint: 'Ensure TradingView Desktop is running with CDP enabled.',
            };
            const err = new Error(failure.error);
            if (!opts.compact) {
              err.result = failure;
              throw err;
            }
            const artifactInfo = await tryWriteRawArtifact(
              'tv_observe_snapshot',
              { snapshotId: failure.snapshot_id || null, success: false, error: failure.error || null },
              failure,
              { compact: true },
            );
            err.result = renderCompactPayload(applyCompaction(
              'tv_observe_snapshot',
              attachArtifactWarning(failure, artifactInfo),
              artifactInfo.artifactPath ? { artifactPath: artifactInfo.artifactPath } : undefined,
            ));
            throw err;
          }
          if (!opts.compact) return result;
          const artifactInfo = await tryWriteRawArtifact(
            'tv_observe_snapshot',
            { snapshotId: result.snapshot_id || null, success: true },
            result,
            { compact: true },
          );
          return renderCompactPayload(applyCompaction(
            'tv_observe_snapshot',
            attachArtifactWarning(result, artifactInfo),
            artifactInfo.artifactPath ? { artifactPath: artifactInfo.artifactPath } : undefined,
          ));
        },
      },
    ],
  ]),
});
