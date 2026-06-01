# Electronic Technology 階層テーマ定義と Phase2-4 再設計 実行計画

## ゴール

`Electronic Technology` セクターについて、ユーザー指定の 8 中テーマ / 小テーマ構造を repo の外部定義ファイルへ切り出し、同じ仕組みを今後 `Producer Manufacturing` など他セクターにも横展開できる土台を作る。

あわせて、レポートの hierarchy 部分を次の流れに寄せる。

1. `Phase1`: セクター順位を出す
2. `Phase2`: **1位セクターのみ** 中テーマランキングを出す
3. `Phase3`: Phase2 上位中テーマのうち上位半分を対象に、小テーマランキングを出す
4. `Phase4`: Phase3 上位 3 小テーマに属する個別株のみを並べる

今回の完了条件:

1. `Electronic Technology` の 8 中テーマ / 小テーマが外部ファイルで定義される
2. 将来の他セクター用に、同じ外部ファイル内または隣接ファイルで空定義を置ける形になる
3. `Electronic Technology` が Phase1 1位のときだけ hierarchy ranking を出す実装方針が固まる
4. `Phase2 -> Phase3 -> Phase4` の絞り込みルールがコードとテストに落とせる粒度まで明文化される

## 前提と解釈

- 今回のユーザー指定では、`Electronic Technology` の中テーマは次の 8 分割を正本とする
  - `AI Compute`
  - `Memory`
  - `Semiconductor Equipment`
  - `Connectivity / Networking`
  - `Optical / Photonics`
  - `Electronic Components`
  - `Defense / Space Electronics`
  - `Industrial / Power Electronics`
- 小テーマもユーザー提示の一覧を正本とする
- `どこか外部のやつで定義` の意図は、ロジック直書きではなく、他セクターにも流用できる設定ファイル化と解釈する
- `空でいい` は、他セクターは現時点では中身なしでも schema だけ置いてよい、という意味で解釈する
- hierarchy 表示は **全セクター常時ではなく、Phase1 1位セクターだけ** を対象にする
- 実装はまず US 向けから行い、既存 `theme-taxonomy-us.json` との整合を保つ

## 変更ファイル一覧

| ファイル | 操作 | 内容 |
| --- | --- | --- |
| `docs/exec-plans/active/electronic-technology-hierarchy-config-and-phase234_20260601_1750.md` | CREATE | 本計画 |
| `config/screener/theme-hierarchy-us.json` | CREATE | セクター別 hierarchy 定義の正本。ET は実データ、他セクターは空枠を持てる形にする |
| `config/screener/theme-taxonomy-us.json` | MODIFY | ET の既存 medium theme / subtheme を新 hierarchy に合わせて整理する |
| `config/screener/external-theme-reference-us.json` | MODIFY | 新しい ET 中テーマに対応する外部参照を付与する |
| `src/core/theme-taxonomy.js` | MODIFY | hierarchy 設定の読込、ET の 8 中テーマ / 小テーマへの分類反映 |
| `src/core/fundamental-screener.js` | MODIFY | 1位セクター時のみ hierarchy を構築し、Phase2-4 の絞り込み条件を新ルールへ合わせる |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | レポート見出しと ranking 表示を新 hierarchy ロジックに合わせる |
| `tests/theme-taxonomy.test.js` | MODIFY | 新 ET 8中テーマ / 小テーマの代表分類テストを追加・更新する |
| `tests/fundamental-screener.test.js` | MODIFY | Phase2-4 の hierarchy 選抜ルールを固定する |
| `tests/daily-screener-report.test.js` | MODIFY | レポートの章立て・表示条件・文言を更新する |
| `docs/strategy/electronic-technology-middle-theme-research_20260601.md` | MODIFY候補 | 必要なら最終定義に合わせて整理メモを同期する |
| `docs/exec-plans/completed/electronic-technology-hierarchy-config-and-phase234_20260601_1750.md` | MOVE | 完了時に移動 |

## 実装内容

### A. 共通 hierarchy 定義ファイルの新設

- `config/screener/theme-hierarchy-us.json` を新設する
- 1 ファイル内に
  - version
  - sector ごとの定義
  - 各 sector の middle themes
  - 各 middle theme の small themes
  - 将来用 placeholder sector
  を持てる形にする
- `Electronic Technology` は今回の 8 中テーマ / 小テーマで埋める
- `Producer Manufacturing` など他セクターは空配列または metadata のみを持つ placeholder にする

### B. ET taxonomy の再編

- 既存の ET 向け 11 中テーマを、今回の 8 中テーマへ畳み直す
- 特に次の統合を行う前提で整理する
  - `Connectivity Silicon` + `Network Infrastructure` -> `Connectivity / Networking`
  - `Defense Tech` + `Space` -> `Defense / Space Electronics`
  - `Industrial Automation` + `Power & Grid` -> `Industrial / Power Electronics`
- 小テーマはユーザー指定を正本として合わせる
- 既存銘柄マッピングが壊れないよう、symbol / industry / keyword ルールを最小差分で調整する

### C. 外部参照の更新

- `external-theme-reference-us.json` を新 ET 中テーマ名に合わせて更新する
- ET の 8 中テーマには各 4 source 前後の外部参照を紐付ける
- 他セクター placeholder は空 provider で保持できる schema にする

### D. hierarchy 実行ルールの変更

- `Phase1` 完了後、1位セクター名を取得する
- hierarchy の対象セクターは
  - `theme-hierarchy-us.json` に定義が存在し
  - かつ `Phase1` で 1位になったセクター
  のみとする
- `Electronic Technology` が 1位でない日は、ET hierarchy は表示しない

### E. Phase2 / Phase3 / Phase4 の新しい意味づけ

#### Phase2

- 対象: Phase1 1位セクターの通過銘柄
- 集計単位: `middle theme`
- 出力: 中テーマランキング

#### Phase3

- 対象: Phase2 中テーマランキングの **上位半分**
- 集計単位: `small theme`
- 出力: 小テーマランキング
- 上位半分の丸め方は実装前に固定する
  - 第一案: `Math.ceil(n / 2)`

#### Phase4

- 対象: Phase3 小テーマランキングの **上位 3 小テーマ**
- 出力: 個別株ランキング
- 個別株は `Phase1 1位 sector` かつ `Phase2 通過` かつ `Phase3 上位 3 小テーマ所属` の銘柄だけに絞る

## 実装ステップ

- [ ] `theme-hierarchy-us.json` の schema を決め、ET と空 placeholder sector の形を確定する
- [ ] `Electronic Technology` の 8 中テーマ / 小テーマを config に追加する
- [ ] 既存 `theme-taxonomy-us.json` の ET 分類を新 hierarchy に合わせて更新する
- [ ] `external-theme-reference-us.json` を新 ET 中テーマ名へ合わせる
- [ ] `src/core/theme-taxonomy.js` を更新し、新 hierarchy 設定を読み込めるようにする
- [ ] `src/core/fundamental-screener.js` の focused hierarchy ロジックを、1位セクター限定 + Phase2/3/4 新ルールへ更新する
- [ ] `scripts/screener/run-fundamental-screening.mjs` の表示を新章構成に合わせる
- [ ] taxonomy / hierarchy / report のテストを更新する
- [ ] `node scripts/screener/run-fundamental-screening.mjs` を実行して `daily-ranking.md` を確認する
- [ ] 差分レビュー後、plan を `completed/` に移動する

## テスト戦略

- RED
  - `tests/theme-taxonomy.test.js` で旧 ET 11 テーマ前提から外れるケースを先に失敗させる
  - `tests/fundamental-screener.test.js` で Phase2/3/4 の新しい絞り込み条件を失敗で固定する
  - `tests/daily-screener-report.test.js` で「1位セクター時のみ hierarchy 表示」「上位半分 middle themes」「上位3 small themes」の表示要件を失敗で固定する
- GREEN
  - config 主体で ET hierarchy を差し替え、必要最小限のロジック変更で通す
- REFACTOR
  - 他セクター拡張に必要な抽象だけ残し、今回不要な汎用化は避ける

## 検証コマンド

```bash
node --test tests/theme-taxonomy.test.js
node --test tests/fundamental-screener.test.js
node --test tests/daily-screener-report.test.js
node scripts/screener/run-fundamental-screening.mjs
git diff --check
```

## 影響範囲

- 影響あり
  - US theme taxonomy の ET 分類結果
  - hierarchy ranking の構造
  - `daily-ranking.md` の Phase2-4 表示内容
- 影響なし
  - Phase1 セクターランキングの元ロジック
  - Portfolio Health Check 系 workflow

## リスク

1. 既存 ET 11 テーマを 8 テーマへ畳む過程で、一部銘柄の所属先が揺れる
2. `上位半分` の丸め方が未固定だとテストとレポートの期待がぶれる
3. 他セクター placeholder の schema を広げすぎると過剰設計になる
4. `Phase2 テーマランキング` が現状は全体 theme 集計でも使われているため、1位セクター限定 hierarchy との役割整理が必要になる

## スコープ外

- Producer Manufacturing など他セクターの中テーマ実データ投入
- ET 以外の taxonomy 本格再設計
- Heat 係数の再調整
- external confirmation を Phase3 / Phase4 スコアへ反映する新規ロジック

## 競合確認

- `docs/exec-plans/active/screener-architecture-flow-doc_20260601_1430.md` は説明ドキュメント系であり、今回の hierarchy 実装とは直接競合しない
