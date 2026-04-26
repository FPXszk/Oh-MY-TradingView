import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  listWatchlistSymbols,
  addWatchlistSymbol,
  removeWatchlistSymbol,
  selectWatchlistSearchResult,
  listPanes,
  focusPane,
  listTabs,
  switchTab,
  listLayouts,
  applyLayout,
} from '../src/core/workspace.js';

// ---------------------------------------------------------------------------
// Mock helpers — simulate CDP evaluate responses
// ---------------------------------------------------------------------------

function mockEvaluate(returnValue) {
  return async () => returnValue;
}

function mockDeps(returnValue) {
  return { _deps: { evaluate: mockEvaluate(returnValue), evaluateAsync: mockEvaluate(returnValue) } };
}

// ---------------------------------------------------------------------------
// Watchlist — validation
// ---------------------------------------------------------------------------

describe('addWatchlistSymbol — validation', () => {
  it('rejects missing symbol', async () => {
    await assert.rejects(
      () => addWatchlistSymbol({}),
      /symbol is required/,
    );
  });

  it('rejects empty symbol', async () => {
    await assert.rejects(
      () => addWatchlistSymbol({ symbol: '' }),
      /symbol is required/,
    );
  });

  it('rejects non-string symbol', async () => {
    await assert.rejects(
      () => addWatchlistSymbol({ symbol: 42 }),
      /symbol is required/,
    );
  });
});

describe('removeWatchlistSymbol — validation', () => {
  it('rejects missing symbol', async () => {
    await assert.rejects(
      () => removeWatchlistSymbol({}),
      /symbol is required/,
    );
  });
});

// ---------------------------------------------------------------------------
// Watchlist — success paths with mocked CDP
// ---------------------------------------------------------------------------

describe('listWatchlistSymbols — mocked CDP', () => {
  it('returns symbol list on success', async () => {
    const result = await listWatchlistSymbols(
      mockDeps({ symbols: ['AAPL', 'MSFT'] }),
    );
    assert.equal(result.success, true);
    assert.deepEqual(result.symbols, ['AAPL', 'MSFT']);
    assert.equal(result.count, 2);
    assert.ok(result.retrieved_at);
  });

  it('throws on CDP error', async () => {
    await assert.rejects(
      () => listWatchlistSymbols(mockDeps({ error: 'No watchlist' })),
      /listWatchlistSymbols failed: No watchlist/,
    );
  });
});

describe('addWatchlistSymbol — mocked CDP', () => {
  it('returns added symbol on success', async () => {
    const result = await addWatchlistSymbol({
      symbol: 'googl',
      ...mockDeps({ added: 'GOOGL' }),
    });
    assert.equal(result.success, true);
    assert.equal(result.added, 'GOOGL');
  });

  it('throws on CDP error', async () => {
    await assert.rejects(
      () => addWatchlistSymbol({ symbol: 'AAPL', ...mockDeps({ error: 'fail' }) }),
      /addWatchlistSymbol failed/,
    );
  });
});

describe('removeWatchlistSymbol — mocked CDP', () => {
  it('returns removed symbol on success', async () => {
    const result = await removeWatchlistSymbol({
      symbol: 'AAPL',
      ...mockDeps({ removed: 'AAPL' }),
    });
    assert.equal(result.success, true);
    assert.equal(result.removed, 'AAPL');
  });

  it('returns the fully-qualified removed symbol when TradingView uses exchange-qualified keys', async () => {
    const result = await removeWatchlistSymbol({
      symbol: 'AAPL',
      ...mockDeps({ removed: 'NASDAQ:AAPL' }),
    });
    assert.equal(result.success, true);
    assert.equal(result.removed, 'NASDAQ:AAPL');
  });

  it('throws when symbol not found in watchlist', async () => {
    await assert.rejects(
      () => removeWatchlistSymbol({
        symbol: 'AAPL',
        ...mockDeps({ error: 'Symbol AAPL not found in watchlist' }),
      }),
      /removeWatchlistSymbol failed.*not found/,
    );
  });
});

describe('selectWatchlistSearchResult', () => {
  it('prefers major US venues when multiple exact ticker matches exist', () => {
    const result = selectWatchlistSearchResult([
      { index: 0, title: 'AMSC', text: 'AMSCAmerican Superconductor CorporationstockBMV' },
      { index: 1, title: 'AMSC', text: 'AMSCAmerican Superconductor CorporationstockNASDAQ' },
      { index: 2, title: 'AMSC', text: 'AMSCAmerican Superconductor CorporationstockBIVA' },
    ], 'AMSC');

    assert.deepEqual(result, { index: 1, title: 'AMSC', text: 'AMSCAmerican Superconductor CorporationstockNASDAQ' });
  });

  it('returns the only exact ticker match when no preferred venue exists', () => {
    const result = selectWatchlistSearchResult([
      { index: 0, title: 'VICR', text: 'VICRVicor CorporationstockNASDAQ' },
    ], 'VICR');

    assert.deepEqual(result, { index: 0, title: 'VICR', text: 'VICRVicor CorporationstockNASDAQ' });
  });

  it('returns null when exact ticker match is absent', () => {
    const result = selectWatchlistSearchResult([
      { index: 0, title: 'AMSC_SHORT_VOLUME', text: 'AMSC Short Sale VolumeindexFINRA' },
    ], 'AMSC');

    assert.equal(result, null);
  });
});

// ---------------------------------------------------------------------------
// Panes — validation
// ---------------------------------------------------------------------------

describe('focusPane — validation', () => {
  it('rejects missing index', async () => {
    await assert.rejects(
      () => focusPane({}),
      /pane index is required/,
    );
  });

  it('rejects negative index', async () => {
    await assert.rejects(
      () => focusPane({ index: -1 }),
      /pane index must be a non-negative integer/,
    );
  });

  it('rejects NaN index', async () => {
    await assert.rejects(
      () => focusPane({ index: 'abc' }),
      /pane index must be a non-negative integer/,
    );
  });

  it('rejects fractional index', async () => {
    await assert.rejects(
      () => focusPane({ index: 1.5 }),
      /pane index must be a non-negative integer/,
    );
  });
});

// ---------------------------------------------------------------------------
// Panes — success paths with mocked CDP
// ---------------------------------------------------------------------------

describe('listPanes — mocked CDP', () => {
  it('returns pane list on success', async () => {
    const result = await listPanes(
      mockDeps({ panes: [{ index: 0, studies: ['AAPL'] }, { index: 1, studies: ['RSI'] }] }),
    );
    assert.equal(result.success, true);
    assert.equal(result.count, 2);
    assert.equal(result.panes[0].index, 0);
  });

  it('throws on CDP error', async () => {
    await assert.rejects(
      () => listPanes(mockDeps({ error: 'model unavailable' })),
      /listPanes failed/,
    );
  });
});

describe('focusPane — mocked CDP', () => {
  it('returns focused index on success', async () => {
    const result = await focusPane({ index: 1, ...mockDeps({ focused: 1 }) });
    assert.equal(result.success, true);
    assert.equal(result.focusedIndex, 1);
  });

  it('throws when pane out of range', async () => {
    await assert.rejects(
      () => focusPane({ index: 5, ...mockDeps({ error: 'Pane index 5 out of range (0-1)' }) }),
      /focusPane failed.*out of range/,
    );
  });
});

// ---------------------------------------------------------------------------
// Tabs — validation
// ---------------------------------------------------------------------------

describe('switchTab — validation', () => {
  it('rejects missing index', async () => {
    await assert.rejects(
      () => switchTab({}),
      /tab index is required/,
    );
  });

  it('rejects negative index', async () => {
    await assert.rejects(
      () => switchTab({ index: -1 }),
      /tab index must be a non-negative integer/,
    );
  });

  it('rejects fractional index', async () => {
    await assert.rejects(
      () => switchTab({ index: 1.5 }),
      /tab index must be a non-negative integer/,
    );
  });
});

// ---------------------------------------------------------------------------
// Tabs — success paths with mocked CDP
// ---------------------------------------------------------------------------

describe('listTabs — mocked CDP', () => {
  it('returns tab list on success', async () => {
    const result = await listTabs(
      mockDeps({ tabs: [{ index: 0, symbol: 'AAPL' }], activeIndex: 0 }),
    );
    assert.equal(result.success, true);
    assert.equal(result.scope, 'layout_charts');
    assert.equal(result.count, 1);
    assert.equal(result.tabs[0].symbol, 'AAPL');
    assert.equal(result.activeIndex, 0);
  });

  it('throws on CDP error', async () => {
    await assert.rejects(
      () => listTabs(mockDeps({ error: 'API not ready' })),
      /listTabs failed/,
    );
  });
});

describe('switchTab — mocked CDP', () => {
  it('returns switched index on success', async () => {
    const result = await switchTab({ index: 0, ...mockDeps({ switched: 0 }) });
    assert.equal(result.success, true);
    assert.equal(result.scope, 'layout_charts');
    assert.equal(result.switchedToIndex, 0);
  });

  it('throws when tab not found', async () => {
    await assert.rejects(
      () => switchTab({ index: 3, ...mockDeps({ error: 'Tab index 3 out of range (0-0)' }) }),
      /switchTab failed.*out of range/,
    );
  });
});

// ---------------------------------------------------------------------------
// Layouts — validation
// ---------------------------------------------------------------------------

describe('applyLayout — validation', () => {
  it('rejects missing layout', async () => {
    await assert.rejects(
      () => applyLayout({}),
      /layout name or id is required/,
    );
  });

  it('rejects empty layout', async () => {
    await assert.rejects(
      () => applyLayout({ layout: '' }),
      /layout name or id is required/,
    );
  });

});

// ---------------------------------------------------------------------------
// Layouts — success paths with mocked CDP
// ---------------------------------------------------------------------------

describe('listLayouts — mocked CDP', () => {
  it('returns layout list on success', async () => {
    const result = await listLayouts(
      mockDeps({ layouts: [{ id: '1', name: 'Default' }] }),
    );
    assert.equal(result.success, true);
    assert.equal(result.count, 1);
    assert.equal(result.layouts[0].name, 'Default');
  });

  it('returns empty list with note', async () => {
    await assert.rejects(
      () => listLayouts(mockDeps({ error: 'Layout manager not accessible' })),
      /listLayouts failed: Layout manager not accessible/,
    );
  });

  it('throws on CDP error', async () => {
    await assert.rejects(
      () => listLayouts(mockDeps({ error: 'fail' })),
      /listLayouts failed/,
    );
  });
});

describe('applyLayout — mocked CDP', () => {
  it('returns applied layout on success', async () => {
    const result = await applyLayout({ layout: 'Default', ...mockDeps({ applied: 'Default', settled: true }) });
    assert.equal(result.success, true);
    assert.equal(result.applied, 'Default');
    assert.equal(result.settled, true);
  });

  it('accepts numeric layout ids', async () => {
    const result = await applyLayout({ layout: 123, ...mockDeps({ applied: 123, settled: true }) });
    assert.equal(result.success, true);
    assert.equal(result.applied, 123);
    assert.equal(result.settled, true);
  });

  it('throws when layout not found', async () => {
    await assert.rejects(
      () => applyLayout({ layout: 'Missing', ...mockDeps({ error: 'Layout Missing not found' }) }),
      /applyLayout failed.*not found/,
    );
  });
});
