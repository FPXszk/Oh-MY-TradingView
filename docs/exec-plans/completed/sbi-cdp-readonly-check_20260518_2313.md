# Exec-plan: sbi-cdp-readonly-check_20260518_2313

## Goal

起動済みの CDP 用 Chrome に対して、重い操作をせず read-only で何が見えるかだけ確認する。具体的には CDP endpoint 応答、target 一覧、SBI tab 検出可否、dry-run の軽い結果を確認し、その内容を session log に残して次セッションへ引き継ぐ。

## Files

- Create: `docs/exec-plans/active/sbi-cdp-readonly-check_20260518_2313.md`
- Create: `docs/sessions/sbi-cdp-readonly-check_20260518_2313.md`
- Update: `docs/strategy/sbi-portfolio-report-workflow.md` only if the verified read-only check changes the durable next-step guidance
- Move on completion: `docs/exec-plans/active/sbi-cdp-readonly-check_20260518_2313.md` -> `docs/exec-plans/completed/sbi-cdp-readonly-check_20260518_2313.md`

## Scope

### In scope

- Windows 側 CDP endpoint の `json/version` / `json/list` を確認する
- SBI 関連 tab が見えているかを read-only で確認する
- 必要なら local Windows 実行で dry-run を 1 回だけ行う
- 結果を session log に残す

### Out of scope

- click / navigation / download
- CSV 取得
- workflow 定義や capture script の追加修正
- SBI ログイン状態の変更

## Impact

- 次セッションで「CDP は見えるか」「SBI tab は見えるか」の再確認コストを下げられる
- 次にやるべきことを `SBI tab を dedicated CDP Chrome 側に載せる` に固定できる

## Risks

- dedicated profile のため、SBI tab がまだ無い可能性が高い
- Windows 側では見えても WSL からは未到達のままかもしれない

## Test Strategy

- RED: endpoint はあるが SBI tab が無い状態を確認する
- GREEN: 少なくとも endpoint 応答と target 一覧が取れ、SBI tab の有無を自然言語で記録する
- REFACTOR: docs 更新だけで終える

## Validation

- Windows PowerShell から `http://127.0.0.1:9222/json/version`
- Windows PowerShell から `http://127.0.0.1:9222/json/list`
- 必要なら local Windows 実行の dry-run summary

## Steps

- [x] Step 1: CDP endpoint と target 一覧を read-only で確認する
- [x] Step 2: SBI tab 検出可否と、今読める範囲を整理する
- [x] Step 3: 必要なら dry-run を 1 回だけ行い、結果を確認する
- [x] Step 4: session log と必要な docs を更新する
- [x] Step 5: 変更をレビューし、plan を completed へ移して commit / push する

## No-Overlap Check

- `docs/exec-plans/active/` は確認時点で空であり、競合する active plan は無い

## Outcome

- Windows 側 `127.0.0.1:9222` の endpoint 応答を再確認できた
- `json/list` から SBI タブが見えていることを確認できた
- local Windows 実行の dry-run で SBI target が正しく pick されることを確認できた
