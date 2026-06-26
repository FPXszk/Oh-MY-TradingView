# US Screener Phase4 Top20 Industries Top40 Stocks Plan

## Goal

米国株 Daily Fundamental Screener の Phase4 個別銘柄ランキングを、Phase3 Industryランキング上位20業種に含まれる全通過銘柄から全業種横断でスコア順に作り、表示・出力は上位40銘柄までに制限する。

## Assumptions

- Phase3 Industryランキング自体は既存どおり上位20業種を表示する。
- Phase4の対象Industryは、Phase3に表示される上位20業種と同じ集合にする。
- 個別銘柄の hard gate、補完処理、`rankScore` / T/Fスコア計算は既存ロジックを維持する。
- Phase4表示上限40は米国株レポートのみへ適用し、日本株フローは変更しない。

## Files

| File | Action | Purpose |
|---|---|---|
| `src/core/fundamental-screener.js` | MODIFY | Phase4対象Industryを上位20へ拡大し、全業種横断rankScore順の上位40銘柄に制限する |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | Phase4説明文を「上位20業種 / 上位40銘柄」仕様へ更新する |
| `tests/fundamental-screener.test.js` | MODIFY | Phase4が上位20Industry対象かつ上位40銘柄上限であることを回帰テストする |
| `tests/daily-screener-report.test.js` | MODIFY | Phase4説明文の新仕様を検証する |
| `docs/reports/screener/daily-ranking.md` | UPDATE | 新仕様で米国レポートを再生成する |
| `docs/exec-plans/active/us-screener-phase4-top20-industries-top40-stocks_20260626_1014.md` | MOVE | 完了時に `docs/exec-plans/completed/` へ移動する |

## Implementation Steps

- [x] RED: Phase4の対象Industry数と表示上限40の期待値をテストへ追加する。
  - 確認: 現行の上位5Industry前提では失敗する。
- [x] GREEN: Phase4対象IndustryをPhase3表示上位20業種に合わせ、個別銘柄ランキングを横断スコア順の上位40銘柄へ制限する。
  - 確認: `final_industries_selected` は最大20、Phase4銘柄数は最大40になる。
- [x] GREEN: MarkdownのPhase4説明文を新仕様へ更新する。
  - 確認: `対象Industry` が上位20業種を前提にし、表示上限40が明記される。
- [x] REVIEW: 差分を確認し、既存の補完・スコアリング・日本株フローへ副作用がないか見る。
  - 確認: `rankScore` 計算順序とT/F表示は変えない。
- [x] VERIFY: focused tests、米国レポート生成、unit tests を実行する。
  - 確認: `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js tests/line-screener-notify.test.js` が通る。
  - 確認: `npm run test:unit` が通る。

## Risks

- Phase4対象が広がるため、掲載銘柄のセクター/Industry分布が以前より広がり、レポートの見え方が変わる。
- Phase3上位20Industry内の通過銘柄が40を超える場合、41位以下は出力されない。
- 実データではTradingView APIの取得範囲によりPhase3 Industry Rankingの母集団が変動する。

## Out of Scope

- Industryランキングのスコア式変更。
- `SCREENER_SELECTED_SECTOR_COUNT=3` の変更。
- 個別銘柄スコア計算式やT/F配分の変更。
- 日本株スクリーナーのPhase4表示変更。
