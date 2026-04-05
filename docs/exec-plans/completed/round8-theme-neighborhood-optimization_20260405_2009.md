# 実行計画: Round8 Theme Neighborhood Optimization (20260405_2009)

- ステータス: COMPLETED
- 既存 active plan: なし
- 前提:
  - round7 完了 commit: `e638f7d893c711d5c5ea368ae83ddaa56deee866`
  - round7 session log は保持し、round8 は別 session log を新規作成する
- 主軸は **総合的に見て強かった top7 戦略の周辺最適化**
- ガードレール:
  - **long-only 固定**
  - **公開 CLI / MCP (`nvda-ma`) は変更しない**
  - **既存 builder family を優先し、大きな実装追加は避ける**

## 1. round8 の問題設定

round7 では、総合的に見て次の 7 本が強かった。

1. `donchian-55-20-rsp-filter-rsi14-regime-45-theme-breadth-early`
2. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback`
3. `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict`
4. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-6pct-theme-breadth-quality`
5. `donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-6pct-theme-quality-strict`
6. `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-8pct-theme-acceleration-balanced`
7. `donchian-20-10-spy-filter-rsi14-regime-45-hard-stop-10pct-theme-acceleration-reentry`

round8 ではこの 7 本を置き換える新系統を探すのではなく、  
**55/20 主軸を維持したまま、threshold / stop / filter の近傍だけを動かして局所最適を探す**。

確認したい論点は次の 7 点。

1. `breadth-early` は **早すぎず遅すぎない entry 閾値** がどこか
2. `deep-pullback` は **stop 幅と regime 厳しさ** のどこが最も robust か
3. `quality-strict` は **strict quality を維持しつつ alt で残る厳しさ** がどこか
4. `breadth-quality` は **guard を保ったまま early 側へ寄せられるか**
5. `quality-strict-stop` は **stop 幅と RSI 閾値のどこが PF / DD の最適点か**
6. `acceleration-balanced` は **stop 幅と regime 閾値のどこまで 55/20 に近づけるか**
7. `acceleration-reentry` は **reentry 性を残したまま過度なノイズを減らせるか**

## 2. scope / out-of-scope

### scope

- round7 の総合上位7戦略の近傍候補 10〜12 本を preset として設計する
- `config/backtest/strategy-presets.json` と既存 test を最小差分で更新する
- round8 用 observation / shortlist / Mag7 結果 / alt 結果 / session log を新規作成する
- round7 と round8 の比較観点を docs 上で明文化する

### out-of-scope

- 新 builder family の追加
- 公開 CLI / MCP の変更
- short 戦略、intraday 化、multi-timeframe 化
- 外部データ取得方法の拡張
- round7 の結論や session log の上書き

## 3. 参照 / 更新 / 新規作成ファイル一覧

### 参照

- `docs/exec-plans/completed/round7-theme-trend-research_20260405_0815.md`
- `docs/working-memory/session-logs/round7-theme-trend_20260405_0815.md`
- `docs/research/theme-backtest-results-round7_2015_2025.md`
- `docs/research/theme-backtest-results-round7-alt_2015_2025.md`
- `docs/research/theme-strategy-shortlist-round7_2015_2025.md`
- `docs/research/theme-signal-observation-round7_2015_2025.md`
- `docs/references/backtests/round7-theme-mag7_20260405.summary.json`
- `docs/references/backtests/round7-theme-alt_20260405.summary.json`
- `config/backtest/strategy-presets.json`
- `tests/backtest.test.js`
- `tests/preset-validation.test.js`
- `package.json`
- `docs/DOCUMENTATION_SYSTEM.md`

### 更新

- `config/backtest/strategy-presets.json`
- `tests/backtest.test.js`
- `tests/preset-validation.test.js`
- `docs/DOCUMENTATION_SYSTEM.md`（導線追加が必要な場合のみ）

### 新規作成

- `docs/research/theme-signal-observation-round8_2015_2025.md`
- `docs/research/theme-strategy-shortlist-round8_2015_2025.md`
- `docs/research/theme-backtest-results-round8_2015_2025.md`
- `docs/research/theme-backtest-results-round8-alt_2015_2025.md`
- `docs/working-memory/session-logs/round8-theme-trend_YYYYMMDD_HHMM.md`
- `docs/references/backtests/round8-theme-mag7_YYYYMMDD.json`
- `docs/references/backtests/round8-theme-mag7_YYYYMMDD.summary.json`
- `docs/references/backtests/round8-theme-alt_YYYYMMDD.json`
- `docs/references/backtests/round8-theme-alt_YYYYMMDD.summary.json`

## 4. 追加で試す候補戦略案

> 方針: **top3 の近傍探索のみ**。既存 builder family と metadata の範囲で表現する。

| priority | id | 拡張元 | 変更点 | 狙い |
|---|---|---|---|---|
| 1 | `donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier` | breadth-early | regime 45 → 40 | breadth を保ったままさらに早い entry を試す |
| 2 | `donchian-55-20-rsp-filter-rsi14-regime-50-theme-breadth-balanced` | breadth-early | regime 45 → 50 | early と quality の中間点を探る |
| 3 | `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-early-guarded` | breadth-early | 6% hard stop 追加 | 早め entry の DD 圧縮余地を確認する |
| 4 | `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-quality-early` | breadth-quality | regime 50 → 45 | guard を維持したまま early 側へ寄せる |
| 5 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-6pct-theme-breadth-quality-strict` | breadth-quality | regime 50 → 55 | breadth-quality の quality 強化余地を確認する |
| 6 | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-10pct-theme-deep-pullback-earlier` | deep-pullback | regime 55 → 50 | 深い押しを少し早く拾う |
| 7 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | deep-pullback | stop 10% → 8% | alt で DD を削っても本線性が残るかを見る |
| 8 | `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced` | quality-strict | regime 60 → 55 | Mag7 の強さを保ったまま alt での残り方を探る |
| 9 | `donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-6pct-theme-quality-strict-guarded` | quality-strict | strict 60 + 6% stop | strict quality に guard を重ねた場合の PF/DD を確認する |
| 10 | `donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-8pct-theme-quality-strict-stop-wide` | quality-strict-stop | stop 6% → 8% | quality-strict-stop の stop 幅最適化を試す |
| 11 | `donchian-20-10-spy-filter-rsi14-regime-55-hard-stop-8pct-theme-acceleration-balanced-strict` | acceleration-balanced | regime 50 → 55 | balanced acceleration をより quality 寄りにする |
| 12 | `donchian-20-10-spy-filter-rsi14-regime-45-hard-stop-8pct-theme-acceleration-reentry-tight` | acceleration-reentry | stop 10% → 8% | reentry 性を保ったまま DD を圧縮できるかを見る |

### family ごとの拡張意図

- **breadth-early**:
  - early をさらに前に倒す
  - quality 寄りに戻す
  - hard stop を足して guard する
- **breadth-quality**:
  - guard を維持したまま early 側へ寄せる
  - quality 閾値を上げて breadth 本線の洗練度を確認する
- **deep-pullback**:
  - regime の早期化
  - stop 幅の tighten
- **quality-strict**:
  - strictness を少し緩める
  - strict のまま stop を足す
- **quality-strict-stop**:
  - 既存の 6% stop を広げ、quality 側の最適 stop 幅を確認する
- **acceleration-balanced**:
  - regime を少し strict にして、20/10 補完枠の質を改善する
- **acceleration-reentry**:
  - stop を少し tighten して、reentry ノイズを減らす

## 5. RED→GREEN→REFACTOR のテスト方針

### RED

- `tests/preset-validation.test.js` に round8 preset 群の validation test を追加し、未定義状態で失敗させる
- `tests/backtest.test.js` に round8 preset 群の source generation / research source inclusion test を追加し、未実装で失敗させる
- 命名規則、`theme_axis`、`theme_notes`、long-only 前提を崩していないことも確認する

### GREEN

- `strategy-presets.json` に round8 候補を追加する
- 既存 `donchian_breakout` / `regime_filter` / `rsi_regime_filter` / `stop_loss` の組み合わせのみで通す
- round7 preset や `nvda-ma` の公開経路に影響を出さない

### REFACTOR

- round7 / round8 の候補定義で重複する test data を整理する
- docs の family 名と theme axis 名の揺れを整える
- 必要なら validation helper の round 依存重複を減らす

### カバレッジ方針

- 新規変更箇所で **80% 以上** を目標にする
- utility / validation は unit test で担保する
- research runner の変更が必要な場合も最小差分に留める

## 6. 検証コマンド

- targeted:
  - `node --test tests/backtest.test.js tests/preset-validation.test.js`
- unit:
  - `npm test`
- e2e:
  - `npm run test:e2e`
- full:
  - `npm run test:all`

## 7. リスク

1. **近傍探索の過学習**
   - round7 top3 に寄せすぎると探索の幅が不足する
2. **差分の動かしすぎ**
   - threshold / stop / filter を同時に動かすと原因分解が難しくなる
3. **Mag7 偏重の再発**
   - strict quality が NVDA / TSLA に強く引っ張られる可能性がある
4. **top7 化による比較複雑化**
   - breadth-quality / quality-strict-stop / acceleration 系を入れることで family 境界が曖昧になりやすい
5. **docs の比較複雑化**
   - round7 と round8 の比較軸を絞らないと結論が読みにくくなる

## 8. 完了条件

- round8 候補 8〜10 本が `config/backtest/strategy-presets.json` に追加されている
- round8 の RED → GREEN → REFACTOR が既存 test 上で確認できる
- round8 の Mag7 / alt summary と research docs が揃っている
- round7 session log は保持され、round8 session log が別ファイルで新規作成されている
- round8 結果から、top7 のどの近傍が次 round に残るかを明文化できている
- `npm test`
- `npm run test:e2e`
- `npm run test:all`
  が通る

## 9. チェックボックス形式の実装ステップ

- [x] round7 の exec-plan / session log / results / shortlist / signal observation / summary json を再読し、top7 の比較軸を固定する
- [x] round8 の探索範囲を `breadth-early` / `deep-pullback` / `quality-strict` / `breadth-quality` / `quality-strict-stop` / `acceleration-balanced` / `acceleration-reentry` の近傍に限定する
- [x] round8 候補 8〜10 本の ID・差分・theme axis を確定する
- [x] `tests/preset-validation.test.js` に round8 preset 群の RED テストを追加する
- [x] `tests/backtest.test.js` に round8 source generation の RED テストを追加する
- [x] `config/backtest/strategy-presets.json` に round8 preset 群を最小差分で追加する
- [x] targeted test を通して GREEN を確認する
- [x] 必要最小限の REFACTOR を行い、重複する test / metadata を整理する
- [x] Mag7 で round8 候補を実行する
- [x] 上位候補のみ alt universe へ送って cross-universe で確認する
- [x] `docs/research` に round8 observation / shortlist / Mag7 / alt の 4 文書を新規作成する
- [x] `docs/working-memory/session-logs/` に round8 session log を新規作成し、round7 からの継続文脈を記録する
- [x] `npm test` / `npm run test:e2e` / `npm run test:all` を実行し、既存挙動を検証する
- [x] round8 の結論として、次 round に残す候補・落とす候補・補完枠を明文化する
