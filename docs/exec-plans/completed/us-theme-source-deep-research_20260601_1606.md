# US theme source deep research

## Goal

米国株スクリーニングで利用できる「信頼できる外部テーマ源」を調査し、既存の Phase1 セクター選定の下で、外部テーマ言及を重み付けに使う実現方針を整理する。

## Scope

- 対象は **調査と設計整理**。原則として実装変更は行わない
- 米国株向けの外部テーマ源として、少なくとも以下を比較対象に含める
  - moomoo
  - Morningstar
  - MSCI
  - その他、米国株テーマ一覧/テーマ分類/テーマ指数を持つ信頼性の高い候補
- 比較観点は、信頼性、テーマ定義の明確さ、米国株カバレッジ、取得方法、スクレイピング/再利用リスク、repo 既存フローへの組み込みやすさ
- 既存 repo の `TradingView sector -> repo theme taxonomy` フローへの接続方針まで示す

## Out of Scope

- theme taxonomy の実装修正
- スクレイパーや importer の実装
- Phase1 / Phase2 ロジックのコード変更
- ライセンスの法的断定

## Files

| Path | Action | Notes |
| --- | --- | --- |
| `docs/exec-plans/active/us-theme-source-deep-research_20260601_1606.md` | CREATE | 本計画 |
| `docs/strategy/us-theme-source-deep-research_20260601.md` | CREATE | deep research の最終成果物 |
| `docs/strategy/theme-sector-taxonomy-and-moomoo-screening-research_20260531.md` | READ | 既存調査の前提確認 |
| `src/core/fundamental-screener.js` | READ | Phase1/Phase2 と theme taxonomy 接続点の確認 |
| `src/core/theme-taxonomy.js` | READ | 現行 theme 付与方法の確認 |
| `config/screener/theme-taxonomy-us.json` | READ | 既存 theme 粒度との接続確認 |

## Risks / Watchpoints

- 外部サイトの「公開テーマ」は存在しても、構成銘柄やランキングの再配信に制約がある可能性が高い
- “信頼できる” と “取得しやすい” は一致しない可能性がある
- 米国株で使えるテーマ源でも、日次の「盛り上がり」シグナルまで提供していない場合がある
- 既存 repo は sector 起点なので、外部テーマ源は置換ではなく補強として設計した方が自然な可能性が高い

## Test / Validation Strategy

- コード実装は行わないため自動テスト追加はなし
- 代わりに以下を検証する
  - 公式ドキュメント/公開ページに基づいて各テーマ源の定義と取得導線を確認する
  - repo 内の既存 docs / code と照合し、組み込みポイントを明示する
  - 候補ごとに「信頼性」「取得性」「運用安全性」を比較表でまとめる

## Validation Commands

```bash
rg -n "theme|taxonomy|sector|moomoo|Morningstar|MSCI" docs src config
git diff -- docs/exec-plans/active/us-theme-source-deep-research_20260601_1606.md docs/strategy/us-theme-source-deep-research_20260601.md
```

## Task Breakdown

- [ ] 既存 repo のテーマ分類フローと接続点を確認する
- [ ] moomoo の米国株テーマ/plate 提供状況を確認する
- [ ] Morningstar / MSCI の thematic 定義と公開導線を確認する
- [ ] 米国株で使える追加候補を調査し、信頼性と取得性を比較する
- [ ] 「Phase1 セクター + 外部テーマ言及の重み付け」案を整理する
- [ ] 調査結果を `docs/strategy/us-theme-source-deep-research_20260601.md` にまとめる
- [ ] 内容を自己レビューし、ユーザー向けに要点を共有する
