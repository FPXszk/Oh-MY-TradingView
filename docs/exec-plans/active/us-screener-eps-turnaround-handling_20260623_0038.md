# Exec-plan: us-screener-eps-turnaround-handling_20260623_0038

## Goal

米国 daily screener の EPS YoY について、前年 EPS が赤字だったために TradingView の YoY% が投資判断と逆向きに見えるケースを扱う。まずは TradingView から取れる `eps > 0 && epsGrowthTtm < -100` の推定ルールで黒字転換を検出し、表示を強調し、growth scoring では加点する。

## Assumptions

- 今回は公式 IR/SEC の個別 EPS 値までは追加しない。
- SNDK のような個別公式値は次段で `config/screener/us-fundamental-supplements.json` に `previousEps/currentEps` を持たせる余地を残す。
- TradingView 生値は破棄せず、表示や採点用の派生フィールドだけを追加する。
- Japan screener の EPS 補完方針は変更しない。

## Files

| File | Action | Purpose |
|---|---|---|
| `src/core/fundamental-screener.js` | MODIFY | EPS 黒字転換/赤字転落の推定メタデータと採点用値を追加し、growth block の EPS rank を採点用値へ差し替える |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | EPS YoY 列で黒字転換を強調表示し、説明文を更新する |
| `tests/fundamental-screener.test.js` | MODIFY | 黒字転換が `epsGrowthScoreValue` で加点され、raw YoY が残ることを固定する |
| `tests/daily-screener-report.test.js` | MODIFY | レポートの EPS YoY 表示に `黒字転換` が出ることを固定する |
| `docs/reports/screener/daily-ranking.md` | MODIFY候補 | 実行確認で生成差分が出た場合のみ更新する |
| `docs/reports/screener/daily-ranking-run.json` | MODIFY候補 | 実行確認で生成差分が出た場合のみ更新する |
| `docs/exec-plans/active/us-screener-eps-turnaround-handling_20260623_0038.md` | CREATE | 本計画 |
| `docs/exec-plans/completed/us-screener-eps-turnaround-handling_20260623_0038.md` | MOVE | 完了時に移動 |

## Scope

### In scope

- `eps > 0 && epsGrowthTtm < -100` を黒字転換推定として扱う。
- 黒字転換は表示上 `黒字転換 (raw -144.5%)` のように強調する。
- growth scoring では黒字転換を強めのプラス評価にする。
- TradingView raw 値は `epsGrowthTtm` として維持する。

### Out of scope

- SNDK の公式 IR/SEC 数値を個別補助 JSON に追加すること。
- 全銘柄の前年 EPS / current EPS を外部 API から取得すること。
- Japan screener の EPS 補完仕様変更。
- EPS YoY 以外の growth rank 全体再設計。

## Implementation Steps

- [ ] Step 1: 現行 EPS rank / 表示 / テスト fixture を確認し、差し込み点を確定する。
  - 確認: `epsGrowthTtm` の rank と report cell が限定的に把握できている。
- [ ] Step 2: fundamental screener に EPS 状態判定を追加する。
  - 確認: 黒字転換では raw `epsGrowthTtm` を残しつつ `epsGrowthStatus`, `epsGrowthDisplay`, `epsGrowthScoreValue` が付く。
- [ ] Step 3: growth rank の EPS field を `epsGrowthScoreValue` に変更する。
  - 確認: 黒字転換銘柄が raw negative YoY で不利にならない。
- [ ] Step 4: report の EPS YoY 表示と説明文を更新する。
  - 確認: 表示に `黒字転換` と raw 値が出る。
- [ ] Step 5: focused tests を追加/更新する。
  - 確認: RED/GREEN で `tests/fundamental-screener.test.js` と `tests/daily-screener-report.test.js` が通る。
- [ ] Step 6: 必要なローカル検証を実行し、差分をレビューする。
  - 確認: `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js` が通る。

## Validation Commands

```powershell
node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js
```

必要なら追加で:

```powershell
node scripts/screener/run-fundamental-screening.mjs
```

## Risks

- `eps > 0 && epsGrowthTtm < -100` は推定ルールなので、特殊会計やデータ異常を完全には判別できない。
- 黒字転換の加点値が強すぎると momentum/quality より EPS 状態が効きすぎる可能性があるため、growth block 内だけの補正に留める。
- 公式値がある銘柄では次段の supplements でより正確な表示へ拡張する余地を残す。

## Existing Active Plans

- `screener-architecture-flow-doc_20260601_1430.md`: 説明ドキュメント計画であり、今回の EPS scoring 変更と直接競合しない。
- `japan-screener-granularity-and-source-feasibility_20260602_1447.md`: Japan 調査計画であり、今回の US EPS 表示・採点変更と直接競合しない。
- `japan-screener-theme-implementation-and-live-debug_20260602_1500.md`: Japan theme 実装計画であり、今回の US EPS 表示・採点変更と直接競合しない。
