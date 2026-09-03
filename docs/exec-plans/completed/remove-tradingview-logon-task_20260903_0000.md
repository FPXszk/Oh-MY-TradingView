# TradingView ログオン自動起動の廃止と Moomoo 再起動確認

## 目的

`OhMyTradingViewRunnerAutostart` を削除し、TradingView をログオン時に起動しない状態へ切り替える。稼働中の TradingView、Moomoo Desktop、OpenD を停止してクリーンな状態にし、デスクトップの `MUMU-OpenD-Desktop起動.cmd` から Moomoo Desktop（CDP 9226）と OpenD を再起動できることを確認する。

## 変更対象

- 削除: Windows タスク スケジューラの `OhMyTradingViewRunnerAutostart`。
- 停止: 稼働中の `TradingView.exe`、`moomoo.exe`、`moomoo_OpenD.exe` と、それらが起動した子プロセス。
- 使用: `C:\Users\szk\Desktop\MUMU-OpenD-Desktop起動.cmd`。
- 作成: 実行計画のみ。リポジトリのアプリケーションコードは変更しない。

## 影響・リスク

- 今後のログオンで TradingView と self-hosted runner は自動起動しない。
- OpenD を必要とする自動ジョブは、デスクトップバッチを明示的に起動するまで利用できない。
- タスクの所有者権限により削除が拒否された場合は、タスク削除のために管理者権限が必要になる。その場合も Moomoo の停止・再起動確認は行う。

## 実装・検証

- [x] タスクの実行コマンドと、停止対象のプロセスを確認した。
- [x] `OhMyTradingViewRunnerAutostart` を管理者権限で削除し、タスク一覧に存在しないことを確認した。
- [x] TradingView、Moomoo Desktop、OpenD と対象の子プロセスを停止し、9222 と9226がリッスンしていないことを確認した。
- [x] デスクトップの MUMU バッチを実行した。
- [x] OpenD プロセスと Moomoo Desktop を起動し、`http://127.0.0.1:9226/json/version` のCDP応答を確認した。
- [x] レビュー後、この計画を `docs/exec-plans/completed/` に移動し、計画コミットとは別に実装コミットを作成・プッシュする。

## 対象外

- Moomoo のログイン情報、売買設定、口座、ウォッチリストは変更しない。
- 他のスケジューラタスクや常駐アプリは変更しない。
