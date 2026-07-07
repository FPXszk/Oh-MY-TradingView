---
name: backtest-results-capture
description: Night Batch Self Hosted の GitHub Actions 実行結果を現行 artifact / summary 構造から読み、docs/research/ にまとめる runbook。
tags:
  - backtest
  - research
  - capture
  - night-batch
---

# backtest-results-capture

`Night Batch Self Hosted` の実行結果を `docs/research/` にまとめる。対象 run の実ファイルを正本にし、古い run 固有の構造や固定ファイル名を前提にしない。

## Source Of Truth

- `.github/workflows/night-batch-self-hosted.yml`
- `scripts/windows/github-actions/find-night-batch-outputs.ps1`
- `scripts/windows/github-actions/append-night-batch-workflow-summary.ps1`
- `artifacts/night-batch/`
- `docs/research/TEMPLATE.md`
- `docs/research/manifest.json`

## Run Selection

1. ユーザー指定の run number / run id があればそれを対象にする。
2. 「最新」の場合は `Night Batch Self Hosted` の completed run を確認する。
3. run id と run attempt を記録する。
4. workflow file が現在も `.github/workflows/night-batch-self-hosted.yml` であることを確認する。

GitHub connector、`gh run view`、GitHub UI のどれを使ってもよい。特定の MCP tool 名に依存しない。

## Artifact Name

現行 workflow の upload-artifact 名は次の形式:

```text
night-batch-{github.run_id}-{github.run_attempt}
```

run attempt を含める。run number だけで artifact 名を推測しない。

## Output Discovery

artifact を展開したら、展開直後のrootに特定ファイルがあるとは仮定しない。現行 workflow は `find-night-batch-outputs.ps1` で見つけた round directory と campaign artifact directories を upload する。

探索順:

1. workflow summary を読む。
2. `*-summary.json` を探す。
3. `*-summary.md` があれば読む。
4. 同じ round directory から以下を探す。
   - `*-rich-report.md`
   - `*-combined-ranking.json`
   - `*-live-checkout-protection.json`
5. summary JSON の `campaign_manifest_json_path` / `campaign_manifest_md_path` を解決する。
6. summary JSON の `campaign_artifacts` と `captured_lines` から campaign artifact directories を確認する。

`find-night-batch-outputs.ps1` は `artifacts\night-batch` と `results\night-batch` を検索rootにする。ローカルで再現する場合もこの考え方に合わせる。

## Files To Read

対象 run の実体から判断する:

- workflow summary
- summary JSON / Markdown
- rich report
- ranking artifact: `*-combined-ranking.json`
- protection report: `*-live-checkout-protection.json`
- campaign manifest JSON / Markdown
- campaign artifact directories

ランキングや個別結果のファイル名・配置は campaign により変わりうる。固定名で決め打ちせず、manifest と summary から辿る。

## Research Document

1. `docs/research/TEMPLATE.md` を先に読む。
2. テンプレートの見出し、列、比較観点に合わせて対象 run の値を集計する。
3. placeholder や例示値は対象 run の実データに置き換える。
4. ファイル名は `night-batch-self-hosted-run{N}_{YYYYMMDD}.md` を基本にする。
5. 出力先は `docs/research/`。

## Manifest

新しい research doc は `docs/research/manifest.json` の `keep` に追加する。manifest に入れないと archive 処理で退避対象になりうる。

## Verification

最低限:

```powershell
node --test tests/archive-latest-policy.test.js
```

docs 導線も変更した場合:

```powershell
node --test tests/documentation-navigation.test.js tests/archive-latest-policy.test.js
```

## Anti-Patterns

| Anti-Pattern | Correct approach |
|---|---|
| artifact 名を run number だけで決め打ちする | run id と run attempt から現行形式を確認する |
| 展開rootにランキングや結果JSONがあると仮定する | summary / manifest / round directory から探索する |
| 古い campaign 構造を流用する | 対象 run の実ファイルを読む |
| manifest を更新しない | research doc 追加と同時に `docs/research/manifest.json` を更新する |
