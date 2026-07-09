# trade-decision-gate skill 実装計画

作成日時: 2026-07-09 18:55 JST

## 目的

売買判断、保有判断、ポートフォリオリスク判断の相談を受けたときに、既存の売買ルールと情報取得 runbook を束ねる上位スキル `.agents/skills/trade-decision-gate/SKILL.md` を追加する。

この計画ではまだ実装を開始しない。現状調査、実装範囲、検証方法、リスクを確定し、計画のみを commit / push する。

## 背景

現在の売買判断の正本は `docs/strategy/Trade-rule.md` にあり、最新情報、スクリーナー、地合い、セクター、リーダー、チャート、資金管理を確認したうえで `GO / STAY / STOP` を返す構造になっている。

一方、価格、ニュース、Moomoo、TradingView Desktop、X / Reddit などの情報取得方法は `.agents/skills/tradingview-operator-playbook/SKILL.md` にまとまっている。新スキルは個別コマンド一覧を重複コピーせず、何をどの順番で確認し、どう判定するかを管理する上位オーケストレーターにする。

## 現状確認結果

- `AGENTS.md` は、計画を `docs/exec-plans/active/` に作成し、計画のみを commit / push してから実装へ進む運用を要求している。
- `README.md` はルート README を唯一の入口とし、タスク別ナビゲーションに `.agents/skills/` と各ドメイン入口を載せている。
- `docs/exec-plans/active/` は `.gitkeep` のみで、同一目的または競合する active 計画は見つからなかった。
- `docs/strategy/Trade-rule.md` は売買判断の正本で、`GO / STAY / STOP`、必須確認順序、ハード停止条件、固定出力フォーマットをすでに定義している。
- `.agents/skills/tradingview-operator-playbook/SKILL.md` は、CDP 不要なら market / reach / X / Moomoo を優先し、TradingView Desktop / CDP はチャート状態や画面状態が必要なときだけ使う方針を持つ。
- `tests/skills-contract.test.js` は skill front matter、重要 repo-local reference、read-only 契約などを既存 skill 全体へ検査する構造。
- `tests/documentation-navigation.test.js` は README / docs navigation のローカル Markdown link と root README 一意性を検査する構造。
- 米国株スクリーナー workflow は `.github/workflows/daily-screener.yml`、出力は `docs/reports/screener/daily-ranking.md` と `docs/reports/screener/daily-ranking-run.json`。
- 日本株スクリーナー workflow は `.github/workflows/daily-screener-japan.yml`、出力は `docs/reports/screener/daily-ranking-jp.md` と `docs/reports/screener/daily-ranking-jp-run.json`。
- 現在の米国株 run metadata は `generated_at: 2026-06-25T15:15:32Z` だが、レポート本文は `# スクリーニング結果 2026/07/02（木）` / `更新: 01:12 JST` を示している。
- 現在の日本株 run metadata は `generated_at: 2026-06-20T11:13:53Z` だが、レポート本文は `# スクリーニング結果 2026/07/02（木）` / `更新: 01:44 JST` を示している。
- そのため、新スキルは run metadata だけで最新正常結果と断定せず、metadata、レポート本文、必要なら GitHub Actions の最新成功 run を照合する設計にする。
- ポートフォリオ関連は `scripts/moomoo/run-portfolio-diagnostics.mjs`、`scripts/sbi/capture-portfolio-data.mjs`、`scripts/sbi/build-portfolio-report.mjs`、`scripts/portfolio/build-unified-portfolio-report.mjs`、`.github/workflows/moomoo-portfolio-diagnostics.yml`、`.github/workflows/sbi-portfolio-capture.yml`、`.github/workflows/portfolio-health-check.yml`、`docs/reports/screener/portfolio/` に既存の取得・診断・統合レポート導線がある。
- `docs/reports/screener/portfolio/moomoo_portfolio_diagnostics.json` は `readOnly: true` を持ち、Moomoo 診断は読み取り専用として扱われている。
- Dr.K レポートは `docs/strategy/dr-k-chart-strategy-quantification-report_20260707.md` にあり、チャート戦略の補助資料として有用だが、正本は `docs/strategy/Trade-rule.md`。

## 既存機能との役割分担

- `Trade-rule.md`: 売買ルール、ハード停止条件、固定出力の正本。
- `tradingview-operator-playbook`: 情報取得の手段選択。market / reach / X / Moomoo / TradingView Desktop / CDP の使い分けを参照する。
- スクリーナー workflow / report / run metadata: US / JP の最新候補、セクター、Industry、銘柄順位、スコアの参照元。
- Moomoo / SBI / unified portfolio report: 保有情報、残高、現金、建玉、評価損益、集中リスクの参照元。
- Dr.K レポート: ピボット、N字、U字、吸収型、ブレイク失敗などチャート状態が曖昧な場合だけ補助的に参照する資料。
- `trade-decision-gate`: 上記を読む順番、情報不足時の扱い、最終判定の出し方を定義する上位スキル。

## 作成するファイル

- `.agents/skills/trade-decision-gate/SKILL.md`
  - front matter に `name: trade-decision-gate` と、自然な日本語の売買相談を意味的に拾う `description` を定義する。
  - `docs/strategy/Trade-rule.md` を最初に読む正本として明記する。
  - `.agents/skills/tradingview-operator-playbook/SKILL.md` を情報取得方法の参照先として明記する。
  - 既存 operator skill のコマンド一覧を過度に重複コピーしない。

## 更新するファイル

- `tests/skills-contract.test.js`
  - 既存構造に合わせ、専用テストファイルを増やさず `trade-decision-gate` の契約テストを追加する。
- `README.md`
  - タスク別ナビゲーションへ「売買判断・保有判断・ポートフォリオ判断」の入口を追加する。

## 変更しないファイル

- `AGENTS.md`
- `docs/strategy/Trade-rule.md`
- `docs/strategy/dr-k-chart-strategy-quantification-report_20260707.md`
- `.agents/skills/tradingview-operator-playbook/SKILL.md`
- 既存 MCP tool
- 既存 CLI command
- スクリーナー実装
- Moomoo 実装
- TradingView CDP 実装
- Dr.K レポート本文

## 影響範囲

影響範囲は skill runbook、README navigation、skill contract test に限定する。実行ロジック、workflow、market data provider、Moomoo / SBI の取得処理、TradingView CDP 操作には影響させない。

## 起動条件

`trade-decision-gate` の description と本文では、完全一致キーワードではなく、次のような自然な日本語の売買相談を起動対象として明記する。

- 新規購入: 「今買うべき？」「入っていい？」「このチャートはエントリーできる？」
- 追加購入: 「追加していい？」「買い増ししていい？」「ナンピンしていい？」
- 保有 / 売却: 「まだ持っていい？」「含み損だけどどうする？」「売った方がいい？」「利確した方がいい？」「決算を跨いでいい？」
- ポートフォリオ: 「現金比率が少なすぎる？」「持ちすぎ？」「同じテーマへ偏りすぎ？」「どれを減らすべき？」「もう一銘柄追加できる？」

入力形式は、ティッカーのみ、銘柄名のみ、ティッカーと自然文、チャート画像、保有画面画像、ポートフォリオ画像、複数銘柄一覧、平均取得価格・数量・現在値・損益を含むテキストを対象にする。

## 起動対象外

次は単独では起動対象外にする。

- 会社概要の説明
- PER などの用語説明
- 上昇理由だけの調査
- Pine Script 作成
- スクリーナー実装変更
- バックテスト分析
- Dr.K 戦略の一般的な説明

ただし、その後に「それで今買っていい？」などの売買判断が含まれる場合は起動対象にする。

## 判断モード

- `NEW_ENTRY`: 新規購入判断。
- `ADD_POSITION`: 追加購入、買い増し、ナンピン相談。Trade Rule でナンピン禁止でも相談自体は起動対象にする。
- `HOLD_OR_EXIT`: 保有継続、縮小、売却、損切り、利確、決算跨ぎ判断。
- `PORTFOLIO_RISK`: ポートフォリオ全体、現金比率、建玉、集中リスク、同一テーマ重複、縮小候補の判断。

## 情報取得順序

スキル本文には最低限、次の処理順序を明記する。

1. ユーザーの依頼と入力形式を整理する。
2. 銘柄、市場、判断モードを特定する。
3. `docs/strategy/Trade-rule.md` を読む。
4. 必要に応じて `.agents/skills/tradingview-operator-playbook/SKILL.md` を読む。
5. 最新価格を取得する。
6. 会社発表、規制当局資料、決算日、重要イベントを確認する。
7. 最新ニュースと市場情勢を確認する。
8. 市場レジームを `RISK_ON / NEUTRAL / RISK_OFF` に分類する。
9. 米国株または日本株の最新スクリーナーを確認する。
10. 最新成功 run とレポートの鮮度を確認する。
11. 対象銘柄のセクター、Industry、銘柄順位、スコアを確認する。
12. セクター強度とリーダー株判定を行う。
13. OHLCV または TradingView チャートを確認する。
14. チャート状態、セットアップ、ピボット、乖離率を確認する。
15. エントリー、損切り、リスクリワードを計算する。
16. 保有銘柄の場合は平均取得価格、数量、含み損益を確認する。
17. ポートフォリオの場合は残高、現金、建玉、テーマ重複、最大想定損失を確認する。
18. Trade Rule のハード停止条件を確認する。
19. 固定形式で `GO / STAY / STOP` を返す。

情報取得元の優先順位は、一次情報、信頼できる市場ニュース、最新スクリーナー、Moomoo、TradingView、Moomoo / SBI / 統合ポートフォリオレポート、SNS 補足の順にする。SNS だけを理由に `GO` を出さない。

## US / JP 分岐

米国株は次を参照する。

- `.github/workflows/daily-screener.yml`
- `docs/reports/screener/daily-ranking.md`
- `docs/reports/screener/daily-ranking-run.json`

日本株は次を参照する。

- `.github/workflows/daily-screener-japan.yml`
- `docs/reports/screener/daily-ranking-jp.md`
- `docs/reports/screener/daily-ranking-jp-run.json`

市場を特定できない場合、ティッカー形式、銘柄名、ユーザー文脈、保有画面の通貨・市場表記から推定を試みる。確定できなければ原則 `STAY` とし、不足情報を出す。

## 最新成功 run の判定方法

1. run metadata の `workflow`、`report_path`、`run_id`、`run_attempt`、`generated_at` を確認する。
2. レポート本文のタイトル日付と `更新:` 時刻を確認する。
3. metadata とレポート本文の整合性を確認する。
4. 不一致または古い場合は GitHub Actions の最新成功 run を確認する。
5. 最新正常結果を特定できなければ `STAY` とし、どの情報が不一致または未確認かを表示する。

現在の repository 状態では US / JP とも metadata とレポート本文の日付が一致していないため、この照合は必須にする。

## 画像入力の扱い

- チャート画像は、ユーザーの提示画像から銘柄、時間軸、価格位置、出来高、ピボット候補、セットアップ候補を読み取る。ただし完全自動チャート認識を実装するものではない。
- 保有画面画像は、銘柄、数量、平均取得価格、現在値、損益、通貨、口座種別を読み取れる範囲で整理する。
- ポートフォリオ画像は、残高、現金、建玉、評価損益、銘柄分散、テーマ重複を読み取れる範囲で整理する。
- 画像だけで必須情報が揃わない場合は、暫定判定、不足情報、再判定に必要な情報を併記する。

## 情報不足時の扱い

次の必須情報を確認できない場合は、楽観的に補完せず原則 `STAY` にする。

- 銘柄または市場
- 最新価格
- 最新ニュース
- 次回決算日
- 最新スクリーナー
- 有効ピボット
- 損切り位置
- ポートフォリオ判断時の残高・建玉・現金情報

単に質問だけを返して止まらず、確認済み情報に基づく暫定判定、不足情報、再判定に必要な情報を同時に返す設計にする。

## 読み取り専用制約

`trade-decision-gate` は読み取り専用にする。以下は禁止する。

- 注文発注
- 注文変更
- 注文取消
- 自動売買
- 自動損切り
- ポジションの自動縮小
- 取引ロック解除
- Moomoo での取引操作
- 証券口座への書き込み操作

提示可能なのは、売買判定、エントリー候補、数量候補、損切り候補、利確・トレイリング候補、再確認条件、ポートフォリオ縮小候補までにする。アラート作成も、ユーザーの明示指示がない限り行わない。

## 固定出力

`Trade-rule.md` の固定出力形式を基本に、先頭へ次のメタ情報を追加する。

```text
確認時刻:
判断モード: NEW_ENTRY / ADD_POSITION / HOLD_OR_EXIT / PORTFOLIO_RISK
対象市場: US / JP
対象銘柄:
入力形式: テキスト / チャート画像 / 保有画像 / ポートフォリオ画像
データ完全性: COMPLETE / PARTIAL / INSUFFICIENT
```

その後は既存 Trade Rule の構成を維持する。

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

モード別の意味を本文に明記する。

- `HOLD_OR_EXIT + STAY`: 現在の保有を継続する。追加購入を許可する意味ではない。
- `HOLD_OR_EXIT + STOP`: 縮小、売却、損切り、撤退を優先する。
- `PORTFOLIO_RISK + GO`: 新しいリスクを取れる余地がある。
- `PORTFOLIO_RISK + STAY`: 現状維持。新規追加を急がない。
- `PORTFOLIO_RISK + STOP`: 建玉、集中、想定損失を減らす。

## 実装手順

- [x] `.agents/skills/trade-decision-gate/SKILL.md` を作成し、front matter、起動条件、判断モード、処理順序、読み取り専用制約、固定出力を記載する。
- [x] `tests/skills-contract.test.js` に `trade-decision-gate` の契約テストを追加する。
- [x] `README.md` のタスク別ナビゲーションへ売買判断・保有判断・ポートフォリオ判断の導線を追加する。
- [x] `node --test tests/skills-contract.test.js` を実行する。
- [x] `node --test tests/documentation-navigation.test.js` を実行する。
- [x] `npm run test:unit` を実行する。
- [x] 差分をセルフレビューし、計画外ファイルへ変更が広がっていないことを確認する。
- [x] 実装完了時にこの計画を `docs/exec-plans/active/` から `docs/exec-plans/completed/` へ移動する。
- [x] 完了差分を Conventional Commits で commit / push する。

## テスト戦略

`tests/skills-contract.test.js` では、既存テスト構造に合わせて以下を確認する。

- `trade-decision-gate/SKILL.md` が存在する。
- front matter に正しい `name` と `description` がある。
- `docs/strategy/Trade-rule.md` を参照している。
- `.agents/skills/tradingview-operator-playbook/SKILL.md` を参照している。
- `GO / STAY / STOP` を含む。
- `NEW_ENTRY / ADD_POSITION / HOLD_OR_EXIT / PORTFOLIO_RISK` を含む。
- 米国株と日本株の workflow / report / metadata パスを含む。
- 情報不足時は `STAY` とする。
- 読み取り専用である。
- 注文発注、注文変更、注文取消、自動売買、取引ロック解除を許可していない。
- Dr.K レポートが毎回必須ではなく、補助資料である。

`tests/documentation-navigation.test.js` では、README の新しいリンクが存在することを既存リンク検査で確認する。

## 正確な検証コマンド

Windows native / PowerShell の repository root `C:\00_mycode\Oh-MY-TradingView` で実行する。

```powershell
node --test tests/skills-contract.test.js
node --test tests/documentation-navigation.test.js
npm run test:unit
```

今回の実装は Markdown、README、contract test のみを予定するため、TradingView Desktop / CDP を必要とする E2E は実行しない。CDP 実機挙動、Moomoo 接続、SBI 画面操作、スクリーナー workflow 実行はスコープ外。

## リスク

- `Trade-rule.md` の固定出力はもともと新規 / 追加 / 保有判断中心の文言なので、`PORTFOLIO_RISK` へ拡張する際にラベルの意味が曖昧になる可能性がある。スキル側でモード別解釈を補足する。
- 現在の US / JP スクリーナーは run metadata とレポート本文の日付が一致していない。スキルはこの不一致を検出し、必要なら GitHub Actions の最新成功 run を確認する設計にする。
- 自然言語の起動条件を広くしすぎると、会社概要や用語説明だけでも起動してしまう可能性がある。起動対象外を明確に書く。
- 読み取り専用制約が曖昧だと、アラートや口座操作へ広がる可能性がある。注文・口座書き込みは禁止として明文化する。

## 不確実事項

- 実装時に README の既存表へ 1 行追加するだけで十分か、別セクションが必要かは最小差分で判断する。
- `tests/skills-contract.test.js` の追加テストは専用 `it` を 1 つにまとめる想定だが、既存可読性に合わせて分割する可能性がある。
- GitHub Actions の最新成功 run 確認方法は、skill 本文では `gh run list` などの具体例を最小限にするか、operator playbook / GitHub skill へ委ねるかを実装時に調整する。
- Dr.K レポートのファイル名は現状 `docs/strategy/dr-k-chart-strategy-quantification-report_20260707.md` だが、将来増える可能性があるため、毎回必須ではなく「必要時に `docs/strategy/` 配下の Dr.K レポートを確認」とする余地がある。

## スコープ外

- Dr.K 式チャート認識の完全自動化
- 新しいスコアリングエンジン
- 新しい MCP tool
- 新しい CLI command
- 注文発注機能
- 自動売買
- 自動損切り
- ポジション自動調整
- Trade Rule の全面レビュー
- スクリーナー本体の変更
- 新しいチャート解析モジュール
- SNS を直接的な売買シグナルとして使用
- 将来用の不要な設定ファイルや抽象化

## 成功条件

- 計画段階では、この active 計画書だけが追加され、commit / push されている。
- 実装段階では、作成 / 更新ファイルが計画範囲内に収まっている。
- `trade-decision-gate` が `Trade-rule.md` を正本として読み、`tradingview-operator-playbook` へ情報取得方法を委ねる。
- 4 判断モード、US / JP 分岐、最新 run 照合、画像入力、情報不足時 `STAY`、読み取り専用制約、固定出力が skill に明記されている。
- contract test、documentation navigation test、unit test が通る。

## 完了時の active から completed への移動手順

実装完了後、計画内容と差分をレビューし、次を実行する。

```powershell
Move-Item -LiteralPath docs/exec-plans/active/trade-decision-gate-skill_20260709_1855.md -Destination docs/exec-plans/completed/trade-decision-gate-skill_20260709_1855.md
```

移動後に `git status --short` で active から completed への rename と実装差分だけが含まれることを確認し、Conventional Commits で commit / push する。

## セルフレビュー

- 計画は `AGENTS.md` と `repo-planning-discipline` の active exec-plan 運用に沿っている。
- 今回の commit 対象は計画書 1 ファイルのみで、`SKILL.md`、README、テストの実装は含めない。
- 変更予定ファイル、変更しないファイル、影響範囲、検証コマンド、リスク、不確実事項、スコープ外を明記した。
- 既存コード、workflow、report、tests を正本として扱い、追加の実装範囲は不確実事項に留めた。

## 実装完了レビュー

- `.agents/skills/trade-decision-gate/SKILL.md` を追加し、`Trade-rule.md` を正本、`tradingview-operator-playbook` を情報取得 route の参照先として明記した。
- `README.md` のタスク別ナビゲーションへ売買判断・保有判断・ポートフォリオ判断の入口を追加した。
- `tests/skills-contract.test.js` に trade decision gate の契約テストを追加した。
- `tests/documentation-navigation.test.js` は、既存ローカル環境 `python/.venv` 内の外部 README を拾って失敗したため、仮想環境ディレクトリ `.venv` を README 探索から除外した。
- `docs/strategy/Trade-rule.md`、Dr.K レポート、operator skill、既存 MCP / CLI / screener / Moomoo / TradingView CDP 実装は変更していない。

検証結果:

```powershell
node --test tests/skills-contract.test.js
node --test tests/documentation-navigation.test.js
npm run test:unit
```

すべて成功。`npm run test:unit` は 864 tests / 864 pass。
