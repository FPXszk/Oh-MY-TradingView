# Night Batch Self Hosted Run 67

- workflow: `Night Batch Self Hosted`
- run_number: `67`
- run_id: `24948625082`
- status: `success`
- campaign: `strongest-vs-profit-protect-us40-10pack`
- artifact_root: `artifacts/campaigns/strongest-vs-profit-protect-us40-10pack/`
- detailed_report: `../reports/archive/night-batch-self-hosted-run67.md`

## 結果

- smoke: `10 / 10` success
- full: `400 / 400` success
- failure: `0`
- unreadable: `0`

## performance ranking

この run の戦略別ランキングは `artifacts/campaigns/strongest-vs-profit-protect-us40-10pack/full/strategy-ranking.json` を正本とし、current では `artifacts-backtest-scoreboards.md` に集約します。

上位 3 戦略:

| rank | strategy | avg_net_profit | avg_profit_factor | avg_max_drawdown |
| ---: | --- | ---: | ---: | ---: |
| 1 | `donchian-60-20-rsp-rsi14-regime60-tp25-25-tp100-50` | 12858.23 | 1.468 | 4803.22 |
| 2 | `donchian-60-20-rsp-rsi14-regime60-tp30-33-tp100-50` | 12289.95 | 1.463 | 4687.08 |
| 3 | `donchian-60-20-rsp-rsi14-regime60-tp30-20-tp100-50` | 12104.69 | 1.462 | 4604.94 |

## メモ

- strongest 非TP基準 `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` は direct comparison で 4 位でした。
- 1 位 `tp25-25-tp100-50` は strongest 非TP基準より avg net profit で `205.25` 低い一方、profit factor・drawdown・win rate は少し良化しました。
- 今回の示唆は「profit-protect は不要ではないが、勝ち筋は TP1 の早い保護側にある」です。
