# Exec-plan: skills-audit-and-new-skill_20260502_1500

## 概要

目的: リポジトリ専用の2スキルを現状に合わせて修正し、バックテスト結果まとめ用の新スキルを追加する。

### 対象

1. **tradingview-operator-playbook** — MCP tool 名・コマンド名のズレを修正
2. **tradingview-research-capture** — `docs/research/latest/` → `docs/research/` パス修正（テストで禁止されているパス）
3. **backtest-results-capture** (新規) — Night Batch 結果まとめワークフローをスキル化

---

## 変更ファイル

| ファイル | 操作 |
|---|---|
| `.agents/skills/tradingview-operator-playbook/SKILL.md` | 修正 |
| `.agents/skills/tradingview-research-capture/SKILL.md` | 修正 |
| `.agents/skills/backtest-results-capture/SKILL.md` | 新規作成 |
| `docs/exec-plans/active/skills-audit-and-new-skill_20260502_1500.md` | 本ファイル（作成） |

---

## 修正内容詳細

### 1. tradingview-operator-playbook

**問題点:**
- Decision tree に `pine_compile` と書いているが正しくは `pine_smart_compile`（tv pine compile コマンドが呼ぶのは smart_compile）
- `tv backtest / tv_backtest_*` が曖昧 → `tv backtest preset / tv_backtest_preset` と `tv backtest sma-crossover / tv_backtest_nvda_ma_5_20` に分離
- Tool 対応表が不完全（market_snapshot, market_ta_rank, market_fundamentals, market_screener, pine_smart_compile, pine_analyze, workspace 系、alert 系が未記載）
- X の `tv x user / x_user_profile` が decision tree に未掲載

**修正方針:**
- Decision tree の pine / backtest 項目を正確な名前に更新
- Tool 対応表に実際の全 MCP ツール名を網羅（系統別に整理）

### 2. tradingview-research-capture

**問題点（クリティカル）:**
- `docs/research/latest/` という存在しないパスを7箇所参照
- テスト `tests/repo-layout.test.js` が `docs/research/latest` の存在を明示的に NG 判定
- `docs/research/latest/manifest.json` → 実際は `docs/research/manifest.json`
- Step 4 の「latest README の更新」は不要（そのようなファイル構造は廃止）

**修正方針:**
- `docs/research/latest/` を `docs/research/` に全置換
- manifest.json パスを `docs/research/manifest.json` に修正
- Step 4（README更新）を削除し、ステップ番号を繰り上げ
- ファイル構造図を実際の構成に合わせて更新
- `description` の "latest manifest" という表現を更新

### 3. backtest-results-capture（新規）

**内容:**
Night Batch Self Hosted の GHA ワークフロー実行後に、その結果を `docs/research/` にまとめるワークフローをスキル化する。

**カバー範囲:**
- When to Use（ユーザーの入力パターン例）
- Step 1: 対象 GHA run の特定（番号 or list_workflow_runs）
- Step 2: アーティファクトの取得（`gh api .../artifacts/{id}/zip`）
- Step 3: データ読み取り（strategy-ranking.json + recovered-results.json）
- Step 4: 合成スコア計算（net_profit rank + pf rank + dd rank の合計）
- Step 5: per-symbol breakdown（rank-1 戦略の symbol 別詳細）
- Step 6: TEMPLATE.md に従い `docs/research/night-batch-self-hosted-run{N}_{YYYYMMDD}.md` を作成
- Step 7: `docs/research/manifest.json` の keep 配列に新ファイルを追加
- Step 8: コミット & プッシュ（`docs: add run{N} backtest results summary ({campaign_id})`）
- Anti-patterns（composite_score を PF だけで判断しない、等）

---

## 実施手順

- [ ] Step 1: 本計画を docs:計画名 でコミット & プッシュ
- [ ] Step 2: ユーザーの承認を待機
- [ ] Step 3: tradingview-operator-playbook/SKILL.md を修正
- [ ] Step 4: tradingview-research-capture/SKILL.md を修正
- [ ] Step 5: backtest-results-capture/SKILL.md を新規作成
- [ ] Step 6: npm test で既存テスト通過確認
- [ ] Step 7: 計画を completed/ に移動してコミット & プッシュ

---

## 影響範囲

- スキルファイルのみ変更。ソースコード・設定・テストへの影響なし。
- manifest.json は変更しない（スキルのドキュメント修正のみ）。

## リスク

- 低リスク。スキルは markdown ファイルのみ。テスト上の影響なし。
- `npm test` で `archive-latest-policy.test.js`・`repo-layout.test.js` が通ることを確認して完了とする。
