# README 再構築・AIナビゲーション整備計画

- 作成日時: 2026-07-07 15:13 JST
- 対象リポジトリ: `FPXszk/Oh-MY-TradingView`
- 対象ブランチ: `main`
- 状態: PLAN / 実装承認待ち
- 主対象: `README.md` とドキュメント導線

## 1. 背景

現在の `README.md` は、初期の TradingView Desktop 向け MCP / CLI ブリッジを中心とした説明に、後から追加された以下の情報が継ぎ足されている。

- TradingView Desktop への CDP 接続
- MCP サーバー
- `tv` CLI
- Pine Script 編集・コンパイル・バックテスト
- 米国株・日本株スクリーナー
- SEC EDGAR / EDINET 連携
- Moomoo OpenAPI 連携
- SBI / Moomoo ポートフォリオ処理
- Python + Node.js による Night Batch
- Windows self-hosted GitHub Actions
- 戦略・調査資料・実行成果物の管理

その結果、プロジェクト概要、CLI リファレンス、個別 runbook、過去の運用事情、トラブルシューティング、アーキテクチャ説明が単一の README に混在している。

この状態では、人間だけでなく新しく作業する AI エージェントも、次の判断に時間がかかる。

1. このリポジトリの現在の主目的は何か
2. 現行の実行環境は Windows native と WSL のどちらか
3. 依頼されたタスクでどのディレクトリを確認すべきか
4. どのファイルが実行入口で、どこにドメインロジックがあるか
5. どのテストを実行すべきか
6. 生成物・過去資料・現行設定のどれを正本として扱うべきか

README をゼロベースで再設計し、リポジトリ全体を説明し切る巨大マニュアルではなく、必要な調査範囲へ最短で案内する一次入口へ変更する。

## 2. 現状確認で判明した問題

### 2.1 README が肥大化している

現行 README は約 900 行あり、以下が同一階層で並んでいる。

- プロジェクト概要
- MCP tool 一覧
- CLI コマンド一覧
- セットアップ
- WSL 接続手順
- 個別テーマの watchlist 登録例
- Python Night Batch
- Windows runner 運用
- dual-worker の過去構成
- experiment gating
- テスト
- 制約
- アーキテクチャ

README が索引ではなく、運用マニュアル・履歴・コマンド集を兼ねている。

### 2.2 README 冒頭の導線に不整合がある

README は `docs/README.md` を docs 全体の入口として案内しているが、現在そのファイルは存在しない。

新READMEでは、リンク先の存在を検証可能にし、存在しないドキュメントへ誘導しない。

### 2.3 README と現行コードの説明が一致していない

代表例として、README では `market_*` の取得元を Yahoo Finance 中心として説明している一方、現行 `src/server.js` では Moomoo を主経路、Yahoo を legacy opt-in fallback として説明している。

コードと README のどちらが正しいかを毎回判断させる構成を廃止する。

### 2.4 現行アーキテクチャを表現できていない

現在のリポジトリには、初期の `src/core/`、`src/tools/`、`src/cli/` 以外にも次の主要領域がある。

- `config/backtest/`
- `config/night_batch/`
- `scripts/backtest/`
- `scripts/screener/`
- `scripts/moomoo/`
- `scripts/sbi/`
- `scripts/portfolio/`
- `scripts/windows/`
- `python/night_batch.py`
- `.github/workflows/`
- `docs/exec-plans/`
- `docs/reports/`
- `artifacts/`

現行 README 末尾のツリーでは、これらの関係が十分に分からない。

### 2.5 Windows native と WSL legacy の境界が曖昧

現行の主環境は次の構成である。

- リポジトリ: `C:\00_mycode\Oh-MY-TradingView`
- CDP: `127.0.0.1:9222`
- Codex / MCP: Windows native
- self-hosted runner: Windows

一方で、以下の WSL 前提ファイルも残っている。

- `justfile`
- `devinit.sh`
- tmux セッション構成
- `~/code/Oh-MY-TradingView` 前提のパス

これらは削除せず、README 上で current と legacy / optional を明確に分ける。

### 2.6 ドキュメント保守ルールにも古い記載がある

`docs/DOCUMENTATION_SYSTEM.md` には、現在の `package.json` と一致しないテスト記述や、古い README 構成を前提にした説明が含まれる。

README のみを変更すると再び導線が分裂するため、関連ドキュメントも同時に更新する。

## 3. 目的

新READMEの目的は、プロジェクトのすべてを一文書で説明することではない。

次の問いに、README 上部だけで答えられる状態を作る。

1. このリポジトリは何をするものか
2. 現在の主実行環境は何か
3. AI / 開発者は最初に何を読むべきか
4. タスクごとに、どこからどこまで確認すべきか
5. 実行入口とドメインロジックはどこか
6. どのテストで変更を検証すべきか
7. どのファイルが正本で、どれが生成物・過去資料か

## 4. 設計原則

### 4.1 README はルーターにする

README は詳細マニュアルではなく、対象領域へ案内するルーターとする。

詳細な個別 runbook、障害対応、過去経緯は `docs/` 配下へ分離する。

### 4.2 段階的開示を使う

最初に概要とタスク別ナビゲーションを示し、必要な人だけが詳細へ進む構造にする。

読む順番は次を基本とする。

1. `AGENTS.md`
2. `README.md` のプロジェクト概要
3. `README.md` のタスク別ナビゲーション
4. `docs/exec-plans/active/`
5. 対象ドメインの入口ファイル
6. 対応するテスト
7. 必要な場合だけ過去資料・生成物

### 4.3 コードを正本にする

README に手作業で全 CLI / MCP tool を列挙しない。

- CLI 一覧: `npm run tv -- --help`
- CLI 登録入口: `src/cli/index.js`
- MCP 登録入口: `src/server.js`
- Node scripts: `package.json`
- Workflow: `.github/workflows/`

README には代表例と入口だけを書く。

### 4.4 current と legacy を明示する

- Current: Windows native / `127.0.0.1:9222`
- Legacy / optional: WSL、tmux、portproxy、旧 dual-worker 構成

両者を同じ推奨度で並べない。

### 4.5 生成物を調査入口にしない

原則として、次の優先順位で調査する。

1. `src/`
2. `scripts/`
3. `config/`
4. `.github/workflows/`
5. `tests/`
6. `docs/`
7. `artifacts/`

`artifacts/` は実行結果の確認に使うが、実装調査の最初の入口にはしない。

## 5. 新READMEの構成

### 5.1 タイトルと一文概要

README 冒頭に、現在のプロジェクト全体を表す一文を置く。

想定内容:

> TradingView Desktop の CDP 操作を中核に、MCP / CLI、Pine 開発、バックテスト、株式スクリーニング、ポートフォリオ診断、Windows Night Batch を統合するローカル投資分析基盤。

### 5.2 現在の主実行環境

README 上部に current 環境を明記する。

- OS: Windows native
- Node.js: 20 以上
- Repository root: `C:\00_mycode\Oh-MY-TradingView`
- TradingView CDP: `127.0.0.1:9222`
- Night Batch: Windows self-hosted runner
- WSL: legacy / troubleshooting / optional

### 5.3 AI / 開発者が最初に読む順番

次の順番を明示する。

```text
1. AGENTS.md
2. README.md の「タスク別ナビゲーション」
3. docs/exec-plans/active/
4. 対象ドメインの入口ファイル
5. 対応する tests/
6. 必要な場合だけ docs の詳細資料と artifacts
```

`AGENTS.md` の規則を README に複製しない。

### 5.4 タスク別ナビゲーション

README の中心に次の表を置く。

| タスク | 最初に見る場所 | 次に見る場所 | 主なテスト |
|---|---|---|---|
| MCP tool 追加・修正 | `src/server.js` | `src/tools/` → `src/core/` | 対応する `tests/*.test.js` |
| CLI 追加・修正 | `src/cli/index.js` | `src/cli/commands/` → `src/core/` | CLI 対象の unit test |
| CDP 接続不具合 | `src/connection.js` | `src/core/health.js`、`src/core/tradingview-readiness.js` | `connection.test.js`、E2E |
| Pine 編集・compile | `src/tools/pine.js` | `src/core/pine.js` | Pine 系 test |
| バックテスト戦略 | `config/backtest/strategy-presets.json` | `src/core/backtest.js`、`src/core/research-backtest.js` | `backtest.test.js` |
| Campaign | `config/backtest/campaigns/` | `src/core/campaign.js`、`scripts/backtest/` | campaign 系 test |
| Night Batch | `config/night_batch/` | `.github/workflows/night-batch-self-hosted.yml` → `scripts/windows/` → `python/night_batch.py` | night-batch 系 test |
| 米国スクリーナー | `.github/workflows/daily-screener.yml` | `scripts/screener/` → `src/core/fundamental-screener.js` | screener / SEC 系 test |
| 日本株スクリーナー | `.github/workflows/daily-screener-japan.yml` | `scripts/screener/` → `src/core/edinet.js` | screener / EDINET 系 test |
| Moomoo OpenAPI | `src/tools/moomoo.js` | `src/core/moomoo.js`、`scripts/moomoo/` | `moomoo.test.js` |
| SBI 取得・変換 | `scripts/sbi/` | `.github/workflows/sbi-portfolio-capture.yml` | SBI / portfolio 系 test |
| 統合ポートフォリオ | `scripts/portfolio/` | 関連 workflow / report | portfolio 系 test |
| Windows runner | `.github/workflows/night-batch-self-hosted.yml` | `scripts/windows/` | Windows / night-batch 系 test |
| ドキュメント更新 | `docs/README.md` | `docs/DOCUMENTATION_SYSTEM.md`、`scripts/docs/` | documentation navigation test |

実装時に、実在するファイル名とテスト名を再確認して確定する。

### 5.5 実行経路

README には、詳細実装ではなく次の 4 経路を図示する。

```text
MCP
src/server.js
  → src/tools/*
  → src/core/*
  → src/connection.js / external providers

CLI
src/cli/index.js
  → src/cli/commands/*
  → src/core/*

Workflow
.github/workflows/*
  → scripts/*
  → src/core/*
  → docs/reports/ または artifacts/

Night Batch
.github/workflows/night-batch-self-hosted.yml
  → scripts/windows/*
  → python/night_batch.py
  → scripts/backtest/*
  → artifacts/night-batch/
```

### 5.6 リポジトリ構造

README には深さ 2〜3 の構造だけを載せる。

```text
.
├─ AGENTS.md                 # AI 作業規則
├─ README.md                 # プロジェクト入口・タスクルーター
├─ package.json              # Node 実行入口・テストコマンド
├─ src/
│  ├─ server.js              # MCP サーバー入口
│  ├─ connection.js          # CDP 接続
│  ├─ core/                  # ドメインロジック
│  ├─ tools/                 # MCP tool 登録
│  └─ cli/                   # tv CLI
├─ config/
│  ├─ backtest/              # preset・campaign・universe
│  └─ night_batch/           # Night Batch 実行設定
├─ scripts/
│  ├─ backtest/
│  ├─ screener/
│  ├─ moomoo/
│  ├─ sbi/
│  ├─ portfolio/
│  ├─ line/
│  ├─ docs/
│  └─ windows/
├─ python/
│  └─ night_batch.py
├─ .github/workflows/        # 定期・手動 workflow
├─ tests/                    # unit / E2E / workflow 検証
├─ docs/                     # 計画・設計・調査・レポート
└─ artifacts/                # 生成物。通常は実装調査の起点にしない
```

### 5.7 最小セットアップ

README には現行環境の最小手順だけを書く。

```powershell
npm ci
npm run tv -- --help
npm test
```

CDP が必要なタスクでは、TradingView Desktop を debug port `9222` 付きで起動し、health check を先に実施する。

詳細なセットアップや OS 別トラブルシューティングは docs 側へ分離する。

### 5.8 テストの選び方

README に次を記載する。

- Core / CLI 変更: `npm run test:unit`
- Night Batch 変更: `npm run test:night-batch`
- CDP 実機確認: `npm run test:e2e`
- 全体: `npm run test:all`

タスク別ナビゲーション表と合わせて、対象テストを選べるようにする。

### 5.9 正本と生成物

README に次の区分を置く。

| 区分 | 主な場所 | 扱い |
|---|---|---|
| 実装の正本 | `src/`、`scripts/` | 動作ロジック |
| 実行設定の正本 | `config/`、`.github/workflows/` | 実行条件・自動化 |
| 検証 | `tests/` | 変更時に対応テストを確認 |
| 実装計画 | `docs/exec-plans/` | active / completed を区別 |
| 人間向け説明 | `docs/strategy/`、`docs/references/` | 必要な場合だけ参照 |
| 運用レポート | `docs/reports/` | 実行結果・障害記録 |
| 生成物 | `artifacts/` | 実装の正本ではない |

### 5.10 詳細ドキュメントへの導線

README 末尾から次へ誘導する。

- `docs/README.md`: docs 全体の索引
- `docs/DOCUMENTATION_SYSTEM.md`: 配置・鮮度管理ルール
- `docs/exec-plans/active/`: 進行中の実装計画
- `docs/strategy/`: 戦略説明
- `docs/reports/`: 運用結果・障害記録
- `docs/references/`: 再利用する参照資料

## 6. 変更対象

### 6.1 修正するファイル

#### `README.md`

全文をゼロベースで再構築する。

主な変更:

- プロジェクト概要を現行機能に合わせる
- AI / 開発者向けの読み順を追加する
- タスク別ナビゲーションを追加する
- current / legacy を分離する
- フォルダツリーを現行構造へ更新する
- MCP / CLI / Workflow / Night Batch の実行経路を整理する
- CLI 全件列挙を削減する
- 個別 runbook・過去事情を docs 側へ移す
- 正本と生成物を区別する

#### `docs/DOCUMENTATION_SYSTEM.md`

主な変更:

- 新 README と `docs/README.md` の役割分担を反映する
- 存在しないファイル・古いパス・古いテスト記述を修正する
- README に置く情報と docs に置く情報を明文化する
- current / archive / generated の区分を整理する

#### `package.json`

主な変更:

- 新規ドキュメント導線テストを `test:unit` に追加する

既存コマンドや依存関係には不要な変更を加えない。

### 6.2 新規作成するファイル

#### `docs/README.md`

役割:

- docs 配下の一次索引
- 分野別の入口
- current / archive / generated の区分
- README から分離した詳細 runbook への案内

想定カテゴリ:

- Exec plans
- Architecture / operations
- Strategy
- Research
- Reports
- References
- Sessions

#### `tests/documentation-navigation.test.js`

検証内容:

- README から参照する主要ファイル・ディレクトリが存在する
- `docs/README.md` から参照する主要パスが存在する
- README に current 環境が明記されている
- WSL を current default と誤認させる表現がない
- MCP / CLI / Night Batch の主要 entry point が README に記載されている
- README の重要なリンク切れを検出する

テストは過度に文章表現へ依存させず、主要導線の破損検知に限定する。

### 6.3 削除するファイル

なし。

旧 README の内容は Git 履歴に残るため、全文バックアップファイルは新規作成しない。

## 7. 実装手順

- [ ] `main` 最新状態で `AGENTS.md` と active exec-plans を再確認する
- [ ] README に記載する主要 entry point を実ファイルから再確認する
- [ ] `.github/workflows/` の現行 workflow を確認する
- [ ] `config/` の current / archive 構造を確認する
- [ ] `scripts/` の主要ドメインを確認する
- [ ] `tests/` の現行テスト名を確認する
- [ ] README に残す内容と docs へ分離する内容を分類する
- [ ] `tests/documentation-navigation.test.js` を先に追加し RED を確認する
- [ ] `docs/README.md` を作成する
- [ ] `README.md` をゼロベースで書き直す
- [ ] `docs/DOCUMENTATION_SYSTEM.md` を新導線へ合わせる
- [ ] `package.json` にテストを追加する
- [ ] documentation navigation test を GREEN にする
- [ ] `npm run test:unit` を実行する
- [ ] 必要に応じて `npm run test:all` を実行する
- [ ] README 内の全ローカルリンクとパスを再確認する
- [ ] current / legacy の表現をレビューする
- [ ] README がタスクルーターとして簡潔かレビューする

## 8. テスト戦略

### 8.1 RED

`tests/documentation-navigation.test.js` を先に作成し、次が未整備のため失敗する状態を確認する。

- `docs/README.md` が存在しない
- README に必要な主要導線が不足している
- 古いリンク・記述が残っている

### 8.2 GREEN

README、`docs/README.md`、`docs/DOCUMENTATION_SYSTEM.md` を更新し、導線テストを通す。

### 8.3 REFACTOR

- README の重複を削る
- 表とツリーで表現できる箇所を文章から置き換える
- 詳細すぎる runbook を docs へ移す
- テストが文言の細部に依存しすぎていないか確認する

### 8.4 実行コマンド

```powershell
npm run test:unit
npm run test:night-batch
npm run test:e2e
npm run test:all
```

最低限の完了条件は `npm run test:unit` 成功とする。

CDP 実機環境が利用可能な場合だけ E2E を実行し、利用不可の場合は skip / 未実施理由を明記する。

## 9. 成功条件

- [ ] README の上位 100 行以内でプロジェクト概要が分かる
- [ ] README の上位 100 行以内で現行主環境が分かる
- [ ] README の上位 150 行以内でタスク別の調査開始地点が分かる
- [ ] MCP / CLI / Workflow / Night Batch の入口が明確である
- [ ] current と legacy が混同されない
- [ ] README から存在しないパスへリンクしない
- [ ] 実装の正本と生成物が区別されている
- [ ] CLI / MCP tool の全件手書き列挙に依存しない
- [ ] 個別運用例や過去事情が README の主導線を妨げない
- [ ] README をおおむね 250〜350 行以内に抑える
- [ ] `docs/README.md` が docs 全体の索引として機能する
- [ ] documentation navigation test が成功する
- [ ] `npm run test:unit` が成功する

## 10. 影響範囲

主な影響はドキュメントとドキュメント検証テストに限定する。

実装コードの実行結果、CLI の挙動、MCP tool の挙動、workflow の挙動は変更しない。

ただし、README の事実確認中にコードとドキュメントの不整合が見つかった場合は、今回の範囲ではコードを変更せず、README を現行コードへ合わせる。コード側の問題は別タスクとして報告する。

## 11. リスク

### 11.1 README に情報を残しすぎる

詳細説明を残しすぎると、再び巨大READMEになる。

対策:

- README は入口と判断基準に限定する
- コマンド一覧は `--help` へ委譲する
- runbook は docs へ分離する

### 11.2 README から情報を削りすぎる

詳細を分離した結果、初回セットアップや基本実行方法が分からなくなる可能性がある。

対策:

- 最小セットアップ
- health check
- テストコマンド
- タスク別ナビゲーション

は README に残す。

### 11.3 ドキュメントテストが壊れやすくなる

文章の完全一致をテストすると、軽微な表現変更でも失敗する。

対策:

- 主要パスの存在
- 主要セクション
- current 環境
- 主要 entry point

だけを検証する。

### 11.4 active な別計画と競合する

README や docs を変更する別の active plan が存在する場合、競合する可能性がある。

対策:

- 実装開始前に `docs/exec-plans/active/` を再確認する
- 重複計画がある場合は統合または順序調整を行う

## 12. 対象外

今回の計画では次を実施しない。

- 実装コードのリファクタリング
- CLI コマンドの追加・削除
- MCP tool の追加・削除
- スクリーナーロジックの変更
- バックテストロジックの変更
- Night Batch の実行方式変更
- Windows runner の構成変更
- WSL 用スクリプトの削除
- `artifacts/` の全面整理・削除
- 過去の research / session / report 文書の全面再分類
- `AGENTS.md` の変更
- `.github/copilot-instructions.md` の変更

## 13. 完了時のファイル移動

実装・レビュー・検証が完了し、コミット段階へ進む際は、この計画書を次へ移動する。

```text
docs/exec-plans/completed/readme-rebuild-ai-navigation_20260707_1513.md
```

## 14. 承認後の次ステップ

ユーザー承認後、以下の順で進める。

1. active plan と実ファイルの再確認
2. documentation navigation test の追加
3. `docs/README.md` の作成
4. `README.md` の再構築
5. `docs/DOCUMENTATION_SYSTEM.md` の更新
6. テストとレビュー
7. ユーザーへのレビュー依頼
8. 承認後に completed へ移動し、コミット・プッシュ
