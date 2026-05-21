# Unified Portfolio Report Layout

## Goal

`Portfolio Health Check` workflow の出力レポートを 1 本に統合し、先頭に SBI と moomoo をまたいだ総合ポートフォリオ概要、その下に証券会社別の詳細を並べる。SBI 側の待機や安定化ロジックには今回触れない。

成功条件:

- workflow のユーザー向け Markdown レポートが 1 ファイルになる
- レポート先頭に総合サマリーがあり、SBI / moomoo の保有・現金・評価損益を横断して読める
- 下段に `SBI 詳細` と `moomoo 詳細` が同居する
- 既存の read-only データ取得フローは維持し、SBI の不安定性対策ロジックは変更しない

## Files

- 作成: `docs/exec-plans/active/unified-portfolio-report-layout_20260521_1044.md`
- 作成予定: `scripts/portfolio/build-unified-portfolio-report.mjs`
- 変更予定: `.github/workflows/portfolio-health-check.yml`
- 変更予定: `scripts/sbi/build-portfolio-report.mjs`
- 変更予定: `scripts/moomoo/run-portfolio-diagnostics.mjs`
- 変更予定: `tests/sbi-portfolio-report.test.js`
- 変更予定: `tests/moomoo.test.js`
- 変更予定: `docs/strategy/sbi-portfolio-report-workflow.md`
- 変更予定: `docs/sessions/` 配下の durable session log

## Scope

### In Scope

- SBI / moomoo の structured data を使った統合 Markdown レポート生成
- 総合サマリーと証券会社別詳細のレイアウト追加
- unified workflow の出力先と artifact 内容の見直し
- 必要最小限のテスト更新

### Out Of Scope

- SBI capture の待機時間、retry、クリック順序の調整
- moomoo diagnostics の取得項目追加
- 既存 standalone workflow の全面 redesign

## Impact

- `Portfolio Health Check` の確認導線が 1 レポートに集約される
- 口座横断の総額把握と、SBI / moomoo 個別内訳の往復がしやすくなる
- 既存の中間成果物は内部利用に寄せ、ユーザー向け出力は簡潔になる

## Test Strategy

- 先に統合レポート builder の期待レイアウトをテストで固定する
- SBI / moomoo の既存 builder テストは壊さず、export 追加や文言変更だけ最小更新する
- 実装後に targeted tests を実行し、生成内容を確認する

## Validation Commands

- `node --test tests/sbi-portfolio-report.test.js`
- `node --test tests/moomoo.test.js`
- `git diff --check`

## Risks

- SBI と moomoo で通貨表現が異なるため、総合サマリーの集計単位を誤解させる可能性がある
- moomoo 側は USD ベースなので、SBI と単純合算できない項目は分離表示が必要
- workflow 出力名を変えると既存運用の参照パスがずれる可能性がある

## Existing Plan Overlap

- `docs/exec-plans/completed/portfolio-health-check-unification_20260521_0940.md`

既存 plan は workflow 統合まで。今回はその上で「レポート表示を 1 本化する」追加仕様に限定する。

## Implementation Steps

- [ ] 直近 session log を要約し、今回の変更対象と非対象を整理する
- [ ] SBI / moomoo の structured output を読んで、統合レポート builder を追加する
- [ ] workflow を更新し、ユーザー向け artifact を 1 本の Markdown レポート中心に揃える
- [ ] targeted tests で総合サマリーと証券会社別詳細の構造を固定する
- [ ] docs / durable session log を更新する
- [ ] plan を `completed/` に移して commit / push する
