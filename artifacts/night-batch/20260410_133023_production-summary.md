# Night batch summary 20260410_133023_production

- status: SUCCESS
- command: production-child
- host: 127.0.0.1
- port: 45711
- preflight_required: True

## Steps

| step | success | skipped | exit_code | timed_out | latest_checkpoint |
| --- | --- | --- | ---: | --- | --- |
| preflight | True | False | 0 | False | — |
| production | True | False | 0 | False | — |

## Commands

### preflight

`GET http://127.0.0.1:45711/json/list`

### production

`/tmp/night-batch-test-TmYIxi/fake-node.sh /home/fpxszk/code/Oh-MY-TradingView/src/cli/index.js backtest preset rsi-mean-reversion --symbol NVDA`

