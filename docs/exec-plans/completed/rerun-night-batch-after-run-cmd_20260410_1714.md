# 背景 / 目的

Windows self-hosted runner `omtv-win-01` は service ではなく `run.cmd` で起動された。  
workflow run `24253920696` では PowerShell ExecutionPolicy 問題は解消済みだったが、`Install dependencies in WSL workspace` で `wsl.exe` が service account に WSL distro を見つけられず失敗した。  
今回の目的は、**`run.cmd` 起動後に workflow を再実行し、WSL 可視性問題が解消されたかを確認すること**、および **次の blocker があればその層まで切り分けること** に限定する。

---

# 変更・削除・作成する可能性のあるファイル

## 作成
- `docs/exec-plans/active/rerun-night-batch-after-run-cmd_20260410_1714.md`

## 参照のみ（原則変更しない）
- `.github/workflows/night-batch-self-hosted.yml`
- `scripts/windows/run-night-batch-self-hosted.cmd`
- `config/night_batch/bundle-detached-reuse-config.json`
- `tests/night-batch.test.js`
- `python/night_batch.py`

## 変更する可能性があるファイル（次 blocker がコード/設定起因と判明した場合のみ、今回は原則未着手）
- `.github/workflows/night-batch-self-hosted.yml`
- `scripts/windows/run-night-batch-self-hosted.cmd`
- `package.json`
- `package-lock.json`
- `python/night_batch.py`
- `tests/night-batch.test.js`

## 削除予定
- なし

---

# 影響範囲

## In Scope
- GitHub Actions の対象 workflow 再実行
- `omtv-win-01` への job 割当有無の確認
- `Install dependencies in WSL workspace` の通過/失敗確認
- 失敗時の **次 blocker 1 件** の切り分け
- 既存ログ・run/job metadata・failed step logs を用いた原因整理

## Out of Scope
- 恒久対応の実装
- runner の再登録・OS 設定変更・WSL 再インストール
- 複数 blocker の同時修正
- unrelated な workflow 改修
- 既存 active plan の全面置換や統合
- 本番ロジック改善や機能追加

> 既存 active plan との重複回避方針:  
> 今回は **「workflow rerun と、その結果現れる次 blocker の切り分け」だけ** に限定し、  
> 既存 plan の queued/service 由来の一般調査や恒久対策検討には踏み込まない。

---

# 実施ステップ（チェックボックス）

- [ ] 既存 active plan を参照し、今回スコープを **rerun と次 blocker 切り分け限定** で固定する
- [ ] `.github/workflows/night-batch-self-hosted.yml` の dispatch 条件・対象 job・観測ポイントを再確認する
- [ ] `gh` で対象 workflow を再実行し、新しい run ID を取得する
- [ ] run / job の状態遷移を監視し、`omtv-win-01` に割り当たるか確認する
- [ ] `Install dependencies in WSL workspace` が通過するかを確認する
- [ ] 失敗した場合、failed step logs・job logs・run metadata を取得する
- [ ] 失敗点を以下のどの層かに分類する
  - runner 割当
  - WSL 呼び出し
  - 依存インストール
  - Windows wrapper
  - Python 実行本体
  - テスト/後続 step
- [ ] **次 blocker を 1 件だけ** 特定し、再現条件・証拠・影響範囲を整理する
- [ ] 修正が必要な場合だけ、対象ファイル候補と最小修正案を列挙する
- [ ] 今回の rerun 結果を「成功 / 失敗（次 blocker 名）」のどちらかで確定する

---

# TDD / テスト戦略

今回は主タスクが **workflow rerun による運用確認** のため、まず実行観測を優先する。  
ただし、次 blocker がコード/設定変更を要する場合は **RED → GREEN → REFACTOR** を厳守する。

## RED
- まず workflow を再実行し、実際の失敗 step / エラーを固定する
- 必要なら既存テストまたは最小追加テストで failure を再現する

## GREEN
- 次 blocker に対する最小修正で既存テストまたは対象 step を通す
- workflow / ローカル既存コマンドで再確認する

## REFACTOR
- 通過確認後に不要な複雑化がないか見直す
- 変更は最小限に留め、無関係な整理はしない

## テスト方針
- ユーティリティ変更ならユニットテスト
- workflow / 実行経路変更なら既存 integration 相当の確認を優先
- 重要フローは GitHub Actions 上の rerun 結果を最終エビデンスとする

---

# 実行する既存コマンド / 検証方法

## GitHub Actions / gh
- `gh workflow run .github/workflows/night-batch-self-hosted.yml -f config_path=config/night_batch/bundle-detached-reuse-config.json`
- `gh run list --workflow night-batch-self-hosted.yml`
- `gh run watch <run-id>`
- `gh run view <run-id>`
- `gh run view <run-id> --log-failed`
- `gh api repos/FPXszk/Oh-MY-TradingView/actions/runs/<run-id>`
- `gh api repos/FPXszk/Oh-MY-TradingView/actions/runs/<run-id>/jobs`

## 必要時のみ行う既存ローカル検証
- `npm ci --silent`
- `node --test tests/night-batch.test.js`
- `python3 python/night_batch.py smoke-prod --config config/night_batch/bundle-detached-reuse-config.json --round-mode resume-current-round`

## 成功判定
- job が `omtv-win-01` に割り当たる
- `Install dependencies in WSL workspace` を通過する
- workflow 全体が成功、または少なくとも **WSL 可視性問題が再発しない**

## 失敗時の検証観点
- 失敗 step 名
- step の標準出力 / エラー出力
- runner 名 / job metadata
- 直前 step との差分
- run.cmd 起動で改善した点と、まだ残っている次 blocker

---

# リスク

- `run.cmd` 起動後でも runner 状態が一時的で、結果が再現不安定な可能性がある
- `wsl.exe` 問題が解消しても次の blocker が別層で顕在化する可能性がある
- Linux 側からのローカル再現では Windows/WSL 境界の不具合を完全一致で再現できない可能性がある
- self-hosted runner の同時実行状況により結果がぶれる可能性がある
- 既存 active plan と調査対象が近いため、範囲を広げると重複作業になりやすい

---

# 期待成果物

- 新しい workflow run ID
- rerun の結果サマリ
- `Install dependencies in WSL workspace` が通過したかどうかの判定
- 失敗した場合は **次 blocker 1 件** の証拠付き切り分け
- 修正が必要な場合の最小修正対象ファイル一覧
