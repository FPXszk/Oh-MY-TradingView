# Night Batch WSL 起動ラッパー修正計画

作成日時: 2026-04-23 01:46 JST

## 目的

`Night Batch Self Hosted` run `24790730441` で再確認された `OSError: [Errno 8] Exec format error` を解消する。前回の絶対パス化では、WSL から Windows PE 実行ファイルを直接 `subprocess.Popen()` する方式そのものが失敗要因だと判明したため、起動経路を WSL から確実に通る Windows ラッパー呼び出しへ変更する。

## 既存 active plan との関係

- 新規 active plan:
  - `docs/exec-plans/active/fix-night-batch-wsl-launch-wrapper_20260423_0146.md`
- 完了済みの関連 plan:
  - `docs/exec-plans/completed/investigate-latest-workflow-failure_20260423_0127.md`
  - `docs/exec-plans/completed/fix-night-batch-wsl-launch-path_20260423_0134.md`
- 今回は前回修正の追撃であり、対象は同じく `python/night_batch.py` と関連テストに限定する

## 変更・作成するファイル

- 変更: `python/night_batch.py`
- 変更: `tests/night-batch.test.js`
- 確認: `logs/sessions/archive/market-specific-long-run-deep-dive_20260408_0616.md`
- 確認: `scripts/backtest/ensure-tradingview-recovery.sh`

## スコープ

### 実施すること

- fallback launch の既定コマンドを、WSL から通る `cmd.exe /c start` 系のラッパー呼び出しへ変更する
- quoting を壊さない回帰テストを追加または更新する
- 少なくともローカルテストで launch command の生成が意図通りか確認する

### 実施しないこと

- workflow YAML の step 構成変更
- TradingView 起動設定 schema の拡張
- recovery script 全体の作り直し
- CI の別件 failing tests 修正

## 推奨修正方針

最も安全なのは、`build_shortcut_launch_command()` の既定値を `cmd.exe /c start "" "<shortcut>"` 形式へ変えること。

理由:

- WSL から Windows 側 GUI アプリを起動する既存運用ログに `cmd.exe /c start` の実績がある
- PE 実行ファイルを Linux 側で直接 exec しないため、今回の `Exec format error` 経路を避けられる
- `launch_command` 指定時の上書き仕様を維持できる
- workflow 側 PowerShell step はそのままでよく、差分を Python fallback のみに閉じ込められる

## 実装内容と影響範囲

- `python/night_batch.py`
  - fallback launch command の既定値を `cmd.exe /c start` ベースへ変更する
  - 必要なら Windows command 組み立て用の小さな helper / 定数を追加する
- `tests/night-batch.test.js`
  - dry-run summary の `launch` step が `cmd.exe /c start` 形式になっていることを検証する
  - bare `powershell.exe` や PE 直実行へ戻る回帰を防ぐ
- 影響範囲
  - `smoke-prod` startup-check failure 時の fallback launch
  - `Night Batch Self Hosted` の WSL 実行経路
  - summary JSON/MD に記録される launch command

## TDD / 検証戦略

### RED

- `tests/night-batch.test.js` の launch command 期待値を `cmd.exe /c start` 形式へ更新し、現状コードで失敗させる

### GREEN

- `python/night_batch.py` の launch command 生成を修正し、テストを通す

### REFACTOR

- コマンド組み立てが読みにくければ小さく整理する
- 起動仕様の拡張はしない

### カバレッジ方針

- 回帰点は `tests/night-batch.test.js` で固定する
- 必要に応じて `tests/windows-run-night-batch-self-hosted.test.js` で workflow 側との整合だけ再確認する

## 検証コマンド

```bash
node --test tests/night-batch.test.js
```

必要に応じて:

```bash
node --test tests/windows-run-night-batch-self-hosted.test.js
```

修正後に必要なら再度:

```bash
gh workflow run night-batch-self-hosted.yml -f config_path=config/night_batch/bundle-foreground-reuse-config.json
```

## リスク / 注意点

- `cmd.exe /c start` は quoting を誤るとタイトル引数やパス解釈が壊れやすい
- shortcut path に空白や日本語が含まれるので、引数配列と quoting の整合をテストで固定する
- `CI` には今回の修正と無関係の failing tests が残っている可能性があるため、Night Batch 修正完了と CI 総通過は切り分けて扱う

## 実装ステップ

- [ ] `tests/night-batch.test.js` の launch command 期待値を `cmd.exe /c start` 形式へ更新し、RED を確認する
- [ ] `python/night_batch.py` の fallback launch command を WSL-safe な `cmd.exe /c start` 形式へ修正する
- [ ] `node --test tests/night-batch.test.js` を実行して GREEN を確認する
- [ ] 必要なら workflow 関連テストも実行して周辺回帰を確認する
- [ ] 必要に応じて workflow を再dispatchし、`Exec format error` が解消したか確認する

## 完了条件

- `smoke-prod` の fallback launch が PE 直実行ではなく `cmd.exe /c start` 経由になっている
- 追加・更新した回帰テストが通る
- `Night Batch Self Hosted` 再実行時に少なくとも今回の `Exec format error` は再発しない
