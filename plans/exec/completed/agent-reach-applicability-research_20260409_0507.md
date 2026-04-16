# Agent-Reach / 類似事例 調査・Oh-MY-TradingView 適用可能性分析計画

## 1. 問題設定と提案アプローチ

### 問題設定

Oh-MY-TradingView は現在、TradingView Desktop + CDP を主軸に、価格取得・Pine 操作・バックテスト・market 系ツールを提供している。  
今回の研究課題は、外部リポジトリ `Panniantong/Agent-Reach` を起点に、AI に **Twitter の投稿、掲示板、動画コメント、コミュニティ反応などを横断的に観測させる「ネットを広く見せる目」** を持たせる用途に使えるかを評価し、同様事例も deep research したうえで、Oh-MY-TradingView に接続可能な有用要素を整理することである。

### 提案アプローチ

本調査は「単なる機能紹介」で終わらせず、以下の 3 層で比較・整理する。

1. **Agent-Reach 自体の実態把握**
   - 何を収集できるか
   - どの upstream を対象にしているか
   - どの程度 “広く見る目” に向くか
   - caveat / rate limit / 利用制約 / 保守性

2. **類似事例の比較研究**
   - SNS / 掲示板 / 動画 / コミュニティ投稿を扱う OSS / agentic system / scraper / MCP / CLI 事例を調査
   - 収集面、正規化面、要約面、信頼性面、運用面を比較

3. **Oh-MY-TradingView への接続設計**
   - 既存の `market_*` / CLI / MCP / docs 導線にどう載せるか
   - 研究資料として留めるべきか、将来の tool 候補にするべきか
   - low-risk / medium-risk / high-risk の導入候補に分けて提案する

## 2. 変更 / 作成 / 削除するファイル一覧

### 作成

- `docs/exec-plans/active/agent-reach-applicability-research_20260409_0507.md`
- `docs/research/agent-reach-and-broad-web-observability-applicability_YYYYMMDD_HHMM.md`

### 更新

- `docs/references/design-ref-llms.md`
- `docs/DOCUMENTATION_SYSTEM.md`（新規 research doc の導線追加が必要な場合）
- `README.md`（研究成果への入口追加が必要な場合のみ）

### 削除

- なし

### コード変更

- **今回の計画時点ではコード変更は不要想定**
- 研究結果次第で後続実装計画を別 exec-plan として切り出す

## 3. 影響範囲

- **ドキュメント**
  - 外部比較調査の research doc 追加
  - 参照資料台帳の更新
  - 必要に応じた docs 導線整理

- **将来の設計判断**
  - Oh-MY-TradingView に social / community / sentiment / discussion intelligence 層を足すかどうかの判断材料になる
  - `market_*` 拡張、別 MCP server、別プロセス、外部 research pipeline などの候補整理に影響する

- **運用方針**
  - 利用規約、rate limit、取得安定性、ノイズ混入、真偽判定難易度などの制約認識に影響する

- **既存コード**
  - 今回は直接変更しない想定
  - ただし後続の実装優先順位に影響する

## 4. チェックボックス形式の実施ステップ

- [ ] `Panniantong/Agent-Reach` の README、`llms.txt`、主要ディレクトリ（`agent_reach/`, `config/`, `docs/`, `scripts/`, `tests/`）を読み、対象 upstream・取得方式・出力形式・制約を整理する
- [ ] 既知の upstream caveat 更新（twitter-cli / Reddit / Bilibili / YouTube など）を踏まえ、**「ネットを広く見せる目」用途での強みと限界** を抽出する
- [ ] Agent-Reach の比較軸を定義する
  - 収集対象の広さ
  - upstream 多様性
  - データ正規化しやすさ
  - AI への渡しやすさ
  - 保守性
  - rate limit / 利用規約リスク
  - 再現性 / テスト可能性
- [ ] 類似事例を deep research し、少なくとも以下の系統で候補を集める
  - SNS / 掲示板 / 動画コミュニティ収集 OSS
  - MCP / agent 向け web observation 系ツール
  - sentiment / social listening / news aggregation 系 OSS
  - discussion mining / forum scraping / multi-source monitoring 系事例
- [ ] 類似事例ごとに、Agent-Reach と同じ比較軸で要約し、**何が優れていて何が弱いか** を明記する
- [ ] ローカル repo の現状を確認し、Oh-MY-TradingView で既にある `market_*` 機能、research docs、reference 台帳、CLI/MCP 公開面との接続点を整理する
- [ ] Agent-Reach / 類似事例 / 現行 repo を横並び比較し、以下の観点で適用可能性を判断する
  - すぐ research workflow に活かせるもの
  - docs / analysis のみで採用すべきもの
  - 将来ツール化候補
  - 本 repo に不向きなもの
- [ ] Oh-MY-TradingView 向けに、候補を優先度付きで整理する
  - P0: 研究・運用にすぐ役立つ
  - P1: 小規模実装で取り込める
  - P2: 別プロセス / 別 MCP / 別 repo 前提
  - Reject: 採用しない
- [ ] 調査結果を `docs/research/agent-reach-and-broad-web-observability-applicability_YYYYMMDD_HHMM.md` にまとめる
- [ ] 参照した外部資料を `docs/references/design-ref-llms.md` に理由・採用判断付きで追記する
- [ ] 必要なら `docs/DOCUMENTATION_SYSTEM.md` と `README.md` に新規 research doc への導線を追加する
- [ ] 調査完了条件を満たしているか確認し、後続実装が必要なら **別 exec-plan に分離すべき実装候補** を明示する

## 5. スコープ外

- Agent-Reach の fork / vendor / 実コード導入
- SNS / 掲示板収集機能の本 repo への実装
- Twitter / Reddit / YouTube / Bilibili などの認証設定や実運用構築
- 新規 external API key 導入
- 常時監視ジョブ、DB 保存基盤、キュー、ダッシュボード実装
- sentiment 推論モデルの新規導入
- 既存 `market_*` ツールの仕様変更
- 調査を超えた UI / CLI / MCP 機能追加

## 6. テスト / 検証方針

研究タスクのため、完了判定はコードテストではなく **調査の完全性・比較可能性・適用判断の明確さ** を基準にする。

### 完了条件

- `Agent-Reach` について以下が明文化されている
  - 何を集めるツールか
  - どの upstream を扱うか
  - “ネットを広く見せる目” 用途への適性
  - 制約 / caveat / 運用上の注意点

- 類似事例が複数提示され、**同一比較軸** で整理されている

- Oh-MY-TradingView に対して以下が明文化されている
  - すぐ使える研究上の価値
  - 実装候補
  - 実装しないほうがよい候補
  - 導入するならどの形（docs / research pipeline / CLI / MCP / 別 repo）が妥当か

- `docs/references/design-ref-llms.md` に参照資料が記録されている

- 必要に応じて docs 導線が更新されている

### 確認方法

- research doc をレビューして、比較表または比較セクションだけで意思決定できる状態か確認する
- 参照資料台帳から、外部ソースの出所が追えることを確認する
- 結論が「採用候補」「保留」「不採用」に分かれていることを確認する

## 7. リスク

- **外部情報の鮮度リスク**  
  upstream caveat や利用制約は変化しやすく、短期間で陳腐化する可能性がある

- **利用規約 / レート制限リスク**  
  “使える” ことと “安定運用できる” ことは別であり、研究で好印象でも本番運用に不向きな場合がある

- **ノイズ混入リスク**  
  SNS / 掲示板系はスパム、皮肉、誤情報、重複投稿が多く、単純集約では品質が落ちる

- **Oh-MY-TradingView との責務ずれ**  
  現在の repo は TradingView Desktop / market data / research docs が主軸のため、social listening を本線に入れすぎると責務が拡散する

- **比較の不公平リスク**  
  Agent-Reach と他事例で成熟度・対象 upstream・思想が異なるため、比較軸を明示しないと評価がぶれる

- **実装誘導の早まり**  
  面白い事例が見つかっても、今回のステップは調査計画までであり、導入実装は別計画に分ける必要がある

## 想定成果物

- Agent-Reach の用途適性評価
- 類似事例の比較調査
- Oh-MY-TradingView への接続可能な有用要素の優先度付きリスト
- 参照資料台帳更新
- 必要に応じた docs 導線更新
- 後続実装のための独立した判断材料
