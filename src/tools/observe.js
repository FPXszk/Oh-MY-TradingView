import { jsonResult } from './_format.js';
import { captureObservabilitySnapshot } from '../core/observability.js';

export function registerObserveTools(server) {
  server.tool(
    'tv_observe_snapshot',
    'Capture a one-shot observability snapshot of the active TradingView page/session. ' +
      'Returns structured CDP connection info, page/chart state, runtime errors, and ' +
      'a deterministic artifact bundle under docs/research/results/observability/.',
    {},
    async () => {
      try {
        const result = await captureObservabilitySnapshot();
        if (!result.success) {
          return jsonResult(
            {
              ...result,
              error: result.error || 'Observability snapshot failed',
              hint: 'Ensure TradingView Desktop is running with CDP enabled.',
            },
            true,
          );
        }
        return jsonResult(result);
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
