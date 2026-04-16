import { register } from '../router.js';
import { captureObservabilitySnapshot } from '../../core/observability.js';
import { applyCompaction, renderCompactPayload } from '../../core/output-compaction.js';

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
            const err = new Error(result.error || 'Observability snapshot failed');
            err.result = opts.compact
              ? renderCompactPayload(applyCompaction('tv_observe_snapshot', result))
              : result;
            throw err;
          }
          return opts.compact
            ? renderCompactPayload(applyCompaction('tv_observe_snapshot', result))
            : result;
        },
      },
    ],
  ]),
});
