# Exec-plan: tradingview-industry-theme-taxonomy-alignment_20260626_0056

## Goal

米国株スクリーナーのPhase3/Phase4で使うrepo独自テーマ分類とTradingView `industry`分類の関係を整理し、今後の中テーマ・小テーマの正本方針を決定できる調査資料を作成する。

## Scope

### In scope

- 現行theme taxonomyの入力JSON、判定条件、スコアリング、fallbackを整理する。
- TradingView scannerから米国の`sector -> industry` snapshotを取得する。
- Heatmapの下位表示・network responseが`industry`を使うか確認する。
- current middle/small themeとTradingView industryの対応表を作成する。
- industryのみ、symbol、company keyword、弱い根拠の分類に区分する。
- FactSet、RBICS、GICS、ICB、NAICS/SIC、Morningstar、MSCI、Nasdaq、S&P Kenshoを比較評価する。
- Phase3/Phase4の推奨方針を文書化する。

### Out of scope

- `theme-taxonomy-us.json`等の分類内容変更。
- GICS/ICB等への移行。
- ランキング・スコアリングロジック変更。
- Phase4銘柄順位の変更。

## Files

| File | Action | Purpose |
|---|---|---|
| `src/core/theme-taxonomy.js` | READ | current classification logic |
| `config/screener/theme-taxonomy-us.json` | READ | middle/small theme rules |
| `config/screener/theme-hierarchy-us.json` | READ | hierarchy selection |
| `config/screener/external-theme-reference-us.json` | READ | external reference evidence |
| `src/core/fundamental-screener.js` | READ | Phase3/Phase4 integration and scoring |
| `docs/reports/screener/daily-ranking.md` | READ | current rendered output |
| `config/screener/tradingview-sector-industry-snapshot-us.json` | CREATE | scanner sector/industry snapshot |
| `docs/research/tradingview-us-sector-industry-snapshot.md` | CREATE | snapshot readable summary |
| `docs/research/tradingview-industry-and-theme-taxonomy-alignment.md` | CREATE | final alignment report |
| `docs/research/manifest.json` | MODIFY | keep research outputs |
| `docs/references/design-ref-llms.md` | MODIFY | external sources ledger |
| 本exec-plan | MOVE | completedへ移動 |

## Steps

- [x] current taxonomy JSONとclassification call chainを整理する。
- [x] scoring priorityとclassification basisを全ruleについて抽出する。
- [x] TradingView scannerからsector/industry snapshotを取得・保存する。
- [x] Heatmapのsector drill-downとnetwork responseを調査する。
- [x] custom themeとTradingView industryの対応・confidence・推奨actionを作る。
- [x] 外部分類候補を一次資料中心に比較する。
- [x] 2つのresearch文書、snapshot JSON、reference ledger、manifestを更新する。
- [x] JSON/文書/layout/full testsを実行する。
- [x] 計画をcompletedへ移動し、commit/pushする。

## Success Criteria

- primaryTheme/subThemesの由来と判定順序が明示されている。
- TradingView sector/industry snapshotが再利用可能なJSONで保存されている。
- Heatmapの下位表示がindustryかどうか根拠付きで判定されている。
- 全current themeについてclassification basisとconfidenceが整理されている。
- Phase3/Phase4の推奨正本方針が示されている。
- runtime分類・rankingロジックに変更がない。

## Validation

```powershell
Get-Content config/screener/tradingview-sector-industry-snapshot-us.json -Raw | ConvertFrom-Json
node --test tests/archive-latest-policy.test.js tests/theme-taxonomy.test.js
npm run test:unit
git diff --check
```

## Risks

- Heatmap下位表示はcanvas描画でDOM抽出しにくいため、network responseとbundle定義を主根拠にする。
- 外部分類体系はライセンス・粒度・更新頻度が異なるため、利用可否と分類上の適合性を分けて評価する。
- scanner snapshotは時点データなので、取得日時・filter・銘柄数を必ず記録する。
