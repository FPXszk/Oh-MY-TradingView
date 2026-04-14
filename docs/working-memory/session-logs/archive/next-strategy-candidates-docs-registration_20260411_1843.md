# next-strategy-candidates-docs-registration_20260411_1843

## Summary

- 直近セッションで議論に上がった 9 つの次世代戦略候補を統合した research doc を `docs/research/next-strategy-candidates-integrated_20260411_1843.md` に追加した。
- 候補は MA + RSI14 再加速、MTF BB Pullback、Ren の連続陽線/陰線+BB タッチ反発、VIX 高時のみ投資、VIX+RSI14、グランビル③/⑧、REM BB Pullback Rider、RSI14 baseline、SMC 系短期裁量仮説の 9 件。
- 各候補に出典・コアアイデア・相場環境・機械化しやすさ・裁量依存度・preset 化難易度・次の検証観点を記載した。
- `docs/references/design-ref-llms.md` に概念出典と具体的な投稿 / script URL の両方を追記した。
- `docs/DOCUMENTATION_SYSTEM.md` に導線を追加した。
- active backtest 中のため docs 登録を本線とし、preset/builder 拡張は別作業であることを明記した。
- GitHub self-hosted runner `omtv-win-01` は **online / idle (`busy: false`)** であることを確認した。
- 一方、detached state file は `running` のままだが、対応 PID `114593` は存在せず、production log も `checkpoint-40` 以降の更新がないため、**current detached full run は stale state の可能性が高い** と判断した。
- current detached full run の最新可観測結果は `docs/research/results/campaigns/next-long-run-us-finetune-100x10/full/checkpoint-40.json` で、`40/1000` 完了、平均 net profit `6255.53`、平均 PF `1.313`、平均 max drawdown `5027.19`。上位は `AAPL` / `CAT` / `DIS`、下位は `INTC` / `VZ` / `T`。
- 直前の older interrupted run として `checkpoint-490.json` も残っており、こちらは `490/1000` まで進んだ記録がある。現時点では **runner は生きているが production 本体は走っていない / resume していない** 状態として扱うのが妥当。

## Files

- Added: `docs/research/next-strategy-candidates-integrated_20260411_1843.md`
- Added: `docs/working-memory/session-logs/next-strategy-candidates-docs-registration_20260411_1843.md`
- Modified: `docs/references/design-ref-llms.md`（概念出典と具体的な参照元を追加）
- Modified: `docs/DOCUMENTATION_SYSTEM.md`（次戦略候補セクション追加）

## Validation

- `docs/DOCUMENTATION_SYSTEM.md` の導線から新規 doc へ正しくリンクされていることを確認した。
- `npm test` を実行し、既存 test suite が通ることを確認した。
- `gh api repos/FPXszk/Oh-MY-TradingView/actions/runners` で self-hosted runner 状態を確認した。
- `ps -p 114593` と production process 検索で detached child の実体を確認した。
- `tail -n 120 docs/research/results/night-batch/20260410_112937_production.log` で最新 checkpoint を確認した。
- `jq` で `checkpoint-40.json` と `checkpoint-490.json` の要約を抽出した。

## Notes

- `config/backtest/strategy-presets.json` および `src/core/*` は変更していない。
- preset 化は active backtest 完了後に別 exec-plan で行う方針。
- 優先順位は「機械化しやすさ × preset 化難易度 × 既存 infra との親和性」を軸に設定した。
- `docs/research/results/night-batch/bundle-detached-reuse-state.json` は `status: running` を保持しているが、対応する `summary_path` は存在せず、round5 配下の state file も見当たらなかった。
- `docs/research/results/night-batch/round5/20260410_162254-summary.md` 上では smoke-prod と detach-production は success になっているため、停止点は **production child 起動後〜checkpoint-40 以降** のどこかにある。
