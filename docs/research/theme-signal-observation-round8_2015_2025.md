# Round8 テーマシグナル観察メモ (2015-2025)

## メタデータ

- observation-date: `2026-04-05`
- public sources:
  - `https://stock-themes.com/`
  - `https://stock-themes.com/how-to-use`
  - `https://stock-themes.com/support`
  - `https://stock-themes.com/api/theme-ranking?force_reload=1`
  - `https://stock-themes.com/api/rank-history`
  - `https://stock-themes.com/api/dip-alerts?period=1D`
- repo context:
  - `./theme-signal-observation-round7_2015_2025.md`
  - `./theme-backtest-results-round7_2015_2025.md`
  - `./theme-backtest-results-round7-alt_2015_2025.md`
  - `../../config/backtest/strategy-presets.json`

## 目的

round7 で見えた **breadth-early / deep-pullback / quality-strict** の 3 本線を前提に、  
round8 では「新しい family を探す」のではなく、**勝っている局面の近傍だけを動かして local optimum を探す**。

`stock-themes.com` の見方も、round7 までで大枠は把握できた。  
round8 の焦点は、「強いテーマをどう検出するか」よりも **強いテーマにいつ入るか、どこまで guard するか、どこまで pullback を許すか** に移る。

## round7 から round8 に進める理由

round7 では、

1. breadth を保った早め entry
2. deep pullback の許容
3. leader concentration を strict quality で通す

の 3 軸が有効だった。  
ただし各軸の中で **regime 閾値 / hard stop / strictness** のどこが効いているかはまだ粗かった。

そのため round8 では、同じ family の中だけで

- `RSI14 > 40 / 45 / 50 / 55 / 60`
- `hard stop 6% / 8% / 10%`
- `RSP` と `SPY` の filter 維持

を小さく動かし、**robustness を壊さず改善できる方向** を見極める。

## round8 で重視した観察

### 1. 強いテーマでは「新しい proxy 追加」より entry/guard 調整の方が重要

round7 までで、breadth・concentration・pullback depth の proxy 自体は十分に機能した。  
したがって round8 では外部テーマ解釈を増やすより、**既に効いている proxy の局所調整** の方が期待値が高い。

これは `stock-themes.com` 側でも、日替わりの新テーマ探索だけでなく  
**rank-history で残るテーマの継続性** をかなり重視していることと整合する。

### 2. breadth family は regime 値そのものより stop 有無が効く可能性がある

round8 Mag7 の途中結果では、`breadth-earlier` と `breadth-balanced` が同値、  
`breadth-early-guarded` と `breadth-quality-early` も同値になった。

このことは、強い leader 相場では `RSI14 > 40` と `> 50` の差より、  
**stop を入れるかどうか、breadth を残すかどうか** の方が実効差になりやすい可能性を示す。

加えて `breadth-quality-early` は、現行 preset schema 上では  
`breadth-early-guarded` と **同一の executable logic** になっている。  
そのため round8 では独立した勝ち筋というより、**breadth early を quality 側ラベルでも読んだ alias** として扱うのが正確である。

### 3. quality family は「strict を少し緩める」か「strict に stop を足す」方向が本筋

round7 の `quality-strict` は Mag7 首位かつ alt でも残った。  
round8 ではその周辺として

- `quality-strict-balanced` (`RSI14 > 55`)
- `quality-strict-guarded` (`RSI14 > 60 + 6% stop`)
- `quality-strict-stop-wide` (`RSI14 > 55 + 8% stop`)

を置いた。

local tuning の狙いは、leader concentration を維持したまま

1. entry を少し早める
2. stop で DD を整える

のどちらが優位かを見ることにある。

### 4. deep-pullback は「より早く拾う」より「stop を少し締める」方が有効かもしれない

deep-pullback 系は round7 alt 首位だった。  
round8 では `regime 55 -> 50` の earlier 版と、`stop 10% -> 8%` の tight 版を分けた。

ここで見たいのは、押しを許容する本質が

- entry を早めること
- それとも pullback を許しつつ guard を少し強めること

のどちらにあるか、である。

### 5. breadth-quality は round7 次点から round8 主軸へ昇格しうる

round7 では breadth-quality は 4 番手だったが、  
round8 の近傍探索では `breadth-quality-strict` が再び上位へ浮上した。

これは、「breadth 本線に quality filter を少しだけ足す」型が  
**breadth-early と quality-strict の中間解** として機能する可能性を示す。

### 6. acceleration は今回も補完枠として扱う

top7 に acceleration 系が残ったため round8 でも近傍を試したが、  
仮説は round7 と同じで、**主役は 55/20 family、20/10 は補完** である。

したがって acceleration は、次 round でも

- AAPL / AMZN 型の再加速補完
- breadth / quality 本線の代替ではない

という前提で扱う。

### 7. duplicate outcome は次 round の pruning 条件になる

round8 は近傍探索なので、結果が同値になる候補が出ること自体は自然である。  
ただし同値が続くなら、次 round ではその枝を削って **より意味のある差分だけ残す** べきである。

## round8 の proxy 設計

| round8 axis | round7 からの差分 | この repo の proxy |
|---|---|---|
| breadth-earlier | breadth 入口をさらに前倒し | `55/20 + RSP + RSI14 > 40` |
| breadth-balanced | early と quality の中間 | `55/20 + RSP + RSI14 > 50` |
| breadth-early-guarded | early に stop を足す | `55/20 + RSP + RSI14 > 45 + 6% stop` |
| breadth-quality-early | breadth-quality を early 側へ寄せる | `55/20 + RSP + RSI14 > 45 + 6% stop` ※ 現行 round8 では `breadth-early-guarded` と同一ロジック |
| breadth-quality-strict | breadth-quality を quality 側へ寄せる | `55/20 + RSP + RSI14 > 55 + 6% stop` |
| deep-pullback-earlier | deep pullback を少し早く拾う | `55/20 + RSP + RSI14 > 50 + 10% stop` |
| deep-pullback-tight | deep pullback の stop を tighten | `55/20 + RSP + RSI14 > 55 + 8% stop` |
| quality-strict-balanced | strict quality を少し緩める | `55/20 + SPY + RSI14 > 55` |
| quality-strict-guarded | strict quality に stop を足す | `55/20 + SPY + RSI14 > 60 + 6% stop` |
| quality-strict-stop-wide | quality stop を広げる | `55/20 + SPY + RSI14 > 55 + 8% stop` |
| acceleration-balanced-strict | acceleration を quality 寄りにする | `20/10 + SPY + RSI14 > 55 + 8% stop` |
| acceleration-reentry-tight | reentry の stop を tighten | `20/10 + SPY + RSI14 > 45 + 8% stop` |

## round8 の仮説

1. **Mag7 の首位は quality 系の近傍**
   - `quality-strict-balanced` か `quality-strict-guarded` が有力
2. **alt の本命は deep-pullback-tight / breadth-earlier / breadth-quality-strict のどれか**
   - round7 の robust family を崩さず、DD だけ改善できる可能性がある
3. **duplicate variant は pruning 対象**
   - 同じ performance が続く枝、または executable logic が同一の枝は次 round で削る
4. **acceleration は引き続き補完**
   - 本線化よりも、主力戦略で拾いにくい局所相場の補完に意味がある

## 実務上の読み方

### 主軸

- `quality-strict` の緩和・guard 方向
- `breadth` の early / guarded / quality 寄せ
- `deep-pullback` の stop 最適化

### 補完

- `acceleration` は局所補完
- 同値 variants は次 round で整理対象

## 注意点

- round8 も external theme ranking を直接 backtest しているわけではない
- あくまで **強かった theme trend proxy の近傍最適化**
- 最終判断は Mag7 の派手さだけでなく、**alt でどれが残るか** を優先する
