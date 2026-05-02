---
name: tradingview-operator-playbook
description: TradingView 操作の decision tree。market_* / reach_* / workspace_* / observe / alert / pine / backtest の使い分けと anti-pattern を明示する。
tags:
  - tradingview
  - operator
  - decision-tree
---

# tradingview-operator-playbook — TradingView 操作ガイド

このスキルは Oh-MY-TradingView の tool / command を **どの順番で、どう使い分けるか** を定義する。
intelligence を runtime に増やすのではなく、skill markdown に judgment を寄せる。

## When to Use

- TradingView でチャート確認・market 分析・情報収集を行うとき
- どの `tv` コマンド / MCP tool を使うべきか迷ったとき
- 複数の情報源（chart / market data / X / web）を組み合わせて判断を下すとき

## Decision Tree

```
何をしたい？
│
├─ 銘柄の価格・TA を確認したい
│   ├─ 1 銘柄の詳細 → tv market quote / market_quote
│   ├─ 複数銘柄を一覧 → tv market snapshot / market_snapshot
│   ├─ TA サマリー → tv market ta-summary / market_ta_summary
│   └─ 総合分析 → tv market analysis / market_symbol_analysis
│
├─ 銘柄をランキング・比較したい
│   ├─ TA 指標でランク → tv market ta-rank / market_ta_rank
│   ├─ Confluence スコアで総合ランク → tv market confluence-rank / market_confluence_rank
│   ├─ スクリーナー（フィルタリング） → tv market screener / market_screener
│   ├─ Minervini 基準スクリーナー → market_minervini_screener
│   └─ ファンダメンタル・スクリーナー → market_fundamental_screener
│
├─ ファンダメンタルズを確認したい
│   ├─ 単一銘柄 → tv market fundamentals / market_fundamentals
│   └─ 複数銘柄 → tv market financials / market_financials
│
├─ ニュースを確認したい
│   └─ tv market news / market_news
│
├─ 外部情報を収集したい
│   ├─ Web ページ → tv reach web / reach_read_web
│   ├─ RSS フィード → tv reach rss / reach_read_rss
│   ├─ Reddit 検索 → tv reach reddit-search / reach_search_reddit
│   ├─ Reddit 個別投稿 → tv reach reddit-post / reach_read_reddit_post
│   └─ YouTube → tv reach youtube / reach_read_youtube
│
├─ X/Twitter の情報を確認したい
│   ├─ ポスト検索 → tv x search / x_search_posts
│   ├─ ユーザープロフィール → tv x user / x_user_profile
│   ├─ ユーザーの投稿 → tv x user-posts / x_user_posts
│   └─ 個別ツイート → tv x tweet / x_tweet_detail
│
├─ TradingView Desktop を操作したい
│   ├─ CDP 接続チェック → tv status / tv_health_check
│   ├─ チャートの状態確認 → tv observe snapshot / tv_observe_snapshot
│   ├─ スクリーンショット → tv capture / tv_capture_screenshot
│   ├─ ウォッチリスト一覧 → tv workspace watchlist-list / tv_watchlist_list
│   ├─ ウォッチリスト追加 → tv workspace watchlist-add / tv_watchlist_add
│   ├─ ウォッチリスト削除 → tv workspace watchlist-remove / tv_watchlist_remove
│   ├─ ペイン操作 → tv workspace pane-list / tv_pane_list / pane-focus / tv_pane_focus
│   ├─ タブ操作 → tv workspace tab-list / tv_tab_list / tab-switch / tv_tab_switch
│   └─ レイアウト操作 → tv workspace layout-apply / tv_layout_apply
│
├─ アラートを管理したい
│   ├─ 一覧 → tv_alert_list
│   ├─ 価格アラート作成 → tv alert create-price / tv_alert_create_price
│   └─ アラート削除 → tv alert delete / tv_alert_delete
│
└─ Pine Script を開発したい
    ├─ ソース取得 → tv pine get / pine_get_source
    ├─ ソース設定 → tv pine set / pine_set_source
    ├─ スマートコンパイル → tv pine compile / pine_smart_compile
    ├─ コンパイルエラー確認 → tv pine errors / pine_get_errors
    ├─ オフライン静的解析 → tv pine analyze / pine_analyze
    └─ バックテスト実行
        ├─ プリセット駆動 → tv backtest preset / tv_backtest_preset
        └─ 固定テスト（NVDA SMA） → tv backtest sma-crossover / tv_backtest_nvda_ma_5_20
```

## Tool 名の対応表

### Market Intelligence（CDP 不要）

| CLI コマンド | MCP Tool 名 |
|---|---|
| `tv market quote` | `market_quote` |
| `tv market snapshot` | `market_snapshot` |
| `tv market fundamentals` | `market_fundamentals` |
| `tv market financials` | `market_financials` |
| `tv market news` | `market_news` |
| `tv market screener` | `market_screener` |
| `tv market ta-summary` | `market_ta_summary` |
| `tv market ta-rank` | `market_ta_rank` |
| `tv market analysis` | `market_symbol_analysis` |
| `tv market confluence-rank` | `market_confluence_rank` |
| ―（MCP 直接） | `market_minervini_screener` |
| ―（MCP 直接） | `market_fundamental_screener` |

### Reach / External（CDP 不要）

| CLI コマンド | MCP Tool 名 |
|---|---|
| `tv reach web` | `reach_read_web` |
| `tv reach rss` | `reach_read_rss` |
| `tv reach reddit-search` | `reach_search_reddit` |
| `tv reach reddit-post` | `reach_read_reddit_post` |
| `tv reach youtube` | `reach_read_youtube` |

### X / Twitter（CDP 不要）

| CLI コマンド | MCP Tool 名 |
|---|---|
| `tv x search` | `x_search_posts` |
| `tv x user` | `x_user_profile` |
| `tv x user-posts` | `x_user_posts` |
| `tv x tweet` | `x_tweet_detail` |

### Pine Script（CDP 必要）

| CLI コマンド | MCP Tool 名 |
|---|---|
| `tv pine get` | `pine_get_source` |
| `tv pine set` | `pine_set_source` |
| `tv pine compile` | `pine_smart_compile` |
| `tv pine errors` | `pine_get_errors` |
| `tv pine analyze` | `pine_analyze` |

### Backtest（CDP 必要）

| CLI コマンド | MCP Tool 名 |
|---|---|
| `tv backtest preset` | `tv_backtest_preset` |
| `tv backtest sma-crossover` | `tv_backtest_nvda_ma_5_20` |

### Workspace / Desktop（CDP 必要）

| CLI コマンド | MCP Tool 名 |
|---|---|
| `tv status` | `tv_health_check` |
| `tv observe snapshot` | `tv_observe_snapshot` |
| `tv capture` | `tv_capture_screenshot` |
| `tv workspace watchlist-list` | `tv_watchlist_list` |
| `tv workspace watchlist-add` | `tv_watchlist_add` |
| `tv workspace watchlist-remove` | `tv_watchlist_remove` |
| `tv workspace pane-list` | `tv_pane_list` |
| `tv workspace pane-focus` | `tv_pane_focus` |
| `tv workspace tab-list` | `tv_tab_list` |
| `tv workspace tab-switch` | `tv_tab_switch` |
| `tv workspace layout-apply` | `tv_layout_apply` |
| `tv alert create-price` | `tv_alert_create_price` |
| `tv alert delete` | `tv_alert_delete` |
| ―（MCP 直接） | `tv_alert_list` |

## Anti-Patterns

| Anti-Pattern | 正しいアプローチ |
|---|---|
| CDP が必要な tool を先に呼ぶ | まず non-CDP の market / reach / x で情報を集め、CDP 操作は最後に行う |
| 1 銘柄ずつ quote を繰り返す | `market snapshot` で最大 20 銘柄を一括取得する |
| analysis を全銘柄に実行する | まず `ta-rank` / `confluence-rank` で候補を絞り、上位のみ `analysis` を実行する |
| reach / x の結果を投資判断の根拠にする | reach / x は observation coverage であり、directional signal ではない |
| observe snapshot を何度も繰り返す | snapshot は 1 回の状態確認用。変更を追跡するなら campaign / backtest を使う |
