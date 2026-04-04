# Mag7 向け戦略ショートリスト (2015-2025)

## 前提

- 対象ユニバース: `AAPL`, `MSFT`, `GOOGL`, `AMZN`, `META`, `NVDA`, `TSLA`
- 期間: `2015-01-01` 〜 `2025-12-31`
- 初期資金: `10000 USD`
- 仮の標準時間足: **日足 (`D`)**
- 初回の比較前提: **long-only / 手数料 0 / slippage 0 / 100% of equity**
- これは **deep research に基づく候補整理**。直近確認では `172.31.144.1:9223` で CDP 応答があるが、TradingView 実機での **全候補** 実行結果はまだ付いていない

## 調査の結論

Mag7 は大型株ではあるものの、2015-2025 の文脈では **強いトレンド継続** と **急落後の鋭いリバウンド** の両方が目立つ。  
そのため、候補は次の 3 系統に分けるのが妥当だった。

1. **トレンド追随**: 強い上昇トレンドを取りにいく
2. **平均回帰**: 過熱や投げ売りの反動を拾う
3. **ブレイクアウト / フィルタ付き複合**: 決算やモメンタム加速を捕まえる

研究上のおすすめ順は、**まずベースラインの移動平均系と MACD / RSI / Bollinger / Donchian / Supertrend を先に実装**し、その後に Connors RSI や ADX フィルタ系でノイズ低減を試す流れ。

### ステータス凡例

- `implemented`: 既に repo に固定実装がある
- `ready`: 次の generic backtest 実装で **先に Pine 化する候補**
- `research_only`: research には残すが **初回実装の後回し候補**

## 推奨ショートリスト 10 件

| 優先 | id | 戦略名 | 系統 | Mag7 との相性 | 想定レジーム | Pine 化難易度 | config ステータス |
|---|---|---|---|---|---|---|---|
| 1 | `sma-cross-5-20` | SMA クロス 5/20 | trend | 既存 NVDA 実装のベースラインとして最適 | 強トレンド | 低 | `implemented` |
| 2 | `ema-cross-9-21` | EMA クロス 9/21 | trend | SMA より反応が速く、加速局面の多い NVDA / TSLA / META と相性が良い | 強トレンド | 低 | `ready` |
| 3 | `macd-signal` | MACD シグナルクロス | trend | モメンタムの持続を取りやすく、方向感のある大型グロースに向く | トレンド転換 / 継続 | 低 | `ready` |
| 4 | `rsi-mean-reversion` | RSI オーバーソールド反発 | mean_reversion | 決算後急落や短期過熱修正の戻りを拾いやすい | 急落後の反発 | 低 | `ready` |
| 5 | `bb-mean-revert` | Bollinger Band 平均回帰 | mean_reversion | 高ボラ株の行き過ぎ修正を取りやすい | レンジ / 急変動後 | 低 | `ready` |
| 6 | `donchian-breakout` | Donchian ブレイクアウト | breakout | 決算・AI テーマ・大型上放れを捉えやすい | 新高値更新 | 低 | `ready` |
| 7 | `supertrend-atr` | Supertrend (ATR) | trend | ボラティリティに追従しながらドローダウンを抑えやすい | 強トレンド / 高ボラ | 中 | `ready` |
| 8 | `sma-200-trend-filter` | 200 日移動平均トレンドフィルタ | trend | 長期上昇基調の判定がしやすく、Mag7 の大崩れ回避に向く | 長期トレンド | 低 | `ready` |
| 9 | `connors-rsi-pullback` | Connors RSI 押し目買い | mean_reversion | 短期の売られすぎをより敏感に拾える | 短期押し目 | 中 | `research_only` |
| 10 | `adx-ema-filter` | ADX フィルタ付き EMA トレンド | composite | ダマシの多い期間を避けやすく、Mag7 の方向感が出た局面に絞れる | トレンド選別 | 中 | `research_only` |

## 候補ごとのメモ

### 1. `sma-cross-5-20`

- 目的: 既存 `runNvdaMaBacktest()` と整合する比較基準
- 使いどころ: 最初の generic runner の正しさ確認
- 注意点: 短期クロスなので whipsaw が増えやすい

### 2. `sma-200-trend-filter`

- 仮ルール: 終値が 200SMA を上回ったら保有、下回ったら手仕舞い
- 強み: シンプルで壊れにくく、Mag7 の長期トレンド把握に向く
- 注意点: 横ばい局面で負けが重なりやすい

### 3. `ema-cross-9-21`

- 仮ルール: 9EMA が 21EMA を上抜けで買い、下抜けで決済
- 強み: 高成長株の加速局面に追随しやすい
- 注意点: ノイズ相場では売買回数が増えやすい

### 4. `macd-signal`

- 仮ルール: MACD ラインがシグナルを上抜けで買い、下抜けで決済
- 強み: トレンドとモメンタムを同時に見やすい
- 注意点: ラグがあるため、急反転には弱い

### 5. `rsi-mean-reversion`

- 仮ルール: RSI(14) < 30 で買い、RSI > 55 or 60 で決済
- 強み: Mag7 の「売られすぎ → 急反発」に向く
- 注意点: 強い下落トレンドではナンピン的に見えやすいので、長期トレンドフィルタ併用候補

### 6. `connors-rsi-pullback`

- 仮ルール: CRSI(3,2,100) が 15 未満で買い、70 近辺で決済
- 強み: RSI より短期押し目を鋭く取れる
- 注意点: Pine 化は可能だが、通常 RSI より少し実装が重い

### 7. `bb-mean-revert`

- 仮ルール: 終値が下側 Bollinger Band(20,2) を割ったら買い、Basis 到達で決済
- 強み: 高ボラ銘柄の過度な行き過ぎを拾いやすい
- 注意点: ブレイクアウト相場では逆張りになりやすい

### 8. `donchian-breakout`

- 仮ルール: 20 日高値更新で買い、10 日安値割れで決済
- 強み: トレンドが一度走ると長く続く銘柄に向く
- 注意点: ボックス圏では損切りが増える

### 9. `supertrend-atr`

- 仮ルール: Supertrend 上抜けで買い、下抜けで決済
- 強み: ATR ベースでボラに応じて追従できる
- 注意点: パラメータ依存がやや強い

### 10. `adx-ema-filter`

- 仮ルール: 20EMA > 50EMA かつ ADX(7) > 25 のときだけ買い、条件崩れで決済
- 強み: 強い方向性が出た場面だけを狙える
- 注意点: フィルタが強すぎると機会損失が出る

## 初回実装の推奨順

1. `ema-cross-9-21`
2. `macd-signal`
3. `rsi-mean-reversion`
4. `bb-mean-revert`
5. `donchian-breakout`
6. `supertrend-atr`
7. `sma-200-trend-filter`
8. `connors-rsi-pullback`
9. `adx-ema-filter`

`sma-cross-5-20` は既に基準実装があるため、最初の比較対象として残す。

## 研究メモ

- **トレンド追随は外せない**  
  AQR の長期研究と Quantpedia の time-series momentum 要約から、トレンド系は長期的に頑健性が高い
- **平均回帰は大型株で使いやすい**  
  Quantpedia の short-term reversal 要約では、短期反転は大型株でコスト耐性が上がるとされており、Mag7 に比較的向く
- **RSI / Bollinger / Connors RSI は押し目用として有力**  
  高成長大型株の急落後リバウンド捕捉に向く
- **ADX は単体よりフィルタとして使う方が良い**  
  エントリーシグナルより「今はトレンド相場か」を測る用途が妥当

## 参考ソース

### トレンド / モメンタム

- AQR, *A Century of Evidence on Trend-Following Investing*  
  https://www.aqr.com/Insights/Research/Journal-Article/A-Century-of-Evidence-on-Trend-Following-Investing
- Quantpedia, *Time-Series Momentum Effect*  
  https://www.quantpedia.com/strategies/time-series-momentum-effect/
- Quantified Strategies, *Moving Average Trading Strategy*  
  https://www.quantifiedstrategies.com/moving-average-trading-strategy/
- Quantified Strategies, *200 Day Moving Average*  
  https://www.quantifiedstrategies.com/200-day-moving-average/
- Quantified Strategies, *MACD Trading Strategy*  
  https://www.quantifiedstrategies.com/macd-trading-strategy/
- Quantified Strategies, *Supertrend Indicator Trading Strategy*  
  https://www.quantifiedstrategies.com/supertrend-indicator-trading-strategy/

### 平均回帰 / 反転

- Quantified Strategies, *RSI Trading Strategy*  
  https://www.quantifiedstrategies.com/rsi-trading-strategy/
- Quantified Strategies, *Connors RSI*  
  https://www.quantifiedstrategies.com/connors-rsi/
- Quantified Strategies, *Bollinger Bands Trading Strategy*  
  https://www.quantifiedstrategies.com/bollinger-bands-trading-strategy/
- Quantpedia, *Short-Term Reversal in Stocks*  
  https://www.quantpedia.com/strategies/short-term-reversal-in-stocks/

### フィルタ / 補助

- Quantified Strategies, *ADX Trading Strategy*  
  https://www.quantifiedstrategies.com/adx-trading-strategy/
- Quantified Strategies, *Average True Range Trading Strategy*  
  https://www.quantifiedstrategies.com/average-true-range-trading-strategy/
