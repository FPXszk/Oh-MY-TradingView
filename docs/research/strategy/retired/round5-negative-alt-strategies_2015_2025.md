# round5 negative alt strategies (2015-2025)

## 判定ルール

以下を bad-strategy とみなす。

- `sp500-top10-point-in-time` または `mega-cap-ex-nvda` のいずれかで
- strategy-universe 平均 `avg_net_profit < 0`

## 結果

round5 では **該当なし**。

| strategy_id | universe | avg_net_profit | avg_profit_factor | avg_max_drawdown | 解釈 |
|---|---|---:|---:|---:|---|
| なし | - | - | - | - | 上位 6 戦略は 2 alt universe とも平均純利益がプラスを維持 |

## 補足

- strategy-universe 平均では全候補がプラスだった
- ただし個別コンボでは `XOM` / `JNJ` に弱い run が残り、最弱は `mega-cap-ex-nvda / donchian-20-10-hard-stop-6pct × XOM` の `-848.95`
- よって round5 の bad-strategy は「平均では不採用なし、個別弱点は残る」という整理になる

## 関連 docs

- [`../research/multi-universe-backtest-results-round5_2015_2025.md`](../research/multi-universe-backtest-results-round5_2015_2025.md)
- [`../references/backtests/breakout-rsi-round5-alt_20260405.summary.json`](../references/backtests/breakout-rsi-round5-alt_20260405.summary.json)
