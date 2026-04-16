# 実行計画: Round5 Breakout + RSI Research (20260405_1201)

- ステータス: PLAN
- 既存 active plan: なし
- 方針:
  - **long-only 固定**
  - **Mag7 で全候補を実行し、上位のみ non-NVDA universe で再確認**
  - **Round4 の breakout 勝ち筋を主軸に、RSI long-only 案を加えて約20候補を比較**
  - **alt universe で平均純利益がマイナスの戦略は `docs/bad-strategy/` に記録**

## 問題設定とアプローチ

### 問題設定

Round4 では `donchian-20-10-hard-stop-8pct` が Mag7 / alt universe の両方で最良となり、**20/10 系の利益保持力** と **55/20 filter 系の PF / DD 改善** が確認できた。  
一方で、Mag7 上位結果は `NVDA` の寄与が大きく、**「本当に強い戦略なのか、それとも NVDA 収束なのか」** を次ラウンドで明示的に切り分ける必要がある。  
加えて、breakout だけでなく **RSI を使った long-only の regime / mean-reversion 仮説** も小さく検証したい。

### アプローチ

1. 既存の preset-driven research フローを維持し、**小さな schema / runner 拡張** で Round5 を実装する
2. 候補は **breakout 改善 14本 + RSI 系 6本 = 約20本** に絞る
3. 実行順は固定する
   - Mag7 で Round5 全候補
   - 上位 5〜6 戦略を `sp500-top10-point-in-time` / `mega-cap-ex-nvda` で再検証
4. alt universe の `avg_net_profit < 0` 戦略は `docs/bad-strategy/` に蓄積する
5. summary docs では **Mag7 / sp500-top10-point-in-time / mega-cap-ex-nvda** を並べ、NVDA 依存度を解釈する

## スコープ

### スコープ内

1. Round5 用 strategy preset の追加
2. breakout 派生案の比較軸追加（stop / filter / RSI regime）
3. RSI long-only mean-reversion / regime 案の最小実装
4. Mag7 → alt rerun の既存評価フロー維持
5. `docs/bad-strategy/` の新設と記録ルール追加
6. Round5 の research docs / raw artifact / session log 更新
7. preset validation / backtest test の追加更新

### スコープ外

- short 戦略
- backtest engine の全面再設計
- 新 universe の大量追加
- intraday 化 / multi-timeframe 化
- 手数料 / slippage モデルの再設計
- Round4 docs の全面書き換え

## 変更・作成・削除するファイル

### 参照

- `config/backtest/strategy-presets.json`
- `src/core/research-backtest.js`
- `src/core/preset-validation.js`
- `tests/backtest.test.js`
- `tests/preset-validation.test.js`
- `docs/research/mag7-backtest-results-round4_2015_2025.md`
- `docs/research/multi-universe-backtest-results-round4_2015_2025.md`
- `docs/working-memory/session-logs/breakout-deep-dive-round4_20260405_0027.md`
- `docs/DOCUMENTATION_SYSTEM.md`
- `package.json`

### 更新候補

- `config/backtest/strategy-presets.json`
- `src/core/research-backtest.js`
- `src/core/preset-validation.js`
- `tests/backtest.test.js`
- `tests/preset-validation.test.js`
- `docs/DOCUMENTATION_SYSTEM.md`

### 新規作成候補

- `docs/research/mag7-backtest-results-round5_2015_2025.md`
- `docs/research/multi-universe-backtest-results-round5_2015_2025.md`
- `docs/references/backtests/round5-mag7_20260405.json`
- `docs/references/backtests/round5-mag7_20260405.summary.json`
- `docs/references/backtests/round5-alt_20260405.json`
- `docs/references/backtests/round5-alt_20260405.summary.json`
- `docs/bad-strategy/round5-negative-alt-strategies_2015_2025.md`
- `docs/working-memory/session-logs/round5-breakout-rsi_20260405_1201.md`

### 削除

- なし

## Round5 で試す戦略候補（約20本）

> Round4 の勝ち筋を崩さず、差分が読める候補だけに絞る。

### A. Donchian 20/10 改善系（8本）

1. `donchian-20-10-hard-stop-6pct`
2. `donchian-20-10-hard-stop-7pct`
3. `donchian-20-10-hard-stop-8pct-r5`
4. `donchian-20-10-hard-stop-10pct`
5. `donchian-20-10-atr-stop-2`
6. `donchian-20-10-spy-filter-hard-stop-8pct`
7. `donchian-20-10-rsp-filter-hard-stop-8pct`
8. `donchian-20-10-rsi14-regime-55-hard-stop-8pct`

### B. Donchian 55/20 品質改善系（6本）

9. `donchian-55-20-baseline-r5`
10. `donchian-55-20-spy-filter-r5`
11. `donchian-55-20-rsp-filter-r5`
12. `donchian-55-20-spy-filter-hard-stop-8pct-r5`
13. `donchian-55-20-rsp-filter-hard-stop-8pct-r5`
14. `donchian-55-20-rsi14-regime-55-hard-stop-8pct`

### C. Breakout + RSI regime 系（2本）

15. `donchian-20-10-rsi14-regime-50-hard-stop-8pct`
16. `donchian-55-20-rsi14-regime-50-spy-filter`

### D. RSI long-only mean-reversion 系（4本）

17. `rsi2-buy-10-sell-65-long-only`
18. `rsi2-buy-10-sell-70-spy-filter-long-only`
19. `rsi3-buy-15-sell-65-long-only`
20. `rsi5-buy-25-sell-55-long-only`

## 候補選定の意図

- **20/10 系**: Round4 最良系列なので stop 幅 / ATR stop / market filter / RSI regime を比較
- **55/20 系**: 利益最大化より **PF / DD の改善幅** を見る
- **RSI regime**: breakout の entry を殺しすぎず、地合い悪化時を間引けるか確認
- **RSI mean-reversion**: breakout と真逆の long-only 仮説を少数だけ並べ、補完候補かノイズかを判断

## alt universe 再検証対象と bad-strategy 記録

### alt universe 再検証対象

Mag7 実行後の **上位 5〜6 戦略** のみを以下で再検証する。

- `config/backtest/universes/sp500-top10-point-in-time.json`
- `config/backtest/universes/mega-cap-ex-nvda.json`

### bad-strategy docs フォルダ

- 新設パス: `docs/bad-strategy/`
- Round5 記録先: `docs/bad-strategy/round5-negative-alt-strategies_2015_2025.md`

### 記録ルール

以下を満たした戦略を記録する。

- `sp500-top10-point-in-time` または `mega-cap-ex-nvda` のいずれかで
- **`avg_net_profit < 0`**

記録内容:

- strategy id
- 対象 universe
- `avg_net_profit`
- `avg_profit_factor`
- `avg_max_drawdown`
- 短い解釈（例: NVDA依存、filter過剰、mean-reversion が大型株で弱い等）

## non-NVDA 解釈の扱い

Round5 の summary では必ず以下を明示する。

1. **Mag7 → alt でどれだけ利益が残るか**
2. **`mega-cap-ex-nvda` でも残る戦略は何か**
3. **`sp500-top10-point-in-time` で breadth があるか**
4. **20/10 系は利益保持、55/20 系は品質改善という役割分担が続くか**
5. **RSI 系は NVDA を抜いた大型株群でも意味があるか**
6. 各戦略を以下の 3 分類で整理する
   - 非NVDA再現型
   - 品質改善型
   - NVDA依存型

## テスト戦略（RED → GREEN → REFACTOR）

### RED

- Round5 preset を追加する前に failing test を追加する
- 観点:
  - RSI strategy preset validation
  - breakout + RSI regime mapping
  - long-only 制約維持
  - Mag7 上位抽出 → alt rerun のフロー
  - alt negative 戦略の bad-strategy 記録

### GREEN

- preset schema / builder / runner を **必要最小限だけ** 拡張してテストを通す
- Round4 までの既存 preset が壊れないことを確認する
- Round5 preset 群が research runner で処理できる状態にする

### REFACTOR

- strategy type ごとの分岐を整理し、`research-backtest.js` の肥大化を防ぐ
- validation rule の重複を削減する
- bad-strategy 出力処理を小さな helper に分ける

### カバレッジ方針

- 新規変更箇所で **80%以上** を目標
- docs 変更だけでなく、preset / runner / validation の差分に対して unit test を持つ

## 検証コマンド

- `npm test`
- `npm run test:e2e`
- `npm run test:all`

## リスク

1. RSI 系の schema 追加で preset validation が複雑になる
2. breakout と RSI の両対応で runner の分岐が増える
3. Mag7 最適化が強すぎると alt で失速し、候補の多くが NVDA依存になる
4. top-N の切り方を誤ると PF / DD 改善型を alt に送れない
5. bad-strategy 記録基準が曖昧だと docs の解釈がぶれる

## チェックボックス形式の実装ステップ

### Phase 0: 事前整理

- [ ] Round4 の Mag7 / alt docs と session log を再確認する
- [ ] Round5 候補 20本の正式 ID と比較軸を確定する
- [ ] `docs/exec-plans/active/` に競合 plan がないことを再確認する

### Phase 1: RED

- [ ] `tests/preset-validation.test.js` に RSI preset / regime preset の failing test を追加する
- [ ] `tests/backtest.test.js` に Round5 runner / alt rerun / bad-strategy 記録の failing test を追加する

### Phase 2: GREEN

- [ ] `config/backtest/strategy-presets.json` に Round5 候補を追加する
- [ ] `src/core/preset-validation.js` に RSI / regime preset の最小 validation を追加する
- [ ] `src/core/research-backtest.js` に RSI long-only と bad-strategy 記録処理を追加する
- [ ] Mag7 全件 → 上位のみ alt rerun の既存フローを Round5 でも維持する

### Phase 3: REFACTOR

- [ ] 共通処理を小さく抽出し、strategy type 分岐を整理する
- [ ] Round4 以前との互換を崩していないか確認する

### Phase 4: 実行と文書化

- [ ] Mag7 で Round5 全候補を実行する
- [ ] 上位 5〜6 戦略を non-NVDA universe で再検証する
- [ ] alt negative 戦略を `docs/bad-strategy/round5-negative-alt-strategies_2015_2025.md` に記録する
- [ ] `docs/research/mag7-backtest-results-round5_2015_2025.md` を作成する
- [ ] `docs/research/multi-universe-backtest-results-round5_2015_2025.md` を作成する
- [ ] `docs/DOCUMENTATION_SYSTEM.md` に Round5 docs と `docs/bad-strategy/` の導線を追加する
- [ ] `docs/working-memory/session-logs/round5-breakout-rsi_20260405_1201.md` に判断経緯を残す

### Phase 5: 最終検証

- [ ] `npm test` を通す
- [ ] `npm run test:e2e` を通す
- [ ] `npm run test:all` を通す
- [ ] Round5 summary に non-NVDA 解釈が明示されていることを確認する
