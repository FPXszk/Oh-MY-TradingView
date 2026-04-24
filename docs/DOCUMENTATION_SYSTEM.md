# DOCUMENTATION_SYSTEM

この文書は、この repo の **情報アーキテクチャの保守ルール** を定義します。  
一次入口は `../README.md`、docs 配下の目次は `./README.md` です。

## 基本原則

1. `docs/` は **人間向けの説明・参照物・実装計画**
2. `docs/references/` は **再利用する参照物**
3. `artifacts/` は **run ごとの生成物**
4. `logs/` は **runtime ログ**
5. `docs/exec-plans/` は **durable な実装計画**

## `current` と `archive`

- `current` は **今の入口として読むべきもの**
- `archive` は **履歴として残すもの**
- `latest` は path 名として使わず、必要なときだけ「最新 artifact」のような自然文で使う

## 主な配置

| path | role |
| --- | --- |
| `docs/research/` | current research docs の入口（manifest.json で keep-set を管理） |
| `docs/research/archive/` | 過去の handoff / research doc |
| `docs/strategy/` | 戦略・銘柄の人間向け説明 |
| `docs/research/archive/retired/` | retired preset の説明と退避先 |
| `docs/references/pine/` | Pine source snapshot |
| `docs/references/design-ref-llms.md` | 外部調査台帳 |
| `artifacts/` | night batch / campaign / runtime verification の生成物 |
| `docs/sessions/` | 直近の判断ログ |
| `docs/exec-plans/` | exec-plan の active / completed |

## 更新ルール

- `docs/research/` には `manifest.json` の `keep` に列挙した current docs を置き、outdated になったものは `docs/research/archive/` へ移す
- `docs/sessions/` の古いものは `docs/sessions/archive/` へ移す
- `config/backtest/strategy-presets.json` は live set、`docs/research/archive/retired/retired-strategy-presets.json` は retired set とする
- path を変えたら `README.md`、この文書、関連テストを同時に直す

## 読み分け

- 今の状況を知る: `../README.md` → `./research/artifacts-backtest-scoreboards.md` → `./strategy/current-strategy-reference.md`
- 生成物を追う: `../artifacts/campaigns/`
- 判断経緯を追う: `./sessions/`
- Pine 参照: `./references/pine/`
- 外部調査台帳: `./references/design-ref-llms.md`
