import { z } from 'zod';
import { jsonResult } from './_format.js';
import { launchBrowserFallback } from '../core/browser-launch.js';

export function registerBrowserLaunchTools(server) {
  server.tool(
    'tv_launch_browser',
    'Launch a Chromium-based browser with TradingView chart URL and CDP debug port. ' +
    'Bounded fallback for observation/recovery — not a desktop replacement.',
    {
      port: z.number().int().min(1).max(65535).optional()
        .describe('CDP debug port (default: 9222)'),
      executablePath: z.string().optional()
        .describe('Full path to Chromium-based browser executable (auto-detected if omitted)'),
      url: z.string().url().refine(
        (value) => {
          try {
            const parsed = new URL(value);
            return /(^|\.)tradingview\.com$/i.test(parsed.hostname) && parsed.pathname.startsWith('/chart');
          } catch {
            return false;
          }
        },
        'url must be a TradingView chart URL',
      ).optional().describe('TradingView chart URL (default: https://www.tradingview.com/chart/)'),
      dryRun: z.boolean().optional()
        .describe('If true, returns the command without executing'),
    },
    async ({ port, executablePath, url, dryRun }) => {
      try {
        return jsonResult(await launchBrowserFallback({ port, executablePath, url, dryRun }));
      } catch (err) {
        return jsonResult(
          {
            success: false,
            error: err.message,
            hint: 'Ensure a Chromium-based browser is installed. Provide executablePath if auto-detection fails.',
          },
          true,
        );
      }
    },
  );
}
