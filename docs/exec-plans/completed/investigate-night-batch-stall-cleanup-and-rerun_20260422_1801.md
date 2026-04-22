# Night Batch stall / cleanup / rerun 計画

作成日時: 2026-04-22 18:01 JST

## 目的

`Night Batch Self Hosted` について、見た目は動いているのに継続しなかった直近事象を調査し、再発防止の最小修正を入れ、直近失敗・中断で生じた不要成果物を処分したうえで再実行し、成功するか確認する。

今回の主調査対象は以下。

- 直近成功 run: `24769082189` (`2026-04-22 17:45 JST` 開始, `success`)
- 直前に「動いていたが続かなかった」可能性が高い run: `24768236797` (`2026-04-22 17:25 JST` 開始, `cancelled`)
- 直近 failure run: `24702992099` (`2026-04-21 12:49 JST` 開始, `failure`)

## 現状認識

- `24768236797` は workflow 自体の自動失敗ではなく、GitHub 上で `The run was canceled by @FPXszk.` が記録されている
- ただし「なぜ止めたくなったか」を潰さないと再発するため、job の進行内容・停止前の step・残置成果物を確認する必要がある
- `24702992099` は `Run smoke gate and foreground production` step で `exit code 1`
- repo には未追跡 artifact と active plan が残っている
  - `artifacts/observability/`
  - `artifacts/screenshots/`
  - `docs/exec-plans/active/dispatch-selected-us40-8pack_20260422_1655.md`
  - `docs/exec-plans/active/re-dispatch-night-batch-selected-us40-8pack_20260422_1720.md`
  - `docs/exec-plans/active/verify-untitled-reset-with-fresh-night-batch_20260422_1743.md`

## 変更・削除・作成対象ファイル

### 作成

- `docs/exec-plans/active/investigate-night-batch-stall-cleanup-and-rerun_20260422_1801.md`

### 調査・確認

- `.github/workflows/night-batch-self-hosted.yml`
- `scripts/windows/run-night-batch-self-hosted.cmd`
- `python/night_batch.py`
- `tests/windows-run-night-batch-self-hosted.test.js`
- `tests/night-batch.test.js`
- `config/night_batch/bundle-foreground-reuse-config.json`
- 必要に応じて `scripts/windows/github-actions/*.ps1`

### 変更の可能性あり

- `.github/workflows/night-batch-self-hosted.yml`
- `scripts/windows/run-night-batch-self-hosted.cmd`
- `python/night_batch.py`
- `tests/windows-run-night-batch-self-hosted.test.js`
- `tests/night-batch.test.js`
- 必要なら `scripts/windows/github-actions/find-night-batch-outputs.ps1`
- 必要なら `scripts/windows/github-actions/append-night-batch-workflow-summary.ps1`

### 削除候補

- 直近失敗・中断に由来すると確認できた `artifacts/night-batch/` 配下の round / state / summary
- 今回の確認用として不要になった `artifacts/observability/` 配下 snapshot
- 今回の確認用として不要になった `artifacts/screenshots/` 配下画像

## 実装内容と影響範囲

- workflow 停止要因の切り分け
  - `cancelled` run が手動停止だった事実と、停止前にどこまで進んでいたかを確認する
  - 直近 `failure` run と比較し、既知の recoverable failure 漏れか、新しい停止要因かを判定する
- 再発防止
  - 原因が実装にある場合のみ、workflow / wrapper / Python のいずれかへ最小修正を入れる
  - 「見かけ上は動くが継続しない」状態をテストで再現できるなら先に RED を作る
- 成果物整理
  - 失敗 run に紐づく不要 state / round / screenshot / snapshot だけを削除する
  - 無関係な過去成果物は触らない
- 再実行検証
  - clean に近い状態から `Night Batch Self Hosted` を再 dispatch し、少なくとも初期進行と成功判定まで確認する

## スコープ

### 含む

- 最新・直近失敗 run の調査
- 必要最小限の修正
- RED -> GREEN -> REFACTOR の順でのテスト更新
- 失敗 run 由来成果物の特定と処分
- workflow の再 dispatch と結果確認

### 含まない

- 無関係な strategy / ranking / campaign ロジック変更
- 過去の artifact 一括整理
- AGENTS.md の変更

## TDD / 検証戦略

### RED

- 停止要因に対応する失敗テストを先に追加する
- 候補:
  - workflow / wrapper が stale state を引き継いでしまう
  - recoverable failure を握れず foreground production が即終了する
  - 出力探索 / summary が失敗時成果物を誤認する

### GREEN

- 原因に対する最小修正で追加テストを通す
- 既存の関連テストも green を確認する

### REFACTOR

- ログ / summary / state 判定の読みやすさを改善する
- 挙動を変えずに分岐やメッセージを整理する

## 検証コマンド候補

```bash
gh run view 24768236797
```

```bash
gh run view 24702992099 --log-failed
```

```bash
node --test tests/windows-run-night-batch-self-hosted.test.js
```

```bash
node --test tests/night-batch.test.js
```

```bash
gh workflow run night-batch-self-hosted.yml
```

```bash
gh run list --workflow night-batch-self-hosted.yml --limit 5 --json databaseId,status,conclusion,createdAt,updatedAt,url
```

## リスク / 注意点

- `24768236797` は手動 cancel のため、真因はコードではなく運用判断や可視性不足の可能性がある
- artifact cleanup は対象特定を誤ると再現調査情報まで失うため、削除前に run との紐付けを確認する
- self-hosted runner / TradingView Desktop / WSL bridge 状態に依存するため、コード修正だけで完全再現しない可能性がある
- active plan が近接しているため、今回の作業は「stall 調査・不要成果物処分・再実行確認」に限定し、別件の実機観測や運用整理へ広げない

## 実装ステップ

- [ ] 最新 `Night Batch Self Hosted` run と直近失敗 / cancel run の job・log・生成物を確認する
- [ ] 停止要因がコード起因か運用起因かを切り分け、再発防止ポイントを決める
- [ ] RED: 必要な失敗テストを `tests/windows-run-night-batch-self-hosted.test.js` または `tests/night-batch.test.js` に追加する
- [ ] GREEN: workflow / wrapper / Python / PowerShell の最小修正でテストを通す
- [ ] REFACTOR: state 判定や summary の過不足を整理する
- [ ] 直近失敗・中断で生じた不要成果物を特定し、必要最小限で削除する
- [ ] 関連テストを再実行して回帰がないことを確認する
- [ ] `Night Batch Self Hosted` を再 dispatch する
- [ ] 新しい run の進行と結果を確認し、成功可否を報告する

## 完了条件

- 「動いているように見えたが続かなかった」事象の説明ができる
- 再発防止のための最小修正とテストが揃っている
- 直近失敗・中断で生じた不要成果物だけが処分されている
- 再実行した `Night Batch Self Hosted` の結果を説明できる
