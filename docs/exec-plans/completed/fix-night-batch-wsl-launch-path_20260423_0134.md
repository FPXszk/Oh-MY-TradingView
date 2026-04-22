# Night Batch WSL 起動経路修正計画

作成日時: 2026-04-23 01:34 JST

## 目的

最新失敗 run `24789602828` の根因である、WSL 内 `python/night_batch.py smoke-prod` からの TradingView 起動 fallback 失敗を修正する。現状は bare な `powershell.exe` 呼び出しにより `OSError: [Errno 8] Exec format error` が発生しており、これを WSL から確実に実行できる Windows PowerShell の起動コマンドへ置き換える。

## 既存 active plan との関係

- 既存 active:
  - `docs/exec-plans/active/investigate-latest-workflow-failure_20260423_0127.md`
- 今回は上記調査の続きとして、修正実装を別 plan で切り出す
- 対象は `python/night_batch.py` とそのテストに限定し、workflow YAML や wrapper cmd の仕様は変えない

## 変更・作成するファイル

- 変更: `python/night_batch.py`
- 変更: `tests/night-batch.test.js`
- 確認: `.github/workflows/night-batch-self-hosted.yml`
- 確認: `config/night_batch/bundle-foreground-reuse-config.json`

## スコープ

### 実施すること

- WSL から fallback launch を呼ぶコマンド生成を修正する
- 今回の回帰を固定するテストを追加する
- `smoke-prod` の既存 launch 分岐に回帰がないことを確認する

### 実施しないこと

- workflow の step 構成変更
- launch 設定 schema の拡張
- TradingView 起動ロジック全体のリファクタ
- unrelated な night batch 改修

## 推奨修正方針

最小差分で最も安全なのは、`build_shortcut_launch_command()` が返す既定コマンドを bare `powershell.exe` から、WSL で PE 実行可能な絶対パス `/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe` に変えること。

理由:

- 失敗原因は Windows 実行ファイルの名前解決ではなく、WSL 内 `subprocess.Popen()` で bare 名をそのまま実行している点にある
- workflow 側の PowerShell step はすでに別経路で正常に動いており、修正対象は Python fallback launch のみでよい
- `launch_command` 指定時の挙動はそのまま維持できる
- `cmd.exe /c start` への変更より quoting 変更範囲が小さく、既存 summary 表示やログの意図も保ちやすい

## 実装内容と影響範囲

- `python/night_batch.py`
  - fallback launch の既定コマンドを WSL-safe な絶対パスへ変更する
  - 必要なら可読性のために PowerShell 実行ファイルパスを定数化する
- `tests/night-batch.test.js`
  - `smoke-prod --dry-run` の launch step command が bare `powershell.exe` でなく、WSL-safe な PowerShell パスを使うことを検証する RED テストを追加する
  - 既存の launch 分岐テストを壊さない
- 影響範囲
  - `smoke-prod` の startup-check 失敗時 fallback launch
  - night batch self-hosted workflow の WSL 実行経路
  - summary JSON/MD に記録される launch command

## TDD / 検証戦略

### RED

- `tests/night-batch.test.js` に、`smoke-prod --dry-run` の launch step が bare `powershell.exe` を使わないことを確認する失敗テストを追加する

### GREEN

- `python/night_batch.py` の launch command 生成を修正し、追加テストを通す

### REFACTOR

- 必要最小限で定数化または命名整理のみ行う
- ロジック拡張や仕様変更はしない

### カバレッジ方針

- 今回の回帰点は `tests/night-batch.test.js` で固定する
- 既存の `smoke-prod` launch 系テストとあわせて対象ロジックの回帰を確認する

## 検証コマンド

```bash
node --test tests/night-batch.test.js
```

必要に応じて:

```bash
node --test tests/windows-run-night-batch-self-hosted.test.js
```

## リスク / 注意点

- `/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe` に固定すると、特殊な Windows 構成ではパス依存になる
- ただし self-hosted runner 前提の現在構成では Windows + WSL が固定で、今回の workflow 失敗を止めるにはこの前提に寄せる方が合理的
- `launch_command` 指定時の挙動は変えないようにする

## 実装ステップ

- [ ] `tests/night-batch.test.js` に launch command 回帰テストを追加し、RED を確認する
- [ ] `python/night_batch.py` の fallback launch command を WSL-safe な PowerShell 絶対パスへ修正する
- [ ] `node --test tests/night-batch.test.js` を実行して GREEN を確認する
- [ ] 必要なら関連 workflow テストも実行して周辺回帰を確認する
- [ ] ロジック破綻や不要な複雑化がないかレビューし、結果を報告する

## 完了条件

- `smoke-prod` の launch command が bare `powershell.exe` を使わない
- 追加した回帰テストが通る
- `tests/night-batch.test.js` が通る
- 修正差分が `python/night_batch.py` と対象テストの最小範囲に留まっている
