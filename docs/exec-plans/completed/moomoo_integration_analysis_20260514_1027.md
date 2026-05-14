# moomoo integration analysis plan

## Goal

`docs/strategy/moomoo/` 配下の一次調査結果と `docs/strategy/` の既存戦略文書を読み込み、moomoo OpenAPI を Oh-MY-TradingView のスクリーニング、バックテスト、MCP ブリッジにどう統合できるかを事実ベースで整理した調査ドキュメント `docs/strategy/moomoo_integration_analysis.md` を作成する。

## Files In Scope

- Create: `docs/strategy/moomoo_integration_analysis.md`
- Create: `docs/exec-plans/active/moomoo_integration_analysis_20260514_1027.md`
- Move on completion: `docs/exec-plans/active/moomoo_integration_analysis_20260514_1027.md` -> `docs/exec-plans/completed/moomoo_integration_analysis_20260514_1027.md`

## Files To Read

- `AGENTS.md`
- `docs/strategy/current-strategy-reference.md`
- `docs/strategy/current-symbol-reference.md`
- `docs/strategy/theme-momentum-definition.md`
- `docs/strategy/momentum-fundamental-screening-indicators-research_20260505.md`
- `docs/strategy/moomoo/README.md`
- `docs/strategy/moomoo/00_environment.md`
- `docs/strategy/moomoo/01_quote_api.md`
- `docs/strategy/moomoo/02_trade_api.md`
- `docs/strategy/moomoo/03_mcp_integration.md`
- `docs/strategy/moomoo/samples/` 配下の全サンプル

## Scope

- moomoo Quote API / Trade API / OpenD 構成の現状整理
- 3層スクリーニングとの対応付け
- Donchian 60/20 + RSP + RSI14 + 8% stop 戦略との連携可能性整理
- 新機能提案の優先度付け
- 残課題と追加調査項目の明確化

## Out Of Scope

- `REAL` 環境の本番発注設計
- ソースコード実装や既存ロジック改修
- API 未確認機能を断定的に採用判断すること

## Risks / Notes

- 既存ワークツリーに `.codex/config.toml` の未コミット変更があるため、今回の変更と混在させない
- 調査結果はリポジトリ内文書とサンプルコードで確認できた事実を優先し、未確認事項は明示的に残課題へ送る

## Validation

- `cat docs/strategy/moomoo_integration_analysis.md | head -50`
- `git status --short`

## Tasks

- [ ] moomoo 関連ドキュメントとサンプルコードを全件確認する
- [ ] 既存戦略文書を踏まえてスクリーニング活用観点を整理する
- [ ] バックテスト連携とシグナル発注フローを整理する
- [ ] 新機能提案を優先度・実装難易度付きで整理する
- [ ] `docs/strategy/moomoo_integration_analysis.md` を作成する
- [ ] 内容確認と `git status` で変更確認を行う
