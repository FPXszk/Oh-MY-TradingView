# Japan screener profile fallback plan 20260717_1749

## Goal

直近の `e27d4d3 feat: refine japan screener profiles` で日本株プロファイルを 11 分類へ細分化した設計は維持しつつ、専門プロファイルの Industry 条件に一致しない銘柄が `findMatchingProfile()` で未割り当てになり、意図せず候補から脱落する問題を修正する。

## Current Profile Assignment

`src/core/fundamental-screener.js` の現在の割り当ては次の順序。

1. `getSectorScreeningPlan()` が Phase1 選択セクターに対応する active profiles を返す。
2. `fetchProfileRows()` が profile ごとに TradingView Scanner API を呼ぶ。
3. Phase2 は取得行に対して `passesScopeFilters()` と `passesProfileScope()` を適用する。
4. `annotateRowForProfile()` が最初に一致した profile の threshold / label を行へ付与する。

`findMatchingProfile()` は次の条件を満たす最初の profile を返す。

```js
function findMatchingProfile(row, profiles) {
  return profiles.find((profile) => (
    profile.requestScopes.some((scope) => scope.sector === row.sector)
    && passesProfileScope(row, profile)
  )) ?? null;
}
```

`profiles.find()` の先頭一致方式により、専門プロファイルを先、フォールバックを後ろに置く必要がある。

## Null Conditions

`findMatchingProfile()` または Phase2 の `passesProfileScope()` が実質 null / false になる条件は次の通り。

- row の `sector` に対応する active profile がない。
- 対応 profile はあるが、専門 profile の `includeRow()` が Industry 条件に一致しない。
- 対応 profile の `excludeRow()` に一致する。
- Finance / Utilities は `JP_PHASE2_EXCLUDED` で明示的に Phase2 対象外だが、これは異常として扱わない。

## Baseline Diagnostic

2026-07-17 17:49 JST 時点の現行コードで、日本株スクリーナーを fetch wrapper 付きで診断した。

```text
totalScanned=313
serverFiltered=172
phase1Filtered=172
clientFiltered=68
matched=68
profileRequestCount=6
Phase5 fetchedRows=644
Phase5 clientFilteredRows=190
Phase5 displayedRows=61
EDINET enabled=false
EDINET reason=missing_api_key
EDINET requested=48
EDINET supplemented=0
```

この Codex 実行環境では `EDINET_API_KEY` が見えていない。ユーザー側 PowerShell には設定済みとのことなので、実装後の再実行で再確認する。

## Profile Unmatched Rows

診断時点の Phase2 allowed rows は 192 行、Finance を除いた非除外 rows も 192 行。そのうち 18 行が profile 未割り当て。

```text
profileUnmatchedRows=18
profileUnmatchedSectors=Consumer Durables, Producer Manufacturing
```

未割り当て Sector / Industry は次の通り。

| Sector | Industry | Count | Sample symbols |
|:---|:---|---:|:---|
| Producer Manufacturing | Trucks/Construction/Farm Machinery | 4 | 3105, 6432, 6310, 6306 |
| Consumer Durables | Electronics/Appliances | 3 | 6752, 7731, 6445 |
| Consumer Durables | Other Consumer Specialties | 3 | 8050, 7976, 8008 |
| Consumer Durables | Recreational Products | 3 | 7867, 3028, 7990 |
| Producer Manufacturing | Building Products | 3 | 5332, 5393, 7981 |
| Consumer Durables | Home Furnishings | 1 | 5938 |
| Producer Manufacturing | Office Equipment/Supplies | 1 | 7846 |

現在の選択セクターでは Electronic Technology / Process Industries の未割り当ては出ていないが、将来の TradingView Industry 変化に備えてフォールバックを追加する。

## Scope

### 作成・変更するファイル

- `docs/exec-plans/active/japan-screener-profile-fallback_20260717_1749.md`
  - この計画。完了時に `docs/exec-plans/completed/` へ移動する。
- `src/core/sector-screening-profiles.js`
  - Japan profile fallback を追加する。
  - Industry 判定を単純な `includes()` から管理された正規化名セットへ寄せる。
  - profile overlap を検証しやすい helper export を最小限追加する。
- `src/core/fundamental-screener.js`
  - profile 未割り当てメタデータを結果へ追加する。
  - Finance / Utilities など明示的 Phase2 除外セクターは未割り当て異常に含めない。
- `scripts/screener/run-fundamental-screening.mjs`
  - profile 未割り当てメタデータをログまたはレポートガイドへ表示する。
- `tests/fundamental-screener.test.js`
  - fallback、重複防止、専門優先、非除外セクター割り当ての回帰テストを追加する。
- `tests/daily-screener-report.test.js`
  - 日本株レポートの profile summary / profile unmatched 表示を更新する。
- `docs/reports/screener/daily-ranking-jp.md`
  - 日本株スクリーナー再実行結果。
- `docs/reports/screener/daily-ranking-jp-run.json`
  - 実行パスで更新される場合のみ含める。

### 変更しないファイル

- `AGENTS.md`
- `.github/workflows/daily-screener.yml`
- `.github/workflows/daily-screener-japan.yml`
- 米国株スクリーナーロジック
- `artifacts/observability/`
- `artifacts/screenshots/`

既存の未コミット差分 `docs/reports/screener/daily-ranking.md` と未追跡 artifacts は計画外としてステージしない。

## Fix Plan

- Electronic Technology
  - `Japan Semiconductor & Electronics` の後ろに `Japan Electronics Other` を追加する。
  - `Aerospace & Defense`、`Office Equipment/Supplies`、未知の Electronic Technology Industry を fallback へ流す。
- Producer Manufacturing
  - `Japan Machinery & FA` / `Japan Auto & Components` の後ろに `Japan Manufacturing Other` を追加する。
  - `Trucks/Construction/Farm Machinery`、`Building Products`、未知の製造業 Industry を fallback へ流す。
- Process Industries
  - `Japan Materials & Chemicals` の後ろに `Japan Process Industries Other` を追加する。
- Consumer Durables
  - `Japan Auto & Components` に該当しない Consumer Durables は `Japan Consumer Cyclicals` が受ける。
  - 自動車関連が Consumer Cyclicals に重複しない契約をテストで固定する。
- Industry 判定
  - `industry.includes(pattern)` をやめ、正規化後の明示的 Industry 名セットで判定する。
  - 未知 Industry は専門分類へ寄せず、fallback profile に送る。

## Implementation Steps

- [ ] 計画外差分を確認し、今回のステージ対象から除外する。
- [ ] `sector-screening-profiles.js` に管理された Industry 判定 helper と fallback profiles を追加する。
- [ ] profile overlap / assignment を検証できる最小 helper を export する。
- [ ] `fundamental-screener.js` に `profileUnmatchedRows`、`profileUnmatchedSectors`、`profileUnmatchedIndustries` を追加する。
- [ ] `run-fundamental-screening.mjs` のログ / レポートに profile 未割り当て状況を表示する。
- [ ] `tests/fundamental-screener.test.js` に fallback と重複防止テストを追加する。
- [ ] `tests/daily-screener-report.test.js` にレポート表示テストを追加する。
- [ ] 日本株スクリーナーを日本株出力先だけで再実行する。
- [ ] 修正前後の比較を Implementation Results に記録し、計画を `completed/` へ移動する。

## Validation

- `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js`
- `npm run test:unit`
- `npm run test:contract`
- `git diff --check`
- 日本株スクリーナー再実行:

```powershell
$env:SCREENER_WORKFLOW_LABEL = "daily-screener-japan"
$env:SCREENER_REPORT_PATH = "docs/reports/screener/daily-ranking-jp.md"
$env:SCREENER_METADATA_PATH = "docs/reports/screener/daily-ranking-jp-run.json"
$env:SCREENER_MARKET = "japan"
$env:SCREENER_EXCHANGES = "TSE"
$env:SCREENER_SYMBOL_ALLOWLIST_KEY = "jpx-prime"
$env:SCREENER_SELECTED_SECTOR_COUNT = "5"
$env:SCREENER_RESULT_LIMIT = "90"
$env:SCREENER_GROSS_MARGIN_MIN_PCT = "30"
$env:SCREENER_SCOPE_LABEL = "JPX Prime domestic stocks snapshot (2026-03-31)"
$env:SCREENER_CURRENCY_SYMBOL = "¥"
node scripts/screener/run-fundamental-screening.mjs
```

## Out Of Scope

- Finance 専用スコアリング。
- Utilities 専用スコアリング。
- Finance / Utilities の Phase2 除外解除。
- JPX Prime allowlist 自動更新。
- 日本株全体のスコア配分変更。
- 米国株スクリーナーのロジック変更。

## Completion Criteria

- 選択された非除外 Sector で profile 未割り当てが 0 件になる。
- 専門 profile が fallback より優先される。
- 自動車関連が `Japan Auto & Components` に入り、`Japan Consumer Cyclicals` / `Japan Manufacturing Other` と重複しない。
- 日本株レポートで profile 未割り当て状況と fallback profile summary が確認できる。
- `npm run test:unit`、`npm run test:contract`、`git diff --check` が成功する。
- 計画ファイルが `docs/exec-plans/completed/` へ移動し、実装コミットが `main` に push される。
