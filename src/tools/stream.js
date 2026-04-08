import { z } from 'zod';
import { jsonResult } from './_format.js';
import { streamPriceTicks } from '../core/stream.js';

export function registerStreamTools(server) {
  server.tool(
    'tv_stream_price',
    'Bounded price polling: collect up to maxTicks price snapshots at intervalMs intervals. NOT an infinite daemon.',
    {
      symbol: z.string().optional()
        .describe('Symbol to stream (uses active chart symbol if omitted)'),
      intervalMs: z.number().int().min(1000).optional()
        .describe('Polling interval in ms (default: 5000, min: 1000)'),
      maxTicks: z.number().int().min(1).max(120).optional()
        .describe('Max ticks to collect (default: 12, max: 120)'),
    },
    async ({ symbol, intervalMs, maxTicks }) => {
      try {
        const result = await streamPriceTicks({ symbol, intervalMs, maxTicks });
        if (!result.success) {
          return jsonResult(
            {
              ...result,
              error: result.ticks.find((tick) => tick.error)?.error || 'Price stream failed',
              hint: 'Ensure TradingView Desktop is running and CDP is reachable.',
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
            hint: 'Ensure TradingView Desktop is running and CDP is reachable.',
          },
          true,
        );
      }
    },
  );
}
