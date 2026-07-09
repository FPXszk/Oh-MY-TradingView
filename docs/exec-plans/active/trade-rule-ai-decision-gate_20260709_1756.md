# Trade Rule AI Decision Gate

## 目的

`docs/strategy/Trade-rule.md` を、銘柄の新規購入・追加購入・保有継続・撤退をAIが総合判定する際の唯一の売買ルール正本へ更新する。

ユーザーが「この銘柄を買いたい」と依頼したとき、AIが最新情勢、スクリーナー結果、チャート状態、資金管理を確認し、`GO / STAY / STOP` を根拠付きで返せる状態を目標とする。

## 変更対象

- 削除: `docs/strategy/theme-momentum-definition.md`
- 更新: `docs/strategy/Trade-rule.md`
- 変更しない: `docs/strategy/dr-k-chart-strategy-quantification-report_20260707.md`
- 完了時移動: この計画を `docs/exec-plans/completed/` へ移動

## 方針

- `theme-momentum-definition.md` の内容は参照・継承しない。
- Dr.Kレポート本文は一切変更しない。
- Dr.Kレポートから、実際の売買前確認として定量化しやすいルールだけを `Trade-rule.md` に取り込む。
- 調査用のアルゴリズム案、仮スコア、モジュール構成、出典調査はTrade Ruleへ移さない。
- 元の資金管理・信用取引・損切り・利確・決算跨ぎルールは、矛盾を解消して残す。
- 判定不能や情報不足をGOにしない。

## 実装チェックリスト

- [ ] `theme-momentum-definition.md` を削除する
- [ ] リポジトリ内に削除対象への参照が残っていないか確認する
- [ ] 元の `Trade-rule.md` の資金管理ルールをレビューする
- [ ] ポジション上限と1トレード許容損失の関係を明文化する
- [ ] 売買前の必須確認順序を追加する
- [ ] 最新ニュース・市場情勢・イベントリスク確認を必須化する
- [ ] 最新スクリーナー結果と順位確認を必須化する
- [ ] Dr.K式の市場・セクター・リーダー株・チャート状態判定を統合する
- [ ] `BREAKOUT_READY`、`BREAKOUT_TRIGGERED`、`EXTENDED`、`PULLBACK_FORMING`、`NU_READY`、`ABSORPTION`、`FAILED_BREAKOUT`、`SETUP_BROKEN`、`NO_TRADE` の扱いを定義する
- [ ] ピボットから5%以上離れた飛びつきを原則禁止する
- [ ] 損切り位置不明、リスクリワード不足、地合い不良などのハード停止条件を定義する
- [ ] `GO / STAY / STOP` の意味と判定条件を定義する
- [ ] AIが毎回返す固定出力フォーマットを追加する
- [ ] Dr.Kレポートが変更されていないことを確認する
- [ ] docs-only変更としてリンク・Markdown・導線をレビューする
- [ ] 計画を `docs/exec-plans/completed/` へ移動する

## 成功条件

- `theme-momentum-definition.md` が存在しない。
- Dr.Kレポートのblob SHAが変更されていない。
- `Trade-rule.md` 単体で、AIが売買前調査の順序とGO / STAY / STOP判定を実行できる。
- Trade Rule内で、ポジションサイズ、損切り、レバレッジ、スクリーナー、チャート、ニュース確認が矛盾しない。
- 情報不足・セットアップ未完成・飛びつき状態がGOにならない。
