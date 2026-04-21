# Night Batch Resume Re-Dispatch 計画

作成日時: 2026-04-21 16:38 JST

## 目的

`Night Batch Self Hosted` workflow を再度 `workflow_dispatch` で起動し、既存の round / checkpoint を再利用して続きから再開させる。

## 現時点の確認結果

- 最新 successful run:
  - workflow: `Night Batch Self Hosted`
  - run id: `24705526295`
  - branch: `main`
  - conclusion: `success`
- 現行 config:
  - `config/night_batch/bundle-foreground-reuse-config.json`
  - `bundle.us_campaign = public-top10-us-40x10`
  - `bundle.smoke_phases = smoke`
  - `bundle.production_phases = full`
- 現行 wrapper:
  - `scripts/windows/run-night-batch-self-hosted.cmd`
  - 既存 round manifest があれば `resume-current-round` を選ぶ
- この workspace からは Windows runner 側の `round17/round-manifest.json` を直接確認できていない
  - そのため dispatch 前に runner 側に最新 round が残っていることを前提にする

## 変更・確認対象ファイル

- 作成: `docs/exec-plans/completed/re-dispatch-night-batch-resume-round_20260421_1638.md`
- 変更予定: なし

## 実装内容と影響範囲

- GitHub Actions の `Night Batch Self Hosted` を `workflow_dispatch` で再実行する
- 入力 `config_path` は既定の `config/night_batch/bundle-foreground-reuse-config.json` を使う
- run が生成されたことと、少なくとも開始できたことを確認する
- repo ファイルは計画ファイル以外変更しない

## 実装ステップ

- [ ] 現行 config が再開対象の `public-top10-us-40x10` を向いていることを確認する
- [ ] `Night Batch Self Hosted` workflow を `workflow_dispatch` で再実行する
- [ ] run が生成されたことを確認する
- [ ] 可能なら開始直後の status を確認し、dispatch 成功を確認する
- [ ] 計画を `docs/exec-plans/completed/` へ移す

## テスト・確認

- `gh run list --workflow "Night Batch Self Hosted" --limit 3`
- `gh workflow run "Night Batch Self Hosted" -f config_path=config/night_batch/bundle-foreground-reuse-config.json`
- `gh run list --workflow "Night Batch Self Hosted" --limit 1`

## リスクと注意点

- runner 側で round manifest / checkpoint が消えている場合、`resume-current-round` ではなく `advance-next-round` になる可能性がある
- config を変えていない前提でも、runner 側の live checkout 状態によって resume 可否は左右される
- 今回は dispatch 実行と run 生成確認までを主眼とし、完走確認は次段階とする

## スコープ外

- campaign 定義の変更
- workflow YAML の変更
- 失敗時の追加デバッグ
