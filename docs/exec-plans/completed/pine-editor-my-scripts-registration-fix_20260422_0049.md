# Pine Editor My Scripts 登録修正計画

作成日時: 2026-04-22 00:49 JST

## 目的

`pine-editor-open-methodology.md` の成功手法に合わせて Pine エディタ開封導線を再確認し、8 本の戦略を TradingView Desktop の My Scripts へ安定して登録できる状態へ戻す。

今回の主眼は次の 3 点。

1. JavaScript 経由で Pine が「ぐるぐる」する再発条件を潰す
2. `save-selected-strategies-to-my-scripts.mjs` が各戦略の source を正しく反映して保存しているかを修正・検証する
3. CDP 上の内部判定だけでなく、人間が見ても Pine エディタが操作可能で、実際にソース差し替えが成功することを成功基準に含める

## 変更・作成・確認対象ファイル

### 変更候補

- `src/core/pine.js`
- `src/core/my-scripts.js`
- `scripts/backtest/save-selected-strategies-to-my-scripts.mjs`
- `tests/my-scripts.test.js`
- 必要なら `tests/e2e.pine-loop.test.js`

### 確認のみ

- `plans/exec/active/pine-editor-open-methodology.md`
- `scripts/backtest/save-public-top3-to-my-scripts.mjs`
- `src/core/backtest.js`

### 運用ファイル

- `docs/exec-plans/active/pine-editor-my-scripts-registration-fix_20260422_0049.md`
- 完了時に `docs/exec-plans/completed/` へ移動

## 現時点の観測

- `pine-editor-open-methodology.md` では、JS `MouseEvent` ではなく `aria-label="Pine"` の座標を求めて CDP `Input.dispatchMouseEvent` を送る方法が成功手法として整理されている
- `src/core/pine.js` の `ensurePineEditorOpen()` は概ねその方針に寄っているが、CDP 失敗時に JS `click()` へフォールバックするため、再び不安定経路へ落ちる余地がある
- `src/core/my-scripts.js` の `saveStrategiesToMyScripts()` は現在 `source` を `setSource()` しておらず、`saveCurrentScript()` だけを呼んでいる
- 既存テスト `tests/my-scripts.test.js` も「保存前に source を反映する」ことを要求しておらず、今回の不具合を捕まえられていない

## 実装内容と影響範囲

- Pine 開封処理を、方法論どおり「CDP クリック成功を優先し、失敗時の扱いを明示化する」方向で最小修正する
- Pine 開封の成功判定を、「Monaco が見つかる」だけでなく「ローディング見た目が収束し、実際に editor 値を書き換えられる」まで引き上げる
- My Scripts 保存フローを、各戦略ごとに `source` 反映と必要な compile/save 手順を通すよう是正する
- 保存スクリプト側は 8 本の対象 ID を順番に処理する現行入口を保ちつつ、内部導線だけを修正する
- public top3 保存導線との重複があれば、後方互換を崩さない最小共通化を検討する

## 実装ステップ

- [ ] `save-public-top3-to-my-scripts.mjs` と `src/core/my-scripts.js` の差分を基に、保存導線の不足手順を確定する
- [ ] RED: `tests/my-scripts.test.js` に「各戦略で source 反映が先に走る」失敗テストを追加する
- [ ] RED: 必要なら Pine 開封失敗時の期待動作を小さく固定するテストを追加する
- [ ] GREEN: `src/core/my-scripts.js` を最小修正し、戦略ごとに source 反映と保存を行う
- [ ] GREEN: `src/core/pine.js` の開封処理を方法論に寄せ、JS クリックへ不用意に落ちないよう整理する
- [ ] REFACTOR: 重複する保存手順やエラーメッセージを整え、既存 public 保存導線との責務を明確にする
- [ ] 検証: 対象ユニットテストを実行し、TradingView Desktop 実機で「ぐるぐるが収束して人間の目でも操作可能に見えること」と「実際に source 差し替えできること」を確認したうえで 8 本登録を再確認する
- [ ] REVIEW: ロジック破綻、過剰複雑化、既存フローへの副作用を点検する
- [ ] COMMIT/PUSH: 承認後、plan を `completed/` へ移して Conventional Commit で commit / push する

## テスト戦略

- RED
  - `saveStrategiesToMyScripts()` が `source` を設定せず保存だけしている現状を失敗テストで固定する
  - 必要に応じて Pine 開封の失敗条件と「開いて見えても編集不能」の状態をテストまたは診断観点で固定する
- GREEN
  - 最小変更で source 反映後に保存でき、Pine エディタの編集可能性を確認できるようにしてテストを通す
- REFACTOR
  - 補助関数の責務整理後も同じテストを通す

## 検証コマンド候補

- `node --test tests/my-scripts.test.js`
- `node --test tests/e2e.pine-loop.test.js`
- `node scripts/backtest/save-selected-strategies-to-my-scripts.mjs donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-6pct-theme-deep-pullback-strict-narrow donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight donchian-60-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-late tv-public-kdj-l2 tv-public-agni-momentum tv-public-gold-hft-hybrid`

## リスクと注意点

- TradingView UI は DOM 依存が強く、CDP クリック座標の前提が崩れると再発する可能性がある
- 「Monaco が存在する」と「人間の目で見て編集可能に見える」がズレる可能性があるため、見た目上のローディング状態と実際の `setSource()` 成功の両方を観測する必要がある
- 保存フローには compile 状態やダイアログ状態の依存があり、単に source を入れるだけでは足りない可能性がある
- 実機確認は TradingView Desktop の接続状態に依存する
- 現在 active な他 plan とは直接の競合は見当たらないが、TradingView 操作系の同時変更とは競合しうる

## 成功基準

- Pine タブ押下後、CDP の内部判定だけでなく、実機画面上でも無限ローディングに見えない
- Pine エディタに対して対象戦略の source を実際に差し替えられる
- 差し替え後の保存導線が 8 本すべてで完走する

## スコープ外

- 8 本以外の戦略一括登録
- Pine エディタ周辺の全面リファクタ
- Public Library 保存フロー全体の作り直し
