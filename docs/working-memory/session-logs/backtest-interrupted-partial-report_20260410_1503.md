# Session log: backtest-interrupted-partial-report (20260410_1503)

## Context

fine-tune backtest（`next-long-run-us-finetune-100x10` / `next-long-run-jp-finetune-100x10`）が途中で停止したため、
再実行せずに停止時点の checkpoint artifact から暫定的な latest 世代報告書を作成した。

## 実施内容

1. `results/campaigns/next-long-run-us-finetune-100x10/` 配下の checkpoint を棚卸し
   - smoke `recovered-summary.json`: 100/100 全成功
   - pilot `checkpoint-50.json`: 50/250（2 preset × 25 symbols）
   - full `checkpoint-490.json`: 490/1000（5 preset 処理済み: 100+100+100+100+90）
2. `results/campaigns/next-long-run-jp-finetune-100x10/` 配下を確認
   - smoke `recovered-summary.json`: 100/100 全成功
   - pilot / full: artifact なし（latest 上は未着手扱い）
3. US full checkpoint-490 から preset ごとの coverage と暫定 aggregate を算出
4. 先頭 2 preset の metrics 完全一致（100/100 symbols で 5 指標すべて同値）を検出・未検証事項として記録
5. latest 世代の docs を更新:
   - 直前世代 `next-long-run-market-matched-200-*_20260409_0643.md` を `docs/research/` へ移動
   - `docs/research/latest/next-long-run-finetune-partial-results_20260410_1503.md` を作成
   - `docs/research/latest/next-long-run-finetune-partial-handoff_20260410_1503.md` を作成
   - `docs/research/latest/README.md` を暫定世代向けに更新

## Key numbers（source artifact との照合済み）

| item | value | source |
| --- | ---: | --- |
| US smoke success | 100/100 | `recovered-summary.json` |
| JP smoke success | 100/100 | `recovered-summary.json` |
| US pilot completed | 50/250 | `checkpoint-50.json` .completed |
| US full completed | 490/1000 | `checkpoint-490.json` .completed |
| US full preset coverage | 100,100,100,100,90 / 5 preset | checkpoint 集計 |
| US full unstarted presets | 5 | campaign config 10 - 処理済み 5 |
| US full avg net (490 run) | 8840.04 | checkpoint 集計 |
| US full avg PF (490 run) | 1.3995 | checkpoint 集計 |
| US full positive runs | 358/490 (73.1%) | checkpoint 集計 |
| Identical metrics presets | preset #1 vs #2, 100/100 symbols | checkpoint 集計 |
| Full last preset/symbol | tight-narrow / EFA | checkpoint 最終 entry |
| Full started_at | 2026-04-10T02:57:57.610Z | checkpoint header |
| Full updated_at | 2026-04-10T05:53:51.371Z | checkpoint header |

## Decisions made

- backtest は再開しない（docs-only recovery）
- 停止原因の調査は本セッションの scope 外とした
- 先頭 2 preset の同一 metrics は「未検証」として記録し、解釈を付けなかった
- latest 世代を「暫定世代」として明記し、直前世代の結論は依然有効とした

## Open items

- [ ] 先頭 2 preset の metrics 完全一致の原因調査
- [ ] US full の残り 510 runs の再開判断
- [ ] JP pilot / full の実行判断
- [ ] combined ranking / Pine export の再生成（全 campaign 完走後）
