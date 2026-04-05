# Round8 テーマ投資ショートリスト (2015-2025)

## 前提

- 対象ユニバース:
  - `mag7`
  - alt rerun: `sp500-top10-point-in-time`, `mega-cap-ex-nvda`
- 期間: `2015-01-01` 〜 `2025-12-31`
- 初期資金: `10000 USD`
- 時間足: 日足 (`D`)
- 比較前提: long-only / 手数料 0 / slippage 0 / 100% of equity
- 背景:
  - round7 の主軸は `breadth-early`, `deep-pullback`, `quality-strict`
  - `breadth-quality`, `quality-strict-stop`, `acceleration` はその次点だった
  - round8 は **総合的に強かった top7 の近傍探索** を行う round

## round8 の狙い

round8 は新系統の探索ではなく、  
**round7 で強かった top7 の近傍を 12 本に広げて、どの局所調整が最も残るかを比べる** round である。

今回切り分けたいのは次の 6 軸。

1. breadth entry は `40 / 45 / 50` のどこが妥当か
2. breadth に stop を足すと robustness は改善するか
3. breadth-quality を quality 側へ寄せると主力化できるか
4. deep-pullback は earlier と tight のどちらが有効か
5. quality-strict は relaxed entry と guarded strict のどちらが強いか
6. acceleration は strict / tight で補完価値を維持できるか

## round8 候補 12 本

> 注: `breadth-quality-early` は round8 実装時点で `breadth-early-guarded` と executable logic が一致しているため、  
> 実質的には **11 executable variants + 1 taxonomy alias** の構成で読む。

| priority | id | family | theme axis | 拡張元 | 狙い |
|---|---|---|---|---|---|
| 1 | `donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier` | breakout | breadth-earlier | breadth-early | breadth を保ったまま entry をさらに早める |
| 2 | `donchian-55-20-rsp-filter-rsi14-regime-50-theme-breadth-balanced` | breakout | breadth-balanced | breadth-early | early と quality の中間を探る |
| 3 | `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-early-guarded` | breakout | breadth-early-guarded | breadth-early | early に stop を足して DD を抑える |
| 4 | `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-quality-early` | breakout | breadth-quality-early | breadth-quality | breadth-quality を early 側へ寄せる（現行 round8 では `breadth-early-guarded` と executable logic が一致） |
| 5 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-6pct-theme-breadth-quality-strict` | breakout | breadth-quality-strict | breadth-quality | breadth と quality の両立を強める |
| 6 | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-10pct-theme-deep-pullback-earlier` | breakout | deep-pullback-earlier | deep-pullback | 深い押しをやや早く拾う |
| 7 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | breakout | deep-pullback-tight | deep-pullback | pullback 許容を保ったまま stop を締める |
| 8 | `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced` | breakout | quality-strict-balanced | quality-strict | strict quality を少し緩めて entry を早める |
| 9 | `donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-6pct-theme-quality-strict-guarded` | breakout | quality-strict-guarded | quality-strict | strict quality に guard を足す |
| 10 | `donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-8pct-theme-quality-strict-stop-wide` | breakout | quality-strict-stop-wide | quality-strict-stop | stop 最適幅を再確認する |
| 11 | `donchian-20-10-spy-filter-rsi14-regime-55-hard-stop-8pct-theme-acceleration-balanced-strict` | breakout | acceleration-balanced-strict | acceleration-balanced | acceleration を少し quality 寄りにする |
| 12 | `donchian-20-10-spy-filter-rsi14-regime-45-hard-stop-8pct-theme-acceleration-reentry-tight` | breakout | acceleration-reentry-tight | acceleration-reentry | reentry のノイズを stop で減らす |

## 仮説

### 仮説 1: Mag7 首位は `quality-strict-balanced`

- round7 の strict quality はすでに Mag7 首位だった
- そこから `RSI14 > 60` を `55` に緩めるだけなら、leader concentration を壊さず entry を増やせる可能性がある

### 仮説 2: alt の最有力候補は `deep-pullback-tight` / `breadth-earlier` / `breadth-quality-strict`

- round7 alt では deep-pullback と breadth-early が強かった
- round8 ではその周辺の DD 改善版や quality 寄せ版が残るかを確かめる

### 仮説 3: hard stop は breadth family の洗練に効く

- breadth-early の本質を壊さず DD を抑えられれば、alt でも残りやすくなる
- `breadth-early-guarded` と `breadth-quality-strict` がその確認役になる

### 仮説 4: acceleration は今回も補完枠

- top7 に残ったので近傍は試すが、本線交代までは期待しない
- `AAPL` / `AMZN` 型の局所優位があれば十分

## 期待する見え方

| 見え方 | 解釈 |
|---|---|
| `quality-strict-balanced` が Mag7 首位 | leader quality は少し緩めた方が入りやすい |
| `quality-strict-guarded` が PF/DD で優位 | strict quality は stop 追加が有効 |
| `breadth-quality-strict` が alt でも残る | breadth と quality の中間解が主力化できる |
| `deep-pullback-tight` が alt 上位 | deep pullback の本質は earlier ではなく stop 最適化 |
| `breadth-earlier` と `breadth-balanced` が同値 | regime 閾値差より family 本体が効いている |
| acceleration 系が中位以下 | 今回も補完運用が妥当 |

## 実行順

1. Mag7 で 12 本すべて実行
2. 同値 variants を除き、代表 6 本だけ alt universe へ送る
3. docs では次の 4 枠で読む
   - quality mainline
   - breadth mainline
   - deep pullback mainline
   - acceleration 補完

## alt rerun shortlist

Mag7 完走後、round8 では次の 6 本を alt に送る。

1. `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced`
2. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-6pct-theme-breadth-quality-strict`
3. `donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-6pct-theme-quality-strict-guarded`
4. `donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier`
5. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
6. `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-early-guarded`

### shortlist に残した理由

- `quality-strict-balanced`: Mag7 首位
- `breadth-quality-strict`: breadth-quality family の改善候補
- `quality-strict-guarded`: PF/DD 改善が明確
- `breadth-earlier`: round7 breadth 本線の最小差分
- `deep-pullback-tight`: round7 alt winner の tightening 版
- `breadth-early-guarded`: breadth 本線に stop を足した代表

### shortlist から外した理由

- `breadth-balanced`: `breadth-earlier` と Mag7 同値で重複
- `breadth-quality-early`: `breadth-early-guarded` と executable logic が一致し、Mag7 でも同値
- `deep-pullback-earlier`: `deep-pullback-tight` より Mag7 で劣後
- `quality-strict-stop-wide`: quality 系では上位 2 本より劣後
- acceleration 2 本: 今回も補完域で、本線比較の優先度が低い

## 注意点

- round8 も **theme ranking の直接再現ではなく proxy 比較**
- alt rerun の最終判断は、Mag7 の派手さより **cross-universe での残り方** を優先する
- duplicate outcome が続く枝は次 round で pruning する
