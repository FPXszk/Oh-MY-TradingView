# working-tree-audit-docs-refresh-and-cleanup_20260416_1331

## 目的

- 未コミット変更を棚卸しし、**どの変更段階で発生したものか**を推定する
- 影響判断のうえ、**安全に main へ反映できる変更だけ**を commit / push して working tree を clean に戻す
- 以前議論した **「テーマ投資でモメンタムのある銘柄の定義」** を既存文書から再発見し、見つけやすい場所へ再配置または導線追加する
- README と docs 導線を、**現状のプロジェクト実態（night batch / latest docs / strategy reference / session log 運用）** に合わせて最適化する
- session log を残し、最後に commit / push まで完了できる状態にする

## 現状整理

- `docs/exec-plans/active/` は **空**で、競合する進行中 plan は見当たらない
- 現在の未コミット変更は大きく **2 系統**に分かれている
  1. **staged**: `python/night_batch.py` / `scripts/backtest/generate-rich-report.mjs` / `scripts/backtest/generate-strategy-reference.mjs` / `src/core/campaign-report.js` / 関連 test / `package.json`
     - 最新 summary / rich report / strategy reference を整える **night batch 文書生成系の実装終盤**と推定
  2. **unstaged**: `src/core/market-intel.js` / `tests/market-intel.test.js` / `package.json` / state JSON 2 件
     - TradingView / market-intel の追加調査・複数銘柄 financial 取得系の **別筋 follow-up 実装**と推定
- `package.json` が staged / unstaged の両方で変わっており、**2 系統の変更が混線**している
- `docs/research/archive/theme-signal-observation-round6_2015_2025.md` の「テーマ投資の判断基準（提案）」が、今回探すべき定義文書の最有力 source
- `README.md` / `docs/DOCUMENTATION_SYSTEM.md` / `docs/explain-forhuman.md` / `docs/research/latest/README.md` / `docs/research/strategy/README.md` は存在するが、
  - latest summary と latest handoff の違い
  - strategy / symbol reference の入口
  - テーマ投資 definition doc への導線
  - session log / reports / raw artifact の役割分担
  がまだ分散している

## 変更・作成・削除対象ファイル

### 変更予定

- `README.md`
  - repo の一次入口を現状運用に合わせて再整理
  - latest docs / strategy docs / definition doc / session log / reports への導線を最適化
- `docs/DOCUMENTATION_SYSTEM.md`
  - docs 地図と読む順番を最新状態に合わせる
- `docs/explain-forhuman.md`
  - 非エンジニア向けの読む順番に strategy reference / definition doc を追加
- `docs/research/latest/README.md`
  - latest handoff と main summary の違い、および strategy docs への橋渡しを強化
- `docs/research/strategy/README.md`
  - generated doc と手書き doc の境界を明示し、新 definition doc への入口を追加
- `docs/references/backtests/README.md`
  - raw artifact と generator / human-facing docs の関係を追記
- `tests/repo-layout.test.js`
  - 新しい docs 導線や session log / strategy docs の期待値に必要なら追随
- `tests/night-batch.test.js`
  - strategy reference / latest summary / docs 導線の期待値に必要なら追随
- `tests/windows-run-night-batch-self-hosted.test.js`
  - README / docs 導線参照が変わる場合のみ最小更新
- `package.json`
  - push 対象に含める変更が test script へ関係する場合だけ整理
- `python/night_batch.py`
  - 既存 staged 実装を採用するなら、summary / strategy reference / doc routing を整合確認したうえで必要最小限で調整
- `scripts/backtest/generate-rich-report.mjs`
  - staged 実装の文書出力を README / docs 導線方針と整合させる必要がある場合のみ更新
- `scripts/backtest/generate-strategy-reference.mjs`
  - staged 実装を採用する場合のみ、definition doc との役割分担が明確になるよう確認・最小調整
- `src/core/campaign-report.js`
  - rich report / latest summary の整合確認で必要最小限の修正がある場合のみ対象

### 作成予定

- `docs/research/strategy/theme-momentum-definition.md`
  - `theme-signal-observation-round6_2015_2025.md` と `theme-strategy-shortlist-round6_2015_2025.md` を整理し、
    **「テーマ投資でモメンタムのある銘柄」とは何か**を再利用しやすい形でまとめる手書き文書
- `docs/working-memory/session-logs/<task-name>_YYYYMMDD_HHMM.md`
  - 今回の棚卸し、判断、push 内容を記録する最新 session log

### 削除または巻き戻し候補

- `docs/research/results/night-batch/bundle-foreground-state.json`
- `docs/research/results/night-batch/detached-production-state.json`
  - 生成状態ファイルであり、意図した更新か accidental dirty かを判定したうえで **commit するか restore するか**を決める
- `src/core/market-intel.js`
- `tests/market-intel.test.js`
- `package.json` の unstaged 差分
  - 今回タスクの主線と無関係なら restore して working tree clean 化の対象にする

## 実装内容

### 1. 未コミット変更の監査と系統分離

- `git status --porcelain=v2` と staged / unstaged diff を使い、変更を
  - **night batch 文書生成系**
  - **market-intel follow-up 系**
  - **生成状態ファイル**
  に分類する
- 直近 commit と completed exec-plan を照合し、
  - staged 変更が `documentation-governance-and-report-template-refresh_20260415_1200.md` の未完了残件か
  - unstaged 変更が別タスク由来か
  を推定する
- その結果に応じて、
  - 今回まとめて push する
  - 一部は restore して除外する
  - 必要なら関連変更を 2 commit に分ける
  のどれが安全かを決める

### 2. テーマ投資モメンタム定義文書の再配置

- 既存の定義 source として、
  - `docs/research/archive/theme-signal-observation-round6_2015_2025.md`
  - `docs/research/archive/theme-strategy-shortlist-round6_2015_2025.md`
  - `docs/exec-plans/completed/round6-theme-trend-research_20260405_0603.md`
  を使う
- 生成物ではなく **手書き・安定参照先**として `docs/research/strategy/` 配下に definition doc を作る
- `README.md` / `docs/research/strategy/README.md` / `docs/explain-forhuman.md` / `docs/research/latest/README.md` から辿れるようにする

### 3. README と docs 導線の最適化

- repo の現在像を、以下の軸で整理する
  - repo の入口
  - latest research handoff の入口
  - latest main summary の入口
  - strategy / symbol reference の入口
  - raw artifact の入口
  - session log / reports の役割
- README を「巨大 runbook」にせず、**入口と日常運用の最小限**に保つ
- `docs/DOCUMENTATION_SYSTEM.md` と `docs/explain-forhuman.md` には README の補助線としての役割だけを持たせる

### 4. 必要なら staged の文書生成実装を完結させる

- staged 変更が妥当なら、rich report / strategy reference / latest summary 生成の整合を点検する
- docs routing の変更に合わせて generator 由来の導線や test を最小更新する
- 逆に今回 push すべきでないと判断した staged 変更があれば、restore も選択肢に入れる

### 5. session log・commit・push・clean 化

- 実施内容、残した変更、除外した変更、判断根拠を session log に記録する
- exec-plan を `docs/exec-plans/completed/` へ移したうえで Conventional Commit で commit
- `main` へ push し、`git status --short` が clean であることを確認する

## 影響範囲

### 直接影響

- docs の入口と読む順番
- latest summary / strategy reference の見つけやすさ
- session log と docs の保守ルール
- 必要に応じて night batch の generated doc 出力経路

### 間接影響

- `npm test` の対象ファイル群
- `tests/repo-layout.test.js` / `tests/night-batch.test.js` / `tests/windows-run-night-batch-self-hosted.test.js` が前提とする docs 構成
- 将来の調査で「テーマ投資の判断基準」を再利用するしやすさ

### 影響しない想定

- TradingView / CDP の実行ロジック本体
- backtest の計算ロジック
- Yahoo Finance / market data の取得仕様（今回 market-intel 変更を除外する場合）
- 過去 archive docs の全面書き換え

## Out of Scope

- `market-intel` の新機能自体をこのタスクで完成させること
- backtest 戦略ロジックの見直し
- archive 配下の古い研究文書を全面リライトすること
- 新しい coverage ツールや lint ツールの導入

## テスト方針（RED → GREEN → REFACTOR）

### RED

- 先に docs routing / generated doc / latest summary に関わる既存 test を失敗させる
  - `tests/repo-layout.test.js`
  - `tests/night-batch.test.js`
  - `tests/windows-run-night-batch-self-hosted.test.js`（必要時）
- definition doc を新設する場合は、repo layout / docs entrypoint の期待値をテストへ追加して失敗を確認する
- staged の generator 系変更を採用する場合は、既存追加 test
  - `tests/generate-rich-report.test.js`
  - `tests/generate-strategy-reference.test.js`
  を起点に失敗箇所を把握する

### GREEN

- docs routing と definition doc を最小実装で通す
- 必要な generator / latest summary / README 更新で既存 test を通す
- push 対象外の dirty 変更は restore し、clean に戻す

### REFACTOR

- README / DOCUMENTATION_SYSTEM / explain-forhuman / strategy README の重複文言を整理
- definition doc と generated reference の責務を明確化
- staged / unstaged の混線を解消し、commit 単位を読みやすくする

## 実行する既存テスト・検証コマンド

- 変更前のベースライン把握
  - `npm test`
- docs / latest summary / strategy reference に近い focused 実行
  - `node --test tests/generate-rich-report.test.js tests/generate-strategy-reference.test.js tests/night-batch.test.js tests/repo-layout.test.js tests/windows-run-night-batch-self-hosted.test.js`
- `market-intel` を push 対象に残す場合のみ
  - `node --test tests/market-intel.test.js`
- working tree / push 前確認
  - `git --no-pager status --short`
  - `git --no-pager diff --stat`
- 必要に応じた dry-run 確認
  - `python3 python/night_batch.py report --dry-run --us docs/research/results/us.json --jp docs/research/results/jp.json --out docs/research/results/report.md`

## カバレッジ方針

- repo には coverage 専用 script が見当たらないため、**80% の数値的な機械確認は現行コマンドでは不可**
- そのため今回は
  - touched-path の unit / integration test を重点実行
  - docs routing と generator 接続の主要分岐を既存 test で保護
 する形で **80% 以上相当の touched-path coverage** を目標にする

## リスク

- staged と unstaged が別タスク由来なら、安易にまとめて push すると unrelated change を main に混ぜる
- `package.json` の mixed diff を雑に扱うと test script の漏れや重複が起きる
- 生成物と手書き文書の境界が曖昧だと、次回以降また定義文書が埋もれる
- README の情報量が増えすぎると入口として読みにくくなる
- state JSON を commit すべきか restore すべきかの判断を誤ると、再現性か clean 化のどちらかを損なう

## 未確定事項

- staged の generator 系変更を **今回そのまま完成させて push するべきか**、または一部 restore して docs 導線だけに絞るべきか
- unstaged の `market-intel` 差分が、ユーザー依頼の「未コミット変更の調査対象」として **別 commit で救うべき変更**か、単に除外すべきか
- `bundle-foreground-state.json` / `detached-production-state.json` が最新運用の正しい state 更新なのか、一時的な dirty なのか

## 実装ステップ

- [ ] `git status` / staged diff / unstaged diff / 直近 completed plan を突き合わせ、未コミット変更を 3 系統（文書生成 / market-intel / state file）に分類する
- [ ] 各差分について「このタスクで push する / restore する / 別 commit に分ける」の判断方針を確定する
- [ ] `docs/research/archive/theme-signal-observation-round6_2015_2025.md` を主 source に、definition doc の骨子を確定する
- [ ] RED: docs routing / definition doc 導線に必要な test 期待値を追加・更新して失敗を確認する
- [ ] GREEN: `docs/research/strategy/theme-momentum-definition.md` を作成し、README / strategy README / explain-forhuman / latest README へ導線を追加する
- [ ] GREEN: README と `docs/DOCUMENTATION_SYSTEM.md` を現在の project state に合わせて最小更新する
- [ ] GREEN: staged の generator 系変更を採用する場合、`python/night_batch.py` / generator script / 関連 test を必要最小限で整合させる
- [ ] GREEN: push 対象外の unstaged 変更と不要な state file 更新を restore し、working tree を整理する
- [ ] REFACTOR: wording 重複と docs 導線の冗長さを削る
- [ ] `npm test` と focused test を実行し、必要なら dry-run で生成系の配線を確認する
- [ ] session log を `docs/working-memory/session-logs/` に保存し、既存 top-level log を `archive/` へ移す
- [ ] exec-plan を `docs/exec-plans/completed/` へ移動し、Conventional Commit + push + clean status を確認する

## 完了条件

- 未コミット変更の由来と扱い方針が説明可能になっている
- push すべき変更だけが main に反映され、working tree が clean になっている
- テーマ投資モメンタム定義文書が見つけやすい stable path に置かれ、主要入口から辿れる
- README と docs 導線が現状 project state と一致している
- session log が保存され、関連 test / 検証コマンドが通っている
