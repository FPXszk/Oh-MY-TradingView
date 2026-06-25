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

- [ ] レポート生成部の `FCF` ヘッダーを `FCFマージン` に変更する。
- [ ] 指標説明とテンプレートを同じ表記へ変更する。
- [ ] レポートテストを更新し、focused/full testsを実行する。
- [ ] 実workflowを実行し、公開レポートで列名を確認する。
- [ ] 計画をcompletedへ移動し、commit/pushする。

## Validation

```powershell
node --test tests/daily-screener-report.test.js
npm run test:unit
gh workflow run daily-screener.yml --ref main
```
