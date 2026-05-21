# 実行計画: portfolio_health_check_report フォーマット刷新

**日時**: 2026-05-21 15:30  
**スコープ**: Markdownフォーマットのみ（データ取得・集計ロジック変更なし）

---

## 変更対象ファイル

| ファイル | 変更種別 |
|---|---|
| `scripts/portfolio/build-unified-portfolio-report.mjs` | 主要変更（関数差し替え） |
| `tests/sbi-portfolio-report.test.js` | テストアサーション更新 |

---

## 実装ステップ

- [ ] 1. `scripts/portfolio/build-unified-portfolio-report.mjs` を改修
  - [ ] 1a. import から不要な `buildPortfolioReport`, `buildPortfolioDiagnosticsReport` を削除
  - [ ] 1b. `formatSignedPct` ヘルパーを追加
  - [ ] 1c. 古いヘルパー削除: `formatSbiCash`, `createHoldingRow`, `buildCombinedHoldings`, `buildExecutiveSummary`, `demoteReport`
  - [ ] 1d. 新ヘルパー追加: `estimateUsdJpyRate`, `buildUnifiedPositionList`, `buildRealizedAndDividendSection`, `buildMetaSection`
  - [ ] 1e. `buildUnifiedPortfolioReport` 本体を新7セクション構成に書き換え
- [ ] 2. `tests/sbi-portfolio-report.test.js` のアサーション更新
- [ ] 3. `npm test` でテスト通過確認
- [ ] 4. 実機実行でレポート出力確認

---

## 新セクション構成

1. **ヘッダー**: `# Portfolio Health Check — YYYY-MM-DD` + SBI/moomoo取得時刻
2. **🚦 ヘルスサマリー**: 3行以内の動的テキスト
3. **📊 資産スナップショット**: 2口座1表 + USD/JPY レート注記
4. **📋 ポジション一覧（統合）**: 全銘柄1表、abs(P/L)降順
5. **💰 実現損益 & 配当**: データあり時のみ表、なし時は1行テキスト、配当最大10件
6. **⚠️ アラート**: -20%超の含み損ポジションがある場合のみ
7. **🔧 取得メタ情報**: run_id等をまとめて末尾に配置

---

## 廃止・削除

- `## 総合サマリー` 表（6行の比較表）→ 削除
- `## 総合保有一覧` 表（重複）→ 統合ポジション一覧に一本化
- `## SBI 詳細` / `## moomoo 詳細` 各口座詳細→ 削除
- 空テーブル（実現益上位・直近約定等）→ 削除
- 英語ラベル（moomoo詳細のSummary/Accountsなど）→ 全て日本語に統一済み（セクション削除により解決）
