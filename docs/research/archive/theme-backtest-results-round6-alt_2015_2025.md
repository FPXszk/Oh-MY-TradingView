# Round6 テーマトレンド・マルチユニバース結果 (2015-2025)

## メタデータ

- raw-source-core: `../references/backtests/round6-theme-alt_20260405.json`
- summary-source-core: `../references/backtests/round6-theme-alt_20260405.summary.json`
- raw-source-extension: `../references/backtests/round6-theme-alt-extension_20260405.json`
- summary-source-extension: `../references/backtests/round6-theme-alt-extension_20260405.summary.json`
- combined-run-count: `160`
- combined-success-count: `160`
- combined-tester-available-count: `160`
- universes: `sp500-top10-point-in-time`, `mega-cap-ex-nvda`
- selected-strategy-count: `8`

## 結論

round6 の alt では、**55/20 breadth / persistence 系が明確に勝った**。  
首位は `donchian-55-20-rsp-filter-rsi14-regime-50`、2 位は `donchian-55-20-spy-filter-rsi14-regime-55`、3 位は `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct` で、round5 で強かった 20/10 robust 系よりも今回は 55/20 の継続テーマ proxy が優位だった。

追加で回した `20/10 + 10% stop` extension も確認したが、**best acceleration candidate は `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-10pct` に留まり、55/20 上位陣は超えなかった**。  
つまり round6 のテーマ投資 proxy では、`20/10` は初動捕捉の補完としては有効でも、**主力は breadth を伴う 55/20** と読むのが妥当だった。

今回の alt は `160 / 160` で tester metrics が欠測せず、Mag7 よりかなり綺麗に比較できた。  
そのぶん round6 では、**Mag7 側の NVDA ブーストを剥がしたあとも残る戦略** がはっきり見えた。

## universe_summary

| universe | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | best_combo |
|---|---:|---:|---:|---:|---|
| `mega-cap-ex-nvda` | 6941.37 | 2.029 | 3211.04 | 48.23 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct × META` |
| `sp500-top10-point-in-time` | 6812.54 | 1.921 | 3301.70 | 47.70 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct × META` |

## cross-universe comparison

| strategy_id | mag7 avg_net_profit | sp500 avg_net_profit | mega-cap ex NVDA avg_net_profit | 解釈 |
|---|---:|---:|---:|---|
| `donchian-55-20-rsp-filter-rsi14-regime-50` | 31904.60 | 8418.29 | 8363.76 | round6 の最有力 robust candidate。breadth を伴う persistence proxy |
| `donchian-55-20-spy-filter-rsi14-regime-55` | 38692.75 | 8237.49 | 8338.16 | alt でも高水準を維持。quality を保った本線 |
| `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct` | 31592.58 | 7575.24 | 7600.85 | stop で品質改善しつつ十分残る。`META` の最強コンボもこの型 |
| `donchian-55-20-spy-filter-rsi14-regime-50-hard-stop-8pct` | 26933.69 | 6164.25 | 6345.06 | 55/20 quality variant としては残るが、RSP 版より一段弱い |
| `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-10pct` | 23804.40 | 6887.49 | 6954.09 | 20/10 系では最良。初動テーマの補完枠として残す価値あり |
| `donchian-20-10-spy-filter-rsi14-regime-55-hard-stop-6pct` | 25824.83 | 6187.29 | 6409.36 | 速い回転を取れるが、alt では 10% stop に負ける |
| `donchian-20-10-rsp-filter-rsi14-regime-50-hard-stop-10pct` | 20067.84 | 5661.12 | 5873.62 | breadth gate は悪くないが、SPY gate より劣後 |
| `donchian-20-10-rsp-filter-rsi14-regime-55-hard-stop-6pct` | 26000.93 | 5369.19 | 5646.06 | Mag7 5 位でも alt では最下位。fast rotation + breadth は過度に厳しかった |

## top strategy-universe pairs

| rank | universe | strategy_id | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | best_symbol |
|---|---|---|---:|---:|---:|---:|---|
| 1 | `sp500-top10-point-in-time` | `donchian-55-20-rsp-filter-rsi14-regime-50` | 8418.29 | 2.349 | 3810.76 | 50.81 | `META` |
| 2 | `mega-cap-ex-nvda` | `donchian-55-20-rsp-filter-rsi14-regime-50` | 8363.76 | 2.431 | 3687.53 | 51.37 | `META` |
| 3 | `mega-cap-ex-nvda` | `donchian-55-20-spy-filter-rsi14-regime-55` | 8338.16 | 2.643 | 2867.00 | 51.00 | `META` |
| 4 | `sp500-top10-point-in-time` | `donchian-55-20-spy-filter-rsi14-regime-55` | 8237.49 | 2.414 | 3024.39 | 50.11 | `META` |
| 5 | `mega-cap-ex-nvda` | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct` | 7600.85 | 2.312 | 3442.30 | 49.70 | `META` |
| 6 | `sp500-top10-point-in-time` | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct` | 7575.24 | 2.216 | 3569.69 | 49.41 | `META` |
| 7 | `mega-cap-ex-nvda` | `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-10pct` | 6954.09 | 1.714 | 3155.06 | 47.28 | `AAPL` |
| 8 | `sp500-top10-point-in-time` | `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-10pct` | 6887.49 | 1.678 | 3223.25 | 47.18 | `AAPL` |
| 9 | `mega-cap-ex-nvda` | `donchian-20-10-spy-filter-rsi14-regime-55-hard-stop-6pct` | 6409.36 | 1.688 | 3169.92 | 46.42 | `AAPL` |
| 10 | `mega-cap-ex-nvda` | `donchian-55-20-spy-filter-rsi14-regime-50-hard-stop-8pct` | 6345.06 | 2.253 | 2799.07 | 48.63 | `MSFT` |

## top_combos

| rank | universe | strategy_id | symbol | net_profit | profit_factor | max_drawdown | win_rate |
|---|---|---|---|---:|---:|---:|---:|
| 1 | `sp500-top10-point-in-time` | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct` | `META` | 29187.99 | 6.522 | 4477.17 | 64.71 |
| 2 | `mega-cap-ex-nvda` | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct` | `META` | 29187.99 | 6.522 | 4477.17 | 64.71 |
| 3 | `sp500-top10-point-in-time` | `donchian-55-20-rsp-filter-rsi14-regime-50` | `META` | 27732.34 | 5.222 | 5708.56 | 64.71 |
| 4 | `mega-cap-ex-nvda` | `donchian-55-20-rsp-filter-rsi14-regime-50` | `META` | 27732.34 | 5.222 | 5708.56 | 64.71 |
| 5 | `sp500-top10-point-in-time` | `donchian-20-10-spy-filter-rsi14-regime-55-hard-stop-6pct` | `AAPL` | 22988.26 | 3.491 | 3446.81 | 68.75 |
| 6 | `mega-cap-ex-nvda` | `donchian-20-10-spy-filter-rsi14-regime-55-hard-stop-6pct` | `AAPL` | 22988.26 | 3.491 | 3446.81 | 68.75 |
| 7 | `sp500-top10-point-in-time` | `donchian-20-10-rsp-filter-rsi14-regime-55-hard-stop-6pct` | `AAPL` | 21993.90 | 3.089 | 2886.28 | 66.67 |
| 8 | `mega-cap-ex-nvda` | `donchian-20-10-rsp-filter-rsi14-regime-55-hard-stop-6pct` | `AAPL` | 21993.90 | 3.089 | 2886.28 | 66.67 |
| 9 | `sp500-top10-point-in-time` | `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-10pct` | `AAPL` | 21008.38 | 3.067 | 3625.84 | 66.67 |
| 10 | `mega-cap-ex-nvda` | `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-10pct` | `AAPL` | 21008.38 | 3.067 | 3625.84 | 66.67 |

## bottom_combos

| rank | universe | strategy_id | symbol | net_profit | profit_factor | max_drawdown | win_rate |
|---|---|---|---|---:|---:|---:|---:|
| 1 | `sp500-top10-point-in-time` | `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-10pct` | `JNJ` | -189.82 | 0.976 | 3281.45 | 35.56 |
| 2 | `mega-cap-ex-nvda` | `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-10pct` | `JNJ` | -189.82 | 0.976 | 3281.45 | 35.56 |
| 3 | `sp500-top10-point-in-time` | `donchian-55-20-spy-filter-rsi14-regime-55` | `JNJ` | -94.75 | 0.983 | 3632.93 | 45.83 |
| 4 | `mega-cap-ex-nvda` | `donchian-55-20-spy-filter-rsi14-regime-55` | `JNJ` | -94.75 | 0.983 | 3632.93 | 45.83 |
| 5 | `sp500-top10-point-in-time` | `donchian-20-10-rsp-filter-rsi14-regime-55-hard-stop-6pct` | `JNJ` | 426.19 | 1.055 | 3999.96 | 39.02 |
| 6 | `mega-cap-ex-nvda` | `donchian-20-10-rsp-filter-rsi14-regime-55-hard-stop-6pct` | `JNJ` | 426.19 | 1.055 | 3999.96 | 39.02 |
| 7 | `sp500-top10-point-in-time` | `donchian-20-10-rsp-filter-rsi14-regime-55-hard-stop-6pct` | `BRK.B` | 704.01 | 1.087 | 2868.24 | 42.22 |
| 8 | `mega-cap-ex-nvda` | `donchian-20-10-rsp-filter-rsi14-regime-55-hard-stop-6pct` | `BRK.B` | 704.01 | 1.087 | 2868.24 | 42.22 |
| 9 | `sp500-top10-point-in-time` | `donchian-55-20-spy-filter-rsi14-regime-50-hard-stop-8pct` | `JNJ` | 742.37 | 1.148 | 2992.81 | 47.83 |
| 10 | `mega-cap-ex-nvda` | `donchian-55-20-spy-filter-rsi14-regime-50-hard-stop-8pct` | `JNJ` | 742.37 | 1.148 | 2992.81 | 47.83 |

## round6 の整理

- **非NVDA再現型**: `donchian-55-20-rsp-filter-rsi14-regime-50`, `donchian-55-20-spy-filter-rsi14-regime-55`
- **品質改善型**: `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct`, `donchian-55-20-spy-filter-rsi14-regime-50-hard-stop-8pct`
- **加速テーマ補完型**: `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-10pct`

round5 では alt 最適が 20/10 hard-stop 系だったが、round6 では **RSP / SPY filter + RSI regime を重ねた 55/20 が alt 最適へ戻った**。  
今回は明確な「NVDA だけで持ち上がる本命」は上位から後退し、**breadth を伴う persistence proxy の方が robust** だった。

## bad-strategy 判定

combined alt の strategy-universe pair で **`avg_net_profit < 0` の行は 0 件** だった。  
弱い個別コンボは `JNJ` と一部 `XOM` に集中したが、平均ではすべてプラスを維持している。

## tester metrics 欠測メモ

round6 alt core は `120 / 120`、extension は `40 / 40` で、**欠測 0 run** だった。  
そのため alt 側の比較は Mag7 より素直に読める。

## 解釈メモ

- `RSP > 200SMA` を通す 55/20 が最上位に来たことで、**テーマの breadth を伴う継続性** が最も強い proxy だった
- `SPY > 200SMA` + 55/20 も僅差で続き、breadth が弱くても地合い整合の persistence は十分効いた
- `20/10 + 10% stop` は extension で確認しても 55/20 上位を超えず、**round6 では主役より補完枠**
- 20/10 の best combo は `AAPL` 側に偏り、55/20 の best combo は `META` 側に偏った
- 弱い銘柄は `JNJ` と `BRK.B` に集まり、テーマトレンド proxy が効きにくい防御・低回転銘柄が今回も残った

## 関連 docs

- Mag7 round6: [`theme-backtest-results-round6_2015_2025.md`](./theme-backtest-results-round6_2015_2025.md)
- theme signal observation: [`theme-signal-observation-round6_2015_2025.md`](./theme-signal-observation-round6_2015_2025.md)
- theme shortlist: [`theme-strategy-shortlist-round6_2015_2025.md`](./theme-strategy-shortlist-round6_2015_2025.md)
- raw core snapshot: [`../references/backtests/round6-theme-alt_20260405.json`](../references/backtests/round6-theme-alt_20260405.json)
- summary core snapshot: [`../references/backtests/round6-theme-alt_20260405.summary.json`](../references/backtests/round6-theme-alt_20260405.summary.json)
- raw extension snapshot: [`../references/backtests/round6-theme-alt-extension_20260405.json`](../references/backtests/round6-theme-alt-extension_20260405.json)
- summary extension snapshot: [`../references/backtests/round6-theme-alt-extension_20260405.summary.json`](../references/backtests/round6-theme-alt-extension_20260405.summary.json)
