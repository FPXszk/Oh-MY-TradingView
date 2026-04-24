# Night Batch Self Hosted Run 64

- workflow: `Night Batch Self Hosted`
- run_number: `64`
- run_id: `24872765258`
- status: `success`
- campaign: `selected-us40-10pack`
- artifact_root: `artifacts/campaigns/selected-us40-10pack/`
- detailed_report: `../reports/night-batch-self-hosted-run64.md`

## 結果

- smoke: `10 / 10` success
- full: `400 / 400` success
- failure: `0`
- unreadable: `0`

## performance ranking

この run の戦略別ランキングは `artifacts/campaigns/selected-us40-10pack/full/strategy-ranking.json` を正本とし、current では `artifacts-backtest-scoreboards.md` に集約します。

上位 3 戦略:

| rank | strategy | avg_net_profit | avg_profit_factor | avg_max_drawdown |
| ---: | --- | ---: | ---: | ---: |
| 1 | `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp120-50-risk1` | 722.50 | 1.548 | 399.92 |
| 2 | `donchian-60-20-rsp-rsi14-regime60-tp30-33-tp100-50-risk1` | 717.72 | 1.547 | 399.68 |
| 3 | `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp80-50-risk1` | 721.63 | 1.547 | 399.92 |

## メモ

- GitHub workflow artifact には round directory だけでなく campaign artifact も含めるように修正済みです。
- 以後の current 比較は `docs/research/current/artifacts-backtest-scoreboards.md` を見れば、artifact 保存済み campaign のランキング表をそのまま確認できます。
