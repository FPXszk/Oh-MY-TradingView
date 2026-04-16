import { register } from '../router.js';
import { captureScreenshot } from '../../core/capture.js';

register('capture', {
  description: 'Capture a screenshot of TradingView Desktop',
  options: {
    output: { type: 'string', short: 'o', description: 'Relative output path under artifacts/screenshots' },
    format: { type: 'string', short: 'f', description: 'Image format: png or jpeg (default: png)' },
    quality: { type: 'string', short: 'q', description: 'JPEG quality 0–100 (default: 80)' },
    'full-page': { type: 'boolean', description: 'Capture beyond viewport' },
  },
  handler: (opts) =>
    captureScreenshot({
      outputPath: opts.output,
      format: opts.format,
      quality: opts.quality ? Number(opts.quality) : undefined,
      fullPage: opts['full-page'],
    }),
});
