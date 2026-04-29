import { z } from 'zod';
import { jsonResult } from './_format.js';
import { runMinervinScreener } from '../core/minervini-screener.js';

export function registerScreenerTools(server) {
  server.tool(
    'market_minervini_screener',
    'Screen US stocks by Minervini trend-template conditions: RSI(14)>=60, price>SMA200, price>SMA50, price>=75% of 52w high, relative volume>=1.2x, market cap>=1B USD. No CDP connection needed.',
    {
      limit: z.number().int().min(1).max(200).optional().describe('Max results to return (default 50)'),
    },
    async ({ limit } = {}) => {
      try {
        return jsonResult(await runMinervinScreener({ limit }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );
}
