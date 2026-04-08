import { z } from 'zod';
import { jsonResult } from './_format.js';
import {
  listWatchlistSymbols,
  addWatchlistSymbol,
  removeWatchlistSymbol,
  listPanes,
  focusPane,
  listTabs,
  switchTab,
  listLayouts,
  applyLayout,
} from '../core/workspace.js';

export function registerWorkspaceTools(server) {
  server.tool(
    'tv_watchlist_list',
    'List symbols in the active TradingView watchlist. Requires CDP connection.',
    {},
    async () => {
      try {
        return jsonResult(await listWatchlistSymbols());
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'tv_watchlist_add',
    'Add a symbol to the active TradingView watchlist. Requires CDP connection.',
    {
      symbol: z.string().describe('Ticker symbol to add (e.g. AAPL)'),
    },
    async ({ symbol }) => {
      try {
        return jsonResult(await addWatchlistSymbol({ symbol }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'tv_watchlist_remove',
    'Remove a symbol from the active TradingView watchlist. Fails if the symbol is not found. Requires CDP connection.',
    {
      symbol: z.string().describe('Ticker symbol to remove'),
    },
    async ({ symbol }) => {
      try {
        return jsonResult(await removeWatchlistSymbol({ symbol }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'tv_pane_list',
    'List chart panes in the active TradingView layout. Requires CDP connection.',
    {},
    async () => {
      try {
        return jsonResult(await listPanes());
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'tv_pane_focus',
    'Focus (select) a chart pane by index. Fails if the index is out of range. Requires CDP connection.',
    {
      index: z.number().int().min(0).describe('Zero-based pane index'),
    },
    async ({ index }) => {
      try {
        return jsonResult(await focusPane({ index }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'tv_tab_list',
    'List chart slots in the current TradingView layout. Requires CDP connection.',
    {},
    async () => {
      try {
        return jsonResult(await listTabs());
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'tv_tab_switch',
    'Switch the active chart slot in the current TradingView layout by index. Fails if the index is out of range. Requires CDP connection.',
    {
      index: z.number().int().min(0).describe('Zero-based tab index'),
    },
    async ({ index }) => {
      try {
        return jsonResult(await switchTab({ index }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'tv_layout_list',
    'List available chart layouts. Requires CDP connection.',
    {},
    async () => {
      try {
        return jsonResult(await listLayouts());
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'tv_layout_apply',
    'Apply a chart layout by name or id. Fails if the layout is not found. Requires CDP connection.',
    {
      layout: z.union([z.string(), z.number()]).describe('Layout name or id'),
    },
    async ({ layout }) => {
      try {
        return jsonResult(await applyLayout({ layout }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );
}
