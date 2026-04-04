# 実装計画: NVDA Strategy Attach 復旧 (20260404_1705)

- ステータス: COMPLETED
- 競合確認: `docs/exec-plans/active/` に競合 plan なし
- 関連 completed plan:
  - `docs/exec-plans/completed/strategy-apply-fix_20260404_0456.md`
  - `docs/exec-plans/completed/backtest-results-fix_20260404_0608.md`
  - `docs/exec-plans/completed/nvda-backtest-results-recovery_20260404_0733.md`

## 背景

今回のゴールは **NVDA 固定 (`backtest nvda-ma`) で TradingView Strategy Tester 実測を取れる状態まで戻すこと** である。  
接続自体は生きており、問題は backtest 実行前段の strategy attach に絞られている。

再現結果:

- `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status`
  - success: true
  - chart_symbol: `BATS:NVDA`
- `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest nvda-ma`
  - success: true
  - `compile_detail.button_clicked: keyboard_shortcut`
  - `compile_detail.study_added: false`
  - `tester_available: false`
  - `apply_failed: true`
  - `apply_reason: Strategy not verified in chart studies after compile + retry`
  - `tester_reason: Skipped: strategy not applied`
  - `fallback_source: chart_bars_local`
- runtime 診断で追加確認した事実
  - Pine editor 上部には save ボタン直前の **unlabeled secondary button** が存在する
  - title/aria 付きの `チャートに追加` button は状態によって出たり消えたりする
  - unlabeled apply candidate を CDP mouse click しても `getAllStudies()` / Strategy Tester 状態は変わらない
  - save 後に `マイスクリプト` を開いても「ここにはまだ個人のスクリプトはありません」となり current script は登録されない

つまり、現状は fallback は返るが、TradingView Strategy Tester の実測は取れていない。

## この計画で解決したいこと

NVDA 固定の `backtest nvda-ma` について、strategy が実際に chart へ載る経路を復旧し、
TradingView Strategy Tester 実測が primary path で返るようにする。

## 完了結果

- `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest nvda-ma` で TradingView 実測の Strategy Tester metrics を取得できる状態に復旧した
- Pine editor 上部の unlabeled apply button を検出できるようにした
- blocking dialog を閉じ、study template snapshot がある場合のみ chart studies を安全に退避・クリア・復元するようにした
- TradingView internal API の nested `performance.all` payload から metrics を正規化するようにした
- 実測確認結果
  - `tester_available: true`
  - `apply_failed: false`
  - `net_profit: 9549987.59`
  - `closed_trades: 154`
  - `percent_profitable: 36.36`
  - `profit_factor: 1.4566944756455777`
  - `max_drawdown: 4792475.620000003`

## スコープ

### スコープ内

1. NVDA 固定 backtest の strategy apply / attach 経路の復旧
2. apply button 検出・クリック・keyboard fallback の挙動確認と修正
3. attach verification の精度向上
4. retry 後の attach 判定と待機条件の見直し
5. NVDA の actual tester metrics 取得可否を主目的にした E2E 検証強化
6. 必要なら save / My Scripts / load strategy 導線まで含めて TradingView 側 script 管理フローを掘る
7. 必要最小限の README 差分

### スコープ外

- 任意シンボル対応
- 任意 strategy 対応
- fallback ロジックの拡張・刷新
- `price` / `status` / `discover` 系の改善
- TradingView 全 UI 差分への包括対応
- Save/Publish フローの一般化（NVDA 復旧に必要な最小差分を除く）

## 変更・作成・削除ファイル

### 更新

- `src/core/pine.js`
  - apply button 検出・クリック経路の見直し
  - retry apply と attach verify の改善
  - unlabeled toolbar button / save flow / My Scripts 導線の最小対応
  - 必要なら strategy source / internal state の補助確認を追加
- `src/core/backtest.js`
  - compile 後 attach 確認フローの見直し
  - retry 後の再確認条件・待機条件の改善
  - actual tester へ進む条件の厳密化
- `tests/pine.smart-compile.test.js`
  - apply button 検出・attach verify の unit test 追加/更新
- `tests/backtest.test.js`
  - apply_failed / tester_reason / fallback 分岐の整合性テスト追加/更新
- `tests/e2e.backtest.test.js`
  - NVDA の actual tester metrics 取得可否を主目的にした検証へ更新
- `README.md`
  - 戻り値や実行手順の意味差分が変わる場合のみ最小限更新

### 作成

- `docs/exec-plans/active/nvda-strategy-attach-recovery_20260404_1705.md`

### 削除

- なし

## 実装内容と影響範囲

### A. apply 経路の再点検と修正

**対象:** `src/core/pine.js`

現状 `compile_detail.button_clicked=keyboard_shortcut` が再現し、UI 診断では **ラベル無しの apply 候補ボタン** が save ボタン直前に存在している。

- `pickApplyButton()` の優先順位だけでなく、実際の UI 検出が十分かを確認する
- `clickPreferredApplyButton()` が `button` 要素だけに依存していないか確認する
- `clickApplyButtonByLabel()` の exact text match が厳しすぎないか確認する
- Japanese UI の空白・改行・nested text・aria-label 差分を吸収する
- label/title/aria が空でも class / 位置関係から apply 候補を特定できるか確認する
- keyboard shortcut に落ちる条件が早すぎないか確認する

**影響範囲:**

- compile/apply 成功率
- `button_clicked` の信頼性
- retry 前段の挙動

### B. attach verification の再設計

**対象:** `src/core/pine.js`, `src/core/backtest.js`

現状の verify は `getAllStudies()` の name/description 一致中心で、TradingView 内部では attach 済みでも見落としている可能性がある。

- `fetchChartStudies()` による観測だけで十分かを確認する
- `verifyStrategyAttachmentChange()` が this-run attach を厳密に示せているかを確認する
- preexisting strategy と今回 attach した strategy を分離する
- 必要なら strategy source / internal model / data source 由来の補助シグナルを追加する

**影響範囲:**

- apply success / failure 判定精度
- false negative の削減
- fallback への早すぎる退避抑制

### C. retry policy の見直し

**対象:** `src/core/pine.js`, `src/core/backtest.js`

- retry 前 baseline snapshot の妥当性を見直す
- 各 retry 後の待機時間と再サンプリング回数を見直す
- `study_added=false` でも attach されうるケースを吸収する
- retry 後に actual tester を開いて良い条件を再定義する

**影響範囲:**

- attach 成功率
- 実行時間
- E2E 安定性

### D. E2E ゴールの修正

**対象:** `tests/e2e.backtest.test.js`

現状 E2E は structured result の shape 確認が中心で、「TradingView 実測が実際に取れたか」の固定が弱い。

- `tester_available=true` のとき `metrics` が返ることを重視する
- `apply_failed=true` なら `tester_available=false` であることを固定する
- fallback が返る場合でも root cause が apply 層にあると分かる形を維持する

**影響範囲:**

- NVDA 実機 path の回帰防止
- 実結果と fallback の誤認防止

### E. save / My Scripts / load strategy 導線の限定調査

**対象:** `src/core/pine.js`, 必要なら `src/core/backtest.js`

現在の runtime 診断では、save 後に `マイスクリプト` を開いても current script が登録されていない。  
そのため direct add が失敗する環境では、TradingView 側 script 管理フローそのものの前提が崩れている可能性がある。

- save button click が実際に保存を成立させているかを確認する
- `マイスクリプト` が空の理由を切り分ける
- `ストラテジーを読み込む` 経由で current script を利用できる状態か確認する
- 必要な場合のみ、NVDA 専用の save/load workaround を最小限で導入する

**影響範囲:**

- direct add 失敗時の復旧可能性
- TradingView 側ログイン / script 保持前提との整合性

## 次に見るべき関数 / 診断ポイント

### `src/core/pine.js`

- `smartCompile()`
  - `button_clicked=keyboard_shortcut` に落ちる条件
  - `study_added` の観測が attach 成功判定として弱くないか
- `clickPreferredApplyButton()`
  - `document.querySelectorAll('button')` だけで足りるか
  - unlabeled toolbar button を拾えているか
- `clickApplyButtonByLabel()`
  - exact text match しか見ていない点
  - `aria-label` / role / nested text を見る必要があるか
- `fetchChartStudies()`
  - `getAllStudies()` のみで十分か
- `verifyStrategyAttachmentChange()`
  - false negative を起こしていないか
- `retryApplyStrategy()`
  - label 列挙順・待機・baseline 比較が妥当か

### `src/core/backtest.js`

- `runNvdaMaBacktest()`
  - compile 後の `!strategyAttached` 分岐
  - retry 後も false のままになる条件
- Strategy Tester open/read 前の遷移
  - attach 未確認のまま tester 側問題に見せていないか
- save / My Scripts / load strategy の迂回導線
  - current script が script 管理フローに現れる前提が崩れていないか

## テスト方針（RED → GREEN → REFACTOR）

### RED

- [ ] `tests/pine.smart-compile.test.js` に button 検出不足ケースの失敗テストを追加する
- [ ] `tests/pine.smart-compile.test.js` に attach false negative ケースの失敗テストを追加する
- [ ] `tests/backtest.test.js` に compile 成功でも attach verify 失敗なら tester へ進まない失敗テストを追加する
- [ ] `tests/backtest.test.js` に `apply_failed` / `tester_reason` / `fallback_metrics` の整合性失敗テストを追加する
- [ ] `tests/e2e.backtest.test.js` に NVDA 実測 path と fallback path の区別を強める検証を追加する
- [ ] save / My Scripts 導線が必要なら、その失敗条件を固定する

### GREEN

- [ ] `src/core/pine.js` の apply button 検出・click ロジックを最小修正する
- [ ] `src/core/pine.js` の attach verification を最小修正する
- [ ] `src/core/pine.js` の retry apply を最小修正する
- [ ] `src/core/backtest.js` の compile 後 attach 判定と retry 後分岐を最小修正する
- [ ] 必要な場合のみ save / My Scripts / load strategy の最小 workaround を追加する
- [ ] 必要最小限で `README.md` を更新する

### REFACTOR

- [ ] apply policy を pure helper に寄せて読みやすくする
- [ ] attach verification を小関数へ整理する
- [ ] retry / wait / verify の責務を分離する
- [ ] test fixture の重複を整理する

## 検証コマンド

- `npm test`
- `npm run test:e2e`
- `npm run test:all`
- `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status`
- `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest nvda-ma`

## リスク / 注意点

- TradingView Desktop の UI 文言・DOM・internal API は変更に弱い
- `button_clicked=keyboard_shortcut` は UI 検出失敗なのか click 不達なのか切り分けが必要
- unlabeled apply button のみ見えている状態では UI 依存がさらに強い
- `getAllStudies()` に strategy が安定して現れない場合、別シグナル追加が必要
- preexisting strategy を success 扱いすると実測復旧判定が壊れる
- save 後も `マイスクリプト` が空のため、ログイン状態や TradingView 側権限に依存する可能性がある
- E2E は接続先 TradingView 状態に依存し不安定になりうる
- coverage 80% の機械確認コマンドは現状 repo scripts 上に見当たらないため、既存テスト資産内で最大限担保する

## チェックボックス形式の実装ステップ

### Phase 0: 調査固定

- [ ] `button_clicked=keyboard_shortcut` の原因を、button 未検出か click 不達かで切り分ける
- [ ] compile 直後と retry 後の chart state 観測点を固定する
- [ ] attach success を定義する追加シグナルを 1 つ以上決める
- [ ] save / My Scripts が current script を保持していない理由を切り分ける

### Phase 1: RED

- [ ] unit test で apply button 検出失敗ケースを固定する
- [ ] unit test で attach false negative ケースを固定する
- [ ] unit test で preexisting strategy 誤判定ケースを固定する
- [ ] backtest test で apply_failed と tester path の分離を固定する
- [ ] e2e test で NVDA 実測 path の期待を明示する

### Phase 2: GREEN

- [ ] `src/core/pine.js` を最小修正する
- [ ] `src/core/backtest.js` を最小修正する
- [ ] 必要なら save/load workaround を最小追加する
- [ ] 必要なら README を最小更新する

### Phase 3: REFACTOR / 検証

- [ ] helper 分割で責務を整理する
- [ ] `npm test` を通す
- [ ] `npm run test:e2e` を通す
- [ ] `npm run test:all` を通す
- [ ] 実機で `backtest nvda-ma` を再実行し、TradingView 実測取得を確認する

## 完了条件

- `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest nvda-ma` で TradingView Strategy Tester 実測を primary path で取得できる
- `apply_failed` が false のとき、strategy attach が実際に確認できている
- `tester_available=true` のとき `metrics` が返る
- fallback は残っていても、primary goal は NVDA attach 成功である
- 既存 unit / e2e を壊さない

**完了**
