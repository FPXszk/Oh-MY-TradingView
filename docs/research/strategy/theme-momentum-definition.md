# Theme momentum definition

この文書は、**テーマ投資で「モメンタムのある銘柄」をどう定義するか**を固定の参照先として残すための手書きメモです。  
generated な `current-strategy-reference.md` / `current-symbol-reference.md` とは別に、判断軸だけを stable path で参照できるようにします。

## 一言でいうと

この repo でいう「モメンタムのあるテーマ銘柄」とは、**中期の継続性があり、直近の熱量も残り、breadth と地合いの裏付けがあるテーマの leader 銘柄**です。  
entry は breakout か強テーマの押し目に限定し、exit は rank・breakout・quality の崩れで曖昧にしません。

## 推奨フレーム

1. **継続テーマか**
   - 3M / 6M / 1Y のどこかで強さが続いている
2. **直近でも熱量が残っているか**
   - 10D / 5D がプラス、または順位が再加速している
3. **breadth があるか**
   - 構成銘柄の複数が上がっており、leader 一本足ではない
4. **地合いと逆行していないか**
   - SPY / RSP の bull 条件を満たしている
5. **entry を何で取るか**
   - 初動は breakout、強テーマの押しは dip reclaim
6. **exit を曖昧にしない**
   - breakout 崩れ、RSI quality 崩れ、または rank persistence 崩れで撤退する

## 実践用の基準案

| 項目 | 推奨基準 |
| --- | --- |
| テーマ採用 | 3M か 6M で上位 20% 以内 |
| 継続確認 | 1Y でもプラス圏、または 1M が再加速 |
| breadth | 構成銘柄の過半が 5D / 10D でプラス |
| 地合い | `SPY > 200SMA` を最低条件、強気なら `RSP > 200SMA` も確認 |
| 初動 entry | leader 銘柄の `20/10` breakout |
| 継続 entry | leader 銘柄の `55/20` breakout |
| 押し目 entry | 直前まで上位だったテーマのみ RSI pullback を許可 |
| 利確 / 撤退 | breakout exit、または rank persistence 崩れ |

## この repo での proxy

外部テーマデータをそのまま backtest engine に入れていないため、テーマ投資は次の proxy で近似します。

| theme axis | public site の見え方 | この repo の proxy |
| --- | --- | --- |
| heat | 1D / 5D / 10D の順位 | `donchian 20/10` |
| acceleration | 短期順位改善 | `20/10 + RSI regime + tight stop` |
| persistence | 1M / 3M / 6M / 1Y 継続 | `donchian 55/20` |
| breadth | equal-weight theme / RSP 的広がり | `RSP > 200SMA` filter |
| market alignment | 地合いと整合しているか | `SPY > 200SMA` filter |
| dip reclaim | 強テーマの押し目反発 | `RSI long-only` 補完枠 |

## 使い方

1. まず `docs/research/current/README.md` と `main-backtest-current-summary.md` で最新の状況を掴む
2. テーマ投資の候補を読むときは、この文書で判断軸を固定する
3. 戦略や銘柄の具体例は `current-strategy-reference.md` / `current-symbol-reference.md` で確認する
4. 数値の根拠は `references/backtests/README.md` と `artifacts/` を見る

## 注意

- これは **ランキングの絶対値をそのまま売買ルールにする文書ではなく、判断軸を固定するためのガイド**です
- `stock-themes.com` のような外部テーマ順位は発想の参考に留め、最終的には breadth / persistence / market alignment をこの repo の proxy で確認します
- generated doc に埋もれないよう、この文書は `docs/research/strategy/` 直下の stable path を維持します

## Source

- `docs/research/archive/theme-signal-observation-round6_2015_2025.md`
- `docs/research/archive/theme-strategy-shortlist-round6_2015_2025.md`
- `docs/exec-plans/completed/round6-theme-trend-research_20260405_0603.md`
