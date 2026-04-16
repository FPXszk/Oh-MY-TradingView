# Strategy research guide

このディレクトリは **README から入ったあとに、戦略・銘柄・判断基準を人間向けに読むための分岐先** です。  
初見でも「何本の戦略があり、どの銘柄群・期間で見ているか」「テーマ投資をどう判断しているか」をすぐ把握できるようにします。

## 読む順番

1. repo の入口として `../../../README.md`
2. この `README.md`
3. `theme-momentum-definition.md`
4. `current-strategy-reference.md`
5. `current-symbol-reference.md`
6. 必要なら `../current/main-backtest-current-summary.md`
7. 数値の根拠が必要なら `../../../references/backtests/README.md` と `../../../artifacts/`

## ファイルの役割

| file | role |
| --- | --- |
| `theme-momentum-definition.md` | テーマ投資で「モメンタムのある銘柄」をどう判断するかの手書き定義 |
| `current-strategy-reference.md` | 全戦略の一覧、lifecycle、theme、current score |
| `current-symbol-reference.md` | current universe の銘柄一覧、bucket、best strategy、期間 |

## source of truth

- strategy metadata: `config/backtest/strategy-catalog.json`
- current campaign / universe: `config/backtest/campaigns/current/`, `config/backtest/universes/current/`
- raw backtest artifact: `references/backtests/`, `artifacts/`
- テーマ投資の判断基準の元ネタ: `docs/research/archive/theme-signal-observation-round6_2015_2025.md`, `docs/research/archive/theme-strategy-shortlist-round6_2015_2025.md`

## 注意

- ここは人間向けの読みやすさを優先した layer です
- `theme-momentum-definition.md` は手書きの stable reference、`current-*.md` は generator で更新される generated doc です
- campaign / universe は current config を優先して表示する一方、score 列は利用可能な最新 artifact で埋まる
- 数値が必要なら raw artifact を見る
- 未検証の戦略は current score が `—` のまま残ります
