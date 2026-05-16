# data-provider-indicator-comparison

作成日時: 2026-05-16 20:15 JST

## 目的

TradingView / Moomoo / Yahoo Finance で取得できるファンダメンタル指標とテクニカル指標を比較し、現行スクリーニングでファンダメンタルに使うべきデータ源の結論を `docs/strategy` に保存する。

## 変更・作成・削除するファイル

- 作成: `docs/strategy/data-provider-indicator-coverage_20260516.md`
  - TradingView / Moomoo / Yahoo Finance のファンダメンタル指標対応表を追加する。
  - 現行スクリーニングで使っている指標と、追加で取得できる指標を分けて記載する。
  - テクニカル指標の対応表を別セクションで記載する。
  - 最終結論として、スクリーニングのファンダメンタルにどれを主データ源として使うべきかを明記する。
- 移動: `docs/exec-plans/active/data-provider-indicator-comparison_20260516_2015.md` → `docs/exec-plans/completed/data-provider-indicator-comparison_20260516_2015.md`
  - 実装完了時に計画を completed へ移動する。

## 影響範囲

- ドキュメント追加のみ。
- ランタイムコード、テストコード、ワークフロー定義は変更しない。
- 既存の未コミット変更 `docs/exec-plans/completed/moomoo-phase2-screening-validation_20260514_1107.md` は対象外とし、触らない。

## 調査方針

- repo 実装確認:
  - `src/core/fundamental-screener.js`
  - `src/core/market-intel.js`
  - `src/core/moomoo.js`
  - `python/moomoo_adapter.py`
  - `docs/strategy/moomoo_phase2_screening_validation.md`
- 実機 / HTTP 確認:
  - TradingView Scanner API で現行スクリーニング列が返るか確認する。
  - Moomoo OpenAPI の `stock_filter_fields` / snapshot / kline / fundamentals helper の取得範囲を確認する。
  - Yahoo Finance chart / search / quoteSummary の可用性を確認する。
- 既知の制約:
  - Yahoo `quoteSummary` は直近セッションで `401 Unauthorized / Invalid Crumb` を確認済み。
  - Moomoo `get_stock_filter()` は頻度制限があるため、必要最小限の確認に留める。

## 実装ステップ

- [x] 既存実装と docs から、現行スクリーニングで使う指標を洗い出す。
- [x] TradingView / Moomoo / Yahoo Finance の取得可能指標を実査または実装根拠で分類する。
- [x] ファンダメンタル対応表、テクニカル対応表、運用結論を docs/strategy に作成する。
- [x] ドキュメント内容をレビューし、過剰な断定や未確認事項の混入がないか確認する。
- [x] 計画ファイルを completed に移動し、ドキュメントと計画を commit / push する。

## 検証

- `test -f docs/strategy/data-provider-indicator-coverage_20260516.md`
- `rg -n "結論|ファンダメンタル|テクニカル|TradingView|Moomoo|Yahoo" docs/strategy/data-provider-indicator-coverage_20260516.md`
- `git diff --check`

## リスク

- Provider の仕様や非公開 API の挙動は変わるため、実査日時を明記する。
- Yahoo Finance は非公式利用で特に不安定なため、取れる指標数より運用安定性を重く評価する。
- Moomoo の field inventory は広いが、TradingView と完全同義ではない指標があるため、direct / proxy / unavailable を分ける。
