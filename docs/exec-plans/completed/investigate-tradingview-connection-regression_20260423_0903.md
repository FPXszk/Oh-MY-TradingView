# TradingView 接続不能回帰調査計画

作成日時: 2026-04-23 09:03 JST

## 目的

最新の backtest/night-batch workflow で TradingView 接続が確立できない原因を調査し、あわせて「以前は接続できていたのに、どこから回帰したのか」を特定する。今回は原因調査と回帰点の整理までを対象とし、修正実装は含めない。

## 既存 active plan との関係

- 現在の active plan は本計画のみ
- 直前の `investigate-night-batch-connection-gating_20260423_0849.md` は completed に移動済みで、接続失敗時に workflow を止める修正は push 済み
- 今回はその次段として「なぜ接続できないのか」を掘る

## 変更・削除・作成するファイル

- 作成: `docs/exec-plans/active/investigate-tradingview-connection-regression_20260423_0903.md`

## 確認対象ファイル・対象物

- 確認: GitHub Actions の最新失敗 night-batch/backtest workflow run
- 確認: `.github/workflows/night-batch-self-hosted.yml`
- 確認: `config/night_batch/*.json` のうち対象 run が使う config
- 確認: `scripts/windows/run-night-batch-self-hosted.cmd`
- 確認: `python/night_batch.py`
- 確認: TradingView 起動・接続に関わる最近のコミット差分
- 必要に応じて確認: `src/connection.js`, `src/cli/commands/health.js`, `src/core/tradingview-readiness.js`, 直近 completed plan

## スコープ

### 実施すること

- 最新失敗 run を特定し、失敗 step と接続系ログを確認する
- startup check 側 9222 と bridge 側 9223 のどちらで失敗しているかを切り分ける
- `tv status` が落ちているのか、`/json/list` 自体が到達不能なのかを切り分ける
- 対象 config の host/port/shortcut 設定と workflow の期待値を照合する
- 直近で接続に関わる変更を確認し、回帰候補コミットを絞る
- 「今までできていたはず」という前提を、過去成功 run または過去修正履歴から確認する
- 事実・仮説・回帰候補・次の修正候補を整理して報告する

### 実施しないこと

- ユーザー承認なしで workflow / スクリプト / config を変更しない
- 原因未確定のまま修正実装に入らない
- 無関係な CI failure まで広げない

## 実装内容と影響範囲

- 対象は self-hosted Windows runner から WSL bridge を使う TradingView 接続経路
- 主な確認観点:
  - Windows 側 TradingView 起動可否
  - `startup_check_host:startup_check_port` の疎通
  - `host:port` での WSL bridge 疎通
  - `tv status` の `api_available` 判定
  - config / workflow / runtime の不整合
  - 直近変更による回帰

## 調査方針

1. 最新失敗 run を特定し、workflow summary と failed logs を高シグナル順に確認する
2. 接続失敗箇所を `startup_check` / `bridge` / `tv status` に分けて切り分ける
3. 対象 config と workflow の期待する host/port/launch 条件を照合する
4. 最近の関連コミットと completed plan を確認し、回帰候補を絞る
5. 必要なら self-hosted 環境で最小限のローカル再現コマンドを確認する
6. 「事実」「推定」「不足情報」「修正候補」に分けて報告する

## TDD / 検証戦略

今回の依頼は調査タスクであり、修正実装は前提にしない。

### RED

- 最新失敗 run の既存失敗を事実として確認する
- 必要に応じて接続確認コマンドを再実行し、同種の失敗を再現する

### GREEN

- 本計画の範囲外
- 修正が必要なら別 plan を作成して承認後に進める

### REFACTOR

- 本計画の範囲外

### カバレッジ方針

- 調査のみのため coverage 対象外
- 修正に進む場合に追加テスト方針を別計画で定義する

## 想定コマンド

```bash
gh run list --limit 10
```

```bash
gh run view <run-id>
```

```bash
gh run view <run-id> --log-failed
```

```bash
git log --oneline -- .github/workflows/night-batch-self-hosted.yml config/night_batch scripts/windows python/night_batch.py src/connection.js src/core/tradingview-readiness.js
```

```bash
git diff <known-good-sha>..<bad-sha> -- .github/workflows/night-batch-self-hosted.yml config/night_batch scripts/windows python/night_batch.py src/connection.js src/core/tradingview-readiness.js
```

必要に応じて:

```bash
node src/cli/index.js status
```

```bash
python3 python/night_batch.py preflight --host <host> --port <port>
```

## リスク / 注意点

- self-hosted runner 固有の Windows 状態はローカル WSL だけでは再現しきれない可能性がある
- 以前の成功 run が別 config / 別 launcher / 別 shortcut を使っていた可能性がある
- 接続不可の原因が TradingView アプリ更新、shortcut 変更、port bridge 崩れ、runner 再起動後状態変化など repo 外要因の可能性もある
- `gh` ログだけで不十分な場合、Windows 側診断コマンドや artifact まで掘る必要がある

## 実装ステップ

- [ ] `gh run list --limit 10` で最新失敗 run と直近成功 run を特定する
- [ ] 対象 run の failed logs から接続失敗箇所を `startup_check` / `bridge` / `tv status` に切り分ける
- [ ] 対象 config と workflow の host/port/launch 条件を確認する
- [ ] 直近関連コミットと completed plan を確認し、回帰候補を絞る
- [ ] 必要なら最小限のローカル接続確認コマンドを実行する
- [ ] 調査結果を「事実」「回帰候補」「不足情報」「修正候補」に分けて報告する

## 完了条件

- 最新失敗 run が一意に特定されている
- 接続不能がどの層で起きているか説明できる
- 「以前はできていた」根拠またはその前提のズレが説明できる
- 修正に進むべき具体的な候補点が整理されている
