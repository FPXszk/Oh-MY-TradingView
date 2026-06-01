# external theme reference us

## Goal

米国株 theme taxonomy に対して、`Morningstar / MSCI / S&P Kensho / Nasdaq / moomoo` の外部参照を紐づける `external-theme-reference-us.json` を追加し、既存の theme 集計・レポートに `external confirmation` を載せる。

## Scope

- `config/screener/external-theme-reference-us.json` を新規作成する
- `src/core/theme-taxonomy.js` で external reference を読み込み、分類結果とテーマ集計に反映する
- `scripts/screener/run-fundamental-screening.mjs` の `Phase2 テーマランキング` に external confirmation 情報を表示する
- 必要なテストを追加・更新する

## Out of Scope

- external provider からの live fetch 実装
- theme heat score の本格導入
- Morningstar / MSCI / S&P Kensho / Nasdaq / moomoo の全テーマ網羅
- Phase3 / Phase4 の表示拡張

## Files

| Path | Action | Notes |
| --- | --- | --- |
| `docs/exec-plans/active/external-theme-reference-us_20260601_1626.md` | CREATE | 本計画 |
| `config/screener/external-theme-reference-us.json` | CREATE | 外部テーマ参照マスタ |
| `src/core/theme-taxonomy.js` | MODIFY | external reference 読み込みと集計反映 |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | Phase2 テーマランキングへ表示追加 |
| `tests/theme-taxonomy.test.js` | MODIFY | classify / summarize の external confirmation 検証 |
| `tests/daily-screener-report.test.js` | MODIFY | markdown 出力の external confirmation 検証 |

## Risks / Watchpoints

- repo theme label ではなく `theme id` ベースで紐づけないと将来の表示名変更に弱い
- `Unclassified` や外部参照未定義テーマで列を壊さないようにする
- いきなり個別銘柄表示まで広げると変更範囲が大きくなるため、今回は `theme ranking` に限定する

## Test / Validation Strategy

- `tests/theme-taxonomy.test.js` で `classifyUsTheme` と `summarizeThemes` の external confirmation を検証する
- `tests/daily-screener-report.test.js` で `Phase2 テーマランキング` テーブルに列が追加されることを確認する
- 必要最小限の対象テストのみ実行する

## Validation Commands

```bash
node --test tests/theme-taxonomy.test.js
node --test tests/daily-screener-report.test.js
git diff -- config/screener/external-theme-reference-us.json src/core/theme-taxonomy.js scripts/screener/run-fundamental-screening.mjs tests/theme-taxonomy.test.js tests/daily-screener-report.test.js
```

## Task Breakdown

- [ ] external theme reference 用の JSON マスタを追加する
- [ ] taxonomy 分類結果へ external confirmation を付与する
- [ ] theme 集計結果へ confirmation count / provider 名を載せる
- [ ] markdown レポートの Phase2 テーマランキングへ列を追加する
- [ ] 関連テストを更新して実行する
- [ ] 計画を completed へ移し、commit / push する
