# US Screener Phase4 / Phase5 Unified Scoring Plan

作成日時: 2026-06-29 10:51 JST

## ゴール

米国株 daily fundamental screener の Phase4 候補と Phase5 候補を統合した共通母集団で `applyBlockRanks(..., getRankingBlocks('america'))` を 1 回だけ実行し、Phase4 表と Phase5 表で同じ `unifiedRankScore` / `unifiedRank` / `unifiedRankBreakdown` を参照する。

## 前提と解釈

- 対象は `market === 'america'` の daily screener に限定する。
- Phase1 Sector ranking / Phase2 Industry ranking の集計スコア、取得条件、profile threshold、既存 ranking block の重みは変更しない。
- Phase4 候補は、現在の Phase3 上位 industry に属する個別銘柄ランキング対象全体を使う。Top40 に切った後の `finalStockRanking` だけを候補にするのは避ける。
- Phase5 候補は、TradingView 取得、scope/profile/client filter、Moomoo/US supplement、theme taxonomy、localized names、profile annotation を通過した行を使い、Phase5 内部だけの採点結果は最終表示に使わない。
- 既存の `finalStockRanking` / `phase5SectorTopStocks` / `hiddenPhase4Candidates` は互換目的では残せるが、米国 daily report 表示では unified 系を優先する。

## 変更予定ファイル

- `src/core/fundamental-screener.js`
  - Phase4 候補行を `phase4CandidateRows` として保持する。
  - `buildPhase5SectorTopStocks()` に `candidateRows` と Phase5 セクターラベルを返させる。
  - `buildUnifiedCandidateRows()` / `applyUnifiedRanks()` / `buildUnifiedPhase4Ranking()` / `buildUnifiedPhase5SectorTopStocks()` を追加する。
  - `runFundamentalScreener()` の戻り値に `unifiedCandidateRows` / `unifiedRankedRows` / `unifiedPhase4Ranking` / `unifiedPhase5SectorTopStocks` / `unifiedScoringMeta` を追加する。
  - `hiddenPhase4Candidates` は deprecated 互換として残しつつ、unified 表示では使わない。
- `scripts/screener/run-fundamental-screening.mjs`
  - Phase4 表の入力を `result.unifiedPhase4Ranking` 優先に切り替える。
  - Phase4 表に `出所` 列を追加し、`Phase4` / `Phase5` / `Both` を表示する。
  - `unifiedRankScore` / `unifiedRankBreakdown` を優先する表示ヘルパーを追加する。
  - Phase4 末尾の `-` hidden candidate 表示と注釈を廃止する。
  - Phase5 表の入力を `result.unifiedPhase5SectorTopStocks` 優先に切り替える。
  - スコア説明に、米国株では Phase4/Phase5 統合母集団の `unifiedRankScore` と Phase1/Phase2 集計スコアが別物である旨を追記する。
- `tests/fundamental-screener.test.js`
  - unified candidate の重複除外と `sourceBuckets` マージを検証する。
  - Phase4/Phase5 に同じ銘柄が出る場合の `unifiedRankScore` 一致を検証する。
  - Phase5 由来銘柄が `-` ではなく `unifiedRank` 付きで Phase4 統合ランキングに入ることを検証する。
  - Phase5 Sector Top5 が `unifiedRankScore` 順になることを検証する。
  - Japan 側は unified scoring が無効または既存表示を壊さないことを検証する。
- `tests/daily-screener-report.test.js`
  - Phase4 表の `出所` 列、hidden candidate `-` 行の非表示、Phase5 表の維持、`unifiedRankScore` 優先表示、スコア説明更新、Phase6 見出し非表示を検証する。
- `docs/reports/screener/daily-ranking.md`
  - 実装後に daily screener を再実行して再生成する。

## 実装ステップ

- [ ] `src/core/fundamental-screener.js` の Phase4 / Phase5 候補取得位置を最小変更で分離し、既存の取得・補完・フィルタ条件を変えずに candidate rows を返す。
- [ ] `buildUnifiedCandidateRows()` を追加し、`exchange + symbol` を基本キーに重複除外しつつ `sourceBuckets` / `phase4Eligible` / `phase5Eligible` を付与する。
- [ ] `applyUnifiedRanks()` を追加し、統合候補へ `unifiedRank` / `unifiedRankScore` / `unifiedRankBreakdown` を付与する。
- [ ] `buildUnifiedPhase4Ranking()` と `buildUnifiedPhase5SectorTopStocks()` を追加し、Phase4 表と Phase5 表の入力を unified ranked rows から作る。
- [ ] `runFundamentalScreener()` の戻り値と `criteria` / `sourceDetails` に unified scoring のメタ情報を追加する。
- [ ] レポート生成スクリプトで Phase4 / Phase5 表を unified 系優先に切り替え、`出所` 列と score 表示ヘルパーを追加し、hidden candidate 末尾表示を外す。
- [ ] unit test を追加・更新して、candidate dedupe、score consistency、Phase5 由来行の Phase4 混入、Phase5 sector top sort、Japan 非影響を検証する。
- [ ] daily report test を追加・更新して、Markdown の列・説明・非表示条件を検証する。
- [ ] `npm run test:unit`、`git diff --check`、`node scripts/screener/run-fundamental-screening.mjs` を実行する。
- [ ] `docs/reports/screener/daily-ranking.md` を確認し、Phase4/Phase5 の同一銘柄の総合点一致、Phase5 表の維持、Phase1/Phase2 の非破壊、Phase6 見出し非表示を確認する。

## 影響範囲

- 米国株 daily screener の個別銘柄スコア表示軸が Phase4/Phase5 共通になる。
- Phase4 表には Phase5 由来の強い銘柄が順位付きで混ざる可能性がある。
- Phase5 表のセクター内 Top5 は従来の Phase5 母集団スコアではなく unified 母集団スコア順になる。
- Japan screener のランキング・表示は変更しない。

## Out of Scope

- スコア重み、ranking block、個別指標計算、フィルタ条件、profile threshold の変更。
- Phase1 Sector ranking / Phase2 Industry ranking の unified score 化。
- `hiddenPhase4Candidates` 関数の即時削除。不要化は表示から外すところまでに留める。
- GitHub Actions workflow や runner 設定の変更。

## 検証コマンド

```powershell
npm run test:unit
git diff --check
node scripts/screener/run-fundamental-screening.mjs
```

## リスクと監視点

- Phase5 の補完後 candidate rows と既存 `rows` の形状がずれると、Phase5 表の metadata や T/F 表示が不整合になる可能性がある。
- `rankScore` を互換目的で残すため、表示ヘルパーが `unifiedRankScore` を優先していることをテストで固定する。
- Phase4 統合ランキングに Phase5-only 行が入るため、順位表示は連番ではなく `unifiedRank` を使い、`出所` 列で検出経路を明示する。
- `daily-ranking.md` は実行時点の市場データに依存するため、行数や銘柄名は固定値ではなく構造とスコア一貫性を中心に確認する。
