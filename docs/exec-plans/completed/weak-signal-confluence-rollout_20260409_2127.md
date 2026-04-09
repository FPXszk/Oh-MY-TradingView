# X記事由来「弱いシグナルの合成」段階実装計画

## 目的

最近参照した X 記事の「単独では弱いシグナルを複数束ねて、より強い trade decision にする」という発想のうち、**この repo に既にある deterministic / schema-first / read-only な面だけで実装できる部分**を優先導入する。

今回の計画は **institutional / multi-agent / live execution system 全体**を持ち込むものではない。まずは既存 `market_*` を強化し、必要なら次段で `x_*` / `reach_*` / `experiment-gating` に広げる。

---

## 現状調査サマリ

### 1. 既存の最重要 extension point
- `src/core/market-intel-analysis.js`
  - 既に `quote` / `fundamentals` / `ta` / `news` を集め、`trend_analyst` / `fundamentals_analyst` / `news_analyst` / `risk_analyst` / `overall_summary` を**決定論的**に返している。
  - 現状の `buildOverallSummary(...)` は stance の個数寄りで、**重み付き合成**へ自然に拡張できる。
- `src/core/market-intel.js`
  - Yahoo Finance ベースの public data 取得と `market_ta_rank` を持っており、**複数銘柄の比較・ランキング面**を追加しやすい。
- `src/core/experiment-gating.js`
  - `promote / hold / reject` の deterministic gate が既にある。将来 `confluence` を研究 promotion の補助指標に使う余地がある。

### 2. `x_*` / `reach_*` / `observability` の位置づけ
- `src/core/twitter-read.js` と `src/core/reach.js` は read-only external observation layer として既に存在する。
- ただし `x_*` / `reach_*` は **認証・外部サービス・可用性の揺れ**を含むため、最初の trade-decision 合成に直接混ぜると不安定になりやすい。
- `src/core/observability.js` は CDP/ページ状態の one-shot 観測であり、今回の非 CDP `market_*` 強化では**実装対象ではなく検証補助**に留めるのが安全。

### 3. docs / session-log 規約
- 実装計画は `docs/exec-plans/active/` に置き、完了後は `docs/exec-plans/completed/` へ移す。
- session log は `docs/working-memory/session-logs/` に append-only で残し、命名は `<slug>_YYYYMMDD_HHMM.md`。
- 外部記事・外部 repo を設計に使ったら `docs/references/design-ref-llms.md` を更新する。

### 4. active exec-plan との overlap / conflict
- 現在の active plan: `docs/exec-plans/active/agent-reach-non-twitter-observability_20260409_2035.md`
- working tree でも `reach` / `twitter-read` / `README.md` / `package.json` などに未コミット変更がある。
- よって今回の初手は、**`src/server.js` / `src/cli/index.js` / `src/core/index.js` / `package.json` への変更を最小化できる `market-intel` 中心**に寄せる。

---

## 優先順位（高価値・低リスク順）

### Priority 1 — 既存 `market_symbol_analysis` に confluence scoring を加える
**最優先 / 今回の本命**

記事の発想に最も素直で、かつ repo 既存構造に最も噛み合う。既存 analyst 出力を再利用し、**複数の弱い signal を 1 つの additive score / breakdown に圧縮**する。

**なぜ最優先か**
- 既存 `market_symbol_analysis` を壊さず additive に拡張できる
- 新しい外部依存が不要
- `x_*` / `reach_*` より deterministic でテストしやすい
- active plan との衝突を最小化しやすい

**今回採る方針**
- 初期の directional 合成対象は `trend` / `fundamentals` / `risk` を中心にする
- `news` は現状 direction を持たないため、初手では **coverage / confidence 補助**までに限定する
- `x_*` / `reach_*` は初手では混ぜない

**想定 public contract（additive）**
- 既存 MCP: `market_symbol_analysis`
- 既存 CLI: `tv market analysis --symbol <TICKER>`
- 返り値へ additive に以下を追加
  - `analysis.overall_summary.confluence_score`（例: 0-100）
  - `analysis.overall_summary.confluence_label`
  - `analysis.overall_summary.confluence_breakdown`
  - `analysis.overall_summary.coverage_summary`

### Priority 2 — 複数銘柄向け confluence ranking を追加する
**次点 / P1 完了後に着手**

単一銘柄分析だけでなく、watchlist 候補の中から**どれが最も signal alignment が強いか**を決められるようにする。

**なぜ 2 番手か**
- 記事の「弱い signal を束ねて優先順位を付ける」を実運用に近い形で使える
- `market_ta_rank` と同じ UX パターンを再利用できる
- ただし P1 の confluence contract が固まってからでないと実装がぶれやすい

**想定 public contract**
- 新規 MCP: `market_confluence_rank`
- 新規 CLI: `tv market confluence-rank AAPL MSFT NVDA [--limit 5]`
- 返り値
  - `ranked_symbols[]`
  - 各銘柄の `confluence_score` / `confluence_label` / 上位 breakdown

### Priority 3 — `experiment-gating` 連携は別段階で additive に行う
**今回 plan に載せるが、初回実装では defer 寄り**

`confluence_score` を backtest/campaign の `promote / hold / reject` に直接混ぜるのではなく、まずは**補助列**として載せる方向が安全。

**なぜ 3 番手か**
- 価値は高いが、`market_*` の現物 signal と `campaign` の backtest signal は時間軸が異なる
- 閾値や意味づけを急ぐと false precision になりやすい
- `experiment-gating` 既存 contract を不用意に揺らしたくない

**想定 public surface**
- 当面は新規 MCP/CLI なし
- もし着手する場合は campaign artifact に additive に `confluence_snapshot` を追加

### Priority 4 — `x_*` / `reach_*` を community/context signal として使うのは後続別 plan
**採用候補だが今回は実装対象外**

**理由**
- 既存 active plan と working tree 競合が大きい
- `twitter-cli` 認証や external fetch の揺れがコア分析に直結すると不安定
- まずは `market_*` 内だけで再現可能な deterministic 合成を固めるべき

**将来の bounded candidate**
- `community_analyst` を optional flag で追加
- 初手は sentiment ではなく `mention_count` / `recency` / `source_presence` などの弱い evidence に限定

---

## 今回の bounded scope

この exec-plan で実装対象にするのは **Priority 1 + Priority 2** までとする。

### In scope
1. `market_symbol_analysis` の additive confluence scoring
2. `market_confluence_rank` / `tv market confluence-rank` の追加
3. 最低限の docs 更新
4. 実装完了時の session log 作成
5. plan の `completed/` への移動、commit、push

### Out of scope
- LLM / multi-agent / debate / portfolio manager の導入
- auto trading / order execution
- `x_*` / `reach_*` を初回 confluence に直結すること
- `experiment-gating` の判定ロジック変更
- observability の機能追加
- 新 market data provider の追加
- browser fallback / dashboard / daemon 化

---

## Exact files to create / modify / delete

### Create
- `src/core/market-confluence.js`
  - confluence 用の pure scoring / weighting / breakdown helper
- `tests/market-confluence.test.js`
  - pure scoring の unit test
- `docs/working-memory/session-logs/weak-signal-confluence-rollout_20260409_2127.md`
  - 実装完了時の session summary

### Modify
- `src/core/market-intel-analysis.js`
  - `overall_summary` を stance-count から confluence helper 利用へ拡張
  - additive fields を返す
- `src/core/market-intel.js`
  - 複数銘柄 confluence ranking orchestration を追加
- `src/tools/market-intel.js`
  - `market_confluence_rank` を追加
- `src/cli/commands/market-intel.js`
  - `confluence-rank` subcommand を追加
- `tests/market-intel-analysis.test.js`
  - additive fields / degraded input / deterministic score tests を追加
- `tests/market-intel.test.js`
  - confluence rank の orchestration / wiring を追加
- `package.json`
  - `tests/market-confluence.test.js` を既存 test script 群へ追加
- `README.md`
  - 新しい additive response と `confluence-rank` を追記
- `docs/references/design-ref-llms.md`
  - 今回の X 記事の採用点 / 非採用点を記録
- `docs/DOCUMENTATION_SYSTEM.md`
  - 新 session log の導線を追加（必要最小限）

### Delete
- なし

---

## 設計方針

### 1. “強い 1 シグナル” ではなく “弱い複数シグナルの整列度” を返す
- confluence は単独予測器にしない
- 各 analyst の stance / confidence / warnings を保持したまま、**上に重ねる additive layer** にする

### 2. false precision を避ける
- score は coarse でよい（例: 0-100）
- 小数点や過剰な重み最適化を避ける
- 初期 weight は docs に明記できる固定値に限定する

### 3. news / social は初手で direction に使わない
- `news_analyst` は現状 `active / quiet` 中心なので、まずは coverage/confidence 補助
- `x_*` / `reach_*` は別段階

### 4. 既存 contract は additive のみ
- 既存 top-level keys は維持
- `analysis.trend_analyst` などの既存 section を壊さない
- `overall_summary` は既存の `stance` / `confidence` / `signals` / `warnings` を維持したまま拡張する

---

## expected MCP / CLI surface

### Phase 1（既存 surface の additive 拡張）
- MCP: `market_symbol_analysis`
- CLI: `tv market analysis --symbol AAPL`
- 追加レスポンス例
  - `analysis.overall_summary.confluence_score`
  - `analysis.overall_summary.confluence_label`
  - `analysis.overall_summary.confluence_breakdown.trend`
  - `analysis.overall_summary.confluence_breakdown.fundamentals`
  - `analysis.overall_summary.confluence_breakdown.risk`
  - `analysis.overall_summary.coverage_summary`

### Phase 2（新規 surface）
- MCP: `market_confluence_rank`
- CLI: `tv market confluence-rank AAPL MSFT NVDA [--limit 5]`
- 返り値例
  - `success`
  - `count`
  - `ranked_symbols[]`
    - `symbol`
    - `confluence_score`
    - `confluence_label`
    - `rank`
    - `top_factors`
    - `warnings`

### Deferred surfaces（今回は追加しない）
- `market_symbol_analysis --include-community`
- `market_community_analysis`
- `campaign` / `experiment-gating` artifact への `confluence_snapshot`

---

## TDD 方針（RED → GREEN → REFACTOR）

### Phase 1 — confluence scoring
#### RED
- `tests/market-confluence.test.js`
  - weight 付き合成が deterministic に 0-100 score を返すこと
  - trend/fundamentals/risk の衝突時に score が中立側へ寄ること
  - data 欠損時に `coverage_summary` と warning が出ること
  - news が direction ではなく confidence/coverage にしか影響しないこと
- `tests/market-intel-analysis.test.js`
  - `overall_summary` に additive fields が追加されること
  - bullish / mixed / bearish 相当の controlled inputs で `confluence_label` が安定すること
  - upstream 一部欠損でも schema が壊れないこと

#### GREEN
- `src/core/market-confluence.js` に pure helper を実装
- `src/core/market-intel-analysis.js` から helper を呼び、既存 summary を additive 拡張

#### REFACTOR
- weight table / label mapping / coverage handling を小さな pure helper に分離
- `buildOverallSummary(...)` から scoring detail を切り離し、既存 analyst 生成と密結合にしない

### Phase 2 — confluence ranking
#### RED
- `tests/market-intel.test.js`
  - 複数銘柄の confluence ranking が score 降順で安定すること
  - tie 時の deterministic tie-break があること
  - 一部銘柄だけ失敗しても全体レスポンスが部分成功になること
- `tests/market-confluence.test.js`
  - label / score を ranking 用に再利用できる shape で返すこと

#### GREEN
- `src/core/market-intel.js` に ranking orchestration を追加
- `src/tools/market-intel.js` に `market_confluence_rank` を追加
- `src/cli/commands/market-intel.js` に `confluence-rank` を追加

#### REFACTOR
- single-symbol analysis と multi-symbol ranking の formatting を分離
- score reuse helper と transport formatting を混ぜない

### docs / session-log
- 実装完了後に `README.md` / `docs/references/design-ref-llms.md` / `docs/DOCUMENTATION_SYSTEM.md` を最小更新
- `docs/working-memory/session-logs/weak-signal-confluence-rollout_20260409_2127.md` を追加

---

## validation commands

### Baseline
- `npm test`

### Phase 1 focused
- `node --test tests/market-confluence.test.js tests/market-intel-analysis.test.js`
- `npm run tv -- market analysis --symbol AAPL`

### Phase 2 focused
- `node --test tests/market-confluence.test.js tests/market-intel.test.js tests/market-intel-analysis.test.js`
- `npm run tv -- market confluence-rank AAPL MSFT NVDA --limit 3`

### Final regression
- `npm test`
- `git --no-pager diff --check`
- `git --no-pager status --short`

### Optional manual checks（deferred phase の前提確認）
- `npm run tv -- x status`
- `npm run tv -- reach status`

---

## リスク

1. **重みの恣意性**
   - 見た目だけ精密な score になる恐れ
   - 対策: 初期 weight は少数・固定・docs 明記

2. **既存 contract の drift**
   - `market_symbol_analysis` 利用側が壊れる恐れ
   - 対策: additive only。既存 key/意味は維持

3. **データ欠損時の誤解**
   - score が出ても coverage が薄い可能性
   - 対策: `coverage_summary` と warning を必須化

4. **多銘柄 ranking の API コスト / 遅延**
   - 銘柄数が増えると Yahoo fetch 数が増える
   - 対策: symbol 上限を明示し、必要なら `market_ta_rank` と同程度に制限

5. **active plan / working tree 競合**
   - `README.md` と `package.json` は競合しやすい
   - 対策: 初手で `reach_*` / `x_*` には踏み込まない。docs 変更は最後にまとめる

6. **community signal の premature integration**
   - X / Reddit / Web を早く混ぜすぎるとノイズが増える
   - 対策: 今回は defer。別 exec-plan で bounded に扱う

---

## 実装ステップ（checkbox breakdown）

- [ ] active plan `agent-reach-non-twitter-observability_20260409_2035.md` と working tree 競合を確認し、今回の変更を `market-intel` 中心に限定する
- [ ] confluence contract（score / label / breakdown / coverage_summary）の最終 shape を確定する
- [ ] **RED:** `tests/market-confluence.test.js` を追加し、重み付き合成・欠損・衝突・label 変換の失敗テストを書く
- [ ] **RED:** `tests/market-intel-analysis.test.js` に additive fields と degraded input の失敗テストを追加する
- [ ] **GREEN:** `src/core/market-confluence.js` を作成し、pure scoring helper を実装する
- [ ] **GREEN:** `src/core/market-intel-analysis.js` を更新し、`market_symbol_analysis` の `overall_summary` へ confluence fields を追加する
- [ ] `npm run tv -- market analysis --symbol AAPL` で additive response を手動確認する
- [ ] **RED:** `tests/market-intel.test.js` に confluence ranking の失敗テストを追加する
- [ ] **GREEN:** `src/core/market-intel.js` に multi-symbol confluence ranking を追加する
- [ ] **GREEN:** `src/tools/market-intel.js` に `market_confluence_rank` を追加する
- [ ] **GREEN:** `src/cli/commands/market-intel.js` に `confluence-rank` subcommand を追加する
- [ ] `npm run tv -- market confluence-rank AAPL MSFT NVDA --limit 3` で ranking を確認する
- [ ] `README.md` に additive response と CLI/MCP の使い方を追記する
- [ ] `docs/references/design-ref-llms.md` に今回の X 記事の採用点・非採用点を追記する
- [ ] 実装完了の session log を `docs/working-memory/session-logs/weak-signal-confluence-rollout_20260409_2127.md` に残す
- [ ] `docs/DOCUMENTATION_SYSTEM.md` に必要最小限の導線を追加する
- [ ] `npm test` と `git --no-pager diff --check` を通して REFACTOR を完了する
- [ ] plan を `docs/exec-plans/completed/` へ移し、Conventional Commit で commit し、push する

---

## この計画で採る / 採らない判断

### 採る
- 既存 analyst signal を壊さずに confluence layer を上乗せする
- 重み付き合成は deterministic / inspectable / docs 記述可能に保つ
- まずは `market_*` だけで完結する構成を優先する

### 今回は採らない
- LLM に最終判断させること
- `x_*` / `reach_*` をいきなり direction score に混ぜること
- `experiment-gating` の閾値や decision を初回から confluence で書き換えること
- 観測 layer や browser layer を拡張すること

---

## 推奨 plan filename
- `docs/exec-plans/active/weak-signal-confluence-rollout_20260409_2127.md`

## Approval Gate
この plan の承認後にのみ実装を開始する。
