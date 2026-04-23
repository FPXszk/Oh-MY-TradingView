# Night Batch 接続成功までの再試行計画

作成日時: 2026-04-23 09:24 JST

## 目的

push 済みの `main` (`4cc9313`) を対象に `Night Batch Self Hosted` workflow を繰り返し再実行し、`Wait for TradingView connection (required gate)` が実際に成功して先へ進むことを確認する。今回は dispatch、監視、接続成功確認、必要に応じた再試行までを対象とし、コード修正は含めない。

## 既存 active plan との関係

- 先ほどの単発確認 plan は本計画に置き換える
- 現在の active plan は本計画のみ

## 変更・削除・作成するファイル

- 作成: `docs/exec-plans/active/retry-until-tradingview-connection-succeeds_20260423_0924.md`

## 確認対象ファイル・対象物

- 確認: GitHub Actions `Night Batch Self Hosted`
- 確認: 再試行した各 run
- 確認: 接続関連 step
  - `Ensure TradingView is running`
  - `Readiness diagnostics (non-blocking)`
  - `Wait for TradingView connection (required gate)`
  - `Run smoke gate and foreground production`

## スコープ

### 実施すること

- `HEAD` と `origin/main` が一致していることを確認する
- `Night Batch Self Hosted` を再実行する
- 各 run を監視し、接続必須ゲートの成否を確認する
- 接続必須ゲートが失敗した場合は、原因メモを残して再試行する
- 少なくとも 1 run で接続必須ゲート成功と後続 step 進行を確認する
- 結果を run id 単位で報告する

### 実施しないこと

- workflow / code / config の追加修正
- 別 workflow の調査
- 成功確認後の不要な追加 dispatch

## 実装内容と影響範囲

- GitHub Actions 上で `Night Batch Self Hosted` を必要回数再実行する
- 主な確認点:
  - dispatch 対象 SHA が `4cc9313` であること
  - `Wait for TradingView connection (required gate)` が success になること
  - `Run smoke gate and foreground production` に到達すること
  - 失敗時はどの step で止まったかを記録すること

## TDD / 検証戦略

今回は運用確認タスクであり、修正実装は前提にしない。

### RED

- 直近の run で接続ゲートが長時間待機または失敗する可能性を既知の失敗事実として扱う

### GREEN

- 最新 `main` で dispatch した run の少なくとも 1 回で、接続必須ゲート成功と後続 step 進行を確認する

### REFACTOR

- 本計画の範囲外

### カバレッジ方針

- 運用確認のため coverage 対象外

## 想定コマンド

```bash
gh workflow run night-batch-self-hosted.yml -f config_path=config/night_batch/bundle-foreground-reuse-config.json
```

```bash
gh run list --workflow night-batch-self-hosted.yml --limit 10
```

```bash
gh run watch <run-id>
```

```bash
gh api repos/FPXszk/Oh-MY-TradingView/actions/runs/<run-id>/jobs
```

## リスク / 注意点

- self-hosted runner の状態次第で、複数回試しても接続確立に時間がかかる可能性がある
- 接続成功後も backtest 本体で別理由の失敗はありうる
- 連続 dispatch は runner 資源を消費するため、各 run の状態を確認しながら進める

## 実装ステップ

- [ ] `HEAD` と `origin/main` が一致していることを確認する
- [ ] `Night Batch Self Hosted` を dispatch する
- [ ] run id を特定し、接続関連 step を監視する
- [ ] 接続必須ゲートが失敗したら結果を記録して再試行する
- [ ] 接続必須ゲート success と後続 step 進行を確認する
- [ ] 結果を報告する

## 完了条件

- `4cc9313` ベースで接続必須ゲート success の run が少なくとも 1 件確認できている
- 接続成功後に `Run smoke gate and foreground production` へ進んだことが確認できている
- 失敗 run があれば、その run id と停止 step が整理されている
