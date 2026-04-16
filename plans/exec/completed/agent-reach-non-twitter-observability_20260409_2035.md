# Agent-Reach ベース「Twitter以外の目」実装計画

## 目的
既存の `x_*` read-only Twitter/X 面はそのまま維持しつつ、Agent-Reach の思想と upstream 選定を参考に、Oh-MY-TradingView に **Twitter 以外の external observation layer** を最小スコープで追加する。今回の実装対象は **Web / RSS / Reddit / YouTube** の read-only 観測に限定し、TradingView/CDP 本線や write 操作には踏み込まない。

---

## 事前調査サマリ

### 1. repo 内の既存調査の取り込み
- 既存 research: `docs/research/agent-reach-and-broad-web-observability-applicability_20260409_0520.md`
- 既存 reference 台帳: `docs/references/design-ref-llms.md` の Agent-Reach / Jina Reader / twitter-cli / rdt-cli / social-post-extractor-mcp / Apify など
- 既存 completed plan: `docs/exec-plans/completed/agent-reach-applicability-research_20260409_0507.md`

これらの既存調査では、**Agent-Reach は統一 API 本体ではなく installer / doctor / routing の scaffolding** であり、実データ取得は upstream tool 直叩きで行う設計だと整理済み。今回の計画もこの結論を踏襲し、**Agent-Reach 全体の vendor/import は行わず、現 repo に合う upstream だけを薄い Node wrapper で導入**する。

### 2. 現在の Oh-MY-TradingView アーキテクチャ
- 層構造は `src/core` → `src/tools` → `src/cli/commands` → `src/server.js` / `src/cli/index.js`
- CDP 必須の `tv_*` / `pine_*` / `backtest` 系と、CDP 不要の `market_*` / `x_*` が既に共存
- 直近で `x_*` read-only (`src/core/twitter-read.js`, `src/tools/twitter-read.js`, `src/cli/commands/twitter-read.js`) が追加済みで、**external CLI を Node から呼ぶパターン**が成立している

### 3. Agent-Reach の fresh/deeper look
- License: **MIT**
- Package: Python 3.10+ / `agent-reach` 1.4.0
- Core deps: `requests`, `feedparser`, `python-dotenv`, `loguru`, `pyyaml`, `rich`, `yt-dlp`
- Optional deps: `playwright`, `browser-cookie3`, `mcp[cli]`
- 主要 interface:
  - CLI: `agent-reach install`, `agent-reach doctor`, `agent-reach configure`, `agent-reach watch`
  - MCP: `agent_reach/integrations/mcp_server.py` は **status/doctor 露出だけ** で、本文読取は upstream 直叩き前提
  - Skill/router: `agent_reach/skill/SKILL.md`
- realistic に import できる部分:
  1. **Jina Reader ベースの web read**
  2. **rdt-cli ベースの Reddit read/search**
  3. **yt-dlp ベースの YouTube metadata/transcript read**
  4. **doctor/status という概念**
- 今回 realistic ではない部分:
  - Agent-Reach 本体の Python package/vendor
  - `agent-reach install/configure/watch` の再実装
  - mcporter 前提 channel（Weibo / Douyin / LinkedIn / XiaoHongShu）
  - Cookie 抽出器や `~/.agent-reach/` 形式の config 管理
  - Xueqiu の cookie 前提 read（金融文脈では魅力的だが Phase 2 向け）

---

## active exec plan との overlap / conflict 確認

### 現在の active plan
- `docs/exec-plans/active/twitter-read-only-import_20260409_1050.md`

### 競合状況
この active plan と今回計画は以下のファイルで **重複更新の可能性が高い**。
- `README.md`
- `package.json`
- `src/server.js`
- `src/cli/index.js`
- `src/core/index.js`

さらに working tree 上でも `x_*` 関連ファイルが未コミット状態で存在するため、**同時並行で別ブランチ実装すると衝突しやすい**。

### 回避方針
- 今回は **follow-on plan** として扱う
- 実装開始は、少なくとも `x_*` read-only のファイル構成が固定した後に行う
- 新機能は `x_*` を触りすぎず、**新しい `reach_*` 面を並列追加**する
- 共通 helper 抽出は REFACTOR 範囲に留め、初手では `twitter-read.js` の API 面を壊さない

---

## 変更対象ファイル

### 新規作成
- `src/core/reach.js`
- `src/tools/reach.js`
- `src/cli/commands/reach.js`
- `tests/reach.test.js`

### 更新
- `src/server.js`
- `src/cli/index.js`
- `src/core/index.js`
- `package.json`
- `README.md`
- `docs/references/design-ref-llms.md`

### 削除
- なし

---

## 実装スコープ（bounded scope）

### 今回やること
Agent-Reach の「full install」ではなく、以下の **Phase 1 / low-risk channels** だけを Oh-MY-TradingView の既存 Node/MCP/CLI 構造へ組み込む。

1. **reach_status**
   - Jina Reader / Reddit / YouTube / RSS の利用可否を返す
   - `agent-reach doctor` を模した **repo ローカル版の簡易 status** とする
2. **reach_read_web**
   - 任意 URL を Jina Reader 経由で Markdown 化して読む
3. **reach_read_rss**
   - RSS/Atom feed を取得し、title/link/published/summary を整形して返す
4. **reach_search_reddit**
   - `rdt-cli` で Reddit 検索
5. **reach_read_reddit_post**
   - `rdt-cli` で Reddit 投稿本文とコメント木を取得
6. **reach_read_youtube**
   - `yt-dlp` で video metadata と transcript/subtitle 可用情報を取得し、読める本文断片を返す

### expected MCP surface
- `reach_status`
- `reach_read_web`
- `reach_read_rss`
- `reach_search_reddit`
- `reach_read_reddit_post`
- `reach_read_youtube`

### expected CLI surface
- `tv reach status`
- `tv reach web --url <url>`
- `tv reach rss --url <feed-url> [--max 5]`
- `tv reach reddit-search --query "<query>" [--max 5]`
- `tv reach reddit-post --id <post-id>`
- `tv reach youtube --url <youtube-url>`

### 正規化の原則
- 返り値は既存 `market_*` / `x_*` と同様に `success`, `source`, `retrieved_at` を持つ
- 上流差異は `src/core/reach.js` で吸収し、MCP/CLI は薄く配線する
- read-only に限定し、投稿・コメント送信・like/follow・subscribe などの write 面は出さない

---

## スコープ外
- Agent-Reach 本体の組み込み、fork、vendor
- `agent-reach install` / `configure` / `watch` / MCP status server の移植
- Twitter/X 面の作り直し、`x_*` の rename
- Weibo / Douyin / LinkedIn / XiaoHongShu / Bilibili / WeChat の導入
- Xueqiu 導入（Phase 2 候補として docs に残すのみ）
- 常駐ジョブ、cron、DB 保存、集計スコアリング、sentiment 分析
- UI ダッシュボードや `docs/research/` の自動生成
- 既存 `market_*` の仕様変更

---

## 設計方針
- **Agent-Reach の思想だけ採る**：本体 package は入れず、upstream 直叩き + doctor 的 status のみ採用
- **Twitter 面とは分離**：`x_*` は Twitter 専用、今回の `reach_*` は “Twitter 以外の目” 専用
- **Node 中心で実装**：既存 repo の責務に合わせ、`src/core/reach.js` から `fetch` / `execFile` を使う
- **依存を増やしすぎない**：
  - web: Jina Reader は追加依存なし
  - Reddit: `rdt-cli` を PATH 前提で optional 利用
  - YouTube: `yt-dlp` を PATH 前提で optional 利用
  - RSS: 可能なら Node 実装で完結し、追加 npm dep は最小限に留める
- **doctor 的 status を先に持つ**ことで、ユーザーが「何が読めるか」を最初に確認できるようにする

---

## TDD 方針（RED → GREEN → REFACTOR）

### RED
最初に `tests/reach.test.js` を追加し、以下を失敗させる。
- `reach_status` が channel ごとの ready/warn/off を返す
- `reach_read_web` が Jina Reader の本文を返す
- `reach_read_rss` が feed item を上限付きで正規化する
- `reach_search_reddit` が検索結果を正規化する
- `reach_read_reddit_post` が本文 + comments を返す
- `reach_read_youtube` が metadata + transcript availability を返す
- `rdt-cli` / `yt-dlp` 未導入時の明示エラー
- 上流 JSON/テキスト異常時の明示エラー
- write 系 tool が登録されていないこと

### GREEN
- `src/core/reach.js` に最小限の fetch/exec wrapper と normalization を実装
- `src/tools/reach.js` と `src/cli/commands/reach.js` を追加
- `src/server.js` / `src/cli/index.js` / `src/core/index.js` / `package.json` / `README.md` を最小更新
- `docs/references/design-ref-llms.md` に今回 actually relied on した upstream を追記

### REFACTOR
- 共通 exec helper / error shaping / timestamp/source 付与を整理
- `twitter-read.js` と重複する subprocess/error 処理を **壊さない範囲で** 共通化候補として切り出すか再評価
- README の “何がどの条件で読めるか” を表に整理

### カバレッジ方針
repo には現状 coverage コマンドがないため、今回は **自動 coverage gate は追加しない**。代わりに touched module (`src/core/reach.js`, `src/tools/reach.js`, `src/cli/commands/reach.js`) の主要分岐を `tests/reach.test.js` で網羅し、手動レビューで **触った範囲の 80% 以上相当** を満たすようにする。

---

## 実装後の実地 verification / examples

実装後は **既存 repo コマンドだけ** で、help → status → 実読取の順に exercise する。

### baseline / regression
- `npm test`
- `npm run tv -- --help`
- `npm run tv -- reach --help`

### status 確認
- `npm run tv -- reach status`

### 実読取 examples
1. **Web 記事**
   - `npm run tv -- reach web --url "https://openai.com/index/introducing-gpt-4o/"`
   - 読めるもの: Markdown 化された本文、title 相当の先頭、source URL
2. **RSS feed**
   - `npm run tv -- reach rss --url "https://hnrss.org/frontpage" --max 3`
   - 読めるもの: item title / link / published / summary
3. **Reddit 検索 → 投稿詳細**
   - `npm run tv -- reach reddit-search --query "NVDA earnings" --max 3`
   - 検索結果で返った `postId` を使って
   - `npm run tv -- reach reddit-post --id <returned-post-id>`
   - 読めるもの: post title / body / subreddit / score / comment tree
4. **YouTube**
   - `npm run tv -- reach youtube --url "https://www.youtube.com/watch?v=5qap5aO4i9A"`
   - 読めるもの: title / channel / description / subtitle availability / transcript excerpt（字幕がある場合）

### 期待する確認観点
- `reach_status` と実読取結果が矛盾しないこと
- 依存がない channel は ready=false / warn で明示されること
- public URL / public feed / public Reddit / public YouTube で最低 1 回は実際に本文が返ること

---

## リスク
- **active plan 競合**: `x_*` 追加中のファイルと競合しやすい
- **上流 CLI 変動**: `rdt-cli` / `yt-dlp` の出力が変わる可能性
- **Jina Reader 可用性**: 外部サービス依存のためネットワーク障害影響あり
- **RSS 正規化差異**: feed ごとに title/summary/published の揺れがある
- **YouTube 字幕可用性**: 字幕がない動画では transcript excerpt を返せない
- **テストの非 determinism**: ネットワークや upstream 実データ依存のため、実地 verification は manual smoke と切り分ける必要がある
- **責務拡散**: `reach_*` を広げすぎると repo が social/web aggregator 化するため、今回は 4 channel に止める

---

## validation commands（既存 repo コマンド）
- `npm test`
- `npm run tv -- --help`
- `npm run tv -- reach --help`
- `npm run tv -- reach status`
- `npm run tv -- reach web --url "https://openai.com/index/introducing-gpt-4o/"`
- `npm run tv -- reach rss --url "https://hnrss.org/frontpage" --max 3`
- `npm run tv -- reach reddit-search --query "NVDA earnings" --max 3`
- `npm run tv -- reach youtube --url "https://www.youtube.com/watch?v=5qap5aO4i9A"`

---

## 実装ステップ（checkbox breakdown）
- [ ] active plan `twitter-read-only-import_20260409_1050.md` との重複ファイルを確認し、今回を follow-on として着手できる状態にする
- [ ] `tests/reach.test.js` を追加し、status/web/rss/reddit/youtube/error/write-not-exposed の RED を作る
- [ ] `src/core/reach.js` を作成し、Jina Reader / RSS / `rdt-cli` / `yt-dlp` の最小 wrapper と normalization を実装する
- [ ] `src/tools/reach.js` を作成し、`reach_*` MCP tools を read-only のみ登録する
- [ ] `src/cli/commands/reach.js` を作成し、`tv reach ...` CLI を追加する
- [ ] `src/server.js` / `src/cli/index.js` / `src/core/index.js` / `package.json` を更新して配線する
- [ ] `README.md` に setup 条件・何が読めるか・実地 verification 例を追記する
- [ ] `docs/references/design-ref-llms.md` に Agent-Reach の今回採用範囲（Jina/rdt-cli/yt-dlp/doctor pattern）を反映する
- [ ] `npm test` で GREEN を確認する
- [ ] `npm run tv -- ...` の help/status/manual smoke で実地確認する
- [ ] 重複 helper とエラーメッセージを整理して REFACTOR を完了する

---

## この計画で採る判断
- **採る**: Agent-Reach の “scaffolding + upstream direct call + doctor” 発想
- **採らない**: Agent-Reach 全体の移植、Python 本体依存、mcporter-heavy channels
- **後続候補**: Xueqiu / V2EX を Phase 2 として別 exec-plan 化

---

## 推奨 plan filename
- `docs/exec-plans/active/agent-reach-non-twitter-observability_20260409_2035.md`
