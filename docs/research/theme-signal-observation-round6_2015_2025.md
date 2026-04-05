# Round6 テーマシグナル観察メモ (2015-2025)

## メタデータ

- observation-date: `2026-04-05`
- public sources:
  - `https://stock-themes.com/`
  - `https://stock-themes.com/how-to-use`
  - `https://stock-themes.com/support`
  - `https://stock-themes.com/static/app.js?v=97540be4`
  - `https://stock-themes.com/api/theme-ranking?force_reload=1`
  - `https://stock-themes.com/api/rank-history`
  - `https://stock-themes.com/api/dip-alerts?period=1D`
- repo context:
  - `./mag7-backtest-results-round5_2015_2025.md`
  - `./multi-universe-backtest-results-round5_2015_2025.md`
  - `../../config/backtest/strategy-presets.json`

## 目的

`stock-themes.com` が **どのように「盛り上がっているテーマ」を見抜いていそうか** を、公開情報だけから整理する。  
内部実装の断定ではなく、**画面 / API / FAQ / app.js から外形的に確認できる範囲** に限定する。

## 観察結果

### 1. テーマ騰落率は「構成銘柄の日次騰落率の単純平均」

support FAQ には、テーマ騰落率について次が明記されている。

> 構成銘柄の日次騰落率の単純平均（時価総額加重ではなく）を用いて計算しています。

これは重要で、同サイトのテーマ強度は **大型1銘柄の寄与ではなく、テーマ全体の広がり** を優先している。  
テーマ投資の判断基準としても、**breadth を見たいなら equal-weight 的な発想が妥当** だと読める。

### 2. ランキングは「期間別リターンで並び替える cross-sectional rank」

app.js では `sortByPeriod(themes, period)` により、`1日`, `5日`, `10日`, `1ヶ月`, `2ヶ月`, `3ヶ月`, `半年`, `1年`, `日中` の各期間で並び替えている。  
UI 上の順位表示も、バックエンドの固定 rank をそのまま使うのではなく、**現在選んでいる期間で再計算** している。

つまりこのサイトの基本思想は、

1. テーマごとの期間別リターンを持つ
2. 選択期間ごとに順位を並べる
3. その順位変化を「資金の流れ」として読む

という構造だと見てよい。

### 3. テーマ単位だけでなく、構成銘柄の内訳も見ている

`/api/theme-ranking` の payload には各テーマごとに以下が含まれている。

- `related`: 構成銘柄の ticker 群
- `tickerPerformances`: 銘柄別の期間リターン
- `theme1`, `theme2`: 親テーマ / 個別テーマの表示分類
- `industry`, `slug`, `is_special`

また `theme-movers-batch` API があり、テーマごとの `top` / `bottom` movers をまとめて取得している。  
したがって、単にテーマ全体の順位を見るだけでなく、**テーマ内部でどの銘柄が牽引しているか / 崩しているか** を補助情報として使っている。

### 4. rank-history は「月末スナップショット」ベース

`/api/rank-history` には `1m`, `2m`, `3m`, `6m`, `1y` ごとの dates と ranks が並んでおり、日付配列は月末系列になっている。  
これは日中のノイズではなく、**月次スナップショットでテーマ順位の継続性や変化を追う** 設計を示している。

ここから、同サイトは「今日の急騰テーマ」だけでなく、

- 1ヶ月前から見てどうか
- 3ヶ月前から見てどうか
- 年初来や 1 年で見ても上位か

という **persistence** をかなり重視していると考えられる。

### 5. sparkline は短期ノイズより「テーマ全体の中心線」を見せている

app.js の sparkline cache comment には `median_returns` が使われている。  
少なくとも sparkline 表示は、単純な 1 銘柄代表ではなく、**テーマ全体の中位的な動き** を見せようとしている可能性が高い。

これは theme ranking の単純平均と同じ方向で、**単独のヒーロー銘柄に引っ張られすぎない見せ方** と整合している。

### 6. dip alert は「強かったテーマの押し目」を月末順位起点で監視している

`/api/dip-alerts` と app.js の描画コードから、押し目アラートは次のような構造だと確認できる。

- snapshot_date は月末
- `rank_at_snapshot` と `lb_period` を持つ
- その後の下落を `10-20%`, `20-30%`, `30%+` に分ける
- `0-1M`, `1-2M`, `2-3M` の window を持つ
- signal catalog は `win_rate desc` 順で表示される
- UI 上の説明では「過去5年検証」「テーマ内銘柄を均等保有・日次リバランス」「対 S&P500 勝率 / 超過リターン中央値」を出している

つまり dip alert は、

1. もともと上位にいたテーマ
2. 一定期間内に一定幅下落
3. その押し目パターンの履歴成績を参照

という **trend-following + pullback** の発想で動いている。

### 7. マクロ分類を別レイヤーで持っている

トップ画面の map filter には `sector`, `style`, `commodity`, `rate` がある。  
これはテーマ単体のランキングだけでなく、**マクロテーマや金利・商品・スタイルの地合い整合** も別レイヤーで見ていることを示す。

実際の投資判断では、

- テーマ自体の順位
- テーマ内の銘柄 breadth
- マクロ分類の追い風 / 逆風

を重ねて読むのが自然だと考えられる。

## `stock-themes.com` から抽出できる判断軸

### A. Heat

- 指標: `1日`, `5日`, `10日` のテーマ順位 / テーマ騰落率
- 意味: 直近で資金が流入しているか

### B. Acceleration

- 指標: 1日・5日・10日の順位改善、短期リターンの上振れ
- 意味: まだ上位に「なりつつある」テーマか

### C. Persistence

- 指標: `1ヶ月`, `3ヶ月`, `半年`, `1年` の順位維持
- 意味: 一過性ニュースではなく継続テーマか

### D. Breadth

- 指標: 単純平均テーマリターン、関連銘柄の movers / constituent performance
- 意味: 1 銘柄依存ではなくテーマ全体に広がっているか

### E. Dip Reclaim

- 指標: 月末上位テーマが `10-20%` / `20-30%` 押した後の履歴パターン
- 意味: 強テーマの押し目が次の entry chance になるか

### F. Macro Alignment

- 指標: sector / style / commodity / rate の分類
- 意味: テーマ単独ではなく、上位テーマの共通背景を読む

## この repo で再現する最小 proxy

外部テーマデータをそのまま backtest engine に入れていない現状では、round6 では次の proxy が現実的。

| theme axis | public site の見え方 | この repo の proxy |
|---|---|---|
| heat | 1D/5D/10D の順位 | `donchian 20/10` |
| acceleration | 短期順位改善 | `20/10 + RSI regime + tight stop` |
| persistence | 1M/3M/6M/1Y 継続 | `donchian 55/20` |
| breadth | equal-weight theme / RSP 的広がり | `RSP > 200SMA` filter |
| market alignment | 地合いと整合しているか | `SPY > 200SMA` filter |
| dip reclaim | 強テーマの押し目反発 | `RSI long-only` 補完枠 |

## テーマ投資の判断基準（提案）

### 推奨フレーム

1. **継続テーマか**  
   - 3M / 6M / 1Y のいずれかで上位
2. **直近でも熱量が残っているか**  
   - 10D / 5D がプラス、または順位再改善
3. **breadth があるか**  
   - 単純平均で強く、構成銘柄の複数が上昇
4. **地合いと逆行していないか**  
   - SPY / RSP の bull 条件を満たす
5. **entry は breakout か pullback か**  
   - 初動は breakout、強テーマの押しは dip reclaim
6. **exit を曖昧にしない**  
   - price breakout 崩れ、RSI quality 崩れ、または rank 失速

### 実践用の基準案

| 項目 | 推奨基準 |
|---|---|
| テーマ採用 | 3M か 6M で上位 20% 以内 |
| 継続確認 | 1Y でもプラス圏、または 1M が再加速 |
| breadth | 構成銘柄の過半が 5D / 10D でプラス |
| 地合い | `SPY > 200SMA` を最低条件、強気なら `RSP > 200SMA` も確認 |
| 初動 entry | leader 銘柄の `20/10` breakout |
| 継続 entry | leader 銘柄の `55/20` breakout |
| 押し目 entry | 直前まで上位だったテーマのみ RSI pullback を許可 |
| 利確 / 撤退 | breakout exit、または rank persistence 崩れ |

## round6 への反映

round6 では上の観察をそのまま外部テーマデータにはせず、以下の 3 family で近似する。

1. **persistence family**  
   - `55/20 + SPY/RSP + RSI regime`
2. **acceleration family**  
   - `20/10 + SPY/RSP + RSI regime + hard stop`
3. **dip reclaim family**  
   - `RSI long-only + SPY/RSP filter`

## 注意点

- `stock-themes.com` のテーマ選定は FAQ 上でも「開発者の主観が含まれる」と明記されている
- したがって、同サイトの発想は参考になるが、**ランキングの絶対値をそのまま売買ルールにするのではなく、判断軸として借りる** のが安全
- round6 の目的は「テーマ投資の勝ち筋を断定すること」ではなく、**どの proxy が robust に効くかを見つけること** に置く
