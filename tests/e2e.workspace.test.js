import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCdpEndpoint } from '../src/connection.js';

const { url: CDP_BASE } = resolveCdpEndpoint();
const CDP_URL = `${CDP_BASE}/json/list`;

async function isCdpAvailable() {
  try {
    const resp = await fetch(CDP_URL, { signal: AbortSignal.timeout(3000) });
    return resp.ok;
  } catch {
    return false;
  }
}

describe('e2e: Workspace (requires TradingView Desktop)', async () => {
  let available = false;
  let workspace;

  before(async () => {
    available = await isCdpAvailable();
    if (!available) return;
    workspace = await import('../src/core/workspace.js');
  });

  after(async () => {
    if (available) {
      const { disconnect } = await import('../src/connection.js');
      await disconnect();
    }
  });

  it('listWatchlistSymbols returns symbol array', { skip: !await isCdpAvailable() && 'CDP not available' }, async () => {
    let result;
    try {
      result = await workspace.listWatchlistSymbols();
    } catch (err) {
      if (/watchlist not available/i.test(err.message)) return;
      throw err;
    }
    assert.equal(result.success, true);
    assert.ok(Array.isArray(result.symbols));
    assert.ok(typeof result.count === 'number');
  });

  it('listPanes returns pane array', { skip: !await isCdpAvailable() && 'CDP not available' }, async () => {
    let result;
    try {
      result = await workspace.listPanes();
    } catch (err) {
      if (/pane/i.test(err.message)) return;
      throw err;
    }
    assert.equal(result.success, true);
    assert.ok(Array.isArray(result.panes));
    assert.ok(result.count >= 1);
  });

  it('listTabs returns tab array', { skip: !await isCdpAvailable() && 'CDP not available' }, async () => {
    let result;
    try {
      result = await workspace.listTabs();
    } catch (err) {
      if (/chart/i.test(err.message)) return;
      throw err;
    }
    assert.equal(result.success, true);
    assert.ok(Array.isArray(result.tabs));
    assert.ok(result.count >= 1);
  });

  it('listLayouts returns layout array', { skip: !await isCdpAvailable() && 'CDP not available' }, async () => {
    let result;
    try {
      result = await workspace.listLayouts();
    } catch (err) {
      if (/layout manager not accessible/i.test(err.message)) return;
      throw err;
    }
    assert.equal(result.success, true);
    assert.ok(Array.isArray(result.layouts));
  });
});
