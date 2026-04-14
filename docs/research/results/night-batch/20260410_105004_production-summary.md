# Night batch summary 20260410_105004_production

- status: SUCCESS
- command: production-child
- host: 127.0.0.1
- port: 37057
- preflight_required: True

## Steps

| step | success | skipped | exit_code | timed_out | latest_checkpoint |
| --- | --- | --- | ---: | --- | --- |
| preflight | True | False | 0 | False | — |
| production | True | False | 0 | False | — |

## Commands

### preflight

`GET http://127.0.0.1:37057/json/list`

### production

`/tmp/night-batch-test-rl9lqS/fake-node.sh /home/fpxszk/code/Oh-MY-TradingView/src/cli/index.js backtest preset rsi-mean-reversion --symbol NVDA`

