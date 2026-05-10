# Exec-plan: moomoo-opend-autostart-with-tradingview_20260510_1526

## 概要

目的: 既存の TradingView Desktop 自動起動フローに `moomoo_OpenD` の起動も組み込み、night-batch 実行時に TradingView と OpenD が必要ならまとめて立ち上がる状態にする。

- 対象: TradingView startup-check / launch 導線、OpenD 起動条件、関連ドキュメント、回帰テスト
- 実行前提: Windows 側には `C:\Users\szk\AppData\Roaming\moomoo_OpenD\moomoo_OpenD.exe` がインストール済み
- 安全制約: OpenD の自動起動は **起動のみ**。ログイン情報の自動入力やリアル取引系の操作は行わない

## 変更ファイル（作成/変更予定）

- docs/exec-plans/completed/moomoo-opend-autostart-with-tradingview_20260510_1526.md
- python/night_batch.py
- tests/night-batch.test.js
- README.md

## 実装方針

- 既存の `smoke-prod` startup 導線で TradingView の startup-check に先立ち、OpenD の listen 状態を確認する
- OpenD が未起動なら、既定パスの `moomoo_OpenD.exe` を Windows 側から起動する
- 起動判定は WSL から直接 `127.0.0.1:11111` を見るのではなく、Windows 側ローカルでの listen / process existence を優先して扱う
- TradingView の launch ロジックを壊さず、OpenD は sibling な「事前起動ステップ」として追加する
- README に startup-first 手順の更新内容を追記し、OpenD が TradingView 自動起動に含まれることを明記する

## 範囲

### In scope

- `python/night_batch.py` への OpenD 起動・待機・ログ出力の追加
- 既存 night-batch テストの拡張
- README の運用手順更新

### Out of scope

- Windows ログオン時の常駐 autostart 登録
- OpenD の自動ログイン設定変更
- OpenD portproxy の永続化方式変更
- moomoo の取引・サブスク API 実行そのもの

## 実装ステップ

- [x] 既存 `smoke-prod` の startup-check / launch 導線を読み、OpenD を差し込む最小ポイントを特定する
- [x] OpenD の起動判定・起動処理・待機処理を `python/night_batch.py` に追加する
- [x] night-batch テストを追加/更新して、TradingView launch を壊さず OpenD 起動が組み込まれていることを固定化する
- [x] README の startup-first 手順を更新する
- [x] 既存テストを実行し、必要なら plan を completed へ移してコミットする

## テスト戦略

- RED: OpenD 起動導線が存在しない前提で、night-batch の startup ロジックに期待する文言や設定が不足しているテストを追加する
- GREEN: OpenD 起動フローを最小実装し、既存 TradingView startup テストと新規テストを通す
- REFACTOR: 重複する startup 判定やコマンド組み立てを整理しつつ、既存の TradingView readiness 契約を維持する

## 検証コマンド

- `python3 -m compileall python`
- `npm test`

## リスク・注意点

- Windows 側で OpenD が tray/background 挙動を取るため、process 起動成功と listen 完了を分けて扱う必要がある
- OpenD の bind は `127.0.0.1:11111` 固定寄りなので、WSL 側 reachability と Windows 側起動成功を混同しない
- night-batch の startup 契約を変えすぎると既存の TradingView recovery フローを壊す可能性がある
- 既存 active plans (`night-batch-rerun-focus8-200pack_20260505_0300.md`, `repo-structure-align-and-archive-rules_20260424_2015.md`, `run-night-batch_20260429_2344.md`) とは対象が重ならないことを確認済み

## 完了条件

- night-batch の startup 導線で OpenD 未起動時に自動起動を試みる
- TradingView 側の既存 startup-first 挙動が維持される
- README に OpenD 同時起動の運用が記録される

## 実施結果

- `smoke-prod` の最初に `opend-startup` step を追加し、OpenD の readiness 確認と best-effort autostart を組み込んだ
- custom check / launch command と既定の PowerShell 起動経路を CLI/config から上書きできるようにした
- OpenD readiness pass / launch / timeout non-fatal を night-batch テストで固定し、README の startup-first 手順も更新した

---

作成者: Copilot
作成日時: 2026-05-10T15:26:00+09:00
