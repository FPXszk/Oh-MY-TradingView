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
