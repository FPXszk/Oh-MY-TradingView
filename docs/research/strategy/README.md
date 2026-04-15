# Strategy research guide

このディレクトリは **README から入ったあとに、戦略と銘柄を人間向けに読むための分岐先** です。  
初見でも「何本の戦略があり、どの銘柄群・期間で見ているか」をすぐ把握できるようにします。

## 読む順番

1. repo の入口として `../../../README.md`
2. `latest-strategy-reference.md`
3. `latest-symbol-reference.md`
4. 必要なら `../latest/main-backtest-latest-summary.md`
5. 数値の根拠が必要なら `../../references/backtests/README.md` と `../results/`

## ファイルの役割

| file | role |
| --- | --- |
| `latest-strategy-reference.md` | 全戦略の一覧、lifecycle、theme、最新スコア |
| `latest-symbol-reference.md` | latest universe の銘柄一覧、bucket、best strategy、期間 |

## source of truth

- strategy metadata: `config/backtest/strategy-catalog.json`
- latest campaign / universe: `config/backtest/campaigns/latest/`, `config/backtest/universes/latest/`
- raw backtest artifact: `docs/references/backtests/`, `docs/research/results/`

## 注意

- ここは人間向けの読みやすさを優先した layer です
- campaign / universe は latest config を優先して表示する一方、score 列は利用可能な最新 artifact で埋まる
- 数値が必要なら raw artifact を見る
- 未検証の戦略は latest score が `—` のまま残ります
