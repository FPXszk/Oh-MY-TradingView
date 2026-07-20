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
          unifiedRankBeforeSupplement: 11,
          unifiedRankAfterSupplement: 1,
          unifiedScoreBeforeSupplement: 70,
          unifiedScoreAfterSupplement: 90,
          unifiedRankDelta: 10,
          unifiedScoreDelta: 20,
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
              periodStart: '2025-04-01',
              periodEnd: '2026-03-31',
              inputs: {
                revenue: { value: 100 },
                operatingCashFlow: { value: 10 },
                capexPpe: { value: 5 },
              },
            },
            pFcf: {
              source: 'edinet',
              status: 'valid',
              rankEligible: true,
              finalValue: 12,
              documentType: '有価証券報告書',
              consolidation: 'consolidated',
              currency: 'JPY',
              periodStart: '2025-04-01',
              periodEnd: '2026-03-31',
              inputs: {
                revenue: { value: 100 },
                operatingCashFlow: { value: 10 },
                capexPpe: { value: 5 },
              },
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
    assert.equal(audit.enteredTop10BySupplement[0].symbol, '4634');
    assert.equal(audit.exitedTop10FromPreviousRun[0].symbol, '2222');
    assert.equal(audit.currentRunTop10[0].symbol, '4634');
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

  it('marks EDINET ranked metrics critical when required provenance inputs are missing', () => {
    const audit = buildScreenerAudit({
      scannerScope: { market: 'japan' },
      unifiedPhase4Ranking: [
        {
          symbol: '6136',
          exchange: 'TSE',
          unifiedRank: 1,
          unifiedRankScore: 80,
          fcfMargin: 12,
          metricProvenance: {
            fcfMargin: {
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
    });

    assert.equal(audit.status, 'critical');
    assert.equal(audit.criticals.some((entry) => entry.reason === 'edinet_evidence_incomplete'), true);
  });

  it('audits the union of before and after supplement candidate populations', () => {
    const audit = buildScreenerAudit({
      scannerScope: { market: 'japan' },
      unifiedScoringMeta: {
        candidatePopulationBeforeCount: 1,
        candidatePopulationAfterCount: 1,
        candidatePopulationUnionCount: 2,
        enteredCandidatePopulationCount: 1,
        exitedCandidatePopulationCount: 1,
      },
      unifiedAuditRows: [
        {
          symbol: 'BEFORE',
          exchange: 'TSE',
          presentBeforeSupplement: true,
          presentAfterSupplement: false,
          unifiedRankBeforeSupplement: 8,
          unifiedRankAfterSupplement: null,
          unifiedScoreBeforeSupplement: 80,
          unifiedScoreAfterSupplement: null,
          unifiedRankScore: 80,
          exitedCandidatePopulation: true,
          phase4EligibleBefore: true,
          phase4EligibleAfter: false,
          metricProvenance: {},
        },
        {
          symbol: 'AFTER',
          exchange: 'TSE',
          presentBeforeSupplement: false,
          presentAfterSupplement: true,
          unifiedRankBeforeSupplement: null,
          unifiedRankAfterSupplement: 9,
          unifiedScoreBeforeSupplement: null,
          unifiedScoreAfterSupplement: 82,
          unifiedRankScore: 82,
          enteredCandidatePopulation: true,
          phase5EligibleBefore: false,
          phase5EligibleAfter: true,
          metricProvenance: {},
        },
      ],
    });

    assert.equal(audit.status, 'warning');
    assert.equal(audit.summary.candidatePopulationUnionCount, 2);
    assert.equal(audit.summary.enteredCandidatePopulationCount, 1);
    assert.equal(audit.summary.exitedCandidatePopulationCount, 1);
    assert.equal(audit.exitedTop10BySupplement[0].symbol, 'BEFORE');
    assert.equal(audit.enteredTop10BySupplement[0].symbol, 'AFTER');
  });
});
