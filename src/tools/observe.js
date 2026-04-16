import { z } from 'zod';
import { jsonResult } from './_format.js';
import { captureObservabilitySnapshot } from '../core/observability.js';
import { applyCompaction, renderCompactPayload } from '../core/output-compaction.js';
import { attachArtifactWarning, tryWriteRawArtifact } from '../core/output-artifacts.js';

export function registerObserveTools(server) {
  server.tool(
    'tv_observe_snapshot',
    'Capture a one-shot observability snapshot of the active TradingView page/session. ' +
      'Returns structured CDP connection info, page/chart state, runtime errors, and ' +
      'a deterministic artifact bundle under artifacts/observability/.',
    {
      compact: z.boolean().optional().default(false)
        .describe('Return a compact summary instead of the full result'),
    },
    async ({ compact = false }) => {
      try {
        const result = await captureObservabilitySnapshot();
        if (!result.success) {
          const failure = {
            ...result,
            error: result.error || 'Observability snapshot failed',
            hint: 'Ensure TradingView Desktop is running with CDP enabled.',
          };
          if (!compact) return jsonResult(failure, true);
          const artifactInfo = await tryWriteRawArtifact(
            'tv_observe_snapshot',
            { snapshotId: failure.snapshot_id || null, success: false, error: failure.error || null },
            failure,
            { compact },
          );
          return jsonResult(
            renderCompactPayload(applyCompaction(
              'tv_observe_snapshot',
              attachArtifactWarning(failure, artifactInfo),
              artifactInfo.artifactPath ? { artifactPath: artifactInfo.artifactPath } : undefined,
            )),
            true,
          );
        }
        if (!compact) return jsonResult(result);
        const artifactInfo = await tryWriteRawArtifact(
          'tv_observe_snapshot',
          { snapshotId: result.snapshot_id || null, success: true },
          result,
          { compact },
        );
        const payload = renderCompactPayload(applyCompaction(
          'tv_observe_snapshot',
          attachArtifactWarning(result, artifactInfo),
          artifactInfo.artifactPath ? { artifactPath: artifactInfo.artifactPath } : undefined,
        ));
        return jsonResult(payload);
      } catch (err) {
        return jsonResult(
          {
            success: false,
            error: err.message,
              hint: 'Is TradingView Desktop running with --remote-debugging-port=9222? ' +
                'In WSL, use the Windows host IP on port 9223.',
          },
          true,
        );
      }
    },
  );
}
