# US Screener Phase5 all-sector breakout plan

## Goal

既存の Phase1〜Phase4 本流ロジックを変更せず、米国 daily screener に別枠サテライトとして `Phase5 Sector別 個別銘柄ランキング` を追加する。Phase1上位3セクター外にある CRDO のような強い個別銘柄を、Phase1上位20セクターから各セクターTop5として拾えるようにする。

## Files

| File | Action | Scope |
|---|---|---|
| `src/core/fundamental-screener.js` | MODIFY | Phase5定数、上位20セクター別候補取得、既存filter/rank再利用、`phase5SectorTopStocks` と metadata 返却を追加 |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | Phase4直後にPhase5 Markdown表と `[phase5]` ログを追加 |
| `tests/fundamental-screener.test.js` | MODIFY | Phase5が本流Phase4を変えず、各セクターTop5を返すことを固定 |
| `tests/daily-screener-report.test.js` | MODIFY | Phase5見出し・列・表示順を固定 |
| `docs/reports/screener/daily-ranking.md` | UPDATE | レポート再生成で `## Phase5` と CRDO 掲載を確認 |

## Implementation Steps

- [x] Step 1: 既存の本流 Phase1〜Phase4 のデータフローを確認し、Phase5を別配列で追加する位置を決める。
  - Check: `selectedSectorLabels` と `finalStockRanking` を変更しない。
- [x] Step 2: RED テストを追加/更新する。
  - Check: Phase5が `sectorMomentum.rankings.slice(0, 20)` 起点で、各セクターTop5を返す期待にする。
- [x] Step 3: `src/core/fundamental-screener.js` にPhase5処理を追加する。
  - Check: `passesScopeFilters` / `passesProfileScope` / `passesProfileClientFilters` / `applyBlockRanks` / `stripInternalFields` を再利用する。
- [x] Step 4: Markdownレポートとログを追加する。
  - Check: Phase4直後にPhase5表を出し、`[phase5] sectorLimit=20` などのログが出る。
- [x] Step 5: テストとレポート再生成を実行する。
  - Check: `npm run test:unit`、`git diff --check`、`node scripts/screener/run-fundamental-screening.mjs` が成功し、`CRDO` がPhase5に出るか確認する。
- [x] Step 6: 自己レビューし、計画を completed へ移動してコミット・プッシュする。
  - Check: Phase4 Top40とPhase5が混ざっていない。

## Out of Scope

- Phase1採用セクター数の変更。
- Phase2 Industry RankingやPhase4 Top40の母集団変更。
- CRDOなど特定銘柄の強制採用。
- 新しいスコアリング式や新データプロバイダ追加。

## Risks

- 上位20セクター×scanner取得によりAPIリクエスト数と実行時間が増える。
- 上位20セクター内でもプロファイル条件を満たさないセクターはPhase5銘柄が少ない/ゼロになる。
- Phase5は各セクターTop5保証なので、全市場Top100より低スコアの銘柄も表示される。

## Validation Commands

```powershell
npm run test:unit
git diff --check
$env:SEC_USER_AGENT='Oh-MY-TradingView szk23b0702@gmail.com'; node scripts/screener/run-fundamental-screening.mjs
Select-String -Path docs/reports/screener/daily-ranking.md -Pattern "## Phase5|CRDO"
```
