# Exec-plan: fundamental-screener-top3-sectors-and-mu-sndk-adjustment_20260531_2106

## 目的

米国ファンダメンタルスクリーナーを、現在の相場で最も強い上位3セクターに絞った運用へ変更する。あわせて、`MU` が P/FCF 上限だけで落ちる状況を緩和し、`SNDK` が売上成長率 hard filter だけで落ちる状況を解消する。

今回の到達点は次の4つ。

1. `SNDK` を落としている Moomoo 売上成長率 hard filter を外す
2. `MU` に効いている半導体 `IDM/foundry` の P/FCF 上限を緩める
3. Phase1 の採用セクターを上位3セクターのみに固定し、4位以下は Phase1 失格扱いにする
4. レポートを「上位3セクターそれぞれ30位まで」のセクター別ランキング表示に変える

## 前提

- 依頼の中心は「いま強いセクターだけに集中する」ことであり、4位以下のセクターは明示的に出力対象外とする
- `MU` / `SNDK` だけを通すための個別ハックではなく、現行プロファイル設計の過剰な hard gate を緩める方向で直す
- 総合点ロジックの全面刷新は今回はスコープ外とし、まずは現行 rank 設計のまま universe と gate を絞る
- 既存ワークフローに乗る既定動作として変更し、日次レポートでも同じ挙動になるようにする

## 変更ファイル

| 種別 | ファイル | 内容 |
|---|---|---|
| 作成 | `docs/exec-plans/active/fundamental-screener-top3-sectors-and-mu-sndk-adjustment_20260531_2106.md` | 本計画 |
| 修正 | `src/core/sector-screening-profiles.js` | 半導体プロファイルの P/FCF 上限を緩和し、必要なら growth gate の役割を調整する |
| 修正 | `src/core/fundamental-screener.js` | 売上成長率 hard filter の扱い、selected sector count の既定、結果のセクター別グルーピング出力を調整する |
| 修正 | `scripts/screener/run-fundamental-screening.mjs` | 既定で上位3セクターのみを対象にし、レポートをセクター別 top30 表示へ変更する |
| 修正 | `tests/fundamental-screener.test.js` | `MU` / `SNDK` の通過条件、上位3セクター制限、4位以下の除外を固定する |
| 修正 | `tests/daily-screener-report.test.js` | レポートが「3セクター × 各30件」で出ること、旧横断ランキングを出さないことを固定する |
| 生成更新 | `docs/reports/screener/daily-ranking.md` | 新レポート形式で再生成する |

## 影響範囲

- 影響あり
  - 米国ファンダメンタルスクリーナーの候補 universe
  - `MU` / `SNDK` を含む半導体銘柄の通過条件
  - 日次レポートの構成と表示件数
- 影響なし
  - Portfolio Health Check 系
  - JP スクリーナー
  - GitHub Actions workflow YAML 自体

## 範囲外

- 総合点の新しい採点式への全面変更
- 4位以下セクター向けの補欠表示や要約節の追加
- 新しい外部データ源の導入

## 実装方針

### 1. `SNDK` 対応

- `revenueGrowth` は hard gate ではなく growth block の順位要素として扱う
- Moomoo 補完は継続するが、「値が閾値未満なら即失格」はやめる

### 2. `MU` 対応

- Semiconductor `IDM/foundry` の P/FCF 上限を、現行の `100` からより緩い値へ引き上げる
- P/FCF 自体は risk/value guard のスコアに残し、「高い銘柄は減点されるが即失格ではない」方向に寄せる

### 3. セクター絞り込み

- Phase1 の selected sector count の既定値を `3` にする
- 4位以下セクターは profile request / result 集計の対象外にする
- レポート上も「上位3セクターのみが対象」であることを明記する

### 4. レポート形式

- 現在の market 横断 1本ランキングではなく、上位3セクターごとに
  - セクター順位
  - セクター内順位
  - 最大30件
  を表示する
- 4位以下セクターはレポートに出さない

## 実装ステップ

- [ ] `MU` / `SNDK` の現行 gate をテストで固定する
  - 確認: 変更前に `MU` が P/FCF、`SNDK` が revenue growth hard filter で落ちることを再現できる

- [ ] 半導体 P/FCF 上限と revenue growth hard gate を修正する
  - 確認: `MU` / `SNDK` が workflow eligible になる

- [ ] 上位3セクター限定へ切り替える
  - 確認: Phase1 selected sectors が3件だけになり、4位以下セクター銘柄が workflow result から消える

- [ ] レポートをセクター別 top30 形式へ変更する
  - 確認: 上位3セクターそれぞれ最大30件が順位付きで出力される
  - 確認: 旧横断ランキング節が残らない

- [ ] テストとローカル実行で検証する
  - 確認: `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js`
  - 確認: `MOOMOO_HOST=172.31.144.1 MOOMOO_PORT=11112 MOOMOO_ADAPTER_TIMEOUT_MS=30000 node scripts/screener/run-fundamental-screening.mjs`

## テスト戦略

- RED
  - `MU` / `SNDK` の現行落選理由を回帰テストで固定する
  - selected sector count が3以外でも旧ロジックのまま通る箇所を落とす
  - 新レポート構造を期待して既存テストを失敗させる
- GREEN
  - 最小変更で gate / selected sectors / report layout を変更して通す
- REFACTOR
  - セクター別表示の補助関数が必要なら、小さく分離する

## 検証コマンド

```bash
node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js
MOOMOO_HOST=172.31.144.1 MOOMOO_PORT=11112 MOOMOO_ADAPTER_TIMEOUT_MS=30000 node scripts/screener/run-fundamental-screening.mjs
git diff --check
```

## リスク

1. 上位3セクター固定にすると、相場の切り替わり直後に候補が急減する可能性がある
2. revenue growth hard gate を外すと、モメンタムだけ強い glamour 株が増える可能性がある
3. レポート構造の変更で既存の「横断 top list」前提の読み方が変わる
4. Moomoo 補完に依存する live 検証は OpenD 接続状態に左右される

## 競合確認

- 既存 active plan は調査用だったため本計画へ置き換える
- `docs/exec-plans/active/` 配下に今回と直接競合する別 plan はない
