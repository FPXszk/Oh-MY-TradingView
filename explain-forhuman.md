# explain-forhuman

> この文書では、**GitHub Actions / self-hosted runner を入口にした night batch の流れ**を中心に説明します。  
> この repo 自体はローカル実行もできますが、ここでは **「GitHub の画面から backtest を流すと何が起きるか」** に絞って整理します。

## まず一言でいうと

この repo には、似た言葉が 3 つあります。

| 言葉 | ざっくり言うと | 置き場所 |
| --- | --- | --- |
| strategy preset | 1個の売買戦略 | `config/backtest/strategy-presets.json` |
| universe | 対象銘柄のリスト | `config/backtest/universes/*.json` |
| campaign | どの universe に対して、どの preset 群を、どの phase で回すかの実行定義 | `config/backtest/campaigns/*.json` |

**つまり campaign は「戦略そのもの」ではありません。**  
campaign は、**戦略群をどう回すか決める実行パッケージ**です。

---

## 用語の違い

### 1. strategy preset

これは **1個の戦略ロジック** です。  
たとえば「Donchian を 55/20 にする」「hard stop を 8% にする」など、売買ルールの中身がここに入っています。

- 正本: `config/backtest/strategy-presets.json`
- 例: `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`

人間向けには、**「戦略」= preset** と考えるのが一番わかりやすいです。

### 2. universe

これは **どの銘柄を対象にするかのリスト** です。

- 例:
  - `config/backtest/universes/long-run-us-100.json`
  - `config/backtest/universes/long-run-jp-100.json`
  - `config/backtest/universes/next-long-run-us-12.json`
  - `config/backtest/universes/next-long-run-jp-12.json`

たとえば `next-long-run-us-12.json` は、US の 12 銘柄を  
`winners / mature-range / defense-test` の 3 種類に分けて持っています。

### 3. campaign

これは **どの universe に対して、どの preset を、どの phase で回すか** を定義するファイルです。

- 例:
  - `config/backtest/campaigns/next-long-run-us-finetune-100x10.json`
  - `config/backtest/campaigns/next-long-run-jp-finetune-100x10.json`
  - `config/backtest/campaigns/next-long-run-us-12x10.json`
  - `config/backtest/campaigns/next-long-run-jp-12x10.json`

campaign には主に次が入っています。

- 使う universe 名
- 使う preset の ID 一覧
- 期間（例: `2000-01-01` → `2099-12-31`）
- phase（smoke / pilot / full）
- 実行設定（checkpoint 間隔など）

人間向けには、**「campaign = バックテスト案件」** と考えるとイメージしやすいです。

---

## GitHub の画面から workflow を実行したときの流れ

手動実行の入口はこれです。

- `.github/workflows/night-batch-self-hosted.yml`

この workflow は、`workflow_dispatch` で `config_path` を受け取ります。  
その既定値は今、次です。

- `config/night_batch/bundle-foreground-reuse-config.json`

流れを簡単に書くとこうなります。

1. GitHub Actions で `Night Batch Self Hosted` を手動実行する
2. workflow が `config_path` を受け取る
3. Windows の self-hosted runner 上で `scripts/windows/run-night-batch-self-hosted.cmd` が呼ばれる
4. その中で `python/night_batch.py` が config を読んで、bundle 実行を組み立てる
5. さらに `scripts/backtest/run-finetune-bundle.mjs` → `scripts/backtest/run-long-campaign.mjs` が動き、最終的に preset × symbol の各 backtest が走る

要するに、**GitHub の画面から押しても、途中でちゃんと campaign を読んで backtest まで進む配線**になっています。  
ただし前提として、**self-hosted Windows runner / TradingView / CDP 接続** が正常に生きている必要があります。

---

## 実際にどこのファイルが読まれるか

実行時は、おおむね次の順で設定が読まれます。

| 順番 | 読まれるもの | 役割 |
| --- | --- | --- |
| 1 | `.github/workflows/night-batch-self-hosted.yml` | GitHub Actions の入口 |
| 2 | `config/night_batch/bundle-foreground-reuse-config.json` | night batch 全体設定 |
| 3 | `config/backtest/campaigns/*.json` | どの campaign を回すか |
| 4 | `config/backtest/universes/*.json` | campaign が指す銘柄群 |
| 5 | `config/backtest/strategy-presets.json` | 実際の戦略本体 |

コード上でも、`src/core/campaign.js` の `loadCampaign()` は次の順で読んでいます。

1. campaign JSON を読む
2. universe JSON を読む
3. `strategy-presets.json` を読む

つまり、**本当の戦略本体は `config/backtest/strategy-presets.json`** です。  
campaign はその戦略を「どの銘柄群にどう回すか」を決めています。

---

## 今の workflow 既定値で何が走るのか

ここは実行前に一番大事です。

今、workflow の既定 `config_path` は

- `config/night_batch/bundle-foreground-reuse-config.json`

で、その中身は今も

- `us_campaign: next-long-run-us-finetune-100x10`
- `jp_campaign: next-long-run-jp-finetune-100x10`

です。

**つまり、GitHub 画面から何も変えずに今の workflow を実行すると、既定で走るのは 12×10 ではなく fine-tune 100×10 です。**

今回追加した 12×10 は以下です。

- `config/backtest/campaigns/next-long-run-us-12x10.json`
- `config/backtest/campaigns/next-long-run-jp-12x10.json`

そしてその対象 universe は以下です。

- `config/backtest/universes/next-long-run-us-12.json`
- `config/backtest/universes/next-long-run-jp-12.json`

なので、**12×10 を GitHub UI から回したいなら、workflow が読む `config_path` 側も 12×10 向けにする必要があります。**

---

## 人間向けドキュメントはどこを見るべきか

この repo には説明がいくつかありますが、役割が少し違います。

| ファイル | 役割 |
| --- | --- |
| `README.md` | repo 全体の入口 |
| `command.md` | 実行コマンド・運用 runbook |
| `docs/research/latest/README.md` | 今の latest 世代の研究・handoff の入口 |
| `docs/research/latest/next-long-run-us-jp-12x10-handoff_20260414_0009.md` | 12×10 の要点まとめ |
| `docs/research/latest/next-long-run-us-jp-12x10-details_20260414_0009.md` | 12×10 の詳しい選定理由 |
| `explain-forhuman.md` | 非エンジニア向けの最短説明 |

この `explain-forhuman.md` は、**最初の入口**です。  
細かい正本は、必ず上の元ファイル側を見てください。

---

## 実行前に読む最短ルート

時間をかけずに理解したいなら、次の順番がおすすめです。

1. **この `explain-forhuman.md`**  
   - 用語と全体像をつかむ
2. **`docs/research/latest/next-long-run-us-jp-12x10-handoff_20260414_0009.md`**  
   - 今登録した 12×10 が何かを知る
3. **`docs/research/latest/next-long-run-us-jp-12x10-details_20260414_0009.md`**  
   - 10戦略 / 12銘柄の選定理由を確認する
4. **`command.md` と `.github/workflows/night-batch-self-hosted.yml`**  
   - 実際にどう起動するかを確認する

---

## 実行前の注意点

### 1. 「latest docs」と「workflow 既定値」は同じとは限らない

今の latest docs は、**12×10 registration 世代** の説明です。  
でも workflow 既定値はまだ **fine-tune 100×10** です。

この2つは別です。

- latest docs = 今いちばん新しく説明している内容
- workflow 既定値 = GitHub Actions が今そのままで読みに行く設定

### 2. 正本は説明文ではなく、workflow / config / source

この文書はわかりやすくするための要約です。  
実際に何が動くかの正本は次です。

- workflow: `.github/workflows/night-batch-self-hosted.yml`
- night batch config: `config/night_batch/*.json`
- campaign: `config/backtest/campaigns/*.json`
- universe: `config/backtest/universes/*.json`
- strategy preset: `config/backtest/strategy-presets.json`

### 3. 実行できるかどうかは runner 側の状態にも依存する

GitHub の画面から押せても、以下が死んでいると backtest は進みません。

- self-hosted Windows runner
- TradingView アプリ
- CDP 接続（9222 / 9223 周辺）

---

## 最後に

この repo を理解するときは、次の 1 行だけ覚えておけば十分です。

> **strategy preset が戦略本体、universe が銘柄群、campaign がその組み合わせ方、workflow はそれを夜間実行する入口。**

もし次に **「じゃあ 12×10 を GitHub 画面から実行するには、どの `config_path` を作ればよいか」** を整理したくなったら、その部分だけ別紙でまとめるのが一番わかりやすいです。
