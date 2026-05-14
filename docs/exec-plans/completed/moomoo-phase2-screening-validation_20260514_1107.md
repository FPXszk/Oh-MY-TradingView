# moomoo phase2 screening validation plan

## Goal

moomoo OpenAPI の Phase 2 として、`get_stock_filter()` / `get_plate_list()` / `get_plate_stock()` / `request_history_kline()` を使い、TradingView 候補を repo 側で再確認できる screening / validation 導線を追加する。完了基準は「TradingView 候補を moomoo データで再確認できること」とし、OpenD 実機接続まで含めて確認する。

## Files In Scope

- Modify: `python/moomoo_adapter.py`
- Modify: `src/core/moomoo.js`
- Modify: `src/tools/moomoo.js`
- Modify: `tests/moomoo.test.js`
- Modify: `docs/strategy/moomoo_integration_analysis.md`
- Create: `docs/strategy/moomoo_phase2_screening_validation.md`
- Create: `docs/exec-plans/active/moomoo-phase2-screening-validation_20260514_1107.md`
- Move on completion: `docs/exec-plans/active/moomoo-phase2-screening-validation_20260514_1107.md` -> `docs/exec-plans/completed/moomoo-phase2-screening-validation_20260514_1107.md`

## Scope

- `get_stock_filter()` の利用可能 field / filter 種別を adapter 経由で棚卸しできるようにする
- 現行 repo スクリーナー指標と moomoo 側 field の対応表を docs に残す
- plate 構成銘柄から repo 側で breadth 指標を計算する集約ロジックを追加する
- Pine / backtest 確認向けに moomoo OHLC と既存候補の比較結果を返す validation 導線を追加する
- 実機 OpenD へ接続し、TradingView 候補を moomoo データで再確認できることを確認する

## Out Of Scope

- `place_order()` を使う paper / live 発注
- push subscription 常駐監視
- TradingView 側バックテスト engine 自体の置き換え
- moomoo 単独で完結する完全独立 screening mode

## Assumptions

- Phase 1 と同じく、既存 Node MCP server から Python adapter を `execFile` で呼ぶ
- 実機 OpenD は既に起動済みで、WSL から接続可能である
- Phase 2 では「完全代替」ではなく「TradingView 候補の再確認 / 補完」を優先する

## Impact

- moomoo tool surface に screening / validation 用の追加導線が増える
- repo 側で plate breadth と candidate 再採点ロジックを持つため、TradingView 依存を少し下げられる
- docs に field coverage と指標対応表が残り、今後の screening 拡張判断がしやすくなる

## No Overlap Check

- `docs/exec-plans/active/` は確認時点で空であり、競合する in-flight plan は無い

## Test Strategy

- RED/GREEN:
  - Node core の入力 validation、adapter 実行 payload、phase2 tool registration を unit test で拡張する
  - breadth 集計と OHLC 比較の整形ロジックを unit test で固定する
- 実機 validation:
  - OpenD 実接続で field inventory、plate breadth、OHLC 比較を実行し、TradingView 候補の再確認材料になることを確認する

## Validation

- `node --test tests/moomoo.test.js`
- `npm run test:unit`
- 実機で phase2 moomoo tool / CLI 呼び出し
- `git status --short`

## Risks / Notes

- `get_stock_filter()` の field availability は market / entitlement 依存の可能性があり、US で見える field が他市場で必ずしも一致しない
- plate breadth は constituent 数が多いと snapshot / kline 回数が増えるため、初回は対象 plate 数や取得本数を絞る必要がある
- OHLC 比較は adjustment や session 差で完全一致しない可能性があり、差分傾向の説明を docs に残す必要がある
- repo 側再採点は既存 fundamental screener の proxy 的な再確認に留め、過剰な新スコア設計は避ける

## Tasks

- [ ] Phase 1 handoff と現行 screener 指標を元に、Phase 2 で必要な field inventory / breadth / OHLC 比較の対象を確定する
- [ ] Python adapter と Node core に Phase 2 用の read-only screening / validation 呼び出しを追加する
- [ ] MCP tools と unit test を拡張し、payload / 集計 / 返却 shape を固定する
- [ ] moomoo field 対応表と validation 結果を docs に記録する
- [ ] OpenD 実機で候補再確認フローを実行し、完了基準を満たすことを確認する
