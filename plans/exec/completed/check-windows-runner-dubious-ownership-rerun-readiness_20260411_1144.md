# 背景 / 目的

self-hosted Windows runner 上で `actions/checkout@v4` が `C:/actions-runner/_work/Oh-MY-TradingView/Oh-MY-TradingView` の Git dubious ownership により失敗していた。  
ユーザー申告では、`safe.directory` の global 追加、必要時の workspace 清掃、`run.cmd` 再起動は実施済み。  
本 plan は、**修正後に GitHub Actions workflow を再実行できる状態かを確認する**ことに限定する。

## 変更・作成・削除するファイル

- 作成: `docs/exec-plans/active/check-windows-runner-dubious-ownership-rerun-readiness_20260411_1144.md`
- 参照のみ:
  - `.github/workflows/night-batch-self-hosted.yml`
  - 必要時: `scripts/windows/run-night-batch-self-hosted.cmd`
- 原則変更しない:
  - workflow 定義
  - runner 設定
  - アプリ本体コード

## スコープ

### In Scope
- `Night Batch Self Hosted` workflow の `runs-on` / checkout 条件確認
- 直近 failed run / failed job / failed logs の確認
- self-hosted Windows runner の online / idle / labels / repo 利用可否確認
- 修正後に rerun してよい状態かの判定
- 必要最小限の follow-up 整理

### Out of Scope
- workflow の全面改修
- runner の恒久設計見直し
- アプリ本体の不具合修正
- checkout 通過後の別不具合の深掘り修正

## 調査対象

### リポジトリ内ファイル
- `.github/workflows/night-batch-self-hosted.yml`
- 必要時: `scripts/windows/run-night-batch-self-hosted.cmd`

### GitHub Actions / GitHub 側リソース
- workflow: `Night Batch Self Hosted`
- 直近の failed workflow run
- 直近 failed run 配下の failed job / step logs
- self-hosted runner 一覧と対象 Windows runner の状態

## 実施ステップ

- [x] 既存 active plan と重複しないよう、今回の対象を **dubious ownership 修正後の rerun readiness 確認** に限定する
- [x] `.github/workflows/night-batch-self-hosted.yml` を確認し、`runs-on`, `actions/checkout@v4`, `clean: false`, `workflow_dispatch` 条件を整理する
- [x] 直近 failed run / job / log を確認し、失敗点が Git dubious ownership だったことを再固定する
- [x] GitHub Actions 上で対象 self-hosted Windows runner が **online / idle / repo から利用可能** か確認する
- [x] runner labels が workflow の `self-hosted`, `windows` と一致しているか確認する
- [x] 必要なら runner 再起動後の最新接続状況を確認し、`run.cmd` 再起動が反映済みか確認する
- [x] 上記が揃えば、workflow の rerun が **実行してよい状態** かを `ready / not ready` で判定する
- [x] `ready` の場合だけ、最小 follow-up として `rerun failed jobs` または同等の再実行手段を選ぶ
- [x] `not ready` の場合は、rerun を止める blocker を 1 件だけ明示する
- [x] 最終的に、確認結果・証拠・次アクションを短く整理する

## 検証方針

- GitHub Actions metadata と logs、workflow 定義、runner 状態を突合して判定する
- 成功判定:
  - runner が online / idle / 利用可能
  - label / access mismatch がない
  - dubious ownership 修正内容と checkout 条件に矛盾がない
- 失敗判定:
  - runner offline / busy / access 不可
  - label mismatch がある
  - checkout 前提に別の即時 blocker が見つかる

## 使用する確認手段

- `gh run list --workflow night-batch-self-hosted.yml`
- `gh run view <run-id>`
- `gh run view <run-id> --log-failed`
- `gh api repos/FPXszk/Oh-MY-TradingView/actions/runs/<run-id>`
- `gh api repos/FPXszk/Oh-MY-TradingView/actions/runs/<run-id>/jobs`
- 必要時: GitHub Actions の runner 一覧 / 対象 runner 詳細

## 最小 follow-up action

- **Ready の場合:** failed run を rerun し、まず `actions/checkout@v4` を通過するか確認する
- **Not Ready の場合:** rerun は保留し、blocker 1 件と確認対象設定だけ返す

## リスク / 不明点

- `safe.directory` を設定していても、runner 実行ユーザーが異なると再発する可能性がある
- `clean: false` により既存 workspace 状態の影響が残る可能性がある
- runner group / repo access / labels の制約で job が正しく載らない可能性がある
- checkout 通過後に別の blocker が出る可能性はあるが、本 plan では深追いしない

## 結果

- 判定: **ready**
- 対象 runner `omtv-win-01` は `online / idle` で、labels は `self-hosted`, `windows` を満たしていた
- 直近失敗 run `24255059078` attempt 1 は `actions/checkout@v4` の Git dubious ownership で停止していた
- 同 run を rerun して attempt 2 を起動し、同じ runner 上で `Run actions/checkout@v4` は **success** になった
- 続く `Install dependencies in WSL workspace` も **success** で、確認時点では `Start smoke gate and detached production` が進行中だった
