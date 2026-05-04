# 日本株 ファンダメンタル × モメンタム スクリーニング 上位20件

更新: 2026-05-04T17:51:38.303Z（JST 2026/05/05 02:51）

スキャン対象: 2 銘柄 → サーバーフィルター通過: 1 → クライアントフィルター通過: 0 → 上位: 0

> 本日は条件を満たす銘柄がありませんでした。

## セクターランキング

- 条件通過銘柄がないため、セクター順位は算出できませんでした。

## 市場カバレッジ

- スキャンスコープ: TradingView Scanner API の `japan` 市場、対象は `stock`
- ユニバース追加条件: JPX Prime domestic stocks snapshot (2026-03-31)
- 観測レンジ: 今回は最大 160 件まで取得し、その範囲で市場別内訳を集計
- サーバーフィルター通過: TSE 1件
- クライアントフィルター通過: データなし
- 最終採用: データなし
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
- 取引所限定: TSE
- 銘柄ユニバース限定: jpx-prime
- Yahoo Finance 補完あり: 売上成長率 YoY > 20%