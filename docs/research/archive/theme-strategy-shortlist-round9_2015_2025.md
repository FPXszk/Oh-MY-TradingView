# Round9 テーマ投資ショートリスト (2015-2025)

## 前提

- 対象ユニバース:
  - `mag7`
  - alt rerun: `sp500-top10-point-in-time`, `mega-cap-ex-nvda`
- 期間: `2015-01-01` 〜 `2025-12-31`
- 初期資金: `10000 USD`
- 時間足: 日足 (`D`)
- 比較前提: long-only / 手数料 0 / slippage 0 / 100% of equity
- 背景:
  - round8 では `breadth-earlier`, `quality-strict-balanced`, `deep-pullback-tight` が cross-universe で強く残った
  - `breadth-balanced` は `breadth-earlier` と Mag7 同値
  - `breadth-quality-early` は `breadth-early-guarded` と executable duplicate
  - round9 では **cross-universe で残った strong 7** を anchor とし、その周辺だけを最小差分で掘る

## round9 の狙い

round9 は新しい family を増やす round ではない。  
**round8 で cross-universe に残った strong 7 の改善版を 1 本ずつ足し、base / tuned / guard 幅の差だけを切り分ける** round である。

見たい論点は次の 7 点。

1. `breadth-earlier` は最速 entry のまま軽い guard を足すと alt DD を改善できるか
2. `quality-strict-balanced` はもう一段だけ緩めても本線性を維持できるか
3. `deep-pullback-tight` は strict entry にすると robustness が増えるか、それとも overfit するか
4. `quality-strict-guarded` は stop 6% が強すぎるのか、8% wide の方が利益を伸ばせるのか
5. `breadth-quality-strict` は strict quality 側に寄せすぎているのか、中間 stop 幅の方が残るのか
6. `breadth-early-guarded` は stop 幅 6% が最適なのか、8% に広げた方が残るのか
7. `quality-strict` base は round8 tuned 版に本当に置き換えられたのか、それとも strict control を残すべきか

## round9 strong 7 anchors

| role | id | family | 採用理由 |
|---|---|---|---|
| 1 | `donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier` | breadth | alt 首位。breadth 本線の中心 |
| 2 | `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced` | quality | Mag7 首位かつ alt 2 位。round8 最大の改善点 |
| 3 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | deep-pullback | alt 3 位。deep-pullback 枝の round8 主軸 |
| 4 | `donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-6pct-theme-quality-strict-guarded` | quality | DD 改善代表。balanced と対になる |
| 5 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-6pct-theme-breadth-quality-strict` | breadth-quality | breadth / quality の中間解として残った |
| 6 | `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-early-guarded` | breadth | breadth に guard を足した代表 |
| 7 | `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict` | control | round7 base。round8 tuned 版の改善度を測る control |

## round9 追加候補 7 本

| priority | id | 拡張元 | 変更点 | 狙い |
|---|---|---|---|---|
| 1 | `donchian-55-20-rsp-filter-rsi14-regime-40-hard-stop-6pct-theme-breadth-earlier-guarded` | breadth-earlier | stop 6% 追加 | breadth 最速 entry に最小 guard を追加 |
| 2 | `donchian-55-20-spy-filter-rsi14-regime-50-hard-stop-6pct-theme-quality-strict-balanced-guarded` | quality-strict-balanced | regime 55 -> 50, stop 6% 追加 | balanced をさらに早めつつ guard で支える |
| 3 | `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict` | deep-pullback-tight | regime 55 -> 60 | deep pullback は strict entry の方が残るか確認 |
| 4 | `donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-8pct-theme-quality-strict-guarded-wide` | quality-strict-guarded | stop 6% -> 8% | guarded quality の stop 幅最適化 |
| 5 | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide` | breadth-quality-strict | regime 55 -> 50, stop 6% -> 8% | breadth-quality の中間解を再点検 |
| 6 | `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-8pct-theme-breadth-early-guarded-wide` | breadth-early-guarded | stop 6% -> 8% | early guard が過剰防御かを確認 |
| 7 | `donchian-55-20-spy-filter-rsi14-regime-45-theme-quality-strict-relaxed` | quality-strict control | regime 60 -> 45 | quality family の entry 緩和限界を測る（regime 50 は round5 と executable duplicate のため 45 に調整） |

## round9 実行セット

round9 の Mag7 では、**anchor 7 本 + 新規 7 本 = 14 preset** を full 実行する。

## alt rerun の考え方

alt rerun では固定 shortlist を先に決め打ちせず、Mag7 実行後に次を優先して送る。

1. anchor と新規 variant の **pair 勝者**
2. family ごとに少なくとも 1 本
3. control と tuned の比較が崩れない組み合わせ

目安は **6〜8 本**。  
round8 同様、Mag7 の派手さより **cross-universe での残り方** を優先する。

## 除外・整理済み候補

- `donchian-55-20-rsp-filter-rsi14-regime-50-theme-breadth-balanced`
  - `breadth-earlier` と Mag7 同値で重複度が高い
- `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-quality-early`
  - `breadth-early-guarded` と executable duplicate
- acceleration 系
  - round8 時点では補完枠で、round9 strong 7 本線からは外す

## 期待する見え方

| 見え方 | 解釈 |
|---|---|
| `breadth-earlier-guarded` が alt でも残る | breadth 本線は最速 + 浅い guard が改善方向 |
| `quality-strict-balanced-guarded` が `balanced` を超える | quality 本線は早め entry + guard の併用が有効 |
| `deep-pullback-strict` が `tight` を下回る | deep-pullback は strict 化しすぎず 55/8 付近が妥当 |
| `quality-strict-guarded-wide` が guarded を上回る | quality guard は 6% が浅すぎた可能性 |
| `breadth-quality-balanced-wide` が strict を超える | breadth-quality は quality 55 より中間解の方が残る |
| `quality-strict-relaxed` が崩れる | quality family は 45 まで緩めるとやりすぎ |

## round9 実行後の運用ショートリスト

### Primary

1. `donchian-55-20-spy-filter-rsi14-regime-45-theme-quality-strict-relaxed`
   - Mag7 #2 / alt #3
   - alt recovered で `20/20` readable
   - 今回の round9 で最も実運用に寄せやすい

### Secondary

1. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
   - alt #4
   - `20/20` readable で fallback に向く
2. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict`
   - alt #5
   - tight とほぼ同格で、strict entry の比較軸として残す価値がある

### Watchlist

1. `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict`
   - Mag7 / alt とも avg net profit 首位級
   - ただし alt は `12/20` readable で未確定要素が大きい
2. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide`
   - Mag7 #5 / alt #2
   - 改善方向は良いが alt unreadable が `8/20` 残る

### Deprioritized

1. `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-8pct-theme-breadth-early-guarded-wide`
   - alt recovered #8 まで低下
2. `donchian-55-20-spy-filter-rsi14-regime-50-hard-stop-6pct-theme-quality-strict-balanced-guarded`
   - raw では false negative に近かったが、recovered 後も primary には届かなかった
