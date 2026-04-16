# 背景 / 目的

GitHub Actions の workflow run `24246536524`（`Night Batch Self Hosted`）が `queued` のまま進まない原因を、GitHub Actions UI と `gh api` / GitHub API で取得できる事実に基づいて切り分ける。  
対象ジョブは `start-night-batch`、`runs-on: [self-hosted, windows]`、job `70794233338` は `queued`、`runner_id=0` / `runner_name=''` のため、現時点では runner 未割り当てとみなす。  
目的は、`queued` の主要因を一つずつ除外し、最も妥当な根本原因候補を証拠付きで特定することである。

# 変更・削除・作成するファイル

- 作成: `docs/exec-plans/active/investigate-night-batch-self-hosted-queued_20260410_2307.md`
- 参照: `.github/workflows/night-batch-self-hosted.yml`

# 調査対象ファイル・外部リソース

## リポジトリ内ファイル
- `.github/workflows/night-batch-self-hosted.yml`

## GitHub Actions UI
- Workflow run `24246536524`
- Job `70794233338`
- Repository / Organization の self-hosted runner 一覧
- Runner group / access policy 設定画面
- Environment / protection rules / deployment gate 関連画面（該当時）

## GitHub API / `gh api`
- `repos/FPXszk/Oh-MY-TradingView/actions/runs/24246536524`
- `repos/FPXszk/Oh-MY-TradingView/actions/runs/24246536524/jobs`
- `repos/FPXszk/Oh-MY-TradingView/actions/workflows/night-batch-self-hosted.yml`
- `repos/FPXszk/Oh-MY-TradingView/actions/runners`
- `orgs/FPXszk/actions/runners`
- `orgs/FPXszk/actions/runner-groups`
- runner group の repository access / runner 紐付け取得 API
- 必要時: concurrency / environment / deployment / protection rule 関連メタデータ取得 API

# スコープ

## In Scope
- GitHub 側メタデータで判定できる `queued` 要因の切り分け
- workflow / job / runner / runner group / access policy / label / concurrency / environment gate の確認
- repo-level / org-level self-hosted runner の割当可能性確認
- `gh api` で取得可能な runner メタデータと UI 表示の突合

## Out of Scope
- runner ホスト内部の詳細調査（OS ログ、サービス再起動、ネットワーク診断）
- workflow 修正、runner 設定変更、権限変更などの実施
- 恒久対策の実装詳細
- GitHub Enterprise 管理者権限が必要な設定変更そのもの

# 具体的な調査手順

1. **run / job 基本メタデータを固定化する**  
   - 何を確認するか: run status / event / workflow path / head SHA / actor / job status / labels / runner_id / runner_name  
   - 証拠: run API、jobs API、Actions UI  
   - 切り分け: まず「未割当の queued job」であることを事実として固定し、以後の調査条件をぶらさない。

2. **workflow 定義上の待機要因を洗い出す**  
   - 何を確認するか: `runs-on`、`concurrency`、`environment`、`needs`、conditional、reusable workflow 呼び出し有無  
   - 証拠: `.github/workflows/night-batch-self-hosted.yml` の定義  
   - 切り分け: runner 不在以外に、定義上 queue 待ちを生みうる要素があるかを先に確認する。

3. **matching runner 不在を第一候補として検証する**  
   - 何を確認するか: repo/org に `self-hosted` かつ `windows` ラベルを持つ runner が存在するか  
   - 証拠: repo-level / org-level runner 一覧 API、UI 上の labels / status  
   - 切り分け: 1 台も該当しなければ、原因候補は「ラベル一致 runner 不在」に強く収束する。

4. **runner offline を検証する**  
   - 何を確認するか: 一致する runner が存在しても `offline` / `not connected` ではないか  
   - 証拠: runner status、last seen 相当情報、UI 表示  
   - 切り分け: 一致 runner が全台 offline なら、「存在するが利用不可」と判定する。

5. **runner busy / capacity不足 を検証する**  
   - 何を確認するか: 一致 runner が online でも他 job 実行中で空きがないか  
   - 証拠: runner busy 状態、同時刻の他 workflow runs / jobs、UI の稼働状況  
   - 切り分け: online runner があるのに未割当なら、capacity不足か access 不可を疑う。

6. **label 不一致を詳細確認する**  
   - 何を確認するか: `windows` が期待どおりの custom/default label として runner に付与されているか、大小文字・追加ラベル前提がないか  
   - 証拠: workflow 定義、runner labels API  
   - 切り分け: `self-hosted` はあるが `windows` が無い、または別ラベル構成なら不一致と判定する。

7. **repo-level / org-level runner access の到達性を確認する**  
   - 何を確認するか: 該当 runner が repository から利用許可されているか  
   - 証拠: runner group 設定、group に紐づく repositories 一覧、repo allowed policy  
   - 切り分け: runner 自体は存在・online でも repo から見えないなら access policy 起因と判断する。

8. **runner group 制約を確認する**  
   - 何を確認するか: runner group が限定 repo のみ許可、または対象 repo 未追加ではないか  
   - 証拠: runner group API / UI、group 配下 runner 一覧、allowed repositories  
   - 切り分け: labels 一致 runner が group 内にあっても repo 未許可なら割当不可と判定する。

9. **workflow / repository 側の concurrency 待ちを確認する**  
   - 何を確認するか: 同一 concurrency group の in_progress / queued run が先行していないか  
   - 証拠: workflow 定義、同 workflow / 同 branch / 同 group の run 一覧  
   - 切り分け: runner 問題ではなく concurrency gate で待機している可能性を除外・特定する。

10. **environment / protection rule / approval 待ちを確認する**  
    - 何を確認するか: job が environment 承認、deployment protection、branch / policy gate を待っていないか  
    - 証拠: workflow 定義、run UI、environment 設定  
    - 切り分け: UI 上の待機理由が approval 系なら runner 問題と切り分ける。

11. **org / enterprise policy 起因の制約を確認する**  
    - 何を確認するか: self-hosted runner 利用制限、repository 許可ポリシー、disabled workflow / policy block の痕跡  
    - 証拠: repo/org 設定、取得可能な policy メタデータ、UI メッセージ  
    - 切り分け: runner は正常でもポリシーで配車不可なら、その層の制約として整理する。

12. **最終判定を evidence table 化する**  
    - 何を確認するか: 各候補に対して「確認結果」「根拠 API/UI」「除外/有力」の結論  
    - 証拠: 上記手順で集めたレスポンスと UI 表示  
    - 切り分け: 推測で終わらせず、取得済み証拠だけで最有力原因を明示する。

# 検証・エビデンスソース

- GitHub Actions UI の run / job 詳細表示
- `gh api` による workflow run / job / runner / runner group / repository access メタデータ
- `.github/workflows/night-batch-self-hosted.yml` の定義
- 必要時の関連 run 一覧、同時刻の queued / in_progress job 情報
- 取得した JSON と UI 表示の突合結果

# リスク / 制約

- org / enterprise 設定は権限不足で一部 API が取得できない可能性がある。
- queued 理由の一部は UI 上の文言が最も明確で、API 単独では説明不足のことがある。
- runner ホスト内部の故障は GitHub 側メタデータだけでは断定できない。
- `workflow_dispatch` 実行時点の一過性状態（短時間 offline / busy）は事後調査で再現できない場合がある。
- 本調査は「証拠で除外・特定する」ことが目的であり、設定変更や修復作業は扱わない。

# チェックボックス形式のタスクリスト

- [ ] run `24246536524` と job `70794233338` の基本メタデータを取得し、未割当 queued を固定化する
- [ ] `.github/workflows/night-batch-self-hosted.yml` を確認し、`runs-on` / `concurrency` / `environment` / `needs` を整理する
- [ ] repo-level self-hosted runners を取得し、`self-hosted` + `windows` 一致 runner の有無を確認する
- [ ] org-level self-hosted runners を取得し、同条件の runner の有無を確認する
- [ ] 一致 runner の online/offline/busy 状態を確認する
- [ ] runner labels の不一致有無を確認する
- [ ] runner group と repository access の関係を確認する
- [ ] concurrency による待機の有無を確認する
- [ ] environment / protection / approval 待ちの有無を確認する
- [ ] org / enterprise policy 起因の制約有無を確認する
- [ ] 各候補を evidence table で整理し、除外済み / 有力候補を明示する
- [ ] 最終結論として「最も妥当な queued 要因」を証拠付きでまとめる
