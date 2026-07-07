---
name: tradingview-operator-playbook
description: TradingView / market / reach / X / screener / Moomoo operation decision tree aligned with the current CLI and MCP tool surface.
tags:
  - tradingview
  - operator
  - decision-tree
---

# tradingview-operator-playbook

Use this when deciding which Oh-MY-TradingView CLI command or MCP tool to use. The source of truth is `src/server.js`, `src/tools/`, and `src/cli/commands/`.

## First Choice

- Use non-CDP market / reach / X / Moomoo tools when chart state is not needed.
- Use CDP tools only when the task requires TradingView Desktop state, Pine editor, chart capture, workspace, alerts, or Strategy Tester.
- Use `tv status` / `tv_health_check` before CDP-dependent actions.
- Use `tv launch` / `tv_launch` only when TradingView Desktop is not already reachable.
- Use `tv launch-browser` / `tv_launch_browser` as a bounded browser fallback, not as a replacement for Desktop workflow.

## Decision Tree

```text
What do you need?
|
|- Current price / market data
|  |- Single symbol -> tv market quote / market_quote
|  |- Multiple symbols -> tv market snapshot / market_snapshot
|  |- Financials -> tv market fundamentals or financials / market_fundamentals or market_financials
|  |- News -> tv market news / market_news
|
|- Ranking or screening
|  |- TA summary -> tv market ta-summary / market_ta_summary
|  |- TA rank -> tv market ta-rank / market_ta_rank
|  |- Confluence rank -> tv market confluence-rank / market_confluence_rank
|  |- Simple price/volume screener -> tv market screener / market_screener
|  |- Minervini screener -> tv screener minervini / market_minervini_screener
|  |- Fundamental screener -> tv screener fundamental / market_fundamental_screener
|
|- External observation
|  |- Channel readiness -> tv reach status / reach_status
|  |- Web page -> tv reach web / reach_read_web
|  |- RSS -> tv reach rss / reach_read_rss
|  |- Reddit search -> tv reach reddit-search / reach_search_reddit
|  |- Reddit post -> tv reach reddit-post / reach_read_reddit_post
|  |- YouTube metadata/subtitles -> tv reach youtube / reach_read_youtube
|
|- X/Twitter read-only observation
|  |- Auth status -> tv x status / x_status
|  |- Current account -> tv x whoami / x_whoami
|  |- Search posts -> tv x search / x_search_posts
|  |- User profile -> tv x user / x_user_profile
|  |- User posts -> tv x user-posts / x_user_posts
|  |- Post detail -> tv x tweet / x_tweet_detail
|
|- Moomoo OpenAPI read-only
|  |- OpenD connectivity -> moomoo_health_check
|  |- Accounts -> moomoo_accounts
|  |- Positions -> moomoo_positions
|  |- Balance -> moomoo_balance
|  |- Orders / deals history -> moomoo_orders / moomoo_deals
|  |- Portfolio diagnostics -> moomoo_portfolio
|  |- Snapshot -> moomoo_snapshot
|  |- K-line history -> moomoo_kline_history
|  |- Stock filter fields -> moomoo_stock_filter_fields
|  |- Stock filter -> moomoo_stock_filter
|  |- Plate/theme list -> moomoo_plate_list
|  |- Plate constituents -> moomoo_plate_stocks
|  |- Breadth -> moomoo_plate_breadth
|  |- OHLC comparison -> moomoo_ohlc_compare
|  |- Screening validation -> moomoo_screening_validate
|  |- Fundamental probe -> moomoo_fundamental_probe
|
|- TradingView Desktop state
|  |- Launch Desktop -> tv launch / tv_launch
|  |- Launch browser fallback -> tv launch-browser / tv_launch_browser
|  |- CDP health -> tv status / tv_health_check
|  |- Discover APIs -> tv discover / tv_discover
|  |- Price from active chart -> tv price get / tv_get_price
|  |- Bounded price polling -> tv stream / tv_stream_price
|  |- Screenshot -> tv capture / tv_capture_screenshot
|  |- Observe snapshot -> tv observe snapshot / tv_observe_snapshot
|  |- Watchlist -> tv workspace watchlist-* / tv_watchlist_*
|  |- Panes -> tv workspace pane-* / tv_pane_*
|  |- Tabs -> tv workspace tab-* / tv_tab_*
|  |- Layouts -> tv workspace layout-list or layout-apply / tv_layout_list or tv_layout_apply
|  |- Alerts -> tv alert create-price or delete / tv_alert_create_price or tv_alert_delete
|
|- Pine / backtest
   |- Get source -> tv pine get / pine_get_source
   |- Set source -> tv pine set / pine_set_source
   |- Compile -> tv pine compile / pine_smart_compile
   |- Errors -> tv pine errors / pine_get_errors
   |- Offline analysis -> tv pine analyze / pine_analyze
   |- Preset backtest -> tv backtest preset / tv_backtest_preset
   |- Fixed NVDA SMA test -> tv backtest sma-crossover / tv_backtest_nvda_ma_5_20
```

## Current Provider Policy

`market_*` tools use Moomoo for quote, TA, and fundamentals where implemented. Yahoo endpoints are legacy opt-in fallbacks or benchmark / drift checks. Do not present Yahoo as the current primary provider unless the code path explicitly requests it.

Moomoo account tools are read-only. They do not place, modify, cancel, or unlock trades.

## Mapping Tables

### Launch / Health / Capture

| CLI | MCP tool |
|---|---|
| `tv launch` | `tv_launch` |
| `tv launch-browser` | `tv_launch_browser` |
| `tv status` | `tv_health_check` |
| `tv discover` | `tv_discover` |
| `tv capture` | `tv_capture_screenshot` |
| `tv observe snapshot` | `tv_observe_snapshot` |
| `tv stream` | `tv_stream_price` |

### Market / Screener

| CLI | MCP tool |
|---|---|
| `tv market quote` | `market_quote` |
| `tv market fundamentals` | `market_fundamentals` |
| `tv market financials` | `market_financials` |
| `tv market snapshot` | `market_snapshot` |
| `tv market news` | `market_news` |
| `tv market screener` | `market_screener` |
| `tv market ta-summary` | `market_ta_summary` |
| `tv market ta-rank` | `market_ta_rank` |
| `tv market analysis` | `market_symbol_analysis` |
| `tv market confluence-rank` | `market_confluence_rank` |
| `tv screener minervini` | `market_minervini_screener` |
| `tv screener fundamental` | `market_fundamental_screener` |

### Reach / X

| CLI | MCP tool |
|---|---|
| `tv reach status` | `reach_status` |
| `tv reach web` | `reach_read_web` |
| `tv reach rss` | `reach_read_rss` |
| `tv reach reddit-search` | `reach_search_reddit` |
| `tv reach reddit-post` | `reach_read_reddit_post` |
| `tv reach youtube` | `reach_read_youtube` |
| `tv x status` | `x_status` |
| `tv x whoami` | `x_whoami` |
| `tv x search` | `x_search_posts` |
| `tv x user` | `x_user_profile` |
| `tv x user-posts` | `x_user_posts` |
| `tv x tweet` | `x_tweet_detail` |

### Workspace / Alerts

| CLI | MCP tool |
|---|---|
| `tv workspace watchlist-list` | `tv_watchlist_list` |
| `tv workspace watchlist-add` | `tv_watchlist_add` |
| `tv workspace watchlist-remove` | `tv_watchlist_remove` |
| `tv workspace pane-list` | `tv_pane_list` |
| `tv workspace pane-focus` | `tv_pane_focus` |
| `tv workspace tab-list` | `tv_tab_list` |
| `tv workspace tab-switch` | `tv_tab_switch` |
| `tv workspace layout-list` | `tv_layout_list` |
| `tv workspace layout-apply` | `tv_layout_apply` |
| `tv alert create-price` | `tv_alert_create_price` |
| `tv alert delete` | `tv_alert_delete` |
| MCP only | `tv_alert_list` |

### Moomoo MCP Tools

There is no current `tv moomoo` CLI command. Use MCP tools or the workflow / scripts that call the Moomoo core.

| Need | MCP tool |
|---|---|
| OpenD health | `moomoo_health_check` |
| Account metadata | `moomoo_accounts` |
| Positions | `moomoo_positions` |
| Balance | `moomoo_balance` |
| Orders | `moomoo_orders` |
| Deals | `moomoo_deals` |
| Portfolio diagnostics | `moomoo_portfolio` |
| Snapshot | `moomoo_snapshot` |
| K-line history | `moomoo_kline_history` |
| Filter field inventory | `moomoo_stock_filter_fields` |
| Stock filter | `moomoo_stock_filter` |
| Plate/theme list | `moomoo_plate_list` |
| Plate stocks | `moomoo_plate_stocks` |
| Plate breadth | `moomoo_plate_breadth` |
| OHLC comparison | `moomoo_ohlc_compare` |
| Screening validation | `moomoo_screening_validate` |
| Fundamental probe | `moomoo_fundamental_probe` |

## Anti-Patterns

| Anti-Pattern | Better approach |
|---|---|
| Starting with CDP when market data is enough | Use non-CDP market / reach / X / Moomoo first |
| Repeating one-symbol quote calls | Use snapshot or rank tools for batches |
| Treating X / Reddit as a trading signal by itself | Treat social data as observation coverage only |
| Inventing CLI commands from MCP names | Check `src/cli/commands/` before documenting CLI |
| Running E2E for docs-only changes | Use contract / unit tests and state why E2E was skipped |
