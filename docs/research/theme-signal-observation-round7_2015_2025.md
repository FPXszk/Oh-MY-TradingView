# Round7 テーマシグナル観察メモ (2015-2025)

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
  - `./theme-signal-observation-round6_2015_2025.md`
  - `./theme-strategy-shortlist-round6_2015_2025.md`
  - `../../config/backtest/strategy-presets.json`

## 目的

round6 で見えた **breadth を伴う persistence 優位** を前提に、`stock-themes.com` の見方をもう一段深く分解する。  
特に round7 では、**breadth / leader concentration / month-end persistence / dip depth** を別々の proxy に落とし込むための判断軸を整理する。

## round6 から round7 に進める理由

round6 の結果だけでも、「主役は 55/20」「20/10 は補完」「RSI long-only は押し目補完」という大枠は見えた。  
ただし `stock-themes.com` 側では、同じ強テーマでも **立ち上がりの早さ**、**leader 主導の濃さ**、**押しの深さ** を別々に読んでいそうで、round6 の proxy ではそこがまだ粗かった。

## round7 で重視した観察

### 1. breadth は依然として equal-weight 的に読むべき

FAQ でテーマ騰落率が「構成銘柄の日次騰落率の単純平均」と明記されている以上、  
テーマの勢いは **1 銘柄の爆発力より、複数銘柄に広がっているか** を主に見ていると読むのが自然である。

そのため round7 でも breadth 側の proxy は `RSP > 200SMA` を中核に置く。  
ただし round6 の単一版ではなく、今回は

- `breadth-early`
- `breadth-quality`
- `deep-pullback`

の 3 つに分けて扱う。

### 2. persistence は「継続して強い」だけでなく「どの局面で乗るか」が重要

`rank-history` が月末スナップショット中心であることから、同サイトは短期ノイズより  
**数週間〜数か月単位で上位に残るテーマ** をかなり重視している。

ただし実務では、同じ persistence でも次の 3 つは別物である。

1. 立ち上がりを早めに取る
2. quality を厳しめにして leader を選別する
3. 深い押しを許容して trend の再開を待つ

round7 はこの違いを切り分ける round と位置づける。

### 3. leader concentration は strict quality で proxy する方が自然

ranking API には constituent performance があり、theme movers も別に出している。  
つまり `stock-themes.com` は **テーマ全体の breadth** だけでなく、**誰が引っ張っているか** も見ている。

この repo では個別テーマ構成比そのものは持っていないため、round7 では

- `SPY > 200SMA`
- `RSI14 > 60` または `55 + hard stop`

で **leader 主導でも quality が高いときだけ通す** 形に寄せる。

### 4. dip alert は「押したかどうか」ではなく「どれだけ押したか」を見ている

dip alerts は `10-20%`, `20-30%`, `30%+` の深さを分け、さらに `0-1M`, `1-2M`, `2-3M` の window を持っている。  
したがって押し目戦略は、単に RSI を下げれば良いのではなく、

- **浅い押しの reclaim**
- **深い押しの回復**

を別枠で考えるべきである。

round7 ではこの発想を、`RSI2/10/70` と `RSI3/20/70` の 2 本に分けて観察する。  
同時に breakout 側でも `10% stop` を持つ `deep-pullback` を用意し、**押し目 proxy を mean reversion だけに閉じない** 形にした。

### 5. curated theme bias があるので、絶対順位ではなく判断軸だけ借りる

同サイトのテーマ選定には主観が入ることが公開文書でも示されている。  
よって round7 でも「このサイトの上位テーマをそのまま買う」のではなく、

- breadth
- persistence
- concentration
- acceleration
- dip depth

という **見方のフレーム** だけ借りる。

## round7 の proxy 設計

| round7 axis | `stock-themes.com` の見え方 | この repo の proxy |
|---|---|---|
| breadth-early | breadth を保ったまま早めに上がり始める | `55/20 + RSP + RSI14 > 45` |
| breadth-quality | breadth 本線の品質改善 | `55/20 + RSP + RSI14 > 50 + 6% stop` |
| quality-strict | leader 主導でもかなり強いテーマ | `55/20 + SPY + RSI14 > 60` |
| quality-strict-stop | quality を維持して DD を削る | `55/20 + SPY + RSI14 > 55 + 6% stop` |
| deep-pullback | breadth を保った強テーマの深い押し | `55/20 + RSP + RSI14 > 55 + 10% stop` |
| acceleration-reentry | 初動後の再加速 | `20/10 + SPY + RSI14 > 45 + 10% stop` |
| acceleration-balanced | 初動と耐久の中間 | `20/10 + SPY + RSI14 > 50 + 8% stop` |
| breadth-acceleration | breadth を伴う再加速 | `20/10 + RSP + RSI14 > 50 + 8% stop` |
| shallow-dip-reclaim | 浅い押しの高速回復 | `RSI2 buy 10 / sell 70 + RSP` |
| deep-dip-reclaim | 深い押しからの遅め回復 | `RSI3 buy 20 / sell 70 + SPY` |

## round7 の仮説

1. **alt で残る本命は breadth persistence 派生**
   - `breadth-early` か `deep-pullback` が本線候補
2. **Mag7 では strict quality がトップに来てもおかしくない**
   - NVDA / TSLA のような leader 主導では `RSI14 > 60` が効きやすい
3. **20/10 は今回も補完枠の可能性が高い**
   - ただし `AAPL` / `AMZN` で局所優位なら十分価値がある
4. **dip reclaim は主役ではなく、laggard 補完なら残りうる**
   - `GOOGL` のように breakout が鈍い銘柄で比較する

## 実務上の読み方

### 主軸

- breadth がある
- 1M/3M/6M で persistence がある
- そのうえで entry を `early` / `strict` / `deep pullback` に分ける

### 補完

- `20/10` は二段目の加速や再加速を取る執行器
- RSI long-only は breakout の代替ではなく押し目補完

## 注意点

- round7 も external theme data を直接 backtest しているわけではない
- あくまで **theme investing の判断軸を価格ベースで近似** している
- 良い結果が出ても「テーマ自体が常に買い」という結論にはせず、**どの proxy が universes を跨いで残るか** を重視する
