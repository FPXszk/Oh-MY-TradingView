# Phase2テーマ表削除・OTC除外・外部テーマ加点無効化 実行計画

## ゴール

日次 US スクリーニングについて、次の 3 点を反映する。

1. レポートから `Phase2 テーマランキング` 表を削除する
2. OTC 市場の銘柄を全面的に対象外にする
3. 外部テーマ参照による加点・順位補正機能を無効化する

今回の完了条件:

1. `docs/reports/screener/daily-ranking.md` に `Phase2 テーマランキング` が出力されない
2. 実行結果に OTC 銘柄が残らない
3. theme 集計や taxonomy 判定が外部参照数で加点されず、該当ロジックが無効化されたことをテストで確認できる

## 前提と解釈

- 「削除でいい」は、`Phase2 テーマランキング` セクション自体を markdown 出力しない意味で解釈する
- 「OTC市場はすべて対象外」は、US スクリーナーの実行結果とレポート掲載対象から OTC を除外する意味で解釈する
- 「コメントアウトなどしてその機能は無効にして」は、外部テーマ参照ファイルや分類メタ自体は残してよいが、順位や加点に効く処理は止める意味で解釈する
- 既存 taxonomy の主テーマ分類は維持し、無効化対象は `Heat` / `external confirmation` による補正ロジックに限定する

## 変更ファイル一覧

| ファイル | 操作 | 内容 |
|---|---|---|
| `docs/exec-plans/active/remove-phase2-theme-ranking-disable-external-theme-bonus_20260601_1825.md` | CREATE | 本計画 |
| `src/core/theme-taxonomy.js` | MODIFY | 外部参照加点・Heat 補正の無効化 |
| `src/core/fundamental-screener.js` | MODIFY | OTC 除外を本体ロジックへ反映 |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | `Phase2 テーマランキング` セクション削除 |
| `tests/theme-taxonomy.test.js` | MODIFY | 外部加点を使わない theme 集計へ期待値更新 |
| `tests/fundamental-screener.test.js` | MODIFY | OTC 除外を固定するテスト追加・更新 |
| `tests/daily-screener-report.test.js` | MODIFY | `Phase2 テーマランキング` 非表示を固定 |
| `docs/reports/screener/daily-ranking.md` | MODIFY | 実行結果更新 |
| `docs/exec-plans/completed/remove-phase2-theme-ranking-disable-external-theme-bonus_20260601_1825.md` | MOVE | 完了時に移動 |

## 実装内容

### A. レポートから Phase2 テーマランキングを削除

- `buildMarkdown()` から `Phase2 テーマランキング` セクション出力を削除する
- hierarchy の `Phase2 中テーマランキング` 以降は残す

### B. OTC 全面除外

- US スクリーニング結果に対して `exchange === 'OTC'` を除外する
- `exchangeAllowlist` が明示されない実行でも OTC を拾わないようにする
- 既存 `NASDAQ,NYSE` 運用と矛盾しない最小変更に留める

### C. 外部テーマ加点の無効化

- `summarizeThemes()` の `externalConfirmationScore` / `spKenshoBonus` / `themeHeatScore` による順位補正を止める
- 外部参照ファイルや分類結果の付与は残してよいが、ランキング順やスコアへ効かない状態にする
- 不要になった表示列は削除し、テスト期待値も更新する

## 実装ステップ

- [ ] `Phase2 テーマランキング` 出力箇所と依存テストを特定する
- [ ] OTC 除外を本体ロジックへ追加し、既存 allowlist と衝突しない形にする
- [ ] 外部テーマ加点ロジックを無効化し、theme 集計の並びと値を単純化する
- [ ] レポートとテスト期待値を更新する
- [ ] `node --test tests/theme-taxonomy.test.js tests/fundamental-screener.test.js tests/daily-screener-report.test.js` を通す
- [ ] `node scripts/screener/run-fundamental-screening.mjs` を実行し、OTC と不要表が消えたことを確認する
- [ ] 差分レビュー後、plan を `completed/` に移動する

## テスト戦略

- RED
  - `tests/daily-screener-report.test.js` で `Phase2 テーマランキング` が出ないことを失敗で固定する
  - `tests/fundamental-screener.test.js` で OTC 銘柄が除外されることを失敗で固定する
  - `tests/theme-taxonomy.test.js` で外部加点前提の heat score 期待を外す
- GREEN
  - 最小限のロジック変更で出力と集計を整理し、全テストを通す
- REFACTOR
  - 今回不要な taxonomy 再設計や外部参照ファイル削除には踏み込まない

## 検証コマンド

```bash
node --test tests/theme-taxonomy.test.js tests/fundamental-screener.test.js tests/daily-screener-report.test.js
node scripts/screener/run-fundamental-screening.mjs
git diff --check
```

## 影響範囲

- 影響あり
  - US daily screener の掲載銘柄 universe
  - markdown レポートの章構成
  - theme 集計の順位付け
- 影響なし
  - hierarchy config 自体
  - Portfolio Health Check 系 workflow
  - Japan スクリーナーの market 切替ロジック

## リスク

1. OTC 除外位置を誤ると、件数サマリーだけ残って実掲載件数とズレる
2. 外部加点無効化で theme 順位の並びが変わるため、既存説明文やテストの期待が崩れる
3. `Phase2 テーマランキング` を削ることで、関連する補助文言やテンプレートの整合が必要になる可能性がある

## スコープ外

- taxonomy 定義そのものの再編
- 外部テーマ参照ファイルの削除
- hierarchy `Phase2 中テーマランキング` の評価式変更

## 競合確認

- `docs/exec-plans/active/screener-architecture-flow-doc_20260601_1430.md` は説明ドキュメントの追記計画であり、今回のスクリーニング出力変更とは直接競合しない
