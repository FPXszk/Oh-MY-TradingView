# ファンダメンタルスクリーナー Phase 2 実装計画

## 概要

Phase 1（Scanner APIのみ）で取得できなかった**売上成長率**を、
既存の `getSymbolFundamentals()` (Yahoo Finance) で補完する。

新規外部ライブラリは不要。`src/core/market-intel.js` の既存関数を流用するだけで完結。

---

## 前提確認

### 既存 `getSymbolFundamentals()` の動作

`src/core/market-intel.js` の `getSymbolFundamentals()` は
Yahoo Finance の `quoteSummary?modules=summaryDetail,defaultKeyStatistics,financialData` を叩き、
**`financialData.revenueGrowth`**（YoY 四半期売上成長率）を返す。

```js
revenueGrowth: normalizeNumber(financials.revenueGrowth?.raw),
// 例: 0.127 = +12.7%
```

この値を使い、「売上成長率 > 20%」フィルターと ランクサムへの追加が目的。

---

## Phase 2 フィルター追加内容

| 追加条件 | 閾値 |
|---|---|
| 売上成長率 (YoY) | `revenueGrowth > 0.20` (>20%) |

### ランクサム更新

```
score = rank(Perf.3M) + rank(ROE) + rank(FCFマージン) + rank(revenueGrowth)
```

---

## レート制限対策

Yahoo Finance は大量並列アクセスでブロックされる場合がある。
Phase 1 のクライアントフィルター通過銘柄数は通常 10〜30 件程度（本日実測: 14件）。

対策:
- **並行数を 5 に制限**（5件ずつ逐次バッチ処理）
- バッチ間に 500ms スリープ
- エラー時は当該銘柄の `revenueGrowth` を `null` とし、フィルター除外ではなく**ランク最下位**として扱う（1銘柄失敗で全体が壊れない）

---

## 変更ファイル一覧

| ファイル | 操作 | 内容 |
|---|---|---|
| `src/core/fundamental-screener.js` | MODIFY | `enrichWithYahoo` オプション追加。concurrency制限付きでYahoo Finance呼び出し。revenueGrowthフィルター + ランクサム追加 |
| `src/cli/commands/screener.js` | MODIFY | `fundamental` サブコマンドに `--with-yahoo` フラグ追加 |
| `src/tools/screener.js` | MODIFY | `market_fundamental_screener` に `with_yahoo: boolean` パラメータ追加 |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | デフォルトで `enrichWithYahoo: true` を渡す |

---

## 実装ステップ

- [ ] exec-plan 作成（本ファイル）
- [ ] `src/core/fundamental-screener.js` 修正
  - `enrichWithYahoo` オプション（デフォルト `false`）
  - `batchFetchRevenueGrowth(symbols)`: 並行数5、500msスリープ、エラー時 null
  - クライアントフィルターに `revenueGrowth > 0.20` 追加（enrichWithYahoo=true 時のみ）
  - `assignRanks` に `revenueGrowth` を追加（enrichWithYahoo=true 時のみ）
  - `criteria` に `revenue_growth_min_pct: 20` 追加
- [ ] `src/cli/commands/screener.js` 修正
  - `--with-yahoo` フラグ追加
  - フラグが立っていれば `enrichWithYahoo: true` を渡す
- [ ] `src/tools/screener.js` 修正
  - `with_yahoo: z.boolean().optional()` パラメータ追加
- [ ] `scripts/screener/run-fundamental-screening.mjs` 修正
  - `enrichWithYahoo: true` をデフォルトとして渡す
- [ ] `npm test` で既存テストが全てパスすることを確認
- [ ] 実際に `--with-yahoo` を試してYahoo Finance呼び出しが動作することを確認
- [ ] docs/exec-plans/completed/ に移動 → コミット & プッシュ

---

## インターフェース設計

### CLI

```bash
# Yahoo Finance補完あり（売上成長率>20%フィルター有効）
tv screener fundamental --with-yahoo

# Scanner APIのみ（Phase 1相当）
tv screener fundamental
```

### MCP ツール

```
market_fundamental_screener(limit?: number, with_yahoo?: boolean)
```

### GHA エントリ

```js
await runFundamentalScreener({ limit: 10, enrichWithYahoo: true });
```

---

## リスク・注意事項

1. **Yahoo Finance のレート制限**: バッチ5件・500msスリープで対策。GHAの自動実行は朝1回のみなので問題ない想定
2. **Yahoo Finance の `revenueGrowth` フィールド**: `financialData.revenueGrowth.raw` は最新四半期の前年同期比成長率（YoY quarterly）。TTMベースの年間成長率とは異なるが、Scanner APIに代替がないため現状最良の指標
3. **null許容**: Yahoo Finance 呼び出し失敗時は `revenueGrowth: null` として記録し、フィルター除外ではなくランク最下位扱い。ユーザーへの情報提供として `enrichFailed: true` フラグを付与
4. **既存Phase 1動作の維持**: `enrichWithYahoo: false`（デフォルト）の場合は Phase 1 と完全に同じ動作を維持する
