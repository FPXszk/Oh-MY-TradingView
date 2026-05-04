# Entry Quality highest/lowest length 0 修正と 42-pack smoke 計画

## 目的

`emr-entry-quality-focus8-200pack` 派生戦略が compile/apply 成功後に TradingView runtime error `Invalid value of the 'length' argument (0) in the "highest" function` で Strategy Tester metrics を取得できない問題を修正する。修正後、既存の抜粋 42 本 smoke campaign が成功することを確認する。

## 原因

生成 Pine で `breakoutCloseLen <= 0 or close > ta.highest(high, breakoutCloseLen)[1]` のような式を使っており、`breakoutCloseLen=0` の戦略でも `ta.highest(high, 0)` が実行時評価される。Pine の `or` / ternary 周辺では関数呼び出しが安全に short-circuit されないケースがあり、bar 0 で runtime error になる。

## 変更・作成・削除するファイル

- 変更: `scripts/generate-emr-entry-quality-focus8-200pack.py`
  - `ta.highest` / `ta.lowest` / `ta.sma` など length 必須関数に 0 が渡らないよう、safe length 変数を導入する。
  - 無効化用の 0 パラメータはロジック上はそのまま維持し、計算関数に渡す length だけ `math.max(length, 1)` で保護する。
- 変更: `docs/references/pine/emr-entry-quality-focus8-200pack/*.pine`
  - 生成スクリプトを再実行し、199 本の派生 Pine に同じ安全化を反映する。
- 変更: `tests/campaign.test.js` または `tests/strategy-catalog.test.js` 等
  - 必要に応じて、生成 Pine に `ta.highest(..., 0)` を作り得る危険パターンが残らないことをテストする。
- 移動: `docs/exec-plans/active/fix-entry-quality-highest-zero-and-smoke42_20260504_1307.md` → `docs/exec-plans/completed/fix-entry-quality-highest-zero-and-smoke42_20260504_1307.md`
- 削除: なし

## 影響範囲

- 対象は entry-quality 200-pack の生成 Pine と生成元のみ。
- baseline `ema-macd-rsi-sl-baseline` は既存 source を流用しており、今回の修正対象外。
- strategy catalog / presets / campaign の ID・本数・universe は変更しない。
- smoke gate 強化済みのため、metrics が読めない場合は 42本 smoke が失敗する。

## 実装ステップ

- [ ] 生成 Pine の length 0 危険箇所を特定する
  - 確認: `breakoutCloseLen` / `breakoutIntradayLen` / `swingHighLookback` / `compressionLookback` / `recentRunupLookback` / `failedBreakoutLookback` / `pullbackLookback` の使用箇所を確認する。
- [ ] 生成スクリプトを修正する
  - 確認: length 必須関数には safe length だけを渡し、無効化ロジック自体は変えない。
- [ ] 199 本の派生 Pine を再生成する
  - 確認: 既存 ID・ファイル数・campaign 参照が変わらない。
- [ ] 静的検証を追加または実行する
  - 確認: `ta.highest(high, breakoutCloseLen)` など raw length を直接渡す危険パターンが消えている。
- [ ] 既存 unit tests を実行する
  - 確認: `node --test tests/campaign.test.js tests/strategy-catalog.test.js tests/repo-layout.test.js` を実行する。
- [ ] 42本 smoke を実行する
  - 確認: `Night Batch Smoke` 相当の config `config/night_batch/emr-entry-quality-focus8-42pack-smoke-config.json` で smoke を実行し、強化済み smoke gate が metrics 取得まで成功することを確認する。
- [ ] 結果をレビューする
  - 確認: compile 成功だけでなく、42本すべてで Strategy Tester metrics が取得できていることを確認する。
- [ ] plan を completed に移動してコミット・プッシュする
  - 確認: Conventional Commit 形式で main に push する。

## テスト戦略

### RED

- 現状の generated Pine には `ta.highest(high, breakoutCloseLen)` のような raw length 直接渡しが存在し、runtime error の原因になる。

### GREEN

- 生成スクリプト修正と再生成後、raw length 直接渡しが消える。
- unit tests が通る。
- 42本 smoke で `tester_available=true` かつ主要 metrics が取得され、smoke gate が成功する。

### REFACTOR

- safe length の追加だけに留める。戦略ロジックやパラメータ探索範囲は変えない。

## リスク・注意点

- Pine の ternary でも関数評価順に不確実性があるため、関数に渡す引数自体を常に 1 以上にする。
- `math.max(length, 1)` により計算値自体は常に作られるが、`length <= 0` のときの filter 無効化条件は維持するため、戦略意図への影響は最小。
- 42本 smoke は self-hosted TradingView / CDP 接続に依存する。環境要因で実行不能な場合は、local unit / static checks まで完了し、実機 smoke 未実行理由を明記する。
- active plan は `repo-structure-align-and-archive-rules_20260424_2015.md` と `run-night-batch_20260429_2344.md` のみで、今回の Pine runtime error 修正とは直接競合しない。

## 成功基準

- entry-quality 派生 Pine から `ta.highest/ta.lowest` length 0 runtime error の原因が除去される。
- 199 本の派生 Pine が生成元と同期している。
- 42本 smoke が compile/apply 成功だけでなく Strategy Tester metrics 取得まで成功する。
- 変更が main にコミット・プッシュされている。
