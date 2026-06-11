# Exec-plan: edinet-doc-match-live-debug_20260611_1422

## 概要

目的: `Daily Fundamental Screener Japan` で `EDINET_API_KEY` は有効なのに `書類一致 0件` となっている原因を live で特定し、`secCode` または `documents.json` 取得ロジックの最小修正で `EDINET` 書類マッチングを回復させる。

今回の成功条件:

- run `26950254326` の結果と現行コードを突き合わせ、`書類一致 0件` の直接原因を説明できる
- 必要最小限のコード修正で `matchedFilings` が 0 から動く状態にする
- unit test で `secCode` / document list matching の再発を防ぐ
- 可能なら GitHub Actions `Daily Fundamental Screener Japan` を再実行し、publish 後 report で `書類一致` が増えることを確認する

## 変更・作成するファイル

| ファイル | 種別 | 役割 |
|---|---|---|
| `docs/exec-plans/active/edinet-doc-match-live-debug_20260611_1422.md` | CREATE | 本計画 |
| `src/core/edinet.js` | MODIFY | `secCode` 突き合わせ / `documents.json` 取得・選別ロジックの診断と修正 |
| `tests/fundamental-screener.test.js` | MODIFY | `EDINET` 書類マッチングの unit test を追加・更新 |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY候補 | 必要なら診断に必要な report 表示を最小追加 |
| `tests/daily-screener-report.test.js` | MODIFY候補 | report 表示を増やした場合のみ更新 |

## 影響範囲

- `src/core/edinet.js`
  - 日本株 `symbol` と `EDINET secCode` の対応判定
  - lookback 中の `documents.json` の絞り込み順序
  - `matchedFilings` / `supplementedRows` の metadata
- `tests/fundamental-screener.test.js`
  - 既存の `EDINET supplement` 経路に、マッチング失敗→修正後成功のケースを固定
- `docs/reports/screener/daily-ranking-jp.md`
  - live run を回した場合、`EDINET` source summary の値が変わる可能性がある

## スコープ

やること:

- `書類一致 0件` の原因を `secCode` 側か `documents.json` 側か live に切り分ける
- 必要最小限の実装修正とテスト追加
- 必要なら workflow 再実行で end-to-end 確認

やらないこと:

- `EDINET_API_KEY` secret 自体の再設定
- `EDINET` 指標抽出ロジック全体の作り直し
- 日本株スコアリング方針や report レイアウトの拡張

## 実施ステップ

- [ ] run `26950254326` と現行 report / metadata / code を確認し、失敗地点を仮説化する
- [ ] `src/core/edinet.js` の `secCode` matching と document list filtering を live data で検証する
- [ ] 原因に対する最小修正を `src/core/edinet.js` に実装する
- [ ] `tests/fundamental-screener.test.js` に再現テストを追加して GREEN にする
- [ ] 必要なら report 診断表示を最小追加し、関連 test を更新する
- [ ] ローカル test を実行して回帰がないことを確認する
- [ ] GitHub Actions `Daily Fundamental Screener Japan` を再実行し、publish 後の report を確認する

## テスト戦略

- RED
  - `documents.json` に対象書類が存在しても現行 `secCode` 判定だと `matchedFilings` が 0 になるケースを追加する
- GREEN
  - 修正後に対象銘柄へ書類が紐づき、`matchedFilings` が増えることを確認する
- REFACTOR
  - 診断情報が必要最小限を超える場合のみ helper を分離する

## 検証コマンド

- `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js`
- `node scripts/screener/run-fundamental-screening.mjs --market japan`
- `gh run view 26950254326`
- `gh workflow run "Daily Fundamental Screener Japan" --ref main`
- `gh run watch <run-id>`

## リスク・注意点

- `EDINET` API の document list は日次・書類種別・コード体系のズレがあり、原因が単一とは限らない
- local shell に `EDINET_API_KEY` がなくても、GitHub Actions 上では secret が有効なため、live 確認は workflow 側が基準になる
- live run によって `docs/reports/screener/daily-ranking-jp.md` と run metadata の publish commit が追加される可能性がある

## 競合確認

- `docs/exec-plans/active/` に日本株スクリーナー系の計画は残っているが、今回は `EDINET` の document matching 不具合に限定しており、直接競合はない
