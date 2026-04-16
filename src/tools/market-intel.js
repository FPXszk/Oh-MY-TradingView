import { z } from 'zod';
import { jsonResult } from './_format.js';
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
} from '../core/market-intel.js';
import { getSymbolAnalysis } from '../core/market-intel-analysis.js';
import { applyCompaction, renderCompactPayload } from '../core/output-compaction.js';
import { attachArtifactWarning, tryWriteRawArtifact } from '../core/output-artifacts.js';

export function registerMarketIntelTools(server) {
  server.tool(
    'market_quote',
    'Get a real-time quote for a symbol (price, change, volume). No CDP connection needed.',
    {
      symbol: z.string().describe('Ticker symbol (e.g. AAPL, MSFT, ^GSPC)'),
    },
    async ({ symbol }) => {
      try {
        return jsonResult(await getSymbolQuote(symbol));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'market_fundamentals',
    'Get fundamental data for a symbol (PE, market cap, margins, growth). No CDP connection needed.',
    {
      symbol: z.string().describe('Ticker symbol'),
    },
    async ({ symbol }) => {
      try {
        return jsonResult(await getSymbolFundamentals(symbol));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'market_snapshot',
    'Get quotes for multiple symbols at once (max 20). No CDP connection needed.',
    {
      symbols: z.array(z.string()).min(1).max(20)
        .describe('Array of ticker symbols'),
    },
    async ({ symbols }) => {
      try {
        return jsonResult(await getMarketSnapshot(symbols));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'market_news',
    'Get financial news for a query or symbol. No CDP connection needed.',
    {
      query: z.string().describe('Search query (symbol name, topic, etc.)'),
    },
    async ({ query }) => {
      try {
        return jsonResult(await getFinancialNews(query));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'market_screener',
    'Filter symbols by price/volume criteria. Provide a list of candidate symbols (max 30). No CDP connection needed.',
    {
      symbols: z.array(z.string()).min(1).max(30)
        .describe('Candidate ticker symbols to screen'),
      minPrice: z.number().optional().describe('Minimum price filter'),
      maxPrice: z.number().optional().describe('Maximum price filter'),
      minVolume: z.number().optional().describe('Minimum volume filter'),
    },
    async ({ symbols, minPrice, maxPrice, minVolume }) => {
      try {
        return jsonResult(await runScreener({ symbols, minPrice, maxPrice, minVolume }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'market_financials',
    'Get TradingView-backed financial summaries for multiple symbols (max 20). No CDP connection needed.',
    {
      symbols: z.array(z.string()).min(1).max(20)
        .describe('Candidate ticker symbols to inspect'),
    },
    async ({ symbols }) => {
      try {
        return jsonResult(await getTradingViewFinancialsBatch(symbols));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'market_ta_summary',
    'Get TA summary for multiple symbols — price change, RSI(14), SMA20/50 deviation. No CDP connection needed.',
    {
      symbols: z.array(z.string()).min(1).max(20)
        .describe('Array of ticker symbols (max 20)'),
    },
    async ({ symbols }) => {
      try {
        return jsonResult(await getMultiSymbolTaSummary(symbols));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'market_ta_rank',
    'Rank symbols by a TA indicator — priceChange, rsi14, sma20Deviation, or sma50Deviation. No CDP connection needed.',
    {
      symbols: z.array(z.string()).min(1).max(20)
        .describe('Array of ticker symbols (max 20)'),
      sortBy: z.enum(['priceChange', 'rsi14', 'sma20Deviation', 'sma50Deviation'])
        .optional()
        .default('priceChange')
        .describe('Indicator to rank by (default: priceChange)'),
      order: z.enum(['asc', 'desc'])
        .optional()
        .default('desc')
        .describe('Sort order (default: desc)'),
    },
    async ({ symbols, sortBy, order }) => {
      try {
        return jsonResult(await rankSymbolsByTa(symbols, sortBy, order));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'market_symbol_analysis',
    'Deterministic multi-analyst symbol analysis — trend, fundamentals, news, and risk assessment. No CDP connection needed.',
    {
      symbol: z.string().describe('Ticker symbol (e.g. AAPL, MSFT, ^GSPC)'),
      compact: z.boolean().optional().default(false)
        .describe('Return a compact summary instead of the full result'),
    },
    async ({ symbol, compact }) => {
      try {
        const result = await getSymbolAnalysis(symbol);
        if (!compact) return jsonResult(result);
        const artifactInfo = await tryWriteRawArtifact('market_symbol_analysis', { symbol }, result, { compact });
        const payload = renderCompactPayload(applyCompaction(
          'market_symbol_analysis',
          attachArtifactWarning(result, artifactInfo),
          artifactInfo.artifactPath ? { artifactPath: artifactInfo.artifactPath } : undefined,
        ));
        return jsonResult(payload);
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'market_confluence_rank',
    'Rank symbols by deterministic confluence score derived from trend, fundamentals, and risk. No CDP connection needed.',
    {
      symbols: z.array(z.string()).min(1).max(20)
        .describe('Array of ticker symbols (max 20)'),
      limit: z.number().int().positive().optional()
        .describe('Optional number of ranked results to return'),
      compact: z.boolean().optional().default(false)
        .describe('Return a compact summary instead of the full result'),
    },
    async ({ symbols, limit, compact }) => {
      try {
        const result = await rankSymbolsByConfluence(symbols, { limit });
        if (!compact) return jsonResult(result);
        const artifactInfo = await tryWriteRawArtifact('market_confluence_rank', { symbols, limit }, result, { compact });
        const payload = renderCompactPayload(applyCompaction(
          'market_confluence_rank',
          attachArtifactWarning(result, artifactInfo),
          artifactInfo.artifactPath ? { artifactPath: artifactInfo.artifactPath } : undefined,
        ));
        return jsonResult(payload);
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );
}
