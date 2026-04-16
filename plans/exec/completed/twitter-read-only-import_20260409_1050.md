# Twitter/X read-only 機能移植計画

## 目的
`/home/fpxszk/code/twitter-auto-poster` から、Twitter/X を**見たり取得したりするための read-only 機能**だけを `Oh-MY-TradingView` に移植する。  
対象は **認証確認・自分のアカウント確認・検索・ユーザー情報取得・ユーザー投稿取得・単一投稿詳細取得** までとし、**自動投稿・投稿・返信・引用・いいね・フォロー・削除・定期実行** は入れない。

## 調査結果
- `docs/exec-plans/active/` に既存の active plan はなく、今回の計画と競合する進行中タスクは見当たらない。
- 移植元 `twitter-auto-poster` では、`devinit.sh` で `config/.env` を読み込み、`scripts/lib/common.sh` で `twitter-cli` の存在確認と認証確認を行っている。
- `twitter-auto-poster` の read-only 実処理は `twitter-cli search` / `twitter-cli user-posts` / `twitter-cli whoami` / `twitter-cli tweet` を中心に組み立てられている。
- `Oh-MY-TradingView` は `src/core` → `src/tools` → `src/cli/commands` の層で機能追加する構造になっており、`market-intel` 系が今回の受け皿パターンとして最も近い。

## 変更対象ファイル
### 新規作成
- `src/core/twitter-read.js`
- `src/tools/twitter-read.js`
- `src/cli/commands/twitter-read.js`
- `tests/twitter-read.test.js`

### 更新
- `src/server.js`
- `src/cli/index.js`
- `src/core/index.js`
- `package.json`
- `README.md`
- `devinit.sh`

### 削除
- なし

## 実装内容
### 追加するもの
- `twitter-cli` を呼び出す Node 側の read-only ラッパー
- MCP tools
  - `x_status`
  - `x_whoami`
  - `x_search_posts`
  - `x_user_profile`
  - `x_user_posts`
  - `x_tweet_detail`
- CLI コマンド
  - `tv x status`
  - `tv x whoami`
  - `tv x search`
  - `tv x user`
  - `tv x user-posts`
  - `tv x tweet`
- `devinit.sh` で `config/.env` が存在する場合の任意読み込み
- `twitter-cli` 未導入 / 未認証 / JSON 異常 / 非 0 終了の明示エラー

### 影響範囲
- MCP の公開ツール一覧が増える
- CLI のサブコマンドが増える
- README のセットアップ手順と認証手順が増える
- `devinit.sh` のローカル環境ロード処理が変わる

## スコープ外
- `twitter-auto-poster` の自動投稿・自動いいね・自動フォロー関連
- 投稿 / 返信 / 引用 / いいね / フォロー / 削除などの write 操作
- GitHub Actions / cron / 常駐ジョブ
- Python / bash 実装の wholesale 移植
- source category や収集パイプラインの導入

## 設計方針
- 既存 repo の構造に合わせ、bash / Python を直接持ち込まず、Node から `twitter-cli` を実行する。
- 実装の責務は `src/core/twitter-read.js` に寄せ、MCP と CLI は薄い配線に留める。
- `twitter-cli --json` の応答を repo 内で扱いやすい shape に正規化する。
- 認証は、既存の `twitter-cli` ローカル状態、または `config/.env` にある `TWITTER_AUTH_TOKEN` / `TWITTER_CT0` を前提にする。
- 今回は read-only のみ公開し、write 系コマンド名や内部関数は露出しない。

## TDD 方針
### RED
- `tests/twitter-read.test.js` を先に追加し、以下を失敗させる。
  - `status` / `whoami` / `search` / `user` / `user-posts` / `tweet` の正常系
  - `twitter-cli` 未導入
  - 未認証
  - 非 0 終了
  - 不正 JSON / envelope 異常
  - write 系操作が登録されていないこと

### GREEN
- `src/core/twitter-read.js` に最小限の CLI 実行・エラー整形・レスポンス正規化を実装する。
- `src/tools/twitter-read.js` と `src/cli/commands/twitter-read.js` を追加し、`src/server.js` / `src/cli/index.js` / `src/core/index.js` / `package.json` に最小限の接続を行う。
- `devinit.sh` に `config/.env` 読み込みを追加する。

### REFACTOR
- `twitter-cli` 実行処理を共通化する。
- エラーメッセージと出力 shape を整理する。
- README の手順と read-only 制約を明確化する。

## 検証方針
既存コマンドを使って確認する。

- `npm test`
- `npm run tv -- --help`
- `npm run tv -- x --help`
- `npm run tv -- x status`
- `npm run tv -- x whoami`
- `npm run tv -- x search --query "NVDA" --max 3`

※ `x status` 以降は `twitter-cli` が導入済みかつ認証済みの環境で確認する。  
※ baseline は既存テストを崩さないことを前提に進める。

## リスク
- `twitter-cli` の JSON 形式が将来変わる可能性
- ローカル認証状態依存のため、環境差異で再現性がぶれる可能性
- `devinit.sh` で env を読んでも、`devinit.sh` を通さない起動では自動反映されない点
- read-only と write 系の責務が将来混ざらないよう、命名と公開面を明確に保つ必要がある

## 実装ステップ
- [ ] 移植元の read-only コマンドと認証条件を最終確認し、取り込む API 面を固定する
- [ ] `tests/twitter-read.test.js` を追加して RED を作る
- [ ] `src/core/twitter-read.js` を作成し、`twitter-cli` 実行・認証確認・レスポンス正規化を実装する
- [ ] `src/tools/twitter-read.js` を作成し、read-only MCP tools のみ公開する
- [ ] `src/cli/commands/twitter-read.js` を作成し、`tv x ...` コマンドを追加する
- [ ] `src/server.js` / `src/cli/index.js` / `src/core/index.js` / `package.json` を更新して配線する
- [ ] `devinit.sh` と `README.md` を更新し、環境変数読み込みと利用手順を明記する
- [ ] `npm test` と CLI スモーク確認で GREEN にする
- [ ] 共通化と文言整理を行い、REFACTOR を完了する
