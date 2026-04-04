import { evaluate as _evaluate, evaluateAsync as _evaluateAsync, safeString } from '../connection.js';

function resolveDeps(deps) {
  return {
    evaluate: deps?.evaluate || _evaluate,
    evaluateAsync: deps?.evaluateAsync || _evaluateAsync,
  };
}

export function symbolMatches(current, requested) {
  const normalizedCurrent = String(current || '').trim().toUpperCase();
  const normalizedRequested = String(requested || '').trim().toUpperCase();
  if (!normalizedCurrent || !normalizedRequested) return false;
  return (
    normalizedCurrent === normalizedRequested ||
    normalizedCurrent.endsWith(`:${normalizedRequested}`) ||
    normalizedCurrent.split(':').at(-1) === normalizedRequested
  );
}

/**
 * Validate raw price data from the browser.
 * Throws if required fields are missing or invalid.
 */
export function validatePriceData(data) {
  if (!data || typeof data.symbol !== 'string' || !data.symbol) {
    throw new Error('Invalid price data: symbol is required');
  }
  const p = Number(data.price);
  if (typeof data.price === 'undefined' || !Number.isFinite(p)) {
    throw new Error(`Invalid price data: price must be a finite number, got ${data.price}`);
  }
  if (!data.source) {
    throw new Error('Invalid price data: source is required');
  }
}

/**
 * Format validated price data into the standard output shape.
 */
export function formatPriceResult(raw) {
  const result = {
    success: true,
    symbol: raw.symbol,
    price: raw.price,
    source: raw.source,
    retrieved_at: new Date().toISOString(),
  };
  if (raw.resolution !== undefined) {
    result.resolution = raw.resolution;
  }
  return result;
}

const PRICE_EXPRESSION = `
  (function() {
    try {
      var chart = window.TradingViewApi._activeChartWidgetWV.value();
      var sym = chart.symbol();
      var res = chart.resolution();

       try {
         var model = chart._chartWidget && typeof chart._chartWidget.model === 'function'
           ? chart._chartWidget.model()
           : null;
         if (model && typeof model.mainSeries === 'function') {
           var bars = model.mainSeries().bars();
           if (bars && typeof bars.lastIndex === 'function' && typeof bars.valueAt === 'function') {
             var index = bars.lastIndex();
             var bar = bars.valueAt(index);
             var close = null;
             if (Array.isArray(bar) && bar.length >= 5) close = Number(bar[4]);
             else if (bar && typeof bar === 'object') {
               close = Number(bar.close ?? bar[4] ?? bar.value ?? bar.last);
             }
             if (isFinite(close)) {
               return { symbol: sym, price: close, resolution: res, source: 'bars_close' };
             }
           }
         }
       } catch (e) {}

       if (typeof chart.mainSeries === 'function') {
         var series = chart.mainSeries();
         if (series && typeof series.last_value === 'function') {
           var p = series.last_value();
           if (typeof p === 'number' && isFinite(p)) {
             return { symbol: sym, price: p, resolution: res, source: 'chart_api' };
           }
         }
       }

       var selectors = [
         '[class*="lastContainer"] [class*="js-symbol-last"]',
         '.js-symbol-last',
         '[data-name="legend-source-item"] [class*="lastValue"]',
         '[data-name="legend-source-item"] [class*="price"]',
         '[class*="last-price"]',
         '[class*="lastValue"]'
       ];
       for (var i = 0; i < selectors.length; i++) {
         var el = document.querySelector(selectors[i]);
         if (!el) continue;
         var text = (el.textContent || '').trim().replace(/[^0-9.,\\-]/g, '');
         if (text.indexOf(',') !== -1 && text.indexOf('.') !== -1) text = text.replace(/,/g, '');
         else if (text.indexOf(',') !== -1) text = text.replace(/,/g, '.');
         var dp = parseFloat(text);
         if (isFinite(dp)) {
           return { symbol: sym, price: dp, resolution: res, source: 'dom' };
         }
       }

       return { error: 'Price not available from bars, chart API, or DOM' };
    } catch (e) {
      return { error: e.message };
    }
  })()
`;

async function readCurrentPriceRaw({ _deps } = {}) {
  const { evaluate } = resolveDeps(_deps);
  return evaluate(PRICE_EXPRESSION);
}

/**
 * Retrieve the current price from the active TradingView chart.
 * Tries chart API first, falls back to DOM scraping.
 */
export async function setActiveSymbol({ symbol, _deps } = {}) {
  const requested = String(symbol || '').trim();
  if (!requested) throw new Error('symbol is required');

  const { evaluate, evaluateAsync } = resolveDeps(_deps);
  await evaluateAsync(`
    (function() {
      var chart = window.TradingViewApi._activeChartWidgetWV.value();
      return new Promise(function(resolve, reject) {
        try {
          chart.setSymbol(${safeString(requested)}, {});
          setTimeout(resolve, 500);
        } catch (e) {
          reject(e);
        }
      });
    })()
  `);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const current = await evaluate(`
      (function() {
        try {
          return window.TradingViewApi._activeChartWidgetWV.value().symbol();
        } catch (e) {
          return null;
        }
      })()
    `);
    if (symbolMatches(current, requested)) {
      return { success: true, requested_symbol: requested, chart_symbol: current };
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  const current = await evaluate(`
    (function() {
      try {
        return window.TradingViewApi._activeChartWidgetWV.value().symbol();
      } catch (e) {
        return null;
      }
    })()
  `);
  throw new Error(`Symbol switch did not settle to ${requested}. Current symbol: ${current || 'unknown'}`);
}

export async function getCurrentPrice({ symbol, _deps } = {}) {
  const requestedSymbol = String(symbol || '').trim();
  if (symbol) {
    await setActiveSymbol({ symbol: requestedSymbol, _deps });
  }

  if (requestedSymbol) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const raw = await readCurrentPriceRaw({ _deps });
      if (!raw?.error && symbolMatches(raw.symbol, requestedSymbol)) {
        validatePriceData(raw);
        return formatPriceResult(raw);
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    throw new Error(`Price retrieval failed: symbol ${requestedSymbol} did not settle before timeout`);
  }

  const raw = await readCurrentPriceRaw({ _deps });
  if (!raw || raw.error) {
    throw new Error(`Price retrieval failed: ${raw?.error || 'unknown'}`);
  }
  validatePriceData(raw);
  return formatPriceResult(raw);
}
