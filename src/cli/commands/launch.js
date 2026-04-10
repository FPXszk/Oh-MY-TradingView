import { register } from '../router.js';
import { launchDesktop } from '../../core/launch.js';

register('launch', {
  description: 'Launch TradingView Desktop with CDP debug port',
  options: {
    port: { type: 'string', short: 'p', description: 'CDP debug port (default: 9225)' },
    path: { type: 'string', description: 'Full path to TradingView executable' },
    'dry-run': { type: 'boolean', description: 'Print command without executing' },
  },
  handler: (opts) => {
    const port = opts.port ? Number(opts.port) : undefined;
    return launchDesktop({
      port,
      executablePath: opts.path,
      dryRun: opts['dry-run'],
    });
  },
});
