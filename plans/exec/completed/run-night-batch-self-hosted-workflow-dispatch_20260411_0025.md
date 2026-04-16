# Exec Plan: run-night-batch-self-hosted-workflow-dispatch_20260411_0025

## 1) 変更/作成/削除するファイル

- 作成: `docs/exec-plans/active/run-night-batch-self-hosted-workflow-dispatch_20260411_0025.md`
- 変更予定なし: plan file 以外の repository file は現時点で変更しない
- 削除予定なし

## 2) 実施内容と影響範囲

`.github/workflows/night-batch-self-hosted.yml` を `workflow_dispatch` で実行し、run / job の進行を監視する。  
失敗時は GitHub Actions の job logs と、必要最小限のローカル確認で原因を切り分け、**修正実施ではなく**「どこで失敗したか」「再現するか」「次に直すならどこか」を整理する。  
影響範囲は GitHub Actions run、self-hosted Windows runner、`npm ci`、`scripts/windows/run-night-batch-self-hosted.cmd`、必要に応じて `python/night_batch.py` と `tests/night-batch.test.js` 周辺の確認までに限定する。

## 3) チェックボックス形式の実施ステップ

- [ ] `.github/workflows/night-batch-self-hosted.yml` と既定 config / 起動 wrapper を確認し、dispatch 引数・観測ポイント・成功条件を固定する
- [ ] `gh workflow run .github/workflows/night-batch-self-hosted.yml` で `config_path=config/night_batch/bundle-detached-reuse-config.json` を指定して手動実行する
- [ ] `gh run list` / `gh run watch` / `gh run view` で対象 run を特定し、job ごとの状態遷移を記録する
- [ ] 成功した場合は、完了 job・実行時間・主要 step 結果を要約し、追加修正不要かを確認する
- [ ] 失敗した場合は、failed job logs / step logs を取得し、失敗点を `npm ci`・runner 割当・wrapper 実行・Python 実行・detached state 衝突などの層に切り分ける
- [ ] 必要に応じてローカルで既存コマンドのみ再実行し、GitHub 上の失敗がローカル再現か runner 固有かを確認する
- [ ] 証拠ベースで原因候補を整理し、コード修正が必要なら対象ファイルと修正方針の最小案までまとめる

## 4) テスト/検証戦略（RED→GREEN→REFACTOR を実行観測へ置換）

- **RED 相当: 実行開始**
  - `workflow_dispatch` を起動し、まず実際の run がどう失敗/待機/成功するかを観測する
  - 期待と違う挙動が出た時点で、その時点の run / job / step を failure signal として固定する
- **GREEN 相当: 原因切り分け**
  - failed logs とローカル確認で、失敗が再現する最小条件を特定する
  - 「workflow 設定」「runner 状態」「依存解決」「wrapper」「Python 本体」のどこで止まるかを確定させる
- **REFACTOR 相当: 次アクション整理**
  - 今回は原則コード変更しない
  - 修正が必要なら、次フェーズで追加するテスト・変更ファイル・検証コマンドを最小単位で提案に落とす

## 5) 使用する既存コマンド/ツール

- GitHub / CLI
  - `gh workflow run .github/workflows/night-batch-self-hosted.yml -f config_path=config/night_batch/bundle-detached-reuse-config.json`
  - `gh run list --workflow night-batch-self-hosted.yml`
  - `gh run watch <run-id>`
  - `gh run view <run-id> --log-failed`
  - `gh api repos/FPXszk/Oh-MY-TradingView/actions/runs/<run-id>`
  - `gh api repos/FPXszk/Oh-MY-TradingView/actions/runs/<run-id>/jobs`
- ローカル確認
  - `npm ci --silent`
  - `node --test tests/night-batch.test.js`
  - `python3 python/night_batch.py smoke-prod --config config/night_batch/bundle-detached-reuse-config.json --round-mode resume-current-round`
  - 参照用: `scripts\\windows\\run-night-batch-self-hosted.cmd config\\night_batch\\bundle-detached-reuse-config.json`

## 6) リスク

- self-hosted Windows runner の online/offline / busy 状態により、結果が一過性になる可能性がある
- detached state が `running` のままだと manual dispatch 自体は通っても本体起動が拒否される可能性がある
- Linux 側ローカル確認だけでは Windows runner / WSL 境界の問題を完全再現できない可能性がある
- `npm ci` / Python 実行の失敗が環境差分由来だと、GitHub 側 failure と 1:1 で一致しない可能性がある
- 既存 active plan と観測対象が重複しており、同時進行すると記録が二重化する

## 7) 既存 active plan との衝突観点

- 既存 active plan: `docs/exec-plans/active/investigate-night-batch-self-hosted-queued_20260410_2307.md`
- 衝突点:
  - どちらも `.github/workflows/night-batch-self-hosted.yml` と self-hosted runner 状態を扱う
  - queued / runner 未割当の原因調査は今回の失敗切り分けに内包されうる
- 整理方針:
  - 既存 plan は「queued 原因調査」の参照資料として扱う
  - 今回は「実際に dispatch 実行して end-to-end で観測する」ことを主目的にし、run 開始後の事実を優先する
  - 実装フェーズに進む前に、2 本の active plan を統合するか、古い方を completed/廃止扱いにするかを明示して重複作業を避ける
