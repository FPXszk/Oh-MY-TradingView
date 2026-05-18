# Exec-plan: sbi-chrome-plugin-exploration_20260518_2141

## Goal

`@chrome` plugin を使って、手動ログイン済みの SBI 証券タブへ read-only でアクセスできるか確認する。アクセスできた場合は、CSV ボタン候補と「毎資産」導線候補、画面上の主要セクションを特定し、次に進むべき作業を決める。

## Files

- Create: `docs/exec-plans/active/sbi-chrome-plugin-exploration_20260518_2141.md`
- Create: `docs/sessions/sbi-chrome-plugin-exploration_20260518_2141.md`
- Update: `docs/strategy/sbi-portfolio-report-workflow.md` if browser-side findings change the durable workflow
- Update: `scripts/sbi/capture-portfolio-data.mjs` only if on-screen findings reveal a minimal required selector/navigation fix
- Move on completion: `docs/exec-plans/active/sbi-chrome-plugin-exploration_20260518_2141.md` -> `docs/exec-plans/completed/sbi-chrome-plugin-exploration_20260518_2141.md`

## Scope

### In scope

- 直近 session log と workflow doc を読み、今回の着手順を固定する
- `@chrome` plugin の接続可否を確認する
- 取得できる情報の種類を確認する
- SBI タブを read-only で観察し、CSV ボタン候補と「毎資産」導線候補を列挙する
- 結果に応じて、次にやるべきことを session log と workflow doc に残す

### Out of scope

- SBI へのログイン自動化
- 発注、取消、入出金、設定変更
- 不要なリファクタや unrelated file の整理
- CDP workflow の大規模改修

## Impact

- 主対象は `@chrome` plugin を使ったブラウザ接続確認と、SBI portfolio capture 系の次アクション整理
- 画面上の候補が取れれば、既存の `scripts/sbi/capture-portfolio-data.mjs` の selector 精度改善につながる
- 接続できなければ、plugin 実行口の露出不足か Chrome extension 接続不良かを切り分ける

## Risks

- このセッションでも `@chrome` 実行ツールが露出しない可能性がある
- Chrome extension と native host の通信に失敗する可能性がある
- SBI タブが開いていても title / URL だけで判別しづらい可能性がある
- UI 文言が想定と異なり、「CSV」や「毎資産」が直接見えない可能性がある

## Test Strategy

- RED: `@chrome` から接続できない、または SBI タブを read できない状態を確認する
- GREEN: open tabs / history / selected tab の少なくとも一つで browser context を取得し、SBI タブ候補を特定する
- REFACTOR: 必要最小限の docs / script 更新だけに絞る

## Validation

- Chrome browser-client の lightweight check が成功すること
- 可能なら open tabs 一覧または selected tab 情報が取得できること
- SBI タブを claim/read できた場合:
  - タイトル
  - URL
  - CSV ボタン候補
  - 「毎資産」導線候補
  - 主要セクション名
  を自然言語で要約できること
- docs を更新した場合は差分を確認し、事実ベースで記録されていること

## Steps

- [x] Step 1: `AGENTS.md`、直近 SBI session log、workflow doc を確認し、今回の成功条件を固定する
- [x] Step 2: `@chrome` plugin の実行口を確認し、軽量な browser 接続チェックを行う
- [x] Step 3: 取得可能な情報の種類を把握する
- [x] Step 4: SBI タブが見えれば read-only で画面要素を観察し、CSV / 毎資産 / 主要セクション候補をメモする
- [x] Step 5: 結果を session log に残し、必要なら workflow doc や capture script へ最小修正を入れる
- [x] Step 6: 変更をレビューし、plan を completed へ移して commit / push する

## No-Overlap Check

- `docs/exec-plans/active/` は確認時点で空であり、競合する active plan は無い

## Outcome

- `@chrome` plugin のローカル構成と取得可能情報の範囲は確認できた
- この会話では `node_repl js` が露出せず、SBI タブの実読み取りまでは進めなかった
- blocker と次回の再開手順は `docs/sessions/sbi-chrome-plugin-exploration_20260518_2141.md` に記録した
