# Rule of 40 Screening Research Update 2026-05-12 13:16

## 目的

`docs/strategy/momentum-fundamental-screening-indicators-research_20260505.md` に Rule of 40 の解説、現行スクリーニングワークフローへの適用案、有効性評価を同じ粒度で追記する。

## 変更ファイル

- 変更: `docs/strategy/momentum-fundamental-screening-indicators-research_20260505.md`
  - Rule of 40 の定義、経済的意味、根拠、評価、取得可否、優先度を既存表に追加する。
  - Technology / Software セクター記述と日次スコア設計に、Rule of 40 proxy の扱いを追記する。
  - このプロジェクトへの適用方法と、有効性・限界の判断を独立節として追記する。
  - 参考文献に McKinsey / Bain / CFI などの Rule of 40 関連資料を追加する。
- 移動: `docs/exec-plans/active/rule-of-40-screening-research-update_20260512_1316.md` → `docs/exec-plans/completed/rule-of-40-screening-research-update_20260512_1316.md`
  - 実装完了時に計画を completed に移動する。

## 影響範囲

- ドキュメントのみ。ソースコード、スクリーナー設定、実行ワークフローは変更しない。
- 既存の文章は削除・書き換えず、必要な箇所への追記に限定する。
- Rule of 40 は Software / SaaS 色が強いため、全銘柄共通スコアではなく Technology / Software 向け proxy として位置付ける。

## 実装ステップ

- [x] 既存ドキュメント構成と現行スクリーナーの取得フィールドを確認する。
- [x] Rule of 40 の定義、式、評価、データ取得可否を既存の指標表へ追加する。
- [x] スクリーニングワークフローへの適用方法を追記する。
- [x] 有効性と限界を、投資リターン因子ではなく SaaS valuation / operating quality proxy として整理する。
- [x] 参考文献を追加し、Markdown 表の崩れがないか確認する。
- [x] 計画ファイルを completed に移動し、変更をコミットして push する。

## 検証

- `git diff --check`
- `sed` / `rg` による追記箇所の確認
- Markdown はドキュメントのみのため、コードテストは実行しない。

## リスク

- Rule of 40 は学術的な横断株式リターン因子ではないため、モメンタムや profitability factor と同列に過信すると過剰評価になる。
- FCF margin と revenue growth は既存スコアに含まれるため、単純加点すると二重カウントになり得る。
- SaaS 以外の業種では意味が薄く、特に Financials / Energy / Materials / Industrials には横断適用しない。
