/**
 * Workspace operations — watchlist, pane, tab, layout management via CDP.
 * All operations fail explicitly when the requested entity is not found.
 */

import {
  evaluateWithPopupGuard as _evaluate,
  evaluateAsyncWithPopupGuard as _evaluateAsync,
  safeString,
} from '../connection.js';

function resolveDeps(deps) {
  return {
    evaluate: deps?.evaluate || _evaluate,
    evaluateAsync: deps?.evaluateAsync || _evaluateAsync,
  };
}

// ---------------------------------------------------------------------------
// Watchlist
// ---------------------------------------------------------------------------

/**
 * List symbols in the active watchlist.
 */
export async function listWatchlistSymbols({ _deps } = {}) {
  const { evaluate } = resolveDeps(_deps);
  const result = await evaluate(`
    (function() {
      try {
        var wl = window.TradingViewApi._activeChartWidgetWV.value()
          ._chartWidget.model().model().watchedList();
        if (!wl) return { error: 'Watchlist not available' };
        var symbols = wl.symbolList();
        return { symbols: symbols || [] };
      } catch (e) {
        return { error: e.message };
      }
    })()
  `);
  if (result?.error) {
    throw new Error(`listWatchlistSymbols failed: ${result.error}`);
  }
  return {
    success: true,
    symbols: result.symbols,
    count: result.symbols.length,
    retrieved_at: new Date().toISOString(),
  };
}

/**
 * Add a symbol to the active watchlist.
 */
export async function addWatchlistSymbol({ symbol, _deps } = {}) {
  if (!symbol || typeof symbol !== 'string') {
    throw new Error('symbol is required');
  }
  const ticker = symbol.trim().toUpperCase();
  const { evaluate } = resolveDeps(_deps);
  const result = await evaluate(`
    (function() {
      try {
        var wl = window.TradingViewApi._activeChartWidgetWV.value()
          ._chartWidget.model().model().watchedList();
        if (!wl) return { error: 'Watchlist not available' };
        wl.addSymbol(${safeString(ticker)});
        return { added: ${safeString(ticker)} };
      } catch (e) {
        return { error: e.message };
      }
    })()
  `);
  if (result?.error) {
    throw new Error(`addWatchlistSymbol failed: ${result.error}`);
  }
  return {
    success: true,
    added: result.added,
    retrieved_at: new Date().toISOString(),
  };
}

/**
 * Remove a symbol from the active watchlist.
 */
export async function removeWatchlistSymbol({ symbol, _deps } = {}) {
  if (!symbol || typeof symbol !== 'string') {
    throw new Error('symbol is required');
  }
  const ticker = symbol.trim().toUpperCase();
  const { evaluate } = resolveDeps(_deps);
  const result = await evaluate(`
    (function() {
      try {
        var wl = window.TradingViewApi._activeChartWidgetWV.value()
          ._chartWidget.model().model().watchedList();
        if (!wl) return { error: 'Watchlist not available' };
        var symbols = wl.symbolList() || [];
        var found = symbols.find(function(s) {
          return s.toUpperCase() === ${safeString(ticker)}
            || s.toUpperCase().endsWith(':' + ${safeString(ticker)});
        });
        if (!found) return { error: 'Symbol ' + ${safeString(ticker)} + ' not found in watchlist' };
        wl.removeSymbol(found);
        return { removed: found };
      } catch (e) {
        return { error: e.message };
      }
    })()
  `);
  if (result?.error) {
    throw new Error(`removeWatchlistSymbol failed: ${result.error}`);
  }
  return {
    success: true,
    removed: result.removed,
    retrieved_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Panes
// ---------------------------------------------------------------------------

/**
 * List chart panes in the active layout.
 */
export async function listPanes({ _deps } = {}) {
  const { evaluate } = resolveDeps(_deps);
  const result = await evaluate(`
    (function() {
      try {
        var chart = window.TradingViewApi._activeChartWidgetWV.value();
        var model = chart._chartWidget.model();
        var paneCount = model.panesCount();
        var panes = [];
        for (var i = 0; i < paneCount; i++) {
          var pane = model.paneAt(i);
          var studies = [];
          if (pane && typeof pane.dataSources === 'function') {
            var ds = pane.dataSources();
            for (var j = 0; j < ds.length; j++) {
              var name = ds[j].title ? ds[j].title() : ('source_' + j);
              studies.push(name);
            }
          }
          panes.push({ index: i, studies: studies });
        }
        return { panes: panes };
      } catch (e) {
        return { error: e.message };
      }
    })()
  `);
  if (result?.error) {
    throw new Error(`listPanes failed: ${result.error}`);
  }
  return {
    success: true,
    panes: result.panes,
    count: result.panes.length,
    retrieved_at: new Date().toISOString(),
  };
}

/**
 * Focus (select) a specific pane by index.
 */
export async function focusPane({ index, _deps } = {}) {
  if (index === undefined || index === null) {
    throw new Error('pane index is required');
  }
  const paneIndex = Number(index);
  if (!Number.isInteger(paneIndex) || paneIndex < 0) {
    throw new Error('pane index must be a non-negative integer');
  }
  const { evaluate } = resolveDeps(_deps);
  const result = await evaluate(`
    (function() {
      try {
        var chart = window.TradingViewApi._activeChartWidgetWV.value();
        var model = chart._chartWidget.model();
        var paneCount = model.panesCount();
        if (${paneIndex} >= paneCount) {
          return { error: 'Pane index ' + ${paneIndex} + ' out of range (0-' + (paneCount - 1) + ')' };
        }
        model.selectPane(${paneIndex});
        return { focused: ${paneIndex} };
      } catch (e) {
        return { error: e.message };
      }
    })()
  `);
  if (result?.error) {
    throw new Error(`focusPane failed: ${result.error}`);
  }
  return {
    success: true,
    focusedIndex: result.focused,
    retrieved_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

/**
 * List chart slots in the current TradingView layout.
 */
export async function listTabs({ _deps } = {}) {
  const { evaluate } = resolveDeps(_deps);
  const result = await evaluate(`
    (function() {
      try {
        var api = window.TradingViewApi;
        var tabs = [];
        if (api && typeof api.chartsCount === 'function') {
          var count = api.chartsCount();
          for (var i = 0; i < count; i++) {
            var chart = api.chart(i);
            var symbol = chart ? chart.symbol() : 'unknown';
            tabs.push({ index: i, symbol: symbol });
          }
          var activeIdx = api.activeChart
            ? api.activeChartIndex()
            : 0;
          return { tabs: tabs, activeIndex: activeIdx };
        }
        var chart = api._activeChartWidgetWV.value();
        tabs.push({ index: 0, symbol: chart.symbol() });
        return { tabs: tabs, activeIndex: 0 };
      } catch (e) {
        return { error: e.message };
      }
    })()
  `);
  if (result?.error) {
    throw new Error(`listTabs failed: ${result.error}`);
  }
  return {
    success: true,
    scope: 'layout_charts',
    tabs: result.tabs,
    activeIndex: result.activeIndex,
    count: result.tabs.length,
    retrieved_at: new Date().toISOString(),
  };
}

/**
 * Switch the active chart slot in the current TradingView layout by index.
 */
export async function switchTab({ index, _deps } = {}) {
  if (index === undefined || index === null) {
    throw new Error('tab index is required');
  }
  const tabIndex = Number(index);
  if (!Number.isInteger(tabIndex) || tabIndex < 0) {
    throw new Error('tab index must be a non-negative integer');
  }
  const { evaluate } = resolveDeps(_deps);
  const result = await evaluate(`
    (function() {
      try {
        var api = window.TradingViewApi;
        if (api && typeof api.chartsCount === 'function') {
          var count = api.chartsCount();
          if (${tabIndex} >= count) {
            return { error: 'Tab index ' + ${tabIndex} + ' out of range (0-' + (count - 1) + ')' };
          }
          api.setActiveChart(${tabIndex});
          return { switched: ${tabIndex} };
        }
        if (${tabIndex} !== 0) {
          return { error: 'Tab index ' + ${tabIndex} + ' not found (single tab mode)' };
        }
        return { switched: 0 };
      } catch (e) {
        return { error: e.message };
      }
    })()
  `);
  if (result?.error) {
    throw new Error(`switchTab failed: ${result.error}`);
  }
  return {
    success: true,
    scope: 'layout_charts',
    switchedToIndex: result.switched,
    retrieved_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Layouts
// ---------------------------------------------------------------------------

/**
 * List available chart layouts.
 */
export async function listLayouts({ _deps } = {}) {
  const { evaluate } = resolveDeps(_deps);
  const result = await evaluate(`
    (function() {
      try {
        var api = window.TradingViewApi;
        if (api && api._layoutManager) {
          var mgr = api._layoutManager;
          var layouts = [];
          if (typeof mgr.getLayouts === 'function') {
            var raw = mgr.getLayouts();
            for (var i = 0; i < raw.length; i++) {
              layouts.push({ id: raw[i].id || i, name: raw[i].name || ('layout_' + i) });
            }
          }
          return { layouts: layouts };
        }
        return { error: 'Layout manager not accessible' };
      } catch (e) {
        return { error: e.message };
      }
    })()
  `);
  if (result?.error) {
    throw new Error(`listLayouts failed: ${result.error}`);
  }
  return {
    success: true,
    layouts: result.layouts,
    count: result.layouts.length,
    retrieved_at: new Date().toISOString(),
  };
}

/**
 * Apply a layout by name or id.
 */
export async function applyLayout({ layout, _deps } = {}) {
  if (layout === undefined || layout === null) {
    throw new Error('layout name or id is required');
  }
  const layoutName = String(layout).trim();
  if (!layoutName) {
    throw new Error('layout name or id is required');
  }
  const { evaluateAsync } = resolveDeps(_deps);
  const result = await evaluateAsync(`
    (async function() {
      function getActiveLayoutIdentity(mgr) {
        try {
          if (typeof mgr.getCurrentLayoutId === 'function') return String(mgr.getCurrentLayoutId());
          if (typeof mgr.currentLayoutId === 'function') return String(mgr.currentLayoutId());
          if (typeof mgr.activeLayoutId === 'function') return String(mgr.activeLayoutId());
          if (typeof mgr.getActiveLayoutId === 'function') return String(mgr.getActiveLayoutId());
          if (typeof mgr.currentLayout === 'function') {
            var current = mgr.currentLayout();
            if (current && current.id !== undefined && current.id !== null) return String(current.id);
            if (current && current.name) return String(current.name);
          }
          if (mgr.currentLayoutId !== undefined && mgr.currentLayoutId !== null) return String(mgr.currentLayoutId);
          if (mgr.activeLayoutId !== undefined && mgr.activeLayoutId !== null) return String(mgr.activeLayoutId);
        } catch (e) {}
        return null;
      }

      try {
        var api = window.TradingViewApi;
        if (!api || !api._layoutManager) {
          return { error: 'Layout manager not accessible' };
        }
        var mgr = api._layoutManager;
        if (typeof mgr.getLayouts !== 'function' || typeof mgr.loadLayout !== 'function') {
          return { error: 'Layout manager does not support layout operations' };
        }
        var layouts = mgr.getLayouts();
        var target = null;
        for (var i = 0; i < layouts.length; i++) {
          if (layouts[i].name === ${safeString(layoutName)} ||
              String(layouts[i].id) === ${safeString(layoutName)}) {
            target = layouts[i];
            break;
          }
        }
        if (!target) {
          return { error: 'Layout ' + ${safeString(layoutName)} + ' not found' };
        }
        var loadResult = mgr.loadLayout(target.id);
        if (loadResult && typeof loadResult.then === 'function') {
          await loadResult;
        }
        for (var attempt = 0; attempt < 20; attempt += 1) {
          var active = getActiveLayoutIdentity(mgr);
          if (active === String(target.id) || active === String(target.name || target.id)) {
            return { applied: target.name || target.id, settled: true };
          }
          if (active === null) {
            await new Promise(function(resolve) { setTimeout(resolve, 500); });
            return { applied: target.name || target.id, settled: false, note: 'Active layout state unavailable' };
          }
          await new Promise(function(resolve) { setTimeout(resolve, 200); });
        }
        return { error: 'Layout ' + ${safeString(layoutName)} + ' did not settle before timeout' };
      } catch (e) {
        return { error: e.message };
      }
    })()
  `);
  if (result?.error) {
    throw new Error(`applyLayout failed: ${result.error}`);
  }
  return {
    success: true,
    applied: result.applied,
    settled: result.settled ?? false,
    note: result.note || null,
    retrieved_at: new Date().toISOString(),
  };
}
