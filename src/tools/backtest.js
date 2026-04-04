import { jsonResult } from './_format.js';
import { runNvdaMaBacktest } from '../core/backtest.js';

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
}
