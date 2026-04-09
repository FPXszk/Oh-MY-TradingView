import { register } from '../router.js';
import { captureObservabilitySnapshot } from '../../core/observability.js';

register('observe', {
  description: 'Observability snapshot of the active TradingView session',
  subcommands: new Map([
    [
      'snapshot',
      {
        description: 'Capture a one-shot observability snapshot (connection, page state, screenshot)',
        handler: async () => {
          const result = await captureObservabilitySnapshot();
          if (!result.success) {
            const err = new Error(result.error || 'Observability snapshot failed');
            err.result = result;
            throw err;
          }
          return result;
        },
      },
    ],
  ]),
});
