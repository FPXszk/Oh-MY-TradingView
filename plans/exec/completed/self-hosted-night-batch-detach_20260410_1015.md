# Exec Plan: self-hosted-night-batch-detach_20260410_1015

## 目的

現在の Python 夜間オーケストレーションを、**戦略だけ差し替えて再利用できる構成**へ拡張する。

今回の実装では次を追加する。

1. 戦略・実行設定の **JSON config**
2. **self-hosted local runner** からの scheduled 起動
3. smoke success 後に production を **ローカル PC 上で detached 継続**
4. **Windows Command Prompt** から script path 直叩きで手動起動できる入口

---

## 現在すでにできていること / 今回追加すること

### すでにできていること

- `python/night_batch.py` が `bundle / campaign / recover / report / nightly / smoke-prod` をサポート
- `smoke-prod` は以下をサポート
  - `--smoke-cli` / `--production-cli` による戦略差し替え
  - startup check
  - launch-if-needed
  - WSL preflight
  - smoke 1 本
  - production 1 本
  - summary / log 出力
- 現在の verified 環境
  - Windows local `9222`
  - WSL `172.31.144.1:9223`
  - shortcut launch path `C:\TradingView\TradingView.exe - ショートカット.lnk`

### 今回追加すること

- JSON config 契約
- config 読み込みと CLI 優先順位整理
- smoke success 後の detached child 起動
- self-hosted runner 用 workflow
- Windows CMD ラッパー
- docs / tests の整備

---

## スコープ

### In Scope

- `smoke-prod` を JSON config でも動かせるようにする
- CLI 引数 > config > default の優先順位を定義する
- smoke success 後に production を detached child として継続させる
- self-hosted runner の scheduled / workflow_dispatch workflow を追加する
- Windows CMD から config 指定で起動できる `.cmd` を追加する
- README / `docs/command.md` を現行運用に合わせて更新する
- 既存 Node test 体系の中で TDD を追加する

### Out of Scope

- 戦略提案ロジック自体の改善
- Windows Service 化や常駐監視マネージャ導入
- bundle / campaign / nightly の全面再設計
- GitHub-hosted runner だけでローカル PC を遠隔起動する構成
- 長時間本番ジョブの完全 E2E 自動化

---

## 実装方針

### 1. JSON config 契約

strategy / runtime / launch を分離した JSON を導入する。

最低限入れる想定:

- `strategies.smoke.cli`
- `strategies.production.cli`
- `runtime.host`
- `runtime.port`
- `runtime.launch_wait_sec`
- `runtime.detach_after_smoke`
- `runtime.pid_file`
- `runtime.log_file`
- `launch.shortcut_path`

既存 `--smoke-cli` / `--production-cli` は残し、後方互換を維持する。

### 2. detached continuation

親プロセスは次だけを担当する。

1. startup check
2. launch-if-needed
3. WSL preflight
4. smoke
5. detached child 起動確認
6. success で終了

child は production だけを継続し、log / summary / pid を残す。

### 3. self-hosted workflow

workflow は `.github/workflows/` に追加し、`self-hosted` runner 上で動かす。

役割は:

- schedule / workflow_dispatch で起動
- JSON config を指定して Python を開始
- smoke success と detached child 起動確認までを job success 条件にする

production 継続自体は workflow の外に出す。

### 4. Windows CMD 入口

`.cmd` ラッパーを追加し、Command Prompt から

```cmd
scripts\windows\run-night-batch-self-hosted.cmd config\night_batch\nightly.default.json
```

のように叩けるようにする。必要なら `wsl.exe` 呼び出しを吸収する。

---

## 変更対象ファイル

### 新規作成

- `.github/workflows/night-batch-self-hosted.yml`
- `config/night_batch/nightly.default.json`
- `scripts/windows/run-night-batch-self-hosted.cmd`

### 変更

- `python/night_batch.py`
- `tests/night-batch.test.js`
- `README.md`
- `docs/command.md`

### 変更候補

- `package.json`  
  新しい test file を分割追加する場合のみ、既存 test script の明示列挙に追記する

### 分割候補

- `python/night_batch_config.py`
- `python/night_batch_detach.py`

`python/night_batch.py` が肥大化した場合だけ追加する。

### 削除

- なし

---

## TDD 計画

### RED

`tests/night-batch.test.js` に以下を追加する。

- config から smoke / production CLI を読み込める
- CLI 引数が config より優先される
- detach 有効時、smoke success 後に detached child 起動へ進む
- child 起動確認が失敗したら親は success しない
- detach 無効時は従来どおり同期 production になる
- workflow / `.cmd` から使う入口が config 指定で動く

### GREEN

- config load / merge の最小実装
- detached child 起動の最小実装
- `.cmd` / workflow からの起動経路を最小実装

### REFACTOR

- config 正規化処理を関数分割
- detached 起動の OS 依存部分を分離
- docs の重複を減らす

---

## Validation commands

```bash
node --test tests/night-batch.test.js
npm test
python3 python/night_batch.py smoke-prod --help
python3 python/night_batch.py smoke-prod --config config/night_batch/nightly.default.json --dry-run
```

Windows 手動確認:

```cmd
scripts\windows\run-night-batch-self-hosted.cmd config\night_batch\nightly.default.json
```

Workflow 確認:

1. `workflow_dispatch` で self-hosted runner 上実行
2. smoke success 後に job が success で終わることを確認
3. job 終了後も production child がローカルで継続していることを確認

---

## リスク

- self-hosted runner の親終了時に child が巻き込まれて kill される可能性
- WSL / Windows パス差異で `.cmd` から repo 内 Python をうまく起動できない可能性
- detach success を早く判定しすぎると、child 即死を見逃す可能性
- manual 実行と scheduled 実行の二重起動競合が起きうる
- JSON schema を固めすぎると後続の戦略差し替えが窮屈になる

---

## 実装ステップ

- [ ] active plan を配置する
- [ ] `python/night_batch.py` の `smoke-prod` 入口を整理し、config 導入位置を確定する
- [ ] `tests/night-batch.test.js` に config / detach の RED を追加する
- [ ] `python/night_batch.py` に `--config` と config merge を追加する
- [ ] `config/night_batch/nightly.default.json` を追加する
- [ ] detached child 起動フローを追加する
- [ ] parent success 条件を `smoke success + child 起動確認 + pid/log 確認` にする
- [ ] `scripts/windows/run-night-batch-self-hosted.cmd` を追加する
- [ ] `.github/workflows/night-batch-self-hosted.yml` を追加する
- [ ] README / `docs/command.md` に config / runner / manual 起動手順を追記する
- [ ] `node --test tests/night-batch.test.js` を通す
- [ ] `npm test` を通す
- [ ] `smoke-prod --config ... --dry-run` を確認する
- [ ] self-hosted runner 向けの manual verification 手順を整理する

---

## 完了条件

- JSON config で戦略差し替えができる
- `smoke-prod` が config ベースでも既存 CLI ベースでも動く
- smoke success 後に production が detached でローカル継続できる
- self-hosted workflow が smoke success を確認した時点で success 終了できる
- Windows CMD から script path で手動起動できる
- docs / tests が更新されている

---

## 備考

方針は **全面刷新ではなく、既存 `smoke-prod` を後方互換のまま伸ばす** ことを優先する。  
まずは JSON config + detached continuation + self-hosted runner 入口に絞る。
