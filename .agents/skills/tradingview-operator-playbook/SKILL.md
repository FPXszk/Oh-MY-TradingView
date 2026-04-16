---
name: tradingview-operator-playbook
description: TradingView 操作の decision tree。market_* / reach_* / workspace_* / observe の使い分けと anti-pattern を明示する。
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
│   └─ Confluence スコアで総合ランク → tv market confluence-rank / market_confluence_rank
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
│   ├─ Reddit → tv reach reddit-search / reach_search_reddit
│   └─ YouTube → tv reach youtube / reach_read_youtube
│
├─ X/Twitter の情報を確認したい
│   ├─ ポスト検索 → tv x search / x_search_posts
│   ├─ ユーザーの投稿 → tv x user-posts / x_user_posts
│   └─ 個別ツイート → tv x tweet / x_tweet_detail
│
├─ TradingView Desktop を操作したい
│   ├─ チャートの状態確認 → tv observe snapshot / tv_observe_snapshot
│   ├─ ウォッチリスト管理 → tv workspace watchlist-*
│   ├─ ペイン操作 → tv workspace pane-list / pane-focus
│   ├─ タブ操作 → tv workspace tab-list / tab-switch
│   └─ スクリーンショット → tv capture / tv_capture_screenshot
│
└─ Pine Script を開発したい
    ├─ コンパイル → tv pine compile / pine_compile
    ├─ エラー分析 → tv pine analyze / pine_analyze
    └─ バックテスト → tv backtest / tv_backtest_*
```

## Tool 名の対応表

| CLI コマンド | MCP Tool 名 | CDP 必要 |
|---|---|---|
| `tv market quote` | `market_quote` | No |
| `tv market analysis` | `market_symbol_analysis` | No |
| `tv market confluence-rank` | `market_confluence_rank` | No |
| `tv reach web` | `reach_read_web` | No |
| `tv reach rss` | `reach_read_rss` | No |
| `tv reach reddit-search` | `reach_search_reddit` | No |
| `tv reach youtube` | `reach_read_youtube` | No |
| `tv x search` | `x_search_posts` | No |
| `tv x user-posts` | `x_user_posts` | No |
| `tv observe snapshot` | `tv_observe_snapshot` | Yes |
| `tv capture` | `tv_capture_screenshot` | Yes |

## Anti-Patterns

| Anti-Pattern | 正しいアプローチ |
|---|---|
| CDP が必要な tool を先に呼ぶ | まず non-CDP の market / reach / x で情報を集め、CDP 操作は最後に行う |
| 1 銘柄ずつ quote を繰り返す | `market snapshot` で最大 20 銘柄を一括取得する |
| analysis を全銘柄に実行する | まず `ta-rank` / `confluence-rank` で候補を絞り、上位のみ `analysis` を実行する |
| reach / x の結果を投資判断の根拠にする | reach / x は observation coverage であり、directional signal ではない |
| observe snapshot を何度も繰り返す | snapshot は 1 回の状態確認用。変更を追跡するなら campaign / backtest を使う |
