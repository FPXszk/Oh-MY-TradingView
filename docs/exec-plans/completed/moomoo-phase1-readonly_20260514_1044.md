# moomoo phase1 readonly plan

## Goal

Oh-MY-TradingView の既存 MCP サーバーへ moomoo OpenAPI の read-only Phase 1 を統合する。対象は `moomoo_health_check`、`moomoo_snapshot`、`moomoo_kline_history`、`moomoo_stock_filter`、`moomoo_plate_list`、`moomoo_plate_stocks` とし、Node 側 MCP tool から Python adapter を呼んで OpenD 接続を共通化する。

## Files In Scope

- Create: `python/moomoo_adapter.py`
- Create: `src/core/moomoo.js`
- Create: `src/tools/moomoo.js`
- Create: `tests/moomoo.test.js`
- Modify: `src/server.js`
- Modify: `package.json`
- Create: `docs/exec-plans/active/moomoo-phase1-readonly_20260514_1044.md`
- Move on completion: `docs/exec-plans/active/moomoo-phase1-readonly_20260514_1044.md` -> `docs/exec-plans/completed/moomoo-phase1-readonly_20260514_1044.md`

## Scope

- Node MCP server に moomoo read-only tools を追加する
- Python 側に OpenD 接続を集約した JSON adapter を作る
- host/port/security firm を環境変数で受ける
- quote 系の read-only API を Node から呼べるようにする
- unit test で Node 側の validation / exec wrapper / tool registration を確認する

## Out Of Scope

- paper trading / webhook / account read / order cancellation
- push subscription の常駐監視
- OpenD 自動起動や Windows portproxy 自動設定
- `REAL` 口座や live order に関する処理

## Assumptions

- Phase 1 は独立 Python MCP server ではなく、既存 `src/server.js` に `registerMoomooTools(server)` を追加する
- Python 実行は `python3 python/moomoo_adapter.py ...` 形式を基本とする
- `moomoo-api` はユーザー環境に導入済みで、未導入時は明確なエラーを返す

## Impact

- MCP サーバーの tool surface に moomoo read-only namespace が追加される
- Python runtime 依存が増えるが、read-only quote 機能に限定される
- 既存 TradingView / market / screener tools には直接変更を加えない

## Test Strategy

- RED/GREEN:
  - Node core の入力 validation、Python 実行引数、JSON 正規化、エラー文言を unit test で確認する
  - tool registration 名と handler 応答形式を unit test で確認する
- Python adapter 自体は静的 lint ではなく、引数分岐と JSON 出力の単純さを優先する

## Validation

- `node --test tests/moomoo.test.js`
- `npm run test:unit`
- `git status --short`

## Risks / Notes

- ローカル環境に `moomoo-api` が無い場合、実行時エラーになる
- OpenD 接続失敗時に Python stderr を十分に Node 側へ返さないと診断しづらい
- `get_stock_filter()` の filter schema を広げすぎると Phase 1 の範囲を超えるため、初回はシンプルな条件だけに絞る
- 既存ワークツリーに `.codex/config.toml` の未コミット変更があるため混在させない

## Tasks

- [ ] 既存 MCP tool / core / test パターンに沿った moomoo 実装方針を確定する
- [ ] Python adapter を作成し、health / snapshot / kline / stock filter / plate API を JSON で返す
- [ ] Node core wrapper を作成し、execFile ベースで Python adapter を呼ぶ
- [ ] MCP tool 登録を追加し、`src/server.js` に統合する
- [ ] unit test を追加して registration / validation / error handling を確認する
- [ ] テスト実行と `git status` 確認を行う
