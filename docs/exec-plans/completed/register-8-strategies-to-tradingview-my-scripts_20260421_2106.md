# TradingView My Scripts 8戦略登録計画

## 変更・作成対象ファイル

- 更新候補: `scripts/backtest/save-public-top3-to-my-scripts.mjs`
- 更新候補: `src/core/pine.js`
- 更新候補: `src/tools/pine.js`
- 作成候補: `scripts/backtest/save-selected-strategies-to-my-scripts.mjs`
- 作成候補: `tests/` 配下の保存導線テスト
- 移動: `docs/exec-plans/active/register-8-strategies-to-tradingview-my-scripts_20260421_2106.md` → `docs/exec-plans/completed/`

## 実装内容と影響範囲

- 指定された 8 戦略の Pine ソースを repo 内から解決する
- TradingView Desktop の My Scripts に保存する既存導線を再利用または最小拡張する
- 8 本を順番に保存し、こちらから再利用できる状態まで確認する
- 既存の Public Top3 保存フローが壊れないよう、汎用化する場合も後方互換を保つ

## テスト・検証方針

- RED: 保存対象リストや source 解決の失敗ケースをテストで先に固定する
- GREEN: 8 戦略を解決して保存コマンドが通る最小変更を入れる
- REFACTOR: 既存 top3 保存導線と重複があれば整理する
- 検証:
  - `node --test ...` で対象テスト実行
  - TradingView Desktop 接続確認
  - 実際に 8 本の My Scripts 保存実行

## リスク

- TradingView UI の保存導線は modal / 保存済み状態に依存する
- Donchian 系 5 本は public source ではなく repo 内 preset source のため、保存時のタイトルや source build を正しく揃える必要がある
- 既存の top3 保存スクリプトを雑に流用すると、対象固定ロジックが混ざる可能性がある

## 実装ステップ

- [ ] 対象 8 戦略の source 解決方法を整理する
- [ ] 既存 My Scripts 保存導線を確認し、再利用か最小拡張かを決める
- [ ] RED: 保存対象・source 解決まわりのテストを追加する
- [ ] GREEN: 8 戦略を保存できる実装を入れる
- [ ] TradingView Desktop 接続下で 8 本を実際に My Scripts へ保存する
- [ ] 保存結果をレビューし、計画を `completed/` へ移動する
- [ ] 必要な変更をコミットして `main` に push する
