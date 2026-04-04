# 実行計画: round3 地合い判定・非NVDAユニバース調査と追加戦略検証 (20260404_1345)

- ステータス: COMPLETED
- 既存 active plan: なし
- 背景:
  - round1 は **10戦略 / 70 run 完走**
  - round2 は **20戦略 / 140 run 完走**
  - 公開 CLI / MCP の backtest 導線は **`nvda-ma` 固定**
  - round1 / round2 の実測は **session artifact runner** で取得
  - round2 の改善候補は `docs/research/mag7-backtest-results-round2_2015_2025.md` に整理済み
- 本 plan の狙い:
  - 前回セッションの記憶を復元しつつ、round2 の改善候補を踏まえて **round3 相当の research + execution** を進める
  - **地合い判定を含む戦略** と **NVDA 依存を外した別ユニバース検証** を同時に扱う
  - 未調査で断定できない論点は先に research task として切り出す

## 1. 問題設定と方針

### 問題設定

現状の結果は `sma-200-trend-filter` を中心に **長期 trend-following の優位** が見えている一方で、評価が **NVDA の寄与に強く引っ張られている**。
そのため round3 では、単純な「Mag7 上での平均成績」だけではなく、以下を評価軸に加える必要がある。

1. **地合いが良い/悪い局面を判定してエントリー制御できるか**
2. **NVDA を除いても再現性があるか**
3. **S&P500 上位10銘柄のような別ユニバースでも上位戦略が崩れないか**
4. **baseline 再評価 + breakout 本命の絞り込み + 損失抑制ルール追加** を同時に進められるか

### 方針

- **本線は round2 と同様に session artifact runner を使った research / execution 継続**
- 公開 CLI / MCP の durable 化は、今回の依頼の主目的ではないため **原則スコープ外**
- ただし round3 実行に最低限必要な durable asset は repo 側に残す
  - strategy preset
  - alt universe 定義
  - research docs
  - raw backtest snapshot
  - session summary
- round3 は次の 3 本柱で進める
  1. **strategy axis**: 改善候補から約10戦略を設計
  2. **regime axis**: 地合い判定方法を複数比較
  3. **universe axis**: NVDA 依存を外した別ユニバース候補を比較

## 2. スコープ内 / スコープ外

### スコープ内

1. 前回 session log / round1 / round2 docs の棚卸し
2. round3 で試す **約10戦略** の設計と優先順位付け
3. **地合い判定方法候補** の比較調査
4. **NVDA を外したユニバース候補** と **銘柄選定方法** の比較調査
5. 必要に応じた `config/backtest/strategy-presets.json` の更新
6. 必要に応じた `config/backtest/universes/` への alt universe 追加
7. session artifact runner による round3 実行
8. raw / research / session log / documentation 導線更新
9. 既存テストコマンドによる検証

### スコープ外

- 公開 CLI / MCP backtest を generic runner 化する本実装
- ポートフォリオ最適化 / 資金配分最適化
- 手数料 / slippage / tax の精密モデル化
- intraday 化
- TradingView 外の大規模データパイプライン構築
- survivorship bias を完全に解消する大規模 point-in-time DB 構築

## 3. 変更・作成・参照するファイル

### 参照

- `docs/working-memory/session-logs/mag7-backtest-session-summary_20260404_1106.md`
- `docs/working-memory/session-logs/mag7-backtest-session-summary_20260404_1252.md`
- `docs/research/mag7-strategy-shortlist-round2_2015_2025.md`
- `docs/research/mag7-backtest-results-round2_2015_2025.md`
- `docs/research/mag7-backtest-results_2015_2025.md`
- `docs/references/backtests/mag7-backtest-results_20260404.json`
- `docs/references/backtests/mag7-backtest-results_round2_20260404.json`
- `config/backtest/strategy-presets.json`
- `config/backtest/universes/mag7.json`
- `src/core/backtest.js`
- `src/cli/commands/backtest.js`
- `src/tools/backtest.js`
- `tests/backtest.test.js`
- `tests/e2e.backtest.test.js`
- `docs/DOCUMENTATION_SYSTEM.md`

### 更新候補

- `config/backtest/strategy-presets.json`
- `docs/DOCUMENTATION_SYSTEM.md`
- `README.md`（導線更新が必要な場合のみ）
- `tests/backtest.test.js`（repo 本体ロジックを触る場合）
- `tests/e2e.backtest.test.js`（repo 本体の実行経路を触る場合）
- `src/core/backtest.js`（公開 backtest ロジックに手を入れる場合のみ）
- `src/cli/commands/backtest.js`（CLI を広げる場合のみ）
- `src/tools/backtest.js`（MCP を広げる場合のみ）

### 新規作成候補

- `docs/research/market-regime-candidates-round3_2015_2025.md`
- `docs/research/universe-selection-candidates-round3_2015_2025.md`
- `docs/research/multi-universe-strategy-shortlist-round3_2015_2025.md`
- `docs/research/multi-universe-backtest-results-round3_2015_2025.md`
- `docs/references/backtests/multi-universe-backtest-results_round3_20260404.json`
- `docs/working-memory/session-logs/multi-universe-backtest-session-summary_20260404_1345.md`
- `config/backtest/universes/sp500-top10-point-in-time.json`
- `config/backtest/universes/sp500-top10-annual-rebalance.json`
- `config/backtest/universes/mega-cap-ex-nvda.json`
- `scripts/dev/round3-batch-runner.mjs`（repo 内に置く判断をした場合のみ）
- `tests/backtest.strategy-config.test.js`（preset / universe の schema 検証が必要なら追加）

### 削除

- なし

## 4. 実装 / 調査内容と影響範囲

### 4.1 セッション記憶の復元と round3 評価軸の固定

- 2つの session summary と round2 result doc を読んで、次回に引き継ぐ判断軸を整理する
- 特に以下を round3 の固定観点にする
  - `sma-200-trend-filter` の DD 抑制
  - `sma-cross-10-50` / `ema-50-trend-filter` の baseline 再評価
  - `keltner-breakout` / `donchian-breakout-55-20` の breakout 詰め
  - NVDA 依存の低減

**影響範囲**
- research doc の前提が統一される
- round3 の戦略選定理由がぶれにくくなる

### 4.2 地合い判定方法の調査・比較

- 既存の `S&P500 > 200SMA` 以外の候補を比較し、実装可否 / TradingView 実行可否 / 期待役割を整理する
- 候補は後述の比較表をベースに research doc 化する

**影響範囲**
- trend-following 系の entry filter / cash filter に使える
- breakout 系にも regime overlay を適用できる

### 4.3 NVDA を外したユニバース候補と銘柄選定方法の調査

- 「当時の S&P500 上位10銘柄」の定義を複数案で比較する
- point-in-time 厳密性と、実行容易性の trade-off を明示する
- universe doc と config を対応づける

**影響範囲**
- round3 の robustness 評価が Mag7 偏重から一段進む
- 以後の round4 以降で使う durable input が残る

### 4.4 round3 の約10戦略の設計

- round2 改善候補から、約10本の実験戦略を定義する
- baseline 再評価と variant 実験を混ぜる
- strategy preset に反映できる粒度まで落とす

**影響範囲**
- 実行対象が明確になる
- raw result と summary の比較がしやすくなる

### 4.5 execution input 整備と batch 実行

- preset と universe を整備する
- session artifact runner 継続を基本に、必要最小限の runner を追加する
- Mag7 と alt universe の spot check / full run のどちらにするかを plan で固定する

**影響範囲**
- raw snapshot が追加される
- round2 → round3 の比較が可能になる

### 4.6 結果整理と durable documentation 化

- round3 の summary / next experiments / rejected ideas / known limitations を docs に残す
- `docs/DOCUMENTATION_SYSTEM.md` から辿れるようにする

**影響範囲**
- 次回セッションで「何をして、何が未了か」を即復元できる

## 5. round3 で試す戦略案（約10件）

以下は **初期候補**。未調査点は research で絞り込む。

| # | strategy_id案 | 位置づけ | 狙い | 実装メモ |
|---|---|---|---|---|
| 1 | `sma-200-trend-filter-atr-stop` | 改善 | 最上位戦略の DD 抑制 | 既存 `price_vs_ma` + ATR stop 追加 |
| 2 | `sma-200-trend-filter-chandelier` | 改善 | 長期 trend を維持しつつ exit 改善 | Chandelier Exit 併用候補 |
| 3 | `sma-cross-10-50-baseline` | baseline 再評価 | round2 上位の再現性確認 | 既存 preset 再使用 |
| 4 | `sma-cross-10-50-regime-filter` | regime 併用 | 地合い悪化時のだまし削減 | SPX or breadth filter 追加 |
| 5 | `ema-50-trend-filter-baseline` | baseline 再評価 | 反応速度と DD のバランス確認 | 既存 preset 再使用 |
| 6 | `ema-50-trend-filter-breakout-confirm` | 改善 | trend filter + breakout の複合化 | entry 条件を追加 |
| 7 | `keltner-breakout-atr-trail` | breakout 本命 | ATR 系 breakout の exit 改善 | 既存 Keltner を詰める |
| 8 | `donchian-breakout-55-20-baseline` | breakout 本命 | 長め breakout の再評価 | 既存 preset 再使用 |
| 9 | `donchian-breakout-55-20-regime-filter` | regime 併用 | bear/range での無駄打ち削減 | 地合いフィルタを重ねる |
| 10 | `connors-rsi-pullback-bull-only` または `supertrend-atr-breadth-filter` | 分散枠 | trend 一辺倒を避ける | bull 限定逆張り or breadth 付き trend |

> 注:
> - 10本すべてを新規 builder にする必要はない
> - **既存 builder 再利用 + フィルタ / exit 追加** を優先する
> - 実装コストが重すぎる候補は research only に落とす

## 6. 地合い判定方法の候補（比較案）

| 候補 | 概要 | 長所 | 懸念 | 実装/調査優先度 |
|---|---|---|---|---|
| A. `SPX close > SMA200` | 王道の長期 trend filter | 単純で比較しやすい | 反応が遅い | 高 |
| B. `SPX 50SMA > 200SMA` + `200SMA slope > 0` | 方向と傾きを同時に見る | bear rally を少し避けやすい | 条件が増え過剰適合の余地 | 高 |
| C. `SPX > EMA50` | 速い regime 判定 | 反転に早い | whipsaw 増加の可能性 | 中 |
| D. breadth: `% of SPX members above 200DMA` 相当 | 市場全体の参加率を見る | 単一指数より内部状態を反映 | TradingView 上のデータ可用性未確認 | 高（research） |
| E. equal-weight proxy: `RSP > SMA200` または `RSP/SPY` | mega-cap 偏重を薄める | cap-weight bias を補正 | ティッカー依存・proxy 的 | 中 |
| F. volatility filter: `VIX < threshold` / `VIX < SMA` | risk-off 回避に効く可能性 | crash 回避に直結しやすい | trend strategy と相性が不安定 | 中 |
| G. risk-on ratio: `QQQ/IEF`, `HYG/LQD`, `XLY/XLP` | 市場心理を別角度で見る | 先行性がある可能性 | multi-symbol 条件で複雑化 | 中 |
| H. composite score: trend + breadth + vol | 総合判定 | 単一指標依存を下げられる | 実装/解釈が重い | 低〜中 |

### round3 での推奨順

1. **A/B を baseline**
2. **D または E を research 本命**
3. **F/G を補助比較**
4. H は round3 では research のみに留める可能性が高い

### 未調査で断定できない点

- TradingView 上で breadth 系に使える ticker / series が安定して取れるか
- `request.security()` を使う regime filter が current runner で安定運用できるか
- VIX / ratio 系が日足 long-only stock strategy に本当に効くか

## 7. NVDA を外したユニバース選定方法の候補（比較案）

### ユニバース案

| 候補 | 定義 | 長所 | 懸念 | round3での扱い |
|---|---|---|---|---|
| U1. **2015年時点の S&P500 時価総額上位10固定** | 期首時点 top10 を固定 | point-in-time の筋が良い | 当時ランキング取得が要調査 | 本命 |
| U2. **年1回 rebalance の S&P500 時価総額上位10** | 毎年 top10 を入れ替え | 現実に近い | 実装とデータ整備が重い | research 本命 |
| U3. **mega-cap ex-NVDA 固定 basket** | NVDA を抜き、近い大型株で補う | 実行が簡単 | point-in-time 厳密性は弱い | 実務的代替案 |
| U4. **sector-balanced S&P500 top picks** | セクター偏りを抑えた10銘柄 | NVDA/tech 偏重を下げやすい | 「top10」とは別物 | 比較案 |
| U5. **liquidity-based top10 (ADV)** | 出来高/流動性で選ぶ | 実運用寄り | momentum bias と混ざる | research 案 |
| U6. **round2 上位戦略に対して spot check 用の ex-Mag7 銘柄群** | 10銘柄フルではなく spot check | 速い | 厳密なユニバース検証ではない | 最小コスト案 |

### 銘柄選定方法の候補

| 方法 | 使いどころ | 長所 | 懸念 |
|---|---|---|---|
| 時価総額上位 | 「S&P500 上位10」定義に最も自然 | 直感的 | point-in-time データが必要 |
| 流動性上位 | 実運用寄り | 取引しやすい | 大型成長偏重になりやすい |
| セクターバランス | 汎化検証向け | 偏りを減らせる | top10 の趣旨から離れる |
| 過去時点固定 basket | 再現しやすい | config 化しやすい | survivorship bias に注意 |
| 年次 rebalance | 実態に近い | 期間全体での妥当性が高い | 実装が重い |

### round3 での推奨

1. **第一候補**: U1（2015年時点固定 top10）
2. **第二候補**: U6（spot check 用 ex-Mag7 群）
3. **研究課題**: U2（annual rebalance）の実現可能性

### 未調査で断定できない点

- 2015年起点の「当時の S&P500 上位10」を repo 内でどう正本化するか
- historical constituent / market cap をどこまで厳密に扱うか
- round3 では full-run にするか、spot check に留めるか

## 8. ユーザー確認待ちの論点

1. **別ユニバースの定義**
   - A: 2015年時点の S&P500 時価総額上位10固定
   - B: 年1 rebalance top10
   - C: 実務的 proxy basket（厳密性より速度重視）
2. **地合い判定の優先度**
   - A: SPX 系だけでまず実装
   - B: breadth / equal-weight proxy まで含めて research を先に厚くする
3. **round3 の実行範囲**
   - A: Mag7 + alt universe の spot check
   - B: Mag7 + alt universe の full run
   - C: まず Mag7 のみで regime strategy を絞り、その後 alt universe
4. **repo 本体を触るか**
   - A: session artifact runner 継続（推奨）
   - B: repo 内に最小 runner を追加
   - C: CLI/MCP 公開導線まで広げる（今回は非推奨）
5. **10戦略の意味**
   - A: 新規 / 改善 variant を約10本
   - B: baseline 再評価込みで合計約10本

## 9. RED → GREEN → REFACTOR のテスト戦略

### RED

- repo 本体コードや config loader / schema を触る場合のみ、先に failing test を追加する
- 候補:
  - `tests/backtest.test.js`
  - `tests/e2e.backtest.test.js`
  - `tests/backtest.strategy-config.test.js`（新設する場合）
- 例:
  - alt universe 定義の読み込みが失敗するテスト
  - regime filter 付き strategy source が期待条件を含むテスト
  - backtest result に universe / regime metadata が出ることを確認するテスト

### GREEN

- 必要最小限の preset / universe / runner / doc を追加する
- round3 の対象戦略が実行可能な状態にする
- Mag7 と alt universe の実行結果を raw / summary に保存する

### REFACTOR

- strategy id / doc 命名 / comparison table を整理する
- regime filter と universe 定義の責務を分離する
- docs の導線を `docs/DOCUMENTATION_SYSTEM.md` に統合する

### カバレッジ方針

- repo 本体コードを変更した場合、**変更箇所ベースで 80%以上** を目標にする
- docs / config / runner 中心で本体コードに影響しない場合は、既存 test command の通過を優先する

## 10. 検証コマンド

必須:

- `npm test`
- `npm run test:e2e`
- `npm run test:all`

必要時のみ:

- `node src/cli/index.js status`
- `node src/cli/index.js backtest nvda-ma`

execution 検証:

- session artifact runner または `scripts/dev/round3-batch-runner.mjs` による round3 実行
- raw snapshot と summary doc の件数 / strategy id / universe id の整合確認

## 11. リスク

1. **NVDA 依存を外すと成績が大きく悪化し、既存結論が崩れる可能性**
2. **地合い判定を増やしすぎると、過剰適合した複雑戦略になる可能性**
3. **breadth / VIX / ratio 系は TradingView 上のデータ可用性に依存**
4. **「当時の S&P500 上位10」の定義が曖昧だと、research の正本がぶれる**
5. **annual rebalance を採ると execution コストが急増する**
6. **公開 CLI/MCP 導線まで同時に広げると本題が遅れる**
7. **raw / summary / preset / universe の整合が崩れやすい**

## 12. チェックボックス形式の実装ステップ

### Phase 0: 計画確定

- [ ] round1 / round2 の session log / summary / raw を再読し、round3 の評価軸を固定する
- [ ] round3 の成果物命名を確定する
- [ ] ユーザー確認待ちの論点（ユニバース定義・実行範囲・runner 方針）を確定する

### Phase 1: Research - regime

- [ ] `docs/research/market-regime-candidates-round3_2015_2025.md` を作成する
- [ ] 地合い判定候補 A〜H の長所 / 短所 / 実装可否を整理する
- [ ] round3 で実装対象にする regime filter を 2〜3 個まで絞る
- [ ] 未調査点（TradingView ティッカー可用性など）を research task として明記する

### Phase 2: Research - universe / symbol selection

- [ ] `docs/research/universe-selection-candidates-round3_2015_2025.md` を作成する
- [ ] NVDA を外したユニバース候補 U1〜U6 を比較する
- [ ] 「S&P500 上位10」の定義候補を整理する
- [ ] 銘柄選定方法（時価総額 / 流動性 / セクターバランス / 年次 rebalance）を比較する
- [ ] round3 の採用ユニバース案を 1〜2 個に絞る

### Phase 3: Research - strategy shortlist

- [ ] `docs/research/multi-universe-strategy-shortlist-round3_2015_2025.md` を作成する
- [ ] round2 改善候補を起点に約10戦略を設計する
- [ ] baseline 再評価枠と variant 実験枠を分けて整理する
- [ ] 各戦略について、regime 依存有無 / alt universe 妥当性 / 実装難易度を記載する

### Phase 4: RED

- [ ] repo 本体ロジックを触る場合のみ failing test を追加する
- [ ] preset / universe schema を新設する場合は、その妥当性テストを先に書く

### Phase 5: GREEN

- [ ] 必要に応じて `config/backtest/strategy-presets.json` を更新する
- [ ] 必要に応じて `config/backtest/universes/sp500-top10-point-in-time.json` を追加する
- [ ] 必要に応じて `config/backtest/universes/sp500-top10-annual-rebalance.json` を追加する
- [ ] 必要に応じて `config/backtest/universes/mega-cap-ex-nvda.json` を追加する
- [ ] session artifact runner を更新または最小 runner を追加する
- [ ] Mag7 で round3 戦略を実行する
- [ ] alt universe で spot check または full run を実行する
- [ ] raw result を `docs/references/backtests/` に保存する

### Phase 6: REFACTOR

- [ ] regime / universe / strategy の docs 関係を整理する
- [ ] round2 → round3 の比較表を整える
- [ ] 採用 / 非採用 / 保留 の理由を summary に明示する

### Phase 7: 検証と記録

- [ ] `npm test` を実行する
- [ ] `npm run test:e2e` を実行する
- [ ] `npm run test:all` を実行する
- [ ] `docs/research/multi-universe-backtest-results-round3_2015_2025.md` を作成 / 更新する
- [ ] `docs/working-memory/session-logs/multi-universe-backtest-session-summary_20260404_1345.md` を作成する
- [ ] `docs/DOCUMENTATION_SYSTEM.md` の導線を更新する
- [ ] 差分確認後、次ステップ用レビューに回す

## 13. 完了条件

- 前回セッションの要点が round3 docs から復元できる
- 地合い判定方法の候補が **比較可能な形で文書化** されている
- NVDA を外したユニバース候補と銘柄選定方法が **比較可能な形で文書化** されている
- round3 で試す約10戦略が shortlist 化されている
- 必要な preset / universe が repo に追加または更新されている
- round3 の raw results が `docs/references/backtests/` に保存されている
- round3 の summary doc と session log が作成されている
- `npm test` / `npm run test:e2e` / `npm run test:all` の結果が確認されている
- 未調査で断定できない点が「保留」ではなく **research task として明示** されている
