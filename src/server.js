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
import { registerWorkspaceTools } from './tools/workspace.js';
import { registerAlertTools } from './tools/alerts.js';
import { registerObserveTools } from './tools/observe.js';
import { registerBrowserLaunchTools } from './tools/browser-launch.js';
import { registerTwitterReadTools } from './tools/twitter-read.js';
import { registerReachTools } from './tools/reach.js';

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
- tv_launch_browser → launch Chromium-based browser with TradingView chart (bounded fallback, not desktop replacement)
- tv_capture_screenshot → capture a screenshot of the current page

Streaming:
- tv_stream_price → bounded price polling (not an infinite daemon)

Workspace & Alert operations (CDP needed):
- tv_watchlist_list → list symbols in the active watchlist
- tv_watchlist_add → add a symbol to the watchlist
- tv_watchlist_remove → remove a symbol from the watchlist
- tv_pane_list → list chart panes
- tv_pane_focus → select a pane by index
- tv_tab_list → list chart slots in the current layout
- tv_tab_switch → switch the active chart slot in the current layout by index
- tv_layout_list → list available chart layouts
- tv_layout_apply → apply a layout by name or id
- tv_alert_list → list alerts on the current chart
- tv_alert_create_price → create a local price alert (no webhook)
- tv_alert_delete → delete an alert by id

Observability (CDP needed):
- tv_observe_snapshot → one-shot observability snapshot (connection, page state, screenshot, runtime errors)

Market Intelligence (no CDP needed):
- market_quote → single symbol quote
- market_fundamentals → PE, market cap, margins, growth
- market_snapshot → multi-symbol quotes
- market_news → financial news search
- market_screener → filter symbols by price/volume
- market_ta_summary → multi-symbol TA summary (price change, RSI14, SMA20/50)
- market_ta_rank → rank symbols by TA indicator
- market_symbol_analysis → deterministic single-symbol trend/fundamentals/news/risk analysis
- market_* tools fetch public Yahoo Finance endpoints over the network

Twitter/X read-only (no CDP needed, requires local twitter-cli auth):
- x_status → verify twitter-cli authentication state
- x_whoami → show the authenticated X account
- x_search_posts → search posts by query
- x_user_profile → fetch a user profile
- x_user_posts → fetch recent posts from a user
- x_tweet_detail → fetch a single post detail

Reach external observation (no CDP needed, read-only):
- reach_status → verify web/RSS/Reddit/YouTube channel readiness
- reach_read_web → read a public web page via Jina Reader
- reach_read_rss → read a public RSS or Atom feed
- reach_search_reddit → search public Reddit posts
- reach_read_reddit_post → read a public Reddit post and top comments
- reach_read_youtube → read YouTube metadata and optional subtitles

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
registerWorkspaceTools(server);
registerAlertTools(server);
registerObserveTools(server);
registerBrowserLaunchTools(server);
registerTwitterReadTools(server);
registerReachTools(server);

process.stderr.write(
  '⚠  oh-my-tradingview  |  Unofficial tool. Not affiliated with TradingView Inc.\n'
);
process.stderr.write(
  "   Ensure your usage complies with TradingView's Terms of Use.\n\n"
);

const transport = new StdioServerTransport();
await server.connect(transport);
