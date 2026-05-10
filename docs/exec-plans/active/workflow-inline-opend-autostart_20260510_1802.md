# Exec-plan: workflow-inline-opend-autostart_20260510_1802

## 概要

目的: GitHub Actions `Night Batch Self Hosted` の **Windows の TradingView 起動用 PowerShell ステップ**に `moomoo_OpenD` の確認・起動を直結し、workflow 側でも OpenD → TradingView の順で起動を試みるようにする。

- 対象: `.github/workflows/night-batch-self-hosted.yml` の `Ensure TradingView is running` ステップ、関連の workflow テスト、必要最小限の README 記述
- 実行前提: Windows runner には `moomoo_OpenD.exe` がインストール済みで、既定配置は `%APPDATA%\moomoo_OpenD\moomoo_OpenD.exe`
- 安全制約: OpenD は best-effort で起動確認のみ行い、ログイン入力や取引操作は行わない

## 変更ファイル（作成/変更予定）

- docs/exec-plans/active/workflow-inline-opend-autostart_20260510_1802.md
- .github/workflows/night-batch-self-hosted.yml
- tests/windows-run-night-batch-self-hosted.test.js
- README.md

## 実装方針

- `Ensure TradingView is running` の PowerShell 内で、TradingView の startup check より前に OpenD の process/listen 状態を確認する
- OpenD が未readyなら、config の `launch.opend_path` または既定の `%APPDATA%\moomoo_OpenD\moomoo_OpenD.exe` から起動を試みる
- OpenD 起動は best-effort とし、未起動でも workflow を即失敗させず診断ログを残して TradingView 起動処理へ進める
- `python/night_batch.py` 側の `smoke-prod` OpenD autostart とは競合しても安全な idempotent な流れを維持する
- workflow の仕様は `tests/windows-run-night-batch-self-hosted.test.js` の文字列アサーションで固定する

## 範囲

### In scope

- GitHub Actions workflow の Windows PowerShell step に OpenD startup を追加
- workflow テストの期待値更新/追加
- README の self-hosted / smoke-prod 説明のうち、workflow 側でも OpenD を先に見る点の明記

### Out of scope

- OpenD の永続常駐設定や Windows ログオン時 autostart 登録
- `python/night_batch.py` の既存 OpenD startup ロジックの削除や大きな再設計
- OpenD の自動ログイン、資格情報投入、取引 API 呼び出し
- 他 workflow やローカル手動起動 script への横展開

## 実装ステップ

- [ ] 既存 workflow の `Ensure TradingView is running` step に差し込む最小の OpenD readiness / launch 導線を設計する
- [ ] `.github/workflows/night-batch-self-hosted.yml` を更新し、OpenD → TradingView の順で best-effort 起動確認する
- [ ] `tests/windows-run-night-batch-self-hosted.test.js` を更新し、workflow が OpenD 確認と起動経路を持つことを固定する
- [ ] README を最小更新し、workflow 側でも OpenD を先に確認することを明記する
- [ ] 既存テストを実行し、必要なら plan を completed へ移して本体変更をコミットする

## テスト戦略

- RED: workflow テストに OpenD readiness / launch の期待値を追加し、現状 fail することを確認する
- GREEN: workflow PowerShell step に OpenD 起動処理を追加し、`npm run test:night-batch` を通す
- REFACTOR: 冗長な条件分岐やログ文言を整理しつつ、既存 TradingView launch 条件と visible window 契約を維持する

## 検証コマンド

- `npm run test:night-batch`
- `npm test`

## リスク・注意点

- workflow step は Windows PowerShell inline script のため、引用符や null handling を崩すと起動全体が壊れる
- OpenD が未インストールの runner でも best-effort のまま TradingView 起動を継続できる必要がある
- `python/night_batch.py` 側にも OpenD autostart があるため、二重起動ではなく「既に ready なら skip」になる流れを保つ必要がある
- 既存 active plans (`night-batch-rerun-focus8-200pack_20260505_0300.md`, `repo-structure-align-and-archive-rules_20260424_2015.md`, `run-night-batch_20260429_2344.md`) とは対象が重ならないことを確認済み

## 完了条件

- `Ensure TradingView is running` step が TradingView 起動前に OpenD を確認する
- OpenD 未ready時に workflow から best-effort 起動を試みる
- workflow テストが OpenD 導線を検証する
- README に workflow 側の OpenD 先行確認が反映される

---

作成者: Copilot
作成日時: 2026-05-10T18:02:00+09:00
