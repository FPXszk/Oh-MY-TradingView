# Exec-plan: edinet-doc-match-live-investigation_20260612_0107

## 概要

目的: `Daily Fundamental Screener Japan` で `EDINET` 認証は通る状態になったので、次に `書類一致 0件` の直接原因を live で特定し、`secCode` / `documents.json` / 書類フィルタのどこで落ちているかを明確にする。

今回の成功条件:

- live run で `書類一致 0件` がどの段階で発生しているか説明できる
- `secCode` 一致 / 書類種別一致 / `csvFlag` 一致の各段階が log か report metadata で確認できる
- 必要なら最小修正を入れて `matchedFilings` を 0 から動かす
- 関連 test を更新し、workflow を再実行して結果を確認する

## 変更・作成するファイル

| ファイル | 種別 | 役割 |
|---|---|---|
| `docs/exec-plans/active/edinet-doc-match-live-investigation_20260612_0107.md` | CREATE | 本計画 |
| `src/core/edinet.js` | MODIFY | `EDINET` 書類マッチ段階の診断情報追加、必要なら最小修正 |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | live 切り分け用の要約ログを最小追加 |
| `tests/fundamental-screener.test.js` | MODIFY | 診断 or matching 修正の再現テストを追加 |
| `tests/daily-screener-report.test.js` | MODIFY候補 | report 文言に影響がある場合のみ更新 |

## 影響範囲

- `src/core/edinet.js`
  - `documents.json` からの symbol matching
  - `docDescription` / `csvFlag` による候補絞り込み
  - `meta.matchedFilings` まわりの診断
- `scripts/screener/run-fundamental-screening.mjs`
  - workflow log の `EDINET` 要約
- `docs/reports/screener/daily-ranking-jp.md`
  - live run により `EDINET` 状態が変わる可能性がある

## スコープ

やること:

- live run で `書類一致 0件` の落ち場所を診断する
- 必要なら最小修正と test 追加
- workflow 再実行で結果確認

やらないこと:

- `EDINET` 指標抽出ロジック全体の作り直し
- 日本株スコアリング方針や report レイアウトの拡張

## 実施ステップ

- [ ] `secCode` 一致 / 書類種別一致 / `csvFlag` 一致の診断を `EDINET` meta と log に追加する
- [ ] `node --test` で関連 test を通す
- [ ] `Daily Fundamental Screener Japan` を再実行し、live log で落ち段を確認する
- [ ] 原因が matcher / filter / lookback のいずれかなら最小修正を実装する
- [ ] test を更新して再実行する
- [ ] workflow を再実行し、`matchedFilings` が改善するか確認する

## テスト戦略

- RED
  - 診断情報 or matching 修正の再現ケースを追加
- GREEN
  - 修正後に `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js` を通す
- LIVE
  - workflow run で `EDINET` 状態の変化を確認する

## 検証コマンド

- `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js`
- `gh workflow run "Daily Fundamental Screener Japan" --ref main`
- `gh run watch <run-id>`
- `gh run view <run-id> --log`

## リスク・注意点

- 認証解消後に初めて実データ上の別問題が露出するため、原因が一段では終わらない可能性がある
- 診断ログは API キーや URL 全体を出さない
- live run により publish commit が増える

## 競合確認

- `docs/exec-plans/active/` に他の日本株スクリーナー計画はあるが、今回は `EDINET` 書類一致の live 調査に限定しており直接競合しない
