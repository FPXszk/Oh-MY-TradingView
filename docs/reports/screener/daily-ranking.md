# ファンダメンタル × モメンタム スクリーニング 上位20件

更新: 2026-05-04T16:50:01.025Z（JST 2026/05/05 01:50）

スキャン対象: 7 銘柄 → サーバーフィルター通過: 7 → クライアントフィルター通過: 5 → 上位: 5

## 上位5件の選定理由

### 1位 GMWKF (OTC)
- 総合点: 6
- 内訳: 3M 2位 / ROE 1位 / FCF 1位 / 売上成長 2位
- 理由: ROEが候補群で1位、FCFマージンも1位、EBAYより総合点が3点良い。

### 2位 EBAY (NASDAQ)
- 総合点: 9
- 内訳: 3M 3位 / ROE 2位 / FCF 3位 / 売上成長 1位
- 理由: 売上成長率が候補群で1位、ROEも2位、MFRVFより総合点が4点良い。

### 3位 MFRVF (OTC)
- 総合点: 13
- 内訳: 3M 5位 / ROE 3位 / FCF 2位 / 売上成長 3位
- 理由: FCFマージンが候補群で2位、ROEも3位、WLYBより総合点が2点良い、一方で3か月モメンタムは5位で弱点。

### 4位 WLYB (NYSE)
- 総合点: 15
- 内訳: 3M 1位 / ROE 4位 / FCF 5位 / 売上成長 5位
- 理由: 3か月モメンタムが候補群で1位、ROEも4位、VAIAFより総合点が2点良い、一方で売上成長率は5位で弱点。

### 5位 VAIAF (OTC)
- 総合点: 17
- 内訳: 3M 4位 / ROE 5位 / FCF 4位 / 売上成長 4位
- 理由: 3か月モメンタムが候補群で4位、FCFマージンも4位、WLYBとの差は総合点で2点、一方でROEは5位で弱点。

## 銘柄ランキング

| 順位 | シンボル | セクター | 市場 | 現在値 | Perf.3M | ROE | FCFマージン | 売上成長 | 総合点 |
|:---:|:---|:---|:---:|---:|---:|---:|---:|---:|---:|
| 1 | **GMWKF** | Consumer Durables | OTC | $275.04 | 16.5% | 67.9% | 39.4% | N/A% | 6 |
| 2 | **EBAY** | Retail Trade | NASDAQ | $108.77 | 16.3% | 42.8% | 18.0% | N/A% | 9 |
| 3 | **MFRVF** | Non-Energy Minerals | OTC | $0.54 | 11.5% | 22.8% | 23.2% | N/A% | 13 |
| 4 | **WLYB** | Consumer Services | NYSE | $41.20 | 28.1% | 21.5% | 11.8% | N/A% | 15 |
| 5 | **VAIAF** | Electronic Technology | OTC | $60.10 | 14.5% | 20.6% | 12.1% | N/A% | 17 |

## セクターランキング

| 順位 | セクター | 通過銘柄数 | 平均Perf.3M | 平均総合点 | 代表銘柄 |
|:---:|:---|---:|---:|---:|:---|
| 1 | Consumer Services | 1 | 28.1% | 15.0 | WLYB |
| 2 | Consumer Durables | 1 | 16.5% | 6.0 | GMWKF |
| 3 | Retail Trade | 1 | 16.3% | 9.0 | EBAY |
| 4 | Electronic Technology | 1 | 14.5% | 17.0 | VAIAF |
| 5 | Non-Energy Minerals | 1 | 11.5% | 13.0 | MFRVF |

## 市場カバレッジ

- スキャンスコープ: TradingView Scanner API の `america` 市場、対象は `stock`
- 観測レンジ: 今回は最大 160 件まで取得し、その範囲で市場別内訳を集計
- サーバーフィルター通過: NASDAQ 3件, OTC 3件, NYSE 1件
- クライアントフィルター通過: OTC 3件, NASDAQ 1件, NYSE 1件
- 最終採用: OTC 3件, NASDAQ 1件, NYSE 1件
- 補足: TradingView Scanner API returns the filtered stock universe for the america market scope; exchange counts below are based on the returned candidates for this run.

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
- EPS(TTM) > 0, ROE > 15%, 粗利率(TTM) > 40%, FCFマージン(TTM) > 10%
- Close > SMA200, Close > SMA50, Close ≥ 52週高値 × 75%
- Perf.3M > 10%, P/FCF < 50
- Yahoo Finance 補完あり: 売上成長率 YoY > 20%