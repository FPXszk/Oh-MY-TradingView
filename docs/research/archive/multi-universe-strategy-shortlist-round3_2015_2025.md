# round3 追加戦略ショートリスト (2015-2025)

## 前提

- ベース期間: `2015-01-01` 〜 `2025-12-31`
- 初期資金: `10000 USD`
- 時間足: 日足 (`D`)
- 比較前提: long-only / 手数料 0 / slippage 0 / 100% of equity
- 比較ユニバース:
  - `mag7`
  - `sp500-top10-point-in-time`
- 補助候補:
  - `mega-cap-ex-nvda`

## round3 で試す 10 戦略

| priority | id | family | regime filter | universe fit | 狙い |
|---|---|---|---|---|---|
| 1 | `sma-200-trend-filter-atr-stop` | trend filter | なし | Mag7 / top10 | 最上位戦略の DD 抑制 |
| 2 | `sma-200-trend-filter-chandelier` | trend filter | なし | Mag7 / top10 | 長期 trend を残しつつ exit 改善 |
| 3 | `sma-cross-10-50-baseline` | trend | なし | Mag7 / top10 | round2 上位の baseline 再評価 |
| 4 | `sma-cross-10-50-spy-filter` | trend | `spy_above_sma200` | Mag7 / top10 | 市場全体が弱い時の whipsaw 削減 |
| 5 | `ema-50-trend-filter-baseline` | trend filter | なし | Mag7 / top10 | 反応速度と一般性の再確認 |
| 6 | `ema-50-trend-filter-rsp-filter` | trend filter | `rsp_above_sma200` | Mag7 / top10 | breadth 寄りの bull 時だけ稼働 |
| 7 | `donchian-breakout-55-20-baseline` | breakout | なし | Mag7 / top10 | 長め breakout の再評価 |
| 8 | `donchian-breakout-55-20-spy-filter` | breakout | `spy_above_sma200` | Mag7 / top10 | bear/range の無駄打ち削減 |
| 9 | `keltner-breakout-atr-trail` | breakout | なし | Mag7 / top10 | round2 新規上位の exit 改善 |
| 10 | `connors-rsi-pullback-bull-only` | mean reversion | `rsp_above_sma200` | Mag7 / top10 | bull 限定逆張りの有効性確認 |

## 選定理由

### 1. round2 の改善候補をそのまま掘る

- `sma-200-trend-filter` の DD 抑制
- `sma-cross-10-50` と `ema-50-trend-filter` の baseline 再評価
- `keltner-breakout` と `donchian-breakout-55-20` の breakout 再評価

### 2. 新しい指標追加より、既存 builder + filter/exit 追加を優先する

- Pine 実装の不確実性を下げられる
- round2 との差分が読みやすい
- 「何が効いたか」を絞り込みやすい

### 3. 逆張りは 1 本だけ残す

- round2 は trend / breakout が主軸だった
- ただし `Connors RSI` は PF / win rate に魅力があり、bull 限定なら改善余地がある

## round3 の仮説

1. `sma-200-trend-filter` は exit 改善で DD を下げても core 戦略に残る可能性が高い
2. `sma-cross-10-50` は NVDA 依存を抜いても比較的残りやすい
3. `RSP > 200SMA` は SPY より breadth 寄りで、bull-only 条件として使いやすい
4. breakout は弱地合いでの停止ルールが効けば top10 バスケットでも崩れにくくなる

## research-only に留めた案

- `spy_50_over_200_slope_up`
- `vix_below_sma50`
- `breadth_proxy`
- `annual-rebalance-top10`

## 関連

- regime 候補: [`market-regime-candidates-round3_2015_2025.md`](./market-regime-candidates-round3_2015_2025.md)
- universe 候補: [`universe-selection-candidates-round3_2015_2025.md`](./universe-selection-candidates-round3_2015_2025.md)
