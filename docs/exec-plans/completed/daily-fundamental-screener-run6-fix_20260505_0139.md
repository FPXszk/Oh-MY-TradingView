# Exec-plan: daily-fundamental-screener-run6-fix_20260505_0139

## 概要

目的: GitHub Actions `Daily Fundamental Screener` の **run #6** 失敗を修正し、再実行で成功を確認する。

現時点の根本原因:

- `run-screener` ジョブ本体と artifact upload は成功している
- 失敗は最後の `Publish screener report to WSL main` のみ
- `scripts/windows/github-actions/sync-daily-screener-report-to-wsl.ps1` 内の `Convert-WindowsPathToWsl` が Windows パスを `wsl.exe wslpath -a` にそのまま渡しており、`C:\...` が `C:actions-runner_work...` に崩れて変換失敗している

対象ワークフロー:

- `.github/workflows/daily-screener.yml`
- 失敗 run: `25329531735` (`Daily Fundamental Screener` run #6)

## 変更ファイル

- `docs/exec-plans/active/daily-fundamental-screener-run6-fix_20260505_0139.md` (この計画)
- `scripts/windows/github-actions/sync-daily-screener-report-to-wsl.ps1` (修正予定)
- `tests/daily-screener-report.test.js` (回帰テスト追加/更新予定)

変更しないもの:

- `scripts/screener/run-fundamental-screening.mjs` 本体ロジック
- 日次レポート markdown の内容/ランキング仕様
- 他 workflow の publish/sync フロー

## 実装ステップ

- [ ] 失敗原因と影響範囲を固定する
  - 対象は `Publish screener report to WSL main` ステップに限定されることを維持確認
  - `wslpath` へ渡す直前の Windows パス正規化方針を決める

- [ ] WSL パス変換の最小修正を入れる
  - `sync-daily-screener-report-to-wsl.ps1` で Windows パスを `wslpath` が解釈できる形式へ正規化してから変換する
  - 既存の安全策（single quote 禁止、main/SSH チェック、限定 add/push）は維持する

- [ ] 回帰テストを追加する
  - `tests/daily-screener-report.test.js` に publish script の Windows パス変換対策を固定する検証を追加する
  - 既存 workflow 契約（artifact, metadata, WSL publish step）が壊れていないことも維持する

- [ ] ローカル検証と workflow 再実行を行う
  - `npm test -- tests/daily-screener-report.test.js` ではなく、既存 scripts に合わせて `node --test tests/daily-screener-report.test.js` を実行する
  - 必要に応じて `npm test` も実行し、既存回帰がないことを確認する
  - `Daily Fundamental Screener` を `workflow_dispatch` で再実行し、成功するまでログ確認と必要最小限の追加修正を続ける

## テスト戦略

- RED: `tests/daily-screener-report.test.js` に path normalization を要求する失敗条件を追加する
- GREEN: PowerShell script を最小修正して追加テストを通す
- REFACTOR: 既存 publish 手順を壊さない範囲で script を簡潔に保つ

## 検証コマンド

- `node --test tests/daily-screener-report.test.js`
- `npm test`
- `gh workflow run .github/workflows/daily-screener.yml --ref main`
- `gh run list --workflow .github/workflows/daily-screener.yml --limit 5`
- `gh run view <run-id>`

## リスク・注意点

- self-hosted Windows runner と WSL の実環境差分により、path conversion 修正後に別の publish 失敗が露出する可能性がある
- WSL 側 checkout が dirty / non-main / non-SSH origin の場合、今回の path conversion 修正後も publish は失敗しうる
- workflow 再実行は `main` に反映された修正を使う必要があるため、実装後の commit/push 順序を守る

## 競合確認

- `docs/exec-plans/active/` には `repo-structure-align-and-archive-rules_20260424_2015.md` と `run-night-batch_20260429_2344.md` がある
- いずれも Daily Fundamental Screener publish 修正とは直接競合しない

---

作成者: Copilot
作成日時: 2026-05-05T01:39:00+09:00
