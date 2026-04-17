# TradingView popup resilience / 実行時回避強化 exec-plan

## 目的

TradingView 上で突発的・再発的に表示される popup / advertisement modal により自動化処理が停止しないよう、**実行時に自己回復できる耐障害メカニズム**を導入する。  
主眼は **popup 監視 + 操作前クリーンアップ + 操作失敗時リトライ + 発生率低減策** を組み合わせ、手動クローズ不要で automation を継続可能にすること。

## スコープ

### 含む

- popup / dialog を検知・除去・回避する runtime resilience 層の実装
- `src/core/tradingview-readiness.js` への popup helper 集約
- `src/connection.js` を起点とした evaluate / evaluateAsync 実行前後の安全化
- `src/core/workspace.js` / `src/core/price.js` / `src/core/alerts.js` / `src/core/pine.js` / `src/core/backtest.js` / `src/core/health.js` の高優先経路への適用
- popup 監視処理（MutationObserver ベース）と操作失敗時の targeted retry
- `src/core/browser-launch.js` の popup 発生率低減策の見直し
- 既存 test runner を使った回帰テスト追加・更新

### 含まない

- TradingView アプリ本体の改変
- Pine Script の変更
- workflow / night-batch の包括的改修
- popup と無関係な広範囲リファクタ
- 失敗要因を握りつぶす包括的な silent retry

## 対処方法の比較

| 方法 | 概要 | 成功率 | 安定性 | 実装コスト | 副作用 / 注意点 |
|---|---|---:|---:|---:|---|
| DOM削除 | popup / overlay 要素を直接 DOM から除去する | 中 | 低〜中 | 中 | イベント・backdrop・focus trap が残る可能性。UI 破壊リスクあり |
| CSS非表示化 | `display:none` / `visibility:hidden` 等で不可視化する | 低〜中 | 低 | 低 | 見えなくなっても入力ブロックが残ることがある |
| MutationObserver 監視削除 | popup 出現を監視し、出現時に即 dismiss / 除去する | 高 | 中〜高 | 中 | 対象判定が広すぎると正規 dialog まで触る恐れ |
| 操作前クリーニング | 各 UI 操作や evaluate 前に popup 有無を確認して閉じる | 中〜高 | 高 | 低〜中 | 呼び出し頻度が高いと軽いオーバーヘッド |
| リトライ制御 | 失敗時に cleanup 後の再試行を限定回数で行う | 高 | 高 | 中 | retry 条件を絞らないと原因隠蔽になる |
| ブラウザ起動オプション調整 | launch arg / profile を調整して popup 発生率を下げる | 中 | 中 | 低 | 単独では再発 popup に対応できない |
| Escape / close button 併用 | 汎用 close 操作を複数順に試す | 中〜高 | 高 | 低 | 対象を広げすぎると誤操作リスク |
| 中央 evaluate ガード | `src/connection.js` で pre/post cleanup と retry を共通化する | 高 | 高 | 中〜高 | 影響範囲が広いので opt-in / 条件付き適用が必要 |
| caller 側局所対応 | `backtest` など各モジュールで個別対処する | 中 | 中 | 中 | 取りこぼしや重複実装が起きやすい |

## 採用戦略

**採用方針: 「MutationObserver 監視 + 操作前クリーンアップ + 操作失敗時 targeted retry + 起動時発生率低減」の複合戦略** を採用する。  
単一策では再発 popup と focus trap を防ぎきれないため、**出現前 / 出現時 / 出現後失敗時** をすべてカバーする。

### 採用理由

1. **成功率**  
   popup が既に出ているケース、操作中に後から出るケース、popup により失敗したケースの全てを吸収できる。
2. **安定性**  
   recurring popup に対して監視が効き、失敗時も cleanup 後 retry で自動復帰できる。
3. **副作用制御**  
   DOM 全消しや CSS 全隠しに寄せず、まずは close / cancel / Escape / 既知 selector を優先するため UI 破壊を抑えられる。
4. **実装現実性**  
   既存の `DISMISS_DIALOG_JS` と `backtest.js` の popup helper を活かしつつ、共通 helper に集約できる。

## 変更対象ファイル

### 主要変更対象

- `src/core/tradingview-readiness.js`
- `src/connection.js`
- `src/core/browser-launch.js`
- `src/core/workspace.js`
- `src/core/price.js`
- `src/core/alerts.js`
- `src/core/pine.js`
- `src/core/backtest.js`
- `src/core/health.js`

### 既存テスト更新対象

- `tests/tradingview-readiness.test.js`
- `tests/connection.test.js`
- `tests/workspace.test.js`
- `tests/price.test.js`
- `tests/alerts.test.js`
- `tests/backtest.test.js`

### 追加候補

- `tests/health.test.js`

## 実装方針

### 1. popup resilience helper の共通化

- `src/core/tradingview-readiness.js` に以下を集約する。
  - popup / overlay 検知
  - dismiss 実行
  - MutationObserver ベースの監視開始
  - cleanup 結果の要約
  - popup 起因失敗の分類
- `src/core/backtest.js` 内の `readVisibleDialogTexts()` / `dismissTransientDialogs()` から再利用可能な部分を helper に寄せる。

### 2. 監視処理の追加

- page 側に lightweight な MutationObserver を仕込み、`role="dialog"` / dialog class / overlay class / close button 群を対象にする。
- 監視は「常時無制限に何でも消す」のではなく、**広告・welcome・offer・onboarding 系と、その close / cancel / dismiss 導線があるもの**を優先する。
- dismiss 結果は window 配下の state に記録し、後続の retry 判定に使う。

### 3. 操作前クリーニング

- `src/connection.js` に popup cleanup helper を追加し、主要 evaluate 系操作の前に軽量 cleanup を入れる。
- 既存 API 互換性を壊さないよう、明示的 options または共有 wrapper 経由で段階適用する。

### 4. 操作失敗時 targeted retry

- popup 起因が疑われる失敗、または直前 cleanup / observer が popup 検知済みの時だけ retry する。
- retry フローは以下。
  1. cleanup
  2. 必要なら Escape
  3. 短い待機
  4. 再試行
- retry 回数は少数固定にし、popup 非起因エラーでは即失敗させる。

### 5. caller 側への適用

- 影響の大きい順に `health` / `workspace` / `price` / `alerts` / `pine` / `backtest` へ適用する。
- `backtest` のローカル popup 対応は shared helper 利用へ寄せ、重複を削減する。

### 6. browser launch option は補助策として採用

- `src/core/browser-launch.js` の既存 arg を維持しつつ、初回体験や promo を減らせる範囲のみ追加検討する。
- ただし launch arg だけでは完成条件を満たせないため、**本命は runtime resilience** とする。

## TDD / 検証戦略

### RED

先に regression test を追加し、現状の取りこぼしを固定する。

- popup 検知後に dismiss が走る failing test
- popup 再発時に observer が再度 cleanup する failing test
- popup 起因の操作失敗で only-once cleanup ではなく retry により回復する failing test
- popup 非起因エラーで retry が乱用されない failing test
- browser launch option の追加が期待どおり反映される failing test

### GREEN

- shared helper に popup 監視・dismiss・cleanup 結果分類を追加して RED を解消する
- `src/connection.js` に targeted retry を実装する
- 主要 caller に resilience guard を適用する
- `backtest.js` の popup ロジックを shared helper に揃える

### REFACTOR

- popup 判定条件と retry 判定条件の重複を整理する
- helper API を caller から見て分かりやすい形に整える
- 誤 dismiss を防ぐ条件を明確化し、失敗メッセージを統一する

### カバレッジ観点

- popup 検知あり / なし
- dismiss 成功 / 失敗
- retry 1回で回復 / 回復不可
- popup 非起因エラーは即失敗
- recurring popup の再検知 / 再抑止

## 検証コマンド

### 変更箇所中心

```bash
node --test tests/tradingview-readiness.test.js tests/connection.test.js tests/workspace.test.js tests/price.test.js tests/alerts.test.js tests/backtest.test.js
```

### `health` 専用テストを追加した場合

```bash
node --test tests/tradingview-readiness.test.js tests/connection.test.js tests/workspace.test.js tests/price.test.js tests/alerts.test.js tests/backtest.test.js tests/health.test.js
```

### 回帰確認

```bash
npm test
```

必要なら:

```bash
npm run test:all
```

## リスク / 注意点

- 既存 active plan `docs/exec-plans/active/night-batch-readiness-stabilization_20260416_1706.md` と readiness / popup 周辺で部分的に重なる。  
  今回は **workflow / Python 側 gate ではなく、共通 runtime resilience 層に限定** して衝突を抑える。
- `src/connection.js` は影響範囲が広いため、一括置換ではなく段階適用にする。
- popup 判定が広すぎると正規 dialog を誤って閉じる危険がある。
- DOM 削除は強いが副作用も大きいため、close / cancel / Escape / 既知 selector を優先し、除去は最後の手段にする。
- retry は popup 起因が疑われるケースに限定し、無限 retry や broad catch は採用しない。

## 実装ステップ

- [ ] `src/core/tradingview-readiness.js` と `src/core/backtest.js` の既存 popup helper の責務差分を整理し、shared 化設計を固める
- [ ] `tests/tradingview-readiness.test.js` に popup 検知・dismiss・再発監視・retry に関する failing test を追加する
- [ ] `tests/connection.test.js` に popup 起因時のみ retry される failing test を追加する
- [ ] 必要なら `tests/health.test.js` を追加し、health 経路でも popup により停止しないことを failing test で固定する
- [ ] `src/core/tradingview-readiness.js` に popup 監視処理、dismiss helper、cleanup 結果要約、popup 起因分類を実装する
- [ ] `src/connection.js` に pre-action cleanup と targeted retry を扱う resilience guard を実装する
- [ ] `src/core/health.js` / `src/core/workspace.js` / `src/core/price.js` / `src/core/alerts.js` / `src/core/pine.js` / `src/core/backtest.js` の高優先経路に resilience guard を適用する
- [ ] `src/core/backtest.js` のローカル popup 対応を shared helper 利用へ寄せ、二重実装を減らす
- [ ] `src/core/browser-launch.js` に popup 発生率低減のための限定的 launch arg 調整を追加する
- [ ] 関連ユニットテストを通し、最後に `npm test` で回帰確認する
- [ ] 必要なら `npm run test:all` で E2E を含む追加回帰を行う

## 完了条件

- popup が出ても自動操作が停止しない
- popup が再発しても監視と cleanup / retry により自動回避できる
- 手動で閉じる操作が不要
- popup 非起因エラーは握りつぶされず適切に表面化する
- 追加した regression test と関連既存テストが通る
