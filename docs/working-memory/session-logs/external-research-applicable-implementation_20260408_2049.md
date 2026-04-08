# external-research-applicable-implementation

## 実施内容

- 外部調査で高優先と判断した項目を repo に実装した
- MCP tool surface に preset backtest / Desktop launch / screenshot / bounded stream / market intelligence を追加した
- CLI surface に `launch`, `capture`, `stream`, `market` サブコマンドを追加した
- `strategy-presets.json` に builder 互換の preset expansion 4 件を追加した
- README に新機能と `market_*` の外部 public endpoint 利用を明記した

## 追加・更新した主な機能

### MCP

- `tv_backtest_preset`
- `tv_launch`
- `tv_capture_screenshot`
- `tv_stream_price`
- `market_quote`
- `market_fundamentals`
- `market_snapshot`
- `market_news`
- `market_screener`

### CLI

- `tv backtest preset <preset-id> --symbol NVDA`
- `tv launch [--port 9222] [--path /path/to/tv] [--dry-run]`
- `tv capture [--output file.png] [--format png|jpeg] [--quality 80]`
- `tv stream [--symbol NVDA] [--interval 5000] [--ticks 12]`
- `tv market quote --symbol AAPL`
- `tv market fundamentals --symbol AAPL`
- `tv market snapshot AAPL MSFT GOOGL`
- `tv market news --query "earnings"`
- `tv market screener AAPL MSFT --min-price 100`

## 実装中に潰した論点

- `launch` を `exec` ベースから `spawn` ベースへ変更し、shell 経由の組み立てをやめた
- WSL では `/mnt/c/Users/*/AppData/Local/TradingView/TradingView.exe` を既定候補として探索するようにした
- launch は既知パスの先頭固定ではなく、存在する候補を順に選ぶようにした
- launch は即時終了したプロセスを success 扱いしないようにした
- screener は filter 値の validation を fetch 前に行うようにした
- screener は snapshot 上限 20 件に引きずられず、30 銘柄まで個別 quote で処理するようにした
- stream は全 tick が失敗した場合に `success: false` を返すようにした
- market quote は `priceChange` / `priceChangePercent` を返すようにした
- `test:all` に新規 unit tests を追加した

## 追加・更新した主なファイル

- `src/core/launch.js`
- `src/core/capture.js`
- `src/core/stream.js`
- `src/core/market-intel.js`
- `src/tools/launch.js`
- `src/tools/capture.js`
- `src/tools/stream.js`
- `src/tools/market-intel.js`
- `src/tools/backtest.js`
- `src/cli/commands/launch.js`
- `src/cli/commands/capture.js`
- `src/cli/commands/stream.js`
- `src/cli/commands/market-intel.js`
- `src/server.js`
- `src/cli/index.js`
- `src/core/index.js`
- `config/backtest/strategy-presets.json`
- `tests/launch.test.js`
- `tests/capture.test.js`
- `tests/stream.test.js`
- `tests/market-intel.test.js`
- `tests/preset-validation.test.js`
- `README.md`

## 検証

- `npm test`
- `npm run test:e2e`
- `npm run test:all`
- `git --no-pager diff --check`

すべて通過した。

## 補足

- `market_*` 系は CDP を使わず、Yahoo Finance の public endpoint を参照する
- `tv_stream_price` は常駐 daemon ではなく、上限付きの短時間ポーリングで返す
- preset expansion は既存 builder で生成可能なものだけに絞った
