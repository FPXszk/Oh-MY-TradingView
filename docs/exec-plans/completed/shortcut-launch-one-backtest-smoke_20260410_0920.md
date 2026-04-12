# Exec Plan: shortcut-launch-one-backtest-smoke_20260410_0920

## 目的

TradingView をいったんユーザーが終了した前提で、Windows ショートカット  
`C:\TradingView\TradingView.exe - ショートカット.lnk`  
をこちらで起動し、**現時点の正しい運用前提**である以下を実地確認する。

- Windows ローカル: `127.0.0.1:9222`
- WSL からの接続先: `172.31.144.1:9223`

そのうえで、**既存コマンドのみ**を使って **ちょうど 1 回だけ** backtest を実行し、smoke test とする。  
起動・疎通・backtest のいずれかで失敗した場合は、**失敗を記録してそこで停止**し、コード修正は別 exec-plan に分離する。

## 既存 active plan との関係

- 直前の `visible-finetune-ten-pattern-trial_20260410_0845.md` は完了済みとして completed へ移した
- 本計画は重複せず、**コード変更前の小さな運用確認**に限定する
- 本計画内では source edit を前提にしない。修正が必要と判明した場合は別計画に切り出す

## 対象範囲

- `C:\TradingView\TradingView.exe - ショートカット.lnk` の起動
- ユーザーによる **TradingView 起動の目視確認**
- Windows ローカル `9222` の応答確認
- WSL から `172.31.144.1:9223` の応答確認
- 既存 CLI による接続確認
- **1 回のみ** の backtest 実行
- 成功 / 失敗の記録

## 対象外

- `src/`、`tests/`、`config/` 等のソース編集
- ショートカット自体の再作成・修正
- portproxy / Windows 側ネットワーク設定の恒久修正
- backtest の複数回実行、再試行、並列実行
- launch / connection failure の場当たり的コード修正
- 問題修正の実装着手（必要なら別 exec-plan）

## ファイル作成・変更・削除

### 作成

- `docs/exec-plans/active/shortcut-launch-one-backtest-smoke_20260410_0920.md`
- `results/runtime-verification/shortcut-launch-one-backtest-smoke_20260410_0920/` 配下の実行ログとメモ

### 変更

- `/home/fpxszk/.copilot/session-state/4f84407c-148b-41f6-9407-bf4fea3dc382/plan.md`

### 削除

- なし

## 成功条件

- ショートカット起動後、ユーザーが TradingView の起動を**目視で確認**できる
- Windows ローカル `127.0.0.1:9222` が応答する
- WSL から `172.31.144.1:9223` が応答する
- 既存 CLI の `status` が通る
- 既存 backtest を **1 回だけ** 実行し、結果または失敗理由を記録できる
- 失敗時は追加修正に進まず停止できる

## Validation commands

既存コマンドのみを使う。

### 起動

```powershell
powershell.exe -NoProfile -Command "Start-Process -FilePath 'C:\TradingView\TradingView.exe - ショートカット.lnk'"
```

### Windows ローカル 9222 確認

```powershell
powershell.exe -NoProfile -Command "(Invoke-WebRequest 'http://127.0.0.1:9222/json/version' -UseBasicParsing).Content"
```

### WSL から 9223 確認

```bash
curl -sS http://172.31.144.1:9223/json/version
curl -sS http://172.31.144.1:9223/json/list
```

### 既存 CLI による接続確認

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status
```

### smoke test: backtest を 1 回だけ実行

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest nvda-ma
```

## リスク

- ショートカットが期待どおり `9222` で TradingView を起動しない可能性
- Windows ローカル `9222` は生きても、WSL 側 `172.31.144.1:9223` への到達が失敗する可能性
- アプリは起動しても、ログイン状態や UI 準備不足で backtest が失敗する可能性
- 失敗原因が shortcut・CDP・WSL 経路・TradingView 状態のどこか切り分け切れない可能性
- 本計画で深追いすると実装作業へ逸脱するため、失敗時は必ず停止が必要

## 実行ステップ

- [ ] ユーザーが TradingView を閉じた前提で開始する
- [ ] `C:\TradingView\TradingView.exe - ショートカット.lnk` を起動する
- [ ] **ユーザーが画面上で TradingView の起動を目視確認する**
- [ ] Windows ローカル `127.0.0.1:9222` の応答を確認する
- [ ] WSL から `172.31.144.1:9223` の応答を確認する
- [ ] `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status` を実行する
- [ ] **既存 backtest を 1 回だけ** 実行する
- [ ] 実行結果を記録する
- [ ] 起動失敗・接続失敗・backtest 失敗のいずれかが起きた場合は、失敗内容を記録して停止する
- [ ] 修正が必要と判明した場合は、コード修正をこの計画で行わず、別 exec-plan を作成する

## 完了時の期待成果

- shortcut 起動の成否
- `9222` / `9223` 前提の実地確認結果
- 1 回の backtest smoke test の結果
- 失敗した場合の停止条件と、別計画へ切り出すべき修正論点の明文化
