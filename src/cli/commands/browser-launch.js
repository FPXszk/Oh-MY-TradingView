import { register } from '../router.js';
import { launchBrowserFallback } from '../../core/browser-launch.js';

register('launch-browser', {
  description: 'Launch Chromium-based browser with TradingView chart URL and CDP debug port (fallback)',
  options: {
    port: { type: 'string', short: 'p', description: 'CDP debug port (default: 9222)' },
    path: { type: 'string', description: 'Full path to browser executable' },
    url: { type: 'string', short: 'u', description: 'TradingView chart URL' },
    'dry-run': { type: 'boolean', description: 'Print command without executing' },
  },
  handler: (opts) => {
    const port = opts.port ? Number(opts.port) : undefined;
    return launchBrowserFallback({
      port,
      executablePath: opts.path,
      url: opts.url,
      dryRun: opts['dry-run'],
    });
  },
});
