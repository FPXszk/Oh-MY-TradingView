import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildGithubRunUrl,
  buildLineMessageRequest,
  buildScreenerNotificationText,
  shouldSkipLineNotification,
} from '../scripts/line/send-screener-line-message.mjs';

describe('LINE screener notification helpers', () => {
  it('builds a compact success notification for the US screener report', () => {
    const text = buildScreenerNotificationText({
      status: 'success',
      workflowLabel: 'daily-screener',
      repository: 'FPXszk/Oh-MY-TradingView',
      runId: '26924672477',
      runAttempt: '1',
      refName: 'main',
      audit: {
        status: 'warning',
        summary: { newTop10Entries: 1, warnings: 2 },
        rankChanges: [{ symbol: '4634', rankDelta: 5 }],
        metricAnomalies: [{ symbol: '4634', metricName: 'fcfMargin', reasons: ['diff'] }],
      },
      reportText: [
        '# スクリーニング結果 2026/06/04（木）',
        '',
        '更新: 10:41 JST',
        '',
        'セクター別取得候補 250銘柄 → ユニバース条件通過 154銘柄 → ランキング対象 144銘柄 → レポート掲載 90銘柄',
        '',
        '## Phase1 セクターランキング',
        '',
        '| 順位 | セクター | 平均12M |',
        '|:---:|:---|---:|',
        '| 1 | Electronic Technology | 233.1% |',
        '',
        '## Phase4 個別銘柄ランキング',
        '',
        '| 順位 | セクター | Industry | シンボル | 市場 |',
        '|:---:|:---|:---|:---|:---:|',
        '| 1 | Electronic Technology | Computer Peripherals | **WDC** | NASDAQ |',
        '| 2 | Electronic Technology | Computer Peripherals | **STX** | NASDAQ |',
        '| 3 | Electronic Technology | Semiconductors | **MU** | NASDAQ |',
      ].join('\n'),
    });

    assert.match(text, /daily-screener 完了/);
    assert.match(text, /Phase1 1位: Electronic Technology/);
    assert.match(text, /Top3: WDC, STX, MU/);
    assert.match(text, /監査: WARNING/);
    assert.match(text, /財務指標警告: 2件/);
    assert.match(text, /run: https:\/\/github\.com\/FPXszk\/Oh-MY-TradingView\/actions\/runs\/26924672477/);
  });

  it('builds a failure notification without requiring report output', () => {
    const text = buildScreenerNotificationText({
      status: 'failure',
      workflowLabel: 'daily-screener-japan',
      repository: 'FPXszk/Oh-MY-TradingView',
      runId: '26950254326',
      runAttempt: '2',
      refName: 'main',
      audit: {
        status: 'critical',
        summary: { errors: 1 },
        criticals: [{ symbol: '2222', metricName: 'fcfMargin', reason: 'top3_rank_ineligible_metric_used' }],
      },
      reportText: '',
    });

    assert.match(text, /daily-screener-japan 失敗/);
    assert.match(text, /run_attempt: 2/);
    assert.match(text, /監査: CRITICAL/);
    assert.match(text, /重大エラー: 1件/);
  });

  it('skips notification when the required LINE secrets are absent', () => {
    assert.equal(
      shouldSkipLineNotification({
        channelAccessToken: '',
        toUserId: 'U123',
      }),
      true,
    );
    assert.equal(
      shouldSkipLineNotification({
        channelAccessToken: 'token',
        toUserId: '',
      }),
      true,
    );
    assert.equal(
      shouldSkipLineNotification({
        channelAccessToken: 'token',
        toUserId: 'U123',
      }),
      false,
    );
  });

  it('builds the push payload with a single text message', () => {
    const request = buildLineMessageRequest({
      toUserId: 'U1234567890',
      text: 'hello',
    });

    assert.deepEqual(request, {
      to: 'U1234567890',
      messages: [
        {
          type: 'text',
          text: 'hello',
        },
      ],
    });
  });

  it('builds the GitHub Actions run URL from repository and run id', () => {
    assert.equal(
      buildGithubRunUrl('FPXszk/Oh-MY-TradingView', '26924672477'),
      'https://github.com/FPXszk/Oh-MY-TradingView/actions/runs/26924672477',
    );
  });
});
