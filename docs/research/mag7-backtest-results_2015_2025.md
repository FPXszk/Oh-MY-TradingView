# Mag7 バックテスト結果サマリ (2015-2025)

## メタデータ

- raw-source: `../references/backtests/mag7-backtest-results_20260404.json`
- run-count: `70`
- success-count: `70`
- symbols: `AAPL`, `MSFT`, `GOOGL`, `AMZN`, `META`, `NVDA`, `TSLA`
- core-strategies: `sma-200-trend-filter`, `donchian-breakout`, `supertrend-atr`

## 実行条件

- 期間: `2015-01-01` 〜 `2025-12-31`
- 初期資金: `10000 USD`
- 時間足: 日足 (`D`)
- 比較前提: long-only / 手数料 0 / slippage 0 / 100% of equity
- 実行時に確認した session-specific endpoint: `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223`
- 生データの正本: [`mag7-backtest-results_20260404.json`](../references/backtests/mag7-backtest-results_20260404.json)
- 実行 input:
  - strategy presets: [`../../config/backtest/strategy-presets.json`](../../config/backtest/strategy-presets.json)
  - symbol universe: [`../../config/backtest/universes/mag7.json`](../../config/backtest/universes/mag7.json)

## この run で使った戦略定義

| strategy_id | builder | executed-rule |
|---|---|---|
| `sma-cross-5-20` | `ma_cross` | `SMA(5)` が `SMA(20)` を上抜けで買い、下抜けで決済 |
| `sma-200-trend-filter` | `price_vs_ma` | 終値が `SMA(200)` を上抜けで買い、下抜けで決済 |
| `ema-cross-9-21` | `ma_cross` | `EMA(9)` が `EMA(21)` を上抜けで買い、下抜けで決済 |
| `macd-signal` | `macd_signal` | `MACD(12,26,9)` の MACD ラインが signal を上抜けで買い、下抜けで決済 |
| `rsi-mean-reversion` | `rsi_mean_reversion` | `RSI(14) < 30` で買い、`RSI(14) > 55` で決済 |
| `connors-rsi-pullback` | `connors_rsi_pullback` | `CRSI(3,2,100) < 15` で買い、`CRSI > 70` で決済 |
| `bb-mean-revert` | `bollinger_mean_reversion` | `BB(20,2)` の下限割れで買い、basis 上抜けで決済 |
| `donchian-breakout` | `donchian_breakout` | `20` 日高値更新で買い、`10` 日安値割れで決済 |
| `supertrend-atr` | `supertrend` | `Supertrend(ATR 10, factor 3)` の上昇転換で買い、下降転換で決済 |
| `adx-ema-filter` | `adx_filtered_ma` | `EMA(20) > EMA(50)` へのクロスかつ `ADX(7) > 25` で買い、逆クロスまたは `ADX < 25` で決済 |

## 結論

今回の 70 run では、**長期トレンド追随系が最も強かった**。とくに `sma-200-trend-filter` は平均純利益で突出し、`donchian-breakout` と `supertrend-atr` も Mag7 全体で安定した上位に入った。

一方で、銘柄別には **NVDA の寄与が極端に大きい**。そのため、上位戦略の次回改善では「高リターン維持」だけでなく「ドローダウン抑制」と「NVDA 依存の緩和」を重視する。

## 戦略別パフォーマンス一覧

| rank | strategy_id | strategy_name | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | best_symbol |
|---|---|---|---:|---:|---:|---:|---|
| 1 | `sma-200-trend-filter` | 200 Day SMA Trend Filter | 432586.22 | 4.246 | 46841.85 | 33.30 | `NVDA` |
| 2 | `donchian-breakout` | Donchian Breakout 20/10 | 44164.68 | 2.123 | 13535.99 | 48.65 | `NVDA` |
| 3 | `supertrend-atr` | Supertrend ATR 10/3 | 43366.69 | 2.515 | 11264.78 | 48.93 | `NVDA` |
| 4 | `ema-cross-9-21` | EMA Cross 9/21 | 24247.63 | 1.964 | 13099.83 | 36.40 | `NVDA` |
| 5 | `sma-cross-5-20` | SMA Cross 5/20 | 21280.28 | 1.842 | 8526.40 | 43.72 | `NVDA` |
| 6 | `connors-rsi-pullback` | Connors RSI Pullback | 21271.37 | 3.290 | 5864.65 | 74.58 | `NVDA` |
| 7 | `bb-mean-revert` | Bollinger Mean Reversion | 13098.73 | 2.891 | 6186.54 | 76.57 | `NVDA` |
| 8 | `macd-signal` | MACD Signal Cross | 11585.41 | 1.533 | 7144.96 | 45.98 | `TSLA` |
| 9 | `rsi-mean-reversion` | RSI Oversold Bounce | 7876.31 | 13.464 | 5940.03 | 74.89 | `TSLA` |
| 10 | `adx-ema-filter` | ADX-Filtered EMA Trend | 6325.96 | 5.432 | 2772.25 | 49.74 | `META` |

## Core Strategies (上位3)

今後このプロジェクトで優先的に改善する **core strategies** は次の 3 つとする。

| rank | strategy_id | avg_net_profit | avg_profit_factor | avg_max_drawdown | strength | weakness | next-experiment |
|---|---|---:|---:|---:|---|---|---|
| 1 | `sma-200-trend-filter` | 432586.22 | 4.246 | 46841.85 | リターンが圧倒的でルールも単純 | NVDA 寄与が大きく、DD も重い | ATR stop や利確ルール追加で DD 抑制を試す |
| 2 | `donchian-breakout` | 44164.68 | 2.123 | 13535.99 | breakout 系として安定し、Mag7 全体で崩れにくい | ボックス相場では損切りが増えやすい | ADX や長期トレンドフィルタ併用を試す |
| 3 | `supertrend-atr` | 43366.69 | 2.515 | 11264.78 | PF と DD のバランスが良い | パラメータ依存がやや強い | ATR length / multiplier の grid を試す |

## 銘柄別の傾向

| symbol | avg_net_profit | avg_profit_factor | best_strategy | best_net_profit |
|---|---:|---:|---|---:|
| `NVDA` | 352703.77 | 3.851 | `sma-200-trend-filter` | 2940215.11 |
| `META` | 19138.93 | 4.842 | `supertrend-atr` | 51640.71 |
| `AAPL` | 16818.53 | 3.088 | `supertrend-atr` | 44020.86 |
| `TSLA` | 15205.59 | 1.503 | `donchian-breakout` | 48293.64 |
| `AMZN` | 14142.20 | 8.008 | `sma-cross-5-20` | 34101.59 |
| `MSFT` | 10513.09 | 3.423 | `sma-cross-5-20` | 24194.60 |
| `GOOGL` | 9540.19 | 2.795 | `sma-200-trend-filter` | 41191.11 |

## 注目コンボ

### 上位 5 コンボ

| rank | strategy_id | symbol | net_profit | profit_factor | max_drawdown | closed_trades |
|---|---|---|---:|---:|---:|---:|
| 1 | `sma-200-trend-filter` | `NVDA` | 2940215.11 | 10.252 | 295665.25 | 10 |
| 2 | `supertrend-atr` | `NVDA` | 189147.94 | 5.276 | 39451.24 | 25 |
| 3 | `donchian-breakout` | `NVDA` | 162788.12 | 2.341 | 51122.19 | 42 |
| 4 | `ema-cross-9-21` | `NVDA` | 84988.47 | 2.310 | 48695.69 | 24 |
| 5 | `connors-rsi-pullback` | `NVDA` | 54804.73 | 7.521 | 4852.77 | 48 |

### 下位 5 コンボ

| rank | strategy_id | symbol | net_profit | profit_factor | max_drawdown | closed_trades |
|---|---|---|---:|---:|---:|---:|
| 1 | `adx-ema-filter` | `TSLA` | -1964.96 | 0.589 | 5201.74 | 14 |
| 2 | `sma-cross-5-20` | `GOOGL` | -970.12 | 0.913 | 4400.61 | 61 |
| 3 | `adx-ema-filter` | `GOOGL` | 201.67 | 1.107 | 1615.74 | 9 |
| 4 | `adx-ema-filter` | `MSFT` | 645.80 | 1.244 | 2574.83 | 10 |
| 5 | `sma-200-trend-filter` | `META` | 953.30 | 1.194 | 3945.25 | 19 |

## コンパイル warning の注記

- `sma-cross-5-20`, `ema-cross-9-21`, `macd-signal`, `supertrend-atr` は、`ta.crossover()` / `ta.crossunder()` を条件式内で直接呼んでいるため、Pine compile warning を各 7 run で出している
- 今回はすべての run で metrics を取得できたため結果自体は保存しているが、将来 repo 本体へ実装する際は warning を解消した版で再確認する
- core strategy のうち、warning があるのは `supertrend-atr`、warning が無いのは `sma-200-trend-filter` と `donchian-breakout`

## 解釈上の注意点

- この文書は **summary** であり、個別 run の全数値は raw JSON を正本とする
- `avg_*` 列は **7 銘柄の単純平均** であり、portfolio 全体を束ねた equity 曲線ではない
- endpoint の記述は **この run を取得したセッション時点の実行前提** であり、恒久設定を意味しない
- `sma-200-trend-filter` の優位性は大きいが、`NVDA` の長期上昇を強く反映している
- 平均回帰系は平均純利益では劣る一方、`connors-rsi-pullback` や `bb-mean-revert` は PF と win rate が高い
- `adx-ema-filter` は DD は小さいが、今回条件ではリターンの伸びが弱い

## 次の改善候補

1. `sma-200-trend-filter` に損失抑制ルールを追加して DD を下げる
2. `donchian-breakout` にトレンドフィルタを追加してレンジ損失を減らす
3. `supertrend-atr` のパラメータ探索を行い、Mag7 全体での安定性を確認する

## 関連 docs

- 候補一覧: [`mag7-strategy-shortlist_2015_2025.md`](./mag7-strategy-shortlist_2015_2025.md)
- raw snapshot: [`mag7-backtest-results_20260404.json`](../references/backtests/mag7-backtest-results_20260404.json)
- strategy presets: [`../../config/backtest/strategy-presets.json`](../../config/backtest/strategy-presets.json)
- symbol universe: [`../../config/backtest/universes/mag7.json`](../../config/backtest/universes/mag7.json)
- session log: [`../working-memory/session-logs/mag7-backtest-session-summary_20260404_1106.md`](../working-memory/session-logs/mag7-backtest-session-summary_20260404_1106.md)
