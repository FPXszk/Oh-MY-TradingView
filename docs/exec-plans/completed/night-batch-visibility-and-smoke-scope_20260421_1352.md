# Night Batch Visibility / Smoke Scope 計画

作成日時: 2026-04-21 13:52 JST

## 目的

最新の `Night Batch Self Hosted` workflow の実行状況を確認し、以下を満たすように必要な修正を行う。

- 最新 run が本当に成功しているか、異常終了や stale skip と取り違えていないかを明確にする
- 毎日の定時 `schedule` 実行を撤廃し、戦略調整後に `workflow_dispatch` から手動起動する運用へ切り替える
- workflow 実行中に TradingView アプリが可視状態で起動することを担保する
- smoke テストを「SP500 を対象に各戦略 1 回ずつ確認」に短縮し、本番移行条件を明確にする

## 現時点の確認結果

- 最新 run: `24703169199`
  - workflow: `Night Batch Self Hosted`
  - event: `workflow_dispatch`
  - conclusion: `success`
  - job 所要時間: `16m37s`
- 直前の異常に早い run と見える成功 run: `24676725881`
  - event: `schedule`
  - conclusion: `success`
  - job 所要時間: `16s`
  - stale schedule skip により早期終了した可能性が高い
- 失敗 run も直近に存在:
  - `24702992099` `failure` `39s`
  - `24700952969` `failure` `1m11s`
  - `24699948598` `failure` `52s`

## 変更・確認対象ファイル

- 作成: `docs/exec-plans/completed/night-batch-visibility-and-smoke-scope_20260421_1352.md`
- 変更候補: `.github/workflows/night-batch-self-hosted.yml`
- 変更候補: `config/night_batch/bundle-foreground-reuse-config.json`
- 変更候補: `python/night_batch.py`
- 変更候補: `tests/windows-run-night-batch-self-hosted.test.js`
- 変更候補: `tests/night-batch.test.js`

## 実装内容と影響範囲

- workflow 実行結果の判別性
  - scheduled run 前提の stale skip ロジックを撤去し、手動 dispatch 前提の挙動に整理する
- workflow 起動方式
  - 毎日の `schedule` トリガーを削除し、`workflow_dispatch` のみで起動する構成へ変更する
  - schedule 依存の freshness 判定や関連テストが不要なら削除する
- TradingView 可視起動の担保
  - workflow の起動経路が visible window を開く前提になっているか確認し、見えない起動経路が残っていれば修正する
  - 起動後の可視セッション前提がテストで担保されるようにする
- smoke テスト短縮
  - bundle smoke の実行単位を「SP500 対象、戦略ごとに 1 回」に揃える
  - 10 戦略なら smoke 10 回で production へ進む設定に整理する
  - smoke 短縮が production 条件や resume ロジックを壊さないことを確認する

## 実装ステップ

- [ ] 現行 workflow / config / smoke bundle 解釈を読み、schedule 撤廃・可視起動・smoke 回数の決定点を特定する
- [ ] RED: `tests/windows-run-night-batch-self-hosted.test.js` に schedule 撤廃後の workflow 構成と可視起動前提を表す失敗テストを追加する
- [ ] RED: `tests/night-batch.test.js` に smoke 対象が「SP500 かつ各戦略 1 回」になることを表す失敗テストを追加する
- [ ] GREEN: `.github/workflows/night-batch-self-hosted.yml` から `schedule` と freshness 判定を外し、`workflow_dispatch` 前提に整理する
- [ ] GREEN: `.github/workflows/night-batch-self-hosted.yml` または関連設定を最小変更し、TradingView が見える起動経路だけを使うように修正する
- [ ] GREEN: `python/night_batch.py` と必要なら config を最小変更し、bundle smoke が各戦略 1 回で止まるように修正する
- [ ] REFACTOR: summary / step 名 / 設定値を見直し、挙動は維持したまま判別しやすさを整える
- [ ] 検証: 追加・更新した対象テストを実行して GREEN を確認する
- [ ] 検証: 関連する既存テスト範囲を追加実行し、night batch workflow 回りの回帰がないか確認する
- [ ] REVIEW: ロジック破綻、過剰な workflow 複雑化、resume / recovery 退行がないか見直す
- [ ] COMMIT/PUSH: 承認後の実装完了時に Conventional Commits 形式で `main` へ反映する

## テスト戦略

- RED
  - workflow 可視起動と stale skip 判別の期待をテストに先に追加する
  - smoke bundle が戦略数ぶんだけ動く期待を先に追加する
- GREEN
  - workflow / config / Python 実装を最小修正して失敗テストを通す
- REFACTOR
  - step 名や設定の重複を整理し、挙動を固定したまま読みやすさを改善する

## 検証コマンド候補

- `node --test tests/windows-run-night-batch-self-hosted.test.js`
- `node --test tests/night-batch.test.js`
- `npm run test:ci`

## リスクと注意点

- visible / hidden の差が workflow YAML だけでなく Windows shortcut 側にある可能性があり、必要なら起動引数の実態確認が要る
- schedule を外すと自動実行の安全網はなくなるため、手動起動手順の前提が workflow input と運用で明確である必要がある
- smoke 回数短縮は resume checkpoint と fingerprint に影響する可能性があるため、bundle 設定だけで済むか実装変更が要るかを切り分ける
- 既存 active plan
  - `night-batch-readiness-stabilization_20260416_1706.md`
  - `night-batch-summary-and-storage-followup_20260420_1123.md`
  と night batch 領域で近接しているため、今回は workflow 可視起動と smoke 範囲調整に限定し、summary/storage 全般には広げない

## スコープ外

- Night batch の ranking ロジック変更
- public strategy の入れ替え
- README やレポート文面だけの広範囲整理
