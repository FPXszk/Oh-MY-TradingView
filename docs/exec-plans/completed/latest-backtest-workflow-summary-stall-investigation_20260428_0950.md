# 最新バックテストワークフロー要約と途中停止原因調査計画

作成日時: 2026-04-28 09:50 JST

## 目的

最新のバックテストワークフロー `Night Batch Self Hosted` の実行結果を確認し、`docs/research/TEMPLATE.md` に従って前回と同粒度の研究メモへまとめる。  
あわせて、途中で止まって見える原因を GitHub Actions run / log / artifact / workflow 定義から調査し、必要なら最小修正まで行ったうえで commit / push する。

## 現時点で確認できている事実

- 最新 run は `25005861669`
- workflow は `Night Batch Self Hosted`
- status は `cancelled`
- `start-night-batch` job が `6h0m13s` 実行され、GitHub Actions の最大実行時間超過で停止した
- 直近成功 run は `24976536910` で、対応する既存まとめは `docs/research/night-batch-self-hosted-run70_20260427.md`

## 前提・確認事項

- 最新 run を `run71` 相当として扱い、研究メモの新規作成先は `docs/research/night-batch-self-hosted-run71_20260428.md` を第一候補とする
- 最新 run に full artifact が残っていない場合は、残存 artifact / workflow summary / log から取得できる範囲を `FAILED` または `CANCELLED` と明記して記録する
- 途中停止の調査では、まず原因特定を優先し、根本修正が明確かつ小さい場合のみ workflow / script を修正する
- `docs/exec-plans/active/repo-structure-align-and-archive-rules_20260424_2015.md` は別件であり、本タスクの対象ファイルと直接は重ならない前提で進める

## 変更・作成・更新するファイル

### 作成

- `docs/exec-plans/active/latest-backtest-workflow-summary-stall-investigation_20260428_0950.md`
- `docs/research/night-batch-self-hosted-run71_20260428.md`

### 更新候補

- `docs/research/manifest.json`
- `docs/research/artifacts-backtest-scoreboards.md`
- `.github/workflows/night-batch-self-hosted.yml`
- `scripts/windows/github-actions/append-night-batch-workflow-summary.ps1`
- `scripts/windows/github-actions/find-night-batch-outputs.ps1`
- `scripts/windows/github-actions/write-night-batch-live-checkout-baseline.ps1`
- `tests/windows-run-night-batch-self-hosted.test.js`

### 調査対象

- `docs/research/TEMPLATE.md`
- `docs/research/night-batch-self-hosted-run70_20260427.md`
- `docs/exec-plans/completed/run70-results-summary-and-wsl-artifact-manifest_20260427_2037.md`
- `.github/workflows/night-batch-self-hosted.yml`
- `scripts/windows/github-actions/`
- GitHub Actions run `25005861669` の summary / job log / artifact
- 必要なら直近成功 run `24976536910` の artifact / log

### 完了時に移動

- `docs/exec-plans/active/latest-backtest-workflow-summary-stall-investigation_20260428_0950.md`
- 移動先: `docs/exec-plans/completed/latest-backtest-workflow-summary-stall-investigation_20260428_0950.md`

## 実装内容と影響範囲

- 最新 run の status、artifact、ranking、recovered summary、recovered results の有無を確認する
- `TEMPLATE.md` の必須セクションに沿って、最新 run の研究メモを新規作成する
- latest が失敗 run の場合でも、取得できた数値と不足している数値を明示して記録する
- 途中停止の原因を log と workflow 定義から絞り込み、単なる 6 時間超過なのか、途中で進捗が止まったのか、artifact 生成前に詰まったのかを切り分ける
- 原因が repo 内修正で改善可能なら、workflow か補助 script に最小変更を入れる
- 研究メモの current 導線が必要なら `manifest.json` と scoreboard を最小差分で更新する

## スコープ

### 含む

- 最新 workflow run の事実確認
- `TEMPLATE.md` 準拠の latest research doc 作成
- 途中停止原因の調査と根拠整理
- repo 内で完結する最小修正
- review 後の commit / push

### 含まない

- 新規 backtest の再実行
- strategy preset / campaign の追加や大規模改修
- 無関係な docs 整理
- 原因が GitHub runner / 外部環境依存のみで repo 修正不能な場合の過剰な回避実装

## TDD / テスト戦略

- ドキュメント更新のみで終わる場合はコード変更なしとして扱う
- workflow / script / test 修正が必要な場合のみ RED -> GREEN -> REFACTOR で進める
- RED: 既存 test または追加 test で再現条件を先に固定する
- GREEN: 最小修正で通す
- REFACTOR: 追加した差分の重複や可読性だけ整える

## 検証コマンド候補

- `gh run view 25005861669`
- `gh run view 25005861669 --job 73228311008 --log`
- `gh run download 25005861669`
- `gh run download 24976536910`
- `git diff -- docs/research .github/workflows scripts/windows/github-actions tests/windows-run-night-batch-self-hosted.test.js`
- `node --test tests/windows-run-night-batch-self-hosted.test.js`
- `git status --short`

## リスク / 注意点

- 最新 run が cancelled のため、`TEMPLATE.md` の全項目を artifact だけで埋められない可能性がある
- workflow の停止原因が repo ではなく GitHub Actions の時間上限や self-hosted runner 側の状態である場合、修正ではなく原因記録に留まる可能性がある
- `docs/research/manifest.json` は current keep-set に影響するため、必要時のみ変更する
- 既存の run70 まとめは成功 run ベースで完全なため、run71 失敗結果と混同しないように status と根拠を明示する

## 実装ステップ

- [ ] 最新 run `25005861669` の summary / log / artifact の所在を確定する
- [ ] `TEMPLATE.md` で要求される項目のうち、最新 run から埋められる範囲と不足範囲を切り分ける
- [ ] `docs/research/night-batch-self-hosted-run71_20260428.md` を作成し、latest run の結果と失敗状態を記録する
- [ ] 途中停止の原因を workflow 定義と job log から特定し、必要なら直近成功 run と比較する
- [ ] repo 内修正で改善可能なら workflow / script / test を最小差分で更新する
- [ ] 数値、status、参照 run id、原因記述の整合性をレビューする
- [ ] plan を `docs/exec-plans/completed/` に移動する
- [ ] Conventional Commit で commit し、`main` に push する

## 完了条件

- 最新 workflow run の結果が `TEMPLATE.md` 準拠で研究メモ化されている
- 途中停止の原因が根拠付きで説明できる
- 修正を入れた場合は最小差分で検証まで完了している
- plan が completed に移動し、対象差分のみが commit / push されている
