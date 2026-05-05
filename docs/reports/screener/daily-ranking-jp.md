# 日本株 ファンダメンタル × モメンタム スクリーニング 上位20件

更新: 2026-05-05T04:50:00.074Z（JST 2026/05/05 13:50）

スキャン対象: 2 銘柄 → スコープ通過: 1 → Phase1 セクターフィルター通過: 1 → クライアントフィルター通過: 0 → 上位: 0

## Phase1 セクターランキング

- アプローチ: 銘柄集計
- 採用セクター: Producer Manufacturing, Electronic Technology, Process Industries
- Phase1 ソース候補数: 1479 / reported 3916

| 順位 | セクター | 1M | 3M | RSI | 相対出来高 | 出来高/構成数 | 総合点 |
|:---:|:---|---:|---:|---:|---:|:---|---:|
| 1 | Producer Manufacturing | 7.6% | 11.0% | 51.2 | 1.20x | 224銘柄 | 13 |
| 2 | Electronic Technology | 13.6% | 23.8% | 53.0 | 1.02x | 96銘柄 | 14 |
| 3 | Process Industries | 2.4% | 7.3% | 47.2 | 1.27x | 131銘柄 | 22 |
| 4 | Distribution Services | -0.1% | 0.6% | 46.0 | 1.16x | 84銘柄 | 36 |
| 5 | Industrial Services | -0.6% | 2.0% | 48.1 | 0.90x | 69銘柄 | 39 |
| 6 | Communications | 4.9% | 0.0% | 47.9 | 0.85x | 9銘柄 | 40 |
| 7 | Finance | 0.4% | 4.8% | 46.5 | 0.99x | 165銘柄 | 44 |
| 8 | Utilities | -5.3% | 8.4% | 40.6 | 1.41x | 27銘柄 | 45 |
| 9 | Non-Energy Minerals | -0.9% | 1.3% | 42.8 | 1.12x | 41銘柄 | 47 |
| 10 | Transportation | -2.7% | 0.7% | 42.3 | 1.20x | 50銘柄 | 50 |
| 11 | Health Technology | -1.9% | 3.2% | 43.1 | 0.94x | 57銘柄 | 52 |
| 12 | Commercial Services | -1.2% | -5.7% | 42.6 | 1.32x | 82銘柄 | 53 |
| 13 | Consumer Durables | -1.7% | -0.4% | 41.8 | 1.12x | 59銘柄 | 54 |
| 14 | Technology Services | 0.1% | -8.8% | 43.5 | 0.95x | 117銘柄 | 61 |
| 15 | Consumer Non-Durables | -2.0% | 0.5% | 41.1 | 1.07x | 88銘柄 | 63 |
| 16 | Energy Minerals | -10.7% | 4.9% | 42.1 | 0.79x | 7銘柄 | 74 |
| 17 | Consumer Services | -4.2% | -3.5% | 39.7 | 0.88x | 76銘柄 | 79 |
| 18 | Retail Trade | -3.9% | -4.0% | 39.3 | 0.97x | 92銘柄 | 80 |
| 19 | Health Services | -3.7% | -3.6% | 39.0 | 0.92x | 5銘柄 | 84 |

> 本日は条件を満たす銘柄がありませんでした。

## Phase2 通過銘柄のセクター内訳

- 条件通過銘柄がないため、Phase2 のセクター内訳は算出できませんでした。

## 市場カバレッジ

- スキャンスコープ: TradingView Scanner API の `japan` 市場、対象は `stock`
- ユニバース追加条件: JPX Prime domestic stocks snapshot (2026-03-31)
- 観測レンジ: 今回は最大 160 件まで取得し、その範囲で市場別内訳を集計
- スコープ通過: TSE 1件
- Phase1 セクターフィルター通過: TSE 1件
- クライアントフィルター通過: データなし
- 最終採用: データなし
- 補足: TradingView Scanner API returns the filtered stock candidates for the selected market scope; exchange and symbol-universe filters below are additionally applied locally for this run. Phase1 then selected Producer Manufacturing, Electronic Technology, Process Industries before the Phase2 stock filters were applied.

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
- 取引所限定: TSE
- 銘柄ユニバース限定: jpx-prime
- Yahoo Finance 補完あり: 売上成長率 YoY > 20%