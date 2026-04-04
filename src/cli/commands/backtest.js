import { register } from '../router.js';
import { runNvdaMaBacktest } from '../../core/backtest.js';

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
  ]),
});
