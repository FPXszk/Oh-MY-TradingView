# DOCUMENTATION_SYSTEM

## この文書の役割

この repo の文書導線と、`latest / archive` の扱いを定義する。

## 最初に読む順番

1. `.github/copilot-instructions.md`
2. `README.md`
3. `docs/explain-forhuman.md`
4. `docs/command.md`
5. `docs/research/latest/README.md`

## 現在の docs 構成

| path | role | rule |
| --- | --- | --- |
| `docs/research/latest/` | 最新 1 世代の handoff / 要約 / 次の入口 | stale な世代は置かない |
| `docs/research/archive/` | latest から外れた研究 docs | 既定では読まない |
| `docs/research/results/` | 実行 artifact・night batch 出力・campaign result | committed doc ではなく成果物置き場 |
| `docs/references/` | raw data / 参照 JSON / 外部資料固定スナップショット | 数値の正本 |
| `docs/bad-strategy/` | live set から外した strategy preset の退避先 | `retired-strategy-presets.json` を維持 |
| `docs/working-memory/session-logs/` | 最新 1 件の session log | それ以外は `archive/` へ退避 |
| `docs/exec-plans/active/` | 承認待ち・進行中 plan | 完了後は `completed/` へ移す |
| `docs/exec-plans/completed/` | 完了済み plan | 履歴として保持 |

## latest / archive ルール

- `docs/research/latest/` は **README + 現在の latest 世代 docs** だけを置く
- latest から外れた research doc は `docs/research/archive/` へ移す
- `docs/working-memory/session-logs/` は **top-level に最新 1 件だけ** 残し、過去分は `archive/` へ移す
- `config/backtest/campaigns/` と `config/backtest/universes/` は `latest/` と `archive/` に分ける
- `config/backtest/strategy-presets.json` は live で使う strongest set のみを残し、残りは `docs/bad-strategy/retired-strategy-presets.json` へ退避する
- `docs/research/results/night-batch/archive/roundN/` は完了 round の退避先とする

## どこを見るか

### 今の運用と最新結果を知りたい

- `docs/explain-forhuman.md`
- `docs/command.md`
- `docs/research/latest/README.md`
- `docs/research/latest/main-backtest-latest-summary.md`

### 過去の研究や旧世代 handoff を見たい

- `docs/research/archive/README.md`
- `docs/research/archive/`

### 実測 artifact を見たい

- `docs/research/results/`
- `docs/references/backtests/`

### なぜ外した戦略かを見たい

- `docs/bad-strategy/README.md`
- `docs/bad-strategy/retired-strategy-presets.json`

### 直近の判断経緯を見たい

- `docs/working-memory/session-logs/`
- 必要なら `docs/working-memory/session-logs/archive/`

## 更新時の必須ルール

- 新しい latest doc を置いたら、古い latest doc は `docs/research/archive/` へ移す
- session log を追加したら、前の top-level log は `archive/` へ移す
- path を変えたら `README.md`、`docs/command.md`、関連テストを同時に直す
- 数値の根拠は `docs/references/backtests/` か `docs/research/results/` に残す
