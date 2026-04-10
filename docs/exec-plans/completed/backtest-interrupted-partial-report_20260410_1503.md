# 実行計画: interrupted backtest partial report 化 (20260410_1503)

- ステータス: PLAN
- 前提ブランチ: `main`
- 種別: artifact recovery / documentation

## Problem / approach

実行中だった fine-tune backtest が途中で停止しており、今回は**再開や再実行を行わず**、停止時点までの artifact をもとに「ここまででわかったこと」を latest 世代の文書として残す。  
数値は checkpoint / recovered artifact にあるものだけを採用し、**未完了 phase・未実行 preset・集計上の違和感は未検証として明記**する。

## Current recovered state

1. active exec-plan は空で、**競合する進行中 plan はない**
2. 直前の known-good latest は `next-long-run-market-matched-200` generation
3. 今回の停止痕跡として以下を確認済み
   - `results/campaigns/next-long-run-us-finetune-100x10/smoke/recovered-summary.json`: `100/100`
   - `results/campaigns/next-long-run-us-finetune-100x10/pilot/checkpoint-50.json`: `50/250`
   - `results/campaigns/next-long-run-us-finetune-100x10/full/checkpoint-490.json`: `490/1000`
   - `results/campaigns/next-long-run-jp-finetune-100x10/smoke/recovered-summary.json`: smoke 完了
4. US full partial は preset coverage が
   - 4 preset 完走 `100/100`
   - 1 preset 途中 `90/100`
   - 残り 5 preset 未着手
   という形
5. US full partial では先頭 2 preset の metrics が symbol ごとに完全一致しており、**解釈前に未検証注記が必要**

## Goal

1. 停止時点の backtest 成果を、再現可能な source artifact 付きで latest 世代へ残す
2. 「確定値」「途中までの観測」「未検証・未実行」を文書上で明確に分離する
3. 次回再開時に、どこから再開すべきか判断できる handoff を残す

## In scope

- `next-long-run-us-finetune-100x10` の smoke / pilot / full partial 整理
- `next-long-run-jp-finetune-100x10` の smoke 整理
- latest research docs の世代更新
- session log / handoff 更新

## Out of scope

- backtest の再開・再実行
- worker instability の修正
- partial artifact を正規化するための新規ロジック追加
- ranking / Pine export の再生成
- unrelated code changes

## Files to inspect

- `config/backtest/campaigns/next-long-run-us-finetune-100x10.json`
- `config/backtest/campaigns/next-long-run-jp-finetune-100x10.json`
- `results/campaigns/next-long-run-us-finetune-100x10/smoke/recovered-summary.json`
- `results/campaigns/next-long-run-us-finetune-100x10/pilot/checkpoint-50.json`
- `results/campaigns/next-long-run-us-finetune-100x10/full/checkpoint-490.json`
- `results/campaigns/next-long-run-jp-finetune-100x10/smoke/recovered-summary.json`
- `docs/research/latest/README.md`
- `docs/research/latest/next-long-run-market-matched-200-handoff_20260409_0643.md`
- `docs/research/latest/next-long-run-market-matched-200-results_20260409_0643.md`
- `docs/exec-plans/completed/rich-results-finetune-parallel-backtest_20260409_1525.md`

## Files to create / modify / move

### Create

- `docs/research/latest/next-long-run-finetune-partial-results_20260410_1503.md`
- `docs/research/latest/next-long-run-finetune-partial-handoff_20260410_1503.md`
- `docs/working-memory/session-logs/backtest-interrupted-partial-report_20260410_1503.md`

### Modify

- `docs/research/latest/README.md`

### Move

- `docs/research/latest/next-long-run-market-matched-200-handoff_20260409_0643.md`
  -> `docs/research/next-long-run-market-matched-200-handoff_20260409_0643.md`
- `docs/research/latest/next-long-run-market-matched-200-results_20260409_0643.md`
  -> `docs/research/next-long-run-market-matched-200-results_20260409_0643.md`

## Report design

### 確定値として書くもの

- US smoke `100/100`
- JP smoke の recovered summary
- US pilot `50/250` までの進捗
- US full `490/1000` までの進捗
- US full で完走済み preset のみを対象にした暫定平均
- 最終 checkpoint timestamp と last processed symbol / preset

### 未検証として書くもの

- US pilot / full の未完部分
- JP pilot / full 未着手
- 全 10 preset 比較の結論
- combined ranking 不在
- 先頭 2 preset の metrics 完全一致が、実装上の同値なのか集計上の問題なのか
- full partial の途中集計が最終順位をどの程度代表するか

## Test strategy (RED -> GREEN -> REFACTOR)

### RED

- もし artifact 読み出し用の script や既存 helper に修正が必要と判明した場合のみ、関連テストを先に失敗で固定する

### GREEN

- 今回は原則 doc 更新のみで進め、既存 artifact から最小限の集計で文書を作る

### REFACTOR

- code touch が発生した場合のみ、重複集計や命名を整理する

## Validation

- 文書内の run count / preset coverage / timestamp を source artifact と突き合わせる
- latest `README.md` の pointer が新世代へ向くことを確認する
- code 変更が入った場合のみ `npm test` を実行する

## Risks / unknowns

1. partial artifact だけでは最終結論を出し切れない
2. identical metrics の 2 preset は、見かけ上の一致ではなく実際に同一挙動の可能性もある
3. phase ごとに artifact の粒度が揃っておらず、US pilot / JP smoke は summary の厚みが不足する
4. latest 世代を partial report に切り替えるため、README で「暫定世代」であることを明示しないと誤読される

## Implementation checklist

- [ ] source artifact を phase ごとに棚卸しし、使う数値の正本を固定する
- [ ] US full partial から preset coverage と暫定平均を抽出する
- [ ] identical metrics の 2 preset を未検証事項として整理する
- [ ] partial results doc を作成する
- [ ] partial handoff doc を作成する
- [ ] session log を追加する
- [ ] latest README を partial generation 向けに更新する
- [ ] 直前 latest docs を `docs/research/` へ移動する
- [ ] 文書中の数値と source artifact の一致を再確認する

## Approval-time confirmation item

1. 今回は **バックテスト再開なし**で、停止時点の partial artifact をもとに latest 世代の報告書へ更新する
