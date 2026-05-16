import { z } from 'zod';
import { jsonResult } from './_format.js';
import {
  getMoomooHealthCheck,
  getMoomooSnapshot,
  getMoomooKlineHistory,
  getMoomooFundamentalProbe,
  getMoomooStockFilterFields,
  getMoomooStockFilter,
  getMoomooPlateList,
  getMoomooPlateStocks,
  getMoomooPlateBreadth,
  getMoomooOhlcComparison,
  runMoomooScreeningValidation,
} from '../core/moomoo.js';

const filterSchema = z.object({
  type: z.enum(['simple', 'financial', 'indicator', 'pattern']).describe('Filter type'),
  field: z.string().optional().describe('StockField name for simple / financial / pattern filters'),
  min: z.number().optional().describe('Inclusive lower bound for simple / financial filters'),
  max: z.number().optional().describe('Inclusive upper bound for simple / financial filters'),
  sort: z.string().optional().describe('Sort direction such as ASCEND or DESCEND'),
  noFilter: z.boolean().optional().describe('Request field without applying threshold filtering when supported'),
  quarter: z.string().optional().describe('Financial quarter such as ANNUAL or QUARTERLY'),
  field1: z.string().optional().describe('First StockField name for indicator filters'),
  field2: z.string().optional().describe('Second StockField name for indicator filters'),
  relativePosition: z.string().optional().describe('Relative position such as CROSS_UP, ABOVE, BELOW'),
  ktype: z.string().optional().describe('K-line type such as K_DAY or K_WEEK'),
  value: z.number().optional().describe('Optional constant value for indicator filters'),
  field1Params: z.array(z.number()).max(8).optional().describe('Optional parameter list for field1'),
  field2Params: z.array(z.number()).max(8).optional().describe('Optional parameter list for field2'),
  consecutivePeriod: z.number().int().min(1).max(999).optional().describe('Consecutive period count'),
});

const stockFilterSchema = {
  market: z.string().describe('Market such as US, HK, or JP'),
  minPrice: z.number().optional().describe('Minimum last price'),
  minMarketCap: z.number().optional().describe('Minimum market cap'),
  peMin: z.number().optional().describe('Minimum PE TTM'),
  peMax: z.number().optional().describe('Maximum PE TTM'),
  plateCode: z.string().optional().describe('Optional plate code to limit get_stock_filter scope'),
  filters: z.array(filterSchema).max(24).optional().describe('Additional get_stock_filter DSL entries'),
  limit: z.number().int().min(1).max(200).optional().default(20).describe('Max results to return'),
  begin: z.number().int().min(0).optional().default(0).describe('Pagination offset'),
};

export function registerMoomooTools(server) {
  server.tool(
    'moomoo_health_check',
    'Check OpenD connectivity and quote/trade login state through the moomoo OpenAPI adapter. Read-only. No CDP connection needed.',
    {},
    async () => {
      try {
        return jsonResult(await getMoomooHealthCheck());
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'moomoo_snapshot',
    'Fetch moomoo market snapshots for one or more symbols. Read-only. No CDP connection needed.',
    {
      symbols: z.array(z.string()).min(1).max(50).describe('List of symbols like US.AAPL'),
    },
    async ({ symbols }) => {
      try {
        return jsonResult(await getMoomooSnapshot({ symbols }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'moomoo_kline_history',
    'Fetch historical moomoo K-line data for one symbol. Read-only. No CDP connection needed.',
    {
      symbol: z.string().describe('Symbol like US.AAPL'),
      ktype: z.string().optional().default('K_DAY').describe('K-line type such as K_DAY, K_WEEK, K_1M'),
      autype: z.string().optional().default('qfq').describe('Adjustment type such as qfq'),
      start: z.string().optional().describe('Optional inclusive start date/time'),
      end: z.string().optional().describe('Optional inclusive end date/time'),
      maxCount: z.number().int().min(1).max(1000).optional().default(100).describe('Max rows to return'),
      extendedTime: z.boolean().optional().default(false).describe('Include extended session data when supported'),
    },
    async ({ symbol, ktype, autype, start, end, maxCount, extendedTime }) => {
      try {
        return jsonResult(await getMoomooKlineHistory({
          symbol,
          ktype,
          autype,
          start,
          end,
          maxCount,
          extendedTime,
        }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'moomoo_stock_filter_fields',
    'List get_stock_filter field inventory and supporting enums available from the moomoo SDK. Read-only. No CDP connection needed.',
    {},
    async () => {
      try {
        return jsonResult(await getMoomooStockFilterFields());
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'moomoo_stock_filter',
    'Run moomoo get_stock_filter with basic constraints plus optional filter DSL entries. Read-only. No CDP connection needed.',
    stockFilterSchema,
    async ({ market, minPrice, minMarketCap, peMin, peMax, plateCode, filters, limit, begin }) => {
      try {
        return jsonResult(await getMoomooStockFilter({
          market,
          minPrice,
          minMarketCap,
          peMin,
          peMax,
          plateCode,
          filters,
          limit,
          begin,
        }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'moomoo_plate_list',
    'List moomoo plates for a market and plate class. Read-only. No CDP connection needed.',
    {
      market: z.string().describe('Market such as US, HK, or JP'),
      plateClass: z.string().optional().default('ALL').describe('Plate class such as ALL, INDUSTRY, REGION, CONCEPT'),
    },
    async ({ market, plateClass }) => {
      try {
        return jsonResult(await getMoomooPlateList({ market, plateClass }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'moomoo_plate_stocks',
    'List constituent stocks for one moomoo plate code. Read-only. No CDP connection needed.',
    {
      plateCode: z.string().describe('Plate code returned by moomoo_plate_list'),
      sortField: z.string().optional().default('CODE').describe('Sort field accepted by get_plate_stock'),
      ascend: z.boolean().optional().default(true).describe('Sort ascending when true'),
    },
    async ({ plateCode, sortField, ascend }) => {
      try {
        return jsonResult(await getMoomooPlateStocks({ plateCode, sortField, ascend }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'moomoo_plate_breadth',
    'Compute theme breadth from moomoo plate constituents using repo-side aggregation. Read-only. No CDP connection needed.',
    {
      plateCode: z.string().describe('Plate code returned by moomoo_plate_list'),
      symbolLimit: z.number().int().min(1).max(50).optional().default(25).describe('Max plate constituents to analyze'),
      nearHighThresholdPct: z.number().min(0).optional().default(90).describe('Threshold for near-52-week-high breadth'),
      volumeRatioSupportMin: z.number().min(0).optional().default(1).describe('Volume ratio threshold for support breadth'),
      sortField: z.string().optional().default('CODE').describe('Sort field accepted by get_plate_stock'),
      ascend: z.boolean().optional().default(true).describe('Sort ascending when true'),
    },
    async ({ plateCode, symbolLimit, nearHighThresholdPct, volumeRatioSupportMin, sortField, ascend }) => {
      try {
        return jsonResult(await getMoomooPlateBreadth({
          plateCode,
          symbolLimit,
          nearHighThresholdPct,
          volumeRatioSupportMin,
          sortField,
          ascend,
        }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'moomoo_ohlc_compare',
    'Summarize moomoo daily OHLC and optionally compare against an explicit legacy benchmark provider. Read-only. No CDP connection needed.',
    {
      symbols: z.array(z.string()).min(1).max(20).describe('Symbols like US.NVDA'),
      start: z.string().optional().describe('Optional inclusive start date'),
      end: z.string().optional().describe('Optional inclusive end date'),
      maxBars: z.number().int().min(20).max(400).optional().default(260).describe('Max daily bars to compare'),
      autype: z.string().optional().default('qfq').describe('Adjustment type such as qfq'),
      benchmarkProvider: z.string().optional().default('none').describe('Optional external comparison provider. Use yahoo_finance only for legacy drift checks.'),
    },
    async ({ symbols, start, end, maxBars, autype, benchmarkProvider }) => {
      try {
        return jsonResult(await getMoomooOhlcComparison({
          symbols,
          start,
          end,
          maxBars,
          autype,
          benchmarkProvider,
        }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'moomoo_screening_validate',
    'Fetch moomoo candidates with get_stock_filter, optionally intersect them with a plate, then proxy-rescore and compare OHLC for validation. Read-only. No CDP connection needed.',
    {
      ...stockFilterSchema,
      candidateSymbols: z.array(z.string()).max(20).optional().describe('TradingView candidate symbols to re-check'),
      validateLimit: z.number().int().min(1).max(20).optional().default(10).describe('Max symbols to validate end-to-end'),
      historyBars: z.number().int().min(20).max(400).optional().default(260).describe('Max daily bars for OHLC comparison'),
      historyStart: z.string().optional().describe('Optional inclusive history start date'),
      historyEnd: z.string().optional().describe('Optional inclusive history end date'),
      nearHighThresholdPct: z.number().min(0).optional().default(90).describe('Threshold used when plate breadth is computed'),
      mode: z.string().optional().default('benchmark').describe('benchmark or moomoo-only'),
      benchmarkProvider: z.string().optional().default('none').describe('Optional external comparison provider used in benchmark mode'),
    },
    async ({
      market,
      minPrice,
      minMarketCap,
      peMin,
      peMax,
      filters,
      limit,
      begin,
      plateCode,
      candidateSymbols,
      validateLimit,
      historyBars,
      historyStart,
      historyEnd,
      nearHighThresholdPct,
      mode,
      benchmarkProvider,
    }) => {
      try {
        return jsonResult(await runMoomooScreeningValidation({
          market,
          minPrice,
          minMarketCap,
          peMin,
          peMax,
          filters,
          limit,
          begin,
          plateCode,
          candidateSymbols,
          validateLimit,
          historyBars,
          historyStart,
          historyEnd,
          nearHighThresholdPct,
          mode,
          benchmarkProvider,
        }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'moomoo_fundamental_probe',
    'Probe moomoo proxy fundamentals against TradingView scanner references for specific symbols. Read-only. No CDP connection needed.',
    {
      market: z.string().describe('Market such as US'),
      symbols: z.array(z.string()).min(1).max(20).describe('Symbols like US.NVDA'),
      plateCode: z.string().describe('Plate code used to make get_stock_filter probing deterministic'),
      limit: z.number().int().min(1).max(200).optional().default(200).describe('Max get_stock_filter rows to inspect'),
    },
    async ({ market, symbols, plateCode, limit }) => {
      try {
        return jsonResult(await getMoomooFundamentalProbe({
          market,
          symbols,
          plateCode,
          limit,
        }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );
}
