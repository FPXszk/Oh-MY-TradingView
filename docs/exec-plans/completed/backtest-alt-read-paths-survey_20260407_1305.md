# 実行計画: backtest 代替読取経路の安全調査 (20260407_1305)

- ステータス: DRAFT
- 種別: research / validation
- 前提ブランチ: `main`

## Problem

現状のバックテスト結果取得は `src/core/backtest.js` の `readTesterMetricsFromInternalApi()` / `readTesterMetricsFromDom()` と、それを支える `activateTesterMetricsTab()` / `readTesterMetricsWithRetries()` に強く依存している。  
本計画では、既存 preset 経路と result shape を壊さずに、**UI の Strategy Tester -> 指標 に依存しない / 依存を減らせる安全な別経路があるか**を先に調査・検証する。  
特に、preset 経路へ unsafe な generic fallback を再導入しないことを前提に、まずは**観測だけで済む検証**を優先する。

## Source of truth

- ユーザー依頼本文
- `src/core/backtest.js`
  - `readTesterMetricsFromInternalApi()`
  - `readTesterMetricsFromDom()`
  - `activateTesterMetricsTab()`
  - `readTesterMetricsWithRetries()`
- `tests/backtest.test.js`
- `docs/research/latest/backtest-reliability-handoff_20260407_1026.md`
  - preset で generic fallback を流用すると別戦略の値を返しうるため不採用、という整理
- 既存 contract
  - NVDA MA のみ strategy-aware な chart bars local fallback あり
  - preset 経路では generic fallback を意図的に止めている
  - 既存 result shape は維持必須

## In scope

- UI タブ切替を伴わず取得できる**代替候補の洗い出し**
  - internal API の未使用フィールド
  - strategy source 内の report / trade / order 系データ
  - Performance / Strategy data source
  - CDP 経由の network / websocket event 観測
- 既存 preset 経路を壊さない**観測専用の検証導線**の設計
- 必要最小限のコード変更での**安全な計測・比較**
- `tests/backtest.test.js` の拡張方針整理
- 実装する場合でも、まずは**読めるかどうかの検証**までを第一段階とする

## Out of scope

- preset 経路への generic fallback 一般化
- 既存 result shape の変更
- 既存成功経路の優先順位変更
- UI 依存読取の即時削除
- 大規模リファクタや unrelated な安定化対応

## Files to create / modify / delete

### Create

- `docs/exec-plans/active/backtest-alt-read-paths-survey_20260407_1305.md`
- 必要なら `docs/research/latest/backtest-alt-source-survey_YYYYMMDD_HHMM.md`
- 必要なら `tests/fixtures/backtest/*.json`

### Modify

- `src/core/backtest.js`
- `tests/backtest.test.js`

### Delete

- なし

## Steps

- [ ] 既存取得経路の責務を再整理し、`readTesterMetricsFromInternalApi()` / `readTesterMetricsFromDom()` / retry 制御のどこまでを観測対象にするか明文化する
- [ ] UI を触らず読める可能性がある候補を列挙し、**候補ごとの安全性条件**（別戦略混入の有無、strategy-specific か、同一 run と結び付けられるか）を定義する
- [ ] 候補 1: internal API の既存未使用フィールドを調査し、既存 metrics 正規化へ安全にマッピングできるか確認する
- [ ] 候補 2: strategy source の report / trade / order 系データを調査し、既存 metrics 主要項目へ導出可能かを確認する
- [ ] 候補 3: Performance / Strategy data source を調査し、UI 非依存で安定取得できるか確認する
- [ ] 候補 4: network / websocket event を観測し、バックテスト実行結果に相当する payload が流れていないか確認する
- [ ] 各候補について、以下を比較表で残す
  - 取得タイミング
  - UI 依存の有無
  - preset で安全か
  - 既存 result shape に落とせるか
  - 誤読リスク / 別戦略混入リスク
- [ ] **観測だけで済む検証**として、既存結果選択ロジックに影響しない helper / diagnostic path のみを最小追加する案を固める
- [ ] `tests/backtest.test.js` に RED として以下を追加する
  - 代替 payload を既存 shape に正規化できる
  - preset 経路では generic fallback を付与しない
  - primary 読み取り不能時でも既存 result shape を壊さない
- [ ] GREEN として、観測専用 reader または抽出 helper を最小実装する（本番の source priority は変えない）
- [ ] REFACTOR として、候補 reader が増えても preset 安全条件が崩れないよう責務を分離する
- [ ] 実機検証では、少なくとも「既存成功ケース」「metrics_unreadable ケース」「preset ケース」を分けて、観測値が既存経路と一致するか / 一致しないかを記録する
- [ ] 調査結果を `docs/research/latest/...` にまとめ、**実装に進める候補**と**不採用候補**を明示する
- [ ] 実装に進むべき候補がある場合のみ、次フェーズとして source priority 変更または gated 採用の別計画に切り出す

## TDD 方針（RED / GREEN / REFACTOR）

### RED

- `tests/backtest.test.js` に、代替候補 payload から既存 metrics shape を安全に作れることを示す失敗テストを追加する
- preset 経路で generic fallback が付かないことを固定する回帰テストを追加する
- 代替候補が読めても **未承認の source priority 変更をしない**ことを固定するテストを追加する

### GREEN

- 観測専用 helper / extractor を最小実装し、テストを通す
- 既存の primary 経路・result shape・preset 安全条件は変更しない
- 必要なら fixture を追加して、候補 payload の再現性を確保する

### REFACTOR

- source ごとの抽出責務を整理し、今後の候補追加でも unsafe fallback が混入しない構造にする
- テスト名・fixture 名・補助関数を整理して、候補比較が追いやすい状態にする

## Validation commands

```bash
npm run test
node --test tests/backtest.test.js
npm run test:e2e
```

## Risks

- 代替候補が取得できても、**同一 strategy / 同一 run の値と保証できない**と採用不可
- network / internal data は TradingView 側変更で壊れやすい
- 観測用コードが本番の結果選択に混ざると、意図せず挙動が変わる
- fixture 化した payload が実機の揺れを十分表現できない可能性がある
- UI 非依存候補が見つかっても、既存 5 指標へ完全に写像できない場合がある
- 最優先は repo 非破壊のため、**候補が不確実なら採用せず調査結果のみで止める**判断を明示する
