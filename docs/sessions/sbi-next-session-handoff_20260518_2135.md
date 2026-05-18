# Session Log 20260518_2135

## Goal For Next Session

次セッションでは、以下の順で **実行** する。

1. `@chrome` plugin で、今開いている SBI 証券タブを実際に読めるか確認する
2. 読めたら、CSV ボタン位置と「毎資産」導線を特定する
3. その導線をもとに CDP script へ落とし込む
4. self-hosted GitHub Actions workflow で回す

今回は **実行しない**。handoff 用の durable log だけを残す。

## Current State

- `SBI Portfolio Capture` workflow は追加済み
  - file: `.github/workflows/sbi-portfolio-capture.yml`
- CDP capture script は追加済み
  - file: `scripts/sbi/capture-portfolio-data.mjs`
- CSV 集計 script は追加済み
  - file: `scripts/sbi/build-portfolio-report.mjs`
- portfolio 集計 workflow / report 手順書は追加済み
  - file: `docs/strategy/sbi-portfolio-report-workflow.md`

## What Was Verified

- `node --test tests/sbi-capture-workflow.test.js` は成功
- `node scripts/sbi/capture-portfolio-data.mjs --help` は成功
- local dry-run:
  - `node scripts/sbi/capture-portfolio-data.mjs --dry-run --output-dir tmp/sbi-capture-dryrun`
  - 結果: `127.0.0.1:9222` に CDP endpoint が無く `fetch failed`
- GitHub Actions dry-run:
  - workflow: `SBI Portfolio Capture`
  - run id: `26033528664`
  - 結果: `Capture SBI portfolio data` step が `TypeError: fetch failed`
  - artifact upload までは成功

## Important Interpretation

- workflow 実装自体は dispatch / artifact upload まで到達している
- 現在の blocker は **runner 上で SBI を開いている Chrome の CDP endpoint が見えていないこと**
- したがって、次セッションの最優先は **`@chrome` で現在タブを直接見られるか** を確認すること

## Known Constraints

- ユーザー前提:
  - SBI 証券は Chrome で手動ログイン済み
  - ログイン自体は自動化しない
- 取得は read-only のみ
- 発注、取消、入出金、認証情報の保存はしない

## Files To Read First Next Session

- `AGENTS.md`
- `docs/strategy/sbi-portfolio-report-workflow.md`
- `docs/sessions/sbi-cdp-capture-workflow_20260518_2119.md`
- `scripts/sbi/capture-portfolio-data.mjs`
- `.github/workflows/sbi-portfolio-capture.yml`

## Exact Next-Session Execution Order

### Phase 1: `@chrome` 実接続確認

次セッションで最初にやること:

- ユーザーに `[@chrome]` を明示してもらう、または既に明示されていればそのまま使う
- まず「今の SBI タブが見えるか」だけ試す
- 見えた場合:
  - タブタイトル
  - URL
  - CSV 系ボタン文言
  - 「毎資産」導線文言
  - 可能なら表や主要セクション名
  をメモする

成功条件:

- SBI タブを claim / read できる
- CSV ボタン候補と「毎資産」導線候補を自然言語で列挙できる

失敗条件:

- `@chrome` でタブにアクセスできない

### Phase 2: CDP viability 確認

`@chrome` で見えたあとに確認すること:

- その Chrome を CDP 付きで使えるか
- 既存 Chrome を `--remote-debugging-port=9222` 付きで起動しているか
- あるいは別 profile / 別 launch command が必要か

確認コマンド候補:

```bash
curl -s http://127.0.0.1:9222/json/version
curl -s http://127.0.0.1:9222/json/list
curl -s http://127.0.0.1:9223/json/version
curl -s http://127.0.0.1:9223/json/list
```

成功条件:

- `json/version` か `json/list` が返る
- SBI tab が target list に見える

### Phase 3: repo 側 capture 実行

CDP が見えたら、まず local 実行:

```bash
npm run sbi:portfolio-capture -- --cdp-host 127.0.0.1 --cdp-port 9222 --output-dir docs/reports/screener/portfolio/capture/latest
```

9223 側なら:

```bash
npm run sbi:portfolio-capture -- --cdp-host 127.0.0.1 --cdp-port 9223 --output-dir docs/reports/screener/portfolio/capture/latest
```

見るべき artifact:

- `docs/reports/screener/portfolio/capture/latest/capture-summary.md`
- `docs/reports/screener/portfolio/capture/latest/current-page.json`
- `docs/reports/screener/portfolio/capture/latest/every-asset-page.json`
- `docs/reports/screener/portfolio/capture/latest/downloads/`

### Phase 4: GitHub Actions workflow 実行

local capture が通ったら workflow:

```bash
gh workflow run "SBI Portfolio Capture" --ref main --field cdp_host=127.0.0.1 --field cdp_port=9222 --field output_dir=docs/reports/screener/portfolio/capture/latest --field dry_run=false
gh run list --workflow "SBI Portfolio Capture" --limit 1
gh run view <RUN_ID> --log-failed
```

## Expected Decision Tree

- `@chrome` が見える
  - まず画面探索を済ませる
  - その後 CDP 化へ進む
- `@chrome` が見えない
  - plugin 実行口の問題か、セッション露出の問題かを切り分ける
  - その場では CDP 直行を優先する
- CDP が見えない
  - workflow 側をいじるのではなく、Chrome 起動前提を直す
- CDP が見える
  - capture script の selector / navigation を実測ベースで調整する

## Do Not Forget

- 現在の worktree には `docs/reports/screener/portfolio/` 配下の既存 CSV 削除差分がある
- これらは今回こちらで消したものではないので、勝手に戻さない / 触らない

## Related Commits

- `c8d765b feat: add sbi portfolio capture workflow`
- `dbd0268 docs:record sbi capture dry-run result`

