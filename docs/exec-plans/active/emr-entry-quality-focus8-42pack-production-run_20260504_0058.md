# EMA + MACD + RSI Entry Quality Focus-8 42-Pack 本番実行計画

## 概要

smoke 成功済みの 42 本 subset
`emr-entry-quality-focus8-42pack-smoke`
を対象に、**Night Batch Self Hosted の本番ワークフロー** を実行する。

今回の目的は次の 2 点。

1. smoke で通った 42 本を `focus-8 full`（8 銘柄）で本番実行する
2. 実行対象を固定し、後続の結果確認・比較がしやすい状態にする

## 前提・スコープ

- 実行対象戦略は **42 本 subset 固定**
- universe は `focus-8`
- workflow は `.github/workflows/night-batch-self-hosted.yml`
- smoke 用 config は `production_phases: "smoke"` なのでそのまま使わず、**本番専用 config_path** を新規追加する
- ワークフロー実行までを範囲とし、結果まとめ doc 作成は範囲外

## 対象ファイル

### 新規作成

| ファイル | 役割 |
|---|---|
| `docs/exec-plans/active/emr-entry-quality-focus8-42pack-production-run_20260504_0058.md` | この計画 |
| `config/night_batch/emr-entry-quality-focus8-42pack-production-config.json` | 42-pack 本番実行用 config |

### 変更

| ファイル | 変更内容 |
|---|---|
| なし | ワークフロー本体や campaign 定義は変更しない |

### 変更しないもの

- `config/backtest/campaigns/emr-entry-quality-focus8-42pack-smoke.json`
- `config/backtest/strategy-catalog.json`
- `config/backtest/strategy-presets.json`
- `.github/workflows/night-batch-self-hosted.yml`

## 実装内容

本番用 config は smoke 用 config をベースにしつつ、以下を固定する。

- `bundle.us_campaign = "emr-entry-quality-focus8-42pack-smoke"`
- `bundle.smoke_phases = "smoke"`
- `bundle.production_phases = "full"`
- `runtime.detach_after_smoke = false`

そのうえで、以下の workflow_dispatch を実行する。

```bash
gh workflow run "Night Batch Self Hosted" \
  --ref main \
  --field config_path=config/night_batch/emr-entry-quality-focus8-42pack-production-config.json
```

## 実装ステップ

- [x] smoke 成功を確認する（run `25282193391`）
- [ ] `config/night_batch/emr-entry-quality-focus8-42pack-production-config.json` を追加する
- [ ] `Night Batch Self Hosted` を workflow_dispatch で起動する
- [ ] `gh run list` / `gh run view` で run ID と起動状態を確認する
- [ ] plan を `docs/exec-plans/completed/` に移動してコミット / push する

## テスト戦略

### RED

- なし（コード変更テストではなく実行構成の追加）

### GREEN

- 新 config を使って workflow_dispatch が正常に受理される
- run が `queued` / `in_progress` / `completed` のいずれかで観測できる

### REFACTOR

- なし

## 実行後の検証コマンド

- `gh workflow run "Night Batch Self Hosted" --ref main --field config_path=config/night_batch/emr-entry-quality-focus8-42pack-production-config.json`
- `gh run list --workflow .github/workflows/night-batch-self-hosted.yml --limit 5`
- `gh run view <run-id>`

## リスク・注意点

- self-hosted runner の空き状況で queue / fail が発生しうる
- TradingView 側の状態次第で workflow は失敗しうる
- 現在 `docs/exec-plans/active/` に smoke plan が残っているため、production 完了時に active plan 整理が必要

## 範囲外

- 実行結果の research 化
- 42 本 subset の見直し
- 200-pack 全体の本番実行

---

作成者: Copilot
作成日時: 2026-05-04T00:58:00+09:00
