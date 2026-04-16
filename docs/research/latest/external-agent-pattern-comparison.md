# 外部 Agent パターン比較調査

作成日: 2026-04-15

## 概要

外部 3 リポジトリの設計パターンを調査し、Oh-MY-TradingView への限定的な適用可否を判断した。
本ドキュメントは調査結果の永続化資産であり、実装判断の根拠を記録する。

---

## 調査対象

| Repo | 主な特徴 | ライセンス |
|---|---|---|
| `NousResearch/hermes-agent` | 汎用 Agent Platform — registry/toolset 分離、skills、SQLite+FTS5 state、bounded observability | MIT |
| `rtk-ai/rtk` | CLI 出力管理 — deterministic output compaction、compact mode、tee-and-hint | MIT |
| `garrytan/gbrain` | Personal Brain — thin harness + fat skills、resolver grouping、recipe-runbook、conformance test | MIT |

---

## 採用 / 不採用の判断

### hermes-agent

| 観点 | 判断 | 理由 |
|---|---|---|
| registry/toolset 分離 | **採用（概念のみ）** | CLI と MCP の tool 定義を分離管理する発想は有用。ただし現行の `src/tools/` と `src/cli/commands/` の構造で十分対応可能 |
| skills | **採用** | `.agents/skills/` に TradingView 運用向けの skill を追加する形で活用 |
| SQLite+FTS5 state | **採用（設計観点のみ）** | campaign state の設計参考として。現行では JSON ファイルベースで十分 |
| bounded observability / guardrail | **採用** | observe snapshot の出力整形と、tool 呼び出しの安全な境界設計の参考として |
| 汎用 agent loop | **不採用** | 本 repo は MCP server + CLI であり、汎用 agent platform になる必要がない |
| multi-channel gateway | **不採用** | TradingView Desktop + CDP が本線であり、gateway 抽象化は過剰 |
| plugin 全面開放 | **不採用** | tool 追加は手動で管理し、安全性を確保する |

### rtk

| 観点 | 判断 | 理由 |
|---|---|---|
| deterministic output compaction | **採用** | `market_*` / `reach_*` / `x_*` / `observe` の高ノイズ出力を rule-based で圧縮する |
| compact mode | **採用** | selected surface に対して opt-in の compact mode を追加し、full result は通常出力として維持する |
| tee-and-hint | **採用** | compact=true 時に raw JSON を deterministic path (`.output-artifacts/raw/`) へ保存し、compact response に `artifact_path` と `full_output_hint` を加算で返す。compact=false は一切書かない |
| deterministic summarizer profiles | **採用（部分）** | `src/core/output-summary-profiles.js` で surface → profile の宣言的マップを定義。LLM 要約や汎用 DSL にはしない |
| tracking | **採用（概念のみ）** | campaign / experiment-gating の tracking に既に類似構造がある |
| shell hook rewrite | **不採用** | CLI の出力整形は router 内で完結させる。shell hook は運用負荷が大きすぎる |
| settings patch | **不採用** | 設定変更は手動管理で十分 |
| telemetry 運用 | **不採用** | 個人利用の CLI ツールにテレメトリは不要 |

### gbrain

| 観点 | 判断 | 理由 |
|---|---|---|
| thin harness + fat skills | **採用** | intelligence を runtime ではなく skill markdown に寄せる。`.agents/skills/` に playbook を追加 |
| resolver 的な skill grouping | **採用（概念のみ）** | skill を用途別にグルーピングし、decision tree を明確にする |
| recipe-runbook style | **採用** | 手順書形式で skill を記述し、実運用に直結させる |
| conformance test | **採用** | skill の frontmatter / 必須 section を test で固定する |
| compiled-truth / timeline | **採用（概念のみ）** | research docs を固定化し、latest → archive の lifecycle で管理する（既存運用と一致） |
| personal brain | **不採用** | 本 repo は trading tool であり、汎用 knowledge base ではない |
| Bun/PGLite/Postgres 依存 | **不採用** | Node 20 + 最小依存の方針を維持 |
| 常時 sync/autopilot | **不採用** | バッチ処理と手動トリガーが本線 |

---

## Oh-MY-TradingView への接続点

### 1. skill / runbook pack

- 場所: `.agents/skills/tradingview-operator-playbook/` と `.agents/skills/tradingview-research-capture/`
- 内容: TradingView 操作の decision tree と、research-to-docs の手順書
- 検証: `tests/agent-skills-conformance.test.js` で frontmatter / 必須 section を固定

### 2. deterministic output compaction

- 場所: `src/core/output-compaction.js`
- 対象: `market analysis` / `market confluence-rank` / `reach web/rss/reddit/youtube` / `x_*` / `observe snapshot`
- 方針: full result に `_compact` を付ける helper をベースにしつつ、selected CLI/MCP surface の `compact` / `--compact` 指定時は縮約済み top-level payload を返す
- escape hatch: compact payload には `raw_hint` を含め、非 compact 実行で完全版を取得できるようにする

### 2a. raw-output artifact + full output hint (tee-and-hint の具体化)

- 場所: `src/core/output-artifacts.js`
- compact=true のときのみ raw JSON を repo 配下の `.output-artifacts/raw/{surface}/{preview}--{hash}.json` に保存
- compact payload に `artifact_path` と `full_output_hint` を加算的に追加（既存 `raw_hint` は維持）
- path traversal / null byte ガード付き。compact=false では一切書き込まない
- observe の既存 `bundle_dir` / `artifacts` とは独立で共存

### 2b. deterministic summarizer profiles

- 場所: `src/core/output-summary-profiles.js`
- surface → profile (type / label / description + compact 関数) の plain object マップを持ち、compact runtime の source of truth とする
- 全 compaction surface に 1:1 対応するプロファイルを定義
- DSL や LLM 要約は導入しない

### 3. bounded observability

- 既存の `observe snapshot` に compact mode を追加
- runtime error / warning の件数サマリーを提供

---

## 明示的に見送った大規模パターン

以下は調査の結果、有用性は認めるが Oh-MY-TradingView の現行規模・用途では過剰と判断したもの。

1. **汎用 Agent Platform 化** — Hermes 的な multi-tool orchestrator / cron / self-improvement loop
2. **Shell Hook Rewrite** — RTK 的な shell proxy による全コマンド出力管理
3. **Personal Brain / DB Backend** — GBrain 的な Bun + PGLite による常時書き込み knowledge base
4. **Plugin System 全面開放** — 動的な tool 登録・発見・依存解決

これらは repo が成長し、複数人運用やプラットフォーム化が必要になった場合に再検討する。
