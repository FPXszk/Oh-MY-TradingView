---
name: backtest-results-capture
description: Night Batch Self Hosted の GHA 実行結果を docs/research/ にまとめるワークフロー。GHA run 特定→artifact DL→TEMPLATE.md 準拠で集計→manifest 更新→push。
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

### Step 5: TEMPLATE.md に必要な集計値を揃える

`docs/research/TEMPLATE.md` を開き、今回のテンプレートで要求されている表・比較列・記入指示を先に確認する。

- baseline / control 戦略がある場合は、その `presetId` を特定する。
- `strategy-ranking.json` から template の集計表に必要な `avg_net_profit / avg_profit_factor / avg_max_drawdown / avg_percent_profitable / run_count / success_count` を取得する。
- `recovered-results.json` から baseline / control 戦略の symbol 別 `result.metrics` を抜き、template の Baseline 結果セクションを埋められる状態にする。

### Step 6: TEMPLATE.md 準拠でスコアと比較欄を埋める

`docs/research/TEMPLATE.md` を source of truth として、その時点の見出し・表・コメント指示に従って必要なスコアと比較欄を埋める。

- 例: `profit_follow_rate`, `PF vs baseline`, `dd_to_profit`, `DD ratio vs baseline`, `win_rate vs baseline`
- 固定の評価式をこのスキルに複写せず、テンプレート側の列定義・判断基準・比較前提を優先する。
- テンプレート内に実例値が入っている場合は、そのまま残さず対象 run の実データへ置き換える。

### Step 7: 出力ファイルの作成

ファイル名規則: `night-batch-self-hosted-run{N}_{YYYYMMDD}.md`
出力先: `docs/research/`

`docs/research/TEMPLATE.md` の構造に従って記述する。

- `docs/research/TEMPLATE.md` の見出し順・表の列順・コメント指示に合わせて出力ファイルを作る。
- TEMPLATE にある placeholder / 実例値 / 補助コメントは、対象 run の実データと解釈に置き換える。
- Step 5 と Step 6 で集めた baseline 集計、銘柄別 metrics、比較スコアを各セクションへ反映する。

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
| `result.stats` キーでメトリクスを読む | `result.metrics` が正しいキー |
| manifest.json を更新せずにファイルを追加する | Step 8 で必ず同時に更新する |
| win_rate が低いことを自動で除外候補にする | このキャンペーン戦略群は構造的に win_rate < 35% が正常。除外根拠にしない |
