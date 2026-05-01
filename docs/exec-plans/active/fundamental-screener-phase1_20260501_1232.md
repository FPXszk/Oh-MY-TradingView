# ファンダメンタルスクリーナー Phase 1 実装計画

## 概要

TradingView Scanner API のみを使い、ファンダメンタル（ROE・EPS・粗利率・FCF）×
モメンタム（ミネルビニ基準）の複合条件でUS株をスクリーニングし、
**毎朝 JST 12:00 に上位10件を `docs/reports/screener/daily-ranking.md` へ自動更新**する仕組みを実装する。

CDP 不要・self-hosted runner 不要。GitHub-hosted runner で完結させる。

---

## 事前調査結果（Scanner API フィールド疎通確認済み）

### 取得可能（✅）

| フィールド | 内容 |
|---|---|
| `RSI` | RSI(14) |
| `SMA200`, `SMA50` | 移動平均 |
| `price_52_week_high` | 52週高値（`High.All`と同値） |
| `Perf.3M` | 3ヶ月パフォーマンス(%) |
| `market_cap_basic` | 時価総額 |
| `relative_volume_10d_calc` | 相対出来高 |
| `earnings_per_share_diluted_ttm` | EPS (TTM) |
| `return_on_equity` | ROE (%) |
| `gross_margin_ttm` | 粗利率 (TTM, %) |
| `free_cash_flow_margin_ttm` | FCF マージン (TTM, %) |
| `free_cash_flow_ttm` | FCF 絶対額 (TTM) |
| `net_debt` | ネット負債（負値 = ネットキャッシュ） |
| `total_debt` | 有利子負債 |

### Phase 1 スコープ外（取得不可）

| 提案フィールド | 理由 | 対応 |
|---|---|---|
| `revenue_growth_ttm` | Scanner API に存在しない | Phase 2 で Yahoo Finance 補完 |
| `price_to_free_cash_flow_ttm` | 存在しない | クライアントサイド計算で代替 |
| `cash_n_short_term_investments` | 存在しない | `net_debt` で代替 |

---

## フィルター設計

### サーバーサイドフィルター（Scanner API filter）

```json
[
  { "left": "RSI",                          "operation": "egreater", "right": 60 },
  { "left": "market_cap_basic",             "operation": "egreater", "right": 1000000000 },
  { "left": "relative_volume_10d_calc",     "operation": "egreater", "right": 1.2 },
  { "left": "earnings_per_share_diluted_ttm","operation": "egreater", "right": 0 },
  { "left": "return_on_equity",             "operation": "egreater", "right": 15 },
  { "left": "gross_margin_ttm",             "operation": "egreater", "right": 40 },
  { "left": "free_cash_flow_margin_ttm",    "operation": "egreater", "right": 10 }
]
```

### クライアントサイドフィルター（後処理）

- `close > SMA200`
- `close > SMA50`
- `close / price_52_week_high >= 0.75`
- `Perf.3M > 10`
- `market_cap_basic / free_cash_flow_ttm < 50`（P/FCF代替）

### ソートスコア（ランクサム方式）

候補銘柄をフィルタ後、以下3指標で個別ランク付けして合計スコアで Top 10 を選定：

```
score = rank_asc(Perf.3M) + rank_asc(return_on_equity) + rank_asc(free_cash_flow_margin_ttm)
```

`rank_asc`: 値が大きいほど高順位（1位=最大値）

---

## 変更・作成ファイル一覧

| ファイル | 操作 | 内容 |
|---|---|---|
| `src/core/fundamental-screener.js` | CREATE | Scanner API 呼び出し + 複合フィルタ + ランクサム |
| `src/cli/commands/screener.js` | MODIFY | `fundamental` サブコマンド追加 |
| `src/tools/screener.js` | MODIFY | `market_fundamental_screener` MCP ツール追加 |
| `src/core/index.js` | MODIFY | `runFundamentalScreener` export 追加 |
| `scripts/screener/run-fundamental-screening.mjs` | CREATE | GHA 用エントリスクリプト（MD生成・git commit） |
| `.github/workflows/daily-screener.yml` | CREATE | schedule cron + github-hosted runner |
| `docs/reports/screener/.gitkeep` | CREATE | ディレクトリ作成（初回コミット用） |

---

## 実装ステップ

- [ ] exec-plan 作成（本ファイル）
- [ ] `src/core/fundamental-screener.js` 作成
  - COLUMNS 定義（全13フィールド）
  - `buildRequestBody()` サーバーサイドフィルター7条件
  - `normalizeRow()` データ正規化（P/FCF計算含む）
  - `passesClientFilters()` クライアントフィルター5条件
  - `rankSum()` ランクサムスコア計算
  - `runFundamentalScreener({ limit, _deps })` エクスポート
- [ ] `src/cli/commands/screener.js` に `fundamental` サブコマンド追加
- [ ] `src/tools/screener.js` に `market_fundamental_screener` MCP ツール追加
- [ ] `src/core/index.js` に `runFundamentalScreener` export 追加
- [ ] `scripts/screener/run-fundamental-screening.mjs` 作成
  - `runFundamentalScreener()` 呼び出し
  - `docs/reports/screener/daily-ranking.md` 上書き生成
  - `git add → git commit → git push`（GITHUB_TOKEN 使用）
- [ ] `docs/reports/screener/.gitkeep` 作成
- [ ] `.github/workflows/daily-screener.yml` 作成
  - `schedule: cron: '0 3 * * *'`（JST 12:00）
  - `workflow_dispatch` 手動トリガー
  - GitHub-hosted ubuntu-latest runner
  - Node.js セットアップ → `npm ci` → スクリプト実行 → git push
- [ ] `npm test` で既存テストが全てパスすることを確認
- [ ] docs/exec-plans/completed/ に移動 → コミット & プッシュ

---

## CLI インターフェース設計

```bash
# ファンダメンタルスクリーナー実行
tv screener fundamental

# 上限数指定
tv screener fundamental --limit 20

# コンパクト出力
tv screener fundamental --compact
```

## MCP ツール設計

```
market_fundamental_screener(limit?: number)
```

---

## 出力 Markdown フォーマット（daily-ranking.md）

```markdown
# ファンダメンタル × モメンタム スクリーニング 上位10件

更新: 2026-05-01T03:00:00Z（JST 12:00）

| 順位 | シンボル | 現在値 | RSI | Perf.3M | ROE | FCFマージン | 粗利率 | P/FCF | ネット負債 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | NVDA | 199.57 | 54.1 | 4.4% | 101.5% | 38.8% | 71.1% | 58.0 | -51,144M |
...

スコア算出: rank(Perf.3M) + rank(ROE) + rank(FCFマージン)
フィルター条件: RSI>60, 時価総額>$1B, 相対出来高>1.2x, EPS黒字, ROE>15%, 粗利率>40%, FCFマージン>10%, Perf.3M>10%, P/FCF<50, close>SMA200, close>SMA50, close≥52週高値×75%
```

---

## リスク・注意事項

1. **TradingView Scanner API のレート制限**: 毎朝1回なので問題なし
2. **`Perf.3M` フィルター（>10%）**: 市場低迷期は候補ゼロになりうる → 候補0件でもエラーとせず「該当なし」でMDを更新
3. **売上成長率なし**: Phase 1スコープ外。ROE・FCFマージン・粗利率で財務品質を代替
4. **git push の認証**: GitHub Actions の `GITHUB_TOKEN` + HTTPS。SSH制約はself-hosted環境向けであり、GHAワークフロー内は対象外と解釈
5. **既存ワークフロー（night-batch-self-hosted.yml）との競合**: なし（独立したワークフロー）
6. **`docs/reports/screener/` ディレクトリ**: repo-layout テストは中身を制約していないため追加してもテスト破壊なし
