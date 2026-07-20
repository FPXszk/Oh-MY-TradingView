# Japan Screener EDINET Annual Consistency and Unified Audit Plan

作成日: 2026-07-21 00:45 JST

## 目的

日本株スクリーナーの EDINET 補完について、前回実装済みの値列採用、個別/連結誤判定修正、`metricProvenance`、`rankEligible`、異常値検出、監査 JSON、Markdown、LINE、strict 監査を維持したまま、残っている次の3課題を解消する。

1. ランキング用資料として通期有価証券報告書が必ず優先される保証がない。
2. 売上、営業 CF、CAPEX などが同一期間・同一連結区分・同一通貨である保証がない。
3. EDINET 補完前後の比較が最終 Phase4 + Phase5 unified ランキング同士の比較になっていない。

今回の計画フェーズでは実装へ進まない。計画書の作成、自己レビュー、`git diff --check`、計画書のみの commit/push までを完了し、ユーザー承認を待つ。

## 対象コミットと現在差分

- 前回実装コミット: `fda76ec965b294bb2e80239b188ec08422fbbb7b`
  - message: `fix: audit EDINET metrics for Japan screener`
- 現在 HEAD: `4134a51`
  - message: `docs: add japan screener audit handoff`
- 現在ブランチ: `main`
- `main...origin/main`: ahead 0 / behind 0
- `fda76ec965b294bb2e80239b188ec08422fbbb7b..HEAD` の主な追加変更:
  - `docs/reports/screener/daily-ranking-jp.md`
  - `docs/reports/screener/daily-ranking-jp-run.json`
  - `docs/reports/screener/daily-ranking-jp-audit.json`
  - `docs/exec-plans/completed/japan-screener-edinet-ranking-audit_20260720_2322.md`
  - `docs/handoffs/japan-screener-edinet-audit-handoff_20260721.md`
  - `docs/exec-plans/completed/japan-screener-edinet-audit-handoff_20260721_0038.md`

## 現状調査

### EDINET 書類選択フロー

- `src/core/edinet.js:598` で `lookbackDays` は `options.lookbackDays ?? DEFAULT_LOOKBACK_DAYS` として扱われる。現行 workflow では年次専用の探索日数設定はない。
- `src/core/edinet.js:624` の探索ループは `offset < lookbackDays && bestDocumentBySymbol.size < symbols.length` で停止する。つまり、対象銘柄すべてに何らかの候補書類が見つかると、それ以降の日付探索を終了する。
- `src/core/edinet.js:640-648` で書類説明、CSV flag、スコアを確認し、銘柄ごとに1件だけ `bestDocumentBySymbol` へ保持する。
- `src/core/edinet.js:657-704` で選ばれた単一書類だけを download し、CSV fact から補完指標を作る。
- `latestDocument` と `annualRankingDocument` の区別は現行構造に存在しない。

### document candidate scoring

- `src/core/edinet.js:536-549` の `buildDocumentCandidateScore()` は以下の加点を行う。
  - eligible document description: +40
  - CSV 利用可: +30
  - legalStatus: +10 または +8
  - 四半期報告書: +20
  - 半期報告書: +16
  - 有価証券報告書: +12
  - 提出日時: 小さな加点
- このため、最新半期・四半期報告書が通期有価証券報告書より高く採点される可能性がある。

### 現在の探索終了条件

- `src/core/edinet.js:624` により、`bestDocumentBySymbol.size` が対象銘柄数へ到達すると探索が終わる。
- 直近半期報告書や四半期報告書が先に見つかった場合、過去の有価証券報告書まで到達しない可能性がある。
- date list の再利用や日付単位キャッシュ、latest 用と annual 用の別メタデータはまだない。

### 現在の fact 選択方法

- `src/core/edinet.js:304-312` の `isAnnualCurrentDuration()` は `periodType === 'duration'`、`relativePeriod === 'current'`、context/documentType の四半期・半期除外、`currentyear` または年次 document pattern で `rankEligible` を判定する。
- `src/core/edinet.js:315-376` の `buildFactRow()` は fact ごとに `contextRef`、`periodType`、`periodStart`、`periodEnd`、`relativePeriod`、`consolidation`、`currency`、`sourceFile` などを持たせる。
- ただし `deriveSupplementalMetrics()` は fact を同一グループで束ねてから計算していない。売上、営業 CF、CAPEX、純利益を個別に `pickMetricValue()` で選び、その後に組み合わせている。

### 現在の FCF 計算方法

- `src/core/edinet.js:420-431` 付近の `deriveSupplementalMetrics()` は現在/前年の売上、営業 CF、CAPEX、有形/無形、純利益を個別 fact から取得する。
- `src/core/edinet.js:433-434` では `capexCurrent = (capexPpeCurrentFact?.value ?? 0) + (capexIntangiblesCurrentFact?.value ?? 0)` としている。
- CAPEX fact が欠損した場合も 0 として足し込まれるため、FCF が過大に算出される危険がある。
- `fcfCurrent` は営業 CF が有限なら `operatingCashFlowCurrent - capexCurrent` で算出されるため、CAPEX 欠損時もランキング候補になり得る。

### 現在の provenance 構造

- `src/core/edinet.js:474-506` 付近の `metricProvenance` は指標ごとに source/status/rankEligible/finalValue/documentType/period/consolidation/currency/sourceFile などを持つ。
- `src/core/fundamental-screener.js:2127-2226` の `applyEdinetSupplementalMetrics()` は EDINET 指標が valid かつ rank eligible なら TradingView 値を置換し、差分 warning を追加する。
- ただし派生指標ごとの入力 fact 一式、同一期間・同一連結・同一通貨の証明、CAPEX 欠損区分、metric-specific/row-level/document-level warnings の分離は未整備。

### 現在の Phase4 / Phase5 / unified ランキング生成順

- `src/core/fundamental-screener.js:2398-2408` で Japan の補完前順位を `clientFiltered` に対して `applyBlockRanks()` して保存している。
- `src/core/fundamental-screener.js:2411-2423` で EDINET 補完を適用する。
- `src/core/fundamental-screener.js:2426-2441` で補完後の `ranked` を作り、補完前後差分を各 row に付与する。
- `src/core/fundamental-screener.js:2443-2458` で Phase4 候補と `finalStockRanking` を作る。
- `src/core/fundamental-screener.js:2460-2472` で Phase5 を別途作る。Phase5 内部でも `src/core/fundamental-screener.js:1668` で EDINET 補完が適用される。
- `src/core/fundamental-screener.js:2473-2487` で Phase4 + Phase5 を `buildUnifiedCandidateRows()`、`applyUnifiedRanks()`、`buildUnifiedPhase4Ranking()`、`buildUnifiedPhase5SectorTopStocks()` に流す。
- 現行の `rankBeforeSupplement` / `rankAfterSupplement` は unified 再構築後に算出されたものではない。

### 現在の補完前後順位計算方法

- `src/core/fundamental-screener.js:2398-2408` で補完前の `rankScore` ベース順位を作り、`src/core/fundamental-screener.js:2430-2438` で補完後の `rankScore` ベース順位との差分を付ける。
- `src/core/screener-audit.js:51-72` の `buildRankChanges()` はその row 付与済み差分を監査 JSON へ転記する。
- `src/core/screener-audit.js:157-159` は `top10BeforeSupplement`、`top10AfterSupplement`、`top10CurrentRun` を作るが、補完前後 Top10 は final unified population ではなく row 上の既存 before/after rank に依存する。

### 現在の監査 critical / warning 条件

- `src/core/screener-audit.js:124-194` の `buildScreenerAudit()` が status を決める。
- critical 候補:
  - duplicate symbol
  - score non finite
  - invalid かつ rankEligible=false の metric が値として使われた場合
  - Top3 で rankEligible=false の metric が使われた場合
  - EDINET provenance に documentType/consolidation/currency がない場合
- warning 候補:
  - metric anomaly がある
  - rank delta が 5 以上
- ただし、通期でない EDINET 指標のランキング使用、期間不一致、連結/個別混在、通貨混在、CAPEX 欠損 0 扱い、unified 母集団差、証跡入力 fact 欠落などは専用 critical としてまだ表現されていない。

### 現在の Actions と LINE 通知フロー

- `.github/workflows/daily-screener-japan.yml:15-16` で `SCREENER_AUDIT_PATH` と `SCREENER_AUDIT_STRICT` が設定されている。
- `.github/workflows/daily-screener-japan.yml:75-83` は `if: always()` の artifact upload で report/run metadata/audit JSON を保存する。
- `.github/workflows/daily-screener-japan.yml:86-94` は成功時のみ main へ publish する。
- `.github/workflows/daily-screener-japan.yml:96-126` は LINE success/failure 通知を呼ぶ。
- `scripts/screener/run-fundamental-screening.mjs:1090-1114` は audit 作成、report/audit 書き込み、strict critical 時の `process.exitCode = 1` を行う。
- `scripts/line/send-screener-line-message.mjs:122-131` は success 時に監査 status、新規 Top10、警告数、最大順位変動、代表警告を出す。failure 時は `scripts/line/send-screener-line-message.mjs:135-140` で critical summary を出す。
- LINE secrets 未設定時 skip は `scripts/line/send-screener-line-message.mjs:188-190` で維持されている。

## 確定した問題

1. 年次書類より半期・四半期が優先され得る。
   - 根拠: `src/core/edinet.js:536-549` で四半期 +20、半期 +16、有価証券報告書 +12 のスコア加点になっている。

2. 通期有価証券報告書まで探索しない可能性がある。
   - 根拠: `src/core/edinet.js:624` のループ条件が、全銘柄へ何らかの best document が揃った時点で終了する。

3. `latestDocument` と `annualRankingDocument` が分離されていない。
   - 根拠: `src/core/edinet.js:657-704` で `bestDocumentBySymbol` の単一 document だけを download し、補完指標へ使っている。

4. FCF 計算で CAPEX 欠損を 0 として扱う経路がある。
   - 根拠: `src/core/edinet.js:433-434` の `capexPpeCurrentFact?.value ?? 0` と `capexIntangiblesCurrentFact?.value ?? 0`。

5. 売上、営業 CF、CAPEX、純利益が同一期間・同一連結・同一通貨であることを計算前に保証していない。
   - 根拠: `deriveSupplementalMetrics()` は各 concept を個別取得してから組み合わせており、`documentId`、`periodStart`、`periodEnd`、`periodType`、`relativePeriod`、`consolidation`、`currency` の共通キー grouping がない。

6. 期間日付欠損を ranking ineligible に落とす保証が弱い。
   - 根拠: `buildFactRow()` は `periodStart` / `periodEnd` を列がなければ null にするが、`isAnnualCurrentDuration()` は context/documentType だけで rankEligible を true にできる。

7. 補完前後ランキング差分が最終 unified ranking 同士ではない。
   - 根拠: `src/core/fundamental-screener.js:2398-2438` で補完前後 rank を Phase4/Phase5 統合前に計算し、`src/core/fundamental-screener.js:2473-2487` でその後に unified を作っている。

8. Phase5 専用候補の補完前後 unified 差分が完全には監査対象にならない。
   - 根拠: `src/core/screener-audit.js:51-72` は row 上の `rankBeforeSupplement` / `rankAfterSupplement` を前提にするが、Phase5 は別 pipeline で作られ、final unified 全候補に before/after unified rank が付く構造ではない。

9. 「EDINET 補完前後の Top10 変化」と「前回実行からの Top10 変化」の命名と集計が不足している。
   - 根拠: `src/core/screener-audit.js:160` の `top10PreviousRun` は current top10 へ previous 情報を付与するだけで、entered/exited/stayed の独立配列を持たない。`summary.newTop10Entries` は補完前後由来で、前回実行比較とは分離されていない。

10. LINE / Markdown の監査要約が新しい証跡要求を満たしていない。
    - 根拠: `scripts/screener/run-fundamental-screening.mjs:429-479` の監査表示は status、件数、順位差分、異常値、evidence の簡易表示に留まる。`scripts/line/send-screener-line-message.mjs:122-131` も年次書類未取得、fallback、Top10 進入/脱落、前回実行差分を分離していない。

## 修正方針

### 年次書類選択方式

- EDINET 書類選択結果を銘柄ごとに次の2種類へ分離する。
  - `latestDocument`: 最新開示・監査表示用。半期、四半期、有価証券報告書、訂正書類を含める。
  - `annualRankingDocument`: ランキング用 FCF 系指標抽出元。有価証券報告書または訂正有価証券報告書を原則使用する。
- `annualRankingDocument` の候補条件:
  - `docDescription` が有価証券報告書または訂正有価証券報告書に該当する。
  - 半期報告書、四半期報告書、半期/四半期の訂正報告書は通期ランキング用から除外する。
  - CSV 利用可である。
  - legalStatus は現行で利用している値を維持し、無効/未知の場合は ranking document として採用しない、または採用理由に warning を残す。
  - 訂正有価証券報告書と元書類の関係を document metadata だけで判定できない場合は、安全側に倒して `rankEligible=false` とし、`amended_document_relation_unknown` を残す。
- `latestDocument` は提出日時優先、`annualRankingDocument` は通期書類優先 + 提出日時優先の別 scoring にする。

### 探索方式

- 通常の最新書類探索は現行 180 日を維持する。
- 年次ランキング書類探索は初期案として 450 日を計画する。3月決算以外、提出遅延、直近半期/四半期に覆われるケースを拾うため、400-500日の中央として選ぶ。
- 実装時に API 呼び出し数と処理時間を `sourceDetails.edinet` へ記録する。
- 日付単位の document list 結果を1実行内 Map cache で再利用し、latest と annual の探索で同一日付を二重取得しない。
- 銘柄ごとに annual document が見つかったら、その銘柄は annual 探索完了にできる。ただし date list の取得は日付単位なので、全未解決銘柄が解決したら annual 探索を終了する。
- latest 探索と annual 探索は同じ date list cache を共有する。

### fact グループ化方式

- fact を次の共通キーで grouping する。
  - `documentId`
  - `periodStart`
  - `periodEnd`
  - `periodType`
  - `relativePeriod`
  - `consolidation`
  - `currency`
  - 必要に応じて `contextRef`、`durationDays`、`sourceFile`
- 同一グループ内の fact だけを使って FCF 系派生指標を計算する。
- `periodStart` / `periodEnd` が null の場合は、contextRef や document metadata から補完できるかを調査して実装する。補完できない場合は `rankEligible=false` とする。
- 連結 fact が存在する場合は連結グループを優先する。連結 fact が存在せず個別 fact しかない場合は、自動採用せず `non_consolidated_only_not_ranked` として TradingView へ fallback する方針から始める。実データ調査で必要なら計画差分を報告して承認を取る。

### 必須 fact 条件

- EDINET 由来 FCF 系指標をランキングへ使う最低条件:
  - current year / duration / 通期
  - `periodStart` と `periodEnd` が確定している
  - 売上が正の有限値
  - 営業 CF が有限値
  - 有形固定資産 CAPEX が有限値
  - CAPEX 欠損を 0 扱いしない
  - 同一 document / 同一期間 / 同一連結区分 / 同一通貨
  - FCF が有限値
- 純利益は cash conversion 用に必須とし、欠損時は cash conversion のみ EDINET 派生を不可にする。FCF margin と P/FCF 自体は純利益なしでも成立可能とする。
- 無形資産 CAPEX は以下を区別する。
  - `explicit_zero`
  - `not_present`
  - `extract_failed`
  - `not_disclosed`
  - `possibly_included_in_ppe_capex`
- 初期実装では、無形 CAPEX が独立表示されない場合は 0 と断定せず、provenance に欠損区分を残す。FCF 計算の最小必須条件は有形 CAPEX とし、無形 CAPEX 欠損は metric-level warning として扱う。

### CAPEX 欠損時の扱い

- `capexPpe` 欠損、非数値、期間不一致、連結/個別不一致、通貨不一致の場合、EDINET 由来 FCF 系指標は `rankEligible=false`。
- TradingView の正常値があれば TradingView を使う。
- TradingView も異常または欠損なら null にする。
- 監査 JSON に `capex_ppe_missing`、`capex_ppe_non_numeric`、`capex_context_mismatch` などの理由を残す。

### 派生指標 provenance

- 派生指標ごとに formula と inputs を持つ。
  - `fcfTtm`: `operatingCashFlow - capexPpe - capexIntangiblesKnown`
  - `fcfMargin`: `fcf / revenue`
  - `pFcf`: `marketCapUsd / fcf`
  - `cashConversion`: `fcf / netIncome`
  - `fcfGrowthTtm`: current/prior の整合同一条件 group から計算
  - `revenueGrowthTtm`: current/prior の売上 fact から計算
- inputs には `conceptId`、`contextRef`、`periodStart`、`periodEnd`、`periodType`、`relativePeriod`、`consolidation`、`currency`、`value`、`sourceFile`、`documentId`、`documentType`、`submittedAt` を保存する。
- warnings を以下に分離する。
  - `metricWarnings`
  - `rowWarnings`
  - `documentWarnings`
- `fcfGrowthTtm` の warning を無関係な全指標へ複製しない。指標固有 warning は当該 metric provenance のみへ入れる。

### ランキング利用可否

- `annualRankingDocument` がない場合、または通期であることを確認できない場合は EDINET FCF 系指標をランキングに使わない。
- 半期/四半期 document しかない場合は `latestDocument` へは記録するが `annualRankingDocument=null` とし、`annual_document_missing` または `only_interim_documents_found` を残す。
- EDINET が ineligible のときは TradingView の metric provenance を維持し、TradingView も ineligible なら null にする。
- `rankEligible=false` の EDINET 値は score 計算へ入れない。

### 補完前後 unified ランキング生成方法

- Phase1 結果、Phase2/Industry 選択、対象 universe、Phase4 条件、Phase5 条件、重複排除、ranking blocks、欠損値、tie-break、表示上限を固定したうえで、次を2回実行する。
  - 補完前: TradingView 初期値のまま Phase4 候補、Phase5 候補、Phase4+Phase5 統合、重複排除、unified scoring、Top40/Top10 を構築する。
  - 補完後: 検証済み EDINET 値だけを適用して同じ処理を再構築する。
- Phase5 内部の EDINET 補完二重実行を避けるため、補完前/補完後 row set を明示的に渡すか、EDINET supplemental map を1回取得して再利用する設計にする。
- 最終 `unifiedRankedRows` の全候補へ次を付与する。
  - `unifiedRankBeforeSupplement`
  - `unifiedRankAfterSupplement`
  - `unifiedScoreBeforeSupplement`
  - `unifiedScoreAfterSupplement`
  - `unifiedRankDelta`
  - `unifiedScoreDelta`
  - `changedMetrics`
  - `metricSourcesBefore`
  - `metricSourcesAfter`
  - `phase4EligibleBefore`
  - `phase4EligibleAfter`
  - `phase5EligibleBefore`
  - `phase5EligibleAfter`
- 既存の `rankBeforeSupplement` / `rankAfterSupplement` は互換性維持のため当面残し、final unified 由来へ意味を寄せる。必要なら新フィールドを優先して旧フィールドを report 側で fallback として扱う。

### Top10 比較データ構造

- 補完前後比較:
  - `top10BeforeSupplement`
  - `top10AfterSupplement`
  - `enteredTop10BySupplement`
  - `exitedTop10BySupplement`
  - `stayedTop10`
  - `largeRankMovers`
- 前回実行比較:
  - `previousRunTop10`
  - `currentRunTop10`
  - `enteredTop10FromPreviousRun`
  - `exitedTop10FromPreviousRun`
  - `stayedTop10FromPreviousRun`
  - `previousRunRankMovers`
- `newTop10Entries` のような曖昧な名称は互換用に残す場合でも、新フィールドを正とする。

### 監査ステータス条件

- audit thresholds を `src/core/screener-audit.js` 内の定数、または小さな audit config としてまとめる。
- critical:
  - Top3 で `rankEligible=false` の指標がランキングへ使用された。
  - 通期でない EDINET 指標がランキングへ使用された。
  - 売上、営業 CF、CAPEX の期間不一致。
  - 連結/個別混在。
  - 通貨混在。
  - CAPEX 欠損を 0 扱いして FCF を算出。
  - 非有限値がスコア計算へ入った。
  - 補完前後で unified ranking 母集団が意図せず変わった。
  - unified 差分の計算が候補の一部で欠落。
  - EDINET 由来ランキング使用指標に必要な入力 fact 証跡がない。
- warning:
  - FCF 成長率が ±500%以上。
  - TradingView と EDINET の FCF margin 差が 20pt 以上。
  - 補完により順位が 5 位以上変動。
  - 補完により Top10 へ新規進入または脱落。
  - 年次書類が古い。
  - 個別データしか取得できずランキングへ使用していない。
  - TradingView へ fallback した。

### レポートと LINE 表示方法

- Markdown の既存構成は維持し、財務データ監査セクションを拡張する。
- 表示する要約:
  - 対象銘柄数
  - 年次書類取得数
  - 年次書類未取得数
  - 半期・四半期のみ取得した銘柄数
  - ランキング使用可能銘柄数
  - TradingView fallback 数
  - `rankEligible=false` 件数
- 補完前後の最終 unified Top10 表:
  - 補完前順位、補完後順位、順位差、銘柄、補完前スコア、補完後スコア、変更指標、主要理由
- Top10 進入/脱落:
  - 補完による Top10 入り/脱落
  - 前回実行からの Top10 入り/脱落
- Top10 の EDINET 証跡:
  - documentId、documentType、提出日時、対象期間、連結/個別、通貨、売上、営業 CF、CAPEX、FCF、FCF margin、P/FCF、rankEligible、warning
- Markdown が大きくなりすぎる場合は詳細を audit JSON に保持し、Markdown は Top10 と要約に限定する。
- LINE には status、critical/warning 件数、年次書類未取得数、TradingView fallback 数、補完 Top10 進入/脱落数、前回実行 Top10 進入/脱落数、最大順位変動銘柄を含める。
- LINE secrets 未設定時 skip の既存挙動は維持する。

### Actions

- `Daily Fundamental Screener Japan` に統合し、米国株 workflow は変更しない。
- strict critical 時も、report、run metadata、audit JSON、artifact、LINE failure notification の順で観測可能性を維持する。
- 現行 workflow は artifact upload が `if: always()` なので、実装時に screener step の exit timing と metadata 生成順を確認する。必要であれば screener 実行と strict 判定を別ステップ化するが、正常系を大きく複雑化しない。

## 変更予定ファイル

### 作成予定

- `docs/exec-plans/completed/japan-screener-edinet-annual-consistency-unified-audit_20260721_0045.md`
  - 実装完了時に active plan を移動する。

### 変更予定

- `src/core/edinet.js`
  - latest/annual document 選択、document list cache、annual lookback、fact grouping、CAPEX 欠損扱い、派生 metric provenance。
- `src/core/fundamental-screener.js`
  - EDINET supplemental map の再利用、補完前後 unified 再構築、全 unified 候補への before/after 差分付与、Phase4/Phase5 eligibility 保存。
- `src/core/screener-audit.js`
  - 監査データ構造、Top10 比較、critical/warning 条件、EDINET 書類状況 summary、evidence rows。
- `scripts/screener/run-fundamental-screening.mjs`
  - Markdown audit section、run metadata/audit 統合、strict timing 必要時の調整。
- `scripts/line/send-screener-line-message.mjs`
  - LINE audit summary の拡張。
- `.github/workflows/daily-screener-japan.yml`
  - 必要時のみ strict 監査 step 分離、artifact/LINE 順序調整、annual lookback env 追加。
- `tests/fundamental-screener.test.js`
  - EDINET 書類選択、fact 整合性、Japan ranking integration。
- `tests/screener-audit.test.js`
  - unified ranking 差分、Top10 補完前後比較、前回実行比較、critical/warning 条件。
- `tests/daily-screener-report.test.js`
  - Markdown 表示、Top10 証跡、要約表示。
- `tests/line-screener-notify.test.js`
  - LINE audit summary。
- `tests/daily-screener-contract.test.js`
  - Japan workflow artifact/strict/LINE contract。
- `docs/reports/screener/daily-ranking-jp.md`
  - 実データ再実行で生成更新される。
- `docs/reports/screener/daily-ranking-jp-run.json`
  - 実データ再実行で生成更新される。
- `docs/reports/screener/daily-ranking-jp-audit.json`
  - 実データ再実行で生成更新される。詳細 provenance 追加によりサイズ増加見込み。

### 変更しない予定

- `AGENTS.md`
- `.github/copilot-instructions.md`
- `.github/workflows/daily-screener.yml`
- 米国株 SEC 補完ロジック
- 米国株 Rule of 40
- 米国株 ranking weights
- 米国株 report 形式

## 実装ステップ

- [ ] 1. 年次書類選択モデルを実装する。
  - 確認: latest 半期 + 古い有報 fixture で `latestDocument=半期報告書`、`annualRankingDocument=有価証券報告書` になる。
  - 確認: 四半期のみ、半期のみ、訂正有報、訂正前後、180日超/annual 範囲内、annual 範囲外をテストする。

- [ ] 2. 探索方式と API 計測を実装する。
  - 確認: date list cache により同一日付を重複 fetch しない。
  - 確認: latest 180日、annual 450日を分離し、meta に呼び出し数、探索日数、処理時間、失敗理由を記録する。

- [ ] 3. fact 期間・連結・通貨 grouping を実装する。
  - 確認: 同一 `documentId/periodStart/periodEnd/periodType/relativePeriod/consolidation/currency` group の fact だけで派生指標を計算する。
  - 確認: periodStart/periodEnd を確定できない group は ranking ineligible。

- [ ] 4. 必須 fact 条件と CAPEX 欠損扱いを実装する。
  - 確認: CAPEX 欠損を 0 として FCF 算出しない。
  - 確認: 売上、営業 CF、有形 CAPEX、通期期間、連結/通貨一致が満たされない場合は EDINET FCF 系指標が `rankEligible=false`。

- [ ] 5. 派生指標 provenance を拡張する。
  - 確認: 各派生 metric に formula、inputs、metricWarnings、rowWarnings、documentWarnings が入る。
  - 確認: `fcfGrowthTtm` warning が他 metric へ複製されない。

- [ ] 6. ランキング利用可否と fallback を実装する。
  - 確認: annual document missing / interim only / relation unknown / period unknown では EDINET FCF 系指標をランキングへ使わず、TradingView 正常値へ fallback する。
  - 確認: TradingView も invalid/missing なら null。

- [ ] 7. 補完前後 unified ランキング再構築を実装する。
  - 確認: Phase4 専用、Phase5 専用、Both の全候補に before/after unified rank/score/delta が付く。
  - 確認: EDINET 補完以外の条件差で母集団が変わらない。

- [ ] 8. 監査差分モデルを実装する。
  - 確認: `enteredTop10BySupplement`、`exitedTop10BySupplement`、`stayedTop10`、`largeRankMovers` が正しい。
  - 確認: `enteredTop10FromPreviousRun`、`exitedTop10FromPreviousRun`、`stayedTop10FromPreviousRun` が補完前後比較と混ざらない。

- [ ] 9. Markdown / LINE を更新する。
  - 確認: 書類状況、unified Top10 before/after、Top10 進入/脱落、Top10 EDINET 証跡が表示される。
  - 確認: LINE secrets 未設定 skip を維持し、新 summary を含む。

- [ ] 10. Actions を必要最小限で調整する。
  - 確認: artifact に Markdown、run metadata、audit JSON が含まれる。
  - 確認: critical 時に可能な限り report/audit/artifact/LINE failure 後に workflow failure となる。
  - 確認: 米国株 workflow は変更しない。

- [ ] 11. 単体・contract・focused tests を追加/更新する。
  - 確認: 書類選択、fact 整合性、unified 差分、前回実行比較、Markdown、LINE、workflow contract を fixture で検証する。

- [ ] 12. 実データ検証を行う。
  - 確認: 日本株スクリーナー実データ再実行で artience、寿スピリッツ、ニッタ、オーエスジー、リンテック、ブラザー工業、リクルートホールディングスを確認する。
  - 確認: オーエスジーで latest 半期と annual 有報が分離される。
  - 確認: artience と寿スピリッツの FCF margin が異常値へ戻らない。
  - 確認: ニッタの FCF growth warning が無関係な全指標へ複製されない。

- [ ] 13. 米国株回帰を行う。
  - 確認: 米国株 screener が既存 report 形式、SEC 補完順序、Rule of 40、ranking weights を維持する。

- [ ] 14. 完了時に active plan を completed へ移動する。
  - 確認: 実装 commit 前に計画 checkbox と実 diff の対応を自己レビューする。

## テスト計画

実装時に最低限実行する。

```powershell
node --test tests/fundamental-screener.test.js tests/screener-audit.test.js tests/daily-screener-report.test.js tests/line-screener-notify.test.js tests/daily-screener-contract.test.js
npm run test:unit
npm run test:contract
git diff --check
```

米国株回帰実行。

```powershell
$env:SCREENER_MARKET = "america"
$env:SCREENER_EXCHANGES = "NASDAQ,NYSE"
$env:SCREENER_SELECTED_SECTOR_COUNT = "5"
$env:SCREENER_RESULT_LIMIT = "90"
$env:SCREENER_REPORT_PATH = "docs/reports/screener/daily-ranking.md"
$env:SCREENER_METADATA_PATH = "docs/reports/screener/daily-ranking-run.json"
node scripts/screener/run-fundamental-screening.mjs
```

日本株実データ実行。

```powershell
$env:SCREENER_MARKET = "japan"
$env:SCREENER_EXCHANGES = "TSE"
$env:SCREENER_SYMBOL_ALLOWLIST_KEY = "jpx-prime"
$env:SCREENER_SELECTED_SECTOR_COUNT = "5"
$env:SCREENER_GROSS_MARGIN_MIN_PCT = "30"
$env:SCREENER_RESULT_LIMIT = "90"
$env:SCREENER_REPORT_PATH = "docs/reports/screener/daily-ranking-jp.md"
$env:SCREENER_METADATA_PATH = "docs/reports/screener/daily-ranking-jp-run.json"
$env:SCREENER_AUDIT_PATH = "docs/reports/screener/daily-ranking-jp-audit.json"
$env:SCREENER_AUDIT_STRICT = "true"
node scripts/screener/run-fundamental-screening.mjs
```

GitHub Actions 確認は、実装 commit/push 後に `Daily Fundamental Screener Japan` を確認し、成功または意図した critical failure、artifact 内容、LINE skip/failure/success 挙動を記録する。

## 実データ検証で記録する項目

対象銘柄:

- 4634 artience
- 2222 寿スピリッツ
- 5186 ニッタ
- 6136 オーエスジー
- 7966 リンテック
- 6448 ブラザー工業
- 6098 リクルートホールディングス

記録項目:

- 銘柄
- `latestDocument`
- `annualRankingDocument`
- 対象期間
- 売上
- 営業 CF
- CAPEX
- FCF
- FCF margin
- P/FCF
- 補完前 unified 順位
- 補完後 unified 順位
- 順位差
- 監査 status

## リスク

- EDINET API 呼び出し数増加。
  - 緩和: date list cache、銘柄ごとの annual 発見後終了、API count/time meta を入れる。
- 実行時間増加。
  - 緩和: annual 探索を 450 日から開始し、実データで計測して必要なら調整する。
- annual document が古い企業。
  - 緩和: document age warning を出し、過度に古い場合は fallback。
- IFRS 企業と日本基準企業の concept 差。
  - 緩和: 既存 concept matching を土台にし、fixture と実データで不足を確認する。
- CAPEX concept の企業差。
  - 緩和: 有形 CAPEX 必須、無形 CAPEX は欠損区分を分け、0 断定しない。
- 同一 fact の重複。
  - 緩和: group 内で concept/context/sourceFile/value を見て優先順位と duplicate warning を持つ。
- 訂正報告書。
  - 緩和: 訂正有報は候補に入れるが、元書類関係が不明な場合は rank ineligible。
- 12月決算と3月決算の混在。
  - 緩和: 期間日付と durationDays を証跡化し、通期判定を context だけに依存しない。
- Phase5 との再統合による処理重複。
  - 緩和: 補完前/補完後 row set または supplemental map の再利用で EDINET API を重複実行しない。
- 監査 JSON 肥大化。
  - 緩和: 詳細 inputs は Top10 と異常/差分銘柄を中心に保存し、全候補への巨大 raw fact 保存は避ける。サイズ増加理由は入力 fact 証跡が acceptance criteria で必須なため。
- GitHub Actions 実行時間。
  - 緩和: local 実測と workflow run metadata により確認する。
- LINE 文字数制限。
  - 緩和: LINE は件数と最大変動/代表例だけにし、詳細は report/audit artifact に寄せる。

## 非目標

- ランキング重みそのものの再調整。
- Phase1 セクター採点ロジックの変更。
- Phase2 Industry ranking の変更。
- テーマ分類ロジックの変更。
- 日本株 universe の拡張。
- 新しい外部データソースの追加。
- EDINET API キー管理方式の変更。
- LINE Messaging API 設定の変更。
- 米国株側の監査機能追加。
- 過去 ranking の backtest。
- 現在の監査実装の全面書き直し。

## 完了条件

### 年次書類

- 最新の半期報告書が存在しても、有価証券報告書をランキング用資料として取得できる。
- `latestDocument` と `annualRankingDocument` が区別される。
- 通期書類がない場合は EDINET FCF 系指標をランキングへ使用しない。
- 書類選択理由が audit JSON へ残る。

### fact 整合性

- 売上、営業 CF、CAPEX の期間が一致している。
- 連結/個別が一致している。
- 通貨が一致している。
- CAPEX 欠損を 0 として扱わない。
- 不整合時は `rankEligible=false`。
- 不整合理由が audit JSON へ残る。
- 派生指標ごとに入力 fact を追跡できる。

### unified ランキング差分

- 補完前後とも最終 Phase4 + Phase5 統合候補を採点する。
- 最終候補すべてに補完前後順位が付く。
- Top10 進入と脱落を両方検出できる。
- Phase5 専用候補も比較対象になる。
- 補完前後の母集団差が監査できる。

### 監査

- critical 条件を fixture で検証できる。
- warning が指標単位で付く。
- 前回実行との Top10 進入/脱落を両方検出できる。
- audit JSON に必要な証跡がある。
- critical 時に strict 監査が失敗する。

### 回帰

- 既存テストがすべて成功。
- 新規テストがすべて成功。
- 日本株実データ実行成功。
- 米国株回帰実行成功。
- GitHub Actions 成功または意図した critical 失敗を確認。
- artifact へ Markdown、run metadata、audit JSON が含まれる。
- git working tree が clean。
- main と origin/main が同期している。

## 自己レビュー観点

- 既存実装を削除、巻き戻し、簡略化する計画になっていない。
- 3課題に直接関係しない refactor を入れていない。
- 米国株 workflow/report/SEC 補完への変更を避けている。
- CAPEX 欠損と 0 を混同しない方針になっている。
- EDINET API キーや secrets をログや docs に出さない。
- 計画は実装前承認を前提にしている。
