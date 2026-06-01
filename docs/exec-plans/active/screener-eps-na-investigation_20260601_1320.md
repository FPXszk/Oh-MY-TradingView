# Screener EPS / N-A Investigation 2026-06-01 13:20

## 目的

直近のスクリーニング結果について、以下を調査して原因を切り分ける。

- `SNDK` の `EPS YoY` がマイナスになるのはなぜか。異常値ではなく元データ上そうなっているのか、表示・補完ロジックの問題なのかを確認する。
- 他の銘柄で `EPS YoY` が `N/A` になるのはなぜか。既存の Moomoo 補完対象に入っているのに埋まっていないのか、補完対象外なのか、両データソースで欠損なのかを整理する。

## 変更ファイル

- 作成: `docs/exec-plans/active/screener-eps-na-investigation_20260601_1320.md`
  - 今回の調査計画を記録する。
- 調査のみ: `docs/reports/screener/daily-ranking.md`
  - `SNDK` と `EPS YoY = N/A` 銘柄の実出力を確認する。
- 調査のみ: `src/core/fundamental-screener.js`
  - TradingView の `EPS(TTM)` / `EPS YoY` 取得元、Moomoo 補完条件、`N/A` になる条件を確認する。
- 調査のみ: `src/core/moomoo.js`
  - Moomoo 側で `EPS_GROWTH_RATE` をどう取得・正規化しているか確認する。
- 調査のみ: `tests/fundamental-screener.test.js`
  - `EPS YoY` fallback の期待仕様が何かを確認する。
- 必要時のみ変更候補: `src/core/fundamental-screener.js`, `tests/fundamental-screener.test.js`, `tests/daily-screener-report.test.js`
  - 調査の結果、明確な実装漏れや仕様逸脱が見つかった場合のみ対象にする。

## 影響範囲

- 日次スクリーニングの `EPS YoY` 列の解釈。
- TradingView を正本とする fundamentals 取得と、Moomoo 補完の適用条件。
- 必要なら `N/A` 判定や補完条件に関するテスト。

## スコープ外

- 今回は依頼が調査なので、原因が確認できるまではスコア計算や別指標への差し替えは行わない。
- `EPS(TTM)` hard filter、セクター選定、ランキング重みの見直しは対象外とする。

## テスト戦略

- 調査段階では既存テストを読み、必要になった場合だけ再現テストを追加する。
- 実装修正に進む場合は、先に失敗するケースを `tests/fundamental-screener.test.js` に追加してから修正する。

## 検証コマンド

- `node --test tests/fundamental-screener.test.js`
- `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs`
- `rg -n "SNDK|N/A" docs/reports/screener/daily-ranking.md`

## リスク

- `EPS YoY` という表示名と、実際の取得元指標の意味がユーザー認識とずれている可能性がある。
- Moomoo 補完は `EPS YoY` にしか効かず、`EPS(TTM)` 欠損や負値とは別問題の可能性がある。
- 実データが日次で変わるため、直近レポートと現在再実行結果で差が出る可能性がある。

## 実装ステップ

- [ ] 直近レポートで `SNDK` と `EPS YoY = N/A` 銘柄を列挙し、現象を固定する。
- [ ] `src/core/fundamental-screener.js` で TradingView 取得列と Moomoo fallback 条件を確認する。
- [ ] `src/core/moomoo.js` とテストで、Moomoo が補完できる条件と補完できない条件を確認する。
- [ ] 必要ならローカル再実行で該当銘柄の最新出力を再確認する。
- [ ] 最終的に、`SNDK` の負値理由、`N/A` 銘柄ごとの欠損理由、Moomoo 補完が効く/効かない境界を報告する。
