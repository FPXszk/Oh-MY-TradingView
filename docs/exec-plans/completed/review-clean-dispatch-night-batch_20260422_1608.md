# Review / Clean / Dispatch Night Batch 計画

作成日時: 2026-04-22 16:08 JST

## 目的

- 末コミット `2347a10 feat: set selected us40 8-pack as night batch default` の変更内容を確認し、night batch 起動前提として問題がないかレビューする
- 必要なら push 状態を確認する
- 作業ツリーを可能な範囲で整理し、night batch workflow を起動して放置できる状態にする

## 現状整理

- 末コミット `2347a10` はすでに `main` へ push 済み
- 末コミットの差分は今回の 8 戦略 US40 campaign 追加、既定 bundle 差し替え、関連テスト更新、exec-plan 完了化
- 現在の作業ツリーには今回タスクとは別系統の変更が残っている
  - 既存変更: `.codex/config.toml`
  - 削除扱い: `logs/sessions/working-tree-audit-docs-refresh_20260416_1415.md`
  - 未追跡: `artifacts/` 配下、別 campaign / universe / test / exec-plan / session log など

## 変更・確認対象ファイル

### 確認

- `config/backtest/campaigns/current/selected-us40-8pack.json`
- `config/night_batch/bundle-foreground-reuse-config.json`
- `tests/campaign.test.js`
- `tests/night-batch.test.js`
- `tests/windows-run-night-batch-self-hosted.test.js`
- `docs/exec-plans/completed/night-batch-selected-us40-8pack_20260422_1555.md`
- Git 履歴と作業ツリー状態

### 変更の可能性あり

- `docs/exec-plans/active/review-clean-dispatch-night-batch_20260422_1608.md`
- 必要最小限の cleanup 対象

## 実装内容と影響範囲

- REVIEW
  - 末コミット差分をコードレビュー観点で確認する
  - 特に campaign ID、期間、workflow 既定参照先、テスト整合を確認する
- CLEAN
  - 今回コミットと無関係な変更が多いため、`git clean` や広範囲な reset は使わない
  - 破壊的操作になる cleanup は、今回タスク生成物と断定できるものだけに限定する
  - それでもクリーン化できない場合は、残存変更を明示したうえで止める
- DISPATCH
  - `gh` CLI で `night-batch-self-hosted` workflow を既定 `config_path` のまま dispatch する
  - run が生成されて開始したことを確認したら、その後は放置する

## 実装ステップ

- [ ] 末コミット `2347a10` の差分をレビューし、ロジック破綻・設定ミス・テスト不整合がないか確認する
- [ ] push 済み状態を再確認し、追加 push が不要か判断する
- [ ] 作業ツリーの未コミット変更を棚卸しし、今回タスクと無関係なものを破壊せずに clean 化できる範囲を見極める
- [ ] 必要最小限の cleanup を行う。危険な未追跡/既存変更しか残らない場合はその事実を報告して以降の方針を判断する
- [ ] `gh` CLI で `night-batch-self-hosted` workflow を dispatch し、run 作成を確認する
- [ ] 計画を `docs/exec-plans/completed/` へ移し、必要なら commit / push する

## テスト・確認

- `git log -1 --stat --oneline`
- `git status --short`
- 必要なら `node --test tests/campaign.test.js tests/night-batch.test.js tests/windows-run-night-batch-self-hosted.test.js`
- `gh workflow run night-batch-self-hosted.yml`
- `gh run list --workflow night-batch-self-hosted.yml --limit 1`

## リスクと注意点

- 「クリーンな状態」にするには、現在ある別件の未追跡・既存変更を削除または巻き戻す必要がある可能性が高い
- それらは今回コミットで作ったものではないため、無条件に削除するとユーザー作業を壊すおそれがある
- workflow dispatch 自体は repo が dirty でも可能だが、「クリーン化完了後に起動」の条件を厳密に満たせない場合は判断が必要
- `gh` CLI を使って dispatch するため、GitHub 側疎通と認証状態に依存する
