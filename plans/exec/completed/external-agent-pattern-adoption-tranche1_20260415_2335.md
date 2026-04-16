# Exec Plan: external-agent-pattern-adoption-tranche1_20260415_2335

## 1. 問題設定と採用方針

今回の依頼は、以下 3 つの外部リポジトリを詳細調査し、Oh-MY-TradingView に安全に持ち込める要素があれば限定的に適用する計画を作ること。

- `NousResearch/hermes-agent`
- `rtk-ai/rtk`
- `garrytan/gbrain`

調査の結果、3 つとも有用な要素はあるが、**そのまま移植する対象ではない**ことが分かった。  
first tranche では、現行 repo の CLI / MCP / docs / skills の構造を崩さず、次の 3 系統に限定して導入する。

1. **比較調査資産の固定化**  
   - 外部比較結果を `docs/research/latest/` と reference ledger に残す
2. **TradingView-specific skill / runbook pack**  
   - GBrain/Hermes の「thin harness + fat skills」を repo 運用へ適用する
3. **noisy output 向け deterministic compaction**  
   - RTK の出力圧縮思想を、`market_*` / `reach_*` / `x_*` / `observe` の高ノイズ面に限定導入する

**明示的に見送るもの**

- Hermes 的な汎用 agent platform / gateway / cron / self-improvement loop
- RTK 的な shell hook rewrite / proxy を本 repo の主機能にすること
- GBrain 的な personal brain / DB backend 全面移植 / 常時 write-back
- Node 20 + 最小依存の現行方針を壊す基盤移行

---

## 2. 外部 repo ごとの採用 / 不採用整理

| Repo | 採用する考え方 | 今回は採用しないもの |
|---|---|---|
| `hermes-agent` | registry/toolset 分離、skills、SQLite+FTS5 state の設計観点、bounded observability / guardrail | 汎用 agent loop、multi-channel gateway、plugin 全面開放 |
| `rtk` | deterministic output compaction、verbose/raw escape hatch、tee-and-hint、tracking の考え方 | shell hook rewrite、settings patch、telemetry 運用 |
| `gbrain` | thin harness + fat skills、resolver 的な skill grouping、recipe-runbook、conformance test、compiled-truth/timeline 発想 | personal brain、Bun/PGLite/Postgres 依存、常時 sync/autopilot |

---

## 3. In Scope / Out of Scope

### In Scope

- 外部 3 repo の比較調査 doc を `docs/research/latest/` に追加する
- `docs/references/design-ref-llms.md` に参照台帳を追記する
- `.agents/skills/` 配下に TradingView 向け skill / runbook を追加する
- skill の frontmatter / 必須 section を検証する conformance test を追加する
- `market_*` / `reach_*` / `x_*` / `observe` の出力を、JSON 契約を壊さない形で compact 化する
- compact / raw の escape hatch を CLI / MCP 両面で設計する
- 実装の結果、CLI/MCP 間の drift が大きいと確認できた場合に限り、shared manifest / registry groundwork を検討する

### Out of Scope

- Pine / backtest / CDP コアロジックの全面改修
- 新規 DB / queue / daemon / scheduler 導入
- X API 必須の新機能
- project-wide plugin system の新設
- CLI 全体を rewrite proxy に作り変えること
- agent memory / personal profile / user identity template の導入

---

## 4. 変更対象ファイル

### 作成

- `docs/exec-plans/active/external-agent-pattern-adoption-tranche1_20260415_2335.md`
- `docs/research/latest/external-agent-pattern-comparison.md`
- `.agents/skills/tradingview-operator-playbook/SKILL.md`
- `.agents/skills/tradingview-research-capture/SKILL.md`
- `tests/agent-skills-conformance.test.js`
- `src/core/output-compaction.js`
- `tests/output-compaction.test.js`
- `tests/router-output.test.js`

### 更新

- `docs/research/latest/README.md`
- `docs/research/latest/manifest.json`
- `docs/references/design-ref-llms.md`
- `docs/DOCUMENTATION_SYSTEM.md`（新規 latest doc / skills の導線が必要な場合）
- `README.md`（新しい skill / output mode の入口が必要な場合）
- `src/cli/router.js`
- `src/tools/_format.js`
- `src/cli/commands/market-intel.js`
- `src/cli/commands/reach.js`
- `src/cli/commands/twitter-read.js`
- `src/cli/commands/observe.js`
- `src/tools/market-intel.js`
- `src/tools/reach.js`
- `src/tools/twitter-read.js`
- `src/tools/observe.js`

### 条件付きで作成 / 更新

- `src/surfaces/manifest.js`
- `tests/surface-manifest.test.js`
- `src/server.js`
- `src/cli/index.js`

### 削除

- 原則なし

---

## 5. active exec-plan との衝突有無

### 判定

**衝突なし。**

### 根拠

- `docs/exec-plans/active/` を確認した結果、既存 active plan は存在しなかった
- よって本 plan は単独で review 可能

---

## 6. 実装アプローチ

### A. 調査結果を durable asset に固定する

最初に比較結果を `docs/research/latest/external-agent-pattern-comparison.md` に残し、以下を明記する。

- repo ごとの実態
- 何を採用するか
- 何を採用しないか
- なぜそう判断したか
- Oh-MY-TradingView のどこに接続するか

同時に `docs/references/design-ref-llms.md` へ 3 repo を追記し、参照の理由と採否を ledger 化する。  
この tranche では、**外部比較の結果をまず先に固定してから実装へ進む**。

### B. TradingView-specific skill / runbook pack

GBrain/Hermes から取り込む中心は runtime ではなく **workflow の表現方法**である。  
この repo には既に `.agents/skills` があり、ここに TradingView 運用向けの playbook を追加する。

候補は以下。

- `tradingview-operator-playbook`
  - `market_*` / `reach_*` / `workspace_*` / `observe` の使い分け
  - chart / market / X / docs の decision tree
  - anti-pattern 明記
- `tradingview-research-capture`
  - 外部調査時の docs / references / latest manifest 更新手順
  - research-to-docs の固定化

方針:

- intelligence を runtime に増やすのではなく、**skill markdown に寄せる**
- 既存 tool 名を明示し、抽象論だけの skill にしない
- frontmatter + required sections を conformance test で固定する

### C. noisy output 向け compaction

RTK から取り込む中心は shell rewrite ではなく **deterministic shaping** である。  
現状の `tv` CLI は `src/cli/router.js` で JSON をそのまま整形して返すため、ノイズが多い surface に限って compact summary を加える。

対象は first tranche では以下に限定する。

- `market analysis`
- `market confluence-rank`
- `reach web/rss/reddit/youtube`
- `x_*`
- `observe snapshot`

方針:

- **既存 JSON schema を壊さない**
- compact 時は `summary` / `highlights` / `raw_hint` のような加算フィールドで返す
- raw 完全版が必要な場合の escape hatch を用意する
- LLM 要約ではなく deterministic rule で compact する

### D. shared manifest / registry groundwork は optional

Hermes/GBrain の registry 発想は有用だが、現状は `src/server.js` と `src/cli/commands/*` の二面を直接壊すほどではない。  
したがって first tranche では **manifest 化を必須にしない**。

ただし、B/C 実装後に以下が確認できた場合は条件付きで実施する。

- description / parameter / output policy の重複修正が複数回発生する
- CLI/MCP parity を test で維持できない
- compact / raw policy の定義箇所が二重化する

その場合のみ、最小 manifest を追加し、全面書き換えではなく **drift 防止用の薄い共通層**として導入する。

---

## 7. RED → GREEN → REFACTOR を含むテスト戦略

### RED

#### 調査 docs

- `tests/archive-latest-policy.test.js`
- `tests/repo-layout.test.js`

必要なら最新導線・manifest keep-set の契約に対する失敗テストを追加する。

#### skills

新規 `tests/agent-skills-conformance.test.js`

- skill directory が存在する
- `SKILL.md` に frontmatter がある
- `name` / `description` がある
- required section（When to Use / Anti-Patterns 相当）が欠けると落ちる

#### output compaction

新規 `tests/output-compaction.test.js`

- compact 入力から deterministic な summary が生成される
- raw 完全版が残る or `raw_hint` が返る
- 情報欠落時の fallback が明示される

新規 `tests/router-output.test.js`

- compact / raw の出力モードが router で壊れない
- JSON 文字列化の契約が維持される

#### 既存拡張

- `tests/market-intel.test.js`
- `tests/reach.test.js`
- `tests/twitter-read.test.js`
- `tests/observability.test.js`

compact summary が selected surfaces にだけ乗り、既存契約を壊していないことを先に固定する。

### GREEN

- comparison doc / latest README / manifest / ledger を追加更新する
- skill 2 本と conformance test を最小実装で通す
- `src/core/output-compaction.js` を追加し、selected surfaces のみに接続する
- router / formatter に compact/raw policy を最小限追加する

### REFACTOR

- summary 生成の field selection と threshold を共通化する
- skill の共通 rule を整理し、重複表現を減らす
- 条件付き manifest が必要なら parity test 先行で小さく導入する

### coverage 方針

repo には coverage 専用 script が見当たらないため、今回追加する pure helper と command surface に対してテストを厚くし、  
**今回触る経路で 80% 以上相当の touched-path coverage** を目指す。

---

## 8. 検証コマンド

- `node --test tests/archive-latest-policy.test.js tests/repo-layout.test.js`
- `node --test tests/agent-skills-conformance.test.js`
- `node --test tests/output-compaction.test.js tests/router-output.test.js`
- `node --test tests/market-intel.test.js tests/reach.test.js tests/twitter-read.test.js tests/observability.test.js`
- `npm test`

今回の first tranche では CDP 実動作を変えないため、`test:e2e` は原則不要。  
もし observability や command surface の変更が E2E 契約へ波及した場合のみ別途追加判断する。

---

## 9. リスク / 注意点

- **docs latest の運用崩れ**  
  → `README.md` / `manifest.json` / layout policy を同時に更新する
- **skill が抽象的すぎて実運用で使われない**  
  → 既存 command/tool 名を必ず埋め込み、decision tree 化する
- **compact 化で JSON 契約を壊す**  
  → default schema 維持、summary は加算、raw escape hatch を必須化する
- **CLI/MCP の drift**  
  → manifest は急がず、必要なら parity test 先行
- **外部 repo の過剰模倣**  
  → adopt-now を docs / skills / compaction に限定し、platform 化をしない

---

## 10. 完了条件

- `docs/research/latest/` に比較調査 doc があり、latest 導線から辿れる
- `docs/references/design-ref-llms.md` に 3 repo の採否判断が追記されている
- TradingView-specific skill / runbook pack が追加されている
- skill conformance test が通る
- selected noisy surfaces で compact/raw の挙動がテストで固定されている
- `npm test` が通る
- shared manifest は必要性が実証された場合にのみ追加されている

---

## 11. 実施順の最終提案

1. **比較調査 docs**
2. **skill / runbook pack**
3. **output compaction**
4. **必要なら manifest**

この順で進めることで、まず研究結果を固定し、その上で repo 文化に馴染む小さな導入を行い、最後に重複削減の必要性を判断できる。  
結果として、**有用な要素だけを薄く取り込み、汎用 agent platform への逸脱を避ける**構成にできる。
