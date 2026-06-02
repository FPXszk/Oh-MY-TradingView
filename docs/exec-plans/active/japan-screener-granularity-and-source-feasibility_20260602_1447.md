# Exec-plan: japan-screener-granularity-and-source-feasibility_20260602_1447

## 概要

目的: 既存の米国株スクリーニング workflow と同等粒度、または日本株に適した代替粒度で **日本株版を成立させる実装計画** を作る。今回は **計画のみ** を対象とし、実装は行わない。

今回の事前確認で分かったこと:

- 日本株 workflow 自体は未着手ではなく、すでに `.github/workflows/daily-screener-japan.yml` が存在する
- 現行の日本版は `SCREENER_MARKET: japan`、`SCREENER_EXCHANGES: TSE`、`SCREENER_SYMBOL_ALLOWLIST_KEY: jpx-prime` で回る
- `src/core/fundamental-screener.js` は `market === 'japan'` 分岐を持ち、JP 専用 Phase2 profile も `src/core/sector-screening-profiles.js` に実装済み
- 一方で **US と同粒度ではない**
  - US 専用 theme taxonomy (`classifyUsTheme`, `getUsSectorThemeHierarchy`, `summarizeThemes`) しかなく、JP は `themeRanking` が空になる
  - US 向け `Phase2 中テーマ / 小テーマ / hierarchy` は JP では動かない
  - JP report は `Rule40` が常に `N/A`
- 現行 `docs/reports/screener/daily-ranking-jp.md` ではランキング自体は成立しているが、`FCF` / `P/FCF` / 一部 `EPS YoY` の欠損が多く、US ほど綺麗に列が埋まっていない
- みんかぶは現在も `人気テーマランキング` と個別テーマごとの `関連銘柄一覧` を公開しており、JP 独自のテーマ粒度補完 source として有望
- JPX 側は上場銘柄一覧や銘柄検索を提供しており、**ユニバース正規化の正本** として使いやすい

結論の先出し:

- **「日本株版は作れるか」には Yes**
- ただし **「米国株と同様の粒度をそのまま TradingView だけで取れるか」には No 寄り**
- 最も自然な方針は、**Phase1/Phase2 の broad screener は TradingView 維持**、**JP テーマ粒度だけ repo 独自 taxonomy + 日本株専用 external source で補う** こと

## 変更・作成候補ファイル

今回の step ではこの計画ファイルのみを追加する。

将来の実装候補ファイル:

| ファイル | 種別 | 役割 |
|---|---|---|
| `docs/exec-plans/active/japan-screener-granularity-and-source-feasibility_20260602_1447.md` | CREATE | 本計画 |
| `config/screener/theme-taxonomy-jp.json` | CREATE候補 | 日本株向け中テーマ/小テーマ定義 |
| `config/screener/theme-hierarchy-jp.json` | CREATE候補 | セクター配下の hierarchy 表示定義 |
| `config/screener/external-theme-reference-jp.json` | CREATE候補 | みんかぶ等の外部テーマ対応表 |
| `src/core/theme-taxonomy.js` | MODIFY候補 | US 専用関数を market-aware 化、または JP 用関数追加 |
| `src/core/fundamental-screener.js` | MODIFY候補 | JP `themeRanking` / hierarchy 生成、market別 taxonomy 適用 |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY候補 | JP report にテーマランキング章を追加 |
| `tests/theme-taxonomy.test.js` | MODIFY候補 | JP taxonomy 判定テスト追加 |
| `tests/fundamental-screener.test.js` | MODIFY候補 | JP theme/hierarchy payload 固定 |
| `tests/daily-screener-report.test.js` | MODIFY候補 | JP Markdown にテーマ章が出ることを固定 |
| `docs/strategy/japan-screener-source-and-theme-architecture_20260602.md` | CREATE候補 | source 選定根拠の恒久文書化 |

## 影響範囲

- `.github/workflows/daily-screener-japan.yml`
  - workflow 定義自体は現状でも成立しているため、必須変更とは限らない
- `src/core/fundamental-screener.js`
  - JP の結果 payload へ theme / hierarchy を追加する中心
- `scripts/screener/run-fundamental-screening.mjs`
  - report の見出し構成、JP 固有セクション追加
- `config/screener/*`
  - 日本株独自 taxonomy と source mapping の SoT
- `docs/reports/screener/daily-ranking-jp.md`
  - 最終的な利用者向け artifact

## 現状評価

### 1. すでにできていること

- TradingView scanner を使った JP broad screening
- `jpx-prime` allowlist によるユニバース制御
- JP 専用 Phase2 profile による sector-aware ranking
- WSL publish 付き Japan workflow

### 2. 足りていないこと

- US のような theme ranking
- 中テーマ / 小テーマ / top stock hierarchy
- JP 市場に自然なテーマ分解
- FCF / PFCF / EPS YoY 欠損に対する扱いの整理
- 外部テーマ source を取り込む設計

### 3. 同粒度可否の判定

- **Phase1 セクター粒度**: 可能
  - 既に成立
- **Phase2 銘柄ランキング粒度**: 可能
  - 既に成立。ただし一部 fundamental 欠損は残る
- **US 同等のテーマ粒度**: 現状不可
  - 理由: JP taxonomy / hierarchy が repo 内にまだ存在しない
- **日本株として実用的なテーマ粒度**: 可能
  - みんかぶ等を参照 source にして repo 側 taxonomy を持てば実現可能

## source 方針の提案

### 推奨方針 A: TradingView 維持 + みんかぶ補完

第一候補。もっともバランスがよい。

- Phase1/Phase2:
  - TradingView scanner を継続利用
  - 理由: 既存コード資産を最大活用でき、価格・モメンタム・fundamental cross-sectional scan をすでに担っている
- ユニバース正本:
  - JPX の上場銘柄一覧 / Listed Company Search
  - 理由: Prime 判定、銘柄コード、上場市場の正規化に強い
- テーマ粒度:
  - みんかぶ `人気テーマランキング` + 個別テーマの `関連銘柄一覧`
  - 理由: 日本株に特有のテーマ語彙が豊富で、テーマ起点の銘柄束を取りやすい
- repo 側実装:
  - みんかぶを生 source に毎回依存しきるのではなく、repo に `theme-taxonomy-jp.json` を持つ
  - external source は taxonomy 更新・検証の reference として使う

### 代替方針 B: 日本株だけテーマ source を TradingView から切り離す

実行可能だが、初手としては非推奨。

- テーマランキング source を みんかぶ中心に寄せる
- 銘柄 ranking は TradingView のまま
- リスク:
  - provider 間で sector / theme / symbol coverage がズレる
  - HTML 構造変更の影響を受けやすい
  - 取得規約や再利用制約の扱いを慎重に見る必要がある

### 非推奨方針 C: 日本株も TradingView だけで US 同等テーマ粒度を捻り出す

- 現状の repo 構造から見ると非効率
- `sector` / `industry` だけでは日本株で見たいテーマ粒度に届きにくい
- ユーザーが挙げた `みんかぶ` のような日本株特化 source を無視する理由がない

## 実装方針

### 方針 1: taxonomy を provider 依存ではなく repo asset として持つ

- `config/screener/theme-taxonomy-jp.json`
  - 中テーマ
  - 小テーマ
  - symbol 明示マッピング
  - industry/company keyword
- これにより source 変更に強くなる

### 方針 2: external source は confirmation layer として使う

- みんかぶ:
  - 人気テーマランキング
  - 個別テーマ関連銘柄
- 必要なら補助候補:
  - JPX Data Portal / Listed Company Search
  - moomoo plate / concept 系 read-only source

### 方針 3: JP 専用 hierarchy を US と分離して持つ

- US の `theme-hierarchy-us.json` をそのまま流用しない
- 日本株で意味のある例:
  - 半導体
  - 半導体製造装置
  - データセンター
  - 防衛
  - 蓄電池
  - 電線
  - 量子コンピューター
  - SaaS
  - 商社

## 実施ステップ

- [ ] JP 現行 workflow を正本として、US との差分を固定化する
  - `themeRanking` が空であること
  - hierarchy が JP で未生成であること
  - 欠損が多い指標列を列挙する

- [ ] 日本株テーマ source の採用方針を確定する
  - 第一候補: `TradingView + repo taxonomy + みんかぶ reference`
  - みんかぶを live scrape するか、taxonomy 更新 reference に留めるかを決める
  - JPX をユニバース正本に使う範囲を決める

- [ ] JP taxonomy / hierarchy の最小セットを定義する
  - 初期中テーマ 8〜15 個
  - 小テーマ 20〜50 個未満
  - symbol direct map と keyword map を分離する

- [ ] `src/core/theme-taxonomy.js` を market-aware に拡張する
  - `classifyUsTheme` 相当の JP 版を追加
  - `summarizeThemes` を市場共通で使える形に寄せる
  - JP hierarchy 取得関数を追加する

- [ ] `runFundamentalScreener()` に JP theme ranking を組み込む
  - `market === 'japan'` でも `themeRanking` が返るようにする
  - 必要なら `focusedHierarchy` も JP 対応する

- [ ] report へ JP テーマ章を追加する
  - `daily-ranking-jp.md` に `Phase2 テーマランキング` を追加
  - 必要なら `中テーマ / 小テーマ` も追加

- [ ] tests と live verification で収束させる
  - unit test
  - `SCREENER_MARKET=japan ... node scripts/screener/run-fundamental-screening.mjs`
  - GitHub Actions `Daily Fundamental Screener Japan`

## テスト戦略

- RED
  - JP market で theme ranking が空の現状を前提に、期待する theme/hierarchy payload を追加テストで先に固定する
- GREEN
  - JP taxonomy / hierarchy 実装を入れてテスト通過
- REFACTOR
  - US/JP 分岐が肥大しすぎる場合のみ taxonomy helper を整理する

## 検証コマンド候補

- `node --test tests/theme-taxonomy.test.js tests/fundamental-screener.test.js tests/daily-screener-report.test.js`
- `SCREENER_MARKET=japan SCREENER_EXCHANGES=TSE SCREENER_SYMBOL_ALLOWLIST_KEY=jpx-prime node scripts/screener/run-fundamental-screening.mjs`
- `gh workflow run "Daily Fundamental Screener Japan" --ref main`
- `gh run watch <run-id>`

## リスク・注意点

- みんかぶは画面上のテーマ情報が有用だが、公開 HTML 変更や利用条件変更の影響を受ける
- TradingView 側の fundamental 欠損は、taxonomy 実装だけでは解消しない
- JP テーマは流行語の変化が速く、完全自動分類より repo 管理の明示 taxonomy の方が安全
- 現在 worktree に `docs/reports/screener/daily-ranking.md` の未コミット差分があるため、今回コミットでは巻き込まない

## 競合確認

- 現在の active plan は `docs/exec-plans/active/screener-architecture-flow-doc_20260601_1430.md`
- 今回の計画は別ファイル追加のみで、直接競合しない

## 参考にした事実

- repo:
  - `.github/workflows/daily-screener-japan.yml` は既存
  - `src/core/fundamental-screener.js` は JP market 分岐済み
  - `src/core/sector-screening-profiles.js` は JP profiles 実装済み
  - `src/core/theme-taxonomy.js` は US 専用 taxonomy のみ
  - `docs/reports/screener/daily-ranking-jp.md` は現行 JP 出力例
- web:
  - みんかぶ `人気テーマランキング` は現在も公開
  - みんかぶ個別テーマページは関連銘柄一覧を持つ
  - JPX は `Listed Company Search` と `List of TSE-listed Issues` を公開
  - JPxData Portal は listed securities CSV download と company/disclosure search を案内している

---

作成者: Codex
作成日時: 2026-06-02T14:47:00+09:00
