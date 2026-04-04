# 実装計画: Mag7 戦略調査と汎用バックテスト化 (20260404_0934)

- ステータス: PLAN
- 競合確認: `docs/exec-plans/active/` に既存 active plan なし
- 前提メモ: 現在の実コードには `src/core/backtest.js` / `src/tools/backtest.js` / `tv backtest nvda-ma` が既に存在するため、本対応は **NVDA 固定実装を土台にした一般化** として進める

## 背景

現状のリポジトリでは、TradingView Desktop + CDP を使ったバックテスト実行が **NVDA 固定 / 5-20 SMA 固定** で成立している。  
今回の要求は、その単発実装を次の 2 フェーズへ拡張することにある。

1. **研究フェーズ**  
   Magnificent 7 を対象に、2015年〜2025年・初期資金 10000 USD を前提として、TradingView で再現しやすいおすすめ戦略を約 10 通り調査し、比較可能な形でまとめる
2. **実行フェーズ**  
   調査で採用した戦略を、CLI/MCP から **1戦略ずつ / 1銘柄ずつ** 実行できるようにし、結果を確認できるようにする

## 目的

- deep research の結果を **durable な repo 内成果物** として保持する
- NVDA 固定バックテストを **戦略カタログ + Mag7 対応実行基盤** に拡張する
- 既存の `tv backtest nvda-ma` / `tv_backtest_nvda_ma_5_20` は後方互換を維持する
- 実行結果を CLI/MCP で比較しやすい構造化 JSON として返せるようにする

## スコープ

### スコープ内

1. deep research の成果物を repo 内に保存する
2. おすすめ戦略候補を約 10 件に整理し、採用理由・向き不向きを明記する
3. Magnificent 7 の銘柄ユニバース定義を追加する
4. 戦略 preset / catalog をコードから利用可能にする
5. 現在の NVDA 固定バックテストを、`strategy + symbol + period + capital` を受けられる実行フローへ一般化する
6. CLI/MCP から「戦略一覧」と「単発実行」をできるようにする
7. 既存 NVDA 固定コマンドを互換ラッパーとして残す
8. unit test / e2e test を拡張する

### スコープ外

- 研究結果の自動更新・定期クロール
- ポートフォリオ全体の資産配分最適化
- 10戦略 × 7銘柄の全件一括バッチ実行
- timeframe 最適化・パラメータ最適化
- 手数料 / スリッページ / 税金の精緻モデリング
- TradingView 外データソースの導入
- Web UI の新設
- 研究結果そのものの正しさ保証

## Phase A: 研究フェーズ

### 目的

- Mag7 向け候補戦略を約 10 件に絞る
- それぞれの戦略を TradingView Pine strategy として実装可能な粒度まで落とす
- 実行フェーズで使う preset 定義へ接続できるようにする

### 成果物

- 人間向け: `docs/research/mag7-strategy-shortlist_2015_2025.md`
- 機械向け: `config/backtest/strategy-presets.json`
- ユニバース定義: `config/backtest/universes/mag7.json`

### 保持方針

- **調査結果の正本** は `docs/research/mag7-strategy-shortlist_2015_2025.md`
- **実行に使う正本** は `config/backtest/strategy-presets.json`
- ドキュメントと設定を分離し、説明と実行定義を混在させない

## Phase B: 実行フェーズ

### 目的

- preset 化された戦略を、Mag7 各銘柄に対して 1 件ずつ実行できるようにする
- 期間・初期資金・銘柄・戦略 ID を指定して結果を取得できるようにする
- 既存 NVDA 固定導線を壊さずに一般化する

### 実行単位

- 初回は **1 strategy × 1 symbol × 1期間** を 1 回の実行単位とする
- ユーザー要望の「一つずつ実行して結果を見る」を優先し、全件自動バッチは後回しにする

## 変更・削除・作成するファイル一覧

### 新規作成

- `docs/research/mag7-strategy-shortlist_2015_2025.md`
- `config/backtest/strategy-presets.json`
- `config/backtest/universes/mag7.json`
- `src/core/strategy-catalog.js`
- `src/core/backtest-runner.js`
- `tests/strategy-catalog.test.js`
- `tests/backtest-runner.test.js`

### 更新

- `src/core/backtest.js`
- `src/core/index.js`
- `src/tools/backtest.js`
- `src/server.js`
- `src/cli/commands/backtest.js`
- `src/cli/index.js`
- `package.json`
- `README.md`
- `tests/backtest.test.js`
- `tests/e2e.backtest.test.js`

### 削除

- なし

## 実装内容と影響範囲

### 1. 研究成果物の durable 化

- `docs/research/mag7-strategy-shortlist_2015_2025.md` に候補戦略を約 10 件まとめる
- 各戦略について、戦略名 / ロジック要約 / Mag7 との相性 / 想定 timeframe / Pine 実装難易度 / 主なパラメータ / 注意点 / 採用可否を整理する

**影響範囲**

- 実装対象が明確になる
- doc と preset の同期管理が必要になる

### 2. 戦略 catalog / universe の追加

- `config/backtest/strategy-presets.json` に実行可能な戦略 preset を定義する
- `config/backtest/universes/mag7.json` に Mag7 の canonical symbol を定義する
- `src/core/strategy-catalog.js` で schema 検証と lookup を行う

**影響範囲**

- NVDA 固定ロジックから設定駆動へ移行できる
- symbol 表記差分を吸収しやすくなる

### 3. 汎用 backtest runner の導入

- `src/core/backtest-runner.js` に `strategyId`, `symbol`, `from`, `to`, `initialCapital`, `timeframe` を受ける汎用 runner を追加する
- 既存の Strategy Tester 読み取り、fallback、構造化結果返却を可能な限り流用する
- `src/core/backtest.js` の `runNvdaMaBacktest()` は `runBacktest()` の互換ラッパーへ寄せる

**影響範囲**

- 今後の戦略追加が容易になる
- 既存テストの調整が必要になる

### 4. CLI / MCP の一般化

- CLI:
  - `tv backtest list-strategies`
  - `tv backtest run --strategy <id> --symbol <symbol> --from <date> --to <date> --capital 10000`
  - `tv backtest nvda-ma` は互換維持
- MCP:
  - `tv_list_backtest_strategies`
  - `tv_run_backtest`
  - `tv_backtest_nvda_ma_5_20` は互換維持

**影響範囲**

- 既存導線を壊さず機能追加できる
- `src/server.js` の説明更新が必要になる

### 5. ドキュメント更新

- README に研究成果物の場所、新 CLI/MCP、制約、既存固定コマンドとの関係を追記する

**影響範囲**

- 利用者が固定実装と汎用実装の差分を理解しやすくなる

## 未確定前提

1. **timeframe 未指定**  
   日足 (`D`) を第一候補とするが未確定
2. **Magnificent 7 のシンボル表記差分**  
   `AAPL`, `MSFT`, `GOOGL`, `AMZN`, `META`, `NVDA`, `TSLA` を canonical 候補とする
3. **GOOGL / GOOG の扱い**  
   初回は `GOOGL` を第一候補とするが要確認
4. **2015年〜2025年の厳密な終端**  
   `2015-01-01` 〜 `2025-12-31` とするか、実行日の最新バーまでとするか未確定
5. **手数料 / スリッページ**  
   初回は 0 を候補とするが未確定
6. **売買方向**  
   初回は long-only 優先だが、戦略ごとに long/short を許容するかは未確定
7. **資金配分**  
   初回は `100% of equity` 相当を基本候補とする
8. **実行結果の durable 保存**  
   初回は CLI/MCP の JSON 出力中心とし、repo への自動保存は必須にしない

## テスト戦略（RED → GREEN → REFACTOR）

### RED

#### unit

- `tests/strategy-catalog.test.js`
  - strategy preset の schema が正しく読める
  - Mag7 universe が 7 銘柄を返す
  - unknown strategy / unknown symbol で失敗する
- `tests/backtest-runner.test.js`
  - `runBacktest()` が required params を検証する
  - `initialCapital=10000` が default/override で反映される
  - `runNvdaMaBacktest()` が新 runner 経由でも互換結果を返す
- `tests/backtest.test.js`
  - 既存 NVDA 固定 source builder / metrics 正規化が壊れていないことを確認する

#### e2e

- `tests/e2e.backtest.test.js`
  - generic run が structured result を返す
  - 互換 `runNvdaMaBacktest()` が引き続き動く
  - symbol 表記差分を含んでも Mag7 銘柄として認識できる

### GREEN

- catalog / universe 読み込みを最小実装する
- generic runner を追加する
- `backtest.js` を互換ラッパーへ寄せる
- CLI/MCP の list / run を追加する
- README と research doc の雛形を整える

### REFACTOR

- `src/core/backtest.js` から preset 管理責務を外す
- symbol 正規化・date/default option 処理を小関数へ分離する
- 既存 NVDA 固定経路の共通処理を runner 側へ寄せる
- test を責務単位で整理し、巨大化を避ける

### カバレッジ方針

- catalog / parameter validation / wrapper compatibility を unit test で厚くする
- UI 依存部分は E2E に寄せる
- 新規変更箇所の 80% 以上を目標にする

## 検証コマンド

- `npm test`
- `npm run test:e2e`
- `npm run test:all`
- `node src/cli/index.js status`
- `node src/cli/index.js backtest nvda-ma`
- `node src/cli/index.js backtest list-strategies`
- `node src/cli/index.js backtest run --strategy <strategy-id> --symbol NVDA --from 2015-01-01 --to 2025-12-31 --capital 10000`

## リスク

1. `src/core/backtest.js` がさらに肥大化する  
   - runner / catalog 分離で抑制する
2. TradingView UI 依存  
   - Strategy Tester 読み取りは DOM/API 変化の影響を受ける
3. 戦略数が増えることで preset と実装の不整合が起きやすい  
   - doc と JSON catalog を分離し、schema test で守る
4. Mag7 の symbol alias 差分  
   - `symbolMatches()` と canonical mapping を併用する
5. 時間足・期間・コスト前提が未確定のまま進むと比較結果がブレる  
   - research doc 冒頭で共通前提を固定する
6. E2E が重くなる  
   - 全戦略全銘柄は回さず、代表検証で抑える

## チェックボックス形式の実装ステップ

### Phase 0: 計画確定

- [ ] `docs/exec-plans/active/` に本 plan を配置する
- [ ] 研究成果物の保存先を `docs/research/`、実行用定義を `config/backtest/` に固定する
- [ ] 未確定前提のうち、timeframe / date range / fee 方針をレビュー論点として明示する

### Phase 1: 研究フェーズ

- [ ] Mag7 向け候補戦略を約 10 件調査する
- [ ] 各戦略の採用理由・非採用理由を整理する
- [ ] `docs/research/mag7-strategy-shortlist_2015_2025.md` を作成する
- [ ] 実行対象として採用する preset を確定する
- [ ] `config/backtest/strategy-presets.json` の初版を定義する
- [ ] `config/backtest/universes/mag7.json` の初版を定義する

### Phase 2: RED

- [ ] `tests/strategy-catalog.test.js` を追加する
- [ ] `tests/backtest-runner.test.js` を追加する
- [ ] `tests/backtest.test.js` に互換確認テストを追加する
- [ ] `tests/e2e.backtest.test.js` に generic run 前提の失敗テストを追加する

### Phase 3: GREEN

- [ ] `src/core/strategy-catalog.js` を実装する
- [ ] `src/core/backtest-runner.js` を実装する
- [ ] `src/core/backtest.js` を互換ラッパー中心へ整理する
- [ ] `src/core/index.js` の export を更新する
- [ ] `src/cli/commands/backtest.js` に `list-strategies` と `run` を追加する
- [ ] `src/tools/backtest.js` に汎用 MCP tool を追加する
- [ ] `src/server.js` の instructions を更新する

### Phase 4: REFACTOR

- [ ] preset 解決・symbol 解決・default option 解決を小関数化する
- [ ] 既存 NVDA 固定経路の重複処理を runner 側へ寄せる
- [ ] test の責務分離を確認する
- [ ] 1 ファイルの肥大化がないか確認する

### Phase 5: ドキュメントと検証

- [ ] `README.md` を更新する
- [ ] `package.json` の test script に新規 test file を追加する
- [ ] `npm test` を通す
- [ ] `npm run test:e2e` を通す
- [ ] `npm run test:all` を通す
- [ ] `tv backtest nvda-ma` の後方互換を確認する
- [ ] `tv backtest list-strategies` / `tv backtest run ...` の動作を確認する

## 完了条件

- 研究成果が `docs/research/mag7-strategy-shortlist_2015_2025.md` に保存されている
- 実行可能な戦略定義が `config/backtest/strategy-presets.json` に整理されている
- Mag7 ユニバースが `config/backtest/universes/mag7.json` で管理されている
- CLI/MCP から戦略一覧取得と単発 backtest 実行ができる
- 既存 `tv backtest nvda-ma` / `tv_backtest_nvda_ma_5_20` が壊れていない
- `npm test` / `npm run test:e2e` / `npm run test:all` が通る
- 実行前提（期間・資金・timeframe・symbol alias）の扱いが README と research doc に明記されている
