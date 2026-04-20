/**
 * TradingView Desktop crash detection, classification, and auto-recovery.
 *
 * Provides:
 * - 3-layer health observation (process / CDP port / MCP)
 * - Crash severity classification
 * - Recovery plan builder
 * - Recovery executor with exponential backoff
 */

const BACKOFF_SCHEDULE_MS = [5_000, 15_000, 30_000, 60_000];
const MAX_BACKOFF_MS = 60_000;

/**
 * Classify the crash severity from three observable health signals.
 *
 * @param {{ processAlive: boolean, portOpen: boolean, mcpHealthy: boolean }} state
 * @returns {{ severity: 'none'|'mild'|'moderate'|'critical', category: string }}
 */
export function classifyCrashFailure(state) {
  if (!state.processAlive) {
    return { severity: 'critical', category: 'process-missing' };
  }
  if (!state.portOpen) {
    return { severity: 'moderate', category: 'cdp-unreachable' };
  }
  if (!state.mcpHealthy) {
    return { severity: 'mild', category: 'mcp-unhealthy' };
  }
  return { severity: 'none', category: 'healthy' };
}

/**
 * Compute exponential backoff delay for the given attempt index.
 *
 * @param {number} attempt - Zero-based attempt index.
 * @returns {number} Delay in milliseconds.
 */
export function computeBackoff(attempt) {
  if (attempt < BACKOFF_SCHEDULE_MS.length) {
    return BACKOFF_SCHEDULE_MS[attempt];
  }
  return MAX_BACKOFF_MS;
}

/**
 * Build a recovery plan from a crash classification result.
 *
 * @param {{ severity: string, category: string }} classification
 * @returns {{ actions: string[], maxRetries: number }}
 */
export function buildRecoveryPlan(classification) {
  switch (classification.severity) {
    case 'critical':
      return {
        actions: ['kill-existing', 'relaunch', 'wait-readiness', 'reconnect-mcp'],
        maxRetries: 2,
      };
    case 'moderate':
      return {
        actions: ['kill-existing', 'relaunch', 'wait-readiness', 'reconnect-mcp'],
        maxRetries: 2,
      };
    case 'mild':
      return {
        actions: ['reconnect-mcp'],
        maxRetries: 3,
      };
    default:
      return {
        actions: [],
        maxRetries: 0,
      };
  }
}

/**
 * Execute a recovery plan using injected dependencies.
 *
 * @param {{ actions: string[], maxRetries: number }} plan
 * @param {{
 *   killExisting: () => Promise<void>,
 *   relaunch: () => Promise<{ pid: number }>,
 *   waitReadiness: () => Promise<boolean>,
 *   reconnectMcp: () => Promise<boolean>,
 *   log: (msg: string) => void,
 * }} deps
 * @param {{ retryDelayMs?: number }} opts
 * @returns {Promise<{ success: boolean, attempts: number, lastError?: string }>}
 */
export async function executeRecovery(plan, deps, opts = {}) {
  const { retryDelayMs } = opts;
  let lastError = '';

  for (let attempt = 0; attempt < plan.maxRetries; attempt++) {
    try {
      deps.log(`recovery attempt ${attempt + 1}/${plan.maxRetries}`);

      for (const action of plan.actions) {
        switch (action) {
          case 'kill-existing':
            await deps.killExisting();
            break;
          case 'relaunch':
            await deps.relaunch();
            break;
          case 'wait-readiness':
            await deps.waitReadiness();
            break;
          case 'reconnect-mcp':
            await deps.reconnectMcp();
            break;
          default:
            deps.log(`unknown action: ${action}`);
        }
      }

      deps.log(`recovery succeeded on attempt ${attempt + 1}`);
      return { success: true, attempts: attempt + 1 };
    } catch (error) {
      lastError = error?.message || String(error);
      deps.log(`recovery attempt ${attempt + 1} failed: ${lastError}`);

      if (attempt < plan.maxRetries - 1) {
        const delay = retryDelayMs ?? computeBackoff(attempt);
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }

  return {
    success: false,
    attempts: plan.maxRetries,
    lastError,
  };
}
