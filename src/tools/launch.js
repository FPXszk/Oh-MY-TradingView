import { z } from 'zod';
import { jsonResult } from './_format.js';
import { launchDesktop } from '../core/launch.js';

export function registerLaunchTools(server) {
  server.tool(
    'tv_launch',
    'Launch TradingView Desktop with CDP debug port enabled. The standard Windows-local port is 9222; from WSL, connect to it via the Windows host IP on port 9223.',
    {
      port: z.number().int().min(1).max(65535).optional()
        .describe('CDP debug port (default: 9222)'),
      executablePath: z.string().optional()
        .describe('Full path to TradingView executable (auto-detected if omitted)'),
      dryRun: z.boolean().optional()
        .describe('If true, returns the command without executing'),
    },
    async ({ port, executablePath, dryRun }) => {
      try {
        return jsonResult(await launchDesktop({ port, executablePath, dryRun }));
      } catch (err) {
        return jsonResult(
          {
            success: false,
            error: err.message,
            hint: 'Ensure TradingView Desktop is installed. Provide executablePath if auto-detection fails.',
          },
          true,
        );
      }
    },
  );
}
