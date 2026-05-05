# Exec-plan: sector-momentum-scan-phase1_20260505_1303

## 概要

目的: 既存のファンダメンタル × モメンタム・スクリーナーに **Phase1: セクターモメンタムスキャン** を追加し、Phase1 で強いと判定したセクターだけを Phase2 の銘柄スクリーニング対象に絞り込む。あわせて Phase3 の日次レポートに Phase1 のセクター順位を明示する。

今回の設計判断（現時点の推奨）:

- **米国ワークフロー: アプローチB（セクターETF）**
  - `scanner.tradingview.com/america/scan` で `symbols.query.types=['fund']` と ETF ticker 指定が成立することを確認済み
  - `AMEX:XLK/XLY/XLE/XLV/XLF/XLI/XLB/XLRE/XLP/XLU` と `NASDAQ:SMH` から `Perf.1M`, `Perf.3M`, `RSI`, `relative_volume_10d_calc`, `volume` を取得できる
  - セクター全体の地合いを見る用途では、銘柄集計よりノイズが少なく、現在の Scanner API に最も素直に乗る

- **日本ワークフロー: アプローチA（銘柄集計）**
  - `scanner.tradingview.com/japan/scan` で `stock` を 1000〜2000 件レンジ取得できることを確認済み
  - `sector`, `Perf.3M`, `RSI`, `relative_volume_10d_calc`, `market_cap_basic` が返るため、TSE の広い母集団からセクター集計が可能
  - アプローチC は現時点の Scanner API 上で日本 index が `totalCount=13` と薄く、TOPIX-17 系も `T17FIN`, `T17RE` しか確認できず、セクター横断比較に不十分

- **不採用**
  - 米国のアプローチC（指数）は成立余地があるが、出来高系指標を持てる ETF のほうが今回の評価軸に合うため見送る
  - 日本のアプローチB（セクターETF）は候補定義と流動性の両面で不利なため見送る

前提:

- 承認後の実装では **Phase1 で選ぶセクター数は上位3件を既定** とする
- 既存の Yahoo 補完ロジックは維持し、Phase1 では新しい外部 API を追加しない

## 変更ファイル

- `docs/exec-plans/active/sector-momentum-scan-phase1_20260505_1303.md`（この計画）
- `src/core/sector-momentum.js`
  - 新規作成
  - 米国 ETF ベースのセクター順位計算
  - 日本 stock 集計ベースのセクター順位計算
  - Phase2 に渡す選抜セクター集合の決定
- `src/core/fundamental-screener.js`
  - Phase1 呼び出しを追加
  - Phase2 のスコープフィルターに `selectedSectors` を追加
  - 返却 payload に Phase1 の診断情報とセクター順位を追加
- `scripts/screener/run-fundamental-screening.mjs`
  - Phase1 セクター順位セクションをレポートに追加
  - Phase1 で採用したセクターと、その後の銘柄絞り込み結果を明示
- `tests/fundamental-screener.test.js`
  - US=ETF / JP=stock 集計の設計判断を固定するテスト追加
  - `selectedSectors` が Phase2 に反映されることを検証
- `tests/daily-screener-report.test.js`
  - レポートに Phase1 セクターランキングと採用セクター要約が出ることを検証

## 影響範囲

- `node scripts/screener/run-fundamental-screening.mjs`
- `.github/workflows/daily-screener.yml`
- `.github/workflows/daily-screener-japan.yml`

workflow ファイル自体は、既定の `SCREENER_MARKET` / `SCREENER_EXCHANGES` がそのまま Phase1 にも流用できる想定のため、基本的には**無変更**のまま実装する。

## 範囲外

- 新しい外部 API 追加
- GHA のトリガー条件や publish 手順の変更
- セクター選抜数の汎用設定化（承認時に別指定がなければ上位3固定）
- 既存の Minervini screener への同機能横展開

## 実装ステップ

- [ ] Phase1 要件をテストへ落とし込む
  - US では `fund/etf` ticker からセクター順位を作る RED を追加
  - JP では TSE 銘柄母集団の集計からセクター順位を作る RED を追加
  - Phase2 が Phase1 採用セクター以外を除外する RED を追加

- [ ] Phase1 セクターモメンタム計算モジュールを実装する
  - US: ETF ticker 固定リストのスコアリング
  - JP: TSE stock 広域取得 → セクター別集計スコアリング
  - 共通: 上位3セクターを返す

- [ ] Phase2 へセクターフィルターを接続する
  - `runFundamentalScreener` の既存 scope filter に `selectedSectors` 条件を追加
  - payload に Phase1 の `sectorMomentum` 情報を持たせる

- [ ] Phase3 レポートへ反映する
  - Phase1 セクターランキング表
  - 採用セクター一覧
  - Phase1 → Phase2 の絞り込み説明

- [ ] 既存テストを通る形に整える
  - 既存 market/scope 表現との整合
  - 既存 `sectorRanking`（Phase2 通過銘柄の集計）との役割整理

## テスト戦略

- **RED**
  - `tests/fundamental-screener.test.js` に、US/JP それぞれの Phase1 判定と Phase2 絞り込み失敗ケースを追加
  - `tests/daily-screener-report.test.js` に、Phase1 セクター順位セクション欠落時に落ちる期待値を追加

- **GREEN**
  - `src/core/sector-momentum.js` と `src/core/fundamental-screener.js` を実装して上記テストを通す
  - `scripts/screener/run-fundamental-screening.mjs` を更新してレポート出力テストを通す

- **REFACTOR**
  - market ごとの差分を `sector-momentum.js` に閉じ込め、`fundamental-screener.js` 側は orchestration に寄せる
  - 既存の Phase2 sector 集計と Phase1 sector ranking の名称衝突を整理する

## 検証コマンド

- `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js`
- `npm run test:unit`

## リスク・注意点

- 日本市場の stock 集計は広いレンジ取得が可能でも、取得順（例: 時価総額順）に依る母集団バイアスが残る
- 日本市場は `TSE` 以外に `NAG` など重複 venue が混ざるため、Phase1 集計でも取引所フィルターを先に効かせる必要がある
- 既存 `sectorRanking` は現在 Phase2 通過銘柄の集計を指しているため、Phase1 ランキングを別名で返すか、用途を明確に分ける必要がある
- 米国 ETF ticker は `AMEX` と `NASDAQ` が混在するため、symbol 固定表を明示管理する

## 競合確認

- `docs/exec-plans/active/run-night-batch_20260429_2344.md`
- `docs/exec-plans/active/night-batch-rerun-focus8-200pack_20260505_0300.md`
- `docs/exec-plans/active/repo-structure-align-and-archive-rules_20260424_2015.md`

いずれも night-batch / repo-structure 系タスクであり、今回の screener 拡張とは直接競合しない。

---

作成者: Copilot
作成日時: 2026-05-05T13:03:27+09:00
