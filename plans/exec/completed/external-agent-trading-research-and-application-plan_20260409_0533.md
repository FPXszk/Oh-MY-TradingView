# external-agent-trading-research-and-application-plan_20260409_0533

## 1. 問題設定とアプローチ

### 問題設定

Oh-MY-TradingView は **TradingView Desktop + CDP を主軸**にしつつ、**non-CDP の market-intel layer** も持つ。  
今回の依頼は、指定された外部 repo / site を deep research し、それぞれが「何か」を説明したうえで、**この repo に適用できる有用要素**を整理し、最終的に **docs/research/**、**docs/references/design-ref-llms.md**、**docs/working-memory/session-logs/** に成果を残し、**commit / push** まで完了させることである。  
ただし、**本 exec-plan は PLAN ステップのみ**であり、調査・ドキュメント作成・commit/push はまだ開始しない。

### 提案アプローチ

本タスクは「外部事例紹介」ではなく、以下の 4 層で進める。

1. **対象ごとの実態把握**
   - 何をする repo / site か
   - どの技術要素・アーキテクチャ・運用前提を持つか
   - どこまでが public / OSS / 実用可能領域か

2. **比較軸を固定した横並び評価**
   - TradingView Desktop + CDP 主軸との親和性
   - non-CDP market-intel layer への接続余地
   - browser automation / agent orchestration / research workflow / signal synthesis / execution automation のどこに効くか
   - 導入コスト、運用リスク、依存性、再現性

3. **Oh-MY-TradingView への接続設計**
   - docs-only で採用すべき知見
   - 小規模追加で活かせる設計観点
   - 後続の別 exec-plan が必要な実装候補
   - 採用しないほうがよい要素

4. **ドキュメント統治**
   - 外部比較調査を `docs/research/` に残す
   - 参照資料を `docs/references/design-ref-llms.md` に台帳形式で記録する
   - セッションの判断・作業経緯を `docs/working-memory/session-logs/` に追記する

---

## 2. 変更 / 作成 / 削除するファイル

### 作成

- `docs/exec-plans/active/external-agent-trading-research-and-application-plan_20260409_0533.md`
- `docs/research/external-agent-trading-landscape-and-oh-my-tradingview-applicability_YYYYMMDD_HHMM.md`
- `docs/working-memory/session-logs/external-agent-trading-research_YYYYMMDD_HHMM.md`

### 更新

- `docs/references/design-ref-llms.md`
- `docs/DOCUMENTATION_SYSTEM.md`（新規 research doc への導線追加が必要な場合のみ）
- `README.md`（研究成果への入口追加が必要な場合のみ）

### 削除

- なし

### コード変更

- **今回の主目的は research / documentation であり、コード変更は不要の可能性が高い**
- ただし、調査結果を repo 内の既存 docs 導線に結び付けるための **最小限の文書更新** は発生しうる
- 調査中に実装案が生じても、**本タスク内で安易にコード変更へ進まず、必要なら別 exec-plan に分離**する

---

## 3. 影響範囲

- **調査資産**
  - 外部 repo / site の比較結果が durable な research asset として残る
- **設計判断**
  - CDP 主軸を維持したまま何を拡張すべきかの判断材料になる
  - non-CDP market-intel layer の将来拡張候補整理に影響する
- **ドキュメント運用**
  - references 台帳と session log の記録粒度・継続運用に影響する
- **将来実装**
  - browser agent、autotrade、multi-agent fund、execution handoff、research workflow 強化のどれを後続計画に切るかに影響する
- **既存コード**
  - 原則として直接のコード影響は想定しない
  - 影響がある場合も docs 導線更新までに留める想定

---

## 4. チェックボックス形式の実施ステップ

### A. 事前確認・比較軸定義

- [ ] 既存の `docs/exec-plans/active/` を確認し、進行中計画との重複や競合がないことを確認する
- [ ] 現行 repo の主軸を再確認する
  - TradingView Desktop + CDP
  - non-CDP market-intel layer
  - docs/research の蓄積方針
- [ ] 比較軸を固定する
  - 何を解決する対象か
  - 主要構成要素
  - UI/browser 依存度
  - market / research / execution のどこに効くか
  - この repo への接続ポイント
  - 導入コスト
  - リスク / 採用しない理由
- [ ] 調査結果の出力フォーマットを決める
  - 対象説明
  - 確認事項
  - 比較結果
  - Oh-MY-TradingView への接続案
  - 採用 / 保留 / 不採用

### B. 対象別 deep research 計画

#### 1. `vercel-labs/agent-browser`

- [ ] 何を確認するか
  - browser agent として何を行う repo か
  - Playwright / browser automation / agent loop / tool use の構成
  - 認証済みサイト操作、複雑 UI 操作、情報抽出の実力
  - 実験 repo か、実運用前提か
- [ ] どう比較するか
  - TradingView Desktop + CDP と役割が重なるのか、補完なのか
  - browser-use 系や一般 browser automation と比べた強み / 弱み
  - agentic browsing が本 repo に必要な場面を限定できるか
- [ ] この repo にどう接続するか
  - CDP 主軸の代替ではなく、**認証壁・複雑 UI・補助的 web research の fallback** として使えるかを評価する
  - TradingView 本体操作ではなく、周辺 web 情報収集や補助 UI 操作への応用余地を整理する

#### 2. `virattt/ai-hedge-fund`

- [ ] 何を確認するか
  - multi-agent hedge-fund simulator / research pipeline として何を実現しているか
  - analyst / PM / risk / execution などの役割分担
  - data source、推論フロー、portfolio decision の構造
  - 実売買向けか、research / simulation 向けか
- [ ] どう比較するか
  - 現行 repo の market-intel layer とどこが重なり、どこが不足しているか
  - 単一ツール型より multi-agent orchestration が有利になる範囲
  - TradingView Strategy Tester と補完関係を作れるか
- [ ] この repo にどう接続するか
  - **signal synthesis / thesis generation / analyst-style explanation layer** として活かせるかを整理する
  - 実運用売買エンジンとしてではなく、research companion としての接続可能性を優先評価する

#### 3. `rv64m/autotrade`

- [ ] 何を確認するか
  - 自動売買の対象市場、接続先、execution model
  - シグナル生成と執行の責務分離
  - TradingView 連携の有無、あるいは broker / exchange 直結の構成
  - 安全装置、資金管理、監視、失敗時挙動
- [ ] どう比較するか
  - Oh-MY-TradingView が現在持つ強み（analysis / backtest / desktop automation）と比べて、execution 側に何があるか
  - 研究用 repo と実売買 automation の差分を整理する
- [ ] この repo にどう接続するか
  - 直接導入ではなく、**将来の execution handoff layer** の参考材料として扱う
  - alert → order routing / paper trading / broker abstraction を後続計画候補として整理する

#### 4. `hsliuping/TradingAgents-CN`

- [ ] 何を確認するか
  - TradingAgents とは何か、CN 版として何が追加・翻訳・拡張されているか
  - 複数 agent の役割、討議、意思決定フロー
  - 中国語圏 market / news / sentiment / data source 前提の有無
  - docs の整理度、再利用しやすい概念モデルの有無
- [ ] どう比較するか
  - `ai-hedge-fund` と比べて、議論型 agent 設計として何が違うか
  - 非実行系 research assistant としての強みを比較する
- [ ] この repo にどう接続するか
  - **market-intel layer の reasoning pattern** として採用可能かを評価する
  - 複数観点（technical / macro / news / sentiment）を統合する docs 設計や将来 agent 設計に接続する

#### 5. `vercel-labs`（公式確認 + org 横断調査）

- [ ] 何を確認するか
  - `vercel-labs` が Vercel 公式の実験 org と見なせる根拠
  - org 配下で agent / browser / AI SDK / research workflow に関連する有用 repo
  - 単発 demo なのか、再利用価値の高い実装パターンなのか
- [ ] どう比較するか
  - 既に本 repo が持つ CLI / MCP / docs 中心の運用に対して、Vercel Labs の強みが UI / demo / AI SDK / browser agent のどこにあるか比較する
  - repo ごとに「再利用できる設計」と「参考止まり」を分ける
- [ ] この repo にどう接続するか
  - agent-browser 以外にも有用な agent / tool / SDK / workflow 断片を抽出し、**research workflow・agent UX・tool surface 設計**への接続案を整理する
  - org 横断の結果は「採用候補 repo 一覧」として research doc にまとめる

#### 6. `mmt.gg`

- [ ] 何を確認するか
  - 何のサービスか
  - 「最近無料になったらしい」という前提の真偽
  - 何が無料化されたのか、制限は何か
  - market research / trading workflow / AI 活用上、何が実現できそうか
- [ ] どう比較するか
  - repo ベース OSS ではなく hosted service として、導入障壁・継続性・無料枠依存・ベンダーロックインを評価する
  - 本 repo のローカル主義 / docs 主体運用と整合するか比較する
- [ ] この repo にどう接続するか
  - 直接統合対象ではなく、**research input source / workflow augmentation / benchmark 対象**として価値があるかを整理する
  - 無料化が事実でも、継続性・再現性・自動化適性を別評価する

### C. 横断比較・repo への接続整理

- [ ] 6対象を同一比較軸で横並び比較する
- [ ] 各対象について以下を必ず明記する
  - これは何か
  - 何を確認したか
  - どう比較したか
  - Oh-MY-TradingView にどう接続できるか
  - 採用するもの / 採用しないもの
- [ ] Oh-MY-TradingView 向けに接続案を分類する
  - docs-only で取り込む知見
  - research workflow に足せるもの
  - non-CDP market-intel layer に関係するもの
  - CDP 主軸の補助としてのみ使うもの
  - 将来の別 repo / 別 MCP / 別 executor が妥当なもの
- [ ] 導入優先度を整理する
  - P0: すぐ research / docs に活かせる
  - P1: 小規模な将来実装候補
  - P2: 中長期の別計画候補
  - Reject: 本 repo に不向き

### D. ドキュメント化ルール

- [ ] `docs/research/external-agent-trading-landscape-and-oh-my-tradingview-applicability_YYYYMMDD_HHMM.md` を作成し、以下を含める
  - 調査対象一覧
  - 対象ごとの説明
  - 比較表
  - repo への適用可能性
  - 推奨アクション
  - 不採用判断
- [ ] `docs/references/design-ref-llms.md` に、**参照した資料ごとに必ず以下のテンプレートで追記**する
  - 番号：名前
  - URL
  - 参考にした理由
  - このプロジェクトにどう活かしたか
  - 採用したもの
  - 採用しなかったもの
- [ ] `docs/working-memory/session-logs/external-agent-trading-research_YYYYMMDD_HHMM.md` に、少なくとも以下を残す
  - セッションの目的
  - 調査対象
  - 比較軸
  - 主要所見
  - 採用 / 保留 / 不採用の判断
  - 次アクション候補
- [ ] 必要に応じて `docs/DOCUMENTATION_SYSTEM.md` と `README.md` に research doc への導線を追加する

### E. レビュー・終端フロー（commit / push まで含む）

- [ ] research doc / references / session log の整合性を確認する
- [ ] 調査結果から、実装候補がある場合は **別 exec-plan が必要** と明記する
- [ ] 変更差分をレビューし、不要な変更が混入していないことを確認する
- [ ] current plan を `docs/exec-plans/completed/` へ移動する
- [ ] Conventional Commits 形式で commit する
  - 例: `docs: add external trading agent research`
  - Co-authored-by trailer を付与する
- [ ] `gh` / git workflow に従って main へ push する
- [ ] push 後、最終的な成果物一覧と後続候補をまとめる
- [ ] その時点でユーザー確認待ちに移る

---

## 5. スコープ外

- 指定対象の fork / vendor / 大量コード移植
- 新規 agent / browser automation / autotrade 機能の実装
- broker / exchange / API key の設定
- 実取引の有効化
- 常駐サービス、DB、queue、監視基盤の導入
- 外部有料サービスへの本格依存を前提にした設計変更
- 調査途中で見つかった魅力的な OSS の無制限な横展開
- 本タスク内での大規模リファクタ
- docs 更新に直接不要なコード変更

---

## 6. 検証 / 完了条件

### 検証方針

本件は research / documentation タスクのため、コードテスト中心ではなく、**調査の完全性・比較可能性・接続判断の明確さ** で完了判定する。  
ただし docs 変更が発生した場合でも、既存の repo ルールや導線を壊していないことは確認する。

### 完了条件

- 指定 6 対象すべてについて、以下が明文化されている
  - 何か
  - 何を確認したか
  - どう比較したか
  - Oh-MY-TradingView にどう接続できるか
- `docs/research/` に比較調査ドキュメントが追加されている
- `docs/references/design-ref-llms.md` に参照資料が台帳形式で追記されている
- `docs/working-memory/session-logs/` にセッションログが残っている
- 必要なら docs 導線が更新されている
- 採用 / 保留 / 不採用が区別されている
- 後続実装が必要なものは別 exec-plan 候補として切り出されている
- 最終的に plan が `completed/` へ移動され、commit / push まで終わっている

### 確認方法

- research doc だけ読めば意思決定できる状態か確認する
- references 台帳から出典が追跡できるか確認する
- session log から調査判断の流れが再現できるか確認する
- `git --no-pager diff --check` で docs 差分に余計な崩れがないことを確認する
- docs-only で完了した場合は上記 diff 確認を最低限の validation とし、もし想定外にコード変更が入った場合は既存の検証コマンド（`npm test` など）を追加で実行する

### 想定 validation コマンド

- `git --no-pager diff --check`
- `git --no-pager status --short`
- 必要時のみ: `npm test`

---

## 7. リスク

- **調査対象の性格差**
  - OSS repo、org、hosted service が混在しており、単純比較が歪む可能性がある
- **鮮度リスク**
  - `mmt.gg` の無料化状況や org 配下 repo の状態は変化しやすい
- **公式性誤認リスク**
  - `vercel-labs` の「公式実験 org」としての扱いは根拠を示して確認する必要がある
- **実験 repo の過大評価**
  - demo / showcase を production-ready と誤認すると設計判断を誤る
- **本 repo の責務拡散**
  - browser agent、autotrade、multi-agent fund をそのまま本線に入れると repo の焦点がぼける
- **hosted service 依存**
  - `mmt.gg` のような外部サービスは再現性・継続性・自動化自由度に制約がある
- **実装先走りリスク**
  - 有用な知見が見つかっても、今回の段階では調査結果の整理までに留める必要がある
- **ドキュメント散逸リスク**
  - research doc、references、session log の3点が同期しないと後から追えなくなる

---

## 8. commit / push まで含む終端フロー

1. 調査完了後、`docs/research/` の比較ドキュメントを確定する  
2. 参照資料を `docs/references/design-ref-llms.md` にテンプレートどおり追記する  
3. セッション判断を `docs/working-memory/session-logs/` に追記する  
4. 必要なら `docs/DOCUMENTATION_SYSTEM.md` / `README.md` に導線を追加する  
5. 変更全体をレビューし、不要変更がないことを確認する  
6. 現在の exec-plan を `docs/exec-plans/completed/` に移動する  
7. Conventional Commits 形式で commit する  
8. commit message 末尾に以下を付ける  
   `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`  
9. main ブランチへ push する  
10. 最終成果物・採用判断・後続候補を要約して完了とする

---

## 9. 想定成果物

- 外部 6 対象の deep research 結果
- 対象ごとの「何か / 何を確認したか / どう比較したか / どう接続するか」の整理
- Oh-MY-TradingView に適用可能な有用要素の優先度付き一覧
- `docs/research/` の比較調査ドキュメント
- `docs/references/design-ref-llms.md` の参照台帳追記
- `docs/working-memory/session-logs/` のセッションログ
- 後続実装が必要な場合の分離方針
- commit / push まで含む完了可能な終端手順の明確化
