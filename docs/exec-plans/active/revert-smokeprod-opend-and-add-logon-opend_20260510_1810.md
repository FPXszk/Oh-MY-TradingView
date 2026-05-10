# Exec-plan: revert-smokeprod-opend-and-add-logon-opend_20260510_1810

## 概要

目的: 認識違いで `smoke-prod` 側に入ってしまった OpenD autostart 変更を戻し、代わりに **Windows のログオン時 autostart 導線**へ OpenD 起動を追加する。

- 先に戻す対象: commit `6a1587d69546da5c5e228b29cdf577620fa58499` で入った `smoke-prod` OpenD startup 挙動
- 新しい実装対象: Task Scheduler `ONLOGON` 導線で生成される runner autostart launcher
- 確定要件: ログオン時に追加するのは **OpenDのみ**。TradingView はログオン時同時起動しない

## 変更ファイル（作成/変更予定）

- docs/exec-plans/active/revert-smokeprod-opend-and-add-logon-opend_20260510_1810.md
- python/night_batch.py
- tests/night-batch.test.js
- scripts/windows/register-self-hosted-runner-autostart.cmd
- tests/windows-run-night-batch-self-hosted.test.js
- README.md

## 実装方針

- `python/night_batch.py` から `smoke-prod` の OpenD readiness / launch step を外し、起動責務を元に戻す
- `tests/night-batch.test.js` の OpenD 関連ケースは削除または既存契約に合わせて更新し、`smoke-prod` が OpenD を見ない状態を固定する
- Windows のログオン時導線は `register-self-hosted-runner-autostart.cmd` が生成する launcher を使っているため、**launcher 生成内容に OpenD best-effort 起動を追加**する
- OpenD 起動は `%APPDATA%\moomoo_OpenD\moomoo_OpenD.exe` を既定候補として扱い、未導入時はログだけ残して runner 起動を継続する
- `run-self-hosted-runner-with-bootstrap.cmd` は runner 手動起動用の薄い wrapper として維持し、ログオン時だけの振る舞い変更に閉じる
- README は `smoke-prod` 側の OpenD 説明を削除し、Task Scheduler ONLOGON launcher が OpenD を先に best-effort 起動する運用へ更新する

## 範囲

### In scope

- `smoke-prod` OpenD autostart 挙動の取り消し
- Task Scheduler ONLOGON launcher への OpenD best-effort 起動追加
- 関連テストと README の整合

### Out of scope

- TradingView のログオン時自動起動追加
- OpenD の自動ログインや資格情報投入
- workflow `.github/workflows/night-batch-self-hosted.yml` への新規 OpenD 起動追加
- Task Scheduler の trigger 種別変更や service mode 化

## 実装ステップ

- [ ] `smoke-prod` OpenD 起動ロジックと関連テスト/README 記述を戻す
- [ ] `register-self-hosted-runner-autostart.cmd` の generated launcher に OpenD best-effort 起動を追加する
- [ ] `tests/windows-run-night-batch-self-hosted.test.js` に ONLOGON launcher の OpenD 起動契約を追加する
- [ ] README を現在の責務分離に合わせて更新する
- [ ] `npm run test:night-batch` と `npm test` を実行して影響範囲を確認する

## テスト戦略

- RED: runner autostart script test に OpenD launcher 期待値を追加し、現状 fail することを確認する
- GREEN: autostart launcher へ OpenD 起動を追加し、同時に `smoke-prod` OpenD テストを削除/更新して契約を修正する
- REFACTOR: launcher 生成行の重複やログ文言を整理しつつ、既存の runner autostart / bootstrap / run.cmd 呼び出し順を維持する

## 検証コマンド

- `npm run test:night-batch`
- `npm test`

## リスク・注意点

- `register-self-hosted-runner-autostart.cmd` は ASCII-only / CRLF 前提なので、launcher 生成行の quoting を崩すと `schtasks` 連携が壊れる
- OpenD 未導入環境でも runner 起動を止めない best-effort 挙動が必要
- `smoke-prod` 側から OpenD を外すため、README / テスト /実装の責務ずれを残さないことが重要
- 既存 active plans (`night-batch-rerun-focus8-200pack_20260505_0300.md`, `repo-structure-align-and-archive-rules_20260424_2015.md`, `run-night-batch_20260429_2344.md`) とは対象が重ならないことを確認済み

## 完了条件

- `smoke-prod` は OpenD startup を行わない
- Windows ONLOGON autostart launcher が OpenD を先に best-effort 起動する
- runner 起動は従来どおり bootstrap → run.cmd の順で継続する
- README とテストが新しい責務分離を表す

---

作成者: Copilot
作成日時: 2026-05-10T18:10:00+09:00
