# Document self-hosted runner foreground autostart

## Problem

今回の会話で、night batch の detached production 停止調査、foreground workflow 監視化、Windows self-hosted runner の non-service bootstrap、Task Scheduler autostart 登録、autostart failure の原因切り分けと hardening、そして Windows 実機での成功確認まで実施した。これらを repo 内の運用 docs と session log に残し、現在の正しい運用状態が追えるように整備する。

## Approach

- `docs/command.md` 末尾に貼られた運用ログはそのまま保持し、本文側に「今回何を変えたか」「何が原因だったか」「今どう確認できたか」を追記する
- 詳細な経緯と commit / run / runner 状態は `docs/working-memory/session-logs/` に新規 session log として残す
- 必要なら `README.md` / `docs/DOCUMENTATION_SYSTEM.md` の導線も更新し、後続作業で参照しやすくする

## Files in scope

- `README.md`
- `docs/command.md`
- `docs/DOCUMENTATION_SYSTEM.md`
- `docs/working-memory/session-logs/self-hosted-runner-foreground-autostart_20260412_0004.md`
- `docs/exec-plans/active/document-self-hosted-runner-foreground-autostart_20260412_0004.md`

## Out of scope

- 実行中 workflow の停止・再設定
- Windows OS 側 auto-logon / Task Scheduler GUI の変更
- 追加の workflow / script 実装変更（docs 化では足りない新障害が見つかった場合を除く）

## Risks

- `docs/command.md` 末尾の pasted logs を壊すと運用証跡が失われる
- 実行中 workflow / runner 状態は変化中なので、記録時点のタイムスタンプを明示しないと誤読されやすい
- docs 更新で既存 doc test の期待文言を崩す可能性がある

## Test strategy

- **RED:** 既存 doc test に引っかかる文言変更がないか確認する。必要なら `tests/windows-run-night-batch-self-hosted.test.js` を先に更新して失敗を作る
- **GREEN:** docs / session log を反映し、既存 test を通す
- **REFACTOR:** 記述重複を減らし、README / command / session log の役割分担を明確にする

## Validation

- `node --test tests/windows-run-night-batch-self-hosted.test.js`
- `npm test`
- `gh api repos/FPXszk/Oh-MY-TradingView/actions/runners`
- `gh api repos/FPXszk/Oh-MY-TradingView/actions/runs/24282322391`

## Steps

- [ ] `docs/command.md` 末尾の最新 pasted logs を読み、Task Scheduler / autostart / runner online 成功の観測事実を整理する
- [ ] `README.md` と `docs/command.md` に今回の foreground monitoring / autostart hardening / 現在の確認方法を追記する
- [ ] `docs/working-memory/session-logs/` に今回の会話全体を要約した session log を追加する
- [ ] 必要なら `docs/DOCUMENTATION_SYSTEM.md` に導線を追加する
- [ ] 既存 test と GitHub status 確認を通し、exec-plan を completed に移して commit / push する
