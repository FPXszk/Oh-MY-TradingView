# Exec-plan: rebalance-fundamental-screener-balanced-weights_20260513_1725

## 概要

目的: `src/core/fundamental-screener.js` のランキングを「本命」配分へ戻し、ファンダメンタルが弱い銘柄が値動きだけで上位に入りにくいようにする。そのうえで、既存の `scripts/screener/run-fundamental-screening.mjs` と GitHub Actions `Daily Fundamental Screener` を実行し、レポート結果を確認する。

今回の中心は **スコア配分の見直しと実ランの確認** であり、新しい外部データ源や別指標群の大規模追加は行わない。

## 前提

- 現行 US ランキングは `priceMomentum 67% + sectorStrength 10% + quality 10% + growth 5% + riskValue 5% + ruleOf40 3%` で、実質的にモメンタム偏重になっている。
- リポジトリ内の既存 research `docs/strategy/momentum-fundamental-screening-indicators-research_20260505.md` は、本命案として `Price 35 / Sector 15 / Quality 25 / Growth 10 / Risk 15 / Rule40 0-3` を提示している。
- `sectorStrength` は現状 12M/6M/3M のセクターモメンタムを内包しており、`priceMomentum` と重複しているため、ウェイト変更だけでなく block 内の重複も最小限整理する必要がある。
- `Daily Fundamental Screener` workflow は `workflow_dispatch` で実行可能で、self-hosted Windows runner 上で `node scripts/screener/run-fundamental-screening.mjs` を動かす。

## 変更ファイル

| 種別 | ファイル | 内容 |
|---|---|---|
| 作成 | `docs/exec-plans/active/rebalance-fundamental-screener-balanced-weights_20260513_1725.md` | 本計画 |
| 修正 | `src/core/fundamental-screener.js` | ranking block の重みを本命配分へ変更し、sectorStrength の重複を減らす。必要なら block field 構成も最小変更で調整する |
| 修正 | `tests/fundamental-screener.test.js` | 新配分と、弱ファンダ銘柄が価格だけで勝ちにくくなる回帰ケースを固定する |
| 修正 | `tests/daily-screener-report.test.js` | Markdown のスコア算出表が新配分・新 block 定義を表示することを固定する |
| 生成 | `docs/reports/screener/daily-ranking.md` | ローカル実行結果の更新 |
| 生成 | `docs/reports/screener/daily-ranking-run.json` | ローカル実行メタデータの更新 |
| 参照のみ | `.github/workflows/daily-screener.yml` | 実 workflow dispatch / 結果確認の対象。原則コード変更なし |

## 影響範囲

- 影響あり
  - US / JP を含む `runFundamentalScreener` の順位計算
  - 日次スクリーナーレポートの block weights と順位
  - GitHub Actions の `daily-screener` 実行結果
- 影響なし
  - スクリーニング通過の hard filter 条件
  - market-intel / backtest / TradingView Desktop 操作
  - 新しいデータプロバイダ追加

## 範囲外

- 12-1 momentum や residual momentum の新規実装
- 新しい財務列の追加取得
- Rule of 40 の定義変更
- JP/US で別々の大規模 ranking system を新設すること
- workflow YAML 自体の改修（実行結果確認のための dispatch は行う）

## 実装方針

- 本命案として、基本配分を `priceMomentum 35 / sectorStrength 15 / quality 25 / growth 10 / riskValue 15` へ変更する
- US の `ruleOf40` は software 限定の補助評価として残し、`0-3%` の低ウェイトを維持する
- `sectorStrength` は `priceMomentum` と同じ価格系列の重複計上を減らす。候補は `phase1SectorRankScore` 主体へ整理し、必要最小限の補助項目だけ残す
- 目的は「弱ファンダ銘柄を上位から落とすこと」なので、テストでは KGS/PBT/NGL 型の性質を模した比較ケースを追加し、価格だけ強い銘柄より quality/growth が強い銘柄が上に来ることを確認する

## 実装ステップ

- [ ] 現行ランキングロジックの変更点を確定する
  - 確認: `src/core/fundamental-screener.js` で block weights と sectorStrength fields の最終形を決める

- [ ] 回帰テストを先に更新する
  - 確認: `tests/fundamental-screener.test.js` で新しい ranking block 配分と、弱ファンダ高モメンタム銘柄の降格ケースを RED にする
  - 確認: `tests/daily-screener-report.test.js` で Markdown の score table が新配分を反映することを RED にする

- [ ] ランキング実装を本命配分へ変更する
  - 確認: `runFundamentalScreener` の結果で ranking blocks / rankScore / report payload が新設計に一致する

- [ ] ローカル検証を行う
  - 確認: 既存テストが通る
  - 確認: `node scripts/screener/run-fundamental-screening.mjs` を実行し、`docs/reports/screener/daily-ranking.md` の上位銘柄からファンダメンタル弱者の食い込みが軽減したことを目視確認する

- [ ] 実 workflow を dispatch して結果確認する
  - 確認: `gh workflow run .github/workflows/daily-screener.yml`
  - 確認: `gh run watch` / `gh run view` で完了ステータスと artifact / run metadata を確認する
  - 確認: workflow 生成物がローカル検証と大きく矛盾しないことを確認する

- [ ] レビューして完了コミット準備を行う
  - 確認: ロジック破綻、二重計上、過剰設計がない
  - 確認: 変更したファイルだけが stage 対象になっている

## テスト戦略

- RED
  - 新しい block weights と block field 構成に合わせて既存テストを失敗させる
  - 弱ファンダ・強モメンタムの mock row が、強ファンダ・適正モメンタムの row より上位に来ないことを新規 assertion で固定する
- GREEN
  - block weights / field 定義を最小変更で更新し、テストを通す
- REFACTOR
  - 重複を減らすための小さな定数整理のみ行う。ランキングアルゴリズムの大規模改修はしない

## 検証コマンド

```bash
npm test
node scripts/screener/run-fundamental-screening.mjs
gh workflow run .github/workflows/daily-screener.yml
gh run list --workflow daily-screener.yml --limit 1
gh run view <run-id> --log-failed
```

## 成功条件

- `src/core/fundamental-screener.js` の配分が本命案に沿って更新されている
- テストで「弱ファンダが値動きだけで上位に入りにくい」回帰が固定されている
- ローカル生成レポートで、ファンダメンタルの弱い銘柄が価格だけで上位に居座る度合いが軽減している
- GitHub Actions `Daily Fundamental Screener` が完走し、更新後ロジックで結果確認できる

## リスク・注意点

1. `sectorStrength` の field を減らしすぎると、Phase1 と Phase2 の接続が弱くなる可能性がある。priceMomentum との重複削減を優先しつつ、最小限の sector follow-through は残す
2. 実データの市場局面次第では、依然として高モメンタム株が上位に残ることがある。今回は「完全排除」ではなく「価格だけでは勝ちにくくする」ことをゴールに置く
3. self-hosted Windows runner の状態次第で workflow dispatch が遅延・失敗する可能性がある
4. 作業ツリーには `.codex/config.toml` の未コミット変更があるため、コミット対象から除外する

## 競合確認

- `docs/exec-plans/active/` 配下に既存 active plan は存在しないため、直接競合なし
