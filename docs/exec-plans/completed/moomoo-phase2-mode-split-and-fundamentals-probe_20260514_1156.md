# moomoo phase2 mode split and fundamentals probe

## Problem

Phase 2 の validation は現在 `moomoo_screening_validate` / `moomoo_ohlc_compare` の中で「moomoo-only の再確認」と「外部系列との benchmark 比較」が混在している。加えて、Yahoo 補完を減らせるか判断するための `SUM_OF_BUSINESS_GROWTH` / `DEBT_ASSET_RATE` / `PCF_TTM` の実測比較経路が未整備である。

## Goal

- validation を **moomoo-only mode** と **benchmark mode** に分離する
- Yahoo 補完候補 (`revenueGrowth`, `debt_to_equity`, `P/FCF`) を moomoo 近似値でどこまで置き換えられるか、実測比較できるようにする
- ここでの完了条件は「候補再確認を external benchmark なしでも回せること」と「近似置換の可否を docs に根拠付きで残すこと」

## Scope

### In scope

- `src/core/moomoo.js` の screening / validation orchestration を mode 分離する
- benchmark path を明示化し、初期実装では既存 Yahoo 比較を benchmark provider として保持する
- 個別銘柄ごとに `SUM_OF_BUSINESS_GROWTH` / `DEBT_ASSET_RATE` / `PCF_TTM` を観測し、Yahoo / repo 指標との比較結果を返す read-only probe を追加する
- tests と docs を更新し、OpenD 実機で live validation する

### Out of scope

- `market-intel` 全面置換
- TradingView raw bar export 取り込みの新規実装
- beta / EV/EBITDA / FCF margin の完全代替
- Phase 2 と無関係な refactor

## Files

- `python/moomoo_adapter.py`
  - 必要なら per-symbol fundamentals probe 用の read-only command を追加
- `src/core/moomoo.js`
  - mode 分離、benchmark provider 明示、fundamentals probe orchestration を追加
- `src/tools/moomoo.js`
  - mode / provider / probe 用の MCP tool schema と entrypoint を追加・更新
- `src/core/fundamental-screener.js`
  - probe 結果を将来どこへ差し込むかの接続点を確認し、今回の scope で反映するかを明示する
- `tests/moomoo.test.js`
  - mode 分離と probe response の回帰テストを追加
- `tests/fundamental-screener.test.js`
  - `fundamental-screener` に影響を入れる場合のみ、近似指標の扱いを追加検証する
- `docs/strategy/moomoo_phase2_screening_validation.md`
  - mode 別の使い分けと live probe 結果を追記
- `docs/strategy/moomoo_integration_analysis.md`
  - Yahoo 代替可否の現時点結論を更新
- `src/server.js`
  - tool description に差分が出る場合のみ更新

## Implementation steps

- [ ] benchmark の初期方針を固定する
  - 推奨: 初期 benchmark provider は Yahoo のまま残し、mode 分離を先に完了する
- [ ] moomoo 近似指標の取得経路を追加する
  - adapter / core 間の command 名、payload、response schema を先に固定する
  - `SUM_OF_BUSINESS_GROWTH`
  - `DEBT_ASSET_RATE`
  - `PCF_TTM`
- [ ] validation を二系統に分離する
  - moomoo-only: filter + breadth + proxy score
  - benchmark: moomoo + external series comparison
- [ ] tool schema / response shape を更新する
  - 既存 caller を壊さない default / field naming を維持する
- [ ] `fundamental-screener` への反映有無を決める
  - 今回は原則「個別検証まで」を scope とし、即置換する場合だけ `src/core/fundamental-screener.js` を触る
- [ ] tests を先に拡張してから実装する
- [ ] OpenD 実機で mode 別 validation と fundamentals probe を実行し、docs に結果を残す

## Test strategy

- RED: `tests/moomoo.test.js` に mode 別 output と probe result shape の失敗ケースを追加
- GREEN: core / adapter / tools を最小差分で実装
- REFACTOR: response naming と docs を揃える

## Validation

- `node --test tests/moomoo.test.js`
- `npm test`
- OpenD 実機で `moomoo_screening_validate` の moomoo-only / benchmark 両方を実行
- OpenD 実機で 3 指標の probe を実行し、結果を docs に記録

## Risks

- mode 分離で既存の response shape を崩すと、現在の validation 利用者が影響を受ける
- per-symbol probe は adapter 側の追加実装が必要な可能性がある
- `SUM_OF_BUSINESS_GROWTH` / `DEBT_ASSET_RATE` / `PCF_TTM` は意味が近いだけで同値ではないため、置換は docs で明示的に制約を書く必要がある
- field availability は market / entitlement 依存の可能性がある

## Overlap check

- `docs/exec-plans/active/` は確認時点で空で、競合する active plan は無かった
