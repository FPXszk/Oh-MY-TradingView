import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerHealthTools } from './tools/health.js';
import { registerPineTools } from './tools/pine.js';
import { registerPriceTools } from './tools/price.js';
import { registerBacktestTools } from './tools/backtest.js';
import { registerLaunchTools } from './tools/launch.js';
import { registerCaptureTools } from './tools/capture.js';
import { registerStreamTools } from './tools/stream.js';
import { registerMarketIntelTools } from './tools/market-intel.js';

const server = new McpServer(
  {
    name: 'oh-my-tradingview',
    version: '0.1.0',
    description:
      'AI-assisted TradingView Pine/backtest workflow via CDP, plus optional public market data tools',
  },
  {
    instructions: `Oh-MY-TradingView MCP — Pine Script development loop for TradingView Desktop.

TOOL SELECTION GUIDE:

Connection & discovery:
- tv_health_check → verify CDP connection, get current chart state
- tv_discover → list available TradingView internal APIs

Price:
- tv_get_price → get current price of the active chart symbol
- tv_get_price with symbol → switch symbol first, then get price

Pine Script development loop:
- pine_get_source → read current editor content
- pine_set_source → inject Pine Script code into editor
- pine_compile → click compile/add-to-chart button
- pine_get_errors → read Monaco compilation errors
- pine_smart_compile → one-shot: compile + check errors + report study changes
- pine_analyze → offline static analysis (no connection needed)

WORKFLOW:
1. tv_health_check → confirm connection
2. pine_set_source → inject code
3. pine_smart_compile → compile and check
4. pine_get_errors → if errors, read them
5. Fix code and repeat from step 2

Backtest:
- tv_backtest_nvda_ma_5_20 → run fixed NVDA 5/20 SMA crossover backtest
- tv_backtest_preset → run a preset-driven strategy backtest

Launch & Capture:
- tv_launch → launch TradingView Desktop with CDP debug port
- tv_capture_screenshot → capture a screenshot of the current page

Streaming:
- tv_stream_price → bounded price polling (not an infinite daemon)

Market Intelligence (no CDP needed):
- market_quote → single symbol quote
- market_fundamentals → PE, market cap, margins, growth
- market_snapshot → multi-symbol quotes
- market_news → financial news search
- market_screener → filter symbols by price/volume
- market_* tools fetch public Yahoo Finance endpoints over the network

BACKTEST WORKFLOW:
1. tv_backtest_nvda_ma_5_20 → switches to NVDA, applies 5/20 MA cross strategy, reads Strategy Tester

IMPORTANT:
- This is an unofficial tool. Not affiliated with TradingView Inc.
- Ensure usage complies with TradingView's Terms of Use.
- Connects to CDP endpoint (TV_CDP_HOST:TV_CDP_PORT, default localhost:9222).
- In WSL, set TV_CDP_HOST to the Windows host IP.`,
  }
);

registerHealthTools(server);
registerPineTools(server);
registerPriceTools(server);
registerBacktestTools(server);
registerLaunchTools(server);
registerCaptureTools(server);
registerStreamTools(server);
registerMarketIntelTools(server);

process.stderr.write(
  '⚠  oh-my-tradingview  |  Unofficial tool. Not affiliated with TradingView Inc.\n'
);
process.stderr.write(
  "   Ensure your usage complies with TradingView's Terms of Use.\n\n"
);

const transport = new StdioServerTransport();
await server.connect(transport);
