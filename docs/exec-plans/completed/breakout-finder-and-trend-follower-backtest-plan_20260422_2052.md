# Breakout Finder / Breakout Trend Follower バックテスト化計画

作成日時: 2026-04-22 20:52 JST

## 目的

`references/pine/Breakout/` に追加された 2 本の Pine スクリプト

- `Breakout Finder.pine`
- `Breakout Trend Follower.pine`

を、この repo の backtest フローで実行できる strategy として取り込み、既存の strongest / finetune 系 breakout 戦略と何が違うかを比較できる状態にする。

## 現状整理

- `Breakout Finder` は `study()` ベースの breakout / breakdown 検出インジケーターで、そのままでは strategy tester を回せない
- `Breakout Trend Follower` も `study()` ベースだが、コメント内に strategy 化の雛形があり、long breakout + swing low stop の設計が明示されている
- この repo では `raw_source` preset で任意 Pine を backtest できる
- ただし `strategy-presets.json` の `raw_source` は現状 `source` 直書き前提で、ファイル参照型の preset は未対応
- 既存の本命群は `donchian_breakout` builder + `RSP/SMA200` + `RSI regime` + hard stop で構成されており、breadth / regime filter を強く使っている

## 変更・確認対象ファイル

### 作成

- `config/backtest/public-library-sources/breakout-finder-strategy.pine`
- `config/backtest/public-library-sources/breakout-trend-follower-strategy.pine`
- 必要なら `docs/reports/breakout-finder-vs-current-breakout.md`
- `docs/exec-plans/active/breakout-finder-and-trend-follower-backtest-plan_20260422_2052.md`

### 変更

- `config/backtest/strategy-presets.json`
- `src/core/preset-validation.js`
- `src/core/backtest.js`
- `tests/preset-validation.test.js`
- `tests/backtest.test.js`

### 参照

- `references/pine/Breakout/Breakout Finder.pine`
- `references/pine/Breakout/Breakout Trend Follower.pine`
- `docs/research/current/main-backtest-current-summary.md`
- `docs/reports/night-batch-public-vs-strongest.md`

## 実装内容と影響範囲

- 2 本の元 Pine を読み解き、repo 実行可能な `strategy()` ソースへ変換する
- `Breakout Finder` は breakout 検知を entry に使い、exit は最低限の opposite signal / pivot-based stop / hard stop のいずれかで閉じる実装案を固める
- `Breakout Trend Follower` は既存ロジックを極力維持しつつ strategy 化する
- `raw_source` preset が `source_path` を参照できるよう最小拡張し、巨大な Pine 文字列を JSON へ直書きせずに管理できるようにする
- 2 本の preset を追加し、repo CLI で backtest 可能にする
- 実装後に、既存 breakout 本命群との違いを短い比較メモにまとめる

## スコープ

### 含む

- 2 本の Pine の strategy 化
- preset 化
- 必要最小限の loader / validation 拡張
- テスト追加
- 比較メモ作成

### 含まない

- 既存 strongest 戦略のロジック変更
- 大規模な preset schema 再設計
- 2 本以外の public strategy 追加

## TDD / テスト戦略

### RED

- `source_path` を持つ `raw_source` preset が現状は扱えないことを表す failing test を追加
- 追加 preset が validation を通ることを表す failing test を追加

### GREEN

- `source_path` ロード対応を最小差分で追加
- strategy 化した 2 本の Pine と preset を追加

### REFACTOR

- raw_source 周辺の分岐だけを軽く整理し、重複があれば最小限で吸収

## 検証コマンド候補

- `node --test tests/preset-validation.test.js tests/backtest.test.js`
- 必要なら `node --test tests/pine.analyze.test.js`
- 必要なら `tv backtest preset <new-preset-id> --symbol NVDA`
- `git status --short`

## リスク / 注意点

- `Breakout Finder` は元が signal indicator なので、exit 設計を勝手に複雑化しすぎない
- 元 Pine が v4 なので、strategy 化で compile 互換性に注意が必要
- `source_path` 対応は raw_source 全体へ影響するため、既存 preset の挙動を壊さないようテストで固定する
- 2 本の見た目の強さと、既存 strongest の安定性は別問題なので、比較メモでは execution と performance を分けて書く

## 実装ステップ

- [ ] 2 本の Pine の entry / exit / filter / stop の意味を整理する
- [ ] RED: `raw_source` の `source_path` 対応と新 preset 検証に関する failing test を追加する
- [ ] GREEN: loader / validation を拡張して `source_path` を扱えるようにする
- [ ] 2 本の strategy Pine を `config/backtest/public-library-sources/` に追加する
- [ ] `config/backtest/strategy-presets.json` に新 preset を追加する
- [ ] テストを通す
- [ ] 既存 breakout 本命群との差分を比較メモにまとめる
- [ ] plan を `completed` に移して commit / push する

## 完了条件

- 2 本が repo の preset backtest 対象として呼べる
- テストが通る
- 「この 2 本は何者か」「既存本命と何が違うか」を比較して説明できる
- 変更が今回の対象差分に限定されている
