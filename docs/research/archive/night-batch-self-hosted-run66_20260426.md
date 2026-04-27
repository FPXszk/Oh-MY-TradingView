# Night Batch Self Hosted Run 66

- workflow: `Night Batch Self Hosted`
- run_number: `66`
- run_id: `24898124720`
- status: `success`
- campaign: `selected-us40-10pack`
- artifact_root: `artifacts/campaigns/selected-us40-10pack/`
- detailed_report: `../reports/archive/night-batch-self-hosted-run66.md`

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
| 1 | `donchian-60-20-rsp-rsi14-regime60-tp25-25-tp100-50` | 12858.23 | 1.468 | 4803.22 |
| 2 | `donchian-60-20-rsp-rsi14-regime60-tp30-33-tp100-50` | 12289.95 | 1.463 | 4687.08 |
| 3 | `donchian-60-20-rsp-rsi14-regime60-tp30-20-tp100-50` | 12104.69 | 1.462 | 4604.94 |

## メモ

- run64 から risk sizing を外した 10pack 比較へ切り替わり、首位は `tp30-25-tp120-50-risk1` から `tp25-25-tp100-50` に入れ替わりました。
- `tp30-25-tp90-50` は追加された中間案でしたが full ranking では 9 位でした。
- 以後の current 比較は `docs/research/artifacts-backtest-scoreboards.md` を見れば、artifact 保存済み campaign のランキング表をそのまま確認できます。
