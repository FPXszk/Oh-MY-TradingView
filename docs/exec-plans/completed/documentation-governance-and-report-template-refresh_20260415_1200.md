# documentation-governance-and-report-template-refresh_20260415_1200

## 目的

- `docs/reports` の役割を明文化し、未使用・代替可能な参照を整理する
- `docs/command.md` を廃止し、必要な運用情報だけを `README.md` に統合する
- `docs/references/backtests` / `docs/references/pine` の目的と利用実態を明確化する
- result の人間向けテンプレートを、最新 summary ベースで再設計する
- `docs/research/strategy/` に、初見の人でも読める戦略説明 docs を追加する
- 更新後の `README.md` を複数エージェントでレビューする
- 最後にドキュメント整備、session log 保存、push まで行える状態にする

## 現状整理

- `docs/DOCUMENTATION_SYSTEM.md` が `docs/command.md` を初読順に含めており、廃止時は導線更新が必須
- `README.md` / `docs/command.md` / 一部テストが `docs/reports/night-batch-self-hosted-run8.md` を参照している
- `tests/repo-layout.test.js` と `tests/windows-run-night-batch-self-hosted.test.js` が `docs/command.md` の存在・文言に依存している
- `docs/reports` は実質的に incident / 運用メモの履歴置き場だが、現状は役割が明文化されていない
- `docs/references/backtests` は raw backtest artifact、`docs/references/pine` は Pine source snapshot + manifest の保管庫
- `docs/research/latest/main-backtest-latest-summary.md` は `python/night_batch.py` の `write_latest_backtest_summary()` で生成される
- rich report の整形責務は主に `scripts/backtest/generate-rich-report.mjs` と `src/core/campaign-report.js` にある
- `docs/research/strategy/` は未整備で、初見向けの入口が不足している

## 変更・作成・削除対象ファイル

### 変更予定

- `README.md`
  - `docs/command.md` から残すべき運用情報を統合
  - `docs/reports` / `docs/references/*` / `docs/research/strategy/` への導線を整理
- `docs/DOCUMENTATION_SYSTEM.md`
  - 読む順番と文書体系を `docs/command.md` 廃止後の形へ更新
- `docs/research/latest/README.md`
  - latest の読み方と、strategy docs / references の位置づけを追記
- `scripts/backtest/generate-rich-report.mjs`
  - result テンプレートを新構成へ変更
- `python/night_batch.py`
  - 最新 summary / strategy docs の生成・配置フローを接続
- `src/core/campaign-report.js`
  - Top5 戦略の銘柄別成績表など、生成に必要な集計 helper を補強（必要最小限）
- `tests/repo-layout.test.js`
  - `docs/command.md` 前提を除去し、新しい docs 入口を検証
- `tests/windows-run-night-batch-self-hosted.test.js`
  - `docs/command.md` 文言依存を README / 新 docs 構成に置換
- `tests/night-batch.test.js`
  - latest summary と strategy docs 生成の期待値を更新
- `package.json`
  - 新規テストファイルを追加する場合のみ `test` / `test:all` に追記

### 作成予定

- `docs/reports/README.md`
  - `docs/reports` の目的、保管基準、README との役割分担を明文化
- `docs/research/strategy/README.md`
  - 初見向け入口、読む順番、数値の正本、生成物/手書き文書の境界を説明
- `docs/research/strategy/latest-strategy-reference.md`
  - 全戦略の詳細、市場別の見どころ、期間、主要指標をまとめる generated doc
- `docs/research/strategy/latest-symbol-reference.md`
  - 銘柄別の上位戦略、比較表、期間情報をまとめる generated doc
- `scripts/backtest/generate-strategy-reference.mjs`
  - latest summary / ranking / catalog / references から strategy docs を生成
- `tests/generate-rich-report.test.js`
  - 新テンプレートの RED/GREEN 用テスト
- `docs/working-memory/session-logs/<task-name>_YYYYMMDD_HHMM.md`
  - 最終 handoff 用 session log

### 削除予定

- `docs/command.md`

## 提案する最終構成

### docs/command.md 廃止方針

- ルートの運用入口は `README.md` に一本化する
- ただし README を巨大 runbook にしないため、残すのは以下に限定する
  - 現在の docs 導線
  - 日常運用で本当に使う最小限コマンド
  - 最新結果 / references / strategy docs への案内
- 過去に貼られた paste transcript / ゴミログは README に移さず削除する
- 詳細な incident 履歴は `docs/reports/README.md` から辿れる archive 扱いにする

### docs/reports の扱い

- 主用途を「恒常的な手順書」ではなく「incident / postmortem / run-specific note archive」と定義する
- `README.md` から特定 run レポートへの直接依存を減らし、必要な知見は README 本文へ吸収する
- `run8` は参照価値があるため即削除ではなく archive として保持し、主要教訓のみ README に要約転記する
- 他レポートは `docs/reports/README.md` 上で「現役参照か / 履歴保管か」を明示する

### docs/research/strategy の構成方針

手書き入口 + generated 詳細 docs のハイブリッド構成を採用する。

- 手書き:
  - `docs/research/strategy/README.md`
    - 初見向け説明
    - どのファイルが overview で、どれが数値の正本か
    - 各 market / period / symbol の読み方
- 生成:
  - `latest-strategy-reference.md`
  - `latest-symbol-reference.md`

この構成なら、説明文の可読性を維持しつつ、数値表は最新 artifact から再生成してドリフトを防げる。

## 影響範囲

### 直接影響

- ドキュメント導線
  - `README.md`
  - `docs/DOCUMENTATION_SYSTEM.md`
  - `docs/research/latest/README.md`
  - `docs/reports/README.md`
- テスト
  - docs path / docs content 前提の repository tests
  - latest summary 生成の integration test
- 生成物
  - human-facing rich report
  - latest summary
  - strategy reference docs

### 間接影響

- `docs/command.md` を読んでいた既存運用フロー
- `docs/reports/night-batch-self-hosted-run8.md` の直接リンク
- `docs/references/backtests` / `docs/references/pine` を「何のために残しているか」の理解

### 影響しない想定

- backtest 実行ロジックそのもの
- strategy ranking の算出式
- TradingView / Windows runner の実行挙動
- 既存 raw artifact の中身

## テスト戦略（RED → GREEN → REFACTOR）

### RED

- `tests/repo-layout.test.js` を先に更新し、`docs/command.md` 削除後の期待に変える
- `tests/windows-run-night-batch-self-hosted.test.js` を更新し、README 側へ移した文言/導線を期待させる
- `tests/generate-rich-report.test.js` を追加し、以下を fail させる
  - 先頭に結論がある
  - 全戦略スコア一覧がある
  - Top5 戦略の銘柄別成績表がある
  - 末尾に改善点 / 次回確認事項がある
- `tests/night-batch.test.js` を拡張し、latest summary / strategy docs 生成の期待を fail させる

### GREEN

- `README.md` へ必要最小限の command 内容を統合
- `docs/command.md` 依存を解消
- rich report generator を新テンプレートへ更新
- strategy docs generator を実装し、night batch から生成できるよう接続
- `docs/reports/README.md` と `docs/research/strategy/README.md` を作成

### REFACTOR

- report / strategy docs の markdown 組み立てを helper 化
- 重複する文書導線の説明を README / DOCUMENTATION_SYSTEM / latest README で統一
- `src/core/campaign-report.js` の責務を肥大化させない形で集計 helper を整理

## 実行予定の既存テスト・検証コマンド

- `npm test`
- `node --test tests/repo-layout.test.js tests/windows-run-night-batch-self-hosted.test.js`
- `node --test tests/campaign-report.test.js tests/night-batch.test.js tests/generate-rich-report.test.js`
- 必要に応じて:
  - `node scripts/backtest/generate-rich-report.mjs ...`
  - `python python/night_batch.py nightly --dry-run ...`

## カバレッジ方針

- 変更の中心が generator / docs routing / night-batch integration のため、以下で変更箇所の 80% 以上を実質カバーする方針とする
  - unit: report template / helper
  - integration: latest summary / strategy docs generation
  - repo policy: docs path / docs references
- ただし repo に専用 coverage コマンドは見当たらないため、既存テスト群の拡張で担保する

## リスク

- `docs/command.md` 削除で、既知以外の隠れた参照が残る可能性がある
- README への統合量が多すぎると、今度は README が肥大化する
- strategy docs を全自動生成に寄せすぎると、初見向け説明の読みやすさが落ちる
- `docs/reports` を過剰に整理すると、incident の一次記録を失うおそれがある
- latest summary と strategy docs の責務分離を誤ると、同じ数値の説明が二重化する

## Out of Scope

- backtest スコアリングロジックの再設計
- `docs/references/backtests` / `docs/references/pine` の raw artifact 自体の削除・再編成
- 古い report 全件の書き直し
- GitHub Actions / self-hosted runner の実行仕様変更
- strategy catalog の中身そのものの見直し

## 実装ステップ

- [ ] `docs/reports` / `docs/references/*` / `docs/command.md` の参照箇所を最終棚卸しし、残す・READMEへ吸収する・archive扱いにする、の3分類を確定する
- [ ] `README.md` の新しい責務を定義し、`docs/command.md` から移すべき最小限セクションを決める
- [ ] `docs/reports/README.md` の骨子を作り、`run8` / `run15` の位置づけを明記する
- [ ] RED: `tests/repo-layout.test.js` と `tests/windows-run-night-batch-self-hosted.test.js` を更新し、`docs/command.md` 廃止前提で失敗させる
- [ ] RED: `tests/generate-rich-report.test.js` を追加し、新テンプレートの期待値を固定する
- [ ] RED: `tests/night-batch.test.js` に strategy docs 生成と latest summary 新構成の期待を追加する
- [ ] GREEN: `README.md` / `docs/DOCUMENTATION_SYSTEM.md` / `docs/research/latest/README.md` を更新して導線を一本化する
- [ ] GREEN: `docs/command.md` を削除し、リンク切れを解消する
- [ ] GREEN: `scripts/backtest/generate-rich-report.mjs` を更新し、結論先頭・全戦略スコア一覧・Top5戦略銘柄別成績表・改善点/次回確認事項のテンプレートを実装する
- [ ] GREEN: 必要最小限で `src/core/campaign-report.js` を補強し、Top5 / symbol detail の表生成に必要な集計を用意する
- [ ] GREEN: `scripts/backtest/generate-strategy-reference.mjs` を追加し、`docs/research/strategy/latest-strategy-reference.md` / `latest-symbol-reference.md` を生成できるようにする
- [ ] GREEN: `python/night_batch.py` から latest summary と strategy docs を一貫生成する
- [ ] GREEN: `docs/research/strategy/README.md` を作成し、初見向けの読み順・用語・数値の正本を明示する
- [ ] REFACTOR: markdown render helper と docs wording を整理し、重複記述を減らす
- [ ] 更新後の `README.md` を複数エージェントで並列レビューし、指摘を反映する
- [ ] `npm test` を含む既存テスト群で最終検証する
- [ ] session log を `docs/working-memory/session-logs/` に保存する
- [ ] 承認後フローとして、exec plan を `completed/` へ移し、commit / push する

## 完了条件

- `docs/command.md` が削除され、主要導線が `README.md` に統合されている
- `docs/reports` / `docs/references/backtests` / `docs/references/pine` の役割が文書化されている
- latest summary / rich report が新テンプレートで生成される
- `docs/research/strategy/` に初見向け入口と generated 詳細 docs が存在する
- 既存テストと追加テストが通る
- README レビュー結果を反映済みである

## 承認待ち

この plan は実装前レビュー用。ユーザー承認後に Step 2（IMPLEMENT）へ進む。
