# TradingView My Scripts 実在確認計画

## 変更・作成対象ファイル

- 更新候補: `src/core/pine.js`
- 更新候補: `scripts/backtest/save-selected-strategies-to-my-scripts.mjs`
- 作成候補: `tests/` 配下の My Scripts 一覧確認テスト
- 作成候補: `docs/reports/` 配下の確認メモ
- 移動: `docs/exec-plans/active/verify-my-scripts-registration_20260421_2120.md` → `docs/exec-plans/completed/`

## 実装内容と影響範囲

- TradingView Desktop 上で My Scripts 一覧を開き、対象 8 本が実際に保存されているか確認する
- もし未保存なら、既存保存導線が「保存ボタン発火止まり」なのか「一覧反映まで失敗」なのかを切り分ける
- 必要なら保存後の一覧確認導線を最小追加する

## テスト・検証方針

- RED: 一覧確認 helper を追加する場合は純粋部分を先にテスト化
- GREEN: 保存済み一覧を読める最小実装を入れる
- REFACTOR: Pine / 保存導線の重複だけ整理する
- 実機検証:
  - TradingView Desktop 接続確認
  - My Scripts 一覧の観測
  - 対象 8 本の存在確認

## リスク

- TradingView の My Scripts UI は DOM 依存が強く brittle
- 日本語 UI / 英語 UI で selector が揺れる可能性がある
- 一覧の読み取りに失敗しても、保存自体が失敗したとは限らない

## 実装ステップ

- [ ] 既存コードに My Scripts 一覧確認導線があるか調べる
- [ ] 一覧を観測する最小導線を実装または既存再利用する
- [ ] 実機で My Scripts 一覧を開き、対象 8 本の存在を確認する
- [ ] 未保存なら原因を切り分け、必要な最小修正を入れる
- [ ] 結果をレビューし、計画を `completed/` へ移動する
- [ ] 必要な変更をコミットして `main` に push する
