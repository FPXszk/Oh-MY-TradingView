import { getCurrentPrice, readCurrentPriceForSymbol, setActiveSymbol } from './price.js';

const DEFAULT_INTERVAL_MS = 5000;
const DEFAULT_MAX_TICKS = 12;
const MIN_INTERVAL_MS = 1000;
const MAX_TICKS_LIMIT = 120;

/**
 * Validate stream parameters and return effective values.
 */
export function resolveStreamParams({ intervalMs, maxTicks } = {}) {
  const rawInterval = intervalMs !== undefined && intervalMs !== null ? Number(intervalMs) : NaN;
  const interval = Math.max(MIN_INTERVAL_MS, Number.isFinite(rawInterval) ? rawInterval : DEFAULT_INTERVAL_MS);
  const rawTicks = maxTicks !== undefined && maxTicks !== null ? Number(maxTicks) : NaN;
  const ticks = Math.min(MAX_TICKS_LIMIT, Math.max(1, Number.isFinite(rawTicks) ? rawTicks : DEFAULT_MAX_TICKS));
  return { intervalMs: interval, maxTicks: ticks };
}

/**
 * Bounded price polling stream.
 * Collects up to maxTicks price snapshots at intervalMs intervals.
 * When symbol is provided, switches once before polling — not on every tick.
 * Returns the full collected array — NOT an infinite daemon.
 */
export async function streamPriceTicks({ symbol, intervalMs, maxTicks, _deps } = {}) {
  const params = resolveStreamParams({ intervalMs, maxTicks });
  const requestedSymbol = String(symbol || '').trim();
  const ticks = [];

  if (requestedSymbol) {
    try {
      await setActiveSymbol({ symbol: requestedSymbol, _deps });
    } catch (err) {
      ticks.push({
        tick: 1,
        timestamp: new Date().toISOString(),
        error: err.message,
      });
      return {
        success: false,
        params: {
          symbol: symbol || null,
          intervalMs: params.intervalMs,
          maxTicks: params.maxTicks,
        },
        ticks,
        collected: ticks.length,
        errors: 1,
      };
    }
  }

  for (let i = 0; i < params.maxTicks; i += 1) {
    try {
      const price = requestedSymbol
        ? await readCurrentPriceForSymbol({ symbol: requestedSymbol, _deps })
        : await getCurrentPrice({ _deps });
      ticks.push({
        tick: i + 1,
        timestamp: new Date().toISOString(),
        symbol: price.symbol,
        price: price.price,
        source: price.source,
      });
    } catch (err) {
      ticks.push({
        tick: i + 1,
        timestamp: new Date().toISOString(),
        error: err.message,
      });
    }

    if (i < params.maxTicks - 1) {
      await new Promise((resolve) => setTimeout(resolve, params.intervalMs));
    }
  }

  return {
    success: ticks.some((tick) => !tick.error),
    params: {
      symbol: symbol || null,
      intervalMs: params.intervalMs,
      maxTicks: params.maxTicks,
    },
    ticks,
    collected: ticks.length,
    errors: ticks.filter((t) => t.error).length,
  };
}
