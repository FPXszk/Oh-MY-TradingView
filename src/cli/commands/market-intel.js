import { register } from '../router.js';
import {
  getSymbolQuote,
  getSymbolFundamentals,
  getMarketSnapshot,
  getFinancialNews,
  runScreener,
} from '../../core/market-intel.js';

register('market', {
  description: 'Market intelligence (no CDP required)',
  subcommands: new Map([
    [
      'quote',
      {
        description: 'Get a symbol quote',
        options: {
          symbol: { type: 'string', short: 's', description: 'Ticker symbol' },
        },
        handler: (opts) => {
          if (!opts.symbol) throw new Error('Usage: tv market quote --symbol AAPL');
          return getSymbolQuote(opts.symbol);
        },
      },
    ],
    [
      'fundamentals',
      {
        description: 'Get symbol fundamentals',
        options: {
          symbol: { type: 'string', short: 's', description: 'Ticker symbol' },
        },
        handler: (opts) => {
          if (!opts.symbol) throw new Error('Usage: tv market fundamentals --symbol AAPL');
          return getSymbolFundamentals(opts.symbol);
        },
      },
    ],
    [
      'snapshot',
      {
        description: 'Get quotes for multiple symbols',
        handler: (_opts, positionals) => {
          if (!positionals || positionals.length === 0) {
            throw new Error('Usage: tv market snapshot AAPL MSFT GOOGL');
          }
          return getMarketSnapshot(positionals);
        },
      },
    ],
    [
      'news',
      {
        description: 'Get financial news',
        options: {
          query: { type: 'string', short: 'q', description: 'Search query' },
        },
        handler: (opts) => {
          if (!opts.query) throw new Error('Usage: tv market news --query "AAPL earnings"');
          return getFinancialNews(opts.query);
        },
      },
    ],
    [
      'screener',
      {
        description: 'Screen symbols by price/volume',
        options: {
          'min-price': { type: 'string', description: 'Minimum price' },
          'max-price': { type: 'string', description: 'Maximum price' },
          'min-volume': { type: 'string', description: 'Minimum volume' },
        },
        handler: (opts, positionals) => {
          if (!positionals || positionals.length === 0) {
            throw new Error('Usage: tv market screener AAPL MSFT --min-price 100');
          }
          return runScreener({
            symbols: positionals,
            minPrice: opts['min-price'] ? Number(opts['min-price']) : undefined,
            maxPrice: opts['max-price'] ? Number(opts['max-price']) : undefined,
            minVolume: opts['min-volume'] ? Number(opts['min-volume']) : undefined,
          });
        },
      },
    ],
  ]),
});
