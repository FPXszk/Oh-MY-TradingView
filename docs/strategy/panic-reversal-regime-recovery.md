# Panic Reversal Regime Recovery

この文書は、**通常は `RSP > 200SMA` の地合い条件でしか買わない戦略群に対して、例外的に「暴落局面の底打ち反転」だけを拾う補完枠**を stable path で残すためのメモです。

## 一言でいうと

市場全体がかなり弱く、通常の trend-following では一切買えない局面でも、**panic が極端化したあとに短期の底打ち確認が出たら買い、回復が進んだら売る**という考え方です。  
狙いは「平時の強気トレンド追随」とは別枠で、**クラッシュ後の回復 leg** を拾うことにあります。

## 位置づけ

- 通常系の breakout / Donchian 群は、`RSP > 200SMA` と RSI regime を通した **順張り** が前提
- この枠は、`RSP < 200SMA` のため通常ルールでは全休になる場面でだけ使う **特殊エントリー**
- 目的は falling knife を毎回拾うことではなく、**panic 条件が揃ったときの例外運用**に限定すること

## 現行の機械ルール

現時点で実装済みの raw_source strategy は  
`rsp-vix-spy-panic-reversal-rsi2-confirm-sma25-rsi65-exit-no-stop` です。

### entry filter

以下を同時に満たしたときだけ panic 環境とみなします。

- `RSP < 200SMA`
- `VIX > 30`
- `SPY RSI14 < 30`
- `SPY < 200SMA`

### bottom confirmation

panic 条件に加えて、**`SPY RSI2` が 10 を下から上抜けた日**を short-term bottom confirmation とみなします。

- trigger: `ta.crossover(SPY RSI2, 10)`

### holding rule

- 買ったポジションは **stop loss なし**
- 「極端な悲観のあとに反発波を長めに取る」発想なので、通常の hard stop ではなく exit condition まで保持する

### exit

回復がある程度進んだら、以下で手仕舞います。

- `close > SMA25`
- `RSI14 >= 65`

つまり **25日移動平均線を上回り、RSI65 以上まで回復したら売る**設計です。

## なぜ no-stop なのか

この枠は、通常の breakout 手法のように「入った直後に失敗ならすぐ切る」という発想ではありません。  
むしろ **panic の最中は volatility が大きすぎて、近い stop はノイズで刈られやすい**という前提に立っています。

そのため、ここでは初期 stop を置かず、

1. panic 条件をかなり厳しく絞る
2. RSI2 で短期の反転確認を入れる
3. exit を `SMA25 + RSI65` の回復確認に寄せる

という形で、**entry の厳選と exit 条件で管理する**考え方を採っています。

## 使いどころ

- 通常の `RSP > 200SMA` filter では空振りになり続ける弱気相場
- VIX 急騰と broad market 売られすぎが同時に見えている局面
- crash 後の最初の戻りを、数日ではなく **回復 leg** として取りにいきたいとき

## いま未実装の拡張候補

本来やりたかった「市場参加者が極端に恐怖に傾いたときだけ買う」思想に寄せるなら、次の外部 proxy を追加する余地があります。

- Fear & Greed proxy basket
- AAII sentiment
- NAAIM exposure
- credit spread
- S&P500 valuation proxy

ただし現時点では、無料で安定した**長期時系列を取りやすいもの / 取りにくいもの**に差があるため、まずは TradingView 内で再現しやすい

- `RSP < 200SMA`
- `VIX > 30`
- `SPY RSI14 < 30`
- `SPY < 200SMA`

の組み合わせを第一段階として採用しています。

## 解釈上の注意

- これは通常の trend-following を置き換える戦略ではなく、**弱気 regime 専用の補助枠**です
- no-stop は意図的な仕様であり、通常戦略へ横展開する前提ではありません
- 実運用では position sizing を通常枠より慎重に扱う前提です

## Source

- `docs/research/night-batch-self-hosted-run68_20260426.md`
- `config/backtest/strategy-catalog.json`
- `docs/references/pine/tp1-micro-sweep-panic-reversal-us40-11pack/rsp-vix-spy-panic-reversal-rsi2-confirm-sma25-rsi65-exit-no-stop.pine`
