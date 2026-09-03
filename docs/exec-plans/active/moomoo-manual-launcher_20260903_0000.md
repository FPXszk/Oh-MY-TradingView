# Moomoo OpenD 手動起動への切替

## 目的

Windows ログオン時に `OhMyTradingViewRunnerAutostart` が OpenD を自動起動しないようにし、デスクトップ上の `MUMU-OpenD-Desktop起動.cmd` をダブルクリックした時だけ、OpenD と Moomoo デスクトップを起動できるようにする。Moomoo デスクトップには Chromium/Electron 形式の `--remote-debugging-port=9226` を渡す。

## 変更対象

- 変更: `scripts/windows/register-self-hosted-runner-autostart.cmd`
  - 生成するログオン用ランチャーから OpenD のパス定義・起動処理を除く。
  - TradingView の既存起動（CDP ポート 9222）と runner 起動は維持する。
- 作成: `C:\Users\szk\Desktop\MUMU-OpenD-Desktop起動.cmd`
  - OpenD が未起動なら起動する。
  - `C:\Program Files\moomoo\app\*\moomoo.exe` の最新インストール先を解決し、Moomoo デスクトップを `--remote-debugging-port=9226` 付きで起動する。
  - 既に 9226 で Moomoo CDP が応答する場合は重複起動しない。
- 実行時に更新: `OhMyTradingViewRunnerAutostart` の実ランチャー
  - 修正済みリポジトリスクリプトで再登録し、次回ログオン時の OpenD 自動起動を止める。

## 影響・前提

- 次回ログオン後、OpenD を必要とする runner のジョブは、ユーザーがデスクトップバッチを起動するまで OpenD 接続エラーになる可能性がある。
- Moomoo デスクトップは Electron/Chromium 引数を受け付ける前提で、9226 は現時点で未使用であることを確認してから採用する。
- 稼働中の OpenD は停止しない。変更はログオン後の自動起動のみを対象にする。

## 実装・検証

- [ ] 既存の自動起動タスクとランチャーをバックアップせずに再生成できることを確認する（生成元はリポジトリの登録スクリプト）。
- [ ] ログオン用ランチャーから OpenD 起動を削除し、関連する契約テストを更新する。
- [ ] デスクトップの手動起動バッチを作成する。
- [ ] 登録スクリプトを実行してタスクを再登録し、実ランチャーに `moomoo_OpenD.exe` 起動処理がないことを確認する。
- [ ] バッチの構文を検証し、9226 が未使用であること、OpenD と Moomoo 実行ファイルの解決先が存在することを確認する。実アプリの追加起動は避ける。
- [ ] 関連する Windows 自動起動テストを実行する。
- [ ] レビュー後、この計画を `docs/exec-plans/completed/` に移動し、計画コミットとは別に実装コミットを作成・プッシュする。

## 対象外

- TradingView のログオン時起動設定や 9222 のポートは変更しない。
- OpenD の現在のプロセスを終了しない。
- Moomoo のログイン状態、取引設定、アプリ内設定は変更しない。
