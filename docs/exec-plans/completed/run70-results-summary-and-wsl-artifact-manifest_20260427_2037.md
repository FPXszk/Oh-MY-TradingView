# Run70結果まとめとWSL artifact manifest化 実装計画

## 概要

- 対象 run: `Night Batch Self Hosted` run 70 (`run_id: 24976536910`, `run_attempt: 1`)
- 対象 campaign: `strongest-plus-recovery-reversal-us40-10pack`
- 目的:
  1. GitHub Actions artifact を正本として run70 の結果を取得し、`docs/research/TEMPLATE.md` に沿った研究メモを作成する
  2. Windows 側ログに出る絶対パスを毎回追わなくて済むよう、WSL 側 round artifact に主要成果物 manifest を同梱する
- 推奨実装方針:
  - 研究メモは `docs/research/night-batch-self-hosted-run70_20260427.md` として新規作成する
  - artifact 改善は **round artifact 配下に campaign manifest (`*.json` / `*.md`) を生成し、そのまま既存の upload-artifact 対象に載せる** 方針を採る
  - run70 の元データ取得は GitHub Actions artifact `night-batch-24976536910-1`（artifact id: `6654028014`）を使う

## 変更対象ファイル

| ファイル | 種別 | 変更内容 | 影響範囲 |
|---|---|---|---|
| `docs/exec-plans/active/run70-results-summary-and-wsl-artifact-manifest_20260427_2037.md` | 作成 | 本計画 | PLAN ステップのみ |
| `docs/research/night-batch-self-hosted-run70_20260427.md` | 作成 | `TEMPLATE.md` 準拠の run70 結果まとめ | 研究ドキュメント |
| `python/night_batch.py` | 更新 | round artifact に campaign manifest (`-campaign-artifacts.json` / `.md`) を生成 | night batch 出力 |
| `scripts/windows/github-actions/find-night-batch-outputs.ps1` | 更新 | campaign manifest を workflow 出力として検出 | GitHub Actions 後段 |
| `scripts/windows/github-actions/append-night-batch-workflow-summary.ps1` | 更新 | campaign manifest のパスを `GITHUB_STEP_SUMMARY` に追記 | GitHub Actions summary |
| `tests/night-batch.test.js` | 更新 | manifest 生成の回帰テスト追加/更新 | Python summary 出力の検証 |
| `tests/windows-run-night-batch-self-hosted.test.js` | 更新 | workflow / PowerShell script が manifest を扱うことを検証 | workflow 回帰 |
| `README.md` | 更新 | night batch artifact の見方に manifest を追記 | 運用ドキュメント |

## スコープ

### 対応すること

- run70 の artifact から ranking / recovered summary / recovered results を取得し、`TEMPLATE.md` の必須項目を埋める
- Top 3 / 除外候補 / 銘柄集中度 / 次回確認事項まで今回の数値で記述する
- WSL 側 artifact に「どの campaign ファイルを見ればよいか」が分かる manifest を追加する
- GitHub Actions summary から manifest の保存先を辿れるようにする

### 対応しないこと

- バックテスト戦略や campaign 設定そのものの変更
- run70 以外の過去 run の一括再文書化
- artifact retention / 圧縮形式 / GitHub Actions の保持期間変更
- 主要結果ファイル本体の別名コピー大量追加（manifest での案内を優先）

## manifest 最小仕様

### JSON

- top-level 必須キー:
  - `run_id`
  - `run_number`
  - `run_attempt`
  - `workflow_name`
  - `campaigns`
- `campaigns[]` の必須キー:
  - `campaign`
  - `phase`
  - `checkpoint_path`
  - `final_results_path`
  - `recovered_results_path`
  - `recovered_summary_path`
  - `strategy_ranking_json_path`
  - `strategy_ranking_md_path`
  - `scoreboards_path`
- path は **repo 相対パス** で保存し、Windows 絶対パスは保存しない

### Markdown

- run 情報のヘッダー
- campaign ごとの主要成果物一覧テーブル
- `GitHub artifact を開いたらまずこの manifest を見ればよい` ことが分かる短い説明

## research メモ完成条件

- 参照テンプレート: `docs/research/TEMPLATE.md`
- 以下をすべて満たしたら完了:
  - テンプレートの全セクションが埋まっている
  - `例:` の文言が残っていない
  - Top 3 / 除外候補 / 銘柄集中チェックが数値付きで書かれている
  - `US` 専用 run であることを明記し、`JP` / `US+JP` 行は「対象なし」で埋める
  - 元データの出典（artifact / ranking JSON / recovered summary JSON）が文書内で追える

## 実装ステップ

- [x] exec-plan 作成
- [ ] `gh run download 24976536910 --name night-batch-24976536910-1 --dir /home/fpxszk/.copilot/session-state/fabaa456-0fbd-4d79-a379-7be6f3b03488/files/run70-artifact` で run70 artifact を取得し、`strategy-ranking.json` / `recovered-results.json` / `recovered-summary.json` を抽出する
- [ ] `docs/research/night-batch-self-hosted-run70_20260427.md` を作成し、`TEMPLATE.md` のヘッダー / 市場別平均 / 全戦略一覧 / Top 3 / 除外候補 / 銘柄集中チェック / 改善点を埋める
- [ ] `python/night_batch.py` に round artifact 用 manifest 出力を追加し、主要成果物の repo 相対パスと簡易サマリを JSON / Markdown の両方で保存する
- [ ] `find-night-batch-outputs.ps1` と `append-night-batch-workflow-summary.ps1` を manifest 対応に更新し、workflow summary からも参照しやすくする
- [ ] `tests/night-batch.test.js` と `tests/windows-run-night-batch-self-hosted.test.js` を更新して RED → GREEN にする
- [ ] `README.md` の night batch outputs 説明へ manifest 導線を1か所だけ追記する（既存 active plan のリンク修正が先に入っていても、その結果に対して追記だけ行う）
- [ ] 変更後に既存テストコマンドで回帰確認する

## テスト戦略

- RED:
  - `tests/night-batch.test.js` に manifest 出力の存在と内容を検証する期待値を追加する
  - `tests/windows-run-night-batch-self-hosted.test.js` に `campaign_manifest` 出力 / summary 表示を検証する期待値を追加する
- GREEN:
  - manifest 生成と summary 反映を最小変更で実装する
  - run70 研究メモを template の必須項目が欠けない状態まで埋める
- REFACTOR:
  - path 抽出が重複する場合のみ既存ロジックを共通化し、不要な抽象化は増やさない

## 検証方法

- `npm test`
- `research メモ完成条件` のチェックリストに沿った手動確認

## リスク / 確認ポイント

- run70 の raw artifact は作業ツリーに存在しないため、GitHub Actions artifact 取得に依存する
- `TEMPLATE.md` は市場別平均を要求するが、run70 は `US` 専用 campaign のため、`JP` / `US+JP` は「対象なし」の扱いを明示する必要がある
- 既存 worktree には本タスク外の未整理変更があるため、PLAN コミットでは本計画ファイルだけを明示的に stage する
- 現在の active plan `repo-structure-align-and-archive-rules_20260424_2015.md` とは別件だが `README.md` が衝突候補なので、README 変更は night batch outputs セクションへの最小追記に限定する。実装開始時に `README.md` に未コミット競合変更があれば、その場で停止して確認する
- manifest 追加は upload step 自体を増やさず round artifact 内の新規ファイル追加で完結させる。副作用が出た場合も新規ファイル生成と summary 表示差分だけを戻せば切り戻せる
