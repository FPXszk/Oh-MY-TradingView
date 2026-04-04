import { z } from 'zod';
import { jsonResult } from './_format.js';
import * as core from '../core/price.js';

export function registerPriceTools(server) {
  server.tool(
    'tv_get_price',
    'Get the current price of the active chart symbol. Optionally switch symbol first.',
    {
      symbol: z.string().optional().describe('Optional symbol to switch to before reading price (e.g. NVDA, NASDAQ:NVDA)'),
    },
    async ({ symbol }) => {
      try {
        return jsonResult(await core.getCurrentPrice({ symbol }));
      } catch (err) {
        return jsonResult(
          {
            success: false,
            error: err.message,
            hint: 'Ensure TradingView Desktop is running with a chart open. If using WSL, set TV_CDP_HOST or run the CLI from Windows.',
          },
          true
        );
      }
    }
  );
}
