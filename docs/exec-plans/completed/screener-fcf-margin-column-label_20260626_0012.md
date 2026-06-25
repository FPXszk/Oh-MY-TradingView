# Exec-plan: screener-fcf-margin-column-label_20260626_0012

## Goal

スクリーナーのランキング表で、現在 `FCF` と表示されているFCFマージン列を `FCFマージン` と明示する。

## Files

| File | Action | Purpose |
|---|---|---|
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | 生成される全ランキング表と指標説明の列名を変更 |
| `docs/reports/screener/TEMPLATE.md` | MODIFY | 手編集用テンプレートの列名を同期 |
| `tests/daily-screener-report.test.js` | MODIFY | `FCFマージン` 表示を固定 |
| 本exec-plan | MOVE | 完了時にcompletedへ移動 |

## Scope

- 表示名のみ変更する。
- `fcfMargin` の計算、採点、補完ロジックは変更しない。
- US/JPで共通利用されるランキング表へ適用する。

## Steps

- [x] レポート生成部の `FCF` ヘッダーを `FCFマージン` に変更する。
- [x] 指標説明とテンプレートを同じ表記へ変更する。
- [x] レポートテストを更新し、focused/full testsを実行する。
- [x] 実workflowを実行し、公開レポートで列名を確認する。
- [x] 計画をcompletedへ移動し、commit/pushする。

## Validation

```powershell
node --test tests/daily-screener-report.test.js
npm run test:unit
gh workflow run daily-screener.yml --ref main
```

## Result

- 計算・採点ロジックは変更せず、ランキング表の列名を `FCFマージン` に変更した。
- 指標説明を `FCFマージン | フリーキャッシュフロー ÷ 売上` に統一した。
- US/JP両方の表生成とテンプレートを更新した。
- focused tests 9件、`npm run test:unit` 1001件が成功した。
- workflow run `28180455577` が全step成功し、公開レポートで `FCFマージン` 表示を確認した。
