# Exec Plan: visible-first backtest の再検証とローカル自動化方針整理

## Problem

現在の既定運用は **Session1 visible / port 9225 / single-worker sequential** であり、`docs/command.md`・runbook・campaign 設定・最新 handoff でもこの前提が揃っている。  
一方で、実運用では「ユーザーが開いた visible 側ではセッション切断警告が出るのに、別プロセス側で backtest が進んでいたように見える」という観測があり、**visible-first のつもりが実際には background/hidden 側へ寄っている可能性**を振り返る必要がある。

あわせて、現在 CLI/サブエージェント経由で行っている単純な反復処理（Pine 反映 → backtest → 結果取得）について、将来的に **GitHub Actions ではなくローカル Python の夜間バッチへ外出し**できるかを検討したい。  
本計画は、まず現状の実態と制約を整理し、必要なら次段の実装計画へ接続できる状態を作るための **調査中心の exec-plan** である。

## Relationship to existing active plans

- `docs/exec-plans/active/` は現時点で空であり、**重複する active plan は存在しない**
- 既存 completed plan / runbook は参照対象であり、特に以下を前提証拠として扱う
  - `docs/command.md`
  - `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md`
  - `docs/exec-plans/completed/dual-worker-both-visible-feasibility_20260406_1106.md`
  - `docs/research/latest/next-long-run-finetune-partial-handoff_20260410_1503.md`
- 2026-04-10 の `5ffac30 feat: sequential/visible-first default for backtest orchestration` は、visible-first default 化が**比較的新しい変更**であることを示すため、回帰点の候補として確認対象に含める

## Success criteria

- 現行挙動について、少なくとも以下を説明できる
  - なぜ visible ではなく background/hidden 側で動いているように見えたのか
  - どの起点で visible-first の意図と実態がズレうるのか
  - `launchDesktop()` の detached 起動と CDP endpoint 解決順がこの現象にどう関与しうるのか
- 「visible に見せたい運用」と「実際に backtest を進める実体」を分離して整理し、**再現可能な visible-first 運用案**を 1 つ以上提示できる
- 単純反復の backtest をローカル Python に外出しする場合の
  - 実現可能性
  - 必要最小構成
  - 既存 CLI との責務分担
  - 実装しない理由があるならその阻害要因
  を整理できる
- 調査結果を受けて、必要なら次段の実装計画へそのまま接続できる粒度の成果物を残せる

## Files / assets

### 作成

- `docs/exec-plans/active/visible-first-backtest-automation-review_20260410_1614.md`（本計画）
- `docs/research/latest/visible-first-backtest-automation-review_20260410_1614.md`（調査結果のまとめ）
- 必要なら `docs/research/archive/local-python-backtest-automation_20260410_1614.md`（将来実装案の設計メモ）

### 変更候補（調査結果次第）

- `docs/command.md`
- `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md`
- `README.md`
- `src/core/launch.js`
- `src/connection.js`
- `scripts/backtest/run-finetune-bundle.mjs`
- `config/backtest/campaigns/next-long-run-us-finetune-100x10.json`
- `config/backtest/campaigns/next-long-run-jp-finetune-100x10.json`
- `src/cli/index.js`
- `tests/` 配下の既存 backtest / CLI 関連テスト

### 参照のみ

- `docs/exec-plans/completed/dual-worker-both-visible-feasibility_20260406_1106.md`
- `docs/research/latest/next-long-run-finetune-partial-handoff_20260410_1503.md`
- `Oh-MY-TradingView.log`
- 関連する campaign 結果・checkpoint・artifact

### 削除

- なし想定

## 実装・調査内容と影響範囲

### Workstream A: visible / background 実態の振り返り

- visible-first default に寄せた後も、実際には detached 起動・既存セッション接続・既定ポート解決の影響で **見えているアプリと制御対象が一致しない** 経路がないか確認する
- `launchDesktop()` の detached 起動が
  - 起動成功確認なし
  - 前景/可視状態の保証なし
  - 既存起動済みインスタンスとの関係不明
  という性質を持つため、visible 運用を不安定にしていないか整理する
- `src/connection.js` の endpoint 解決順（env var > session port > default 9222）により、意図しない既存 endpoint へ接続していないか確認する
- 「1 アカウントでアクティブにできるのは 1 個のみ」警告と backtest 進行の観測を突き合わせ、**アカウント制約・セッション競合・プロセス分離・UI 表示**のどの問題だったか分類する

### Workstream B: ローカル Python 外出し案の成立性確認

- 対象を「単純な Pine 反映 → backtest → 結果取得の反復」に限定し、CLI の全責務を置き換えるのではなく **夜間バッチ部分のみ外出し**できるか確認する
- 候補アーキテクチャを比較する
  1. Python が直接 CDP/既存 API を叩く
  2. Python はオーケストレータに徹し、既存 Node CLI を subprocess で呼ぶ
  3. Python は入力生成・スケジューリング・要約前処理のみ担い、TradingView 操作は既存 CLI 継続
- 成立条件として以下を明示する
  - ローカル夜間実行であること
  - GitHub Actions 非使用
  - 翌朝は CLI による要約確認だけで済むこと
  - 既存 artifact / result 形式との整合を極力維持すること

### 影響範囲

- 主影響は **運用設計・起動/接続ポリシー・runbook/documentation**
- 追加実装が必要になった場合のみ、起動処理・接続先解決・CLI 実行境界・結果出力形式へ影響
- single-worker / sequential の既定運用は維持を前提とし、調査段階では無理に default を変えない

## TDD / 検証方針

本タスクは調査主体だが、**将来の実装着手時は RED -> GREEN -> REFACTOR を守る**。

### RED

- まず現象を固定する
  - visible 側でセッション切断警告が出るケース
  - backtest が別プロセス/別 endpoint で進んだように見えるケース
- 追加実装が必要な場合は、先に失敗テストを書く
  - 例: endpoint 解決順の期待
  - 例: launch 後に対象 port / session へ接続できなければ失敗とみなす条件
  - 例: Python オーケストレータから既存 CLI を呼ぶ最小 contract

### GREEN

- 最小変更でテストを通し、visible-first の意図と実接続先のズレを減らす
- Python 外出しが有望なら、まずは subprocess ベースなど最小経路で成立性を確認する

### REFACTOR

- 起動責務と接続責務を整理する
- visible 制御・session port・default port の暗黙依存を減らす
- docs / runbook / CLI オプションの説明を一貫させる

### カバレッジ方針

- 実装に進む場合は **80% 以上**を確認する
- ユーティリティは unit test
- CLI / API 境界は integration test
- 重要な backtest 実行フローは既存 E2E の範囲で回帰確認する

## Validation commands

既存コマンドのみを使う。

```bash
npm test
npm run test:e2e
npm run test:all
node src/cli/index.js status
TV_CDP_PORT=9225 node src/cli/index.js status
node src/cli/index.js backtest --help
node src/cli/index.js summarize --help
node scripts/backtest/run-finetune-bundle.mjs --help
```

必要に応じて、既存 runbook 記載の疎通確認も使う。

```bash
curl -sS http://127.0.0.1:9222/json/version
curl -sS http://127.0.0.1:9225/json/version
curl -sS http://127.0.0.1:9225/json/list
```

## Out of scope

- GitHub Actions を使った自動化
- いきなり Python 実装を始めること
- Apple ログイン自動化
- multi-worker 並列実行の全面再設計
- TradingView 側の利用制約そのものを回避する仕組みの実装
- 無関係な preset / campaign ロジック変更
- 単なる docs 整理だけを目的にした広範囲リファクタ

## Risks

- visible に見えている UI と、CLI が実際に掴んでいる CDP endpoint が別物の可能性
- detached 起動のため、起動完了・可視状態・前景状態を保証できず、再現が不安定になる可能性
- TradingView の 1 アカウント / 1 アクティブ制約が、ローカル Python 化しても根本制約として残る可能性
- Python 直接実装は Node 側既存知見の再実装コストが高く、短期的には subprocess 呼び出しの方が妥当な可能性
- `5ffac30` 以前/以後の差分だけでは説明しきれず、OS/session/profile 状態差が混入している可能性
- docs 上の「visible-first default」と実コード/実行実態がズレていた場合、運用修正だけでなく実装修正が必要になる可能性

## Implementation steps

- [ ] `docs/exec-plans/active/` が空であることを前提に、本計画を active plan として確定する
- [ ] `docs/command.md`・runbook・latest handoff・completed plan を読み、現行の canonical 運用を整理する
- [ ] `src/core/launch.js`・`src/connection.js`・関連 script/config を確認し、visible-first default と実際の接続/起動経路のズレ候補を列挙する
- [ ] `5ffac30 feat: sequential/visible-first default for backtest orchestration` の差分と、その前後で変わった前提を調べる
- [ ] 「visible 側では切断警告、別側で backtest 継続」の現象を、session・port・profile・account 制約の観点で仮説分解する
- [ ] 現行構成で、どの条件なら “visible に見えている TradingView” と “CLI が操作する対象” が一致するのかを整理する
- [ ] 再実現したい運用像を定義する
  - 例: 常に 9225 の visible インスタンスのみを操作対象にする
  - 例: 起動済み visible セッションへの attach のみ許可する
- [ ] ローカル Python 外出しの候補アーキテクチャを 2〜3 案に絞り、責務分担・長所/短所・既存 CLI 再利用度を比較する
- [ ] 既存 result / artifact / summary 形式を維持したまま Python バッチ化できる最小構成を整理する
- [ ] 調査結果を `docs/research/latest/...` にまとめ、以下を明文化する
  - visible 問題の推定原因
  - 推奨運用
  - Python 外出しの推奨アプローチ
  - 実装が必要な差分一覧
- [ ] 実装が必要な場合のみ、次段 Step2 用の実装対象・テスト方針・検証コマンドを具体化する

## Expected deliverable

- そのままレビュー可能な調査結果ドキュメント 1 本
- visible-first 運用についての結論
  - 維持すべき運用
  - 修正すべき運用
  - 実装修正が必要かどうか
- ローカル Python 夜間バッチ化についての結論
  - 可能 / 条件付きで可能 / 当面見送り
  - 推奨構成
  - 次段で触るファイル一覧
- 必要なら Step2 IMPLEMENT に引き継げる、具体的な実装差分の箇条書き

## Outcome expectation

この計画の完了時点では、まだコード変更に入らなくてよい。  
まずは **「何が visible で、実際に何が backtest を進めていたのか」** を説明可能にし、その上で **「夜間ローカル Python + 翌朝 CLI 要約」** へ進むべきかどうかを判断できる状態を作る。  
必要な実装が見えた場合のみ、次段の実装計画へ進む。
