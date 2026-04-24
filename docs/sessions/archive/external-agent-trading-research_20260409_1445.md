# external-agent-trading-research_20260409_1445

## セッションの目的

- 指定された外部 repo / service を deep research し、それぞれが何かを説明する
- Oh-MY-TradingView に適用できる有用要素を整理する
- durable research doc / reference ledger / session log を残す

## 調査対象

1. `vercel-labs/agent-browser`
2. `virattt/ai-hedge-fund`
3. `rv64m/autotrade`
4. `hsliuping/TradingAgents-CN`
5. `vercel-labs` org
6. `mmt.gg`

## 比較軸

- 何をする project / service か
- 実験用か、運用向けか、学習向けか
- OMTV の CDP 主軸を置き換えるか、補完するか
- non-CDP market-intel layer に効くか
- docs / workflow に知見として残す価値があるか
- 導入コスト / ライセンス / SaaS 依存リスク

## 主要所見

- `agent-browser` は browser fallback と runtime observability の発想が有用。TradingView CDP 本線の代替ではない。
- `ai-hedge-fund` は execution より analyst → risk → portfolio manager の reasoning contract が有用。
- `autotrade` は今回対象の中でいちばん OMTV に近く、LLM に backtest 実験ループを回させる harness として優秀。
- `TradingAgents-CN` は productized learning platform。mixed license なので code reuse は不向き。
- `vercel-labs` は reusable core と大量 example repo に分かれる。高シグナルなのは `agent-browser`, `agent-skills`, `skills`, `portless`, `opensrc`, `dev3000`, `openreview`, `emulate`, `coding-agent-template`。
- `mmt.gg` は free tier forever を明記する crypto analytics SaaS。TradingView 代替ではなく crypto orderflow data source 候補。

## 採用 / 保留 / 不採用

### 採用

- `autotrade` の experiment loop 発想
- `ai-hedge-fund` の reasoning schema
- `vercel-labs` の skills / observability / sandbox 周辺発想

### 保留

- `agent-browser` を使った fallback browser layer
- `mmt.gg` を使った `mmt_*` data source

### 不採用

- `TradingAgents-CN` の code import
- `ai-hedge-fund` / `autotrade` を live trading engine として見ること
- `agent-browser` による本線置換

## 次アクション候補

1. `autotrade` 由来の backtest experiment harness を別 exec-plan 候補にする
2. `ai-hedge-fund` 由来の analyst/risk/synthesis schema を docs に追加する案を検討する
3. `mmt.gg` は free tier で実測してから別判断にする
4. `agent-browser` / `dev3000` 的な観測 layer は TradingView debug UX 改善の別計画に分離する
