# Night batch summary 20260410_133354_production

- status: SUCCESS
- command: production-child
- host: 127.0.0.1
- port: 40809
- preflight_required: True

## Steps

| step | success | skipped | exit_code | timed_out | latest_checkpoint |
| --- | --- | --- | ---: | --- | --- |
| preflight | True | False | 0 | False | — |
| production | True | False | 0 | False | docs/research/results/campaigns/next-long-run-us-finetune-100x10/full/checkpoint-40.json |

## Commands

### preflight

`GET http://127.0.0.1:40809/json/list`

### production

`/tmp/night-batch-test-QTbXcO/fake-node.sh /home/fpxszk/code/Oh-MY-TradingView/scripts/backtest/run-finetune-bundle.mjs --host 127.0.0.1 --ports 40809 --phases full --us-campaign next-long-run-us-finetune-100x10 --jp-campaign next-long-run-jp-finetune-100x10`

