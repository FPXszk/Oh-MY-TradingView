# Mag7 バックテスト結果サマリ round4 (2015-2025)

## メタデータ

- raw-source: `../references/backtests/breakout-deep-dive-round4_20260405.json`
- summary-source: `../references/backtests/breakout-deep-dive-round4_20260405.summary.json`
- run-count: `140`
- success-count: `140`
- tester-available-count: `137`
- symbols: `AAPL`, `MSFT`, `GOOGL`, `AMZN`, `META`, `NVDA`, `TSLA`
- strategy-count: `20`

## 実行条件

- 期間: `2015-01-01` 〜 `2025-12-31`
- 初期資金: `10000 USD`
- 時間足: 日足 (`D`)
- 比較前提: long-only / 手数料 0 / slippage 0 / 100% of equity
- 実行 endpoint: `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223`
- input:
  - strategy presets: [`../../config/backtest/strategy-presets.json`](../../config/backtest/strategy-presets.json)
  - symbol universe: [`../../config/backtest/universes/mag7.json`](../../config/backtest/universes/mag7.json)
- 実行コンテキスト:
  - round4 は **session artifact runner** で実行
  - repo CLI / MCP の公開実装は引き続き `nvda-ma` 固定

## 結論

round4 は **20 戦略 × 7 銘柄 = 140 run** を完走し、TradingView tester metrics は **137 run** で取得できた。  
Mag7 上では **Donchian 系の優位がさらに明確** になり、平均純利益の首位は `donchian-20-10-hard-stop-8pct`、そのすぐ後ろに `donchian-55-20-baseline`、`donchian-55-20-spy-filter`、`donchian-20-10-baseline` が並んだ。

ただし「利益の最大化」と「質の改善」は少し分かれた。  
`donchian-20-10-hard-stop-8pct` は平均純利益が最も高い一方、`donchian-55-20-spy-filter` と `donchian-55-20-rsp-filter` は **profit factor が 3 超** まで改善しており、55/20 系に地合いフィルタを足す方向は十分に有望だった。

逆に `2σ exit` は **勝率を大きく上げる代わりにトレンドを早く切り過ぎる** 傾向があり、Keltner 系も baseline は生き残ったが Donchian 上位群には届かなかった。  
また `donchian-55-20-no-avg-down` は `donchian-55-20-baseline` と完全同値で、今回の runner / Pine 生成では **pyramiding=0 により平均ナンピン禁止が既に実質担保されている** ことの確認になった。

## strategy_summary

| rank | strategy_id | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | best_symbol |
|---|---|---:|---:|---:|---:|---|
| 1 | `donchian-20-10-hard-stop-8pct` | 36087.16 | 2.525 | 6838.54 | 49.67 | `NVDA` |
| 2 | `donchian-55-20-baseline` | 34927.25 | 2.712 | 8227.70 | 52.13 | `NVDA` |
| 3 | `donchian-55-20-no-avg-down` | 34927.25 | 2.712 | 8227.70 | 52.13 | `NVDA` |
| 4 | `donchian-55-20-spy-filter` | 34423.58 | 3.090 | 7917.23 | 53.20 | `NVDA` |
| 5 | `donchian-20-10-baseline` | 33872.34 | 2.308 | 8224.23 | 50.81 | `NVDA` |
| 6 | `donchian-55-20-rsp-filter` | 32058.43 | 3.112 | 8205.77 | 53.28 | `NVDA` |
| 7 | `donchian-55-20-hard-stop-atr2` | 30016.44 | 2.614 | 5241.21 | 40.54 | `NVDA` |
| 8 | `donchian-55-20-hard-stop-8pct` | 29970.83 | 2.886 | 5972.80 | 48.21 | `NVDA` |
| 9 | `donchian-55-20-spy-filter-hard-stop` | 24102.17 | 2.766 | 5522.12 | 48.54 | `NVDA` |
| 10 | `keltner-breakout-baseline-r4` | 22044.30 | 1.964 | 5870.14 | 41.80 | `NVDA` |

## Donchian 系の比較

| strategy_id | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | 解釈 |
|---|---:|---:|---:|---:|---|
| `donchian-55-20-baseline` | 34927.25 | 2.712 | 8227.70 | 52.13 | 55/20 系の素の強さ。round4 の基準線 |
| `donchian-55-20-spy-filter` | 34423.58 | 3.090 | 7917.23 | 53.20 | 利益をほぼ保ったまま PF 改善。最も綺麗なフィルタ差分 |
| `donchian-55-20-rsp-filter` | 32058.43 | 3.112 | 8205.77 | 53.28 | SPY より利益は落ちるが PF は最上位 |
| `donchian-55-20-hard-stop-8pct` | 29970.83 | 2.886 | 5972.80 | 48.21 | DD 圧縮が明確。純利益もまだ高い |
| `donchian-55-20-hard-stop-atr2` | 30016.44 | 2.614 | 5241.21 | 40.54 | DD 最小クラス。勝率は下がるが損失抑制は強い |
| `donchian-55-20-2sigma-exit` | 15959.29 | 2.062 | 5755.30 | 72.65 | 勝率は極端に良化するが利益を削り過ぎる |
| `donchian-20-10-baseline` | 33872.34 | 2.308 | 8224.23 | 50.81 | 20/10 は 55/20 より軽快で alt でも残りやすい |
| `donchian-20-10-hard-stop-8pct` | 36087.16 | 2.525 | 6838.54 | 49.67 | round4 全体の平均純利益トップ。20/10 の本命 |

## symbol_summary

| symbol | avg_net_profit | avg_profit_factor | avg_max_drawdown | best_strategy | best_net_profit |
|---|---:|---:|---:|---|---:|
| `NVDA` | 78391.89 | 3.688 | 10685.12 | `donchian-55-20-baseline` | 155063.93 |
| `TSLA` | 29017.58 | 2.018 | 15083.76 | `donchian-20-10-baseline` | 51948.28 |
| `AAPL` | 16377.20 | 2.562 | 3162.86 | `keltner-breakout-baseline-r4` | 32505.06 |
| `META` | 14292.09 | 2.359 | 4269.78 | `donchian-55-20-rsp-filter` | 27732.34 |
| `MSFT` | 8256.64 | 1.955 | 2526.30 | `donchian-55-20-spy-filter-hard-stop` | 13325.36 |
| `AMZN` | 5754.79 | 1.605 | 3765.26 | `donchian-20-10-hard-stop-8pct` | 21827.91 |
| `GOOGL` | 2631.49 | 1.439 | 3673.16 | `donchian-55-20-spy-filter` | 8808.59 |

## top_combos

| rank | strategy_id | symbol | net_profit | profit_factor | max_drawdown | win_rate |
|---|---|---|---:|---:|---:|---:|
| 1 | `donchian-55-20-baseline` | `NVDA` | 155063.93 | 4.893 | 17861.64 | 57.14 |
| 2 | `donchian-55-20-no-avg-down` | `NVDA` | 155063.93 | 4.893 | 17861.64 | 57.14 |
| 3 | `donchian-55-20-spy-filter` | `NVDA` | 150230.10 | 4.678 | 19003.32 | 57.14 |
| 4 | `donchian-55-20-hard-stop-atr2` | `NVDA` | 127000.05 | 5.087 | 9318.67 | 44.00 |
| 5 | `donchian-20-10-hard-stop-8pct` | `NVDA` | 116099.27 | 3.398 | 16142.60 | 43.59 |
| 6 | `donchian-55-20-rsp-filter` | `NVDA` | 112145.93 | 4.780 | 13224.87 | 55.00 |
| 7 | `donchian-55-20-hard-stop-8pct` | `NVDA` | 110886.37 | 4.441 | 9639.31 | 44.00 |
| 8 | `donchian-55-20-spy-filter-hard-stop` | `NVDA` | 84034.13 | 4.170 | 7662.93 | 40.00 |
| 9 | `donchian-55-20-2sigma-exit` | `NVDA` | 79828.51 | 5.724 | 9016.33 | 81.82 |
| 10 | `breakout-bollinger-2sigma-exit` | `NVDA` | 79828.51 | 5.724 | 9016.33 | 81.82 |

## tester metrics 欠測メモ

以下 3 run は strategy tester 自体は開けたが `metrics_unreadable` で DOM / internal API の読み取りに失敗した。  
raw snapshot には `fallback_source = chart_bars_local` の参考値が残っているが、summary 集計には含めていない。

1. `donchian-55-20-rsp-filter × MSFT`
2. `donchian-20-10-baseline × GOOGL`
3. `donchian-20-10-hard-stop-8pct × GOOGL`

## 解釈メモ

- Mag7 だけを見ると **breakout 深掘りは成功** で、上位はほぼ Donchian に収束した
- 55/20 系は filter 追加で PF を改善しやすく、20/10 系は hard stop を足すと利益の押し上げが大きい
- `2σ exit` は「高勝率化」の道具としては有効だが、主目的を純利益最大化に置くと早仕舞いが強すぎる
- `breakout-bollinger-2sigma-exit` は round4 では **2σ exit の同値確認用 preset** として振る舞い、`donchian-55-20-2sigma-exit` と同値だった
- Keltner は baseline が残った一方、今回の範囲では Donchian を上回る差分が出なかった

## 次の改善候補

1. `donchian-20-10-hard-stop-8pct` を本命にして、stop 幅や ATR stop との中間案を試す
2. `donchian-55-20-spy-filter` / `donchian-55-20-rsp-filter` に stop を合わせ、PF と DD の改善幅を詰める
3. `2σ exit` は単独本命ではなく、部分利確や time stop の比較軸として再利用する

## 関連 docs

- multi-universe round4: [`multi-universe-backtest-results-round4_2015_2025.md`](./multi-universe-backtest-results-round4_2015_2025.md)
- raw snapshot: [`../references/backtests/breakout-deep-dive-round4_20260405.json`](../references/backtests/breakout-deep-dive-round4_20260405.json)
- summary snapshot: [`../references/backtests/breakout-deep-dive-round4_20260405.summary.json`](../references/backtests/breakout-deep-dive-round4_20260405.summary.json)
