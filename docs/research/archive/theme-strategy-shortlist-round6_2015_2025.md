# Round6 テーマ投資ショートリスト (2015-2025)

## 前提

- 対象ユニバース:
  - `mag7`
  - alt rerun: `sp500-top10-point-in-time`, `mega-cap-ex-nvda`
- 期間: `2015-01-01` 〜 `2025-12-31`
- 初期資金: `10000 USD`
- 時間足: 日足 (`D`)
- 比較前提: long-only / 手数料 0 / slippage 0 / 100% of equity
- 背景:
  - round5 では **Mag7 最適が 55/20 family、alt 最適が 20/10 hard-stop family**
  - `stock-themes.com` 観察では **heat / acceleration / persistence / breadth / dip reclaim** がテーマ判断軸として有力

## round6 の狙い

round6 は「外部テーマランキングを直接 backtest する」のではなく、  
**テーマ投資の判断軸を breakout / RSI / regime filter の組み合わせで近似** する round と位置づける。

設計上の考え方は次の 3 本柱。

1. **Persistence**  
   - 長く続くテーマは `55/20`
2. **Acceleration**  
   - 直近で資金が集まり始めたテーマは `20/10`
3. **Dip reclaim**  
   - 強テーマの押し目は `RSI long-only`

## round6 候補 10 本

| priority | id | family | theme axis | 狙い | コメント |
|---|---|---|---|---|---|
| 1 | `donchian-55-20-spy-filter-rsi14-regime-55` | breakout | persistence | 長期継続テーマの本線 | SPY bull + RSI quality を通った 55/20 |
| 2 | `donchian-55-20-rsp-filter-rsi14-regime-50` | breakout | breadth / persistence | breadth を伴う継続テーマ | RSP bull を通った 55/20 |
| 3 | `donchian-55-20-spy-filter-rsi14-regime-50-hard-stop-8pct` | breakout | quality | 持続テーマの品質改善 | stop でテーマ剥落リスクを抑える |
| 4 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct` | breakout | breadth / quality | breadth を伴う継続テーマの選別強化 | round6 の quality-heavy 55/20 |
| 5 | `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-10pct` | breakout | acceleration | 加速テーマの本線 | round5 robust 系に market + RSI gate を追加 |
| 6 | `donchian-20-10-rsp-filter-rsi14-regime-50-hard-stop-10pct` | breakout | breadth / acceleration | breadth を伴う加速テーマ | RSP で単独主導を減らす |
| 7 | `donchian-20-10-spy-filter-rsi14-regime-55-hard-stop-6pct` | breakout | fast rotation | 回転の速いテーマを高速に追う | 強い momentum と浅い stop |
| 8 | `donchian-20-10-rsp-filter-rsi14-regime-55-hard-stop-6pct` | breakout | breadth / fast rotation | breadth を伴う fast rotation | 思惑テーマの短命上昇を意識 |
| 9 | `rsi2-buy-10-sell-65-rsp-filter-long-only` | mean reversion | dip reclaim | 強テーマの押し目拾い | breadth bull 下だけ許可 |
| 10 | `rsi3-buy-15-sell-65-spy-filter-long-only` | mean reversion | dip reclaim | 少し鈍感な押し目回復 | RSI2 より signal を減らす |

## round6 の仮説

### 仮説 1: breadth を伴う 55/20 は「強いテーマの本体」になりやすい

- `55/20` は round5 でも Mag7 最適側だった
- これに `SPY` / `RSP` と `RSI regime` を足すことで、単なる NVDA 捕捉ではなく **持続テーマ** の proxy に寄せられるはず

### 仮説 2: 20/10 + hard stop は「テーマ加速」の最適な執行器になりやすい

- round5 alt 最適は `donchian-20-10-hard-stop-10pct`
- ここに `SPY/RSP + RSI regime` を加えると、**ニュース / 思惑 / セクターローテーションの初動** をより選別できる可能性がある

### 仮説 3: RSI long-only は breakout の代替ではなく補完枠

- round5 でも `META` / `MSFT` / `GOOGL` では RSI long-only が局所優位だった
- round6 では「強テーマの押し目だけに限定した RSI」として、breakout を補完できるかを見る

## 期待する見え方

| 見え方 | 解釈 |
|---|---|
| 55/20 + RSP 系が勝つ | breadth を伴う継続テーマが強い |
| 20/10 + stop 系が alt でも勝つ | テーマ加速は short-term breakout で取る方が robust |
| RSI 補完が一部銘柄でだけ勝つ | 押し目回復は補完用途に留めるのが妥当 |
| SPY と RSP で差が出る | テーマの広がりより mega-cap 主導かどうかが見える |

## 実行順

1. Mag7 で 10 本すべて実行
2. 上位 5〜6 戦略だけ alt universe へ送る
3. docs では次の 3 分類で整理する
   - 非NVDA再現型
   - 品質改善型
   - NVDA依存型

## テーマ投資としての解釈ルール

### A. 継続テーマに乗るとき

- `55/20`
- `SPY > 200SMA` を最低条件
- breadth 重視なら `RSP > 200SMA`

### B. 初動テーマを取りにいくとき

- `20/10`
- hard stop を併用
- `RSI14 > 50` 以上でノイズを減らす

### C. 押し目を拾うとき

- 直前まで上位だったテーマだけ
- `RSI2` or `RSI3`
- market / breadth filter なしの逆張りは避ける

## 注意点

- round6 は theme ranking そのものではなく **theme investing の proxy 戦略** である
- したがって良い結果が出ても「そのテーマ自体が常に買い」という結論にはしない
- むしろ **どの proxy が alt universe でも残るか** を最優先で読む
