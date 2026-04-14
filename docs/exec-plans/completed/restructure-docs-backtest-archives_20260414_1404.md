# 実装計画: ドキュメント/バックテスト成果物/設定構成の再編と自動アーカイブ整備

- **提案ファイル名**: `docs/exec-plans/active/restructure-docs-backtest-archives_20260414_1404.md`
- **作成日**: 2026-04-14
- **フェーズ**: PLAN
- **目的**: リポジトリ全体の文書体系・バックテスト成果物・設定資産・運用ログを「latest / archive」基準で再編し、参照整合性と今後の保守性を改善する

---

## 0. 背景と依頼要約

本タスクでは、以下を一体として扱う。

1. ドキュメント構造全体を点検し、不整合・陳腐化・参照ズレを解消する  
2. `docs/exec-plans/active` に残っている旧計画を整理する  
3. `config/backtest/campaigns` と `config/backtest/universes` を `latest` / `archive` で再編する  
4. `config/backtest/strategy-presets.json` から最新世代・前世代バックテスト結果を根拠に「強い15戦略」だけ残し、それ以外を `docs/bad-strategy` へ移す  
5. 未使用であれば `docs/research/archive` を完全削除する  
6. `docs/research` のバックテスト結果を `latest` / `archive` へ再編する（`old` 廃止）  
7. `docs/working-memory/session-logs` も最新1件以外を `archive` へ再編する  
8. ルート `docs/research/results/` を `docs/research` 配下へ統合し、参照を修正する  
9. `docs/command.md` と `docs/explain-forhuman.md` を `docs/` 配下へ移動する  
10. 「latest 以外を archive へ移す」運用を自動化する  
11. main ブランチ最新バックテスト結果から詳細サマリを作る  
12. バックテスト運用・戦略評価・構造・文書体系の改善案を整理する  
13. ドキュメント更新、セッションログ記録、最終的に push 可能な状態まで整える  

---

## 1. 既存アクティブ計画との競合確認

現在 `docs/exec-plans/active` に存在する計画:

- `document-self-hosted-runner-foreground-autostart_20260412_0006.md`
- `investigate-night-batch-self-hosted-queued_20260410_2307.md`
- `rerun-night-batch-after-run-cmd_20260410_1714.md`
- `run-night-batch-self-hosted-workflow-dispatch_20260411_0025.md`

### 想定される重なり
- night batch / self-hosted runner 系の計画は、`docs/research`・`results`・`session-logs`・運用ドキュメント参照先に影響する可能性が高い
- 本タスクでは文書構造と成果物配置を変更するため、**これらの計画に書かれた参照パスが古くなるリスク**がある
- とくに以下は競合対象:
  - night batch 実行結果への参照
  - `docs/research/results/` 前提の記述
  - `docs/research/archive` 前提の記述
  - `docs/research/archive` 参照

### PLAN上の扱い
- 実装前に各 active plan の状態を再確認する
- すでに完了済みなら `completed/` へ移動候補とする
- 未完了扱いの根拠があるなら、本タスクでは削除せず「関連計画」として参照修正のみ行う
- この計画自体で **active plan の棚卸し基準** を明記する

---

## 2. スコープ

### 実施対象
- `README.md`
- `docs/` 全体の構造・参照・索引
- `docs/exec-plans/active`, `docs/exec-plans/completed`
- `docs/research/`
- `docs/working-memory/session-logs/`
- `config/backtest/campaigns/`
- `config/backtest/universes/`
- `config/backtest/strategy-presets.json`
- `docs/bad-strategy/`（新設候補）
- ルート `docs/research/results/` とその参照先
- `docs/command.md`, `docs/explain-forhuman.md`
- 自動アーカイブ用スクリプト/コマンド/テスト
- 最新バックテスト要約ドキュメント
- セッションログ

### スコープ外
- 戦略ロジックそのものの改善実装
- バックテストエンジンのアルゴリズム変更
- 既存 night batch 実行フローの仕様変更（必要最小限の参照修正は除く）
- GitHub Actions / runner 構成の新規設計
- 未承認の大規模命名規則変更

---

## 3. 実装方針

### 基本方針
- 命名を **`old` から `archive` に統一**
- 「人が最初に見る場所」は必ず `latest` に揃える
- 最新1件の定義を文書化し、機械的に判定・退避できるようにする
- 参照先変更は README / INDEX / ガイド / スクリプト / テストまで追う
- 設定資産・成果物・運用ログを同じ整理原則に寄せる
- 戦略の取捨選択は主観ではなく、**最新世代 + 前世代のバックテスト結果に基づく再現可能な基準**で行う

---

## 4. 変更・削除・作成するファイル/ディレクトリ

## 4-1. 変更対象（想定）
- `README.md`
- `docs/DOCUMENTATION_SYSTEM.md`
- `docs/research/README.md` または相当の索引文書
- `docs/research/latest/README.md`
- `docs/working-memory/README.md` または相当文書
- `config/backtest/strategy-presets.json`
- `package.json`（自動整理コマンド追加が必要な場合）
- `justfile`（運用コマンド追加が適切な場合）
- `scripts/backtest/generate-rich-report.mjs`
- `scripts/backtest/run-long-campaign.mjs`
- `python/night_batch.py`
- `scripts/windows/run-night-batch-self-hosted.cmd`
- `src/core/campaign.js`
- `src/core/backtest.js`
- 既存テスト:
  - `tests/campaign.test.js`
  - `tests/campaign-report.test.js`
  - `tests/preset-validation.test.js`
  - `tests/night-batch.test.js`
  - `tests/windows-run-night-batch-self-hosted.test.js`

## 4-2. 新規作成候補
- `docs/bad-strategy/README.md`
- `docs/bad-strategy/<retired-strategies>.md` または JSON/MD 形式の台帳
- `docs/research/latest/<main-latest-backtest-summary>.md`
- `docs/working-memory/session-logs/<this-session-log>.md`
- `scripts/maintenance/archive-non-latest-items.mjs`（仮）
- `tests/archive-non-latest-items.test.js`（仮）
- `tests/backtest-summary-generation.test.js`（必要なら）
- `docs/research/archive/README.md`（必要なら）
- `config/backtest/campaigns/latest/`, `config/backtest/campaigns/archive/`
- `config/backtest/universes/latest/`, `config/backtest/universes/archive/`

## 4-3. 削除対象候補
- `docs/research/archive/` 一式（未使用確認後）
- `docs/research/archive/`（`archive/` へ移行後）
- ルート `docs/research/results/`（統合完了後）
- ルート `docs/command.md`
- ルート `docs/explain-forhuman.md`
- `docs/exec-plans/active/` に残る完了済み旧計画（削除ではなく `completed/` へ移動が原則）

---

## 5. 実装内容と影響範囲

### Phase A: 現状棚卸しと参照マップ作成
**内容**
- `docs/` 全体で以下を洗い出す
  - `old` 参照
  - `docs/research/archive` 参照
  - ルート `docs/research/results/` 参照
  - ルート `docs/command.md` / `docs/explain-forhuman.md` 参照
  - `latest` の定義不一致
- active plans の状態を整理し、完了済み候補を抽出

**影響**
- 実装以降の参照修正漏れを防ぐ
- 旧構造前提の記述を一括で置換できる

---

### Phase B: ドキュメント体系の正規化
**内容**
- `docs/research/archive` → `docs/research/archive` へ統一
- `docs/research/archive` の使用有無を確認し、未使用なら削除
- `docs/command.md`, `docs/explain-forhuman.md` を `docs/` 配下へ移設
- `README.md` と `docs/DOCUMENTATION_SYSTEM.md` を新構造へ合わせて更新
- `docs/research/latest/README.md` を「最新結果の入口」として強化
- 必要なら `docs/README.md` ないし索引を再構成

**影響**
- 新規参加者が迷いにくくなる
- 参照切れ・二重説明を減らせる

---

### Phase C: 成果物とログの `latest/archive` 再編
**内容**
- `docs/research` 配下の root-level 結果文書を棚卸し
- 最新1件のみ `latest/` に残し、それ以外を `archive/` に移動
- `docs/working-memory/session-logs` も最新1件以外を `archive/` に移動
- ルート `docs/research/results/` を `docs/research/` 配下へ統合
  - `campaigns/`
  - `night-batch/`
  - `runtime-verification/`
- 関連参照・説明・運用手順を修正

**影響**
- 「今見るべき結果」が明確になる
- 過去成果物を消さずに整理できる
- スクリプトやテストの入出力パスに影響

---

### Phase D: backtest 設定資産の再編
**内容**
- `config/backtest/campaigns` と `config/backtest/universes` を
  - `latest/`
  - `archive/`
  に分割
- もっとも最近使われた定義だけを `latest` に残す
- 最新判定ルールを明文化
  - ファイル名タイムスタンプ
  - 参照元の最新 run 記録
  - 明示マニフェスト  
  のいずれを採るか決める

**影響**
- 運用時の設定選択ミスを減らせる
- `src/core/campaign.js`, `python/night_batch.py`, CLI/スクリプト側のデフォルト解決に影響

---

### Phase E: 戦略プリセットの選別と退避
**内容**
- `config/backtest/strategy-presets.json` を最新世代・前世代バックテスト結果に基づき評価
- 「強い15戦略」だけ残す
- 除外戦略は `docs/bad-strategy/` に根拠付きで退避
- 判定基準を明文化
  - 総合スコア
  - 収益性
  - 安定性
  - DD耐性
  - 世代間の再現性
- 「単発勝ち」より「複数世代で上位」を優先

**影響**
- プリセット利用体験が改善
- `tests/preset-validation.test.js` 更新が必要
- 将来の戦略採用基準の土台になる

---

### Phase F: latest 自動アーカイブの実装
**内容**
- `latest` に複数件残らないよう自動整理スクリプトを追加
- 対象:
  - `docs/research`
  - `docs/working-memory/session-logs`
  - `config/backtest/campaigns`
  - `config/backtest/universes`
- コマンド例:
  - 手動実行
  - night batch 後フック
  - rich report 生成後フック
- archive へ移す条件を deterministic にする

**影響**
- 人手整理の負荷を減らせる
- 誤って最新を退避しない保護ロジックが必要

---

### Phase G: 最新 main バックテストの詳細サマリ作成
**内容**
- latest main branch のバックテスト結果を根拠に以下を整理した文書を作成
  - 最強戦略
  - 上位戦略比較
  - 失敗戦略の傾向
  - 学び
  - 次の改善案
- post-backtest summarization の自動化方針を評価
  - 第一候補: Copilot CLI による半自動/自動要約
  - 代替: deterministic なメトリクス集計 + ランキング + テンプレート生成
- 再現可能なサマリ生成フロー案を残す

**影響**
- バックテスト結果の意思決定速度が上がる
- 将来的な定例運用自動化に直結

---

### Phase H: broader project improvements の整理
**内容**
- 以下4観点で改善案を文書化
  1. backtest workflow
  2. strategy thinking
  3. project structure
  4. documentation
- 実装まで今回やるもの / 将来課題に回すものを分離

**影響**
- 今回の再編を単発で終わらせず、運用改善へつなげられる

---

## 6. 実装ステップ（チェックボックス）

### Step 1: 調査・棚卸し
- [ ] `docs/` 全体の参照・索引・リンク不整合を洗い出す
- [ ] `docs/research/archive` 参照箇所を全検索する
- [ ] `docs/research/archive` 参照箇所と実利用有無を確認する
- [ ] `docs/research/results/` 参照箇所を全検索する
- [ ] `docs/command.md` / `docs/explain-forhuman.md` 参照箇所を全検索する
- [ ] `docs/exec-plans/active` の各計画の完了/未完了を判定する
- [ ] 最新 main バックテスト結果の所在と世代境界を特定する
- [ ] 戦略評価に使う「最新世代」「前世代」の対象結果を確定する

### Step 2: 先に RED を作る
- [ ] ドキュメント参照整合性テスト/検査を追加する
- [ ] `latest` に複数件ある場合に失敗するテストを追加する
- [ ] `old` / `docs/research/results/` / 旧パス参照を禁止するテストを追加する
- [ ] strategy preset 上限15件・採用対象妥当性を検証するテストを追加する
- [ ] 自動アーカイブスクリプトの期待動作テストを追加する
- [ ] backtest summary 出力の最小整合性テストを追加する

### Step 3: 構造変更
- [ ] `docs/research` を `latest/archive` 基準へ再編する
- [ ] `docs/working-memory/session-logs` を `latest/archive` 基準へ再編する
- [ ] `config/backtest/campaigns` を `latest/archive` 基準へ再編する
- [ ] `config/backtest/universes` を `latest/archive` 基準へ再編する
- [ ] `docs/research/results/` を `docs/research/` 配下へ統合する
- [ ] `docs/command.md` と `docs/explain-forhuman.md` を `docs/` 配下へ移動する
- [ ] 未使用なら `docs/research/archive` を削除する
- [ ] 完了済み active plan を `completed/` へ移動する

### Step 4: コード/運用修正
- [ ] スクリプト・Python・Windows cmd の参照パスを更新する
- [ ] latest 自動アーカイブスクリプトを実装する
- [ ] night batch / rich report 後に自動整理可能か組み込む
- [ ] strategy preset 選抜ロジックに沿ってプリセットを整理する
- [ ] `docs/bad-strategy` に退避結果と理由を記録する
- [ ] 最新 main バックテスト要約文書を作成する
- [ ] broader improvements を文書化する

### Step 5: REFACTOR
- [ ] ドキュメント索引を簡潔化する
- [ ] 重複説明を統合する
- [ ] スクリプト入出力の責務を整理する
- [ ] テストの重複を減らし保守しやすくする

### Step 6: 検証・記録
- [ ] 全テストを実行する
- [ ] 手動で主要リンク/主要パスの到達性を確認する
- [ ] セッションログを残す
- [ ] 実施内容と今後課題を記録する

---

## 7. RED / GREEN / REFACTOR 方針

### RED
以下の失敗テストを先に作る。
- `docs/research/archive` を参照していたら失敗
- `docs/research/archive` を参照していたら失敗
- `latest` 配下に複数候補が存在していたら失敗
- `docs/research/results/` 直下参照が残っていたら失敗
- `strategy-presets.json` が15件超なら失敗
- `bad-strategy` 台帳に除外戦略が記録されていなければ失敗
- 自動アーカイブが最新を誤退避するケースを再現して失敗

### GREEN
- 最小限の構造変更・パス修正・スクリプト追加でテスト通過を目指す
- まず deterministic なルールで archive 化を通す
- Copilot CLI 自動要約が難しければ、まず deterministic summary 生成を成立させる

### REFACTOR
- 文書索引を整理
- archive 化ルールを共通化
- スクリプト呼び出しポイントを整理
- テストデータ/fixture を再利用化

---

## 8. テスト戦略

### ユニットテスト
対象候補:
- archive 判定ロジック
- latest 選定ロジック
- strategy ranking/selection 補助関数
- summary 集計関数

### 統合テスト
対象候補:
- `run-long-campaign.mjs` と成果物配置整合
- `generate-rich-report.mjs` と summary/出力先整合
- `night_batch.py` と archive 自動化連携
- Windows self-hosted cmd からの参照整合

### E2E/運用寄り検証
対象候補:
- latest run 後に archive 整理が正しく走ること
- README / ドキュメント入口から最新成果物へ辿れること
- main 最新バックテスト結果の要約が生成・更新されること

### カバレッジ
- 変更箇所で **80%以上** を目標
- とくに archive 判定・preset 選定・summary 集計は重点確認

---

## 9. バリデーションコマンド

実装後の検証候補:

```bash
npm test
npm run test:e2e
npm run test:all
```

必要に応じて、既存コマンドに合わせて以下も実施候補:
```bash
git --no-pager grep -n "docs/research/archive"
git --no-pager grep -n "docs/research/archive"
git --no-pager grep -n "docs/research/results/"
git --no-pager grep -n "docs/command.md"
git --no-pager grep -n "docs/explain-forhuman.md"
```

追加する場合の運用コマンド候補:
```bash
npm run archive:latest
npm run summarize:backtest-latest
```

※ 実際に追加するかは既存運用（`package.json` / `justfile`）を見て決める

---

## 10. リスクと対策

### リスク1: 「最新」の定義が曖昧
- **対策**: タイムスタンプ、run metadata、参照実績の優先順位を固定し文書化する

### リスク2: `docs/research/results/` 統合でスクリプトが壊れる
- **対策**: パスを定数化し、関連テストを先に RED で作る

### リスク3: active plan を誤って completed 扱いする
- **対策**: 計画本文・関連成果物・最終更新日時で判定し、判断根拠をログに残す

### リスク4: 強い15戦略の選定が恣意的になる
- **対策**: 最新世代 + 前世代のランキング指標を明文化し、除外理由も記録する

### リスク5: Copilot CLI による完全自動要約が不安定
- **対策**: deterministic summary を本線、Copilot CLI は補助/後段にする

### リスク6: `docs/research/archive` 削除後に見落とし参照が残る
- **対策**: 全文検索とリンクチェック相当の検証を実施する

---

## 11. 最新バックテスト要約の作成方針

要約文書には最低限以下を含める。

- 対象 run の特定情報
- strongest strategy
- 上位15戦略の比較表
- 直近世代と前世代の共通勝者/失速戦略
- 学び
  - 市場/ユニバース傾向
  - campaign 設計上の示唆
  - 過学習の兆候
- 次の改善
  - 追加で試すべき戦略群
  - 除外すべき戦略群
  - campaign/universe 見直し
  - summary 自動化

### 自動化評価
#### 第一候補: Copilot CLI
- 長所: 自然言語要約、改善提案生成
- 短所: 完全決定論ではない、再現性に課題
- 使いどころ: 最終 commentary / insight 補助

#### 第二候補: deterministic metrics/rankings
- 長所: 再現可能、テスト可能
- 短所: 洞察の質は限定的
- 本計画の本線はこちら
- 具体:
  - 指標抽出
  - 重み付きスコア
  - top/bottom 自動列挙
  - テンプレートへ埋め込み

---

## 12. broader project improvements の観点

### backtest workflow
- 結果出力先の一元化
- latest/archive 自動整理
- summary 自動生成
- run metadata の標準化

### strategy thinking
- 単回勝者より世代横断の安定性重視
- 除外理由の明文化
- 再挑戦条件の定義
- universe との相性を評価軸に追加

### project structure
- docs 入口の単純化
- research と results の二重構造解消
- 設定資産の latest/archive 統一
- session logs の保守性向上

### documentation
- README を実態に合わせる
- `old` 廃止と `archive` 統一
- 使われない文書群の整理
- 最新成果物への導線を最短化

---

## 13. 実装順序（推奨）

1. 棚卸し・参照洗い出し  
2. RED テスト追加  
3. ドキュメント/ディレクトリ再編  
4. スクリプト/コードの参照更新  
5. strategy preset 整理  
6. latest 自動アーカイブ実装  
7. summary 作成/自動化方針整理  
8. REFACTOR  
9. 全テスト・ログ記録・最終確認  

---

## 14. 完了条件

以下を満たしたら完了とする。

- `docs/research/archive` 参照が残っていない
- `docs/research/archive` が未使用なら削除済みで、参照も残っていない
- `docs/research/results/` が `docs/research/` に統合されている
- `docs/command.md` / `docs/explain-forhuman.md` が `docs/` 配下へ移動済み
- `docs/research`, `session-logs`, `campaigns`, `universes` が `latest/archive` 基準で整理されている
- `strategy-presets.json` が強い15件のみになっている
- 除外戦略が `docs/bad-strategy` へ根拠付きで記録されている
- latest main バックテスト要約が作成されている
- 自動アーカイブの仕組みとテストがある
- `npm test`, `npm run test:e2e`, `npm run test:all` が通る
- セッションログが残っている

---

## 15. 要確認

1. `docs/exec-plans/active` の4件は、**全件 completed 扱いで移動してよいか**。それとも「未完了だが active 放置」案件が含まれるか  
2. strongest 15 戦略の判定指標は、既存 rich report の指標を優先利用してよいか  
3. `docs/bad-strategy` の退避形式は **Markdown 台帳** と **JSON 台帳** のどちらを主にするか  
4. `docs/research/results/` 統合後の物理配置は、`docs/research/results/` とするか、`docs/research/archive|latest` に直接吸収するか  
5. post-backtest summary 自動化は、まず deterministic 版を本実装、Copilot CLI 補助を次段階扱いでよいか  

---

承認後は、この計画を基準に IMPLEMENT フェーズへ進めます。
