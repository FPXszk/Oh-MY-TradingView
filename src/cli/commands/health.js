import { register } from '../router.js';
import * as core from '../../core/health.js';

register('status', {
  description: 'Check CDP connection to TradingView',
  handler: () => core.healthCheck(),
});

register('discover', {
  description: 'Discover available TradingView internal APIs',
  handler: () => core.discover(),
});
