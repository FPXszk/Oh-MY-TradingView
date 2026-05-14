import { z } from 'zod';
import { jsonResult } from './_format.js';
import {
  getMoomooHealthCheck,
  getMoomooSnapshot,
  getMoomooKlineHistory,
  getMoomooStockFilter,
  getMoomooPlateList,
  getMoomooPlateStocks,
} from '../core/moomoo.js';

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
    'moomoo_stock_filter',
    'Run a simple moomoo stock filter using market, price, market-cap, and PE constraints. Read-only. No CDP connection needed.',
    {
      market: z.string().describe('Market such as US, HK, or JP'),
      minPrice: z.number().optional().describe('Minimum last price'),
      minMarketCap: z.number().optional().describe('Minimum market cap'),
      peMin: z.number().optional().describe('Minimum PE TTM'),
      peMax: z.number().optional().describe('Maximum PE TTM'),
      limit: z.number().int().min(1).max(200).optional().default(20).describe('Max results to return'),
      begin: z.number().int().min(0).optional().default(0).describe('Pagination offset'),
    },
    async ({ market, minPrice, minMarketCap, peMin, peMax, limit, begin }) => {
      try {
        return jsonResult(await getMoomooStockFilter({
          market,
          minPrice,
          minMarketCap,
          peMin,
          peMax,
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
}
