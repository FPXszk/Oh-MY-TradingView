# Exec-plan: remove-pfcf-hard-filter-and-keep-soft-penalty_20260604_1135

## 概要

目的: `P/FCF` による hard filter を日本株・米国株の両方で撤廃し、既存の `riskValue` ranking penalty のみで扱うように変更する。そのうえで local / workflow 実行で、レポート生成と順位変化を実際に確認する。

期待動作:

- `P/FCF` が高い銘柄でも即失格にならず候補に残る
- `P/FCF` の高さは `riskValue` ブロックの penalty としてのみ効く
- 日本株では `285A (キオクシアホールディングス)` が引き続き上位に残る
- 米国株でも `P/FCF` だけを理由に取りこぼさない
- report の guide / 文言も hard filter なしの説明へ揃う

## 変更・作成ファイル

| ファイル | 種別 | 役割 |
|---|---|---|
| `docs/exec-plans/active/remove-pfcf-hard-filter-and-keep-soft-penalty_20260604_1135.md` | CREATE | 本計画 |
| `src/core/fundamental-screener.js` | MODIFY | `P/FCF` hard filter を撤廃し、failure reason も soft penalty 前提に整理 |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | profile guide の文言を hard gate ではなく scoring penalty として表示 |
| `src/core/sector-screening-profiles.js` | MODIFY | 必要なら profile summary の説明用フィールドを soft penalty 前提に調整 |
| `tests/fundamental-screener.test.js` | MODIFY | US/JP ともに高 `P/FCF` 銘柄が失格にならず残ることを固定 |
| `tests/daily-screener-report.test.js` | MODIFY | guide 文言が `P/FCF < X` hard gate を示さないことを固定 |
| `docs/exec-plans/completed/remove-pfcf-hard-filter-and-keep-soft-penalty_20260604_1135.md` | MOVE | 完了時に移動 |

## 影響範囲

- `Daily Fundamental Screener`
- `Daily Fundamental Screener Japan`
- `docs/reports/screener/daily-ranking.md`
- `docs/reports/screener/daily-ranking-jp.md`
- ranking guide / profile summary 文言

## 範囲外

- `riskValue` ブロック自体の大幅な重み再設計
- `P/FCF` をテーマ別・業種別に別関数で normalize する拡張
- みんかぶ taxonomy や hierarchy の再設計

## 実装方針

### 1. hard filter を外し、penalty は現状維持を基本にする

- 現在の `riskValue` は総合 15% のうち 5項目平均なので、`P/FCF` の実効 penalty は概ね 3% 相当
- これは「残すが少し不利にする」という目的には十分穏やか
- まずは重み変更なしで確認する

### 2. report 文言を実装と一致させる

- 現状ガイドは `P/FCF < X` を hard gate と読める
- 実装変更後は `P/FCF` を scoring / risk penalty として説明する

### 3. US/JP 両方を live run で確認する

- Japan workflow: キオクシアが残ること
- US workflow: レポート生成成功と `P/FCF` hard filter 廃止後の出力確認

## 実施ステップ

- [ ] Step 1: `P/FCF` hard filter の差し込み点と report 文言の差し込み点を確認する
  - 確認: `passesProfileClientFilters`, `collectClientFilterFailures`, profile guide 文言

- [ ] Step 2: RED として US/JP の期待を tests に追加する
  - 確認: 高 `P/FCF` 銘柄が失格にならず残る期待を固定
  - 確認: guide 文言が hard gate を示さない期待を固定

- [ ] Step 3: hard filter 撤廃と soft penalty 文言へ実装を修正する
  - 確認: `riskValue` penalty はそのまま残る

- [ ] Step 4: local test / report 再生成で確認する
  - 確認: test green
  - 確認: US/JP report 生成成功

- [ ] Step 5: Japan workflow を実行して live 確認する
  - 確認: run success / publish / `285A` の順位確認

- [ ] Step 6: US workflow を実行して live 確認する
  - 確認: run success / publish / report 生成確認

- [ ] Step 7: REVIEW / COMMIT
  - 確認: plan を `completed/` に移動し、変更一式を main に commit / push する

## テスト戦略

- RED
  - `tests/fundamental-screener.test.js`
  - `tests/daily-screener-report.test.js`
- GREEN
  - hard filter removal + guide wording update
- REFACTOR
  - 必要最小限の helper 整理のみ

## 検証コマンド

- `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js tests/theme-taxonomy.test.js`
- `SCREENER_MARKET=japan SCREENER_EXCHANGES=TSE SCREENER_SYMBOL_ALLOWLIST_KEY=jpx-prime node scripts/screener/run-fundamental-screening.mjs`
- `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs`
- `gh workflow run "Daily Fundamental Screener Japan" --ref main`
- `gh workflow run "Daily Fundamental Screener" --ref main`

## リスク・注意点

- hard filter を外すと候補母集団は増えるので、上位ランキングの顔ぶれが少し変わる
- `docs/reports/screener/daily-ranking.md` に既存未コミット差分があるため巻き込まない
- workflow rerun は live データ次第で顔ぶれが変動する

## 競合確認

- active plan:
  - `docs/exec-plans/active/screener-architecture-flow-doc_20260601_1430.md`
  - `docs/exec-plans/active/japan-screener-theme-implementation-and-live-debug_20260602_1500.md`
  - `docs/exec-plans/active/japan-screener-granularity-and-source-feasibility_20260602_1447.md`
- 今回は `P/FCF` 扱いの follow-up 修正計画

---

作成者: Codex
作成日時: 2026-06-04T11:35:00+09:00
