# round3 地合い判定候補メモ (2015-2025)

## 目的

- round2 で強かった trend / breakout 系に **地合いフィルタ** を被せ、弱地合いの無駄打ちを減らせるかを調べる
- `SPX > 200SMA` のような定番だけでなく、**equal-weight proxy / volatility / breadth** を比較対象に入れる
- TradingView 上で実装しやすい候補と、research-only に留める候補を分ける

## 背景

- round2 では `sma-200-trend-filter`, `sma-cross-10-50`, `ema-50-trend-filter`, `keltner-breakout`, `donchian-breakout-55-20` が強かった
- 一方で `NVDA` の寄与が強く、単純な price trend だけで評価すると「強い個別株を追えているだけ」になるリスクが残った
- round3 では **市場全体の地合いが良いときだけ entry する** 戦略を混ぜて比較する

## 候補比較

| id | 判定方法 | 狙い | 長所 | 懸念 | round3 扱い |
|---|---|---|---|---|---|
| `spy_above_sma200` | `SPY close > SMA200` | 長期 bull / bear の粗い切り分け | シンプルで過学習しにくい | 反応が遅い | **実装** |
| `spy_50_over_200_slope_up` | `SPY 50SMA > 200SMA` かつ `200SMA slope > 0` | bear rally を少し避ける | MA 一本より方向の確認が強い | 条件が増える | research-only |
| `rsp_above_sma200` | `RSP close > SMA200` | equal-weight で breadth 寄りの地合いを見る | mega-cap 偏重を薄めやすい | ETF proxy なので厳密 breadth ではない | **実装** |
| `vix_below_sma50` | `VIX < SMA50` または閾値未満 | risk-off で entry を減らす | crash 回避の発想が明快 | trend strategy との相性が不安定 | research-only |
| `risk_on_ratio` | `QQQ/IEF`, `HYG/LQD`, `XLY/XLP` の上昇 | 市場心理の risk-on/off を測る | 先行性の可能性 | multi-symbol 条件が重い | research-only |
| `breadth_proxy` | `% above 200DMA` 相当 | 市場内部の参加率を見る | 単一指数より広い | TradingView 上で series 可用性が未確認 | research-only |

## round3 で実装する地合いフィルタ

### 1. `spy_above_sma200`

- 最初の本線
- `SPY` が 200SMA より上のときだけ trend / breakout を稼働
- TradingView 上で `SPY` は現環境で取得確認済み

### 2. `rsp_above_sma200`

- `SPY` より breadth 寄りの proxy
- `RSP` が 200SMA を上回るときだけ trend / pullback を許可
- `RSP` は現環境で取得確認済み

## round3 で保留にした候補

### `spy_50_over_200_slope_up`

- 面白いが、まずは `SPY > 200SMA` の baseline を先に押さえる
- 条件が増えるため round3 では research-only

### `vix_below_sma50`

- `VIX` 自体は現環境で取得確認済み
- ただし「地合い」より「ショック回避」に寄るので、entry filter としては解釈がぶれやすい

### `breadth_proxy`

- 発想としては有力
- ただし TradingView で安定して参照できる breadth 系 series が未確定
- round3 では docs に残し、run 対象からは外す

## round3 への反映方針

1. trend / breakout の baseline をそのまま 4 本残す
2. `SPY > 200SMA` フィルタ版を 2 本追加する
3. `RSP > 200SMA` フィルタ版を 2 本追加する
4. 逆張りは `Connors RSI bull-only` の 1 本に限定し、bull 限定で比較する

## 実装メモ

- strategy preset に `regime_filter` を持たせる
- session runner 側で `request.security()` を生成し、`action_when_false` を解釈する
- round3 はまず `exit_all` と `no_new_entry` の 2 パターンだけに絞る

## 参考

- Quantpedia, *Time-Series Momentum Effect*  
  https://www.quantpedia.com/strategies/time-series-momentum-effect/
- Quantified Strategies, *Market Regime Indicators*  
  https://www.quantifiedstrategies.com/market-regime-indicators/
