import { z } from 'zod';
import { jsonResult } from './_format.js';
import { runNvdaMaBacktest, runPresetBacktest } from '../core/backtest.js';

export function registerBacktestTools(server) {
  server.tool(
    'tv_backtest_nvda_ma_5_20',
    'Run a fixed NVDA 5/20 SMA crossover backtest. Switches to NVDA, applies the strategy, reads Strategy Tester metrics.',
    {},
    async () => {
      try {
        return jsonResult(await runNvdaMaBacktest());
      } catch (err) {
        return jsonResult(
          {
            success: false,
            error: err.message,
            hint: 'Ensure TradingView Desktop is running with a chart open and CDP is reachable.',
          },
          true,
        );
      }
    },
  );

  server.tool(
    'tv_backtest_preset',
    'Run a preset-driven strategy backtest. Specify a preset ID from strategy-presets.json, optionally override symbol and date range.',
    {
      presetId: z.string().describe('Preset ID from strategy-presets.json (e.g. sma-cross-5-20)'),
      symbol: z.string().optional().describe('Trading symbol (default: NVDA)'),
      dateFrom: z.string().optional().describe('Override start date (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('Override end date (YYYY-MM-DD)'),
    },
    async ({ presetId, symbol, dateFrom, dateTo }) => {
      try {
        const opts = { presetId, symbol: symbol || 'NVDA' };
        if (dateFrom || dateTo) {
          opts.dateOverride = {};
          if (dateFrom) opts.dateOverride.from = dateFrom;
          if (dateTo) opts.dateOverride.to = dateTo;
        }
        return jsonResult(await runPresetBacktest(opts));
      } catch (err) {
        return jsonResult(
          {
            success: false,
            error: err.message,
            hint: 'Ensure TradingView Desktop is running with a chart open and CDP is reachable.',
          },
          true,
        );
      }
    },
  );
}
