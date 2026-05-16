# reduce-yahoo-dependency

作成日時: 2026-05-16 20:42 JST

## 目的

Yahoo Finance 依存をできるだけ減らし、価格・TA・OHLC 系は Moomoo / TradingView へ寄せる。ファンダメンタルは現行方針どおり TradingView Scanner 主、Moomoo 補完を維持する。Yahoo を残す場合は legacy / fallback として明示し、通常運用の経路から外す。

## 前提

- ファンダメンタル通常経路はすでに Moomoo / TradingView 寄りへ変更済み。
- 現在残っている Yahoo 通常利用は主に以下:
  - `src/core/market-intel.js` の quote / chart / TA / news search
  - `src/core/moomoo.js` の OHLC comparison benchmark
  - CLI / tool / docs の古い Yahoo 表記
- ニュースは Moomoo / TradingView の現行実装には直接代替がないため、スクリーニング本体からは外し、必要時だけ別 provider を明示して使う扱いにする。

## 変更・削除・作成するファイル

- 変更: `src/core/market-intel.js`
  - quote / snapshot を Moomoo snapshot ベースへ変更する。
  - TA summary を Moomoo kline ベースへ変更する。
  - Yahoo chart / quoteSummary を legacy fallback に隔離する。
  - `market_news` は Yahoo 通常利用をやめ、明示的な fallback なしでは unavailable を返す、または provider 指定を必要にする。
- 変更: `src/core/moomoo.js`
  - OHLC comparison の既定を `moomoo-only` / benchmark なしに寄せる。
  - Yahoo chart comparison は legacy benchmark として明示指定時のみ使う。
- 変更: `src/tools/market-intel.js`, `src/tools/moomoo.js`, `src/tools/screener.js`
  - tool description の Yahoo 表記を現在の挙動に合わせる。
- 変更: `src/cli/commands/screener.js`
  - `with-yahoo` 表記を互換 alias として残しつつ、説明を Moomoo 補完に変更する。
- 変更: `docs/strategy/data-provider-indicator-coverage_20260516.md`
  - 「価格系列・ニュース限定」の意味と、Yahoo を通常経路から外す方針を追記する。
- 変更: 関連 tests
  - Moomoo quote / TA / OHLC comparison の期待値へ更新する。
  - Yahoo quoteSummary は legacy fallback のテストに限定する。
- 移動: `docs/exec-plans/active/reduce-yahoo-dependency_20260516_2042.md` → `docs/exec-plans/completed/reduce-yahoo-dependency_20260516_2042.md`

## 影響範囲

- market-intel MCP tools の `source` が `yahoo_finance` から `moomoo` へ変わる箇所がある。
- Moomoo OpenD に接続できない環境では、quote / TA 系が失敗しやすくなる。必要なら明示 fallback を別途検討する。
- ニュースは現行 Yahoo search を通常経路から外すため、`market_news` の使い方が変わる。
- 既存 dirty file `docs/exec-plans/completed/moomoo-phase2-screening-validation_20260514_1107.md` は対象外。

## 実装ステップ

- [x] Yahoo 依存箇所を quote / TA / news / OHLC benchmark / docs 表記に分類する。
- [x] Moomoo snapshot / kline を market-intel quote / TA の通常経路に接続する。
- [x] OHLC comparison の既定を Yahoo benchmark なしへ変更する。
- [x] news は通常 Yahoo 利用を止め、未対応または明示 provider 扱いへ変更する。
- [x] tests と tool descriptions を更新する。
- [x] `docs/strategy/data-provider-indicator-coverage_20260516.md` に具体説明を追記する。
- [x] 実機 Moomoo と単体テストで検証する。
- [x] 計画を completed に移動し、commit / push する。

## 検証

- `node --test tests/moomoo.test.js tests/market-intel.test.js tests/market-intel-analysis.test.js`
- `MOOMOO_HOST=172.31.144.1 MOOMOO_PORT=11112 node --input-type=module <Moomoo quote/TA smoke>`
- `git diff --check`

## リスク

- Yahoo を外すほど OpenD 接続に依存するため、ローカル環境の安定性が重要になる。
- Moomoo kline と Yahoo / TradingView の調整済み価格は完全一致しない可能性がある。
- ニュース代替は現時点で Moomoo / TradingView の既存実装がないため、別タスクで provider を選ぶ必要がある。
