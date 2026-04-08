import { register } from '../router.js';
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
} from '../../core/workspace.js';

register('workspace', {
  description: 'TradingView workspace operations (watchlist, pane, tab, layout)',
  subcommands: new Map([
    [
      'watchlist-list',
      {
        description: 'List watchlist symbols',
        handler: () => listWatchlistSymbols(),
      },
    ],
    [
      'watchlist-add',
      {
        description: 'Add a symbol to the watchlist',
        options: {
          symbol: { type: 'string', short: 's', description: 'Ticker symbol' },
        },
        handler: (opts) => {
          if (!opts.symbol) throw new Error('Usage: tv workspace watchlist-add --symbol AAPL');
          return addWatchlistSymbol({ symbol: opts.symbol });
        },
      },
    ],
    [
      'watchlist-remove',
      {
        description: 'Remove a symbol from the watchlist',
        options: {
          symbol: { type: 'string', short: 's', description: 'Ticker symbol' },
        },
        handler: (opts) => {
          if (!opts.symbol) throw new Error('Usage: tv workspace watchlist-remove --symbol AAPL');
          return removeWatchlistSymbol({ symbol: opts.symbol });
        },
      },
    ],
    [
      'pane-list',
      {
        description: 'List chart panes',
        handler: () => listPanes(),
      },
    ],
    [
      'pane-focus',
      {
        description: 'Focus a pane by index',
        options: {
          index: { type: 'string', short: 'i', description: 'Pane index (0-based)' },
        },
        handler: (opts) => {
          if (opts.index === undefined) throw new Error('Usage: tv workspace pane-focus --index 0');
          return focusPane({ index: Number(opts.index) });
        },
      },
    ],
    [
      'tab-list',
      {
        description: 'List chart slots in the current layout',
        handler: () => listTabs(),
      },
    ],
    [
      'tab-switch',
      {
        description: 'Switch the active chart slot in the current layout by index',
        options: {
          index: { type: 'string', short: 'i', description: 'Tab index (0-based)' },
        },
        handler: (opts) => {
          if (opts.index === undefined) throw new Error('Usage: tv workspace tab-switch --index 1');
          return switchTab({ index: Number(opts.index) });
        },
      },
    ],
    [
      'layout-list',
      {
        description: 'List available layouts',
        handler: () => listLayouts(),
      },
    ],
    [
      'layout-apply',
      {
        description: 'Apply a layout by name or id',
        options: {
          layout: { type: 'string', short: 'l', description: 'Layout name or id' },
        },
        handler: (opts) => {
          if (!opts.layout) throw new Error('Usage: tv workspace layout-apply --layout "My Layout"');
          return applyLayout({ layout: opts.layout });
        },
      },
    ],
  ]),
});
