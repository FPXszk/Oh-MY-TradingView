# 実装計画: NVDA バックテスト結果未確認の修正 (20260404_0733)

- ステータス: PLAN
- 競合確認: `docs/exec-plans/active/` に競合 plan なし
- 関連 completed plan:
  - `docs/exec-plans/completed/strategy-apply-fix_20260404_0456.md`
  - `docs/exec-plans/completed/backtest-results-fix_20260404_0608.md`

## 背景

`tv backtest nvda-ma` は現在、

- `apply_failed`
- `apply_reason`
- `tester_available`
- `tester_reason`
- `fallback_metrics`

を返せるが、ユーザー報告の「NVDA でバックテストしていたが結果確認できなかった」は未解消である。

現行コードを確認すると、少なくとも次が残っている。

1. `src/core/pine.js` の compile/apply 主経路が `Save and add to chart` / `保存してチャートに追加` を最優先にしている
2. strategy attach 判定が `getAllStudies()` の名前一致中心で、this-run attach を厳密に見切れていない
3. retry 後の attach 確認が `verifyStrategyAttached()` ベースで、preexisting strategy を成功誤判定しうる
4. `tests/e2e.backtest.test.js` が shape 検証中心で、actual tester metrics を取れない根本原因を固定していない

今回の修正は、既存 plan の一般論を繰り返すのではなく、**「途中で切れたように見える」「結果が確認できない」未解決点の根本修正**に絞る。

## スコープ

### スコープ内

1. NVDA 固定 backtest の apply 主経路を見直す
2. attach 成功確認を `getAllStudies()` 依存だけにしない
3. preexisting strategy と this-run attach success を分離する
4. fallback へ落ちる前の待機・再確認条件を見直す
5. unit / e2e で root cause を再現し、再発防止を固定する
6. 必要最小限で README の結果説明を更新する

### スコープ外

- 任意シンボル対応
- 任意戦略対応
- fallback 算出ロジックの全面刷新
- TradingView UI 全面変更への包括対応
- `price` / `status` / `discover` 系の別改善

## 変更・作成・削除するファイル

### 更新

- `src/core/pine.js`
  - apply ボタン優先順位の見直し
  - save 系導線を主経路から外す、または最終 fallback に限定
  - attach 検証ロジックの補強
- `src/core/backtest.js`
  - attach 未確認時の待機 / 再確認 / fallback 条件の見直し
  - apply failure と tester unreadable の切り分け精度向上
- `tests/pine.smart-compile.test.js`
  - apply 優先順位と attach 判定の unit test 追加・更新
- `tests/backtest.test.js`
  - root cause 分離、fallback 条件、preexisting strategy 誤判定防止の test 追加
- `tests/e2e.backtest.test.js`
  - shape 検証だけでなく actual tester / fallback / apply failure の整合性確認を追加
- `README.md`
  - 戻り値の意味差分が変わる場合のみ最小限更新

### 作成

- `docs/exec-plans/active/nvda-backtest-results-recovery_20260404_0733.md`

### 削除

- なし

## 実装内容と影響範囲

### A. apply 主経路の是正

**対象:** `src/core/pine.js`

- `Save and add to chart` / `保存してチャートに追加` を最優先から外す
- 初回 apply は `Add to chart` / `Update on chart` を優先する
- save 系は他手段が尽きたときの最終候補に限定するか、今回のスコープでは除外する

**影響範囲:**

- compile/apply の中断リスク低減
- unsaved/save ダイアログ混入の抑制
- 実機での apply 成功導線の明確化

### B. attach 成功確認の再設計

**対象:** `src/core/pine.js`, `src/core/backtest.js`

- `getAllStudies()` の存在確認だけでなく、strategy の実在を補助的に再確認できる経路を追加する
- `retryApplyStrategy()` でも単純存在確認ではなく、「this run で attach できたか」をより厳密に判定する
- preexisting strategy のみ残っているケースを成功扱いしない

**影響範囲:**

- apply success の誤判定低減
- fallback への早すぎる退避を減らす
- 「途中で切れたように見える」誤診断の削減

### C. fallback 直前分岐の見直し

**対象:** `src/core/backtest.js`

- `if (!strategyAttached)` に落ちる前に attach 遅延 / stale state / preexisting strategy の再確認を追加する
- fallback を返すときも `apply_failed`, `apply_reason`, `tester_reason` の責務を一貫させる

**影響範囲:**

- 結果が見れなかった理由を追いやすくなる
- actual tester failure と local fallback を誤認しにくくなる

### D. テストの再設計

**対象:** `tests/pine.smart-compile.test.js`, `tests/backtest.test.js`, `tests/e2e.backtest.test.js`

- pure helper test だけでなく orchestration の失敗条件を固定する
- e2e では少なくとも次を確認する
  - actual tester metrics が取れた場合の整合性
  - fallback のときに root cause が保持されること
  - `apply_failed` と `tester_reason_category` の関係が破綻しないこと

**影響範囲:**

- 残っていた未解決点の再発防止
- 実機依存部の最低限の安全網追加

## 現時点で怪しい関数 / 分岐

- `src/core/pine.js`
  - `compile()`
  - `smartCompile()`
  - `retryApplyStrategy()`
  - `verifyStrategyAttachmentChange()`
- `src/core/backtest.js`
  - `runNvdaMaBacktest()` の `!strategyAttached` 分岐
  - Strategy Tester 読み取り前の待機・再試行分岐

## テスト方針（RED → GREEN → REFACTOR）

### RED

- [ ] `tests/pine.smart-compile.test.js` に save 系が最優先で選ばれないことを示す失敗テストを追加する
- [ ] `tests/pine.smart-compile.test.js` に preexisting strategy のみでは retry success と見なさない失敗テストを追加する
- [ ] `tests/backtest.test.js` に attach 遅延時の早すぎる fallback を防ぎたい失敗テストを追加する
- [ ] `tests/backtest.test.js` に `apply_failed` / `tester_reason` / `fallback_metrics` の整合性テストを追加する
- [ ] `tests/e2e.backtest.test.js` に actual tester / fallback / apply failure の区別を固定するテストを追加する

### GREEN

- [ ] `src/core/pine.js` の apply 優先順位を修正する
- [ ] `src/core/pine.js` の retry attach 確認を強化する
- [ ] `src/core/backtest.js` の attach 未確認時の再確認ロジックを追加する
- [ ] `src/core/backtest.js` の fallback 条件と reason 付与を整理する
- [ ] 必要なら attach state / tester state 判定 helper を小さく追加する

### REFACTOR

- [ ] apply policy を pure helper に寄せる
- [ ] attach verification を小関数へ分離する
- [ ] backtest result classification を読みやすく整理する
- [ ] テスト fixture / 重複セットアップを整理する

## 検証コマンド

- `npm test`
- `npm run test:e2e`
- `npm run test:all`
- `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status`
- `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest nvda-ma`

## リスク / 注意点

- TradingView Desktop の UI / internal API は非公開で変更に弱い
- save 系導線を弱めることで、一部環境の apply 成功率が逆に落ちる可能性がある
- attach 判定は TradingView 側の表現差異で揺れる可能性がある
- E2E は CDP 接続先依存で常時再現しにくい
- 現状 repo には coverage 専用コマンドがなく、80% の機械確認は別途工夫が必要

## チェックボックス形式の実装ステップ

### Phase 0: 調査固定

- [ ] `src/core/pine.js` の apply 優先順位を pure test で固定する
- [ ] attach 成功確認に使う追加シグナルを決める
- [ ] preexisting strategy 誤判定を再現する fixture を決める

### Phase 1: RED

- [ ] `tests/pine.smart-compile.test.js` に apply policy の失敗テストを追加する
- [ ] `tests/backtest.test.js` に attach/fallback の失敗テストを追加する
- [ ] `tests/e2e.backtest.test.js` に root cause 整合性テストを追加する

### Phase 2: GREEN

- [ ] `src/core/pine.js` を修正する
- [ ] `src/core/backtest.js` を修正する
- [ ] 必要最小限で README 差分を入れる

### Phase 3: REFACTOR / 検証

- [ ] helper とテスト fixture を整理する
- [ ] `npm test` を通す
- [ ] `npm run test:e2e` を通す
- [ ] `npm run test:all` を通す
- [ ] 実機で `tv backtest nvda-ma` を確認する

## 完了条件

- `tv backtest nvda-ma` で、結果未確認に見える主要因を少なくとも 1 つ以上実コードで除去できている
- apply success / apply failure / tester unreadable / fallback の区別が戻り値で明確
- preexisting strategy のみを success 誤判定しない
- `tests/e2e.backtest.test.js` が shape だけでなく root cause を最低限固定している
- 既存 unit test を壊さず、検証コマンドで問題がない

**承認待ち**
