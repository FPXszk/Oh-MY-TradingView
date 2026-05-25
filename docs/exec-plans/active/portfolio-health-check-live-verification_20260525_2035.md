# portfolio-health-check-live-verification_20260525_2035

## 概要

目的: `Portfolio Health Check` workflow を実機で 2 通り dispatch し、`enable_sbi=false` と `enable_sbi=true` の両方が実際に完走するか、またはどこで失敗するかを確認する。

- 対象 workflow: `.github/workflows/portfolio-health-check.yml`
- 検証観点:
  - default 実行で moomoo-only path が成立するか
  - `enable_sbi=true` 実行で moomoo -> SBI(optional) path が成立するか
  - artifact / summary / conclusion が期待どおりか

## 変更ファイル

- 追加: `docs/exec-plans/active/portfolio-health-check-live-verification_20260525_2035.md`

## 実行方針

- GitHub self-hosted runner の online / busy 状態を確認する
- `Portfolio Health Check` を default input で dispatch し、完了まで監視する
- 続けて `enable_sbi=true` で dispatch し、完了まで監視する
- 各 run の jobs / steps / conclusion / URL を採取し、必要なら失敗 step を特定する
- 実装変更は行わず、必要なら結果だけを報告する

## 範囲

### In scope

- workflow_dispatch の live 実行
- run result / job status / failure location の確認
- artifact 有無と summary の確認

### Out of scope

- workflow 修正
- runner / Windows 環境の恒久対策
- SBI / moomoo のログイン状態調整

## 実装ステップ

- [ ] runner 状態と workflow 定義を確認する
- [ ] default (`enable_sbi=false`) run を dispatch して完了まで追う
- [ ] `enable_sbi=true` run を dispatch して完了まで追う
- [ ] 各 run の conclusion と失敗 step を整理する

## テスト戦略

- default run: `Portfolio Health Check` を input 未指定で起動
- SBI enabled run: `Portfolio Health Check` を `enable_sbi=true` で起動
- どちらも GitHub Actions run URL と job conclusion で判定する

## 検証コマンド

- `gh workflow run "Portfolio Health Check" --ref main`
- `gh workflow run "Portfolio Health Check" --ref main --field enable_sbi=true`
- `gh run watch <run-id>`
- `gh run view <run-id> --json status,conclusion,jobs,url`

## リスク・注意点

- `enable_sbi=true` は SBI 側のログイン済み Chrome / CDP 状態に依存する
- self-hosted runner は 1 台なので、2 本を並列ではなく直列で流す
- live run が repo 出力を publish するため、成功時は `main` に report 更新 commit が発生しうる

## 完了条件

- default run の成否が確認できる
- `enable_sbi=true` run の成否が確認できる
- 各 run の URL / conclusion / failure point を報告できる
