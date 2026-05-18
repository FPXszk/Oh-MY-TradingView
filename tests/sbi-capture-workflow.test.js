import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  scoreSbiTarget,
  pickSbiTarget,
  pickBestTextCandidate,
  buildCaptureSummaryMarkdown,
} from '../scripts/sbi/capture-portfolio-data.mjs';

describe('sbi capture target selection', () => {
  it('scores SBI page targets above unrelated tabs', () => {
    assert.ok(scoreSbiTarget({
      type: 'page',
      title: 'SBI証券 - ポートフォリオ',
      url: 'https://site2.sbisec.co.jp/ETGate/',
    }) > scoreSbiTarget({
      type: 'page',
      title: 'Google',
      url: 'https://www.google.com/',
    }));
  });

  it('picks the best SBI target from a target list', () => {
    const target = pickSbiTarget([
      { type: 'page', title: 'Google', url: 'https://www.google.com/' },
      { type: 'page', title: 'SBI証券 - 口座管理', url: 'https://site2.sbisec.co.jp/ETGate/' },
      { type: 'page', title: 'Other', url: 'https://example.com/' },
    ]);
    assert.equal(target.title, 'SBI証券 - 口座管理');
  });
});

describe('sbi capture candidate ranking', () => {
  it('prefers exact keyword matches', () => {
    const picked = pickBestTextCandidate([
      { text: 'CSV' },
      { text: 'CSVダウンロード' },
      { text: 'ダウンロード' },
    ], ['CSV']);
    assert.equal(picked.text, 'CSV');
  });
});

describe('sbi capture summary markdown', () => {
  it('renders a compact summary', () => {
    const markdown = buildCaptureSummaryMarkdown({
      generatedAt: '2026-05-18T12:00:00.000Z',
      cdpEndpoint: { host: '127.0.0.1', port: 9222 },
      endpointProbe: {
        reachable: false,
        versionOk: false,
        listOk: false,
        browser: null,
        protocolVersion: null,
        targetCount: null,
        errors: ['GET /json/version failed: fetch failed'],
      },
      target: { title: 'SBI証券', url: 'https://site2.sbisec.co.jp/ETGate/' },
      dryRun: false,
      currentPageSaved: true,
      everyAssetAttempted: true,
      everyAssetCaptured: true,
      csvDownload: {
        success: true,
        files: [{ relativePath: 'downloads/sbi_assets_summary.csv' }],
      },
      notes: ['test note'],
    });

    assert.match(markdown, /# SBI Portfolio Capture Summary/);
    assert.match(markdown, /endpoint_reachable: false/);
    assert.match(markdown, /GET \/json\/version failed: fetch failed/);
    assert.match(markdown, /downloads\/sbi_assets_summary\.csv/);
    assert.match(markdown, /test note/);
  });
});
