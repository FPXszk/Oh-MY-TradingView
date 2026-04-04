import { jsonResult } from './_format.js';
import * as core from '../core/health.js';

export function registerHealthTools(server) {
  server.tool(
    'tv_health_check',
    'Check CDP connection to TradingView and return current chart state',
    {},
    async () => {
      try {
        return jsonResult(await core.healthCheck());
      } catch (err) {
        return jsonResult(
          {
            success: false,
            error: err.message,
            hint: 'Is TradingView Desktop running with --remote-debugging-port=9222?',
          },
          true
        );
      }
    }
  );

  server.tool(
    'tv_discover',
    'Report which known TradingView API paths are available and their methods',
    {},
    async () => {
      try {
        return jsonResult(await core.discover());
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    }
  );
}
