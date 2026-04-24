# リポジトリ構造整合・アーカイブルール化 実装計画

## 概要

現在のリポジトリ構造を正として、ドキュメント・テスト・ソースコードを整合させる。
加えてバックテスト結果のアーカイブ仕組みを確認・構築する。

## Task 1: ドキュメント修正とテスト整合

### 変更ファイル一覧

| ファイル | 変更内容 |
|---|---|
| `src/core/campaign.js` | RETIRED_PRESETS_PATH を `docs/research/archive/retired/retired-strategy-presets.json` に修正 |
| `src/core/backtest.js` | 同上 |
| `tests/repo-layout.test.js` | パス定数全面更新・strategy数更新・存在しないチェック削除 |
| `tests/strategy-catalog.test.js` | live count 11、retired count 2に更新 |
| `tests/campaign.test.js` | current/ → archive/ パス修正、存在しないキャンペーンの削除 |
| `tests/preset-validation.test.js` | retired path修正・strategy数11・raw_source builder許容 |
| `tests/backtest.test.js` | round7-9を retired から load するよう修正、round10-11は削除 |
| `docs/research/manifest.json` | keep リストを実際に存在するファイルのみに更新 |
| `docs/DOCUMENTATION_SYSTEM.md` | 現在のリポジトリ構造に合わせて全面書き直し |
| `README.md` | 壊れたリンク修正 |

### 実装ステップ

- [x] exec-plan作成
- [ ] src/core/campaign.js RETIRED_PRESETS_PATH 修正
- [ ] src/core/backtest.js RETIRED_PRESETS_PATH 修正
- [ ] tests/repo-layout.test.js 全面更新
- [ ] tests/strategy-catalog.test.js 更新
- [ ] tests/campaign.test.js 更新
- [ ] tests/preset-validation.test.js 更新
- [ ] tests/backtest.test.js 更新
- [ ] docs/research/manifest.json 更新
- [ ] docs/DOCUMENTATION_SYSTEM.md 書き直し
- [ ] README.md リンク修正
- [ ] Task 1 コミット&プッシュ

## Task 2: アーカイブ配置とルール化

### 確認・作成対象

- `artifacts/campaigns` がバックテスト出力先として正しく設定されているか確認
- `scripts/docs/archive-stale-latest.mjs` のパス修正
- 対象パスのアーカイブ仕組みが動作していることを確認

### 実装ステップ

- [ ] artifacts/campaigns への保存設定確認
- [ ] archive-stale-latest.mjs パス修正
- [ ] archive対象: universes, campaigns, artifacts/campaigns, reports, research, sessions
- [ ] Task 2 コミット&プッシュ

## 重要メモ

### 現在の正しい構造（旧→新）

| 旧パス（テストが期待） | 実際のパス |
|---|---|
| `docs/research/strategy/retired/` | `docs/research/archive/retired/` |
| `docs/research/current/manifest.json` | `docs/research/manifest.json` |
| `references/README.md` | `docs/references/`（READMEなし） |
| `plans/exec/active/` | `docs/exec-plans/active/` |
| `logs/sessions/` | `docs/sessions/` |
| `config/backtest/campaigns/current/` | 存在しない（ルートに直置き） |
| `config/backtest/universes/current/` | 存在しない（ルートに直置き） |

### 戦略数
- live: 11（旧テストは40を期待）
- retired: 128（旧テストはcatalog合計162を期待）
- catalog total: 13（11 live + 2 retired）
