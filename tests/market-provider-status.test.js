import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyProviderFailure,
  buildProviderStatusEntry,
  summarizeProviderCoverage,
} from '../src/core/market-provider-status.js';

describe('classifyProviderFailure', () => {
  it('classifies auth failures distinctly', () => {
    const result = classifyProviderFailure(new Error('twitter-cli authentication required'), { provider: 'x' });
    assert.equal(result.status, 'auth_required');
    assert.equal(result.missing_reason, 'auth_required');
  });

  it('classifies configuration failures distinctly', () => {
    const result = classifyProviderFailure(new Error('twitter-cli is not installed or not found'));
    assert.equal(result.status, 'not_configured');
    assert.equal(result.missing_reason, 'not_configured');
  });

  it('falls back to provider_error for generic failures', () => {
    const result = classifyProviderFailure(new Error('HTTP 503 from upstream'));
    assert.equal(result.status, 'provider_error');
    assert.equal(result.missing_reason, 'fetch_failed');
  });

  it('treats generic yahoo 401 as provider_error instead of auth_required', () => {
    const result = classifyProviderFailure(new Error('HTTP 401 from https://query1.finance.yahoo.com'), { provider: 'fundamentals' });
    assert.equal(result.status, 'provider_error');
    assert.equal(result.missing_reason, 'fetch_failed');
  });
});

describe('buildProviderStatusEntry', () => {
  it('marks successful payloads with data as available', () => {
    const entry = buildProviderStatusEntry({
      provider: 'quote',
      status: 'ok',
      available: true,
      signal_present: true,
    });

    assert.equal(entry.provider, 'quote');
    assert.equal(entry.status, 'ok');
    assert.equal(entry.available, true);
    assert.equal(entry.signal_present, true);
    assert.equal(entry.missing_reason, null);
  });

  it('treats empty successful news payloads as available no_results', () => {
    const entry = buildProviderStatusEntry({
      provider: 'news',
      status: 'no_results',
      available: true,
      signal_present: false,
      missing_reason: 'no_recent_items',
    });

    assert.equal(entry.status, 'no_results');
    assert.equal(entry.available, true);
    assert.equal(entry.missing_reason, 'no_recent_items');
  });
});

describe('summarizeProviderCoverage', () => {
  it('counts available providers separately from signal presence', () => {
    const summary = summarizeProviderCoverage([
      buildProviderStatusEntry({ provider: 'quote', status: 'ok', available: true, signal_present: true }),
      buildProviderStatusEntry({ provider: 'fundamentals', status: 'provider_error', available: false, signal_present: false, missing_reason: 'fetch_failed' }),
      buildProviderStatusEntry({ provider: 'news', status: 'no_results', available: true, signal_present: false, missing_reason: 'no_recent_items' }),
    ]);

    assert.equal(summary.available_count, 2);
    assert.equal(summary.total_count, 3);
    assert.deepEqual(summary.available_providers, ['quote', 'news']);
    assert.deepEqual(summary.missing_providers, ['fundamentals']);
    assert.deepEqual(summary.degraded_providers, ['fundamentals', 'news']);
  });

  it('tracks skipped providers without reporting them as failures', () => {
    const summary = summarizeProviderCoverage([
      buildProviderStatusEntry({ provider: 'x', status: 'skipped', available: false, signal_present: false, missing_reason: 'not_requested' }),
      buildProviderStatusEntry({ provider: 'reddit', status: 'skipped', available: false, signal_present: false, missing_reason: 'not_requested' }),
    ]);

    assert.equal(summary.available_count, 0);
    assert.deepEqual(summary.missing_providers, []);
    assert.deepEqual(summary.degraded_providers, []);
    assert.deepEqual(summary.skipped_providers, ['x', 'reddit']);
    assert.equal(summary.has_partial_failures, false);
  });
});
