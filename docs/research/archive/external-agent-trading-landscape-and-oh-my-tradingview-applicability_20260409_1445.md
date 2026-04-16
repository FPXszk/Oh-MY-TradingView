# 外部 agent / trading repo・service 調査と Oh-MY-TradingView への適用可能性

## 結論

- **いちばん相性が良いのは `rv64m/autotrade` の「LLM に backtest 実験ループを回させる設計」と、`virattt/ai-hedge-fund` の「複数 analyst の判断を risk / portfolio manager で統合する reasoning layer」。**
- **`vercel-labs/agent-browser` は有用だが、TradingView Desktop + CDP の代替ではない。**  
  この repo では **認証壁のある外部調査、補助 UI 操作、将来の観測 fallback** に限定して使うのがよい。
- **`hsliuping/TradingAgents-CN` は再利用コードというより学習プラットフォーム / 製品化事例。**  
  しかも `app/` と `frontend/` は proprietary なので、**概念参考止まり**が妥当。
- **`vercel-labs` は Vercel の agent / sandbox / workflow 実験 org と見てよく、org 全体を棚卸しすると `agent-browser`, `agent-skills`, `skills`, `portless`, `opensrc`, `dev3000`, `openreview`, `emulate`, `coding-agent-template` が高シグナル。**
- **`mmt.gg` は「完全無料化」ではなく、free tier forever を持つ有料 SaaS。**  
  OMTV には TradingView 代替ではなく、**暗号資産 orderflow / heatmap / OI / liquidation の外部データ源候補**として効く。

## この repo の前提

`Oh-MY-TradingView` は **TradingView Desktop + CDP** を主軸にしつつ、既に **non-CDP の market-intel layer** も持っている。

- CDP 主軸: TradingView Desktop 操作、価格取得、Pine、backtest、workspace、alerts
- non-CDP: `market_*` 系による Yahoo Finance ベースの quote / fundamentals / news / TA

したがって今回の対象を評価する軸は、次の 4 つになる。

1. CDP 主軸を置き換えるのか、補完するのか
2. non-CDP market-intel layer を強くするのか
3. docs / research workflow に知見として取り込むのか
4. 別 repo / 別 MCP / 別 exec-plan に切るべきか

## 横断比較

| 対象 | これは何か | 強いところ | 弱いところ | OMTV への接続 |
|---|---|---|---|---|
| `vercel-labs/agent-browser` | AI 向け Rust 製 browser automation CLI | accessibility tree ref、semantic locator、batch、stream、recording | TradingView Desktop 置換ではない | **fallback browser layer** |
| `virattt/ai-hedge-fund` | educational な multi-agent hedge-fund PoC | analyst 分業、risk / PM 分離、backtester、LangGraph | 実売買用ではない、外部 API 依存 | **reasoning / thesis synthesis layer** |
| `rv64m/autotrade` | LLM 駆動の戦略探索ループ | `program.md`、risk/profit gate、results logging、generated/trash 分離 | 対象は独自 backtester、execution ではない | **backtest harness / experiment loop** |
| `hsliuping/TradingAgents-CN` | 中国語圏向け multi-agent 株分析学習平台 | 製品化された UX、A股対応、report export、sim trading | mixed license、app/frontend proprietary | **概念参考のみ** |
| `vercel-labs` org | agent / sandbox / workflow 実験群 | skills、生産性 tooling、sandbox 運用、agent UX | demo / example が多く選別が必要 | **周辺開発体験の改善** |
| `mmt.gg` | 暗号資産 orderflow / analytics SaaS | 20+ exchanges 集約、heatmap、CVD、OI、API、free tier | crypto only、SaaS 依存、価格詳細未確認 | **crypto market-intel 拡張** |

## 1. `vercel-labs/agent-browser`

- URL: <https://github.com/vercel-labs/agent-browser>
- 一言でいうと: **AI が扱いやすいように CLI 面を最適化した browser automation runtime**

README と tree から見える中核は以下。

- `snapshot` で **accessibility tree + ref** を返す
- `click @e2`, `fill @e3 ...` のように **ref ベース操作**ができる
- `find role button click --name "Submit"` のような **semantic locator** を持つ
- `batch` で multi-step command を 1 process でまとめて流せる
- `stream` が WebSocket server を持ち、実行中 frame / status / result / console / page error / tabs を配信する
- `recording` は ffmpeg に screenshot pipe を流し込む実装を持つ

この repo で特に効く示唆は 3 つある。

1. **ref 付き snapshot は AI 操作面として強い**  
   OMTV でも DOM / screenshot / stream の観測面を整理するときの参考になる。
2. **runtime stream の考え方が良い**  
   TradingView 側の状態・結果・console をまとめて配信する UI / debug layer の発想として効く。
3. **browser automation は fallback に閉じ込めるのが正解**  
   OMTV は既に CDP 本線があるため、外部 web 調査や補助 UI 以外に広げると責務がぼやける。

### 採用判断

- **採用するもの**
  - accessibility tree / ref ベース観測の考え方
  - stream / recording / dashboard 的な runtime 観測発想
  - 認証壁のある外部調査を browser fallback に閉じ込める整理
- **採用しないもの**
  - TradingView Desktop 主軸を agent-browser に置き換えること
  - 外部サイト観測を常時 browser automation 前提にすること

## 2. `virattt/ai-hedge-fund`

- URL: <https://github.com/virattt/ai-hedge-fund>
- 一言でいうと: **教育目的の multi-agent investment reasoning + backtesting PoC**

README は proof of concept / educational only / no real trading を明記している。  
実装面では `src/main.py` が LangGraph workflow を組み、複数 analyst → risk manager → portfolio manager という流れを作る。`src/backtester.py` はこの意思決定関数を backtest engine に渡している。

中身として重要なのは、単に「AI が売買判断する」ではなく、次の役割分離を明示している点。

- valuation
- sentiment
- fundamentals
- technicals
- 著名投資家ペルソナ analyst 群
- risk management
- portfolio management

`sentiment.py` を見ると、insider trades と company news を重みづけして `bullish / bearish / neutral` を出している。  
`portfolio_manager.py` は analyst signals を圧縮し、allowed actions と max quantity を deterministic に計算した上で、最後だけ LLM に決定させる構造になっている。

### OMTV への示唆

この repo の価値は execution ではなく **reasoning contract** にある。

1. **signal を analyst ごとに分離して持つ**
2. **risk manager で deterministic constraint を先に作る**
3. **LLM は最後の synthesis に限定する**

OMTV に直接移植するなら、次のような形が自然。

- `market_*` と外部観測レイヤの出力を analyst slot に分ける
- `technical`, `news`, `community`, `macro` など観点別 reasoning を出す
- 最終的に「なぜこの銘柄を見ているのか」を説明する **thesis / note 生成** に使う

### 採用判断

- **採用するもの**
  - analyst signals → risk gate → synthesis という構造
  - deterministic constraint を先に計算する方針
  - backtest と reasoning を接続する考え方
- **採用しないもの**
  - 実売買エンジンとして扱うこと
  - そのまま multi-agent アプリをこの repo に埋め込むこと

## 3. `rv64m/autotrade`

- URL: <https://github.com/rv64m/autotrade>
- 一言でいうと: **LLM に戦略ファイルを量産・検証・廃棄させる backtest harness**

この repo の本質は README より `src/program.md` によく出ている。  
そこでは LLM に対して:

- 読むべき固定ファイル
- 戦略ファイルの置き場所
- risk / profit の判定基準
- `results.jsonl` への記録形式
- `keep / discard / crash` の状態遷移
- `generated/` と `.trash/strategies/` の分離

をかなり厳密に与えている。

つまりこれは **autonomous trading** というより、**autonomous strategy research harness** である。

### OMTV への示唆

今回の対象の中で、**いちばん直接 OMTV に活かしやすい**。

理由は、OMTV もすでに:

- backtest entrypoint
- strategy preset
- result artifact

を持っており、足りないのは **実験ループの型** だからである。

この repo から採るべきポイントは次の通り。

1. **LLM に読むべきファイルと触ってよい面を明示する**
2. **実験結果を JSON Lines で残す**
3. **discard / keep / crash を明示的に分ける**
4. **良い戦略と悪い戦略のディレクトリを分ける**
5. **risk gate と profit gate を別判定にする**

OMTV なら将来、

- `config/backtest/strategy-presets.json`
- `src/core/research-backtest.js`
- `artifacts/`
- `docs/research/`

を軸に、**preset exploration harness** として落とし込める。

### 採用判断

- **採用するもの**
  - `program.md` 型の experiment contract
  - `results.jsonl` 型の試行ログ
  - keep/discard/crash の明示
  - strategy artifact の整理
- **採用しないもの**
  - 実売買 automation と見なすこと
  - そのまま Python backtester に寄せること

## 4. `hsliuping/TradingAgents-CN`

- URL: <https://github.com/hsliuping/TradingAgents-CN>
- 一言でいうと: **TradingAgents の中国語拡張版というより、中国語学習市場向けに製品化を進めた multi-agent 株分析平台**

README では learning / research 用を掲げつつ、実際にはかなり productized されている。

- FastAPI backend
- Vue 3 frontend
- MongoDB + Redis
- user auth / role management
- cache management
- WebSocket / SSE notifications
- report export
- watchlist / screener / batch analysis
- simulated trading

ただし最大の論点はライセンス。

- root LICENSE は mixed license
- `app/` と `frontend/` は proprietary
- commercial use requires separate authorization

したがって、OMTV に対しては **コード再利用の対象ではない**。

### OMTV への示唆

価値があるのは実装ではなく、次の「機能棚卸し」。

- 学習中心の position を明示すること
- 複数 market / 複数 data source を product UX にどう見せるか
- report export や reasoning progress をどう扱うか
- 中国語圏データ・A股対応の要求がどこで増えるか

### 採用判断

- **採用するもの**
  - learning / research first の位置づけ
  - report export / progress / config UI の発想
  - multi-perspective analysis platform の feature inventory
- **採用しないもの**
  - proprietary 部分の流用
  - この repo を直接 dependency やベース実装とみなすこと

## 5. `vercel-labs` org

- org: <https://github.com/vercel-labs>
- search scope: GitHub search 上で **236 repos** を確認

## `vercel-labs` は公式か

**Vercel の公式 Labs / experimental org と見てよい。**

今回確認できた根拠は次の通り。

1. org 名が `vercel-labs`
2. org ページ上で `agent-skills` が **"Vercel's official collection of agent skills"** と自称している
3. `coding-agent-template`, `openreview`, `bash-tool` など複数 README が Vercel Sandbox / AI Gateway / Workflow など **vercel.com 公式 docs** に直接リンクしている
4. repo 群のテーマが一貫して **Vercel 製 agent / sandbox / workflow / AI SDK 周辺**に寄っている

ただし今回の確認では、GitHub 上の org verification badge までは別途取得していない。  
したがって厳密には **「自己記述・リンク構造・repo 一貫性から公式と判断してよい」** というレベルで記述する。

## org 全体の見取り図

一覧を走査すると、ざっくり 4 群に分かれていた。

1. **agent / sandbox のコア部品**
   - `agent-browser`
   - `agent-skills`
   - `skills`
   - `just-bash`
   - `bash-tool`
   - `opensrc`
   - `portless`
   - `emulate`
2. **agent app / template**
   - `coding-agent-template`
   - `knowledge-agent-template`
   - `community-agent-template`
   - `workflow-builder-template`
   - `deep-research-template`
3. **review / debugging / observability**
   - `openreview`
   - `dev3000`
   - `agent-eval`
4. **大量の workflow examples / course repos / product demos**
   - `workflow-*`
   - `*-starter`
   - `*-skills`
   - BotID / Next.js demo 群

つまり org 全体を見た結論は、**少数の reusable core と、多数の example repo で構成された実験 org** である。

### OMTV に有用な repo

| repo | 何が有用か | OMTV での位置づけ |
|---|---|---|
| `agent-browser` | browser fallback、ref snapshot、stream | 調査 fallback / debug 観測 |
| `agent-skills` | agent 向け instruction bundle の作法 | repo skills 整備の参考 |
| `skills` | skill 配布 / install の標準化 | skills 運用思想の参考 |
| `portless` | stable local URLs | 複数ローカル UI / stream を扱う将来の開発体験改善 |
| `opensrc` | dependency source fetch | 外部 lib 読解を要する調査や code-review 強化 |
| `dev3000` | browser + server + logs + screenshots の時系列観測 | TradingView セッション debug 導線の参考 |
| `openreview` | sandboxed AI code review | 将来の PR / docs review automation の参考 |
| `emulate` | no-network sandbox 用 API emulation | 外部依存を切ったテスト / demo で有用 |
| `coding-agent-template` | sandbox 上で agent 実行するフルアプリ | 別 repo での hosted agent orchestration 参考 |

### 参考止まりの群

- `workflow-*` の大量 example
- course / workshop starter
- Next.js / BotID demo
- platform / content template

これらは再利用ライブラリというより **Vercel 製品の説明用 example** と見るのが自然。

## 6. `mmt.gg`

- URLs: <https://mmt.gg/> / <https://mmt.gg/api>
- 一言でいうと: **暗号資産の orderflow / heatmap / footprint / OI / liquidation を扱う hosted analytics terminal**

今回確認できた事実は次の通り。

- トップページ FAQ で **"The free tier is yours forever - no credit card, no time limit."** と明記
- つまり「最近無料になった」は **free tier がある / 拡充された** という意味なら整合する
- ただし Pro は残っており、**完全無料化ではない**
- API ページでは heatmaps, candles, order flow, open interest, liquidation, WebSocket を 20+ exchanges で提供すると説明
- API FAQ では multi-exchange aggregation は **Pro plan and above** と明記

### OMTV への示唆

MMT は TradingView 代替ではない。  
ただし OMTV の弱いところ、つまり **暗号資産の板・orderflow・heatmap・liquidation** を補う候補としてはかなり強い。

自然な接続案は次の通り。

1. 将来の別 exec-plan で `mmt_*` tools を切る
2. `market_*` と並ぶ crypto-specific external data layer として扱う
3. まず free tier で data quality / latency / rate limit を評価する

### 採用判断

- **採用するもの**
  - crypto orderflow data source 候補としての評価
  - free tier で試せる点
  - REST / WebSocket の両面
- **採用しないもの**
  - TradingView の置換
  - repo 標準依存として即導入すること

## OMTV に持ち込むと有用なもの

## P0: すぐ docs / workflow に活かせる

1. **`autotrade` 型の実験ループ文書**
   - どのファイルを読むか
   - 何を変えてよいか
   - keep / discard / crash をどう記録するか
2. **`ai-hedge-fund` 型の reasoning schema**
   - technical / news / community / macro を analyst slot 化する
   - risk gate を deterministic に置く
3. **`vercel-labs/agent-skills` / `skills` 型の skill 運用思想**
   - repo 固有の調査 skill や review skill を増やすときの参考

## P1: 小規模な将来実装候補

1. **agent-browser 風 fallback browser layer**
   - 認証壁のあるサイト調査専用
2. **results.jsonl 型の backtest experiment log**
   - preset exploration の蓄積
3. **MMT の free tier 評価**
   - `mmt_*` tool 候補の前段

## P2: 別 exec-plan が必要な中長期候補

1. **multi-analyst reasoning layer**
   - OMTV の市場調査メモを構造化する
2. **dev3000 風の runtime observability**
   - TradingView セッションの console / screenshot / stream / status 集約
3. **hosted coding / review sidecar**
   - `coding-agent-template` / `openreview` の別 repo 展開

## Reject: この repo に不向き

1. `TradingAgents-CN` の code import
2. `ai-hedge-fund` を live trading system として扱うこと
3. `autotrade` を execution automation と誤認すること
4. `agent-browser` で TradingView Desktop 主軸を置き換えること
5. `mmt.gg` を TradingView 代替とみなすこと

## 推奨アクション

1. **最優先は `autotrade` 由来の backtest experiment contract を別 exec-plan 候補として切ること**
2. **次点で `ai-hedge-fund` 由来の analyst/risk/synthesis schema を docs レベルで整理すること**
3. **`mmt.gg` は free tier 実測後に別判断。今は research candidate 止まり**
4. **`agent-browser` と `vercel-labs` 群は、repo 本体よりも “周辺開発体験” を改善する材料として見ること**
