# Exec Plan: consolidate-next-strategies-and-session-log_20260411_0816

## 背景 / 目的

ユーザーは現在バックテスト実行中であり、**次の戦略候補を今の run を壊さず整理・登録したい**。  
会話ではすでに以下の戦略群が出ている。

- 大会優勝者ツイート由来の **SMC 系短期裁量仮説**
- **RSI14**
- **VIX 高時のみ投資**
- **VIX + RSI14**
- shibainu_fx 投稿由来の **グランビル③/⑧**
- TradingView script `REM BB Pullback Rider` 由来の **MTF BB Pullback**
- Ren1904fx 投稿由来の **連続陽線 / 連続陰線 + BB タッチ反発**

また、`README.md` と直近の documentation policy では、**外部資料の参照は `docs/references/design-ref-llms.md` に記録すること**、および **active detached run 中に live strategy ファイルを編集しないこと** が明示されている。  
`config/backtest/strategy-presets.json` や builder 実装は live strategy / backtest 実行面に影響しうるため、現在の run が継続中である前提では **docs/research 側で「次の戦略」として登録する** のが最も安全。

この plan では、**会話で出た戦略群を durable な research 資産として統合し、外部資料台帳・session log・必要最小限の docs 導線を更新した上で push する** ところまでを扱う。  
preset / builder 拡張は別 plan に切り出す。

---

## 変更・作成するファイル

### 作成
- `docs/exec-plans/active/consolidate-next-strategies-and-session-log_20260411_0816.md`
- `docs/research/next-strategy-candidates-integrated_20260411_1843.md`
- `docs/working-memory/session-logs/next-strategy-candidates-docs-registration_20260411_1843.md`

### 更新候補
- `docs/references/design-ref-llms.md`
- `docs/DOCUMENTATION_SYSTEM.md`
- `README.md`

### 参照のみ（原則変更しない）
- `docs/research/theme-strategy-shortlist-round8_2015_2025.md`
- `docs/research/theme-strategy-shortlist-round9_2015_2025.md`
- `docs/working-memory/session-logs/next-strategy-update-policy_20260411_1323.md`
- `config/backtest/strategy-presets.json`
- `src/core/research-backtest.js`
- `src/core/preset-validation.js`
- `package.json`

### 削除予定
- なし

---

## スコープ

### In Scope
- Ren1904fx の戦略要約追加
- これまでの会話で出た戦略の統合整理
- docs/research 上での **「次の戦略」登録**
- 各戦略の
  - 出典
  - コアアイデア
  - 相場環境
  - 機械化しやすさ
  - 裁量依存度
  - 将来の preset 化難易度
  - 次に検証すべき観点
  の整理
- `docs/references/design-ref-llms.md` への外部参照記録
- `docs/working-memory/session-logs/` への session log 追加
- self-hosted runner / detached backtest の現況確認
- current backtest の可観測な部分結果の要約追記
- 必要最小限の docs 導線更新
- commit / push

### Out of Scope
- `config/backtest/strategy-presets.json` の更新
- `src/core/research-backtest.js` / `src/core/preset-validation.js` への builder 実装追加
- active backtest 中の live strategy 切替
- 新規戦略の actual backtest 実行
- パラメータ最適化
- SMC / Ren / Granville / REM の自動売買化

---

## 実装内容と影響範囲

### 1. 次戦略ショートリスト文書の新規作成
- `docs/research/` 配下に、今回の会話から出た戦略候補を一箇所に集約する新規 doc を作る
- docs 上で **「次の戦略候補」** として優先順位を明示する
- 戦略ごとに「実装済み / 未実装 / docs-only / 要 builder 拡張」を明示し、誤解を防ぐ

**影響範囲**
- `docs/research/` の解釈資産が増える
- 次回セッションでそのまま backtest / preset 実装候補へ接続できる

### 2. 外部資料台帳の更新
- 参照した X 投稿と TradingView script を `docs/references/design-ref-llms.md` に記録する
- 理由 / 活かし方 / 採用したもの / 採用しなかったものを残す

**影響範囲**
- 外部調査の再追跡性が上がる

### 3. session log の追加
- 今回の判断経緯、特に
  - docs 登録を本線にした理由
  - active run 中に live strategy を触らない判断
  - 今後の preset 化の切り出し方
  を session log に残す

**影響範囲**
- `docs/working-memory/session-logs/` に今後の handoff 材料が増える

### 4. 必要なら docs 導線を更新
- 新規 research doc を後から見つけやすくするため、必要最小限で `docs/DOCUMENTATION_SYSTEM.md` か `README.md` の導線を補う
- ただし入口更新は **本当に discoverability が不足する場合のみ**

**影響範囲**
- docs の入口導線のみ

### 5. plan 完了後の commit / push
- 実装完了後は exec plan を `docs/exec-plans/completed/` へ移す
- Conventional Commit で commit し、push する

**影響範囲**
- docs と履歴のみ

---

## 既存 active plan との非重複方針

現在の active plan は night-batch / self-hosted runner 系であり、

- `docs/exec-plans/active/investigate-night-batch-self-hosted-queued_20260410_2307.md`
- `docs/exec-plans/active/rerun-night-batch-after-run-cmd_20260410_1714.md`
- `docs/exec-plans/active/run-night-batch-self-hosted-workflow-dispatch_20260411_0025.md`

が存在する。  
本 plan は **research / documentation / session-log 更新** のみを扱い、

- runner 設定
- workflow rerun
- detached 実行制御
- self-hosted 運用変更

には触れないため、**機能境界は非重複** とする。

---

## 「次の戦略として登録」の解釈

### 推奨解釈
- **第一義:** `docs/research/` 上で「次に検討・実装・検証する戦略候補」として登録する
- **第二義（将来）:** builder / preset として実装可能な仕様へ落とし込む

### 今回の判断
- **docs 登録を本線**
- preset / builder 拡張は **別 plan**

### 理由
1. ユーザーは現在バックテスト中
2. `config/backtest/strategy-presets.json` は live strategy 関連ファイル
3. Ren / Granville / REM / SMC は現状 builder 未対応の可能性が高い
4. まずは候補群を durable に整理し、その後に機械化へ進む方が安全

---

## TDD / テスト戦略（RED → GREEN → REFACTOR）

今回は docs 主体の変更だが、変更方針は明示する。

### RED
- 更新前に不足している状態を固定する
  - Ren 戦略が repo docs に未記録
  - 会話ベースの次戦略 shortlist が未作成
  - 外部資料台帳に今回の参照元が未記録
  - session log に今回の判断経緯が未記録
- docs assertion を新設するほどではない場合、RED は上記ギャップの明文化で扱う

### GREEN
- research doc / references 台帳 / session log を最小限の変更で追加・更新する
- docs 上で「未実装」「要 builder 拡張」を明示する
- 必要なら docs 導線を最低限更新する

### REFACTOR
- 戦略分類・見出し・優先順位の表現を統一する
- 将来の preset 化に必要な観点を揃える
- 重複記述を減らす

### カバレッジ方針
- docs-only 変更のため、コードカバレッジ 80% 目標は **本番コード変更が発生しない限り対象外**
- 既存 test command の正常性確認を優先する

---

## 検証コマンド

既存コマンドのみ使用する。

### 基本
```bash
npm test
```

### 必要に応じて
```bash
npm run test:e2e
npm run test:all
```

### docs-only 変更での確認観点
- 新規 research doc から戦略候補の全体像が追えること
- `docs/references/design-ref-llms.md` に参照元が残っていること
- session log に判断経緯が残っていること
- docs が「実装済み preset」と誤読されないこと

---

## リスク

- Ren の戦略が経験則ベースで、厳密なルールへ直結しない
- SMC 仮説は完全特定でなく、断定的記述が危険
- docs 上の「次の戦略」が実装済みと誤認される可能性
- active run 中に live strategy 編集へ踏み込むと運用リスクが高い
- `docs/DOCUMENTATION_SYSTEM.md` を更新しすぎると docs 責務が広がる

### リスク対策
- 各戦略に **確度 / 裁量依存度 / 実装状態** を明示する
- 「docs 登録」と「preset 実装」を明確に切り分ける
- live strategy 関連ファイルには触れない

---

## チェックボックス形式のタスクリスト

- [x] `docs/DOCUMENTATION_SYSTEM.md` と `README.md` を基準に、配置先と導線方針を最終確認する
- [x] 既存 active plan と非重複であることを plan に固定する
- [x] 会話で出た全戦略候補を一覧化し、出典・要点・機械化しやすさ・裁量依存度を整理する
- [x] Ren1904fx の BB 連続足反発戦略を候補群へ追加する
- [x] `docs/research/next-strategy-candidates-integrated_20260411_1843.md` を作成する
- [x] 新規 research doc 内で「次の戦略候補」と優先順位を明示する
- [x] 各戦略に「未実装 / docs-only / 要 builder 拡張」などの実装状態を付与する
- [x] `docs/references/design-ref-llms.md` に X 投稿 / TradingView script の参照記録を追記する
- [x] `docs/working-memory/session-logs/next-strategy-candidates-docs-registration_20260411_1843.md` を追加する
- [x] self-hosted runner と detached production の稼働状況を確認する
- [x] current backtest の可観測な部分結果を session log に要約する
- [x] discoverability が不足する場合のみ `docs/DOCUMENTATION_SYSTEM.md` または `README.md` を最小更新する
- [x] docs-only 変更として live strategy に影響しないことを再確認する
- [x] 既存 validation command を実行する
- [ ] 実装完了後に exec plan を `docs/exec-plans/completed/` へ移す
- [ ] Conventional Commit で commit し、push する

---

## 将来拡張（別 plan）

将来的に次を別 plan として扱う。

- Ren / Granville / REM / SMC の builder 設計
- `src/core/research-backtest.js` への builder 追加
- `src/core/preset-validation.js` への validation 追加
- `config/backtest/strategy-presets.json` への登録
- 対応テスト追加

今回はそこまで入れない。
