# 実装計画: TradingView Strategy apply 修正 (20260404_0456)

- ステータス: PLAN
- 競合確認: `docs/exec-plans/active/` に競合 plan なし
- 方針: **fallback は維持しつつ、まず TradingView 本体の Strategy Tester に実際の strategy を載せることを優先**する

## 背景

現状の `tv backtest nvda-ma` は、`NVDA` 固定の 5/20 MA クロス strategy を Pine Editor に注入し、
compile → Strategy Tester open → metrics read の流れを持っている。  
しかし実機では Strategy Tester に

- `ストラテジーをテストするには、そのストラテジーをチャート上に適用してください`

が表示され、**TradingView 側では strategy 未適用**と判断されている。  
そのため現在返っている `fallback_metrics` は `chart_bars_local` の代替計算であり、
**TradingView Strategy Tester の実測値ではない**。

## スコープ

### スコープ内

1. Pine compile/apply の実行後に **strategy が実際に chart に載ったか** を検証する
2. strategy 未適用時に、`Update on chart` / `Add to chart` の再試行導線を追加する
3. TradingView の Japanese UI を前提に、apply 対象コントロールの検出精度を上げる
4. backtest 側で「apply 失敗」と「tester read 失敗」を分離して返す
5. unit / e2e を更新し、**fallback 許容**だけでなく **apply 成功確認** の面を追加する

### スコープ外

- 任意シンボル対応
- 任意パラメータ戦略化
- replay / bar replay 制御
- TradingView 内部 save/publish フローの全面自動化
- fallback metrics のロジック変更（必要最小限の修正を除く）

## 変更 / 作成 / 更新ファイル

### 更新

- `src/core/pine.js`
  - localized UI での apply button 検出改善
  - strategy apply 再試行 helper の追加
  - chart study / dataSource への反映確認 helper の追加
- `src/core/backtest.js`
  - `smartCompile()` 後の strategy attached 検証
  - apply failed / tester unavailable の構造化分離
  - strategy attach 待機と再試行の統合
- `tests/backtest.test.js`
  - apply failure / attach verification の unit test 追加
- `tests/e2e.backtest.test.js`
  - fallback 許容だけでなく、attach state を含む戻り値の検証強化
- `README.md`
  - actual tester / fallback の意味を明確化（必要な差分のみ）

### 条件付きで更新

- `src/core/index.js`
  - 新 helper export が必要な場合のみ
- `package.json`
  - test 対象の追加変更が必要な場合のみ

## 実装内容と影響範囲

### A. strategy attach 検証の追加

**主対象:** `src/core/pine.js`, `src/core/backtest.js`

- compile 後に `chart.getAllStudies()` / `dataSources()` を確認し、
  `NVDA 5/20 MA Cross` または strategy 特徴を持つ source が存在するか検証する
- `study_added` の増減だけに依存せず、**期待 strategy の存在**で判定する

影響:

- backtest の primary path が「見かけ上 compile 成功」から「実際に strategy attached 成功」へ強化される

### B. apply 再試行導線

**主対象:** `src/core/pine.js`

- まず既存の compile/apply を実行
- attached が確認できない場合に限り、以下を順に最小再試行
  1. `Update on chart`
  2. `Add to chart`
- `Save and add to chart` は save 副作用が絡むため、初回修正では主経路に置かない

影響:

- Japanese UI / 現行 TradingView Desktop での apply 成功率が上がる見込み

### C. backtest 戻り値の分離

**主対象:** `src/core/backtest.js`

- `tester_available: false` だけではなく、
  - `apply_failed: true/false`
  - `apply_reason`
  - `tester_reason`
  の責務を分ける
- fallback が返る場合でも「TradingView 実測ではない」ことを明確化する

影響:

- CLI / MCP の結果解釈が明確になる
- ユーザーが TradingView 実測と local fallback を誤認しにくくなる

## テスト方針（RED → GREEN → REFACTOR）

### Unit

#### RED

- strategy attached 判定 helper の失敗テストを追加
- apply failed / tester unavailable の戻り値分離テストを追加
- button 選択優先順位の pure helper があればその失敗テストを追加

#### GREEN

- attach 検証 helper と apply retry を最小実装
- backtest の result shape を更新

#### REFACTOR

- UI button 検出
- strategy attach 判定
- retry policy

を小関数へ分離する

### E2E

#### RED

- `tests/e2e.backtest.test.js` に、戻り値が attach 状態を含む前提を追加する

#### GREEN

- 実機で
  - strategy attached 成功 → tester metrics
  - 失敗時 → apply failure + fallback
  のどちらかが構造化で返ることを確認する

#### REFACTOR

- attach state と tester state の共通 helper 化

## 検証コマンド

- `npm test`
- `npm run test:e2e`
- `npm run test:all`
- `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest nvda-ma`
- `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status`

## リスク / 注意点

- TradingView Desktop の UI 文言や button 配置は壊れやすい
- strategy source が unsaved script として扱われ、apply と save が分離されている可能性がある
- `getAllStudies()` に strategy が通常 study と同じ形で出ない場合、`dataSources()` 側の判定が必要
- Japanese UI と English UI で label 差分がある

## チェックボックス形式の実装ステップ

### Phase 0: 調査固定

- [ ] strategy attach を判定する安定経路を決める
- [ ] apply button / action の優先順を決める
- [ ] save を主経路に含めない方針を固定する

### Phase 1: RED（unit）

- [ ] attach 判定の失敗テストを書く
- [ ] apply failure と tester unavailable の分離テストを書く
- [ ] retry policy の失敗テストを書く

### Phase 2: GREEN（pine/core）

- [ ] `src/core/pine.js` に attach 検証 helper を追加する
- [ ] `src/core/pine.js` に apply retry helper を追加する
- [ ] `src/core/backtest.js` で compile 後の attach 検証を組み込む

### Phase 3: E2E

- [ ] `tests/e2e.backtest.test.js` を更新する
- [ ] 実機で primary path / fallback path を確認する

### Phase 4: ドキュメント / 検証

- [ ] 必要なら `README.md` を更新する
- [ ] `npm test` を通す
- [ ] `npm run test:e2e` を通す
- [ ] `npm run test:all` を通す

## 完了条件

- `tv backtest nvda-ma` が Strategy Tester 実測と fallback を明確に区別して返す
- strategy 未適用時に root cause が `apply_failed` として明示される
- 実機で strategy attach 成功率が改善する
- 既存 Pine / price / health フローを壊さない
