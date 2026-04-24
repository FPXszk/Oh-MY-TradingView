# Backtest Artifacts / Current Research 整理計画

## 目的

以下を一体で整備する。

1. run64 (`Night Batch Self Hosted` run 64) の結果を `docs/research/current/` に残す  
2. workflow 実行結果 / 手動 backtest 結果を **必ず `artifacts/` に集約**する  
3. `artifacts/` に保存された詳細結果から、`docs/research/current/` に **自動でランキング表だけを出す**導線を作る  
4. `docs/` / `artifacts/` の棚卸しを行い、未使用・重複・役割不明の候補を一覧化する
5. Codex / pilot CLI 起動時の診断用ラッパーを撤去し、通常起動へ戻す

## 背景認識

- `scripts/backtest/run-long-campaign.mjs` は `artifacts/campaigns/<campaign>/<phase>/recovered-results.json` と `recovered-summary.json` を自動生成している
- しかし `Night Batch Self Hosted` workflow は `artifacts/night-batch/roundXX` だけを upload artifact 対象にしており、campaign 結果本体が GitHub artifact に含まれない
- `docs/research/current/` には current summary と run 個別レポートが混在していて、機械生成の「現行比較表」の置き場が曖昧
- `artifacts/` 配下も `campaigns` / `night-batch` / `devinit` / `runtime-verification` に分かれ、運用上の主従関係が分かりにくい
- `devinit.sh` と `scripts/dev/run-codex-pane.sh` / `scripts/dev/run-copilot-pane.sh` は、異常終了調査のための pseudo-TTY / evidence capture / respawn wrapper を前提にしており、現在の通常運用には不要

## スコープ

### 実装対象

- backtest / night-batch 結果の保存導線
- `docs/research/current/` の自動生成ランキング表
- run64 の current 反映
- docs / artifacts の棚卸しレポート
- devinit / Codex / pilot CLI の起動ラッパー撤去

### 今回はやらないこと

- 不要ディレクトリや不要ドキュメントの削除
- 既存研究レポートの全面リライト
- TradingView 実行ロジック自体の大幅改修
- Codex / pilot CLI の機能追加や別の監視機構追加

## 変更・作成候補ファイル

- `.github/workflows/night-batch-self-hosted.yml`
- `scripts/windows/github-actions/find-night-batch-outputs.ps1`
- `python/night_batch.py`
- `scripts/backtest/` 配下の集計・current 生成系スクリプト
- `docs/research/current/README.md`
- `docs/research/current/` 配下の自動生成結果ファイル
- `docs/research/current/` に置く run64 結果ファイル
- `docs/reports/` 既存 run64 レポート
- `devinit.sh`
- `scripts/dev/run-codex-pane.sh`
- `scripts/dev/run-copilot-pane.sh`
- `scripts/dev/capture-codex-pane-evidence.sh`
- `scripts/dev/capture-copilot-pane-evidence.sh`
- `justfile`
- `README.md`
- `artifacts/README.md`
- `tests/devinit.test.js`
- `tests/windows-run-night-batch-self-hosted.test.js`
- `tests/night-batch.test.js`
- current 生成や棚卸しに関する追加テスト
- 棚卸し結果を置くドキュメント

## 想定する着地点

### Artifacts 側

- すべての workflow / 手動 backtest 結果が `artifacts/` 内に残る
- `artifacts/` を見れば、少なくとも以下が取れる状態にする
  - raw/recovered 結果
  - summary
  - ranking 用の詳細集計
  - run 単位の紐づけ情報

### Docs Current 側

- `docs/research/current/` は「最新比較表」と「現行参照」の場所に寄せる
- 人手要約ではなく、詳細 metrics を元にした **表中心のファイル**を自動生成する
- 10 戦略を回したら 10 行の表が出る、という要件を満たす

### 棚卸し側

- `docs/` / `artifacts/` の用途一覧
- 自動更新されているもの / 手動管理のもの
- 使われていない可能性が高いもの
- 削除候補だが今回は削除しないもの

### Dev 起動側

- `just dev` / `devinit.sh` が Codex / pilot CLI を余計な wrapper なしで起動する
- `logs/devinit` / `artifacts/devinit` 依存の説明とテストを通常起動前提へ戻す
- 調査専用の wrapper が active path から外れる

## テスト戦略

RED -> GREEN -> REFACTOR で進める。

- RED:
  - night-batch artifact に campaign 結果が含まれることを要求するテストを追加
  - current 自動生成表が `artifacts` の recovered results から作られることを要求するテストを追加
  - 棚卸し出力の契約をテスト化
  - devinit が wrapper ではなく通常起動を行うことを要求するテストに更新
- GREEN:
  - 最小修正で artifact 集約と current 表生成を実装
  - Codex / pilot CLI の wrapper を active path から外す
- REFACTOR:
  - summary / ranking / current 生成の責務を整理し、パス規約を揃える
  - devinit / docs / artifacts の説明を現在運用に合わせて揃える

## 検証コマンド候補

- `node --test tests/windows-run-night-batch-self-hosted.test.js`
- `node --test tests/night-batch.test.js`
- `node --test tests/devinit.test.js`
- current 生成や backtest 生成周りの関連テスト
- 必要に応じて run64 既存結果を使った集計確認コマンド

## リスク

- `docs/research/current/` の既存ファイル群と新しい自動生成物の役割が衝突する可能性
- night-batch artifact の upload 対象を広げると容量・保持量に影響する可能性
- `artifacts/` を真の集約先にする設計変更が、既存の `docs/research/current/main-backtest-current-summary.md` 前提と噛み合わない可能性
- `devinit` 起動フローを簡素化すると、既存テストや README の wrapper 前提説明が広く壊れる可能性

## 実装ステップ

- [ ] run64 の result source を確定し、`artifacts/` を基準に current へ出す最小仕様を定義する
- [ ] RED: campaign 詳細結果が workflow artifact に含まれることを要求するテストを追加する
- [ ] RED: `artifacts/` の recovered results から current 比較表を自動生成するテストを追加する
- [ ] RED: devinit / Codex / pilot 起動が wrapper 非依存になることを要求するテストへ更新する
- [ ] GREEN: night-batch / 手動 backtest の結果保存導線を `artifacts/` 集約に揃える
- [ ] GREEN: `docs/research/current/` に run64 を含む ranking table を自動生成する
- [ ] GREEN: Codex / pilot CLI の診断用 wrapper を外し、通常起動へ戻す
- [ ] REFACTOR: current 配下のファイル役割を整理し README / manifest を更新する
- [ ] docs / artifacts の棚卸し結果をドキュメント化する
- [ ] テストと実データ確認を実行する

## 承認後の進め方

- 既存 active plan の `fix-night-batch-campaign-artifact-performance-comparison_20260424_1620.md` は、本計画に統合する前提で扱う
- 実装完了後、計画は `docs/exec-plans/completed/` に移動する
