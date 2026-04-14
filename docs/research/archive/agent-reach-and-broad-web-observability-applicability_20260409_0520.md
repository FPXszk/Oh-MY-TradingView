# Agent-Reach と広域 web/social observation の適用可能性調査

## 結論

- **Agent-Reach は「AI にネットの目を与える」用途にかなり有効**だが、実体は **統一データ取得エンジン** ではなく **上流ツール群を配線する scaffolding** である。  
  Twitter/X、Reddit、YouTube、V2EX、WeChat、Bilibili、小紅書、雪球などを横断できる一方、実取得は `twitter-cli` / `rdt-cli` / `yt-dlp` / `mcporter` / 公開 API などの外部依存に強く乗っている。
- **Oh-MY-TradingView への最適な持ち込み方は core 統合ではなく、docs / research workflow / skill 補強**。  
  すぐ価値が出るのは、FinTwit・Reddit・雪球・RSS などの外部観測を `docs/research/` に取り込み、既存の `market_*` と並ぶ **外部 signal 観測レイヤ** として扱うこと。
- **実装するなら別レイヤ / 別 MCP / skill から始めるべき**。  
  `src/core/market-intel.js` の Yahoo Finance ベースを重くせず、social/community 系は opt-in の別 surface に分けた方が、この repo の責務を壊さない。

## 現行 repo の前提

この repo は **TradingView Desktop を Copilot CLI / MCP から扱う最小ブリッジ**であり、主軸は CDP 経由の price / Pine / backtest / workspace / alerts である（`README.md`, `src/server.js`, `src/core/backtest.js`, `src/core/workspace.js`, `src/core/alerts.js`）。

一方で、既に **non-CDP の market intelligence layer** も持っている。

- `src/core/market-intel.js`
- `src/tools/market-intel.js`
- `src/cli/commands/market-intel.js`

ここでは Yahoo Finance public endpoint を使って `market_quote` / `market_fundamentals` / `market_snapshot` / `market_news` / `market_screener` / `market_ta_summary` / `market_ta_rank` を提供している。  
つまり現行アーキテクチャはすでに、

1. **TradingView Desktop 固有の CDP レイヤ**
2. **外部 public data を使う non-CDP レイヤ**

の二層構造を持っている。

このため、Twitter 記事、掲示板投稿、コミュニティ反応のような外部観測を足すなら、**2 の延長として別管理する**のが自然である。

## Agent-Reach の正体

### 何をするプロジェクトか

- Repo: <https://github.com/Panniantong/Agent-Reach>
- `llms.txt` は **"Give your AI agent eyes to see the entire internet"** を掲げる
- README は **「脚手架（scaffolding）であって framework ではない」** と明記する

重要なのは、Agent-Reach 自体が heavy な統一 API を持つのではなく、

- インストール
- 認証 / Cookie 設定
- doctor による可用性診断
- SKILL.md によるルーティング

を担当し、**実際の read/search/post は Agent が上流ツールを直接叩く**構成だという点である。

### コードから見える構成

| パス | 役割 |
|---|---|
| `agent_reach/channels/` | プラットフォーム別 channel 定義 |
| `agent_reach/channels/base.py` | channel は `can_handle()` / `check()` を実装するだけ |
| `agent_reach/doctor.py` | 全 channel の status を集計して表示 |
| `agent_reach/cli.py` | `install` / `configure` / `doctor` / `skill` などの CLI |
| `agent_reach/skill/SKILL.md` | Agent 向けルーター。search / social / dev / web / video へ振り分ける |

`agent_reach/channels/base.py` には **"After installation, agents call upstream tools directly."** とあり、Agent-Reach が本体というより **dispatcher / environment bootstrapper** であることがコードレベルで確認できる。

### 対応ソース

`agent_reach/channels/__init__.py` で登録されている channel から、少なくとも次が対象である。

- Web (`web.py`) — Jina Reader
- GitHub (`github.py`) — gh CLI
- Twitter/X (`twitter.py`) — `twitter-cli` / `bird`
- YouTube (`youtube.py`) — `yt-dlp`
- Reddit (`reddit.py`) — `rdt-cli`
- RSS (`rss.py`) — `feedparser`
- Bilibili (`bilibili.py`)
- Exa Search (`exa_search.py`)
- XiaoHongShu (`xiaohongshu.py`)
- Douyin (`douyin.py`)
- LinkedIn (`linkedin.py`)
- WeChat (`wechat.py`)
- Weibo (`weibo.py`)
- Xiaoyuzhou (`xiaoyuzhou.py`)
- V2EX (`v2ex.py`)
- Xueqiu (`xueqiu.py`)

### 「ネットの目」としての強み

1. **対象が広い**  
   Twitter/Reddit/YouTube に加え、中国語圏の WeChat / Weibo / 小紅書 / 雪球 / V2EX まである。
2. **Agent への組み込みが簡単**  
   `agent_reach/skill/SKILL.md` が、そのまま agent router になっている。
3. **ゼロ API fee を優先**  
   README と `llms.txt` の通り、基本は OSS / free route を選んでいる。
4. **Twitter/X や Reddit のような“世論の場所”へ届く**  
   ユーザーの目的である「Twitter の記事や掲示板投稿を調べさせたい」に直結する。

### 限界

1. **上流依存が大きい**  
   Twitter は GraphQL 変更、Bilibili は地域制限、XHS は cookie / xsec 制限など、壊れるときは channel 単位で壊れる。
2. **統一 JSON スキーマではない**  
   上流ごとに出力形式が違い、横断比較には別の正規化が必要。
3. **本体に深い aggregation / ranking / dedupe はない**  
   収集導線はあるが、「銘柄ごとに複数ソースの反応を統合してスコア化」まではやっていない。
4. **投稿や write は補助的**  
   主役は read/search。write は platform risk が高い。

## ユーザー要件に対する適合性

ユーザーが欲しいのは、ざっくり言うと:

- Twitter/X の投稿
- 掲示板 / コミュニティ投稿
- 記事 / ニュース / RSS
- 動画の字幕やコミュニティ反応

を AI に横断的に見せること。

この観点では、Agent-Reach は **かなり近い**。特に以下が刺さる。

| 欲しいもの | Agent-Reach の対応 |
|---|---|
| X / FinTwit を見たい | `twitter.py` + `twitter-cli` |
| Reddit / 掲示板を見たい | `reddit.py` + `rdt-cli` |
| 技術掲示板を見たい | `v2ex.py` |
| 記事 / Web を読みたい | `web.py` + Jina Reader |
| RSS を見たい | `rss.py` |
| YouTube の内容を読みたい | `youtube.py` + `yt-dlp` |
| 中国株コミュニティ / 株系 SNS を見たい | `xueqiu.py` |

特に `xueqiu.py` は、この repo の金融文脈にかなり相性が良い。  
雪球は **株価・検索・熱帖・人気銘柄ランキング**を扱うため、一般 social listening より **market-oriented community observation** に近い。

## 類似事例の deep research

以下は「AI エージェントに web/social/community を見せる」観点で、Agent-Reach と比較した high-signal な候補である。

### 比較表

| 事例 | 何が強いか | 弱いか | Agent-Reach との関係 | この repo での位置づけ |
|---|---|---|---|---|
| [Crawl4AI](https://github.com/unclecode/crawl4ai) | LLM-friendly web crawl / JS site / Markdown 化 | SNS 専用ではない | Web channel の代替・補完 | **補完候補** |
| [Firecrawl](https://github.com/firecrawl/firecrawl) | search/scrape/crawl/agent を一体化 | API key / service 前提が強い | 汎用 web データ層 | **補完候補** |
| [Jina Reader](https://github.com/jina-ai/reader) | URL → Markdown の速さと単純さ | 深い crawl や interaction は弱い | Agent-Reach の Web 部品 | **既採用に近い発想** |
| [SearXNG](https://github.com/searxng/searxng) | 70+ source のメタ検索、セルフホスト可 | 深掘り読取やコメント取得は弱い | 広く探す層 | **補完候補** |
| [open-deep-research](https://github.com/nickscamara/open-deep-research) | 検索→抽出→推論→レポートの deep research pipeline | Firecrawl 前提で social 個別接続は弱い | research pipeline の参考 | **別プロセス候補** |
| [browser-use](https://github.com/browser-use/browser-use) | ログイン壁や複雑 UI への最終手段 | 重い、遅い、bulk 向きでない | CLI で取れないサイトの fallback | **最終手段候補** |
| [public-clis/twitter-cli](https://github.com/public-clis/twitter-cli) | X/Twitter の read/search/write | Twitter 専用、壊れやすい | Agent-Reach の重要上流 | **部品候補** |
| [public-clis/rdt-cli](https://github.com/public-clis/rdt-cli) | Reddit 検索、読取、コメント、構造化出力 | Reddit 専用 | Agent-Reach の重要上流 | **部品候補** |
| [JNHFlow21/social-post-extractor-mcp](https://github.com/JNHFlow21/social-post-extractor-mcp) | Douyin / XHS の script.md + info.json 固定出力 | 対象が狭い、Bailian API 前提 | Agent-Reach の optional 実装候補 | **部品候補** |
| [Apify MCP Server](https://github.com/apify/apify-mcp-server) | MCP 統合と安定した scraping actor 群 | 有料 / SaaS 依存 | “商用品質版” の代替 | **不採用寄り補完候補** |

### 1. Crawl4AI

- Repo: <https://github.com/unclecode/crawl4ai>
- 強み:
  - JS-heavy site に強い
  - LLM-ready Markdown / structured extraction
  - deep crawl, filtering, recovery が強い
- 弱み:
  - Twitter / Reddit のような専用 social surface には直接強くない
- 本 repo への示唆:
  - `web` / article / docs / IR page / blog post / filing page を深掘りする **research engine** として有効
  - `market_news` のその場取得より、**調査バッチ** 向き

### 2. Firecrawl

- Repo: <https://github.com/firecrawl/firecrawl>
- 強み:
  - `search` / `scrape` / `crawl` / `agent` を統合
  - MCP や CLI 導線が強い
  - output が AI 向けに揃っている
- 弱み:
  - zero-fee scaffolding というより web data platform
  - social/community 固有の深掘りは弱い
- 本 repo への示唆:
  - broad research 用には有力だが、今の repo へ直接入れるには少し重い

### 3. Jina Reader

- Repo: <https://github.com/jina-ai/reader>
- 強み:
  - `https://r.jina.ai/URL` の単純さ
  - HTML を Markdown に直す軽量性
- 弱み:
  - dynamic interaction や深い crawl は弱い
- 本 repo への示唆:
  - Agent-Reach の `web.py` と同系で、すでに思想相性が良い
  - docs-only / quick research に向く

### 4. SearXNG

- Repo: <https://github.com/searxng/searxng>
- 強み:
  - セルフホストできるメタ検索
  - 多ソース横断で「広く探す」のに強い
- 弱み:
  - 深い本文取得やコメント木の読取は別途必要
- 本 repo への示唆:
  - **検索レイヤ** として優秀
  - Agent-Reach の Exa 依存を避けたい場合の代替候補

### 5. open-deep-research

- Repo: <https://github.com/nickscamara/open-deep-research>
- 強み:
  - 検索→抽出→推論→保存まで含めた research pipeline
- 弱み:
  - social/toolkit ではなく app / workflow 寄り
- 本 repo への示唆:
  - この repo に足すべきは UI ではなく、**「複数外部ソースをどうまとめて判断材料にするか」** のパイプライン発想

### 6. browser-use

- Repo: <https://github.com/browser-use/browser-use>
- 強み:
  - ログイン壁や複雑な UI を超えられる
- 弱み:
  - 重い、遅い、コストも高い
- 本 repo への示唆:
  - regular path にすべきではない
  - ただし「CLI / API / RSS / MCP で読めないページ」を読む最後の fallback としては重要

### 7. twitter-cli / rdt-cli

- Twitter: <https://github.com/public-clis/twitter-cli>
- Reddit: <https://github.com/public-clis/rdt-cli>

これらは Agent-Reach の“代替”というより、**Agent-Reach の本体価値を支える上流部品**に近い。

特に:

- `twitter-cli` は timeline / search / article / user lookup / YAML/JSON 出力がある
- `rdt-cli` は search / read / comment tree / YAML/JSON / anti-detection を持つ

つまり Agent-Reach を丸ごと採用しなくても、**この 2 つを直接 research workflow に使うだけでかなり目的に近づく**。

### 8. social-post-extractor-mcp

- Repo: <https://github.com/JNHFlow21/social-post-extractor-mcp>
- Douyin / XHS を `script.md` + `info.json` で固定出力
- Agent-Reach README でも optional 実装候補として言及される

示唆は明確で、**social data は「取れる」だけでは弱く、固定 artifact へ正規化して初めて使いやすい**。  
この考え方は、本 repo 側で social observation を扱うときにも重要。

## Agent-Reach をこの repo にどう適用するか

### 自然な接続点

| 接続点 | 理由 |
|---|---|
| `docs/research/` | 既に signal observation / external research を蓄積する場所として使っている |
| `docs/references/design-ref-llms.md` | 外部比較調査の正規台帳ルールが既にある |
| `.agents/skills/` | 既に `twitter-cli` skill などが入り、agent router 文化がある |
| `market_*` の外側 | non-CDP intelligence layer を増やす余地はあるが、本線は壊したくない |

### すぐ効くもの

#### P0: docs / research workflow に取り込む

1. FinTwit / Reddit / 雪球 / RSS の取得手順を research workflow として整理
2. strategy / theme 調査のときに「価格だけでなく外部反応も見る」補助線を用意
3. 参照した外部 repo / tool / docs を台帳化

これは **最小リスク** で、しかもユーザーの意図に一番近い。

#### P1: skill 補強 or thin wrapper

候補:

- `.agents/skills/` に broad-web-observation 的な skill を置く
- `twitter-cli` / `rdt-cli` / RSS / Jina Reader を research 用の決まり手順として書く

こうすると agent は

- 「この銘柄の X の反応を見て」
- 「Reddit で同じ話題があるか見て」
- 「関連記事と動画の字幕も集めて」

のような依頼に、より安定して応答できる。

#### P2: 別 MCP / 別プロセスで social-intel を作る

たとえば:

- `social_search`
- `social_sentiment_inputs`
- `symbol_community_snapshot`

のような surface を、**本 repo 本体とは別**に作る案はある。

ただし、これはこの repo の責務を少し外れるため、本線統合より **別 MCP server** が妥当。

## やらない方がいいこと

### 1. `src/core/market-intel.js` に直接 Twitter/Reddit 認証や cookie 管理を埋め込む

理由:

- いまの `market-intel` は Yahoo Finance public endpoint による軽量層
- ここへ social login / anti-detection / GraphQL fragility を流し込むと責務が一気に重くなる

### 2. backtest / preset へ social signal をそのまま入れる

理由:

- 再現性が低い
- 保存 artifact と比較評価が難しい
- 今の repo の backtest asset と整合しづらい

まずは **research judgment support** に留める方が安全。

### 3. Agent-Reach の full install をこの repo の必須依存にする

理由:

- Python / MCP / browser cookie / proxy の前提が増える
- いまの repo の最小 bridge という性格が崩れる

## 推奨方針

### P0

1. **Agent-Reach は external research reference として採用**
2. **FinTwit / Reddit / 雪球 / RSS を research workflow に取り込む**
3. **`docs/research/` に今回の比較判断を残し、今後の external signal 調査の入口にする**

### P1

1. **broad-web-observation skill を別途用意する**
2. **`twitter-cli` / `rdt-cli` / RSS / Jina Reader を research 手順として標準化する**

### P2

1. **別 MCP / 別 repo で social-intel を切り出す**
2. **必要なら symbol ごとの community snapshot を固定スキーマで返す**

### Reject

1. **core へ重い social scraping を直統合**
2. **social signal をいきなり strategy / backtest 本線に混ぜる**

## 最終判断

**「AI にネットの目を持たせる」目的に対して、Agent-Reach はかなり有用。**  
ただし、この repo にそのまま埋め込むべきものではなく、**research / docs / skills / 外部ツール層として使うのが最も筋が良い**。

特にこの repo では、

- `market_*` が価格・ニュース・TA を扱う
- `docs/research/` が解釈と意思決定の正本
- `.agents/skills/` が agent routing を担える

という土台が既にある。

そのため、今すぐ価値が出るのは **「social/community observation を research workflow に追加すること」** であり、  
本線コードの大改造ではない。
