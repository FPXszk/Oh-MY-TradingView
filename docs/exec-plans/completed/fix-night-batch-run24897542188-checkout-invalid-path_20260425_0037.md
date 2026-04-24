# Night Batch Self Hosted run 24897542188 checkout invalid path 修正計画

作成日時: 2026-04-25 00:37 JST

## 目的

GitHub Actions `Night Batch Self Hosted` run `24897542188` が `actions/checkout@v4` で失敗している。

失敗原因は、リポジトリに Windows 非互換の追跡ファイル `docs/research/archive/retired/retired-strategy-presets.json:Zone.Identifier` が含まれており、Windows runner 上で `invalid path` となって checkout 自体が中断されること。

この計画では、該当 `:Zone.Identifier` ファイル群を追跡対象から除去し、再発しない状態で workflow を再実行できるようにする。

## 既存 active plan との関係

- 既存 active plan: `docs/exec-plans/active/repo-structure-align-and-archive-rules_20260424_2015.md`
- 今回は GitHub Actions failure の即時復旧が対象で、archive ルール整理とは直接競合しない

## 変更・削除・作成するファイル

- 作成: `docs/exec-plans/active/fix-night-batch-run24897542188-checkout-invalid-path_20260425_0037.md`
- 削除: `docs/research/archive/retired/retired-strategy-presets.json:Zone.Identifier`
- 削除: `docs/research/archive/retired/round5-negative-alt-strategies_2015_2025.md:Zone.Identifier`
- 必要に応じて変更: `.gitignore`
- 必要に応じて変更: `tests/windows-run-night-batch-self-hosted.test.js`

## スコープ

### 実施すること

- 追跡されている `:Zone.Identifier` ファイルを特定し、git 管理下から除去する
- 必要なら同種ファイルの再混入を防ぐ ignore ルールを追加する
- Windows / checkout 失敗の再発防止に必要な最小限の検証を行う
- 修正を commit / push し、`Night Batch Self Hosted` workflow を再実行する

### 実施しないこと

- night batch 本体ロジックの変更
- run `24897542188` 以外の運用改善をまとめて入れること
- archive ドキュメント本文の内容変更

## 実装内容と影響範囲

- git 管理対象から `:Zone.Identifier` を除去することで、Windows runner の `actions/checkout` が通るようになる
- `.gitignore` を触る場合は、Windows 由来の ADS 代替ファイル混入防止に限定する
- workflow YAML 自体は今回の root cause ではないため、原則変更しない

## TDD / 検証戦略

### RED

- 失敗 run `24897542188` の `gh run view` で、checkout 失敗原因が `invalid path ... :Zone.Identifier` であることを確認済み

### GREEN

- 問題ファイルを削除し、`git ls-files | rg 'Zone.Identifier'` が空になる状態にする
- 必要最小限の関連テストまたは静的確認を実行する

### REFACTOR

- 必要な場合のみ ignore ルールや補助テストを追加し、再発防止を最小差分で整える

## 想定コマンド

```bash
git ls-files | rg 'Zone.Identifier'
```

```bash
node tests/windows-run-night-batch-self-hosted.test.js
```

```bash
gh run view 24897542188
```

## リスク / 注意点

- `:Zone.Identifier` のような Windows 非互換パスは checkout 前に落ちるため、workflow 側のリトライでは解決しない
- `.gitignore` 追加だけでは既に追跡済みのファイルは消えない
- Windows runner での失敗なので、Linux ローカルでは見落としやすい

## 実装ステップ

- [ ] 追跡されている `:Zone.Identifier` ファイルの全件を確認する
- [ ] 必要なら RED 根拠を補強する最小確認を追加する
- [ ] GREEN: 問題ファイルを git 管理下から除去し、必要なら ignore を追加する
- [ ] GREEN: `git ls-files | rg 'Zone.Identifier'` と関連確認を実行する
- [ ] REVIEW: 余計な差分がないか、Windows checkout 失敗の原因だけを潰しているか確認する
- [ ] COMMIT 準備: plan を `docs/exec-plans/completed/` へ移動し、Conventional Commit で commit / push する
- [ ] PUSH 後: `Night Batch Self Hosted` workflow を再実行し、run 開始を確認する

## 完了条件

- 追跡対象に `:Zone.Identifier` ファイルが残っていない
- 修正が push 済みである
- `Night Batch Self Hosted` workflow が再実行されている
