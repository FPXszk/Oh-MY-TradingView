# 最新 Night Batch Workflow 確認・サマリー・ランキング計画

作成日時: 2026-04-22 20:31 JST

## 目的

最新の `Night Batch Self Hosted` workflow run を確認し、成功/失敗を artifact ベースで判定したうえで、前回と同粒度の結果サマリーを `docs/reports/` に追加または更新し、その内容を commit / push する。あわせて、今回確認できる根拠に基づいて「何が強かったか」をランキングで整理する。

## 現状整理

- 既存の最新成功レポートは `docs/reports/night-batch-self-hosted-run17.md`
- 比較用の既存メモとして `docs/reports/night-batch-public-vs-strongest.md` がある
- `docs/reports/public-top10-us-40x10-final-400run.md` では、前回と同粒度の「何が強かったか」整理が実施されている
- 現在の作業ツリーには未追跡の active plan が複数あるため、それらは触らず今回の plan と成果物だけを扱う

## 変更・確認対象ファイル

### 作成

- `docs/exec-plans/active/latest-night-batch-workflow-summary-and-ranking_20260422_2031.md`
- 必要に応じて `docs/reports/night-batch-self-hosted-run<latest>.md`

### 更新候補

- `docs/reports/README.md`
- 本 plan ファイルを完了時に `docs/exec-plans/completed/latest-night-batch-workflow-summary-and-ranking_20260422_2031.md` へ移動

### 調査対象

- `docs/reports/night-batch-self-hosted-run17.md`
- `docs/reports/public-top10-us-40x10-final-400run.md`
- `docs/reports/night-batch-public-vs-strongest.md`
- `.github/workflows/night-batch-self-hosted.yml`

## 実装内容と影響範囲

- GitHub Actions の最新 `Night Batch Self Hosted` run を `gh` で確認する
- run conclusion だけでなく artifact summary / ranking artifact を確認し、workflow 成否と backtest 成否を切り分けて記録する
- 前回レポートと同粒度の Markdown レポートを `docs/reports/` に追加する
- 確認できたデータ範囲で「何が強かったか」のランキングを記載する
- 必要最小限で `docs/reports/README.md` の最新ファイル案内を更新する
- 最後に plan を completed へ移動し、関連差分のみ Conventional Commits で commit / push する

## スコープ

### 含む

- 最新 workflow run の確認
- artifact / summary / ranking の読み取り
- レポート Markdown 更新
- ランキング記載
- commit / push

### 含まない

- workflow YAML や backtest ロジック自体の修正
- campaign / strategy catalog の改変
- 既存の他 active plan の整理

## TDD / テスト戦略

- 今回は主にドキュメント更新と run 確認が中心のため、原則としてコード変更は行わない
- もし summary 生成補助や report index の不整合修正が必要になった場合のみ、RED -> GREEN -> REFACTOR で関連テストを最小追加する
- 変更後は少なくとも `git status --short` と差分レビューで対象範囲を確認する

## 検証コマンド候補

- `gh run list --workflow night-batch-self-hosted.yml --limit 5`
- `gh run view <latest_run_id>`
- `gh run download <latest_run_id>`
- `git status --short`
- 必要なら `git diff --stat`

## リスク / 注意点

- workflow conclusion と artifact 内の backtest 結果を混同すると誤った結論になる
- ranking は参照できた artifact / 既存レポートに依存するため、評価軸が限定的ならその制約を明記する必要がある
- 他の未追跡 active plan を誤って commit しないよう、差分を限定して扱う
- 最新 run が失敗していた場合、push 対象は「失敗レポートの記録」までであり、修正実装は別計画に切り出す

## 実装ステップ

- [ ] `gh` で最新 `Night Batch Self Hosted` run を特定し、workflow conclusion / job 情報 / artifact 有無を確認する
- [ ] artifact summary と ranking 関連ファイルを確認し、前回と同粒度で記録すべき項目を確定する
- [ ] `docs/reports/` に最新 run の Markdown サマリーを追加または更新する
- [ ] 「何が強かったか」を、今回確認できる根拠に基づくランキングとして記載する
- [ ] 必要なら `docs/reports/README.md` を更新する
- [ ] レビューして表現と根拠の整合性を確認する
- [ ] plan を `docs/exec-plans/completed/` に移動し、関連差分のみ commit / push する

## 完了条件

- 最新 workflow が成功しているかを、workflow conclusion と artifact summary の両面から説明できる
- 前回と同粒度の run サマリーが `docs/reports/` に残る
- 「何が強かったか」のランキングを、根拠付きで説明できる
- 対象差分だけが commit / push され、他の active plan は巻き込まれていない
