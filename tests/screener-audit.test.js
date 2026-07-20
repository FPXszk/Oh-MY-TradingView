import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildScreenerAudit } from '../src/core/screener-audit.js';

describe('buildScreenerAudit', () => {
  it('detects rank changes, anomalies, and previous top10 changes', () => {
    const audit = buildScreenerAudit({
      scannerScope: { market: 'japan' },
      unifiedPhase4Ranking: [
        {
          symbol: '4634',
          exchange: 'TSE',
          unifiedRank: 1,
          unifiedRankScore: 90,
          rankBeforeSupplement: 11,
          rankAfterSupplement: 1,
          rankDelta: 10,
          scoreBeforeSupplement: 70,
          scoreAfterSupplement: 90,
          scoreDelta: 20,
          fcfMargin: 4.68,
          pFcf: 12,
          metricProvenance: {
            fcfMargin: {
              source: 'edinet',
              status: 'warning',
              rankEligible: true,
              previousValue: 69.4,
              finalValue: 4.68,
              warnings: ['tradingview_edinet_fcf_margin_diff_gte_20pt'],
              documentType: '有価証券報告書',
              consolidation: 'consolidated',
              currency: 'JPY',
            },
            pFcf: {
              source: 'edinet',
              status: 'valid',
              rankEligible: true,
              finalValue: 12,
              documentType: '有価証券報告書',
              consolidation: 'consolidated',
              currency: 'JPY',
            },
          },
        },
      ],
    }, {
      previousAudit: {
        top10CurrentRun: [
          { rank: 1, symbol: '2222', score: 88 },
        ],
      },
    });

    assert.equal(audit.status, 'warning');
    assert.equal(audit.summary.rankChangesOverThreshold, 1);
    assert.equal(audit.summary.newTop10Entries, 1);
    assert.equal(audit.rankChanges[0].symbol, '4634');
    assert.equal(audit.metricAnomalies[0].metricName, 'fcfMargin');
    assert.equal(audit.top10PreviousRun[0].isNewTop10FromPrevious, true);
  });

  it('marks critical when an ineligible metric is still used in a top row', () => {
    const audit = buildScreenerAudit({
      scannerScope: { market: 'japan' },
      unifiedPhase4Ranking: [
        {
          symbol: '2222',
          exchange: 'TSE',
          unifiedRank: 1,
          unifiedRankScore: 80,
          fcfMargin: 145.2,
          metricProvenance: {
            fcfMargin: {
              source: 'tradingview',
              status: 'invalid',
              rankEligible: false,
              finalValue: 145.2,
              warnings: ['fcf_margin_abs_gte_50_without_verified_primary_source'],
            },
          },
        },
      ],
    });

    assert.equal(audit.status, 'critical');
    assert.equal(audit.summary.errors > 0, true);
    assert.equal(audit.criticals.some((entry) => entry.reason === 'top3_rank_ineligible_metric_used'), true);
  });
});
