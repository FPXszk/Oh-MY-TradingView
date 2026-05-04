# ファンダメンタル × モメンタム スクリーニング 上位20件

更新: 2026-05-04T17:50:56.906Z（JST 2026/05/05 02:50）

スキャン対象: 8 銘柄 → サーバーフィルター通過: 5 → クライアントフィルター通過: 3 → 上位: 3

## 上位5件の選定理由

### 1位 ADEA (NASDAQ)
- 総合点: 6
- 内訳: 3M 1位 / ROE 2位 / FCF 1位 / 売上成長 2位
- 理由: 3か月モメンタムが候補群で1位、FCFマージンも1位、EBAYより総合点が1点良い。

### 2位 EBAY (NASDAQ)
- 総合点: 7
- 内訳: 3M 3位 / ROE 1位 / FCF 2位 / 売上成長 1位
- 理由: ROEが候補群で1位、売上成長率も1位、WLYBより総合点が4点良い。

### 3位 WLYB (NYSE)
- 総合点: 11
- 内訳: 3M 2位 / ROE 3位 / FCF 3位 / 売上成長 3位
- 理由: 3か月モメンタムが候補群で2位、ROEも3位、EBAYとの差は総合点で4点。

## 銘柄ランキング

| 順位 | シンボル | セクター | 市場 | 現在値 | Perf.3M | ROE | FCFマージン | 売上成長 | 総合点 |
|:---:|:---|:---|:---:|---:|---:|---:|---:|---:|---:|
| 1 | **ADEA** | Technology Services | NASDAQ | $33.32 | 77.2% | 25.3% | 35.2% | N/A% | 6 |
| 2 | **EBAY** | Retail Trade | NASDAQ | $109.68 | 17.3% | 42.8% | 18.0% | N/A% | 7 |
| 3 | **WLYB** | Consumer Services | NYSE | $41.20 | 28.1% | 21.5% | 11.8% | N/A% | 11 |

## セクターランキング

| 順位 | セクター | 通過銘柄数 | 平均Perf.3M | 平均総合点 | 代表銘柄 |
|:---:|:---|---:|---:|---:|:---|
| 1 | Technology Services | 1 | 77.2% | 6.0 | ADEA |
| 2 | Consumer Services | 1 | 28.1% | 11.0 | WLYB |
| 3 | Retail Trade | 1 | 17.3% | 7.0 | EBAY |

## 市場カバレッジ

- スキャンスコープ: TradingView Scanner API の `america` 市場、対象は `stock`
- ユニバース追加条件: NASDAQ + NYSE stocks only (OTC excluded)
- 観測レンジ: 今回は最大 160 件まで取得し、その範囲で市場別内訳を集計
- サーバーフィルター通過: NASDAQ 4件, NYSE 1件
- クライアントフィルター通過: NASDAQ 2件, NYSE 1件
- 最終採用: NASDAQ 2件, NYSE 1件
- 補足: TradingView Scanner API returns the filtered stock candidates for the selected market scope; exchange and symbol-universe filters below are additionally applied locally for this run.

## 見ている指標と追加候補

- 現在の主指標: RSI、3か月リターン、相対出来高、52週高値比率、ROE、粗利率、FCFマージン、EPS、P/FCF、売上成長率
- 追加候補: `debtToEquity` は財務レバレッジ確認に有効。高ROEが負債依存かを切り分けられる
- 追加候補: `earningsGrowth` は売上成長だけでは見えない利益成長の質を補える
- 追加候補: `profitMargins` は粗利率より下流の収益性を見られるので、営業効率の確認に向く
- 追加候補: `forwardPE` や `price_book_fq` は過熱感チェックに使えるが、成長株を早く切りすぎる副作用がある
- 追加候補: `dividendYield` は本スクリーナーの性格上は優先度低め。高配当より成長・効率の説明力を優先した方が整合的

---

**スコア算出:** `rank(perf3m) + rank(roe) + rank(fcfMargin) + rank(revenueGrowth)`（合計が小さいほど上位）

**フィルター条件:**
- RSI(14) > 60, 時価総額 > $1B, 相対出来高 > 1.2x
- EPS(TTM) > 0, ROE > 15%, 粗利率(TTM) > 30%, FCFマージン(TTM) > 10%
- Close > SMA200, Close > SMA50, Close ≥ 52週高値 × 75%
- Perf.3M > 10%, P/FCF < 50
- 取引所限定: NASDAQ, NYSE
- Yahoo Finance 補完あり: 売上成長率 YoY > 20%