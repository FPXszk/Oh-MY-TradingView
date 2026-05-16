# sbi-portfolio-api-research

作成日時: 2026-05-17 00:11 JST

## 目的

SBI証券から保有ポートフォリオ情報をプログラムで取得できる方法が存在するかを、公式API、連携サービス、スクレイピング、CSVエクスポート、他社比較の観点で調査し、`docs/research/sbi_portfolio_api.md` にまとめる。

## 前提

- web検索を積極的に使い、2024年以降の情報を優先する。
- 公式サイト、サービス公式ヘルプ、OSSリポジトリ、利用規約・注意事項を優先する。
- 確認できない事項は「確認できず」と明記し、推測で補完しない。
- 調査のみを行い、SBI証券へのログイン、スクレイピング実行、認証情報入力、実口座アクセスは行わない。

## 変更・削除・作成するファイル

- 作成: `docs/research/sbi_portfolio_api.md`
  - 指定された構成で調査結果を記録する。
- 変更: `docs/research/manifest.json`
  - 新規調査ドキュメントを keep 対象に追加する。
- 変更: `docs/references/design-ref-llms.md`
  - 調査で参照した主要外部資料を追記する。

## 影響範囲

- コード挙動への影響はない。
- リポジトリの research / references ドキュメントのみ更新する。
- 法務判断ではなく、公開情報に基づく技術調査として記録する。

## 実装ステップ

- [x] 計画を active に作成し、計画のみ commit / push する。
- [x] SBI証券の公式API / 開発者サイト / 法人・個人向け提供有無を調査する。
- [x] 家計簿・金融データAPI・証券API系サービスのSBI証券連携方式を調査する。
- [x] スクレイピング / RPA / OSS実装例と利用規約上のリスクを調査する。
- [x] CSV手動エクスポートと他社証券API事例を調査する。
- [x] `docs/research/sbi_portfolio_api.md`, manifest, 参照台帳を更新する。
- [x] Markdown / JSON の整合性を確認し、計画を completed に移動して commit / push する。

## 検証

- `node --test tests/archive-latest-policy.test.js`
- `git diff --check`
- 参照URL一覧と本文の主張が対応していることを目視確認する。

## リスク

- SBI証券のログイン後画面や会員限定ヘルプは外部から確認できない可能性がある。
- 家計簿系サービスの内部連携方式は非公開の場合が多く、OAuth / スクレイピングの断定ができない可能性がある。
- 利用規約の解釈は法的助言ではないため、実装判断では追加確認が必要になる。
