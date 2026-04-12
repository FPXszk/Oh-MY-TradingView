# Night Batch Run 8 結果記録

## 実行識別

| 項目 | 値 |
| --- | --- |
| workflow | Night Batch Self Hosted |
| run_number | 8 |
| run_id | 24282322391 |
| commit | 2c23e7ab53d11d74711583aa35e15ef26ccb50f0 |
| branch | main |
| runner | omtv-win-01 (self-hosted, windows) |
| 開始 | 2026-04-11T14:44:08Z |
| 終了 | 2026-04-11T18:54:42Z |
| 実行時間 | 約 4 時間 10 分 |

## 結論

**バックテスト本体は正常に完了。workflow failure の原因は summary 追記ステップの PowerShell 構文エラーのみ。**

## ステップ別結果

| # | ステップ | 結果 |
| ---: | --- | --- |
| 1 | Set up job | success |
| 2 | Run actions/checkout@v4 | success |
| 3 | Evaluate schedule freshness | success |
| 4 | Install dependencies in WSL workspace | success |
| 5 | Run smoke gate and foreground production | success |
| 6 | Locate night batch outputs | success |
| 7 | Append night batch workflow summary | **failure** |
| 8 | Upload night batch artifacts | success |

## バックテスト結果（artifact より）

- **success**: true
- **termination_reason**: success
- **command**: smoke-prod
- **host / port**: 172.31.144.1 / 9223
- **round**: 2 (advance-next-round)
- **round_mode**: advance-next-round
- **last_checkpoint**: results/campaigns/next-long-run-jp-finetune-100x10/full/checkpoint-1006.json
- **failed_step**: startup-check（初回の TradingView 起動確認のみ失敗。その後 launch で起動し、以降の全ステップ success）

### バックテスト実行ステップ

| step | success | exit_code | timed_out | latest_checkpoint |
| --- | --- | ---: | --- | --- |
| startup-check | False | 1 | False | — |
| launch | True | 0 | False | — |
| preflight | True | 0 | False | — |
| smoke | True | 0 | False | checkpoint-10.json |
| production | True | 0 | False | checkpoint-1006.json |

## Artifact

- **artifact_id**: 6387504266
- **artifact_name**: night-batch-24282322391-1
- **size**: 28,818 bytes
- **ファイル数**: 5（`gha_24282322391_1-summary.json`, `gha_24282322391_1-summary.md`, `bundle-foreground-state.json`, `round-manifest.json`, `gha_24282322391_1.log`）
- **URL**: https://github.com/FPXszk/Oh-MY-TradingView/actions/runs/24282322391/artifacts/6387504266

## Step 7 失敗の根本原因

Windows PowerShell 5.1 の parser error。以下の構文が原因:

```powershell
Add-Content $env:GITHUB_STEP_SUMMARY ('- last_checkpoint: ' + ($(if ($summary.last_checkpoint) { $summary.last_checkpoint } else { '—' })))
```

PowerShell が `'- last_checkpoint: '` を文字列リテラルではなく `-` 演算子 + 識別子 `last_checkpoint:` と解釈し、`ExpectedValueExpression` エラーが発生。

## 修正内容

nullable フィールド（`failed_step`, `last_checkpoint`）を事前に変数へ代入し、`Add-Content` では単純な文字列展開のみ使用する形に変更。テストで同種の unsafe パターンを検出する guard を追加。
