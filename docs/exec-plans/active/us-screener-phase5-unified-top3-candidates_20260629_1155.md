# US Screener Phase5 Unified Top3 Candidate Plan

作成日時: 2026-06-29 11:55 JST

## ゴール

前回実装した米国株 daily fundamental screener の unified scoring で、Phase5 側から unified 母集団へ追加する候補を Phase5 全 `clientFiltered` / `ranked` ではなく、各セクター旧 Phase5 スコア順 Top3 のみに制限する。

## 前提と解釈

- 対象は `market === 'america'` の daily screener に限定する。
- Phase5 表示は引き続き各セクター Top5 を表示する。
- unified scoring の母集団は `Phase4候補 + Phase5 Sector別Top3候補` とする。
- Phase5 セクター内 4位・5位は、Phase5 表には出してよいが、Phase5 由来として unified 母集団には入れない。
- ただし、Phase5 セクター内 4位・5位相当でも Phase4 候補に含まれる銘柄は、Phase4 由来として unified 母集団に残してよい。
- Phase1 / Phase2 Industry ranking、既存フィルタ条件、score weights、Japan screener は変更しない。

## 変更予定ファイル

- `src/core/fundamental-screener.js`
  - `PHASE5_UNIFIED_CANDIDATE_TOP_STOCKS_PER_SECTOR = 3` を追加する。
  - `buildPhase5SectorTopStocks()` で、表示用 `rows` は Top5 のまま、unified 母集団用 `candidateRows` は各セクター Top3 のみ返す。
  - Phase5 meta に `unifiedCandidateTopStocksPerSector` と `unifiedCandidateRows` を追加する。
  - `unifiedScoringMeta.phase5CandidateCount` が Phase5 Top3 候補数になることを維持し、`phase5UnifiedCandidateTopStocksPerSector` を追加する。
  - `scoreBasis` を `phase4_candidates_plus_phase5_sector_top3_candidates` に変更する。
- `scripts/screener/run-fundamental-screening.mjs`
  - Phase4 表説明を `Phase5 Sector別Top3候補` と明記する。
  - guide row の unified scoring 説明も Top3 であることが分かる文言に更新する。
- `tests/fundamental-screener.test.js`
  - Phase5 unified candidate が各セクター Top3 に制限され、表示側は Top5 のまま残ることを検証する。
  - Phase5 セクター内 4位・5位相当でも Phase4 候補なら unified 母集団に残ることを検証する。
  - `unifiedScoringMeta` の `phase5CandidateCount` / `dedupedCount` / Top3 meta を検証する。
- `tests/daily-screener-report.test.js`
  - Markdown の Phase4 説明と guide row が `Phase5 Sector別Top3候補` を示すことを検証する。
- `docs/reports/screener/daily-ranking.md`
  - 実装後に再生成する。

## 実装ステップ

- [ ] `buildPhase5SectorTopStocks()` の Phase5 表示 Top5 と unified 候補 Top3 を別配列に分ける。
- [ ] Phase5 meta / unified scoring meta / score basis を Top3 前提へ更新する。
- [ ] Markdown 生成の Phase4 説明と guide row を Top3 明記へ更新する。
- [ ] core test に Phase5 Top3 制限、Phase4 由来の残存、meta 件数検証を追加・更新する。
- [ ] report test の説明文期待を更新する。
- [ ] `npm run test:unit` と `git diff --check` を実行する。
- [ ] `node scripts/screener/run-fundamental-screening.mjs` で `docs/reports/screener/daily-ranking.md` を再生成する。
- [ ] 再生成レポートで Phase4説明、Phase5表 Top5維持、Phase1/Phase2非破壊、Phase6なしを確認する。

## 影響範囲

- unified scoring の Phase5 追加候補数が最大 `20 sectors * 3 = 60` 件に絞られる。
- Phase5 表は最大 `20 sectors * 5 = 100` 件のまま維持される。
- Phase4 統合ランキングに混ざる Phase5-only 銘柄は、Phase5 各セクター Top3 由来のみに制限される。

## Out of Scope

- Phase5 表示 Top5 の廃止。
- Phase1 / Phase2 Industry ranking の scoring 変更。
- 既存取得条件、profile threshold、score weights、指標計算、補完ロジックの変更。
- Japan screener のロジック変更。

## 検証コマンド

```powershell
npm run test:unit
git diff --check
node scripts/screener/run-fundamental-screening.mjs
```

## リスクと監視点

- Phase5 表示 Top5 と unified 候補 Top3 が同じ配列を共有すると、表示行が誤って 3 件に減る可能性がある。
- `unifiedPhase5SectorTopStocks` は unified ranked rows から作るため、Top3 に絞ったあと Phase5 表の 4位・5位が消える可能性がある。必要なら表示側は従来 `phase5.rows` を維持しつつ、unified score がある行だけ unified score を反映する。
- Markdown の説明だけ更新して実レポートを再生成し忘れると、ユーザーが見る daily-ranking が古い説明のまま残る。
