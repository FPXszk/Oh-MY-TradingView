# Remove Moomoo EPS Fallback 2026-06-01 14:04

## 目的

`EPS YoY` 列で TradingView `earnings_per_share_diluted_yoy_growth_ttm` と moomoo `EPS_GROWTH_RATE` を混在させないようにし、TradingView 欠損時の moomoo fallback を停止する。

あわせて、`EPS YoY` 欠損時に ranking 上どのように扱われるかをコード根拠付きで確認できる状態にする。

## 変更ファイル

- 変更: `src/core/fundamental-screener.js`
  - `EPS YoY` への moomoo fallback を止める。
  - 売上 growth の moomoo 補助は現行どおり維持する。
- 変更: `tests/fundamental-screener.test.js`
  - `EPS YoY` を moomoo で埋めないことを検証する。
  - 必要なら欠損時の neutral rank 扱いの既存期待値を補強する。
- 変更: `tests/daily-screener-report.test.js`
  - レポート文言が fallback 停止後の仕様に合うよう更新する。
- 変更: `scripts/screener/run-fundamental-screening.mjs`
  - `Moomoo 補完` の説明文言を、EPS には使わない現行仕様へ合わせる。
- 移動: `docs/exec-plans/active/remove-moomoo-eps-fallback_20260601_1404.md` → `docs/exec-plans/completed/remove-moomoo-eps-fallback_20260601_1404.md`

## 影響範囲

- 日次スクリーニングの `EPS YoY` 列の表示。
- `Growth confirmation` ブロックの ranking 入力値。
- レポート末尾の指標説明・補助ポリシー説明。

## スコープ外

- `EPS(TTM)` hard filter や他の指標ソース切替は行わない。
- `revenueGrowth` への moomoo 補助は今回止めない。
- 指標 source を per-symbol で表示する改修は今回行わない。

## テスト戦略

- RED: 既存の「TradingView 欠損時に moomoo で EPS YoY を埋める」テスト期待値を反転させる。
- GREEN: fallback 停止実装と文言更新でテストを通す。
- REFACTOR: 既存の ranking / report 構造を崩さず最小変更に留める。

## 検証コマンド

- `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js`
- `git diff --check`

## リスク

- これまで moomoo 値で埋まっていた `EPS YoY` が `N/A` に戻るため、レポート見た目は変わる。
- `Growth confirmation` ブロックの rank が一部銘柄で少し変わる可能性がある。
- 文言更新漏れがあると、実装と説明が食い違う。

## 実装ステップ

- [ ] `EPS YoY` fallback を止める変更点を `src/core/fundamental-screener.js` に入れる。
- [ ] `tests/fundamental-screener.test.js` の fallback 前提テストを新仕様へ更新する。
- [ ] `scripts/screener/run-fundamental-screening.mjs` と `tests/daily-screener-report.test.js` の説明文言を更新する。
- [ ] `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js` を実行する。
- [ ] `git diff --check` を実行する。
- [ ] 計画を `completed/` へ移動し、実装コミットと push を行う。
