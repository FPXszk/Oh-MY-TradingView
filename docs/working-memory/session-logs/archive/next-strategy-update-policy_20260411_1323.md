# next-strategy-update-policy_20260411_1323

## Summary

- self-hosted runner / detached night-batch が active な間は **live checkout を編集しない** 運用ポリシーを `README.md` と `docs/command.md` に明文化した。
- workflow 終了 ≠ production 完了であること、`config/backtest/strategy-presets.json` 等の mid-run 変更リスクを文書化した。
- **runner 使用中チェック** と **detached production 完了チェック** を別手順として整理し、workflow job 実行中でも detached state file が未生成の時間帯がある点を反映した。
- 次 strategy は別 worktree / clone / branch で準備し、detached 完了後に live checkout 更新 → `advance-next-round` で明示起動する手順を整理した。
- 既存 docs assertion harness を拡張し、ポリシー記載を自動検証できるようにした。

## Files

- Modified: `README.md`（次 strategy 更新ポリシーセクション追加）
- Modified: `docs/command.md`（次 strategy 更新手順セクション追加）
- Modified: `tests/windows-run-night-batch-self-hosted.test.js`（docs assertion 6 件追加）
- Added: `docs/working-memory/session-logs/next-strategy-update-policy_20260411_1323.md`
- Moved: `docs/exec-plans/active/document-next-strategy-update-policy_20260411_1323.md` → `docs/exec-plans/completed/`

## Validation

- `node --test tests/windows-run-night-batch-self-hosted.test.js` — 23/23 pass

## Notes

- README は概要とポリシー宣言、docs/command.md は具体手順と禁止対象テーブルという責務分担にした。
- README / command の両方で `docs/research/results/night-batch/roundN/bundle-detached-reuse-state.json` を current round の確認先として扱うよう補正した。
- `docs/DOCUMENTATION_SYSTEM.md` は既存導線で十分に辿れるため更新不要と判断した。
