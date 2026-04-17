import { register } from '../router.js';
import * as core from '../../core/health.js';

register('status', {
  description: 'Check CDP connection to TradingView',
  handler: async () => {
    const result = await core.healthCheckWithReadiness();
    if (!result.success) {
      const error = new Error(
        result.error || `TradingView readiness failed (${result.failure_category || 'unknown'})`,
      );
      error.result = result;
      throw error;
    }
    return result;
  },
});

register('discover', {
  description: 'Discover available TradingView internal APIs',
  handler: () => core.discover(),
});
