# Exec-plan: moomoo-openapi-research_20260510_1159

## 概要

目的: moomoo OpenAPI を Python (`moomoo-api`) で実地検証し、Oh-MY-TradingView から利用可能な機能・制約・統合案を `docs/strategy/` 配下へ整理する。

- 調査対象: OpenD 経由の相場データ API / 取引 API / MCP 統合案
- 実行前提: Windows 側で OpenD が起動し、WSL から到達可能であること
- 安全制約: 発注検証は `TrdEnv.SIMULATE` のみ。リアル発注につながる操作は実行前に必ずユーザー確認を取る

## 変更ファイル（作成/変更予定）

- docs/exec-plans/active/moomoo-openapi-research_20260510_1159.md
- docs/strategy/README.md
- docs/strategy/00_environment.md
- docs/strategy/01_quote_api.md
- docs/strategy/02_trade_api.md
- docs/strategy/03_mcp_integration.md
- docs/strategy/samples/quote_sample_01.py
- docs/strategy/samples/quote_sample_02.py
- docs/strategy/samples/quote_sample_03.py
- docs/strategy/samples/quote_sample_04.py
- docs/strategy/samples/quote_sample_05.py
- docs/strategy/samples/quote_sample_06.py
- docs/strategy/samples/quote_sample_07.py
- docs/strategy/samples/quote_sample_08.py
- docs/strategy/samples/quote_sample_09.py
- docs/strategy/samples/quote_sample_10.py
- docs/strategy/samples/trade_sample_01.py
- docs/strategy/samples/trade_sample_02.py
- docs/strategy/samples/trade_sample_03.py
- docs/strategy/samples/trade_sample_04.py
- docs/strategy/samples/trade_sample_05.py
- docs/strategy/samples/trade_sample_06.py
- docs/strategy/samples/trade_sample_07.py
- docs/strategy/samples/tv_webhook_server.py
- docs/strategy/samples/price_monitor.py
- docs/strategy/samples/mcp_server_stub.py

## 実装方針

- `docs/strategy/` を新設し、環境確認・Quote API・Trade API・MCP 統合設計を段階的に記録する
- 各 API 機能は対応する Python サンプルを `docs/strategy/samples/` に保存し、成功・失敗・権限不足・例外をすべて Markdown に残す
- 取引 API は `TrdEnv.SIMULATE` に限定し、実口座・本番発注は対象外とする
- OpenD 接続先、ログイン状態、SIMULATE 可否、対象市場、リアルタイム権限など、ユーザー指定が必要な項目は確認取得まで該当ステップをブロックする

## 範囲

### In scope

- `moomoo-api` パッケージ導入確認と OpenD 接続検証
- Quote API / Trade API の実呼び出し検証と結果記録
- Oh-MY-TradingView への MCP 統合案、Webhook 連携案、監視サンプル作成
- `docs/strategy/README.md` での機能一覧表・ロードマップ整理

### Out of scope

- リアル口座での発注、約定、資金移動
- 外部サービス用の実 Webhook URL や認証情報の設定
- 本リポジトリ既存 Node.js 実装への moomoo 機能の本組み込み

## 実装ステップ

- [ ] 既存リポジトリ構成と関連ドキュメントを確認し、`docs/strategy/` の配置方針を固める
- [ ] ユーザー確認が必要な前提条件を順番に解消する
- [ ] `moomoo-api` と OpenD 接続の環境確認を行い、`00_environment.md` を作成する
- [ ] Quote API 10項目をサンプル実装・実行し、`01_quote_api.md` に記録する
- [ ] Trade API 7項目を SIMULATE 限定で実装・実行し、`02_trade_api.md` に記録する
- [ ] MCP 統合案と自動化サンプルを作成し、`03_mcp_integration.md` に記録する
- [ ] 全調査結果を `docs/strategy/README.md` に統合する
- [ ] 既存テストと作成サンプルの整合性を確認し、最終レビュー後に plan を completed へ移動してコミットする

## テスト戦略

- RED: OpenD 接続・API 呼び出しで失敗したケースも、そのまま再現コードと例外内容をドキュメントへ残す
- GREEN: ユーザー確認済み条件の範囲で、各サンプルが期待どおりのレスポンスまたは明示的な権限エラーを返す状態にする
- REFACTOR: 重複する接続定数・例外処理・出力整形を各サンプル内で過不足なく整理する

## 検証コマンド

- `pip show moomoo-api`
- 必要に応じて `pip install moomoo-api`
- `python3 docs/strategy/samples/quote_sample_XX.py`
- `python3 docs/strategy/samples/trade_sample_XX.py`
- `python3 docs/strategy/samples/tv_webhook_server.py`
- `python3 docs/strategy/samples/price_monitor.py`
- `npm test`

## リスク・注意点

- OpenD 未起動、未ログイン、WSL からの疎通不可だと調査全体が停止する
- 市場データ権限や LV1/LV2 権限不足により、一部 API は成功ではなく権限エラー確認で終了する可能性が高い
- SIMULATE 口座や対象市場によって Trade API の挙動差分が出るため、対象市場確認が必須
- リアル発注の可能性が少しでもある操作は、実行前にユーザー確認を再取得する
- 現在 `docs/exec-plans/active/` にある他プランとは対象領域が重複しないことを確認済み

## 完了条件

- `docs/strategy/` 配下の調査ドキュメントとサンプルが一式そろっている
- 各 API 項目に対して「成功 / 失敗 / 権限不足 / 未検証理由」のいずれかが根拠付きで記録されている
- README に機能一覧表、MCP 統合ポイント、統合ロードマップ、制約事項が反映されている

---

作成者: Copilot
作成日時: 2026-05-10T11:59:17+09:00
