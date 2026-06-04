# Exec-plan: japan-edinet-fundamentals-supplement_20260604_1215

## 概要

目的: 日本株スクリーニングに対して、`TradingView` の欠損が大きい `FCF` / `P/FCF` / `cash-flow` 系を `EDINET` で公式補完できるようにする。今回は **計画だけで終わらせず、実装・テスト・workflow 検証まで完了** をゴールにする。

今回の事前確認で分かったこと:

- 現行日本株スクリーニングは `TradingView scanner` を主軸にしており、`ROIC` / `売上YoY` / `EV/EBITDA` / `beta` などは概ね取得できている
- ただし日本株では `FCF margin` / `FCF YoY` / `P/FCF` の欠損率が高く、米国株と同じ品質でスコアリングしてよいとは言いにくい
- 既存実装の `enrichWithYahoo: true` は実質 `moomoo` の成長補完であり、日本株キャッシュフロー補完には使えていない
- `EDINET` は日本の公式開示 source で、API キー前提だが、`CSV/XBRL` ベースで提出書類の一次データを取得できる
- 現在 repo / shell / GitHub secrets からは `EDINET_API_KEY` が確認できていないため、**キーがない環境でも workflow 自体は成功する設計** にする必要がある

結論の先出し:

- 日本株の最適方針は **TradingView を broad screener の主軸に残し、日本株だけ EDINET で cash-flow 系を補完するハイブリッド**
- いきなり全指標を EDINET に置き換えるのではなく、**欠損が問題になっている列だけを日本株専用 fallback / override として差し込む** のが最小で筋が良い
- workflow では `EDINET_API_KEY` があるときだけ live 補完を有効化し、ないときは明示的に skip して report に source 状態を残す

## 変更・作成するファイル

| ファイル | 種別 | 役割 |
|---|---|---|
| `docs/exec-plans/active/japan-edinet-fundamentals-supplement_20260604_1215.md` | CREATE | 本計画 |
| `src/core/edinet.js` | CREATE | EDINET API 呼び出し、書類探索、ZIP/CSV 解析、指標抽出 |
| `src/core/fundamental-screener.js` | MODIFY | 日本株のみ EDINET 補完を呼び出して既存 row へマージ |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | report に EDINET 補完状況と source カバレッジを表示 |
| `.github/workflows/daily-screener-japan.yml` | MODIFY | `EDINET_API_KEY` secret を runtime に渡す |
| `tests/fundamental-screener.test.js` | MODIFY | 日本株 EDINET 補完の unit test を追加 |
| `tests/daily-screener-report.test.js` | MODIFY | report に EDINET source / coverage が出ることを固定 |
| `package.json` | MODIFY候補 | ZIP/CSV 解析の軽量依存が必要なら追加 |
| `package-lock.json` | MODIFY候補 | 依存追加時の lock 更新 |

## 影響範囲

- `src/core/fundamental-screener.js`
  - 日本株の enrichment 経路が増える
  - `ruleOf40` の表示改善に必要な source もここで組み立てる
- `scripts/screener/run-fundamental-screening.mjs`
  - report 冒頭 metadata と指標欄の説明が増える
- `.github/workflows/daily-screener-japan.yml`
  - secret 注入の有無で EDINET 補完の live 実行可否が決まる
- `docs/reports/screener/daily-ranking-jp.md`
  - 最終 artifact に source coverage と EDINET 補完状況が反映される

## 実装方針

### 1. EDINET は日本株専用 supplement として入れる

- `market === 'japan'` の場合のみ起動する
- `TradingView` の既存値は優先し、`null` / 欠損が大きい指標を `EDINET` で埋める
- 初期対象は次の列に絞る
  - `fcfMargin`
  - `fcfGrowthTtm`
  - `pFcf`
  - `cashConversion`
  - `ruleOf40` 表示用の `FCF margin` 構成要素

### 2. EDINET は document list → latest eligible filing → ZIP CSV parse の流れにする

- まず銘柄コードから対象提出書類を探す
- `csvFlag` が立っている書類を優先する
- 年次 / 四半期のうち、最新で補完計算に必要な書類を採用する
- 書類 ZIP の CSV facts から必要勘定科目を抽出する
- 取得値から repo 内で指標へ正規化する

### 3. API キーがない環境では壊さず skip する

- `EDINET_API_KEY` 未設定なら supplement を実行しない
- その場合でも report に `EDINET disabled (no key)` を出して、無言の欠損にしない
- workflow は fail させず、日本株 broad screener 自体は継続させる

### 4. 最適な日本株 fundamentals 取得方針

- 価格・モメンタム・横断スクリーニング:
  - `TradingView`
- 公式補完が必要な財務一次データ:
  - `EDINET`
- 補助参考 source:
  - `Yahoo` は補助 fallback に留める
  - `moomoo` は growth proxy 用の参考値に留める

## 実施ステップ

- [ ] `src/core/edinet.js` を追加し、EDINET API / ZIP / CSV の最小クライアントを実装する
- [ ] 日本株 symbol と EDINET 提出書類の対応付けルールを定義する
- [ ] cash-flow 系の抽出ロジックを作り、`fcfMargin` / `cashConversion` / `pFcf` を計算できるようにする
- [ ] `src/core/fundamental-screener.js` に日本株 EDINET 補完の merge を実装する
- [ ] `ruleOf40` を日本株ではスコア対象外のまま、表示だけは EDINET 補完込みで出せるようにする
- [ ] report に EDINET coverage / source 状況を表示する
- [ ] workflow に `EDINET_API_KEY` を配線する
- [ ] unit tests を追加し、キーなし fallback とキーあり補完の両方を固定する
- [ ] ローカルで report 生成を回して回帰がないか確認する
- [ ] GitHub Actions `Daily Fundamental Screener Japan` を実行し、workflow が動くことを確認する

## テスト戦略

- RED
  - 日本株 row に `FCF` 欠損があるケースで、EDINET 補完後に `fcfMargin` などが埋まるテストを先に追加する
  - `EDINET_API_KEY` なしで report に disabled 状態が出るテストを追加する
- GREEN
  - EDINET client と merge 実装を入れてテスト通過
- REFACTOR
  - 日本株専用 source metadata が肥大した場合のみ helper を分離する

## 検証コマンド

- `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js`
- `node scripts/screener/run-fundamental-screening.mjs`
- `gh workflow run "Daily Fundamental Screener Japan" --ref main`
- `gh run watch <run-id>`

## リスク・注意点

- `EDINET` live 実行には API キーが必要で、現時点では repo から確認できていない
- 提出書類 CSV の科目名・期間軸は書類種別で揺れるため、初期版は対象指標を絞る
- 日本株コードと `EDINET secCode` の対応に例外がある可能性があるため、symbol 正規化はテストで固める
- `P/FCF` は価格側を `TradingView`、FCF 側を `EDINET` で組み合わせるため、as-of date のズレは残る

## 競合確認

- `docs/exec-plans/active/` には他の日本株スクリーナー計画があるが、今回は `EDINET` 補完に限定しており直接競合しない
- 既存の Yahoo 修正とは補完関係で、ロジック衝突は避けられる想定
