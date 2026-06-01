# theme heat score weighting

## Goal

`external_confirmation_count` を実際の theme ranking に反映し、`S&P Kensho` を含むテーマへ小さな追加加点を与える `theme heat score` を導入する。実装後、米国株スクリーニングを一度実行して結果を確認する。

## Scope

- `src/core/theme-taxonomy.js` に theme heat score を追加する
- `scripts/screener/run-fundamental-screening.mjs` の `Phase2 テーマランキング` に heat score を表示する
- 関連テストを更新する
- スクリーニングを一度実行し、生成結果を確認する

## Out of Scope

- external provider からの live fetch 追加
- 個別銘柄 ranking への重み反映
- Phase3 / Phase4 hierarchy のスコアリング変更
- テーマ別 ETF proxy の導入

## Files

| Path | Action | Notes |
| --- | --- | --- |
| `docs/exec-plans/active/theme-heat-score-weighting_20260601_1644.md` | CREATE | 本計画 |
| `src/core/theme-taxonomy.js` | MODIFY | theme heat score 算出と ranking 順序更新 |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | Phase2 テーマランキングへ heat score 表示追加 |
| `tests/theme-taxonomy.test.js` | MODIFY | summarizeThemes の heat score 検証 |
| `tests/daily-screener-report.test.js` | MODIFY | markdown 表示の heat score 検証 |
| `tests/fundamental-screener.test.js` | MODIFY候補 | theme ranking 順序や score を見る必要があれば更新 |

## Risks / Watchpoints

- 加点を強くしすぎると既存の平均総合点ベース ranking を壊す
- `S&P Kensho` ボーナスは控えめにしないと theme 定義の有無だけで過度に順位が動く
- 実行確認は外部データ依存なので、失敗時はコード問題と外部要因を切り分けて報告する

## Test / Validation Strategy

- `tests/theme-taxonomy.test.js` で heat score と Kensho ボーナスを検証する
- `tests/daily-screener-report.test.js` で Phase2 テーマランキングに新列が出ることを確認する
- スクリプトを一度実行して、生成された report 内に heat score が出ることを確認する

## Validation Commands

```bash
node --test tests/theme-taxonomy.test.js
node --test tests/daily-screener-report.test.js
node scripts/screener/run-fundamental-screening.mjs
```

## Task Breakdown

- [ ] heat score の最小式を決めて実装する
- [ ] Kensho provider を含むテーマへ小さな追加加点を入れる
- [ ] Phase2 テーマランキングの表示を更新する
- [ ] 関連テストを更新して通す
- [ ] スクリーニングを一度実行して結果を確認する
- [ ] 計画を completed へ移し、commit / push する
