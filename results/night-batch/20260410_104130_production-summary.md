# Night batch summary 20260410_104130_production

- status: SUCCESS
- command: production-child
- host: 172.31.144.1
- port: 9223
- preflight_required: True

## Steps

| step | success | skipped | exit_code | timed_out | latest_checkpoint |
| --- | --- | --- | ---: | --- | --- |
| preflight | True | False | 0 | False | — |
| production | True | False | 0 | False | — |

## Commands

### preflight

`GET http://172.31.144.1:9223/json/list`

### production

`node /home/fpxszk/code/Oh-MY-TradingView/src/cli/index.js backtest preset ema-cross-9-21 --symbol NVDA --date-from 2000-01-01 --date-to 2099-12-31`

