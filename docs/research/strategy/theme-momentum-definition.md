# Theme momentum definition

この文書は、**テーマ投資で「モメンタムのある銘柄」をどう定義するか**を固定の参照先として残すための手書きメモです。  
generated な `current-strategy-reference.md` / `current-symbol-reference.md` とは別に、**判断軸だけを stable path で固定する**ために置きます。

## 一言でいうと

この repo でいう「モメンタムのあるテーマ銘柄」とは、**中期で継続して強く、直近でも熱量が残り、breadth と地合いの裏付けがあり、leader stock が低リスクで入れる位置にあるテーマ銘柄**です。  
発想は Mark Minervini 流の `leader stock + high-tight / tight range + breakout + strict risk control` に近いですが、テーマ投資では **theme persistence / breadth / market alignment** を上流フィルターとして追加します。

## 先に固定する原則

1. **Risk First**
   - 先に「いくら失うか」を決め、期待だけで入らない
   - 1トレードの資本リスクは **最大 1-2%** を上限にする
   - entry 前に stop を事前定義できないなら見送る
2. **Leader stock だけを見る**
   - テーマが強くても、買うのは leader 銘柄だけ
   - 弱い二軍銘柄でテーマだけを買わない
3. **Low-risk entry だけを許可する**
   - breakout 直前の tight range、または強テーマの押し目反発だけを狙う
   - 伸び切った場所、だらだらした中段、無理な逆張りは避ける
4. **Forced trade をしない**
   - 条件が揃わないなら cash のまま待つ
   - 「テーマが面白い」だけではエントリー理由にならない
5. **Never average down**
   - 想定が外れたら切る
   - ナンピンで thesis を正当化しない
6. **ルールを機械的に守る**
   - 感情で例外を作らない
   - stable path の文書は、判断軸を毎回ぶらさないために置く

## この戦略の位置づけ

Minervini の原典は、**個別株の low-risk breakout を厳格に扱うモメンタム手法**です。  
この repo の Theme Momentum は、その中核を保ちつつ、次の 3 つを追加した**テーマ投資版の拡張**として扱います。

1. **Theme persistence**
   - 3M / 6M / 1Y の時間軸でテーマの強さが続いているか
2. **Breadth**
   - leader 一本ではなく、構成銘柄の複数が動いているか
3. **Market alignment**
   - 地合いが breakout を許容する局面か

つまり順番は、**テーマが本物かを見てから、最後は leader stock の低リスク entry に落とす**です。  
テーマ ranking だけで売買する文書ではありません。

## テーマ投資版 Minervini フレーム

1. **継続テーマか**
   - 3M / 6M / 1Y のどこかで強さが続いている
   - 一時的な 1D ランキング跳ねではなく、中期 persistence を優先する
2. **直近でも熱量が残っているか**
   - 10D / 5D がプラス
   - もしくは 1M で再加速、または rank が再上昇している
3. **Breadth があるか**
   - 構成銘柄の過半が 5D / 10D でプラス
   - leader 一本足ではなく、テーマ全体に資金が回っている
4. **地合いと整合しているか**
   - `SPY > 200SMA` を最低条件にする
   - より強く絞るなら `RSP > 200SMA` も確認する
5. **Leader が高値圏か**
   - leader 銘柄が 52 週高値圏にあり、上昇トレンドを維持している
   - 安値圏の出遅れ銘柄ではなく、先に強さを見せている銘柄を優先する
6. **Entry が low-risk か**
   - breakout 直前の tight range がある
   - または強テーマの押し目反発で、再上昇の根拠が明確
7. **Exit を曖昧にしない**
   - breakout 崩れ、quality 崩れ、rank persistence 崩れで撤退する

## Minervini 的に読むときの解釈

この文書では、Minervini の要素を次のように読み替えます。

| Minervini 原典 | Theme Momentum での解釈 |
| --- | --- |
| Trend Template | leader が高値圏にあり、テーマも persistence を持つ |
| VCP / tight setup | breakout 直前の tight range、または縮小した pullback |
| Relative strength | leader の相対的強さ + テーマの中期順位維持 |
| Industry group strength | breadth を使ってテーマ全体の本物度を確認 |
| Market confirmation | `SPY` / `RSP` フィルターで代替 |
| Cut losses short | stop 事前定義と 1-2% risk cap を必須化 |

## 実践用の基準案

| 項目 | 推奨基準 |
| --- | --- |
| テーマ採用 | 3M または 6M で上位 20% 以内 |
| 継続確認 | 1Y でもプラス圏、または 1M が再加速 |
| 直近熱量 | 10D / 5D がプラス、または rank 再加速 |
| breadth | 構成銘柄の過半が 5D / 10D でプラス |
| 地合い | `SPY > 200SMA` を最低条件、強気選別では `RSP > 200SMA` も確認 |
| leader 条件 | 高値圏維持、上昇トレンド維持、弱い出遅れ株を避ける |
| 初動 entry | leader 銘柄の `20/10` breakout |
| 継続 entry | leader 銘柄の `55/20` breakout |
| 押し目 entry | 強テーマ継続中の leader に限定して RSI pullback を許可 |
| 低リスク条件 | breakout 直前の tight range、stop が近い、risk 1-2% で収まる |
| 初期 stop | pivot 下、直近安値下、または setup 崩れ位置のどれかを事前定義 |
| 利確 / 撤退 | breakout exit、RSI quality 崩れ、rank persistence 崩れ、地合い悪化で見直し |

## Entry の考え方

### 1. 初動 entry

- まだテーマの加速が初期段階で、leader に fresh breakout が出る局面
- `20/10 breakout` を使う
- ただし breakout だけでなく、**直前の tight range** を重視する

### 2. 継続 entry

- テーマ persistence が確認済みで、leader が再度高値を更新する局面
- `55/20 breakout` を使う
- すでに伸びた銘柄でも、再度タイトにまとまっていれば許容する

### 3. 押し目 entry

- 強テーマかつ leader 維持中の銘柄だけに限定する
- `RSI pullback` は逆張りではなく、**強い uptrend 中の dip reclaim** として使う
- breadth が崩れているテーマでは使わない

## Exit とポジション運用

1. **初期 stop を必ず置く**
   - breakout の pivot 下
   - 直近安値下
   - setup 崩れが明確になる位置
2. **損失は小さく切る**
   - stop に触れたら即撤退する
   - 「少し様子を見る」はしない
3. **含み益を損失へ戻さない**
   - decent profit が乗ったら、最低でも建値防衛か一部利確を検討する
   - 利益が初期リスクの 3R 以上に達したら、一部利確は有力候補
4. **市場の distribution を無視しない**
   - 地合いが崩れたら個別銘柄の強さだけで持ち続けない
   - `SPY` / `RSP` の悪化時は全ポジションを見直す
5. **勝っている時だけ大きくする**
   - tight setup で、かつ直近トレードが機能している時だけ size を上げる
   - 連敗中はサイズを下げる

## この repo での proxy

外部テーマデータをそのまま backtest engine に入れていないため、テーマ投資は次の proxy で近似します。  
ここでの proxy は **Minervini の完全再現ではなく、再現可能な機械ルールへの置換** です。

| theme axis | public site の見え方 | この repo の proxy |
| --- | --- | --- |
| heat | 1D / 5D / 10D の順位 | `donchian 20/10` |
| acceleration | 短期順位改善、再加速 | `20/10 + RSI regime + tight stop` |
| persistence | 1M / 3M / 6M / 1Y 継続 | `donchian 55/20` |
| tight setup | breakout 前の収縮 | `breakout 直前の tight range` を裁量確認、機械 proxy は Donchian 近傍 |
| breadth | equal-weight theme / RSP 的広がり | 構成銘柄の短期プラス比率、または `RSP > 200SMA` filter |
| market alignment | 地合いと整合しているか | `SPY > 200SMA` filter |
| dip reclaim | 強テーマの押し目反発 | `RSI long-only` 補完枠 |
| risk control | 低リスク setup の厳選 | `tight stop`, 小さい初期リスク, no average down |

## 実践チェックリスト

1. テーマは 3M / 6M persistence を持っているか
2. 1Y でも壊れておらず、直近 10D / 5D か rank 再加速があるか
3. Breadth は十分か
4. `SPY > 200SMA` を満たし、必要なら `RSP > 200SMA` も満たすか
5. 買うのは leader stock か
6. breakout 直前の tight range か、強テーマの dip reclaim か
7. stop は entry 前に定義済みか
8. 1トレードの資本リスクは 1-2% 以内か
9. ナンピン前提になっていないか
10. 今回の trade は forced trade ではないか

## 使い方

1. まず `docs/research/current/README.md` と `main-backtest-current-summary.md` で最新の状況を掴む
2. テーマ投資の候補を読むときは、この文書で判断軸を固定する
3. 戦略や銘柄の具体例は `current-strategy-reference.md` / `current-symbol-reference.md` で確認する
4. 数値の根拠は `references/backtests/README.md` と `artifacts/` を見る

## 注意

- これは **ランキングの絶対値をそのまま売買ルールにする文書ではなく、判断軸を固定するためのガイド** です
- `stock-themes.com` のような外部テーマ順位は発想の参考に留め、最終的には breadth / persistence / market alignment / leader setup をこの repo の proxy で確認します
- Minervini の VCP をそのまま完全再現しているわけではなく、**tight range / breakout / risk control の思想を proxy 化している** と理解します
- generated doc に埋もれないよう、この文書は `docs/research/strategy/` 直下の stable path を維持します

## Source

- `docs/research/archive/theme-signal-observation-round6_2015_2025.md`
- `docs/research/archive/theme-strategy-shortlist-round6_2015_2025.md`
- `docs/exec-plans/completed/round6-theme-trend-research_20260405_0603.md`
