# Night batch summary 20260410_112955_production

- status: SUCCESS
- command: production-child
- host: 127.0.0.1
- port: 45893
- preflight_required: True

## Steps

| step | success | skipped | exit_code | timed_out | latest_checkpoint |
| --- | --- | --- | ---: | --- | --- |
| preflight | True | False | 0 | False | — |
| production | True | False | 0 | False | results/campaigns/next-long-run-us-finetune-100x10/full/checkpoint-490.json |

## Commands

### preflight

`GET http://127.0.0.1:45893/json/list`

### production

`/tmp/night-batch-test-z8YTwS/fake-node.sh /home/fpxszk/code/Oh-MY-TradingView/scripts/backtest/run-finetune-bundle.mjs --host 127.0.0.1 --ports 45893 --phases full --us-campaign next-long-run-us-finetune-100x10 --jp-campaign next-long-run-jp-finetune-100x10`

