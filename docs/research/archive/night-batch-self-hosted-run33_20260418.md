# Night Batch Self Hosted — Run 33 結果レポート

## 概要

| 項目 | 値 |
|---|---|
| workflow | Night Batch Self Hosted |
| branch | `main` |
| run_number | 33 |
| run_id | 24606641443 |
| event | `workflow_dispatch` |
| workflow 結果 | **success** |
| backtest 結果 | **success**（job log 上で smoke / full 完走を確認） |

**結論: `main` の手動 run 33 は success。**  
TradingView 起動確認・readiness diagnostics・foreground production まで通り、US/JP の smoke / full が checkpoint 最終到達まで進んでいます。

---

## log ベースの結果サマリー

artifact upload は skip されていたため、この文書は **job log を正本**にして再構成しています。

| フィールド | 値 | 説明 |
|---|---|---|
| `success` | `true` | workflow / foreground production とも正常完了 |
| `termination_reason` | `success` | `night_batch.py` の summary 書き出しまで到達 |
| `failed_step` | `—` | 失敗ステップなし |
| `last_checkpoint` | `artifacts/campaigns/strongest-overlay-jp-50x9.json/full/checkpoint-450.json` | log 末尾で確認できた最終 checkpoint |
| `command` | `smoke-prod` | workflow 本体コマンド |
| `host` | `172.31.144.1` | `bundle-foreground-reuse-config.json` の runtime.host |
| `port` | `9223` | `bundle-foreground-reuse-config.json` の runtime.port |
| `summary_md` | `artifacts/night-batch/round15/gha_24606641443_1-summary.md` | log 上で summary 書き出し確認 |
| `current_summary_write` | `docs/research/current/main-backtest-current-summary.md` | runner 上では current summary 再生成まで到達 |

### Workflow steps

| step | conclusion | 補足 |
| --- | --- | --- |
| Ensure TradingView is running | success | 起動確認と 9222 readiness を通過 |
| Readiness diagnostics | success | bridge / status 診断を通過 |
| Run smoke gate and foreground production | success | smoke / full の本体処理が完走 |
| Locate night batch outputs | success | 後段 step 自体は実行 |
| Append night batch workflow summary | success | GitHub summary 追記 step 自体は実行 |
| Upload night batch artifacts | skipped | output locator が成果物を見つけられず skip |
| Archive completed night batch rounds | success | round 完了後の archive step は成功 |

### 市場別の到達点

| market | smoke | full | 根拠 |
| --- | --- | --- | --- |
| US | `checkpoint-92.json` / `recovered-summary.json` | `checkpoint-450.json` / `recovered-summary.json` | job log |
| JP | `checkpoint-90.json` / `recovered-summary.json` | `checkpoint-450.json` / `recovered-summary.json` | job log |

### 確認できた出力パス

- US smoke recovered: `artifacts/campaigns/strongest-overlay-us-50x9.json/smoke/recovered-summary.json`
- JP smoke recovered: `artifacts/campaigns/strongest-overlay-jp-50x9.json/smoke/recovered-summary.json`
- US full recovered: `artifacts/campaigns/strongest-overlay-us-50x9.json/full/recovered-summary.json`
- JP full recovered: `artifacts/campaigns/strongest-overlay-jp-50x9.json/full/recovered-summary.json`
- round summary: `artifacts/night-batch/round15/gha_24606641443_1-summary.md`
- current summary regenerated on runner: `docs/research/current/main-backtest-current-summary.md`

## 補足

- この run では `night_batch.py` 自体は current summary を再生成しているが、workflow はその変更を Git へ commit / push しないため、このリポジトリの tracked file は自動では更新されない。
- さらに workflow の output locator は `results/night-batch` を見ており、実際の出力先 `artifacts/night-batch` を見ていなかったため、artifact upload が skip されていた。
- したがって **「runner 上の生成」は自動だが、「repo への反映」は自動ではない** 状態だった。この文書はそのギャップを埋める手動同期メモ。
