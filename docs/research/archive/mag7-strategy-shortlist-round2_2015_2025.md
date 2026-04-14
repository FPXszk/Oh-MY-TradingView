# Mag7 向け戦略ショートリスト round2 (2015-2025)

## 前提

- 対象ユニバース: `AAPL`, `MSFT`, `GOOGL`, `AMZN`, `META`, `NVDA`, `TSLA`
- 期間: `2015-01-01` 〜 `2025-12-31`
- 初期資金: `10000 USD`
- 時間足: 日足 (`D`)
- 比較前提: long-only / 手数料 0 / slippage 0 / 100% of equity
- round1 の baseline:
  - shortlist: [`mag7-strategy-shortlist_2015_2025.md`](./mag7-strategy-shortlist_2015_2025.md)
  - summary: [`mag7-backtest-results_2015_2025.md`](./mag7-backtest-results_2015_2025.md)
  - raw: [`../references/backtests/mag7-backtest-results_20260404.json`](../references/backtests/mag7-backtest-results_20260404.json)
- round2 の実測結果:
  - summary: [`mag7-backtest-results-round2_2015_2025.md`](./mag7-backtest-results-round2_2015_2025.md)
  - raw: [`../references/backtests/mag7-backtest-results_round2_20260404.json`](../references/backtests/mag7-backtest-results_round2_20260404.json)
- 実行コンテキスト:
  - 20戦略の実測は **session artifact runner** で取得
  - repo CLI / MCP の公開実行導線は現時点でも `nvda-ma` 固定

## round1 からの引き継ぎ

round1 の 70 run では、`sma-200-trend-filter` / `donchian-breakout` / `supertrend-atr` が上位だった。  
ただし `NVDA` への依存がかなり強く、特定パラメータの当たり外れで順位が動く可能性も残った。

そのため round2 では、次の 3 つを意図して 20 戦略へ広げる。

1. **上位系統の横展開**  
   200SMA・Donchian・Supertrend の近縁パラメータを追加する
2. **補完指標の追加**  
   RSI / Connors / Bollinger に加えて Stochastic / PSAR / ROC / Keltner を試す
3. **実装コストの制御**  
   current runner に素直に載る単一銘柄・単一時間足・Pine 単体完結の戦略を優先する

## round2 の結論

- Mag7 では引き続き **トレンド追随** が主軸
- ただし round1 は「特定の速いトレンドルール」と `NVDA` に寄りすぎていたため、**中期 trend filter / 長め breakout / 軽量 momentum** を増やして比較軸を太くする
- mean reversion は平均純利益では不利でも、**profit factor / win rate の高い押し目候補** として残す価値がある
- 実装観点では、まず **既存 builder 再利用 6 件** を加え、その後 **新規 builder 4 件** を追加するのが最も安全
- 実測では `sma-cross-10-50`, `ema-50-trend-filter`, `keltner-breakout` が新規上位に入り、round2 の拡張は有効だった

## 20 戦略一覧

| priority | id | name | carry | category | builder | implementation | round2 note |
|---|---|---|---|---|---|---|---|
| 1 | `sma-cross-5-20` | SMA Cross 5/20 | round1 | trend | `ma_cross` | existing | 既存 baseline。短期クロス比較の基準 |
| 2 | `ema-cross-9-21` | EMA Cross 9/21 | round1 | trend | `ma_cross` | existing | 速い trend follow の代表 |
| 3 | `macd-signal` | MACD Signal Cross | round1 | trend | `macd_signal` | existing | モメンタム継続の標準系 |
| 4 | `rsi-mean-reversion` | RSI Oversold Bounce | round1 | mean_reversion | `rsi_mean_reversion` | existing | 単純な押し目反発枠 |
| 5 | `bb-mean-revert` | Bollinger Mean Reversion | round1 | mean_reversion | `bollinger_mean_reversion` | existing | 高ボラ銘柄の行き過ぎ修正枠 |
| 6 | `donchian-breakout` | Donchian Breakout 20/10 | round1 | breakout | `donchian_breakout` | existing | round1 上位の breakout 本線 |
| 7 | `supertrend-atr` | Supertrend ATR 10/3 | round1 | trend | `supertrend` | existing | round1 上位の trend 本線 |
| 8 | `sma-200-trend-filter` | 200 Day SMA Trend Filter | round1 | trend | `price_vs_ma` | existing | round1 最上位の長期 filter |
| 9 | `connors-rsi-pullback` | Connors RSI Pullback | round1 | mean_reversion | `connors_rsi_pullback` | existing | 高 win-rate の短期押し目候補 |
| 10 | `adx-ema-filter` | ADX-Filtered EMA Trend | round1 | composite | `adx_filtered_ma` | existing | ノイズ回避用 filter 系 |
| 11 | `sma-cross-10-50` | SMA Cross 10/50 | round2 | trend | `ma_cross` | existing | 5/20 より whipsaw を抑えた中期 trend |
| 12 | `ema-cross-12-26` | EMA Cross 12/26 | round2 | trend | `ma_cross` | existing | MACD と揃う期間で EMA 系を比較 |
| 13 | `ema-50-trend-filter` | 50 Day EMA Trend Filter | round2 | trend | `price_vs_ma` | existing | 200SMA より速い中期 filter |
| 14 | `donchian-breakout-55-20` | Donchian Turtle 55/20 | round2 | breakout | `donchian_breakout` | existing | 長め breakout で大相場を狙う |
| 15 | `supertrend-atr-14-2` | Supertrend ATR 14/2 | round2 | trend | `supertrend` | existing | 感度を変えた Supertrend 派生 |
| 16 | `bb-tight-squeeze` | Bollinger Tight Squeeze | round2 | mean_reversion | `bollinger_mean_reversion` | existing | 1.5σ で浅め押し目も拾う |
| 17 | `stochastic-oversold` | Stochastic Oversold Bounce | round2 | mean_reversion | `stochastic_cross` | new builder | RSI とは別角度の高感度オシレーター |
| 18 | `psar-trend-flip` | Parabolic SAR Trend Flip | round2 | trend | `parabolic_sar` | new builder | 軽量な反転追随で即応性を見る |
| 19 | `keltner-breakout` | Keltner Channel Breakout | round2 | breakout | `keltner_breakout` | new builder | Donchian と別の ATR 系 breakout |
| 20 | `roc-momentum-cross` | ROC Momentum Zero Cross | round2 | momentum | `roc_momentum` | new builder | 価格加速のゼロ越えだけを使う単純 momentum |

## 追加 10 戦略の採用理由

### 既存 builder の再利用 6 件

1. `sma-cross-10-50`
   - 5/20 よりノイズが減り、中期 trend の持続を見やすい
2. `ema-cross-12-26`
   - MACD と近い期間なので、EMA クロスと MACD の差を比較しやすい
3. `ema-50-trend-filter`
   - 200SMA より反応が速く、成長株の再加速を拾いやすい
4. `donchian-breakout-55-20`
   - タートル系の長め breakout。短い breakout のダマシと比較できる
5. `supertrend-atr-14-2`
   - factor/period を変えて感度差を見る
6. `bb-tight-squeeze`
   - 2σ より浅い押し目も対象にして、mean reversion の母数を増やす

### 新規 builder 4 件

1. `stochastic-oversold`
   - StochRSI 系の「より敏感な overbought / oversold 判定」という発想を、Pine 上で軽量に使える Stochastic に寄せた
2. `psar-trend-flip`
   - SAR の反転シグナルで trend 転換の即応性を検証する
3. `keltner-breakout`
   - Donchian よりボラティリティ依存の breakout として補完関係がある
4. `roc-momentum-cross`
   - 価格加速のゼロ越えだけで、最小限の momentum シグナルを検証できる

## 今回あえて外した候補

| candidate | reason |
|---|---|
| Ichimoku Cloud | Pine 行数とルール分岐が増えやすく、current runner の責務を超えやすい |
| VWAP | 日足 long-only 比較では優先度が低く、intraday 色が強い |
| Multi-timeframe 戦略 | `request.security()` 依存になり、比較条件を揃えにくい |
| Portfolio rotation / ranking | single-symbol batch の枠外 |
| Williams %R | Stochastic 系と役割が近く、round2 では重複度が高い |
| CCI | 面白いが Stochastic / RSI / Connors と役割が競合しやすい |

## 実装順

1. 既存 builder 再利用 6 件を追加
2. `stochastic_cross`
3. `parabolic_sar`
4. `roc_momentum`
5. `keltner_breakout`

## 研究メモ

- **trend-following は継続採用**  
  AQR と Quantpedia の trend/momentum 系研究を踏まえて、Mag7 のような大型グロースには長期 trend follow の優位性が残りやすい
- **mean reversion は高 PF 候補として残す**  
  round1 でも Connors RSI や Bollinger は PF / win rate が高かった
- **round2 は“新しい聖杯探し”ではなく比較軸の拡張**  
  round1 top3 の近縁ルールと補完指標を足して、再現性の高い core candidate を選び直す段階と捉える

## 参考ソース

### 継続参照

- AQR, *A Century of Evidence on Trend-Following Investing*  
  https://www.aqr.com/Insights/Research/Journal-Article/A-Century-of-Evidence-on-Trend-Following-Investing
- Quantpedia, *Time-Series Momentum Effect*  
  https://www.quantpedia.com/strategies/time-series-momentum-effect/
- Quantpedia, *Short-Term Reversal in Stocks*  
  https://www.quantpedia.com/strategies/short-term-reversal-in-stocks/

### round2 追加参照

- Quantified Strategies, *Stochastic RSI*  
  https://www.quantifiedstrategies.com/stochastic-rsi/
- Quantified Strategies, *Parabolic SAR Trading Strategy*  
  https://www.quantifiedstrategies.com/parabolic-sar-trading-strategy/
- Quantified Strategies, *Turtle Trading Strategy*  
  https://www.quantifiedstrategies.com/turtle-trading-strategy/
- Quantified Strategies, *Momentum Trading Strategy*  
  https://www.quantifiedstrategies.com/momentum-trading-strategy/
- Quantified Strategies, *CCI Trading Strategy*  
  https://www.quantifiedstrategies.com/cci-trading-strategy/
- Quantified Strategies, *Williams %R Trading Strategy*  
  https://www.quantifiedstrategies.com/williams-r-trading-strategy/
