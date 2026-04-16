# 実装計画: バックテスト結果が見れない問題の修正 (20260404_0608)

- ステータス: PLAN
- 競合確認: `docs/exec-plans/active/` に競合 plan なし
- 補足: リポジトリ直下の `Oh-MY-TradingView.log` は空で、最新セッションログとしては利用不可

## 背景

現状の `src/core/backtest.js` は、Strategy Tester を開いたあとに internal API と DOM から metrics を取得し、取得できない場合は `tester_available: false` と `fallback_metrics` を返す実装になっている。

そのため「バックテスト結果が見れない」事象は、少なくとも次のいずれかで発生している可能性が高い。

1. Strategy Tester 自体が実際には開いていない
2. Strategy Tester は開いているが metrics 読み取り経路が壊れている
3. strategy 適用判定が不安定で、apply 成功前提のまま読み取りに進んでいる
4. panel 描画やデータ計算の待機が不足し、取得前に fallback へ落ちている

## スコープ

### スコープ内

1. Strategy Tester の起動確認を強化する
2. metrics 読み取り経路の耐久性を上げる
3. strategy apply 失敗と tester 読み取り失敗を明確に分離する
4. unit / e2e テストで失敗理由と fallback 条件を固定する
5. 必要に応じて戻り値の説明を最小限ドキュメント化する

### スコープ外

- 戦略ロジック自体の変更
- 任意シンボル・任意戦略への一般化
- fallback ロジックの大幅な見直し
- TradingView UI 全面変更への包括対応

## 変更・追加・削除するファイル

### 更新

- `src/core/backtest.js`
  - Strategy Tester 起動確認の強化
  - internal API / DOM metrics 読み取り改善
  - 待機・再試行条件の見直し
  - 失敗理由の構造化
- `tests/backtest.test.js`
  - result shape / tester reason / fallback 条件のテスト追加・更新
- `tests/e2e.backtest.test.js`
  - 実機時の戻り値整合性確認を強化

### 条件付き更新

- `src/core/pine.js`
  - strategy attach 状態確認や待機 helper が必要な場合のみ
- `README.md`
  - 戻り値の意味が変わる場合のみ最小限更新

### 追加 / 削除

- 原則なし

## 実装内容と影響範囲

### A. Strategy Tester 起動確認の強化

`openStrategyTester()` の成功条件を「クリックできた」ではなく「tester 領域が実際に開いた」へ寄せる。

影響範囲:

- `runNvdaMaBacktest()` の成功/失敗分岐
- `tester_reason` の意味付け

### B. metrics 読み取り経路の改善

internal API と DOM の両方で現 UI / 現内部構造に依存しすぎない探索へ広げる。

影響範囲:

- `metrics`
- `tester_available`
- `fallback_metrics` に落ちる条件

### C. 待機・再試行ロジックの改善

固定 wait に加えて、表示状態やデータ状態ベースの停止条件を入れる。

影響範囲:

- backtest 実行時間
- metrics 取得成功率
- e2e 安定性

### D. 失敗理由の明確化

「strategy 未適用」「tester 未表示」「metrics 読み取り失敗」を区別して返す。

影響範囲:

- CLI / MCP の結果解釈
- テスト期待値
- README の必要差分

## テスト方針（RED → GREEN → REFACTOR）

### RED

- [ ] `tests/backtest.test.js` に tester を開けない場合の失敗理由テストを追加する
- [ ] `tests/backtest.test.js` に internal API / DOM の両方で読めない場合の reason テストを追加する
- [ ] `tests/backtest.test.js` に fallback が存在しても root cause を保持するテストを追加する
- [ ] `tests/e2e.backtest.test.js` に `tester_available` / `tester_reason` / `fallback_metrics` の整合性確認を追加する

### GREEN

- [ ] `src/core/backtest.js` の Strategy Tester 起動確認を修正する
- [ ] `src/core/backtest.js` の internal API metrics 読み取りを拡張する
- [ ] `src/core/backtest.js` の DOM metrics 読み取りを補強する
- [ ] `src/core/backtest.js` の待機・再試行条件を見直す
- [ ] 必要な場合のみ `src/core/pine.js` に attach/待機 helper を追加する

### REFACTOR

- [ ] tester 起動確認・metrics 読み取り・状態判定を小関数へ整理する
- [ ] reason 文字列と分岐を読みやすく統一する
- [ ] テスト fixture の重複を整理する

## 検証コマンド

- `npm test`
- `npm run test:e2e`
- `npm run test:all`

## リスク / 注意点

- TradingView Desktop の internal API は非公開で変更に弱い
- DOM セレクタは UI 更新や言語設定差分で再度壊れる可能性がある
- wait を増やしすぎると backtest 実行時間が悪化する
- e2e は CDP 接続先状態に依存し、環境差で不安定になりうる

## 完了条件

- 「バックテスト結果が見れない」問題について、少なくとも以下を結果で判別できる
  - tester を開けない
  - tester は開けるが metrics を読めない
  - fallback へ退避した
- 取得可能な環境では `metrics` が返る
- 既存 unit / e2e テストで再発防止できる

**承認待ち**
