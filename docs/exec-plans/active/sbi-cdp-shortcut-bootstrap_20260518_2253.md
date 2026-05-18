# Exec-plan: sbi-cdp-shortcut-bootstrap_20260518_2253

## Goal

Windows デスクトップに CDP 付き Chrome 起動ショートカットを作成し、実際に起動して `http://127.0.0.1:9222/json/version` が返る状態を確認する。既存の SBI ログイン済み Chrome セッションは壊さず、まずは専用 profile で endpoint 応答までを成立させる。

## Files

- Create: `docs/exec-plans/active/sbi-cdp-shortcut-bootstrap_20260518_2253.md`
- Create: `docs/sessions/sbi-cdp-shortcut-bootstrap_20260518_2253.md`
- Update: `docs/strategy/sbi-portfolio-report-workflow.md` if the proven bootstrap steps should be added to the durable runbook
- Move on completion: `docs/exec-plans/active/sbi-cdp-shortcut-bootstrap_20260518_2253.md` -> `docs/exec-plans/completed/sbi-cdp-shortcut-bootstrap_20260518_2253.md`

## Scope

### In scope

- Windows 側 Chrome 実行パスと Desktop パスを確認する
- CDP 用 Chrome ショートカットを Desktop に作成する
- 専用 user-data-dir / port で Chrome を起動する
- `json/version` / `json/list` の応答を確認する
- 結果を session log と必要なら workflow doc に残す

### Out of scope

- 既存の SBI ログイン済み Chrome セッションを kill して置き換えること
- SBI ログイン状態の引き継ぎ
- capture script の selector 調整

## Impact

- CDP endpoint を返す既知の Chrome 起動方法を 1 本固定できる
- その後は endpoint bootstrap 問題と SBI tab 問題を分離して進められる

## Risks

- 既存 Chrome が起動中だと、通常 profile では remote debugging port が生えない可能性が高い
- 専用 profile では SBI ログイン状態は共有されない
- Windows 側のショートカット作成方法に依存する

## Test Strategy

- RED: 現状では `9222/9223` が未応答であることを確認する
- GREEN: Desktop shortcut から起動した専用 Chrome で `json/version` が返ることを確認する
- REFACTOR: 実証できた bootstrap 手順だけ docs に残す

## Validation

- `curl http://127.0.0.1:9222/json/version`
- `curl http://127.0.0.1:9222/json/list`
- Desktop に作成した `.lnk` の存在確認

## Steps

- [ ] Step 1: Windows 側の Chrome パス、Desktop パス、既存 Chrome 状況を確認する
- [ ] Step 2: 既存セッションを壊さない CDP 起動方式を決める
- [ ] Step 3: Desktop に CDP 用ショートカットを作成し、実行する
- [ ] Step 4: `json/version` / `json/list` が返るか確認する
- [ ] Step 5: session log と必要な docs を更新する
- [ ] Step 6: 変更をレビューし、plan を completed へ移して commit / push する

## No-Overlap Check

- `docs/exec-plans/active/` は確認時点で空であり、競合する active plan は無い
