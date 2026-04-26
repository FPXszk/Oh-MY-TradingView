# 電力関連ウォッチリスト導線作成とX候補抽出 実装計画

## 概要

初回のウォッチリスト投入を迷わず実行できるように、既存の `tv workspace` / `tv x` / `tv market` コマンドを使って導線を整えつつ、指定ツイートと `@aleabitoreddit` の直近3ヶ月以内の電力関連投稿からアメリカ株候補を抽出する。候補は重複整理とティッカー正規化を行い、`tv market fundamentals` で時価総額を確認したうえで単一ウォッチリストへ時価総額順で投入する。

## 変更・作成・参照ファイル

| ファイル | 種別 | 内容 |
|---|---|---|
| `docs/exec-plans/active/power-watchlist-onramp-and-twitter-sourcing_20260426_2046.md` | 作成 | 本タスクの実装計画 |
| `docs/references/design-ref-llms.md` | 変更想定 | 外部参照として使用した X URL と参照目的を記録 |
| `src/cli/commands/workspace.js` | 条件付き変更 | 既存 watchlist 導線で不足があった場合のみ、最小限の補助 CLI を追加 |
| `src/core/workspace.js` | 条件付き変更 | 上記補助 CLI に必要な最小限の watchlist 操作を追加 |
| `tests/workspace.test.js` | 条件付き変更 | watchlist 補助処理を追加した場合のユニットテスト |
| `tests/e2e.workspace.test.js` | 条件付き変更 | 実際の watchlist 導線を変える場合の E2E/統合確認 |

## 実装内容と影響範囲

- X 側: 指定ツイート詳細と `@aleabitoreddit` の直近投稿を取得し、2026-01-26 以降の電力関連投稿だけを候補母集団にする
- 銘柄選定: 発電・送配電・原子力・電力インフラ・電力需要恩恵の文脈に乗る米国株だけを候補化し、ETF・非米国株・文脈不明銘柄は除外候補として明示する
- 並び順: 候補ティッカーを `tv market fundamentals` で検証し、時価総額降順で最終並びを決める
- TradingView 側: 既存の `tv workspace watchlist-list` / `watchlist-add` を優先使用し、必要なら最小限の補助導線だけ追加する
- ドキュメント: 外部参照ログを残し、今回の選定根拠を追跡可能にする

## スコープ外

- 電力関連以外のテーマ銘柄選定
- 複数ウォッチリストへの分割
- X 投稿の sentiment 自動採点や恒久的なランキング機能追加
- 既存コマンドで十分な場合の不要な CLI 拡張

## 実装ステップ

- [x] 既存の watchlist / X / market コマンドと制約を確認する
- [x] 競合する active exec-plan がないことを確認する
- [x] X 認証を通し、指定ツイート詳細を取得する
- [x] `@aleabitoreddit` の直近投稿を取得し、2026-01-26 以降の電力関連投稿を抽出する
- [x] 抽出投稿から米国株ティッカー候補を洗い出し、重複・非該当銘柄を整理する
- [x] 候補銘柄の時価総額を取得し、単一ウォッチリスト向けの最終順序を決める
- [x] TradingView の watchlist 現状を確認し、既存コマンドで順次投入する
- [x] 既存導線で不足が見つかった場合のみ、RED -> GREEN -> REFACTOR で最小限の補助導線を追加する
- [x] 外部参照ログを `docs/references/design-ref-llms.md` に記録する
- [x] 結果として、電力関連の米国株が時価総額順に並んだ単一 watchlist を作成する

## テスト戦略

- まずは既存コマンドによる運用で完遂を目指すため、本体コードを変えない限り新規テストは追加しない
- もし watchlist の初回導線にコード変更が必要になった場合は、必ず RED -> GREEN -> REFACTOR で進める
- 想定するテスト追加先は `tests/workspace.test.js`（ユニット）と、導線変更が UI/CDP 経由に及ぶ場合の `tests/e2e.workspace.test.js`

## 検証コマンド

- `twitter status --yaml`
- `tv x tweet --id "https://x.com/aleabitoreddit/status/2047030798554132901?s=46"`
- `tv x user-posts --username aleabitoreddit --max 100`
- `tv market fundamentals --symbol <TICKER>`
- `tv workspace watchlist-list`
- `tv workspace watchlist-add --symbol <TICKER>`

## リスクと注意点

- 現時点で `twitter-cli` は未認証のため、ブラウザ cookie 抽出で認証が必要
- TradingView Desktop の CDP 接続が起動していないと watchlist 操作は進められない
- 投稿本文だけではティッカーが曖昧な場合があるため、企業名から米国上場ティッカーへの正規化確認が必要
- 既存 watchlist に手動追加済み銘柄がある場合は、重複投入前に現状確認を行う

## 競合確認

- `docs/exec-plans/active/repo-structure-align-and-archive-rules_20260424_2015.md` はリポジトリ構造整合タスクであり、本件の watchlist / X / market 運用とは競合しない
