# public-top10-us-40 universe 差し替え計画

## 目的
- 既定で参照されている `public-top10-us-40` universe を、依頼された 40 銘柄リストへ差し替える。

## 変更対象ファイル
- 変更: `config/backtest/universes/public-top10-us-40.json`
- 作成: `docs/exec-plans/active/replace-public-top10-us40-universe_20260428_2242.md`
- 変更予定なし（確認のみ）: `tests/campaign.test.js`

## 実装内容
- `config/backtest/universes/public-top10-us-40.json` の `symbols` 配列を依頼内容に合わせて更新する。
- `id` と `name` は依頼内容どおり維持し、40 銘柄、US 株 30、macro 10 の構成を保つ。
- 既存 campaign が参照する universe id は変えず、参照先の差し替えだけで済ませる。

## 影響範囲
- `public-top10-us-40` を参照する current campaign 群すべての対象銘柄が更新される。
- campaign 定義や strategy 定義の構造変更は行わない。

## スコープ外
- campaign ファイルの追加・削除・名称変更
- strategy preset の調整
- 既存ドキュメント本文の更新

## テスト戦略
- 既存テストの RED 追加は行わず、既存の universe 構成検証テストで整合性を確認する。
- 想定検証:
  - `node --test tests/campaign.test.js`
  - 必要に応じて `node --test tests/repo-layout.test.js`

## リスク
- universe 内の銘柄数や market/bucket の配分を崩すと `tests/campaign.test.js` が失敗する。
- `public-top10-us-40` を参照する複数 campaign の実行対象が一斉に切り替わるため、意図した差し替えであることを維持する。

## 実装ステップ
- [ ] `config/backtest/universes/public-top10-us-40.json` を依頼された 40 銘柄構成へ更新する
- [ ] `public-top10-us-40` の件数・bucket・market 配分が依頼内容どおりか確認する
- [ ] `node --test tests/campaign.test.js` で universe/campaign 読み込み整合性を検証する
- [ ] 必要なら `node --test tests/repo-layout.test.js` を実行し、repo layout 制約への副作用がないことを確認する
