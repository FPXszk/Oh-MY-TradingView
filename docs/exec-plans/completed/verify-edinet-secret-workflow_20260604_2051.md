# Exec-plan: verify-edinet-secret-workflow_20260604_2051

## 概要

目的: GitHub Actions に登録した `EDINET_API_KEY` が日本株スクリーナー workflow で実際に有効化されるか確認する。今回は実装変更ではなく、**workflow 実行と結果確認** をゴールにする。

## 変更・作成するファイル

| ファイル | 種別 | 役割 |
|---|---|---|
| `docs/exec-plans/active/verify-edinet-secret-workflow_20260604_2051.md` | CREATE | 本検証計画 |

## 影響範囲

- `.github/workflows/daily-screener-japan.yml`
  - 既存の `EDINET_API_KEY` secret 配線が実行時に効くかを確認する
- `docs/reports/screener/daily-ranking-jp.md`
  - workflow 完走後に source 状態と Rule of 40 参考表示を確認する
- `docs/reports/screener/daily-ranking-jp-run.json`
  - 実行 metadata 更新の確認対象

## 実施ステップ

- [ ] 計画を追加して `main` にコミット / push する
- [ ] `Daily Fundamental Screener Japan` workflow を `main` で起動する
- [ ] run 結果、publish 後の report、metadata を確認する
- [ ] `EDINET: disabled (no API key)` が消え、補完が active になっているか判定する
- [ ] 計画を `completed/` へ移して記録を閉じる

## 検証コマンド

- `gh workflow run "Daily Fundamental Screener Japan" --ref main`
- `gh run watch <run-id>`
- `gh run view <run-id>`
- `rg -n "EDINET|Rule of 40|データソース状況" docs/reports/screener/daily-ranking-jp.md`

## リスク・注意点

- secret 名が一致していても、API キーの権限や EDINET 側の応答次第で補完件数は 0 の可能性がある
- workflow は成功しても、`EDINET active` ではなく `no_extractable_metrics` になる可能性がある
- report publish により `main` へ docs commit が追加される可能性がある
