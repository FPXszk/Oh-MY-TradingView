import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getMoomooHealthCheck,
  getMoomooSnapshot,
  getMoomooKlineHistory,
  getMoomooStockFilter,
  getMoomooPlateList,
  getMoomooPlateStocks,
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

describe('moomoo validation', () => {
  it('rejects empty snapshot symbol lists', async () => {
    await assert.rejects(
      () => getMoomooSnapshot({ symbols: [] }),
      /symbols must be a non-empty list/,
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

  it('rejects missing plate code', async () => {
    await assert.rejects(
      () => getMoomooPlateStocks({}),
      /plateCode is required/,
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
      ...mockDeps(async (file, args) => {
        calls.push({ file, args });
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

  it('normalizes stock filter payloads', async () => {
    const calls = [];
    const result = await getMoomooStockFilter({
      market: 'us',
      minPrice: 20,
      minMarketCap: 1000000000,
      peMax: 30,
      limit: 10,
      begin: 5,
      ...mockDeps(async (file, args) => {
        calls.push({ file, args });
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
    const payload = JSON.parse(calls[0].args[2]);
    assert.equal(payload.market, 'US');
    assert.equal(payload.min_price, 20);
    assert.equal(payload.min_market_cap, 1000000000);
    assert.equal(payload.pe_max, 30);
    assert.equal(payload.limit, 10);
    assert.equal(payload.begin, 5);
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
        'moomoo_stock_filter',
        'moomoo_plate_list',
        'moomoo_plate_stocks',
      ],
    );
  });
});
