# Round7 テーマトレンド・マルチユニバース結果 (2015-2025)

## メタデータ

- raw-source: `../references/backtests/round7-theme-alt_20260405.json`
- summary-source: `../references/backtests/round7-theme-alt_20260405.summary.json`
- run-count: `120`
- success-count: `120`
- tester-available-count: `120`
- universes: `sp500-top10-point-in-time`, `mega-cap-ex-nvda`
- selected-strategy-count: `6`

## 結論

round7 の alt では、**55/20 breadth / persistence 系が round6 と同様に本線だったが、勝ち筋の内訳は少し進化した**。  
首位は `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback`、2 位は `donchian-55-20-rsp-filter-rsi14-regime-45-theme-breadth-early`、3 位は `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict` で、上位 5 strategy-universe pair をすべて 55/20 が占めた。

つまり round7 では、

1. **breadth を保ったまま深い押しを許容する型**
2. **breadth を保ったまま entry を少し早める型**
3. **leader 主導テーマを strict quality で通す型**

の 3 本柱が見えた。  
round6 winner の核だった breadth persistence 自体は変わらないが、**deep pullback の許容** と **quality strict の明示化** によって役割分担がよりはっきりした。

加えて alt は `120 / 120` で tester metrics 欠測がなく、round7 では **最終判断をかなり素直に読める**。  
その結果、20/10 系はやはり補完であり、主役は 55/20 側と結論づけやすくなった。

## universe_summary

| universe | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | best_combo |
|---|---:|---:|---:|---:|---|
| `sp500-top10-point-in-time` | 7400.85 | 2.148 | 3271.37 | 48.58 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback` |
| `mega-cap-ex-nvda` | 7363.83 | 2.220 | 3170.81 | 48.91 | `donchian-55-20-rsp-filter-rsi14-regime-45-theme-breadth-early` |

## cross-universe comparison

| strategy_id | mag7 avg_net_profit | alt avg_net_profit | alt avg_profit_factor | alt avg_max_drawdown | alt avg_win_rate | 解釈 |
|---|---:|---:|---:|---:|---:|---|
| `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback` | 24325.84 | 8399.70 | 2.402 | 3620.00 | 50.77 | round7 alt 首位。深い押し許容が breadth persistence の改善として効いた |
| `donchian-55-20-rsp-filter-rsi14-regime-45-theme-breadth-early` | 28332.39 | 8391.03 | 2.390 | 3749.15 | 51.09 | round6 本命の robustness をほぼ維持。早め entry でも崩れていない |
| `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict` | 34423.58 | 8244.46 | 2.503 | 2940.84 | 50.24 | Mag7 首位かつ alt 3 位。leader concentration を扱う本線として採用価値が高い |
| `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-6pct-theme-breadth-quality` | 26501.21 | 6665.89 | 2.029 | 3116.80 | 47.15 | breadth quality は残るが、deep pullback / early breadth に一段劣後 |
| `donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-6pct-theme-quality-strict` | 29037.96 | 6444.56 | 2.155 | 2586.74 | 46.65 | DD は綺麗だが、収益面では strict 60 版に届かない |
| `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-8pct-theme-acceleration-balanced` | 23663.99 | 6148.41 | 1.625 | 3313.02 | 46.56 | AAPL 補完としては有効だが、主力化はしない |

## strategy-universe summary

| rank | universe | strategy_id | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | best_symbol |
|---|---|---|---:|---:|---:|---:|---|
| 1 | `sp500-top10-point-in-time` | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback` | 8484.39 | 2.376 | 3635.59 | 50.90 | `META` |
| 2 | `sp500-top10-point-in-time` | `donchian-55-20-rsp-filter-rsi14-regime-45-theme-breadth-early` | 8418.29 | 2.349 | 3810.76 | 50.81 | `META` |
| 3 | `mega-cap-ex-nvda` | `donchian-55-20-rsp-filter-rsi14-regime-45-theme-breadth-early` | 8363.76 | 2.431 | 3687.53 | 51.37 | `META` |
| 4 | `mega-cap-ex-nvda` | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback` | 8315.01 | 2.428 | 3604.41 | 50.64 | `META` |
| 5 | `mega-cap-ex-nvda` | `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict` | 8251.43 | 2.591 | 2857.29 | 50.37 | `META` |
| 6 | `sp500-top10-point-in-time` | `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict` | 8237.49 | 2.414 | 3024.39 | 50.11 | `META` |
| 7 | `sp500-top10-point-in-time` | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-6pct-theme-breadth-quality` | 6710.45 | 2.016 | 3168.00 | 46.90 | `META` |
| 8 | `mega-cap-ex-nvda` | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-6pct-theme-breadth-quality` | 6621.33 | 2.041 | 3065.60 | 47.40 | `META` |
| 9 | `mega-cap-ex-nvda` | `donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-6pct-theme-quality-strict` | 6460.17 | 2.193 | 2531.59 | 47.05 | `META` |
| 10 | `sp500-top10-point-in-time` | `donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-6pct-theme-quality-strict` | 6428.95 | 2.118 | 2641.88 | 46.25 | `META` |
| 11 | `mega-cap-ex-nvda` | `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-8pct-theme-acceleration-balanced` | 6171.27 | 1.635 | 3278.43 | 46.63 | `AAPL` |
| 12 | `sp500-top10-point-in-time` | `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-8pct-theme-acceleration-balanced` | 6125.55 | 1.615 | 3347.61 | 46.49 | `AAPL` |

## top_combos

| rank | universe | strategy_id | symbol | net_profit | profit_factor | max_drawdown | win_rate |
|---|---|---|---|---:|---:|---:|---:|
| 1 | `sp500-top10-point-in-time` | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback` | `META` | 28435.67 | 5.778 | 5117.36 | 64.71 |
| 2 | `mega-cap-ex-nvda` | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback` | `META` | 28435.67 | 5.778 | 5117.36 | 64.71 |
| 3 | `sp500-top10-point-in-time` | `donchian-55-20-rsp-filter-rsi14-regime-45-theme-breadth-early` | `META` | 27732.34 | 5.222 | 5708.56 | 64.71 |
| 4 | `mega-cap-ex-nvda` | `donchian-55-20-rsp-filter-rsi14-regime-45-theme-breadth-early` | `META` | 27732.34 | 5.222 | 5708.56 | 64.71 |
| 5 | `sp500-top10-point-in-time` | `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-8pct-theme-acceleration-balanced` | `AAPL` | 23263.49 | 3.306 | 3552.37 | 67.65 |
| 6 | `mega-cap-ex-nvda` | `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-8pct-theme-acceleration-balanced` | `AAPL` | 23263.49 | 3.306 | 3552.37 | 67.65 |
| 7 | `sp500-top10-point-in-time` | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-6pct-theme-breadth-quality` | `META` | 22134.81 | 4.400 | 3370.24 | 52.63 |
| 8 | `mega-cap-ex-nvda` | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-6pct-theme-breadth-quality` | `META` | 22134.81 | 4.400 | 3370.24 | 52.63 |
| 9 | `sp500-top10-point-in-time` | `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict` | `META` | 20183.99 | 4.414 | 3388.82 | 57.89 |
| 10 | `mega-cap-ex-nvda` | `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict` | `META` | 20183.99 | 4.414 | 3388.82 | 57.89 |

## bottom_combos

| rank | universe | strategy_id | symbol | net_profit | profit_factor | max_drawdown | win_rate |
|---|---|---|---|---:|---:|---:|---:|
| 1 | `sp500-top10-point-in-time` | `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-8pct-theme-acceleration-balanced` | `JNJ` | -433.33 | 0.944 | 3314.22 | 36.36 |
| 2 | `mega-cap-ex-nvda` | `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-8pct-theme-acceleration-balanced` | `JNJ` | -433.33 | 0.944 | 3314.22 | 36.36 |
| 3 | `sp500-top10-point-in-time` | `donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-6pct-theme-quality-strict` | `JNJ` | -299.20 | 0.947 | 3789.11 | 44.00 |
| 4 | `mega-cap-ex-nvda` | `donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-6pct-theme-quality-strict` | `JNJ` | -299.20 | 0.947 | 3789.11 | 44.00 |
| 5 | `sp500-top10-point-in-time` | `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict` | `JNJ` | -94.75 | 0.983 | 3632.93 | 45.83 |
| 6 | `mega-cap-ex-nvda` | `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict` | `JNJ` | -94.75 | 0.983 | 3632.93 | 45.83 |
| 7 | `sp500-top10-point-in-time` | `donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-6pct-theme-quality-strict` | `XOM` | 662.84 | 1.127 | 2102.60 | 33.33 |
| 8 | `sp500-top10-point-in-time` | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-6pct-theme-breadth-quality` | `XOM` | 662.84 | 1.127 | 2102.60 | 33.33 |
| 9 | `mega-cap-ex-nvda` | `donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-6pct-theme-quality-strict` | `XOM` | 662.84 | 1.127 | 2102.60 | 33.33 |
| 10 | `mega-cap-ex-nvda` | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-6pct-theme-breadth-quality` | `XOM` | 662.84 | 1.127 | 2102.60 | 33.33 |

## round6 との比較

- round6 robust winner `donchian-55-20-rsp-filter-rsi14-regime-50` の alt 平均は `8418.29 / 8363.76` だった
- round7 `breadth-early` は `8418.29 / 8363.76` で、**round6 winner の robustness をほぼそのまま再現** した
- round7 `deep-pullback` は `8484.39 / 8315.01` で、**sp500 側では上回り、mega-cap ex NVDA 側でもほぼ同水準** だった
- round7 `quality-strict` は `8237.49 / 8251.43` で、**Mag7 の強さをかなり保ったまま alt でも残った**

つまり round7 は、round6 winner を完全に置き換える 1 本を作ったというより、  
**breadth persistence を `early` と `deep pullback` に分岐し、leader concentration を `quality-strict` として別本線化した** round と整理するのが妥当である。

## 解釈メモ

- **主軸 1**: `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback`
- **主軸 2**: `donchian-55-20-rsp-filter-rsi14-regime-45-theme-breadth-early`
- **主軸 3**: `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict`
- **補完枠**: `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-8pct-theme-acceleration-balanced`
- 弱い銘柄は今回も `JNJ` と一部 `XOM` に寄り、低回転・防御系では theme trend proxy が効きにくい

## 関連 docs

- Mag7 round7: [`theme-backtest-results-round7_2015_2025.md`](./theme-backtest-results-round7_2015_2025.md)
- theme signal observation: [`theme-signal-observation-round7_2015_2025.md`](./theme-signal-observation-round7_2015_2025.md)
- theme shortlist: [`theme-strategy-shortlist-round7_2015_2025.md`](./theme-strategy-shortlist-round7_2015_2025.md)
- raw snapshot: [`../references/backtests/round7-theme-alt_20260405.json`](../references/backtests/round7-theme-alt_20260405.json)
- summary snapshot: [`../references/backtests/round7-theme-alt_20260405.summary.json`](../references/backtests/round7-theme-alt_20260405.summary.json)
