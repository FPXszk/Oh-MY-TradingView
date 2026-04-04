# round3 ユニバース候補と銘柄選定メモ (2015-2025)

## 目的

- round2 で見えた **NVDA 依存** を薄める
- 「当時の S&P500 上位10銘柄」のような **より広い大型株バスケット** で上位戦略を試せるかを調べる
- point-in-time の厳密さと、現実的に回せる research コストの折り合いをつける

## 先に押さえるべき注意

- **現在の S&P500 構成銘柄をそのまま過去に使うと survivorship bias が乗る**
- historical constituents を使わない universe では、将来勝ち残る銘柄だけを過去へ持ち込む形になりやすい
- そのため round3 では「完全な日次 reconstitution」まではやらず、**annual snapshot の固定 basket** を first step にする

## 候補比較

| id | 定義 | 長所 | 懸念 | round3 扱い |
|---|---|---|---|---|
| `sp500-top10-point-in-time` | 2015 年の top10 を固定 | 当時の大型株を反映しやすい | 日次 reconstitution ほど厳密ではない | **実装** |
| `annual-rebalance-top10` | 毎年 top10 を入れ替える | 現実に近い | データ整備と runner が重い | research-only |
| `mega-cap-ex-nvda` | 現在の mega-cap から NVDA を除外 | 実務的で速い | historical 厳密性が弱い | **実装** |
| `ex-mag7-spot-check` | Mag7 外の代表大型株だけを spot check | 速い | universe 比較としては弱い | fallback |

## round3 で採用する alt universe

### 1. `sp500-top10-point-in-time`

2015 年の年次スナップショットとして、次の 10 銘柄を採用する。

| rank | company | TradingView 向け ticker |
|---|---|---|
| 1 | Apple | `AAPL` |
| 2 | Alphabet | `GOOGL` |
| 3 | Microsoft | `MSFT` |
| 4 | Berkshire Hathaway | `BRK.B` |
| 5 | Exxon Mobil | `XOM` |
| 6 | Amazon | `AMZN` |
| 7 | Facebook | `META` (`FB` の現 ticker) |
| 8 | Johnson & Johnson | `JNJ` |
| 9 | Wells Fargo | `WFC` |
| 10 | JPMorgan Chase | `JPM` |

### 2. `mega-cap-ex-nvda`

実務的 proxy として、current mega-cap から NVDA を抜いた 10 銘柄も用意する。

- `AAPL`
- `MSFT`
- `GOOGL`
- `AMZN`
- `META`
- `BRK.B`
- `WMT`
- `JPM`
- `XOM`
- `JNJ`

## round3 で見送るもの

### `annual-rebalance-top10`

- 研究としては最も綺麗
- ただし annual ranking のデータ整備と runner の複雑化が大きい
- round3 は「まず fixed basket で NVDA 依存がどこまで落ちるか」を見る段階とする

## 銘柄選定方法の考え方

| 方法 | 向いている目的 | コメント |
|---|---|---|
| 時価総額上位 | 指数の支配力を見る | 「S&P500 上位10」の意味に最も近い |
| 流動性上位 | 実運用寄り | 大型成長に寄りやすい |
| セクターバランス | 汎化の確認 | top10 というより robustness 用 |
| annual snapshot 固定 | 実装コストを抑えた point-in-time 近似 | round3 向き |
| annual rebalance | 研究として最も綺麗 | round4 以降の宿題 |

## round3 の判断

1. **first choice**: `sp500-top10-point-in-time`
2. **practical proxy**: `mega-cap-ex-nvda`
3. **next step**: `annual-rebalance-top10`

## 参考

- Robot Wealth, *How to get historical SPX constituents data for free*  
  https://robotwealth.com/how-to-get-historical-spx-constituents-data-for-free/
- Finhacker, *Largest 20 S&P 500 Companies by Market Cap (1989-2026)*  
  https://www.finhacker.cz/en/top-20-sp-500-companies-by-market-cap/
