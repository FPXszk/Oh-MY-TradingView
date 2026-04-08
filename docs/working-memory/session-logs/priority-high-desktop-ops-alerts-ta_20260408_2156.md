# priority-high-desktop-ops-alerts-ta_20260408_2156

## 実施内容

- TradingView Desktop 向けの workspace 操作を追加
  - `tv_watchlist_list`
  - `tv_watchlist_add`
  - `tv_watchlist_remove`
  - `tv_pane_list`
  - `tv_pane_focus`
  - `tv_tab_list`
  - `tv_tab_switch`
  - `tv_layout_list`
  - `tv_layout_apply`
- TradingView Desktop 向けの alert 管理を追加
  - `tv_alert_list`
  - `tv_alert_create_price`
  - `tv_alert_delete`
- non-CDP の market intelligence を拡張
  - `market_ta_summary`
  - `market_ta_rank`
- CLI 側に `workspace` / `alert` / `market ta-*` を追加
- README / server instructions / docs routing を更新

## 実装メモ

- workspace / alert は `src/core/workspace.js` と `src/core/alerts.js` に集約した
- watchlist removal は exchange-qualified symbol をそのまま remove するように補正した
- alert deletion は numeric id を保持したまま downstream API へ渡すようにした
- `tab` surface は TradingView の top-level tab ではなく、**current layout 内の chart slot** を対象にする contract へ明示化した
- TA は Yahoo Finance の daily close から `RSI(14)` / `SMA20` / `SMA50` / 前日比を計算する
- TA 計算では zero-denominator と all-null close series を failure / unavailable として扱うようにした

## テスト

- unit/integration:
  - `tests/workspace.test.js`
  - `tests/alerts.test.js`
  - `tests/market-intel.test.js`
- e2e smoke:
  - `tests/e2e.workspace.test.js`
  - `tests/e2e.alerts.test.js`

## 検証結果

- `npm test`
- `npm run test:e2e`
- `npm run test:all`
- `git --no-pager diff --check`

最終 `npm run test:all` は `tests 531 / pass 516 / skip 15 / fail 0`。

## 既知の制約

- workspace / alert surface は TradingView Desktop の internal API に依存する
- `tv_tab_*` は top-level workspace tabs ではなく layout 内の chart slot 操作
- alert は local price alert のみ対象で、webhook 配信先や edit/pause/resume は未対応
