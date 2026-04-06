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
        },
        handler: (values, positionals) => {
          if (!positionals[0]) {
            throw new Error('Usage: tv backtest preset <preset-id> [--symbol SYM]');
          }
          return runPresetBacktest({ presetId: positionals[0], symbol: values.symbol || 'NVDA' });
        },
      },
    ],
  ]),
});
