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

const WATCHLIST_TOGGLE_SELECTOR = 'button[aria-label*="ウォッチリスト"], button[aria-label*="Watchlist"]';
const WATCHLIST_WIDGET_SELECTOR = '.widgetbar-widget-watchlist';
const WATCHLIST_ROW_SELECTOR = `${WATCHLIST_WIDGET_SELECTOR} [data-symbol-full]`;
const WATCHLIST_ADD_BUTTON_SELECTOR = `${WATCHLIST_WIDGET_SELECTOR} button[data-name="add-symbol-button"]`;
const WATCHLIST_SEARCH_ITEM_SELECTOR = '[data-name="symbol-search-dialog-content-item"]';
const WATCHLIST_OPEN_DELAY_MS = 800;
const WATCHLIST_SEARCH_DELAY_MS = 1500;
const WATCHLIST_MUTATION_DELAY_MS = 800;
const WATCHLIST_US_VENUE_PATTERNS = [
  /stockNASDAQ/i,
  /stockNYSE/i,
  /stockNYSEARCA/i,
  /stockAMEX/i,
  /stockBATS/i,
  /stockCBOE/i,
];

function normalizeWatchlistTicker(symbol) {
  if (!symbol || typeof symbol !== 'string') {
    throw new Error('symbol is required');
  }
  const ticker = symbol.trim().toUpperCase();
  if (!ticker) {
    throw new Error('symbol is required');
  }
  return ticker;
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.trim() !== ''))];
}

function watchlistVenueRank(text) {
  const haystack = typeof text === 'string' ? text : '';
  const index = WATCHLIST_US_VENUE_PATTERNS.findIndex((pattern) => pattern.test(haystack));
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function selectWatchlistSearchResult(items, symbol) {
  const ticker = normalizeWatchlistTicker(symbol);
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const exactMatches = items
    .filter((item) => item && typeof item.title === 'string' && item.title.trim().toUpperCase() === ticker)
    .sort((left, right) => {
      const venueDiff = watchlistVenueRank(left.text) - watchlistVenueRank(right.text);
      if (venueDiff !== 0) return venueDiff;
      return (left.index ?? Number.MAX_SAFE_INTEGER) - (right.index ?? Number.MAX_SAFE_INTEGER);
    });

  return exactMatches[0] || null;
}

// ---------------------------------------------------------------------------
// Watchlist
// ---------------------------------------------------------------------------

/**
 * List symbols in the active watchlist.
 */
export async function listWatchlistSymbols({ _deps } = {}) {
  const { evaluateAsync } = resolveDeps(_deps);
  const result = await evaluateAsync(`
    (async function() {
      try {
        var root = document.querySelector(${safeString(WATCHLIST_WIDGET_SELECTOR)});
        if (!root) return { error: 'Watchlist widget not found' };
        var toggle = document.querySelector(${safeString(WATCHLIST_TOGGLE_SELECTOR)});
        if (toggle && String(toggle.className).indexOf('isActive') < 0) {
          toggle.click();
          await new Promise(function(resolve) { setTimeout(resolve, ${WATCHLIST_OPEN_DELAY_MS}); });
        }
        var symbols = Array.from(document.querySelectorAll(${safeString(WATCHLIST_ROW_SELECTOR)}))
          .map(function(node) { return node.getAttribute('data-symbol-full'); })
          .filter(Boolean);
        return { symbols: symbols };
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
    symbols: uniqueStrings(result.symbols || []),
    count: uniqueStrings(result.symbols || []).length,
    retrieved_at: new Date().toISOString(),
  };
}

/**
 * Add a symbol to the active watchlist.
 */
export async function addWatchlistSymbol({ symbol, _deps } = {}) {
  const ticker = normalizeWatchlistTicker(symbol);
  const { evaluateAsync } = resolveDeps(_deps);
  const searchResult = await evaluateAsync(`
    (async function() {
      try {
        var root = document.querySelector(${safeString(WATCHLIST_WIDGET_SELECTOR)});
        if (!root) return { error: 'Watchlist widget not found' };
        var toggle = document.querySelector(${safeString(WATCHLIST_TOGGLE_SELECTOR)});
        if (toggle && String(toggle.className).indexOf('isActive') < 0) {
          toggle.click();
          await new Promise(function(resolve) { setTimeout(resolve, ${WATCHLIST_OPEN_DELAY_MS}); });
        }
        var addButton = document.querySelector(${safeString(WATCHLIST_ADD_BUTTON_SELECTOR)});
        if (!addButton) return { error: 'Add symbol button not found' };
        addButton.click();
        await new Promise(function(resolve) { setTimeout(resolve, ${WATCHLIST_MUTATION_DELAY_MS}); });
        var input = Array.from(document.querySelectorAll('input')).find(function(node) {
          var placeholder = node.getAttribute('placeholder') || '';
          return /symbol|isin|cusip|シンボル名/i.test(placeholder);
        });
        if (!input) return { error: 'Watchlist search input not found' };
        var valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        if (!valueSetter || typeof valueSetter.set !== 'function') {
          return { error: 'Watchlist search input setter unavailable' };
        }
        valueSetter.set.call(input, ${safeString(ticker)});
        input.dispatchEvent(new InputEvent('input', {
          bubbles: true,
          data: ${safeString(ticker)},
          inputType: 'insertText',
        }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(function(resolve) { setTimeout(resolve, ${WATCHLIST_SEARCH_DELAY_MS}); });
        var items = Array.from(document.querySelectorAll(${safeString(WATCHLIST_SEARCH_ITEM_SELECTOR)}))
          .map(function(node, index) {
            var titleNode = node.querySelector('[data-name="list-item-title"]');
            return {
              index: index,
              title: titleNode ? titleNode.textContent.trim() : '',
              text: (node.textContent || '').trim(),
            };
          });
        return { items: items };
      } catch (e) {
        return { error: e.message };
      }
    })()
  `);
  if (searchResult?.error) {
    throw new Error(`addWatchlistSymbol failed: ${searchResult.error}`);
  }
  if (typeof searchResult?.added === 'string') {
    return {
      success: true,
      added: searchResult.added,
      retrieved_at: new Date().toISOString(),
    };
  }

  const selected = selectWatchlistSearchResult(searchResult.items || [], ticker);
  if (!selected) {
    throw new Error(`addWatchlistSymbol failed: Symbol ${ticker} not found in watchlist search results`);
  }

  const result = await evaluateAsync(`
    (async function() {
      try {
        var items = Array.from(document.querySelectorAll(${safeString(WATCHLIST_SEARCH_ITEM_SELECTOR)}));
        if (${selected.index} >= items.length) {
          return { error: 'Search result index out of range for ${ticker}' };
        }
        items[${selected.index}].click();
        await new Promise(function(resolve) { setTimeout(resolve, ${WATCHLIST_MUTATION_DELAY_MS}); });
        var symbols = Array.from(document.querySelectorAll(${safeString(WATCHLIST_ROW_SELECTOR)}))
          .map(function(node) { return node.getAttribute('data-symbol-full'); })
          .filter(Boolean);
        var added = symbols.find(function(entry) {
          var upper = String(entry).toUpperCase();
          return upper === ${safeString(ticker)} || upper.endsWith(':' + ${safeString(ticker)});
        });
        return { added: added || ${safeString(selected.title || ticker)} };
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
  const ticker = normalizeWatchlistTicker(symbol);
  const { evaluateAsync } = resolveDeps(_deps);
  const result = await evaluateAsync(`
    (async function() {
      try {
        var root = document.querySelector(${safeString(WATCHLIST_WIDGET_SELECTOR)});
        if (!root) return { error: 'Watchlist widget not found' };
        var toggle = document.querySelector(${safeString(WATCHLIST_TOGGLE_SELECTOR)});
        if (toggle && String(toggle.className).indexOf('isActive') < 0) {
          toggle.click();
          await new Promise(function(resolve) { setTimeout(resolve, ${WATCHLIST_OPEN_DELAY_MS}); });
        }
        var symbolNode = Array.from(document.querySelectorAll(${safeString(WATCHLIST_ROW_SELECTOR)})).find(function(node) {
          var full = String(node.getAttribute('data-symbol-full') || '').toUpperCase();
          var short = String(node.getAttribute('data-symbol-short') || '').toUpperCase();
          return full === ${safeString(ticker)}
            || full.endsWith(':' + ${safeString(ticker)})
            || short === ${safeString(ticker)};
        });
        if (!symbolNode) return { error: 'Symbol ' + ${safeString(ticker)} + ' not found in watchlist' };
        var removed = symbolNode.getAttribute('data-symbol-full')
          || symbolNode.getAttribute('data-symbol-short')
          || ${safeString(ticker)};
        var row = symbolNode.closest('[draggable="true"]') || symbolNode.parentElement;
        var removeButton = row ? row.querySelector('[class*="removeButton"]') : null;
        if (!removeButton) return { error: 'Remove button not found for ' + removed };
        removeButton.click();
        await new Promise(function(resolve) { setTimeout(resolve, ${WATCHLIST_MUTATION_DELAY_MS}); });
        var stillThere = Array.from(document.querySelectorAll(${safeString(WATCHLIST_ROW_SELECTOR)})).some(function(node) {
          var full = String(node.getAttribute('data-symbol-full') || '').toUpperCase();
          var short = String(node.getAttribute('data-symbol-short') || '').toUpperCase();
          return full === ${safeString(ticker)}
            || full.endsWith(':' + ${safeString(ticker)})
            || short === ${safeString(ticker)};
        });
        if (stillThere) return { error: 'Symbol ' + ${safeString(ticker)} + ' still present after remove click' };
        return { removed: removed };
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
