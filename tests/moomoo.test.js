import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getMoomooHealthCheck,
  getMoomooSnapshot,
  getMoomooKlineHistory,
  getMoomooStockFilterFields,
  getMoomooStockFilter,
  getMoomooPlateList,
  getMoomooPlateStocks,
  getMoomooPlateBreadth,
  getMoomooOhlcComparison,
  runMoomooScreeningValidation,
} from '../src/core/moomoo.js';
import { registerMoomooTools } from '../src/tools/moomoo.js';

function mockDeps(execImpl, extra = {}) {
  return {
    _deps: {
      execFile: execImpl,
      cwd: () => '/workspace',
      env: {},
      ...extra,
    },
  };
}

function createExecSuccess(stdout, stderr = '') {
  return async () => ({ stdout, stderr });
}

function createExecFailure({ message, code = 1, stdout = '', stderr = '' }) {
  return async () => {
    const error = new Error(message);
    error.code = code;
    error.stdout = stdout;
    error.stderr = stderr;
    throw error;
  };
}

function createExecRouter(routes) {
  return async (_file, args) => {
    const command = args[1];
    const payload = JSON.parse(args[2]);
    const route = routes[command];
    if (!route) {
      throw new Error(`Unexpected command: ${command}`);
    }
    const result = await route(payload);
    return {
      stdout: typeof result === 'string' ? result : JSON.stringify(result),
      stderr: '',
    };
  };
}

function createFetchJson(json) {
  return async () => ({
    ok: true,
    async json() {
      return json;
    },
  });
}

function buildHistoryRows({ base = 100, step = 1, days = 80 } = {}) {
  const rows = [];
  for (let index = 0; index < days; index += 1) {
    const close = Number((base + (index * step)).toFixed(4));
    rows.push({
      time_key: `2025-01-${String((index % 28) + 1).padStart(2, '0')} 00:00:00`,
      open: close - 1,
      high: close + 1,
      low: close - 2,
      close,
      volume: 1000 + index,
    });
  }
  return rows;
}

function buildYahooChartFromRows(rows, closeOffset = 0.2) {
  return {
    chart: {
      result: [
        {
          timestamp: rows.map((row, index) => (Date.UTC(2025, 0, index + 1) / 1000)),
          indicators: {
            quote: [
              {
                open: rows.map((row) => row.open + closeOffset),
                high: rows.map((row) => row.high + closeOffset),
                low: rows.map((row) => row.low + closeOffset),
                close: rows.map((row) => row.close + closeOffset),
                volume: rows.map((row) => row.volume),
              },
            ],
          },
        },
      ],
    },
  };
}

describe('moomoo validation', () => {
  it('rejects empty snapshot symbol lists', async () => {
    await assert.rejects(
      () => getMoomooSnapshot({ symbols: [] }),
      /symbols must be a non-empty array/,
    );
  });

  it('rejects missing kline symbol', async () => {
    await assert.rejects(
      () => getMoomooKlineHistory({}),
      /symbol is required/,
    );
  });

  it('rejects unsupported stock-filter markets', async () => {
    await assert.rejects(
      () => getMoomooStockFilter({ market: 'EU' }),
      /market must be one of/,
    );
  });

  it('rejects invalid custom stock filters', async () => {
    await assert.rejects(
      () => getMoomooStockFilter({
        market: 'US',
        filters: [{ type: 'simple', min: 10 }],
      }),
      /filters\[0\]\.field is required/,
    );
  });

  it('rejects missing plate code', async () => {
    await assert.rejects(
      () => getMoomooPlateStocks({}),
      /plateCode is required/,
    );
  });

  it('rejects missing plate code for breadth', async () => {
    await assert.rejects(
      () => getMoomooPlateBreadth({}),
      /plateCode is required/,
    );
  });

  it('rejects missing ohlc comparison symbols', async () => {
    await assert.rejects(
      () => getMoomooOhlcComparison({}),
      /symbols must be a non-empty array/,
    );
  });
});

describe('moomoo success paths', () => {
  it('normalizes health check payloads', async () => {
    const result = await getMoomooHealthCheck(
      mockDeps(createExecSuccess(JSON.stringify({
        success: true,
        state: { program_status_type: 'READY', qot_logined: true },
      }))),
    );

    assert.equal(result.success, true);
    assert.equal(result.state.program_status_type, 'READY');
  });

  it('passes snapshot symbols through the adapter', async () => {
    const calls = [];
    const result = await getMoomooSnapshot({
      symbols: ['US.AAPL', 'US.TSLA'],
      ...mockDeps(async (file, args) => {
        calls.push({ file, args });
        return {
          stdout: JSON.stringify({
            success: true,
            symbols: ['US.AAPL', 'US.TSLA'],
            count: 2,
            rows: [{ code: 'US.AAPL' }, { code: 'US.TSLA' }],
          }),
          stderr: '',
        };
      }),
    });

    assert.equal(result.count, 2);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].file, 'python3');
    assert.match(calls[0].args[0], /python\/moomoo_adapter\.py$/);
    assert.equal(calls[0].args[1], 'snapshot');
    const payload = JSON.parse(calls[0].args[2]);
    assert.deepEqual(payload.symbols, ['US.AAPL', 'US.TSLA']);
    assert.equal(payload.host, '127.0.0.1');
    assert.equal(payload.port, 11111);
  });

  it('passes kline options through the adapter', async () => {
    const calls = [];
    await getMoomooKlineHistory({
      symbol: 'US.AAPL',
      ktype: 'K_WEEK',
      maxCount: 50,
      extendedTime: true,
      ...mockDeps(async (_file, args) => {
        calls.push({ args });
        return {
          stdout: JSON.stringify({ success: true, count: 0, rows: [] }),
          stderr: '',
        };
      }),
    });

    const payload = JSON.parse(calls[0].args[2]);
    assert.equal(payload.symbol, 'US.AAPL');
    assert.equal(payload.ktype, 'K_WEEK');
    assert.equal(payload.max_count, 50);
    assert.equal(payload.extended_time, true);
  });

  it('requests stock filter field inventory', async () => {
    const calls = [];
    const result = await getMoomooStockFilterFields({
      ...mockDeps(async (_file, args) => {
        calls.push(args);
        return {
          stdout: JSON.stringify({
            success: true,
            count: 2,
            fields: [{ name: 'CUR_PRICE' }, { name: 'ROIC' }],
          }),
          stderr: '',
        };
      }),
    });

    assert.equal(result.count, 2);
    assert.equal(calls[0][1], 'stock_filter_fields');
  });

  it('normalizes stock filter payloads including custom filters', async () => {
    const calls = [];
    const result = await getMoomooStockFilter({
      market: 'us',
      minPrice: 20,
      minMarketCap: 1000000000,
      peMax: 30,
      filters: [
        { type: 'simple', field: 'CHANGE_RATE', min: 5, sort: 'DESCEND' },
        {
          type: 'indicator',
          field1: 'PRICE',
          field2: 'MA20',
          relativePosition: 'ABOVE',
          ktype: 'K_DAY',
          field2Params: [20],
        },
      ],
      limit: 10,
      begin: 5,
      ...mockDeps(async (_file, args) => {
        calls.push(args);
        return {
          stdout: JSON.stringify({
            success: true,
            market: 'US',
            count: 1,
            rows: [{ stock_code: 'US.AAPL' }],
          }),
          stderr: '',
        };
      }),
    });

    assert.equal(result.market, 'US');
    const payload = JSON.parse(calls[0][2]);
    assert.equal(payload.market, 'US');
    assert.equal(payload.limit, 10);
    assert.equal(payload.begin, 5);
    assert.equal(payload.filters[0].field, 'CUR_PRICE');
    assert.equal(payload.filters[4].type, 'indicator');
    assert.equal(payload.filters[4].field2_params[0], 20);
  });

  it('normalizes plate list payloads', async () => {
    const result = await getMoomooPlateList({
      market: 'JP',
      plateClass: 'industry',
      ...mockDeps(createExecSuccess(JSON.stringify({
        success: true,
        market: 'JP',
        plate_class: 'INDUSTRY',
        count: 1,
        rows: [{ code: 'JP.BK001' }],
      }))),
    });

    assert.equal(result.plate_class, 'INDUSTRY');
  });

  it('computes plate breadth from snapshot data', async () => {
    const result = await getMoomooPlateBreadth({
      plateCode: 'US.LIST1',
      symbolLimit: 3,
      ...mockDeps(createExecRouter({
        plate_stocks: async () => ({
          success: true,
          plate_code: 'US.LIST1',
          count: 3,
          rows: [{ code: 'US.AAPL' }, { code: 'US.MSFT' }, { code: 'US.TSLA' }],
        }),
        snapshot: async () => ({
          success: true,
          count: 3,
          rows: [
            { code: 'US.AAPL', name: 'Apple', last_price: 105, prev_close_price: 100, highest52weeks_price: 110, volume_ratio: 1.3 },
            { code: 'US.MSFT', name: 'Microsoft', last_price: 198, prev_close_price: 200, highest52weeks_price: 230, volume_ratio: 0.8 },
            { code: 'US.TSLA', name: 'Tesla', last_price: 305, prev_close_price: 300, highest52weeks_price: 310, volume_ratio: 1.2 },
          ],
        }),
      })),
    });

    assert.equal(result.breadth.analyzedCount, 3);
    assert.equal(result.breadth.advanceCount, 2);
    assert.equal(result.breadth.nearHighCount, 2);
    assert.equal(result.breadth.volumeSupportCount, 2);
    assert.equal(result.constituents[0].symbol, 'US.TSLA');
  });

  it('compares moomoo OHLC against yahoo bars', async () => {
    const historyRows = buildHistoryRows({ base: 100, step: 1.5, days: 80 });
    const result = await getMoomooOhlcComparison({
      symbols: ['US.NVDA'],
      maxBars: 80,
      ...mockDeps(createExecRouter({
        kline_history: async () => ({
          success: true,
          count: historyRows.length,
          rows: historyRows,
        }),
      }), {
        fetch: createFetchJson(buildYahooChartFromRows(historyRows, 0.25)),
      }),
    });

    assert.equal(result.count, 1);
    assert.equal(result.comparisons[0].success, true);
    assert.equal(result.comparisons[0].comparedBars, 28);
    assert.ok(result.comparisons[0].avgAbsCloseDiffPct > 0);
    assert.ok(result.comparisons[0].moomooMetrics.perf3m !== null);
  });

  it('runs screening validation end-to-end', async () => {
    const nvdaRows = buildHistoryRows({ base: 100, step: 1.2, days: 90 });
    const pltrRows = buildHistoryRows({ base: 50, step: 0.6, days: 90 });
    const fetch = async (url) => {
      if (url.includes('NVDA')) {
        return {
          ok: true,
          async json() {
            return buildYahooChartFromRows(nvdaRows, 0.1);
          },
        };
      }
      return {
        ok: true,
        async json() {
          return buildYahooChartFromRows(pltrRows, 0.1);
        },
      };
    };

    const result = await runMoomooScreeningValidation({
      market: 'US',
      minPrice: 20,
      limit: 5,
      plateCode: 'US.LIST1',
      candidateSymbols: ['US.NVDA'],
      validateLimit: 3,
      historyBars: 90,
      ...mockDeps(createExecRouter({
        stock_filter: async () => ({
          success: true,
          market: 'US',
          last_page: true,
          all_count: 2,
          count: 2,
          rows: [
            { stock_code: 'US.NVDA', stock_name: 'NVIDIA' },
            { stock_code: 'US.PLTR', stock_name: 'Palantir' },
          ],
        }),
        plate_stocks: async () => ({
          success: true,
          plate_code: 'US.LIST1',
          count: 2,
          rows: [{ code: 'US.NVDA' }, { code: 'US.PLTR' }],
        }),
        snapshot: async ({ symbols }) => ({
          success: true,
          count: symbols.length,
          rows: [
            { code: 'US.NVDA', name: 'NVIDIA', last_price: 205, prev_close_price: 200, highest52weeks_price: 210, volume_ratio: 1.2, total_market_val: 1000, pe_ttm_ratio: 40 },
            { code: 'US.PLTR', name: 'Palantir', last_price: 120, prev_close_price: 118, highest52weeks_price: 140, volume_ratio: 1.1, total_market_val: 900, pe_ttm_ratio: 80 },
          ].filter((row) => symbols.includes(row.code)),
        }),
        kline_history: async ({ symbol }) => ({
          success: true,
          count: symbol === 'US.NVDA' ? nvdaRows.length : pltrRows.length,
          rows: symbol === 'US.NVDA' ? nvdaRows : pltrRows,
        }),
      }), { fetch }),
    });

    assert.equal(result.stockFilter.returnedCount, 2);
    assert.equal(result.plate.intersectedCount, 2);
    assert.equal(result.requestedCandidates[0].inStockFilter, true);
    assert.equal(result.rankedCandidates[0].symbol, 'US.NVDA');
    assert.ok(result.rankedCandidates[0].proxyScore > result.rankedCandidates[1].proxyScore);
  });
});

describe('moomoo error handling', () => {
  it('surfaces missing python runtime clearly', async () => {
    await assert.rejects(
      () => getMoomooHealthCheck(mockDeps(createExecFailure({
        message: 'spawn python3 ENOENT',
        code: 'ENOENT',
      }))),
      /Python runtime for moomoo adapter was not found/,
    );
  });

  it('surfaces missing moomoo-api clearly', async () => {
    await assert.rejects(
      () => getMoomooHealthCheck(mockDeps(createExecFailure({
        message: 'adapter failed',
        stderr: 'moomoo-api is not installed',
      }))),
      /moomoo-api is not installed/,
    );
  });

  it('rejects invalid JSON adapter responses', async () => {
    await assert.rejects(
      () => getMoomooHealthCheck(mockDeps(createExecSuccess('{bad json'))),
      /Invalid JSON response/,
    );
  });

  it('accepts adapter responses when moomoo logs prepend stdout noise', async () => {
    const result = await getMoomooHealthCheck(
      mockDeps(createExecSuccess([
        '2026-05-14 10:53:58,796 | log noise',
        '{"success":true,"state":{"program_status_type":"READY"}}',
        '2026-05-14 10:53:58,799 | trailing disconnect log',
      ].join('\n'))),
    );

    assert.equal(result.success, true);
    assert.equal(result.state.program_status_type, 'READY');
  });
});

describe('registerMoomooTools', () => {
  it('registers all read-only moomoo tool names', () => {
    const calls = [];
    const server = {
      tool(name, description, schema, handler) {
        calls.push({ name, description, schema, handler });
      },
    };

    registerMoomooTools(server);

    assert.deepEqual(
      calls.map((call) => call.name),
      [
        'moomoo_health_check',
        'moomoo_snapshot',
        'moomoo_kline_history',
        'moomoo_stock_filter_fields',
        'moomoo_stock_filter',
        'moomoo_plate_list',
        'moomoo_plate_stocks',
        'moomoo_plate_breadth',
        'moomoo_ohlc_compare',
        'moomoo_screening_validate',
      ],
    );
  });
});
