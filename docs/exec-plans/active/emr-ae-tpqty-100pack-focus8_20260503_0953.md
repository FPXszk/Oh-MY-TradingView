# emr-ae-tpqty-100pack-focus8: `emr-ae-v13-tp10-qty25` 基準の TP/QTY 100戦略探索

## 目的

`emr-ae-v13-tp10-qty25` を固定ベースとして、**初回利確の発動幅 (`tp1Pct`) と利確比率 (`tp1Qty`) の最適値**を  
focus-8 の同一 8 銘柄で 100 戦略比較できる状態にする。

狙いは、前回 run89 で見えた「勝ち銘柄を早く刈り取りすぎて net profit が伸びない」問題に対して、
volume / trend / stop / trail は固定しつつ **TP の深さと利確量だけ**を切り分けること。

---

## 前提と比較設計

### 固定する基準戦略

ベースは `emr-ae-v13-tp10-qty25` とし、以下は全 100 戦略で固定する。

- `breakoutVolumeRatio = 1.3`
- `trendMode = price_above_ema200`
- `stopPct = 8`
- `trailMode = ema20`
- `trailActivationPct = tp1Pct`
- `breakoutCloseLen = 10`
- その他の reentry / profitProtect / delay 系パラメータは据え置き

### 100戦略のグリッド案

`tp1Pct` と `tp1Qty` を 10 × 10 で振る。

- `tp1Pct`: `6, 8, 10, 12, 15, 18, 20, 25, 30, 35`
- `tp1Qty`: `5, 10, 15, 20, 25, 30, 35, 40, 50, 60`

この案なら、

- `qty25` を含むので現行ベースを再現できる
- `qty50` を含むので旧ベースとの差が追える
- `qty` が 0 ではないため重複戦略を作らない
- TP を浅めからかなり深めまで一通り確認できる

### 命名規則案

`emr-ae-v13-tp{TP}-q{QTY}-ema20`

例:

- `emr-ae-v13-tp10-q25-ema20`
- `emr-ae-v13-tp20-q15-ema20`
- `emr-ae-v13-tp35-q60-ema20`

---

## 変更・作成ファイル

### 新規作成

| ファイル | 内容 |
|---|---|
| `docs/references/pine/emr-ae-tpqty-100pack/*.pine` | 100 本の Pine スクリプト |
| `config/backtest/campaigns/emr-ae-tpqty-100pack-focus8.json` | focus-8 用の 100戦略キャンペーン |
| `config/night_batch/emr-ae-tpqty-100pack-focus8-config.json` | smoke / full workflow 用 bundle config |
| `scripts/generate-emr-ae-tpqty-100pack.py` | 100戦略の Pine / preset / catalog 生成補助 |

### 更新

| ファイル | 変更内容 |
|---|---|
| `config/backtest/strategy-presets.json` | 100戦略追加（250 → 350） |
| `config/backtest/strategy-catalog.json` | 100エントリー追加（252 → 352） |
| `tests/repo-layout.test.js` | 戦略数・catalog数の期待値更新 |
| `tests/strategy-catalog.test.js` | live count 更新、代表 ID を fixture list に追加 |

### 変更しないもの

- `config/backtest/universes/focus-8.json`
- 既存 `emr-ae-30pack-focus8` 戦略群
- 既存 workflow 本体 (`.github/workflows/*.yml`)

---

## 実装内容と影響範囲

1. `emr-ae-v13-tp10-qty25` をテンプレートに 100 本の派生戦略を生成する
2. 100 本を live preset / catalog に登録し、focus-8 campaign から参照できるようにする
3. self-hosted smoke workflow で使う専用 night-batch config を追加する
4. レイアウト系テストと catalog テストの期待値を調整し、登録漏れを検知できる状態に保つ

影響は、EMR A+E 系の登録面・実行面に限定する。  
既存ロジックの売買条件変更や、他戦略群のパラメータ変更は行わない。

---

## 実装ステップ

- [ ] `emr-ae-v13-tp10-qty25` の現行定義をテンプレートとして再確認し、生成対象パラメータを `tp1Pct` と `tp1Qty` のみに限定する
- [ ] `scripts/generate-emr-ae-tpqty-100pack.py` を追加し、100 本の Pine / preset / catalog 定義を再生成可能にする
- [ ] `docs/references/pine/emr-ae-tpqty-100pack/` に 100 本の Pine を出力する
- [ ] `config/backtest/strategy-presets.json` に 100 preset を追加する
- [ ] `config/backtest/strategy-catalog.json` に 100 catalog entry を追加する
- [ ] `config/backtest/campaigns/emr-ae-tpqty-100pack-focus8.json` を追加し、focus-8 / 2015-01-01〜2026-04-27 / smoke=SPY / full=8 symbols を設定する
- [ ] `config/night_batch/emr-ae-tpqty-100pack-focus8-config.json` を追加し、workflow dispatch から使えるようにする
- [ ] `tests/repo-layout.test.js` と `tests/strategy-catalog.test.js` の期待値と ID 一覧を更新する
- [ ] `npm test -- --runInBand tests/repo-layout.test.js tests/strategy-catalog.test.js tests/windows-run-night-batch-self-hosted.test.js` で回帰確認する
- [ ] `gh workflow run night-batch-smoke.yml --ref main -f config_path=config/night_batch/emr-ae-tpqty-100pack-focus8-config.json` を実行し、smoke workflow の起動を確認する

---

## テスト戦略

- まず登録系ファイルを更新し、`repo-layout` と `strategy-catalog` で構造破綻がないことを確認する
- その後 `windows-run-night-batch-self-hosted` で night_batch config の存在と基本整合を確認する
- smoke workflow は `night-batch-smoke.yml` を新 config で dispatch し、少なくとも起動・bundle 解決まで通ることを確認する

---

## リスクと確認ポイント

- 100戦略追加で `strategy-presets.json` / `strategy-catalog.json` の counts と ID fixture がずれる可能性が高い
- `tp1Pct` を大きくした戦略は `trailActivationPct = tp1Pct` と連動するため、利確が遅れるだけでなく trailing 開始も遅れる
- `tp1Qty = 60` は現行より強い早利確で、利益志向というより保守寄りになる可能性がある
- smoke workflow は repo 側の登録が正しくても、self-hosted 実行環境や GitHub Actions 側の状態で失敗する可能性がある

---

## スコープ外

- 100戦略の結果分析ドキュメント作成
- full 本番 run の完走確認
- volume / stop / trail / trend の再探索
- BTCUSD 除外などユニバース自体の変更

---

## 完了条件

- 100戦略が repo に登録され、focus-8 campaign から参照できる
- 関連テストが通る
- `night-batch-smoke.yml` を新 config で dispatch できる
- 以後、同じ構成で smoke → full backtest に進める状態になる
