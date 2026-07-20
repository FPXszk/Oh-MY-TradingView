# Japan Screener EDINET Audit v2 Follow-up Plan

作成日: 2026-07-21 01:34 JST

## 目的

日本株スクリーナー EDINET 監査 v2 のレビューで判明した残課題6件を、既存実装 `b97425d1567d00a62e25a5baa3cae71093ac3db4` と最新 report publish `d8965e11f158f8d27a41ce9e49b6f589103446a9` を土台に修正する。

添付指示により今回の依頼は承認済み。計画作成後にユーザー承認待ちで停止せず、自己レビュー後に実装、テスト、実データ再実行、GitHub Actions 確認、commit、push まで進める。

## 現在コードの確認結果

- 作業開始時点の `main...origin/main` は同期済み。
- 最新 main は `d8965e1 docs: daily screener japan report run 29758586364-1` を含む。
- `docs/exec-plans/active/` に競合する active plan はない。
- `.github/workflows/daily-screener-japan.yml` は `SCREENER_EDINET_ANNUAL_LOOKBACK_DAYS=450` を維持している。
- `src/core/edinet.js` は `latestDocument` と `annualRankingDocument` を分離済みだが、年次書類選択は `buildAnnualDocumentCandidateScore()` の加点式で、古い訂正有報が新しい通常有報へ勝つ余地がある。
- `src/core/edinet.js` は fact group 化と CAPEX 欠損 0 扱い回避を一部実装済みだが、当期/前期 group の連結、通貨、決算月、期間順序、concept family 整合性は成長率単位で十分に検証されていない。
- `src/core/fundamental-screener.js` の `attachUnifiedSupplementDiff()` は補完後 unified 候補へ before 値を戻して再採点しており、補完前/補完後の Phase4 と Phase5 候補選定を完全に2系統で再構築していない。
- `src/core/screener-audit.js` の監査母集団は主に最終 ranking rows 由来で、補完前候補のみ/補完後候補のみの和集合監査が不十分。
- `scripts/screener/run-fundamental-screening.mjs` の EDINET 抽出元表は EDINET 抽出値と最終採用値が混在しており、TradingView fallback が EDINET 計算値に見える可能性がある。
- Phase5 内でも `getEdinetSupplementalFundamentalsBatch()` を呼ぶ経路が残っており、Phase4/Phase5 の EDINET 取得を1回へ統合する余地がある。

## レビュー指摘6件と根本原因

1. 年次書類選択が periodEnd 最優先ではない。
   - 根本原因: 年次候補を periodEnd、訂正区分、submitDateTime、docID の順で比較せず、固定加点スコアで比較している。

2. 補完前/補完後 Phase4/Phase5 候補が完全な2系統になっていない。
   - 根本原因: 補完後候補群を固定し、値だけ TradingView 初期値へ戻して再採点している。

3. 監査母集団が補完前後候補ユニオンではない。
   - 根本原因: audit builder が result の最終 ranking rows を中心に処理し、候補母集団の進入/脱落を first-class data として受け取っていない。

4. 当期/前期 group 整合性が成長率単位で検証されていない。
   - 根本原因: currentGroup/priorGroup を独立選択した後、成長率用の group compatibility を別途検証していない。さらに row 全体の metricStatus を複数指標へ共有している。

5. EDINET 証跡表と TradingView fallback 値が分離されていない。
   - 根本原因: audit evidence row と Markdown 表示が `metricProvenance.finalValue` をそのまま EDINET 抽出元表へ出している。

6. Phase4/Phase5 の EDINET 取得が1回へ統合されていない。
   - 根本原因: Phase5 構築関数内に Japan EDINET 補完呼び出しが残り、Phase4 側とは別に実行され得る。

## 修正予定ファイル

- `src/core/edinet.js`
  - 年次書類 periodEnd 選択、選択理由、証跡、download/parse cache、成長率 group 整合性、metric-specific rankEligible、edinetEvidence/finalMetrics 元データを実装する。
- `src/core/fundamental-screener.js`
  - Phase4/Phase5 raw universe を作り、EDINET batch を1回だけ実行し、補完前/補完後ランキング状態を別々に構築する。
- `src/core/screener-audit.js`
  - 補完前後候補ユニオン監査、候補進入/脱落、Top10 進入/脱落、critical/warning 条件、edinetEvidence/finalMetrics 分離を追加する。
- `scripts/screener/run-fundamental-screening.mjs`
  - Markdown の EDINET 一次情報表と最終採用値表を分離し、EDINET 取得状況/候補母集団/Top10 差分を表示する。
- `scripts/line/send-screener-line-message.mjs`
  - LINE 監査サマリへ critical/warning、年次未取得、候補進入/脱落、Top10進入/脱落、fallback、EDINET重複防止/キャッシュ、最大順位変動を含める。
- `.github/workflows/daily-screener-japan.yml`
  - 既存 env と artifact/publish/LINE 流れを確認し、必要最小限のみ調整する。
- `tests/fundamental-screener.test.js`
  - 年次書類選択、成長率整合性、EDINET一括取得、2系統候補選定の単体テストを追加する。
- `tests/screener-audit.test.js`
  - 監査ユニオン、Top10進入/脱落、critical/warning、証跡分離のテストを追加する。
- `tests/daily-screener-report.test.js`
  - Markdown 表分離と候補母集団表示を検証する。
- `tests/line-screener-notify.test.js`
  - LINE サマリ更新を検証する。
- `tests/daily-screener-contract.test.js`
  - Japan workflow env/artifact/strict contract の必要差分を検証する。
- `docs/reports/screener/daily-ranking-jp.md`
- `docs/reports/screener/daily-ranking-jp-run.json`
- `docs/reports/screener/daily-ranking-jp-audit.json`
  - 実データ再実行で生成更新される。

## 変更しないファイル・範囲

- `AGENTS.md`
- `.github/copilot-instructions.md`
- `.github/workflows/daily-screener.yml`
- 米国株 SEC 補完
- 米国株 Rule of 40
- 米国株 Phase4/Phase5 ranking logic
- 米国株レポート/LINE通知の仕様

共通関数を触る場合も、Japan 固有条件で分岐し、米国株回帰を必ず実行する。

## データフロー変更

現行:

```text
Phase4 candidates -> EDINET補完 -> Phase4 ranking
Phase5 builder -> EDINET補完 -> Phase5 ranking
補完後 unified candidates -> before値へ戻して再採点
```

変更後:

```text
TradingView Phase4 raw universe
TradingView Phase5 raw universe
Phase4/Phase5 EDINET対象ユニオン
EDINET batch 1回
補完前 row set
補完後 row set
補完前 Phase4 candidate state
補完後 Phase4 candidate state
補完前 Phase5 candidate state
補完後 Phase5 candidate state
補完前 unified ranking state
補完後 unified ranking state
補完前後候補ユニオン audit
```

各 ranking state は最低限以下を保持する。

```text
candidateRows
rankedRows
candidateKeys
phase4CandidateKeys
phase5CandidateKeys
rankingBlocks
populationSize
```

## API 呼び出し削減方針

- Phase4/Phase5 の EDINET 対象を `exchange + symbol` でユニオン化し、`getEdinetSupplementalFundamentalsBatch()` は Japan 実行内で1回だけ呼ぶ。
- EDINET 側に実行単位 cache を追加または既存処理へ組み込む。
  - document list by date
  - selected document by symbol
  - downloaded archive by docID
  - parsed facts by docID
- `sourceDetails.edinet` へ以下を記録する。
  - `uniqueRequestedSymbols`
  - `phase4RequestedSymbols`
  - `phase5RequestedSymbols`
  - `overlapSymbols`
  - `documentListRequests`
  - `documentDownloads`
  - `documentDownloadCacheHits`
  - `parsedDocumentCacheHits`
  - `elapsedMs`

## 実装ステップ

- [x] 1. 年次書類の periodEnd 最優先選択を実装する。
  - 確認: 新しい通常有報が古い訂正有報より優先される。
  - 確認: 同一期では訂正有報が優先され、同一期の複数訂正有報では submitDateTime 最新が選ばれる。
  - 確認: periodEnd 不明候補は periodEnd 判定済み候補より低く評価される。

- [x] 2. EDINET download/parse cache と meta 計測を追加する。
  - 確認: 同一 docID の download/parse が1回になり、cache hit 数が meta に残る。

- [x] 3. 成長率用 current/prior group 整合性を実装する。
  - 確認: 連結/通貨/決算月/duration/period sequence/concept family/capex policy 不一致で成長率だけ `rankEligible=false`。
  - 確認: 当期 FCF margin と P/FCF は正常なら巻き添えで invalid にならない。

- [x] 4. metric-specific provenance を整理し、`edinetEvidence` と `finalMetrics` を分離する。
  - 確認: EDINET 計算不能時に EDINET 計算列は N/A、最終採用値は TradingView fallback と表示される。

- [x] 5. Phase4/Phase5 raw universe を集約し、EDINET batch を1回へ統合する。
  - 確認: Phase4-only、Phase5-only、Both に同じ supplemental map が共有される。

- [x] 6. 補完前/補完後の Phase4/Phase5/unified ranking state を別々に構築する。
  - 確認: 値を戻して再採点するだけではなく、候補選定から2系統で再構築される。

- [x] 7. 監査母集団を補完前後候補ユニオンに変更する。
  - 確認: 補完前のみ、補完後のみ、両方存在の各銘柄が監査 JSON に残る。
  - 確認: 補完前 Top10 から補完後候補外になった銘柄が `exitedTop10BySupplement` に入る。

- [x] 8. critical/warning 条件を追加する。
  - 確認: 添付指示の critical/warning 候補を fixture で検証する。

- [x] 9. Markdown と LINE 通知を更新する。
  - 確認: EDINET取得状況、候補母集団、Top10差分、EDINET一次情報、最終採用値が表示される。

- [x] 10. focused tests、unit、contract、US/JP 実データ回帰を実行する。
  - 確認: 既存テストを削除、skip、弱体化しない。

- [x] 11. GitHub Actions `Daily Fundamental Screener Japan` を実行し、artifact と publish を確認する。
  - 確認: `daily-ranking-jp.md`、`daily-ranking-jp-audit.json`、`daily-ranking-jp-run.json` が artifact に含まれる。

- [x] 12. active plan を completed へ移動し、実装完了 commit/push を行う。
  - 確認: 最終的に `main...origin/main` ahead/behind 0/0、working tree clean。

## テスト計画

Focused:

```powershell
node --test tests/fundamental-screener.test.js tests/screener-audit.test.js tests/daily-screener-report.test.js tests/line-screener-notify.test.js tests/daily-screener-contract.test.js
```

必須:

```powershell
git diff --check
npm run test:unit
npm run test:contract
```

米国株回帰:

```powershell
$env:SCREENER_MARKET = "america"
$env:SCREENER_EXCHANGES = "NASDAQ,NYSE"
$env:SCREENER_SELECTED_SECTOR_COUNT = "5"
$env:SCREENER_RESULT_LIMIT = "90"
$env:SCREENER_REPORT_PATH = "docs/reports/screener/daily-ranking.md"
$env:SCREENER_METADATA_PATH = "docs/reports/screener/daily-ranking-run.json"
node scripts/screener/run-fundamental-screening.mjs
```

日本株ローカル実データ:

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
$env:SCREENER_EDINET_ANNUAL_LOOKBACK_DAYS = "450"
node scripts/screener/run-fundamental-screening.mjs
```

GitHub Actions:

```powershell
gh workflow run daily-screener-japan.yml --ref main
gh run watch <run-id> --exit-status
```

## 実データ確認対象

- 7581 サイゼリヤ
  - `annualRankingDocument.periodEnd`
  - 古い訂正有報が新しい対象期より優先されていないこと
  - `selectedReason` と `selectionPriority`
- 6136 オーエスジー
  - 最新半期書類と年次ランキング書類の分離
  - 通期 FCF margin / P/FCF
- 4634 artience
  - FCF margin が約 3.5% 付近で、69.4% に戻っていないこと
- 2222 寿スピリッツ
  - FCF margin が約 14.4% 付近で、85.4% に戻っていないこと
- 5186 ニッタ
  - FCF growth warning が無関係な指標へ複製されていないこと
- 6448 ブラザー工業
- 6098 リクルートホールディングス
- 7966 リンテック
- 6237 イワキポンプ

## リスク

- EDINET API 実行時間が増える。
  - 緩和: Phase4/Phase5 union 取得と docID cache で重複を抑える。
- periodEnd を document list だけで取得できない書類がある。
  - 緩和: `docDescription` / existing period parser を優先し、不明候補は低評価。ranking 利用時は fact から確定できたことを必須にする。
- 成長率の concept family 判定が厳しすぎると fallback が増える。
  - 緩和: `METRIC_SPECS` の概念 family に閉じて実装し、異常な cross-family 比較を避ける。
- audit JSON が肥大化する。
  - 緩和: full raw fact 全量ではなく、候補ユニオンと証跡要件に必要な値へ限定する。
- LINE 文字数制限。
  - 緩和: LINE は件数と代表例のみ、詳細は Markdown/audit JSON に寄せる。
- GitHub Actions publish race。
  - 緩和: publish failure は race とデータ監査 failure を分けて確認し、必要なら rerun する。

## 完了条件

- 年次書類が `periodEnd` 最優先で選ばれる。
- 同一期だけ訂正有報が通常有報より優先される。
- `annualRankingDocument` に `periodStart`、`periodEnd`、`submittedAt`、`isAmended`、`legalStatus`、`selectedReason`、`selectionPriority`、`candidateCount` が残る。
- 補完前/補完後で Phase4、Phase5、unified 候補選定を別々に構築する。
- 監査母集団が補完前後候補ユニオンになる。
- 片方に存在しない順位は `null`。
- 成長率不整合は該当成長率だけ `rankEligible=false`。
- EDINET 計算値と最終採用値が Markdown と audit JSON で分離される。
- EDINET batch 取得が Japan 実行内で1回。
- `documentDownloads` と cache hit が確認できる。
- focused tests、`npm run test:unit`、`npm run test:contract` が成功。
- 米国株回帰と日本株ローカル実行が成功。
- GitHub Actions `Daily Fundamental Screener Japan` が成功し、artifact/publish が確認済み。
- active plan を `docs/exec-plans/completed/` へ移動済み。
- 実装 commit と計画完了 commit を push 済み。
- 最終 `main...origin/main` ahead/behind 0/0、working tree clean。
