# TP1 micro sweep + panic reversal US40 11-pack 計画

## 問題と方針

run68 で整理した **TP1 ratio micro sweep 10 戦略**を repo の backtest 実行対象として登録し、そこへ **panic reversal 特殊戦略 1 本**を追加した **新しい US40 11-pack campaign** を作る。  
特殊戦略は、`docs/research/night-batch-self-hosted-run68_20260426.md` で「第1段階（実現可能）」とした **TradingView / Pine だけで閉じる panic filter** と、「第2段階」として確定した **底打ち判定 + 長期保有 exit** を raw_source Pine で実装する。

今回の plan では、以下を確定仕様として扱う。

- micro sweep 比較軸: `tp25-{27,28,29,30,31,32,33,34,35,36}-tp100-50`
- 特殊戦略の panic filter: `RSP < 200SMA`、`VIX > 30`、`SPY RSI(14) < 30`、`SPY < 200SMA`
- 特殊戦略の底打ち判定: **panic 条件充足 + `SPY RSI(2)` が `10` を下から上抜けた日に買い**
- 特殊戦略の exit: **stop loss なし**、`close > SMA25 && RSI(14) >= 65` で手仕舞い
- 比較 campaign: **10 本の micro sweep + 特殊戦略 1 本 = 11-pack**
- night batch: **新しい 11-pack を既定 us_campaign に切り替える**

## 対象ファイル

- **作成** `docs/exec-plans/active/tp1-micro-sweep-panic-reversal-us40-11pack_20260427_0034.md`
- **更新** `config/backtest/strategy-presets.json`
- **作成** `config/backtest/campaigns/tp1-micro-sweep-panic-reversal-us40-11pack.json`
- **作成** `docs/references/pine/tp1-micro-sweep-panic-reversal-us40-11pack/donchian-60-20-rsp-rsi14-regime60-tp25-27-tp100-50.pine`
- **作成** `docs/references/pine/tp1-micro-sweep-panic-reversal-us40-11pack/donchian-60-20-rsp-rsi14-regime60-tp25-28-tp100-50.pine`
- **作成** `docs/references/pine/tp1-micro-sweep-panic-reversal-us40-11pack/donchian-60-20-rsp-rsi14-regime60-tp25-29-tp100-50.pine`
- **作成** `docs/references/pine/tp1-micro-sweep-panic-reversal-us40-11pack/donchian-60-20-rsp-rsi14-regime60-tp25-31-tp100-50.pine`
- **作成** `docs/references/pine/tp1-micro-sweep-panic-reversal-us40-11pack/donchian-60-20-rsp-rsi14-regime60-tp25-32-tp100-50.pine`
- **作成** `docs/references/pine/tp1-micro-sweep-panic-reversal-us40-11pack/donchian-60-20-rsp-rsi14-regime60-tp25-34-tp100-50.pine`
- **作成** `docs/references/pine/tp1-micro-sweep-panic-reversal-us40-11pack/donchian-60-20-rsp-rsi14-regime60-tp25-35-tp100-50.pine`
- **作成** `docs/references/pine/tp1-micro-sweep-panic-reversal-us40-11pack/donchian-60-20-rsp-rsi14-regime60-tp25-36-tp100-50.pine`
- **作成** `docs/references/pine/tp1-micro-sweep-panic-reversal-us40-11pack/rsp-vix-spy-panic-reversal-rsi2-confirm-sma25-rsi65-exit-no-stop.pine`
- **更新** `config/night_batch/bundle-foreground-reuse-config.json`
- **更新** `tests/backtest.test.js`
- **更新** `tests/campaign.test.js`
- **更新** `tests/windows-run-night-batch-self-hosted.test.js`
- **更新** `docs/research/night-batch-self-hosted-run68_20260426.md`

## 影響範囲

- live `strategy-presets.json` に micro sweep 新規 preset 群と panic reversal 特殊戦略が追加される
- US40 比較用 campaign が 10-pack から **11-pack の新 campaign** へ拡張される
- foreground night batch の既定 `us_campaign` が新 campaign に切り替わる
- backtest / campaign / night-batch default のテスト期待値が更新される
- run68 research メモに「候補」ではなく「登録済み比較対象」としての記述を追記する

## 実装ステップ

- [ ] 既存 raw_source TP 戦略を基準に、`tp25-27/28/29/31/32/34/35/36` の 8 本を **RED** 前提で preset / source_path / Pine まで追加する
- [ ] **RED**: `tests/backtest.test.js` に、新しい TP1 micro sweep preset と panic reversal 特殊戦略が正しい source を返す失敗テストを追加する
- [ ] **RED**: `tests/campaign.test.js` に、新 11-pack campaign が `40 x 11` / smoke `1 x 11` になる失敗テストを追加する
- [ ] **RED**: `tests/windows-run-night-batch-self-hosted.test.js` に、foreground bundle default の `us_campaign` が新 11-pack へ切り替わる失敗テストを追加する
- [ ] **GREEN**: special raw_source Pine を実装し、panic filter・`SPY RSI(2)` cross-up entry・no-stop・`SMA25 + RSI65` exit を source に反映する
- [ ] **GREEN**: 新 11-pack campaign を追加し、run68 doc の 10 micro sweep IDs + special strategy ID を順序付きで登録する
- [ ] **GREEN**: night batch foreground default を新 campaign に切り替える
- [ ] **REFACTOR**: source_path の配置・strategy 名・campaign ID・doc 文面を整理し、既存 TP family と命名規則を揃える
- [ ] `docs/research/night-batch-self-hosted-run68_20260426.md` を更新し、今回の実装内容と 11-pack の比較構成を追記する

## テスト戦略

- **RED**
  - `tests/backtest.test.js` に micro sweep / panic reversal raw_source の期待文字列テストを追加
  - `tests/campaign.test.js` に新 11-pack campaign の matrix / smoke 検証を追加
  - `tests/windows-run-night-batch-self-hosted.test.js` に default `us_campaign` 更新テストを追加
- **GREEN**
  - Pine source / preset / campaign / night batch config を最小変更で通す
- **REFACTOR**
  - source_path 配置と命名を統一しつつ、テストが通ったままにする

## バリデーションコマンド

- 途中確認: `node --test tests/backtest.test.js tests/campaign.test.js tests/windows-run-night-batch-self-hosted.test.js`
- 最終確認: `npm test`

## リスク / 注意点

- `bundle-foreground-reuse-config.json` の現物と `tests/windows-run-night-batch-self-hosted.test.js` の期待値に、既に `selected-us40-10pack` / `strongest-vs-profit-protect-tp1-focus-us40-10pack` のズレが見えているため、既存 drift を壊さずに着地させる必要がある
- special strategy は `raw_source` 実装になるため、generator 共通ロジックではなく Pine source 自身の正しさをテストで縛る必要がある
- 今回の special strategy は **TradingView だけで閉じる第1段階実装** に限定し、`Fear & Greed` / `AAII` / `NAAIM` / `forward PE` の外部履歴 series 統合は含めない
- night batch default 切替まで含めるため、設定名・campaign ID・test 期待値の不整合を残すと運用影響が出る

## スコープ外

- `Fear & Greed` / `AAII` / `NAAIM` / `S&P500 予想PER` の履歴 series 取り込み
- GitHub Actions workflow 自体の変更
- 実際の night batch 実行結果の取得
- JP campaign 変更

## 競合確認

- active plan は `night-batch-run68-micro-sweep-feasibility_20260426_2314.md`、`ext-fear-sentiment-indicators-feasibility_20260426_2322.md`、`repo-structure-align-and-archive-rules_20260424_2015.md` がある
- 今回はそのうち run68 調査結果を **実装へ落とす follow-up** であり、repo 構造 plan や外部センチメント指標調査 plan とは直接競合しない
