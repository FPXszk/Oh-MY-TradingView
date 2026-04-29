# explain-forhuman

> **README を読んだあとに、night batch の流れを人間向けに補足する文書**です。  
> repo 全体の一次入口は `../README.md`、docs の地図は `DOCUMENTATION_SYSTEM.md` を見てください。

> この文書では、**GitHub Actions / self-hosted runner を入口にした night batch の流れ**を中心に説明します。  
> この repo 自体はローカル実行もできますが、ここでは **「GitHub の画面から backtest を流すと何が起きるか」** に絞って整理します。

## まず一言でいうと

この repo には、似た言葉が 3 つあります。

| 言葉 | ざっくり言うと | 置き場所 |
| --- | --- | --- |
| strategy preset | 人間向けには 1個の売買戦略。実行時は用途に応じて strategy catalog と live preset 一覧を使い分ける | `config/backtest/strategy-catalog.json` / `config/backtest/strategy-presets.json` |
| universe | 対象銘柄のリスト | `config/backtest/universes/current/*.json` |
| campaign | どの universe に対して、どの preset 群を、どの phase で回すかの実行定義 | `config/backtest/campaigns/current/*.json` |

**つまり campaign は「戦略そのもの」ではありません。**  
campaign は、**戦略群をどう回すか決める実行パッケージ**です。

---

## 用語の違い

### 1. strategy preset

これは **1個の戦略ロジック** です。  
たとえば「Donchian を 55/20 にする」「hard stop を 8% にする」など、売買ルールの中身がここに入っています。

- strategy 全体の正本: `config/backtest/strategy-catalog.json`
- live preset 一覧と common defaults: `config/backtest/strategy-presets.json`
- 例: `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`

人間向けには、**「戦略」= preset** と考えるのが一番わかりやすいです。

### 2. universe

これは **どの銘柄を対象にするかのリスト** です。

- 例:
  - `config/backtest/universes/current/next-long-run-us-12.json`
  - `config/backtest/universes/current/next-long-run-jp-12.json`
  - `config/backtest/universes/archive/long-run-us-100.json`
  - `config/backtest/universes/archive/long-run-jp-100.json`

たとえば `next-long-run-us-12.json` は、US の 12 銘柄を  
`winners / mature-range / defense-test` の 3 種類に分けて持っています。

### 3. campaign

これは **どの universe に対して、どの preset を、どの phase で回すか** を定義するファイルです。

- 例:
  - `config/backtest/campaigns/current/next-long-run-us-12x10.json`
  - `config/backtest/campaigns/current/next-long-run-jp-12x10.json`
  - `config/backtest/campaigns/archive/next-long-run-us-finetune-100x10.json`
  - `config/backtest/campaigns/archive/next-long-run-jp-finetune-100x10.json`

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
| 3 | `config/backtest/campaigns/current/*.json` など | どの campaign を回すか |
| 4 | `config/backtest/universes/current/*.json` など | campaign が指す銘柄群 |
| 5 | `config/backtest/strategy-catalog.json` | campaign が解決する実行対象戦略の定義 |
| 6 | `config/backtest/strategy-presets.json` | 共通 default 値や補助設定 |

コード上でも、`src/core/campaign.js` の `loadCampaign()` は次の順で読んでいます。

1. campaign JSON を読む
2. universe JSON を読む
3. `strategy-catalog.json` から実行対象戦略を解決する
4. `strategy-presets.json` から common defaults を読む

つまり、**campaign が実行対象として引く戦略定義の正本は `config/backtest/strategy-catalog.json`** です。  
一方で `config/backtest/strategy-presets.json` も、**live preset 一覧** と **common defaults** を持つ実運用ファイルです。campaign は catalog 側の戦略定義と、presets 側の default 値を組み合わせて「どの銘柄群にどう回すか」を決めています。

---

## 今の workflow 既定値で何が走るのか

ここは実行前に一番大事です。

今、workflow の既定 `config_path` は

- `config/night_batch/bundle-foreground-reuse-config.json`

で、その中身は今

- `us_campaign: next-long-run-us-12x10`
- `jp_campaign: next-long-run-jp-12x10`

です。

**つまり、GitHub 画面から何も変えずに今の workflow を実行すると、既定で走るのは 12×10 です。**

12×10 の campaign 定義は以下です。

- `config/backtest/campaigns/current/next-long-run-us-12x10.json`
- `config/backtest/campaigns/current/next-long-run-jp-12x10.json`

そしてその対象 universe は以下です。

- `config/backtest/universes/current/next-long-run-us-12.json`
- `config/backtest/universes/current/next-long-run-jp-12.json`

> 旧既定の fine-tune 100×10 campaign（`next-long-run-us-finetune-100x10` / `next-long-run-jp-finetune-100x10`）は `config/backtest/campaigns/archive/` に残っています。  
> これを night batch で流したい場合は、**既存の bundle config の campaign ID を差し替える** か、**その campaign ID を指す `config/night_batch/*.json` を別途用意して** `config_path` にその file を指定します。

---

## config の 2 層構造 ― night_batch と backtest

設定ファイルは **2 つの層** に分かれています。混同しやすいので整理します。

| 層 | ディレクトリ | 役割 |
| --- | --- | --- |
| **night-batch エントリ層** | `config/night_batch/` | night batch 固有の起動設定。どの campaign を組み合わせて回すか（bundle 定義）を決める。workflow_dispatch の既定値はここを指す |
| **共有実行定義層** | `config/backtest/` | campaign / universe / strategy catalog / live preset など、実際の戦略・銘柄・実行パラメータの定義。night batch とローカル手動実行の **両方** から読まれる |

つまり、`config/night_batch/` は **night batch 専用の入口設定** であり、`config/backtest/` は **night batch にもローカル手動実行にも共有される定義** です。

---

## よくある質問

### Q1. night batch には専用の設定ファイルがあるの？

**はい。** `config/night_batch/` ディレクトリに night batch 専用の bundle 設定があります。

workflow_dispatch の既定 config は

```
config/night_batch/bundle-foreground-reuse-config.json
```

で、この中で `us_campaign=next-long-run-us-12x10`、`jp_campaign=next-long-run-jp-12x10` が指定されています。

ただし、この bundle config が **参照する先**（campaign / universe / strategy catalog / live preset）は `config/backtest/` 以下にあり、手動実行と共有されています。

### Q2. ローカルで手動で戦略や campaign を切り替えて実行したら、night batch にも影響する？

**手動コマンドを実行するだけで、nightly workflow が参照する campaign 指定そのものは変わりません。**

night batch が何を実行するかは、以下の 2 つで決まります。

1. **night-batch config 自体を書き換えた場合** ― `config/night_batch/bundle-foreground-reuse-config.json` の `us_campaign` / `jp_campaign` を別の campaign ID に変更すると、次回の nightly 実行から変わります
2. **night-batch config が参照している共有定義を編集した場合** ― たとえば `config/backtest/campaigns/current/next-long-run-us-12x10.json` の中身（対象 preset や universe）を変えると、night batch もその変更を読みます

逆に、**別の campaign ID を指定してローカルで手動実行しただけ**なら、night-batch config は何も変わっていないので、nightly workflow には一切影響しません。

ただし例外として、**同じ night-batch config を使って `python3 python/night_batch.py smoke-prod ...` を手動実行した場合**は、`artifacts/night-batch/round*` や関連 checkpoint / manifest が更新されます。  
そのため、**次回 nightly が「何を回すか」ではなく「どこから再開するか」** には影響することがあります。

### Q3. config/backtest は手動実行専用？ night batch と共有されている？

**共有されています。**

`config/backtest/` 以下の campaign / universe / strategy catalog / live preset は、night batch からもローカル手動実行からも読まれます。  
night batch 専用なのは `config/night_batch/` のエントリ層だけです。

`loadCampaign()` は実行元（night batch / ローカル）に関係なく、同じ手順で設定を解決します。

1. campaign JSON を読む
2. campaign が指す universe JSON を読む
3. `strategy-catalog.json` から実行可能な戦略を解決する
4. `strategy-presets.json` から live preset 情報と common defaults を使う

### Q4. 手動で対象を切り替えて実行するにはどうすればいい？

以下は **repo root で実行する前提** の手順です。  
まず最初に、**「手動で試したいだけ」なのか、「night batch の対象自体を変えたい」のか** を分けて考えるのが大事です。

#### まず今の night batch 対象を確認する

```bash
rg -n '"us_campaign"|"jp_campaign"|"smoke_phases"|"production_phases"' config/night_batch/bundle-foreground-reuse-config.json
```

次に、実際にその campaign が何を回すかを見たいなら campaign 定義を確認します。

```bash
rg -n '"universe"|"preset_ids"' config/backtest/campaigns/current/next-long-run-us-12x10.json
rg -n '"universe"|"preset_ids"' config/backtest/campaigns/current/next-long-run-jp-12x10.json
```

#### 手順 1: 手動で試すだけなら、night-batch config は触らない

この場合は `config/night_batch/` を編集せず、下のコマンドを直接打てば十分です。  
**これだけなら nightly workflow の対象 campaign は変わりません。**

以下の 4 パターンがあります。目的に合わせて選んでください。

#### パターン A: 単一 campaign を手動実行

```bash
node scripts/backtest/run-long-campaign.mjs <campaignId> --phase <phase> [--host <host> --ports <ports>]
```

例:
```bash
node scripts/backtest/run-long-campaign.mjs next-long-run-us-12x10 --phase smoke
```

#### パターン B: bundle（US + JP をまとめて）実行

```bash
node scripts/backtest/run-finetune-bundle.mjs --us-campaign <us_campaign> --jp-campaign <jp_campaign> --phases <phases>
```

例:
```bash
node scripts/backtest/run-finetune-bundle.mjs --us-campaign next-long-run-us-12x10 --jp-campaign next-long-run-jp-12x10 --phases smoke
```

#### パターン C: 単一 preset × 銘柄で試す

```bash
node src/cli/index.js backtest preset <preset-id> --symbol <SYM> [--date-from <YYYY-MM-DD> --date-to <YYYY-MM-DD>]
```

例:
```bash
node src/cli/index.js backtest preset donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight --symbol AAPL
```

#### パターン D: night batch と同等の処理をローカルで実行

```bash
python3 python/night_batch.py smoke-prod --config config/night_batch/<file>.json --round-mode <mode>
```

例:
```bash
python3 python/night_batch.py smoke-prod --config config/night_batch/bundle-foreground-reuse-config.json --round-mode advance-next-round
```

`--round-mode` は今の実装では次の 2 つです。

- `advance-next-round`: 新しい round を作って走らせる
- `resume-current-round`: 直近 round を再利用して続きから走らせる

> `python/night_batch.py` は `smoke-prod` 以外にも `bundle`, `campaign`, `nightly`, `recover`, `report`, `archive-rounds` などのサブコマンドを持っています。

#### 手順 2: night batch の対象自体を変えたい場合

nightly workflow で走る内容を変えたいなら、次のどちらかです。

1. `config/night_batch/bundle-foreground-reuse-config.json` の `us_campaign` / `jp_campaign` を別の campaign ID に変える
2. その config が参照している `config/backtest/campaigns/...` の中身（`preset_ids` や `universe`）を変える

より安全なのは、**既定 config を直接上書きするのではなく、`config/night_batch/` に別 config を作って明示指定する** やり方です。

たとえば:

1. `config/backtest/campaigns/` 側で、使いたい campaign ID を用意する
2. `config/night_batch/` に、その campaign ID を指す bundle config を作る
3. ローカルなら次で実行する

```bash
python3 python/night_batch.py smoke-prod --config config/night_batch/<new-config>.json --round-mode advance-next-round
```

4. GitHub Actions から流すなら、`Night Batch Self Hosted` の `config_path` にその config を指定する

#### 手順 3: 元に戻すときの考え方

- **手動実行だけ**なら、何も戻すものはありません。night batch 側は変わっていません。
- **night batch 用 config や共有 campaign 定義を編集した**なら、そのファイルを元に戻さない限り次回 nightly にも反映されます。

#### 重要な注意

- **上記の手動コマンドを実行しても、nightly workflow が参照する campaign 指定自体は変わりません。**
- ただし **`smoke-prod` を同じ night-batch config で実行すると、`artifacts/night-batch/round*` の状態が更新され、次回 nightly の再開位置に影響することがあります。**
- nightly の実行内容を変えたい場合は、`config/night_batch/bundle-foreground-reuse-config.json` の campaign 指定を編集するか、そこから参照されている `config/backtest/` 以下の共有定義を編集してください。

---

## 人間向けドキュメントはどこを見るべきか

この repo には説明がいくつかありますが、役割が少し違います。

| ファイル | 役割 |
| --- | --- |
| `../README.md` | repo 全体の入口 |
| `docs/research/current/README.md` | 今の current 世代の研究・handoff の入口 |
| `docs/research/current/main-backtest-current-summary.md` | 最新 main backtest の要約 |
| `docs/research/strategy/README.md` | 戦略・銘柄を人間向けに整理した入口 |
| `docs/research/strategy/theme-momentum-definition.md` | テーマ投資で「モメンタムのある銘柄」をどう判断するかの安定参照先 |
| `docs/reports/README.md` | incident / postmortem archive |
| `docs/research/archive/next-long-run-us-jp-12x10-handoff_20260414_0009.md` | 12×10 の過去 handoff 要点まとめ |
| `docs/research/archive/next-long-run-us-jp-12x10-details_20260414_0009.md` | 12×10 の過去選定理由の詳細 |
| `docs/explain-forhuman.md` | 非エンジニア向けの最短説明 |

この `docs/explain-forhuman.md` は、**README を読んだあとに全体像をつかむための補助文書**です。  
細かい正本は、必ず上の元ファイル側を見てください。

---

## 実行前に読む最短ルート

時間をかけずに理解したいなら、次の順番がおすすめです。

1. **`../README.md`**  
   - 実際の入口と運用コマンドを確認する
2. **この `docs/explain-forhuman.md`**  
   - 用語と全体像をつかむ
3. **`docs/research/current/main-backtest-current-summary.md`**  
   - 最新の勝ち筋と注意点を最短で確認する
4. **`docs/research/archive/next-long-run-us-jp-12x10-handoff_20260414_0009.md`**  
   - 12×10 世代の handoff を後から追う
5. **`docs/research/archive/next-long-run-us-jp-12x10-details_20260414_0009.md`**  
   - 12×10 世代の 10戦略 / 12銘柄の選定理由を確認する
6. **`docs/research/strategy/README.md`**  
   - 実際にどの戦略・銘柄を見ているかを確認する
7. **`docs/research/strategy/theme-momentum-definition.md`**  
   - テーマ投資で「モメンタムのある銘柄」をどう定義していたかを確認する
8. **`.github/workflows/night-batch-self-hosted.yml`**  
   - 実際にどう起動するかを確認する

---

## 実行前の注意点

### 1. `current` と「最新 artifact」は別物

この repo では、少なくとも次の 2 つを分けて読む必要があります。

- current handoff generation = 今いちばん新しく説明している docs 世代（現在は **12×10**）
- current main backtest summary = 利用可能な最新 main artifact から再生成した summary（2026-04-15 時点では **finetune 100×10 smoke artifact**）

workflow 既定値は今 **12×10** ですが、main backtest summary の入力 artifact と常に同一とは限りません。

### 2. 正本は説明文ではなく、workflow / config / source

この文書はわかりやすくするための要約です。  
実際に何が動くかの正本は次です。

- workflow: `.github/workflows/night-batch-self-hosted.yml`
- night batch config: `config/night_batch/*.json`
- campaign: `config/backtest/campaigns/current/*.json`
- universe: `config/backtest/universes/current/*.json`
- strategy catalog / lifecycle source: `config/backtest/strategy-catalog.json`
- live preset list / common defaults: `config/backtest/strategy-presets.json`

### 3. 実行できるかどうかは runner 側の状態にも依存する

GitHub の画面から押せても、以下が死んでいると backtest は進みません。

- self-hosted Windows runner
- TradingView アプリ
- CDP 接続（9222 / 9223 周辺）

---

## 最後に

この repo を理解するときは、次の 1 行だけ覚えておけば十分です。

> **strategy catalog が実行対象戦略の正本、universe が銘柄群、campaign がその組み合わせ方、workflow はそれを夜間実行する入口。**

もし次に **別の campaign を GitHub 画面から実行したい場合**は、`workflow_dispatch` の `config_path` に別の config を指定するか、新しい bundle config を作成します。

---

## TradingView スクリーナー機能について

この repo には、TradingView の内部スキャナー API を利用したスクリーニング機能があります。  
backtest とは異なり、**CDP 不要・認証不要**で動作します。

### TradingView Scanner API とは

TradingView の Screener ページが内部で使っている HTTP エンドポイントです。

- **URL**: `POST https://scanner.tradingview.com/{market}/scan`
- **認証**: 遅延データは不要（ライブ/ストリームは cookies 必要）
- **対応市場**: `america` / `crypto` / `forex` / `global` 等
- **フィールド数**: 3,000+ （RSI / SMA / 時価総額 / 出来高 / MACD / 52週高値 等）

> これは **非公式 API** です。フィールド名変更・エンドポイント廃止のリスクがあります。

### ミネルビニ7条件スクリーナー

マーク・ミネルビニが提唱するモメンタム銘柄の選定条件をそのまま実装したスクリーナーです。

```bash
tv screener minervini           # 上位50件
tv screener minervini --limit 20
tv screener minervini --compact   # シンボルと価格のみ
```

| 条件 | 内容 |
|---|---|
| 市場 | 米国株のみ |
| RSI(14) | 60 以上 |
| 時価総額 | 10億ドル以上 |
| 直近出来高 | 平均の1.2倍以上 |
| 現在値 | 200日移動平均線より上 |
| 現在値 | 50日移動平均線より上 |
| 現在値 | 52週高値の75%以上 |

### CDP vs スキャナー API の使い分け

| 機能 | 手段 | CDP 必要? |
|---|---|---|
| ミネルビニスクリーニング | TradingView Scanner API | 不要 |
| quote / 指標取得 | Yahoo Finance API | 不要 |
| チャートのスクリーンショット | CDP | 必要 |
| バックテスト | CDP + Strategy Tester | 必要 |
| Pine スクリプト編集 | CDP + Pine エディタ | 必要 |

> スクリーニングは外部 API のみで完結します。backtest は CDP が必須です。
