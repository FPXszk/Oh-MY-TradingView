# Night Batch Self Hosted 失敗修正計画

作成日時: 2026-04-21 11:03 JST

## 目的

最新の `Night Batch Self Hosted` workflow 実行 `24699948598` の失敗原因を特定し、self-hosted Windows runner 上で foreground night batch が継続実行できるようにする。

## 調査結果

- 失敗 workflow: `Night Batch Self Hosted`
- 失敗 run id: `24699948598`
- 失敗 step: `Run smoke gate and foreground production`
- 失敗時刻: 2026-04-21 01:54:41Z
- 直接原因:
  `python/night_batch.py` の `preflight_visible_session()` が `urllib.request.urlopen()` 実行中に `ConnectionResetError: [Errno 104] Connection reset by peer` を受け、その例外を捕捉していないため step 全体が異常終了している。
- 現状の問題:
  `preflight_visible_session()` は `urllib.error.URLError` / `TimeoutError` / `ValueError` は `RuntimeError` に正規化して recoverable path に流すが、低レベル socket 例外の一部が漏れている。
- 期待動作:
  CDP `/json/list` が一時的に reset された場合でも、preflight を recoverable failure として扱い、既存の recovery / retry 経路に乗せる。

## 変更対象ファイル

- 作成: `docs/exec-plans/completed/night-batch-workflow-failure-fix_20260421_1103.md`
- 変更予定: `tests/night-batch.test.js`
- 変更予定: `python/night_batch.py`

## 影響範囲

- Night batch の preflight / readiness 判定
- self-hosted workflow の TradingView CDP 接続回復性
- `python/night_batch.py smoke-prod` の統合テスト

## 実装ステップ

- [ ] RED: `tests/night-batch.test.js` に `ConnectionResetError` 相当の接続リセットを再現する失敗テストを追加する
- [ ] GREEN: `python/night_batch.py` の preflight で接続リセット系例外を recoverable failure として `RuntimeError` に正規化する
- [ ] GREEN: 必要なら readiness / recovery 判定の文言とログを最小限整える
- [ ] REFACTOR: 例外正規化を過不足なく整理し、既存の成功系・失敗系挙動を崩していないか確認する
- [ ] 検証: 対象テストを実行して green を確認する
- [ ] 検証: 可能なら関連テスト範囲を追加実行し、影響範囲を確認する
- [ ] REVIEW: ロジック破綻・過剰修正・runner 依存の取り込みすぎがないか見直す
- [ ] COMMIT/PUSH: 承認後の実装完了時に Conventional Commits 形式で `main` へ反映する

## リスクと注意点

- 単に例外を握り潰すだけだと恒久障害と一時障害の区別が曖昧になるため、既存 recovery 経路へ接続する最小修正に留める
- workflow 側の runner 環境異常が別に残っている可能性はあるため、修正後も preflight failure 自体は summary に残る設計を維持する
- 既存ワークツリーに未追跡ファイル `docs/exec-plans/completed/dispatch-night-batch-public-top10-us40_20260421_1033.md` があるため、今回の作業では触れない
