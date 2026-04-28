# run71 上位4戦略 My Scripts 登録計画

作成日時: 2026-04-28 10:52 JST

## 目的

run71 の暫定上位 4 戦略を、既存の My Scripts 保存導線 `scripts/backtest/save-selected-strategies-to-my-scripts.mjs` を使って TradingView Desktop の My Scripts へ登録する。  
既存導線でそのまま登録できるかをまず確認し、必要な場合のみ最小限の修正を行う。

対象戦略:

1. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma20-rsi65`
2. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma25-rsi65`
3. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma15-rsi62`
4. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma15-rsi60`

## 前提・確認事項

- 既存導線は `scripts/backtest/save-selected-strategies-to-my-scripts.mjs` から `src/core/my-scripts.js` の `saveStrategiesToMyScripts` を呼ぶ構成
- 既存 test `tests/my-scripts.test.js` で「source を差し替えて My Scripts 保存する」流れはカバー済み
- `docs/exec-plans/active/` には `repo-structure-align-and-archive-rules_20260424_2015.md` があるが、今回の対象ファイル・目的とは重ならない
- TradingView Desktop / CDP 接続状態次第では、実装変更なしで実行だけで完了する可能性が高い

## 変更・作成・移動するファイル

### 作成

- `docs/exec-plans/active/register-run71-top4-to-my-scripts_20260428_1052.md`

### 更新候補

- `scripts/backtest/save-selected-strategies-to-my-scripts.mjs`
- `src/core/my-scripts.js`
- `tests/my-scripts.test.js`

注記:
- 既存導線で登録できれば、repo 変更は plan の移動以外には発生しない
- 失敗時のみ、原因箇所に対して最小限の修正を入れる

### 完了時に移動

- `docs/exec-plans/active/register-run71-top4-to-my-scripts_20260428_1052.md`
- 移動先: `docs/exec-plans/completed/register-run71-top4-to-my-scripts_20260428_1052.md`

## 実装内容と影響範囲

- My Scripts 保存の既存導線を再利用して 4 戦略を実機登録する
- 接続や UI 導線に問題があれば、`saveStrategiesToMyScripts` 周辺だけを調査対象に限定する
- 修正が必要な場合でも、保存フロー以外の backtest / campaign / docs ロジックには触れない

## スコープ

### 含む

- 既存導線の確認
- 4 戦略の My Scripts 保存実行
- 必要時の最小修正
- 保存結果の確認
- review / commit / push

### 含まない

- 追加の戦略選定
- backtest 再実行
- 関係ない TradingView UI 改修
- 既存 My Scripts の整理や削除

## TDD / テスト戦略

- 既存導線で登録できた場合はコード変更なしのため追加テストは不要
- 修正が必要な場合のみ `tests/my-scripts.test.js` を RED -> GREEN で更新する
- UI 実行前に既存 unit test を必要最小限で回し、保存フローの回帰がないことを確認する

## 検証コマンド候補

- `node --test tests/my-scripts.test.js`
- `node scripts/backtest/save-selected-strategies-to-my-scripts.mjs donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma20-rsi65 donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma25-rsi65 donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma15-rsi62 donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma15-rsi60`
- `git status --short`

## リスク / 注意点

- TradingView Desktop / CDP 接続不良だと repo 側が正しくても保存できない
- preset id が source 解決対象に未登録なら、保存前に preset 解決エラーで止まる
- UI 文言や保存モーダルが変わっている場合、My Scripts 保存ステップだけが壊れている可能性がある

## 実装ステップ

- [ ] 既存 My Scripts 保存導線と対象 preset の解決可否を確認する
- [ ] 既存 test / 接続確認で実行前の前提を固める
- [ ] 4 戦略を既存 CLI から My Scripts へ保存する
- [ ] 失敗した場合のみ原因を `src/core/my-scripts.js` 周辺へ絞って最小修正する
- [ ] 必要な test / 再実行で保存成功を確認する
- [ ] plan を `docs/exec-plans/completed/` へ移動する
- [ ] Conventional Commit で commit し、`main` に push する

## 完了条件

- 指定 4 戦略が既存導線から My Scripts へ保存されている
- 修正が入った場合は対応テストが通っている
- plan が completed に移動し、結果が `main` に push されている
