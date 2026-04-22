# Night Batch WSL fallback launch 廃止計画

作成日時: 2026-04-23 02:10 JST

## 目的

`Night Batch Self Hosted` の起動責務を、成功実績のある workflow 側 `Ensure TradingView is running` に一本化する。`python/night_batch.py smoke-prod` 内の WSL fallback launch は、現在の runner では `powershell.exe` / `cmd.exe` いずれの経路でも `Exec format error` を起こすため廃止する。

## 実績ベースの根拠

- 成功 run:
  - run 8 (`24282322391`, 2026-04-11): `Run smoke gate and foreground production` success
  - run 33 (`24606641443`, 2026-04-18): workflow 全体 success
- 直近失敗:
  - `24789602828`: `Exec format error: 'powershell.exe'`
  - `24790730441`: `Exec format error: '/mnt/c/.../powershell.exe'`
  - `24791016591`: `Exec format error: 'cmd.exe'`
  - `24791670279`: `bash ... powershell.exe ... Exec format error`

この並びから、「WSL 内 Python が Windows 起動を担当する方式」自体が不安定で、実績のある workflow 側 Windows ネイティブ起動へ寄せるのが最短と判断する。

## 既存 active plan との関係

- 新規 active:
  - `docs/exec-plans/active/fix-night-batch-remove-wsl-fallback-launch_20260423_0210.md`
- 完了済み関連 plan:
  - `docs/exec-plans/completed/investigate-latest-workflow-failure_20260423_0127.md`
  - `docs/exec-plans/completed/fix-night-batch-wsl-launch-path_20260423_0134.md`
  - `docs/exec-plans/completed/fix-night-batch-wsl-launch-wrapper_20260423_0146.md`
  - `docs/exec-plans/completed/fix-night-batch-proven-launch-wrapper_20260423_0155.md`

## 変更・作成するファイル

- 変更: `python/night_batch.py`
- 変更: `tests/night-batch.test.js`
- 確認: `.github/workflows/night-batch-self-hosted.yml`

## スコープ

### 実施すること

- `smoke-prod` の startup-check failure 時に WSL fallback launch を実行しないよう変更する
- workflow 側が起動を担当する前提で、失敗時は明示的に終了させる
- 既存テストを新契約に合わせて更新する
- workflow を再dispatchして、`Exec format error` が消えることを確認する

### 実施しないこと

- workflow 側 `Ensure TradingView is running` の大幅改修
- CI の別件 failing tests 修正
- recovery helper 全体の再設計

## 推奨修正方針

最も安全なのは、`execute_smoke_prod()` の startup-check failure 分岐で `run_process(build_shortcut_launch_command(...))` をやめること。

新契約:

- workflow / Windows 環境では `Ensure TradingView is running` が起動責務を持つ
- `smoke-prod` は startup-check / preflight の検証責務だけを持つ
- startup-check failure 時は `launch` step を `skipped: true` かつ failure note 付きで記録し、以降は preflight failure として終了する

理由:

- 実績ある起動経路は workflow 側 Windows `Start-Process`
- 失敗しているのは WSL fallback launch 経路だけ
- 起動責務を二重化しない方がシンプルで壊れにくい

## 実装内容と影響範囲

- `python/night_batch.py`
  - `build_shortcut_launch_command()` の既定経路が不要になるなら削除または `launch_command` 指定時専用へ縮小
  - startup-check failure 時の fallback launch 実行を削除
  - summary step 記録は新契約に沿って調整
- `tests/night-batch.test.js`
  - startup-check failure 時に launch せず失敗する契約へ更新
  - startup-check success 時の launch skipped 契約は維持
  - dry-run の launch command 期待も不要なら整理

## TDD / 検証戦略

### RED

- `tests/night-batch.test.js` の startup-check failure ケースを「launch しない / failure を返す」契約に更新し、現状コードで失敗させる

### GREEN

- `python/night_batch.py` の fallback launch を削除し、更新テストを通す

### REFACTOR

- 不要になった launch command helper や dry-run 記録を最小限整理する

### カバレッジ方針

- 回帰点は `tests/night-batch.test.js` で固定する
- `tests/windows-run-night-batch-self-hosted.test.js` で workflow 側起動責務が残っていることを確認する

## 検証コマンド

```bash
node --test tests/night-batch.test.js
```

```bash
node --test tests/windows-run-night-batch-self-hosted.test.js
```

必要に応じて:

```bash
gh workflow run night-batch-self-hosted.yml -f config_path=config/night_batch/bundle-foreground-reuse-config.json
```

## リスク / 注意点

- workflow 側で起動に失敗した場合、`smoke-prod` は自動復旧しなくなる
- ただし現状の WSL fallback は全経路で壊れているため、まずは実績ある single responsibility へ戻す方が合理的
- 後で必要なら、Windows ネイティブ側に限定した recovery step を workflow に追加する方が筋が良い

## 実装ステップ

- [ ] `tests/night-batch.test.js` の startup-check failure 契約を更新し、RED を確認する
- [ ] `python/night_batch.py` から WSL fallback launch を削除する
- [ ] `node --test tests/night-batch.test.js` を実行して GREEN を確認する
- [ ] `node --test tests/windows-run-night-batch-self-hosted.test.js` を実行して周辺回帰を確認する
- [ ] workflow を再dispatchし、`Exec format error` が消えたことを確認する

## 完了条件

- `smoke-prod` が WSL から Windows exe を起動しない
- ローカルテストが通る
- `Night Batch Self Hosted` 再実行で `Exec format error` が発生しない
