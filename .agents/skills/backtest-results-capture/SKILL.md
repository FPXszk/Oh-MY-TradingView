---
name: backtest-results-capture
description: Night Batch Self Hosted の GHA 実行結果を docs/research/ にまとめるワークフロー。GHA run 特定→artifact DL→composite_score 計算→TEMPLATE.md 形式で作成→manifest 更新→push。
tags:
  - backtest
  - research
  - capture
  - night-batch
---

# backtest-results-capture — Night Batch 結果まとめ Runbook

このスキルは、`Night Batch Self Hosted` GitHub Actions ワークフローの実行結果を `docs/research/` にまとめるための手順書である。

## When to Use

ユーザーが以下のような依頼をしたとき：
- 「Night Batch Self Hosted #XX の結果をまとめて」
- 「最新のバックテスト結果を前回の結果をまとめて」
- 「run XX の結果を research に追加して」

---

## Runbook

### Step 1: 対象 GHA run の特定

**ユーザーが run 番号を明示している場合**（例：`#88`）:
```
github-mcp-server-actions_list
  method: list_workflow_runs
  owner: FPXszk
  repo: Oh-MY-TradingView
  resource_id: night-batch-self-hosted.yml
```
返ってきた runs から `run_number == 88` の `id`（= run_id）を取得する。

**ユーザーが「最新」と言っている場合**:
上記で `status: completed` の最新 run を使う。

### Step 2: アーティファクト ID の取得

```
github-mcp-server-actions_list
  method: list_workflow_run_artifacts
  owner: FPXszk
  repo: Oh-MY-TradingView
  resource_id: {run_id}
```

アーティファクト名 `night-batch-results`（または類似名）の `id` を取得する。

### Step 3: アーティファクトのダウンロード

```bash
gh api repos/FPXszk/Oh-MY-TradingView/actions/artifacts/{artifact_id}/zip \
  --header "Accept: application/vnd.github+json" \
  > /tmp/artifact-{run_number}.zip
unzip -o /tmp/artifact-{run_number}.zip -d /tmp/artifact-{run_number}/
```

**注意**: ダウンロードは 30〜90 秒かかる場合がある（数十 MB）。

### Step 4: データ読み取り

展開後に以下の 2 ファイルを読む：

**`strategy-ranking.json`** — PF 降順の公式ランキング
```json
{
  "campaign_id": "emr-next-50pack-us40",
  "rows": [
    {
      "rank": 1,
      "presetId": "emr-next-vol20x20",
      "avg_net_profit": ...,
      "avg_profit_factor": ...,
      "avg_max_drawdown": ...,
      "avg_percent_profitable": ...
    }
  ]
}
```

**`recovered-results.json`** — 全 symbol × strategy の個別結果
```json
[
  {
    "presetId": "emr-next-vol20x20",
    "symbol": "NVDA",
    "result": {
      "metrics": {
        "net_profit": ...,
        "profit_factor": ...,
        "max_drawdown": ...,
        "closed_trades": ...,
        "percent_profitable": ...
      }
    }
  }
]
```
**注意**: `result.metrics` がキー（`result.stats` ではない）。

### Step 5: Composite Score の計算

`strategy-ranking.json` の rows を使い、以下の合成スコアを計算する。

```
composite_score = rank(net_profit, desc) + rank(profit_factor, desc) + rank(max_drawdown, asc)
```
- **小さいほど優秀**（全指標で 1 位 = スコア 3）
- `strategy-ranking.json` の `rank` フィールドは PF 降順ランクのみ。composite_score とは別物。

### Step 6: Per-symbol Breakdown（rank-1 戦略）

`recovered-results.json` から composite rank-1 戦略のエントリを抽出し、symbol 別に net_profit 降順で並べる。
上位 5〜10 銘柄と下位 5 銘柄を確認し、集中リスク（MSTR・NVDA 等への偏り）を計算する。

**集中度の目安**: 上位 3 銘柄の net_profit 合計 ÷ 全体合計 ≥ 50% → 要注意

### Step 7: 出力ファイルの作成

ファイル名規則: `night-batch-self-hosted-run{N}_{YYYYMMDD}.md`
出力先: `docs/research/`

`docs/research/TEMPLATE.md` の構造に従って記述する。

**主要セクション（TEMPLATE.md 参照）**:
1. 実行概要（run 番号、campaign_id、実行日時、成功率）
2. Composite Score ランキング（全戦略の表）
3. PF ランキング（strategy-ranking.json の公式順序）
4. Rank-1 戦略の per-symbol breakdown
5. 上位 4 戦略の集中度チェック
6. 除外候補（max_drawdown が極端に大きい等）
7. 結論・次のアクション

### Step 8: manifest.json の更新

`docs/research/manifest.json` の `keep` 配列に新ファイル名を追加する。

```json
{
  "keep": [
    "artifacts-backtest-scoreboards.md",
    "...(既存エントリ)...",
    "night-batch-self-hosted-run{N}_{YYYYMMDD}.md"
  ]
}
```

**重要**: manifest に追加しないと `archive-stale-latest.mjs` が次回 Night Batch 実行時にアーカイブする。

### Step 9: コミット & プッシュ

```bash
git add docs/research/night-batch-self-hosted-run{N}_{YYYYMMDD}.md docs/research/manifest.json
git commit -m "docs: add run{N} backtest results summary ({campaign_id})

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
git push origin main
```

---

## Anti-Patterns

| Anti-Pattern | 正しいアプローチ |
|---|---|
| PF ランクだけで「最優秀戦略」を判断する | composite_score（net_profit + PF + DD の合算）で評価する |
| `result.stats` キーでメトリクスを読む | `result.metrics` が正しいキー |
| manifest.json を更新せずにファイルを追加する | Step 8 で必ず同時に更新する |
| win_rate が低いことを自動で除外候補にする | このキャンペーン戦略群は構造的に win_rate < 35% が正常。除外根拠にしない |
| artifact の `rank` フィールドを composite_score と混同する | `rank` は PF 降順のみ。composite_score は別途計算が必要 |
| 集中リスクを確認せずに結論を書く | 必ず上位 4 戦略の symbol 別集中度（特に MSTR・NVDA）を確認する |
