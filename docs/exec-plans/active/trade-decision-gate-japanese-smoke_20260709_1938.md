# trade-decision-gate 日本語化と NVDA smoke 実装計画

作成日時: 2026-07-09 19:38 JST

## 目的

`.agents/skills/trade-decision-gate/SKILL.md` の説明本文と契約見出しを日本語化し、日本語ユーザーと日本語で動作する AI が読みやすい売買判断 gate にする。既存の判断ロジックは変更せず、`tests/skills-contract.test.js` を日本語仕様へ追従させる。

実装後は、自然な日本語の NVIDIA（NASDAQ: NVDA）新規購入相談を新しい Codex CLI プロセスへ渡し、最新データ取得、Trade Rule 参照、`GO / STAY / STOP` 判定、read-only 維持、出力形式を確認する。

## 現状

- 最新 main は `9a1a0bd fix: refine trade decision gate modes` で、`git pull origin main` は `Already up to date.`。
- `docs/exec-plans/active/` は `.gitkeep` のみで、競合する active 計画はない。
- `trade-decision-gate` は起動例と一部出力項目を除き、見出しと説明本文が英語中心。
- `tests/skills-contract.test.js` は `buy / hold / sell / portfolio`、`Judgment Priority`、`Read-Only Constraint`、`is prohibited` など英語表現を契約としている。
- `docs/strategy/Trade-rule.md` は売買判断の正本で、`GO / STAY / STOP`、必須確認順序、ハード停止条件、固定出力形式を定義している。
- `.agents/skills/tradingview-operator-playbook/SKILL.md` は market / Moomoo / reach など非 CDP 優先、TradingView Desktop / CDP は必要時のみ、という情報取得方針を持つ。
- `.agents/skills/github-actions-failure-debugging/SKILL.md` は GitHub Actions run 調査が必要な場合の補助 runbook。
- 米国 screener は `.github/workflows/daily-screener.yml`、`docs/reports/screener/daily-ranking.md`、`docs/reports/screener/daily-ranking-run.json` が入口。
- 現在の米国 screener repository metadata は `generated_at: 2026-06-25T15:15:32Z`、report body は `2026/07/02` と表示しており、最新成功 run の確認では GitHub connector / `gh` / repo metadata と report body の照合が必要。

## 日本語化方針

- front matter の `description` を自然な日本語へ変更する。
- 本文の見出し、起動条件、起動対象外、正本、判断モード、判定優先順位、モード別ワークフロー、情報源の優先順位、最新 screener run、TradingView 利用方針、画像入力、情報不足、ラベル、read-only、出力形式を日本語化する。
- 既存ロジックは翻訳するだけで、判断基準を緩和・変更しない。
- 英語 heading を日本語 heading に置き換えるため、contract test も日本語 heading を契約にする。
- コードブロック内の CLI コマンド、workflow 名、ファイルパス、JSON field、tool 名はそのまま維持する。

## 日本語化しない識別子

次の技術識別子は変更しない。

```text
trade-decision-gate
SKILL.md
GO
STAY
STOP
NEW_ENTRY
ADD_POSITION
HOLD_OR_EXIT
PORTFOLIO_RISK
RISK_ON
NEUTRAL
RISK_OFF
FAILED_BREAKOUT
SETUP_BROKEN
NO_TRADE
COMPLETE
PARTIAL
INSUFFICIENT
US
JP
MIXED
```

次も変更しない。

- ファイルパス
- workflow 名
- CLI コマンド
- JSON field
- GitHub Actions 識別子
- Moomoo / TradingView tool 名
- コードブロック内の実行コマンド

## 変更対象ファイル

- `.agents/skills/trade-decision-gate/SKILL.md`
- `tests/skills-contract.test.js`
- `docs/exec-plans/active/trade-decision-gate-japanese-smoke_20260709_1938.md`
- 完了時: `docs/exec-plans/completed/trade-decision-gate-japanese-smoke_20260709_1938.md`

## 変更しないファイル

- `AGENTS.md`
- `README.md`
- `docs/strategy/Trade-rule.md`
- `docs/strategy/dr-k-chart-strategy-quantification-report_20260707.md`
- `.agents/skills/tradingview-operator-playbook/SKILL.md`
- `.agents/skills/github-actions-failure-debugging/SKILL.md`
- `tests/documentation-navigation.test.js`
- 既存 MCP 実装
- 既存 CLI 実装
- screener 実装
- Moomoo 実装
- TradingView CDP 実装

## contract test の変更方針

- front matter の英語キーワード `buy / hold / sell / portfolio` 依存を削除し、`購入`、`保有`、`売却`、`ポートフォリオ` を確認する。
- 必要に応じて `追加購入`、`利確`、`損切り` も確認する。
- 次の日本語見出しを契約にする。
  - `起動対象外`
  - `正本`
  - `判断モード`
  - `判定優先順位`
  - `モード別ワークフロー`
  - `情報源の優先順位`
  - `最新成功スクリーナーrun`
  - `TradingViewの利用方針`
  - `画像入力`
  - `情報不足時の扱い`
  - `ラベルの意味`
  - `読み取り専用制約`
  - `出力形式`
- 4 判断モード、STOP 優先、`HOLD_OR_EXIT + GO` 不使用、`PORTFOLIO_RISK + GO` の意味、`US / JP / MIXED`、単一銘柄ピボット非必須、判定先頭、HOLD / PORTFOLIO 出力項目、GitHub connector / `gh run list` / repo metadata と report body の照合経路を引き続き検証する。
- read-only test は `is prohibited` 依存を削除し、日本語の禁止表現を読み取り専用セクション内で確認する。
- 注文許可に見える日本語表現がないことを確認する。

## NVIDIA 実動作確認方法

- `codex --help` を確認し、非対話実行用の正式サブコマンドがある場合はその help も確認する。
- repository root `C:\00_mycode\Oh-MY-TradingView` から新しい Codex CLI プロセスを可能な範囲で読み取り専用・非 yolo で起動する。
- 自然言語プロンプトはスキル名を明示せず、NVDA の新規購入判断を依頼する。
- stdout / stderr / exit code を `artifacts/trade-decision-gate-smoke/20260709_1938/` へ保存する。
- 実行前後の `git status --short --branch` を比較し、repo ファイルが変更されていないことを確認する。
- 新しい CLI プロセスを実行できない場合は、同一セッションで同じプロンプトを使って検証し、独立セッションでの自動 skill 選択は未検証と明記する。

## 新しい Codex CLI セッションでの確認方法

確認する help:

```powershell
codex --help
codex exec --help
```

実際の実行構文は、help に存在するものだけを使用する。存在しない構文は決め打ちしない。実行は repository root を working directory とし、自動承認・yolo モードを使わず、注文、アラート、口座書き込み、実装ファイル変更を許可しない。

## 最新データの取得元

優先順位:

1. NVIDIA 公式 IR、SEC など一次情報
2. 信頼できる最新ニュース
3. 最新成功した米国株 screener run
4. Moomoo または market tool の株価、snapshot、fundamentals、OHLCV
5. TradingView chart
6. SNS は補足のみ

非 CDP の market / Moomoo / OHLCV で十分に判断できる場合は TradingView Desktop を起動しない。ピボット、ローソク足、出来高、複数時間軸などの目視確認が必要な場合だけ TradingView Desktop / CDP を使う。

## 実動作確認の合格条件

- stdout が日本語である。
- 最初の主要見出しが `# 判定: GO`、`# 判定: STAY`、または `# 判定: STOP`。
- `判断モード: NEW_ENTRY`、`対象市場: US`、`対象銘柄: NVDA` を含む。
- データ完全性を記載する。
- 次の 8 セクションを含む。
  - `1. 結論`
  - `2. 最新ニュース・イベント`
  - `3. スクリーナー`
  - `4. 市場・セクター・リーダー判定`
  - `5. チャート`
  - `6. 資金管理`
  - `7. ハード停止チェック`
  - `8. 最終アクション`
- 口座情報を推測しない。
- 注文操作を行わない。
- 判定が変わる条件または再確認条件を含む。
- 最新情報の確認時刻を含む。
- 使用した情報源または取得結果が分かる。
- SNS だけを理由に `GO` を出していない。

## 失敗時の扱い

- 新しい CLI セッションを実行できない場合は、同一セッションで検証し、未検証範囲と失敗理由を `validation.md` と最終報告へ明記する。
- 最新 screener の正常性を確定できない場合は、Trade Rule に従って `STAY` とする。
- 利用できない情報は推測せず `未確認` とする。
- smoke test が repository ファイルを変更した場合は差分を調査し、勝手に破棄しない。

## テストコマンド

```powershell
node --test tests/skills-contract.test.js
node --test tests/documentation-navigation.test.js
npm run test:unit
```

TradingView や市場データ処理の実装を変更しないため、通常の `npm run test:e2e` は実行しない。NVDA smoke は別途実施する。

## リスク

- 日本語化時に判断基準が緩くなると、既存の STOP 優先や情報不足時 STAY が崩れる。
- 見出し名を日本語化するため、contract test の section 抽出が壊れる可能性がある。
- Codex CLI の非対話実行構文や sandbox 指定が現環境で想定と違う可能性がある。
- NVDA の最新情報は時点依存であり、価格、ニュース、決算日、screener run の鮮度は実行時に再確認が必要。
- market / Moomoo / GitHub / web 取得が一部失敗した場合、データ完全性は `PARTIAL` または `INSUFFICIENT` になる。

## スコープ外

- `Trade-rule.md` の変更
- operator skill / GitHub Actions debugging skill の日本語化
- 全 skill の一括翻訳
- 新しい取引機能、MCP tool、CLI command、スコアリングエンジンの追加
- screener / Moomoo / TradingView CDP 実装変更
- 注文発注、自動売買、自動損切り、ポジション自動調整

## 実装手順

- [x] 最新 main へ同期し、開始 commit と clean tree を確認する。
- [x] 必読ファイル、既存 skill、contract test、Trade Rule、screener workflow / report / metadata、market / Moomoo / TradingView 入口を確認する。
- [x] active 計画を作成する。
- [ ] 計画だけを `docs: plan Japanese trade decision gate smoke test` で commit / push する。
- [ ] `.agents/skills/trade-decision-gate/SKILL.md` を日本語化する。
- [ ] `tests/skills-contract.test.js` を日本語仕様へ更新する。
- [ ] `node --test tests/skills-contract.test.js` を実行する。
- [ ] `node --test tests/documentation-navigation.test.js` を実行する。
- [ ] `npm run test:unit` を実行する。
- [ ] `codex --help` と、存在する場合は非対話実行 help を確認する。
- [ ] 新しい Codex CLI プロセスで NVDA smoke を実行し、stdout / stderr / exit code / git status を保存する。
- [ ] smoke の取得データ、出力形式、read-only、最終判定を `validation.md` に記録する。
- [ ] 差分をセルフレビューする。
- [ ] active 計画へ実装結果、通常テスト結果、NVDA smoke 結果を追記する。
- [ ] 計画を `docs/exec-plans/completed/` へ移動する。
- [ ] 実装差分を `fix: localize trade decision gate and verify NVDA smoke` で commit / push する。
- [ ] `git pull origin main` と `git status --short --branch` で最終同期と clean tree を確認する。

## 成功条件

- 計画 commit / push が先に完了している。
- `trade-decision-gate` が自然な日本語本文になり、技術識別子は維持されている。
- 4 判断モード、STOP 優先、NEW_ENTRY / ADD_POSITION / HOLD_OR_EXIT / PORTFOLIO_RISK の既存判断契約が維持されている。
- contract test が英語表現へ不要に依存しない。
- 通常テスト 3 種が成功する。
- NVDA の自然な日本語相談で、新規購入判断として `GO / STAY / STOP` のいずれかが日本語で出る。
- 実動作確認は read-only で、注文・アラート・口座書き込みを行わない。
- smoke test 前後で repository ファイルの変更がない。
- 計画が completed へ移動し、最終 commit / push 後に `main...origin/main` が clean。

## completed への移動方法

実装、検証、smoke、レビュー完了後に計画へ結果を追記し、次で移動する。

```powershell
Move-Item -LiteralPath docs/exec-plans/active/trade-decision-gate-japanese-smoke_20260709_1938.md -Destination docs/exec-plans/completed/trade-decision-gate-japanese-smoke_20260709_1938.md
```

移動後は active 側に `.gitkeep` が残ることを確認し、completed 計画と実装差分を最終 commit に含める。
