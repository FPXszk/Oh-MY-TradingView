import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  scoreSbiTarget,
  pickSbiTarget,
  pickBestTextCandidate,
  diffDownloadStates,
  replaceDateRangeInUrl,
  shouldUseMouseDispatch,
  buildCsvDownloadAttemptPlan,
  buildRouteCaptureAttemptPlan,
  buildCaptureSummaryMarkdown,
  hasPendingDownloadFiles,
  shouldRetryRouteCapture,
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

  it('does not select unrelated pages with zero score', () => {
    const target = pickSbiTarget([
      { type: 'page', title: 'about:blank', url: 'about:blank' },
      { type: 'page', title: 'Google', url: 'https://www.google.com/' },
    ]);
    assert.equal(target, null);
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

describe('sbi download mutation detection', () => {
  it('detects added and changed files separately', () => {
    const before = [
      { path: '/tmp/SaveFile.csv', mtimeMs: 1000, size: 100 },
      { path: '/tmp/existing.csv', mtimeMs: 2000, size: 200 },
    ];
    const after = [
      { path: '/tmp/SaveFile.csv', mtimeMs: 3000, size: 150 },
      { path: '/tmp/existing.csv', mtimeMs: 2000, size: 200 },
      { path: '/tmp/new.csv', mtimeMs: 4000, size: 50 },
    ];

    const result = diffDownloadStates(before, after);

    assert.equal(result.hasMutation, true);
    assert.deepEqual(result.changedFiles.map((file) => file.path), ['/tmp/SaveFile.csv']);
    assert.deepEqual(result.addedFiles.map((file) => file.path), ['/tmp/new.csv']);
  });
});

describe('sbi click dispatch strategy', () => {
  it('uses mouse dispatch for plain buttons without form submission', () => {
    assert.equal(shouldUseMouseDispatch({
      tag: 'button',
      type: 'button',
      href: null,
      formAction: null,
    }), true);
    assert.equal(shouldUseMouseDispatch({
      tag: 'button',
      type: 'submit',
      href: null,
      formAction: 'https://example.com/export',
    }), false);
  });
});

describe('sbi csv download retry plan', () => {
  it('retries each keyword set in a second round', () => {
    const attempts = buildCsvDownloadAttemptPlan([
      ['CSV'],
      ['CSVダウンロード'],
    ], 2);

    assert.deepEqual(attempts, [
      { round: 1, keywords: ['CSV'] },
      { round: 1, keywords: ['CSVダウンロード'] },
      { round: 2, keywords: ['CSV'] },
      { round: 2, keywords: ['CSVダウンロード'] },
    ]);
  });
});

describe('sbi route retry plan', () => {
  it('builds sequential route attempts', () => {
    assert.deepEqual(buildRouteCaptureAttemptPlan(2), [1, 2]);
  });
});

describe('sbi download pending detection', () => {
  it('treats temporary browser files as pending downloads', () => {
    assert.equal(hasPendingDownloadFiles([
      { path: '/tmp/report.csv.crdownload' },
    ]), true);
    assert.equal(hasPendingDownloadFiles([
      { path: '/tmp/sbi_assets_summary.csv' },
    ]), false);
  });
});

describe('sbi route retry decision', () => {
  it('retries when route click or csv capture failed', () => {
    assert.equal(shouldRetryRouteCapture({ key: 'realizedDetail' }, {
      clicked: false,
      captured: false,
      csvDownload: { success: false },
    }), true);
    assert.equal(shouldRetryRouteCapture({ key: 'realizedDetail' }, {
      clicked: true,
      captured: true,
      csvDownload: { success: false },
    }), true);
  });

  it('does not force retry for usStocks fallback capture once page was captured', () => {
    assert.equal(shouldRetryRouteCapture({ key: 'usStocks' }, {
      clicked: true,
      captured: true,
      csvDownload: { success: false },
    }), false);
  });
});

describe('sbi history range url replacement', () => {
  it('preserves fixed query params for realized detail routes', () => {
    const result = replaceDateRangeInUrl(
      'https://site.sbisec.co.jp/account/assets/profits?baseDateFrom=2026%2F01%2F01&baseDateTo=2026%2F05%2F20',
      { fromKey: 'baseDateFrom', toKey: 'baseDateTo' },
      '2022/01/01',
      '2026/05/20',
      { baseDateType: 'CONTRACT', product: 'ALL' },
    );

    assert.equal(
      result,
      'https://site.sbisec.co.jp/account/assets/profits?baseDateFrom=2022%2F01%2F01&baseDateTo=2026%2F05%2F20&baseDateType=CONTRACT&product=ALL',
    );
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
      accountAssetsCaptured: true,
      csvDownload: {
        success: true,
        files: [{ relativePath: 'downloads/sbi_assets_summary.csv' }],
      },
      routeCaptures: [
        {
          label: '米国株式',
          attempted: true,
          clicked: true,
          captured: true,
          pageUrl: 'https://site.sbisec.co.jp/account/assets/us',
          snapshotName: 'us-stocks-page',
          formControlCount: 3,
          csvDiagnostics: {
            candidateCount: 1,
            candidates: [
              {
                tag: 'button',
                name: 'download',
                formAction: 'https://site.sbisec.co.jp/account/assets/us/export',
                form: {
                  action: 'https://site.sbisec.co.jp/account/assets/us/export',
                  method: 'post',
                },
              },
            ],
          },
          csvDownload: {
            success: true,
            files: [{ relativePath: 'downloads/sbi_us_stocks.csv' }],
          },
          notes: ['Click result: {"clicked":true}'],
        },
      ],
      notes: ['test note'],
    });

    assert.match(markdown, /# SBI Portfolio Capture Summary/);
    assert.match(markdown, /endpoint_reachable: false/);
    assert.match(markdown, /account_assets_captured: true/);
    assert.match(markdown, /GET \/json\/version failed: fetch failed/);
    assert.match(markdown, /downloads\/sbi_assets_summary\.csv/);
    assert.match(markdown, /## Route Captures/);
    assert.match(markdown, /### 米国株式/);
    assert.match(markdown, /snapshot: us-stocks-page/);
    assert.match(markdown, /form_controls: 3/);
    assert.match(markdown, /csv_candidates: 1/);
    assert.match(markdown, /csv_candidate_tag: button/);
    assert.match(markdown, /csv_candidate_name: download/);
    assert.match(markdown, /csv_candidate_form_action: https:\/\/site\.sbisec\.co\.jp\/account\/assets\/us\/export/);
    assert.match(markdown, /csv_candidate_form_method: post/);
    assert.match(markdown, /downloads\/sbi_us_stocks\.csv/);
    assert.match(markdown, /test note/);
  });
});
