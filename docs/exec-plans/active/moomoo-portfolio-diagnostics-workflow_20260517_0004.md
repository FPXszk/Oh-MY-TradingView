# moomoo-portfolio-diagnostics-workflow

作成日時: 2026-05-17 00:04 JST

## 目的

Moomoo read-only ポートフォリオ診断を GitHub Actions から手動実行できる workflow にする。定期実行は追加しない。発注・注文変更・取消・取引ロック解除は引き続き禁止し、既存の未コミット計画差分も通常の変更として取り込む。

## 前提

- workflow は `workflow_dispatch` のみで起動する。
- Moomoo OpenD は read-only 診断に必要な接続先を workflow input / env で指定できる。
- 診断は既存 `getMoomooPortfolioDiagnostics()` を使い、注文系 SDK メソッドは追加しない。
- 既存 dirty 差分 `docs/exec-plans/completed/moomoo-phase2-screening-validation_20260514_1107.md` は、完了済みタスクのチェックを `[x]` にする差分として一緒にコミットする。

## 変更・削除・作成するファイル

- 作成: `.github/workflows/moomoo-portfolio-diagnostics.yml`
  - 分かりやすい workflow 名を付ける。
  - `workflow_dispatch` のみ定義する。
  - self-hosted Windows runner で Node 20 を使い、診断スクリプトを実行する。
  - Markdown / JSON レポートを artifact としてアップロードする。
- 作成: `scripts/moomoo/run-portfolio-diagnostics.mjs`
  - 既存 core の `getMoomooPortfolioDiagnostics()` を呼ぶ。
  - `docs/reports/moomoo/portfolio-diagnostics.md` と `.json` を生成する。
  - read-only / no order operation をレポートに明記する。
- 変更: `tests/moomoo.test.js`
  - レポート生成の純粋関数をテストする。
- 変更: `docs/exec-plans/completed/moomoo-phase2-screening-validation_20260514_1107.md`
  - 既存未コミットのチェックボックス完了差分を取り込む。

## 影響範囲

- 新しい GitHub Actions workflow が手動で実行可能になる。
- 定期実行は発生しない。
- 生成物は `docs/reports/moomoo/` 配下に出力され、workflow artifact にも保存される。
- Moomoo 口座情報を扱うため、レポートは artifact / repo 出力の扱いに注意が必要。

## 実装ステップ

- [ ] 計画を active に作成し、計画のみ commit / push する。
- [ ] ポートフォリオ診断レポート生成スクリプトを追加する。
- [ ] 手動実行専用 workflow を追加する。
- [ ] レポート生成ロジックの unit test を追加する。
- [ ] `node --test tests/moomoo.test.js` と `git diff --check` を実行する。
- [ ] 計画を completed に移動し、全変更を commit / push する。

## 検証

- `node --test tests/moomoo.test.js`
- `git diff --check`
- 可能であればローカルで mock / 実 OpenD 環境のスクリプト実行確認を行う。

## リスク

- GitHub Actions 側の Python / `moomoo-api` 環境が未整備だと workflow 実行時に失敗する可能性がある。
- 実口座情報を含む可能性があるため、レポート内容は集計中心にし、口座カード番号などの秘匿情報は既存 adapter と同じく出力しない。
