import { register } from '../router.js';
import * as core from '../../core/price.js';

register('price', {
  description: 'Get current chart price',
  subcommands: new Map([
    [
      'get',
      {
        description: 'Get current price of the active chart symbol',
        options: {
          symbol: { type: 'string', short: 's', description: 'Switch to symbol before reading price' },
        },
        handler: (opts) => core.getCurrentPrice({ symbol: opts.symbol }),
      },
    ],
  ]),
});
