# Exec-plan: implement-p0-p1-fundamental-screener-us_20260505_2246

## 概要

目的: `docs/strategy/momentum-fundamental-screening-indicators-research_20260505.md` の P0 / P1 評価基準を、米国株向けの日次スクリーナーへ実装する。現行の `Perf.3M + ROE + FCF margin` 中心の rank-sum から、モメンタム、セクター強度、収益性/品質、成長、リスク/バリュエーションを分けた scoring に変える。

今回の成功条件は、米国株スクリーニング workflow 相当の `scripts/screener/run-fundamental-screening.mjs` を実行し、最適化後の Markdown レポートが生成されること。最後に改善余地をセッションログへ記録し、成果物を main へ push する。

## 前提

- 対象は米国株のみ。日本株 workflow / JPX Prime allowlist は変更しない。
- 12-1 momentum、SUE、short interest、institutional ownership change は外部データが必要なため、今回の実装では TradingView Scanner API で取れる P0/P1 proxy を採用する。
- 初回から複雑なファクターモデルを作らず、既存の TradingView Scanner API + rank-sum の構造に沿って最小限に実装する。
- 実行確認は実 API を使う。Yahoo Finance 補完が失敗しても、TradingView の YoY growth columns を主に使う。

## 変更ファイル

| 種別 | ファイル | 内容 |
|---|---|---|
| 作成 | `docs/exec-plans/active/implement-p0-p1-fundamental-screener-us_20260505_2246.md` | 本計画。PLAN ステップで commit / push する |
| 更新 | `src/core/fundamental-screener.js` | P0/P1 columns 追加、派生指標計算、スコアブロック別 rank-sum、US 向け最適化 criteria 追加 |
| 更新 | `src/core/sector-momentum.js` | US Phase1 を中期モメンタム重視へ変更し、`Perf.6M` / `Perf.Y` を追加。`Perf.1M` / RSI は補助へ降格 |
| 更新 | `scripts/screener/run-fundamental-screening.mjs` | レポート体裁を P0/P1 scoring に合わせて再構成。銘柄ごとの勝ち筋、リスク、次の改善提案を出す |
| 更新 | `tests/fundamental-screener.test.js` | 新 columns と新 scoring の回帰テストを更新 |
| 更新 | `tests/daily-screener-report.test.js` | 新 Markdown 体裁と scoring 表示のテストを更新 |
| 作成 | `docs/sessions/p0-p1-fundamental-screener-us_20260505_2246.md` | 実装内容、実行結果、今後の改善提案を記録 |
| 生成/更新 | `docs/reports/screener/daily-ranking.md` | 実 workflow 相当の米国株スクリーニング結果 |
| 移動 | `docs/exec-plans/active/implement-p0-p1-fundamental-screener-us_20260505_2246.md` → `docs/exec-plans/completed/implement-p0-p1-fundamental-screener-us_20260505_2246.md` | REVIEW 後、COMMIT ステップで完了済みに移す |

## 実装方針

### 採用する P0 / P1 指標

| ブロック | 実装する指標 |
|---|---|
| Price momentum | `Perf.3M`, `Perf.6M`, `Perf.Y`, 52週高値比率 |
| Sector/industry strength | Phase1 sector ETF rank。US では `Perf.3M`, `Perf.6M`, `Perf.Y`, `relative_volume_10d_calc`, RSI を使う |
| Profitability/quality | `return_on_invested_capital`, `gross_profit_ttm / total_assets`, `operating_margin_ttm`, `free_cash_flow_margin_ttm`, cash conversion |
| Growth confirmation | `total_revenue_yoy_growth_ttm`, `earnings_per_share_diluted_yoy_growth_ttm`, `free_cash_flow_yoy_growth_ttm` |
| Risk/value guard | `price_free_cash_flow_ttm`, `enterprise_value_ebitda_ttm`, `ATR / close`, `beta_1_year`, `debt_to_equity` |

### 今回採用しないもの

- 12-1 momentum: OHLC history が必要なため、今回は `Perf.Y` と `Perf.1M` の差分では近似しない。誤った proxy を避ける。
- SUE / earnings surprise: analyst consensus と実績差が必要なため、TV の EPS YoY growth を proxy にする。
- residual momentum: 回帰モデルと履歴データが必要なため、初回実装には入れない。
- short interest / institutional ownership: 外部データが必要なため今回対象外。

## 影響範囲

- `src/core/fundamental-screener.js` と `src/core/sector-momentum.js` の scoring 仕様が変わる。
- `scripts/screener/run-fundamental-screening.mjs` の Markdown 出力は大幅に変わる。
- `.github/workflows/daily-screener.yml` は今回変更しない。既存 workflow が同じ script を呼ぶため、新体裁がそのまま反映される。
- JP workflow は変更しないが、共通 core の columns 追加は JP 呼び出しにも影響する可能性があるため、テストで壊れていないか確認する。

## 範囲外

- 日本株スクリーニングの最適化
- 新しい外部 API / package 導入
- 12-1 momentum の履歴計算
- factor regression / residual momentum
- GitHub Actions workflow 定義の大幅変更

## 実装ステップ

- [x] 現行 tests を把握し、P0/P1 scoring の expected values を決める
  - 確認: `tests/fundamental-screener.test.js` と `tests/daily-screener-report.test.js` が新仕様で何を固定すべきか明確にする。

- [x] `sector-momentum.js` の US Phase1 を中期モメンタム重視へ変更する
  - 確認: sector ETF scan の columns と `rankingFormula` に `perf6m` / `perfY` が入り、`perf1m` と RSI が補助扱いになる。

- [x] `fundamental-screener.js` に P0/P1 columns と派生指標を実装する
  - 確認: `Perf.6M`、`Perf.Y`、ROIC、gross profit/assets、operating margin、YoY growth、P/FCF、EV/EBITDA、ATR/close、beta、D/E が結果 row に出る。

- [x] scoring を block 別に再構成する
  - 確認: `rankBreakdown` が price momentum / sector strength / quality / growth / risk-value の構造を持ち、総合点が小さいほど上位になる。

- [x] Markdown レポートを新 scoring に合わせて再設計する
  - 確認: 上位銘柄の「なぜ選ばれたか」「弱点/リスク」「改善余地」が読み取れる体裁にする。

- [x] テストを更新・追加する
  - 確認: mock TradingView payload で新 columns の並び、派生指標、rank、Markdown 表示を固定する。

- [x] 実 workflow 相当を米国株で実行する
  - 確認: `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs` が成功し、`docs/reports/screener/daily-ranking.md` が生成される。

- [x] セッションログへ実行結果と今後の改善提案を記録する
  - 確認: 実装内容、実行結果、残課題、次の改善案が `docs/sessions/` に残る。

- [x] レビューと検証を行う
  - 確認: ロジック破綻、過剰な重み付け、取得不可 field の混入、レポート体裁の欠落を確認する。

## 検証コマンド

- `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js`
- `node --test tests/sector-momentum.test.js`（存在する場合）
- `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE SCREENER_REPORT_PATH=docs/reports/screener/daily-ranking.md node scripts/screener/run-fundamental-screening.mjs`
- `rg -n "要出典|一般的" docs/sessions/p0-p1-fundamental-screener-us_20260505_2246.md docs/reports/screener/daily-ranking.md`
- `git diff --check`

## 検証結果

- `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js`: pass
- `tests/sector-momentum.test.js`: 現行 tree に存在しないため未実行
- `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE SCREENER_REPORT_PATH=docs/reports/screener/daily-ranking.md node scripts/screener/run-fundamental-screening.mjs`: pass
  - Phase2 候補取得: 219
  - スコープ通過: 143
  - クライアントフィルター通過: 85
  - 最終表示: 20
- `rg -n "要出典|一般的" docs/sessions/p0-p1-fundamental-screener-us_20260505_2246.md docs/reports/screener/daily-ranking.md`: no matches
- `git diff --check`: pass

## リスク

- TradingView Scanner API の field は非公式で、`price_free_cash_flow_ttm` や YoY growth 系が null になる銘柄がある。null は最下位 rank として扱い、条件で即除外しすぎない。
- P0/P1 を全部 rank に入れると指標数が増え、同じ銘柄が大型 high-quality growth に偏る可能性がある。初回は block 平均 rank にして、1ブロックの列数が多いだけで過重にならないようにする。
- risk/value は「高いほど良い」ではない指標が混ざるため、低い方が良い rank を明示する。
- 実 API の当日状態により候補ゼロになる可能性がある。その場合は server/client coverage をレポートし、閾値の改善案をセッションログに残す。

## 競合確認

既存 active plan:

- `docs/exec-plans/active/run-night-batch_20260429_2344.md`
- `docs/exec-plans/active/night-batch-rerun-focus8-200pack_20260505_0300.md`
- `docs/exec-plans/active/repo-structure-align-and-archive-rules_20260424_2015.md`

いずれも night-batch / repo structure 系で、今回の米国株 screener 実装とは直接競合しない。

---

作成者: Codex
作成日時: 2026-05-05T22:46:00+09:00
