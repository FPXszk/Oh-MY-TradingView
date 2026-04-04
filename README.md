# Oh-MY-TradingView

TradingView Desktop を **Copilot CLI 前提** で扱う最小 MCP / CLI ブリッジです。  
現在の対象は **Windows + WSL** を主軸にした **CDP 接続 / 現在価格取得 / Pine ループ** です。

## 重要な前提

- **非公式**: TradingView Inc. とは無関係です
- **ローカル限定**: CDP だけを使い、外部送信はしません
- **要ユーザー起動**: TradingView Desktop を `--remote-debugging-port=9222` 付きで起動しておく必要があります
- **利用規約順守**: TradingView の Terms of Use は利用者責任です

## できること

### MCP tools

- `tv_health_check`
- `tv_discover`
- `tv_get_price`
  - 現在チャート価格
  - `symbol` 指定時は symbol 切替後に価格取得
- `tv_backtest_nvda_ma_5_20`
  - NVDA 固定 5/20 SMA クロス戦略バックテスト
  - Strategy Tester の主要指標を読み取り
  - Strategy Tester が読めない場合は chart bars から local fallback metrics を返す
- `pine_get_source`
- `pine_set_source`
- `pine_compile`
- `pine_get_errors`
- `pine_smart_compile`
- `pine_analyze`

### CLI

- `tv status`
- `tv discover`
- `tv price get`
- `tv price get --symbol NVDA`
- `tv pine get`
- `tv pine set --file <path>`
- `tv pine compile`
- `tv pine errors`
- `tv pine analyze --file <path>`
- `tv backtest nvda-ma`

## アーキテクチャ

```text
Copilot CLI / tv CLI (WSL or Windows)
        ↓
   MCP Server (stdio)
        ↓
 Chrome DevTools Protocol
        ↓
 TradingView Desktop (Electron)
```

## セットアップ

### 1. 依存インストール

```bash
npm install
```

### 2. TradingView Desktop を CDP 付きで起動

Windows:

```cmd
"%LOCALAPPDATA%\TradingView\TradingView.exe" --remote-debugging-port=9222
```

必要なら次も試してください。

```cmd
"%LOCALAPPDATA%\TradingView\TradingView.exe" --remote-debugging-port=9222 --remote-debugging-address=0.0.0.0
```

### 3. WSL から Windows 側 CDP へ接続

WSL から `localhost:9222` に届かない場合があります。  
このケースではまず Windows 側で `9222` が **127.0.0.1 のみに bind** されていないか確認してください。

WSL 側の候補 IP:

```bash
grep nameserver /etc/resolv.conf
ip route
```

接続先を指定:

```bash
export TV_CDP_HOST=<windows-host-ip>
export TV_CDP_PORT=9222
curl http://$TV_CDP_HOST:$TV_CDP_PORT/json/list
```

> `curl` が通らない場合は、Windows Firewall 許可か `portproxy` が必要です。

### 4. Copilot CLI の MCP 設定

```json
{
  "mcpServers": {
    "oh-my-tradingview": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/Oh-MY-TradingView/src/server.js"],
      "env": {
        "TV_CDP_HOST": "172.x.x.x",
        "TV_CDP_PORT": "9222"
      }
    }
  }
}
```

## 環境変数

| 変数 | デフォルト | 説明 |
|---|---|---|
| `TV_CDP_HOST` | `localhost` | CDP host。WSL では Windows host IP を指定 |
| `TV_CDP_PORT` | `9222` | CDP port |

## 使い方

### CLI

接続確認:

```bash
node src/cli/index.js status
```

現在チャートの価格:

```bash
node src/cli/index.js price get
```

NVDA に切り替えて価格取得:

```bash
node src/cli/index.js price get --symbol NVDA
```

Pine 解析:

```bash
node src/cli/index.js pine analyze --file ./example.pine
```

NVDA 5/20 MA クロス バックテスト:

```bash
node src/cli/index.js backtest nvda-ma
```

### MCP workflow

1. `tv_health_check`
2. `tv_get_price`
3. `tv_get_price` with `symbol: "NVDA"` if you need a specific symbol
4. `pine_set_source`
5. `pine_smart_compile`
6. `pine_get_errors`

### Backtest workflow

1. `tv_backtest_nvda_ma_5_20` — NVDA に切替 → 5/20 MA クロス戦略を compile → Strategy Tester 読み取り
 - 成功時: `success: true`, `tester_available: true`, `metrics: { ... }`
 - Tester 読み取り不可時: `success: true`, `tester_available: false`, `tester_reason: "..."`
 - Fallback 使用時: `fallback_source: "chart_bars_local"`, `fallback_metrics: { ... }`
 - compile エラー時: `success: false`, `compile_errors: [...]`

## テスト

```bash
npm test
npm run test:e2e
npm run test:all
```

E2E は CDP が見つからない場合に skip されます。  
WSL 環境では `TV_CDP_HOST` を設定してから実行してください。

## 制約

- TradingView の内部 DOM / API 依存なので、Desktop 更新で壊れる可能性があります
- 価格取得は `bars()` → `last_value()` → DOM の順に試します
- WSL2 では Windows 側が `127.0.0.1:9222` にしか bind していないと接続できません
- バックテストの Strategy Tester 読み取りは DOM 依存のため、TradingView UI 更新で壊れる可能性があります
- Strategy Tester にストラテジーが載らない場合は、現在チャートの bars から local fallback を計算します
- バックテストは現在 NVDA 固定 / 5&20 SMA クロス固定です

```bash
# Unit tests (no TradingView needed)
npm test

# E2E tests (requires TradingView Desktop with CDP)
# In WSL, set TV_CDP_HOST first
TV_CDP_HOST=172.x.x.x npm run test:e2e

# All tests
npm run test:all
```

## Architecture

```
src/
  server.js          # MCP server entry point (stdio transport)
  connection.js      # CDP connection, target discovery, host resolution
  core/
    health.js        # Health check, API discovery logic
    pine.js          # Pine Editor operations, static analysis
    price.js         # Current price retrieval (chart API + DOM fallback)
    backtest.js      # NVDA 5/20 MA cross backtest orchestration
  tools/
    _format.js       # MCP response formatting
    health.js        # MCP tool registration: tv_health_check, tv_discover
    pine.js          # MCP tool registration: pine_* tools
    price.js         # MCP tool registration: tv_get_price
    backtest.js      # MCP tool registration: tv_backtest_nvda_ma_5_20
  cli/
    index.js         # CLI entry point
    router.js        # Command router (node:util parseArgs)
    commands/
      health.js      # CLI: status, discover
      pine.js        # CLI: pine get/set/compile/errors/analyze
      price.js       # CLI: price get
      backtest.js    # CLI: backtest nvda-ma
tests/
  connection.test.js      # Unit: safeString, requireFinite, pickTarget, resolveCdpEndpoint
  pine.analyze.test.js    # Unit: offline Pine static analysis
  price.test.js           # Unit: formatPriceResult, validatePriceData
  backtest.test.js        # Unit: buildNvdaMaSource, normalizeMetrics, buildResult
  e2e.pine-loop.test.js   # E2E: full pine loop (skips if no CDP)
  e2e.price.test.js       # E2E: price retrieval (skips if no CDP)
  e2e.backtest.test.js    # E2E: NVDA MA backtest (skips if no CDP)
```

## Safety

- **Target allowlist**: only connects to `page` targets matching `tradingview.com`
- **safeString**: JSON.stringify-based escaping for CDP evaluate injection
- **requireFinite**: blocks NaN/Infinity from reaching TradingView APIs
- **Local-only**: no external network calls (except TradingView's own in-app)

## License

MIT
