# Night Batch 実績ある起動経路への修正計画

作成日時: 2026-04-23 01:55 JST

## 目的

`Night Batch Self Hosted` の fallback launch を、現在の壊れやすい「WSL 内 Python から Windows exe を直接 `subprocess.Popen()` する」方式から、実績のある「PowerShell `Start-Process` を WSL の Linux shell wrapper 経由で呼ぶ」方式へ置き換える。

今回の直接の背景:

- 成功例:
  - `Night Batch Self Hosted` run 8 (`24282322391`, 2026-04-11): `startup-check` failure 後の `launch` が success
  - `Night Batch Self Hosted` run 33 (`24606641443`, 2026-04-18): workflow 全体 success
- 失敗例:
  - run `24789602828` (2026-04-23): `Exec format error: 'powershell.exe'`
  - run `24790730441` (2026-04-23): `Exec format error: '/mnt/c/.../powershell.exe'`
  - run `24791016591` (2026-04-23): `Exec format error: 'cmd.exe'`

これにより、「何を起動するか」ではなく「WSL 内 Python が Windows exe を直接 exec していること」自体が現在の runner では不安定だと判断する。

## 既存 active plan との関係

- 新規 active:
  - `docs/exec-plans/active/fix-night-batch-proven-launch-wrapper_20260423_0155.md`
- 完了済み関連 plan:
  - `docs/exec-plans/completed/investigate-latest-workflow-failure_20260423_0127.md`
  - `docs/exec-plans/completed/fix-night-batch-wsl-launch-path_20260423_0134.md`
  - `docs/exec-plans/completed/fix-night-batch-wsl-launch-wrapper_20260423_0146.md`

## 変更・作成するファイル

- 変更: `python/night_batch.py`
- 変更: `tests/night-batch.test.js`
- 必要なら作成: `scripts/backtest/launch-tradingview-shortcut.sh`
- 確認: `.github/workflows/night-batch-self-hosted.yml`

## スコープ

### 実施すること

- fallback launch の既定コマンドを、Linux shell (`bash -lc`) 経由で PowerShell `Start-Process` を呼ぶ形へ変更する
- 既存 workflow の `Ensure TradingView is running` と同じ起動思想を再利用する
- dry-run summary テストを、その proven path を固定する形に更新する
- 修正後に workflow を再dispatchして、少なくとも `Exec format error` が消えることを確認する

### 実施しないこと

- workflow step 全体の再設計
- CI の別件 failing tests 修正
- TradingView launch 設定 schema の大幅拡張
- Node launcher / recovery helper 全体の刷新

## 推奨修正方針

最も堅いのは、`build_shortcut_launch_command()` が返す既定コマンドを Linux shell wrapper にし、内部で

```bash
bash -lc "powershell.exe -NoProfile -Command \"Start-Process -FilePath '...shortcut...' -WindowStyle Normal\""
```

または同等の専用 shell script を呼ぶ方式へ変えること。

理由:

- 成功している workflow の `Ensure TradingView is running` は Windows PowerShell `Start-Process` を使っている
- 失敗しているのは Windows exe を Python が直接 exec する経路であって、PowerShell の起動ロジック自体ではない
- WSL shell からの Windows interop はこの repo の過去運用でも実績がある
- Python 側は Linux 実行ファイル (`bash` / `.sh`) だけを起動すればよく、`Exec format error` を避けられる

## 実装内容と影響範囲

- `python/night_batch.py`
  - fallback launch command の既定値を proven wrapper 経由へ変更する
  - 必要なら quoting を閉じ込める helper を追加する
- `tests/night-batch.test.js`
  - dry-run summary の `launch` command が `bash -lc ... Start-Process ...` もしくは専用 wrapper script になることを検証する
  - `powershell.exe` / `cmd.exe` を Python が直接 exec する回帰を防ぐ
- `scripts/backtest/launch-tradingview-shortcut.sh` を作る場合:
  - shortcut path を受けて PowerShell `Start-Process` を呼ぶだけの薄い wrapper に限定する

## TDD / 検証戦略

### RED

- `tests/night-batch.test.js` の launch command 期待値を proven wrapper 形式へ更新し、現状コードで失敗させる

### GREEN

- `python/night_batch.py`（必要なら wrapper script）を修正し、テストを通す

### REFACTOR

- quoting が読みにくい場合は helper / wrapper script に閉じ込める
- 起動方式は proven path に寄せるだけで、余計な抽象化はしない

### カバレッジ方針

- 回帰点は `tests/night-batch.test.js` に固定する
- `tests/windows-run-night-batch-self-hosted.test.js` で workflow 側との思想のズレがないか確認する

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

- shell quoting を誤ると shortcut path の空白・日本語が壊れる
- runner 依存の WSL interop 前提は残るが、少なくとも Python direct exec よりは過去実績に近い
- 直近の `CI` failure は今回と別件の可能性が高いので、Night Batch 修正と切り分けて報告する

## 実装ステップ

- [ ] `tests/night-batch.test.js` の launch command 期待値を proven wrapper 形式へ更新し、RED を確認する
- [ ] `python/night_batch.py` を修正し、必要なら薄い shell wrapper script を追加する
- [ ] `node --test tests/night-batch.test.js` を実行して GREEN を確認する
- [ ] `node --test tests/windows-run-night-batch-self-hosted.test.js` を実行して周辺回帰を確認する
- [ ] workflow を再dispatchし、`Exec format error` が解消したか確認する

## 完了条件

- fallback launch が Python direct exec ではなく proven wrapper 経由になっている
- 追加・更新した回帰テストが通る
- `Night Batch Self Hosted` 再実行時に少なくとも `Exec format error` は再発しない
