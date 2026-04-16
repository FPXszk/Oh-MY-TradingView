import { z } from 'zod';
import { jsonResult } from './_format.js';
import { captureScreenshot } from '../core/capture.js';

export function registerCaptureTools(server) {
  server.tool(
    'tv_capture_screenshot',
    'Capture a screenshot of the current TradingView Desktop page via CDP. If outputPath is provided, save under artifacts/screenshots without overwriting.',
    {
      outputPath: z.string().optional()
        .describe('Relative file path under artifacts/screenshots (returns base64 if omitted)'),
      format: z.enum(['png', 'jpeg']).optional()
        .describe('Image format (default: png)'),
      quality: z.number().int().min(0).max(100).optional()
        .describe('JPEG quality 0–100 (default: 80, only for jpeg)'),
      fullPage: z.boolean().optional()
        .describe('Capture beyond viewport (default: false)'),
    },
    async ({ outputPath, format, quality, fullPage }) => {
      try {
        return jsonResult(await captureScreenshot({ outputPath, format, quality, fullPage }));
      } catch (err) {
        return jsonResult(
          {
            success: false,
            error: err.message,
            hint: 'Ensure TradingView Desktop is running with CDP enabled.',
          },
          true,
        );
      }
    },
  );
}
