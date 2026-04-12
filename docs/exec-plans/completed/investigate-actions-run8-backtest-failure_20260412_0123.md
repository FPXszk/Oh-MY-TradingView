# GitHub Actions「8」バックテスト失敗調査・対策提案 計画

- **plan名**: `investigate-actions-run8-backtest-failure_20260412_0123.md`
- **配置先**: `docs/exec-plans/active/investigate-actions-run8-backtest-failure_20260412_0123.md`
- **重複確認**: 既存 active plan は self-hosted runner / night-batch の運用系が中心であり、本計画は **対象 Actions 実行「8」の完了状況確認・失敗原因調査・対策提示** に限定するため、直接の重複はありません。ただし `night-batch-self-hosted` workflow が対象だった場合は文脈上の関連があります。

## 1. 変更・削除・作成するファイル

- **原則コード変更なし**
- **作成**
  - `docs/exec-plans/active/investigate-actions-run8-backtest-failure_20260412_0123.md`
- **変更なし**
  - アプリケーションコード
  - workflow 定義
  - テストコード
- **削除なし**

> 本タスクはまず調査と対策案提示が目的です。修正実装はユーザー承認後の別ステップで扱います。

## 2. 実施内容と影響範囲

### 目的

GitHub Actions の「8」で指されている対象実行について、以下を明らかにします。

1. **その実行はバックテスト完了まで到達したか**
2. **どの job / step で止まったか**
3. **失敗の直接原因・再発条件は何か**
4. **実行可能な対策案を短期 / 中期でどう分けるか**

### 想定対象

- `.github/workflows/night-batch-self-hosted.yml`
- 関連する self-hosted runner 実行環境
- backtest を呼び出す CLI / script / 実行 step
- 必要に応じて artifacts / logs / workflow metadata

### 影響範囲

- **調査対象**: GitHub Actions run / jobs / logs / artifacts / workflow 定義
- **今回含まない**: コード修正、runner 設定変更、workflow 変更、再実行、コミット

## 3. 調査ステップ

- [ ] **対象特定**
  - [ ] 「actionsの8」が **workflow run number / run attempt / job 番号 / UI上の並び順** のどれかを切り分ける
  - [ ] 対象 workflow と run id を確定する
  - [ ] 実行ブランチ、commit SHA、event、開始/終了時刻を確認する

- [ ] **完了状況確認**
  - [ ] run 全体の `status` / `conclusion` を確認する
  - [ ] 全 job の `status` / `conclusion` を確認する
  - [ ] backtest 実行 step まで進んだか、途中の前段 step で停止したかを確認する
  - [ ] artifacts や出力ログから、バックテスト結果が生成された形跡の有無を確認する

- [ ] **失敗箇所の一次調査**
  - [ ] 失敗 job の要約を取得する
  - [ ] 失敗 step の前後ログを確認する
  - [ ] self-hosted runner 特有の要因（runner offline / port競合 / GUI依存 / CDP疎通 / TradingView起動失敗 / timeout）を切り分ける
  - [ ] 失敗が workflow 定義ミスか、環境依存か、アプリ側エラーかを分類する

- [ ] **原因整理**
  - [ ] 直接原因を 1〜2 個に絞って整理する
  - [ ] 根本原因候補と再発条件を整理する
  - [ ] 「途中で失敗」の具体的な停止地点をユーザー向けに簡潔に言語化する

- [ ] **対策案作成**
  - [ ] **短期対策**（運用回避・再実行条件・事前確認）を提示する
  - [ ] **中期対策**（workflow 改善・ログ強化・リトライ戦略・事前ヘルスチェック）を提示する
  - [ ] 各対策に対して、期待効果と副作用/コストを添える

- [ ] **最終報告**
  - [ ] 「完了したか / していないか」を明言する
  - [ ] 失敗原因の根拠ログを添えて報告する
  - [ ] 推奨対策を優先順位付きで提示する

## 4. テスト / 検証方針

> 本タスクはコードテストではなく、**GitHub Actions 実行の事実確認**を検証とします。

### 検証観点

- 対象 run の `status` と `conclusion`
- 対象 run に紐づく job 一覧と失敗 job
- 失敗 job の step ログ
- 必要に応じた artifacts と workflow 定義の整合

### 確認手順

- [ ] workflow 一覧から対象 workflow を特定する
- [ ] 対象 workflow の run 一覧から「8」に該当する run を特定する
- [ ] 対象 run の詳細を確認する
- [ ] 対象 run の job 一覧を確認する
- [ ] 失敗 job のログ要約を確認する
- [ ] 必要に応じて失敗 job の生ログを確認する
- [ ] 必要に応じて artifacts の有無を確認する
- [ ] workflow 定義 (`.github/workflows/night-batch-self-hosted.yml`) と照合し、どの step が該当するか対応付ける

### 期待する判定

- **完了**: backtest 実行 step が完走し、結果出力または成功 conclusion が確認できる
- **未完了**: backtest 実行前に失敗、または backtest 実行中に失敗し、結果生成が確認できない
- **要追加確認**: ログ欠落・artifacts 欠落・「8」の指し先曖昧で run 特定不能

## 5. out-of-scope

- workflow / runner / アプリコードの即時修正
- GitHub Actions の再実行
- self-hosted runner の再起動や設定変更
- docs 以外の永続ファイル変更
- コミット / push
- 複数 run を横断した大規模な安定性改善

## 6. リスク

- **「8」の意味が曖昧**で、最初に対象特定が必要
- self-hosted runner 由来の失敗は、**その時点のマシン状態依存**で再現ログだけでは断定しづらい
- GitHub 上のログ保持期間や artifact 保持期間の都合で、**根拠が不足**する可能性がある
- backtest は TradingView / CDP / GUI 状態に影響されるため、workflow 定義だけではなく **外部依存** を含めた解釈が必要
- 既存 active plan が扱う night-batch 文脈と関連するため、**運用上の既知課題**と今回固有の失敗を混同しないよう注意が必要

## 7. 完了条件

- 対象 GitHub Actions 実行「8」の run を特定できている
- バックテスト完了有無を明言できている
- 失敗 job / step / 根拠ログを示せている
- 原因を分類して説明できている
- 実行可能な対策案を優先順位付きで提示できている

## 8. 成果物

- ユーザー向け調査報告
  - 完了状況
  - 失敗原因
  - 根拠ログ
  - 対策案（短期 / 中期）
- durable plan
  - `docs/exec-plans/active/investigate-actions-run8-backtest-failure_20260412_0123.md`
