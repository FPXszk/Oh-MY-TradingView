# Phase1 sector ranking metrics update_20260513_0123

## 目的

Phase1 セクターランキングに、短期オシレーター中心の見方から一歩進めて、以下 3 系統の指標を追加する。

- `SPY` 対比の相対強度 (`3M / 6M / 12M`)
- breadth 指標 (`SMA50 / SMA200 / 52週高値近辺`)
- セクター平均リターンまたは equal-weight 的な強さ

同時に、`RSI` と `relative_volume_10d_calc` は順位の主役から外し、補助的な確認指標として残す。

## 変更対象ファイル

- `src/core/sector-momentum.js`
- `scripts/screener/run-fundamental-screening.mjs`
- `tests/daily-screener-report.test.js`
- `docs/reports/screener/TEMPLATE.md`

## 影響範囲

- US/JP の Phase1 セクターランキング算出ロジック
- 日次スクリーナー Markdown レポートの Phase1 表示列
- テスト fixture / 出力期待値

## 実装方針

- `sector-momentum` に market benchmark 取得とセクター breadth 集計を追加する。
- 相対強度は `sector average return - SPY return` で定義する。
- breadth は少なくとも以下を集計する。
  - `close > SMA50` 比率
  - `close > SMA200` 比率
  - `close >= 52週高値の90%` 比率
- セクター平均リターンは、現行の stock aggregation を equal-weight 的 proxy として扱う。
- `RSI` と `relative_volume_10d_calc` は表示列として維持するが、rank-sum の中核からは外す。

## 実装ステップ

- [ ] `src/core/sector-momentum.js` に benchmark/SPY 取得、breadth 集計、ranking formula 更新を実装する
- [ ] `scripts/screener/run-fundamental-screening.mjs` の Phase1 表と説明文を新指標に合わせて更新する
- [ ] `docs/reports/screener/TEMPLATE.md` を新しい Phase1 表示に合わせて更新する
- [ ] `tests/daily-screener-report.test.js` を更新し、Markdown 出力の期待値を新仕様に合わせる
- [ ] 対象テストを実行し、必要なら実レポートを再生成して生成物を確認する

## テスト戦略

- 既存の `tests/daily-screener-report.test.js` を更新して GREEN にする
- 必要に応じて `src/core/sector-momentum.js` の計算結果を通る既存経路の実出力で確認する
- 実運用コマンドでレポートを生成し、Phase1 テーブルの列と数値整合を目視確認する

## 検証コマンド

- `node --test tests/daily-screener-report.test.js`
- `node scripts/screener/run-fundamental-screening.mjs`

## リスク

- `SPY` benchmark を同じ scanner 取得で安定取得できない場合、benchmark 取得のフォールバックが必要になる
- breadth 列を増やしすぎると Markdown 可読性が落ちるため、表の列数は絞る必要がある
- US と JP で benchmark の扱いを共通化しすぎると、JP 側の意味づけが弱くなる可能性がある

## スコープ外

- Phase2 銘柄ランキングの重み変更
- Yahoo 補完ロジックの変更
- セクター別 profile 閾値そのものの見直し
