# Exec-plan: sbi-cdp-debug-and-hardening_20260518_2244

## Goal

`SBI Portfolio Capture` の CDP 前提 workflow を、`@chrome` なしでデバッグし、失敗理由を artifacts と summary に明確に残せるようにする。加えて、local / self-hosted GitHub Actions の両方で CDP endpoint 未起動時の切り分けがすぐできる状態にする。

## Files

- Create: `docs/exec-plans/active/sbi-cdp-debug-and-hardening_20260518_2244.md`
- Update: `scripts/sbi/capture-portfolio-data.mjs`
- Update: `tests/sbi-capture-workflow.test.js`
- Update: `.github/workflows/sbi-portfolio-capture.yml`
- Create: `docs/sessions/sbi-cdp-debug-and-hardening_20260518_2244.md`
- Update: `docs/strategy/sbi-portfolio-report-workflow.md` if the verified CDP debug flow changes the durable operating steps
- Move on completion: `docs/exec-plans/active/sbi-cdp-debug-and-hardening_20260518_2244.md` -> `docs/exec-plans/completed/sbi-cdp-debug-and-hardening_20260518_2244.md`

## Scope

### In scope

- 既存 CDP capture script と workflow の失敗パスを調査する
- `127.0.0.1:9222/9223` 未応答時に、何が不足しているか summary に明示する
- workflow 実行前に CDP endpoint 可用性を確認しやすくする
- local で再現できる最小の RED/GREEN を追加する
- 今回のデバッグ結果と再開手順を session log に残す

### Out of scope

- `@chrome` plugin の修復
- SBI ログイン自動化
- 発注、取消、入出金などの write 操作
- CDP endpoint 自体を OS 側で常駐起動する仕組みの追加

## Impact

- `scripts/sbi/capture-portfolio-data.mjs` の失敗理由が明瞭になれば、workflow 失敗時に「endpoint 不在」か「SBI tab 不在」かをすぐ区別できる
- workflow 側で事前 probe を入れれば、Actions log の可読性が上がる
- docs を更新した場合、次回の SBI capture 再開コストが下がる

## Risks

- 実機 CDP endpoint が今は未起動のため、GREEN は主に failure-path hardening になる可能性がある
- Windows self-hosted runner と WSL local で見える loopback 状態が異なる可能性がある
- SBI tab 実データが無いので、success-path selector の最終検証は保留になるかもしれない

## Test Strategy

- RED: CDP endpoint 未応答時の現在挙動を再現し、不足している診断情報を確認する
- GREEN: endpoint probe / summary / workflow log から failure reason が一目でわかる状態にする
- REFACTOR: 既存 success-path を壊さず、最小差分で診断強化だけを入れる

## Validation

- `node --test tests/sbi-capture-workflow.test.js`
- `node scripts/sbi/capture-portfolio-data.mjs --dry-run --output-dir tmp/sbi-capture-dryrun`
- 必要なら `node scripts/sbi/capture-portfolio-data.mjs --cdp-host 127.0.0.1 --cdp-port 9223 --dry-run --output-dir tmp/sbi-capture-dryrun-9223`
- workflow 定義差分を確認し、CDP endpoint 未応答時に probe 情報が残ること

## Steps

- [x] Step 1: capture script / workflow / docs を読み、現状の failure-path を整理する
- [x] Step 2: local で CDP endpoint 未応答ケースを再現し、summary と log の不足を特定する
- [x] Step 3: script と workflow に最小限の診断強化を実装する
- [x] Step 4: テストを追加または更新し、local validation を実行する
- [x] Step 5: session log と必要な workflow doc を更新する
- [x] Step 6: 変更をレビューし、plan を completed へ移して commit / push する

## No-Overlap Check

- `docs/exec-plans/active/` は確認時点で空であり、競合する active plan は無い

## Outcome

- `127.0.0.1:9222/9223` の CDP endpoint 未応答は再現した
- capture script に endpoint probe を追加し、`CDP endpoint 不在` と `SBI tab 不在` を区別できるようにした
- GitHub Actions workflow に preflight probe を追加し、Actions log だけでも接続状態が見えるようにした
