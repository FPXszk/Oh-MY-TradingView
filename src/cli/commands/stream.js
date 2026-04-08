import { register } from '../router.js';
import { streamPriceTicks } from '../../core/stream.js';

register('stream', {
  description: 'Bounded price polling stream',
  options: {
    symbol: { type: 'string', short: 's', description: 'Symbol to stream' },
    interval: { type: 'string', short: 'i', description: 'Polling interval in ms (default: 5000)' },
    ticks: { type: 'string', short: 'n', description: 'Max ticks to collect (default: 12)' },
  },
  handler: (opts) =>
    streamPriceTicks({
      symbol: opts.symbol,
      intervalMs: opts.interval ? Number(opts.interval) : undefined,
      maxTicks: opts.ticks ? Number(opts.ticks) : undefined,
    }),
});
