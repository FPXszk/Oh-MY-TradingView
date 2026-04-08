/**
 * Local TradingView Desktop alert management via CDP.
 * Supports list, create (price alert), and delete operations.
 * No webhook destinations — local alerts only.
 */

import {
  evaluate as _evaluate,
  evaluateAsync as _evaluateAsync,
  safeString,
  requireFinite,
} from '../connection.js';

function resolveDeps(deps) {
  return {
    evaluate: deps?.evaluate || _evaluate,
    evaluateAsync: deps?.evaluateAsync || _evaluateAsync,
  };
}

// ---------------------------------------------------------------------------
// List alerts
// ---------------------------------------------------------------------------

/**
 * List all alerts on the current chart / symbol.
 */
export async function listAlerts({ _deps } = {}) {
  const { evaluate } = resolveDeps(_deps);
  const result = await evaluate(`
    (function() {
      try {
        var api = window.TradingViewApi;
        var chart = api._activeChartWidgetWV.value();
        var model = chart._chartWidget.model();
        var alertApi = model.alertsApi ? model.alertsApi() : null;
        if (!alertApi) {
          return { error: 'Alerts API not available' };
        }
        var raw = typeof alertApi.getAlerts === 'function'
          ? alertApi.getAlerts()
          : [];
        var alerts = [];
        for (var i = 0; i < raw.length; i++) {
          var a = raw[i];
          alerts.push({
            id: a.id || i,
            symbol: a.symbol || null,
            condition: a.condition || null,
            price: a.price != null ? Number(a.price) : null,
            active: a.active !== false,
            name: a.name || null,
          });
        }
        return { alerts: alerts };
      } catch (e) {
        return { error: e.message };
      }
    })()
  `);
  if (result?.error) {
    throw new Error(`listAlerts failed: ${result.error}`);
  }
  return {
    success: true,
    alerts: result.alerts,
    count: result.alerts.length,
    retrieved_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Create price alert
// ---------------------------------------------------------------------------

/**
 * Create a price alert on the current chart symbol.
 * @param {object} opts
 * @param {number} opts.price - The price level to trigger at
 * @param {string} [opts.condition] - 'crossing' | 'crossing_up' | 'crossing_down' (default: 'crossing')
 * @param {string} [opts.message] - Alert message
 */
export async function createPriceAlert({ price, condition, message, _deps } = {}) {
  const alertPrice = requireFinite(price, 'price');
  const alertCondition = (condition || 'crossing').trim().toLowerCase();
  const validConditions = ['crossing', 'crossing_up', 'crossing_down'];
  if (!validConditions.includes(alertCondition)) {
    throw new Error(`condition must be one of: ${validConditions.join(', ')}`);
  }
  const alertMessage = message ? String(message).trim() : '';

  const { evaluate } = resolveDeps(_deps);
  const result = await evaluate(`
    (function() {
      try {
        var api = window.TradingViewApi;
        var chart = api._activeChartWidgetWV.value();
        var symbol = chart.symbol();
        var model = chart._chartWidget.model();
        var alertApi = model.alertsApi ? model.alertsApi() : null;
        if (!alertApi || typeof alertApi.createPriceAlert !== 'function') {
          return { error: 'Alerts API does not support createPriceAlert' };
        }
        var opts = {
          price: ${alertPrice},
          condition: ${safeString(alertCondition)},
        };
        if (${safeString(alertMessage)}) {
          opts.message = ${safeString(alertMessage)};
        }
        var created = alertApi.createPriceAlert(opts);
        return {
          id: created && created.id ? created.id : null,
          symbol: symbol,
          price: ${alertPrice},
          condition: ${safeString(alertCondition)},
        };
      } catch (e) {
        return { error: e.message };
      }
    })()
  `);
  if (result?.error) {
    throw new Error(`createPriceAlert failed: ${result.error}`);
  }
  return {
    success: true,
    id: result.id,
    symbol: result.symbol,
    price: result.price,
    condition: result.condition,
    retrieved_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Delete alert
// ---------------------------------------------------------------------------

/**
 * Delete an alert by its id.
 */
export async function deleteAlert({ id, _deps } = {}) {
  if (id === undefined || id === null) {
    throw new Error('alert id is required');
  }
  const alertId = String(id).trim();
  if (!alertId) {
    throw new Error('alert id is required');
  }
  const { evaluate } = resolveDeps(_deps);
  const result = await evaluate(`
    (function() {
      try {
        var api = window.TradingViewApi;
        var chart = api._activeChartWidgetWV.value();
        var model = chart._chartWidget.model();
        var alertApi = model.alertsApi ? model.alertsApi() : null;
        if (!alertApi || typeof alertApi.deleteAlert !== 'function') {
          return { error: 'Alerts API does not support deleteAlert' };
        }
        var alerts = typeof alertApi.getAlerts === 'function'
          ? alertApi.getAlerts()
          : [];
        var found = alerts.find(function(a) { return String(a.id) === ${safeString(alertId)}; });
        if (!found) {
          return { error: 'Alert with id ' + ${safeString(alertId)} + ' not found' };
        }
        alertApi.deleteAlert(found.id);
        return { deleted: found.id };
      } catch (e) {
        return { error: e.message };
      }
    })()
  `);
  if (result?.error) {
    throw new Error(`deleteAlert failed: ${result.error}`);
  }
  return {
    success: true,
    deletedId: result.deleted,
    retrieved_at: new Date().toISOString(),
  };
}
