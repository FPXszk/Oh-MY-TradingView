# 日本株スクリーナー EDINET 指標検証・ランキング監査 引き継ぎ書

作成日: 2026-07-21

## 目的

今回の修正は、日本株スクリーナーで FCF margin、P/FCF、FCF growth、cash conversion などの財務指標に誤った値が混入し、ランキングが不当に上がる状態を防ぐためのものです。

別AIが続きの改善や監査を行う場合は、この文書を入口にしてください。実装済みの範囲、検証済み証跡、次に触るべき場所、触らないほうがよい場所をまとめています。

## 現在の状態

- 実装 commit: `fda76ec965b294bb2e80239b188ec08422fbbb7b`
  - message: `fix: audit EDINET metrics for Japan screener`
- Actions publish commit: `29b4a671fc8ff39c5d280fddffbf58dfdd92c973`
  - message: `docs: daily screener japan report run 29752950551-1`
- 完了記録 commit: `5d2df69`
  - message: `docs: record japan screener audit completion`
- 引き継ぎ計画 commit: `24e7aa6`
  - message: `docs:japan-screener-edinet-audit-handoff_20260721_0038`
- 直近の GitHub Actions:
  - workflow: `daily-screener-japan`
  - run id: `29752950551`
  - conclusion: `success`
  - artifact: `screener-report-japan-29752950551`
  - artifact id: `8465433031`
- LINE:
  - success step は実行済み。
  - `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_TO_USER_ID` が未設定のため送信は skip。

## 何を直したか

### EDINET fact 抽出

対象: `src/core/edinet.js`

- CSV/TSV の行内にある「最後の数値」を値として採用する挙動をやめた。
- ヘッダー解析で明示的な値列を特定し、その列だけを `rawValue` として採用するようにした。
- fact に以下の証跡を持たせた。
  - `conceptId`
  - `label`
  - `contextRef`
  - `periodType`
  - `periodStart`
  - `periodEnd`
  - `instantDate`
  - `relativePeriod`
  - `consolidation`
  - `unitId`
  - `currency`
  - `scale`
  - `decimals`
  - `rawValue`
  - `normalizedValue`
  - `sourceFile`
  - `documentId`
  - `documentType`
  - `submittedAt`
- `CurrentYearDuration_NonConsolidatedMember` を連結と誤判定しないよう、`nonConsolidated` を `consolidated` より先に判定するようにした。
- CAPEX は支出額として正規化し、FCF は `CFO - CAPEX` で計算する。

### 日本株ランキングへの統合

対象: `src/core/fundamental-screener.js`

- 日本株の FCF 系指標は、検証済み EDINET 通期値を TradingView 既存値より優先する。
- 指標単位で `metricProvenance` を付与する。
- invalid な指標はランキング計算に使わせない。
- EDINET と TradingView の差分が大きい場合は warning を付ける。
- 補完前後の順位とスコアを持たせる。
  - `rankBeforeSupplement`
  - `scoreBeforeSupplement`
  - `rankAfterSupplement`
  - `scoreAfterSupplement`
  - `rankDelta`
  - `scoreDelta`

### 監査 JSON

対象: `src/core/screener-audit.js`

- 日本株スクリーナー実行時に `docs/reports/screener/daily-ranking-jp-audit.json` を生成する。
- 主な出力:
  - `status`
  - `summary`
  - `metricAnomalies`
  - `criticals`
  - `rankChanges`
  - `top10BeforeSupplement`
  - `top10AfterSupplement`
  - `top10CurrentRun`
  - `top10PreviousRun`
  - `evidenceRows`
- `status=critical` の場合は strict mode で非0終了する設計。

### レポート・Actions・通知

対象:

- `scripts/screener/run-fundamental-screening.mjs`
- `.github/workflows/daily-screener-japan.yml`
- `scripts/windows/github-actions/sync-daily-screener-report-to-main.ps1`
- `scripts/line/send-screener-line-message.mjs`

実装内容:

- 日本株レポートに `財務データ監査` セクションを追加。
- ランキング表に品質表示を追加。
  - `EDINET✓`
  - `WARN`
  - `INVALID`
  - `TV`
- workflow に追加した env:
  - `SCREENER_AUDIT_PATH`
  - `SCREENER_AUDIT_STRICT`
- workflow artifact に以下を含める。
  - `docs/reports/screener/daily-ranking-jp.md`
  - `docs/reports/screener/daily-ranking-jp-run.json`
  - `docs/reports/screener/daily-ranking-jp-audit.json`
- publish script は optional `-AuditPath` を stage 対象にできる。
- LINE 通知は audit status / warning / error / 代表異常 / 順位差分を含められる。

## 根本原因

- EDINET CSV/TSV の fact 抽出が、明示的な値列ではなく行内の最後の数値を採用していた。
- `CurrentYearDuration_NonConsolidatedMember` が `consolidated` 文字列を含むため、個別 context が連結として誤分類される経路があった。
- 日本株 EDINET 補完で TradingView 既存値が優先される場合があり、FCF 系指標の出所とランキング使用値を指標単位で追跡できなかった。

## 実データ検証結果

直近の workflow publish 後のファイル:

- `docs/reports/screener/daily-ranking-jp.md`
- `docs/reports/screener/daily-ranking-jp-run.json`
- `docs/reports/screener/daily-ranking-jp-audit.json`

run metadata:

- workflow: `daily-screener-japan`
- run id: `29752950551`
- run attempt: `1`
- run number: `35`
- sha: `fda76ec965b294bb2e80239b188ec08422fbbb7b`
- generated at: `2026-07-20T14:58:45Z`

audit summary:

- status: `warning`
- validMetrics: `219`
- warnings: `37`
- errors: `0`
- rankChangesOverThreshold: `13`
- newTop10Entries: `4`

current Top10:

| Rank | Symbol | Company | Score |
|---:|---|---|---:|
| 1 | 2371 | カカクコム | 69.23 |
| 2 | 7966 | リンテック | 69.16 |
| 3 | 5186 | ニッタ | 68.20 |
| 4 | 6448 | ブラザー工業 | 67.80 |
| 5 | 6098 | リクルートホールディングス | 66.96 |
| 6 | 2222 | 寿スピリッツ | 64.79 |
| 7 | 7236 | ティラド | 64.54 |
| 8 | 6237 | イワキポンプ | 63.43 |
| 9 | 7735 | SCREENホールディングス | 62.85 |
| 10 | 3946 | トーモク | 62.36 |

重要銘柄の確認:

| Symbol | Before | After | Source | Status |
|---|---:|---:|---|---|
| 4634 artience | FCF margin 69.4% | FCF margin 3.47% | EDINET | valid |
| 2222 寿スピリッツ | FCF margin 85.4% | FCF margin 14.42% | EDINET | valid |

4634 の EDINET 構成要素:

- revenue: `349,979,000,000`
- CFO: `27,554,000,000`
- CAPEX: `15,420,000,000`
- FCF margin: `3.47%`

2222 の EDINET 構成要素:

- revenue: `78,781,000,000`
- CFO: `13,801,000,000`
- CAPEX: `2,440,000,000`
- FCF margin: `14.42%`

## 検証済みコマンド

前回実装時に成功済み:

```powershell
node --test tests/daily-screener-contract.test.js
node --test tests/daily-screener-report.test.js tests/screener-audit.test.js tests/line-screener-notify.test.js tests/fundamental-screener.test.js tests/daily-screener-contract.test.js
git diff --check
npm run test:unit
npm run test:contract
```

成功済み結果:

- focused tests: pass 52
- `npm run test:unit`: pass 875
- `npm run test:contract`: pass 74
- 米国株回帰: `SCREENER_MARKET=america` の workflow 相当 env で exit 0

今回の引き継ぎ書作成では docs のみ変更するため、必要な検証は以下で十分です。

```powershell
git status --short --branch
git diff --check
```

## 次に改善するなら

### 1. warning の分類をさらに読みやすくする

現在の audit は `warning` 件数を出しますが、利用者が見るには粒度が少し粗いです。

見る場所:

- `src/core/screener-audit.js`
- `scripts/screener/run-fundamental-screening.mjs`
- `tests/screener-audit.test.js`
- `tests/daily-screener-report.test.js`

候補:

- `fcf_growth_abs_gte_500`
- `cash_conversion_abs_gte_5`
- `tradingview_edinet_fcf_margin_diff_gte_20pt`

これらを「要確認だが ranking eligible」「ranking excluded」「source fallback」などに分けると、レポート上の判断がしやすくなります。

### 2. EDINET document / fact の文字化け表示を改善する

一部 audit JSON の `documentType` や `label` が文字化けして見える場合があります。JSON と ranking の計算自体は通っていますが、人間が監査するときの読みやすさは改善余地があります。

見る場所:

- `src/core/edinet.js`
- EDINET CSV/TSV decode 処理
- `tests/fundamental-screener.test.js`

注意:

- 値抽出や ranking logic と混ぜて大きく直さない。
- まず fixture で encoding の期待値を固定してから直す。

### 3. `top10AfterSupplement` と `top10CurrentRun` の違いを文書化または改名する

`top10AfterSupplement` は補完直後の候補集合順位です。最終レポート順位は `top10CurrentRun` / `unifiedRank` 側です。両者は一致しないことがあります。

見る場所:

- `src/core/screener-audit.js`
- `src/core/fundamental-screener.js`
- `scripts/screener/run-fundamental-screening.mjs`
- `tests/screener-audit.test.js`

候補:

- JSON field name を `top10AfterSupplementCandidateSet` へ変更する。
- または report / docs に注記を追加する。

互換性注意:

- 既存 JSON consumer があるなら field rename は breaking change。
- まず additive に新 field を追加し、旧 field を残すのが安全。

### 4. annual lookback を見直す

計画段階では、EDINET lookback 180日では最新通期有報が拾えない可能性をリスクとして残していました。現行 run では 68/68 取得できていますが、決算期や実行時期によって変動し得ます。

見る場所:

- `.github/workflows/daily-screener-japan.yml`
- `src/core/edinet.js`
- `scripts/screener/run-fundamental-screening.mjs`

候補:

- `EDINET_ANNUAL_LOOKBACK_DAYS=450` の導入。
- ただし対象 documents が増えるので、実行時間と誤マッチリスクを測ってから入れる。

### 5. LINE secrets 未設定の扱い

workflow 上は success step が成功し、送信だけ skip です。通知を必須にしたいなら repository secrets の設定が必要です。

見る場所:

- `.github/workflows/daily-screener-japan.yml`
- `scripts/line/send-screener-line-message.mjs`
- `tests/line-screener-notify.test.js`

注意:

- secret 値をログや docs に書かない。
- 通知 skip は screener failure とは分けて扱う。

## 次担当者向けの作業開始手順

1. 最新 main に同期する。

```powershell
git status --short --branch
git pull --ff-only origin main
```

2. まず読む。

```powershell
Get-Content -LiteralPath docs/exec-plans/completed/japan-screener-edinet-ranking-audit_20260720_2322.md
Get-Content -LiteralPath docs/handoffs/japan-screener-edinet-audit-handoff_20260721.md
```

3. 監査結果を確認する。

```powershell
node -e "const fs=require('fs'); const a=JSON.parse(fs.readFileSync('docs/reports/screener/daily-ranking-jp-audit.json','utf8')); console.log(a.status, a.summary); console.table(a.top10CurrentRun);"
```

4. 変更を入れる場合は AGENTS.md の exec-plan 手順に従う。

```powershell
Get-ChildItem -LiteralPath docs/exec-plans/active -Force
```

5. screener 変更なら最低限これを回す。

```powershell
node --test tests/fundamental-screener.test.js tests/screener-audit.test.js tests/daily-screener-report.test.js tests/line-screener-notify.test.js tests/daily-screener-contract.test.js
git diff --check
npm run test:unit
npm run test:contract
```

## 触るときの注意

- `AGENTS.md` と `.github/copilot-instructions.md` はユーザー承認なしで変更しない。
- 4634 / 2222 だけの銘柄別例外処理は入れない。
- EDINET と TradingView のどちらが正しいかを推測で決めない。必ず `metricProvenance` と fact 証跡で判断する。
- invalid 値をランキングに戻さない。
- 米国株 workflow / report 形状は、明示的な依頼がない限り変えない。
- `SCREENER_AUDIT_PATH` を指定した US regression は Japan 向け audit rule に引っかかることがある。US default では audit JSON を出さない設計。
- GitHub Actions publish race の `checkout HEAD must match origin/main before publishing reports` は、データ監査失敗とは別問題として扱う。

## 参照ファイル

- 完了計画: `docs/exec-plans/completed/japan-screener-edinet-ranking-audit_20260720_2322.md`
- 日本株レポート: `docs/reports/screener/daily-ranking-jp.md`
- 日本株 run metadata: `docs/reports/screener/daily-ranking-jp-run.json`
- 日本株 audit JSON: `docs/reports/screener/daily-ranking-jp-audit.json`
- EDINET parser: `src/core/edinet.js`
- ranking integration: `src/core/fundamental-screener.js`
- audit builder: `src/core/screener-audit.js`
- report runner: `scripts/screener/run-fundamental-screening.mjs`
- LINE notify: `scripts/line/send-screener-line-message.mjs`
- Japan workflow: `.github/workflows/daily-screener-japan.yml`
- publish script: `scripts/windows/github-actions/sync-daily-screener-report-to-main.ps1`
- focused tests:
  - `tests/fundamental-screener.test.js`
  - `tests/screener-audit.test.js`
  - `tests/daily-screener-report.test.js`
  - `tests/line-screener-notify.test.js`
  - `tests/daily-screener-contract.test.js`
