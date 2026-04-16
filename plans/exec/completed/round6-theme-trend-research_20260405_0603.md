# 実行計画: Round6 Theme Trend Research (20260405_0603)

- ステータス: COMPLETED
- 既存 active plan: なし
- 方針:
  - **long-only 固定**
  - **直近 round4 / round5 の breakout 勝ち筋を土台に、新規約10候補へ絞る**
  - **Mag7 で全候補を実行し、上位のみ non-NVDA universe で再確認**
  - **テーマ投資の評価軸は stock-themes.com の外形観察と既存 research docs を組み合わせて定義する**
  - **公開 CLI / MCP (`nvda-ma`) は変更せず、research runner と docs 更新に閉じる**

## 直近の作業文脈

- round4 では breakout deep dive を実施し、`donchian-20-10-hard-stop-8pct` が Mag7 / alt universe の両方で最良になった
- round5 では breakout + RSI を追加検証し、**Mag7 最適は `donchian-55-20` 系、alt 最適は `donchian-20-10-hard-stop` 系** という二層構造が見えた
- 既存 research docs には round1〜5 の shortlist / results / regime 候補が蓄積されている
- 実験運用は **preset-driven + session artifact runner** 前提で、公開 CLI / MCP は引き続き `nvda-ma` 固定

## 問題設定とアプローチ

### 問題設定

round5 までで breakout family の主導権はかなり見えたが、次に必要なのは **「どの戦略がテーマの盛り上がり局面に強いか」** を切り出す比較軸である。  
ユーザーは、ニュース・思惑・セクターローテーションで盛り上がるテーマを追う **トレンドフォロー型テーマ投資** を検討しており、既存の price breakout 優位をそのままテーマ投資へ接続する判断基準が欲しい。

そのため round6 では、

1. 直近 session log / research docs から未検証論点を回収する
2. `stock-themes.com` の UI / 文言 /表示指標から、**テーマの盛り上がりをどう見抜いていそうか** を外形観察ベースで整理する
3. その観察をもとに、既存 runner で再現可能な **テーマ投資向け評価軸** を定義する
4. 既存 breakout / RSI family の延長で **新規約10戦略** を設計し、Mag7 → alt の順で再試行する

### アプローチ

1. 大きな新フレームワークは導入せず、**既存 preset / validation / research runner を最小拡張** する
2. `stock-themes.com` はスクレイピングや内部仕様断定ではなく、**可視化されている期間別騰落率 / ランク / チャート / マップ分類 / dip alert** から解釈する
3. テーマ投資の判断基準は、まず **価格と地合い proxy で再現可能な最小モデル** に落とす
4. 候補は約10本に絞り、実行順は固定する
   - Mag7 で round6 全候補
   - 上位 5〜6 戦略を `sp500-top10-point-in-time` / `mega-cap-ex-nvda` で再検証
5. summary docs では **テーマの盛り上がり検出軸** と **non-NVDA 再現性** の両方を解釈する

## スコープ

### スコープ内

1. round3 / round4 / round5 の exec-plan・session log・research docs の再確認
2. `stock-themes.com` の外形観察と仮説整理
3. テーマ投資向けの評価軸の設計
4. round6 用の strategy shortlist（約10本）の設計と preset 化
5. 必要最小限の preset schema / builder / helper 拡張
6. Mag7 実行と alt universe 再確認
7. raw / summary / session log / docs 導線の更新
8. 既存テストコマンドによる検証

### スコープ外

- `stock-themes.com` のスクレイピング / 逆解析 / 内部ロジック断定
- 公開 CLI / MCP の theme 対応
- short 戦略
- intraday 化 / multi-timeframe 化
- ニュース NLP / SNS sentiment の本格実装
- 新規データ vendor 導入
- backtest engine の全面再設計

## 変更・作成・参照するファイル

### 参照

- `docs/research/mag7-strategy-shortlist_2015_2025.md`
- `docs/research/mag7-strategy-shortlist-round2_2015_2025.md`
- `docs/research/market-regime-candidates-round3_2015_2025.md`
- `docs/research/multi-universe-strategy-shortlist-round3_2015_2025.md`
- `docs/research/mag7-backtest-results-round5_2015_2025.md`
- `docs/research/multi-universe-backtest-results-round5_2015_2025.md`
- `docs/working-memory/session-logs/mag7-backtest-session-summary_20260404_1252.md`
- `docs/working-memory/session-logs/breakout-deep-dive-round4_20260405_0027.md`
- `docs/working-memory/session-logs/round5-breakout-rsi_20260405_1201.md`
- `config/backtest/strategy-presets.json`
- `config/backtest/universes/mag7.json`
- `config/backtest/universes/sp500-top10-point-in-time.json`
- `config/backtest/universes/mega-cap-ex-nvda.json`
- `src/core/research-backtest.js`
- `src/core/preset-validation.js`
- `tests/backtest.test.js`
- `tests/preset-validation.test.js`
- `docs/DOCUMENTATION_SYSTEM.md`
- `README.md`
- `package.json`

### 更新候補

- `config/backtest/strategy-presets.json`
- `src/core/research-backtest.js`
- `src/core/preset-validation.js`
- `tests/backtest.test.js`
- `tests/preset-validation.test.js`
- `docs/DOCUMENTATION_SYSTEM.md`
- `README.md`（研究導線の更新が必要な場合のみ）

### 新規作成候補

- `docs/research/theme-signal-observation-round6_2015_2025.md`
- `docs/research/theme-strategy-shortlist-round6_2015_2025.md`
- `docs/research/theme-backtest-results-round6_2015_2025.md`
- `docs/research/theme-backtest-results-round6-alt_2015_2025.md`
- `docs/references/backtests/round6-theme-mag7_20260405.json`
- `docs/references/backtests/round6-theme-mag7_20260405.summary.json`
- `docs/references/backtests/round6-theme-alt_20260405.json`
- `docs/references/backtests/round6-theme-alt_20260405.summary.json`
- `docs/working-memory/session-logs/round6-theme-trend_20260405_0603.md`

### 削除

- なし

## stock-themes.com から得る観察軸

> 内部仕様の断定ではなく、UI と文言から読み取れる外形的な評価軸として扱う。

### 明示的に見えている要素

1. 期間別のテーマ騰落率  
   - `日中`, `1D`, `5D`, `10D`, `1M`, `2M`, `3M`, `6M`, `1Y`
2. chart mode / rank mode  
   - リターン推移と順位変化の両方を見せている
3. watchlist / custom themes  
   - ユーザーが継続監視する前提がある
4. dip alert  
   - 強いテーマの押し目監視という思想が見える
5. map filter  
   - `sector`, `style`, `commodity`, `rate`
6. サイト文言  
   - 「テーマ別騰落率で資金の流れを可視化」
   - 「次の高騰を逃さない」
   - 「資金の流れを読み、投資判断をサポート」

### round6 で扱う仮説的な評価軸

1. **heat**: 直近期間の強さ
2. **acceleration**: 短期順位 / 短期騰落率の加速
3. **persistence**: 1D だけでなく 1M / 3M でも強いか
4. **breadth**: 単一銘柄でなく、関連銘柄群に広がっているか
5. **leader concentration**: 1銘柄依存か、テーマ全体か
6. **reclaim / dip quality**: 強テーマの押し目回復か
7. **macro alignment**: 金利 / commodity / style と整合するか

### この repo で再現する最小モデル

- テーマそのものの外部ランキングは持ち込まず、まずは以下の proxy で代替する
  - 個別銘柄の breakout / hard-stop / RSI regime
  - `SPY` / `RSP` ベースの market regime
  - non-NVDA universe による breadth / concentration の確認
- 将来的な外部テーマデータ統合は検討対象に残すが、round6 では **価格ベース proxy の妥当性確認** を優先する

## round6 で試す戦略候補（約10本）

> round5 の breakout / RSI family を維持しつつ、テーマ投資の評価軸へ接続する差分だけを加える。

### A. 55/20 theme persistence 系（4本）

1. `donchian-55-20-spy-filter-theme-persistence`
   - 55/20 の長期伸長力に、広域 bull 環境を重ねる本線
2. `donchian-55-20-rsp-filter-theme-breadth`
   - breadth 寄り bull 環境に限定し、テーマ全体化を測る
3. `donchian-55-20-rsi14-regime-55-theme-quality`
   - 伸び切りより質重視の quality 改善案
4. `donchian-55-20-spy-filter-hard-stop-8pct-theme-persistence`
   - 長期 breakout に損失抑制を加えた妥協点

### B. 20/10 theme acceleration 系（4本）

5. `donchian-20-10-hard-stop-10pct-theme-acceleration`
   - alt 最適の再現力を theme acceleration 枠の基準にする
6. `donchian-20-10-hard-stop-6pct-theme-fast-rotation`
   - 回転の速いテーマを想定したタイト stop 版
7. `donchian-20-10-spy-filter-hard-stop-8pct-theme-heat`
   - 市場全体 bull 時の熱量追随
8. `donchian-20-10-rsp-filter-hard-stop-8pct-theme-breadth`
   - breadth を伴う rotation だけを許可

### C. breakout + RSI / dip reclaim 系（2本）

9. `donchian-20-10-rsi14-regime-55-hard-stop-8pct-theme-dip-reclaim`
   - 強テーマの押し目後再加速を狙う
10. `rsi2-buy-10-sell-65-long-only-theme-complement`
   - breakout が刺さりにくい銘柄の補完候補として残す

## 候補選定の意図

- **55/20 系**: テーマの継続性・持続性を見る
- **20/10 系**: テーマの短期加速・ローテーションの速さを見る
- **SPY / RSP フィルタ**: 単銘柄トレンドではなく、地合い / breadth によるテーマの広がりを見る
- **hard stop**: 思惑テーマ特有の急落に対して損失抑制を比較する
- **RSI 補完**: breakout 主役を崩さず、押し目回復テーマだけを拾えるかを見る

## alt universe 再検証対象

Mag7 実行後の **上位 5〜6 戦略** のみを以下で再検証する。

- `config/backtest/universes/sp500-top10-point-in-time.json`
- `config/backtest/universes/mega-cap-ex-nvda.json`

### alt で必ず見ること

1. Mag7 だけでなく alt でも利益が残るか
2. `mega-cap-ex-nvda` でも残るか
3. `sp500-top10-point-in-time` で breadth があるか
4. 55/20 の persistence と 20/10 の acceleration の役割分担が続くか
5. RSI 補完が breakout 非優位銘柄で機能するか

## テスト戦略（RED → GREEN → REFACTOR）

### RED

- round6 preset / helper / theme proxy 変換に対する failing test を先に追加する
- 観点:
  - preset validation
  - strategy source generation
  - regime / RSI / stop-loss の組み合わせ
  - round5 preset 互換維持
  - theme 系 preset 命名と差分が正しく表現されること

### GREEN

- preset schema / builder / helper を **必要最小限だけ** 拡張してテストを通す
- round4 / round5 既存 preset を壊さないことを確認する
- round6 preset 群が research runner で処理できる状態にする

### REFACTOR

- theme proxy 判定を helper 化し、`research-backtest.js` の分岐肥大化を防ぐ
- validation rule の重複を減らす
- round5 との差分が読みやすい naming / structure に整理する

### カバレッジ方針

- 新規変更箇所で **80%以上** を目標
- docs 変更だけでなく、preset / runner / validation の差分に unit test を持つ

## 検証コマンド

- `npm test`
- `npm run test:e2e`
- `npm run test:all`

## リスク

1. テーマ情報の元データが repo 内に無いため、proxy が弱いと「テーマ投資」ではなく単なる breakout 比較に寄る
2. `stock-themes.com` の解釈を広げすぎると過剰推測になる
3. 候補数を増やしすぎると解釈不能になるため、約10本を超えないように制御が必要
4. theme proxy を実装しすぎると research runner の責務が膨らむ
5. Mag7 最適化に寄り過ぎると alt で失速し、テーマ軸の一般性を見誤る

## チェックボックス形式の実装ステップ

### Phase 0: 文脈復元

- [ ] round3 / round4 / round5 の exec-plan・session log・research docs を再読する
- [ ] round5 の勝ち筋 / 補完枠 / NVDA依存論点を比較メモにまとめる
- [ ] `docs/exec-plans/active/` に競合 plan がないことを確認する

### Phase 1: テーマ投資フレーム整理

- [ ] `stock-themes.com` の外形観察結果を整理する
- [ ] テーマの盛り上がり検出軸を `heat / acceleration / persistence / breadth / dip quality` に分解する
- [ ] この repo で再現可能な最小 proxy を定義する

### Phase 2: RED

- [ ] `tests/preset-validation.test.js` に round6 preset の failing test を追加する
- [ ] `tests/backtest.test.js` に theme proxy / builder mapping の failing test を追加する

### Phase 3: GREEN

- [ ] `config/backtest/strategy-presets.json` に round6 候補を追加する
- [ ] `src/core/preset-validation.js` に round6 preset の最小 validation を追加する
- [ ] `src/core/research-backtest.js` に必要最小限の helper / mapping を追加する

### Phase 4: REFACTOR

- [ ] helper 化と命名整理で分岐の複雑化を抑える
- [ ] round5 以前との互換を崩していないか確認する

### Phase 5: 実行と文書化

- [ ] Mag7 で round6 全候補を実行する
- [ ] 上位 5〜6 戦略を alt universe で再実行する
- [ ] `docs/research/theme-signal-observation-round6_2015_2025.md` を作成する
- [ ] `docs/research/theme-strategy-shortlist-round6_2015_2025.md` を作成する
- [ ] `docs/research/theme-backtest-results-round6_2015_2025.md` を作成する
- [ ] `docs/research/theme-backtest-results-round6-alt_2015_2025.md` を作成する
- [ ] `docs/DOCUMENTATION_SYSTEM.md` に導線を追加する
- [ ] `docs/working-memory/session-logs/round6-theme-trend_20260405_0603.md` に判断経緯を残す

### Phase 6: 最終検証

- [ ] `npm test` を通す
- [ ] `npm run test:e2e` を通す
- [ ] `npm run test:all` を通す
- [ ] Round6 summary にテーマ軸と non-NVDA 解釈が明示されていることを確認する

## ユーザー承認ゲート

この plan は **PLAN 段階** であり、まだ実装を開始しない。  
以下の方針についてユーザー承認を得るまで IMPLEMENT へ進まない。

1. round6 は **breakout / RSI family を維持したまま、テーマ投資の評価軸を price proxy で近似** すること
2. 候補は **約10本** に絞り、まず Mag7 で全件、その後 alt universe に上位のみ送ること
3. `stock-themes.com` は **外形観察ベース** で整理し、内部仕様は断定しないこと
