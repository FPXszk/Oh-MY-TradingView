# Next long-run fine-tune partial handoff（中断引き継ぎ）

- status: **PARTIAL / INTERRUPTED — 再開待ち**
- scope: `next-long-run-us-finetune-100x10` + `next-long-run-jp-finetune-100x10`, 目標 `2000 runs`, artifact 上の実績 `740 runs`（US smoke 100 + JP smoke 100 + US pilot 50 + US full 490）
- execution mode: single-worker `worker1:9225`
- 作成日時: 2026-04-10T15:03

---

## What happened

1. fine-tune backtest を `next-long-run-us-finetune-100x10`（US 100 symbols × 10 presets）と `next-long-run-jp-finetune-100x10`（JP 100 symbols × 10 presets）で開始した
2. US / JP smoke は `100/100` で全成功した
3. US pilot は `50/250`（2 preset × 25 symbols）まで進んだ時点で中断した
4. US full は `490/1000`（5 preset 処理済み: 100+100+100+100+90）まで進んだ時点で停止した
5. JP pilot / JP full は latest artifact 上では未着手に見える状態で停止した
6. 停止原因は特定されていない（worker instability の可能性を含むが未調査）

---

## Where to resume

### US campaign

| phase | done | remaining | 再開方法 |
| --- | --- | --- | --- |
| smoke | 100/100 ✅ | — | 不要 |
| pilot | 50/250 | 残り 8 preset × 25 symbols = 200 runs | checkpoint-50 から継続、または pilot を skip して full へ直行 |
| full | 490/1000 | preset #5 の残り 10 symbols + preset #6〜#10 × 100 symbols = 510 runs | checkpoint-490 から継続 |

### JP campaign

| phase | done | remaining | 再開方法 |
| --- | --- | --- | --- |
| smoke | 100/100 ✅ | — | 不要 |
| pilot | 0/250 | 全 250 runs | 新規開始 |
| full | 0/1000 | 全 1000 runs | pilot 後に開始 |

---

## Checkpoint artifacts for resume

| artifact | path |
| --- | --- |
| US pilot checkpoint | `artifacts/campaigns/next-long-run-us-finetune-100x10/pilot/checkpoint-50.json` |
| US full checkpoint | `artifacts/campaigns/next-long-run-us-finetune-100x10/full/checkpoint-490.json` |

- US full の最終処理: preset `donchian-55-20-rsp-filter-rsi14-regime-57-hard-stop-6pct-theme-deep-pullback-tight-narrow` / symbol `EFA`
- US full 開始: `2026-04-10T02:57:57.610Z`
- US full 最終更新: `2026-04-10T05:53:51.371Z`

---

## 再開前に解決すべき問題

### 1. 先頭 2 preset の metrics 完全一致（Critical）

- preset #1（`regime-55-hard-stop-10pct`）と preset #2（`regime-50-hard-stop-10pct-earlier`）で全 100 symbols の metrics が完全一致
- 再開前に、これが preset 切り替えバグか Pine パラメータ解決の仕様かを確認すること
- 確認方法の候補:
  1. 手動で 1 symbol を両 preset で個別実行し metrics を比較する
  2. Pine source 内の `regime` パラメータが実際にチャート上で異なる値で適用されているか確認する
- この問題が解決しないまま full を再開すると、同じ問題が残り 5 preset でも発生する可能性がある

### 2. 停止原因の特定（Recommended）

- worker instability / checkpoint 書き出しの問題 / セッション切断のいずれかを切り分ける
- `Oh-MY-TradingView.log` に関連エラーがあれば確認する

### 3. JP campaign の実行判断（Required）

- JP は smoke のみ完了で、pilot / full は latest artifact 上では未着手扱い
- US full の再開と JP pilot/full の新規開始をどの順序で行うか決める

---

## Execution policy for next round

- worker1 単独を前提とする（worker2 は distinct parallel smoke 安定化まで本線に戻さない）
- checkpoint 間隔は 10 run（既存設定どおり）
- `max_consecutive_failures: 5` / `max_rerun_passes: 2`（既存設定どおり）
- 再開時は checkpoint から continuation するため、完了済み run の再実行は不要

---

## 直前世代との関係

- 直前の known-good は `next-long-run-market-matched-200`（2026-04-09, US 300/300, JP 300/300）
- 直前世代の docs は `docs/research/next-long-run-market-matched-200-*_20260409_0643.md` に移動済み
- 今回の fine-tune は直前世代の結果をベースに preset を拡張したもの
- fine-tune の最終結果が出るまでは、直前世代の結論（US: entry-early vs entry-late, JP: tight vs tight-exit-tight）が引き続き有効

---

## Next decision gate

1. 先頭 2 preset の metrics 完全一致問題を調査・解決する
2. US full を checkpoint-490 から再開するか、問題 preset を除外して再設計するか判断する
3. JP pilot / full の実行スケジュールを決める
4. 全 campaign 完走後に combined ranking と Pine export を再生成する
