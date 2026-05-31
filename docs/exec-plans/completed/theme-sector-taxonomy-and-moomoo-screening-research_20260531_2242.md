# テーマ粒度セクター再設計・moomoo 置換可能性調査 実装計画

## ゴール

現在の `daily-ranking` が依存している TradingView の粗い `sector` 分類を棚卸しし、以下を明確にする。

1. ユーザーが見たい粒度（メモリ / 宇宙 / 光通信・光半導体 / 電力 / MLCC）へ再編する場合の設計候補
2. 既存の TradingView ベース実装でどこまで再現できるか
3. moomoo 側の `sector` / `industry` / `plate` / `concept` 系 API で何が取れて、置換向きか補完向きか
4. 次の実装タスクに落とせる推奨方針

## 前提と解釈

- 今回の依頼は、即座のスクリーニング実装変更ではなく、分類粒度の再設計とデータ源比較の調査である
- 現行の Phase1 セクターランキングは `TradingView Scanner API` の `sector` をそのまま使った集計である
- ユーザーが求める粒度は一般的な GICS 風 sector より細かい「投資テーマ / サブ業種」寄りである
- moomoo が優れていても、repo の既存思想である `theme persistence / breadth / market alignment` を満たせるかは別途確認が必要
- 今回はコードの大改修までは行わず、調査結果を文書化し、必要なら最小の補助コード確認に留める

## 変更ファイル一覧

| ファイル | 操作 | 内容 |
|---|---|---|
| `docs/exec-plans/active/theme-sector-taxonomy-and-moomoo-screening-research_20260531_2242.md` | CREATE | 本計画 |
| `docs/strategy/theme-sector-taxonomy-and-moomoo-screening-research_20260531.md` | CREATE | 調査結果の正本。現行分類、テーマ粒度案、moomoo API の取得粒度、推奨アーキテクチャをまとめる |
| `docs/exec-plans/completed/theme-sector-taxonomy-and-moomoo-screening-research_20260531_2242.md` | MOVE | 完了時に移動 |

## 実装内容

### A. 現行分類の棚卸し

- `src/core/sector-momentum.js`
- `src/core/fundamental-screener.js`
- `scripts/screener/run-fundamental-screening.mjs`
- 既存 strategy docs / tests

を確認し、現行ランキングがどの分類軸を使い、どの粒度までしか表現できないか整理する。

### B. ユーザー希望テーマ粒度の設計案

- メモリ関連
- 宇宙関連
- 光通信 / 光半導体
- 電力
- MLCC / コンデンサ

について、

- `sector`
- `industry`
- 銘柄 allowlist / ルールベース分類
- moomoo plate / concept

のどれで切るのが自然か比較する。

### C. moomoo API の粒度確認

- repo 内の moomoo 調査資料と実装を確認する
- 必要に応じて公式ドキュメントを確認し、`plate` / `sector` / `concept` / `stock filter` 系で何が取得できるか整理する
- TradingView の `sector` / `industry` より細かい分類を一次ソースとして持てるかを評価する

### D. 推奨方針の提示

- TradingView 継続
- moomoo 置換
- TradingView + moomoo 補完

の 3 案を比較し、この repo で最小コストかつ再現性が高い案を推奨する。

## 実装ステップ

- [ ] 現行の Phase1 / Phase2 セクター集計ロジックを確認する
- [ ] 既存の moomoo 調査資料と adapter 実装を確認する
- [ ] moomoo 公式情報で `plate` / `sector` / `concept` 粒度を確認する
- [ ] ユーザー希望テーマごとに最適な分類軸を比較表にまとめる
- [ ] 推奨アーキテクチャと移行ステップを文書化する
- [ ] 調査結果ドキュメントをレビューし、計画を completed へ移す

## テスト戦略

- 今回は主に調査ドキュメント作成のため、自動テスト追加は原則行わない
- ただし、実装説明に関わる挙動は既存コード・既存テスト・公式資料の三点でクロスチェックする
- 必要ならローカルの read-only コマンドで API / 実装の対応関係のみ検証する

## 検証コマンド

```bash
rg -n "sector|industry|plate|concept|stock_filter|moomoo" src docs tests
git diff -- docs/strategy/theme-sector-taxonomy-and-moomoo-screening-research_20260531.md
```

## 影響範囲

- 影響あり
  - `daily-ranking` の今後の分類設計判断
  - moomoo を screening 補完に使う設計判断
- 影響なし
  - 既存ワークフローの実行ロジック
  - バックテスト
  - ポートフォリオヘルスチェック

## リスク

1. moomoo の plate / concept 名は市場や API バージョン依存で変わる可能性がある
2. `Space` や `MLCC` のようなテーマは単一 API フィールドでは完結せず、ルールベース補助が必要な可能性が高い
3. TradingView と moomoo で銘柄カバレッジや分類名称が一致しない可能性がある
4. 置換前提で考えすぎると、repo が重視する breadth / persistence 再計算コストを見誤る可能性がある

## スコープ外

- 新しいスクリーニングロジックの本実装
- 日次 workflow の改修
- moomoo adapter の新規 API 実装追加
- 銘柄ごとの完全なテーママスタ整備

## 競合確認

- `docs/exec-plans/active/` は確認時点で空であり、競合する active plan は見当たらない
