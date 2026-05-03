# Exec-plan: emr-ae-tpqty-54pack-plus-baseline_20260503_1558

## 目的

前回提案した `54本の TP1/QTY sweep` に、baseline として  
`docs/references/pine/EMA + MACD + RSI Strategy + SL/EMA + MACD + RSI Strategy + SL.pine`
を 1 本追加し、focus-8 用の比較 campaign と smoke workflow 実行対象を登録する。

最終ゴールは、`55本（54 sweep + 1 baseline）` が repo 上で backtest 可能になり、smoke workflow を dispatch して起動確認まで行うこと。

## 変更対象ファイル

| ファイル | 区分 | 変更内容 | 影響範囲 |
|---|---|---|---|
| `config/backtest/strategy-presets.json` | 更新 | 54本 sweep と baseline 1本を live preset として登録 | backtest preset 解決 |
| `config/backtest/strategy-catalog.json` | 更新 | 追加 preset の catalog 登録 | campaign の実行対象解決 |
| `config/backtest/campaigns/*.json` | 新規作成 | 55本を束ねる focus-8 campaign を追加 | smoke / full 実行単位 |
| `config/night_batch/*.json` | 新規作成 | 上記 campaign 用 smoke/full bundle config を追加 | workflow dispatch |
| `docs/references/pine/emr-ae-tpqty-100pack/*` | 参照のみ or 一部流用 | 54本 sweep 定義のベース確認 | preset 参照元 |
| `docs/references/pine/EMA + MACD + RSI Strategy + SL/EMA + MACD + RSI Strategy + SL.pine` | 参照元 | baseline Pine source を preset 参照元として使う | baseline backtest source |
| `docs/exec-plans/completed/emr-ae-tpqty-54pack-plus-baseline_20260503_1558.md` | 移動 | 完了時に plan を completed へ移動 | planning record |

## スコープ

### 実施すること

- `tp1Pct`: `8, 10, 12, 15, 18, 25`
- `tp1Qty`: `0, 5, 10, 15, 20, 25, 33, 50, 100`

上記の直積から、`q0` baseline を含む 54 本を登録する。

- `EMA + MACD + RSI Strategy + SL` を別系統 baseline として 1 本追加する
- focus-8 universe を使う新 campaign を作る
- smoke/full bundle config を追加する
- `gh workflow run night-batch-smoke.yml --ref main -f config_path=...` で smoke workflow を dispatch する

### 今回やらないこと

- full production workflow の完走確認
- 55本の結果要約ドキュメント作成
- TP 指標算出ロジックや `TEMPLATE-TP.md` 連動実装
- 既存 100-pack campaign の削除や置換

## 実装方針

- 既存 `emr-ae-tpqty-100pack-focus8` を壊さず、新しい 55本 campaign を追加する
- `54本 sweep` は既存 EMR A+E no-trail 系と同じ family に揃える
- `EMA + MACD + RSI Strategy` baseline は別 family だが、比較対照として同一 campaign に混在させる
- baseline 1本を入れるために 54 本の構成は変更しない
- smoke phase は既存流儀に合わせて `SPY` 1銘柄で bundle 起動確認を行う

## 実装詳細

### 54本 sweep の前提

- `tp1Pct`: `8, 10, 12, 15, 18, 25`
- `tp1Qty`: `0, 5, 10, 15, 20, 25, 33, 50, 100`
- 固定条件は既存 proposal 通り
  - vol1.3x
  - price above EMA200
  - fixed stop 8
  - close above 10d high
  - no EMA20 trail

### baseline 1本の前提

- source: `docs/references/pine/EMA + MACD + RSI Strategy + SL/EMA + MACD + RSI Strategy + SL.pine`
- 比較対象として campaign に同居させる
- presetId / catalog 名称は既存命名と衝突しない専用 ID にする

## テスト・検証

- `node` / repo 既存 validation があれば、追加 campaign と preset の解決が通ることを確認する
- `git diff` で変更対象が plan 記載ファイルに限定されていることを確認する
- `gh workflow run night-batch-smoke.yml --ref main -f config_path=<new config>` を実行し、workflow run が作成されることを確認する

## リスク・注意点

- `q0` を EMR sweep 側に入れるため、既存 100-pack には存在しない preset 群を新たに定義する必要がある
- `tp1Qty=100` は実質 full exit なので、EMR sweep の命名と comment を明確にしないと誤解されやすい
- baseline Pine は EMR A+E 系とロジックが異なるため、比較用 baseline として文言を区別する必要がある
- smoke workflow dispatch はネットワーク/gh 環境依存があるため、dispatch 自体が通らない場合はその時点の blocker を記録する

## 競合確認

- active plan との直接競合は見当たらない
- `.codex/config.toml` に未コミット変更があるが今回タスクとは無関係なので触らない

## 実装ステップ

- [ ] 54本 sweep の presetId 命名規則と baseline 追加用 presetId を確定する
- [ ] `strategy-presets.json` と `strategy-catalog.json` に 55本を登録する
- [ ] focus-8 用の新 campaign と night batch config を追加する
- [ ] ローカルで preset/campaign 解決を確認する
- [ ] smoke workflow を dispatch し、run 作成まで確認する
- [ ] plan を completed へ移動し、変更をコミットする
