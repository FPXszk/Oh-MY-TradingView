# DOCUMENTATION_SYSTEM

この文書は、この repo の **情報アーキテクチャの保守ルール** を定義します。  
一次入口は `../README.md`、docs 配下の目次は `./README.md` です。

## 基本原則

1. `docs/` は **人間向けの説明**
2. `references/` は **再利用する参照物と数値の根拠**
3. `artifacts/` は **run ごとの生成物**
4. `logs/` は **判断ログと transcript**
5. `plans/` は **durable な実装計画**

## `current` と `archive`

- `current` は **今の入口として読むべきもの**
- `archive` は **履歴として残すもの**
- `latest` は path 名として使わず、必要なときだけ「最新 artifact」のような自然文で使う

## 主な配置

| path | role |
| --- | --- |
| `docs/research/current/` | current handoff と main summary の入口 |
| `docs/research/archive/` | 過去の handoff / research doc |
| `docs/research/strategy/` | 戦略・銘柄の人間向け説明 |
| `docs/research/strategy/retired/` | retired preset の説明と退避先 |
| `references/backtests/` | ranking / summary などの数値根拠 |
| `references/pine/` | Pine source snapshot |
| `references/external/` | 外部調査台帳 |
| `artifacts/` | night batch / campaign / runtime verification の生成物 |
| `logs/sessions/` | 直近の判断ログ |
| `plans/exec/` | exec-plan の active / completed |

## 更新ルール

- `docs/research/current/` には current 世代だけを置き、外れたものは `docs/research/archive/` へ移す
- `logs/sessions/` の古いものは `logs/sessions/archive/` へ移す
- `config/backtest/campaigns/current/` と `config/backtest/universes/current/` を current config の正本にする
- `config/backtest/strategy-presets.json` は live set、`docs/research/strategy/retired/retired-strategy-presets.json` は retired set とする
- path を変えたら `README.md`、この文書、関連テストを同時に直す

## 読み分け

- 今の状況を知る: `../README.md` → `./research/current/README.md` → `./research/strategy/README.md`
- 数値の根拠を見る: `../references/backtests/README.md`
- 生成物を追う: `../artifacts/README.md`
- 判断経緯を追う: `../logs/README.md`
