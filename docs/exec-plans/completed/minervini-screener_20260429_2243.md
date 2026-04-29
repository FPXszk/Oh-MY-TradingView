# ミネルビニスクリーナー実装計画

## 概要

TradingView の非公式スキャナー API (`scanner.tradingview.com/america/scan`) を使用し、
ミネルビニ条件を満たす米国株を自動抽出するスクリーナー機能を実装する。
CDP は不要（外部 fetch のみ）。スクリーニング結果は既存の `tv market analysis` や
`tv workspace watchlist-add` との連携が可能なパイプラインを形成する。

---

## 調査結果：TradingView スキャナー API

### エンドポイント
```
POST https://scanner.tradingview.com/america/scan
Content-Type: application/json
```
- 認証不要・公開エンドポイント
- `markets: ["america"]` で米国株対象
- `symbols.query.types: ["stock"]` でストックのみ

### ミネルビニ条件とフィールドのマッピング

| 条件 | API フィールド | フィルタ方式 |
|---|---|---|
| RSI(14) >= 60 | `RSI` | サーバーサイド `egreater` |
| 時価総額 >= 10億USD | `market_cap_basic` | サーバーサイド `egreater` |
| 出来高 >= 平均出来高 × 1.2 | `Relative.Volume` | サーバーサイド `egreater` |
| 現在値 > SMA200 | `close`, `SMA200` | クライアントサイド後処理 |
| 現在値 > SMA50 | `close`, `SMA50` | クライアントサイド後処理 |
| 現在値 >= 52週高値 × 75% | `close`, `High.All` | クライアントサイド後処理 |

**サーバーサイド3条件**で候補を絞り込み、残り3条件をクライアントで追加フィルタリングする。

### リクエスト例
```json
{
  "filter": [
    {"left": "RSI", "operation": "egreater", "right": 60},
    {"left": "market_cap_basic", "operation": "egreater", "right": 1000000000},
    {"left": "Relative.Volume", "operation": "egreater", "right": 1.2}
  ],
  "options": {"lang": "en"},
  "markets": ["america"],
  "symbols": {"query": {"types": ["stock"]}, "tickers": []},
  "columns": [
    "name", "close", "RSI", "SMA200", "SMA50",
    "High.All", "Relative.Volume", "market_cap_basic", "volume"
  ],
  "sort": {"sortBy": "RSI", "sortOrder": "desc"},
  "range": [0, 100]
}
```

### レスポンス形式
```json
{
  "totalCount": 287,
  "data": [
    {"s": "NASDAQ:NVDA", "d": [892.5, 87.3, 450.2, 380.1, 950.0, 2.1, 2200000000000, 45000000]}
  ]
}
```
- `s`: シンボル (`EXCHANGE:TICKER` 形式)
- `d`: `columns` と同順の値配列

---

## 実装スコープ

### 対象外（この計画では含まない）
- CDP 経由でのスクリーナーページ UI 操作
- 既存 `repo-structure-align-and-archive-rules` プランとの競合なし

---

## 変更ファイル一覧

| ファイル | 操作 | 内容 |
|---|---|---|
| `src/core/minervini-screener.js` | CREATE | スキャナー API 呼び出し + ミネルビニフィルタ |
| `src/cli/commands/screener.js` | CREATE | `tv screener minervini` CLI コマンド |
| `src/tools/screener.js` | CREATE | `market_minervini_screener` MCP ツール |
| `src/cli/index.js` | MODIFY | `import './commands/screener.js'` 追加 |
| `src/server.js` | MODIFY | `registerScreenerTools` 追加 |
| `src/core/index.js` | MODIFY | `runMinervinScreener` export 追加 |

---

## 実装ステップ

- [x] exec-plan 作成
- [ ] `src/core/minervini-screener.js` 作成（スキャナー API + ミネルビニロジック）
- [ ] `src/cli/commands/screener.js` 作成（CLI `tv screener minervini`）
- [ ] `src/tools/screener.js` 作成（MCP ツール `market_minervini_screener`）
- [ ] `src/cli/index.js` に import 追加
- [ ] `src/server.js` に registerScreenerTools 追加
- [ ] `src/core/index.js` に export 追加
- [ ] `npm test` で既存テストが全てパスすることを確認
- [ ] docs/exec-plans/completed/ に移動 → コミット & プッシュ

---

## CLI インターフェース設計

```bash
# 基本実行（デフォルト最大50件）
tv screener minervini

# 結果数を絞る
tv screener minervini --limit 20

# コンパクト出力
tv screener minervini --compact
```

## MCP ツール設計

```
market_minervini_screener(limit?: number)
```
- `limit`: 返却最大件数（デフォルト 50、上限 200）

## 出力形式

```json
{
  "success": true,
  "totalScanned": 8234,
  "serverFiltered": 287,
  "matched": 42,
  "criteria": {
    "rsi14_min": 60,
    "market_cap_min_usd": 1000000000,
    "relative_volume_min": 1.2,
    "price_above_sma200": true,
    "price_above_sma50": true,
    "price_pct_of_52wk_high_min": 75
  },
  "results": [
    {
      "symbol": "NVDA",
      "exchange": "NASDAQ",
      "close": 892.5,
      "rsi14": 87.3,
      "sma200": 450.2,
      "sma50": 380.1,
      "high52w": 950.0,
      "pctOf52wHigh": 93.9,
      "relativeVolume": 2.1,
      "marketCapUsd": 2200000000000
    }
  ],
  "retrieved_at": "2026-04-29T22:43:50.370Z",
  "source": "tradingview_scanner"
}
```

---

## リスク

- TradingView スキャナー API はレート制限あり（実際には CLI/MCP で1回呼び出すだけなので問題なし）
- `Relative.Volume` フィールドが常に利用可能でない銘柄（新規上場等）はスキップされる
- `High.All` が null の場合は 52 週高値条件をスキップする（警告付き）
