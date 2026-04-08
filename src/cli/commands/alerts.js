import { register } from '../router.js';
import {
  listAlerts,
  createPriceAlert,
  deleteAlert,
} from '../../core/alerts.js';

register('alert', {
  description: 'TradingView Desktop alert management (local only)',
  subcommands: new Map([
    [
      'list',
      {
        description: 'List alerts on the current chart',
        handler: () => listAlerts(),
      },
    ],
    [
      'create-price',
      {
        description: 'Create a price alert on the current symbol',
        options: {
          price: { type: 'string', short: 'p', description: 'Price level' },
          condition: { type: 'string', short: 'c', description: 'crossing | crossing_up | crossing_down' },
          message: { type: 'string', short: 'm', description: 'Alert message' },
        },
        handler: (opts) => {
          if (!opts.price) throw new Error('Usage: tv alert create-price --price 150.00');
          return createPriceAlert({
            price: Number(opts.price),
            condition: opts.condition,
            message: opts.message,
          });
        },
      },
    ],
    [
      'delete',
      {
        description: 'Delete an alert by id',
        options: {
          id: { type: 'string', description: 'Alert id' },
        },
        handler: (opts) => {
          if (!opts.id) throw new Error('Usage: tv alert delete --id <alert-id>');
          return deleteAlert({ id: opts.id });
        },
      },
    ],
  ]),
});
