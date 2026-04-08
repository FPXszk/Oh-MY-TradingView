# followup-launch-port-and-stream-switching_20260408_2104

## Problem / approach

前回実装（`efcbe60`）のフォローアップとして、影響範囲を 2 点に限定して修正する。

1. **`tv_launch` の custom port が後続 CDP 利用側へ伝播しない**
   - feature 削除ではなく、custom port を安全に保持・再利用する方向で直す
   - `src/core/launch.js` と `src/connection.js` の責務を崩さず、同一セッション内で launch 後の port が後続 CDP tool に使われるようにする
   - `src/tools/launch.js` の入出力説明も必要に応じて揃える

2. **`streamPriceTicks()` が毎 tick ごとに symbol を再切替している**
   - `symbol` 指定時は stream 開始前に 1 回だけ切替し、その後は symbol 未指定の価格取得だけを行う
   - `src/core/stream.js` で制御し、`src/core/price.js` の単発取得 API 互換性は維持する

## Files to modify

- `src/tools/launch.js`
- `src/core/launch.js`
- `src/connection.js`
- `src/core/stream.js`
- `src/core/price.js`
- `tests/launch.test.js`
- `tests/connection.test.js`
- `tests/stream.test.js`
- `tests/price.test.js`
- `README.md`（必要時のみ）

## Out of scope

- `tv_launch` 以外の CLI / MCP UX 再設計
- CDP host 解決ロジック全体の見直し
- 無限ストリーミング化や配信方式の変更
- 今回の 2 件と無関係なリファクタ

## Risks / watchpoints

- port 保持方法次第でテスト間汚染や state 残留が起きないよう注意する
- launch 後の port 伝播が既存 `TV_CDP_HOST` / `TV_CDP_PORT` 優先順位を壊さないこと
- stream 修正後も symbol 指定時の初回 settle 待ちが不足しないこと
- `getCurrentPrice()` の既存単発挙動を壊さないこと

## Validation

- `npm test`
- `npm run test:e2e`
- `npm run test:all`
- `git --no-pager diff --check`

### RED / GREEN / REFACTOR

- **RED**
  - custom launch port 後に endpoint 解決が 9222 のままになる失敗テストを追加
  - stream が tick ごとに symbol 切替を呼ぶことを検出する失敗テストを追加
- **GREEN**
  - 最小修正で port 伝播と単回 symbol 切替を実装し、追加テストを通す
- **REFACTOR**
  - endpoint 解決責務と stream 制御責務を整理し、重複やテストセットアップを簡潔化する

## Implementation steps

- [ ] `tests/connection.test.js` / `tests/launch.test.js` に custom launch port 伝播の RED テストを追加する
- [ ] `tests/stream.test.js` と必要に応じて `tests/price.test.js` に stream 中の単回 symbol 切替 RED テストを追加する
- [ ] `src/core/launch.js` に launch port を後続利用可能にする最小限の伝播処理を追加する
- [ ] `src/connection.js` の endpoint 解決を更新し、launch 済み custom port を同一セッション内で優先利用できるようにする
- [ ] `src/tools/launch.js` の説明や返り値を必要に応じて整える
- [ ] `src/core/stream.js` を更新し、loop 前に 1 回だけ symbol 切替するよう変更する
- [ ] `src/core/price.js` の既存単発取得互換性を維持したまま stream から安全に再利用できるようにする
- [ ] 必要なら `README.md` の `tv_launch` / `tv_stream_price` 説明を更新する
- [ ] `npm test` を実行する
- [ ] `npm run test:e2e` を実行する
- [ ] `npm run test:all` を実行する
- [ ] `git --no-pager diff --check` を実行する
