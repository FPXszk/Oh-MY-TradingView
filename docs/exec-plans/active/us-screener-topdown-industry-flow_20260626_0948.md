# US Screener Top-down Industry Flow Plan

## Goal

米国株 Daily Fundamental Screener を、個別銘柄スクリーニング後の銘柄だけで Industry を集計する流れから、Phase1 上位セクター内の広い母集団で Industry を先に評価し、その上位 Industry 内で既存の個別銘柄スクリーニングを行うトップダウン方式へ変更する。

## Assumptions

- Phase1 の採用セクター数は既存どおり `SCREENER_SELECTED_SECTOR_COUNT=3` を維持する。
- Industry Ranking 用の広い母集団は、Phase1 上位セクターに対する TradingView Scanner API 取得結果から、取引所 / symbol universe / profile scope だけを通した行とする。
- EPS(TTM) > 0、Close > SMA200、Close > SMA50、52週高値75%以上、Perf.3M、セクター別 profile 条件、ROIC / GP/A / FCF margin / P/FCF / ATR% などの個別評価は Phase3 で維持する。
- 日本株レポートの Phase2-Phase4 構成は変更しない。

## Files

| File | Action | Purpose |
|---|---|---|
| `src/core/fundamental-screener.js` | MODIFY | Industry集計用の広い母集団を作り、Phase2 Industry ranking、Phase3対象Industry選抜、Phase4個別ランキングを分離する |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | 米国レポートを Phase2 Industryランキング / Phase4 個別銘柄ランキングの見出し・列へ更新する |
| `tests/fundamental-screener.test.js` | MODIFY | 広い母集団のIndustry集計と上位Industry内の個別スクリーニングを回帰テストする |
| `tests/daily-screener-report.test.js` | MODIFY | Phase2 Industry表の新列と Phase4 見出しを検証する |
| `tests/line-screener-notify.test.js` | MODIFY | 通知のTop3抽出が Phase4 見出しでも維持されることを確認する |
| `docs/reports/screener/daily-ranking.md` | UPDATE | 実行後の生成レポートを新しい階層表示へ更新する |
| `docs/exec-plans/active/us-screener-topdown-industry-flow_20260626_0948.md` | MOVE | 完了時に `docs/exec-plans/completed/` へ移動する |

## Implementation Steps

- [ ] RED: coreテストに、個別スクリーニングでは1銘柄だけ通るIndustryより、広い母集団で強いIndustryがPhase2上位に来るケースを追加する。
  - 確認: 既存実装では `summarizeIndustries(ranked)` のため期待に合わず失敗する。
- [ ] GREEN: Industry集計用の広い母集団を `scopeFiltered` から作り、`summarizeIndustries` を総合点依存ではなくIndustry総合スコアと指定指標で集計できるようにする。
  - 確認: Phase2 Industry Ranking にセクター、Industry、構成銘柄数、平均12M/6M/3M、SPY差、SMA50/200上比率、52w高値90%内比率、平均RSI、平均相対出来高、Industry総合スコア、上位銘柄が入る。
- [ ] GREEN: Phase2上位Industryに属する行だけへ既存の個別銘柄 hard gate / supplement / scoring を適用し、Phase4個別ランキングを既存総合点順で作る。
  - 確認: Final用の銘柄選抜はPhase2上位Industry内に限定され、T/Fスコア表示は維持される。
- [ ] RED/GREEN: Markdown出力を `Phase2 Industryランキング` と `Phase4 個別銘柄ランキング` へ更新する。
  - 確認: 旧 `Final 個別銘柄ランキング` 見出しは米国レポートに出ない。
- [ ] REVIEW: 変更差分を確認し、ロジック破綻、過剰な抽象化、不要な副作用がないか見る。
  - 確認: 日本株フローと無関係なレポート構成は変更されていない。
- [ ] VERIFY: focused tests と必要なレポート生成を実行する。
  - 確認: `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js tests/line-screener-notify.test.js` が通る。
  - 確認: 米国 daily screener 実行で `docs/reports/screener/daily-ranking.md` が新しい階層になる。

## Risks

- Industry集計母集団を広げるため、TradingView Scanner API の取得件数上限に近いセクターではIndustry構成数が取得範囲に依存する。
- 既存 profile request に industry scope が含まれる場合、同一セクターへ複数 request が出るため重複排除を維持する必要がある。
- Phase2で選んだIndustry内にPhase3条件を通る銘柄がない場合、Phase4掲載数が減る可能性がある。

## Out of Scope

- TradingView sector / industry 名称の独自正規化。
- `SCREENER_SELECTED_SECTOR_COUNT=3` の変更。
- 日本株スクリーナーの階層ロジック変更。
- repo custom theme taxonomy の再設計。
