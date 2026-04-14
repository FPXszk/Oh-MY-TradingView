# TradingView 関連外部リポジトリ調査と本 repo への適用可能性

## 結論

- **CDP を使わずに TradingView Desktop の Strategy Tester を公式に置き換える公開手段は、今回確認した範囲では見つからなかった。**
- ただし代替経路は 3 系統ある。  
  1. **非公式 protocol / WebSocket 系**: `Mathieu2301/TradingView-API`  
  2. **TradingView Desktop を使わない外部 market/fundamental/backtest 系**: `atilaahmettaner/tradingview-mcp`  
  3. **同じ CDP 方式を広く実装した上位互換寄りの MCP**: `tradesdontlie/tradingview-mcp`
- 本 repo に最も安全に持ち込みやすいのは、**`tradesdontlie/tradingview-mcp` の広い tool surface** と、**`atilaahmettaner/tradingview-mcp` の CDP 非依存データ層の考え方**。  
  一方で **`Mathieu2301/TradingView-API` のような TradingView 直接 protocol 依存は高リスク**。

## 現行 repo の前提整理

現在の `Oh-MY-TradingView` は、**TradingView Desktop を debug mode で起動し、CDP 経由で UI / 内部 API を操作する MCP / CLI ブリッジ**である。

- 接続層: `src/connection.js`
- MCP surface: `src/server.js`, `src/tools/*`
- 価格取得: `src/core/price.js`
- バックテスト: `src/core/backtest.js`
- Pine source 生成: `src/core/research-backtest.js`
- WebSocket fallback: `src/core/backtest-report-websocket.js`

現状の強みと制約は次の通り。

| 項目 | 現状 |
|---|---|
| TradingView 連携方法 | TradingView Desktop + CDP |
| バックテスト | TradingView Strategy Tester を UI / 内部 API / DOM / WS fallback で読む |
| MCP backtest 公開面 | `tv_backtest_nvda_ma_5_20` のみ |
| CLI backtest 公開面 | `nvda-ma` と `preset` |
| 非 CDP データ取得 | なし |
| financial / fundamental 情報 | なし |
| webhook 受信 | なし |
| Pine strategy builder | `price_vs_ma`, `ma_cross`, `donchian_breakout`, `keltner_breakout`, `connors_rsi_pullback`, `rsi_mean_reversion` |

つまり本 repo は **TradingView Desktop 連携には強いが、CDP を離れた market intelligence 層はまだ持っていない**。

## 外部 5 repo の分析

### 比較表

| repo | 接続モデル | 何ができるか | CDP 必須か | 本 repo にとっての価値 | 主な注意点 |
|---|---|---|---|---|---|
| `Mathieu2301/TradingView-API` | 非公式 TradingView API / socket 系 | realtime price、indicator 値、date range 値、drawings、複数戦略 backtest を狙う Node ライブラリ | 不要 | **CDP 非依存の研究対象**として最も近い | 非公式 protocol 依存で壊れやすく、Terms 的にも高リスク |
| `atilaahmettaner/tradingview-mcp` | MCP + `tradingview-ta` / `tradingview-screener` / Yahoo / RSS / sentiment | screener、technical analysis、news、sentiment、Yahoo price、独自 backtest | 不要 | **financial/fundamental/news 層を別系統で足す発想**がそのまま使える | TradingView Strategy Tester 互換ではなく、独自バックテスト |
| `tradesdontlie/tradingview-mcp` | TradingView Desktop + CDP | chart control、pane/tab/layout、alerts、watchlist、replay、stream、screenshot、Pine workflow | 必須 | **今の repo を横に広げる最良の比較対象** | やはり CDP / Electron 内部構造依存 |
| `fabston/TradingView-Webhook-Bot` | TradingView alert webhook | TradingView alerts を Telegram / Discord / Slack / Twitter / Email へ転送 | 不要 | **alert ingestion / 通知 relay** の参考になる | 外部送信前提で現 repo の local-only 前提とズレる |
| `pAulseperformance/awesome-pinescript` | curated links | Pine docs、scripts、libraries、dev tools、best practices、execution ecosystem への導線 | 不要 | **preset 拡張・Pine 学習・参考資料台帳**に有用 | 実装 repo ではなく索引。直接 vendor する対象ではない |

### 1. `Mathieu2301/TradingView-API`

Node ライブラリで、README では **realtime / premium feature / date range values / automatic backtest / invite-only indicators** を前面に出している。  
`package.json` は `axios` / `ws` 依存で、`src/` には `client.js`, `protocol.js`, `quote/`, `chart/`, `classes/PineIndicator.js` などがあり、**Desktop UI automation ではなく TradingView 側 protocol / session を直接扱う方向**だと読める。

この repo から得られる示唆は 2 つある。

1. **CDP を経由しない研究方向は現実に存在する**
2. ただしそれは **公式 public API ではなく非公式 protocol 前提**である

本 repo への適用は、**本線採用ではなく research only** が妥当。  
特に `src/core/backtest-report-websocket.js` で既に WS `du` frame fallback を持っているため、**WebSocket / session correlation の研究を深める比較対象**としては有益。

### 2. `atilaahmettaner/tradingview-mcp`

Python 製 MCP server。README と `pyproject.toml` から、中心は次の組み合わせである。

- `tradingview-ta`
- `tradingview-screener`
- Yahoo Finance
- RSS news
- Reddit sentiment
- 独自 backtest service

`src/tradingview_mcp/core/services/` には、実際に次のモジュールがある。

- `backtest_service.py`
- `indicators.py`
- `news_service.py`
- `sentiment_service.py`
- `screener_provider.py`
- `yahoo_finance_service.py`

つまりこれは **TradingView Desktop automation ではなく、MCP 化された market intelligence hub** である。  
本 repo にとって重要なのは、**CDP を一切使わずに market snapshot / screener / Yahoo quote / fundamentals 寄り情報を別レイヤとして足せる**という点。

ただしここでいう backtesting は **TradingView Strategy Tester の代替ではなく、外部データ上の独自計算**である。  
よって「TradingView Desktop 上の Pine strategy backtest を CDP なしでそのまま置き換える」参考にはならない。

### 3. `tradesdontlie/tradingview-mcp`

今回の比較対象の中で **最も近い repo**。  
README のアーキテクチャはほぼ同系で、**Claude Code / CLI → MCP Server → CDP → TradingView Desktop**。

違いは tool surface の広さで、`src/` の tree を見ると次を一式持っている。

- chart / data / drawing / health / indicator
- pane / tab / watchlist / alerts
- replay / stream / capture / ui
- `tv_launch`
- `CLAUDE.md` による agent decision tree

本 repo にとって特に参考になるのは次の領域。

1. **tool taxonomy の整理**
2. **`tv_launch` のような起動支援**
3. **streaming 系 (`quote`, `bars`, `values`)**
4. **pane / tab / watchlist / alerts / screenshot**
5. **agent 向け意思決定ドキュメント**

現状の本 repo は backtest / price / pine が中心で、**操作面の surface が狭い**。  
そのため、近い実装哲学を保ったまま広げる比較対象として最も相性が良い。

### 4. `fabston/TradingView-Webhook-Bot`

Flask で TradingView webhook を受け、Telegram / Discord / Slack / Twitter / Email に転送する bot。  
`config.py` に secret key を持たせ、alert payload 内にも `key` を要求する設計で、**簡易だが実践的な webhook guard** を持っている。

この repo は backtest 基盤ではないが、次の用途にはそのまま発想を持ち込める。

- TradingView alert を repo 側に取り込む
- 通知 relay を構成する
- MCP とは別の inbound channel を作る

一方で、本 repo README は **local-only / CDP only** を前提にしているため、導入する場合は **明示 opt-in の別サービス**として切り離す方が安全。

### 5. `pAulseperformance/awesome-pinescript`

Pine Script 関連の curated list。  
価値は「実装」よりも **探索入口の密度**にある。

特に本 repo との相性が良いのは以下。

- official Pine docs への導線
- community strategy / indicator の発見
- Pine libraries
- dev tools / lint / VS Code support
- fundamentals graphing や screener 系 script の発見

この repo 自体を組み込む意味は薄いが、**preset catalog を増やす際の source discovery hub** としては非常に有効。

## CDP を使わずに何ができるか

### 1. TradingView Desktop の Strategy Tester をそのまま置き換えられるか

**今回確認した範囲では、公式 public repo からは無理。**

- official `tradingview` org で公開されているのは、主に charting libraries / docs / examples / front-end infra
- `charting-library-tutorial` README でも、肝心の `charting_library` は private access 前提
- Desktop automation や Strategy Tester API の公開 repo は見当たらない

よって **TradingView-native backtest を CDP なしで扱う公式経路**は確認できなかった。

### 2. それでも CDP なしバックテストはできるか

**独立エンジンとしてなら可能。**

現実的な方法は次の 2 つ。

1. **外部データ + 独自バックテスト**
   - Yahoo Finance / market data provider / `tradingview-ta` / `tradingview-screener`
   - 本 repo 側で strategy ロジックを JS / Python に実装
2. **非公式 TradingView protocol / WebSocket**
   - `Mathieu2301/TradingView-API` 方向
   - ただし保守・Terms・壊れやすさのリスクが高い

本 repo で低リスクに進めるなら、**TradingView Desktop backtest は CDP のまま残しつつ、別レイヤとして非 CDP バックテストを追加**するのがよい。

### 3. financial / fundamental 情報は取れるか

**これは CDP なしで十分追加可能。**

特に `atilaahmettaner/tradingview-mcp` は次の発想を示している。

- Yahoo Finance quote / market snapshot
- RSS news
- Reddit sentiment
- screener / TA

本 repo では、TradingView Desktop と無関係に次の MCP tools を増やせる。

- `market_snapshot`
- `symbol_fundamentals`
- `financial_news`
- `symbol_screener`
- `multi_symbol_ta`

これは **Desktop automation の不安定さと独立した付加価値**になり、導入優先度が高い。

## `github.com/tradingview` は公式か

**公式と判断してよい。**

根拠は次の通り。

1. org 名が `tradingview`
2. pinned repo が TradingView 製品そのもの (`lightweight-charts`, `charting-library-*`, `awesome-tradingview`)
3. README 群が `tradingview.com` の product / docs へ直接リンクしている
4. `charting-library-tutorial` README が `github.com/tradingview/charting_library` へのアクセスを案内しており、製品 repo 群が同 org に集約されている

## official org の public repo 全体像

公開 repo は大きく 4 群に分かれていた。

| カテゴリ | repo |
|---|---|
| 公開 charting / developer-facing repos | `lightweight-charts`, `charting-library-examples`, `charting-library-tutorial`, `awesome-tradingview`, `LightweightChartsIOS`, `lightweight-charts-android`, `tradingview.github.io` |
| docs / writing / integration guidance | `documentation-guidelines`, `rest_integrations_docs` |
| build / rendering / front-end infra | `fancy-canvas`, `webpack-uglify-parallel`, `retry-ensure-webpack-plugin`, `dynamic-dual-import-webpack-plugin`, `css-file-rules-webpack-separator`, `svgasset`, `msixty`, `tv-polyfill`, `tv-webpack-svg-loader`, `jewel-case` |
| internal / data / maintenance 寄り | `saveload_backend`, `scanner_data`, `scanner-check`, `s3-groundskeeper`, `study_repo_data`, `tv-pylint-translations-rule`, `inspector-maintenance` |

この中で **本 repo に実際に活用しやすいもの**は限られる。

### 活用候補

| repo | 活用可能性 |
|---|---|
| `lightweight-charts` | saved backtest JSON や campaign 結果を可視化する **独立 viewer / report UI** に向く |
| `charting-library-examples` | 将来、本 repo の結果や独自 datafeed を載せる web frontend を作る際の参考になる |
| `charting-library-tutorial` | **自前 datafeed 接続**や streaming front-end の考え方に有用。ただし本家 library access は private 前提 |
| `awesome-tradingview` | TradingView 開発周辺の curated hub。比較調査の継続入口に使える |
| `documentation-guidelines` | Pine / docs の書き方を整える参考になる |

### 活用しにくいもの

- build / webpack / internal infra 系 repo 群
- scanner / study_repo / maintenance 系 repo 群

これらは TradingView 社内や特定製品向けの色が強く、本 repo へ直接移植する意味は薄い。

## 本 repo に持ち込むと良いもの

### 優先度高

1. **preset backtest を MCP tool として公開する**
   - 既に CLI では `tv backtest preset <preset-id>` がある
   - MCP 側は `tv_backtest_nvda_ma_5_20` しかない
   - これは外部 repo を取り込まなくてもすぐ価値が出る

2. **non-CDP market intelligence 層を足す**
   - `atilaahmettaner/tradingview-mcp` を参考に、TradingView Desktop 非依存の tools を追加する
   - 例: quote, fundamentals, market snapshot, news, screener

3. **CDP 操作面を広げる**
   - `tradesdontlie/tradingview-mcp` を参考に、`tv_launch`, screenshot, watchlist, alerts, pane/tab, streaming を検討する
   - 特に screenshot / stream / alerts は現在の workflow と相性が良い

4. **Pine preset catalog を増やす**
   - `awesome-pinescript` から candidate strategy / library を探し、`config/backtest/strategy-presets.json` と `src/core/research-backtest.js` に落とす

### 優先度中

1. **result viewer を別 UI として持つ**
   - `lightweight-charts` を使い、`docs/references/backtests/*.json` を描画する小さな viewer を作る
   - Desktop 依存の結果確認を少し減らせる

2. **webhook receiver を opt-in で追加する**
   - `fabston/TradingView-Webhook-Bot` 方式を参考に secret 付き inbound alert channel を作る
   - ただし local-only 前提を壊すため、別 process / 別 config にすべき

### 優先度低 / 高リスク

1. **TradingView 非公式 protocol 直叩き**
   - `Mathieu2301/TradingView-API` 方向
   - research track としては面白いが、本線採用は危険

2. **official Charting Library を desktop replacement として扱う**
   - `charting-library-tutorial` / `charting-library-examples` は web embedding 用
   - 今の repo の目的である **TradingView Desktop を agent から扱う** こととは別物

## 推奨方針

### 方針 A: 今の戦略を強化する

- CDP backtest 本線は維持
- `tradesdontlie/tradingview-mcp` 型の操作面拡張を進める
- まず `preset backtest` の MCP 公開、`tv_launch`、screenshot、stream を優先

### 方針 B: 別レイヤで CDP 依存を薄める

- `atilaahmettaner/tradingview-mcp` 型の non-CDP tools を追加
- financial / fundamentals / news / screener を独立追加
- 「TradingView Desktop が落ちても使える layer」を育てる

### 方針 C: research branch として protocol 直叩きを検証する

- `Mathieu2301/TradingView-API` 方向を別枝で調査
- 本線ではなく experimental 扱いにする

## 最終判断

本 repo にとって一番筋が良いのは、**CDP 本線を維持しつつ、外側に non-CDP intelligence layer を足す二層化**である。

- **TradingView Desktop 固有の操作と Strategy Tester** は引き続き CDP
- **financial / fundamentals / screener / news / market snapshot** は非 CDP
- **tool surface の拡張**は `tradesdontlie/tradingview-mcp`
- **strategy / Pine の探索源**は `awesome-pinescript`
- **protocol 直叩き**は `Mathieu2301/TradingView-API` を見つつ research only

この構成なら、今の repo の強みを壊さずに、ユーザーが求めていた
「CDP を使わないで取れるもの」と「CDP を使うからこそできるもの」を切り分けて伸ばせる。
