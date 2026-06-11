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
        '## Phase4 個別銘柄ランキング (Electronic Technology)',
        '',
        '| 順位 | 中テーマ | 小テーマ | シンボル | 市場 |',
        '|:---:|:---|:---|:---|:---:|',
        '| 1 | Memory | NAND / Storage | **WDC** | NASDAQ |',
        '| 2 | Memory | NAND / Storage | **STX** | NASDAQ |',
        '| 3 | Memory | HBM / DRAM | **MU** | NASDAQ |',
      ].join('\n'),
    });

    assert.match(text, /daily-screener 完了/);
    assert.match(text, /Phase1 1位: Electronic Technology/);
    assert.match(text, /Top3: WDC, STX, MU/);
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
      reportText: '',
    });

    assert.match(text, /daily-screener-japan 失敗/);
    assert.match(text, /run_attempt: 2/);
    assert.match(text, /report は未生成または未読込/);
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
