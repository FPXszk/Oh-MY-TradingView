# 実行計画: Breakout Deep Dive Round4 (20260405_0027)

- ステータス: COMPLETED
- 既存 active plan: なし
- 方針:
  - **long-only 固定**
  - **Mag7 で全候補を実行し、上位のみ別ユニバースで再確認**
  - **breakout 系を中心に、exit / stop / regime の差分を比較可能な形で約20候補へ拡張**

## 直近の作業文脈

- round2 / round3 では **breakout family が強い** ことが確認されていた
- 特に `donchian-breakout`、`donchian-breakout-55-20`、`keltner-breakout` が有力候補だった
- round2 の改善候補には **exit の詰め** と **損失抑制ルール追加** が明示されていた
- round3 では `SPY > 200SMA` / `RSP > 200SMA` フィルタを実装し、`donchian-breakout-55-20-baseline`、`donchian-breakout-55-20-spy-filter`、`keltner-breakout-atr-trail` などを評価した
- 実験運用は **preset-driven + session artifact runner** 前提で、公開 CLI / MCP は引き続き `nvda-ma` 固定

## 問題設定とアプローチ

### 問題設定

既存ラウンドで breakout 系の優位は見えた一方、改善余地は **entry よりも exit / loss suppression** に集中している。  
そのため round4 では、breakout 優位を前提にしつつ **比較軸を絞った約20候補** を設計し、Mag7 上で横並び評価できる状態を作る。

### アプローチ

1. 大きな新フレームワークは導入せず、**既存 preset / builder / batch runner を最小拡張** する
2. 比較軸は以下に限定する
   - breakout family (`donchian`, `keltner`, breakout + trend filter)
   - exit variation (baseline / ATR trail / channel exit / 2σ exit)
   - loss suppression (hard stop / ATR stop / regime filter)
   - position behavior (`no averaging down` はまず現行挙動確認)
3. 実行順は
   - Mag7 で round4 全候補
   - 上位 3〜5 戦略のみ alt universe 再検証
   とする

## スコープ

### スコープ内

1. round2 / round3 の research と session log の再確認
2. round4 用の **約20候補** の設計と preset 化
3. breakout 系向け exit / stop / filter の追加または再利用
4. 必要最小限の preset schema / builder 拡張
5. session artifact runner 前提の batch 実行
6. Mag7 実行と alt universe 再確認
7. raw / summary / session log / docs 導線の更新
8. 既存テストコマンドによる検証

### スコープ外

- short 戦略の追加
- 公開 CLI / MCP に round4 全機能を載せること
- 大規模な backtest engine の再設計
- 新 universe ファイルの大量追加
- round1〜3 の評価軸そのものの作り直し
- 手数料 / slippage / tax の精密モデリング

## 変更・作成・参照するファイル

### 参照

- `docs/DOCUMENTATION_SYSTEM.md`
- `docs/research/mag7-backtest-results-round2_2015_2025.md`
- `docs/research/multi-universe-backtest-results-round3_2015_2025.md`
- `docs/research/multi-universe-strategy-shortlist-round3_2015_2025.md`
- `docs/working-memory/session-logs/mag7-backtest-session-summary_20260404_1252.md`
- `docs/working-memory/session-logs/multi-universe-backtest-session-summary_20260404_1345.md`
- `config/backtest/strategy-presets.json`
- `config/backtest/universes/mag7.json`
- `config/backtest/universes/sp500-top10-point-in-time.json`
- `config/backtest/universes/mega-cap-ex-nvda.json`
- `package.json`
- round3 実行に使った session artifact runner / batch runner 関連コード
- strategy builder / backtest engine / 既存テスト一式

### 更新候補

- `config/backtest/strategy-presets.json`
- breakout 系 builder / preset 変換ロジックの実装ファイル
- batch runner / preset validation 関連ファイル
- breakout / risk management / exit ルールのテストファイル
- `docs/DOCUMENTATION_SYSTEM.md`
- `README.md`（導線の更新が必要な場合のみ）

### 新規作成候補

- `docs/research/mag7-backtest-results-round4_2015_2025.md`
- `docs/research/multi-universe-backtest-results-round4_2015_2025.md`
- `docs/working-memory/session-logs/breakout-deep-dive-round4_20260405_0027.md`
- round4 用の session artifact 用補助ファイル（必要な場合のみ）
- round4 専用テストファイル（必要な場合のみ）

### 削除

- なし

## round4 で試す戦略構造（約20候補）

> 比較可能性を優先し、family を絞って exit / stop / regime を系統的に振る。

### A. Donchian 55/20 系（8候補）

1. `donchian-55-20-baseline`
2. `donchian-55-20-spy-filter`
3. `donchian-55-20-rsp-filter`
4. `donchian-55-20-atr-trail`
5. `donchian-55-20-hard-stop-8pct`
6. `donchian-55-20-hard-stop-atr2`
7. `donchian-55-20-2sigma-exit`
8. `donchian-55-20-no-avg-down`

### B. Donchian 20/10 系（4候補）

9. `donchian-20-10-baseline`
10. `donchian-20-10-hard-stop-8pct`
11. `donchian-20-10-atr-trail`
12. `donchian-20-10-2sigma-exit`

### C. Keltner 系（4候補）

13. `keltner-breakout-baseline`
14. `keltner-breakout-atr-trail`
15. `keltner-breakout-hard-stop-atr2`
16. `keltner-breakout-2sigma-exit`

### D. Breakout + guard 系（4候補）

17. `donchian-55-20-spy-filter-hard-stop`
18. `donchian-55-20-rsp-filter-atr-trail`
19. `keltner-breakout-spy-filter`
20. `breakout-bollinger-2sigma-exit`

### 追加ルールの具体化方針

- `no averaging down`
  - まず既存 engine が買い増し前提かを確認する
  - 既に平均ナンピンが起きないなら、新仕様追加ではなく **同値確認テスト** に留める
- `stop loss`
  - `% hard stop` と `ATR stop` の 2 系統に限定する
- `2σ exit`
  - **Bollinger 上限到達で exit** を基本案とし、entry 側ではなく **exit variation** として扱う

### alt universe 再検証対象

Mag7 実行後の上位 3〜5 戦略のみ、以下で再検証する。

- `config/backtest/universes/sp500-top10-point-in-time.json`
- `config/backtest/universes/mega-cap-ex-nvda.json`

## テスト戦略（RED → GREEN → REFACTOR）

### RED

- round4 preset / builder / exit ルールに対する failing test を先に追加する
- 観点:
  - preset validation
  - builder mapping
  - hard stop / ATR trail / 2σ exit / regime filter の変換
  - long-only 維持
  - `no averaging down` の現行挙動確認

### GREEN

- preset / builder / engine を必要最小限だけ修正してテストを通す
- session artifact runner で round4 preset 群が処理できる状態まで整える

### REFACTOR

- preset 命名、共通化、重複削減を整理する
- round1〜3 互換を崩さないように責務を薄く保つ

### カバレッジ方針

- repo 本体コードを触る場合は、新規変更箇所 80% 以上を目標にする
- docs / preset 中心の変更では既存コマンドの正常性確認を優先する

## 検証コマンド

- `npm test`
- `npm run test:e2e`
- `npm run test:all`

## リスク

1. `2σ exit` の定義が曖昧だと比較不能になる
2. `no averaging down` が既存仕様ですでに満たされている可能性がある
3. 候補数を増やしすぎると解釈性が下がる
4. batch 実行は session artifact runner 依存なので、再現手順を docs に残す必要がある
5. Mag7 最適化に寄り過ぎると一般性を見誤る

## チェックボックス形式の実装ステップ

### Phase 0: 計画確定

- [ ] round2 / round3 の研究結果と session log を再確認し、round4 の比較軸を固定する
- [ ] breakout preset / builder / batch runner の実装位置を特定する
- [ ] `no averaging down` の現行挙動を確認する
- [ ] round4 候補 20 本の正式 ID と差分軸を確定する

### Phase 1: RED

- [ ] round4 preset validation の failing test を追加する
- [ ] exit / stop / filter の builder mapping test を追加する
- [ ] `2σ exit` と `no averaging down` の挙動確認 test を追加する

### Phase 2: GREEN

- [ ] `config/backtest/strategy-presets.json` に round4 候補を追加する
- [ ] 必要最小限の preset schema / builder / runner 拡張を実装する
- [ ] round4 batch 実行が可能な状態にする

### Phase 3: REFACTOR

- [ ] 命名・共通化・重複削減を行う
- [ ] round1〜3 互換を確認する

### Phase 4: 検証と実行

- [ ] `npm test` を実行する
- [ ] `npm run test:e2e` を実行する
- [ ] `npm run test:all` を実行する
- [ ] session artifact runner で Mag7 に対して round4 を実行する
- [ ] 上位 3〜5 戦略を alt universe で再実行する

### Phase 5: 記録

- [ ] `docs/research/mag7-backtest-results-round4_2015_2025.md` を作成する
- [ ] `docs/research/multi-universe-backtest-results-round4_2015_2025.md` を作成する
- [ ] session log と docs 導線を更新する

## ユーザー承認ゲート

この plan は **PLAN 段階** であり、まだ実装を開始しない。  
以下の方針についてユーザー承認を得るまで IMPLEMENT へ進まない。

1. breakout 深掘りを Donchian / Keltner 中心で約20候補に絞ること
2. `2σ exit` を **exit variation** として扱うこと
3. `no averaging down` は先に現行挙動を確認し、必要時のみ仕様追加すること
4. Mag7 全件 → 上位のみ alt universe 再確認の二段階評価で進めること
5. session artifact runner 前提で round4 を進めること
