import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerHealthTools } from './tools/health.js';
import { registerPineTools } from './tools/pine.js';

const server = new McpServer(
  {
    name: 'oh-my-tradingview',
    version: '0.1.0',
    description:
      'AI-assisted TradingView Pine Script development via Chrome DevTools Protocol',
  },
  {
    instructions: `Oh-MY-TradingView MCP — Pine Script development loop for TradingView Desktop.

TOOL SELECTION GUIDE:

Connection & discovery:
- tv_health_check → verify CDP connection, get current chart state
- tv_discover → list available TradingView internal APIs

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

IMPORTANT:
- This is an unofficial tool. Not affiliated with TradingView Inc.
- Ensure usage complies with TradingView's Terms of Use.
- Local-only: connects to localhost CDP, no external data sent.`,
  }
);

registerHealthTools(server);
registerPineTools(server);

process.stderr.write(
  '⚠  oh-my-tradingview  |  Unofficial tool. Not affiliated with TradingView Inc.\n'
);
process.stderr.write(
  "   Ensure your usage complies with TradingView's Terms of Use.\n\n"
);

const transport = new StdioServerTransport();
await server.connect(transport);
