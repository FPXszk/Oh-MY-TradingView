# Exec-plan: verify-sec-edgar-daily-screener-workflow_20260625_2359

## Goal

`Daily Fundamental Screener` を実際に実行し、SEC EDGAR自動連携、レポート生成、mainへのpublishが正常に完了することを確認する。問題があれば最小修正し、再実行で解消を確認する。

## Files

| File | Action | Purpose |
|---|---|---|
| `docs/reports/screener/daily-ranking.md` | VERIFY | SEC補完結果とN/Aの妥当性確認 |
| `docs/reports/screener/daily-ranking-run.json` | VERIFY | 実行ID・SHA・生成時刻確認 |
| `.github/workflows/daily-screener.yml` | MODIFY if needed | workflow起因の問題のみ修正 |
| `src/core/sec-edgar.js` | MODIFY if needed | SEC取得・期間比較問題のみ修正 |
| `src/core/fundamental-screener.js` | MODIFY if needed | 補完統合問題のみ修正 |
| related tests | MODIFY if needed | 再現テスト追加 |
| 本exec-plan | MOVE | 完了時にcompletedへ移動 |

## Steps

- [ ] workflowを手動dispatchし、run IDと実行SHAを確認する。
- [ ] 完了まで監視し、各stepとログを確認する。
- [ ] artifactまたはpublish済みレポートでSEC補完件数・黒字転換・残存N/Aを確認する。
- [ ] 問題があれば再現テストを追加して最小修正する。
- [ ] focused/full testsを実行し、修正版workflowを再実行する。
- [ ] 計画をcompletedへ移動し、必要な変更をcommit/pushする。

## Success Criteria

- workflowがsuccessで完了する。
- `SEC_USER_AGENT` 欠損・SEC 403/429・Node例外がない。
- レポートが生成され、mainへpublishされる。
- SECで同期間の赤字→黒字が確認できる銘柄だけ黒字転換になる。
- MRVL/COHRのような黒字→黒字銘柄を誤って黒字転換にしない。

## Validation

```powershell
gh workflow run daily-screener.yml --ref main
gh run watch <run-id> --exit-status
gh run view <run-id> --log
npm run test:unit
```
