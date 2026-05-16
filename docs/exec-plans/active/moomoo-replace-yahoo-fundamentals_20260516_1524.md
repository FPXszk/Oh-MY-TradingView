# Moomoo replace Yahoo fundamentals plan

## Goal

Yahoo Finance `quoteSummary` が 2026-05-16 時点でも `401 Unauthorized / Invalid Crumb` を返すため、失敗しているファンダメンタル取得経路を Moomoo OpenAPI に置き換える。価格・OHLC 用の Yahoo chart 経路は現時点で動作しているため、この計画では変更しない。

## Files

- `src/core/moomoo.js`
  - Moomoo snapshot と `get_stock_filter()` を使うファンダメンタル取得 helper を追加する
  - `getMoomooFundamentalProbe()` から Yahoo fundamentals 比較を外し、Moomoo / TradingView reference の比較に絞る
- `src/core/market-intel.js`
  - `getSymbolFundamentals()` / batch financials を Moomoo-backed に変更する
  - `source` を `moomoo` に更新する
- `src/core/fundamental-screener.js`
  - `enrichWithYahoo` の内部実装を Moomoo revenue growth 補完に置き換える
  - 互換性のため既存 option 名は維持し、表示・source は Moomoo 寄りにする
- `scripts/screener/run-fundamental-screening.mjs`
  - レポート文言の Yahoo 補完表記を Moomoo 補完に更新する
- `tests/market-intel.test.js`
  - Moomoo-backed fundamentals の単体テストへ更新する
- `tests/fundamental-screener.test.js`
  - revenue growth 補完の dependency injection と期待文言を更新する
- `tests/daily-screener-report.test.js`
  - レポート文言の期待値を更新する
- `tests/moomoo.test.js`
  - Yahoo comparison 依存を外した probe と新 helper の回帰を追加・更新する

## Scope

- 対象: Yahoo `quoteSummary` 由来の fundamentals / revenue growth 補完。
- 対象外: Yahoo chart ベースの quote / TA / OHLC benchmark。これは今日の実測で `200 OK` のため残す。
- 対象外: TradingView scanner の既存ファンダメンタル列。Moomoo 置換の参照比較として残す。

## Implementation Steps

- [ ] Moomoo fundamentals helper の最小 API と symbol 正規化を実装する
- [ ] market intelligence の fundamentals 経路を Moomoo helper に差し替える
- [ ] daily screener の revenue growth 補完を Moomoo helper に差し替える
- [ ] probe / report / test の Yahoo fundamentals 表記と期待値を更新する
- [ ] 単体テストを実行して壊れた期待値を修正する
- [ ] 実機 OpenD で daily screening workflow を実行し、Moomoo 補完が成功することを確認する

## Validation

- `node --test tests/moomoo.test.js tests/market-intel.test.js tests/fundamental-screener.test.js tests/daily-screener-report.test.js`
- `HOME=/tmp PYTHONPATH=/home/fpxszk/.local/lib/python3.10/site-packages MOOMOO_HOST=172.31.144.1 MOOMOO_PORT=11112 node scripts/screener/run-fundamental-screening.mjs`

## Risks

- Moomoo SDK は通常の `HOME` だとログ出力先が読み取り専用で落ちるため、実機検証では `HOME=/tmp` と `PYTHONPATH` を明示する。
- `get_stock_filter()` は market / entitlement に依存する。取得できない symbol は従来同様 `null` 補完として扱い、スクリーニングを停止させない。
- Moomoo の `DEBT_ASSET_RATE` は debt/equity と公式が違うため、完全置換ではなく proxy として返す。
