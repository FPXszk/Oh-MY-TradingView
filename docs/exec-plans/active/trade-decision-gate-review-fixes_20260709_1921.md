# trade-decision-gate review fixes 実装計画

作成日時: 2026-07-09 19:21 JST

## 目的

`trade-decision-gate` の保有判断とポートフォリオ判断を中心に、判断モード別の確認項目、判定優先順位、出力形式、contract test を修正する。

ユーザーの最新指示により、計画作成・commit / push 後に実装、検証、completed 移動、実装 commit / push まで続ける。

## 現在の問題

- 現行 `.agents/skills/trade-decision-gate/SKILL.md` は共通 19 ステップ中心で、`NEW_ENTRY` の確認順序を `ADD_POSITION` / `HOLD_OR_EXIT` / `PORTFOLIO_RISK` にも広く適用しやすい。
- `HOLD_OR_EXIT` で、新規購入用の初期リスクリワード、エントリーゾーン、最新ピボットから 5% 以内、スクリーナー上位を無条件必須にしない、という区別が弱い。
- `PORTFOLIO_RISK` で、単一銘柄のピボットやエントリーゾーンを無条件必須にしない、という区別が弱い。
- 情報不足時の `STAY` が、明確な損切り・撤退条件より優先されないことが明文化されていない。
- `HOLD_OR_EXIT + GO` を使わない、という保有判断向けラベル仕様がない。
- `PORTFOLIO_RISK` の対象市場が `US / JP` のみで、混在ポートフォリオの `MIXED` がない。
- 出力順序が `確認時刻` などのメタ情報を先に置いており、`docs/strategy/Trade-rule.md` の「最初に判定を明確に出す」形式とずれている。
- 最新成功 run の取得経路が抽象的で、GitHub connector / `gh run list` / repo metadata の優先順位がない。
- `tests/skills-contract.test.js` は禁止語の存在確認寄りで、read-only の禁止文脈、STOP 優先、モード別ワークフロー、HOLD / PORTFOLIO 出力項目を十分に契約化していない。

## 現状確認結果

- `AGENTS.md` は計画作成、実装、レビュー、commit / push、次指示待ちの流れを要求している。
- `README.md` には既に売買判断・保有判断・ポートフォリオ判断の導線があり、今回 README の導線変更は不要。
- `docs/exec-plans/active/` は `.gitkeep` のみで、競合 active 計画はない。
- 前回計画 `docs/exec-plans/completed/trade-decision-gate-skill_20260709_1855.md` は実装完了済み。
- `docs/strategy/Trade-rule.md` は売買判断の正本で、判定を先頭に出す固定出力、`GO / STAY / STOP`、チャート崩れや損切り条件の `STOP` を定義している。
- `.agents/skills/tradingview-operator-playbook/SKILL.md` は market / reach / Moomoo 優先、CDP はチャート状態が必要な時だけ使う方針を持つ。
- `.agents/skills/github-actions-failure-debugging/SKILL.md` は Actions 失敗時の補助 runbook であり、毎回必須参照ではなく、最新成功 run 取得や障害調査が必要な時だけ参照する。
- `tests/documentation-navigation.test.js` の `.venv` 除外は現状入っており、今回も維持する。
- US screener は `.github/workflows/daily-screener.yml`、`docs/reports/screener/daily-ranking.md`、`docs/reports/screener/daily-ranking-run.json`。
- JP screener は `.github/workflows/daily-screener-japan.yml`、`docs/reports/screener/daily-ranking-jp.md`、`docs/reports/screener/daily-ranking-jp-run.json`。
- 現在の screener run metadata と report body の日付は一致していないため、run metadata だけで最新と断定しない方針は引き続き必要。
- ポートフォリオ関連は `scripts/moomoo/run-portfolio-diagnostics.mjs`、`scripts/sbi/capture-portfolio-data.mjs`、`scripts/sbi/build-portfolio-report.mjs`、`scripts/portfolio/build-unified-portfolio-report.mjs`、`.github/workflows/moomoo-portfolio-diagnostics.yml`、`.github/workflows/sbi-portfolio-capture.yml`、`.github/workflows/portfolio-health-check.yml`、`docs/reports/screener/portfolio/` に存在する。

## 修正対象ファイル

- `.agents/skills/trade-decision-gate/SKILL.md`
- `tests/skills-contract.test.js`
- `docs/exec-plans/active/trade-decision-gate-review-fixes_20260709_1921.md`

実装完了時:

- `docs/exec-plans/completed/trade-decision-gate-review-fixes_20260709_1921.md`

## 変更しないファイル

- `AGENTS.md`
- `README.md`
- `docs/strategy/Trade-rule.md`
- `docs/strategy/dr-k-chart-strategy-quantification-report_20260707.md`
- `.agents/skills/tradingview-operator-playbook/SKILL.md`
- `.agents/skills/github-actions-failure-debugging/SKILL.md`
- `tests/documentation-navigation.test.js`
- 既存 MCP tool
- 既存 CLI command
- スクリーナー実装
- Moomoo 実装
- TradingView CDP 実装

`tests/documentation-navigation.test.js` の `.venv` 除外は維持し、元に戻さない。

## モード別ワークフロー

`trade-decision-gate` の共通 19 ステップを、次のモード別ワークフローへ整理する。

### NEW_ENTRY

新規購入判断では、銘柄・市場、最新価格、会社発表・規制当局資料、ニュース、決算・重要イベント、市場レジーム、セクター強度、最新スクリーナー、Industry 順位、銘柄順位、スコア、リーダー判定、チャート状態、セットアップ、有効ピボット、乖離率、エントリー候補、損切り価格、損切り幅、リスクリワード、資金管理、ポートフォリオ重複を確認する。

### ADD_POSITION

`NEW_ENTRY` の確認に加え、平均取得価格、現在数量、含み損益、初玉と追加玉の区別、追加後平均取得価格、追加後建玉総額、追加後 1 トレード想定損失、追加後ポートフォリオ全体想定損失、同一テーマ・同一値動きの重複、含み損状態でのナンピンではないことを確認する。ナンピン相談は起動対象だが、Trade Rule に従って原則 `STOP`。

### HOLD_OR_EXIT

最新価格、平均取得価格、数量、含み損益率、現在のストップまたは無効化ライン、会社固有ニュース、決算・重要イベント、市場レジーム、セクターと主要リーダー、`FAILED_BREAKOUT`、`SETUP_BROKEN`、重要支持線・直近安値・重要移動平均線、10 日線・25 日線・新しいピボットによる利益管理、決算を跨げる利益クッション、ポートフォリオ内重要度と重複を確認する。

新規購入用の初期リスクリワード 2 以上、新規エントリーゾーン、最新ピボットから 5% 以内、スクリーナー上位を無条件必須にしない。追加購入も同時に判断する場合のみ `ADD_POSITION` 条件を適用する。

### PORTFOLIO_RISK

総資産、現金残高、現金比率、建玉総額、建玉倍率、各ポジション評価額、各ポジション損切り位置、各ポジション想定損失、全ストップ発動時の合計想定損失、1 銘柄集中率、セクター集中率、Industry・テーマ重複、相関の高い銘柄の重複、US / JP / 通貨偏り、決算・重要イベント集中、縮小優先候補、新規リスク余地を確認する。

単一対象銘柄、単一銘柄の有効ピボット、単一銘柄のエントリーゾーン、単一銘柄の初期リスクリワード、全保有銘柄の次回決算日の完全確認、全保有銘柄のスクリーナー順位確認を無条件必須にしない。縮小候補を選ぶ段階で必要な銘柄だけ追加確認する。

## 判定優先順位

`trade-decision-gate` に次を明記する。

1. 確認済みの `STOP` 条件がある場合は `STOP`。
2. `STOP` 条件は確認されていないが、`GO` 判定に必要な情報が不足している場合は `STAY`。
3. 必須条件をすべて確認し、`GO` 条件を満たした場合だけ `GO`。

例として、`SETUP_BROKEN` や損切りライン割れが確認済みなら、次回決算日や最新スクリーナーが未確認でも `STOP`。チャート維持だが最新ニュース未確認なら `STAY`。新規購入でピボット不明なら `STAY`。明確な `RISK_OFF` での新規購入やナンピン相談は `STOP`。

## HOLD_OR_EXIT のラベル仕様

- `HOLD_OR_EXIT + GO` は使用しない。
- `HOLD_OR_EXIT + STAY`: 現在の保有を継続する。追加購入を許可する意味ではない。
- `HOLD_OR_EXIT + STOP`: 縮小、売却、損切り、撤退を優先する。
- 利確は全売却だけではなく、部分利確、ストップ引き上げ、トレイリング強化も `STOP` 側の最終アクション候補に含める。

## PORTFOLIO_RISK のラベル仕様

- `PORTFOLIO_RISK + GO`: 新しいリスクを取れる余地がある。特定銘柄の購入許可ではない。
- `PORTFOLIO_RISK + STAY`: 現在の建玉を維持する。新規追加を急がない。
- `PORTFOLIO_RISK + STOP`: 建玉、集中、相関、想定損失を減らす。
- 対象市場は `US / JP / MIXED` を扱う。米国株と日本株が混在する場合は `MIXED`。

## 出力順序

`docs/strategy/Trade-rule.md` に合わせ、先頭は判定にする。

```markdown
# 判定: GO / STAY / STOP

確認時刻:
判断モード: NEW_ENTRY / ADD_POSITION / HOLD_OR_EXIT / PORTFOLIO_RISK
対象市場: US / JP / MIXED
対象銘柄:
入力形式: テキスト / チャート画像 / 保有画像 / ポートフォリオ画像
データ完全性: COMPLETE / PARTIAL / INSUFFICIENT
```

## モード別出力

### NEW_ENTRY / ADD_POSITION

既存 Trade Rule 形式を基本にする。

```text
1. 結論
2. 最新ニュース・イベント
3. スクリーナー
4. 市場・セクター・リーダー判定
5. チャート
6. 資金管理
7. ハード停止チェック
8. 最終アクション
```

### HOLD_OR_EXIT

```text
1. 結論
2. 最新ニュース・イベント
3. 保有状況
4. 市場・セクター・リーダー判定
5. チャート崩れ・利益管理
6. 決算・イベントリスク
7. STOP条件チェック
8. 最終アクション
```

最低限、平均取得価格、現在価格、含み損益率、現在の無効化ライン、チャート状態、保有継続条件、縮小条件、売却・損切り条件、利益管理を出す。未確認は `未確認`。

### PORTFOLIO_RISK

```text
1. 結論
2. ポートフォリオ概要
3. 現金・建玉
4. 集中・相関リスク
5. 最大想定損失
6. 市場レジーム
7. リスク上限チェック
8. 最終アクション
```

最低限、総資産、現金残高、現金比率、建玉総額、建玉倍率、全ストップ発動時の想定損失、最大銘柄比率、最大セクター比率、テーマ重複、相関リスク、イベント集中、縮小優先候補、新規リスク余地を出す。未確認は `未確認`。

## 最新成功 run の取得経路

`trade-decision-gate` に次の優先順位を明記する。

1. 利用可能な GitHub connector / GitHub API tool。
2. `gh` CLI。
3. repository 内の run metadata とレポート本文。

`gh` CLI が使える場合の例:

```powershell
gh run list --workflow daily-screener.yml --branch main --status success --limit 1 --json databaseId,headSha,createdAt,updatedAt,status,conclusion,url
gh run list --workflow daily-screener-japan.yml --branch main --status success --limit 1 --json databaseId,headSha,createdAt,updatedAt,status,conclusion,url
gh run view <run-id>
```

GitHub connector も `gh` CLI も使えず、metadata とレポート本文が不一致または古い場合は、最新性を確定せず `STAY`。具体的な GitHub Actions 障害調査が必要な場合だけ `.agents/skills/github-actions-failure-debugging/SKILL.md` を参照する。

## contract test 強化内容

`tests/skills-contract.test.js` は過度な全文一致ではなく、重要契約を検査する。

- read-only セクション内で注文操作が禁止されている。
- 注文発注、注文変更、注文取消、取引ロック解除を許可する表現がない。
- `HOLD_OR_EXIT + GO` を使用しないことが書かれている。
- 確認済み STOP 条件が情報不足 STAY より優先すると書かれている。
- `PORTFOLIO_RISK` では単一銘柄のピボットを無条件必須にしない。
- `PORTFOLIO_RISK` が `US / JP / MIXED` を扱う。
- `# 判定:` が `確認時刻:` より前にある。
- モード別ワークフローが存在する。
- `PORTFOLIO_RISK` 用出力項目が存在する。
- `HOLD_OR_EXIT` 用出力項目が存在する。
- 最新成功 run の GitHub connector または `gh run list` 経路が存在する。

## `.venv` 除外の維持

`tests/documentation-navigation.test.js` の `ignoredDirectories` に `.venv` が含まれている状態を維持する。今回の修正で戻さない。

## 実装手順

- [ ] 計画書を `docs/exec-plans/active/` に作成する。
- [ ] 計画書のみを `docs: trade decision gate review fixes plan` で commit / push する。
- [ ] `.agents/skills/trade-decision-gate/SKILL.md` をモード別ワークフロー、判定優先順位、ラベル仕様、出力順序、最新成功 run 経路に合わせて更新する。
- [ ] `tests/skills-contract.test.js` の trade decision gate 契約テストを強化する。
- [ ] `node --test tests/skills-contract.test.js` を実行する。
- [ ] `node --test tests/documentation-navigation.test.js` を実行する。
- [ ] `npm run test:unit` を実行する。
- [ ] 差分をセルフレビューし、計画外ファイルへ変更が広がっていないことを確認する。
- [ ] 計画書を `docs/exec-plans/completed/` へ移動し、完了レビューと検証結果を追記する。
- [ ] 完了差分を Conventional Commits で commit / push する。
- [ ] `git pull origin main` と `git status --short --branch` で remote/local 同期と clean tree を確認する。

## テスト戦略

最小確認:

```powershell
node --test tests/skills-contract.test.js
node --test tests/documentation-navigation.test.js
npm run test:unit
```

Markdown skill と contract test の修正のため、TradingView Desktop / CDP を必要とする E2E は不要。CDP 実機挙動、Moomoo 接続、SBI 画面操作、スクリーナー workflow 実行は変更しないため実行しない。

## リスク

- スキル本文が長くなりすぎると、上位オーケストレーターではなく詳細 runbook の重複になる。operator skill のコマンド一覧はコピーしすぎず、判断契約に集中する。
- STOP 優先を強めすぎると、未確認の STOP を推測してしまう可能性がある。明確に「確認済み STOP 条件」のみ優先する。
- HOLD_OR_EXIT で GO を使わない仕様を追加すると、既存の GO/STAY/STOP 固定出力との解釈に迷いが出る可能性がある。保有判断は STAY / STOP の 2 値運用と明記する。
- contract test が壊れやすくなりすぎると文言修正を阻害する。必要な契約だけ regex / section 検査で確認する。

## 不確実事項

- `tests/skills-contract.test.js` の helper 追加が必要か、既存 `it` 内の拡張で十分かは実装時に最小差分で判断する。
- GitHub connector 名は実行環境により変わるため、スキル本文では具体的 MCP tool 名へ固定しない。
- README 導線は現状十分と判断して変更しない。実装中にリンク破損などが見つかった場合は、勝手に広げず報告する。

## スコープ外

- `docs/strategy/Trade-rule.md` の変更
- README の導線変更
- `tests/documentation-navigation.test.js` の `.venv` 除外以外の変更
- 既存 MCP / CLI / screener / Moomoo / TradingView CDP 実装
- Dr.K レポート本文
- 新しいスコアリングエンジン
- 注文発注、自動売買、自動損切り、ポジション自動調整
- E2E 実行

## 成功条件

- 計画書が active に作成され、計画だけの commit / push が完了する。
- 実装後、`trade-decision-gate` が判断モード別ワークフロー、STOP 優先、HOLD_OR_EXIT の STAY/STOP 運用、PORTFOLIO_RISK の `US / JP / MIXED`、判定先頭出力、モード別出力、最新成功 run 取得経路を明記している。
- `tests/skills-contract.test.js` が read-only 禁止文脈、判定優先、モード別出力、GitHub run 経路を契約として検証する。
- `node --test tests/skills-contract.test.js`、`node --test tests/documentation-navigation.test.js`、`npm run test:unit` が成功する。
- 計画書を completed へ移動し、最終 commit / push 後に `main...origin/main` が clean。

## active から completed への移動手順

実装と検証完了後に次を実行する。

```powershell
Move-Item -LiteralPath docs/exec-plans/active/trade-decision-gate-review-fixes_20260709_1921.md -Destination docs/exec-plans/completed/trade-decision-gate-review-fixes_20260709_1921.md
```

移動後、完了レビューと検証結果を追記し、実装差分と一緒に commit / push する。

## セルフレビュー

- 添付本文の「計画だけ」より、最新ユーザー指示の「実装もしてほしい」を優先し、計画 commit 後に実装まで続ける。
- 変更対象を `.agents/skills/trade-decision-gate/SKILL.md` と `tests/skills-contract.test.js` に絞る。
- README と documentation navigation test は原則変更しない。
- `.venv` 除外を維持することを明記した。
- E2E は不要である理由を明記した。
