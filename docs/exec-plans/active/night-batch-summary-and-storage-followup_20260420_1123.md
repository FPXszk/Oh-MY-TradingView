# Night batch summary / storage follow-up exec-plan

## 目的

以下を整理し、必要な修正とドキュメント反映を行う。

- 末コミット `700ad1d` の変更内容を再確認し、未プッシュ変更があれば安全性を確認した上で push する
- `artifacts/night-batch/` に結果がどう保存されるか、なぜ `round5` 以降が平場の `roundN/` ディレクトリとして見えにくいのかを説明可能にする
- 成功 run `24606641443` の結果を `docs/research/current/` に前回同粒度で反映する
- その summary 反映が workflow で自動化されているか、どこが自動化されていないかを確認する

## 現状整理

- `HEAD` は `700ad1d fix: add TradingView crash auto recovery` で、`origin/main` まで push 済み
- ただし作業ツリーには `artifacts/` や `logs/`、旧 `plans/exec/active/` 側の未追跡/削除が残っている
- `python/night_batch.py` は `--round-mode advance-next-round` で `artifacts/night-batch/roundN/` を作るが、workflow 完了時に `archive-rounds` が走る
- `archive-rounds` は summary JSON が存在する round を `artifacts/night-batch/archive/roundN/` へ移動する
- `docs/research/current/main-backtest-current-summary.md` は `python/night_batch.py` の latest summary writer で再生成される実装があるが、workflow はその変更を Git へ commit/push しない
- 成功 run `24606641443` は `workflow_dispatch / success` で、`strongest-overlay-us-50x9.json` / `strongest-overlay-jp-50x9.json` の smoke / full 完走ログが確認できている

## 変更・確認対象ファイル

### 調査対象

- `python/night_batch.py`
- `.github/workflows/night-batch-self-hosted.yml`
- `scripts/windows/github-actions/find-night-batch-outputs.ps1`
- `scripts/windows/run-night-batch-self-hosted.cmd`
- `README.md`
- `docs/research/current/README.md`

### 更新候補

- `docs/research/current/main-backtest-current-summary.md`
- 必要なら `docs/research/current/README.md`
- 必要なら `docs/research/current/manifest.json`
- `docs/exec-plans/active/night-batch-summary-and-storage-followup_20260420_1123.md`

## スコープ

### 含む

- 末コミット差分の再確認
- `artifacts/night-batch` の保存・archive 挙動の説明
- run `24606641443` の current summary 反映
- summary 自動化の現状確認
- 必要最小限の doc 更新と push

### 含まない

- TradingView recovery ロジックの追加改修
- workflow の大規模な再設計
- 無関係な `artifacts/` / `logs/` 生成物の一括整理

## 実装方針

1. 末コミットと現在の dirty tree を切り分け、今回扱う変更と無関係な生成物を区別する
2. `artifacts/night-batch` の平場 round と `archive/roundN` の関係を、実装 (`archive-rounds`) と現物の両面から確認する
3. 成功 run `24606641443` のログ/summary 情報を元に、`docs/research/current/main-backtest-current-summary.md` を前回と同粒度で更新する
4. workflow が `current` summary を「生成はするが Git へ反映しない」のか、あるいは探索ステップが取り逃しているのかを確認し、必要なら最小修正を入れる
5. 変更後に関連確認を行い、問題なければ commit/push する

## TDD / 検証方針

### RED

- 自動化ギャップにコード修正が必要な場合のみ、関連テストを先に追加する
- 想定候補:
  - `tests/night-batch.test.js`
  - `tests/windows-run-night-batch-self-hosted.test.js`

### GREEN

- 最小差分で doc 更新、必要なら workflow / helper の補修を行う

### REFACTOR

- 表現や出力パス説明の重複が強い箇所だけ整理する

## 検証コマンド

- `node --test tests/night-batch.test.js tests/windows-run-night-batch-self-hosted.test.js`
- 必要なら `npm test` の関連部分のみ再確認
- `git --no-pager status -sb`

## リスク / 注意点

- 既存の `artifacts/` や `logs/` はユーザー生成物の可能性があるため、勝手に削除しない
- 成功 run の成果物は GitHub artifact に残っていないため、summary の根拠は run log と repo 内 artifact を突き合わせて確認する必要がある
- `docs/research/current/` は keep-set 管理なので、新規ファイル追加時は `manifest.json` と archive ルールも確認が必要
- 既存 active plan (`copilot-cli-server-exit-diagnosis`, `night-batch-readiness-stabilization`) とは直接競合しないが、`python/night_batch.py` と workflow 周辺は近接しているため差分は最小に保つ

## 実装ステップ

- [ ] 末コミット `700ad1d` と現在の dirty tree をレビューし、今回対象の変更を確定する
- [ ] `artifacts/night-batch` / `archive-rounds` / workflow を調査し、round5 以降の見え方を説明できる根拠を固める
- [ ] 成功 run `24606641443` の結果を `docs/research/current/main-backtest-current-summary.md` に反映する
- [ ] summary 反映の自動化状況を確認し、必要なら最小修正を入れる
- [ ] 関連確認後、plan を completed へ移して commit/push する

## 完了条件

- 末コミット変更の安全性と push 状況を説明できる
- `artifacts/night-batch` の保存/archiving 挙動を説明できる
- `docs/research/current/` に run `24606641443` の summary が前回同粒度で反映される
- 自動化されている部分 / されていない部分を明確に説明できる
