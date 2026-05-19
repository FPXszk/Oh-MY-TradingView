# SBI Portfolio Capture Expansion Plan

## Goal

`SBI Portfolio Capture` workflow の capture 対象を、既存の `My資産トップ` / 投資信託 CSV から広げ、artifact 上で確認できている以下の導線を順に自動 capture 対象へ追加する。

1. `米国株式`
2. `実現損益詳細`
3. `配当金・分配金履歴`

今回の成功条件は、これらの導線に対して read-only の navigation / snapshot / CSV download 試行が workflow に組み込まれ、artifact と report が追加取得結果を自然に取り込めること。

## Files

- 変更: `scripts/sbi/capture-portfolio-data.mjs`
- 変更: `scripts/sbi/build-portfolio-report.mjs`
- 変更: `tests/sbi-capture-workflow.test.js`
- 変更: `tests/sbi-portfolio-report.test.js`
- 変更: `docs/strategy/sbi-portfolio-report-workflow.md`
- 作成または更新の可能性あり: `docs/sessions/` 配下の今回の durable session log

## Scope

### In Scope

- capture script に複数導線の順次探索ロジックを追加する
- 導線ごとの snapshot / download 試行結果を summary artifact へ残す
- report builder が追加 CSV を capture artifact から認識できるようにする
- 必要な unit test を追加・更新する
- 手順書を現行 workflow に合わせて更新する

### Out Of Scope

- SBI へのログイン自動化
- 発注 / 取消 / 入出金など read-only 以外の操作
- 現時点で artifact に見えていない新規導線の探索
- report の大幅なレイアウト刷新

## Impact

- `.github/workflows/sbi-portfolio-capture.yml` 自体の step 構成は維持しつつ、中核の capture script のみを拡張する
- `build-portfolio-report` の入力認識が増えるため、capture artifact からの report 品質が向上する
- summary に導線別の実行結果が残るため、次回以降の live debugging がしやすくなる

## Test Strategy

- `tests/sbi-capture-workflow.test.js` で導線選択と summary 表示を先に RED 化し、その後実装して GREEN にする
- `tests/sbi-portfolio-report.test.js` で capture artifact から追加 CSV を認識するケースを追加する
- 最後に対象テストを実行して回帰がないことを確認する

## Validation Commands

- `node --test tests/sbi-capture-workflow.test.js`
- `node --test tests/sbi-portfolio-report.test.js`

## Risks

- SBI 画面文言が partial match 依存のため、導線判定が広すぎると誤クリックの余地がある
- 一部導線はクリック後に別ページ遷移ではなく同ページ更新の可能性があり、settle 判定が弱いと snapshot が早すぎる可能性がある
- `配当金・分配金履歴` は report での最終利用が未整理のため、今回はまず capture artifact への到達と入力認識を優先する

## Implementation Steps

- [ ] `scripts/sbi/capture-portfolio-data.mjs` に導線定義を追加し、`米国株式` → `実現損益詳細` → `配当金・分配金履歴` の順で capture を試行できるようにする
- [ ] 導線ごとの snapshot 名、CSV 試行結果、notes / summary 出力を整理し、artifact だけで到達可否が追えるようにする
- [ ] `scripts/sbi/build-portfolio-report.mjs` の capture artifact 入力認識を拡張し、追加 CSV を既存の US stock / realized P/L データへ自然に流し込む
- [ ] `tests/sbi-capture-workflow.test.js` と `tests/sbi-portfolio-report.test.js` を更新して今回の拡張を固定化する
- [ ] `docs/strategy/sbi-portfolio-report-workflow.md` と必要なら durable session log を更新し、現時点の到達範囲と次の残課題を明確化する
