# Moomoo EPS YoY backfill plan

## 目的
- TradingView の `earnings_per_share_diluted_yoy_growth_ttm` が `null` の銘柄に対して、Moomoo/OpenD の `EPS_GROWTH_RATE` で補完できるようにする。
- 既存の日次スクリーニング出力を壊さず、`EPS YoY` 列の `N/A` を減らす。

## 事前確認
- Windows 側の `moomoo_OpenD.exe` は `127.0.0.1:11111` で起動しており、Windows Python から `get_stock_filter(... EPS_GROWTH_RATE ...)` が成功することを確認済み。
- 現在の WSL 実行環境からは `127.0.0.1:11111` / `10.255.255.254:11112` に `ECONNREFUSED` で到達できないため、実装再開時は **WSL から OpenD へ到達可能な接続経路** を先に確定する。

## 変更対象ファイル
- `src/core/moomoo.js`
  - Moomoo fundamentals 取得経路の確認と、`EPS_GROWTH_RATE` をシンボル単位で安定して引けるように補完ロジックを整理する。
- `src/core/fundamental-screener.js`
  - TradingView `EPS YoY` が `null` のときだけ Moomoo 値を使う fallback を追加する。
- `scripts/screener/run-fundamental-screening.mjs`
  - 必要なら出力注記を追加し、`EPS YoY` のデータソース切替が分かるようにする。
- `tests/fundamental-screener.test.js`
  - TradingView 欠損時に Moomoo fallback が入るケース、Moomoo も取れないケースを追加する。
- `tests/daily-screener-report.test.js`
  - レポート出力が既存構造を保つことを確認する。

## 影響範囲
- 日次スクリーニングの銘柄テーブル `EPS YoY` 列
- Moomoo/OpenD を有効化したときの fundamentals 取得経路
- テスト fixture / mock の更新

## 実装方針
- TradingView を正本とし、`EPS YoY` が `null` の場合のみ Moomoo `EPS_GROWTH_RATE` を fallback として使う。
- 無言で別意味の指標へ差し替えない。Moomoo でも取れない場合は現状どおり `N/A` を維持する。
- 既存の Moomoo fundamentals helper を優先再利用し、重複した adapter 呼び出しを増やさない。

## テスト戦略
- RED: TradingView 欠損 + Moomoo 値ありで `EPS YoY` が埋まらない失敗ケースを先に追加する。
- GREEN: fallback 実装でテストを通す。
- REFACTOR: 取得経路の重複を整理し、既存の fundamentals / report tests を壊さないことを確認する。

## 検証コマンド
- `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js`
- `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs`

## リスク
- WSL から OpenD へ接続できないと、ローカル再現と実装検証が止まる。
- `get_stock_filter` はページング前提なので、小型株の補完率が上限ページ数に依存する可能性がある。
- Moomoo の `EPS_GROWTH_RATE` が TradingView `EPS YoY (TTM)` と完全一致しない銘柄がある可能性があるため、差分確認が必要。

## 実装ステップ
- [x] OpenD の接続経路を確定し、WSL 実行環境から health check を通す
- [x] 既存 Moomoo fundamentals 取得経路で `EPS_GROWTH_RATE` をシンボルへ結び付ける方法を確定する
- [x] `src/core/fundamental-screener.js` に TradingView → Moomoo fallback を実装する
- [x] fundamentals / report のテストを追加・更新する
- [x] 日次レポートを再生成し、`EPS YoY` 列の出力差分を確認する
