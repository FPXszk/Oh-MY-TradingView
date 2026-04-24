# アーカイブパス修正と運用ルール整備

## 背景

`scripts/docs/archive-stale-latest.mjs` が `logs/sessions/` を参照しているが、
実際のセッションログは `docs/sessions/` に移行済みで自動退避が機能していない。

## 修正ファイル

- [ ] `scripts/docs/archive-stale-latest.mjs` — sessionLogsDir パスを `docs/sessions/` に修正
- [ ] `tests/archive-latest-policy.test.js` — パスを `docs/sessions/` に修正（TDD）
- [ ] `docs/DOCUMENTATION_SYSTEM.md` — アーカイブルール追記
- [ ] `README.md` — 必要な記載を追記

## 実装ステップ

- [ ] archive-latest-policy テストのパスを docs/sessions/ に修正（RED → テスト失敗を確認）
- [ ] archive-stale-latest.mjs のパスを docs/sessions/ に修正（GREEN → テスト通過）
- [ ] DOCUMENTATION_SYSTEM.md にアーカイブルールを追記
- [ ] README.md に必要な記載を追記
