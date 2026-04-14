# Exec Plan: foreground-night-batch-actions-monitoring_20260411_1138

## 1) 背景 / 目的

Night Batch Self Hosted workflow を、GitHub Actions 上で **smoke から production 完了まで foreground で追跡できる構成** に切り替える。  
合わせて、失敗時に GitHub 側で **どの層・どの step で終了したか** を切り分けやすい summary / state / artifact を残す。  
実装後は `workflow_dispatch` で手動実行し、Actions 上で完了監視できることを確認する。

## 2) 変更 / 作成 / 削除するファイル

### 作成
- `docs/exec-plans/active/foreground-night-batch-actions-monitoring_20260411_1138.md`
- `config/night_batch/bundle-foreground-reuse-config.json`

### 更新
- `.github/workflows/night-batch-self-hosted.yml`
- `python/night_batch.py`
- `tests/night-batch.test.js`
- `tests/windows-run-night-batch-self-hosted.test.js`
- `README.md`
- `docs/command.md`

### 条件付き更新
- `scripts/windows/run-night-batch-self-hosted.cmd`

### 削除
- なし

## 3) 実装内容と影響範囲

### 実装内容
- workflow の既定 `config_path` を foreground 実行用 config に切り替える
- detached production 起動前提の完了条件をやめ、workflow job 自体が production 完了まで保持されるようにする
- `python/night_batch.py` に foreground 実行向けの state 更新を追加し、`updated_at` を heartbeat として継続更新する
- summary に `termination_reason`、`failed_step`、`last_checkpoint` などの切り分け情報を追加する
- workflow の `always()` step で summary / log / state / round 成果物を GitHub Actions summary と artifact に回収する
- docs を「Actions success = production complete」の新しい運用前提に更新する

### 影響範囲
- self-hosted Windows runner 上の Night Batch workflow
- `docs/research/results/night-batch/roundN/` 配下の state / summary 出力
- workflow 失敗時の運用手順とログ読解手順
- 既存の detached 前提テストとドキュメント

## 4) スコープ

### In Scope
- self-hosted workflow を foreground 完走監視に変更する
- GitHub 上で見える失敗分類の改善
- 手動 dispatch による実 run 確認

### Out of Scope
- self-hosted runner の再登録や常駐方法そのものの変更
- 外部監視 SaaS や別監視基盤の追加
- hard reboot / power loss 後の完全自動復旧
- detached ローカル運用経路の全面廃止

## 5) active plan との重複確認

- `docs/exec-plans/active/investigate-night-batch-self-hosted-queued_20260410_2307.md`
  - queued 原因調査であり、今回の workflow 改修そのものとは別スコープ
- `docs/exec-plans/active/rerun-night-batch-after-run-cmd_20260410_1714.md`
  - rerun 観測中心であり、今回の foreground 化実装とは別スコープ
- `docs/exec-plans/active/run-night-batch-self-hosted-workflow-dispatch_20260411_0025.md`
  - dispatch 観測中心であり、今回の実装後検証ステップと一部重なる

重複はあるが、今回は **workflow / Python / tests / docs を伴う実装計画** なので別 plan として扱う。  
実装完了後の COMMIT フェーズで、dispatch 観測系の active plan は completed へ整理する。

## 6) TDD / テスト戦略

### RED
- `tests/night-batch.test.js` に、foreground 実行時の state / summary へ `termination_reason` と `failed_step` が出ることを期待するテストを追加して失敗させる
- `tests/windows-run-night-batch-self-hosted.test.js` に、workflow 既定 config の切り替えと artifact / summary 回収 step を期待するテストを追加して失敗させる

### GREEN
- foreground config 追加、workflow 更新、`python/night_batch.py` の summary/state 拡張で最小限通す

### REFACTOR
- 終了理由分類の helper 化や docs 表現整理を行う
- wrapper 変更が不要なら触らない

## 7) 検証コマンド

- `node --test tests/night-batch.test.js tests/windows-run-night-batch-self-hosted.test.js`
- `npm test`
- `python3 python/night_batch.py smoke-prod --config config/night_batch/bundle-foreground-reuse-config.json --dry-run --round-mode advance-next-round`
- `gh workflow run .github/workflows/night-batch-self-hosted.yml -f config_path=config/night_batch/bundle-foreground-reuse-config.json`
- `gh run watch <run-id>`

## 8) リスク / 注意点

- 6 時間 job 中に runner / PC / WSL が落ちると artifact 回収が完了しない可能性がある
- hard reboot / power loss では GitHub 上の最終切り分け情報を **必ず** 残せるわけではない
- 既存 detached 前提 docs/test の更新漏れが起きやすい
- round 再開ロジックと foreground state の整合を崩さないよう注意が必要

## 9) 実装ステップ

- [ ] foreground 実行用 config を追加し、workflow 既定 `config_path` を切り替える
- [ ] workflow に GitHub summary 出力と artifact 回収 step を追加する
- [ ] `python/night_batch.py` に foreground 用 state 更新と heartbeat を追加する
- [ ] `python/night_batch.py` に `termination_reason` / `failed_step` / `last_checkpoint` を summary 出力する
- [ ] `tests/night-batch.test.js` に RED テストを追加する
- [ ] `tests/windows-run-night-batch-self-hosted.test.js` に RED テストを追加する
- [ ] 最小実装で targeted tests を通す
- [ ] `npm test` で既存回帰を確認する
- [ ] `README.md` と `docs/command.md` を新運用に更新する
- [ ] `workflow_dispatch` で手動実行し、Actions 上で foreground 監視できることを確認する
