# Phase2 sector order align to phase1_20260513_0205

## 目的

`Phase2 通過銘柄のセクター内訳` のセクター表示順を、現在の独自集計順ではなく、`Phase1 セクターランキング` の並び順に揃える。

## 変更対象ファイル

- `src/core/fundamental-screener.js`
- `scripts/screener/run-fundamental-screening.mjs`
- `tests/daily-screener-report.test.js`
- `tests/fundamental-screener.test.js`
- `docs/reports/screener/daily-ranking.md`

## 影響範囲

- Phase2 セクター内訳の表示順
- `sectorRanking` payload の並び順と補助情報

## 実装方針

- `summarizeSectors()` が返す各セクター要約に `phase1SectorRank` を含める
- Phase2 セクター要約は `phase1SectorRank` 昇順で並べ、Phase1 にないものだけ後ろへ回す
- 表示上の `セクター順位` もこの `Phase1` 順序をそのまま使う

## 実装ステップ

- [ ] `src/core/fundamental-screener.js` で `sectorRanking` に `phase1SectorRank` を反映し、並び順を Phase1 基準へ変更する
- [ ] `tests/fundamental-screener.test.js` で Phase1 順になることを検証する
- [ ] `tests/daily-screener-report.test.js` の期待値を Phase1 順へ更新する
- [ ] workflow 相当条件でレポートを再生成し、期待どおりの順序になることを確認する

## テスト戦略

- `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js`
- workflow 相当 env 付きで `node scripts/screener/run-fundamental-screening.mjs`

## 検証コマンド

- `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js`
- `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE SCREENER_GROSS_MARGIN_MIN_PCT=30 SCREENER_SCOPE_LABEL='NASDAQ + NYSE stocks only (OTC excluded)' node scripts/screener/run-fundamental-screening.mjs`

## リスク

- Phase1 にないセクターが混ざる場合の末尾処理を明示しないと、順序が分かりにくくなる
- 表示順だけの変更でも、既存テストの fixture に依存した期待値がずれる

## スコープ外

- Phase2 の指標や列構成の変更
- Phase1 / Phase2 のスコアリングロジック変更
