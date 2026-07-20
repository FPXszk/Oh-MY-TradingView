# Japan Screener EDINET Ranking Audit Plan

## Goal

日本株スクリーナーで FCF マージン、P/FCF、FCF 成長率、キャッシュコンバージョンなどの財務指標に誤った値が混入し、ランキング順位が不当に上昇する状態を防ぐ。EDINET / TradingView / Moomoo / 派生計算の出所を指標単位で追跡し、invalid な値をランキング計算に使わせず、監査 JSON・レポート・GitHub Actions・LINE 通知で検知できるようにする。

## Scope

### Files To Modify

- `src/core/edinet.js`
  - EDINET CSV/TSV のヘッダー解析、明示的な値列採用、fact 構造化、contextRef・期間・連結区分・単位検証、年次優先、CAPEX 正規化、provenance 生成。
- `src/core/fundamental-screener.js`
  - 日本株 FCF 系指標の優先順位、補完前後ランキング保持、rankEligible 制御、metricProvenance のランキング連携。
- `scripts/screener/run-fundamental-screening.mjs`
  - 監査 JSON 出力、財務データ監査セクション、ランキング表の品質表示、CLI/env 統合。
- `scripts/line/send-screener-line-message.mjs`
  - LINE 成功/失敗通知へ監査概要と代表警告を追加。
- `.github/workflows/daily-screener-japan.yml`
  - `SCREENER_AUDIT_PATH` / `SCREENER_AUDIT_STRICT`、監査 artifact、critical 時の成果物保持を追加。
- `tests/fundamental-screener.test.js`
  - 日本株 EDINET 補完、優先順位、invalid 除外、補完前後ランキングのテスト追加。
- `tests/daily-screener-report.test.js`
  - 監査セクション、品質表示、監査 JSON/レポート表示のテスト追加。
- `package.json`
  - 新規テストファイルを追加した場合のみ `test:unit` 対象を更新。
- `docs/reports/screener/daily-ranking-jp.md`
  - 実データ再実行で生成される監査セクションを含むレポート。
- `docs/reports/screener/daily-ranking-jp-run.json`
  - 実データ再実行で更新されるメタデータ。

### Files To Create

- `src/core/screener-audit.js`
  - 指標異常、rankEligible、補完前後差分、前回実行差分、critical 判定を行う純粋関数群。
- `tests/screener-audit.test.js`
  - 監査ロジック、rankDelta、Top10 流入/脱落、critical 条件の決定論的テスト。
- `docs/reports/screener/daily-ranking-jp-audit.json`
  - 日本株スクリーナー監査結果。実行ごとに上書きされる。

### Files Not To Modify

- `AGENTS.md`
- `.github/copilot-instructions.md`
- 米国株レポート生成形式。ただし回帰確認のためコードパスは検証する。

## Current Evidence

- 作業開始時の `git status --short --branch`: `## main...origin/main`。未コミット変更なし。
- 作業開始時の `git log -5 --oneline`:
  - `bdd00d9 dd`
  - `f14278e addddd`
  - `fb54b16 docs: daily screener japan report run 29571215661-1`
  - `7d41317 fix: load repo env for screener`
  - `66e06bf docs: screener repo env load plan`
- `docs/exec-plans/active/` は `.gitkeep` のみで、競合する active plan はない。
- `docs/reports/screener/daily-ranking-jp.md` の 2026-07-17 版では、EDINET が `active / 対象 48銘柄 / 書類一致 48件 / 指標補完 48銘柄` と表示されている。
- 同レポートの Phase4 Top10 には 4634 artience が 6位、2222 寿スピリッツが 7位で入り、FCF マージンがそれぞれ 69.4% / 85.4% と表示されている。
- `src/core/edinet.js` の `collectFactRows()` は各行の `numericValues` を集め、`numericValues[numericValues.length - 1]` を値として採用している。これは列意味を確認せず最後の数値を採用する挙動であり、今回の主要修正対象。
- `src/core/fundamental-screener.js` の `applyEdinetSupplementalMetrics()` は `row.fcfMargin ?? metrics.fcfMargin` のように TradingView 既存値を EDINET 補完値より優先するため、異常値の出所を EDINET と決めつけられない。
- 既存メタデータ `docs/reports/screener/daily-ranking-jp-run.json` は run id / sha / generated_at だけで、指標単位の provenance と監査差分を保持していない。

## Root Cause Investigation

実装前後で以下を証拠として記録する。

- 4634 artience、2222 寿スピリッツ、現在の Top10、FCF マージン 50%以上、極端な P/FCF、極端な cashConversion、極端な FCF 成長率の各銘柄を調査対象にする。
- 各対象について、TradingView 値、EDINET 値、Moomoo/その他補完値、派生計算値、補完前値、補完後値、ランキング使用値を `metricProvenance` と監査 JSON に残す。
- EDINET fact について、営業CF、設備投資、無形資産投資、FCF、売上、純利益、対象期間、連結/個別、単位、contextRef、書類種別、提出日、CSV ファイル名を追跡する。
- 原因候補は以下に分けて確定する。
  - EDINET CSV/TSV の値列誤採用。
  - TradingView 既存値の優先採用。
  - 期間不整合または半期/四半期累計値の TTM 誤用。
  - 連結/個別の混在。
  - 単位または currency の不整合。
  - CAPEX 符号の二重減算。
  - 上記以外の派生計算または補完統合の問題。

## Implementation Steps

- [ ] 現行コードと実データの再現を行う。
  - [ ] `.github/workflows/daily-screener-japan.yml` と同等の env で日本株スクリーナーを実行する。
  - [ ] 4634、2222、Top10、高 FCF マージン候補の補完前/補完後/ランキング使用値をログではなく構造データで確認する。
- [ ] EDINET fact 解析を修正する。
  - [ ] ヘッダーを NFKC 正規化、空白除去、大小文字正規化して列名を判定する。
  - [ ] 認識済みの明示的な値列のみ `rawValue` として採用する。
  - [ ] 値列を特定できない fact は不採用にし、監査理由を残す。
  - [ ] fact 構造に `conceptId`、`label`、`contextRef`、`periodType`、`periodStart`、`periodEnd`、`instantDate`、`relativePeriod`、`consolidation`、`unitId`、`currency`、`scale`、`decimals`、`rawValue`、`normalizedValue`、`sourceFile`、`documentId`、`documentType`、`submittedAt` を持たせる。
- [ ] EDINET 指標検証を追加する。
  - [ ] duration/instant、current/prior、期間長、連結/個別、currency、unit/scale/decimals を検証する。
  - [ ] 最新通期連結値を優先し、連結がなければ個別 fallback として `consolidationFallback: true` を記録する。
  - [ ] 半期・四半期値を `fcfTtm` / `pFcf` / 年間ランキング値として使わない。
  - [ ] CAPEX は支出額として正規化し、営業CF・CAPEX・FCF の整合性を検証する。
- [ ] 指標 provenance と優先順位を実装する。
  - [ ] `fcfTtm`、`fcfMargin`、`fcfGrowthTtm`、`cashFromOperationsTtm`、`cashConversion`、`pFcf`、`revenueGrowthTtm` に `metricProvenance` を付与する。
  - [ ] 日本株 FCF 系指標は、検証済み EDINET 通期連結値、検証済み一次情報、TradingView、不明の順で採用する。
  - [ ] TradingView と EDINET の差分を記録し、差分が大きい場合は warning とする。
  - [ ] invalid 指標をランキング計算へ渡す前に `null` 化または rank 対象外にする。
- [ ] 監査モジュールを追加する。
  - [ ] `src/core/screener-audit.js` に valid/warning/invalid、rankEligible、critical 条件、補完前後差分、前回実行差分を実装する。
  - [ ] `docs/reports/screener/daily-ranking-jp-audit.json` を生成する。
  - [ ] critical 時は strict モードで非0終了にする。ただし artifact を残せる順序にする。
- [ ] レポートと LINE 通知を更新する。
  - [ ] 日本株レポートに `財務データ監査`、補完前後順位差分、異常値・要確認指標、EDINET 抽出元の表を追加する。
  - [ ] ランキング表に短い品質表示を追加する。
  - [ ] LINE 成功/警告/失敗通知に監査概要と代表例を追加し、機密情報を出さない。
- [ ] GitHub Actions を更新する。
  - [ ] 日本株ワークフローに audit env、監査実行、存在確認、artifact 対象追加を入れる。
  - [ ] critical 時もレポートと audit JSON を artifact として回収できるように `if: always()` の位置を確認する。
- [ ] テストを追加・更新する。
  - [ ] EDINET 解析 fixture で「最後の数値」誤採用を防ぐ。
  - [ ] artience 相当、寿スピリッツ相当の FCF マージンを再現し、69.4% / 85.4% にならないことを検証する。
  - [ ] 優先順位、invalid 除外、warning、米国株非影響を検証する。
  - [ ] 監査 JSON、補完前後ランキング差分、レポート表示、LINE 通知を検証する。
- [ ] 実データ再実行とレビューを行う。
  - [ ] 日本株スクリーナーを同一 env で再実行する。
  - [ ] 米国株スクリーナーまたは関連テストで回帰確認する。
  - [ ] `git diff --check`、関連 `node --test`、`npm run test:unit`、`npm run test:contract` を実行する。
- [ ] 完了処理を行う。
  - [ ] Implementation Results をこの計画に追記する。
  - [ ] active plan を `docs/exec-plans/completed/` へ移動する。
  - [ ] Conventional Commits 形式で実装をコミットし、main へ push する。
  - [ ] `gh workflow run "Daily Fundamental Screener Japan"` または `gh workflow run daily-screener-japan.yml` を実行し、完了まで確認する。

## Validation Commands

```powershell
git status --short --branch
git log -5 --oneline
git diff --check
node --test tests/fundamental-screener.test.js
node --test tests/daily-screener-report.test.js
node --test tests/screener-audit.test.js
npm run test:unit
npm run test:contract
```

日本株実データ再実行:

```powershell
$env:SCREENER_WORKFLOW_LABEL = "daily-screener-japan"
$env:SCREENER_REPORT_PATH = "docs/reports/screener/daily-ranking-jp.md"
$env:SCREENER_METADATA_PATH = "docs/reports/screener/daily-ranking-jp-run.json"
$env:SCREENER_AUDIT_PATH = "docs/reports/screener/daily-ranking-jp-audit.json"
$env:SCREENER_AUDIT_STRICT = "true"
$env:SCREENER_RESULT_LIMIT = "90"
$env:SCREENER_MARKET = "japan"
$env:SCREENER_EXCHANGES = "TSE"
$env:SCREENER_SYMBOL_ALLOWLIST_KEY = "jpx-prime"
$env:SCREENER_SELECTED_SECTOR_COUNT = "5"
$env:SCREENER_GROSS_MARGIN_MIN_PCT = "30"
$env:SCREENER_SCOPE_LABEL = "JPX Prime domestic stocks snapshot (2026-03-31)"
$env:SCREENER_CURRENCY_SYMBOL = "¥"
node scripts/screener/run-fundamental-screening.mjs
```

米国株回帰確認は既存 workflow shape を維持し、必要に応じて以下を実行する。

```powershell
$env:SCREENER_MARKET = "america"
$env:SCREENER_EXCHANGES = "NASDAQ,NYSE"
$env:SCREENER_RESULT_LIMIT = "90"
$env:SCREENER_SELECTED_SECTOR_COUNT = "3"
$env:SCREENER_GROSS_MARGIN_MIN_PCT = "30"
node scripts/screener/run-fundamental-screening.mjs
```

GitHub Actions 確認:

```powershell
gh workflow run "Daily Fundamental Screener Japan"
gh run list --workflow daily-screener-japan.yml --limit 5
gh run watch <RUN_ID>
gh run view <RUN_ID> --log
```

## Risks And Uncertainties

- EDINET の CSV/TSV 列名には表記揺れがあるため、認識できない列構造は推測せず不採用にする。初回実装では補完対象が減り、ランキング対象の財務スコアが下がる可能性がある。
- TradingView 既存値が異常値の出所である可能性がある。EDINET だけを修正して完了扱いにしない。
- EDINET lookback 180日では最新通期有価証券報告書が取得できない可能性がある。年次用に `EDINET_ANNUAL_LOOKBACK_DAYS=450` を導入する可能性がある。
- 日本株レポートの横幅が広くなるため、詳細 provenance はランキング表ではなく監査セクション/JSON に分離する。
- LINE secrets が GitHub 側に存在しない場合、通知は skip される可能性がある。これは通知テスト/ログで区別する。
- GitHub Actions の main 同期は既知の publish race があるため、失敗時は `checkout HEAD must match origin/main before publishing reports` をデータ監査失敗と混同しない。

## Out Of Scope

- 4634 または 2222 だけを対象にした銘柄別例外処理。
- 米国株ランキングロジックの仕様変更。
- AGENTS.md または `.github/copilot-instructions.md` の変更。
- TradingView / EDINET / Moomoo API キーや secrets の新規発行・露出。
- 監査結果に合わせた手動レポート編集。

## Completion Criteria

- 異常値の実際のデータソースが特定され、Root Cause Investigation と Implementation Results に記録されている。
- EDINET CSV/TSV は明示的な値列のみを採用し、最後の数値を無条件採用しない。
- contextRef、期間、連結/個別、単位、currency、半期/四半期、CAPEX 符号が検証される。
- FCF 計算構成要素と指標 provenance が監査 JSON またはレポートで追跡できる。
- invalid 値がランキング計算に使われない。
- 補完前後と前回実行との差分が計算される。
- `docs/reports/screener/daily-ranking-jp-audit.json` が生成される。
- 日本株レポートに監査結果が表示される。
- GitHub Actions と LINE 通知に監査概要が統合される。
- 関連テスト、`npm run test:unit`、`npm run test:contract`、日本株実データ再実行、米国株回帰確認が成功する。
- 計画ファイルが `docs/exec-plans/completed/` へ移動され、実装結果が記録されている。
- Conventional Commits 形式で main にコミット・push 済み。
- GitHub Actions の `Daily Fundamental Screener Japan` 実行が成功し、artifact にレポート、run JSON、audit JSON が含まれる。

## Implementation Results

実装完了後に以下を記録する。

- 確定した根本原因。
- 修正前後の Top10。
- 4634 / 2222 とその他異常値候補の修正前後。
- 追加・変更したファイル一覧。
- 実行したテストと結果。
- 日本株実データ再実行の監査ステータス。
- 米国株回帰確認結果。
- GitHub Actions run id、結果、artifact、LINE 通知状況。
- commit SHA、commit message、push 先。
