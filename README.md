# Oh-MY-TradingView

TradingView Desktop を **ローカルの Chrome DevTools Protocol (CDP)** 経由で操作する、**Copilot CLI 前提** の最小 MCP / CLI ブリッジです。

最初のスコープは **接続確認** と **Pine Script 開発ループ MVP** です。

- `tv_health_check` で TradingView Desktop への接続確認
- `pine_set_source` で Pine Editor へコード注入
- `pine_compile` / `pine_smart_compile` でコンパイル
- `pine_get_errors` で Monaco のエラー取得
- `tv` CLI からも同じ最小操作が可能

## 重要な前提

- **非公式**: TradingView Inc. とは無関係です
- **ローカル限定**: `localhost:9222` の CDP にのみ接続します
- **要ユーザー起動**: TradingView Desktop を `--remote-debugging-port=9222` 付きで起動しておく必要があります
- **利用規約順守**: 利用者自身の責任で TradingView の Terms of Use に従ってください

## アーキテクチャ

```text
Copilot CLI / tv CLI
        ↓
   MCP Server (stdio)
        ↓
 Chrome DevTools Protocol
        ↓
 TradingView Desktop (Electron)
```

## 現在の機能

### MCP tools

- `tv_health_check`
- `tv_discover`
- `pine_get_source`
- `pine_set_source`
- `pine_compile`
- `pine_get_errors`
- `pine_smart_compile`
- `pine_analyze`

### CLI commands

- `tv status`
- `tv discover`
- `tv pine get`
- `tv pine set --file <path>` または `stdin`
- `tv pine compile`
- `tv pine errors`
- `tv pine analyze --file <path>` または `stdin`

## セットアップ

### 1. 依存インストール

```bash
npm install
```

### 2. TradingView Desktop を CDP 有効で起動

Linux の例:

```bash
/path/to/TradingView --remote-debugging-port=9222
```

すでに `http://localhost:9222/json/list` が見えていれば準備完了です。

### 3. Copilot CLI から MCP サーバとして使う

Copilot CLI 側の MCP 設定で、このリポジトリの server を stdio command として登録します。

- command: `node`
- args: `["/absolute/path/to/Oh-MY-TradingView/src/server.js"]`

この repo は **Claude Code 向けではなく Copilot CLI 前提** で説明を書いています。

## 使い方

### CLI

接続確認:

```bash
node src/cli/index.js status
```

Pine をファイルから注入:

```bash
node src/cli/index.js pine set --file ./example.pine
```

コンパイル:

```bash
node src/cli/index.js pine compile
```

エラー取得:

```bash
node src/cli/index.js pine errors
```

オフライン静的解析:

```bash
node src/cli/index.js pine analyze --file ./example.pine
```

stdin から注入:

```bash
cat ./example.pine | node src/cli/index.js pine set
```

### MCP workflow

推奨ループは以下です。

1. `tv_health_check`
2. `pine_set_source`
3. `pine_smart_compile`
4. `pine_get_errors`
5. 必要なら修正して 2 に戻る

## 開発

ユニットテスト:

```bash
npm test
```

E2E:

```bash
npm run test:e2e
```

`test:e2e` は TradingView Desktop が CDP 付きで起動しているときだけ実行対象になります。  
CDP が見つからない場合は skip されます。

## 実装方針

- `src/connection.js`: CDP 接続、target discovery、sanitize
- `src/core/`: TradingView 操作ロジック
- `src/tools/`: MCP tool 定義
- `src/cli/`: CLI 入口
- `tests/`: unit / e2e

## 制約

- TradingView の内部 DOM / API に依存するため、Desktop 更新で壊れる可能性があります
- いまは **Pine ループ MVP** に限定しており、chart navigation / replay / screenshot / alerts などは未実装です

MCP bridge + CLI for TradingView Desktop via Chrome DevTools Protocol (CDP).

Pine Script development loop: inject code → compile → check errors → iterate.

> **⚠ Unofficial.** Not affiliated with TradingView Inc. or any AI vendor.
> Ensure your usage complies with [TradingView's Terms of Use](https://www.tradingview.com/policies/).
> Local-only: connects to `localhost` CDP — no data is sent externally.

## Requirements

- [TradingView Desktop](https://www.tradingview.com/desktop/) launched with CDP enabled
- Node.js ≥ 20

### Launch TradingView with CDP

```bash
# Linux
/opt/TradingView/tradingview --remote-debugging-port=9222

# macOS
/Applications/TradingView.app/Contents/MacOS/TradingView --remote-debugging-port=9222

# Windows
"%LOCALAPPDATA%\TradingView\TradingView.exe" --remote-debugging-port=9222
```

Verify CDP is active:

```bash
curl http://localhost:9222/json/list
```

## Install

```bash
cd Oh-MY-TradingView
npm install
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `tv_health_check` | Check CDP connection, return chart state |
| `tv_discover` | List available TradingView internal APIs |
| `pine_get_source` | Read current Pine Editor content |
| `pine_set_source` | Inject Pine Script code into editor |
| `pine_compile` | Click compile / add-to-chart button |
| `pine_get_errors` | Read Monaco compilation errors |
| `pine_smart_compile` | One-shot: compile + check errors + report study changes |
| `pine_analyze` | Offline static analysis (no connection needed) |

### Copilot CLI Setup

Add to your MCP configuration (e.g. `~/.copilot/mcp-config.json`):

```json
{
  "mcpServers": {
    "oh-my-tradingview": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/Oh-MY-TradingView/src/server.js"]
    }
  }
}
```

### Typical Workflow (from Copilot CLI)

1. `tv_health_check` → confirm TradingView is connected
2. `pine_set_source` → inject your Pine Script
3. `pine_smart_compile` → compile, check errors
4. `pine_get_errors` → read error details if any
5. Fix code, repeat from step 2

## CLI

```bash
# Check connection
node src/cli/index.js status

# Discover APIs
node src/cli/index.js discover

# Pine operations
node src/cli/index.js pine get
echo '//@version=6\nindicator("X")\nplot(close)' | node src/cli/index.js pine set
node src/cli/index.js pine compile
node src/cli/index.js pine errors
echo '//@version=6\nindicator("X")\nplot(close)' | node src/cli/index.js pine analyze
node src/cli/index.js pine analyze -f script.pine
```

All CLI commands output JSON — pipe to `jq` for formatting.

## Tests

```bash
# Unit tests (no TradingView needed)
npm test

# E2E tests (requires TradingView Desktop on localhost:9222)
npm run test:e2e

# All tests
npm run test:all
```

## Architecture

```
src/
  server.js          # MCP server entry point (stdio transport)
  connection.js      # CDP connection, target discovery, safety utils
  core/
    health.js        # Health check, API discovery logic
    pine.js          # Pine Editor operations, static analysis
  tools/
    _format.js       # MCP response formatting
    health.js        # MCP tool registration: tv_health_check, tv_discover
    pine.js          # MCP tool registration: pine_* tools
  cli/
    index.js         # CLI entry point
    router.js        # Command router (node:util parseArgs)
    commands/
      health.js      # CLI: status, discover
      pine.js        # CLI: pine get/set/compile/errors/analyze
tests/
  connection.test.js      # Unit: safeString, requireFinite, pickTarget
  pine.analyze.test.js    # Unit: offline Pine static analysis
  e2e.pine-loop.test.js   # E2E: full pine loop (skips if no CDP)
```

## Safety

- **Target allowlist**: only connects to `page` targets matching `tradingview.com`
- **safeString**: JSON.stringify-based escaping for CDP evaluate injection
- **requireFinite**: blocks NaN/Infinity from reaching TradingView APIs
- **Local-only**: no external network calls (except TradingView's own in-app)

## License

MIT
