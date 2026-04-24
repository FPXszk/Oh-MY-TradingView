# DOCUMENTATION_SYSTEM

## 目的

- このドキュメントは、このリポジトリの知識ベースを**どの順番で読むべきか**、**どこに何を書くべきか**、**どうやって鮮度を保つか**を定義する入口です。
- 大きな単一マニュアルではなく、索引から必要な深さへ進む**段階的開示**を前提にします。

## 読み始める順番

1. [README.md](../README.md) — プロジェクト全体の概要、MCP tools / CLI 一覧、セットアップ手順
2. [docs/research/artifacts-backtest-scoreboards.md](research/artifacts-backtest-scoreboards.md) — artifact に保存された campaign ごとの最新ランキング表
3. [docs/research/archive/main-backtest-current-summary.md](research/archive/main-backtest-current-summary.md) — 今の main backtest の結論と方針
4. [docs/strategy/current-strategy-reference.md](strategy/current-strategy-reference.md) — 戦略カタログの人間向け入口（lifecycle / score / parameters）
5. [docs/strategy/theme-momentum-definition.md](strategy/theme-momentum-definition.md) — テーマ投資で「モメンタムのある銘柄」をどう定義するか
6. [docs/exec-plans/active/](exec-plans/active/) — 現在進行中の実装計画
7. [docs/explain-forhuman.md](explain-forhuman.md) — night batch の流れを人間向けに補足する文書

## セッション記憶が不足したときの参照順

- セッション内の記憶が十分な間は `docs/sessions/` を参照しません。
- 記憶が不足したときだけ、会話ログ全文ではなく要約済みの知識構造を優先して参照します。
- 必ず「上位要約 → 下位詳細」の順で辿り、`docs/sessions/` は最終手段に限定します。

1. [docs/exec-plans/active/](exec-plans/active/) — 現在進行中の実装計画
2. [docs/research/artifacts-backtest-scoreboards.md](research/artifacts-backtest-scoreboards.md) — 最新スコアボード
3. [docs/research/archive/main-backtest-current-summary.md](research/archive/main-backtest-current-summary.md) — main backtest の結論
4. [docs/strategy/current-strategy-reference.md](strategy/current-strategy-reference.md) — 戦略・銘柄リファレンス
5. [docs/sessions/](sessions/) — 直近の判断経緯（最終手段）

## 正式な記録先

- ルート:
  - [README.md](../README.md) — プロジェクト全体の概要・セットアップ・運用手順の正本
- `docs/`:
  - [explain-forhuman.md](explain-forhuman.md) — night batch フローの人間向け補足
  - `exec-plans/` — 実装計画
    - [exec-plans/active/](exec-plans/active/) — 進行中の実装計画
    - [exec-plans/completed/](exec-plans/completed/) — 完了済みの実装計画
  - `references/` — 再利用する参照物
    - [references/pine/](references/pine/) — Pine source snapshot
    - [references/design-ref-llms.md](references/design-ref-llms.md) — 外部調査台帳
  - `reports/` — incident / postmortem
    - [reports/archive/](reports/archive/) — 過去のレポート
  - `research/` — current research docs（manifest.json で keep-set を管理）
    - [research/archive/](research/archive/) — 過去の handoff / research doc
    - [research/archive/retired/](research/archive/retired/) — retired preset の説明と退避先
  - `sessions/` — 直近の判断ログ
    - [sessions/archive/](sessions/archive/) — 過去の判断ログ
  - `strategy/` — 戦略・銘柄の人間向け説明
    - [strategy/current-strategy-reference.md](strategy/current-strategy-reference.md) — 戦略カタログ入口
    - [strategy/current-symbol-reference.md](strategy/current-symbol-reference.md) — 銘柄リファレンス
    - [strategy/theme-momentum-definition.md](strategy/theme-momentum-definition.md) — テーマ投資の判断基準
- `artifacts/` — run ごとの生成物（night batch / campaign / runtime verification）
  - [artifacts/campaigns/](../artifacts/campaigns/) — campaign ごとの backtest 結果

## 鮮度維持の仕組み

- `scripts/docs/archive-stale-latest.mjs`
  - `docs/research/manifest.json` の `keep` に列挙されていない doc を `docs/research/archive/` へ退避する
- `tests/repo-layout.test.js`
  - `docs/research/manifest.json` が実在するファイルのみを列挙しているか
  - live strategy-presets / campaigns / universes の整合性
  - session ログ・exec-plans の配置ルール
- `npm test` で上記テストが自動実行される

## 運用ルール

- path を変えたら `README.md`、この文書、関連テストを**同時に**直す
- `docs/research/` の鮮度は `manifest.json` の `keep` で管理し、outdated になったものは `docs/research/archive/` へ移す
- `docs/sessions/` の古いものは `docs/sessions/archive/` へ移す
- 外部資料を参照したら `docs/references/design-ref-llms.md` に必ず記録する
- 戦略を追加・変更したら `config/backtest/strategy-presets.json` と `docs/strategy/current-strategy-reference.md` を同時に更新する
- retired 戦略は `docs/research/archive/retired/retired-strategy-presets.json` へ退避する
- 実装計画は `docs/exec-plans/active/` に置き、完了後に `docs/exec-plans/completed/` へ移動する
