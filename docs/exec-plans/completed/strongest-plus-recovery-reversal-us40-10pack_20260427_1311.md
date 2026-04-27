# strongest + recovery reversal US40 10-pack 計画

作成日時: 2026-04-27 13:11 JST

## 目的

`docs/research/night-batch-self-hosted-run69_20260426.md` を基準に、現時点の最有力 breakout 戦略へ「RSP 200MA 以下では通常何もしない」穴を埋める recovery reversal 軸を足した比較セットを作る。  
今回のゴールは、**基準戦略 1 本 + recovery 調整版 9 本 = 10 戦略**を backtest 設定へ登録し、`Night Batch Self Hosted` の foreground bundle から実行できる状態にすること。

## 前提と解釈

- run69 の首位は `donchian-60-20-rsp-rsi14-regime60-tp25-27-tp100-50`
- run69 文書では balance 重視候補として `tp25-31` も併記されている
- 今回の plan では、ユーザーの「総合最強戦略」を **rank 1 / avg_net_profit 最大の `tp25-27`** と解釈して進める
- もし基準を `tp25-31` に切り替える場合は、承認後の実装前に strategy ID と Pine 名称だけ差し替える

## 変更・作成・移動するファイル

### 作成

- `docs/exec-plans/active/strongest-plus-recovery-reversal-us40-10pack_20260427_1311.md`
- `config/backtest/campaigns/strongest-plus-recovery-reversal-us40-10pack.json`
- `docs/references/pine/strongest-plus-recovery-reversal-us40-10pack/<baseline-and-9-variants>.pine`

### 更新候補

- `config/backtest/strategy-presets.json`
- `config/night_batch/bundle-foreground-reuse-config.json`
- `tests/backtest.test.js`
- `tests/campaign.test.js`
- `tests/windows-run-night-batch-self-hosted.test.js`
- 必要なら `docs/research/night-batch-self-hosted-run69_20260426.md`

### 完了時に移動

- `docs/exec-plans/active/strongest-plus-recovery-reversal-us40-10pack_20260427_1311.md`
- 移動先: `docs/exec-plans/completed/strongest-plus-recovery-reversal-us40-10pack_20260427_1311.md`

## 実装方針

- breakout 側の基準は run69 首位 `tp25-27` をそのまま 1 本置く
- 追加 9 本は、通常 regime (`RSP > 200SMA`) では基準 breakout を維持しつつ、`RSP < 200SMA` かつ panic / recovery 条件では reversal entry を許す合成型として作る
- recovery 側の原型は既存 `rsp-vix-spy-panic-reversal-rsi2-confirm-sma25-rsi65-exit-no-stop` の考え方を流用する
- 調整対象は、過去の panic reversal 試行で触っていた軸に限定し、10 本に収まるように 1 軸ずつ比較できる形にする

## 予定する比較軸

基準 1 本:

- `donchian-60-20-rsp-rsi14-regime60-tp25-27-tp100-50`

調整版 9 本の設計方針:

- recovery entry の VIX 閾値
- recovery entry の SPY RSI 条件
- recovery entry の確認シグナル (`RSI2` cross / `VIX` peakout / 併用)
- recovery exit の `SMA25 + RSI65` 周辺閾値
- stop なし / 軽い stop の比較が必要かどうか

注記:

- 具体的な 9 本のパラメータ値は、既存 panic reversal 実装とユーザー提示 Pine をベースに **実装前に固定**する
- 「既存 11-pack の再利用」ではなく、**breakout 基準 + recovery overlay 比較専用の新 10-pack** とする

## 影響範囲

- live preset に新しい strongest + recovery family が追加される
- US40 用の新 campaign が 10 本構成で追加される
- foreground bundle の既定 `us_campaign` が新 campaign に切り替わる可能性がある
- backtest / campaign / Windows runner の設定テスト期待値が更新される
- workflow dispatch の既定実行対象が変わるため、次回運用にも影響する

## スコープ

### 含む

- 基準 1 本 + 調整版 9 本の strategy preset 登録
- 各 strategy に対応する Pine source の追加
- 新 campaign 追加
- 必要テスト追加または更新
- bundle 切替
- commit / push
- `Night Batch Self Hosted` workflow の dispatch

### 含まない

- workflow 完走後の結果集計
- recovery ロジックの外部 sentiment 指標統合
- JP campaign 更新
- 既存 run69 結果そのものの再解釈

## テスト戦略

- **RED**
  - `tests/backtest.test.js` に新 family の preset / source 解決テストを追加
  - `tests/campaign.test.js` に新 10-pack campaign の matrix 検証を追加
  - `tests/windows-run-night-batch-self-hosted.test.js` に default `us_campaign` 切替検証を追加
- **GREEN**
  - preset / Pine / campaign / bundle を最小差分で実装して通す
- **REFACTOR**
  - 命名、source_path、説明文の重複を最小限整理する

## 検証コマンド

- `node --test tests/backtest.test.js tests/campaign.test.js tests/windows-run-night-batch-self-hosted.test.js`
- 必要なら `npm test`
- `gh workflow run "Night Batch Self Hosted" --ref main -f config_path=config/night_batch/bundle-foreground-reuse-config.json`
- `gh run list --workflow "Night Batch Self Hosted" --limit 5`

## リスク / 注意点

- 「総合最強戦略」の解釈は `tp25-27` と `tp25-31` で分岐余地がある
- 9 本の調整値を広げすぎると比較軸が散り、検証の意味が弱くなる
- breakout と recovery の合成ロジックは raw Pine 実装になりやすく、generator ではなく source テストで縛る必要がある
- foreground bundle を新 campaign に切り替えるため、運用デフォルトへの影響がある
- active plan `repo-structure-align-and-archive-rules_20260424_2015.md` とは直接競合しないが、docs 配置規約には従う

## 実装ステップ

- [ ] run69 首位 breakout を基準 strategy として固定し、回復局面 overlay の 9 変種パラメータを確定する
- [ ] 新 family を `config/backtest/strategy-presets.json` と Pine source に追加する
- [ ] **RED**: preset / source 解決テストを追加する
- [ ] **RED**: 新 campaign の 40 x 10 / smoke 1 x 10 検証を追加する
- [ ] **RED**: foreground bundle の `us_campaign` 更新テストを追加する
- [ ] **GREEN**: new campaign と bundle を実装する
- [ ] **REVIEW**: strategy ID、Pine 名、run69 との整合性を確認する
- [ ] 検証コマンドを実行する
- [ ] plan を `docs/exec-plans/completed/` に移動する
- [ ] Conventional Commit で commit して `main` に push する
- [ ] `Night Batch Self Hosted` workflow を dispatch し、run id を確認する

## 完了条件

- breakout 基準 1 本と recovery 調整版 9 本が repo 上で backtest 可能な preset として登録されている
- 新 10-pack campaign が追加され、foreground bundle から参照できる
- 必要テストが通る
- `main` に push 済みで、workflow_dispatch による run 起動を確認できる
