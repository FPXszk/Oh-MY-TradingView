import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  BACKTEST_CAMPAIGN_SEARCH_DIRS,
  BACKTEST_UNIVERSE_SEARCH_DIRS,
  resolveNamedJsonPath,
} from '../src/core/repo-paths.js';

describe('resolveNamedJsonPath', () => {
  it('resolves campaign ids with or without .json suffix', async () => {
    const withoutSuffix = await resolveNamedJsonPath(
      BACKTEST_CAMPAIGN_SEARCH_DIRS,
      'strongest-overlay-us-50x9',
      'Campaign',
    );
    const withSuffix = await resolveNamedJsonPath(
      BACKTEST_CAMPAIGN_SEARCH_DIRS,
      'strongest-overlay-us-50x9.json',
      'Campaign',
    );

    assert.equal(withSuffix, withoutSuffix);
    assert.match(withSuffix, /strongest-overlay-us-50x9\.json$/);
  });

  it('resolves universe ids with or without .json suffix', async () => {
    const withoutSuffix = await resolveNamedJsonPath(
      BACKTEST_UNIVERSE_SEARCH_DIRS,
      'long-run-us-50',
      'Universe',
    );
    const withSuffix = await resolveNamedJsonPath(
      BACKTEST_UNIVERSE_SEARCH_DIRS,
      'long-run-us-50.json',
      'Universe',
    );

    assert.equal(withSuffix, withoutSuffix);
    assert.match(withSuffix, /long-run-us-50\.json$/);
  });
});
