# Phase5発掘候補をPhase4表末尾に追加表示する計画

作成日時: 2026-06-28 23:48 JST

## 目的

米国株 daily screener の既存レポートで、Phase5 Sector別 個別銘柄ランキングから Phase4 Top40 未掲載かつ Phase4 掲載水準に近い銘柄を抽出し、Phase4 個別銘柄ランキング表の末尾に補助行として表示する。新しい Phase6 見出しや Phase6 表は作らない。

## 前提・解釈

- Phase4 本体の `finalStockRanking` は順位・並び順・対象銘柄を変更しない。
- 候補抽出は Phase4 と Phase5 の結果配列が揃った後に行い、Phase4 本体とは別配列として扱う。
- 候補の rank 表示だけ `-` にし、Phase4 表と同じ列構成・同じセル整形を使う。
- 条件に合う候補が0件の場合、注釈も追加行も出さない。
- Phase5 表は既存どおり残す。

## 変更予定ファイル

- `src/core/fundamental-screener.js`
  - Phase5結果から `hiddenPhase4Candidates` を抽出する小さな関数を追加する。
  - `screenFundamentals` の戻り値に `hiddenPhase4Candidates` を追加する。
  - 抽出条件は指定どおり、Phase4重複除外、Sector内Rank <= 3、rankScore >= max(50, Phase4最下位rankScore)、Phase5 Sector Rank >= 10、3Mまたは6Mモメンタム条件、最大5件、rankScore desc / symbol asc とする。
- `scripts/screener/run-fundamental-screening.mjs`
  - Phase4 表生成処理で、既存の列構成と `buildRankingMetricCells` を再利用して候補行を末尾に追加する。
  - 候補がある場合だけ、指定の注釈を Phase4 表下・候補行直前に出す。
  - Phase6 見出しは追加しない。
- `tests/fundamental-screener.test.js`
  - 候補抽出条件、最大5件、重複除外、閾値 `max(50, Phase4最下位rankScore)`、並び順を検証する。
- `tests/daily-screener-report.test.js`
  - Phase4 表末尾に `-` 行が出ること、列形式がPhase4と一致すること、候補0件では注釈が出ないこと、Phase5表が残ること、Phase6見出しが出ないことを検証する。
- `docs/reports/screener/daily-ranking.md`
  - `node scripts/screener/run-fundamental-screening.mjs` の再生成結果として確認・更新する。
- `docs/exec-plans/active/phase5-hidden-candidates-in-phase4_20260628_2348.md`
  - 実装完了時に `docs/exec-plans/completed/` へ移動する。

## 影響範囲

- 米国株 daily screener の Phase4 表示だけに影響する。
- Phase4 のランキング算出、Phase5 のランキング算出、Japan screener の表示には影響させない。
- 既存の銘柄スコアやフィルタ条件は変更しない。

## 実装ステップ

- [ ] 既存の Phase4 / Phase5 生成箇所とテストフィクスチャを確認する。
- [ ] `hiddenPhase4Candidates` 抽出関数を追加し、`screenFundamentals` の戻り値に含める。
- [ ] Phase4 Markdown 表に候補行を末尾追加する処理を実装する。
- [ ] 単体テストを追加・更新する。
- [ ] `npm run test:unit` を実行して回帰を確認する。
- [ ] `git diff --check` を実行して空白エラーを確認する。
- [ ] `node scripts/screener/run-fundamental-screening.mjs` を実行して `docs/reports/screener/daily-ranking.md` を再生成する。
- [ ] 生成レポートで Phase4 末尾の `-` 行、Phase5見出し維持、Phase6不在、Phase4重複なしを確認する。
- [ ] 計画を `docs/exec-plans/completed/` へ移動し、実装変更を Conventional Commit でコミット・プッシュする。

## 検証コマンド

```powershell
npm run test:unit
git diff --check
node scripts/screener/run-fundamental-screening.mjs
```

## リスクと注意点

- Phase4 と Phase5 は母集団が異なるため、候補を Phase4 本体に混ぜて再順位付けしない。
- Phase4 最下位スコアが空の場合は fallback 50 を使う。
- 候補が0件の場合に注釈だけ残る表示崩れを避ける。
- 実レポート再生成では当日のデータに依存するため、特定銘柄名はテストにも実装にもハードコードしない。
