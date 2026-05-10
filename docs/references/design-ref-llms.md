# External design references

外部調査・比較・設計検討で参照した資料は、**必ずこの台帳に記録する**。

以下のテンプレートに沿って追記する。

## 番号：名前

- URL: ***
- 参考にした理由: ***
- このプロジェクトにどう活かしたか: ***
- 採用したもの: ***
- 採用しなかったもの: ***

---

## 1：Harness Engineeringとは何か

- URL: https://x.com/shodaiiiiii/status/2037407745704362112?s=46
- 参考にした理由: ハーネスエンジニアリング観点で現状レビューと改善優先順位を整理する際の基準として使ったため。
- このプロジェクトにどう活かしたか: CI 品質ゲート、summary evaluator、failure alert surfacing、feedback loop という改善テーマの整理に使った。
- 採用したもの: ハーネスを「AI の周辺にある安全装置・評価・運用導線」として捉える観点。
- 採用しなかったもの: 記事内で紹介されている個別の外部事例やツール構成を、そのままこのリポジトリへ転写すること。

---

## 2：Mathieu2301/TradingView-API

- URL: https://github.com/Mathieu2301/TradingView-API
- 参考にした理由: CDP を使わず TradingView 側の data / indicator / date range / backtest を扱う比較対象として確認したかったため。
- このプロジェクトにどう活かしたか: UI automation 以外に、非公式 protocol / WebSocket 直結という research track があることを整理した。
- 採用したもの: CDP 非依存経路も比較対象に入れるという設計観点。
- 採用しなかったもの: 非公式 TradingView protocol 依存をこの repo の本線に据えること。

---

## 3：atilaahmettaner/tradingview-mcp

- URL: https://github.com/atilaahmettaner/tradingview-mcp
- 参考にした理由: MCP で TradingView 周辺の market intelligence をどう広げているかを確認するため。
- このプロジェクトにどう活かしたか: Yahoo Finance、news、sentiment、screener などを CDP 非依存レイヤとして追加できると判断した。
- 採用したもの: non-CDP の market / financial / screener tools を別レイヤとして足すという考え方。
- 採用しなかったもの: 独自 backtest を TradingView Strategy Tester の互換物として扱うこと。

---

## 4：tradesdontlie/tradingview-mcp

- URL: https://github.com/tradesdontlie/tradingview-mcp
- 参考にした理由: 現在の repo と同じく TradingView Desktop + CDP を MCP 化した近縁事例だったため。
- このプロジェクトにどう活かしたか: tool taxonomy、launch、stream、alerts、watchlist、pane/tab、screenshot などの拡張余地を洗い出した。
- 採用したもの: 現行の CDP 本線を保ったまま tool surface を広げる発想。
- 採用しなかったもの: repo 全体をそのまま模倣すること。

---

## 5：fabston/TradingView-Webhook-Bot

- URL: https://github.com/fabston/TradingView-Webhook-Bot
- 参考にした理由: TradingView alert webhook を受ける inbound channel の作り方を確認するため。
- このプロジェクトにどう活かしたか: 将来 webhook receiver を別サービスとして opt-in 追加する際の参考にした。
- 採用したもの: shared secret による簡易検証と、alert relay を別プロセスに切る考え方。
- 採用しなかったもの: 外部送信前提の構成を local-only 前提の本線へ直接入れること。

---

## 6：pAulseperformance/awesome-pinescript

- URL: https://github.com/pAulseperformance/awesome-pinescript
- 参考にした理由: Pine Script 周辺の公式 docs、community scripts、dev tools の探索入口として使えるため。
- このプロジェクトにどう活かしたか: preset 拡張候補、Pine 学習導線、今後の比較調査の継続入口として位置付けた。
- 採用したもの: curated hub を使って戦略候補やドキュメント導線を増やす考え方。
- 採用しなかったもの: 索引 repo の内容をそのままベンダーすること。

---

## 7：TradingView GitHub organization

- URL: https://github.com/tradingview
- 参考にした理由: `github.com/tradingview` が公式かどうか、どの種類の public repo を持っているかを確認するため。
- このプロジェクトにどう活かしたか: official repo 群から、charting library / docs / integration examples と internal infra を切り分けて活用候補を整理した。
- 採用したもの: official repo は chart embedding / docs / examples 側に強いという全体認識。
- 採用しなかったもの: org 配下の internal / infra repo を直接流用対象とみなすこと。

---

## 8：tradingview/lightweight-charts

- URL: https://github.com/tradingview/lightweight-charts
- 参考にした理由: official な chart rendering library として、保存済み backtest 結果の viewer に使えるかを確認するため。
- このプロジェクトにどう活かしたか: backtest JSON や campaign 結果を可視化する別 UI の候補として整理した。
- 採用したもの: saved artifact viewer を TradingView Desktop と独立して持つという発想。
- 採用しなかったもの: これで Desktop automation や Strategy Tester を置き換えられると考えること。

---

## 9：tradingview/charting-library-examples

- URL: https://github.com/tradingview/charting-library-examples
- 参考にした理由: official charting integration の実例が、自前 frontend / datafeed 構想に使えるか確認するため。
- このプロジェクトにどう活かしたか: 将来 web frontend を切り出す場合の integration patterns の参考候補として整理した。
- 採用したもの: framework 別 integration examples があるという知見。
- 採用しなかったもの: 現行の Desktop + CDP workflow をこれで直接置換すること。

---

## 10：tradingview/charting-library-tutorial

- URL: https://github.com/tradingview/charting-library-tutorial
- 参考にした理由: official tutorial から Datafeed API と access 制約を確認するため。
- このプロジェクトにどう活かしたか: self-hosted datafeed / web chart 方向はありうるが、肝心の charting library 本体は private access 前提だと整理した。
- 採用したもの: datafeed 接続の考え方と、web embedding は別問題だという整理。
- 採用しなかったもの: official repo 群に Desktop automation API があるという誤解。

---

## 11：tradingview/awesome-tradingview

- URL: https://github.com/tradingview/awesome-tradingview
- 参考にした理由: official 側がどの developer products と community ecosystem を案内しているか確認するため。
- このプロジェクトにどう活かしたか: widgets / advanced charts / lightweight charts / Pine docs という official developer surface を整理した。
- 採用したもの: official / community を分けて参照する姿勢。
- 採用しなかったもの: listed community projects を無条件に信頼して採用すること。

---

## 12：tradingview/documentation-guidelines

- URL: https://github.com/tradingview/documentation-guidelines
- 参考にした理由: official の docs / Pine documentation の書き方ルールを確認するため。
- このプロジェクトにどう活かしたか: 文書整備を継続運用する際の参考として扱い、参照資料台帳ルールも明文化した。
- 採用したもの: docs を書き方ごと資産化する観点。
- 採用しなかったもの: TradingView の文体規約をそのまま本 repo の必須規約にすること。

---

## 13：tradingview/rest_integrations_docs

- URL: https://github.com/tradingview/rest_integrations_docs
- 参考にした理由: official の integration docs / writing repo の性格を確認するため。
- このプロジェクトにどう活かしたか: official org には runtime repo だけでなく docs 専用 repo もあると理解し、資料台帳や docs 導線整備の参考にした。
- 採用したもの: integration knowledge を独立した docs repo として管理する発想。
- 採用しなかったもの: reStructuredText / build 手順をそのまま本 repo に導入すること。

---

## 14：tradesdontlie/tradingview-mcp の CLAUDE.md

- URL: https://github.com/tradesdontlie/tradingview-mcp/blob/main/CLAUDE.md
- 参考にした理由: 同系統の CDP + MCP repo が、agent にどのような decision tree を与えているかを確認するため。
- このプロジェクトにどう活かしたか: tool taxonomy や agent 向け操作導線を docs / tool guide に落とす発想の比較材料にした。
- 採用したもの: 操作面が広がったときに agent decision tree を別文書として持つ考え方。
- 採用しなかったもの: Claude 固有文脈の文書をそのまま本 repo に移植すること。

---

## 15：tradingview/charting_library

- URL: https://github.com/tradingview/charting_library
- 参考にした理由: official tutorial が参照している本体 library の公開条件を確認するため。
- このプロジェクトにどう活かしたか: official web charting 方向は private access 前提であり、Desktop automation の public 代替ではないと整理した。
- 採用したもの: official Charting Library は web embedding / datafeed 側の別レイヤだという理解。
- 採用しなかったもの: これを現行の Desktop + CDP workflow の直接代替とみなすこと。

---

## 16：Panniantong/Agent-Reach

- URL: https://github.com/Panniantong/Agent-Reach
- 参考にした理由: AI に Twitter、掲示板、記事、動画字幕などを横断的に見せる「ネットの目」の実例として最も近かったため。
- このプロジェクトにどう活かしたか: Oh-MY-TradingView では Agent-Reach 本体を入れず、`reach_*` という read-only external observation layer を別面で追加する方針に落とした。
- 採用したもの: scaffolding として外部観測導線を整える発想、Jina Reader を front door に置く考え方、Twitter 以外を別 namespace へ分離する設計。
- 採用しなかったもの: Agent-Reach 全体をこの repo の必須依存や core 実装として埋め込むこと。

---

## 17：unclecode/crawl4ai

- URL: https://github.com/unclecode/crawl4ai
- 参考にした理由: LLM-friendly web crawl / markdown 化 / JS-heavy page 対応の代表例として、Agent-Reach の web チャネル代替候補を確認したかったため。
- このプロジェクトにどう活かしたか: 記事・IR ページ・技術 docs の深掘りは、market news の即時取得より別 research engine として切り出す方がよいと判断した。
- 採用したもの: 深い web crawl を separate research path として持つ発想。
- 採用しなかったもの: Crawl4AI をこの repo の core dependency にすること。

---

## 18：firecrawl/firecrawl

- URL: https://github.com/firecrawl/firecrawl
- 参考にした理由: search / scrape / crawl / agent を一体化した、AI 向け web data platform の代表例として比較したかったため。
- このプロジェクトにどう活かしたか: broad research 用の web data layer は有力だが、現 repo へ直接統合するには重いと判断した。
- 採用したもの: AI 向け出力整形と MCP / CLI 導線を重視する姿勢。
- 採用しなかったもの: Firecrawl を前提にした cloud / key 依存の導入。

---

## 19：jina-ai/reader

- URL: https://github.com/jina-ai/reader
- 参考にした理由: `r.jina.ai` / `s.jina.ai` による最軽量の read/search 導線が、Agent-Reach と非常に近い部品だったため。
- このプロジェクトにどう活かしたか: `reach_read_web` の実装と、`reach_read_youtube` の metadata fallback 導線として実際に採用した。
- 採用したもの: URL を LLM-friendly text に変換する軽量 front door の考え方と、複雑な crawler を持ち込まない Phase 1 の割り切り。
- 採用しなかったもの: Reader だけで social/community 観測全体を解決できるとみなすこと。

---

## 20：searxng/searxng

- URL: https://github.com/searxng/searxng
- 参考にした理由: Exa 依存を避けつつ、セルフホスト可能な広域検索の代替があるか確認したかったため。
- このプロジェクトにどう活かしたか: social/community の深読みに入る前段として、広く候補を探す検索レイヤを別管理する発想を補強した。
- 採用したもの: メタ検索を separate layer として扱う設計観点。
- 採用しなかったもの: SearXNG 単体で掲示板本文やコメント木の深読みに十分だとみなすこと。

---

## 21：nickscamara/open-deep-research

- URL: https://github.com/nickscamara/open-deep-research
- 参考にした理由: 検索→抽出→推論→レポートまで含む deep research pipeline の OSS 実例として確認したかったため。
- このプロジェクトにどう活かしたか: social / web 観測は「取る」だけでなく、「複数ソースをまとめて判断材料にする」パイプラインが重要だと整理した。
- 採用したもの: 収集結果を reasoning pipeline に流し込む発想。
- 採用しなかったもの: UI / app 全体をこの repo に持ち込むこと。

---

## 22：browser-use/browser-use

- URL: https://github.com/browser-use/browser-use
- 参考にした理由: CLI / API / RSS で届かない認証壁や複雑 UI を、AI がブラウザ操作で越える最終手段の代表例だったため。
- このプロジェクトにどう活かしたか: 通常経路ではなく fallback としてのみ価値があると判断した。
- 採用したもの: どうしても必要なときだけ browser automation を使う fallback 戦略。
- 採用しなかったもの: browser-use を通常の research workflow に据えること。

---

## 23：public-clis/twitter-cli

- URL: https://github.com/public-clis/twitter-cli
- 参考にした理由: Agent-Reach の Twitter チャネルを支える上流として、read/search/article/user lookup の実力と制約を確認したかったため。
- このプロジェクトにどう活かしたか: FinTwit 観測は Agent-Reach 全体を入れなくても、twitter-cli 単体で research workflow に十分組み込めると判断した。
- 採用したもの: YAML/JSON 出力、article 読取、user lookup、検索を research input に使う観点。
- 採用しなかったもの: Twitter cookie 管理や anti-detection をこの repo の core に持ち込むこと。

---

## 24：public-clis/rdt-cli

- URL: https://github.com/public-clis/rdt-cli
- 参考にした理由: Agent-Reach の Reddit チャネル上流として、検索・投稿読取・コメント木・構造化出力の扱いやすさを確認したかったため。
- このプロジェクトにどう活かしたか: Reddit は separate research input として価値が高いと確認したが、Phase 1 実装では依存を増やさず public JSON route を優先した。
- 採用したもの: 構造化出力と comment tree 読取を `reach_*` に組み込む発想。
- 採用しなかったもの: Reddit interaction をこの repo の本線機能にすること。

---

## 25：JNHFlow21/social-post-extractor-mcp

- URL: https://github.com/JNHFlow21/social-post-extractor-mcp
- 参考にした理由: Douyin / 小紅書を `script.md` + `info.json` の固定 artifact に正規化する実装が、social data の扱い方として参考になったため。
- このプロジェクトにどう活かしたか: social observation は「取れる」だけでなく、固定スキーマ / 固定 artifact に落として初めて durable な research asset になると整理した。
- 採用したもの: 正規化 artifact を先に決める発想。
- 採用しなかったもの: Bailian API 前提の実装や対象プラットフォーム特化ロジックをこの repo に直接入れること。

---

## 26：apify/apify-mcp-server

- URL: https://github.com/apify/apify-mcp-server
- 参考にした理由: 「商用品質の web/social scraping を MCP から使う」対案として、無料 OSS 中心の Agent-Reach と比較したかったため。
- このプロジェクトにどう活かしたか: 将来、有料でも安定性を優先する別レイヤの選択肢があると整理した。
- 採用したもの: dynamic tool discovery と MCP で大規模 scraper 群を扱う設計観点。
- 採用しなかったもの: Apify 依存を現 repo の標準前提にすること。

---

## 27：vercel-labs/agent-browser

- URL: https://github.com/vercel-labs/agent-browser
- 参考にした理由: AI 向け browser automation CLI が、TradingView 周辺の補助調査や fallback web interaction に使えるか確認したかったため。
- このプロジェクトにどう活かしたか: accessibility tree + ref、stream、recording という観測面の設計が OMTV の将来 debug / fallback layer の参考になると整理した。
- 採用したもの: ref ベース snapshot、runtime stream、fallback browser layer の考え方。
- 採用しなかったもの: TradingView Desktop + CDP 主軸をこれで置き換えること。

---

## 28：virattt/ai-hedge-fund

- URL: https://github.com/virattt/ai-hedge-fund
- 参考にした理由: multi-agent な投資判断・risk 管理・portfolio synthesis の構造が、この repo の market-intel / reasoning layer に活かせるか確認したかったため。
- このプロジェクトにどう活かしたか: analyst signals → risk manager → portfolio manager という分離を、将来の thesis generation / explanation layer の参考にした。
- 採用したもの: deterministic constraints を先に計算し、LLM は synthesis に寄せる構造。
- 採用しなかったもの: educational PoC を live trading engine として扱うこと。

---

## 29：rv64m/autotrade

- URL: https://github.com/rv64m/autotrade
- 参考にした理由: LLM が自律的に戦略探索を回す backtest harness の作り方が、OMTV の preset / backtest workflow に最も近かったため。
- このプロジェクトにどう活かしたか: `program.md` による experiment contract、`results.jsonl`、keep/discard/crash、generated/trash 分離を別 exec-plan 候補として整理した。
- 採用したもの: backtest 実験ループの型と durable な試行ログの考え方。
- 採用しなかったもの: execution automation や live autotrading をこの repo の直近目標にすること。

---

## 30：hsliuping/TradingAgents-CN

- URL: https://github.com/hsliuping/TradingAgents-CN
- 参考にした理由: multi-agent 株分析系 project の中国語圏拡張版が、どこまで再利用可能かと product 化の方向性を確認したかったため。
- このプロジェクトにどう活かしたか: report export、progress 表示、learning-first positioning などの feature inventory を把握した。
- 採用したもの: 学習 / 研究用途を前面に出す位置づけと機能棚卸しの観点。
- 採用しなかったもの: `app/` / `frontend/` の proprietary 部分を再利用候補とみなすこと。

---

## 31：vercel-labs organization

- URL: https://github.com/vercel-labs
- 参考にした理由: `vercel-labs` が公式実験 org と見なせるか、および org 全体で agent / sandbox / workflow 周辺に有用 repo があるか確認したかったため。
- このプロジェクトにどう活かしたか: reusable core と example repo を切り分け、`agent-browser`, `agent-skills`, `skills`, `portless`, `opensrc`, `dev3000`, `openreview`, `emulate` を高シグナル候補として整理した。
- 採用したもの: agent / sandbox / workflow 周辺の設計資産を周辺開発体験の改善材料として見る観点。
- 採用しなかったもの: org 配下の多数の workflow example や demo repo をそのまま本 repo の依存関係にすること。

---

## 32：vercel-labs/agent-skills

- URL: https://github.com/vercel-labs/agent-skills
- 参考にした理由: repo 固有の skill 群を agent にどう配布・記述するかの参考として確認したかったため。
- このプロジェクトにどう活かしたか: 本 repo の `.agents/skills/` 運用や、今後の research / review skill の設計観点として整理した。
- 採用したもの: skill を instructions + scripts + references で束ねる考え方。
- 採用しなかったもの: Vercel frontend 系 skill 群そのものを本 repo に流用すること。

---

## 33：vercel-labs/skills

- URL: https://github.com/vercel-labs/skills
- 参考にした理由: agent skills の配布・導入・更新を CLI としてどう扱うか確認したかったため。
- このプロジェクトにどう活かしたか: skills を repo / global の両スコープで運用する考え方や、公開 ecosystem の位置づけを理解する材料にした。
- 採用したもの: skills を installable asset として扱う観点。
- 採用しなかったもの: external skills ecosystem をこの repo の必須ランタイムにすること。

---

## 34：vercel-labs/portless

- URL: https://github.com/vercel-labs/portless
- 参考にした理由: 複数の local UI / stream / debug endpoint を人間と agent の両方が扱いやすくする方法として確認したかったため。
- このプロジェクトにどう活かしたか: 将来、TradingView 以外の補助 UI や dashboard を足すときの local URL 整理に使えると判断した。
- 採用したもの: stable local URL と worktree-aware routing の発想。
- 採用しなかったもの: 現時点で repo 本体へ portless を必須導入すること。

---

## 35：vercel-labs/opensrc

- URL: https://github.com/vercel-labs/opensrc
- 参考にした理由: 外部依存ライブラリの実装まで agent に読ませる導線が、比較調査や将来の code review に役立つか確認したかったため。
- このプロジェクトにどう活かしたか: 外部 package の source fetch を durable asset として置く運用の参考にした。
- 採用したもの: implementation-level context を追加で持たせる考え方。
- 採用しなかったもの: `opensrc/` ディレクトリ運用をこの repo の標準作法として即導入すること。

---

## 36：vercel-labs/dev3000

- URL: https://github.com/vercel-labs/dev3000
- 参考にした理由: browser / server / network / screenshot を統合した AI 向け debug timeline の作り方が、TradingView セッション観測の参考になるため。
- このプロジェクトにどう活かしたか: TradingView Desktop 操作時の observability layer を将来強化する発想として整理した。
- 採用したもの: logs + console + network + screenshots を timestamped feed で束ねる観点。
- 採用しなかったもの: web app dev server 向けの d3k をそのまま本 repo に導入すること。

---

## 37：vercel-labs/openreview

- URL: https://github.com/vercel-labs/openreview
- 参考にした理由: sandbox 上で AI code review を実行し、suggestion / fix / push まで行う構成が将来の review automation に使えるか確認したかったため。
- このプロジェクトにどう活かしたか: PR review の durable workflow と custom skill loading の参考にした。
- 採用したもの: sandboxed review と skill-based review depth の考え方。
- 採用しなかったもの: Vercel hosted 前提の review bot を現 repo にそのまま導入すること。

---

## 38：vercel-labs/emulate

- URL: https://github.com/vercel-labs/emulate
- 参考にした理由: no-network sandbox や CI で外部 API を stateful に擬似化する道具が、将来のテストや demo に役立つか確認したかったため。
- このプロジェクトにどう活かしたか: 外部サービス依存が増えたときに、network-free テスト面を別 layer で支える候補として整理した。
- 採用したもの: production-fidelity API emulation を local/CI で持つ観点。
- 採用しなかったもの: 現時点の docs-only task で emulator 導入まで進めること。

---

## 39：vercel-labs/coding-agent-template

- URL: https://github.com/vercel-labs/coding-agent-template
- 参考にした理由: hosted な coding-agent orchestration app が、別 repo / 別サービス候補として有用か確認したかったため。
- このプロジェクトにどう活かしたか: OMTV 本体ではなく、将来の hosted sidecar や multi-user task runner を考える際の参考候補として整理した。
- 採用したもの: sandbox lifecycle、keep-alive、branch generation、multi-agent selection の設計観点。
- 採用しなかったもの: hosted coding app 全体をこの repo 本体の責務に取り込むこと。

---

## 40：MMT

- URL: https://mmt.gg/ , https://mmt.gg/api
- 参考にした理由: 「最近無料になったらしい」暗号資産 analytics terminal が、OMTV の market-intel layer を補強できるか確認したかったため。
- このプロジェクトにどう活かしたか: crypto orderflow / heatmap / OI / liquidation の外部データ源候補として整理した。
- 採用したもの: free tier で試せる hosted data source 候補としての位置づけ。
- 採用しなかったもの: TradingView 代替や repo 標準依存として即採用すること。

---

## 41：The Math Behind Combining 50 Weak Signals Into One Winning Trade

- URL: http://x.com/i/article/2037534155752583168
- 参考にした理由: 単独では弱い signal を束ねて、より強い判断へ圧縮する考え方が `market_*` / `x_*` / `reach_*` の今後の設計方針と近かったため。
- このプロジェクトにどう活かしたか: 第1段階では `market_symbol_analysis` に additive な `confluence_score` / `confluence_label` / `confluence_breakdown` / `coverage_summary` を追加し、`market_confluence_rank` で watchlist 候補を比較できるようにした。今回の段階ではさらに `experiment-gating` / campaign artifact へ `confluence_snapshot` を載せ、`x_*` / `reach_*` は directional sentiment ではなく community snapshot（件数 / recency / source presence）として統合した。
- 採用したもの: 固定重みの deterministic confluence layer、false precision を避ける coarse score、coverage を別面で明示する設計、community を strength ではなく observation coverage として扱う設計。
- 採用しなかったもの: 記事中の大規模 multi-signal engine 全体、prediction market 向けの応用、`x_*` / `reach_*` を初回から bullish / bearish direction に直接混ぜること。

---

## 42：Granville's New Key to Stock Market Profits

- URL: https://en.wikipedia.org/wiki/Granville%27s_law（概要）。原典は Joseph E. Granville "Granville's New Key to Stock Market Profits" (1963)
- 参考にした理由: グランビルの法則 ③（押し目買い）と ⑧（戻り売り）を次戦略候補として整理する際の出典確認のため。
- このプロジェクトにどう活かしたか: `granville-3-8` 戦略候補の定義と、MA の傾き + 価格位置関係を条件化する設計の根拠にした。
- 採用したもの: MA に対する価格の位置関係から売買タイミングを定量化する考え方。
- 採用しなかったもの: グランビル 8 法則すべてを一括で自動化すること。

---

## 43：ICT / Smart Money Concepts (SMC)

- URL: https://www.youtube.com/@InnerCircleTrader（ICT 公式チャンネル）。概念解説は TradingView コミュニティの各種 educational idea を参照
- 参考にした理由: SMC 系短期裁量仮説（Order Block、FVG、BOS/CHoCH）を次戦略候補として整理する際の出典確認のため。
- このプロジェクトにどう活かしたか: `smc-short-term-discretionary` 候補の定義と、裁量依存度・機械化難易度の評価根拠にした。
- 採用したもの: Order Block / FVG の部分的自動検出を research track として持つ考え方。
- 採用しなかったもの: SMC 全体を完全自動化戦略として即 preset 化すること。

---

## 44：CBOE VIX White Paper

- URL: https://www.cboe.com/tradable_products/vix/（CBOE 公式）。学術的背景は Whaley (2000) "The Investor Fear Gauge" 等
- 参考にした理由: VIX を regime filter として使う戦略候補（`vix-high-only`、`vix-rsi14-confluence`）の定義と妥当性確認のため。
- このプロジェクトにどう活かしたか: VIX 閾値ベースの regime 判定を次戦略候補に組み込み、cross-symbol 参照の設計課題を明確にした。
- 採用したもの: VIX を恐怖指数として regime filter に使う考え方。閾値ベースの on/off 判定。
- 採用しなかったもの: VIX デリバティブ取引や VIX term structure 分析をこの repo の直近スコープに入れること。

---

## 45：kazuFX10 の大会優勝者ツイート

- URL: https://x.com/kazuFX10/status/2042676108437426393?s=46
- 参考にした理由: 大会優勝者の手法をどこまで戦略候補へ抽象化できるか確認するため。
- このプロジェクトにどう活かしたか: `smc-short-term-discretionary` 候補の直接的な観測出典として使い、competition-style high leverage を切り離して低レバ研究候補として整理した。
- 採用したもの: SMC 系 microstructure（liquidity sweep / BOS / CHOCH / FVG / OB）という抽象化の方向。
- 採用しなかったもの: 大会成績や短時間の高レバ return を、そのまま再現可能な期待値として扱うこと。

---

## 46：shibainu_fx のグランビル法則投稿

- URL: https://x.com/shibainu_fx/status/2042534587767886096?s=46
- 参考にした理由: グランビル③ / ⑧と、MA を軸にした順張り押し目 / 戻り目を、次戦略候補へどう落とすか確認するため。
- このプロジェクトにどう活かしたか: `granville-3-8` の直接出典として使い、さらに `ma-rsi14-reacceleration` と `mtf-bb-pullback` を導く材料として使った。
- 採用したもの: MA の向きで方向を固定し、複数時間軸で整合が揃ってから入る思想。
- 採用しなかったもの: ケース④ / ⑤ のような難度の高い逆張りを次戦略の本線に据えること。

---

## 47：TradingView script `REM BB Pullback Rider`

- URL: https://jp.tradingview.com/script/v9EvreQV/
- 参考にした理由: BB pullback を機械化する際の具体的な rule set と MTF 入口の参考になるため。
- このプロジェクトにどう活かしたか: `rem-bb-pullback-rider` の直接出典として使い、`mtf-bb-pullback` の構造整理にも使った。
- 採用したもの: `SMA20 / SMA200` + slope filter + BB 端タッチで押し目を捉える枠組み。
- 採用しなかったもの: `20pips` 固定 TP/SL を資産横断の universal default とみなすこと。

---

## 48：Ren1904fx の BB 連続足反発ツイート

- URL: https://x.com/ren1904fx/status/2042849037649637526?s=46
- 参考にした理由: 連続陽線 / 陰線と BB タッチ、ろうそく足の伸びを使う独自の逆張り候補として検討価値があったため。
- このプロジェクトにどう活かしたか: `ren-consecutive-bb-reversal` 候補の直接出典として使い、将来 builder 化するときの formalization 論点を先に文書化した。
- 採用したもの: one-sided move の走り切りを、連続足と BB タッチ、candle expansion で定量化する発想。
- 採用しなかったもの: 経験則をそのまま exact rule とみなすこと。

---

## 49：NousResearch/hermes-agent

- URL: https://github.com/NousResearch/hermes-agent
- 参考にした理由: 汎用 agent platform の設計パターン（registry/toolset 分離、skills、SQLite+FTS5 state、bounded observability）を Oh-MY-TradingView に適用可能か調査するため。
- このプロジェクトにどう活かしたか: skills の概念を `.agents/skills/` 配下の TradingView 運用向け playbook / runbook に適用し、bounded observability の思想を observe snapshot の compact 化に活用した。
- 採用したもの: registry/toolset 分離の設計観点、skills、bounded observability の考え方。
- 採用しなかったもの: 汎用 agent loop、multi-channel gateway、plugin 全面開放、SQLite+FTS5 state の直接移植。

---

## 50：rtk-ai/rtk

- URL: https://github.com/rtk-ai/rtk
- 参考にした理由: CLI 出力の deterministic compaction と compact mode の設計を調査するため。
- このプロジェクトにどう活かしたか: `market_*` / `reach_*` / `x_*` / `observe` の selected surface に opt-in compact mode を追加する `src/core/output-compaction.js` の設計根拠とした。
- 採用したもの: deterministic output compaction、opt-in compact mode、tee-and-hint の考え方。
- 採用しなかったもの: shell hook rewrite、settings patch、telemetry 運用。

---

## 51：garrytan/gbrain

- URL: https://github.com/garrytan/gbrain
- 参考にした理由: thin harness + fat skills、resolver grouping、recipe-runbook、conformance test の設計パターンを調査するため。
- このプロジェクトにどう活かしたか: `.agents/skills/` に recipe-runbook スタイルの TradingView 向け skill を追加し、`tests/agent-skills-conformance.test.js` で frontmatter / 必須 section を固定する設計の根拠とした。
- 採用したもの: thin harness + fat skills、recipe-runbook style、conformance test、compiled-truth/timeline の発想。
- 採用しなかったもの: personal brain、Bun/PGLite/Postgres 依存、常時 sync/autopilot、DB migration。

---

## 52：aleabitoreddit の電力関連ポスト群

- URL: https://x.com/aleabitoreddit , https://x.com/aleabitoreddit/status/2047030798554132901?s=46
- 参考にした理由: 電力インフラ需要の恩恵銘柄を、実際の市場観測から拾って TradingView ウォッチリスト候補へ落とすための一次ソースとして使った。
- このプロジェクトにどう活かしたか: 直近 3 ヶ月の電力関連投稿から米国株候補を抽出し、`Power US Infra` ウォッチリストの母集団を定義した。
- 採用したもの: DPA / grid infrastructure / 800V DC infrastructure 文脈からの候補抽出。
- 採用しなかったもの: 非米国株や、電力テーマとの結びつきが弱い周辺銘柄の採用。

---

## 53：Yahoo Finance quote pages

- URL: https://finance.yahoo.com/quote/TXN/ , https://finance.yahoo.com/quote/ETN/ , https://finance.yahoo.com/quote/VRT/ , https://finance.yahoo.com/quote/AEIS/ , https://finance.yahoo.com/quote/VICR/ , https://finance.yahoo.com/quote/VMI/ , https://finance.yahoo.com/quote/CLF/ , https://finance.yahoo.com/quote/NVTS/ , https://finance.yahoo.com/quote/VSH/ , https://finance.yahoo.com/quote/AMSC/
- 参考にした理由: `tv market fundamentals` が 401 で使えなかったため、ウォッチリスト並び順に必要な時価総額を補完取得するため。
- このプロジェクトにどう活かしたか: 米国株候補の market cap を回収し、`Power US Infra` を時価総額降順で並べる根拠にした。
- 採用したもの: quote page 上の `Market Cap (intraday)` を一次的な並び順根拠として使う運用。
- 採用しなかったもの: Yahoo の 401/503 を回避するための非公開 API 依存やスクレイピング強化。

---

## 54：Stock Analysis market cap pages

- URL: https://stockanalysis.com/stocks/spxc/market-cap/ , https://stockanalysis.com/stocks/powl/market-cap/ , https://stockanalysis.com/stocks/azz/market-cap/ , https://stockanalysis.com/stocks/atkr/market-cap/ , https://stockanalysis.com/stocks/plpc/market-cap/
- 参考にした理由: Yahoo Finance が一部銘柄で 503 を返したため、market cap の欠損を補う代替ソースとして使った。
- このプロジェクトにどう活かしたか: SPXC / POWL / AZZ / ATKR / PLPC の時価総額を補完し、単一ウォッチリストの並び順を最後まで確定させた。
- 採用したもの: 銘柄ごとの market cap 補完ソースとしての限定利用。
- 採用しなかったもの: valuation / analyst estimate など、今回の並び順に不要な周辺データの採用。

---

## 55：Jegadeesh and Titman momentum papers

- URL: https://www.jstor.org/stable/2328882 , https://doi.org/10.1111/0022-1082.00342
- 参考にした理由: 中期モメンタムを日次スクリーナーの中核指標に置く根拠を確認するため。
- このプロジェクトにどう活かしたか: `Perf.3M` を維持しつつ、`Perf.6M`、`Perf.Y`、12-1 momentum を追加候補の最上位にした。
- 採用したもの: winner continuation を横断 rank の中心に置く設計。
- 採用しなかったもの: 直近1カ月を無視した raw 12カ月リターンだけで完結させること。

---

## 56：Short-term reversal papers

- URL: https://www.jstor.org/stable/2328818 , https://www.jstor.org/stable/2937819
- 参考にした理由: `Perf.1M` や短期 RSI を rank 中核に置くリスクを確認するため。
- このプロジェクトにどう活かしたか: `Perf.1M` を Phase1 補助に残し、個別銘柄の中核 rank からは降格する判断に使った。
- 採用したもの: 短期指標は confirmation として扱う方針。
- 採用しなかったもの: 1カ月騰落率を最重要 momentum とみなすこと。

---

## 57：Moskowitz and Grinblatt industry momentum

- URL: https://doi.org/10.1111/0022-1082.00146
- 参考にした理由: 現行 Phase1 の sector / industry momentum 選択の妥当性を検証するため。
- このプロジェクトにどう活かしたか: `src/core/sector-momentum.js` の Phase1 を維持し、セクター/業種 RS を P0 指標にした。
- 採用したもの: まず強い業種を選び、その中で個別銘柄を rank する構造。
- 採用しなかったもの: 業種効果を無視した全銘柄一律 rank。

---

## 58：George and Hwang 52-week high momentum

- URL: https://doi.org/10.1111/j.1540-6261.2004.00695.x
- 参考にした理由: 52週高値比率を単なる price filter ではなく rank 候補にできるか確認するため。
- このプロジェクトにどう活かしたか: `close / price_52_week_high` と新高値 flag を P0 追加候補にした。
- 採用したもの: 52週高値への接近を winner continuation の補助指標にすること。
- 採用しなかったもの: 52週高値だけでファンダメンタルを置き換えること。

---

## 59：Asness, Moskowitz and Pedersen value and momentum everywhere

- URL: https://doi.org/10.1111/jofi.12021 , https://pages.stern.nyu.edu/~lpederse/papers/ValMomEverywhere.pdf
- 参考にした理由: value と momentum を同時に使う設計の妥当性を確認するため。
- このプロジェクトにどう活かしたか: momentum 中核を維持しつつ、P/FCF、EV/EBITDA、FCF yield を valuation guard として整理した。
- 採用したもの: momentum と valuation/quality を組み合わせる方針。
- 採用しなかったもの: value 単独スクリーナーへの転換。

---

## 60：Residual and time-series momentum papers

- URL: https://doi.org/10.1016/j.jempfin.2011.01.003 , https://doi.org/10.1016/j.jfineco.2011.11.003
- 参考にした理由: raw momentum 以外の momentum 指標の優先順位を決めるため。
- このプロジェクトにどう活かしたか: residual momentum は有望だが実装コスト高、time-series momentum は gate として有用と評価した。
- 採用したもの: sector / beta 由来でない固有 momentum を将来候補にすること。
- 採用しなかったもの: 初回実装で回帰モデルを導入すること。

---

## 61：Momentum crash and volatility-managed momentum

- URL: https://doi.org/10.1016/j.jfineco.2015.12.002 , https://doi.org/10.1016/j.jfineco.2014.11.005
- 参考にした理由: 強い momentum 銘柄が急落しやすい局面への対処を確認するため。
- このプロジェクトにどう活かしたか: `ATR`、`beta_1_year`、volatility adjustment を alpha rank ではなく risk overlay として追加推奨した。
- 採用したもの: momentum を risk 管理なしで増やさない方針。
- 採用しなかったもの: volatility timing だけで銘柄選択を置き換えること。

---

## 62：Trading volume and momentum papers

- URL: https://doi.org/10.1111/0022-1082.00280 , https://doi.org/10.1111/0022-1082.00349
- 参考にした理由: 相対出来高を日次ブレイクアウト確認として残す根拠を確認するため。
- このプロジェクトにどう活かしたか: `relative_volume_10d_calc` を P1 confirmation として維持した。
- 採用したもの: 出来高ショックを資金流入と注目度の補助情報として使うこと。
- 採用しなかったもの: 出来高だけで quality や valuation を置き換えること。

---

## 63：Novy-Marx gross profitability

- URL: https://doi.org/10.1016/j.jfineco.2013.01.003 , https://mysimon.rochester.edu/novy-marx/research/OSoV.pdf
- 参考にした理由: 現行の `gross_margin_ttm` が quality 指標として十分か確認するため。
- このプロジェクトにどう活かしたか: 粗利率より `gross_profit_ttm / total_assets` を優先追加候補にした。
- 採用したもの: gross profitability を quality 中核に置くこと。
- 採用しなかったもの: 粗利率を全セクター共通の最上位指標にすること。

---

## 64：Fama-French five-factor model and data library

- URL: https://doi.org/10.1016/j.jfineco.2014.10.010 , https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html
- 参考にした理由: profitability と momentum factor の公開定義を確認するため。
- このプロジェクトにどう活かしたか: operating profitability、ROIC、momentum 12-1 の候補整理に使った。
- 採用したもの: profitability を独立ブロックとして rank に入れる設計。
- 採用しなかったもの: この repo の日次スクリーナーで完全なファクターポートフォリオを再現すること。

---

## 65：Piotroski F-score

- URL: https://doi.org/10.2307/2672906
- 参考にした理由: 財務健全性の複合スコアを momentum スクリーナーに入れるべきか確認するため。
- このプロジェクトにどう活かしたか: F-score は value basket 用の P2 候補とし、初回実装からは外した。
- 採用したもの: 複合 quality score の考え方。
- 採用しなかったもの: 9項目を最初から全て実装すること。

---

## 66：Accruals and earnings quality papers

- URL: https://doi.org/10.2307/2491429 , https://www.jstor.org/stable/248303
- 参考にした理由: FCF margin と cash conversion を quality 指標として使う根拠を確認するため。
- このプロジェクトにどう活かしたか: `free_cash_flow_margin_ttm` を P0 維持し、cash conversion / accruals を P1 候補にした。
- 採用したもの: 利益の現金化を quality block に入れる方針。
- 採用しなかったもの: 会計 accruals の細かな分解を初回実装へ入れること。

---

## 67：Post-earnings announcement drift and surprise papers

- URL: https://doi.org/10.2307/2490232 , https://doi.org/10.2307/2491062 , https://www.jstor.org/stable/247060
- 参考にした理由: EPS acceleration、SUE、earnings surprise を growth block に入れるべきか確認するため。
- このプロジェクトにどう活かしたか: SUE/PEAD は根拠が強いが外部データが必要な P1 候補と整理した。
- 採用したもの: 決算後ドリフトを growth confirmation として重視すること。
- 採用しなかったもの: 現行データ経路で取得できない surprise を即実装すること。

---

## 68：Jegadeesh and Livnat revenue surprises

- URL: https://doi.org/10.1016/j.jacceco.2005.10.003
- 参考にした理由: 現行 Yahoo 補完の `revenueGrowth` をどう評価するか確認するため。
- このプロジェクトにどう活かしたか: 売上成長を残しつつ、revenue acceleration と EPS/FCF 成長を組み合わせる方針にした。
- 採用したもの: revenue surprise / revenue growth を growth confirmation として使うこと。
- 採用しなかったもの: 売上成長率単独で rank の主役にすること。

---

## 69：Greenblatt magic formula

- URL: https://www.wiley.com/en-us/The+Little+Book+That+Still+Beats+the+Market-p-9780470624159
- 参考にした理由: quality と valuation を同時に見る実務的枠組みを確認するため。
- このプロジェクトにどう活かしたか: ROIC と FCF/EV 系 valuation を同時に見る推奨へ接続した。
- 採用したもの: capital return と valuation をペアにする考え方。
- 採用しなかったもの: magic formula をそのまま戦略本体にすること。

---

## 70：Enterprise multiple and valuation papers

- URL: https://www.cambridge.org/core/journals/journal-of-financial-and-quantitative-analysis/article/new-evidence-on-the-relation-between-the-enterprise-multiple-and-average-stock-returns/5CD22A12A06AFCDC5233E477757FB659 , https://doi.org/10.2308/accr.2004.79.1.73 , https://doi.org/10.2469/faj.v52.n2.1980 , https://doi.org/10.1111/j.1540-6261.1996.tb05205.x
- 参考にした理由: P/FCF、EV/EBITDA、PEG、P/S、forward 指標の優先順位を決めるため。
- このプロジェクトにどう活かしたか: EV/EBITDA と P/FCF を P1、PEG/Forward P/E/P/S を条件付きにした。
- 採用したもの: セクター別 valuation guard。
- 採用しなかったもの: analyst forecast 依存の指標を初回中核へ入れること。

---

## 71：Technical analysis evidence

- URL: https://doi.org/10.1111/j.1540-6261.1992.tb04681.x , https://doi.org/10.1111/j.1467-6419.2007.00519.x
- 参考にした理由: SMA、MACD、Bollinger、VWAP をどう扱うか確認するため。
- このプロジェクトにどう活かしたか: SMA200/SMA50 は gate 維持、MACD/BB/VWAP は後回しにした。
- 採用したもの: trend filter としての移動平均。
- 採用しなかったもの: technical indicator を fundamentals より上に置くこと。

---

## 72：Wilder technical indicators

- URL: https://www.worldcat.org/title/18452439
- 参考にした理由: RSI、ADX、ATR の定義元を確認するため。
- このプロジェクトにどう活かしたか: RSI/ADX は confirmation、ATR は risk overlay として整理した。
- 採用したもの: technical 指標を役割別に分ける設計。
- 採用しなかったもの: RSI 高値だけを強いファンダメンタルの代替とすること。

---

## 73：DuPont and asset turnover evidence

- URL: https://doi.org/10.2308/accr.2008.83.3.823
- 参考にした理由: asset turnover を profitability block へ入れるべきか確認するため。
- このプロジェクトにどう活かしたか: asset turnover は P2 とし、初回は ROIC / gross profitability を優先した。
- 採用したもの: ROE を分解して見る観点。
- 採用しなかったもの: 業種差が大きい asset turnover を全銘柄共通 rank にすること。

---

## 74：Low beta and beta anomaly papers

- URL: https://doi.org/10.1016/j.jfineco.2013.10.005 , https://doi.org/10.2469/faj.v67.n1.4
- 参考にした理由: beta を強い momentum 銘柄の risk guard として使うべきか確認するため。
- このプロジェクトにどう活かしたか: `beta_1_year` を rank 中核ではなく risk overlay として追加候補にした。
- 採用したもの: 高 beta 過多を抑える視点。
- 採用しなかったもの: low beta 戦略への転換。

---

## 75：Distress risk papers

- URL: https://doi.org/10.1111/j.1540-6261.1968.tb00843.x , https://doi.org/10.1111/j.1540-6261.2008.01416.x
- 参考にした理由: Altman Z-score、D/E、interest coverage の扱いを確認するため。
- このプロジェクトにどう活かしたか: D/E と net debt を先に使い、Altman Z-score は P2 とした。
- 採用したもの: 財務 distress を winner selection から除く考え方。
- 採用しなかったもの: 破綻予測モデルを初回実装の中心にすること。

---

## 76：Short interest evidence

- URL: https://doi.org/10.1016/j.jfineco.2004.08.002 , https://doi.org/10.1111/j.1540-6261.2008.01344.x
- 参考にした理由: short interest を momentum スクリーナーに入れるべきか確認するため。
- このプロジェクトにどう活かしたか: 根拠はあるが外部データが必要な P2 候補とした。
- 採用したもの: 高 short を警戒指標として扱う方針。
- 採用しなかったもの: 高 short を一律除外または squeeze 狙いで採用すること。

---

## 77：Institutional ownership evidence

- URL: https://doi.org/10.1162/003355301753265589 , https://doi.org/10.1086/504874
- 参考にした理由: institutional ownership change を日次スクリーナーへ入れるべきか確認するため。
- このプロジェクトにどう活かしたか: 13F の遅れが大きいため、日次 screening では P2 とした。
- 採用したもの: 機関投資家の累積買いを補助情報として見る観点。
- 採用しなかったもの: 13F だけで日次 entry を決めること。

---

## 78：International and Japan momentum evidence

- URL: https://doi.org/10.1016/j.jfineco.2011.10.011 , https://doi.org/10.1111/j.1540-6261.2010.01532.x , https://doi.org/10.1111/1540-6261.00578
- 参考にした理由: 米国中心の指標を日本株にもそのまま適用できるか確認するため。
- このプロジェクトにどう活かしたか: 日本株では業種内 rank、流動性、出来高 confirmation を重視する補足を入れた。
- 採用したもの: 国際市場でも momentum を見るが、市場差を明記する方針。
- 採用しなかったもの: 米国閾値を日本株へ無調整で移植すること。

---

## 79：AQR data library and factor material

- URL: https://www.aqr.com/Insights/Datasets
- 参考にした理由: momentum、value、quality、beta 系 factor の実務定義を確認するため。
- このプロジェクトにどう活かしたか: 12-1 momentum、value x momentum、beta guard の整理に使った。
- 採用したもの: 公開 factor 定義を日次スクリーナーの指標名へ翻訳すること。
- 採用しなかったもの: AQR の factor portfolio をそのまま複製すること。

---

## 80：Alpha Architect factor research

- URL: https://alphaarchitect.com/
- 参考にした理由: momentum / value / trend following の実務的な使い分けを確認するため。
- このプロジェクトにどう活かしたか: 論文根拠を実装優先度へ落とす際の補助資料にした。
- 採用したもの: momentum と value/quality を組み合わせる実務観点。
- 採用しなかったもの: ブログ投稿を査読論文より強い根拠として扱うこと。

---

## 81：Quantpedia factor summaries

- URL: https://quantpedia.com/
- 参考にした理由: stock momentum、factor momentum、reversal などの実務分類を確認するため。
- このプロジェクトにどう活かしたか: 指標候補40項目の分類と説明を補助した。
- 採用したもの: factor taxonomy の整理。
- 採用しなかったもの: 個別記事の performance 数値をこの repo の期待値として転用すること。

---

## 82：Robeco residual momentum

- URL: https://www.robeco.com/en-int/insights/2011/02/residual-momentum
- 参考にした理由: residual momentum を追加候補に入れるべきか確認するため。
- このプロジェクトにどう活かしたか: 残差モメンタムは有望だが外部計算が必要な P1 と整理した。
- 採用したもの: raw momentum から market/sector/beta 成分を除く考え方。
- 採用しなかったもの: 初回実装で回帰ベースの残差推定を入れること。

---

## 83：X/Twitter factor posts

- URL: https://x.com/alphaarchitect , https://x.com/quantpedia
- 参考にした理由: 2026年時点の実務家コミュニティで momentum / factor investing がどう議論されているか確認するため。
- このプロジェクトにどう活かしたか: Alpha Architect と Quantpedia の投稿を補助情報として扱い、主判断は論文と公開 factor data に置いた。
- 採用したもの: 実務者が momentum、trend following、factor momentum を継続的に扱っている観測。
- 採用しなかったもの: SNS 投稿を単独根拠にした指標採用。

---

## 84：Reddit multibagger / Yartseva discussion

- URL: https://www.reddit.com/r/ValueInvesting/comments/1ro1gmd/the_only_statistical_study_on_multibaggers_find/
- 参考にした理由: `deep-research-instruction.md` にある Yartseva (2025) 周辺の言及を確認するため。
- このプロジェクトにどう活かしたか: FCF yield、margin expansion、reinvestment への関心は補助情報として反映した。
- 採用したもの: FCF と収益性改善を multibagger 候補の観点として見ること。
- 採用しなかったもの: 一次資料の確認が弱い研究名を主要根拠にすること。

---

## 85：Substack and GitHub factor implementation survey

- URL: https://substack.com/search/momentum%20quality%20factor , https://github.com/search?q=tradingview+screener+momentum+quality&type=repositories
- 参考にした理由: quality momentum / residual momentum / TradingView screener 実装の周辺例を確認するため。
- このプロジェクトにどう活かしたか: 実装順はシンプルな TradingView columns 追加から始め、複雑なモデルは後段に回す方針を確認した。
- 採用したもの: 実務実装では取得しやすい列から ablation する考え方。
- 採用しなかったもの: 外部 repo の設計や Substack 仮説を未検証で移植すること。

---

## 86：Litash/moomoo-api-mcp

- URL: https://github.com/Litash/moomoo-api-mcp
- 参考にした理由: moomoo OpenD を MCP server 化した先行実装として、tool surface と安全ガードを確認するため。
- このプロジェクトにどう活かしたか: `check_health` / account / trade / market data をどう分けるか、SIMULATE-only fallback をどう見せるかの参考にした。
- 採用したもの: health check を独立 tool にすること、paper/simulate を安全デフォルトとして扱う設計観点。
- 採用しなかったもの: REAL account をデフォルト前提にする運用思想。

---

## 87：linboxin/moomoo-mcp-server

- URL: https://github.com/linboxin/moomoo-mcp-server
- 参考にした理由: paper trading を含む moomoo MCP server の別実装として、tool naming と diagnostics の置き方を比較するため。
- このプロジェクトにどう活かしたか: `moomoo_*` namespace で read-only / account / trading を分ける統合案と、diagnostics 的なヘルスチェック案に反映した。
- 採用したもの: paper mode を明示する構成、diagnostics を用意する発想。
- 採用しなかったもの: repo 本体を Python 単独サーバーへ全面移行すること。

---

## 88：shuizhengqi1/futu-stock-mcp-server

- URL: https://github.com/shuizhengqi1/futu-stock-mcp-server
- 参考にした理由: Futu 系 OpenAPI を MCP へ広く露出している実装として、market / subscription / account / trading の切り方を確認するため。
- このプロジェクトにどう活かしたか: quote / subscription / account / trading を別カテゴリで整理した `docs/strategy/03_mcp_integration.md` の下敷きにした。
- 採用したもの: API surface をカテゴリごとに整理する観点。
- 採用しなかったもの: そのままの機能数や構成を本 repo に移植すること。

---

## 89：moomoo OpenD download page

- URL: https://www.moomoo.com/download/opend
- 参考にした理由: OpenD が Windows 側 prerequisite であることと、導入案内の一次 URL を明示するため。
- このプロジェクトにどう活かしたか: `docs/strategy/00_environment.md` と `docs/strategy/03_mcp_integration.md` で、最初のブロッカーが OpenD 導入であることを明確にした。
- 採用したもの: OpenD を前提条件として明示すること。
- 採用しなかったもの: OpenD 未導入のまま API 実査を進めること。
