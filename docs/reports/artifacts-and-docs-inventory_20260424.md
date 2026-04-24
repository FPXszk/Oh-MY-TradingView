# Artifacts / Docs 棚卸し 2026-04-24

## artifacts の現行整理

| path | 用途 | 現在の扱い |
| --- | --- | --- |
| `artifacts/campaigns/` | workflow / 手動 backtest の strategy 別結果、checkpoint、ranking 正本 | **主系統** |
| `artifacts/night-batch/` | round summary、workflow 実行補助、main current 生成物 | **主系統** |
| `artifacts/runtime-verification/` | runtime 検証結果 | **主系統** |
| `artifacts/devinit/` | devinit wrapper の異常終了 evidence | **通常運用から外したため不要候補** |

## docs の現行整理

| path | 用途 | 現在の扱い |
| --- | --- | --- |
| `docs/research/current/` | 今見る current handoff / current summary / artifact ranking 表 | **主系統** |
| `docs/research/strategy/` | 戦略と銘柄の人間向け説明 | **主系統** |
| `docs/reports/` | 個別 run report / incident / 棚卸しメモ | **主系統** |
| `docs/research/archive/` | current から外れた過去文書 | **保管** |
| `docs/exec-plans/active/` | 未完の実装計画 | **運用系** |
| `docs/exec-plans/completed/` | 完了済み実装計画 | **運用系** |

## 分かりづらさの原因

- workflow 実行結果の正本が `artifacts/campaigns/` にある一方、download artifact は round directory 中心で、保存導線が分断されていた
- current の比較表が report と summary に散っており、artifact 起点の一覧がなかった
- devinit 調査用 wrapper の説明が README と `artifacts/` に残り続け、通常運用と調査用経路が混ざっていた

## 今回の整理後の見方

1. 実行結果の正本は `artifacts/campaigns/<campaign>/<phase>/`
2. current で比較したいときは `docs/research/current/artifacts-backtest-scoreboards.md`
3. 個別 run の文脈は `docs/research/current/night-batch-self-hosted-run*.md` と `docs/reports/`

## 手動削除候補

- `artifacts/devinit/`
- `logs/devinit/`

上記 2 つは今回の通常起動経路から外したため、保持理由がなければ手動で整理して問題ありません。
