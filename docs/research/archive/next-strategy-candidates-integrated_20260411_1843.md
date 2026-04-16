# 次戦略候補 統合リサーチ (2026-04-11)

## 前提

- このドキュメントは、直近セッション群で議論に上がった **次世代の戦略候補** を統合的に整理したものである
- 現在 active backtest が進行中のため、**docs 登録を本線** とする
- `config/backtest/strategy-presets.json` への追加や `src/core/*` への builder 拡張は **別作業（別 exec-plan）** で行う
- 既存の Donchian 系 preset 群（round6–round11）とは独立した候補であり、将来的に preset 化するかどうかは backtest 結果を見て判断する
- 優先順位は **機械化しやすさ × preset 化難易度 × 既存 infra との親和性** を軸に設定した

## ステータス凡例

- `research_only`: docs に記録済み。preset / Pine 化は未着手
- `partially_tested`: 既存 preset で類似ロジックの部分検証あり
- `needs_discretion`: 裁量判断を多く含み、完全自動化には追加設計が必要

---

## 次の戦略候補：優先順位付きサマリ

| 優先 | id | 戦略名 | 系統 | 機械化 | preset 化難易度 | current repo fit | ステータス |
|---|---|---|---|---|---|---|---|
| 1 | `ma-rsi14-reacceleration` | MA + RSI14 再加速 | trend_continuation | ◎ | 中 | 中 | `research_only` |
| 2 | `mtf-bb-pullback` | MTF BB Pullback | trend_pullback | ○ | 中 | 低 | `research_only` |
| 3 | `ren-consecutive-bb-reversal` | Ren の連続陽線/陰線 + BB タッチ反発 | mean_reversion | △ | 中〜高 | 低 | `needs_discretion` |
| 4 | `vix-rsi14-confluence` | VIX 高 + RSI(14) コンフルエンス | composite | ○ | 中〜高 | 低〜中 | `research_only` |
| 5 | `granville-3-8` | グランビル③/⑧ | trend_pullback | ○ | 中 | 低〜中 | `research_only` |
| 6 | `rem-bb-pullback-rider` | REM BB Pullback Rider | trend_pullback | ○ | 中 | 低 | `research_only` |
| 7 | `rsi14-mean-reversion` | RSI(14) 平均回帰 | mean_reversion | ◎ | 低 | 高 | `partially_tested` |
| 8 | `vix-high-only` | VIX 高時のみ投資 | regime_filter | ○ | 中〜高 | 低〜中 | `research_only` |
| 9 | `smc-short-term-discretionary` | SMC 系短期裁量仮説 | structure | △ | 高 | 低 | `needs_discretion` |

> **優先 1–4** は次戦略の主力候補。  
> **優先 5–6** は構造が明確な比較対象。  
> **優先 7–9** は control / watchlist / exploratory として残す。

---

## 候補ごとの詳細

### 1. `ma-rsi14-reacceleration` — MA + RSI14 再加速

- **出典**
  - shibainu_fx のグランビル法則投稿
  - ユーザーの RSI14 戦略関心
- **コアアイデア**
  - MA で上位方向を固定し、押し目 / 戻り目後の **再加速タイミングだけを RSI14 で確認** する
  - 逆張り RSI ではなく、**順張り再開確認** に使う
  - 例:
    - ロング: 上位トレンド上向き、価格が MA 近辺まで調整、`RSI14` が `40-50` 帯から再上抜け
    - ショート: 上位トレンド下向き、価格が MA 近辺まで戻り、`RSI14` が `50-60` 帯から再下抜け
- **相場環境**
  - トレンド継続相場
  - 日足にも intraday にも拡張しやすい
- **機械化しやすさ**
  - ◎
- **裁量依存度**
  - 低〜中
- **将来の preset 化難易度**
  - 中
  - MA 条件 + RSI 再加速定義の組み合わせで builder を切る必要がある
- **次に検証すべき観点**
  1. `RSI14 45 / 50 / 55` の閾値感度
  2. `SMA20 / SMA50 / SMA200` のどれを軸にするか
  3. 日足長期株向けか、5m-15m intraday 向けか
  4. stop を固定 `%` にするか、直近 swing に置くか

### 2. `mtf-bb-pullback` — MTF BB Pullback

- **出典**
  - shibainu_fx の MTF 整合思想
  - TradingView script `REM BB Pullback Rider`
- **コアアイデア**
  - 上位足でトレンド方向を固定し、下位足の BB 端タッチを押し目 / 戻り目として拾う
  - `REM` の base は `SMA20 > SMA200` と `SMA200 slope`、`BB(20, 2.5σ)` タッチ、固定 TP/SL、trailing を持つ
  - そこへ shibainu 系の MTF 整合を乗せると、**15m 方向 + 5m entry** の形になる
- **相場環境**
  - 明確なトレンドが出ている相場
  - FX / index / crypto の intraday
- **機械化しやすさ**
  - ○
- **裁量依存度**
  - 中
- **将来の preset 化難易度**
  - 中
  - MTF / intraday / short 対応をどう切るかが論点
- **次に検証すべき観点**
  1. `5m` / `15m` の組み合わせが最適か
  2. `BB 2.0σ` / `2.5σ` の差
  3. `SMA200 slope` を何本差で判定するか
  4. 固定 `TP/SL` と structure exit の差
  5. long / short の非対称性

### 3. `ren-consecutive-bb-reversal` — Ren の連続陽線/陰線 + BB タッチ反発

- **出典**
  - Ren1904fx の投稿
- **コアアイデア**
  - **連続陽線 / 連続陰線** の一方向走り込みが出たあと、BB にタッチし、かつ「ろうそく足の伸び」が十分であれば反発しやすいという経験則
  - 解釈としては **trend continuation ではなく exhaustion reversal**
  - 例:
    - 3-5 本の連続陽線 + 上側 BB タッチ + 直近足の実体 or 全高値幅が直近平均より大きい → 逆張り short 候補
    - 下側は逆
- **相場環境**
  - 短期足の行き過ぎ
  - FX の 1m-5m / 指標後の短期過熱修正
- **機械化しやすさ**
  - △
- **裁量依存度**
  - 中〜高
- **将来の preset 化難易度**
  - 中〜高
  - 「伸び」の定義を固定する必要がある
- **次に検証すべき観点**
  1. 連続足本数は `3 / 4 / 5` のどれが効くか
  2. BB 設定は `20, 2.0σ` と `20, 2.5σ` のどちらがよいか
  3. 「ろうそく足の伸び」を `ATR 比` にするか `body percentile` にするか
  4. 利確を basis 回帰にするか、固定 `R` にするか

### 4. `vix-rsi14-confluence` — VIX 高 + RSI(14) コンフルエンス

- **出典**
  - ユーザー会話
  - CBOE VIX White Paper
- **コアアイデア**
  - VIX が一定水準（例: 25 以上）のときだけ RSI(14) < 30 の buy signal を有効化する
  - 「市場全体が恐怖に傾いているときに個別株の売られすぎを拾う」
- **相場環境**
  - 暴落・急落局面に特化
- **機械化しやすさ**
  - ○
- **裁量依存度**
  - 低〜中
- **将来の preset 化難易度**
  - 中〜高
  - cross-symbol 参照が必要
- **次に検証すべき観点**
  1. `VIX 20 / 25 / 30` の差
  2. `RSI14 25 / 30 / 35` の差
  3. `SPY above 200DMA` の trend filter を入れるか
  4. hold `3-5` 日と event-driven exit の差

### 5. `granville-3-8` — グランビルの法則 ③/⑧

- **出典**
  - Joseph E. Granville "Granville's New Key to Stock Market Profits" (1963)
  - shibainu_fx の投稿
- **コアアイデア**
  - **③ 買い**: 上昇中の MA の上にある価格が MA に向かって下落するが、MA を割らずに再上昇 → 押し目買い
  - **⑧ 売り**: 下降中の MA の下にある価格が MA に向かって上昇するが、MA を超えずに再下降 → 戻り売り
- **相場環境**
  - トレンド継続局面
- **機械化しやすさ**
  - ○
- **裁量依存度**
  - 中
- **将来の preset 化難易度**
  - 中
  - 「MA 手前で止まる」の tolerance 定義が必要
- **次に検証すべき観点**
  1. MA 期間の選択（25 / 50 / 75 / 200）
  2. `touch failed` と `close failed` のどちらで見るか
  3. 下位足の reversal confirmation を追加するか
  4. `ma-rsi14-reacceleration` に統合した方がよいか

### 6. `rem-bb-pullback-rider` — REM BB Pullback Rider

- **出典**
  - TradingView script `REM BB Pullback Rider`
- **コアアイデア**
  - `SMA20 / SMA200` と `SMA200 slope` で環境認識し、BB 端タッチで押し目 / 戻りを取る
  - 元 script は `TP/SL 20pips`、trailing を含む
- **相場環境**
  - FX / index の intraday trend
- **機械化しやすさ**
  - ○
- **裁量依存度**
  - 低〜中
- **将来の preset 化難易度**
  - 中
  - intraday 前提と pip-based risk 管理の一般化が必要
- **次に検証すべき観点**
  1. `20pips` を ATR / `%` ベースへ置換できるか
  2. slope filter がどの程度効いているか
  3. base variant と `mtf-bb-pullback` の差

### 7. `rsi14-mean-reversion` — RSI(14) 平均回帰

- **出典**
  - ユーザー会話
  - repo 既存 preset `rsi-mean-reversion`
- **コアアイデア**
  - `RSI14` の売られすぎからの戻りを狙う
  - current repo では baseline / control として扱いやすい
- **相場環境**
  - equity 日足の短期オーバーシュート
- **機械化しやすさ**
  - ◎
- **裁量依存度**
  - 低
- **将来の preset 化難易度**
  - 低
- **次に検証すべき観点**
  1. `entry_below 25 / 30`
  2. `exit_above 45 / 55`
  3. trend filter 併用の有無

### 8. `vix-high-only` — VIX 高時のみ投資

- **出典**
  - ユーザー会話
  - CBOE VIX White Paper
- **コアアイデア**
  - VIX が閾値（例: 25 or 30）を超えたタイミングで buy、VIX が正常化したら exit
  - entry signal は VIX のみで個別株のテクニカルは見ない
- **相場環境**
  - 暴落・恐怖局面限定
- **機械化しやすさ**
  - ○
- **裁量依存度**
  - 低
- **将来の preset 化難易度**
  - 中〜高
  - VIX 参照経路が必要
- **次に検証すべき観点**
  1. VIX 閾値の最適化
  2. 「VIX 高 → 即 buy」vs「翌日陽線確認 → buy」の比較
  3. `SPY / QQQ` 限定と個別株拡張の差
  4. fixed day exit と VIX 正常化 exit の差

### 9. `smc-short-term-discretionary` — SMC 系短期裁量仮説

- **出典**
  - kazuFX10 の大会優勝者ツイート
  - ICT / Smart Money Concepts
- **コアアイデア**
  - liquidity sweep
  - BOS / CHOCH
  - FVG / OB への戻り
  - 直近 swing 外の stop
  - `2R / 3R` 近辺の exit
  の組み合わせを仮説とする
- **相場環境**
  - FX / index の高速 intraday
- **機械化しやすさ**
  - △
- **裁量依存度**
  - 高
- **将来の preset 化難易度**
  - 高
- **次に検証すべき観点**
  1. liquidity sweep の定義
  2. BOS / CHOCH の formalization
  3. FVG / OB の定量化
  4. competition-style leverage を切り離した低レバ版の期待値

---

## 実運用上の整理

### Primary

1. `ma-rsi14-reacceleration`
2. `mtf-bb-pullback`
3. `ren-consecutive-bb-reversal`
4. `vix-rsi14-confluence`

### Secondary

1. `granville-3-8`
2. `rem-bb-pullback-rider`

### Watchlist / exploratory

1. `rsi14-mean-reversion`
2. `vix-high-only`
3. `smc-short-term-discretionary`

> `rsi14-mean-reversion` は新規アイデアではなく、**既存 baseline を次候補群の control として残す**。

---

## preset 化ロードマップ（概要）

> ⚠️ 以下は構想段階のロードマップであり、**active backtest 完了後に別 exec-plan で実施する**。
> 優先順位表は **戦略候補としての重要度**、この roadmap は **実装しやすさ順** を表す。両者は同一ではない。

### Phase A: 最初に切る候補

1. `ma-rsi14-reacceleration`
2. `granville-3-8`
3. `rsi14-mean-reversion` の control 再検証

### Phase B: intraday / BB 系

4. `mtf-bb-pullback`
5. `rem-bb-pullback-rider`
6. `ren-consecutive-bb-reversal`

### Phase C: regime / discretionary

7. `vix-high-only`
8. `vix-rsi14-confluence`
9. `smc-short-term-discretionary`

---

## 注記

- このドキュメントは **research 登録が本線** であり、preset / builder 拡張は別作業として扱う
- 各候補の backtest 結果は、検証実施後に別ドキュメントとして `docs/research/` に追加する
- 具体的な投稿 / script URL は [`references/external/design-ref-llms.md`](../references/design-ref-llms.md) に記録済み

---

## Run 8 validated shortlist

night batch **run 8** の recovered results から、実績ベースで次の backtest へ接続する shortlist を別枠で固定する。

### US top 3

1. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
2. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback`
3. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-10pct-theme-deep-pullback-earlier`

### JP top 3

1. `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight`
2. `donchian-60-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-late`
3. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict`

### 読み方

- これは **research_only の新規アイデア群を置き換えるものではなく**、run 8 で実測済みの Donchian 系 shortlist を「次に回す operational 候補」として付設する整理である
- `rsi14-mean-reversion` は引き続き control / baseline として残す
- `smc-short-term-discretionary` は引き続き watchlist / exploratory として残し、今回の shortlist には混ぜない

## Next backtest campaign attachment

上記 shortlist は、既存の `external-phase1-priority-top` を差し替えず、**別 campaign** として attach する。

- campaign id: `external-phase1-run8-us-jp-top6`
- config: `config/backtest/campaigns/external-phase1-run8-us-jp-top6.json`
- universe: `long-run-cross-market-100`
- preset order: **US top 3 -> JP top 3**
- phase sizing: `smoke=10`, `pilot=25`, `full=100`

### 運用メモ

- `external-phase1-priority-top` は historical baseline として維持する
- run 8 shortlist campaign は、直近実績を cross-market gate に再投入するための追加レーンとして扱う
- 研究候補の RSI 系 / VIX 系 / SMC 系はこの campaign に直接混ぜず、次の preset 化や別 campaign 検証へ分離する
