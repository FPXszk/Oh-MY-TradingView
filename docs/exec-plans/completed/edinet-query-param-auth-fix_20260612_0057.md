# Exec-plan: edinet-query-param-auth-fix_20260612_0057

## 概要

目的: `src/core/edinet.js` で `EDINET API` の `Subscription-Key` を HTTP ヘッダーではなく URL クエリパラメータとして送るよう修正し、`Daily Fundamental Screener Japan` の live 実行で 401 認証失敗が解消するか確認する。

今回の成功条件:

- `EDINET API` を呼ぶ全箇所で `Subscription-Key` が URL クエリへ付与される
- API キーがログへ出ない
- 既存の `invalid_api_key` / `api_error` 判定は維持される
- 関連 unit test が通る
- `Daily Fundamental Screener Japan` を再実行し、`EDINET` 状態が改善したか live で確認できる

## 変更・作成するファイル

| ファイル | 種別 | 役割 |
|---|---|---|
| `docs/exec-plans/active/edinet-query-param-auth-fix_20260612_0057.md` | CREATE | 本計画 |
| `src/core/edinet.js` | MODIFY | `Subscription-Key` 送信方式をヘッダーからクエリパラメータへ変更 |
| `tests/fundamental-screener.test.js` | MODIFY | `EDINET` リクエスト URL と認証エラー判定をテストで固定 |
| `tests/daily-screener-report.test.js` | MODIFY候補 | report 文言に影響が出る場合のみ更新 |

## 影響範囲

- `src/core/edinet.js`
  - `documents.json` と書類ダウンロード API の URL 生成
  - 認証失敗時の fallback metadata
- `tests/fundamental-screener.test.js`
  - `Subscription-Key` の送信方式が回帰しないことを固定
- `docs/reports/screener/daily-ranking-jp.md`
  - live run により `EDINET` source status が変わる可能性がある

## スコープ

やること:

- `Subscription-Key` をクエリパラメータ送信へ統一
- ヘッダー送信を削除
- 認証失敗ハンドリングとテストを維持
- workflow 再実行で live 検証

やらないこと:

- `EDINET` 書類マッチングロジック自体の再設計
- report レイアウトの拡張
- `EDINET_API_KEY` secret の手動更新

## 実施ステップ

- [ ] `src/core/edinet.js` の URL 生成と `fetch` 呼び出しを確認し、`Subscription-Key` をクエリパラメータ方式へ変更する
- [ ] `EDINET` API を呼ぶ全箇所でヘッダー方式が残っていないことを確認する
- [ ] `tests/fundamental-screener.test.js` に URL クエリ方式の再現テストを追加・更新する
- [ ] 必要なら report まわりの test を更新する
- [ ] `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js` を実行する
- [ ] `Daily Fundamental Screener Japan` workflow を再実行し、publish 後 report と log を確認する

## テスト戦略

- RED
  - `Subscription-Key` がヘッダーではなくクエリに入ることを検証するテストを追加
- GREEN
  - 実装修正後に関連 test を通す
- LIVE
  - workflow 再実行で 401 が消えるか確認

## 検証コマンド

- `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js`
- `gh workflow run "Daily Fundamental Screener Japan" --ref main`
- `gh run watch <run-id>`
- `gh run view <run-id> --log`

## リスク・注意点

- 仮説どおりでも、認証が通った後に初めて `secCode` / `documents.json` の別問題が露出する可能性がある
- URL 全体をそのままログに出すと secret 漏えいになるため、URL 検証は test 内で query key の存在確認に留める
- live run により `docs/reports/screener/daily-ranking-jp.md` と metadata の publish commit が追加される

## 競合確認

- `docs/exec-plans/active/` に日本株スクリーナー関連の既存計画はあるが、今回は `EDINET` 認証方式の修正に限定しており直接競合しない
