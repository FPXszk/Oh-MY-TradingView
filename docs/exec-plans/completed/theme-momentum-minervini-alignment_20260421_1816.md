# Theme Momentum Minervini整合化計画

作成日時: 2026-04-21 18:16 JST

## 目的

`docs/research/strategy/theme-momentum-definition.md` を、既存のテーマ投資メモを保ちつつ、Mark Minervini 流の投資哲学と整合する「テーマ投資版SEPA / 低リスク・モメンタム戦略」として再構成する。

今回の主目的は、単なる要約追記ではなく、以下を一つの一貫した戦略文書として整理し直すこと。

- テーマ persistence / breadth / market alignment という既存思想
- Minervini 的な Trend Template / low-risk entry / strict risk management
- この repo で再現可能な proxy ルールへの落とし込み

## 変更・確認対象ファイル

- 変更: `docs/research/strategy/theme-momentum-definition.md`
- 作成: `docs/exec-plans/active/theme-momentum-minervini-alignment_20260421_1816.md`
- 確認のみ: `docs/research/current/README.md`
- 確認のみ: `docs/research/strategy/` 配下の関連文書

## 実装内容と影響範囲

- 文書構成の再編
  - 現状の「継続テーマ + breadth + 地合い + breakout/dip reclaim」の定義を維持しつつ、Minervini 比較で不足している要素を前段に追加する
- 追記する戦略要素
  - Risk First の原則
  - テーマ投資における Trend Template 相当の解釈
  - 低リスク entry の条件整理
  - VCP を直接売買条件にせず、この repo の proxy とどう接続するかの明文化
  - exit / stop / position sizing / no average down の明示
  - 実務用チェックリストの追加
- 文章トーンの調整
  - 「テーマ投資としての独自性」は残す
  - ただし Minervini 流の中心が「テーマそのもの」ではなく「leader stock の低リスク・ブレイクアウト」であることをブレさせない

## 実装ステップ

- [ ] 関連文書を確認し、`theme-momentum-definition.md` と矛盾しない前提を整理する
- [ ] Minervini 原典要素と既存 Theme Momentum 要素を統合した章立てを決める
- [ ] RED: 文書修正前に、現行文書で不足している論点（risk first / stop / sizing / low-risk setup / checklist）を洗い出す
- [ ] GREEN: `theme-momentum-definition.md` を書き換え、テーマ投資版 Minervini 戦略として一貫した内容にする
- [ ] REFACTOR: 冗長表現や重複を削り、stable reference として読みやすい形に整える
- [ ] REVIEW: ロジック破綻、概念混同、過剰な一般化がないかを確認する
- [ ] 必要なら関連 README からの参照整合性を確認する
- [ ] COMMIT/PUSH: 承認後に plan を `completed/` へ移動し、Conventional Commits で commit / push する

## テスト戦略

- 今回はドキュメント更新が主対象のため、自動テスト追加は原則行わない
- その代わり、RED/GREEN/REFACTOR は文書レビューとして運用する
  - RED: 現行文書の不足論点を明文化
  - GREEN: 不足論点をすべて反映
  - REFACTOR: 戦略としての一貫性と可読性を改善
- 既存の文書参照や repo layout に影響する変更が発生した場合のみ、関連する最小限の確認コマンドを実行する

## 検証コマンド候補

- `rg -n "theme-momentum-definition|Theme momentum definition" docs`
- `git diff -- docs/research/strategy/theme-momentum-definition.md`

## リスクと注意点

- Minervini の個別株ブレイクアウト手法を、そのままテーマ ranking 戦略に写像すると概念がずれるため、どこまでを「原典準拠」、どこからを「repo 独自 proxy」とするかを明示する必要がある
- VCP は厳密にはチャートパターンであり、現在の backtest proxy は Donchian / RSI / breadth filter 中心なので、誤って「完全再現」と読める表現は避ける
- テーマ persistence を強調しすぎると、Minervini の「leader stock を高値圏で買う」思想よりもテーマ ranking 文書に寄り過ぎるため、leader 選定と entry precision を補強する必要がある
- 既存 active plan
  - `night-batch-readiness-stabilization_20260416_1706.md`
  - `night-batch-summary-and-storage-followup_20260420_1123.md`
  とは領域が異なり、直接の競合はない

## スコープ外

- strategy code や backtest engine の実装変更
- 新規 backtest 実行
- 外部 research 文書の全面改稿
- `AGENTS.md` や workflow ルールの変更
