# Round7 テーマ投資ショートリスト (2015-2025)

## 前提

- 対象ユニバース:
  - `mag7`
  - alt rerun: `sp500-top10-point-in-time`, `mega-cap-ex-nvda`
- 期間: `2015-01-01` 〜 `2025-12-31`
- 初期資金: `10000 USD`
- 時間足: 日足 (`D`)
- 比較前提: long-only / 手数料 0 / slippage 0 / 100% of equity
- 背景:
  - round6 の robust winner は `donchian-55-20-rsp-filter-rsi14-regime-50`
  - round6 の次点は `donchian-55-20-spy-filter-rsi14-regime-55`
  - 主役は 55/20 breadth / persistence、20/10 と RSI は補完だった

## round7 の狙い

round7 は round6 の勝ち筋を維持したまま、  
**トレンドフォロー型テーマ投資のどの局面が最も robust かをさらに細分化** して比べる round である。

今回切り分けたいのは次の 5 軸。

1. breadth を保ったまま早めに乗る
2. breadth 本線の quality を上げる
3. leader 主導テーマを strict quality で選ぶ
4. 深い押しを許容した persistence を試す
5. acceleration / dip reclaim の補完価値を再点検する

## round7 候補 10 本

| priority | id | family | theme axis | 狙い | コメント |
|---|---|---|---|---|---|
| 1 | `donchian-55-20-rsp-filter-rsi14-regime-45-theme-breadth-early` | breakout | breadth-early | breadth を保ったまま entry を早める | round6 本命の RSI 緩和版 |
| 2 | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-6pct-theme-breadth-quality` | breakout | breadth-quality | breadth persistence の DD 改善 | 6% stop で急反落を抑える |
| 3 | `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict` | breakout | quality-strict | leader 主導の強テーマを厳選 | concentration を許容する strict 版 |
| 4 | `donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-6pct-theme-quality-strict` | breakout | quality-strict-stop | quality を保って DD を削る | round6 次点の stop tightening |
| 5 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback` | breakout | deep-pullback | breadth を伴う強テーマの深い押しを許容 | dip alert 発想を breakout 側に寄せる |
| 6 | `donchian-20-10-spy-filter-rsi14-regime-45-hard-stop-10pct-theme-acceleration-reentry` | breakout | acceleration-reentry | 初動後の二段目加速を拾う | RSI を緩めて再加速寄りにする |
| 7 | `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-8pct-theme-acceleration-balanced` | breakout | acceleration-balanced | 速さと耐久の中間点 | 6% と 10% の中間 stop |
| 8 | `donchian-20-10-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-acceleration` | breakout | breadth-acceleration | breadth を伴う acceleration を中庸化 | round6 の厳しすぎ問題の調整版 |
| 9 | `rsi2-buy-10-sell-70-rsp-filter-long-only-theme-shallow-dip` | mean reversion | shallow-dip-reclaim | 浅い押しの高速回復 | breadth bull 下の dip reclaim |
| 10 | `rsi3-buy-20-sell-70-spy-filter-long-only-theme-deep-dip` | mean reversion | deep-dip-reclaim | 深い押しからの遅い回復 | deep dip を別枠で観察 |

## 仮説

### 仮説 1: alt の本命は `deep-pullback` か `breadth-early`

- round6 winner の核は breadth persistence だった
- そこに「早め entry」か「深い押し許容」を加えた方が、multi-universe では残りやすい可能性がある

### 仮説 2: Mag7 のトップは `quality-strict`

- Mag7 は leader 主導が強く、breadth より concentration が効く局面がある
- `SPY + RSI14 > 60` は NVDA / TSLA 側で優位になりやすい

### 仮説 3: 20/10 は今回も補完枠

- acceleration 系は強い銘柄では勝てるが、round6 では本線化しなかった
- round7 では `AAPL` / `AMZN` 型の再加速を拾えるかを重視する

### 仮説 4: dip reclaim は GOOGL 補完なら意味がある

- round6 では RSI long-only が `GOOGL` 補完として残った
- round7 では浅い押しと深い押しを分けることで、より明確に役割が見えるかを確かめる

## 期待する見え方

| 見え方 | 解釈 |
|---|---|
| `deep-pullback` が alt 首位 | 強テーマの深い押し許容が robust |
| `breadth-early` が alt で残る | round6 本命を早めても robustness を壊していない |
| `quality-strict` が Mag7 首位 | leader concentration を strict quality で取る価値がある |
| `acceleration-balanced` が AAPL / AMZN で強い | 20/10 は執行器として残す価値あり |
| shallow / deep dip が全体で弱い | dip reclaim は今回も補完用途に留めるのが妥当 |

## 実行順

1. Mag7 で 10 本すべて実行
2. 上位 6 本だけ alt universe へ送る
3. docs では次の 3 枠で読む
   - breadth persistence 本線
   - leader quality 本線
   - acceleration / dip reclaim 補完

## 注意点

- round7 も **theme ranking の直接再現ではなく proxy 比較**
- 良い結果が出ても、外部テーマ絶対順位をそのまま売買ルールにしない
- 最終判断は **Mag7 の派手さより alt の残り方** を優先する
