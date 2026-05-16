import { z } from 'zod';
import { jsonResult } from './_format.js';
import { runMinervinScreener } from '../core/minervini-screener.js';
import { runFundamentalScreener } from '../core/fundamental-screener.js';

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

  server.tool(
    'market_fundamental_screener',
    'Screen US stocks by fundamental quality + Minervini momentum: ROE>15%, FCF margin>10%, gross margin>40%, EPS profitable, RSI>60, price>SMA200/SMA50, Perf.3M>10%, P/FCF<50. Returns rank breakdown, sector ranking, and market breakdown. Optionally enriches with Moomoo revenue growth filter (>20% YoY). No CDP needed.',
    {
      limit: z.number().int().min(1).max(200).optional().describe('Max results to return (default 10; daily workflow report uses 20)'),
      with_yahoo: z.boolean().optional().describe('Legacy option name: enrich with Moomoo revenue growth filter (>20% YoY)'),
    },
    async ({ limit, with_yahoo } = {}) => {
      try {
        return jsonResult(await runFundamentalScreener({ limit, enrichWithYahoo: with_yahoo ?? false }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );
}
