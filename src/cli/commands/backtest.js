import { register } from '../router.js';
import { runNvdaMaBacktest, runPresetBacktest } from '../../core/backtest.js';

register('backtest', {
  description: 'Backtest strategies on TradingView',
  subcommands: new Map([
    [
      'nvda-ma',
      {
        description: 'Run fixed NVDA 5/20 SMA crossover backtest',
        handler: () => runNvdaMaBacktest(),
      },
    ],
    [
      'preset',
      {
        description: 'Run a preset-driven strategy backtest',
        options: {
          symbol: { type: 'string', short: 's', description: 'Trading symbol (default: NVDA)' },
          'date-from': { type: 'string', description: 'Override start date (YYYY-MM-DD)' },
          'date-to': { type: 'string', description: 'Override end date (YYYY-MM-DD)' },
        },
        handler: (values, positionals) => {
          if (!positionals[0]) {
            throw new Error('Usage: tv backtest preset <preset-id> [--symbol SYM] [--date-from YYYY-MM-DD] [--date-to YYYY-MM-DD]');
          }
          const opts = { presetId: positionals[0], symbol: values.symbol || 'NVDA' };
          if (values['date-from'] || values['date-to']) {
            opts.dateOverride = {};
            if (values['date-from']) {
              opts.dateOverride.from = values['date-from'];
            }
            if (values['date-to']) {
              opts.dateOverride.to = values['date-to'];
            }
          }
          return runPresetBacktest(opts);
        },
      },
    ],
  ]),
});
