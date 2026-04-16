import { register } from '../router.js';
import {
  getSymbolQuote,
  getSymbolFundamentals,
  getTradingViewFinancialsBatch,
  getMarketSnapshot,
  getFinancialNews,
  runScreener,
  getMultiSymbolTaSummary,
  rankSymbolsByTa,
  rankSymbolsByConfluence,
} from '../../core/market-intel.js';
import { getSymbolAnalysis } from '../../core/market-intel-analysis.js';
import { applyCompaction, renderCompactPayload } from '../../core/output-compaction.js';
import { attachArtifactWarning, tryWriteRawArtifact } from '../../core/output-artifacts.js';

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
      'financials',
      {
        description: 'Get TradingView-backed financial summaries for multiple symbols',
        handler: (_opts, positionals) => {
          if (!positionals || positionals.length === 0) {
            throw new Error('Usage: tv market financials C AMZN');
          }
          return getTradingViewFinancialsBatch(positionals);
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
    [
      'ta-summary',
      {
        description: 'Get TA summary for multiple symbols (price change, RSI14, SMA20/50)',
        handler: (_opts, positionals) => {
          if (!positionals || positionals.length === 0) {
            throw new Error('Usage: tv market ta-summary AAPL MSFT GOOGL');
          }
          return getMultiSymbolTaSummary(positionals);
        },
      },
    ],
    [
      'ta-rank',
      {
        description: 'Rank symbols by TA indicator',
        options: {
          'sort-by': { type: 'string', description: 'priceChange | rsi14 | sma20Deviation | sma50Deviation' },
          order: { type: 'string', description: 'asc | desc (default: desc)' },
        },
        handler: (opts, positionals) => {
          if (!positionals || positionals.length === 0) {
            throw new Error('Usage: tv market ta-rank AAPL MSFT --sort-by rsi14');
          }
          return rankSymbolsByTa(
            positionals,
            opts['sort-by'] || 'priceChange',
            opts.order || 'desc',
          );
        },
      },
    ],
    [
      'analysis',
      {
        description: 'Deterministic multi-analyst symbol analysis',
        options: {
          symbol: { type: 'string', short: 's', description: 'Ticker symbol' },
          compact: { type: 'boolean', short: 'c', description: 'Emit compact summary output' },
        },
        handler: async (opts) => {
          if (!opts.symbol) throw new Error('Usage: tv market analysis --symbol AAPL');
          const result = await getSymbolAnalysis(opts.symbol);
          if (!opts.compact) return result;
          const artifactInfo = await tryWriteRawArtifact('market_symbol_analysis', { symbol: opts.symbol }, result, { compact: true });
          return renderCompactPayload(applyCompaction(
            'market_symbol_analysis',
            attachArtifactWarning(result, artifactInfo),
            artifactInfo.artifactPath ? { artifactPath: artifactInfo.artifactPath } : undefined,
          ));
        },
      },
    ],
    [
      'confluence-rank',
      {
        description: 'Rank symbols by deterministic confluence score',
        options: {
          limit: { type: 'string', description: 'Maximum ranked results to return' },
          compact: { type: 'boolean', short: 'c', description: 'Emit compact summary output' },
        },
        handler: async (opts, positionals) => {
          if (!positionals || positionals.length === 0) {
            throw new Error('Usage: tv market confluence-rank AAPL MSFT NVDA --limit 5');
          }
          const result = await rankSymbolsByConfluence(positionals, {
            limit: opts.limit ? Number(opts.limit) : undefined,
          });
          if (!opts.compact) return result;
          const artifactInfo = await tryWriteRawArtifact(
            'market_confluence_rank',
            { symbols: positionals, limit: opts.limit ? Number(opts.limit) : undefined },
            result,
            { compact: true },
          );
          return renderCompactPayload(applyCompaction(
            'market_confluence_rank',
            attachArtifactWarning(result, artifactInfo),
            artifactInfo.artifactPath ? { artifactPath: artifactInfo.artifactPath } : undefined,
          ));
        },
      },
    ],
  ]),
});
